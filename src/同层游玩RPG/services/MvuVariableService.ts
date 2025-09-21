import { EventBus } from '../core/EventBus';

/**
 * MvuVariableService - Mvu变量框架服务
 *
 * 职责：
 * - 基于Mvu变量框架管理游戏变量
 * - 提供类型安全的Mvu变量访问接口
 * - 支持变量变更的事件通知
 * - 处理Mvu数据的读写操作
 */

export interface MvuVariableOptions {
  type?: 'message' | 'chat' | 'character' | 'script' | 'global';
  message_id?: number | 'latest';
  script_id?: string;
}

export interface MvuVariableChangeEvent {
  path: string;
  oldValue: any;
  newValue: any;
  reason?: string;
  timestamp: Date;
}

export class MvuVariableService {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupMvuEventListeners();

    console.log('[MvuVariableService] Mvu变量服务初始化完成');
  }

  /**
   * 获取Mvu数据
   * @param options Mvu变量选项
   */
  getMvuData(options: MvuVariableOptions = {}): Mvu.MvuData {
    try {
      const mvuData = Mvu.getMvuData(options as VariableOption);

      this.eventBus.emit('mvu:data-read', {
        options,
        timestamp: new Date(),
      });

      return mvuData;
    } catch (error) {
      console.error('[MvuVariableService] 获取Mvu数据失败:', error);
      this.eventBus.emit('mvu:error', {
        operation: 'getMvuData',
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 替换Mvu数据
   * @param mvuData 新的Mvu数据
   * @param options Mvu变量选项
   */
  async replaceMvuData(mvuData: Mvu.MvuData, options: MvuVariableOptions = {}): Promise<void> {
    try {
      await Mvu.replaceMvuData(mvuData, options as VariableOption);

      this.eventBus.emit('mvu:data-replaced', {
        mvuData,
        options,
        timestamp: new Date(),
      });

      console.log('[MvuVariableService] Mvu数据已替换');
    } catch (error) {
      console.error('[MvuVariableService] 替换Mvu数据失败:', error);
      this.eventBus.emit('mvu:error', {
        operation: 'replaceMvuData',
        error,
        mvuData,
        options,
      });
      throw error;
    }
  }

  /**
   * 获取Mvu变量值
   * @param path 变量路径
   * @param options 选项
   */
  getMvuVariable<T = any>(
    path: string,
    options: MvuVariableOptions & {
      category?: 'stat' | 'display' | 'delta';
      default_value?: T;
    } = {},
  ): T {
    try {
      const { category = 'stat', default_value, ...mvuOptions } = options;
      const mvuData = this.getMvuData(mvuOptions);

      const value = Mvu.getMvuVariable(mvuData, path, {
        category,
        default_value,
      });

      this.eventBus.emit('mvu:variable-read', {
        path,
        value,
        category,
        timestamp: new Date(),
      });

      return value as T;
    } catch (error) {
      console.error('[MvuVariableService] 获取Mvu变量失败:', path, error);
      this.eventBus.emit('mvu:error', {
        operation: 'getMvuVariable',
        path,
        error,
        options,
      });

      if (options.default_value !== undefined) {
        return options.default_value;
      }
      throw error;
    }
  }

  /**
   * 设置Mvu变量值
   * @param path 变量路径
   * @param value 新值
   * @param options 选项
   */
  async setMvuVariable(
    path: string,
    value: any,
    options: MvuVariableOptions & {
      reason?: string;
      is_recursive?: boolean;
    } = {},
  ): Promise<boolean> {
    try {
      const { reason = '手动设置', is_recursive = false, ...mvuOptions } = options;
      const mvuData = this.getMvuData(mvuOptions);

      // 获取旧值
      const oldValue = Mvu.getMvuVariable(mvuData, path, { default_value: undefined });

      // 设置新值
      const success = await Mvu.setMvuVariable(mvuData, path, value, {
        reason,
        is_recursive,
      });

      if (success) {
        // 替换Mvu数据
        await this.replaceMvuData(mvuData, mvuOptions);

        // 发送变更事件
        const changeEvent: MvuVariableChangeEvent = {
          path,
          oldValue,
          newValue: value,
          reason,
          timestamp: new Date(),
        };

        this.eventBus.emit('mvu:variable-changed', changeEvent);
        this.eventBus.emit(`mvu:variable-changed:${path}`, changeEvent);

        console.debug('[MvuVariableService] Mvu变量已设置:', path, '从', oldValue, '到', value);
      }

      return success;
    } catch (error) {
      console.error('[MvuVariableService] 设置Mvu变量失败:', path, error);
      this.eventBus.emit('mvu:error', {
        operation: 'setMvuVariable',
        path,
        value,
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 批量设置Mvu变量
   * @param updates 变量更新对象
   * @param options 选项
   */
  async setMultipleMvuVariables(
    updates: Record<string, any>,
    options: MvuVariableOptions & {
      reason?: string;
      is_recursive?: boolean;
    } = {},
  ): Promise<void> {
    try {
      const { reason = '批量设置', is_recursive = false, ...mvuOptions } = options;
      const mvuData = this.getMvuData(mvuOptions);
      const changes: MvuVariableChangeEvent[] = [];

      // 批量设置变量
      for (const [path, newValue] of Object.entries(updates)) {
        const oldValue = Mvu.getMvuVariable(mvuData, path, { default_value: undefined });

        const success = await Mvu.setMvuVariable(mvuData, path, newValue, {
          reason,
          is_recursive,
        });

        if (success) {
          changes.push({
            path,
            oldValue,
            newValue,
            reason,
            timestamp: new Date(),
          });
        }
      }

      // 替换Mvu数据
      await this.replaceMvuData(mvuData, mvuOptions);

      // 发送批量变更事件
      this.eventBus.emit('mvu:batch-changed', {
        changes,
        options,
        timestamp: new Date(),
      });

      // 发送单个变更事件
      for (const change of changes) {
        this.eventBus.emit('mvu:variable-changed', change);
        this.eventBus.emit(`mvu:variable-changed:${change.path}`, change);
      }

      console.debug('[MvuVariableService] 批量Mvu变量设置完成:', Object.keys(updates));
    } catch (error) {
      console.error('[MvuVariableService] 批量设置Mvu变量失败:', updates, error);
      this.eventBus.emit('mvu:error', {
        operation: 'setMultipleMvuVariables',
        updates,
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 解析消息中的变量更新命令
   * @param message 包含_.set()命令的消息
   * @param options 选项
   */
  async parseMessage(message: string, options: MvuVariableOptions = {}): Promise<Mvu.MvuData | undefined> {
    try {
      const oldData = this.getMvuData(options);
      const newData = await Mvu.parseMessage(message, oldData);

      if (newData) {
        await this.replaceMvuData(newData, options);

        this.eventBus.emit('mvu:message-parsed', {
          message,
          oldData,
          newData,
          options,
          timestamp: new Date(),
        });

        console.log('[MvuVariableService] 消息解析完成');
      }

      return newData;
    } catch (error) {
      console.error('[MvuVariableService] 解析消息失败:', error);
      this.eventBus.emit('mvu:error', {
        operation: 'parseMessage',
        message,
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 重新加载初始变量数据
   * @param options 选项
   */
  async reloadInitVar(options: MvuVariableOptions = {}): Promise<boolean> {
    try {
      const mvuData = this.getMvuData(options);
      const success = await Mvu.reloadInitVar(mvuData);

      if (success) {
        await this.replaceMvuData(mvuData, options);

        this.eventBus.emit('mvu:init-var-reloaded', {
          mvuData,
          options,
          timestamp: new Date(),
        });

        console.log('[MvuVariableService] 初始变量数据已重新加载');
      }

      return success;
    } catch (error) {
      console.error('[MvuVariableService] 重新加载初始变量失败:', error);
      this.eventBus.emit('mvu:error', {
        operation: 'reloadInitVar',
        error,
        options,
      });
      return false;
    }
  }

  /**
   * 监听Mvu变量变更
   * @param path 变量路径，支持通配符
   * @param callback 回调函数
   * @returns 取消监听的函数
   */
  onMvuVariableChange(path: string, callback: (event: MvuVariableChangeEvent) => void): () => void {
    if (path.includes('*')) {
      // 通配符监听
      return this.eventBus.on('mvu:variable-changed', (event?: MvuVariableChangeEvent) => {
        if (event && this.matchesPattern(event.path, path)) {
          callback(event);
        }
      });
    } else {
      // 精确路径监听
      return this.eventBus.on(`mvu:variable-changed:${path}`, (event?: MvuVariableChangeEvent) => {
        if (event) callback(event);
      });
    }
  }

  /**
   * 获取游戏状态数据
   */
  getGameStateData(options: MvuVariableOptions = {}): any {
    try {
      const mvuData = this.getMvuData(options);
      return mvuData.stat_data || {};
    } catch (error) {
      console.error('[MvuVariableService] 获取游戏状态数据失败:', error);
      return {};
    }
  }

  /**
   * 设置游戏状态数据
   * @param gameState 游戏状态
   * @param options 选项
   */
  async setGameStateData(gameState: any, options: MvuVariableOptions & { reason?: string } = {}): Promise<void> {
    try {
      const { reason = '设置游戏状态', ...mvuOptions } = options;
      const mvuData = this.getMvuData(mvuOptions);

      // 设置stat_data
      await Mvu.setMvuVariable(mvuData, 'rpg_game', gameState, { reason });

      // 替换Mvu数据
      await this.replaceMvuData(mvuData, mvuOptions);

      this.eventBus.emit('mvu:game-state-set', {
        gameState,
        options,
        timestamp: new Date(),
      });

      console.log('[MvuVariableService] 游戏状态数据已设置');
    } catch (error) {
      console.error('[MvuVariableService] 设置游戏状态数据失败:', error);
      throw error;
    }
  }

  /**
   * 设置Mvu事件监听器
   */
  private setupMvuEventListeners(): void {
    // 检查Mvu是否可用
    if (typeof Mvu === 'undefined') {
      console.warn('[MvuVariableService] Mvu变量框架未加载');
      return;
    }

    // 监听Mvu事件
    try {
      // 变量更新开始事件
      document.addEventListener(Mvu.events.VARIABLE_UPDATE_STARTED, (event: any) => {
        this.eventBus.emit('mvu:update-started', {
          variables: event.detail,
          timestamp: new Date(),
        });
      });

      // 单个变量更新事件
      document.addEventListener(Mvu.events.SINGLE_VARIABLE_UPDATED, (event: any) => {
        const { stat_data, path, old_value, new_value } = event.detail;

        this.eventBus.emit('mvu:single-variable-updated', {
          stat_data,
          path,
          oldValue: old_value,
          newValue: new_value,
          timestamp: new Date(),
        });
      });

      // 变量更新结束事件
      document.addEventListener(Mvu.events.VARIABLE_UPDATE_ENDED, (event: any) => {
        this.eventBus.emit('mvu:update-ended', {
          variables: event.detail,
          timestamp: new Date(),
        });
      });

      console.log('[MvuVariableService] Mvu事件监听器已设置');
    } catch (error) {
      console.error('[MvuVariableService] 设置Mvu事件监听器失败:', error);
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
    console.log('[MvuVariableService] 资源清理完成');
  }
}
