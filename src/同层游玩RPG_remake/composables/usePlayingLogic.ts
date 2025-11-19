/**
 * Vue Composable for Playing Logic
 * 处理PlayingRoot.vue中的复杂逻辑，包括事件监听、数据处理和生命周期管理
 */

import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
import { TYPES } from '../core/ServiceIdentifiers';
import type { GameState } from '../models/GameState';
import { GamePhase } from '../models/GameState';
import { createMessage, generateMessageId, type SaveMessage } from '../models/SaveSchemas';
import type { SameLayerService } from '../services/SameLayerService';
import type { SaveLoadManagerService } from '../services/SaveLoadManagerService';
import type { StatDataBindingService } from '../services/StatDataBindingService';
import { useGameSettings } from './useGameSettings';
import { useGlobalState } from './useGlobalState';
import { usePromptInjector } from './usePromptInjector';
export function usePlayingLogic() {
  const saveLoadManager = inject<SaveLoadManagerService>(TYPES.SaveLoadManagerService);
  const statDataBinding = inject<StatDataBindingService>(TYPES.StatDataBindingService);
  const sameLayerService = inject<SameLayerService>(TYPES.SameLayerService);

  // 获取游戏设置
  const { autoScrollDuringStreaming } = useGameSettings();

  // 获取全局状态管理
  const globalState = useGlobalState();

  // 获取提示注入器
  const promptInjector = usePromptInjector();

  // 响应式状态
  const isNarrow = ref(false);
  const leftOpen = ref(false);
  const rightOpen = ref(false);
  const streamingHtml = ref('');
  const isStreaming = ref(false);
  const isSending = ref(false);
  // 消息类型：SaveMessage用于存档消息，ephemeral消息用于临时UI显示
  type UISaveMessage = SaveMessage & { pending?: boolean };
  type PendingAwareMessage = UISaveMessage & { __pendingLocalId?: string };
  type EphemeralMessage = {
    id: string;
    html: string;
    role: 'system';
    ephemeral: true;
    timestamp: string;
    content: '';
  };
  type UIMessage = UISaveMessage | EphemeralMessage;

  const messages = ref<UIMessage[]>([]);

  const pendingAssistantMessages = new Map<string, PendingAwareMessage>();

  const ensurePendingMessagesVisible = () => {
    if (pendingAssistantMessages.size === 0) {
      return;
    }

    const currentList = messages.value;
    for (const [localId, pendingMessage] of pendingAssistantMessages) {
      const exists = currentList.some(existing => {
        const existingPendingId = (existing as PendingAwareMessage).__pendingLocalId;
        return existing === pendingMessage || (!!existingPendingId && existingPendingId === localId);
      });

      if (!exists) {
        currentList.push(pendingMessage);
      }
    }
  };

  const markMessageAsPending = (message: PendingAwareMessage) => {
    if (!message.__pendingLocalId) {
      message.__pendingLocalId = generateMessageId();
    }
    pendingAssistantMessages.set(message.__pendingLocalId, message);
    ensurePendingMessagesVisible();
  };

  const unmarkPendingMessage = (message: PendingAwareMessage) => {
    const localId = message.__pendingLocalId;
    if (localId) {
      pendingAssistantMessages.delete(localId);
      delete message.__pendingLocalId;
    }
  };

  watch(
    messages,
    () => {
      if (pendingAssistantMessages.size === 0) return;
      queueMicrotask(() => ensurePendingMessagesVisible());
    },
    { flush: 'post' },
  );

  watch(
    () => messages.value.length,
    () => {
      if (pendingAssistantMessages.size === 0) return;
      ensurePendingMessagesVisible();
    },
    { flush: 'post' },
  );

  // 引用
  const rootRef = ref<HTMLElement>();

  // 消息创建辅助函数
  // 创建符合SaveMessage结构的消息
  const createSaveMessage = (
    role: 'user' | 'assistant',
    content: string,
    html?: string,
    mvuSnapshot?: any,
    summary?: { short?: string; long?: string },
  ): SaveMessage => {
    const message = createMessage(role, content, html, mvuSnapshot);
    return {
      ...message,
      id: generateMessageId(),
      timestamp: new Date().toISOString(),
      html: html || content, // 确保html字段不为undefined
      summary: summary,
    };
  };

  // 创建ephemeral消息（仅用于UI显示，不参与存档）
  // 使用简单的UI消息结构，不需要完整的SaveMessage
  const createEphemeralMessage = (html: string) => {
    return {
      id: generateMessageId(),
      html,
      role: 'system' as const,
      ephemeral: true as const,
      timestamp: new Date().toISOString(),
      content: '' as const, // ephemeral消息不需要content
    };
  };

  // 滚动到底部
  const scrollToBottom = () => {
    try {
      const container = document.querySelector('.novel-content');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    } catch {
      // 忽略错误
    }
  };

  // 设置ResizeObserver
  const setupResizeObserver = () => {
    try {
      const ro = new (window as any).ResizeObserver((entries: any[]) => {
        for (const entry of entries) {
          const w = entry.contentRect?.width ?? 0;
          isNarrow.value = w > 0 && w < 768;
          if (!isNarrow.value) {
            leftOpen.value = false;
            rightOpen.value = false;
          }
        }
      });
      if (rootRef.value) ro.observe(rootRef.value);
      (window as any).__RPG_PLAYING_RO__ = ro;
    } catch (error) {
      console.warn('[usePlayingLogic] setupResizeObserver error:', error);
    }
  };

  // 清理ResizeObserver
  const cleanupResizeObserver = () => {
    try {
      const ro = (window as any).__RPG_PLAYING_RO__;
      if (ro && rootRef.value) ro.unobserve(rootRef.value);
    } catch (error) {
      console.warn('[usePlayingLogic] cleanupResizeObserver error:', error);
    }
  };

  // 处理待处理的存档数据
  const handlePendingSaveData = async (
    onDialogLoaded: (data: any) => Promise<void>,
    onAutoStart?: (pending: any) => Promise<void>,
  ) => {
    try {
      const pending = globalState.getPendingSaveData();
      if (pending) {
        await onDialogLoaded(pending);

        // 如果有自动开局标记，则触发一次首次生成
        if (onAutoStart && (pending as any).autoStart) {
          try {
            await onAutoStart(pending);
          } catch (err) {
            console.error('[usePlayingLogic] autoStart 触发失败:', err);
          }
        }

        // 清理全局状态
        globalState.clearPendingSaveData();
      }
    } catch (error) {
      console.error('[usePlayingLogic] handlePendingSaveData error:', error);
      // 确保清理全局状态，避免重复处理
      globalState.clearPendingSaveData();
    }
  };

  // 订阅MVU数据更新事件 - 现在由usePlayingLogic负责处理
  const setupMvuDataSubscription = async (
    _loadMvuData: () => Promise<void>,
    _loadGameStateData: () => Promise<void>,
    updateStatData: (data: any) => Promise<void>,
  ) => {
    try {
      const globalEventBus = (window as any).__RPG_EVENT_BUS__;
      if (globalEventBus && typeof globalEventBus.on === 'function') {
        globalEventBus.on('stat_data:updated', async (updatedData: any) => {
          try {
            // 1. 通知useStatData更新数据（包括游戏状态数据）
            await updateStatData(updatedData);
          } catch (err) {
            console.error('[usePlayingLogic] ❌ MVU数据更新处理失败:', err);
          }
        });
      }
    } catch (err) {
      console.warn('[usePlayingLogic] 订阅MVU数据更新事件失败:', err);
    }
  };

  // ==================== 状态管理协调机制 ====================

  // 注册到状态管理协调机制
  const registerPlayingLogic = (
    loadUserPanel: () => Promise<void>,
    loadMvuData: () => Promise<void>,
    loadGameStateData: () => Promise<void>,
  ) => {
    try {
      // 尝试获取状态管理器
      const gameStateManager = (window as any).__RPG_GAME_STATE_MANAGER__;

      if (gameStateManager && typeof gameStateManager.registerComposable === 'function') {
        // 注册到状态管理协调机制
        const unregister = gameStateManager.registerComposable(GamePhase.PLAYING, async (_newState: GameState) => {
          try {
            // 重新加载用户面板数据
            await loadUserPanel();
            // 重新加载MVU数据
            await loadMvuData();
            // 重新加载游戏状态数据
            await loadGameStateData();
          } catch (error) {
            console.error('[usePlayingLogic] 游戏状态恢复失败:', error);
            throw error; // 重新抛出错误，让状态管理器处理
          }
        });

        // 存储取消注册函数
        (window as any).__RPG_PLAYING_LOGIC_UNREGISTER__ = unregister;
      } else {
        console.warn('[usePlayingLogic] 状态管理器不可用，跳过注册');
      }
    } catch (error) {
      console.warn('[usePlayingLogic] 注册到状态管理协调机制失败:', error);
    }
  };

  // 清理状态管理协调
  const cleanupPlayingLogic = () => {
    try {
      // 优先清理状态管理协调
      const unregister = (window as any).__RPG_PLAYING_LOGIC_UNREGISTER__;
      if (unregister && typeof unregister === 'function') {
        unregister();
        (window as any).__RPG_PLAYING_LOGIC_UNREGISTER__ = undefined;
        return;
      }
    } catch (error) {
      console.warn('[usePlayingLogic] 清理状态管理协调失败:', error);
    }
  };

  // ==================== 消息生成函数 ====================

  /**
   * 统一的消息后处理方法
   * 处理生成结果：应用MVU数据变更、创建UI消息对象、更新UI、保存到存档
   * @param skipUIUpdate 如果为true，跳过UI消息数组操作（用于创建阶段，此时PlayingRoot尚未挂载）
   */
  const postProcessMessage = async (
    _userInput: string,
    result: { html: string; newMvuData?: Mvu.MvuData; summary?: { short?: string; long?: string } },
    providedSlotId?: string,
    skipUIUpdate?: boolean,
  ): Promise<boolean> => {
    let slotIdForEvent: string | null = null;
    let messageIdForEvent: string | null = null;
    let saveSuccessForEvent = false;

    try {
      console.debug('[usePlayingLogic] postProcessMessage 开始', {
        skipUIUpdate,
        providedSlotId,
        hasNewMvuData: !!result.newMvuData,
        hasSummary: !!result.summary,
      });
      let formattedSummary: { short?: string; long?: string } | undefined = undefined;
      // 1. 应用MVU数据变更
      // 注意：replaceMvuData 已经完成了数据替换和 loadStatData()，数据已经更新
      // mvu:update-ended 事件会在 replaceMvuData 内部触发，用于通知 UI 更新
      // useStatData.ts 中已经监听了该事件来自动更新 UI，这里不需要等待
      if (result.newMvuData && statDataBinding) {
        const success = await statDataBinding.replaceMvuData(result.newMvuData, {
          type: 'message',
          message_id: 0,
        });

        if (!success) {
          console.warn('[usePlayingLogic] MVU数据应用失败');
        }
      }

      // 2. 若存在总结，先准备"序号|时间|"前缀并格式化总结文本
      try {
        if (result.summary && (result.summary.short || result.summary.long)) {
          const slotIdForSummary = providedSlotId || (await getCurrentSaveSlotId());
          const dateStr = (await statDataBinding?.getCurrentDate()) || '';
          const timeStr = (await statDataBinding?.getCurrentTime()) || '';
          let currentIndex = 0;
          if (slotIdForSummary && saveLoadManager) {
            try {
              const assistants = await saveLoadManager.getMessagesByRole(slotIdForSummary, 'assistant');
              currentIndex = assistants.filter(m => !!(m.summary && (m.summary.short || m.summary.long))).length;
            } catch {
              currentIndex = 0;
            }
          }
          const seq = currentIndex + 1;
          const head = `序号|${seq}\n时间|${String(dateStr).trim()} ${String(timeStr).trim()}`;
          const prepend = (txt?: string) => {
            if (!txt) return undefined;
            const t = String(txt).trim();
            return t ? `${head}\n${t}` : `${head}`;
          };
          formattedSummary = {
            short: prepend(result.summary.short),
            long: prepend(result.summary.long),
          };
        }
      } catch (e) {
        console.warn('[usePlayingLogic] 格式化总结失败，将继续保存原始总结:', e);
        formattedSummary = result.summary;
      }

      // 3. 立即在UI中插入待保存的AI消息（如果不需要跳过UI更新）
      const textContent = result.html.replace(/<[^>]+>/g, '').trim();
      let pendingMessage: PendingAwareMessage | null = null;

      if (!skipUIUpdate) {
        // 只在需要更新UI时创建和添加消息
        pendingMessage = createSaveMessage(
          'assistant',
          textContent,
          result.html,
          result.newMvuData,
          formattedSummary ?? result.summary,
        ) as PendingAwareMessage;
        pendingMessage.pending = true;
        markMessageAsPending(pendingMessage);
        messages.value.push(pendingMessage);
        scrollToBottom();
      }

      // 4. 异步写入存档，成功后更新UI消息状态
      // 优先使用传入的 slotId，否则从游戏状态获取
      const slotId = providedSlotId || (await getCurrentSaveSlotId());
      console.debug('[usePlayingLogic] postProcessMessage slotId 解析结果', {
        providedSlotId,
        resolvedSlotId: slotId,
      });
      slotIdForEvent = slotId || null;
      let messageId: string | undefined = undefined;
      let saveSuccess = false;

      if (slotId && saveLoadManager) {
        try {
          const saveReady = saveLoadManager.isReady();
          if (!saveReady) {
            console.warn('[usePlayingLogic] SaveLoadManager 未就绪，尝试等待初始化');
            await saveLoadManager.waitForReady(5000);
          }
          const savedMessage = await saveLoadManager.addAssistantMessage(
            slotId,
            textContent,
            result.html,
            result.newMvuData,
            formattedSummary,
          );
          messageId = savedMessage.id;

          // 只在需要更新UI时更新pendingMessage状态
          if (pendingMessage) {
            pendingMessage.id = savedMessage.id;
            pendingMessage.timestamp = savedMessage.timestamp || new Date().toISOString();
            pendingMessage.mvuSnapshot = result.newMvuData;
            pendingMessage.summary = formattedSummary ?? result.summary;
            pendingMessage.pending = false;
            unmarkPendingMessage(pendingMessage);
          }

          saveSuccess = true;
          console.debug('[usePlayingLogic] 已保存AI消息到存档', {
            slotId,
            messageId,
            summaryIncluded: !!formattedSummary,
            skipUIUpdate,
          });
        } catch (error) {
          console.error('[usePlayingLogic] 保存消息到存档失败:', error);
          saveSuccess = false;
        }
      } else {
        console.warn('[usePlayingLogic] 无法保存消息到存档，slotId为空或saveLoadManager缺失', {
          slotId,
          hasSaveLoadManager: !!saveLoadManager,
        });
        saveSuccess = false;
      }

      // 5. 发出后处理完成事件，通知外部消息已保存到存档
      messageIdForEvent = messageId || null;
      saveSuccessForEvent = saveSuccess;
      return saveSuccess;
    } catch (error) {
      console.error('[usePlayingLogic] 消息后处理失败:', error);
      return false;
    } finally {
      console.debug('[usePlayingLogic] 准备发出 message:post-process-completed 事件', {
        slotIdForEvent,
        messageIdForEvent,
        saveSuccessForEvent,
      });
      const globalEventBus = (window as any).__RPG_EVENT_BUS__;
      if (globalEventBus && typeof globalEventBus.emit === 'function') {
        try {
          globalEventBus.emit('message:post-process-completed', {
            slotId: slotIdForEvent,
            messageId: messageIdForEvent,
            success: saveSuccessForEvent,
          });
          if (saveSuccessForEvent) {
            console.log('[usePlayingLogic] 已发出后处理完成事件:', {
              slotId: slotIdForEvent,
              messageId: messageIdForEvent,
              success: saveSuccessForEvent,
            });
          } else {
            console.warn('[usePlayingLogic] 已发出后处理完成事件（失败）:', {
              slotId: slotIdForEvent,
              messageId: messageIdForEvent,
              success: saveSuccessForEvent,
            });
          }
        } catch (error) {
          console.warn('[usePlayingLogic] 发出后处理完成事件失败:', error);
        }
      }
    }
  };

  /**
   * 获取当前存档的slotId
   */
  const getCurrentSaveSlotId = async (): Promise<string | null> => {
    try {
      if (!saveLoadManager) {
        console.warn('[usePlayingLogic] SaveLoadManagerService 不可用');
        return null;
      }

      // 从全局状态管理器获取当前游戏状态
      const gameStateManager = globalState.getGameStateManager();
      if (gameStateManager && gameStateManager.currentState?.value) {
        const gameState = gameStateManager.currentState.value;

        console.log('[usePlayingLogic] 当前游戏状态:', {
          phase: gameState.phase,
          saveName: gameState.saveName,
          slotId: gameState.slotId,
          started: gameState.started,
        });

        // 优先使用状态中直接存储的 slotId
        if (gameState.slotId) {
          console.log('[usePlayingLogic] 使用状态中的 slotId:', gameState.slotId);
          return gameState.slotId;
        }

        // 如果没有 slotId，通过存档名查找（向后兼容）
        if (gameState.saveName) {
          console.log('[usePlayingLogic] 通过存档名查找 slotId:', gameState.saveName);
          const slotId = await saveLoadManager.findSlotIdBySaveName(gameState.saveName);
          if (slotId) {
            console.log('[usePlayingLogic] 找到对应的 slotId:', slotId);
            return slotId;
          }
        }
      } else {
        console.warn('[usePlayingLogic] 游戏状态管理器不可用或状态为空:', {
          gameStateManagerExists: !!gameStateManager,
          hasCurrentState: !!gameStateManager?.currentState,
          hasValue: !!gameStateManager?.currentState?.value,
        });
      }

      console.warn('[usePlayingLogic] 无法获取当前存档 slotId');
      return null;
    } catch (error) {
      console.error('[usePlayingLogic] 获取当前存档slotId失败:', error);
      return null;
    }
  };

  /**
   * 添加用户消息到UI
   */
  const addUserMessage = (content: string, html?: string): void => {
    try {
      const message = createSaveMessage('user', content, html);
      messages.value.push(message);
      scrollToBottom();
    } catch (error) {
      console.error('[usePlayingLogic] 添加用户消息到UI失败:', error);
    }
  };

  /**
   * 清空消息数组（用于创建新存档时）
   */
  const clearMessages = (): void => {
    try {
      messages.value = [];
      streamingHtml.value = '';
      pendingAssistantMessages.clear();
    } catch (error) {
      console.error('[usePlayingLogic] 清空消息数组失败:', error);
    }
  };

  /**
   * 保存用户消息到存档
   */
  const saveUserMessage = async (content: string, html?: string): Promise<boolean> => {
    try {
      const slotId = await getCurrentSaveSlotId();
      if (slotId && saveLoadManager) {
        await saveLoadManager.addUserMessage(slotId, content, html);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[usePlayingLogic] 保存用户消息到存档失败:', error);
      return false;
    }
  };

  /**
   * 停止当前生成
   */
  const stopGeneration = (): void => {
    try {
      // 停止当前流式生成
      const currentHandle = globalState.getCurrentStreamHandle();
      if (currentHandle) {
        currentHandle.abort();
        currentHandle.cleanup();
        globalState.clearCurrentStreamHandle();
      }

      // 停止SameLayerService的流式生成
      sameLayerService?.stopStreaming();

      // 清理状态
      isStreaming.value = false;
      isSending.value = false;
      streamingHtml.value = '';
    } catch (error) {
      console.error('[usePlayingLogic] 停止生成失败:', error);
    }
  };

  /**
   * 删除指定消息
   * 同时从UI消息数组和存档中删除消息
   * 修复：区分ephemeral消息和存档消息的删除逻辑
   */
  const deleteMessage = async (messageId: string): Promise<boolean> => {
    try {
      // 1. 查找消息
      const messageIndex = messages.value.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        console.warn('[usePlayingLogic] 消息不存在:', messageId);
        return false;
      }

      const targetMessage = messages.value[messageIndex];

      if ('pending' in targetMessage && targetMessage.pending) {
        console.warn('[usePlayingLogic] 待保存消息无法删除:', messageId);
        return false;
      }

      // 2. 检查是否为ephemeral消息
      const isEphemeral = 'ephemeral' in targetMessage && targetMessage.ephemeral;

      if (isEphemeral) {
        // ephemeral消息只存在于UI中，直接删除UI消息
        console.log('[usePlayingLogic] 删除ephemeral消息:', messageId);
        messages.value.splice(messageIndex, 1);
        console.log('[usePlayingLogic] 成功从UI删除ephemeral消息:', messageId);
        return true;
      } else {
        // 存档消息：先从存档中删除，成功后再删除UI消息
        const slotId = await getCurrentSaveSlotId();
        if (slotId && saveLoadManager) {
          try {
            const archiveDeleteSuccess = await saveLoadManager.deleteMessage(slotId, messageId);
            if (!archiveDeleteSuccess) {
              console.error('[usePlayingLogic] 存档删除失败，消息可能不存在:', messageId);
              return false;
            }
            console.log('[usePlayingLogic] 成功从存档删除消息:', messageId);
          } catch (error) {
            console.error('[usePlayingLogic] 从存档删除消息失败:', error);
            return false; // 存档删除失败，不删除UI消息
          }
        } else {
          console.warn('[usePlayingLogic] 无法获取存档slotId或SaveLoadManager不可用');
          return false; // 无法访问存档，不删除UI消息
        }

        // 3. 存档删除成功后，从UI消息数组中删除
        messages.value.splice(messageIndex, 1);
        unmarkPendingMessage(targetMessage as PendingAwareMessage);
        console.log('[usePlayingLogic] 成功从UI删除存档消息:', messageId);
        return true;
      }
    } catch (error) {
      console.error('[usePlayingLogic] 删除消息失败:', error);
      return false;
    }
  };

  /**
   * 过滤临时消息
   */
  const filterEphemeralMessages = (): void => {
    try {
      messages.value = messages.value.filter(m => !('ephemeral' in m) || !m.ephemeral);
    } catch (error) {
      console.error('[usePlayingLogic] 过滤临时消息失败:', error);
    }
  };

  /**
   * 非流式生成消息
   * 使用存档历史进行生成，适合需要完整响应的场景
   */
  const generateMessageSync = async (
    userInput: string,
    oldMvuData?: Mvu.MvuData,
    extraInjects?: Omit<InjectionPrompt, 'id'>[],
  ): Promise<{ html: string; newMvuData?: Mvu.MvuData }> => {
    if (!sameLayerService) {
      console.error('[usePlayingLogic] SameLayerService 不可用');
      throw new Error('SameLayerService 不可用');
    }

    // 添加"少女祈祷中..."的临时消息
    const prayingMessage = createEphemeralMessage(
      '<div style="text-align: center; color: #ffd700; font-style: italic;">少女祈祷中...</div>',
    );
    messages.value.push(prayingMessage);
    scrollToBottom();

    return new Promise((resolve, reject) => {
      let isInterrupted = false;
      const eventListeners: (() => void)[] = [];

      try {
        isSending.value = true;

        // 监听生成中断事件
        const onGenerationStopped = () => {
          isInterrupted = true;
          console.warn('[usePlayingLogic] 检测到非流式生成被中断');

          // 清理状态
          isSending.value = false;

          // 清理事件监听器
          eventListeners.forEach(cleanup => cleanup());

          // 移除"少女祈祷中..."的临时消息
          const messageIndex = messages.value.findIndex(msg => msg.id === prayingMessage.id);
          if (messageIndex !== -1) {
            messages.value.splice(messageIndex, 1);
          }

          reject(new Error('生成被中断'));
        };

        // 添加中断事件监听器
        if (typeof eventOn === 'function') {
          eventOn(tavern_events.GENERATION_STOPPED, onGenerationStopped);
          eventListeners.push(() => {
            if (typeof eventRemoveListener === 'function') {
              eventRemoveListener(tavern_events.GENERATION_STOPPED, onGenerationStopped);
            }
          });
        }

        // 获取当前存档的slotId并执行生成
        getCurrentSaveSlotId()
          .then(async slotId => {
            if (isInterrupted) return;

            // 调用SameLayerService的非流式生成方法，传递MVU数据和注入提示词
            const result = await sameLayerService.generateWithSaveHistorySync(
              {
                user_input: userInput,
                slotId: slotId || undefined,
                // 使用默认的智能历史管理配置
              },
              oldMvuData,
              extraInjects,
            );

            if (isInterrupted) return;

            // 清理事件监听器
            eventListeners.forEach(cleanup => cleanup());

            // 移除"少女祈祷中..."的临时消息
            const messageIndex = messages.value.findIndex(msg => msg.id === prayingMessage.id);
            if (messageIndex !== -1) {
              messages.value.splice(messageIndex, 1);
            }

            isSending.value = false;
            resolve(result);
          })
          .catch(error => {
            console.error('[usePlayingLogic] 非流式生成失败:', error);

            // 清理事件监听器
            eventListeners.forEach(cleanup => cleanup());

            // 移除"少女祈祷中..."的临时消息
            const messageIndex = messages.value.findIndex(msg => msg.id === prayingMessage.id);
            if (messageIndex !== -1) {
              messages.value.splice(messageIndex, 1);
            }

            isSending.value = false;

            reject(error);
          });
      } catch (error) {
        console.error('[usePlayingLogic] 非流式生成失败:', error);

        // 清理事件监听器
        eventListeners.forEach(cleanup => cleanup());

        // 移除"少女祈祷中..."的临时消息
        const messageIndex = messages.value.findIndex(msg => msg.id === prayingMessage.id);
        if (messageIndex !== -1) {
          messages.value.splice(messageIndex, 1);
        }

        isSending.value = false;

        reject(error);
      }
    });
  };

  /**
   * 流式生成消息
   * 使用存档历史进行流式生成，适合需要实时响应的场景
   * 返回Promise，在流式生成完成后resolve结果
   */
  const generateMessageStream = async (
    userInput: string,
    oldMvuData?: Mvu.MvuData,
    extraInjects?: Omit<InjectionPrompt, 'id'>[],
  ): Promise<{ html: string; newMvuData?: Mvu.MvuData } | null> => {
    if (!sameLayerService) {
      console.error('[usePlayingLogic] SameLayerService 不可用');
      return null;
    }

    return new Promise((resolve, reject) => {
      let isInterrupted = false;
      let eventListeners: (() => void)[] = [];

      try {
        isStreaming.value = true;
        streamingHtml.value = '';

        // 监听生成中断事件
        const onGenerationStopped = () => {
          isInterrupted = true;
          console.warn('[usePlayingLogic] 检测到生成被中断');

          // 清理状态
          streamingHtml.value = '';
          isStreaming.value = false;

          // 清理事件监听器
          eventListeners.forEach(cleanup => cleanup());

          reject(new Error('生成被中断'));
        };

        // 添加中断事件监听器
        if (typeof eventOn === 'function') {
          eventOn(tavern_events.GENERATION_STOPPED, onGenerationStopped);
          eventListeners.push(() => {
            if (typeof eventRemoveListener === 'function') {
              eventRemoveListener(tavern_events.GENERATION_STOPPED, onGenerationStopped);
            }
          });
        }

        // 获取当前存档的slotId
        getCurrentSaveSlotId()
          .then(slotId => {
            // 调用SameLayerService的流式生成方法，传递MVU数据和注入提示词
            const handle = sameLayerService.generateWithSaveHistory(
              {
                user_input: userInput,
                slotId: slotId || undefined,
                // 使用默认的智能历史管理配置
              },
              {
                onStart: () => {},
                onFullText: (text: string) => {
                  // 如果已被中断，不处理流式文本
                  if (isInterrupted) return;

                  // 处理流式文本，转换为HTML
                  try {
                    const html = (window as any).formatAsDisplayedMessage?.(text, { message_id: 'last' }) ?? text;
                    streamingHtml.value = html;
                    // 根据设置决定是否在流式生成时自动滚动
                    if (autoScrollDuringStreaming.value) {
                      scrollToBottom();
                    }
                  } catch (error) {
                    console.warn('[usePlayingLogic] 格式化流式文本失败:', error);
                    streamingHtml.value = text;
                    // 根据设置决定是否在流式生成时自动滚动
                    if (autoScrollDuringStreaming.value) {
                      scrollToBottom();
                    }
                  }
                },
                onEnd: async (_finalText?: string) => {
                  // 如果已被中断，直接返回
                  if (isInterrupted) return;

                  // 流式生成完成
                  // 清理流式状态
                  streamingHtml.value = '';
                  isStreaming.value = false;
                  // 生成完成时始终滚动到底部
                  scrollToBottom();

                  // 清理事件监听器
                  eventListeners.forEach(cleanup => cleanup());
                  eventListeners = [];

                  // 获取最终结果
                  try {
                    const result = await handle.getResult();
                    if (result && result.html) {
                      resolve(result);
                    } else {
                      console.warn('[usePlayingLogic] 流式生成未返回有效结果');
                      reject(new Error('流式生成未返回有效结果'));
                    }
                  } catch (error) {
                    console.error('[usePlayingLogic] 获取流式生成结果失败:', error);
                    reject(error);
                  }
                },
              },
              oldMvuData, // 传递MVU数据
              extraInjects, // 传递注入提示词
            );

            // 存储handle以便可以停止生成
            globalState.setCurrentStreamHandle(handle);
          })
          .catch(error => {
            console.error('[usePlayingLogic] 获取存档slotId失败:', error);
            // 清理事件监听器
            eventListeners.forEach(cleanup => cleanup());
            reject(error);
          });
      } catch (error) {
        console.error('[usePlayingLogic] 流式生成失败:', error);

        // 清理事件监听器
        eventListeners.forEach(cleanup => cleanup());

        // 清理状态
        streamingHtml.value = '';
        isStreaming.value = false;
        reject(error);
      }
    });
  };

  /**
   * 统一的生成消息接口
   * 根据设置自动选择流式或非流式生成，使用统一的后处理逻辑
   * 自动处理用户消息保存和AI消息生成
   */
  const generateMessage = async (userInput: string, shouldStream?: boolean): Promise<boolean> => {
    try {
      // 1. 先保存用户消息到存档，获取存档返回的消息ID
      let html = '';
      try {
        html = (window as any).formatAsDisplayedMessage?.(userInput, { message_id: 'last' }) ?? userInput;
      } catch {
        html = userInput;
      }

      const slotId = await getCurrentSaveSlotId();
      if (!slotId || !saveLoadManager) {
        console.warn(
          '[usePlayingLogic] 无法保存用户消息到存档，slotId:',
          slotId,
          'saveLoadManager:',
          !!saveLoadManager,
        );
        return false;
      }

      let savedUserMessage: any = null;
      try {
        // 先保存用户消息到存档，获取存档返回的消息对象
        savedUserMessage = await saveLoadManager.addUserMessage(slotId, userInput, html);
        console.log('[usePlayingLogic] 用户消息已成功保存到存档:', savedUserMessage.id);
      } catch (error) {
        console.error('[usePlayingLogic] 保存用户消息到存档失败:', error);
        return false; // 保存失败，返回false
      }

      // 2. 使用存档返回的消息ID创建UI消息对象并添加到UI
      const userMessage: SaveMessage = {
        id: savedUserMessage.id, // 使用存档返回的ID
        role: 'user',
        content: userInput,
        html: html,
        timestamp: savedUserMessage.timestamp || new Date().toISOString(),
      };
      messages.value.push(userMessage);
      scrollToBottom();

      let useStream = shouldStream;

      // 如果没有传入参数，从游戏设置中获取
      if (useStream === undefined && saveLoadManager) {
        try {
          const gameSettings = (await saveLoadManager.getSetting('game_settings')) as any;
          useStream = gameSettings?.shouldStream ?? true; // 默认使用流式
        } catch (error) {
          console.warn('[usePlayingLogic] 获取游戏设置失败，使用默认流式:', error);
          useStream = true;
        }
      }

      // 如果仍然没有值，使用默认值
      if (useStream === undefined) {
        useStream = true;
      }

      // 获取当前MVU数据
      const oldMvuData = statDataBinding?.getMvuData({ type: 'message', message_id: 0 });

      // 收集注入提示词
      const extraInjects = promptInjector.collectForNextGeneration();

      let result: { html: string; newMvuData?: Mvu.MvuData } | null;

      if (useStream) {
        // 流式生成 - 现在直接返回Promise结果
        result = await generateMessageStream(userInput, oldMvuData, extraInjects);
        if (!result) {
          throw new Error('流式生成失败');
        }
      } else {
        // 非流式生成
        result = await generateMessageSync(userInput, oldMvuData, extraInjects);
      }

      // 确保result不为null
      if (!result) {
        throw new Error('生成失败：未获取到结果');
      }

      // 统一后处理（处理AI消息）
      const success = await postProcessMessage(userInput, result);
      if (!success) {
        throw new Error('消息后处理失败');
      }

      return true;
    } catch (error) {
      console.error('[usePlayingLogic] 生成消息失败:', error);

      // 统一插入一条错误临时消息（去重保护）
      try {
        // 清理上一轮临时消息，避免堆积
        filterEphemeralMessages();
      } catch (e) {
        // 忽略清理过程中的异常
      }

      const last = messages.value[messages.value.length - 1] as any;
      const lastIsSameError =
        !!last &&
        'ephemeral' in last &&
        last.ephemeral &&
        typeof last.html === 'string' &&
        last.html.includes('API生成出错，请重试');
      if (!lastIsSameError) {
        const errorMessage = createEphemeralMessage('API生成出错，请重试');
        messages.value.push(errorMessage);
      }

      return false;
    }
  };

  // 初始化函数
  const initialize = async (
    onDialogLoaded: (data: any) => Promise<void>,
    loadUserPanel: () => Promise<void>,
    loadMvuData: () => Promise<void>,
    loadGameStateData: () => Promise<void>,
    updateStatData: (data: any) => Promise<void>,
  ) => {
    scrollToBottom();
    await handlePendingSaveData(onDialogLoaded, async pending => {
      try {
        const userInput = String(pending.initialUserInput ?? '').trim();
        // 使用统一的生成方法；shouldStream 从设置中自动读取
        const ok = await generateMessage(userInput, undefined);
        if (!ok) {
          console.warn('[usePlayingLogic] autoStart 首次生成失败');
        }
      } catch (err) {
        console.error('[usePlayingLogic] autoStart 生成异常:', err);
      }
    });
    setupResizeObserver();
    // 使用新的状态管理协调机制
    registerPlayingLogic(loadUserPanel, loadMvuData, loadGameStateData);
    await loadUserPanel();
    await setupMvuDataSubscription(loadMvuData, loadGameStateData, updateStatData);
  };

  // 清理函数
  const cleanup = () => {
    cleanupResizeObserver();
    cleanupPlayingLogic();
  };

  // ==================== 重新生成和编辑功能 ====================

  /**
   * 重新生成消息
   * 1. 获取上一条MVU快照
   * 2. 移除最新AI消息
   * 3. 恢复MVU快照
   * 4. 重新生成
   */
  const regenerateMessage = async (messageId: string): Promise<boolean> => {
    try {
      // 1. 验证消息类型和获取消息信息
      const messageIndex = messages.value.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        console.error('[usePlayingLogic] 消息不存在:', messageId);
        return false;
      }

      const targetMessage = messages.value[messageIndex];
      if ('pending' in targetMessage && targetMessage.pending) {
        console.error('[usePlayingLogic] 待保存消息无法重新生成:', messageId);
        return false;
      }
      if (targetMessage.role !== 'assistant') {
        console.error('[usePlayingLogic] 只能重新生成AI消息:', targetMessage.role);
        return false;
      }

      // 2. 获取上一条AI消息的MVU快照
      let previousMvuSnapshot: any = null;
      for (let i = messageIndex - 1; i >= 0; i--) {
        const msg = messages.value[i];
        if (msg.role === 'assistant' && !('ephemeral' in msg && msg.ephemeral) && (msg as any).mvuSnapshot) {
          previousMvuSnapshot = (msg as any).mvuSnapshot;
          break;
        }
      }

      // 3. 获取对应的用户消息
      let userMessage: any = null;

      // 如果是ephemeral消息，需要找到对应的用户输入
      if ('ephemeral' in targetMessage && targetMessage.ephemeral) {
        // 对于ephemeral消息，向前查找用户输入
        for (let i = messageIndex - 1; i >= 0; i--) {
          const msg = messages.value[i];
          if (msg.role === 'user' && !('ephemeral' in msg && msg.ephemeral)) {
            userMessage = msg;
            break;
          }
        }
      } else {
        // 对于普通AI消息，按原逻辑查找
        for (let i = messageIndex - 1; i >= 0; i--) {
          const msg = messages.value[i];
          if (msg.role === 'user' && !('ephemeral' in msg && msg.ephemeral)) {
            userMessage = msg;
            break;
          }
        }
      }

      if (!userMessage) {
        console.error('[usePlayingLogic] 找不到对应的用户消息');
        return false;
      }

      // 4. 移除目标消息（从UI中）
      messages.value.splice(messageIndex, 1);

      // 5. 确保从存档中真正删除消息
      if (!('ephemeral' in targetMessage && targetMessage.ephemeral)) {
        const slotId = await getCurrentSaveSlotId();
        console.log('[usePlayingLogic] 获取到的slotId:', slotId, 'messageId:', messageId);

        if (slotId && saveLoadManager) {
          try {
            // 检查SaveLoadManager是否已初始化
            if (!saveLoadManager.isReady()) {
              console.warn('[usePlayingLogic] SaveLoadManager未就绪，等待初始化...');
              const ready = await saveLoadManager.waitForReady(5000);
              if (!ready) {
                console.error('[usePlayingLogic] SaveLoadManager初始化超时');
                return false;
              }
            }

            // 先检查消息是否存在
            const saveData = await saveLoadManager.getSlot(slotId);
            if (!saveData) {
              console.error('[usePlayingLogic] 存档不存在:', slotId);
              return false;
            }

            const messageExists = saveData.messages.some(msg => msg.id === messageId);
            console.log('[usePlayingLogic] 消息在存档中存在:', messageExists);

            const deleteSuccess = await saveLoadManager.deleteMessage(slotId, messageId);
            console.log('[usePlayingLogic] 删除操作结果:', deleteSuccess);

            if (!deleteSuccess) {
              console.error('[usePlayingLogic] 从存档删除消息失败，无法重新生成');
              return false;
            }

            // 验证删除是否真正完成
            const verifyDelete = await saveLoadManager.getSlot(slotId);
            const messageStillExists = verifyDelete?.messages.some(msg => msg.id === messageId);
            if (messageStillExists) {
              console.error('[usePlayingLogic] 消息删除验证失败，消息仍然存在于存档中');
              return false;
            }

            console.log('[usePlayingLogic] 成功从存档删除消息并验证完成:', messageId);
          } catch (error) {
            console.error('[usePlayingLogic] 从存档删除消息失败:', error);
            console.error('[usePlayingLogic] 错误详情:', {
              slotId,
              messageId,
              errorMessage: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
            });
            return false;
          }
        } else {
          console.warn('[usePlayingLogic] 无法获取存档slotId或SaveLoadManager不可用', {
            slotId,
            saveLoadManagerAvailable: !!saveLoadManager,
          });
          return false;
        }
      } else {
        console.log('[usePlayingLogic] 跳过ephemeral消息的存档删除:', messageId);
      }

      // 6. 恢复上一条MVU快照
      if (previousMvuSnapshot && statDataBinding) {
        const success = await statDataBinding.replaceMvuData(previousMvuSnapshot, {
          type: 'message',
          message_id: 0,
        });

        if (!success) {
          console.warn('[usePlayingLogic] MVU快照恢复失败');
        }
      }

      // 7. 重新生成
      const userInput = userMessage.content || userMessage.html?.replace(/<[^>]+>/g, '').trim() || '';
      if (!userInput) {
        console.error('[usePlayingLogic] 用户输入为空');
        return false;
      }

      // 获取当前流式设置
      let useStream = true;
      if (saveLoadManager) {
        try {
          const gameSettings = (await saveLoadManager.getSetting('game_settings')) as any;
          useStream = gameSettings?.shouldStream ?? true;
        } catch (error) {
          console.warn('[usePlayingLogic] 获取游戏设置失败，使用默认流式:', error);
        }
      }

      // 获取当前MVU数据
      const oldMvuData = statDataBinding?.getMvuData({ type: 'message', message_id: 0 });

      // 收集注入提示词
      const extraInjects = promptInjector.collectForNextGeneration();

      // 添加"少女祈祷中..."的临时消息（仅非流式生成时）
      let prayingMessage: any = null;
      if (!useStream) {
        prayingMessage = createEphemeralMessage(
          '<div style="text-align: center; color: #ffd700; font-style: italic;">少女祈祷中...</div>',
        );
        messages.value.push(prayingMessage);
        scrollToBottom();
      }

      // 直接生成AI消息，不添加用户消息
      let result: { html: string; newMvuData?: Mvu.MvuData } | null;

      try {
        if (useStream) {
          // 流式生成
          result = await generateMessageStream(userInput, oldMvuData, extraInjects);
          if (!result) {
            throw new Error('流式生成失败');
          }
        } else {
          // 非流式生成
          result = await generateMessageSync(userInput, oldMvuData, extraInjects);
        }
      } finally {
        // 移除"少女祈祷中..."的临时消息（仅非流式生成时）
        if (prayingMessage) {
          const prayingMessageIndex = messages.value.findIndex(msg => msg.id === prayingMessage.id);
          if (prayingMessageIndex !== -1) {
            messages.value.splice(prayingMessageIndex, 1);
          }
        }
      }

      // 确保result不为null
      if (!result) {
        throw new Error('生成失败：未获取到结果');
      }

      // 直接处理AI消息结果，不处理用户消息
      const success = await postProcessMessage(userInput, result);
      return success;
    } catch (error) {
      console.error('[usePlayingLogic] 重新生成消息失败:', error);
      return false;
    }
  };

  /**
   * 编辑消息
   * 1. 移除UI显示
   * 2. 重新格式化HTML
   * 3. 更新UI消息数组
   * 4. 更新存档
   */
  const editMessage = async (messageId: string, newContent: string): Promise<boolean> => {
    try {
      // 1. 查找消息
      const messageIndex = messages.value.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        console.error('[usePlayingLogic] 消息不存在:', messageId);
        return false;
      }

      const targetMessage = messages.value[messageIndex];

      // 2. 重新格式化HTML
      let newHtml = newContent;
      try {
        if (typeof (window as any).formatAsDisplayedMessage === 'function') {
          newHtml = (window as any).formatAsDisplayedMessage(newContent, { message_id: 'last' });
        }
      } catch (error) {
        console.warn('[usePlayingLogic] 格式化消息失败，使用原始内容:', error);
        newHtml = newContent;
      }

      // 3. 更新UI消息数组
      const updatedMessage = {
        ...targetMessage,
        content: newContent,
        html: newHtml,
      } as UIMessage;
      messages.value[messageIndex] = updatedMessage;

      // 4. 更新存档
      const slotId = await getCurrentSaveSlotId();
      if (slotId && saveLoadManager) {
        try {
          await saveLoadManager.updateMessageContentAndHtml(slotId, messageId, newContent, newHtml);
        } catch (error) {
          console.error('[usePlayingLogic] 更新存档消息失败:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[usePlayingLogic] 编辑消息失败:', error);
      return false;
    }
  };

  // 生命周期钩子
  onMounted(() => {
    // 初始化逻辑将在组件中调用initialize方法
  });

  onUnmounted(() => {
    cleanup();
  });

  return {
    // 响应式状态
    isNarrow,
    leftOpen,
    rightOpen,
    streamingHtml,
    isStreaming,
    isSending,
    messages,

    // 引用
    rootRef,

    // 方法
    scrollToBottom,
    initialize,
    cleanup,

    // 消息生成函数
    generateMessage,
    generateMessageSync,
    generateMessageStream,

    // 消息后处理函数
    postProcessMessage,

    // 消息保存函数
    saveUserMessage,
    addUserMessage,

    // 消息管理函数
    deleteMessage,
    filterEphemeralMessages,
    clearMessages,

    // 生成控制函数
    stopGeneration,

    // 重新生成和编辑函数
    regenerateMessage,
    editMessage,

    // 状态管理协调
    registerPlayingLogic,

    // 提示注入器方法
    ...promptInjector,
  };
}
