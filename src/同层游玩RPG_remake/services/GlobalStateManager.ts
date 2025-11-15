/**
 * 全局状态管理器
 * 统一管理跨组件、跨环境（Vue/Phaser）的全局状态
 *
 * 这个服务管理那些必须在全局作用域中访问的状态，
 * 例如：状态切换时的数据传递、流式生成控制、跨环境共享等
 */

import { injectable } from 'inversify';

export interface PendingSaveData {
  slotId: string;
  name: string;
  messages: any[];
  statData?: any;
  mvuSnapshots?: any[];
  // 开局自动触发首轮生成（可选）
  autoStart?: boolean;
  initialUserInput?: string;
}

export interface StreamHandle {
  abort: () => void;
  cleanup: () => void;
  getResult: () => Promise<any>;
}

/**
 * 全局状态管理器服务
 * 提供类型安全的全局状态访问
 */
@injectable()
export class GlobalStateManager {
  private static readonly PREFIX = '__RPG_';

  /**
   * 设置待处理的存档数据
   * 用于状态切换时传递数据
   */
  setPendingSaveData(data: PendingSaveData | null): void {
    if (data === null) {
      delete (window as any)[`${GlobalStateManager.PREFIX}PENDING_SAVE_DATA`];
    } else {
      (window as any)[`${GlobalStateManager.PREFIX}PENDING_SAVE_DATA`] = data;
    }
  }

  /**
   * 获取待处理的存档数据
   */
  getPendingSaveData(): PendingSaveData | null {
    return (window as any)[`${GlobalStateManager.PREFIX}PENDING_SAVE_DATA`] || null;
  }

  /**
   * 清除待处理的存档数据
   */
  clearPendingSaveData(): void {
    this.setPendingSaveData(null);
  }

  /**
   * 设置当前流式生成句柄
   */
  setCurrentStreamHandle(handle: StreamHandle | null): void {
    if (handle === null) {
      delete (window as any)[`${GlobalStateManager.PREFIX}CURRENT_STREAM_HANDLE`];
    } else {
      (window as any)[`${GlobalStateManager.PREFIX}CURRENT_STREAM_HANDLE`] = handle;
    }
  }

  /**
   * 获取当前流式生成句柄
   */
  getCurrentStreamHandle(): StreamHandle | null {
    return (window as any)[`${GlobalStateManager.PREFIX}CURRENT_STREAM_HANDLE`] || null;
  }

  /**
   * 清除当前流式生成句柄
   */
  clearCurrentStreamHandle(): void {
    this.setCurrentStreamHandle(null);
  }

  /**
   * 注册游戏状态管理器引用
   * 用于在非 Vue 环境中访问
   */
  setGameStateManager(manager: any): void {
    (window as any)[`${GlobalStateManager.PREFIX}GAME_STATE_MANAGER`] = manager;
  }

  /**
   * 获取游戏状态管理器引用
   */
  getGameStateManager(): any {
    return (window as any)[`${GlobalStateManager.PREFIX}GAME_STATE_MANAGER`];
  }

  /**
   * 注册取消订阅函数
   * 用于清理事件监听器
   */
  setUnsubscribeFunction(key: string, unsubscribe: (() => void) | null): void {
    const fullKey = `${GlobalStateManager.PREFIX}${key}_UNREGISTER`;
    if (unsubscribe === null) {
      delete (window as any)[fullKey];
    } else {
      (window as any)[fullKey] = unsubscribe;
    }
  }

  /**
   * 获取取消订阅函数
   */
  getUnsubscribeFunction(key: string): (() => void) | null {
    const fullKey = `${GlobalStateManager.PREFIX}${key}_UNREGISTER`;
    return (window as any)[fullKey] || null;
  }

  /**
   * 执行并清除取消订阅函数
   */
  executeAndClearUnsubscribe(key: string): boolean {
    const unsubscribe = this.getUnsubscribeFunction(key);
    if (unsubscribe && typeof unsubscribe === 'function') {
      try {
        unsubscribe();
        this.setUnsubscribeFunction(key, null);
        return true;
      } catch (error) {
        console.error(`[GlobalStateManager] 执行取消订阅函数失败: ${key}`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * 设置 MVU 快照
   */
  setMvuSnapshots(snapshots: any[]): void {
    (window as any)[`${GlobalStateManager.PREFIX}LAST_MVU_SNAPSHOTS`] = snapshots;
  }

  /**
   * 获取 MVU 快照
   */
  getMvuSnapshots(): any[] {
    return (window as any)[`${GlobalStateManager.PREFIX}LAST_MVU_SNAPSHOTS`] || [];
  }

  /**
   * 设置事件总线引用
   */
  setEventBus(eventBus: any): void {
    (window as any)[`${GlobalStateManager.PREFIX}EVENT_BUS`] = eventBus;
  }

  /**
   * 获取事件总线引用
   */
  getEventBus(): any {
    return (window as any)[`${GlobalStateManager.PREFIX}EVENT_BUS`];
  }

  /**
   * 清理所有全局状态
   * 用于重置游戏或清理资源
   */
  clearAll(): void {
    const prefix = GlobalStateManager.PREFIX;
    const keys = Object.keys(window).filter(key => key.startsWith(prefix));

    keys.forEach(key => {
      try {
        delete (window as any)[key];
      } catch (error) {
        console.warn(`[GlobalStateManager] 清理全局状态失败: ${key}`, error);
      }
    });
  }

  /**
   * 获取所有全局状态的诊断信息
   */
  getDiagnostics(): Record<string, any> {
    const prefix = GlobalStateManager.PREFIX;
    const keys = Object.keys(window).filter(key => key.startsWith(prefix));

    const diagnostics: Record<string, any> = {};
    keys.forEach(key => {
      const value = (window as any)[key];
      diagnostics[key] = {
        exists: value !== undefined,
        type: typeof value,
        isFunction: typeof value === 'function',
      };
    });

    return diagnostics;
  }
}
