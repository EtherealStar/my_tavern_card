/**
 * 统计数据绑定服务
 * 统一管理 stat_data 的读取、缓存和前端绑定
 * 完全基于MVU框架，提供统一的数据访问接口
 *
 * 数据结构说明（基于 mvu变量表.md）：
 * 所有数据访问都通过 Mvu.getMvuVariable() 和 Mvu.setMvuVariable() 进行
 * MVU框架自动处理 [值, "描述"] 格式的数据结构
 *
 * 注意：MVU框架的初始化检查已在 GameCoreFactory 中完成，
 * 本服务假设 MVU 框架始终可用，不再进行可用性检查
 */

import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { ATTRIBUTE_NAME_MAP, CHINESE_ATTRIBUTE_NAMES } from '../models/CreationSchemas';
// SafeValueHelper 已移除，统一使用 MVU 框架

// 导入 MVU 相关类型
type VariableOption = {
  type?: 'message' | 'chat' | 'character' | 'script' | 'global';
  message_id?: number | 'latest';
  script_id?: string;
};

export interface CacheConfig {
  /** 缓存过期时间（毫秒） */
  cacheExpiry?: number;
  /** 是否自动订阅更新事件 */
  autoSubscribe?: boolean;
}

export interface StatDataBindingOptions {
  /** 是否使用缓存 */
  useCache?: boolean;
  /** 缓存过期时间（毫秒） */
  cacheExpiry?: number;
  /** 是否自动订阅更新事件 */
  autoSubscribe?: boolean;
}

export interface StatDataBindingConfig {
  /** 用户键 */
  userKey: string;
  /** 属性映射配置 */
  attributeMapping: Record<string, string>;
  /** 默认值配置 */
  defaultValues: Record<string, any>;
}

// 从 PlayerService 迁移的类型定义
export type AttrCN = '力量' | '敏捷' | '防御' | '体质' | '魅力' | '幸运' | '意志';
export type AttrMap = Record<AttrCN, number | null>;

export interface EquipmentSet {
  weapon: any;
  armor: any;
  accessory: any;
}

export interface InventoryBag {
  weapons: any[];
  armors: any[];
  accessories: any[];
  others: any[];
}

export interface UserPanelData {
  baseAttributes: AttrMap;
  currentAttributes: AttrMap;
  equipment: EquipmentSet;
  inventory: InventoryBag;
}

/**
 * 统计数据绑定服务类
 */
@injectable()
export class StatDataBindingService {
  private config?: StatDataBindingConfig;
  private currentStatData: any = {};
  private bindingHandlers = new Map<string, Set<(data: any) => void>>();
  private isInitialized = false;
  // 从 PlayerService 迁移的属性 - 使用统一的属性顺序
  private readonly attrOrder: AttrCN[] = CHINESE_ATTRIBUTE_NAMES as AttrCN[];
  private unsubscribeMvuEvents?: () => void;
  private unsubscribeBus?: () => void;

  // 中文属性名到英文属性名的反向映射
  private readonly chineseToEnglishMap: Record<string, string> = {
    力量: 'strength',
    敏捷: 'agility',
    防御: 'defense',
    体质: 'constitution',
    魅力: 'charisma',
    意志: 'willpower',
    幸运: 'luck',
  };

  constructor(@inject(TYPES.EventBus) private eventBus: EventBus) {
    // MVU 相关初始化延迟到 MVU 服务启动后进行
    // 订阅全局事件总线的 MVU 事件（更新结束）
    try {
      this.unsubscribeBus = this.eventBus.on('mvu:update-ended', () => undefined);
    } catch {
      /* ignore */
    }
    // 卸载时清理订阅，避免内存泄漏
    try {
      (window as any).addEventListener?.('pagehide', () => {
        try {
          this.unsubscribeBus && this.unsubscribeBus();
        } catch {
          /* ignore */
        }
        try {
          this.unsubscribeMvuEvents && this.unsubscribeMvuEvents();
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
  }

  // 单例模式已移除，使用依赖注入

  // 依赖注入已通过构造函数完成，无需手动初始化

  /**
   * 订阅MVU事件
   */
  private _subscribeMvuEvents(): void {
    const Mvu = (window as any).Mvu;
    const eventOn = (window as any).eventOn;

    if (!Mvu?.events || typeof eventOn !== 'function') {
      console.warn('[StatDataBindingService] MVU事件系统不可用');
      return;
    }

    try {
      // 订阅单变量更新事件
      eventOn(Mvu.events.SINGLE_VARIABLE_UPDATED, (_stat_data: any, path: string, _old_value: any, new_value: any) => {
        // 直接处理路径，不需要 stat_data. 前缀检查
        this.handleStatDataUpdate({
          path: path,
          value: new_value,
        });
      });

      // 订阅变量更新结束事件
      eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, async (variables: Mvu.MvuData) => {
        // 关键修复：立即重新加载统计数据
        try {
          await this.loadStatData();
        } catch (error) {
          console.error('[StatDataBindingService] MVU变量更新后数据重新加载失败:', error);
        }

        // 触发全局事件，通知上层（组合式函数层）
        this.eventBus.emit('mvu:update-ended', variables);
        this.eventBus.emit('stat_data:updated', this.currentStatData);
      });
    } catch (error) {
      console.error('[StatDataBindingService] 订阅MVU事件失败:', error);
    }
  }

  /**
   * 初始化服务
   * 注意：MVU框架初始化已在GameCoreFactory中完成，此处直接进行数据服务初始化
   */
  public async initialize(config?: StatDataBindingConfig): Promise<boolean> {
    if (this.isInitialized) return true;

    this.config = config;
    const maxRetries = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 订阅 MVU 事件
        this._subscribeMvuEvents();

        // 初始加载数据
        await this.loadStatData();

        this.isInitialized = true;
        return true;
      } catch (error) {
        console.error(`[StatDataBindingService] 初始化失败 (尝试 ${attempt}/${maxRetries}):`, error);

        if (attempt === maxRetries) {
          console.error('[StatDataBindingService] 初始化最终失败，将以降级模式运行');
          this.isInitialized = true;
          return false;
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    return false;
  }

  /**
   * 检查服务是否已初始化并准备就绪
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取事件总线实例
   */
  public getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 等待服务就绪
   */
  public async waitForReady(timeout: number = 10000): Promise<boolean> {
    if (this.isInitialized) return true;

    return new Promise(resolve => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.isInitialized) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

  /**
   * 安全获取值（使用 MVU 框架）
   * 注意：MVU框架初始化已在GameCoreFactory中完成，此处直接使用MVU框架
   */
  public safeGetValue(_obj: any, path: string, defaultValue: any = 'N/A'): any {
    const mvuData = this.getMvuData();
    if (!mvuData) {
      return defaultValue;
    }

    const Mvu = (window as any).Mvu;
    return Mvu.getMvuVariable(mvuData, path, { default_value: defaultValue });
  }

  /**
   * 加载统计数据
   * 注意：MVU框架初始化已在GameCoreFactory中完成，此处直接使用MVU框架
   */
  public async loadStatData(options: StatDataBindingOptions = {}): Promise<boolean> {
    try {
      // 直接使用MVU框架
      return await this._loadStatDataWithMvu(options);
    } catch (error) {
      console.error('[StatDataBindingService] 加载统计数据失败:', error);
      return false;
    }
  }

  /**
   * 使用MVU框架加载统计数据
   */
  private async _loadStatDataWithMvu(_options: StatDataBindingOptions = {}): Promise<boolean> {
    try {
      // 使用封装的 getMvuData 方法
      const mvuData = this.getMvuData();

      // 检查是否有 getMvuVariable 方法可用
      if (Mvu && typeof Mvu.getMvuVariable === 'function') {
        // 直接读取 stat_data 字段，不需要路径
        try {
          // 直接从 mvuData.stat_data 读取数据
          const statData = mvuData.stat_data || {};

          this.currentStatData = statData;
          this.notifyBindingHandlers();
          return true;
        } catch (error) {
          console.warn('[StatDataBindingService] 读取 stat_data 失败，回退到 SafeValueHelper:', error);
        }
      }

      // 直接使用 MVU 框架获取统计数据
      // 获取所有统计数据字段
      const baseAttributes = Mvu.getMvuVariable(mvuData, 'base_attributes', { default_value: {} });
      const currentAttributes = Mvu.getMvuVariable(mvuData, 'current_attributes', { default_value: {} });
      const equipment = Mvu.getMvuVariable(mvuData, 'equipment', { default_value: {} });
      const inventory = Mvu.getMvuVariable(mvuData, 'inventory', { default_value: {} });
      const relationships = Mvu.getMvuVariable(mvuData, 'relationships', { default_value: {} });

      // 构建统计数据对象
      const statData = {
        base_attributes: baseAttributes,
        current_attributes: currentAttributes,
        equipment: equipment,
        inventory: inventory,
        relationships: relationships,
      };

      this.currentStatData = statData;
      this.notifyBindingHandlers();
      return true;
    } catch (error) {
      console.error('[StatDataBindingService] MVU框架加载失败:', error);
      console.error('[StatDataBindingService] 错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息');
      return false;
    }
  }

  /**
   * 获取统计数据
   */
  public getStatData(): any {
    return this.currentStatData;
  }

  /**
   * 获取用户数据
   */
  public getUserData(): any {
    return this.currentStatData;
  }

  /**
   * 获取属性值
   */
  public getAttributeValue(attributeName: string, defaultValue?: any): any {
    const value = this.safeGetValue(this.currentStatData, attributeName, defaultValue);

    // 如果配置了属性映射，尝试映射
    if (this.config?.attributeMapping) {
      const mappedName = this.config.attributeMapping[attributeName];
      if (mappedName && mappedName !== attributeName) {
        const mappedValue = this.safeGetValue(this.currentStatData, mappedName, defaultValue);
        return mappedValue !== defaultValue ? mappedValue : value;
      }
    }

    return value;
  }

  /**
   * 获取基础属性
   * 支持英文属性名到中文属性名的映射
   */
  public getBaseAttributes(): Record<string, number> {
    const baseAttrs = this.getAttributeValue('base_attributes', {});
    const result: Record<string, number> = {};

    for (const [key, value] of Object.entries(baseAttrs)) {
      const numValue = Number(value);
      const finalValue = Number.isFinite(numValue) ? numValue : 0;

      // 如果key是英文属性名，转换为中文属性名
      const chineseKey = this.getChineseAttributeName(key);
      result[chineseKey] = finalValue;

      // 同时保留英文key，确保向后兼容
      if (chineseKey !== key) {
        result[key] = finalValue;
      }
    }

    return result;
  }

  /**
   * 获取当前属性
   * 支持英文属性名到中文属性名的映射
   */
  public getCurrentAttributes(): Record<string, number> {
    const currentAttrs = this.getAttributeValue('current_attributes', {});
    const result: Record<string, number> = {};

    for (const [key, value] of Object.entries(currentAttrs)) {
      const numValue = Number(value);
      const finalValue = Number.isFinite(numValue) ? numValue : 0;

      // 如果key是英文属性名，转换为中文属性名
      const chineseKey = this.getChineseAttributeName(key);
      result[chineseKey] = finalValue;

      // 同时保留英文key，确保向后兼容
      if (chineseKey !== key) {
        result[key] = finalValue;
      }
    }

    return result;
  }

  /**
   * 获取装备信息
   */
  public getEquipment(): Record<string, any> {
    return this.getAttributeValue('equipment', {});
  }

  /**
   * 获取背包信息
   */
  public getInventory(): Record<string, any> {
    return this.getAttributeValue('inventory', {});
  }

  /**
   * 设置MVU变量
   * 注意：MVU框架初始化已在GameCoreFactory中完成，此处直接使用MVU框架
   */
  private async _setMvuVariable(attributeName: string, value: any, reason?: string): Promise<boolean> {
    try {
      // 获取MVU数据
      const mvuData = this.getMvuData();
      if (!mvuData) {
        console.warn('[StatDataBindingService] 无法获取MVU数据');
        return false;
      }

      // 设置变量
      const Mvu = (window as any).Mvu;
      const success = await Mvu.setMvuVariable(mvuData, attributeName, value, {
        reason: reason || 'stat_data_binding_update',
        is_recursive: false,
      });

      if (success) {
        // 写回数据
        await this.replaceMvuData(mvuData);
      }

      return success;
    } catch (error) {
      console.error('[StatDataBindingService] 设置MVU变量失败:', error);
      return false;
    }
  }

  /**
   * 设置属性值
   * 注意：MVU框架初始化已在GameCoreFactory中完成，此处直接使用MVU框架
   */
  public async setAttributeValue(attributeName: string, value: any, reason?: string): Promise<boolean> {
    try {
      const success = await this._setMvuVariable(attributeName, value, reason);
      if (success) {
        // 更新本地缓存
        this.currentStatData = { ...this.currentStatData };
        this.notifyBindingHandlers();
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[StatDataBindingService] 设置属性 ${attributeName} 失败:`, error);
      return false;
    }
  }

  /**
   * 批量设置属性
   */
  public async setAttributes(attributes: Record<string, any>, reason?: string): Promise<boolean[]> {
    // 获取MVU数据
    const mvuData = this.getMvuData();

    const results: boolean[] = [];
    const updatedPaths: string[] = [];

    // 检查是否是角色创建时的属性数据（包含中文属性名）
    const isCharacterCreation = this._isCharacterCreationAttributes(attributes);

    if (isCharacterCreation) {
      // 直接设置属性，让 MVU 框架自动处理格式

      // 设置 base_attributes
      const baseSuccess = await Mvu.setMvuVariable(mvuData, 'base_attributes', attributes, {
        reason: reason || 'character_creation_base_attributes',
        is_recursive: false,
      });
      results.push(baseSuccess);
      if (baseSuccess) {
        updatedPaths.push('base_attributes');
      }

      // 设置 current_attributes
      const currentSuccess = await Mvu.setMvuVariable(mvuData, 'current_attributes', attributes, {
        reason: reason || 'character_creation_current_attributes',
        is_recursive: false,
      });
      results.push(currentSuccess);
      if (currentSuccess) {
        updatedPaths.push('current_attributes');
      }
    } else {
      // 原有的批量设置逻辑（用于其他类型的属性更新）
      for (const [attributeName, value] of Object.entries(attributes)) {
        // 验证并清理数据值
        const validatedValue = this._validateAndCleanValue(attributeName, value);

        const success = await Mvu.setMvuVariable(mvuData, attributeName, validatedValue, {
          reason: reason || 'stat_data_binding_batch_update',
          is_recursive: false,
        });
        results.push(success);

        if (success) {
          updatedPaths.push(attributeName);
        }
      }
    }

    // 批量写回数据
    if (updatedPaths.length > 0) {
      await this.replaceMvuData(mvuData);
    }

    // 更新本地缓存
    this.currentStatData = { ...this.currentStatData };
    this.notifyBindingHandlers();

    // 如果是角色创建，触发特殊的数据更新事件
    if (isCharacterCreation) {
      this.eventBus.emit('stat_data:character_created', {
        attributes: attributes,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * 订阅数据更新
   */
  public subscribeBinding(bindingKey: string, handler: (data: any) => void): () => void {
    if (!this.bindingHandlers.has(bindingKey)) {
      this.bindingHandlers.set(bindingKey, new Set());
    }

    this.bindingHandlers.get(bindingKey)!.add(handler);

    // 立即调用一次
    handler(this.currentStatData);

    // 返回取消订阅函数
    return () => {
      const handlers = this.bindingHandlers.get(bindingKey);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.bindingHandlers.delete(bindingKey);
        }
      }
    };
  }

  /**
   * 渲染UI（类似参考代码的 renderUI）
   */
  public renderUI(data: any): void {
    if (!data) {
      console.warn('[StatDataBindingService] RenderUI 调用失败：没有提供数据');
      return;
    }

    // 更新本地缓存
    this.currentStatData = data;

    // 通知所有绑定处理器
    this.notifyBindingHandlers();

    // 触发全局事件，确保Vue组件能收到更新通知
    this.eventBus.emit('stat_data:updated', data);

    // 同时触发全局事件总线（如果可用）
    try {
      const globalEventBus = (window as any).__RPG_EVENT_BUS__;
      if (globalEventBus && typeof globalEventBus.emit === 'function') {
        globalEventBus.emit('stat_data:updated', data);
      }
    } catch (error) {
      console.warn('[StatDataBindingService] 触发全局事件失败:', error);
    }
  }

  /**
   * 处理统计数据更新事件（统一接口）
   */
  private handleStatDataUpdate(payload: { path: string; value: any }): void {
    // 更新本地缓存
    this.currentStatData[payload.path] = payload.value;

    // 通知所有绑定处理器
    this.notifyBindingHandlers();

    // 触发全局事件，确保Vue组件能收到更新通知
    this.eventBus.emit('stat_data:updated', this.currentStatData);
  }

  /**
   * 通知所有绑定处理器
   */
  private notifyBindingHandlers(): void {
    for (const [bindingKey, handlers] of this.bindingHandlers) {
      for (const handler of handlers) {
        try {
          handler(this.currentStatData);
        } catch (error) {
          console.error(`[StatDataBindingService] 绑定处理器 ${bindingKey} 执行失败:`, error);
        }
      }
    }
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    // 由于直接使用MVU框架，不需要缓存管理
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats(): { size: number; keys: string[] } {
    // 由于直接使用MVU框架，不需要缓存管理
    return { size: 0, keys: [] };
  }

  /**
   * 从 PlayerService 迁移的 readUserPanel 方法
   */
  public async readUserPanel(): Promise<UserPanelData> {
    const emptyAttrs: AttrMap = {
      力量: null,
      敏捷: null,
      防御: null,
      体质: null,
      魅力: null,
      幸运: null,
      意志: null,
    };
    const empty: UserPanelData = {
      baseAttributes: { ...emptyAttrs },
      currentAttributes: { ...emptyAttrs },
      equipment: { weapon: null, armor: null, accessory: null },
      inventory: { weapons: [], armors: [], accessories: [], others: [] },
    };

    try {
      let base: Record<string, any> | undefined;
      let curr: Record<string, any> | undefined;
      let equip: Record<string, any> | undefined;
      let bag: Record<string, any> | undefined;

      // 通过 MVU 框架从 message 作用域读取 stat_data 片段
      try {
        const mvuData = this.getMvuData();
        if (mvuData) {
          const getPart = async (path: string, defVal: any) => {
            try {
              const result = Mvu.getMvuVariable(mvuData, path, {
                category: 'stat',
                default_value: defVal,
              });
              return result;
            } catch {
              return defVal;
            }
          };
          base = await getPart('base_attributes', {});
          curr = await getPart('current_attributes', {});
          equip = await getPart('equipment', {});
          bag = await getPart('inventory', {});
        }
      } catch {
        // 忽略，转入兜底
      }

      // 兜底：直接读取 variables.stat_data（仅检查 stat_data，不依赖 display/delta）
      if (!base || !curr || !equip || !bag) {
        try {
          const getVariables: any = (window as any).getVariables;
          if (typeof getVariables === 'function') {
            const vars = await Promise.resolve(getVariables({ type: 'message', message_id: 0 }));
            // 直接访问 stat_data 的属性
            base = vars.stat_data?.base_attributes || {};
            curr = vars.stat_data?.current_attributes || {};
            equip = vars.stat_data?.equipment || {};
            bag = vars.stat_data?.inventory || {};
          }
        } catch {
          /* ignore */
        }
      }

      const baseOut: AttrMap = { ...emptyAttrs };
      const currOut: AttrMap = { ...emptyAttrs };
      for (const n of this.attrOrder) {
        const b = Number((base as any)?.[n]);
        const c = Number((curr as any)?.[n]);
        baseOut[n] = Number.isFinite(b) ? b : null;
        currOut[n] = Number.isFinite(c) ? c : null;
      }

      return {
        baseAttributes: baseOut,
        currentAttributes: currOut,
        equipment: {
          weapon: (equip as any)?.weapon ?? null,
          armor: (equip as any)?.armor ?? null,
          accessory: (equip as any)?.accessory ?? null,
        },
        inventory: {
          weapons: Array.isArray((bag as any)?.weapons) ? (bag as any).weapons : [],
          armors: Array.isArray((bag as any)?.armors) ? (bag as any).armors : [],
          accessories: Array.isArray((bag as any)?.accessories) ? (bag as any).accessories : [],
          others: Array.isArray((bag as any)?.others) ? (bag as any).others : [],
        },
      };
    } catch {
      return empty;
    }
  }

  /**
   * 从 PlayerService 迁移的 subscribeUpdates 方法
   */
  public subscribeUpdates(handler: () => void): void {
    try {
      this.eventBus.on('mvu:update-ended', handler as any);
    } catch {
      /* ignore */
    }
  }

  // ==================== MVU 数据访问封装方法 ====================

  /**
   * 获取 MVU 数据
   * 注意：MVU框架初始化已在GameCoreFactory中完成，此处直接使用MVU框架
   * @param options 可选参数，默认使用 message_id: 0
   * @returns MVU 数据对象
   *
   * @example
   * ```typescript
   * // 获取第0层消息的MVU数据
   * const mvuData = statDataService.getMvuData();
   *
   * // 获取最新消息的MVU数据
   * const latestData = statDataService.getMvuData({ type: 'message', message_id: 'latest' });
   *
   * // 获取全局变量数据
   * const globalData = statDataService.getMvuData({ type: 'global' });
   * ```
   */
  public getMvuData(options: VariableOption = { type: 'message', message_id: 0 }): Mvu.MvuData {
    try {
      const Mvu = (window as any).Mvu;
      const mvuData = Mvu.getMvuData(options);

      if (!mvuData) {
        console.warn('[StatDataBindingService] 无法获取MVU数据', options);
        return {
          initialized_lorebooks: [],
          stat_data: {},
          display_data: {},
          delta_data: {},
        };
      }

      return mvuData;
    } catch (error) {
      console.error('[StatDataBindingService] 获取 MVU 数据异常:', { options, error });
      return {
        initialized_lorebooks: [],
        stat_data: {},
        display_data: {},
        delta_data: {},
      };
    }
  }

  /**
   * 替换 MVU 数据
   * 注意：MVU框架初始化已在GameCoreFactory中完成，此处直接使用MVU框架
   * @param mvuData 要替换的 MVU 数据
   * @param options 可选参数，默认使用 message_id: 0
   * @returns 是否替换成功
   *
   * @example
   * ```typescript
   * // 获取并修改数据
   * const mvuData = statDataService.getMvuData();
   * mvuData.stat_data.player_health = 100;
   * const success = await statDataService.replaceMvuData(mvuData);
   *
   * // 替换全局数据
   * const success = await statDataService.replaceMvuData(mvuData, { type: 'global' });
   * ```
   */
  public async replaceMvuData(
    mvuData: Mvu.MvuData,
    options: VariableOption = { type: 'message', message_id: 0 },
  ): Promise<boolean> {
    try {
      const Mvu = (window as any).Mvu;
      await Mvu.replaceMvuData(mvuData, options);

      // 由于 replaceMvuData 是"完全替换"而不是"增量更新"，
      // 它不会触发 MVU 框架的 VARIABLE_UPDATE_ENDED 事件
      // 因此需要手动重新加载数据并触发事件
      try {
        await this.loadStatData();
        console.log('[StatDataBindingService] MVU数据替换完成，已重新加载数据');

        // 手动触发 mvu:update-ended 事件，确保前端能收到更新通知
        this.eventBus.emit('mvu:update-ended', this.currentStatData);
        console.log('[StatDataBindingService] 已手动触发 mvu:update-ended 事件');
      } catch (error) {
        console.error('[StatDataBindingService] 重新加载数据失败:', error);
      }

      return true;
    } catch (error) {
      console.error('[StatDataBindingService] 替换 MVU 数据异常:', { options, error });
      return false;
    }
  }

  // ==================== MVU 变量获取方法 ====================

  /**
   * 获取 MVU 变量（直接使用 MVU 框架）
   * 注意：MVU框架初始化已在GameCoreFactory中完成，此处直接使用MVU框架
   * @param path 变量路径，支持完整路径
   * @param options 选项参数
   * @returns 变量值结果
   */
  public async getMvuVariable(path: string, options: any = {}): Promise<any> {
    try {
      const mvuData = this.getMvuData();
      if (!mvuData) {
        console.warn('[StatDataBindingService] 无法获取MVU数据');
        return null;
      }

      // 直接使用路径，不需要 stat_data. 前缀处理
      const processedPath = path;

      const value = Mvu.getMvuVariable(mvuData, processedPath, {
        category: options.category || 'stat',
        default_value: options.default_value,
      });

      return value;
    } catch (error) {
      console.error('[StatDataBindingService] 获取 MVU 变量异常:', { path, error });
      return null;
    }
  }

  /**
   * 获取基础属性（从 MVU 变量）
   */
  public async getMvuBaseAttributes(): Promise<Record<string, number>> {
    // 直接使用 MVU 框架获取数据，框架会自动处理 [值, "描述"] 格式
    const data = await this.getMvuVariable('base_attributes', { default_value: {} });

    if (data && typeof data === 'object') {
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(data)) {
        const numValue = Number(value);
        result[key] = Number.isFinite(numValue) ? numValue : 0;
      }
      return result;
    }
    return {};
  }

  /**
   * 获取当前属性（从 MVU 变量）
   */
  public async getMvuCurrentAttributes(): Promise<Record<string, number>> {
    // 直接使用 MVU 框架获取数据，框架会自动处理 [值, "描述"] 格式
    const data = await this.getMvuVariable('current_attributes', { default_value: {} });

    if (data && typeof data === 'object') {
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(data)) {
        const numValue = Number(value);
        result[key] = Number.isFinite(numValue) ? numValue : 0;
      }
      return result;
    }
    return {};
  }

  /**
   * 获取装备信息（从 MVU 变量）
   */
  public async getMvuEquipment(): Promise<Record<string, any>> {
    // 直接使用 MVU 框架获取数据，框架会自动处理 [值, "描述"] 格式
    const data = await this.getMvuVariable('equipment', { default_value: {} });
    return data && typeof data === 'object' ? data : {};
  }

  /**
   * 获取背包信息（从 MVU 变量）
   */
  public async getMvuInventory(): Promise<Record<string, any>> {
    // 直接使用 MVU 框架获取数据，框架会自动处理 [值, "描述"] 格式
    const data = await this.getMvuVariable('inventory', { default_value: {} });
    return data && typeof data === 'object' ? data : {};
  }

  /**
   * 获取人物关系（从 MVU 变量）
   */
  public async getMvuRelationships(): Promise<Record<string, any>> {
    // 直接使用 MVU 框架获取数据，框架会自动处理 [值, "描述"] 格式
    const data = await this.getMvuVariable('relationships', { default_value: {} });
    return data && typeof data === 'object' ? data : {};
  }

  /**
   * 获取特定角色的好感度
   */
  public async getMvuAffinity(characterId: string | number): Promise<number> {
    // 直接使用 MVU 框架获取数据，框架会自动处理 [值, "描述"] 格式
    const relationships = await this.getMvuRelationships();
    const characterData = relationships[characterId];
    if (characterData && typeof characterData === 'object') {
      const affinityData = characterData.affinity;
      // MVU 框架已处理格式，直接使用数值
      const numValue = Number(affinityData);
      return Number.isFinite(numValue) ? numValue : 0;
    }
    return 0;
  }

  // ==================== 便捷访问函数 ====================

  /**
   * 获取单个基础属性值
   * @param attributeName 属性名称（如：'力量', '敏捷', '防御', '体质', '魅力', '幸运', '意志'）
   * @param defaultValue 默认值，当属性不存在时返回
   * @returns 属性值
   *
   * @example
   * ```typescript
   * const strength = await statDataService.getBaseAttribute('力量', 10);
   * console.log(`力量值: ${strength}`);
   * ```
   */
  public async getBaseAttribute(attributeName: string, defaultValue: number = 10): Promise<number> {
    try {
      const baseAttributes = await this.getMvuBaseAttributes();

      // 首先尝试直接使用传入的属性名
      let value = baseAttributes[attributeName];

      // 如果直接获取失败，尝试将中文属性名转换为英文属性名
      if (value === undefined) {
        const englishName = this.getEnglishAttributeName(attributeName);
        if (englishName !== attributeName) {
          value = baseAttributes[englishName];
        }
      }

      return Number.isFinite(value) ? value : defaultValue;
    } catch (error) {
      console.error(`[StatDataBindingService] 获取基础属性 ${attributeName} 失败:`, error);
      return defaultValue;
    }
  }

  /**
   * 获取单个当前属性值
   * @param attributeName 属性名称（如：'力量', '敏捷', '防御', '体质', '魅力', '幸运', '意志'）
   * @param defaultValue 默认值，当属性不存在时返回
   * @returns 属性值
   *
   * @example
   * ```typescript
   * const currentStrength = await statDataService.getCurrentAttribute('力量', 10);
   * console.log(`当前力量值: ${currentStrength}`);
   * ```
   */
  public async getCurrentAttribute(attributeName: string, defaultValue: number = 10): Promise<number> {
    try {
      const currentAttributes = await this.getMvuCurrentAttributes();

      // 首先尝试直接使用传入的属性名
      let value = currentAttributes[attributeName];

      // 如果直接获取失败，尝试将中文属性名转换为英文属性名
      if (value === undefined) {
        const englishName = this.getEnglishAttributeName(attributeName);
        if (englishName !== attributeName) {
          value = currentAttributes[englishName];
        }
      }

      return Number.isFinite(value) ? value : defaultValue;
    } catch (error) {
      console.error(`[StatDataBindingService] 获取当前属性 ${attributeName} 失败:`, error);
      return defaultValue;
    }
  }

  /**
   * 设置单个基础属性值
   * @param attributeName 属性名称
   * @param value 新的属性值
   * @param reason 更新原因（用于日志记录）
   * @returns 是否设置成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.setBaseAttribute('力量', 15, '升级奖励');
   * if (success) {
   *   console.log('力量属性更新成功');
   * }
   * ```
   */
  public async setBaseAttribute(attributeName: string, value: number, reason?: string): Promise<boolean> {
    try {
      const currentBaseAttributes = await this.getMvuBaseAttributes();
      const updatedAttributes = { ...currentBaseAttributes, [attributeName]: value };

      const success = await this.setAttributes(updatedAttributes, reason || `更新基础属性 ${attributeName}`);
      return success.some(result => result === true);
    } catch (error) {
      console.error(`[StatDataBindingService] 设置基础属性 ${attributeName} 失败:`, error);
      return false;
    }
  }

  /**
   * 设置单个当前属性值
   * @param attributeName 属性名称
   * @param value 新的属性值
   * @param reason 更新原因（用于日志记录）
   * @returns 是否设置成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.setCurrentAttribute('力量', 18, '装备加成');
   * if (success) {
   *   console.log('当前力量属性更新成功');
   * }
   * ```
   */
  public async setCurrentAttribute(attributeName: string, value: number, reason?: string): Promise<boolean> {
    try {
      const currentAttributes = await this.getMvuCurrentAttributes();
      const updatedAttributes = { ...currentAttributes, [attributeName]: value };

      // 注意：这里需要特殊处理，因为当前属性通常由系统自动计算
      // 这里提供手动设置的能力，但建议谨慎使用
      const success = await this.setAttributes(updatedAttributes, reason || `手动更新当前属性 ${attributeName}`);
      return success.some(result => result === true);
    } catch (error) {
      console.error(`[StatDataBindingService] 设置当前属性 ${attributeName} 失败:`, error);
      return false;
    }
  }

  /**
   * 获取所有基础属性
   * @returns 包含所有基础属性的对象
   *
   * @example
   * ```typescript
   * const baseAttrs = await statDataService.getAllBaseAttributes();
   * console.log('所有基础属性:', baseAttrs);
   * // 输出: { 力量: 15, 敏捷: 12, 防御: 18, ... }
   * ```
   */
  public async getAllBaseAttributes(): Promise<Record<string, number>> {
    try {
      return await this.getMvuBaseAttributes();
    } catch (error) {
      console.error('[StatDataBindingService] 获取所有基础属性失败:', error);
      return {};
    }
  }

  /**
   * 获取所有当前属性
   * @returns 包含所有当前属性的对象
   *
   * @example
   * ```typescript
   * const currentAttrs = await statDataService.getAllCurrentAttributes();
   * console.log('所有当前属性:', currentAttrs);
   * // 输出: { 力量: 18, 敏捷: 14, 防御: 20, ... }
   * ```
   */
  public async getAllCurrentAttributes(): Promise<Record<string, number>> {
    try {
      return await this.getMvuCurrentAttributes();
    } catch (error) {
      console.error('[StatDataBindingService] 获取所有当前属性失败:', error);
      return {};
    }
  }

  /**
   * 批量更新基础属性
   * @param attributes 要更新的属性对象
   * @param reason 更新原因（用于日志记录）
   * @returns 是否更新成功
   *
   * @example
   * ```typescript
   * const newAttributes = {
   *   '力量': 15,
   *   '敏捷': 12,
   *   '防御': 18
   * };
   * const success = await statDataService.updateBaseAttributes(newAttributes, '角色升级');
   * ```
   */
  public async updateBaseAttributes(attributes: Record<string, number>, reason?: string): Promise<boolean> {
    try {
      const results = await this.setAttributes(attributes, reason || '批量更新基础属性');
      return results.some(result => result === true);
    } catch (error) {
      console.error('[StatDataBindingService] 批量更新基础属性失败:', error);
      return false;
    }
  }

  /**
   * 批量更新当前属性
   * @param attributes 要更新的属性对象
   * @param reason 更新原因（用于日志记录）
   * @returns 是否更新成功
   *
   * @example
   * ```typescript
   * const newCurrentAttributes = {
   *   '力量': 18,
   *   '敏捷': 14,
   *   '防御': 20
   * };
   * const success = await statDataService.updateCurrentAttributes(newCurrentAttributes, '装备变更');
   * ```
   */
  public async updateCurrentAttributes(attributes: Record<string, number>, reason?: string): Promise<boolean> {
    try {
      // 注意：当前属性通常由系统自动计算，手动批量更新需要谨慎
      const results = await this.setAttributes(attributes, reason || '批量更新当前属性');
      return results.some(result => result === true);
    } catch (error) {
      console.error('[StatDataBindingService] 批量更新当前属性失败:', error);
      return false;
    }
  }

  // ==================== 装备相关函数 ====================

  /**
   * 获取当前装备的武器
   * @returns 当前装备的武器对象，如果没有装备则返回 null
   *
   * @example
   * ```typescript
   * const weapon = await statDataService.getEquippedWeapon();
   * if (weapon) {
   *   console.log(`当前武器: ${weapon.name}`);
   * } else {
   *   console.log('没有装备武器');
   * }
   * ```
   */
  public async getEquippedWeapon(): Promise<any> {
    try {
      const equipment = await this.getMvuEquipment();
      return equipment.weapon || null;
    } catch (error) {
      console.error('[StatDataBindingService] 获取装备武器失败:', error);
      return null;
    }
  }

  /**
   * 获取当前装备的防具
   * @returns 当前装备的防具对象，如果没有装备则返回 null
   *
   * @example
   * ```typescript
   * const armor = await statDataService.getEquippedArmor();
   * if (armor) {
   *   console.log(`当前防具: ${armor.name}`);
   * } else {
   *   console.log('没有装备防具');
   * }
   * ```
   */
  public async getEquippedArmor(): Promise<any> {
    try {
      const equipment = await this.getMvuEquipment();
      return equipment.armor || null;
    } catch (error) {
      console.error('[StatDataBindingService] 获取装备防具失败:', error);
      return null;
    }
  }

  /**
   * 获取当前装备的饰品
   * @returns 当前装备的饰品对象，如果没有装备则返回 null
   *
   * @example
   * ```typescript
   * const accessory = await statDataService.getEquippedAccessory();
   * if (accessory) {
   *   console.log(`当前饰品: ${accessory.name}`);
   * } else {
   *   console.log('没有装备饰品');
   * }
   * ```
   */
  public async getEquippedAccessory(): Promise<any> {
    try {
      const equipment = await this.getMvuEquipment();
      return equipment.accessory || null;
    } catch (error) {
      console.error('[StatDataBindingService] 获取装备饰品失败:', error);
      return null;
    }
  }

  /**
   * 装备武器
   * @param weapon 要装备的武器对象
   * @param reason 装备原因（用于日志记录）
   * @returns 是否装备成功
   *
   * @example
   * ```typescript
   * const weapon = {
   *   name: '铁剑',
   *   description: '一把普通的铁制长剑',
   *   attributes_bonus: { '力量': 2 }
   * };
   * const success = await statDataService.equipWeapon(weapon, '获得新武器');
   * ```
   */
  public async equipWeapon(weapon: any, reason?: string): Promise<boolean> {
    try {
      const currentEquipment = await this.getMvuEquipment();
      const updatedEquipment = { ...currentEquipment, weapon };

      const success = await this.setStatDataField('equipment', updatedEquipment, reason || '装备武器');
      if (success) {
        // 装备后可能需要重新计算当前属性
        this.eventBus.emit('equipment:weapon_equipped', { weapon, timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error('[StatDataBindingService] 装备武器失败:', error);
      return false;
    }
  }

  /**
   * 装备防具
   * @param armor 要装备的防具对象
   * @param reason 装备原因（用于日志记录）
   * @returns 是否装备成功
   *
   * @example
   * ```typescript
   * const armor = {
   *   name: '皮甲',
   *   description: '一件轻便的皮制护甲',
   *   attributes_bonus: { '体质': 1 }
   * };
   * const success = await statDataService.equipArmor(armor, '获得新防具');
   * ```
   */
  public async equipArmor(armor: any, reason?: string): Promise<boolean> {
    try {
      const currentEquipment = await this.getMvuEquipment();
      const updatedEquipment = { ...currentEquipment, armor };

      const success = await this.setStatDataField('equipment', updatedEquipment, reason || '装备防具');
      if (success) {
        this.eventBus.emit('equipment:armor_equipped', { armor, timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error('[StatDataBindingService] 装备防具失败:', error);
      return false;
    }
  }

  /**
   * 装备饰品
   * @param accessory 要装备的饰品对象
   * @param reason 装备原因（用于日志记录）
   * @returns 是否装备成功
   *
   * @example
   * ```typescript
   * const accessory = {
   *   name: '力量戒指',
   *   description: '一枚能增强力量的魔法戒指',
   *   attributes_bonus: { '力量': 3 }
   * };
   * const success = await statDataService.equipAccessory(accessory, '获得新饰品');
   * ```
   */
  public async equipAccessory(accessory: any, reason?: string): Promise<boolean> {
    try {
      const currentEquipment = await this.getMvuEquipment();
      const updatedEquipment = { ...currentEquipment, accessory };

      const success = await this.setStatDataField('equipment', updatedEquipment, reason || '装备饰品');
      if (success) {
        this.eventBus.emit('equipment:accessory_equipped', { accessory, timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error('[StatDataBindingService] 装备饰品失败:', error);
      return false;
    }
  }

  /**
   * 卸下武器
   * @param reason 卸下原因（用于日志记录）
   * @returns 是否卸下成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.unequipWeapon('更换武器');
   * if (success) {
   *   console.log('武器卸下成功');
   * }
   * ```
   */
  public async unequipWeapon(reason?: string): Promise<boolean> {
    try {
      const currentEquipment = await this.getMvuEquipment();
      const updatedEquipment = { ...currentEquipment, weapon: null };

      const success = await this.setStatDataField('equipment', updatedEquipment, reason || '卸下武器');
      if (success) {
        this.eventBus.emit('equipment:weapon_unequipped', { timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error('[StatDataBindingService] 卸下武器失败:', error);
      return false;
    }
  }

  /**
   * 卸下防具
   * @param reason 卸下原因（用于日志记录）
   * @returns 是否卸下成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.unequipArmor('更换防具');
   * if (success) {
   *   console.log('防具卸下成功');
   * }
   * ```
   */
  public async unequipArmor(reason?: string): Promise<boolean> {
    try {
      const currentEquipment = await this.getMvuEquipment();
      const updatedEquipment = { ...currentEquipment, armor: null };

      const success = await this.setStatDataField('equipment', updatedEquipment, reason || '卸下防具');
      if (success) {
        this.eventBus.emit('equipment:armor_unequipped', { timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error('[StatDataBindingService] 卸下防具失败:', error);
      return false;
    }
  }

  /**
   * 卸下饰品
   * @param reason 卸下原因（用于日志记录）
   * @returns 是否卸下成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.unequipAccessory('更换饰品');
   * if (success) {
   *   console.log('饰品卸下成功');
   * }
   * ```
   */
  public async unequipAccessory(reason?: string): Promise<boolean> {
    try {
      const currentEquipment = await this.getMvuEquipment();
      const updatedEquipment = { ...currentEquipment, accessory: null };

      const success = await this.setStatDataField('equipment', updatedEquipment, reason || '卸下饰品');
      if (success) {
        this.eventBus.emit('equipment:accessory_unequipped', { timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error('[StatDataBindingService] 卸下饰品失败:', error);
      return false;
    }
  }

  /**
   * 更换装备（将旧装备放入背包，新装备装备上）
   * @param type 装备类型
   * @param newItem 新装备
   * @param reason 更换原因（用于日志记录）
   * @returns 是否更换成功
   *
   * @example
   * ```typescript
   * const newWeapon = {
   *   name: '钢剑',
   *   description: '一把锋利的钢制长剑',
   *   attributes_bonus: { '力量': 3 }
   * };
   * const success = await statDataService.swapEquipment('weapon', newWeapon, '更换武器');
   * if (success) {
   *   console.log('武器更换成功');
   * }
   * ```
   */
  public async swapEquipment(type: 'weapon' | 'armor' | 'accessory', newItem: any, reason?: string): Promise<boolean> {
    try {
      // 1. 获取当前装备
      const currentEquipment = await this.getMvuEquipment();
      const currentItem = currentEquipment[type];

      // 2. 设置新装备
      const updatedEquipment = { ...currentEquipment, [type]: newItem };
      const equipSuccess = await this.setStatDataField('equipment', updatedEquipment, reason || `更换${type}`);

      if (!equipSuccess) {
        return false;
      }

      // 3. 如果有旧装备，将其添加到背包
      if (currentItem && currentItem.name) {
        const inventoryType = type === 'weapon' ? 'weapons' : type === 'armor' ? 'armors' : 'accessories';
        await this.addToInventory(inventoryType, currentItem, `更换装备回收`);
      }

      // 4. 发送事件
      this.eventBus.emit(`equipment:${type}_swapped`, {
        oldItem: currentItem,
        newItem,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error(`[StatDataBindingService] 更换${type}失败:`, error);
      return false;
    }
  }

  // ==================== 背包相关函数 ====================

  /**
   * 获取背包中的武器列表
   * @returns 武器数组
   *
   * @example
   * ```typescript
   * const weapons = await statDataService.getInventoryWeapons();
   * console.log(`背包中有 ${weapons.length} 把武器`);
   * weapons.forEach(weapon => console.log(`- ${weapon.name}`));
   * ```
   */
  public async getInventoryWeapons(): Promise<any[]> {
    try {
      const inventory = await this.getMvuInventory();
      return Array.isArray(inventory.weapons) ? inventory.weapons : [];
    } catch (error) {
      console.error('[StatDataBindingService] 获取背包武器失败:', error);
      return [];
    }
  }

  /**
   * 获取背包中的防具列表
   * @returns 防具数组
   *
   * @example
   * ```typescript
   * const armors = await statDataService.getInventoryArmors();
   * console.log(`背包中有 ${armors.length} 件防具`);
   * armors.forEach(armor => console.log(`- ${armor.name}`));
   * ```
   */
  public async getInventoryArmors(): Promise<any[]> {
    try {
      const inventory = await this.getMvuInventory();
      return Array.isArray(inventory.armors) ? inventory.armors : [];
    } catch (error) {
      console.error('[StatDataBindingService] 获取背包防具失败:', error);
      return [];
    }
  }

  /**
   * 获取背包中的饰品列表
   * @returns 饰品数组
   *
   * @example
   * ```typescript
   * const accessories = await statDataService.getInventoryAccessories();
   * console.log(`背包中有 ${accessories.length} 个饰品`);
   * accessories.forEach(accessory => console.log(`- ${accessory.name}`));
   * ```
   */
  public async getInventoryAccessories(): Promise<any[]> {
    try {
      const inventory = await this.getMvuInventory();
      return Array.isArray(inventory.accessories) ? inventory.accessories : [];
    } catch (error) {
      console.error('[StatDataBindingService] 获取背包饰品失败:', error);
      return [];
    }
  }

  /**
   * 获取背包中的其他物品列表
   * @returns 其他物品数组
   *
   * @example
   * ```typescript
   * const others = await statDataService.getInventoryOthers();
   * console.log(`背包中有 ${others.length} 个其他物品`);
   * others.forEach(item => console.log(`- ${item.name} x${item.quantity || 1}`));
   * ```
   */
  public async getInventoryOthers(): Promise<any[]> {
    try {
      const inventory = await this.getMvuInventory();
      return Array.isArray(inventory.others) ? inventory.others : [];
    } catch (error) {
      console.error('[StatDataBindingService] 获取背包其他物品失败:', error);
      return [];
    }
  }

  /**
   * 添加物品到背包
   * @param type 物品类型（'weapons' | 'armors' | 'accessories' | 'others'）
   * @param item 要添加的物品对象
   * @param reason 添加原因（用于日志记录）
   * @returns 是否添加成功
   *
   * @example
   * ```typescript
   * const newWeapon = {
   *   name: '钢剑',
   *   description: '一把锋利的钢制长剑',
   *   attributes_bonus: { '力量': 3 }
   * };
   * const success = await statDataService.addToInventory('weapons', newWeapon, '获得新武器');
   * ```
   */
  public async addToInventory(
    type: 'weapons' | 'armors' | 'accessories' | 'others',
    item: any,
    reason?: string,
  ): Promise<boolean> {
    try {
      // 1. 使用zod验证item结构
      const itemSchema = z.object({
        name: z.string(),
        description: z.string(),
        attributes_bonus: z.record(z.string(), z.number()).optional(),
        quantity: z.number().optional(),
      });

      const validationResult = itemSchema.safeParse(item);
      if (!validationResult.success) {
        console.error(`[StatDataBindingService] 物品数据验证失败:`, validationResult.error);
        return false;
      }

      // 2. MVU框架已在GameCoreFactory中初始化，直接使用

      // 3. 获取当前MVU数据
      const mvuData = this.getMvuData();
      if (!mvuData) {
        console.warn('[StatDataBindingService] 无法获取MVU数据');
        return false;
      }

      // 4. 获取当前inventory数组
      const currentItems = Mvu.getMvuVariable(mvuData, `inventory.${type}`, { default_value: [] });

      // 5. 添加新物品
      const updatedItems = [...currentItems, validationResult.data];

      // 6. 直接设置到stat_data
      const success = await Mvu.setMvuVariable(mvuData, `inventory.${type}`, updatedItems, {
        reason: reason || `添加物品到${type}`,
        is_recursive: false,
      });

      if (success) {
        // 7. 写回数据
        await this.replaceMvuData(mvuData);
        this.eventBus.emit('inventory:item_added', { type, item, timestamp: new Date() });
      }

      return success;
    } catch (error) {
      console.error(`[StatDataBindingService] 添加物品到${type}失败:`, error);
      return false;
    }
  }

  /**
   * 从背包移除物品
   * @param type 物品类型（'weapons' | 'armors' | 'accessories' | 'others'）
   * @param itemIndex 要移除的物品索引
   * @param reason 移除原因（用于日志记录）
   * @returns 是否移除成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.removeFromInventory('weapons', 0, '出售武器');
   * if (success) {
   *   console.log('武器移除成功');
   * }
   * ```
   */
  public async removeFromInventory(
    type: 'weapons' | 'armors' | 'accessories' | 'others',
    itemIndex: number,
    reason?: string,
  ): Promise<boolean> {
    try {
      // 1. MVU框架已在GameCoreFactory中初始化，直接使用

      // 2. 获取当前MVU数据
      const mvuData = this.getMvuData();
      if (!mvuData) {
        console.warn('[StatDataBindingService] 无法获取MVU数据');
        return false;
      }

      // 3. 获取当前inventory数组
      const currentItems = Mvu.getMvuVariable(mvuData, `inventory.${type}`, { default_value: [] });

      if (itemIndex < 0 || itemIndex >= currentItems.length) {
        console.warn(`[StatDataBindingService] 物品索引 ${itemIndex} 超出范围`);
        return false;
      }

      const removedItem = currentItems[itemIndex];
      const updatedItems = currentItems.filter((_: any, index: number) => index !== itemIndex);

      // 4. 直接设置到stat_data
      const success = await Mvu.setMvuVariable(mvuData, `inventory.${type}`, updatedItems, {
        reason: reason || `从${type}移除物品`,
        is_recursive: false,
      });

      if (success) {
        // 5. 写回数据
        await this.replaceMvuData(mvuData);
        this.eventBus.emit('inventory:item_removed', { type, itemIndex, removedItem, timestamp: new Date() });
      }

      return success;
    } catch (error) {
      console.error(`[StatDataBindingService] 从${type}移除物品失败:`, error);
      return false;
    }
  }

  /**
   * 获取背包中指定类型物品的数量
   * @param type 物品类型
   * @returns 物品数量
   *
   * @example
   * ```typescript
   * const weaponCount = await statDataService.getInventoryItemCount('weapons');
   * console.log(`背包中有 ${weaponCount} 把武器`);
   * ```
   */
  public async getInventoryItemCount(type: 'weapons' | 'armors' | 'accessories' | 'others'): Promise<number> {
    try {
      let items: any[] = [];
      switch (type) {
        case 'weapons':
          items = await this.getInventoryWeapons();
          break;
        case 'armors':
          items = await this.getInventoryArmors();
          break;
        case 'accessories':
          items = await this.getInventoryAccessories();
          break;
        case 'others':
          items = await this.getInventoryOthers();
          break;
      }
      return items.length;
    } catch (error) {
      console.error(`[StatDataBindingService] 获取${type}数量失败:`, error);
      return 0;
    }
  }

  /**
   * 清空指定类型的背包
   * @param type 物品类型
   * @param reason 清空原因（用于日志记录）
   * @returns 是否清空成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.clearInventoryType('weapons', '背包整理');
   * if (success) {
   *   console.log('武器背包已清空');
   * }
   * ```
   */
  public async clearInventoryType(
    type: 'weapons' | 'armors' | 'accessories' | 'others',
    reason?: string,
  ): Promise<boolean> {
    try {
      const currentInventory = await this.getMvuInventory();
      const updatedInventory = { ...currentInventory, [type]: [] };

      const success = await this.setStatDataField('inventory', updatedInventory, reason || `清空${type}背包`);
      if (success) {
        this.eventBus.emit('inventory:type_cleared', { type, timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error(`[StatDataBindingService] 清空${type}背包失败:`, error);
      return false;
    }
  }

  // ==================== 人物关系相关函数 ====================

  /**
   * 获取所有人物关系
   * @returns 人物关系对象
   *
   * @example
   * ```typescript
   * const relationships = await statDataService.getAllRelationships();
   * console.log('所有人物关系:', relationships);
   * ```
   */
  public async getAllRelationships(): Promise<Record<string, any>> {
    try {
      return await this.getMvuRelationships();
    } catch (error) {
      console.error('[StatDataBindingService] 获取所有人物关系失败:', error);
      return {};
    }
  }

  /**
   * 获取特定角色关系
   * @param characterId 角色ID
   * @returns 角色关系对象，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const relationship = await statDataService.getRelationship('100');
   * if (relationship) {
   *   console.log(`角色关系: ${relationship.relationship}`);
   * } else {
   *   console.log('角色不存在');
   * }
   * ```
   */
  public async getRelationship(characterId: string | number): Promise<any> {
    try {
      const relationships = await this.getMvuRelationships();
      return relationships[characterId] || null;
    } catch (error) {
      console.error(`[StatDataBindingService] 获取角色${characterId}关系失败:`, error);
      return null;
    }
  }

  /**
   * 获取特定角色好感度
   * @param characterId 角色ID
   * @returns 好感度值（范围：-200 到 200）
   *
   * @example
   * ```typescript
   * const affinity = await statDataService.getAffinity('100');
   * console.log(`角色好感度: ${affinity}`);
   * ```
   */
  public async getAffinity(characterId: string | number): Promise<number> {
    try {
      return await this.getMvuAffinity(characterId);
    } catch (error) {
      console.error(`[StatDataBindingService] 获取角色${characterId}好感度失败:`, error);
      return 0;
    }
  }

  /**
   * 设置特定角色好感度
   * @param characterId 角色ID
   * @param affinity 新的好感度值（范围：-200 到 200）
   * @param reason 设置原因（用于日志记录）
   * @returns 是否设置成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.setAffinity('100', 50, '完成支线任务');
   * if (success) {
   *   console.log('好感度设置成功');
   * }
   * ```
   */
  public async setAffinity(characterId: string | number, affinity: number, reason?: string): Promise<boolean> {
    try {
      // 限制好感度范围
      const clampedAffinity = Math.max(-200, Math.min(200, affinity));

      const relationship = await this.getRelationship(characterId);
      if (!relationship) {
        console.warn(`[StatDataBindingService] 角色${characterId}不存在，无法设置好感度`);
        return false;
      }

      const updatedRelationship = {
        ...relationship,
        affinity: [clampedAffinity, '对<user>的好感度,范围[-200,200]'],
      };

      const relationships = await this.getMvuRelationships();
      const updatedRelationships = { ...relationships, [characterId]: updatedRelationship };

      const success = await this.setStatDataField(
        'relationships',
        updatedRelationships,
        reason || `设置角色${characterId}好感度`,
      );
      if (success) {
        this.eventBus.emit('relationship:affinity_changed', {
          characterId,
          affinity: clampedAffinity,
          timestamp: new Date(),
        });
      }
      return success;
    } catch (error) {
      console.error(`[StatDataBindingService] 设置角色${characterId}好感度失败:`, error);
      return false;
    }
  }

  /**
   * 添加新角色关系
   * @param characterId 角色ID
   * @param relationshipData 角色关系数据
   * @param reason 添加原因（用于日志记录）
   * @returns 是否添加成功
   *
   * @example
   * ```typescript
   * const newCharacter = {
   *   id: 101,
   *   gender: "女",
   *   background: "魔法师",
   *   personality: "温柔",
   *   outfit: "法师袍",
   *   thoughts: "对主角很好奇",
   *   relationship: "朋友",
   *   others: "擅长火系魔法",
   *   events: [],
   *   attributes: {
   *     strength: 8, agility: 12, defense: 18,
   *     constitution: 10, charisma: 15, willpower: 14, luck: 11
   *   },
   *   affinity: [0, "对<user>的好感度,范围[-200,200]"]
   * };
   * const success = await statDataService.addRelationship('101', newCharacter, '遇到新角色');
   * ```
   */
  public async addRelationship(characterId: string | number, relationshipData: any, reason?: string): Promise<boolean> {
    try {
      const relationships = await this.getMvuRelationships();

      // 检查角色是否已存在
      if (relationships[characterId]) {
        console.warn(`[StatDataBindingService] 角色${characterId}已存在`);
        return false;
      }

      const updatedRelationships = { ...relationships, [characterId]: relationshipData };

      const success = await this.setStatDataField(
        'relationships',
        updatedRelationships,
        reason || `添加新角色${characterId}`,
      );
      if (success) {
        this.eventBus.emit('relationship:character_added', { characterId, relationshipData, timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error(`[StatDataBindingService] 添加角色${characterId}失败:`, error);
      return false;
    }
  }

  /**
   * 更新角色关系
   * @param characterId 角色ID
   * @param updates 要更新的字段
   * @param reason 更新原因（用于日志记录）
   * @returns 是否更新成功
   *
   * @example
   * ```typescript
   * const updates = {
   *   relationship: '恋人',
   *   thoughts: '深深爱着主角'
   * };
   * const success = await statDataService.updateRelationship('100', updates, '关系升级');
   * ```
   */
  public async updateRelationship(characterId: string | number, updates: any, reason?: string): Promise<boolean> {
    try {
      const relationship = await this.getRelationship(characterId);
      if (!relationship) {
        console.warn(`[StatDataBindingService] 角色${characterId}不存在，无法更新`);
        return false;
      }

      const updatedRelationship = { ...relationship, ...updates };
      const relationships = await this.getMvuRelationships();
      const updatedRelationships = { ...relationships, [characterId]: updatedRelationship };

      const success = await this.setStatDataField(
        'relationships',
        updatedRelationships,
        reason || `更新角色${characterId}关系`,
      );
      if (success) {
        this.eventBus.emit('relationship:character_updated', { characterId, updates, timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error(`[StatDataBindingService] 更新角色${characterId}关系失败:`, error);
      return false;
    }
  }

  // ==================== 时间和日期相关函数 ====================

  /**
   * 获取当前日期
   * @param defaultValue 默认值，当日期不存在时返回
   * @returns 当前日期字符串 (格式: YYYY-MM-DD)
   *
   * @example
   * ```typescript
   * const currentDate = await statDataService.getCurrentDate('2030-01-01');
   * console.log(`当前日期: ${currentDate}`);
   * ```
   */
  public async getCurrentDate(defaultValue: string = '2030-01-01'): Promise<string> {
    try {
      const data = await this.getMvuVariable('date', { default_value: defaultValue });
      return typeof data === 'string' ? data : defaultValue;
    } catch (error) {
      console.error('[StatDataBindingService] 获取当前日期失败:', error);
      return defaultValue;
    }
  }

  /**
   * 获取当前时间
   * @param defaultValue 默认值，当时间不存在时返回
   * @returns 当前时间字符串 (格式: hh:mm, 24小时制)
   *
   * @example
   * ```typescript
   * const currentTime = await statDataService.getCurrentTime('12:00');
   * console.log(`当前时间: ${currentTime}`);
   * ```
   */
  public async getCurrentTime(defaultValue: string = '12:00'): Promise<string> {
    try {
      const data = await this.getMvuVariable('time', { default_value: defaultValue });
      return typeof data === 'string' ? data : defaultValue;
    } catch (error) {
      console.error('[StatDataBindingService] 获取当前时间失败:', error);
      return defaultValue;
    }
  }

  /**
   * 获取完整的日期时间信息
   * @returns 包含日期和时间的对象
   *
   * @example
   * ```typescript
   * const dateTimeInfo = await statDataService.getDateTimeInfo();
   * console.log(`当前时间: ${dateTimeInfo.date} ${dateTimeInfo.time}`);
   * ```
   */
  public async getDateTimeInfo(): Promise<{ date: string; time: string; dateTime: string }> {
    try {
      const [date, time] = await Promise.all([this.getCurrentDate(), this.getCurrentTime()]);

      return {
        date,
        time,
        dateTime: `${date} ${time}`,
      };
    } catch (error) {
      console.error('[StatDataBindingService] 获取日期时间信息失败:', error);
      return {
        date: '2030-01-01',
        time: '12:00',
        dateTime: '2030-01-01 12:00',
      };
    }
  }

  // ==================== 位置相关函数 ====================

  /**
   * 获取当前所在位置
   * @param defaultValue 默认值，当位置不存在时返回
   * @returns 当前所在的具体地点
   *
   * @example
   * ```typescript
   * const location = await statDataService.getCurrentLocation('未知地点');
   * console.log(`当前位置: ${location}`);
   * ```
   */
  public async getCurrentLocation(defaultValue: string = '未知地点'): Promise<string> {
    try {
      const data = await this.getMvuVariable('location', { default_value: defaultValue });
      return typeof data === 'string' ? data : defaultValue;
    } catch (error) {
      console.error('[StatDataBindingService] 获取当前位置失败:', error);
      return defaultValue;
    }
  }

  // ==================== 事件相关函数 ====================

  /**
   * 获取当前随机事件
   * @param defaultValue 默认值，当随机事件不存在时返回
   * @returns 当前发生的随机事件名称
   *
   * @example
   * ```typescript
   * const randomEvent = await statDataService.getCurrentRandomEvent('无');
   * console.log(`当前随机事件: ${randomEvent}`);
   * ```
   */
  public async getCurrentRandomEvent(defaultValue: string = '无'): Promise<string> {
    try {
      const data = await this.getMvuVariable('random_event', { default_value: defaultValue });
      return typeof data === 'string' ? data : defaultValue;
    } catch (error) {
      console.error('[StatDataBindingService] 获取当前随机事件失败:', error);
      return defaultValue;
    }
  }

  // ==================== 角色基本信息函数 ====================

  /**
   * 获取用户性别
   * @param defaultValue 默认值
   * @returns 用户性别
   *
   * @example
   * ```typescript
   * const gender = await statDataService.getGender('未知');
   * console.log(`用户性别: ${gender}`);
   * ```
   */
  public async getGender(defaultValue: string = '未知'): Promise<string> {
    try {
      const data = await this.getMvuVariable('gender', { default_value: defaultValue });
      return typeof data === 'string' ? data : defaultValue;
    } catch (error) {
      console.error('[StatDataBindingService] 获取用户性别失败:', error);
      return defaultValue;
    }
  }

  /**
   * 获取用户种族
   * @param defaultValue 默认值
   * @returns 用户种族
   *
   * @example
   * ```typescript
   * const race = await statDataService.getRace('未知');
   * console.log(`用户种族: ${race}`);
   * ```
   */
  public async getRace(defaultValue: string = '未知'): Promise<string> {
    try {
      const data = await this.getMvuVariable('race', { default_value: defaultValue });
      return typeof data === 'string' ? data : defaultValue;
    } catch (error) {
      console.error('[StatDataBindingService] 获取用户种族失败:', error);
      return defaultValue;
    }
  }

  /**
   * 获取用户年龄
   * @param defaultValue 默认值
   * @returns 用户年龄
   *
   * @example
   * ```typescript
   * const age = await statDataService.getAge(16);
   * console.log(`用户年龄: ${age}`);
   * ```
   */
  public async getAge(defaultValue: number = 16): Promise<number> {
    try {
      const data = await this.getMvuVariable('age', { default_value: defaultValue });
      const numValue = Number(data);
      return Number.isFinite(numValue) ? numValue : defaultValue;
    } catch (error) {
      console.error('[StatDataBindingService] 获取用户年龄失败:', error);
      return defaultValue;
    }
  }

  /**
   * 设置用户性别
   * @param gender 性别值
   * @param reason 设置原因（用于日志记录）
   * @returns 是否设置成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.setGender('女性', '角色创建');
   * if (success) {
   *   console.log('性别设置成功');
   * }
   * ```
   */
  public async setGender(gender: string, reason?: string): Promise<boolean> {
    try {
      const success = await this.setStatDataField('gender', gender, reason || '设置用户性别');
      if (success) {
        this.eventBus.emit('character:gender_changed', { gender, timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error('[StatDataBindingService] 设置用户性别失败:', error);
      return false;
    }
  }

  /**
   * 设置用户种族
   * @param race 种族值
   * @param reason 设置原因（用于日志记录）
   * @returns 是否设置成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.setRace('灵族', '角色创建');
   * if (success) {
   *   console.log('种族设置成功');
   * }
   * ```
   */
  public async setRace(race: string, reason?: string): Promise<boolean> {
    try {
      const success = await this.setStatDataField('race', race, reason || '设置用户种族');
      if (success) {
        this.eventBus.emit('character:race_changed', { race, timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error('[StatDataBindingService] 设置用户种族失败:', error);
      return false;
    }
  }

  /**
   * 获取角色基本信息
   * @returns 包含性别、种族、年龄的角色信息对象
   *
   * @example
   * ```typescript
   * const characterInfo = await statDataService.getCharacterInfo();
   * console.log(`角色信息: ${characterInfo.gender} ${characterInfo.race}, ${characterInfo.age}岁`);
   * ```
   */
  public async getCharacterInfo(): Promise<{
    gender: string;
    race: string;
    age: number;
  }> {
    try {
      const [gender, race, age] = await Promise.all([this.getGender(), this.getRace(), this.getAge()]);

      return {
        gender,
        race,
        age,
      };
    } catch (error) {
      console.error('[StatDataBindingService] 获取角色基本信息失败:', error);
      return {
        gender: '未知',
        race: '未知',
        age: 16,
      };
    }
  }

  /**
   * 检查是否有活跃的随机事件
   * @returns 是否有活跃的随机事件（非"无"状态）
   *
   * @example
   * ```typescript
   * const hasActiveEvent = await statDataService.isRandomEventActive();
   * if (hasActiveEvent) {
   *   console.log('当前有活跃的随机事件');
   * } else {
   *   console.log('当前没有活跃的随机事件');
   * }
   * ```
   */
  public async isRandomEventActive(): Promise<boolean> {
    try {
      const randomEvent = await this.getCurrentRandomEvent();
      return randomEvent !== '无' && randomEvent.trim() !== '';
    } catch (error) {
      console.error('[StatDataBindingService] 检查随机事件状态失败:', error);
      return false;
    }
  }

  // ==================== 综合信息函数 ====================

  /**
   * 获取游戏状态信息
   * @returns 包含所有游戏状态信息的对象
   *
   * @example
   * ```typescript
   * const gameState = await statDataService.getGameStateInfo();
   * console.log('游戏状态:', gameState);
   * // 输出: {
   * //   date: '2030-03-25',
   * //   time: '16:30',
   * //   location: '小巷',
   * //   randomEvent: '无',
   * //   hasActiveEvent: false,
   * //   dateTime: '2030-03-25 16:30',
   * //   character: {
   * //     gender: '女',
   * //     race: '精灵',
   * //     age: 18
   * //   }
   * // }
   * ```
   */
  public async getGameStateInfo(): Promise<{
    date: string;
    time: string;
    location: string;
    randomEvent: string;
    hasActiveEvent: boolean;
    dateTime: string;
    character: {
      gender: string;
      race: string;
      age: number;
    };
  }> {
    try {
      const [date, time, location, randomEvent, characterInfo] = await Promise.all([
        this.getCurrentDate(),
        this.getCurrentTime(),
        this.getCurrentLocation(),
        this.getCurrentRandomEvent(),
        this.getCharacterInfo(),
      ]);

      const hasActiveEvent = randomEvent !== '无' && randomEvent.trim() !== '';

      return {
        date,
        time,
        location,
        randomEvent,
        hasActiveEvent,
        dateTime: `${date} ${time}`,
        character: characterInfo,
      };
    } catch (error) {
      console.error('[StatDataBindingService] 获取游戏状态信息失败:', error);
      return {
        date: '2030-01-01',
        time: '12:00',
        location: '未知地点',
        randomEvent: '无',
        hasActiveEvent: false,
        dateTime: '2030-01-01 12:00',
        character: {
          gender: '未知',
          race: '未知',
          age: 16,
        },
      };
    }
  }

  // ==================== 通用工具函数 ====================

  /**
   * 获取 stat_data 中的任意字段
   * @param fieldName 字段名称
   * @param defaultValue 默认值
   * @returns 字段值
   *
   * @example
   * ```typescript
   * const equipment = await statDataService.getStatDataField('equipment');
   * const customField = await statDataService.getStatDataField('custom_field', 'default');
   * ```
   */
  public async getStatDataField(fieldName: string, defaultValue: any = null): Promise<any> {
    try {
      return await this.getMvuVariable(fieldName, { default_value: defaultValue });
    } catch (error) {
      console.error(`[StatDataBindingService] 获取字段${fieldName}失败:`, error);
      return defaultValue;
    }
  }

  /**
   * 设置 stat_data 中的任意字段
   * @param fieldName 字段名称
   * @param value 字段值
   * @param reason 设置原因（用于日志记录）
   * @returns 是否设置成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.setStatDataField('custom_field', 'custom_value', '设置自定义字段');
   * ```
   */
  public async setStatDataField(fieldName: string, value: any, reason?: string): Promise<boolean> {
    try {
      // MVU框架已在GameCoreFactory中初始化，直接使用

      const mvuData = this.getMvuData();
      if (!mvuData) {
        console.warn('[StatDataBindingService] 无法获取MVU数据');
        return false;
      }

      // 验证并清理数据值
      const validatedValue = this._validateAndCleanValue(fieldName, value);

      // 直接设置到stat_data，不需要复杂的格式转换
      const success = await Mvu.setMvuVariable(mvuData, fieldName, validatedValue, {
        reason: reason || `设置字段${fieldName}`,
        is_recursive: false,
      });

      if (success) {
        // 写回数据
        await this.replaceMvuData(mvuData);
        // 更新本地缓存
        this.currentStatData = { ...this.currentStatData };
        this.notifyBindingHandlers();
      }

      return success;
    } catch (error) {
      console.error(`[StatDataBindingService] 设置字段${fieldName}失败:`, error);
      return false;
    }
  }

  /**
   * 刷新统计数据
   * @returns 是否刷新成功
   *
   * @example
   * ```typescript
   * const success = await statDataService.refreshStatData();
   * if (success) {
   *   console.log('统计数据已刷新');
   * }
   * ```
   */
  public async refreshStatData(): Promise<boolean> {
    try {
      const success = await this.loadStatData();
      if (success) {
        this.eventBus.emit('stat_data:refreshed', { timestamp: new Date() });
      }
      return success;
    } catch (error) {
      console.error('[StatDataBindingService] 刷新统计数据失败:', error);
      return false;
    }
  }

  /**
   * 获取统计数据摘要
   * @returns 包含所有主要数据的摘要对象
   *
   * @example
   * ```typescript
   * const summary = await statDataService.getStatDataSummary();
   * console.log('统计数据摘要:', summary);
   * ```
   */
  public async getStatDataSummary(): Promise<{
    baseAttributes: Record<string, number>;
    currentAttributes: Record<string, number>;
    equipment: { weapon: any; armor: any; accessory: any };
    inventory: { weapons: number; armors: number; accessories: number; others: number };
    relationships: number;
  }> {
    try {
      const [baseAttributes, currentAttributes, equipment, inventory, relationships] = await Promise.all([
        this.getAllBaseAttributes(),
        this.getAllCurrentAttributes(),
        this.getMvuEquipment(),
        this.getMvuInventory(),
        this.getAllRelationships(),
      ]);

      return {
        baseAttributes,
        currentAttributes,
        equipment: {
          weapon: equipment.weapon || null,
          armor: equipment.armor || null,
          accessory: equipment.accessory || null,
        },
        inventory: {
          weapons: Array.isArray(inventory.weapons) ? inventory.weapons.length : 0,
          armors: Array.isArray(inventory.armors) ? inventory.armors.length : 0,
          accessories: Array.isArray(inventory.accessories) ? inventory.accessories.length : 0,
          others: Array.isArray(inventory.others) ? inventory.others.length : 0,
        },
        relationships: Object.keys(relationships).length,
      };
    } catch (error) {
      console.error('[StatDataBindingService] 获取统计数据摘要失败:', error);
      return {
        baseAttributes: {},
        currentAttributes: {},
        equipment: { weapon: null, armor: null, accessory: null },
        inventory: { weapons: 0, armors: 0, accessories: 0, others: 0 },
        relationships: 0,
      };
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 将中文属性名转换为英文属性名
   */
  private getEnglishAttributeName(chineseName: string): string {
    return this.chineseToEnglishMap[chineseName] || chineseName;
  }

  /**
   * 将英文属性名转换为中文属性名
   */
  private getChineseAttributeName(englishName: string): string {
    return ATTRIBUTE_NAME_MAP[englishName as keyof typeof ATTRIBUTE_NAME_MAP] || englishName;
  }

  /**
   * 检查是否是角色创建时的属性数据
   */
  private _isCharacterCreationAttributes(attributes: Record<string, any>): boolean {
    // 检查是否包含英文属性名（角色创建时使用英文属性名）
    const ENGLISH_ATTRIBUTE_NAMES = ['strength', 'agility', 'defense', 'constitution', 'charisma', 'willpower', 'luck'];
    return ENGLISH_ATTRIBUTE_NAMES.some(name => Object.prototype.hasOwnProperty.call(attributes, name));
  }

  // _convertToMvuFormat 方法已移除，MVU 框架会自动处理格式转换

  /**
   * 验证并清理数据值
   * 注意：MVU框架会自动处理数据格式，这里只做基本的业务逻辑验证
   */
  private _validateAndCleanValue(attributeName: string, value: any): any {
    // 基本的业务逻辑验证
    if (attributeName === 'date' && typeof value === 'string') {
      // 简单的日期格式检查
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        console.warn(`[StatDataBindingService] 日期格式可能不正确: ${value}`);
        return '2030-01-01'; // 默认值
      }
    } else if (attributeName === 'time' && typeof value === 'string') {
      // 简单的时间格式检查
      if (!/^\d{2}:\d{2}$/.test(value)) {
        console.warn(`[StatDataBindingService] 时间格式可能不正确: ${value}`);
        return '12:00'; // 默认值
      }
    }

    // 对于其他类型，直接返回原值，让 MVU 框架处理
    return value;
  }
}

// 导出单例实例
// StatDataBindingService 实例将通过 Inversify 容器创建

/**
 * ==================== 使用说明 ====================
 *
 * StatDataBindingService 提供了便捷的函数来直接获取、查看和更新 stat_data 中的特定变量。
 * 这些函数基于 MVU 变量表.md 中定义的数据结构。
 *
 * ## 主要功能分类：
 *
 * ### 1. 属性相关函数
 * - getBaseAttribute(attributeName, defaultValue) - 获取单个基础属性
 * - getCurrentAttribute(attributeName, defaultValue) - 获取单个当前属性
 * - setBaseAttribute(attributeName, value, reason) - 设置单个基础属性
 * - setCurrentAttribute(attributeName, value, reason) - 设置单个当前属性
 * - getAllBaseAttributes() - 获取所有基础属性
 * - getAllCurrentAttributes() - 获取所有当前属性
 * - updateBaseAttributes(attributes, reason) - 批量更新基础属性
 * - updateCurrentAttributes(attributes, reason) - 批量更新当前属性
 *
 * ### 2. 装备相关函数
 * - getEquippedWeapon() - 获取当前装备的武器
 * - getEquippedArmor() - 获取当前装备的防具
 * - getEquippedAccessory() - 获取当前装备的饰品
 * - equipWeapon(weapon, reason) - 装备武器
 * - equipArmor(armor, reason) - 装备防具
 * - equipAccessory(accessory, reason) - 装备饰品
 * - unequipWeapon(reason) - 卸下武器
 * - unequipArmor(reason) - 卸下防具
 * - unequipAccessory(reason) - 卸下饰品
 *
 * ### 3. 背包相关函数
 * - getInventoryWeapons() - 获取背包中的武器列表
 * - getInventoryArmors() - 获取背包中的防具列表
 * - getInventoryAccessories() - 获取背包中的饰品列表
 * - getInventoryOthers() - 获取背包中的其他物品列表
 * - addToInventory(type, item, reason) - 添加物品到背包
 * - removeFromInventory(type, itemIndex, reason) - 从背包移除物品
 * - getInventoryItemCount(type) - 获取背包中指定类型物品的数量
 * - clearInventoryType(type, reason) - 清空指定类型的背包
 *
 * ### 4. 人物关系相关函数
 * - getAllRelationships() - 获取所有人物关系
 * - getRelationship(characterId) - 获取特定角色关系
 * - getAffinity(characterId) - 获取特定角色好感度
 * - setAffinity(characterId, affinity, reason) - 设置特定角色好感度
 * - addRelationship(characterId, relationshipData, reason) - 添加新角色关系
 * - updateRelationship(characterId, updates, reason) - 更新角色关系
 *
 * ### 5. 时间和日期相关函数
 * - getCurrentDate(defaultValue) - 获取当前日期 (格式: YYYY-MM-DD)
 * - getCurrentTime(defaultValue) - 获取当前时间 (格式: hh:mm, 24小时制)
 * - getDateTimeInfo() - 获取完整的日期时间信息
 *
 * ### 6. 位置相关函数
 * - getCurrentLocation(defaultValue) - 获取当前所在位置
 *
 * ### 7. 事件相关函数
 * - getCurrentRandomEvent(defaultValue) - 获取当前随机事件
 * - isRandomEventActive() - 检查是否有活跃的随机事件
 *
 * ### 8. 角色基本信息函数
 * - getGender(defaultValue) - 获取用户性别
 * - getRace(defaultValue) - 获取用户种族
 * - getAge(defaultValue) - 获取用户年龄
 * - setGender(gender, reason) - 设置用户性别
 * - setRace(race, reason) - 设置用户种族
 * - getCharacterInfo() - 获取角色基本信息（包含性别、种族、年龄）
 *
 * ### 9. 综合信息函数
 * - getGameStateInfo() - 获取游戏状态信息（包含所有新变量）
 *
 * ### 10. MVU 数据访问封装函数
 * - getMvuData(options) - 获取 MVU 数据对象
 * - replaceMvuData(mvuData, options) - 替换 MVU 数据对象
 *
 * ### 11. 通用工具函数
 * - getStatDataField(fieldName, defaultValue) - 获取 stat_data 中的任意字段
 * - setStatDataField(fieldName, value, reason) - 设置 stat_data 中的任意字段
 * - refreshStatData() - 刷新统计数据
 * - getStatDataSummary() - 获取统计数据摘要
 *
 * ## 使用示例：
 *
 * ```typescript
 * // 获取服务实例（通过依赖注入）
 * const statDataService = container.get<StatDataBindingService>(TYPES.StatDataBindingService);
 *
 * // 初始化服务
 * await statDataService.initialize();
 *
 * // 获取属性
 * const strength = await statDataService.getBaseAttribute('力量', 10);
 * console.log(`力量值: ${strength}`);
 *
 * // 设置属性
 * const success = await statDataService.setBaseAttribute('力量', 15, '升级奖励');
 *
 * // 装备武器
 * const weapon = {
 *   name: '铁剑',
 *   description: '一把普通的铁制长剑',
 *   attributes_bonus: { '力量': 2 }
 * };
 * await statDataService.equipWeapon(weapon, '获得新武器');
 *
 * // 添加物品到背包
 * await statDataService.addToInventory('weapons', weapon, '获得新武器');
 *
 * // 设置角色好感度
 * await statDataService.setAffinity('100', 50, '完成支线任务');
 *
 * // 获取时间和日期信息
 * const currentDate = await statDataService.getCurrentDate();
 * const currentTime = await statDataService.getCurrentTime();
 * const dateTimeInfo = await statDataService.getDateTimeInfo();
 * console.log(`当前时间: ${dateTimeInfo.dateTime}`);
 *
 * // 获取位置信息
 * const location = await statDataService.getCurrentLocation();
 * console.log(`当前位置: ${location}`);
 *
 * // 检查随机事件
 * const randomEvent = await statDataService.getCurrentRandomEvent();
 * const hasActiveEvent = await statDataService.isRandomEventActive();
 * if (hasActiveEvent) {
 *   console.log(`当前随机事件: ${randomEvent}`);
 * }
 *
 * // 获取角色基本信息
 * const gender = await statDataService.getGender();
 * const race = await statDataService.getRace();
 * const age = await statDataService.getAge();
 * console.log(`角色信息: ${gender} ${race}, ${age}岁`);
 *
 * // 设置角色基本信息
 * await statDataService.setGender('女性', '角色创建');
 * await statDataService.setRace('灵族', '角色创建');
 *
 * // 获取完整的角色信息
 * const characterInfo = await statDataService.getCharacterInfo();
 * console.log('角色信息:', characterInfo);
 *
 * // 获取完整的游戏状态信息
 * const gameState = await statDataService.getGameStateInfo();
 * console.log('游戏状态:', gameState);
 *
 * // 获取数据摘要
 * const summary = await statDataService.getStatDataSummary();
 * console.log('统计数据摘要:', summary);
 *
 * // 使用 MVU 数据访问封装函数
 * // 获取 MVU 数据
 * const mvuData = statDataService.getMvuData();
 * console.log('MVU 数据:', mvuData);
 *
 * // 获取全局 MVU 数据
 * const globalMvuData = statDataService.getMvuData({ type: 'global' });
 * console.log('全局 MVU 数据:', globalMvuData);
 *
 * // 修改并替换 MVU 数据
 * mvuData.stat_data.custom_field = 'new_value';
 * const success = await statDataService.replaceMvuData(mvuData);
 * if (success) {
 *   console.log('MVU 数据替换成功');
 * }
 * ```
 *
 * ## 注意事项：
 *
 * 1. 所有函数都是异步的，需要使用 await 或 .then() 调用
 * 2. MVU框架初始化已在GameCoreFactory中完成，服务假设MVU框架始终可用
 * 3. 所有数据修改都会触发相应的事件，可以通过 EventBus 监听
 * 4. 当前属性通常由系统自动计算，手动设置需要谨慎
 * 5. 好感度范围限制在 -200 到 200 之间
 * 6. 角色ID建议从100开始递增
 * 7. 新添加的读取函数（时间、日期、位置、事件）只提供读取功能，不提供设置功能
 * 8. 日期格式为 YYYY-MM-DD，时间格式为 hh:mm（24小时制）
 * 9. 随机事件为"无"时表示没有活跃的随机事件
 * 10. getMvuData() 和 replaceMvuData() 提供了统一的 MVU 数据访问接口，支持不同的作用域（message、global等）
 *
 * ================================================
 */
