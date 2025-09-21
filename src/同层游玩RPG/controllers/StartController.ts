import { BaseController } from './BaseController';
import { SameLayerService } from '../services/SameLayerService';
import { WorldbookService } from '../services/WorldbookService';
import startHtml from '../views/start.html?raw';

/**
 * StartController - 开始界面控制器
 * 
 * 职责：
 * - 管理游戏开始界面
 * - 处理开始游戏和读档操作
 * - 显示成就信息
 */
export class StartController extends BaseController {
  private sameLayerService: SameLayerService;
  private worldbookService: WorldbookService;

  constructor() {
    super();
    this.sameLayerService = this.getService<SameLayerService>('sameLayerService');
    this.worldbookService = this.getService<WorldbookService>('worldbookService');
  }

  /**
   * 挂载控制器
   */
  mount(selector: string): void {
    if (this.mounted) return;

    try {
      // 渲染界面
      $(selector).html(startHtml);

      // 绑定事件
      this.bindEvents(selector);

      this.mounted = true;
      this.emit('controller:mounted', { controller: 'StartController' });

      console.log('[StartController] 开始界面已挂载');

    } catch (error) {
      console.error('[StartController] 挂载失败:', error);
      this.emit('controller:error', { controller: 'StartController', error });
    }
  }

  /**
   * 绑定界面事件
   */
  private bindEvents(selector: string): void {
    // 开始游戏按钮
    $(selector).find('.btn-start').on('click', () => {
      this.handleStartGame();
    });

    // 读档按钮
    $(selector).find('.btn-load').on('click', async () => {
      await this.handleLoadGame();
    });

    // 成就按钮
    $(selector).find('.btn-achievements').on('click', () => {
      this.handleShowAchievements();
    });

    // 全屏按钮
    $(selector).find('.btn-fullscreen').on('click', async () => {
      await this.handleToggleFullscreen();
    });

    // 设置按钮
    $(selector).find('.btn-settings').on('click', () => {
      this.handleShowSettings();
    });
  }

  /**
   * 处理开始游戏
   */
  private handleStartGame(): void {
    try {
      this.updateState({ 
        phase: 'creation',
        creation_step: 'difficulty'
      }, { reason: 'start-new-game' });

      this.emit('game:new-started');
      console.log('[StartController] 开始新游戏');

    } catch (error) {
      console.error('[StartController] 开始游戏失败:', error);
      toastr.error('开始游戏失败');
    }
  }

  /**
   * 处理读档
   */
  private async handleLoadGame(): Promise<void> {
    try {
      const gameState = await this.worldbookService.loadGameState();
      
      if (gameState) {
        // 更新状态
        this.stateManager.updateState(() => gameState, { 
          reason: 'load-game',
          saveToHistory: false 
        });

        // 写入同层
        await this.sameLayerService.writeGameStateToSameLayer(
          gameState,
          '读档成功，继续游戏'
        );

        this.emit('game:loaded', gameState);
        toastr.success('读档成功');
        
        console.log('[StartController] 游戏读档成功');
      } else {
        toastr.info('没有可用存档');
      }

    } catch (error) {
      console.error('[StartController] 读档失败:', error);
      toastr.error('读档失败');
    }
  }

  /**
   * 处理显示成就
   */
  private handleShowAchievements(): void {
    try {
      const achievementService = this.getService<any>('achievementService');
      const achievements = achievementService?.getAchievements?.() || [];
      
      if (achievements.length > 0) {
        const achievementText = achievements.join('、');
        toastr.info(`已获得成就：${achievementText}`);
      } else {
        toastr.info('暂无成就');
      }

      this.emit('achievements:viewed', achievements);

    } catch (error) {
      console.error('[StartController] 显示成就失败:', error);
      toastr.error('获取成就信息失败');
    }
  }

  /**
   * 处理全屏切换
   */
  private async handleToggleFullscreen(): Promise<void> {
    try {
      const element = document.documentElement as any;
      
      if (!document.fullscreenElement) {
        // 进入全屏
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen();
        }
        
        this.emit('fullscreen:entered');
        console.log('[StartController] 已进入全屏模式');
        
      } else {
        // 退出全屏
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        
        this.emit('fullscreen:exited');
        console.log('[StartController] 已退出全屏模式');
      }

    } catch (error) {
      console.error('[StartController] 全屏切换失败:', error);
      toastr.error('全屏切换失败');
    }
  }

  /**
   * 处理显示设置
   */
  private handleShowSettings(): void {
    try {
      // 这里可以显示设置面板
      toastr.info('设置功能开发中...');
      this.emit('settings:requested');

    } catch (error) {
      console.error('[StartController] 显示设置失败:', error);
    }
  }

  /**
   * 卸载控制器
   */
  unmount(): void {
    if (!this.mounted) return;

    try {
      // 移除事件监听器（jQuery会自动处理）
      super.unmount();
      
      console.log('[StartController] 控制器已卸载');

    } catch (error) {
      console.error('[StartController] 卸载失败:', error);
    }
  }
}