import { ServiceLocator } from '../core/ServiceLocator';
import { EventBus } from '../core/EventBus';
import { StateManager } from '../core/StateManager';

/**
 * BaseController - 基础控制器
 * 
 * 职责：
 * - 提供控制器的基础功能
 * - 统一管理控制器的生命周期
 * - 提供服务访问的便捷方法
 */
export abstract class BaseController {
  protected eventBus: EventBus;
  protected stateManager: StateManager;
  protected mounted = false;

  constructor() {
    this.eventBus = ServiceLocator.resolve<EventBus>('eventBus');
    this.stateManager = ServiceLocator.resolve<StateManager>('stateManager');
  }

  /**
   * 挂载控制器到指定DOM元素
   */
  abstract mount(selector: string): Promise<void> | void;

  /**
   * 卸载控制器
   */
  unmount(): Promise<void> | void {
    if (this.mounted) {
      this.mounted = false;
      console.log(`[${this.constructor.name}] 控制器已卸载`);
    }
  }

  /**
   * 获取服务的便捷方法
   */
  protected getService<T>(serviceName: string): T {
    return ServiceLocator.resolve<T>(serviceName);
  }

  /**
   * 发送事件的便捷方法
   */
  protected emit(event: string, payload?: any): void {
    this.eventBus.emit(event, payload);
  }

  /**
   * 监听事件的便捷方法
   */
  protected on(event: string, callback: (payload?: any) => void): () => void {
    return this.eventBus.on(event, callback);
  }

  /**
   * 更新状态的便捷方法
   */
  protected updateState(updater: any, options?: any): void {
    this.stateManager.updateState(updater, options);
  }

  /**
   * 获取当前状态的便捷方法
   */
  protected getState() {
    return this.stateManager.getState();
  }
}

