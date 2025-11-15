/**
 * Vue Composable for Prompt Injection
 * 专门负责插入新的提示词，支持战斗子系统、指令队列功能等调用
 * 使用 InjectionPrompt 格式，注入到用户输入位置
 */

import { inject, onMounted, ref } from 'vue';
import type { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';

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

// 装备事件监听器的取消订阅函数存储
let equipmentEventUnsubscribers: (() => void)[] = [];
// 标志是否已经设置了监听器（避免重复设置）
let equipmentListenersSetup = false;

export function usePromptInjector() {
  // 获取 EventBus
  const eventBus = inject<EventBus>(TYPES.EventBus);
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

  /**
   * 设置装备事件监听器
   * 监听指令队列里的装备指令被装备或卸下时，自动注入提示词
   */
  const setupEquipmentListeners = (): void => {
    if (!eventBus) {
      console.warn('[usePromptInjector] EventBus 不可用，无法设置装备事件监听器');
      return;
    }

    // 如果已经设置过监听器，直接返回（避免重复设置）
    if (equipmentListenersSetup) {
      console.log('[usePromptInjector] 装备事件监听器已设置，跳过重复设置');
      return;
    }

    // 清理之前的监听器（防止有残留）
    cleanupEquipmentListeners();

    // 监听装备事件
    equipmentEventUnsubscribers.push(
      eventBus.on('equipment:weapon_equipped', (payload: any) => {
        if (payload?.weapon?.name) {
          const prompt = `<user>装备了${payload.weapon.name}`;
          addNextInjection(prompt, { source: 'equipment-listener' });
          console.log('[usePromptInjector] 装备武器事件，注入提示词:', prompt);
        }
      }),
    );

    equipmentEventUnsubscribers.push(
      eventBus.on('equipment:armor_equipped', (payload: any) => {
        if (payload?.armor?.name) {
          const prompt = `<user>装备了${payload.armor.name}`;
          addNextInjection(prompt, { source: 'equipment-listener' });
          console.log('[usePromptInjector] 装备防具事件，注入提示词:', prompt);
        }
      }),
    );

    equipmentEventUnsubscribers.push(
      eventBus.on('equipment:accessory_equipped', (payload: any) => {
        if (payload?.accessory?.name) {
          const prompt = `<user>装备了${payload.accessory.name}`;
          addNextInjection(prompt, { source: 'equipment-listener' });
          console.log('[usePromptInjector] 装备饰品事件，注入提示词:', prompt);
        }
      }),
    );

    // 监听卸下事件
    equipmentEventUnsubscribers.push(
      eventBus.on('equipment:weapon_unequipped', (payload: any) => {
        if (payload?.weapon?.name) {
          const prompt = `<user>卸下了${payload.weapon.name}`;
          addNextInjection(prompt, { source: 'equipment-listener' });
          console.log('[usePromptInjector] 卸下武器事件，注入提示词:', prompt);
        }
      }),
    );

    equipmentEventUnsubscribers.push(
      eventBus.on('equipment:armor_unequipped', (payload: any) => {
        if (payload?.armor?.name) {
          const prompt = `<user>卸下了${payload.armor.name}`;
          addNextInjection(prompt, { source: 'equipment-listener' });
          console.log('[usePromptInjector] 卸下防具事件，注入提示词:', prompt);
        }
      }),
    );

    equipmentEventUnsubscribers.push(
      eventBus.on('equipment:accessory_unequipped', (payload: any) => {
        if (payload?.accessory?.name) {
          const prompt = `<user>卸下了${payload.accessory.name}`;
          addNextInjection(prompt, { source: 'equipment-listener' });
          console.log('[usePromptInjector] 卸下饰品事件，注入提示词:', prompt);
        }
      }),
    );

    equipmentListenersSetup = true;
    console.log('[usePromptInjector] 装备事件监听器已设置');
  };

  /**
   * 清理装备事件监听器
   */
  const cleanupEquipmentListeners = (): void => {
    equipmentEventUnsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('[usePromptInjector] 清理装备事件监听器失败:', error);
      }
    });
    equipmentEventUnsubscribers = [];
    equipmentListenersSetup = false;
  };

  // 生命周期管理：在组件挂载时设置监听器
  // 注意：由于 usePromptInjector 是全局单例，监听器也是全局的，
  // 因此不应该在组件卸载时清理，应该保持激活状态
  onMounted(() => {
    setupEquipmentListeners();
  });

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

    // 装备监听器管理方法
    setupEquipmentListeners,
    cleanupEquipmentListeners,
  };
}
