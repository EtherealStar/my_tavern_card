/**
 * EventBus - 事件总线
 * 
 * 职责：
 * - 组件间松耦合通信机制
 * - 支持命名空间和通配符事件
 * - 提供事件监听和发送的调试功能
 * - 支持一次性监听和条件监听
 */

export type Listener<T = any> = (payload?: T) => void | Promise<void>;

export interface EventMetadata {
  eventName: string;
  listenerCount: number;
  emitCount: number;
  lastEmittedAt?: Date;
  namespace?: string;
}

export interface EventBusOptions {
  debug?: boolean;
  maxListeners?: number;
  enableNamespaces?: boolean;
}

export class EventBus {
  private listeners = new Map<string, Set<Listener>>();
  private onceListeners = new Map<string, Set<Listener>>();
  private metadata = new Map<string, EventMetadata>();
  private options: Required<EventBusOptions>;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      debug: false,
      maxListeners: 100,
      enableNamespaces: true,
      ...options
    };

    if (this.options.debug) {
      console.log('[EventBus] 事件总线初始化完成', this.options);
    }
  }

  /**
   * 监听事件
   * @param event 事件名称，支持通配符 * 和命名空间
   * @param fn 监听器函数
   * @returns 取消监听的函数
   */
  on<T = any>(event: string, fn: Listener<T>): () => void {
    this.addListener(event, fn, false);
    return () => this.off(event, fn);
  }

  /**
   * 一次性监听事件
   * @param event 事件名称
   * @param fn 监听器函数
   * @returns 取消监听的函数
   */
  once<T = any>(event: string, fn: Listener<T>): () => void {
    this.addListener(event, fn, true);
    return () => this.off(event, fn);
  }

  /**
   * 取消监听事件
   * @param event 事件名称
   * @param fn 监听器函数
   */
  off<T = any>(event: string, fn: Listener<T>): void {
    // 从普通监听器中移除
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(fn);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }

    // 从一次性监听器中移除
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      onceListeners.delete(fn);
      if (onceListeners.size === 0) {
        this.onceListeners.delete(event);
      }
    }

    // 更新元数据
    this.updateListenerMetadata(event);

    if (this.options.debug) {
      console.debug(`[EventBus] 取消监听: ${event}`);
    }
  }

  /**
   * 发送事件
   * @param event 事件名称
   * @param payload 事件载荷
   */
  async emit<T = any>(event: string, payload?: T): Promise<void> {
    if (this.options.debug) {
      console.debug(`[EventBus] 发送事件: ${event}`, payload);
    }

    // 更新发送元数据
    this.updateEmitMetadata(event);

    // 获取所有匹配的监听器
    const matchingListeners = this.getMatchingListeners(event);
    
    if (matchingListeners.length === 0 && this.options.debug) {
      console.debug(`[EventBus] 没有监听器处理事件: ${event}`);
      return;
    }

    // 执行所有监听器
    const promises: Promise<void>[] = [];
    
    for (const { listener, isOnce } of matchingListeners) {
      try {
        const result = listener(payload);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        console.error(`[EventBus] 监听器执行错误 (${event}):`, error);
        this.emit('error:listener', { event, error, payload });
      }
    }

    // 等待所有异步监听器完成
    if (promises.length > 0) {
      try {
        await Promise.all(promises);
      } catch (error) {
        console.error(`[EventBus] 异步监听器执行错误 (${event}):`, error);
        this.emit('error:async-listener', { event, error, payload });
      }
    }

    // 移除一次性监听器
    this.removeOnceListeners(event);
  }

  /**
   * 发送同步事件（不等待异步监听器）
   */
  emitSync<T = any>(event: string, payload?: T): void {
    if (this.options.debug) {
      console.debug(`[EventBus] 发送同步事件: ${event}`, payload);
    }

    this.updateEmitMetadata(event);
    const matchingListeners = this.getMatchingListeners(event);
    
    for (const { listener, isOnce } of matchingListeners) {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[EventBus] 同步监听器执行错误 (${event}):`, error);
      }
    }

    this.removeOnceListeners(event);
  }

  /**
   * 移除所有监听器
   * @param event 可选，指定要移除的事件，不指定则移除所有
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
      this.metadata.delete(event);
      
      if (this.options.debug) {
        console.debug(`[EventBus] 移除所有监听器: ${event}`);
      }
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
      this.metadata.clear();
      
      if (this.options.debug) {
        console.debug('[EventBus] 移除所有监听器');
      }
    }
  }

  /**
   * 获取事件的监听器数量
   */
  listenerCount(event: string): number {
    const regular = this.listeners.get(event)?.size || 0;
    const once = this.onceListeners.get(event)?.size || 0;
    return regular + once;
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    const names = new Set<string>();
    this.listeners.forEach((_, event) => names.add(event));
    this.onceListeners.forEach((_, event) => names.add(event));
    return Array.from(names);
  }

  /**
   * 获取事件统计信息
   */
  getStatistics(): {
    totalEvents: number;
    totalListeners: number;
    eventDetails: EventMetadata[];
  } {
    const eventDetails = Array.from(this.metadata.values());
    const totalListeners = eventDetails.reduce((sum, meta) => sum + meta.listenerCount, 0);

    return {
      totalEvents: this.metadata.size,
      totalListeners,
      eventDetails
    };
  }

  /**
   * 设置调试模式
   */
  setDebug(enabled: boolean): void {
    this.options.debug = enabled;
    if (enabled) {
      console.log('[EventBus] 调试模式已启用');
    }
  }

  /**
   * 打印调试信息
   */
  printDebugInfo(): void {
    console.group('[EventBus] 调试信息');
    
    const stats = this.getStatistics();
    console.log('总事件数:', stats.totalEvents);
    console.log('总监听器数:', stats.totalListeners);
    
    if (stats.eventDetails.length > 0) {
      console.table(stats.eventDetails.map(meta => ({
        事件名: meta.eventName,
        监听器数: meta.listenerCount,
        发送次数: meta.emitCount,
        最后发送: meta.lastEmittedAt?.toLocaleString() || '从未',
        命名空间: meta.namespace || '无'
      })));
    }
    
    console.groupEnd();
  }

  /**
   * 添加监听器
   */
  private addListener(event: string, fn: Listener, isOnce: boolean): void {
    // 检查监听器数量限制
    const currentCount = this.listenerCount(event);
    if (currentCount >= this.options.maxListeners) {
      console.warn(`[EventBus] 事件 ${event} 的监听器数量已达到上限 (${this.options.maxListeners})`);
      return;
    }

    // 添加到对应的监听器集合
    const targetMap = isOnce ? this.onceListeners : this.listeners;
    if (!targetMap.has(event)) {
      targetMap.set(event, new Set());
    }
    targetMap.get(event)!.add(fn);

    // 更新元数据
    this.updateListenerMetadata(event);

    if (this.options.debug) {
      console.debug(`[EventBus] 添加${isOnce ? '一次性' : ''}监听器: ${event}`);
    }
  }

  /**
   * 获取匹配的监听器
   */
  private getMatchingListeners(event: string): Array<{ listener: Listener; isOnce: boolean }> {
    const result: Array<{ listener: Listener; isOnce: boolean }> = [];

    // 精确匹配
    const exactListeners = this.listeners.get(event);
    if (exactListeners) {
      exactListeners.forEach(listener => {
        result.push({ listener, isOnce: false });
      });
    }

    const exactOnceListeners = this.onceListeners.get(event);
    if (exactOnceListeners) {
      exactOnceListeners.forEach(listener => {
        result.push({ listener, isOnce: true });
      });
    }

    // 通配符匹配（如果启用命名空间）
    if (this.options.enableNamespaces) {
      this.addWildcardMatches(event, result);
    }

    return result;
  }

  /**
   * 添加通配符匹配的监听器
   */
  private addWildcardMatches(event: string, result: Array<{ listener: Listener; isOnce: boolean }>): void {
    // 处理 namespace:* 模式
    const namespace = event.split(':')[0];
    const wildcardPattern = `${namespace}:*`;
    
    const wildcardListeners = this.listeners.get(wildcardPattern);
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => {
        result.push({ listener, isOnce: false });
      });
    }

    const wildcardOnceListeners = this.onceListeners.get(wildcardPattern);
    if (wildcardOnceListeners) {
      wildcardOnceListeners.forEach(listener => {
        result.push({ listener, isOnce: true });
      });
    }

    // 处理 * 通用通配符
    const universalListeners = this.listeners.get('*');
    if (universalListeners) {
      universalListeners.forEach(listener => {
        result.push({ listener, isOnce: false });
      });
    }

    const universalOnceListeners = this.onceListeners.get('*');
    if (universalOnceListeners) {
      universalOnceListeners.forEach(listener => {
        result.push({ listener, isOnce: true });
      });
    }
  }

  /**
   * 移除一次性监听器
   */
  private removeOnceListeners(event: string): void {
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners && onceListeners.size > 0) {
      this.onceListeners.delete(event);
      this.updateListenerMetadata(event);
    }
  }

  /**
   * 更新监听器元数据
   */
  private updateListenerMetadata(event: string): void {
    const listenerCount = this.listenerCount(event);
    const existing = this.metadata.get(event);
    
    if (existing) {
      existing.listenerCount = listenerCount;
    } else {
      this.metadata.set(event, {
        eventName: event,
        listenerCount,
        emitCount: 0,
        namespace: this.extractNamespace(event)
      });
    }
  }

  /**
   * 更新发送元数据
   */
  private updateEmitMetadata(event: string): void {
    const existing = this.metadata.get(event);
    if (existing) {
      existing.emitCount++;
      existing.lastEmittedAt = new Date();
    } else {
      this.metadata.set(event, {
        eventName: event,
        listenerCount: this.listenerCount(event),
        emitCount: 1,
        lastEmittedAt: new Date(),
        namespace: this.extractNamespace(event)
      });
    }
  }

  /**
   * 提取命名空间
   */
  private extractNamespace(event: string): string | undefined {
    const parts = event.split(':');
    return parts.length > 1 ? parts[0] : undefined;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.removeAllListeners();
    console.log('[EventBus] 资源清理完成');
  }
}
