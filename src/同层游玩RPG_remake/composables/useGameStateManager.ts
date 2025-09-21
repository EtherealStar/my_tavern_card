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
import type { UIService } from '../services/UIService';

export interface GameStateManager {
  // 状态查询
  currentPhase: ComputedRef<GamePhase>;
  currentState: ComputedRef<GameState>;
  isTransitioning: ComputedRef<boolean>;

  // 状态切换方法
  transitionToInitial: (options?: GameStateTransitionOptions) => Promise<boolean>;
  transitionToCreation: (options?: GameStateTransitionOptions) => Promise<boolean>;
  transitionToPlaying: (options?: GameStateTransitionOptions) => Promise<boolean>;

  // 状态更新方法
  updateCreationData: (data: CreationData) => Promise<boolean>;
  startNewGame: () => Promise<boolean>;
  resetGameState: () => Promise<boolean>;

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
  const eventBus = inject<EventBus>(TYPES.EventBus);
  const ui = inject<UIService>(TYPES.UIService);

  // 响应式状态
  const currentState = ref<GameState>({ phase: GamePhase.INITIAL, started: false });
  const isTransitioning = ref(false);
  const coordinator = new ComposableCoordinator();

  // 计算属性
  const currentPhase = computed(() => currentState.value.phase);
  const isServiceAvailable = computed(() => {
    return !!(gameStateService && eventBus);
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

    // UI反馈
    if (!options?.silent && ui?.error) {
      ui.error(`${operation}失败`, gameStateError.message);
    }

    // 事件通知
    if (eventBus?.emit) {
      eventBus.emit('game:transition-failed', {
        targetPhase: phase,
        error: gameStateError,
        options,
      });
    }

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

    if (isTransitioning.value) {
      throw createError('TRANSITION_FAILED', '状态切换正在进行中');
    }

    isTransitioning.value = true;

    try {
      // 触发开始事件
      if (eventBus?.emit && !options.silent) {
        eventBus.emit('game:transition-start', { targetPhase, options });
      }

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
      if (eventBus?.emit && !options.silent) {
        eventBus.emit('game:transition-complete', { targetPhase, success: true });
      }

      return true;
    } catch (error) {
      // 触发失败事件
      if (eventBus?.emit && !options.silent) {
        eventBus.emit('game:transition-failed', { targetPhase, error, options });
      }
      throw error;
    } finally {
      isTransitioning.value = false;
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

  const transitionToPlaying = async (options?: GameStateTransitionOptions): Promise<boolean> => {
    try {
      return await performTransition(GamePhase.PLAYING, options);
    } catch (error) {
      return handleError(error, '转换到游戏状态', GamePhase.PLAYING, options);
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

  // ==================== 服务状态检查 ====================

  const getServiceStatus = (): ServiceStatus => {
    return {
      gameStateService: !!gameStateService,
      eventBus: !!eventBus,
      uiService: !!ui,
    };
  };

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

    // 状态切换方法
    transitionToInitial,
    transitionToCreation,
    transitionToPlaying,

    // 状态更新方法
    updateCreationData,
    startNewGame,
    resetGameState,

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
