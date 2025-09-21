/**
 * GameStateService
 * 负责游戏状态管理，专注于状态变化监听和通知
 * 状态仅在内存中维护，不进行持久化
 */

import { inject, injectable } from 'inversify';
import type { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import type { CreationData, GameState } from '../models/GameState';
import { GamePhase } from '../models/GameState';

// GameState 类型从 models/GameState.ts 导入

@injectable()
export class GameStateService {
  private stateChangeListeners: Array<(newState: GameState) => void> = [];
  private currentState: GameState = { phase: GamePhase.INITIAL, started: false };

  constructor(@inject(TYPES.EventBus) private eventBus: EventBus) {}

  /**
   * 初始化服务，设置初始状态
   */
  public async initialize(): Promise<void> {
    try {
      // 状态仅在内存中维护，始终从初始状态开始
      this.currentState = { phase: GamePhase.INITIAL, started: false };
      this.notifyStateChange(this.currentState);
    } catch (error) {
      console.error('[GameStateService] Failed to initialize:', error);
      this.currentState = { phase: GamePhase.INITIAL, started: false };
    }
  }

  /**
   * 获取当前游戏状态（内存中的状态）
   */
  public getCurrentGameState(): GameState {
    return { ...this.currentState };
  }

  /**
   * 重置游戏状态
   */
  public async resetGameState(): Promise<boolean> {
    try {
      const resetState = {
        phase: GamePhase.INITIAL,
        started: false,
        saveName: undefined,
        lastLoaded: undefined,
        creationData: undefined,
      };

      // 更新内存状态
      this.currentState = resetState;
      this.notifyStateChange(resetState);
      this.eventBus.emit('game:state-reset');
      return true;
    } catch (error) {
      console.error('[GameStateService] Failed to reset game state:', error);
      return false;
    }
  }

  /**
   * 开始新游戏
   */
  public async startNewGame(): Promise<boolean> {
    try {
      const newState = {
        phase: GamePhase.INITIAL,
        started: true,
        saveName: undefined,
        lastLoaded: Date.now(),
      };

      // 更新内存状态
      this.currentState = newState;
      this.notifyStateChange(newState);
      this.eventBus.emit('game:new-game-started');
      return true;
    } catch (error) {
      console.error('[GameStateService] Failed to start new game:', error);
      return false;
    }
  }

  /**
   * 转换到初始状态
   */
  public async transitionToInitial(): Promise<boolean> {
    try {
      const newState = {
        phase: GamePhase.INITIAL,
        started: false,
        saveName: undefined,
        lastLoaded: undefined,
        creationData: undefined,
      };

      // 更新内存状态
      this.currentState = newState;
      this.notifyStateChange(newState);
      this.eventBus.emit('game:phase-changed', { phase: 'initial' });
      return true;
    } catch (error) {
      console.error('[GameStateService] Failed to transition to initial:', error);
      return false;
    }
  }

  /**
   * 转换到创建状态
   */
  public async transitionToCreation(): Promise<boolean> {
    try {
      const newState = {
        ...this.currentState,
        phase: GamePhase.CREATION,
        started: false,
        saveName: undefined,
        lastLoaded: undefined,
      };

      // 更新内存状态
      this.currentState = newState;
      this.notifyStateChange(newState);
      this.eventBus.emit('game:phase-changed', { phase: 'creation' });
      return true;
    } catch (error) {
      console.error('[GameStateService] Failed to transition to creation:', error);
      return false;
    }
  }

  /**
   * 转换到进行状态
   */
  public async transitionToPlaying(saveName?: string, slotId?: string): Promise<boolean> {
    try {
      const newState = {
        ...this.currentState,
        phase: GamePhase.PLAYING,
        started: true,
        saveName: saveName || this.currentState.saveName,
        lastLoaded: Date.now(),
        // 将 slotId 存储在状态中，供后续查找使用
        slotId: slotId,
      };

      // 更新内存状态
      this.currentState = newState;
      this.notifyStateChange(newState);
      this.eventBus.emit('game:phase-changed', { phase: 'playing', saveName, slotId });
      return true;
    } catch (error) {
      console.error('[GameStateService] Failed to transition to playing:', error);
      return false;
    }
  }

  /**
   * 更新创建数据
   */
  public async updateCreationData(creationData: CreationData): Promise<boolean> {
    try {
      const newState = {
        ...this.currentState,
        creationData,
      };

      // 更新内存状态
      this.currentState = newState;
      this.notifyStateChange(newState);
      this.eventBus.emit('game:creation-data-updated', creationData);
      return true;
    } catch (error) {
      console.error('[GameStateService] Failed to update creation data:', error);
      return false;
    }
  }

  /**
   * 获取当前游戏阶段
   */
  public getCurrentPhase(): GamePhase {
    return this.currentState.phase || GamePhase.INITIAL;
  }

  /**
   * 获取创建数据
   */
  public getCreationData(): CreationData | undefined {
    return this.currentState.creationData;
  }

  /**
   * 监听游戏状态变化
   */
  public onStateChange(listener: (newState: GameState) => void): void {
    this.stateChangeListeners.push(listener);
  }

  /**
   * 移除状态变化监听器
   */
  public offStateChange(listener: (newState: GameState) => void): void {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index > -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(newState: GameState): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(newState);
      } catch (error) {
        console.error('[GameStateService] State change listener error:', error);
      }
    });
  }

  /**
   * 设置游戏状态（带通知）
   */
  public async setGameState(newState: GameState): Promise<boolean> {
    try {
      // 更新内存状态
      this.currentState = { ...newState };
      this.notifyStateChange(newState);
      return true;
    } catch (error) {
      console.error('[GameStateService] Failed to set game state:', error);
      return false;
    }
  }
}
