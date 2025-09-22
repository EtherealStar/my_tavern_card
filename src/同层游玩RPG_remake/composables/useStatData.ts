/**
 * Vue Composable for StatDataBindingService
 * 提供响应式的统计数据绑定功能，基于MVU变量框架
 *
 * 纯ref架构版本：
 * - 响应式数据：使用Vue的ref来管理所有数据状态
 * - 立即UI更新：数据变化时Vue立即重新渲染组件
 * - 事件驱动更新：通过订阅MVU变量更新事件直接更新ref
 * - 统一数据源：所有数据都使用ref存储，通过事件直接更新
 *
 * 为什么使用纯ref而不是computed：
 * 1. MVU变量频繁更新，不需要computed的缓存机制
 * 2. 直接更新ref.value，Vue立即重新渲染
 * 3. 避免computed依赖追踪的复杂性
 * 4. 性能更好，逻辑更清晰
 */

import { computed, inject, onMounted, onUnmounted, reactive, ref } from 'vue';
import { TYPES } from '../core/ServiceIdentifiers';
import { ATTRIBUTE_NAME_MAP } from '../models/CreationSchemas';
import type { GameState } from '../models/GameState';
import { GamePhase } from '../models/GameState';
import type { StatDataBindingService } from '../services/StatDataBindingService';

export function useStatData() {
  const statDataBinding = inject<StatDataBindingService>(TYPES.StatDataBindingService);

  if (!statDataBinding) {
    throw new Error('StatDataBindingService not found. Make sure it is provided in the Vue app.');
  }

  // ==================== 属性名映射工具 ====================
  // 中文属性名到英文属性名的反向映射
  const CHINESE_TO_ENGLISH_ATTRIBUTE_MAP: Record<string, string> = {
    力量: 'strength',
    敏捷: 'agility',
    智力: 'intelligence',
    体质: 'constitution',
    魅力: 'charisma',
    意志: 'willpower',
    幸运: 'luck',
  };

  /**
   * 将中文属性名转换为英文属性名
   */
  const getEnglishAttributeName = (chineseName: string): string => {
    return CHINESE_TO_ENGLISH_ATTRIBUTE_MAP[chineseName] || chineseName;
  };

  /**
   * 将英文属性名转换为中文属性名
   */
  const getChineseAttributeName = (englishName: string): string => {
    return ATTRIBUTE_NAME_MAP[englishName as keyof typeof ATTRIBUTE_NAME_MAP] || englishName;
  };

  // ==================== 纯ref数据存储 ====================
  // 使用ref存储所有数据，通过事件直接更新，确保Vue立即重新渲染

  // 核心统计数据
  const statData = ref<any>(null);
  const baseAttributes = ref<Record<string, number>>({});
  const currentAttributes = ref<Record<string, number>>({});
  const equipment = ref<any>({});
  const inventory = ref<any>({});

  // 数据更新触发器 - 用于强制Vue重新渲染
  const dataUpdateTrigger = ref(0);

  // 数据初始化函数
  const initializeData = async () => {
    try {
      if (!statDataBinding?.isReady()) {
        await statDataBinding?.waitForReady(5000);
      }

      // 初始化所有数据
      statData.value = statDataBinding?.getStatData() || null;
      baseAttributes.value = statDataBinding?.getBaseAttributes() || {};
      currentAttributes.value = statDataBinding?.getCurrentAttributes() || {};
      equipment.value = statDataBinding?.getEquipment() || {};
      inventory.value = statDataBinding?.getInventory() || {};

      // 触发数据更新
      dataUpdateTrigger.value++;
    } catch (err) {
      console.error('[useStatData] 数据初始化失败:', err);
    }
  };

  // ==================== 游戏状态数据 ====================
  // 使用reactive管理游戏状态，通过事件直接更新

  const gameState = reactive({
    currentDate: '未知日期',
    currentTime: '未知时间',
    currentLocation: '未知地点',
    currentRandomEvent: '无',
    relationships: {} as Record<string, any>,
  });

  // ==================== 角色基本信息数据 ====================
  // 使用reactive管理角色基本信息，通过事件直接更新

  const characterInfo = reactive({
    gender: '未知',
    race: '未知',
    age: 16,
  });

  // ==================== 关系人物数据 ====================
  // 使用reactive管理关系人物信息，通过事件直接更新

  const relationshipCharacters = ref<any[]>([]);
  const relationshipCharactersLoading = ref(false);
  const relationshipCharactersError = ref<string | null>(null);

  // 计算属性：检查随机事件是否活跃
  const isRandomEventActive = ref(false);

  // 统一的数据更新方法
  const updateGameState = (newState: Partial<typeof gameState>) => {
    Object.assign(gameState, newState);
    // 更新随机事件活跃状态
    isRandomEventActive.value = gameState.currentRandomEvent !== '无' && gameState.currentRandomEvent.trim() !== '';
  };

  // 角色信息更新方法
  const updateCharacterInfo = (newInfo: Partial<typeof characterInfo>) => {
    Object.assign(characterInfo, newInfo);
  };

  // 异步加载游戏状态数据
  const loadGameStateData = async () => {
    try {
      const [date, time, location, randomEvent, relData, charInfo] = await Promise.all([
        statDataBinding?.getCurrentDate() || '未知日期',
        statDataBinding?.getCurrentTime() || '未知时间',
        statDataBinding?.getCurrentLocation() || '未知地点',
        statDataBinding?.getCurrentRandomEvent() || '无',
        statDataBinding?.getMvuRelationships() || {},
        statDataBinding?.getCharacterInfo() || { gender: '未知', race: '未知', age: 16 },
      ]);

      updateGameState({
        currentDate: date,
        currentTime: time,
        currentLocation: location,
        currentRandomEvent: randomEvent,
        relationships: relData,
      });

      updateCharacterInfo(charInfo);
    } catch (err) {
      console.error('[useStatData] 加载游戏状态数据失败:', err);
    }
  };

  // 事件订阅管理
  let unsubscribeMvuEvents: (() => void) | null = null;

  // ==================== 状态管理协调机制 ====================

  // 注册到状态管理协调机制
  const registerStatData = () => {
    try {
      // 尝试获取状态管理器
      const gameStateManager = (window as any).__RPG_GAME_STATE_MANAGER__;

      if (gameStateManager && typeof gameStateManager.registerComposable === 'function') {
        // 注册到状态管理协调机制
        const unregister = gameStateManager.registerComposable(GamePhase.PLAYING, async (_newState: GameState) => {
          try {
            // 重新加载游戏状态数据
            await loadGameStateData();
          } catch (error) {
            console.error('[useStatData] 游戏状态数据加载失败:', error);
            throw error; // 重新抛出错误，让状态管理器处理
          }
        });

        // 存储取消注册函数
        (window as any).__RPG_STAT_DATA_UNREGISTER__ = unregister;
      } else {
        console.warn('[useStatData] 状态管理器不可用，跳过状态管理协调注册');
      }
    } catch (error) {
      console.warn('[useStatData] 注册到状态管理协调机制失败:', error);
    }
  };

  // 清理状态管理协调
  const cleanupStatData = () => {
    try {
      // 清理状态管理协调
      const unregister = (window as any).__RPG_STAT_DATA_UNREGISTER__;
      if (unregister && typeof unregister === 'function') {
        unregister();
        (window as any).__RPG_STAT_DATA_UNREGISTER__ = undefined;
      }
    } catch (error) {
      console.warn('[useStatData] 清理状态管理协调失败:', error);
    }
  };

  // 统一的数据加载方法（已移除，数据通过服务自动管理）

  // ==================== 数据操作方法 ====================
  // 直接调用服务方法，让服务处理异步逻辑
  // 响应式数据会自动更新，无需手动管理状态

  const updateBaseAttribute = async (attributeName: string, value: number, reason?: string) => {
    return (await statDataBinding?.setBaseAttribute(attributeName, value, reason)) || false;
  };

  const updateCurrentAttribute = async (attributeName: string, value: number, reason?: string) => {
    return (await statDataBinding?.setCurrentAttribute(attributeName, value, reason)) || false;
  };

  const updateBaseAttributes = async (attributes: Record<string, number>, reason?: string) => {
    return (await statDataBinding?.updateBaseAttributes(attributes, reason)) || false;
  };

  const updateCurrentAttributes = async (attributes: Record<string, number>, reason?: string) => {
    return (await statDataBinding?.updateCurrentAttributes(attributes, reason)) || false;
  };

  /**
   * 获取特定角色的好感度
   */
  const getMvuAffinity = async (characterId: string | number): Promise<number> => {
    return (await statDataBinding?.getMvuAffinity(characterId)) || 0;
  };

  // ==================== 角色基本信息方法 ====================

  /**
   * 获取用户性别
   */
  const getGender = async (): Promise<string> => {
    return (await statDataBinding?.getGender()) || '未知';
  };

  /**
   * 获取用户种族
   */
  const getRace = async (): Promise<string> => {
    return (await statDataBinding?.getRace()) || '未知';
  };

  /**
   * 获取用户年龄
   */
  const getAge = async (): Promise<number> => {
    return (await statDataBinding?.getAge()) || 16;
  };

  /**
   * 获取角色基本信息
   */
  const getCharacterInfo = async () => {
    return (await statDataBinding?.getCharacterInfo()) || { gender: '未知', race: '未知', age: 16 };
  };

  // ==================== 关系人物数据获取方法 ====================

  /**
   * 获取所有关系人物列表
   */
  const getRelationshipCharacters = async (): Promise<any[]> => {
    try {
      relationshipCharactersLoading.value = true;
      relationshipCharactersError.value = null;

      // 从MVU变量中获取关系人物数据
      const relationships = (await statDataBinding?.getMvuRelationships()) || {};
      const characters: any[] = [];

      // 遍历关系数据，提取人物信息
      for (const [characterId, relationshipData] of Object.entries(relationships)) {
        if (relationshipData && typeof relationshipData === 'object') {
          // 获取人物基础信息
          const charInfo = await getCharacterBasicInfo(characterId);

          // 获取人物属性
          const charAttributes = await getCharacterAttributes(characterId);

          // 获取人物装备
          const charEquipment = await getCharacterEquipment(characterId);

          // 获取好感度
          const affinity = await getMvuAffinity(characterId);

          characters.push({
            id: characterId,
            name: charInfo.name || `角色${characterId}`,
            gender: charInfo.gender || '未知',
            race: charInfo.race || '未知',
            age: charInfo.age || 16,
            attributes: charAttributes,
            equipment: charEquipment,
            affinity,
            relationshipData,
          });
        }
      }

      relationshipCharacters.value = characters;
      return characters;
    } catch (error) {
      console.error('[useStatData] 获取关系人物列表失败:', error);
      relationshipCharactersError.value = '获取关系人物列表失败';
      return [];
    } finally {
      relationshipCharactersLoading.value = false;
    }
  };

  /**
   * 获取特定关系人物详情
   */
  const getRelationshipCharacter = async (characterId: string | number): Promise<any | null> => {
    try {
      // 先尝试从缓存中获取
      const cached = relationshipCharacters.value.find(char => char.id === characterId);
      if (cached) {
        return cached;
      }

      // 如果缓存中没有，则重新获取
      const charInfo = await getCharacterBasicInfo(characterId);
      const charAttributes = await getCharacterAttributes(characterId);
      const charEquipment = await getCharacterEquipment(characterId);
      const affinity = await getMvuAffinity(characterId);

      return {
        id: characterId,
        name: charInfo.name || `角色${characterId}`,
        gender: charInfo.gender || '未知',
        race: charInfo.race || '未知',
        age: charInfo.age || 16,
        attributes: charAttributes,
        equipment: charEquipment,
        affinity,
      };
    } catch (error) {
      console.error('[useStatData] 获取关系人物详情失败:', error);
      return null;
    }
  };

  /**
   * 获取人物基础信息
   */
  const getCharacterBasicInfo = async (characterId: string | number): Promise<any> => {
    try {
      // 通过MVU变量获取人物基础信息
      const name = (await statDataBinding?.getAttributeValue(`character.${characterId}.name`, '')) || '';
      const gender = (await statDataBinding?.getAttributeValue(`character.${characterId}.gender`, '')) || '';
      const race = (await statDataBinding?.getAttributeValue(`character.${characterId}.race`, '')) || '';
      const age = (await statDataBinding?.getAttributeValue(`character.${characterId}.age`, 16)) || 16;

      return { name, gender, race, age };
    } catch (error) {
      console.error('[useStatData] 获取人物基础信息失败:', error);
      return { name: '', gender: '未知', race: '未知', age: 16 };
    }
  };

  /**
   * 获取人物属性
   */
  const getCharacterAttributes = async (characterId: string | number): Promise<Record<string, number>> => {
    try {
      const attributes: Record<string, number> = {};
      const attrNames = ['力量', '敏捷', '智力', '体质', '魅力', '幸运', '意志'];

      for (const attrName of attrNames) {
        const value = (await statDataBinding?.getAttributeValue(`character.${characterId}.${attrName}`, 0)) || 0;
        attributes[attrName] = Number(value);
      }

      return attributes;
    } catch (error) {
      console.error('[useStatData] 获取人物属性失败:', error);
      return {};
    }
  };

  /**
   * 获取人物装备
   */
  const getCharacterEquipment = async (characterId: string | number): Promise<any> => {
    try {
      const weapon = await statDataBinding?.getAttributeValue(`character.${characterId}.equipment.weapon`, null);
      const armor = await statDataBinding?.getAttributeValue(`character.${characterId}.equipment.armor`, null);
      const accessory = await statDataBinding?.getAttributeValue(`character.${characterId}.equipment.accessory`, null);

      return { weapon, armor, accessory };
    } catch (error) {
      console.error('[useStatData] 获取人物装备失败:', error);
      return { weapon: null, armor: null, accessory: null };
    }
  };

  /**
   * 获取人物背包
   */
  const getCharacterInventory = async (characterId: string | number): Promise<any> => {
    try {
      const weapons =
        (await statDataBinding?.getAttributeValue(`character.${characterId}.inventory.weapons`, [])) || [];
      const armors = (await statDataBinding?.getAttributeValue(`character.${characterId}.inventory.armors`, [])) || [];
      const accessories =
        (await statDataBinding?.getAttributeValue(`character.${characterId}.inventory.accessories`, [])) || [];
      const others = (await statDataBinding?.getAttributeValue(`character.${characterId}.inventory.others`, [])) || [];

      return { weapons, armors, accessories, others };
    } catch (error) {
      console.error('[useStatData] 获取人物背包失败:', error);
      return { weapons: [], armors: [], accessories: [], others: [] };
    }
  };

  // 游戏状态数据加载方法已恢复，用于异步数据获取

  // ==================== 显示相关函数 ====================

  /**
   * 获取属性显示值（同步版本）
   * 支持中文属性名到英文属性名的映射
   */
  const getAttributeDisplay = (attributeName: string): string => {
    try {
      // 首先尝试直接使用传入的属性名
      let value = currentAttributes.value[attributeName];

      // 如果直接获取失败，尝试将中文属性名转换为英文属性名
      if (value === undefined) {
        const englishName = getEnglishAttributeName(attributeName);
        if (englishName !== attributeName) {
          value = currentAttributes.value[englishName];
        }
      }

      return value !== undefined ? String(value) : '—';
    } catch (err) {
      return '—';
    }
  };

  /**
   * 获取属性显示值（异步版本，使用服务方法）
   */
  const getAttributeDisplayAsync = async (attributeName: string): Promise<string> => {
    const value = await statDataBinding?.getCurrentAttribute(attributeName);
    return value !== undefined ? String(value) : '—';
  };

  /**
   * 检查属性是否被修改
   * 支持中文属性名到英文属性名的映射
   */
  const isAttributeModified = (attributeName: string): boolean => {
    try {
      // 首先尝试直接使用传入的属性名
      let base = baseAttributes.value[attributeName];
      let current = currentAttributes.value[attributeName];

      // 如果直接获取失败，尝试将中文属性名转换为英文属性名
      if (base === undefined || current === undefined) {
        const englishName = getEnglishAttributeName(attributeName);
        if (englishName !== attributeName) {
          base = baseAttributes.value[englishName];
          current = currentAttributes.value[englishName];
        }
      }

      return base !== undefined && current !== undefined && base !== current;
    } catch (err) {
      return false;
    }
  };

  /**
   * 获取属性变化值
   * 支持中文属性名到英文属性名的映射
   */
  const getAttributeDeltaValue = (attributeName: string): string => {
    try {
      // 首先尝试直接使用传入的属性名
      let current = currentAttributes.value[attributeName];
      let base = baseAttributes.value[attributeName];

      // 如果直接获取失败，尝试将中文属性名转换为英文属性名
      if (current === undefined || base === undefined) {
        const englishName = getEnglishAttributeName(attributeName);
        if (englishName !== attributeName) {
          current = currentAttributes.value[englishName];
          base = baseAttributes.value[englishName];
        }
      }

      if (current !== undefined && base !== undefined) {
        const delta = current - base;
        if (delta > 0) {
          return `+${delta}`;
        } else if (delta < 0) {
          return String(delta);
        }
      }
    } catch (err) {
      // 忽略错误
    }

    return '';
  };

  // ==================== 装备管理方法 ====================
  // 直接调用服务方法，响应式数据会自动更新

  const equipWeapon = async (weapon: any, reason?: string) => {
    return (await statDataBinding?.equipWeapon(weapon, reason)) || false;
  };

  const equipArmor = async (armor: any, reason?: string) => {
    return (await statDataBinding?.equipArmor(armor, reason)) || false;
  };

  const equipAccessory = async (accessory: any, reason?: string) => {
    return (await statDataBinding?.equipAccessory(accessory, reason)) || false;
  };

  const unequipWeapon = async (reason?: string) => {
    return (await statDataBinding?.unequipWeapon(reason)) || false;
  };

  const unequipArmor = async (reason?: string) => {
    return (await statDataBinding?.unequipArmor(reason)) || false;
  };

  const unequipAccessory = async (reason?: string) => {
    return (await statDataBinding?.unequipAccessory(reason)) || false;
  };

  // ==================== 装备详情获取方法 ====================
  // 用于装备详情弹窗显示

  /**
   * 获取装备详情
   * @param type 装备类型
   * @returns 装备详情对象
   */
  const getEquipmentDetail = async (type: 'weapon' | 'armor' | 'accessory'): Promise<any> => {
    try {
      switch (type) {
        case 'weapon':
          return (await statDataBinding?.getEquippedWeapon()) || null;
        case 'armor':
          return (await statDataBinding?.getEquippedArmor()) || null;
        case 'accessory':
          return (await statDataBinding?.getEquippedAccessory()) || null;
        default:
          return null;
      }
    } catch (error) {
      console.error('[useStatData] 获取装备详情失败:', error);
      return null;
    }
  };

  /**
   * 检查是否装备了指定类型的装备
   * @param type 装备类型
   * @returns 是否已装备
   */
  const isEquipmentEquipped = (type: 'weapon' | 'armor' | 'accessory'): boolean => {
    try {
      const currentEquipment = equipment.value;
      if (!currentEquipment || typeof currentEquipment !== 'object') {
        return false;
      }

      const equippedItem = currentEquipment[type];
      return equippedItem && equippedItem !== null && typeof equippedItem === 'object';
    } catch (error) {
      console.error('[useStatData] 检查装备状态失败:', error);
      return false;
    }
  };

  /**
   * 获取装备显示信息
   * @param type 装备类型
   * @returns 装备显示信息
   */
  const getEquipmentDisplayInfo = (
    type: 'weapon' | 'armor' | 'accessory',
  ): {
    name: string;
    isEquipped: boolean;
    equipment: any;
  } => {
    try {
      const currentEquipment = equipment.value;
      const equippedItem = currentEquipment?.[type];
      const isEquipped = equippedItem && equippedItem !== null && typeof equippedItem === 'object';

      return {
        name: isEquipped ? equippedItem.name || '未知装备' : `未装备${getEquipmentTypeName(type)}`,
        isEquipped,
        equipment: isEquipped ? equippedItem : null,
      };
    } catch (error) {
      console.error('[useStatData] 获取装备显示信息失败:', error);
      return {
        name: `未装备${getEquipmentTypeName(type)}`,
        isEquipped: false,
        equipment: null,
      };
    }
  };

  /**
   * 获取装备类型的中文名称
   * @param type 装备类型
   * @returns 中文名称
   */
  const getEquipmentTypeName = (type: 'weapon' | 'armor' | 'accessory'): string => {
    const typeNames: Record<string, string> = {
      weapon: '武器',
      armor: '防具',
      accessory: '饰品',
    };
    return typeNames[type] || '未知类型';
  };

  // ==================== 背包管理方法 ====================
  // 直接调用服务方法，响应式数据会自动更新

  const addToInventory = async (type: 'weapons' | 'armors' | 'accessories' | 'others', item: any, reason?: string) => {
    return (await statDataBinding?.addToInventory(type, item, reason)) || false;
  };

  const removeFromInventory = async (
    type: 'weapons' | 'armors' | 'accessories' | 'others',
    itemIndex: number,
    reason?: string,
  ) => {
    return (await statDataBinding?.removeFromInventory(type, itemIndex, reason)) || false;
  };

  const getInventoryWeapons = async () => {
    return (await statDataBinding?.getInventoryWeapons()) || [];
  };

  const getInventoryArmors = async () => {
    return (await statDataBinding?.getInventoryArmors()) || [];
  };

  const getInventoryAccessories = async () => {
    return (await statDataBinding?.getInventoryAccessories()) || [];
  };

  const getInventoryOthers = async () => {
    return (await statDataBinding?.getInventoryOthers()) || [];
  };

  // 获取属性值的包装方法
  const getAttributeValue = (attributeName: string, defaultValue?: any): any => {
    try {
      return statDataBinding?.getAttributeValue(attributeName, defaultValue) ?? defaultValue;
    } catch (err) {
      console.error('[useStatData] 获取属性值失败:', err);
      return defaultValue;
    }
  };

  // 从usePlayingLogic获取MVU数据更新的接口
  // 注意：此函数现在主要用于向后兼容，实际的数据更新由MVU事件系统处理
  const updateFromPlayingLogic = async (_updatedData: any) => {
    // 由于数据更新现在由MVU事件系统统一处理，
    // 这里只需要确保数据更新触发器被触发，让Vue重新渲染
    try {
      // 触发数据更新，确保Vue重新渲染
      dataUpdateTrigger.value++;
    } catch (err) {
      console.error('[useStatData] ❌ 触发数据更新失败:', err);
    }
  };

  // 设置统计数据事件订阅 - 现在只处理MVU更新结束事件
  const setupMvuEventSubscription = () => {
    try {
      const eventBus = statDataBinding.getEventBus();

      if (eventBus) {
        // 只订阅MVU变量更新结束事件，用于更新游戏状态数据
        const unsubscribeMvuUpdate = eventBus.on('mvu:update-ended', async () => {
          try {
            // 重新获取所有统计数据
            const newStatData = statDataBinding?.getStatData() || null;
            const newBaseAttributes = statDataBinding?.getBaseAttributes() || {};
            const newCurrentAttributes = statDataBinding?.getCurrentAttributes() || {};
            const newEquipment = statDataBinding?.getEquipment() || {};
            const newInventory = statDataBinding?.getInventory() || {};

            // 更新统计数据ref
            statData.value = newStatData;
            baseAttributes.value = newBaseAttributes;
            currentAttributes.value = newCurrentAttributes;
            equipment.value = newEquipment;
            inventory.value = newInventory;

            // 更新游戏状态数据和角色信息
            await loadGameStateData();

            // 触发数据更新
            dataUpdateTrigger.value++;
          } catch (err) {
            console.error('[useStatData] ❌ 更新所有数据失败:', err);
          }
        });

        unsubscribeMvuEvents = () => {
          try {
            unsubscribeMvuUpdate();
          } catch (err) {
            console.warn('[useStatData] 清理事件订阅失败:', err);
          }
        };
      } else {
        console.warn('[useStatData] 事件总线不可用，无法设置事件订阅');
      }
    } catch (err) {
      console.error('[useStatData] 建立事件订阅失败:', err);
    }
  };

  // 清理事件订阅
  const cleanupEventSubscriptions = () => {
    try {
      if (unsubscribeMvuEvents) {
        unsubscribeMvuEvents();
        unsubscribeMvuEvents = null;
      }
    } catch (err) {
      console.error('[useStatData] 清理事件订阅失败:', err);
    }
  };

  // 组件挂载时设置事件订阅和初始数据加载
  onMounted(async () => {
    try {
      // 初始化所有数据
      await initializeData();

      // 设置统计数据事件订阅
      setupMvuEventSubscription();

      // 注册到状态管理协调机制
      registerStatData();

      // 初始加载游戏状态数据
      await loadGameStateData();
    } catch (err) {
      console.error('[useStatData] 初始化失败:', err);
    }
  });

  // 组件卸载时清理
  onUnmounted(() => {
    cleanupEventSubscriptions();
    cleanupStatData();
  });

  return {
    // ==================== 纯ref数据源 ====================
    // 为什么使用纯ref：
    // 1. MVU变量频繁更新，不需要computed的缓存机制
    // 2. 直接更新ref.value，Vue立即重新渲染
    // 3. 避免computed依赖追踪的复杂性
    // 4. 性能更好，逻辑更清晰

    statData,
    baseAttributes,
    currentAttributes,
    equipment,
    inventory,

    // 统一的游戏状态
    gameState,
    isRandomEventActive,

    // 角色基本信息
    characterInfo,

    // 为了向后兼容，保留原有的访问方式（使用computed包装reactive数据）
    relationships: computed(() => gameState.relationships),
    currentDate: computed(() => gameState.currentDate),
    currentTime: computed(() => gameState.currentTime),
    currentLocation: computed(() => gameState.currentLocation),
    currentRandomEvent: computed(() => gameState.currentRandomEvent),

    // 角色基本信息计算属性（为了向后兼容）
    gender: computed(() => characterInfo.gender),
    race: computed(() => characterInfo.race),
    age: computed(() => characterInfo.age),

    // 关系人物数据
    relationshipCharacters,
    relationshipCharactersLoading,
    relationshipCharactersError,

    // ==================== 数据操作方法 ====================
    loadGameStateData,
    updateGameState,
    updateCharacterInfo,
    updateBaseAttribute,
    updateCurrentAttribute,
    updateBaseAttributes,
    updateCurrentAttributes,
    getAttributeValue,

    // MVU 变量方法
    getMvuAffinity,

    // 角色基本信息方法
    getGender,
    getRace,
    getAge,
    getCharacterInfo,

    // 关系人物数据获取方法
    getRelationshipCharacters,
    getRelationshipCharacter,
    getCharacterBasicInfo,
    getCharacterAttributes,
    getCharacterEquipment,
    getCharacterInventory,

    // 属性显示方法
    getAttributeDisplay,
    getAttributeDisplayAsync,
    isAttributeModified,
    getAttributeDeltaValue,

    // 装备管理方法
    equipWeapon,
    equipArmor,
    equipAccessory,
    unequipWeapon,
    unequipArmor,
    unequipAccessory,

    // 装备详情获取方法
    getEquipmentDetail,
    isEquipmentEquipped,
    getEquipmentDisplayInfo,
    getEquipmentTypeName,

    // 背包管理方法
    addToInventory,
    removeFromInventory,
    getInventoryWeapons,
    getInventoryArmors,
    getInventoryAccessories,
    getInventoryOthers,

    // 数据更新触发器（用于强制重新渲染）
    dataUpdateTrigger,

    // 状态管理协调
    registerStatData,

    // 从usePlayingLogic获取数据更新的接口
    updateFromPlayingLogic,

    // ==================== 属性名映射工具 ====================
    getEnglishAttributeName,
    getChineseAttributeName,
  };
}

// useEquipment 函数已移除，装备管理功能已整合到 useStatData 主函数中
