/**
 * 全局状态管理组合式函数
 * 提供类型安全的全局状态访问接口
 */

import { inject } from 'vue';
import { TYPES } from '../core/ServiceIdentifiers';
import type { GlobalStateManager, PendingSaveData, StreamHandle } from '../services/GlobalStateManager';

export function useGlobalState() {
  const globalStateManager = inject<GlobalStateManager>(TYPES.GlobalStateManager);

  if (!globalStateManager) {
    console.warn('[useGlobalState] GlobalStateManager not available');
  }

  return {
    // 待处理存档数据
    setPendingSaveData: (data: PendingSaveData | null) => globalStateManager?.setPendingSaveData(data),
    getPendingSaveData: () => globalStateManager?.getPendingSaveData() || null,
    clearPendingSaveData: () => globalStateManager?.clearPendingSaveData(),

    // 流式生成控制
    setCurrentStreamHandle: (handle: StreamHandle | null) => globalStateManager?.setCurrentStreamHandle(handle),
    getCurrentStreamHandle: () => globalStateManager?.getCurrentStreamHandle() || null,
    clearCurrentStreamHandle: () => globalStateManager?.clearCurrentStreamHandle(),

    // 游戏状态管理器引用
    setGameStateManager: (manager: any) => globalStateManager?.setGameStateManager(manager),
    getGameStateManager: () => globalStateManager?.getGameStateManager(),

    // 取消订阅函数管理
    setUnsubscribeFunction: (key: string, unsubscribe: (() => void) | null) =>
      globalStateManager?.setUnsubscribeFunction(key, unsubscribe),
    getUnsubscribeFunction: (key: string) => globalStateManager?.getUnsubscribeFunction(key) || null,
    executeAndClearUnsubscribe: (key: string) => globalStateManager?.executeAndClearUnsubscribe(key) || false,

    // MVU 快照
    setMvuSnapshots: (snapshots: any[]) => globalStateManager?.setMvuSnapshots(snapshots),
    getMvuSnapshots: () => globalStateManager?.getMvuSnapshots() || [],

    // 事件总线引用
    setEventBus: (eventBus: any) => globalStateManager?.setEventBus(eventBus),
    getEventBus: () => globalStateManager?.getEventBus(),

    // 清理和诊断
    clearAll: () => globalStateManager?.clearAll(),
    getDiagnostics: () => globalStateManager?.getDiagnostics() || {},
  };
}




