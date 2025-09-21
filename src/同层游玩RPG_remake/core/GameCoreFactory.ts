import 'reflect-metadata';
import { serviceContainer } from './Container';
import { GameCore } from './GameCore';
import { TYPES } from './ServiceIdentifiers';

/**
 * 服务初始化阶段
 */
export enum InitializationStage {
  BASIC = 'basic', // 基础服务
  DATA = 'data', // 数据服务（使用 waitGlobalInitialized 等待 MVU）
  BUSINESS = 'business', // 业务服务
  ADVANCED = 'advanced', // 高级服务
}

/**
 * 服务预初始化管理器
 * 负责分阶段初始化所有服务，确保在Vue挂载前所有服务就绪
 */
export class GameCoreFactory {
  private static instance: GameCore | null = null;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * 获取 GameCore 实例（单例模式）
   */
  public static getInstance(): GameCore {
    if (!GameCoreFactory.instance) {
      GameCoreFactory.instance = serviceContainer.get<GameCore>(TYPES.GameCore);
    }
    return GameCoreFactory.instance;
  }

  /**
   * 创建新的 GameCore 实例
   */
  public static create(): GameCore {
    return serviceContainer.get<GameCore>(TYPES.GameCore);
  }

  /**
   * 重置实例（主要用于测试）
   */
  public static reset(): void {
    GameCoreFactory.instance = null;
    GameCoreFactory.initializationPromise = null;
  }

  /**
   * 分阶段初始化所有服务
   */
  public static async initializeWithStages(): Promise<void> {
    if (GameCoreFactory.initializationPromise) {
      return GameCoreFactory.initializationPromise;
    }

    GameCoreFactory.initializationPromise = GameCoreFactory.performInitialization();
    return GameCoreFactory.initializationPromise;
  }

  /**
   * 执行分阶段初始化
   */
  private static async performInitialization(): Promise<void> {
    try {
      // 第一阶段：基础服务
      await GameCoreFactory.initializeBasicServices();

      // 第二阶段：数据服务（使用 waitGlobalInitialized 等待 MVU）
      await GameCoreFactory.initializeDataServices();

      // 第三阶段：业务服务
      await GameCoreFactory.initializeBusinessServices();

      // 第四阶段：高级服务
      await GameCoreFactory.initializeAdvancedServices();
    } catch (error) {
      console.error('[GameCoreFactory] 服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 第一阶段：基础服务初始化
   */
  private static async initializeBasicServices(): Promise<void> {
    const gameCore = GameCoreFactory.getInstance();
    await gameCore.initializeBasicServices();
  }

  /**
   * 第二阶段：数据服务初始化（使用 waitGlobalInitialized 等待 MVU）
   */
  private static async initializeDataServices(): Promise<void> {
    // 使用 waitGlobalInitialized 优雅等待 MVU 框架初始化
    try {
      await waitGlobalInitialized('Mvu');
    } catch (error) {
      console.warn('[GameCoreFactory] 等待MVU框架初始化失败:', error);
    }

    const gameCore = GameCoreFactory.getInstance();
    await gameCore.initializeDataServices();
  }

  /**
   * 第三阶段：业务服务初始化
   */
  private static async initializeBusinessServices(): Promise<void> {
    const gameCore = GameCoreFactory.getInstance();
    await gameCore.initializeBusinessServices();
  }

  /**
   * 第四阶段：高级服务初始化
   */
  private static async initializeAdvancedServices(): Promise<void> {
    const gameCore = GameCoreFactory.getInstance();
    await gameCore.initializeAdvancedServices();
  }
}

// 导出全局实例以保持向后兼容
export const gameRemakeCore = GameCoreFactory.getInstance();
