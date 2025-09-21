import { CreationController } from '../controllers/CreationController';
import { PlayController } from '../controllers/PlayController';
import { StartController } from '../controllers/StartController';
import { AchievementService } from '../services/AchievementService';
import { MvuVariableService } from '../services/MvuVariableService';
import { SameLayerService } from '../services/SameLayerService';
import { WorldbookService } from '../services/WorldbookService';
import { EventBus } from './EventBus';
import { ServiceLocator } from './ServiceLocator';
import { StateManager } from './StateManager';

/**
 * GameCore - 游戏中央协调器
 *
 * 职责：
 * - 管理游戏组件的初始化和生命周期
 * - 协调各个子系统的启动和关闭
 * - 处理全局错误和异常
 * - 提供统一的游戏入口点
 */
export class GameCore {
  private static instance: GameCore | null = null;
  private initialized = false;
  private mounted = false;
  private currentController: any = null;

  private constructor() {
    // 私有构造函数，确保单例
  }

  /**
   * 获取GameCore实例（单例模式）
   */
  static getInstance(): GameCore {
    if (!GameCore.instance) {
      GameCore.instance = new GameCore();
    }
    return GameCore.instance;
  }

  /**
   * 初始化游戏核心系统
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.warn('[GameCore] 系统已经初始化');
      return;
    }

    try {
      console.log('[GameCore] 开始初始化系统...');

      // 1. 初始化事件总线
      const eventBus = new EventBus({ debug: true }); // 开启调试模式
      ServiceLocator.register('eventBus', eventBus);

      // 2. 初始化状态管理器
      const stateManager = new StateManager(eventBus);
      ServiceLocator.register('stateManager', stateManager);

      // 3. 初始化各种服务
      await this.initializeServices(eventBus);

      // 4. 注册全局事件监听器
      this.registerGlobalEvents(eventBus);

      // 5. 设置错误处理
      this.setupErrorHandling();

      this.initialized = true;
      console.log('[GameCore] 系统初始化完成');

      // 发送初始化完成事件
      eventBus.emit('core:initialized');
    } catch (error) {
      console.error('[GameCore] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 挂载游戏到指定DOM元素
   */
  async mount(selector: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('[GameCore] 系统未初始化，请先调用 init()');
    }

    if (this.mounted) {
      console.warn('[GameCore] 游戏已经挂载');
      return;
    }

    try {
      console.log('[GameCore] 挂载游戏到:', selector);

      const eventBus = ServiceLocator.resolve<EventBus>('eventBus');
      const stateManager = ServiceLocator.resolve<StateManager>('stateManager');

      // 监听状态变化并重新渲染
      eventBus.on('state:changed', () => {
        this.render(selector);
      });

      // 初始渲染
      this.render(selector);

      this.mounted = true;
      eventBus.emit('core:mounted', { selector });
    } catch (error) {
      console.error('[GameCore] 挂载失败:', error);
      throw error;
    }
  }

  /**
   * 卸载游戏
   */
  async unmount(): Promise<void> {
    if (!this.mounted) {
      return;
    }

    try {
      console.log('[GameCore] 卸载游戏...');

      const eventBus = ServiceLocator.resolve<EventBus>('eventBus');

      // 卸载当前控制器
      if (this.currentController && typeof this.currentController.unmount === 'function') {
        await this.currentController.unmount();
      }

      // 清理服务
      await this.cleanupServices();

      this.mounted = false;
      eventBus.emit('core:unmounted');

      console.log('[GameCore] 游戏卸载完成');
    } catch (error) {
      console.error('[GameCore] 卸载失败:', error);
    }
  }

  /**
   * 渲染当前游戏状态
   */
  private render(selector: string): void {
    try {
      const stateManager = ServiceLocator.resolve<StateManager>('stateManager');
      const gameState = stateManager.getState();

      // 卸载当前控制器
      if (this.currentController && typeof this.currentController.unmount === 'function') {
        this.currentController.unmount();
      }

      // 根据游戏阶段选择对应的控制器
      switch (gameState.phase) {
        case 'start':
          this.currentController = new StartController();
          break;
        case 'creation':
          this.currentController = new CreationController();
          break;
        case 'playing':
          this.currentController = new PlayController();
          break;
        default:
          console.warn('[GameCore] 未知的游戏阶段:', gameState.phase);
          this.currentController = new StartController();
      }

      // 挂载新控制器
      if (this.currentController && typeof this.currentController.mount === 'function') {
        this.currentController.mount(selector);
      }
    } catch (error) {
      console.error('[GameCore] 渲染失败:', error);
      this.handleRenderError(selector, error);
    }
  }

  /**
   * 初始化各种服务
   */
  private async initializeServices(eventBus: EventBus): Promise<void> {
    // 直接实例化服务
    const mvuVariableService = new MvuVariableService(eventBus);
    const sameLayerService = new SameLayerService(eventBus);
    const worldbookService = new WorldbookService(eventBus);
    const achievementService = new AchievementService(eventBus);

    // 注册服务
    ServiceLocator.register('mvuVariableService', mvuVariableService);
    ServiceLocator.register('sameLayerService', sameLayerService);
    ServiceLocator.register('worldbookService', worldbookService);
    ServiceLocator.register('achievementService', achievementService);

    console.log('[GameCore] 服务初始化完成');
  }

  /**
   * 注册全局事件监听器
   */
  private registerGlobalEvents(eventBus: EventBus): void {
    // 监听错误事件
    eventBus.on('error:*', error => {
      console.error('[GameCore] 捕获到错误:', error);
      this.handleError(error);
    });

    // 监听调试事件
    eventBus.on('debug:*', data => {
      console.debug('[GameCore] 调试信息:', data);
    });

    // 监听性能事件
    eventBus.on('perf:*', data => {
      console.log('[GameCore] 性能信息:', data);
    });
  }

  /**
   * 设置全局错误处理
   */
  private setupErrorHandling(): void {
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', event => {
      console.error('[GameCore] 未处理的Promise拒绝:', event.reason);
      this.handleError(event.reason);
      event.preventDefault();
    });

    // 捕获全局错误
    window.addEventListener('error', event => {
      console.error('[GameCore] 全局错误:', event.error);
      this.handleError(event.error);
    });
  }

  /**
   * 处理渲染错误
   */
  private handleRenderError(selector: string, error: any): void {
    try {
      $(selector).html(`
        <div class="error-container" style="padding: 20px; text-align: center; color: #ff6b6b;">
          <h3>渲染错误</h3>
          <p>游戏渲染时发生错误，请刷新页面重试</p>
          <details style="margin-top: 10px; text-align: left;">
            <summary>错误详情</summary>
            <pre style="background: #f8f8f8; padding: 10px; margin-top: 10px; border-radius: 4px;">${
              error.stack || error.message || String(error)
            }</pre>
          </details>
          <button onclick="window.location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            刷新页面
          </button>
        </div>
      `);
    } catch (e) {
      console.error('[GameCore] 错误处理失败:', e);
    }
  }

  /**
   * 通用错误处理
   */
  private handleError(error: any): void {
    // 这里可以添加错误上报、用户通知等逻辑
    if (typeof toastr !== 'undefined') {
      toastr.error('发生了一个错误，请查看控制台获取详细信息');
    }
  }

  /**
   * 清理服务
   */
  private async cleanupServices(): Promise<void> {
    try {
      // 获取所有需要清理的服务
      const services = ['mvuVariableService', 'sameLayerService', 'worldbookService', 'achievementService'];

      // 清理每个服务
      for (const serviceName of services) {
        try {
          if (ServiceLocator.has(serviceName)) {
            const service = ServiceLocator.resolve(serviceName);
            if (service && typeof service.cleanup === 'function') {
              await service.cleanup();
            }
          }
        } catch (error) {
          console.warn(`[GameCore] 清理服务 ${serviceName} 时出错:`, error);
        }
      }

      console.log('[GameCore] 服务清理完成');
    } catch (error) {
      console.error('[GameCore] 服务清理失败:', error);
    }
  }

  /**
   * 重置游戏核心（主要用于测试）
   */
  static reset(): void {
    if (GameCore.instance) {
      GameCore.instance.unmount();
      ServiceLocator.reset();
      GameCore.instance = null;
    }
  }

  /**
   * 获取当前初始化状态
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取当前挂载状态
   */
  isMounted(): boolean {
    return this.mounted;
  }
}

// 导出单例实例
export const gameCore = GameCore.getInstance();
