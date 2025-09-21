import _ from 'lodash';
import { EventBus } from '../core/EventBus';

/**
 * VariableService - 变量管理服务
 *
 * 职责：
 * - 统一管理酒馆变量操作
 * - 提供类型安全的变量访问接口
 * - 支持变量变更的事件通知
 * - 处理变量的缓存和同步
 */

export interface VariableOptions {
  type?: 'message' | 'chat' | 'character' | 'script' | 'global';
  message_id?: number | 'latest';
  script_id?: string;
}

export interface VariableChangeEvent {
  path: string;
  oldValue: any;
  newValue: any;
  type: string;
  timestamp: Date;
}

export class VariableService {
  private eventBus: EventBus;
  private cache = new Map<string, any>();
  private cacheEnabled = true;
  private cacheTimeout = 5000; // 5秒缓存过期

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();

    console.log('[VariableService] 变量管理服务初始化完成');
  }

  /**
   * 获取变量值
   * @param path 变量路径，如 'character.name' 或 '神乐光.好感度'
   * @param options 变量选项
   * @param useCache 是否使用缓存
   */
  async get<T = any>(path: string, options: VariableOptions = {}, useCache = true): Promise<T | undefined> {
    const cacheKey = this.getCacheKey(path, options);

    // 尝试从缓存获取
    if (useCache && this.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.value as T;
      }
    }

    try {
      const variables = getVariables(options);
      const value = _.get(variables, path);

      // 更新缓存
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, {
          value,
          timestamp: Date.now(),
        });
      }

      this.eventBus.emit('variable:read', {
        path,
        value,
        options,
        timestamp: new Date(),
      });

      return value as T;
    } catch (error) {
      console.error('[VariableService] 获取变量失败:', path, error);
      this.eventBus.emit('variable:error', {
        operation: 'get',
        path,
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 设置变量值
   * @param path 变量路径
   * @param value 新值
   * @param options 变量选项
   */
  async set(path: string, value: any, options: VariableOptions = {}): Promise<void> {
    try {
      // 获取旧值
      const oldValue = await this.get(path, options, false);

      // 更新变量
      const variables = getVariables(options);
      _.set(variables, path, value);
      await replaceVariables(variables, options);

      // 清除缓存
      this.invalidateCache(path, options);

      // 发送变更事件
      const changeEvent: VariableChangeEvent = {
        path,
        oldValue,
        newValue: value,
        type: options.type || 'chat',
        timestamp: new Date(),
      };

      this.eventBus.emit('variable:changed', changeEvent);
      this.eventBus.emit(`variable:changed:${path}`, changeEvent);

      console.debug('[VariableService] 变量已更新:', path, '从', oldValue, '到', value);
    } catch (error) {
      console.error('[VariableService] 设置变量失败:', path, error);
      this.eventBus.emit('variable:error', {
        operation: 'set',
        path,
        value,
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 批量设置变量
   * @param updates 变量更新对象
   * @param options 变量选项
   */
  async setMultiple(updates: Record<string, any>, options: VariableOptions = {}): Promise<void> {
    try {
      const variables = getVariables(options);
      const changes: VariableChangeEvent[] = [];

      // 收集所有变更
      for (const [path, newValue] of Object.entries(updates)) {
        const oldValue = _.get(variables, path);
        _.set(variables, path, newValue);

        changes.push({
          path,
          oldValue,
          newValue,
          type: options.type || 'chat',
          timestamp: new Date(),
        });
      }

      // 批量更新
      await replaceVariables(variables, options);

      // 清除相关缓存
      for (const path of Object.keys(updates)) {
        this.invalidateCache(path, options);
      }

      // 发送批量变更事件
      this.eventBus.emit('variable:batch-changed', {
        changes,
        options,
        timestamp: new Date(),
      });

      // 发送单个变更事件
      for (const change of changes) {
        this.eventBus.emit('variable:changed', change);
        this.eventBus.emit(`variable:changed:${change.path}`, change);
      }

      console.debug('[VariableService] 批量变量更新完成:', Object.keys(updates));
    } catch (error) {
      console.error('[VariableService] 批量设置变量失败:', updates, error);
      this.eventBus.emit('variable:error', {
        operation: 'setMultiple',
        updates,
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 删除变量
   * @param path 变量路径
   * @param options 变量选项
   */
  async delete(path: string, options: VariableOptions = {}): Promise<boolean> {
    try {
      const result = await deleteVariable(path, options);

      if (result.delete_occurred) {
        // 清除缓存
        this.invalidateCache(path, options);

        // 发送删除事件
        this.eventBus.emit('variable:deleted', {
          path,
          type: options.type || 'chat',
          timestamp: new Date(),
        });

        console.debug('[VariableService] 变量已删除:', path);
      }

      return result.delete_occurred;
    } catch (error) {
      console.error('[VariableService] 删除变量失败:', path, error);
      this.eventBus.emit('variable:error', {
        operation: 'delete',
        path,
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 检查变量是否存在
   * @param path 变量路径
   * @param options 变量选项
   */
  async exists(path: string, options: VariableOptions = {}): Promise<boolean> {
    try {
      const value = await this.get(path, options);
      return value !== undefined;
    } catch (error) {
      console.error('[VariableService] 检查变量存在性失败:', path, error);
      return false;
    }
  }

  /**
   * 获取所有变量
   * @param options 变量选项
   */
  async getAll(options: VariableOptions = {}): Promise<Record<string, any>> {
    try {
      const variables = getVariables(options);

      this.eventBus.emit('variable:read-all', {
        options,
        count: Object.keys(variables).length,
        timestamp: new Date(),
      });

      return variables;
    } catch (error) {
      console.error('[VariableService] 获取所有变量失败:', error);
      this.eventBus.emit('variable:error', {
        operation: 'getAll',
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 使用更新器函数更新变量
   * @param updater 更新器函数
   * @param options 变量选项
   */
  async updateWith(
    updater: (variables: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>,
    options: VariableOptions = {},
  ): Promise<Record<string, any>> {
    try {
      const result = await updateVariablesWith(updater, options);

      // 清除所有缓存（因为不知道具体更新了什么）
      this.clearCache();

      this.eventBus.emit('variable:updated-with-function', {
        options,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      console.error('[VariableService] 使用更新器更新变量失败:', error);
      this.eventBus.emit('variable:error', {
        operation: 'updateWith',
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 增加数值变量
   * @param path 变量路径
   * @param increment 增量，默认为1
   * @param options 变量选项
   */
  async increment(path: string, increment = 1, options: VariableOptions = {}): Promise<number> {
    try {
      const currentValue = (await this.get<number>(path, options)) || 0;
      const newValue = currentValue + increment;
      await this.set(path, newValue, options);

      this.eventBus.emit('variable:incremented', {
        path,
        oldValue: currentValue,
        newValue,
        increment,
        timestamp: new Date(),
      });

      return newValue;
    } catch (error) {
      console.error('[VariableService] 增加变量失败:', path, error);
      throw error;
    }
  }

  /**
   * 减少数值变量
   * @param path 变量路径
   * @param decrement 减量，默认为1
   * @param options 变量选项
   */
  async decrement(path: string, decrement = 1, options: VariableOptions = {}): Promise<number> {
    return this.increment(path, -decrement, options);
  }

  /**
   * 切换布尔变量
   * @param path 变量路径
   * @param options 变量选项
   */
  async toggle(path: string, options: VariableOptions = {}): Promise<boolean> {
    try {
      const currentValue = await this.get<boolean>(path, options);
      const newValue = !currentValue;
      await this.set(path, newValue, options);

      this.eventBus.emit('variable:toggled', {
        path,
        oldValue: currentValue,
        newValue,
        timestamp: new Date(),
      });

      return newValue;
    } catch (error) {
      console.error('[VariableService] 切换变量失败:', path, error);
      throw error;
    }
  }

  /**
   * 向数组变量添加元素
   * @param path 变量路径
   * @param value 要添加的值
   * @param options 变量选项
   */
  async pushToArray(path: string, value: any, options: VariableOptions = {}): Promise<number> {
    try {
      const currentArray = (await this.get<any[]>(path, options)) || [];
      const newArray = [...currentArray, value];
      await this.set(path, newArray, options);

      this.eventBus.emit('variable:array-pushed', {
        path,
        value,
        newLength: newArray.length,
        timestamp: new Date(),
      });

      return newArray.length;
    } catch (error) {
      console.error('[VariableService] 向数组添加元素失败:', path, error);
      throw error;
    }
  }

  /**
   * 从数组变量移除元素
   * @param path 变量路径
   * @param value 要移除的值
   * @param options 变量选项
   */
  async removeFromArray(path: string, value: any, options: VariableOptions = {}): Promise<boolean> {
    try {
      const currentArray = (await this.get<any[]>(path, options)) || [];
      const newArray = currentArray.filter(item => !_.isEqual(item, value));
      const removed = newArray.length < currentArray.length;

      if (removed) {
        await this.set(path, newArray, options);

        this.eventBus.emit('variable:array-removed', {
          path,
          value,
          newLength: newArray.length,
          timestamp: new Date(),
        });
      }

      return removed;
    } catch (error) {
      console.error('[VariableService] 从数组移除元素失败:', path, error);
      throw error;
    }
  }

  /**
   * 监听变量变更
   * @param path 变量路径，支持通配符
   * @param callback 回调函数
   * @returns 取消监听的函数
   */
  onVariableChange(path: string, callback: (event: VariableChangeEvent) => void): () => void {
    if (path.includes('*')) {
      // 通配符监听
      return this.eventBus.on('variable:changed', (event?: VariableChangeEvent) => {
        if (event && this.matchesPattern(event.path, path)) {
          callback(event);
        }
      });
    } else {
      // 精确路径监听
      return this.eventBus.on(`variable:changed:${path}`, (event?: VariableChangeEvent) => {
        if (event) callback(event);
      });
    }
  }

  /**
   * 启用或禁用缓存
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
    console.log('[VariableService] 缓存', enabled ? '已启用' : '已禁用');
  }

  /**
   * 设置缓存超时时间
   */
  setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
    console.log('[VariableService] 缓存超时时间设置为:', timeout, 'ms');
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.debug('[VariableService] 缓存已清除');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听全局变量更新事件
    if (typeof window !== 'undefined' && (window as any).tavern_events) {
      const tavernEvents = (window as any).tavern_events;

      // 监听变量更新结束事件
      if (tavernEvents.VARIABLE_UPDATE_ENDED) {
        document.addEventListener(tavernEvents.VARIABLE_UPDATE_ENDED, () => {
          this.clearCache(); // 变量更新后清除缓存
          this.eventBus.emit('variable:tavern-updated');
        });
      }
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(path: string, options: VariableOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${path}:${optionsStr}`;
  }

  /**
   * 使缓存失效
   */
  private invalidateCache(path: string, options: VariableOptions): void {
    const cacheKey = this.getCacheKey(path, options);
    this.cache.delete(cacheKey);

    // 同时清除可能相关的缓存项
    for (const key of this.cache.keys()) {
      if (key.startsWith(path) || key.includes(path)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 检查路径是否匹配模式
   */
  private matchesPattern(path: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.clearCache();
    console.log('[VariableService] 资源清理完成');
  }
}
