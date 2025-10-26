/**
 * Vue Composable for Prompt Injection
 * 专门负责插入新的提示词，支持战斗子系统、指令队列功能等调用
 * 使用 InjectionPrompt 格式，注入到用户输入位置
 */

import { ref } from 'vue';

// 注入提示词条目类型定义
interface PromptEntry {
  id: string;
  content: string;
  position?: 'none' | 'in_chat';
  depth?: number;
  should_scan?: boolean;
  scope: 'next' | 'session' | 'tagged';
  priority?: number;
  source?: string;
}

// 注入提示词选项
interface InjectionOptions {
  position?: 'none' | 'in_chat';
  depth?: number;
  should_scan?: boolean;
  priority?: number;
  source?: string;
}

// 全局单例状态
const nextPrompts = ref<PromptEntry[]>([]);
const sessionPrompts = ref<PromptEntry[]>([]);

// 生成唯一ID
const generateId = (): string => {
  return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export function usePromptInjector() {
  /**
   * 添加下一次生成时使用的注入提示词
   * @param content 提示词内容
   * @param options 注入选项
   */
  const addNextInjection = (content: string, options: InjectionOptions = {}): string => {
    const id = generateId();
    const entry: PromptEntry = {
      id,
      content,
      position: options.position || 'in_chat',
      depth: options.depth || 0,
      should_scan: options.should_scan ?? true,
      scope: 'next',
      priority: options.priority || 0,
      source: options.source,
    };

    nextPrompts.value.push(entry);
    console.log('[usePromptInjector] 添加下一次生成注入提示词:', { id, content, options });
    return id;
  };

  /**
   * 添加会话级注入提示词（持续到手动清除）
   * @param content 提示词内容
   * @param options 注入选项
   */
  const addSessionInjection = (content: string, options: InjectionOptions = {}): string => {
    const id = generateId();
    const entry: PromptEntry = {
      id,
      content,
      position: options.position || 'in_chat',
      depth: options.depth || 0,
      should_scan: options.should_scan ?? true,
      scope: 'session',
      priority: options.priority || 0,
      source: options.source,
    };

    sessionPrompts.value.push(entry);
    console.log('[usePromptInjector] 添加会话级注入提示词:', { id, content, options });
    return id;
  };

  /**
   * 便捷方法：添加系统提示词（下一次生成）
   */
  const addSystemHintNext = (content: string, options: Omit<InjectionOptions, 'position'> = {}): string => {
    return addNextInjection(content, {
      position: 'in_chat',
      should_scan: true,
      ...options,
    });
  };

  /**
   * 便捷方法：添加系统提示词（会话级）
   */
  const addSystemHintSession = (content: string, options: Omit<InjectionOptions, 'position'> = {}): string => {
    return addSessionInjection(content, {
      position: 'in_chat',
      should_scan: true,
      ...options,
    });
  };

  /**
   * 收集下一次生成要使用的注入提示词
   * 合并会话级和下一次生成提示词，按优先级排序，并清空下一次生成提示词
   */
  const collectForNextGeneration = (): Omit<InjectionPrompt, 'id'>[] => {
    // 合并会话级和下一次生成提示词
    const allPrompts = [...sessionPrompts.value, ...nextPrompts.value];

    // 按优先级排序（数值越大越靠前），同优先级按加入顺序
    const sortedPrompts = allPrompts.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      return 0; // 保持稳定排序
    });

    // 转换为 InjectionPrompt 格式（去掉 id）
    const injectionPrompts: Omit<InjectionPrompt, 'id'>[] = sortedPrompts.map(entry => ({
      role: 'system' as const,
      content: entry.content,
      position: entry.position || 'in_chat',
      depth: entry.depth || 0,
      should_scan: entry.should_scan ?? true,
    }));

    // 清空下一次生成提示词
    nextPrompts.value = [];

    console.log('[usePromptInjector] 收集注入提示词:', {
      total: injectionPrompts.length,
      session: sessionPrompts.value.length,
      next: nextPrompts.value.length,
    });

    return injectionPrompts;
  };

  /**
   * 按来源清除注入提示词
   * @param source 来源标识
   * @param scope 清除范围
   */
  const clearBySource = (source: string, scope: 'next' | 'session' | 'both' = 'both'): void => {
    if (scope === 'next' || scope === 'both') {
      const beforeCount = nextPrompts.value.length;
      nextPrompts.value = nextPrompts.value.filter(entry => entry.source !== source);
      console.log('[usePromptInjector] 清除下一次生成提示词:', {
        source,
        before: beforeCount,
        after: nextPrompts.value.length,
      });
    }

    if (scope === 'session' || scope === 'both') {
      const beforeCount = sessionPrompts.value.length;
      sessionPrompts.value = sessionPrompts.value.filter(entry => entry.source !== source);
      console.log('[usePromptInjector] 清除会话级提示词:', {
        source,
        before: beforeCount,
        after: sessionPrompts.value.length,
      });
    }
  };

  /**
   * 清除所有注入提示词
   * @param scope 清除范围
   */
  const clearAll = (scope: 'next' | 'session' | 'both' = 'both'): void => {
    if (scope === 'next' || scope === 'both') {
      nextPrompts.value = [];
    }
    if (scope === 'session' || scope === 'both') {
      sessionPrompts.value = [];
    }
    console.log('[usePromptInjector] 清除所有提示词:', { scope });
  };

  /**
   * 获取当前状态（调试用）
   */
  const getStatus = () => {
    return {
      nextCount: nextPrompts.value.length,
      sessionCount: sessionPrompts.value.length,
      nextPrompts: nextPrompts.value.map(p => ({
        id: p.id,
        content: p.content.substring(0, 50) + '...',
        source: p.source,
      })),
      sessionPrompts: sessionPrompts.value.map(p => ({
        id: p.id,
        content: p.content.substring(0, 50) + '...',
        source: p.source,
      })),
    };
  };

  return {
    // 添加方法
    addNextInjection,
    addSessionInjection,
    addSystemHintNext,
    addSystemHintSession,

    // 消费方法
    collectForNextGeneration,

    // 清理方法
    clearBySource,
    clearAll,

    // 调试方法
    getStatus,
  };
}
