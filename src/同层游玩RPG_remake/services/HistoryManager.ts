/**
 * HistoryManager - 战斗状态历史管理器
 *
 * 职责：
 * - 记录战斗状态变更历史
 * - 提供撤销/重做功能
 * - 管理历史记录大小限制
 * - 支持状态快照和恢复
 */

import { cloneDeep } from 'lodash';
import type { BattleStateExtended } from '../composables/useBattleState';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  state: BattleStateExtended;
}

export class HistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex = -1;
  private maxHistorySize = 50;
  private isRecording = true;

  /**
   * 记录状态变更
   */
  recordChange(state: BattleStateExtended, description: string = '状态变更'): void {
    if (!this.isRecording) return;

    // 移除当前位置之后的历史
    this.history = this.history.slice(0, this.currentIndex + 1);

    // 添加新状态
    const entry: HistoryEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      description,
      state: cloneDeep(state),
    };

    this.history.push(entry);
    this.currentIndex++;

    // 限制历史大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }

    console.log('[HistoryManager] Recorded change:', {
      description,
      historySize: this.history.length,
      currentIndex: this.currentIndex,
    });
  }

  /**
   * 撤销到上一个状态
   */
  undo(): BattleStateExtended | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const entry = this.history[this.currentIndex];
      console.log('[HistoryManager] Undo to:', entry.description);
      return cloneDeep(entry.state);
    }
    console.log('[HistoryManager] Nothing to undo');
    return null;
  }

  /**
   * 重做到下一个状态
   */
  redo(): BattleStateExtended | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const entry = this.history[this.currentIndex];
      console.log('[HistoryManager] Redo to:', entry.description);
      return cloneDeep(entry.state);
    }
    console.log('[HistoryManager] Nothing to redo');
    return null;
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 获取历史记录信息
   */
  getHistoryInfo(): {
    totalEntries: number;
    currentIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    recentEntries: Array<{ description: string; timestamp: number }>;
  } {
    return {
      totalEntries: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      recentEntries: this.history.slice(-5).map(entry => ({
        description: entry.description,
        timestamp: entry.timestamp,
      })),
    };
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    console.log('[HistoryManager] History cleared');
  }

  /**
   * 设置历史记录大小限制
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(1, size);

    // 如果当前历史超过新限制，截断
    if (this.history.length > this.maxHistorySize) {
      const excess = this.history.length - this.maxHistorySize;
      this.history = this.history.slice(excess);
      this.currentIndex = Math.max(-1, this.currentIndex - excess);
    }
  }

  /**
   * 暂停/恢复记录
   */
  setRecording(enabled: boolean): void {
    this.isRecording = enabled;
    console.log('[HistoryManager] Recording', enabled ? 'enabled' : 'disabled');
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 导出历史记录（用于调试）
   */
  exportHistory(): HistoryEntry[] {
    return cloneDeep(this.history);
  }

  /**
   * 导入历史记录（用于调试）
   */
  importHistory(history: HistoryEntry[]): void {
    this.history = cloneDeep(history);
    this.currentIndex = this.history.length - 1;
    console.log('[HistoryManager] History imported:', this.history.length, 'entries');
  }
}

// 单例实例
export const historyManager = new HistoryManager();
