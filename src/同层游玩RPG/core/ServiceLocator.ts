/**
 * ServiceLocator - 服务定位器
 * 
 * 职责：
 * - 中央服务注册和获取机制
 * - 支持依赖注入和服务生命周期管理
 * - 提供服务的懒加载和单例管理
 * - 支持服务的调试和监控
 */

export interface ServiceDefinition<T = any> {
  instance?: T;
  factory?: () => T | Promise<T>;
  singleton?: boolean;
  dependencies?: string[];
  initialized?: boolean;
}

export interface ServiceMetadata {
  name: string;
  registeredAt: Date;
  resolveCount: number;
  lastResolvedAt?: Date;
  type: 'instance' | 'factory' | 'singleton';
}

export class ServiceLocator {
  private static services = new Map<string, ServiceDefinition>();
  private static metadata = new Map<string, ServiceMetadata>();
  private static debug = false;

  /**
   * 启用或禁用调试模式
   */
  static setDebug(enabled: boolean): void {
    this.debug = enabled;
    if (enabled) {
      console.log('[ServiceLocator] 调试模式已启用');
    }
  }

  /**
   * 注册服务实例
   */
  static register<T>(key: string, service: T): void {
    if (this.services.has(key)) {
      console.warn(`[ServiceLocator] 覆盖服务: ${key}`);
    }

    this.services.set(key, { 
      instance: service, 
      singleton: true,
      initialized: true
    });

    this.metadata.set(key, {
      name: key,
      registeredAt: new Date(),
      resolveCount: 0,
      type: 'instance'
    });

    if (this.debug) {
      console.log(`[ServiceLocator] 注册服务实例: ${key}`, service);
    }
  }

  /**
   * 注册服务工厂
   */
  static registerFactory<T>(
    key: string, 
    factory: () => T | Promise<T>,
    options: { singleton?: boolean; dependencies?: string[] } = {}
  ): void {
    const { singleton = true, dependencies = [] } = options;

    if (this.services.has(key)) {
      console.warn(`[ServiceLocator] 覆盖服务: ${key}`);
    }

    this.services.set(key, {
      factory,
      singleton,
      dependencies,
      initialized: false
    });

    this.metadata.set(key, {
      name: key,
      registeredAt: new Date(),
      resolveCount: 0,
      type: singleton ? 'singleton' : 'factory'
    });

    if (this.debug) {
      console.log(`[ServiceLocator] 注册服务工厂: ${key}`, { singleton, dependencies });
    }
  }

  /**
   * 解析服务
   */
  static resolve<T>(key: string): T {
    const definition = this.services.get(key);
    if (!definition) {
      throw new Error(`[ServiceLocator] 未注册服务: ${key}`);
    }

    const metadata = this.metadata.get(key)!;
    metadata.resolveCount++;
    metadata.lastResolvedAt = new Date();

    // 如果已经有实例且是单例，直接返回
    if (definition.instance && definition.singleton) {
      if (this.debug) {
        console.log(`[ServiceLocator] 解析服务实例 (缓存): ${key}`);
      }
      return definition.instance as T;
    }

    // 如果有工厂方法，使用工厂创建
    if (definition.factory) {
      if (this.debug) {
        console.log(`[ServiceLocator] 解析服务 (工厂): ${key}`);
      }

      // 解析依赖
      const dependencies = this.resolveDependencies(definition.dependencies || []);
      
      try {
        const instance = definition.factory();
        
        // 如果是Promise，需要特殊处理
        if (instance instanceof Promise) {
          throw new Error(`[ServiceLocator] 异步工厂暂不支持同步解析: ${key}`);
        }

        // 如果是单例，缓存实例
        if (definition.singleton) {
          definition.instance = instance;
          definition.initialized = true;
        }

        return instance as T;
      } catch (error) {
        console.error(`[ServiceLocator] 服务工厂创建失败: ${key}`, error);
        throw error;
      }
    }

    throw new Error(`[ServiceLocator] 服务定义无效: ${key}`);
  }

  /**
   * 异步解析服务
   */
  static async resolveAsync<T>(key: string): Promise<T> {
    const definition = this.services.get(key);
    if (!definition) {
      throw new Error(`[ServiceLocator] 未注册服务: ${key}`);
    }

    const metadata = this.metadata.get(key)!;
    metadata.resolveCount++;
    metadata.lastResolvedAt = new Date();

    // 如果已经有实例且是单例，直接返回
    if (definition.instance && definition.singleton) {
      if (this.debug) {
        console.log(`[ServiceLocator] 异步解析服务实例 (缓存): ${key}`);
      }
      return definition.instance as T;
    }

    // 如果有工厂方法，使用工厂创建
    if (definition.factory) {
      if (this.debug) {
        console.log(`[ServiceLocator] 异步解析服务 (工厂): ${key}`);
      }

      // 解析依赖
      const dependencies = await this.resolveDependenciesAsync(definition.dependencies || []);
      
      try {
        const instance = await definition.factory();

        // 如果是单例，缓存实例
        if (definition.singleton) {
          definition.instance = instance;
          definition.initialized = true;
        }

        return instance as T;
      } catch (error) {
        console.error(`[ServiceLocator] 异步服务工厂创建失败: ${key}`, error);
        throw error;
      }
    }

    throw new Error(`[ServiceLocator] 服务定义无效: ${key}`);
  }

  /**
   * 检查服务是否已注册
   */
  static has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * 检查服务是否已初始化
   */
  static isInitialized(key: string): boolean {
    const definition = this.services.get(key);
    return definition ? definition.initialized === true : false;
  }

  /**
   * 获取所有已注册的服务名称
   */
  static getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * 获取服务元数据
   */
  static getServiceMetadata(key: string): ServiceMetadata | undefined {
    return this.metadata.get(key);
  }

  /**
   * 获取所有服务的统计信息
   */
  static getStatistics(): {
    totalServices: number;
    initializedServices: number;
    serviceDetails: ServiceMetadata[];
  } {
    const serviceDetails = Array.from(this.metadata.values());
    const initializedServices = Array.from(this.services.values())
      .filter(def => def.initialized).length;

    return {
      totalServices: this.services.size,
      initializedServices,
      serviceDetails
    };
  }

  /**
   * 注销服务
   */
  static unregister(key: string): boolean {
    if (!this.services.has(key)) {
      return false;
    }

    const definition = this.services.get(key);
    
    // 如果服务有清理方法，调用它
    if (definition?.instance && typeof definition.instance === 'object') {
      const service = definition.instance as any;
      if (typeof service.cleanup === 'function') {
        try {
          service.cleanup();
        } catch (error) {
          console.warn(`[ServiceLocator] 服务清理失败: ${key}`, error);
        }
      }
    }

    this.services.delete(key);
    this.metadata.delete(key);

    if (this.debug) {
      console.log(`[ServiceLocator] 注销服务: ${key}`);
    }

    return true;
  }

  /**
   * 重置所有服务
   */
  static reset(): void {
    // 清理所有服务
    for (const key of this.services.keys()) {
      this.unregister(key);
    }

    console.log('[ServiceLocator] 所有服务已重置');
  }

  /**
   * 解析依赖（同步）
   */
  private static resolveDependencies(dependencies: string[]): any[] {
    return dependencies.map(dep => {
      if (!this.has(dep)) {
        throw new Error(`[ServiceLocator] 依赖服务未注册: ${dep}`);
      }
      return this.resolve(dep);
    });
  }

  /**
   * 解析依赖（异步）
   */
  private static async resolveDependenciesAsync(dependencies: string[]): Promise<any[]> {
    const resolved = [];
    for (const dep of dependencies) {
      if (!this.has(dep)) {
        throw new Error(`[ServiceLocator] 依赖服务未注册: ${dep}`);
      }
      resolved.push(await this.resolveAsync(dep));
    }
    return resolved;
  }

  /**
   * 打印服务调试信息
   */
  static printDebugInfo(): void {
    console.group('[ServiceLocator] 调试信息');
    
    const stats = this.getStatistics();
    console.log('总服务数:', stats.totalServices);
    console.log('已初始化服务数:', stats.initializedServices);
    
    console.table(stats.serviceDetails.map(meta => ({
      服务名: meta.name,
      类型: meta.type,
      注册时间: meta.registeredAt.toLocaleString(),
      解析次数: meta.resolveCount,
      最后解析: meta.lastResolvedAt?.toLocaleString() || '从未'
    })));
    
    console.groupEnd();
  }
}
