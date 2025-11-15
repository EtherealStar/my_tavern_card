import { Container } from 'inversify';
import 'reflect-metadata';
import { TYPES } from './ServiceIdentifiers';

// 导入服务类
import { BattleConfigInitializer } from '同层游玩RPG_remake/services/BattleConfigInitializer';
import { BattleConfigService } from '同层游玩RPG_remake/services/BattleConfigService';
import { BattleEngine } from '同层游玩RPG_remake/services/BattleEngine';
import { BattleResourceService } from '同层游玩RPG_remake/services/BattleResourceService';
import { BattleResultHandler } from '同层游玩RPG_remake/services/BattleResultHandler';
import { BattleService } from '同层游玩RPG_remake/services/BattleService';
import { DynamicEnemyService } from '同层游玩RPG_remake/services/DynamicEnemyService';
import { PhaserManager } from '同层游玩RPG_remake/services/PhaserManager';
import { CommandQueueService } from '../services/CommandQueueService';
import { DomPortalService } from '../services/DomPortalService';
import { GameStateService } from '../services/GameStateService';
import { GlobalStateManager } from '../services/GlobalStateManager';
import { ResponsiveService } from '../services/ResponsiveService';
import { SameLayerService } from '../services/SameLayerService';
import { SaveLoadManagerService } from '../services/SaveLoadManagerService';
import { StatDataBindingService } from '../services/StatDataBindingService';
import { EventBus } from './EventBus';
import { GameCore } from './GameCore';

/**
 * 服务状态枚举
 */
export enum ServiceStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
}

/**
 * 服务健康状态
 */
export interface ServiceHealth {
  status: ServiceStatus;
  lastCheck: Date;
  error?: string;
  dependencies: string[];
}

/**
 * Inversify 容器配置
 * 管理所有服务的依赖注入和状态跟踪
 */
export class ServiceContainer {
  private container: Container;
  private serviceHealth = new Map<string, ServiceHealth>();
  private serviceDependencies = new Map<string, string[]>();

  constructor() {
    this.container = new Container();
    this.configureBindings();
    this.initializeServiceTracking();
  }

  private configureBindings(): void {
    // 核心服务 - 单例
    this.container.bind<EventBus>(TYPES.EventBus).to(EventBus).inSingletonScope();
    this.container.bind<GameCore>(TYPES.GameCore).to(GameCore).inSingletonScope();

    // MVU 相关服务 - 单例
    this.container
      .bind<StatDataBindingService>(TYPES.StatDataBindingService)
      .to(StatDataBindingService)
      .inSingletonScope();

    // 酒馆相关服务 - 单例 (已合并到 SameLayerService)

    // 游戏状态服务 - 单例
    this.container.bind<GameStateService>(TYPES.GameStateService).to(GameStateService).inSingletonScope();
    this.container.bind<SameLayerService>(TYPES.SameLayerService).to(SameLayerService).inSingletonScope();

    // 存档相关服务 - 单例
    this.container
      .bind<SaveLoadManagerService>(TYPES.SaveLoadManagerService)
      .to(SaveLoadManagerService)
      .inSingletonScope();
    // LoadManager功能已整合到useSaveLoad中，不再需要单独绑定

    // 其他服务 - 单例
    this.container.bind<DomPortalService>(TYPES.DomPortalService).to(DomPortalService).inSingletonScope();
    this.container.bind<ResponsiveService>(TYPES.ResponsiveService).to(ResponsiveService).inSingletonScope();
    this.container.bind<GlobalStateManager>(TYPES.GlobalStateManager).to(GlobalStateManager).inSingletonScope();

    // 指令队列服务 - 单例
    this.container.bind<CommandQueueService>(TYPES.CommandQueueService).to(CommandQueueService).inSingletonScope();

    // 战斗相关服务 - 单例
    this.container
      .bind<BattleResourceService>(TYPES.BattleResourceService)
      .to(BattleResourceService)
      .inSingletonScope();
    this.container.bind<BattleConfigService>(TYPES.BattleConfigService).to(BattleConfigService).inSingletonScope();
    this.container
      .bind<BattleConfigInitializer>(TYPES.BattleConfigInitializer)
      .to(BattleConfigInitializer)
      .inSingletonScope();
    this.container.bind<BattleEngine>(TYPES.BattleEngine).to(BattleEngine).inSingletonScope();
    this.container.bind<BattleResultHandler>(TYPES.BattleResultHandler).to(BattleResultHandler).inSingletonScope();
    this.container.bind<BattleService>(TYPES.BattleService).to(BattleService).inSingletonScope();
    this.container.bind<DynamicEnemyService>(TYPES.DynamicEnemyService).to(DynamicEnemyService).inSingletonScope();
    this.container.bind<PhaserManager>(TYPES.PhaserManager).to(PhaserManager).inSingletonScope();
  }

  /**
   * 获取服务实例
   */
  public get<T>(serviceIdentifier: symbol): T {
    return this.container.get<T>(serviceIdentifier);
  }

  /**
   * 检查服务是否已绑定
   */
  public isBound(serviceIdentifier: symbol): boolean {
    return this.container.isBound(serviceIdentifier);
  }

  /**
   * 获取容器实例（用于高级操作）
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * 重新绑定服务（用于测试或动态替换）
   */
  public rebind<T>(serviceIdentifier: symbol, constructor: new (...args: any[]) => T): void {
    this.container.unbind(serviceIdentifier);
    this.container.bind<T>(serviceIdentifier).to(constructor).inSingletonScope();
  }

  /**
   * 初始化服务跟踪
   */
  private initializeServiceTracking(): void {
    // 定义服务依赖关系
    this.serviceDependencies.set('EventBus', []);
    // StatDataBindingService 依赖 MVU 框架，但 MVU 框架在 GameCoreFactory 中等待
    this.serviceDependencies.set('StatDataBindingService', ['EventBus']);
    this.serviceDependencies.set('GameStateService', ['EventBus']);
    this.serviceDependencies.set('SameLayerService', ['EventBus', 'SaveLoadManagerService']);
    this.serviceDependencies.set('SaveLoadManagerService', []);
    // LoadManager功能已整合到useSaveLoad中
    this.serviceDependencies.set('DomPortalService', []);
    this.serviceDependencies.set('GlobalStateManager', []);
    this.serviceDependencies.set('CommandQueueService', ['EventBus', 'StatDataBindingService']);

    // 战斗相关服务依赖
    this.serviceDependencies.set('BattleResourceService', []);
    this.serviceDependencies.set('BattleConfigService', ['BattleResourceService']);
    this.serviceDependencies.set('BattleConfigInitializer', ['BattleConfigService']);
    this.serviceDependencies.set('BattleEngine', ['EventBus']);
    this.serviceDependencies.set('BattleResultHandler', ['EventBus', 'SaveLoadManagerService']);
    this.serviceDependencies.set('BattleService', [
      'EventBus',
      'BattleEngine',
      'BattleResultHandler',
      'SameLayerService',
      'SaveLoadManagerService',
    ]);
    this.serviceDependencies.set('PhaserManager', ['EventBus']);

    this.serviceDependencies.set('GameCore', [
      'EventBus',
      'StatDataBindingService',
      'GameStateService',
      'SameLayerService',
      'SaveLoadManagerService',
      'CommandQueueService',
      'BattleConfigService',
      'BattleService',
      'PhaserManager',
    ]);

    // 初始化所有服务状态
    for (const [serviceName] of this.serviceDependencies) {
      this.serviceHealth.set(serviceName, {
        status: ServiceStatus.UNINITIALIZED,
        lastCheck: new Date(),
        dependencies: this.serviceDependencies.get(serviceName) || [],
      });
    }
  }

  /**
   * 更新服务状态
   */
  public updateServiceStatus(serviceName: string, status: ServiceStatus, error?: string): void {
    const health = this.serviceHealth.get(serviceName);
    if (health) {
      health.status = status;
      health.lastCheck = new Date();
      if (error) {
        health.error = error;
      } else {
        delete health.error;
      }
    }
  }

  /**
   * 获取服务健康状态
   */
  public getServiceHealth(serviceName: string): ServiceHealth | undefined {
    return this.serviceHealth.get(serviceName);
  }

  /**
   * 获取所有服务健康状态
   */
  public getAllServiceHealth(): Map<string, ServiceHealth> {
    return new Map(this.serviceHealth);
  }

  /**
   * 检查服务依赖是否就绪
   */
  public areDependenciesReady(serviceName: string): boolean {
    const dependencies = this.serviceDependencies.get(serviceName) || [];
    return dependencies.every(dep => {
      const health = this.serviceHealth.get(dep);
      return health?.status === ServiceStatus.READY;
    });
  }

  /**
   * 获取服务依赖图
   */
  public getDependencyGraph(): Map<string, string[]> {
    return new Map(this.serviceDependencies);
  }

  /**
   * 健康检查所有服务
   */
  public async healthCheckAll(): Promise<Map<string, ServiceHealth>> {
    const results = new Map<string, ServiceHealth>();

    for (const [serviceName, health] of this.serviceHealth) {
      try {
        // 这里可以添加具体的健康检查逻辑
        // 例如检查服务是否响应、是否有错误等
        const updatedHealth = {
          ...health,
          lastCheck: new Date(),
        };

        results.set(serviceName, updatedHealth);
        this.serviceHealth.set(serviceName, updatedHealth);
      } catch (error) {
        const errorHealth = {
          ...health,
          status: ServiceStatus.ERROR,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : String(error),
        };

        results.set(serviceName, errorHealth);
        this.serviceHealth.set(serviceName, errorHealth);
      }
    }

    return results;
  }

  /**
   * 重启服务
   */
  public async restartService(serviceName: string): Promise<boolean> {
    try {
      // 更新状态为初始化中
      this.updateServiceStatus(serviceName, ServiceStatus.INITIALIZING);

      // 这里可以添加具体的服务重启逻辑
      // 例如重新创建服务实例、重新初始化等

      // 模拟重启过程
      await new Promise(resolve => setTimeout(resolve, 100));

      // 更新状态为就绪
      this.updateServiceStatus(serviceName, ServiceStatus.READY);

      return true;
    } catch (error) {
      this.updateServiceStatus(
        serviceName,
        ServiceStatus.ERROR,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * 获取服务统计信息
   */
  public getServiceStats(): {
    total: number;
    ready: number;
    initializing: number;
    error: number;
    uninitialized: number;
  } {
    const stats = {
      total: this.serviceHealth.size,
      ready: 0,
      initializing: 0,
      error: 0,
      uninitialized: 0,
    };

    for (const health of this.serviceHealth.values()) {
      switch (health.status) {
        case ServiceStatus.READY:
          stats.ready++;
          break;
        case ServiceStatus.INITIALIZING:
          stats.initializing++;
          break;
        case ServiceStatus.ERROR:
          stats.error++;
          break;
        case ServiceStatus.UNINITIALIZED:
          stats.uninitialized++;
          break;
      }
    }

    return stats;
  }
}

// 导出全局容器实例
export const serviceContainer = new ServiceContainer();
