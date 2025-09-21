/**
 * Vue Composable for Game Services
 * 提供游戏核心服务的统一访问接口，包括UI交互功能，符合混合模式架构
 */

import { inject } from 'vue';
import type { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import type { AchievementService } from '../services/AchievementService';
import type { SameLayerService } from '../services/SameLayerService';
import type { UIService } from '../services/UIService';

export function useGameServices() {
  const eventBus = inject<EventBus>(TYPES.EventBus);
  const ui = inject<UIService>(TYPES.UIService);
  const tavern = inject<SameLayerService>(TYPES.SameLayerService);
  const achievement = inject<AchievementService>(TYPES.AchievementService);

  // UI 服务包装方法
  const showInfo = (title: string, message?: string) => {
    try {
      ui?.info?.(title, message);
    } catch (error) {
      console.warn('[useGameServices] UI info failed:', error);
    }
  };

  const showSuccess = (title: string, message?: string) => {
    try {
      ui?.success?.(title, message);
    } catch (error) {
      console.warn('[useGameServices] UI success failed:', error);
    }
  };

  const showError = (title: string, message?: string) => {
    try {
      ui?.error?.(title, message);
    } catch (error) {
      console.warn('[useGameServices] UI error failed:', error);
    }
  };

  const showWarning = (title: string, message?: string) => {
    try {
      ui?.warning?.(title, message);
    } catch (error) {
      console.warn('[useGameServices] UI warning failed:', error);
    }
  };

  // 事件总线包装方法
  const emitEvent = (event: string, data?: any) => {
    try {
      eventBus?.emit?.(event, data);
    } catch (error) {
      console.warn('[useGameServices] Event emit failed:', error);
    }
  };

  // 安全执行包装器
  const safeExecute = async <T>(fn: () => Promise<T>, fallback?: T, errorMessage?: string): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      console.error('[useGameServices] Safe execution failed:', error);
      if (errorMessage) {
        showError('操作失败', errorMessage);
      }
      return fallback;
    }
  };

  // 检查服务可用性
  const isServiceAvailable = (serviceName: string): boolean => {
    switch (serviceName) {
      case 'ui':
        return !!ui;
      case 'tavern':
        return !!tavern;
      case 'achievement':
        return !!achievement;
      case 'eventBus':
        return !!eventBus;
      default:
        return false;
    }
  };

  // 获取服务状态
  const getServiceStatus = () => ({
    ui: isServiceAvailable('ui'),
    tavern: isServiceAvailable('tavern'),
    achievement: isServiceAvailable('achievement'),
    eventBus: isServiceAvailable('eventBus'),
  });

  return {
    // UI 方法
    showInfo,
    showSuccess,
    showError,
    showWarning,

    // 事件方法
    emitEvent,

    // 工具方法
    safeExecute,
    isServiceAvailable,
    getServiceStatus,
  };
}
