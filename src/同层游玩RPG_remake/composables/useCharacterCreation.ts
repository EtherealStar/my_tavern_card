/**
 * Vue Composable for Character Creation
 * 专门处理创建角色流程的功能，包括数据转换、出身加成计算、MVU变量更新
 */

import { inject, onMounted, onUnmounted, Ref, ref } from 'vue';
import type { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { BACKGROUNDS } from '../data/backgrounds';
import type { Attributes, Background } from '../models/CreationSchemas';
import type { StatDataBindingService } from '../services/StatDataBindingService';
import { useWorldbookToggle } from './useWorldbookToggle';
// 创建数据接口
export interface CreationData {
  difficulty: '简单' | '普通' | '困难';
  world: '现代：阴阳师' | '西幻';
  expansions: string[];
  attributes: Attributes;
  background?: string; // 可能为undefined
  gender: '男性' | '女性' | '男生女相' | '扶她';
  race: '人族' | '灵族' | '妖族';
}

// 返回接口
export interface UseCharacterCreationReturn {
  // 状态
  isProcessing: Ref<boolean>;
  creationError: Ref<string | null>;

  // 方法
  processCreationData: (data: CreationData) => Promise<boolean>;
  calculateFinalAttributes: (attributes: Attributes, background: Background) => Record<string, number>;
  applyToMvuVariables: (attributes: Record<string, number>) => Promise<boolean>;

  // 事件处理
  setupEventListeners: () => void;
  cleanupEventListeners: () => void;
}

export function useCharacterCreation(): UseCharacterCreationReturn {
  // 注入服务
  const statDataBinding = inject<StatDataBindingService>(TYPES.StatDataBindingService);
  const eventBus = inject<EventBus>(TYPES.EventBus);
  const { applyBackgroundToggles } = useWorldbookToggle();

  // 响应式状态
  const isProcessing = ref(false);
  const creationError = ref<string | null>(null);

  // 事件监听器引用
  let eventListeners: Array<() => void> = [];

  /**
   * 将Attributes对象转换为英文属性键的Record对象
   * 移除pointsLeft字段，只保留属性值
   */
  const convertAttributesToRecord = (attributes: Attributes): Record<string, number> => {
    const attributeRecord: Record<string, number> = {};

    // 直接使用英文属性名，排除pointsLeft字段
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== 'pointsLeft' && typeof value === 'number') {
        // 确保数值有效
        const numValue = Number(value);
        if (Number.isFinite(numValue) && numValue >= 0) {
          attributeRecord[key] = numValue;
        } else {
          console.warn(`[useCharacterCreation] 无效的属性值: ${key} = ${value}`);
          attributeRecord[key] = 0; // 使用默认值
        }
      }
    });

    console.log('[useCharacterCreation] 属性转换结果:', attributeRecord);
    return attributeRecord;
  };

  /**
   * 根据出身计算属性加成
   */
  const calculateBackgroundBonus = (
    baseAttributes: Record<string, number>,
    background: Background,
  ): Record<string, number> => {
    const finalAttributes = { ...baseAttributes };

    // 应用出身的属性加成，直接使用英文属性名
    if (background.attributeBonus) {
      Object.entries(background.attributeBonus).forEach(([attributeKey, bonus]) => {
        if (finalAttributes[attributeKey] !== undefined) {
          finalAttributes[attributeKey] += bonus;
        }
      });
    }

    return finalAttributes;
  };

  /**
   * 计算最终属性（基础属性 + 出身加成）
   */
  const calculateFinalAttributes = (attributes: Attributes, background: Background): Record<string, number> => {
    try {
      // 1. 转换为英文属性键Record对象
      const englishAttributes = convertAttributesToRecord(attributes);

      // 2. 应用出身加成
      const finalAttributes = calculateBackgroundBonus(englishAttributes, background);

      return finalAttributes;
    } catch (error) {
      console.error('[useCharacterCreation] 属性计算失败:', error);
      throw error;
    }
  };

  /**
   * 将属性数据应用到MVU变量
   */
  const applyToMvuVariables = async (attributes: Record<string, number>): Promise<boolean> => {
    if (!statDataBinding) {
      console.error('[useCharacterCreation] StatDataBindingService 不可用');
      return false;
    }

    try {
      console.log('[useCharacterCreation] 准备应用属性到MVU变量:', attributes);

      // 检查MVU框架是否可用
      const Mvu = (window as any).Mvu;
      if (!Mvu) {
        console.error('[useCharacterCreation] MVU框架不可用');
        return false;
      }

      // 获取MVU数据
      const mvuData = statDataBinding.getMvuData();
      if (!mvuData) {
        console.error('[useCharacterCreation] 无法获取MVU数据');
        return false;
      }

      // 使用StatDataBindingService的setAttributes方法
      // 该方法会自动检测角色创建数据并设置base_attributes和current_attributes
      const results = await statDataBinding.setAttributes(attributes, 'character_creation');

      console.log('[useCharacterCreation] 属性应用结果:', results);

      const success = results.every(result => result === true);

      if (success) {
        console.log('[useCharacterCreation] 属性应用成功');
        return true;
      } else {
        console.error('[useCharacterCreation] 部分属性应用失败:', results);
        return false;
      }
    } catch (error) {
      console.error('[useCharacterCreation] 应用属性到MVU变量失败:', error);
      return false;
    }
  };

  /**
   * 根据出身名称查找背景数据
   */
  const findBackgroundByName = (backgroundName: string): Background | null => {
    return BACKGROUNDS.find(bg => bg.name === backgroundName) || null;
  };

  /**
   * 设置角色身份信息（性别和种族）
   */
  const setCharacterIdentity = async (gender: string, race: string): Promise<void> => {
    if (!statDataBinding) {
      console.error('[useCharacterCreation] StatDataBindingService 不可用');
      return;
    }

    try {
      console.log('[useCharacterCreation] 开始设置角色身份:', { gender, race });

      // 设置性别
      const genderSuccess = await statDataBinding.setGender(gender, '角色创建');
      if (!genderSuccess) {
        console.warn('[useCharacterCreation] 性别设置失败');
      } else {
        console.log('[useCharacterCreation] 性别设置成功:', gender);
      }

      // 设置种族
      const raceSuccess = await statDataBinding.setRace(race, '角色创建');
      if (!raceSuccess) {
        console.warn('[useCharacterCreation] 种族设置失败');
      } else {
        console.log('[useCharacterCreation] 种族设置成功:', race);
      }

      console.log('[useCharacterCreation] 角色身份设置完成:', { gender, race });
    } catch (error) {
      console.error('[useCharacterCreation] 设置角色身份失败:', error);
      throw error; // 重新抛出错误，让调用者处理
    }
  };

  /**
   * 处理创建角色数据
   */
  const processCreationData = async (data: CreationData): Promise<boolean> => {
    if (isProcessing.value) {
      console.warn('[useCharacterCreation] 正在处理中，跳过重复请求');
      return false;
    }

    isProcessing.value = true;
    creationError.value = null;

    try {
      // 1. 获取出身信息
      const backgroundName = data.background || '平民出身'; // 默认使用平民出身
      const background = findBackgroundByName(backgroundName);
      if (!background) {
        console.warn('[useCharacterCreation] 未找到出身数据:', backgroundName);
        // 使用默认背景（无加成）
        const defaultBackground: Background = {
          id: 'default',
          name: backgroundName,
          description: '默认出身',
          cost: 0,
          attributeBonus: {},
        };

        // 2. 计算最终属性
        const finalAttributes = calculateFinalAttributes(data.attributes, defaultBackground);

        // 3. 应用到MVU变量
        const attributesSuccess = await applyToMvuVariables(finalAttributes);

        if (attributesSuccess) {
          // 4. 设置性别和种族
          try {
            await setCharacterIdentity(data.gender, data.race);
            return true;
          } catch (error) {
            console.error('[useCharacterCreation] 设置角色身份失败:', error);
            creationError.value = '角色身份设置失败';
            return false;
          }
        } else {
          creationError.value = '属性应用失败';
          return false;
        }
      }

      // 2. 计算最终属性
      const finalAttributes = calculateFinalAttributes(data.attributes, background);

      // 3. 应用到MVU变量
      const attributesSuccess = await applyToMvuVariables(finalAttributes);

      if (attributesSuccess) {
        // 4. 设置性别和种族
        try {
          await setCharacterIdentity(data.gender, data.race);
        } catch (error) {
          console.error('[useCharacterCreation] 设置角色身份失败:', error);
          creationError.value = '角色身份设置失败';
          return false;
        }

        // 5. 应用出身世界书开关
        if (background.id) {
          try {
            const result = await applyBackgroundToggles(background.id);
            if (!result.success) {
              console.warn('[useCharacterCreation] 应用出身世界书开关失败:', result.error);
              // 世界书开关失败不影响角色创建流程，只记录警告
            }
          } catch (error) {
            console.error('[useCharacterCreation] 应用出身世界书开关异常:', error);
            // 世界书开关失败不影响角色创建流程，只记录错误
          }
        }
        return true;
      } else {
        creationError.value = '属性应用失败';
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '处理创建数据失败';
      console.error('[useCharacterCreation] 处理创建数据失败:', error);
      creationError.value = errorMessage;
      return false;
    } finally {
      isProcessing.value = false;
    }
  };

  /**
   * 处理game:init-story事件
   */
  const handleInitStoryEvent = async (data: CreationData) => {
    try {
      console.log('[useCharacterCreation] 收到game:init-story事件:', data);

      // 验证数据完整性
      if (!data || !data.attributes || !data.gender || !data.race) {
        console.error('[useCharacterCreation] 角色创建数据不完整:', data);
        return;
      }

      const success = await processCreationData(data);
      if (!success) {
        console.error('[useCharacterCreation] 角色创建数据处理失败');
        if (creationError.value) {
          console.error('[useCharacterCreation] 错误详情:', creationError.value);
        }
      } else {
        console.log('[useCharacterCreation] 角色创建数据处理成功');
      }
    } catch (error) {
      console.error('[useCharacterCreation] 处理game:init-story事件失败:', error);
      creationError.value = error instanceof Error ? error.message : '处理事件失败';
    }
  };

  /**
   * 设置事件监听器
   */
  const setupEventListeners = () => {
    try {
      if (!eventBus) {
        console.warn('[useCharacterCreation] EventBus 不可用，无法设置事件监听');
        return;
      }

      // 监听game:init-story事件
      const unsubscribe = eventBus.on('game:init-story', handleInitStoryEvent);
      eventListeners.push(unsubscribe);
    } catch (error) {
      console.error('[useCharacterCreation] 设置事件监听器失败:', error);
    }
  };

  /**
   * 清理事件监听器
   */
  const cleanupEventListeners = () => {
    try {
      eventListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      eventListeners = [];
    } catch (error) {
      console.error('[useCharacterCreation] 清理事件监听器失败:', error);
    }
  };

  // 生命周期管理
  onMounted(() => {
    setupEventListeners();
  });

  onUnmounted(() => {
    cleanupEventListeners();
  });

  return {
    // 状态
    isProcessing,
    creationError,

    // 方法
    processCreationData,
    calculateFinalAttributes,
    applyToMvuVariables,

    // 事件处理
    setupEventListeners,
    cleanupEventListeners,
  };
}
