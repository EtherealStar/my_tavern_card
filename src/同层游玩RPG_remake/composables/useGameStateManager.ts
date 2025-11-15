/**
 * 游戏状态管理组合式函数
 * 作为游戏状态切换的唯一入口，实现Vue组件层与服务层的解耦
 * 协调所有组合式函数的状态同步
 */

import { computed, inject, onMounted, onUnmounted, ref, type ComputedRef } from 'vue';
import type { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import type {
  CreationData,
  GameState,
  GameStateError,
  GameStateTransitionOptions,
  ServiceStatus,
} from '../models/GameState';
import { GamePhase } from '../models/GameState';
import type { GameStateService } from '../services/GameStateService';
import { useGlobalState } from './useGlobalState';

export interface GameStateManager {
  // 状态查询
  currentPhase: ComputedRef<GamePhase>;
  currentState: ComputedRef<GameState>;
  isTransitioning: ComputedRef<boolean>;

  // 计算属性
  isInBattle: ComputedRef<boolean>;
  isPlaying: ComputedRef<boolean>;
  isInitial: ComputedRef<boolean>;
  isCreation: ComputedRef<boolean>;
  hasBattleConfig: ComputedRef<boolean>;
  hasBattleState: ComputedRef<boolean>;

  // 状态切换方法
  transitionToInitial: (options?: GameStateTransitionOptions) => Promise<boolean>;
  transitionToCreation: (options?: GameStateTransitionOptions) => Promise<boolean>;
  transitionToPlaying: (optionsOrSaveName?: GameStateTransitionOptions | string, slotId?: string) => Promise<boolean>;

  // 战斗管理
  enterBattle: (battleConfig: any, previousPhase?: GamePhase) => Promise<boolean>;
  exitBattle: (returnToPrevious?: boolean) => Promise<boolean>;
  updateBattleState: (battleState: any) => Promise<boolean>;

  // 状态更新方法
  updateCreationData: (data: CreationData) => Promise<boolean>;
  setPlayer: (name: string) => Promise<boolean>;
  setCreationData: (creationData: CreationData) => Promise<boolean>;
  startNewGame: () => Promise<boolean>;
  resetGameState: () => Promise<boolean>;
  reset: () => Promise<boolean>;

  // 状态查询方法
  getCurrentGameState: () => GameState;
  getCurrentPhase: () => GamePhase;
  getCreationData: () => CreationData | undefined;
  getBattleConfig: () => any;
  getBattleState: () => any;
  getPreviousPhase: () => GamePhase | undefined;

  // 状态监听
  onStateChange: (callback: (newState: GameState) => void) => () => void;
  onPhaseChange: (callback: (newPhase: GamePhase) => void) => () => void;

  // 服务状态
  isServiceAvailable: ComputedRef<boolean>;
  getServiceStatus: () => ServiceStatus;

  // 组合式函数协调
  registerComposable: (phase: GamePhase, callback: (state: GameState) => Promise<void>) => () => void;
}

// ==================== 组合式函数协调机制 ====================

interface ComposableCallback {
  phase: GamePhase;
  callback: (state: GameState) => Promise<void>;
  id: string;
}

class ComposableCoordinator {
  private callbacks: Map<string, ComposableCallback> = new Map();
  private nextId = 0;

  register(phase: GamePhase, callback: (state: GameState) => Promise<void>): () => void {
    const id = `composable_${this.nextId++}`;
    this.callbacks.set(id, { phase, callback, id });

    return () => {
      this.callbacks.delete(id);
    };
  }

  async coordinate(newState: GameState): Promise<void> {
    const phase = newState.phase;
    const relevantCallbacks = Array.from(this.callbacks.values()).filter(cb => cb.phase === phase);

    if (relevantCallbacks.length === 0) {
      return;
    }

    try {
      await Promise.all(relevantCallbacks.map(cb => cb.callback(newState)));
    } catch (error) {
      console.error('[ComposableCoordinator] 组合式函数协调失败:', error);
      throw error;
    }
  }
}

// ==================== 主要组合式函数 ====================

export function useGameStateManager(): GameStateManager {
  // 依赖注入
  const gameStateService = inject<GameStateService>(TYPES.GameStateService);
  const globalState = useGlobalState();

  const resolveEventBus = (): EventBus | undefined => {
    return globalState.getEventBus() as EventBus | undefined;
  };

  const emitEvent = (eventName: string, payload?: any, silent?: boolean) => {
    if (silent) return;
    resolveEventBus()?.emit?.(eventName, payload);
  };

  // 响应式状态
  const currentState = ref<GameState>({ phase: GamePhase.INITIAL, started: false });
  const isTransitioning = ref(false);
  const coordinator = new ComposableCoordinator();

  // 状态切换锁
  let transitionLock: Promise<boolean> | null = null;

  // 计算属性
  const currentPhase = computed(() => currentState.value.phase);
  const isInBattle = computed(() => currentState.value.phase === GamePhase.BATTLE);
  const isPlaying = computed(() => currentState.value.phase === GamePhase.PLAYING);
  const isInitial = computed(() => currentState.value.phase === GamePhase.INITIAL);
  const isCreation = computed(() => currentState.value.phase === GamePhase.CREATION);
  const hasBattleConfig = computed(() => !!currentState.value.battleConfig);
  const hasBattleState = computed(() => !!currentState.value.battleState);
  const isServiceAvailable = computed(() => {
    return !!(gameStateService && resolveEventBus());
  });

  // ==================== 错误处理 ====================

  const createError = (
    code: GameStateError['code'],
    message: string,
    phase?: GamePhase,
    options?: GameStateTransitionOptions,
    originalError?: Error,
  ): GameStateError => {
    const error = new Error(message) as GameStateError;
    error.code = code;
    error.phase = phase;
    error.options = options;
    error.originalError = originalError;
    return error;
  };

  const handleError = (
    error: unknown,
    operation: string,
    phase?: GamePhase,
    options?: GameStateTransitionOptions,
  ): boolean => {
    let gameStateError: GameStateError;

    if (error instanceof Error && 'code' in error) {
      gameStateError = error as GameStateError;
    } else {
      const message = error instanceof Error ? error.message : `${operation}失败`;
      gameStateError = createError(
        'TRANSITION_FAILED',
        message,
        phase,
        options,
        error instanceof Error ? error : undefined,
      );
    }

    console.error(`[useGameStateManager] ${operation}失败:`, gameStateError);

    // 事件通知
    emitEvent(
      'game:transition-failed',
      {
        targetPhase: phase,
        error: gameStateError,
        options,
      },
      options?.silent,
    );

    return false;
  };

  // ==================== 状态切换核心逻辑 ====================

  const performTransition = async (
    targetPhase: GamePhase,
    options: GameStateTransitionOptions = {},
  ): Promise<boolean> => {
    if (!isServiceAvailable.value) {
      throw createError('SERVICE_UNAVAILABLE', '游戏状态服务不可用');
    }

    // 如果已经有状态切换在进行，等待它完成
    if (transitionLock) {
      try {
        await transitionLock;
      } catch (error) {
        // 忽略前一个切换的错误，继续执行当前切换
        console.warn('[useGameStateManager] 前一个状态切换失败，继续执行当前切换:', error);
      }
    }

    // 创建新的状态切换锁
    transitionLock = executeTransition(targetPhase, options);
    isTransitioning.value = true;

    try {
      const result = await transitionLock;
      return result;
    } finally {
      transitionLock = null;
      isTransitioning.value = false;
    }
  };

  const executeTransition = async (
    targetPhase: GamePhase,
    options: GameStateTransitionOptions = {},
  ): Promise<boolean> => {
    try {
      // 触发开始事件
      emitEvent('game:transition-start', { targetPhase, options }, options.silent);

      let success = false;

      // 根据目标阶段执行相应的状态切换
      switch (targetPhase) {
        case GamePhase.INITIAL:
          success = await gameStateService!.transitionToInitial();
          break;
        case GamePhase.CREATION:
          success = await gameStateService!.transitionToCreation();
          break;
        case GamePhase.PLAYING:
          success = await gameStateService!.transitionToPlaying(options.saveName, options.slotId);
          break;
        default:
          throw createError('VALIDATION_ERROR', `无效的游戏阶段: ${targetPhase}`, targetPhase, options);
      }

      if (!success) {
        throw createError('TRANSITION_FAILED', '状态切换失败', targetPhase, options);
      }

      // 更新创建数据（如果提供）
      if (options.creationData && targetPhase === GamePhase.PLAYING) {
        const updateSuccess = await gameStateService!.updateCreationData(options.creationData);
        if (!updateSuccess) {
          console.warn('[useGameStateManager] 创建数据更新失败，但状态切换成功');
        }
      }

      // 获取最新状态
      const newState = gameStateService!.getCurrentGameState();
      currentState.value = newState;

      // 协调组合式函数
      try {
        await coordinator.coordinate(newState);
      } catch (coordinationError) {
        console.error('[useGameStateManager] 组合式函数协调失败:', coordinationError);
        // 协调失败不影响状态切换成功
      }

      // 触发完成事件
      emitEvent('game:transition-complete', { targetPhase, success: true }, options.silent);

      return true;
    } catch (error) {
      // 触发失败事件
      emitEvent('game:transition-failed', { targetPhase, error, options }, options.silent);
      throw error;
    }
  };

  // ==================== 状态切换方法 ====================

  const transitionToInitial = async (options?: GameStateTransitionOptions): Promise<boolean> => {
    try {
      return await performTransition(GamePhase.INITIAL, options);
    } catch (error) {
      return handleError(error, '转换到初始状态', GamePhase.INITIAL, options);
    }
  };

  const transitionToCreation = async (options?: GameStateTransitionOptions): Promise<boolean> => {
    try {
      return await performTransition(GamePhase.CREATION, options);
    } catch (error) {
      return handleError(error, '转换到创建状态', GamePhase.CREATION, options);
    }
  };

  const transitionToPlaying = async (
    optionsOrSaveName?: GameStateTransitionOptions | string,
    slotId?: string,
  ): Promise<boolean> => {
    try {
      let options: GameStateTransitionOptions;

      // 支持重载：直接传递 saveName 和 slotId 参数
      if (typeof optionsOrSaveName === 'string') {
        options = {
          saveName: optionsOrSaveName,
          slotId: slotId,
        };
      } else {
        options = optionsOrSaveName || {};
      }

      return await performTransition(GamePhase.PLAYING, options);
    } catch (error) {
      return handleError(
        error,
        '转换到游戏状态',
        GamePhase.PLAYING,
        typeof optionsOrSaveName === 'string' ? { saveName: optionsOrSaveName, slotId } : optionsOrSaveName,
      );
    }
  };

  // ==================== 战斗管理方法 ====================

  const enterBattle = async (battleConfig: any, previousPhase?: GamePhase): Promise<boolean> => {
    if (!isServiceAvailable.value) {
      throw createError('SERVICE_UNAVAILABLE', '游戏状态服务不可用');
    }

    try {
      const oldPhase = currentState.value.phase;

      // 将 BattleConfig 包装在 BattleConfigItem 结构中，确保数据结构一致性
      const battleConfigItem = {
        id: 'current_battle',
        name: '当前战斗',
        description: '正在进行的战斗',
        difficulty: 'normal' as const,
        config: battleConfig, // 原始 BattleConfig
      };

      const newState = {
        ...currentState.value,
        phase: GamePhase.BATTLE,
        previousPhase: previousPhase || oldPhase,
        battleConfig: battleConfigItem, // 存储完整的 BattleConfigItem
        battleState: {
          started: true,
          ended: false,
          winner: null,
          currentTurn: 'player',
          participants: battleConfig.participants || [],
        },
      };

      // 更新内存状态
      currentState.value = newState;

      // 通知状态变化
      if (gameStateService) {
        await gameStateService.setGameState(newState);
      }

      // 发送事件
      emitEvent('game:enter-battle', {
        battleConfig,
        previousPhase: previousPhase || oldPhase,
      });

      console.log('[useGameStateManager] Entered battle:', {
        battleConfig,
        previousPhase: previousPhase || oldPhase,
      });

      return true;
    } catch (error) {
      return handleError(error, '进入战斗状态');
    }
  };

  const exitBattle = async (returnToPrevious: boolean = true): Promise<boolean> => {
    if (!isServiceAvailable.value) {
      throw createError('SERVICE_UNAVAILABLE', '游戏状态服务不可用');
    }

    try {
      const previousPhase = currentState.value.previousPhase || GamePhase.PLAYING;
      const newState = {
        ...currentState.value,
        phase: returnToPrevious ? previousPhase : GamePhase.PLAYING,
        previousPhase: undefined,
        battleConfig: undefined,
        battleState: undefined,
      };

      // 更新内存状态
      currentState.value = newState;

      // 通知状态变化
      if (gameStateService) {
        await gameStateService.setGameState(newState);
      }

      // 发送事件
      emitEvent('game:exit-battle', {
        returnToPrevious,
        previousPhase,
      });

      console.log('[useGameStateManager] Exited battle:', {
        returnToPrevious,
        newPhase: currentState.value.phase,
      });

      return true;
    } catch (error) {
      return handleError(error, '退出战斗状态');
    }
  };

  const updateBattleState = async (battleState: any): Promise<boolean> => {
    if (!isServiceAvailable.value) {
      throw createError('SERVICE_UNAVAILABLE', '游戏状态服务不可用');
    }

    if (currentState.value.phase !== GamePhase.BATTLE) {
      console.warn('[useGameStateManager] 当前不在战斗状态，无法更新战斗状态');
      return false;
    }

    try {
      const newState = {
        ...currentState.value,
        battleState: {
          ...currentState.value.battleState,
          ...battleState,
        },
      };

      // 更新内存状态
      currentState.value = newState;

      // 通知状态变化
      if (gameStateService) {
        await gameStateService.setGameState(newState);
      }

      // 发送事件
      emitEvent('game:battle-state-changed', { battleState });

      return true;
    } catch (error) {
      return handleError(error, '更新战斗状态');
    }
  };

  // ==================== 状态更新方法 ====================

  const updateCreationData = async (data: CreationData): Promise<boolean> => {
    if (!isServiceAvailable.value) {
      throw createError('SERVICE_UNAVAILABLE', '游戏状态服务不可用');
    }

    try {
      const success = await gameStateService!.updateCreationData(data);
      if (success) {
        currentState.value = gameStateService!.getCurrentGameState();
      }
      return success;
    } catch (error) {
      return handleError(error, '更新创建数据');
    }
  };

  const startNewGame = async (): Promise<boolean> => {
    if (!isServiceAvailable.value) {
      throw createError('SERVICE_UNAVAILABLE', '游戏状态服务不可用');
    }

    try {
      const success = await gameStateService!.startNewGame();
      if (success) {
        currentState.value = gameStateService!.getCurrentGameState();
      }
      return success;
    } catch (error) {
      return handleError(error, '开始新游戏');
    }
  };

  const setPlayer = async (name: string): Promise<boolean> => {
    if (!isServiceAvailable.value) {
      throw createError('SERVICE_UNAVAILABLE', '游戏状态服务不可用');
    }

    try {
      const newState = {
        ...currentState.value,
        player: { name },
      };

      currentState.value = newState;

      if (gameStateService) {
        await gameStateService.setGameState(newState);
      }

      return true;
    } catch (error) {
      return handleError(error, '设置玩家信息');
    }
  };

  const setCreationData = async (creationData: CreationData): Promise<boolean> => {
    if (!isServiceAvailable.value) {
      throw createError('SERVICE_UNAVAILABLE', '游戏状态服务不可用');
    }

    try {
      const newState = {
        ...currentState.value,
        creationData,
      };

      currentState.value = newState;

      if (gameStateService) {
        await gameStateService.setGameState(newState);
      }

      return true;
    } catch (error) {
      return handleError(error, '设置创建数据');
    }
  };

  const resetGameState = async (): Promise<boolean> => {
    if (!isServiceAvailable.value) {
      throw createError('SERVICE_UNAVAILABLE', '游戏状态服务不可用');
    }

    try {
      const success = await gameStateService!.resetGameState();
      if (success) {
        currentState.value = gameStateService!.getCurrentGameState();
      }
      return success;
    } catch (error) {
      return handleError(error, '重置游戏状态');
    }
  };

  const reset = async (): Promise<boolean> => {
    try {
      const resetState = {
        phase: GamePhase.INITIAL,
        started: false,
      };

      currentState.value = resetState;

      if (gameStateService) {
        await gameStateService.setGameState(resetState);
      }

      emitEvent('game:state-reset');

      return true;
    } catch (error) {
      return handleError(error, '重置状态');
    }
  };

  // ==================== 状态监听 ====================

  const onStateChange = (callback: (newState: GameState) => void): (() => void) => {
    if (!gameStateService) {
      console.warn('[useGameStateManager] GameStateService 不可用，无法注册状态监听器');
      return () => {};
    }

    gameStateService.onStateChange(callback);
    return () => {
      gameStateService.offStateChange(callback);
    };
  };

  const onPhaseChange = (callback: (newPhase: GamePhase) => void): (() => void) => {
    return onStateChange(newState => {
      callback(newState.phase);
    });
  };

  // ==================== 状态查询方法 ====================

  const getCurrentGameState = (): GameState => {
    return { ...currentState.value };
  };

  const getCurrentPhase = (): GamePhase => {
    return currentState.value.phase;
  };

  const getCreationData = (): CreationData | undefined => {
    return currentState.value.creationData;
  };

  const getBattleConfig = (): any => {
    return currentState.value.battleConfig;
  };

  const getBattleState = (): any => {
    return currentState.value.battleState;
  };

  const getPreviousPhase = (): GamePhase | undefined => {
    return currentState.value.previousPhase;
  };

  // ==================== 服务状态检查 ====================

  const getServiceStatus = (): ServiceStatus => ({
    gameStateService: !!gameStateService,
    eventBus: !!resolveEventBus(),
  });

  // ==================== 组合式函数协调 ====================

  const registerComposable = (phase: GamePhase, callback: (state: GameState) => Promise<void>): (() => void) => {
    return coordinator.register(phase, callback);
  };

  // ==================== 生命周期管理 ====================

  onMounted(async () => {
    try {
      // 初始化当前状态
      if (gameStateService) {
        currentState.value = gameStateService.getCurrentGameState();

        // 监听状态变化
        gameStateService.onStateChange(newState => {
          currentState.value = newState;
        });
      }
    } catch (error) {
      console.error('[useGameStateManager] 初始化失败:', error);
    }
  });

  onUnmounted(() => {
    // 清理工作由各个监听器的返回函数处理
  });

  // ==================== 返回接口 ====================

  return {
    // 状态查询
    currentPhase,
    currentState: computed(() => currentState.value),
    isTransitioning: computed(() => isTransitioning.value),

    // 计算属性
    isInBattle,
    isPlaying,
    isInitial,
    isCreation,
    hasBattleConfig,
    hasBattleState,

    // 状态切换方法
    transitionToInitial,
    transitionToCreation,
    transitionToPlaying,

    // 战斗管理
    enterBattle,
    exitBattle,
    updateBattleState,

    // 状态更新方法
    updateCreationData,
    setPlayer,
    setCreationData,
    startNewGame,
    resetGameState,
    reset,

    // 状态查询方法
    getCurrentGameState,
    getCurrentPhase,
    getCreationData,
    getBattleConfig,
    getBattleState,
    getPreviousPhase,

    // 状态监听
    onStateChange,
    onPhaseChange,

    // 服务状态
    isServiceAvailable,
    getServiceStatus,

    // 组合式函数协调
    registerComposable,
  };
}
