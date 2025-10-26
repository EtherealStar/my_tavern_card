/**
 * 游戏设置管理组合式函数
 * 负责管理游戏设置数据的加载、保存和持久化存储
 */

import { computed, inject, ref, watch } from 'vue';
import { z } from 'zod';
import { TYPES } from '../core/ServiceIdentifiers';
import type { GameState } from '../models/GameState';
import { GamePhase } from '../models/GameState';
import type { SaveLoadManagerService } from '../services/SaveLoadManagerService';

// 智能历史管理设置模式
const SmartHistorySettingsSchema = z.object({
  assistantMessageLimit: z.number().min(1).max(1000).default(30),
  userMessageLimit: z.number().min(1).max(1000).default(20),
  shortSummaryThreshold: z.number().min(1).max(100).default(15),
  longSummaryThreshold: z.number().min(1).max(100).default(30),
});

// 完整游戏设置模式
const GameSettingsSchema = z.object({
  shouldStream: z.boolean().default(true),
  autoScrollDuringStreaming: z.boolean().default(false),
  smartHistory: SmartHistorySettingsSchema,
});

// 类型定义
export type SmartHistorySettings = z.infer<typeof SmartHistorySettingsSchema>;
export type GameSettings = z.infer<typeof GameSettingsSchema>;

// 默认设置值
const DEFAULT_SETTINGS: GameSettings = {
  shouldStream: true,
  autoScrollDuringStreaming: false,
  smartHistory: {
    assistantMessageLimit: 30,
    userMessageLimit: 20,
    shortSummaryThreshold: 15,
    longSummaryThreshold: 30,
  },
};

/**
 * 游戏设置管理组合式函数
 */
export function useGameSettings() {
  // 注入服务
  const saveLoadManager = inject<SaveLoadManagerService>(TYPES.SaveLoadManagerService);

  // 响应式设置状态
  const settings = ref<GameSettings>({ ...DEFAULT_SETTINGS });
  const isLoading = ref(false);
  const isSaving = ref(false);
  const lastError = ref<string | null>(null);

  // 计算属性：智能历史管理设置
  const smartHistorySettings = computed(() => settings.value.smartHistory);

  // 计算属性：流式传输设置
  const shouldStream = computed({
    get: () => settings.value.shouldStream,
    set: (value: boolean) => {
      settings.value.shouldStream = value;
    },
  });

  // 计算属性：流式生成时自动滚动设置
  const autoScrollDuringStreaming = computed({
    get: () => settings.value.autoScrollDuringStreaming,
    set: (value: boolean) => {
      settings.value.autoScrollDuringStreaming = value;
    },
  });

  /**
   * 加载设置
   */
  const loadSettings = async (): Promise<boolean> => {
    if (!saveLoadManager) {
      console.warn('[useGameSettings] SaveLoadManagerService 不可用');
      return false;
    }

    isLoading.value = true;
    lastError.value = null;

    try {
      // 从 IndexedDB 加载设置
      const savedSettings = await saveLoadManager.getSetting<GameSettings>('game_settings');

      if (savedSettings) {
        // 验证并合并设置
        const validatedSettings = GameSettingsSchema.parse(savedSettings);
        settings.value = { ...DEFAULT_SETTINGS, ...validatedSettings };
      } else {
        // 使用默认设置
        settings.value = { ...DEFAULT_SETTINGS };
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载设置失败';
      lastError.value = errorMessage;
      console.error('[useGameSettings] 加载设置失败:', error);

      // 使用默认设置作为回退
      settings.value = { ...DEFAULT_SETTINGS };
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 保存设置
   */
  const saveSettings = async (): Promise<boolean> => {
    if (!saveLoadManager) {
      console.warn('[useGameSettings] SaveLoadManagerService 不可用');
      return false;
    }

    isSaving.value = true;
    lastError.value = null;

    try {
      // 验证设置数据
      const validatedSettings = GameSettingsSchema.parse(settings.value);

      // 保存到 IndexedDB
      await saveLoadManager.setSetting('game_settings', validatedSettings);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存设置失败';
      lastError.value = errorMessage;
      console.error('[useGameSettings] 保存设置失败:', error);
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  /**
   * 更新智能历史管理设置
   */
  const updateSmartHistorySettings = (updates: Partial<SmartHistorySettings>): void => {
    settings.value.smartHistory = {
      ...settings.value.smartHistory,
      ...updates,
    };
  };

  /**
   * 重置设置为默认值
   */
  const resetSettings = (): void => {
    settings.value = { ...DEFAULT_SETTINGS };
  };

  /**
   * 获取智能历史管理配置（用于 SameLayerService）
   */
  const getSmartHistoryConfig = (): SmartHistorySettings => {
    return { ...settings.value.smartHistory };
  };

  /**
   * 验证设置值
   */
  const validateSettings = (): { isValid: boolean; errors: string[] } => {
    try {
      GameSettingsSchema.parse(settings.value);
      return { isValid: true, errors: [] };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`);
        return { isValid: false, errors };
      }
      return { isValid: false, errors: ['设置验证失败'] };
    }
  };

  // ==================== 状态管理协调机制 ====================

  // 注册到状态管理协调机制
  const registerGameSettings = () => {
    try {
      // 尝试获取状态管理器
      const gameStateManager = (window as any).__RPG_GAME_STATE_MANAGER__;

      if (gameStateManager && typeof gameStateManager.registerComposable === 'function') {
        // 注册到状态管理协调机制
        const unregister = gameStateManager.registerComposable(GamePhase.PLAYING, async (_newState: GameState) => {
          try {
            // 重新加载游戏设置
            await loadSettings();
          } catch (error) {
            console.error('[useGameSettings] 游戏设置同步失败:', error);
            throw error; // 重新抛出错误，让状态管理器处理
          }
        });

        // 存储取消注册函数
        (window as any).__RPG_GAME_SETTINGS_UNREGISTER__ = unregister;
      } else {
        console.warn('[useGameSettings] 状态管理器不可用，跳过状态管理协调注册');
      }
    } catch (error) {
      console.warn('[useGameSettings] 注册到状态管理协调机制失败:', error);
    }
  };

  // 清理状态管理协调
  const cleanupGameSettings = () => {
    try {
      // 清理状态管理协调
      const unregister = (window as any).__RPG_GAME_SETTINGS_UNREGISTER__;
      if (unregister && typeof unregister === 'function') {
        unregister();
        (window as any).__RPG_GAME_SETTINGS_UNREGISTER__ = undefined;
      }
    } catch (error) {
      console.warn('[useGameSettings] 清理状态管理协调失败:', error);
    }
  };

  // 监听设置变化，自动保存
  watch(
    settings,
    async () => {
      // 防抖保存，避免频繁写入
      const timeoutId = setTimeout(async () => {
        try {
          await saveSettings();
        } catch (error) {
          console.warn('[useGameSettings] 自动保存设置失败:', error);
        }
      }, 1000);

      // 清理之前的定时器
      return () => clearTimeout(timeoutId);
    },
    { deep: true },
  );

  return {
    // 状态
    settings: settings.value,
    isLoading,
    isSaving,
    lastError,

    // 计算属性
    smartHistorySettings,
    shouldStream,
    autoScrollDuringStreaming,

    // 方法
    loadSettings,
    saveSettings,
    updateSmartHistorySettings,
    resetSettings,
    getSmartHistoryConfig,
    validateSettings,

    // 类型
    DEFAULT_SETTINGS,

    // 状态管理协调
    registerGameSettings,
    cleanupGameSettings,
  };
}
