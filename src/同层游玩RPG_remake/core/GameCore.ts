import { inject, injectable } from 'inversify';
import $ from 'jquery';
import { updateUserKey } from 'shared/constants';
// import { CommandQueueService } from '同层游玩RPG_remake/services/CommandQueueService';
import { GameStateService } from '同层游玩RPG_remake/services/GameStateService';
import { AchievementService } from '../services/AchievementService';
import { SameLayerService } from '../services/SameLayerService';
import { SaveLoadManagerService } from '../services/SaveLoadManagerService';
import { StatDataBindingService } from '../services/StatDataBindingService';
import { UIService } from '../services/UIService';
import { EventBus } from './EventBus';
import { TYPES } from './ServiceIdentifiers';

@injectable()
export class GameCore {
  private mounted = false;

  constructor(
    @inject(TYPES.EventBus) private eventBus: EventBus,
    @inject(TYPES.UIService) private _uiService: UIService,
    @inject(TYPES.StatDataBindingService) private statDataBindingService: StatDataBindingService,
    // TavernGenerationService 已合并到 SameLayerService
    @inject(TYPES.GameStateService) private _gameStateService: GameStateService,
    @inject(TYPES.SameLayerService) private sameLayerService: SameLayerService,
    @inject(TYPES.AchievementService) private achievementService: AchievementService,
    // @inject(TYPES.SaveLoadFacade) private _saveLoadFacade: SaveLoadFacade, // 已废弃
    @inject(TYPES.SaveLoadManagerService) private saveLoadManagerService: SaveLoadManagerService,
    // @inject(TYPES.CommandQueueService) private commandQueueService: CommandQueueService,
  ) {}

  public async init(): Promise<void> {
    // 保持向后兼容，调用分阶段初始化
    await this.initializeBasicServices();
    await this.initializeDataServices();
    await this.initializeBusinessServices();
    await this.initializeAdvancedServices();
  }

  /**
   * 第一阶段：基础服务初始化
   */
  public async initializeBasicServices(): Promise<void> {
    // 设置全局事件总线，供其他服务使用
    (window as any).__RPG_EVENT_BUS__ = this.eventBus;

    // 初始化成就服务
    this.achievementService.register();
  }

  /**
   * 第二阶段：数据服务初始化
   */
  public async initializeDataServices(): Promise<void> {
    // 初始化存档管理服务
    try {
      await this.saveLoadManagerService.init();
    } catch (error) {
      console.error('[GameCore] 存档管理服务初始化失败:', error);
    }

    // 初始化MVU事件桥接（MVU框架已在GameCoreFactory中等待就绪）
    try {
      // 直接订阅MVU事件并桥接到全局事件总线
      this._subscribeMvuEvents();
    } catch (e) {
      console.warn('[GameCore] MVU 事件桥接初始化失败，继续运行', e);
    }
  }

  /**
   * 第三阶段：业务服务初始化
   */
  public async initializeBusinessServices(): Promise<void> {
    // 设置默认历史条数（可被外部修改）
    // TODO: 实现 setHistoryMaxPrompts 方法或移除此调用
    // this.sameLayerService.setHistoryMaxPrompts('all');

    // 初始化统计数据绑定服务
    try {
      // 动态更新用户键，确保获取到正确的用户名
      const currentUserKey = updateUserKey();

      const success = await this.statDataBindingService.initialize({
        userKey: currentUserKey,
        attributeMapping: {
          strength: '力量',
          agility: '敏捷',
          intelligence: '智力',
          willpower: '意志',
          luck: '幸运',
        },
        defaultValues: {
          base_attributes: {},
          current_attributes: {},
          equipment: {},
          inventory: {},
        },
      });

      if (!success) {
        console.warn('[GameCore] 统计数据绑定服务初始化失败，将以降级模式运行');
      }
    } catch (e) {
      console.warn('[GameCore] 统计数据绑定服务初始化失败，继续运行', e);
    }

    // 初始化游戏状态服务
    try {
      await this._gameStateService.initialize();
    } catch (e) {
      console.warn('[GameCore] 游戏状态服务初始化失败，继续运行', e);
    }
  }

  /**
   * 第四阶段：高级服务初始化
   */
  public async initializeAdvancedServices(): Promise<void> {
    // 自动存档功能已移除，接口保留在SaveLoadManagerService中

    // 读取一次/触达一次以消除未使用成员告警
    try {
      void this._gameStateService;
      void this._uiService;
      // void this._saveLoadFacade; // 已废弃
      // TavernGenerationService 已合并到 SameLayerService
    } catch {
      /* ignore */
    }

    // 注意：事件监听器注册已移至Vue应用挂载后，确保正确的初始化时序
  }

  /**
   * 注册同层游玩事件监听器
   * 在Vue应用完全挂载后调用，确保事件监听器注册的时序正确
   */
  public registerSameLayerEventListeners(): void {
    // 监听同层游玩请求（仅保留"假楼层"显示逻辑）
    this.eventBus.on('same-layer:request', async (p: { inputText: string; stream?: boolean }) => {
      try {
        if (!p || !p.inputText) return;

        if (p.stream) {
          // TODO: 实现 streamDisplayOnly 方法
          // this.sameLayerService.streamDisplayOnly({ user_input: p.inputText });
        } else {
          // TODO: 实现 generateDisplayOnly 方法
          // void this.sameLayerService.generateDisplayOnly({ user_input: p.inputText });
        }
      } catch (error) {
        this.eventBus.emit('same-layer:error', { operation: 'request', error, payload: p });
      }
    });

    // 停止流式
    this.eventBus.on('same-layer:stop', () => {
      try {
        this.sameLayerService.stopStreaming();
      } catch (error) {
        this.eventBus.emit('same-layer:error', { operation: 'stop', error });
      }
    });
  }

  /**
   * 订阅MVU事件并桥接到全局事件总线
   */
  private _subscribeMvuEvents(): void {
    const Mvu = (window as any).Mvu;
    const eventOn = (window as any).eventOn;

    if (!Mvu?.events || typeof eventOn !== 'function') {
      console.warn('[GameCore] MVU事件系统不可用');
      return;
    }

    try {
      // 订阅单变量更新事件
      eventOn(Mvu.events.SINGLE_VARIABLE_UPDATED, (stat_data: any, path: string, old_value: any, new_value: any) => {
        this.eventBus.emit('mvu:single-updated', { stat_data, path, old_value, new_value });
      });

      // 订阅变量更新结束事件
      eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables: Mvu.MvuData) => {
        this.eventBus.emit('mvu:update-ended', variables);
      });
    } catch (error) {
      console.error('[GameCore] 订阅MVU事件失败:', error);
    }
  }

  public async mount(selector: string): Promise<void> {
    if (this.mounted) return;
    this.mounted = true;

    const $root = $(selector);
    // 不再清空DOM，因为Vue应用已经挂载在这里

    // 初始由 Vue 渲染 Start 页（Vue 在 index.ts 中挂载 #vue-root）。
    // 这里不再渲染 jQuery StartView。

    // 注意：服务初始化现在由 GameCoreFactory 统一管理，不再需要延迟初始化

    // 进入页面即视为开始
    this.eventBus.emit('game:started');

    // 监听创建流程事件
    this.eventBus.on('game:start-create', () => {
      // 触发 Vue 组件的创建流程
      this.eventBus.emit('game:start-create-vue');
    });
    this.eventBus.on('game:back-start', () => {
      // 回到 Start：由 index.ts 中的 Vue 根实例负责重挂
      // 这里直接清空容器，以确保 Vue 可以重新挂载
      $root.empty();
      const vueId = 'vue-root';
      $root.append(`<div id="${vueId}"></div>`);
      const mountEl = document.getElementById(vueId);
      if (mountEl) {
        // 交由 index.ts 暴露的 mount 方法处理
        const remounter = (window as any).__RPG_VUE_REMOUNT__;
        if (typeof remounter === 'function') remounter(mountEl);
      }
    });
    // Vue 已接管 playing 流程；无需在此挂载 jQuery PlayingView
  }

  public unmount(): void {
    if (!this.mounted) return;
    this.mounted = false;
    // 清理事件等
  }
}

// GameCore 实例将通过 Inversify 容器创建
