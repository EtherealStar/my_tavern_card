/**
 * 游戏界面状态管理组合式函数
 * 替代 usePlayingStateStore，提供UI状态管理功能
 *
 * 功能特点：
 * - 使用Vue 3的ref和reactive进行状态管理
 * - 提供UI状态管理（侧边栏、响应式布局等）
 * - 提供消息管理功能
 * - 集成ResizeObserver进行响应式布局
 */

import { readonly, ref } from 'vue';
import { createMessage, generateMessageId, type SaveMessage } from '../models/SaveSchemas';

// 消息类型：SaveMessage用于存档消息，ephemeral消息用于临时UI显示
type UIMessage =
  | SaveMessage
  | {
      id: string;
      html: string;
      role: 'system';
      ephemeral: true;
      timestamp: string;
      content: '';
    };

export function usePlayingUI() {
  // UI状态
  const isNarrow = ref(false);
  const leftOpen = ref(false);
  const rightOpen = ref(false);
  const streamingHtml = ref('');
  const isStreaming = ref(false);
  const isSending = ref(false);

  // 消息管理
  const messages = ref<UIMessage[]>([]);
  const pendingSaveOperations = new Map<string, Promise<any>>();

  // 引用
  const rootRef = ref<HTMLElement>();

  // 消息创建辅助函数
  const createSaveMessage = (
    role: 'user' | 'assistant',
    content: string,
    html?: string,
    mvuSnapshot?: any,
  ): SaveMessage => {
    const message = createMessage(role, content, html, mvuSnapshot);
    return {
      ...message,
      id: generateMessageId(),
      timestamp: new Date().toISOString(),
      html: html || content,
    };
  };

  const createEphemeralMessage = (html: string) => {
    return {
      id: generateMessageId(),
      html,
      role: 'system' as const,
      ephemeral: true as const,
      timestamp: new Date().toISOString(),
      content: '' as const,
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
          isNarrow.value = w < 768;
        }
      });

      if (rootRef.value) {
        ro.observe(rootRef.value);
      }

      return ro;
    } catch (error) {
      console.warn('[usePlayingUI] ResizeObserver setup failed:', error);
      return null;
    }
  };

  const cleanupResizeObserver = (ro: any) => {
    try {
      if (ro) {
        ro.disconnect();
      }
    } catch (error) {
      console.warn('[usePlayingUI] ResizeObserver cleanup failed:', error);
    }
  };

  // 消息管理方法
  const addMessage = (message: UIMessage) => {
    messages.value.push(message);
  };

  const clearMessages = () => {
    messages.value = [];
  };

  const removeMessage = (messageId: string) => {
    const index = messages.value.findIndex(m => m.id === messageId);
    if (index > -1) {
      messages.value.splice(index, 1);
    }
  };

  // UI状态管理方法
  const toggleLeftSidebar = () => {
    leftOpen.value = !leftOpen.value;
  };

  const toggleRightSidebar = () => {
    rightOpen.value = !rightOpen.value;
  };

  const closeLeftSidebar = () => {
    leftOpen.value = false;
  };

  const closeRightSidebar = () => {
    rightOpen.value = false;
  };

  const setStreamingState = (streaming: boolean, html: string = '') => {
    isStreaming.value = streaming;
    if (streaming) {
      streamingHtml.value = html;
    } else {
      streamingHtml.value = '';
    }
  };

  const setSendingState = (sending: boolean) => {
    isSending.value = sending;
  };

  const setNarrowState = (narrow: boolean) => {
    isNarrow.value = narrow;
  };

  const setMessages = (newMessages: UIMessage[]) => {
    messages.value = [...newMessages];
  };

  const updateMessage = (messageId: string, updatedMessage: UIMessage) => {
    const index = messages.value.findIndex(m => m.id === messageId);
    if (index > -1) {
      messages.value[index] = updatedMessage;
    }
  };

  // 保存操作管理
  const addPendingSaveOperation = (id: string, promise: Promise<any>) => {
    pendingSaveOperations.set(id, promise);
  };

  const removePendingSaveOperation = (id: string) => {
    pendingSaveOperations.delete(id);
  };

  const getPendingSaveOperations = () => {
    return Array.from(pendingSaveOperations.keys());
  };

  // 清理方法
  const cleanup = () => {
    messages.value = [];
    pendingSaveOperations.clear();
    isStreaming.value = false;
    isSending.value = false;
    streamingHtml.value = '';
    leftOpen.value = false;
    rightOpen.value = false;
  };

  return {
    // 状态
    isNarrow: readonly(isNarrow),
    leftOpen: readonly(leftOpen),
    rightOpen: readonly(rightOpen),
    streamingHtml: readonly(streamingHtml),
    isStreaming: readonly(isStreaming),
    isSending: readonly(isSending),
    messages: readonly(messages),
    rootRef,

    // 方法
    createSaveMessage,
    createEphemeralMessage,
    scrollToBottom,
    setupResizeObserver,
    cleanupResizeObserver,
    addMessage,
    clearMessages,
    removeMessage,
    setMessages,
    updateMessage,
    toggleLeftSidebar,
    toggleRightSidebar,
    closeLeftSidebar,
    closeRightSidebar,
    setStreamingState,
    setSendingState,
    setNarrowState,
    addPendingSaveOperation,
    removePendingSaveOperation,
    getPendingSaveOperations,
    cleanup,
  };
}
