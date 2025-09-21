import _ from 'lodash';
import {
  createInitialGameState,
  validateAndCorrectAttributes,
  validateDestinyPoints,
  validateGameState,
  type GameState,
} from '../models/schemas';
import { EventBus } from './EventBus';

/**
 * StateManager - 游戏状态管理器
 *
 * 职责：
 * - 统一管理游戏状态
 * - 提供状态变更的响应式更新
 * - 处理状态的持久化和恢复
 * - 确保状态变更的原子性和一致性
 */
export class StateManager {
  private state: GameState;
  private eventBus: EventBus;
  private stateHistory: GameState[] = [];
  private maxHistorySize = 10;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.state = createInitialGameState();
    this.setupEventListeners();

    console.log('[StateManager] 状态管理器初始化完成');
  }

  /**
   * 获取当前游戏状态（只读）
   */
  getState(): Readonly<GameState> {
    return _.cloneDeep(this.state);
  }

  /**
   * 更新游戏状态（使用Zod验证）
   * @param updater 状态更新函数或新状态对象
   * @param options 更新选项
   */
  updateState(
    updater: ((state: GameState) => GameState) | Partial<GameState>,
    options: {
      silent?: boolean;
      saveToHistory?: boolean;
      reason?: string;
      allowCorrection?: boolean;
    } = {},
  ): void {
    const { silent = false, saveToHistory = true, reason = 'unknown', allowCorrection = true } = options;

    try {
      // 保存当前状态到历史记录
      if (saveToHistory) {
        this.saveToHistory();
      }

      const oldState = _.cloneDeep(this.state);

      // 应用状态更新
      let newState: GameState;
      if (typeof updater === 'function') {
        newState = updater(_.cloneDeep(this.state));
      } else {
        newState = { ...this.state, ...updater } as GameState;
      }

      // 使用Zod验证新状态
      const validationResult = this.validateAndCorrectState(newState, allowCorrection);

      if (!validationResult.success) {
        const errorMessage = this.formatZodErrors(validationResult.errors!);
        console.error('[StateManager] 状态验证失败:', errorMessage);

        this.eventBus.emit('error:state-validation', {
          reason,
          errors: validationResult.errors,
          attempted: newState,
        });

        throw new Error(`状态验证失败: ${errorMessage}`);
      }

      // 使用验证后的状态
      this.state = validationResult.data!;

      // 如果进行了自动纠正，发送通知
      if (validationResult.corrected) {
        console.warn('[StateManager] 状态已自动纠正:', reason);
        this.eventBus.emit('state:auto-corrected', {
          reason,
          oldState,
          correctedState: this.state,
          timestamp: new Date(),
        });

        if (typeof toastr !== 'undefined') {
          toastr.warning('数据已自动纠正');
        }
      }

      // 发送状态变更事件
      if (!silent) {
        this.eventBus.emit('state:changed', {
          oldState,
          newState: _.cloneDeep(this.state),
          reason,
          corrected: validationResult.corrected || false,
        });

        // 发送具体的状态变更事件
        this.emitSpecificStateEvents(oldState, this.state);
      }

      console.debug('[StateManager] 状态已更新:', reason, this.state);
    } catch (error) {
      console.error('[StateManager] 状态更新失败:', error);
      this.eventBus.emit('error:state-update', error);
      throw error;
    }
  }

  /**
   * 重置游戏状态
   */
  resetState(options: { silent?: boolean } = {}): void {
    console.log('[StateManager] 重置游戏状态');

    this.updateState(() => createInitialGameState(), {
      silent: options.silent,
      saveToHistory: false,
      reason: 'reset',
    });

    // 清空历史记录
    this.stateHistory = [];
  }

  /**
   * 从历史记录中恢复状态
   * @param steps 回退的步数，默认为1
   */
  undoState(steps: number = 1): boolean {
    if (this.stateHistory.length === 0) {
      console.warn('[StateManager] 没有可恢复的历史状态');
      return false;
    }

    const targetIndex = Math.max(0, this.stateHistory.length - steps);
    const targetState = this.stateHistory[targetIndex];

    if (targetState) {
      // 移除当前位置之后的历史记录
      this.stateHistory = this.stateHistory.slice(0, targetIndex);

      this.updateState(() => _.cloneDeep(targetState), {
        saveToHistory: false,
        reason: `undo-${steps}-steps`,
      });

      console.log('[StateManager] 状态已恢复:', steps, '步');
      return true;
    }

    return false;
  }

  /**
   * 获取状态历史记录数量
   */
  getHistorySize(): number {
    return this.stateHistory.length;
  }

  /**
   * 订阅状态变更
   * @param path 状态路径，如 'phase' 或 'character.name'
   * @param callback 回调函数
   * @returns 取消订阅的函数
   */
  subscribe(path: string, callback: (newValue: any, oldValue: any) => void): () => void {
    return this.eventBus.on('state:changed', ({ oldState, newState }) => {
      const oldValue = _.get(oldState, path);
      const newValue = _.get(newState, path);

      if (!_.isEqual(oldValue, newValue)) {
        callback(newValue, oldValue);
      }
    });
  }

  /**
   * 订阅特定状态事件
   */
  subscribeToPhaseChange(callback: (newPhase: string, oldPhase: string) => void): () => void {
    return this.eventBus.on('state:phase-changed', callback);
  }

  /**
   * 订阅创建步骤变更
   */
  subscribeToCreationStepChange(callback: (newStep: string, oldStep: string) => void): () => void {
    return this.eventBus.on('state:creation-step-changed', callback);
  }

  /**
   * 获取状态快照（用于调试）
   */
  getStateSnapshot(): {
    current: GameState;
    history: GameState[];
    historySize: number;
  } {
    return {
      current: _.cloneDeep(this.state),
      history: _.cloneDeep(this.stateHistory),
      historySize: this.stateHistory.length,
    };
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听游戏阶段变更
    this.eventBus.on('game:start', () => {
      this.updateState({ phase: 'start' }, { reason: 'game-start' });
    });

    this.eventBus.on('game:creation', () => {
      this.updateState(
        {
          phase: 'creation',
          creation_step: 'difficulty',
        },
        { reason: 'game-creation' },
      );
    });

    this.eventBus.on('game:playing', () => {
      this.updateState({ phase: 'playing' }, { reason: 'game-playing' });
    });

    // 监听创建步骤变更
    this.eventBus.on('creation:step-change', (step: string) => {
      this.updateState({ creation_step: step as any }, { reason: 'creation-step-change' });
    });
  }

  /**
   * 保存当前状态到历史记录
   */
  private saveToHistory(): void {
    this.stateHistory.push(_.cloneDeep(this.state));

    // 限制历史记录大小
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  /**
   * 验证并纠正状态（使用Zod）
   */
  private validateAndCorrectState(
    state: any,
    allowCorrection: boolean = true,
  ): {
    success: boolean;
    data?: GameState;
    errors?: z.ZodError;
    corrected?: boolean;
  } {
    // 使用Zod进行基本验证
    const basicValidation = validateGameState(state);

    if (basicValidation.success) {
      return basicValidation;
    }

    if (!allowCorrection) {
      return basicValidation;
    }

    // 尝试自动纠正
    let corrected = false;
    const correctedState = { ...state };

    try {
      // 纠正属性分配
      if (state.attributes && state.difficulty) {
        const maxPoints = this.getMaxAttributePoints(state.difficulty);
        const attributeValidation = validateAndCorrectAttributes(state.attributes, maxPoints);

        if (attributeValidation.success) {
          correctedState.attributes = attributeValidation.data!;
          if (attributeValidation.corrected) {
            corrected = true;
          }
        }
      }

      // 纠正天命点数
      if (state.destinyPoints) {
        const destinyValidation = validateDestinyPoints(state.destinyPoints);

        if (destinyValidation.success) {
          correctedState.destinyPoints = destinyValidation.data!;
          if (destinyValidation.corrected) {
            corrected = true;
          }
        }
      }

      // 纠正天赋数量限制
      if (state.selectedTalents && Array.isArray(state.selectedTalents)) {
        if (state.selectedTalents.length > 10) {
          correctedState.selectedTalents = state.selectedTalents.slice(0, 10);
          corrected = true;
        }
      }

      // 再次验证纠正后的状态
      const finalValidation = validateGameState(correctedState);

      if (finalValidation.success) {
        return {
          success: true,
          data: finalValidation.data,
          corrected,
        };
      } else {
        return {
          success: false,
          errors: finalValidation.errors,
        };
      }
    } catch (error) {
      console.error('[StateManager] 状态纠正失败:', error);
      return {
        success: false,
        errors: basicValidation.errors,
      };
    }
  }

  /**
   * 获取最大属性点数
   */
  private getMaxAttributePoints(difficulty: string): number {
    switch (difficulty) {
      case '简单':
        return 30;
      case '普通':
        return 20;
      case '困难':
        return 15;
      default:
        return 20;
    }
  }

  /**
   * 格式化Zod错误信息
   */
  private formatZodErrors(errors: z.ZodError): string {
    return errors.errors
      .map(error => {
        const path = error.path.join('.');
        return `${path}: ${error.message}`;
      })
      .join('; ');
  }

  /**
   * 发送具体的状态变更事件
   */
  private emitSpecificStateEvents(oldState: GameState, newState: GameState): void {
    // 阶段变更事件
    if (oldState.phase !== newState.phase) {
      this.eventBus.emit('state:phase-changed', {
        newPhase: newState.phase,
        oldPhase: oldState.phase,
      });
    }

    // 创建步骤变更事件
    if (oldState.creation_step !== newState.creation_step) {
      this.eventBus.emit('state:creation-step-changed', {
        newStep: newState.creation_step,
        oldStep: oldState.creation_step,
      });
    }

    // 世界选择事件
    if (oldState.world !== newState.world) {
      this.eventBus.emit('state:world-changed', {
        newWorld: newState.world,
        oldWorld: oldState.world,
      });
    }

    // 角色创建完成事件
    if (!oldState.character && newState.character) {
      this.eventBus.emit('state:character-created', newState.character);
    }

    // 属性变更事件
    if (!_.isEqual(oldState.attributes, newState.attributes)) {
      this.eventBus.emit('state:attributes-changed', {
        newAttributes: newState.attributes,
        oldAttributes: oldState.attributes,
      });
    }

    // 天赋选择事件
    if (!_.isEqual(oldState.selectedTalents, newState.selectedTalents)) {
      this.eventBus.emit('state:talents-changed', {
        newTalents: newState.selectedTalents,
        oldTalents: oldState.selectedTalents,
      });
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stateHistory = [];
    console.log('[StateManager] 资源清理完成');
  }
}
