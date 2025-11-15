/**
 * 统一的存读档管理 Composable
 * 整合所有存读档相关功能，提供统一的Vue 3 Composition API接口
 *
 * 功能特点：
 * - 只从 IndexDB 获取数据源，简化数据流
 * - 整合 SaveLoadManagerService 和 SaveLoadFacade 的功能
 * - 提供 Vue 3 Composition API 接口
 * - 支持 MVU 快照管理和统计数据绑定
 */

import { inject, ref, type Ref } from 'vue';
import type { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import type { GameWorld } from '../models/CreationSchemas';
import type { GameState } from '../models/GameState';
import { GamePhase } from '../models/GameState';
import type { SaveSummary } from '../models/SaveSchemas';
import type { SaveLoadManagerService } from '../services/SaveLoadManagerService';
import type { StatDataBindingService } from '../services/StatDataBindingService';
import { useGlobalState } from './useGlobalState';
import { useWorldbookToggle } from './useWorldbookToggle';

// 定义 CreateSaveOptions 类型
export interface CreateSaveOptions {
  [key: string]: any;
}

/**
 * UI上下文接口
 */
export interface UIContext {
  messages: Ref<any[]>; // Ref<Paragraph[]>
  streamingHtml: Ref<string>;
  isStreaming: Ref<boolean>;
  isSending: Ref<boolean>;
  scrollToBottom: () => void;
  nextTick: () => Promise<void>;
}

/**
 * 获取 40 字预览（中文优先，超出截断）
 */
export function buildPreview(messages: any[], max = 40): string {
  try {
    const lastAi = [...messages].reverse().find(m => m.role === 'assistant');
    const base = (lastAi?.content ?? '').trim();
    if (base.length <= max) return base;
    return base.slice(0, max);
  } catch {
    return '';
  }
}

/**
 * 统一的存读档管理 Composable
 */
export function useSaveLoad() {
  // ==================== 依赖注入 ====================
  const saveLoadManager = inject<SaveLoadManagerService>(TYPES.SaveLoadManagerService);
  const statDataBinding = inject<StatDataBindingService>(TYPES.StatDataBindingService);
  const globalState = useGlobalState();

  const resolveEventBus = (): EventBus | undefined => {
    const bus = globalState.getEventBus();
    return bus as EventBus | undefined;
  };

  // ==================== 响应式状态 ====================
  const isLoading = ref(false);
  const isSaving = ref(false);

  // ==================== 服务可用性检查 ====================
  const isServiceAvailable = () => {
    return !!saveLoadManager;
  };

  // ==================== 错误处理 ====================
  const handleError = (operation: string, error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : `${operation}失败`;
    console.error(`[useSaveLoad] ${operation}失败:`, error);

    // 事件通知
    resolveEventBus()?.emit?.('save-load:error', { operation, error: errorMessage });

    throw new Error(errorMessage);
  };

  // ==================== 存档管理 ====================

  // ==================== 读档管理 ====================

  /**
   * 读档到UI（整合LoadManager功能）
   */
  const loadToUI = async (slotId: string, uiContext: UIContext): Promise<void> => {
    if (!saveLoadManager) {
      throw new Error('SaveLoadManagerService not available');
    }

    try {
      // 1. 从SaveLoadManagerService获取数据
      const saveData = await saveLoadManager.getSlot(slotId);
      if (!saveData) {
        throw new Error('存档不存在');
      }

      // 2. 恢复UI消息
      await restoreUIMessages(saveData.messages || [], uiContext);

      // 3. 恢复MVU快照
      if (statDataBinding) {
        await restoreMVUSnapshots(slotId, saveLoadManager, statDataBinding);
      } else {
        console.warn('[useSaveLoad] StatDataBindingService不可用，跳过MVU快照恢复');
      }

      // 4. 更新游戏状态
      await saveLoadManager.updateGameState(saveData);

      // 5. 应用存档记录的世界扩展到世界书（幂等）
      try {
        const selection = await saveLoadManager.getSelectedExpansions(slotId);
        if (selection) {
          const { applyExpansionToggles } = useWorldbookToggle();
          await applyExpansionToggles(selection.world as GameWorld, selection.selectedExpansions || []);
        }
      } catch (e) {
        console.warn('[useSaveLoad] 应用世界扩展失败，已跳过：', e);
      }

      // 事件通知
      resolveEventBus()?.emit?.('save-load:loaded-to-ui', { slotId });
    } catch (error) {
      handleError('读档到UI', error);
      throw error; // 重新抛出错误
    }
  };

  // ==================== MVU快照管理 ====================

  /**
   * 保存MVU快照
   */
  const saveMVUSnapshot = async (saveName: string): Promise<void> => {
    if (!saveLoadManager) {
      throw new Error('SaveLoadManagerService not available');
    }

    try {
      // 暂时使用 setSetting 保存MVU快照
      await saveLoadManager.setSetting(`mvu_snapshot_${saveName}`, {});

      // 事件通知
      resolveEventBus()?.emit?.('save-load:mvu-snapshot-saved', { saveName });
    } catch (error) {
      handleError('保存MVU快照', error);
    }
  };

  // ==================== UI恢复和提示词注入 ====================

  // ==================== 状态管理协调机制 ====================

  // 注册到状态管理协调机制
  const registerSaveLoad = () => {
    try {
      // 尝试获取状态管理器
      const gameStateManager = (window as any).__RPG_GAME_STATE_MANAGER__;

      if (gameStateManager && typeof gameStateManager.registerComposable === 'function') {
        // 注册到状态管理协调机制
        const unregister = gameStateManager.registerComposable(GamePhase.PLAYING, async (_newState: GameState) => {
          try {
            // 这里可以添加存读档相关的状态同步逻辑
            // 例如：检查存档可用性、同步存档列表等
          } catch (error) {
            console.error('[useSaveLoad] 存读档状态同步失败:', error);
            throw error; // 重新抛出错误，让状态管理器处理
          }
        });

        // 存储取消注册函数
        (window as any).__RPG_SAVE_LOAD_UNREGISTER__ = unregister;
      } else {
        console.warn('[useSaveLoad] 状态管理器不可用，跳过状态管理协调注册');
      }
    } catch (error) {
      console.warn('[useSaveLoad] 注册到状态管理协调机制失败:', error);
    }
  };

  // 清理状态管理协调
  const cleanupSaveLoad = () => {
    try {
      // 清理状态管理协调
      const unregister = (window as any).__RPG_SAVE_LOAD_UNREGISTER__;
      if (unregister && typeof unregister === 'function') {
        unregister();
        (window as any).__RPG_SAVE_LOAD_UNREGISTER__ = undefined;
      }
    } catch (error) {
      console.warn('[useSaveLoad] 清理状态管理协调失败:', error);
    }
  };

  // ==================== 服务状态检查 ====================

  /**
   * 检查存读档相关服务状态
   */
  const checkSaveLoadServices = () => {
    return {
      saveLoadManager: !!saveLoadManager,
      ui: false,
      eventBus: !!resolveEventBus(),
      statDataBinding: !!statDataBinding,
    };
  };

  // ==================== Vue专用包装方法 ====================

  /**
   * 刷新存档列表（Vue专用）
   */
  const refreshSaveList = async (): Promise<SaveSummary[]> => {
    if (!saveLoadManager) {
      throw new Error('SaveLoadManagerService not available');
    }

    try {
      const list = await saveLoadManager.listSaves();
      return Array.isArray(list) ? list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)) : [];
    } catch (error) {
      console.error('[useSaveLoad] 刷新存档列表失败:', error);
      return [];
    }
  };

  /**
   * 删除选中的存档（Vue专用）
   */
  const deleteSelectedSaves = async (slotIds: string[]): Promise<boolean> => {
    if (!saveLoadManager || slotIds.length === 0) return false;

    try {
      await saveLoadManager.deleteSaves(slotIds);
      return true;
    } catch (error) {
      console.error('[useSaveLoad] 删除选中存档失败:', error);
      return false;
    }
  };

  /**
   * 重命名存档（Vue专用）
   */
  const renameSaveWithFeedback = async (slotId: string, newName: string): Promise<boolean> => {
    if (!saveLoadManager) {
      throw new Error('SaveLoadManagerService not available');
    }

    try {
      await saveLoadManager.renameSave(slotId, newName);
      return true;
    } catch (error) {
      console.error('[useSaveLoad] 重命名存档失败:', error);
      return false;
    }
  };

  /**
   * 保存所选世界扩展（Vue专用）
   */
  const saveSelectedExpansions = async (
    slotId: string,
    world: GameWorld,
    selectedExpansions: string[],
  ): Promise<boolean> => {
    if (!saveLoadManager) return false;
    try {
      await saveLoadManager.setSelectedExpansions(slotId, world, selectedExpansions);
      return true;
    } catch (error) {
      console.error('[useSaveLoad] 保存世界扩展失败:', error);
      return false;
    }
  };

  /**
   * 读取所选世界扩展（Vue专用）
   */
  const loadSelectedExpansions = async (
    slotId: string,
  ): Promise<{ world: GameWorld; selectedExpansions: string[] } | null> => {
    if (!saveLoadManager) return null;
    try {
      return await saveLoadManager.getSelectedExpansions(slotId);
    } catch (error) {
      console.error('[useSaveLoad] 读取世界扩展失败:', error);
      return null;
    }
  };

  /**
   * 读档（Vue专用）
   */
  const loadSaveWithFeedback = async (slotId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    if (!saveLoadManager) {
      throw new Error('SaveLoadManagerService not available');
    }

    try {
      const loadResult = await saveLoadManager.loadSave(slotId);
      if (!loadResult.success || !loadResult.data) {
        return {
          success: false,
          error: loadResult.error || '未找到存档',
        };
      }
      return {
        success: true,
        data: loadResult.data,
      };
    } catch (error) {
      console.error('[useSaveLoad] 读档失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '读档失败',
      };
    }
  };

  /**
   * 使用手动保存模式创建新存档（Vue专用）
   * 基于指定存档创建备份，包含所有消息和统计数据
   * @param slotId 原存档的slotId
   * @param saveName 新存档的基础名称
   */
  const createNewSaveWithManualMode = async (slotId: string, saveName: string): Promise<boolean> => {
    if (!saveLoadManager) {
      throw new Error('SaveLoadManagerService not available');
    }

    try {
      // 1. 根据slotId获取原存档数据
      const originalSaveData = await saveLoadManager.getSlot(slotId);
      if (!originalSaveData) {
        throw new Error('原存档不存在');
      }

      // 2. 提取原存档的所有数据
      const originalMessages = originalSaveData.messages || [];

      // 从消息中提取统计数据和MVU快照
      let originalStatData: any = {};
      const originalMvuSnapshots: any[] = [];

      // 从最后一条assistant消息中提取MVU快照和统计数据
      const lastAssistantMessage = [...originalMessages].reverse().find(msg => msg.role === 'assistant');
      if (lastAssistantMessage?.mvuSnapshot) {
        originalStatData = lastAssistantMessage.mvuSnapshot.stat_data || {};
        originalMvuSnapshots.push(lastAssistantMessage.mvuSnapshot);
      }

      // 3. 生成带时间戳的新存档名称
      const now = new Date();
      const timestamp = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newSaveName = `${saveName}-备份-${timestamp}`;

      // 4. 使用服务层的createSave方法创建新存档，传入原存档的所有数据
      const gameData = {
        messages: originalMessages,
        statData: originalStatData,
        mvuSnapshots: originalMvuSnapshots,
      };
      await saveLoadManager.createSave(newSaveName, gameData);

      return true;
    } catch (error) {
      console.error('[useSaveLoad] 创建备份存档失败:', error);
      return false;
    }
  };

  /**
   * 创建全新存档（Vue专用）
   * 使用服务层创建空的存档，服务层会自动生成slotId
   * @param saveName 新存档的名称
   */
  const createNewEmptySave = async (
    saveName: string,
  ): Promise<{ success: boolean; slotId?: string; saveName?: string; error?: string }> => {
    if (!saveLoadManager) {
      return { success: false, error: 'SaveLoadManagerService not available' };
    }

    try {
      // 1. 创建空的存档数据
      const emptyGameData = {
        messages: [],
        statData: {},
        mvuSnapshots: [],
      };

      // 2. 使用服务层的createSave方法创建新存档（服务层会自动生成slotId）
      const createdSave = await saveLoadManager.createSave(saveName, emptyGameData);

      return {
        success: true,
        slotId: createdSave.slotId,
        saveName: createdSave.name,
      };
    } catch (error) {
      console.error('[useSaveLoad] 创建全新存档失败:', error);
      // 检查是否是重名错误
      if (error instanceof Error && error.name === 'DUPLICATE_NAME') {
        return {
          success: false,
          error: 'DUPLICATE_NAME',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建存档失败',
      };
    }
  };

  /**
   * 获取当前存档信息（Vue专用）
   * 从游戏状态中获取当前正在使用的存档信息
   */
  const getCurrentSaveInfo = async (): Promise<{ slotId?: string; saveName?: string } | null> => {
    if (!saveLoadManager) {
      throw new Error('SaveLoadManagerService not available');
    }

    try {
      // 从全局状态管理器获取游戏状态
      const gameStateManager = (window as any).__RPG_GAME_STATE_MANAGER__;
      const gameState = gameStateManager?.currentState?.value;
      if (gameState.saveName) {
        // 通过存档名查找对应的slotId
        const slotId = await saveLoadManager.findSlotIdBySaveName(gameState.saveName);
        return {
          slotId: slotId || undefined,
          saveName: gameState.saveName,
        };
      }
      return null;
    } catch (error) {
      console.error('[useSaveLoad] 获取当前存档信息失败:', error);
      return null;
    }
  };

  /**
   * 检查存档可用性（Vue专用）
   * 委托给服务层检查是否有可用存档
   */
  const checkSaveAvailability = async (): Promise<boolean> => {
    if (!saveLoadManager) {
      throw new Error('SaveLoadManagerService not available');
    }

    try {
      return await saveLoadManager.checkSaveAvailability();
    } catch (error) {
      console.error('[useSaveLoad] 检查存档可用性失败:', error);
      return false;
    }
  };

  /**
   * 加载游戏数据（Vue专用）
   * 从开始界面读档时使用，包含完整的读档流程：游戏状态更新 + UI消息恢复
   */
  const loadGame = async (data: any): Promise<boolean> => {
    if (!saveLoadManager) {
      throw new Error('SaveLoadManagerService not available');
    }

    try {
      // 1. 验证数据
      if (!saveLoadManager.validateSaveData(data)) {
        throw new Error('存档数据格式无效');
      }

      // 2. 更新游戏状态
      const stateSuccess = await saveLoadManager.loadGame(data);
      if (!stateSuccess) {
        throw new Error('游戏状态更新失败');
      }

      // 3. 如果有slotId，准备UI消息恢复
      // 将存档数据存储到全局，供PlayingRoot组件在状态切换后使用
      if (data.slotId) {
        (window as any).__RPG_PENDING_SAVE_DATA__ = {
          ...data,
          // 确保包含所有必要的数据用于UI恢复
          slotId: data.slotId,
          name: data.name,
          messages: data.messages || [],
          statData: data.statData || {},
          mvuSnapshots: data.mvuSnapshots || [],
        };
      }

      return true;
    } catch (error) {
      console.error('[useSaveLoad] 加载游戏数据失败:', error);
      return false;
    }
  };

  // ==================== 消息管理包装方法 ====================

  /**
   * 添加用户消息（Vue专用）
   */
  const addUserMessage = async (slotId: string, content: string, html?: string): Promise<boolean> => {
    if (!saveLoadManager) return false;
    try {
      await saveLoadManager.addUserMessage(slotId, content, html);
      return true;
    } catch (error) {
      handleError('添加用户消息', error);
      return false;
    }
  };

  /**
   * 添加助手消息（Vue专用）
   */
  const addAssistantMessage = async (
    slotId: string,
    content: string,
    html?: string,
    mvuSnapshot?: any,
  ): Promise<boolean> => {
    if (!saveLoadManager) return false;
    try {
      await saveLoadManager.addAssistantMessage(slotId, content, html, mvuSnapshot);
      return true;
    } catch (error) {
      handleError('添加助手消息', error);
      return false;
    }
  };

  /**
   * 删除消息（Vue专用）
   */
  const deleteMessage = async (slotId: string, messageId: string): Promise<boolean> => {
    if (!saveLoadManager) return false;
    try {
      return await saveLoadManager.deleteMessage(slotId, messageId);
    } catch (error) {
      handleError('删除消息', error);
      return false;
    }
  };

  /**
   * 删除最后一条消息（Vue专用）
   */
  const deleteLastMessage = async (slotId: string): Promise<boolean> => {
    if (!saveLoadManager) return false;
    try {
      const result = await saveLoadManager.deleteLastMessage(slotId);
      return result !== null;
    } catch (error) {
      handleError('删除最后消息', error);
      return false;
    }
  };

  /**
   * 更新消息内容（Vue专用）
   */
  const updateMessageContent = async (slotId: string, messageId: string, content: string): Promise<boolean> => {
    if (!saveLoadManager) return false;
    try {
      return await saveLoadManager.updateMessageContent(slotId, messageId, content);
    } catch (error) {
      handleError('更新消息内容', error);
      return false;
    }
  };

  /**
   * 获取最后一条消息（Vue专用）
   */
  const getLastMessage = async (slotId: string): Promise<any | null> => {
    if (!saveLoadManager) return null;
    try {
      return await saveLoadManager.getLastMessage(slotId);
    } catch (error) {
      handleError('获取最后消息', error);
      return null;
    }
  };

  // ==================== 返回接口 ====================
  return {
    // 响应式状态
    isLoading,
    isSaving,

    // 服务状态
    isServiceAvailable,

    // 读档管理（UI相关）
    loadToUI,

    // MVU快照管理
    saveMVUSnapshot,

    // 服务状态检查
    checkSaveLoadServices,

    // Vue专用包装方法
    refreshSaveList,
    deleteSelectedSaves,
    renameSaveWithFeedback,
    loadSaveWithFeedback,
    createNewSaveWithManualMode,
    createNewEmptySave,
    getCurrentSaveInfo,
    checkSaveAvailability,
    loadGame,
    saveSelectedExpansions,
    loadSelectedExpansions,

    // 消息管理包装方法
    addUserMessage,
    addAssistantMessage,
    deleteMessage,
    deleteLastMessage,
    updateMessageContent,
    getLastMessage,

    // 状态管理协调
    registerSaveLoad,
    cleanupSaveLoad,
  };
}

// ==================== 辅助方法 ====================

/**
 * 恢复UI消息
 */
async function restoreUIMessages(messages: any[], uiContext: UIContext): Promise<void> {
  try {
    // 清空现有消息
    uiContext.messages.value = [];

    // 恢复消息
    for (const message of messages) {
      // 优先使用存档中保存的HTML内容，如果没有则从content生成
      let html = message.html || message.content || '';

      // 如果没有HTML内容，尝试使用酒馆的格式化函数生成
      if (!message.html && message.content) {
        try {
          if (typeof (window as any).formatAsDisplayedMessage === 'function') {
            html = (window as any).formatAsDisplayedMessage(message.content, { message_id: 'last' });
          }
        } catch (error) {
          console.warn('[useSaveLoad] 格式化消息失败，使用原始内容:', error);
          html = message.content || '';
        }
      }

      uiContext.messages.value.push({
        id: message.id,
        role: message.role,
        html: html,
        ephemeral: false,
        content: message.content || '',
        timestamp: message.timestamp || new Date().toISOString(),
      });
    }

    // 滚动到底部
    await uiContext.nextTick();
    uiContext.scrollToBottom();
  } catch (error) {
    console.error('[useSaveLoad] 恢复UI消息失败:', error);
  }
}

/**
 * 恢复MVU快照（统计数据就是MVU快照）
 * 使用StatDataBindingService的replaceMvuData方法确保完整的数据更新流程
 */
async function restoreMVUSnapshots(
  slotId: string,
  saveLoadManager: SaveLoadManagerService,
  statDataBinding: StatDataBindingService,
): Promise<void> {
  try {
    // 使用服务层的接口获取最新的MVU快照
    const latestSnapshot = await saveLoadManager.getLatestMVUSnapshot(slotId);

    if (latestSnapshot) {
      // 使用StatDataBindingService的replaceMvuData方法，确保完整的数据更新流程
      if (statDataBinding) {
        const success = await statDataBinding.replaceMvuData(latestSnapshot, {
          type: 'message',
          message_id: 0,
        });

        if (!success) {
          console.error('[useSaveLoad] MVU快照恢复失败');
        }
      } else {
        console.warn('[useSaveLoad] StatDataBindingService不可用，降级到直接调用MVU框架');
        // 降级处理：直接调用MVU框架
        const Mvu = (window as any).Mvu;
        if (Mvu && typeof Mvu.replaceMvuData === 'function') {
          await Promise.resolve(Mvu.replaceMvuData(latestSnapshot, { type: 'message', message_id: 0 }));
        } else {
          console.warn('[useSaveLoad] MVU框架不可用，无法恢复快照');
        }
      }

      // 存储快照供其他组件使用
      (window as any).__RPG_LAST_MVU_SNAPSHOTS__ = [latestSnapshot];
    } else {
      (window as any).__RPG_LAST_MVU_SNAPSHOTS__ = [];
    }
  } catch (error) {
    console.error('[useSaveLoad] 恢复MVU快照失败:', error);
    // 确保即使出错也清空快照缓存
    (window as any).__RPG_LAST_MVU_SNAPSHOTS__ = [];
  }
}
