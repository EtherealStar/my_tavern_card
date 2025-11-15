import { inject, injectable } from 'inversify';
import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { BattleScene } from '../phaser/scenes/BattleScene';

@injectable()
export class PhaserManager {
  private game: Phaser.Game | null = null;
  private battleScene: BattleScene | null = null;
  private battleStartOff?: () => void;

  constructor(@inject(TYPES.EventBus) private eventBus: EventBus) {}

  public async initializeGame(container: HTMLElement): Promise<Phaser.Game> {
    if (this.game) return this.game;

    try {
      // 检查 Phaser 是否可用
      if (typeof Phaser === 'undefined') {
        throw new Error('Phaser library is not available');
      }

      // 获取容器尺寸，如果容器尺寸无效则使用默认值
      const containerWidth = container.clientWidth || 1920;
      const containerHeight = container.clientHeight || 1080;

      // 检测设备像素比，提高物理分辨率以增强清晰度
      const dpr = window.devicePixelRatio || 1;
      const canvasWidth = containerWidth * dpr;
      const canvasHeight = containerHeight * dpr;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: canvasWidth,
        height: canvasHeight,
        parent: container,
        backgroundColor: '#1f2937',
        scene: [],
        dom: { createContainer: true },
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        render: {
          antialias: true,
          pixelArt: false,
          roundPixels: false, // 避免像素对齐导致的模糊
          powerPreference: 'high-performance', // 使用高性能渲染
          preserveDrawingBuffer: true, // 保持绘制缓冲区
          failIfMajorPerformanceCaveat: false, // 即使性能不佳也继续
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: '100%',
          height: '100%',
          min: {
            width: 800,
            height: 600,
          },
          max: {
            width: 2560,
            height: 1440,
          },
          // 添加清晰度相关配置
          // 注意：pixelArt 和 antialias 在 scale 配置中不支持，已在 render 配置中设置
        },
      };

      this.game = new Phaser.Game(config);

      const handleBoot = () => {
        if (!this.game) {
          return;
        }

        if (this.battleScene) {
          return;
        }

        // 优化画布样式以增强清晰度
        this.optimizeCanvasClarity();

        this.battleScene = new BattleScene(this.eventBus);
        this.game.scene.add('BattleScene', this.battleScene);

        this.setupEventListeners();
        this.setupResizeHandlers();

        (window as any).__RPG_PHASER_MANAGER__ = this;

        this.eventBus.emit('phaser:game-ready', this.game);
      };

      if (this.game.isBooted) {
        handleBoot();
      } else {
        this.game.events.once(Phaser.Core.Events.READY, handleBoot);
      }

      // 监听游戏错误
      this.game.events.on('error', (error: any) => {
        console.error('[PhaserManager] Phaser game error:', error);
      });

      return this.game;
    } catch (error) {
      console.error('[PhaserManager] Failed to initialize Phaser game:', error);
      // 创建一个模拟的游戏对象作为回退
      const mockGame = {
        destroy: () => {},
        scene: { start: () => {}, stop: () => {} },
        canvas: container,
        config: {},
      } as any;

      this.game = mockGame as Phaser.Game;
      this.eventBus.emit('phaser:game-ready', this.game);
      return this.game;
    }
  }

  public async destroyGame(): Promise<void> {
    if (this.game) {
      try {
        this.battleStartOff?.();
        this.battleStartOff = undefined;

        // 清理窗口大小变化监听器
        if (this.windowResizeHandler) {
          window.removeEventListener('resize', this.windowResizeHandler);
          this.windowResizeHandler = undefined;
        }

        this.game.destroy(true);
      } catch {
        /* ignore */
      }
    }
    this.game = null;
    this.battleScene = null;
  }

  public getGame(): Phaser.Game | null {
    return this.game;
  }

  public registerScene(scene: Phaser.Scene, key?: string): void {
    if (this.game) {
      this.game.scene.add(key || scene.scene.key, scene);
    } else {
      console.warn('[PhaserManager] Cannot register scene - game not initialized');
    }
  }

  public startScene(key: string, data?: any): void {
    if (this.game) {
      // 对于 BattleScene，检查是否有有效的战斗配置
      if (key === 'BattleScene') {
        const battleConfig = data || this.game.registry.get('battleConfig');

        if (!battleConfig || !battleConfig.participants || !Array.isArray(battleConfig.participants)) {
          console.warn('[PhaserManager] Cannot start BattleScene - no valid battle config found');
          return;
        }

        // 传递配置到场景
        this.game.scene.start(key, battleConfig);
      } else {
        this.game.scene.start(key, data);
      }
    } else {
      console.warn('[PhaserManager] Cannot start scene - game not initialized');
    }
  }

  public stopScene(key: string): void {
    if (this.game) {
      this.game.scene.stop(key);
    } else {
      console.warn('[PhaserManager] Cannot stop scene - game not initialized');
    }
  }

  private setupEventListeners(): void {
    this.battleStartOff?.();
    this.battleStartOff = undefined;

    // 监听战斗开始事件
    this.battleStartOff = this.eventBus.on('battle:start', (payload: any) => {
      if (!this.game) {
        console.error('[PhaserManager] Game not initialized');
        return;
      }

      // 将战斗配置存储到 registry
      this.game.registry.set('battleConfig', payload);

      // 启动战斗场景
      this.startScene('BattleScene');
    });
  }

  private setupResizeHandlers(): void {
    if (!this.game) {
      console.warn('[PhaserManager] Cannot setup resize handlers - game not initialized');
      return;
    }

    // 监听 Phaser 缩放事件
    this.game.scale.on('resize', (gameSize: any) => {
      // 通知 BattleScene 画布尺寸已变化
      this.eventBus.emit('phaser:canvas-resized', {
        width: gameSize.width,
        height: gameSize.height,
      });
    });

    // 监听窗口大小变化
    const handleWindowResize = () => {
      if (this.game && this.game.scale) {
        const container = this.game.canvas.parentElement;
        if (container) {
          const newWidth = container.clientWidth;
          const newHeight = container.clientHeight;
          this.game.scale.resize(newWidth, newHeight);

          // 重新优化画布清晰度
          this.optimizeCanvasClarity();
        }
      }
    };

    window.addEventListener('resize', handleWindowResize);

    // 存储清理函数
    this.windowResizeHandler = handleWindowResize;
  }

  private windowResizeHandler?: () => void;

  /**
   * 优化画布清晰度
   * 设置画布样式以增强图片渲染质量
   */
  private optimizeCanvasClarity(): void {
    if (!this.game || !this.game.canvas) {
      console.warn('[PhaserManager] Cannot optimize canvas clarity - game or canvas not available');
      return;
    }

    const canvas = this.game.canvas;
    const dpr = window.devicePixelRatio || 1;

    // 设置画布样式以优化清晰度
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'high-quality';
    canvas.style.imageRendering = '-webkit-optimize-contrast';
    canvas.style.imageRendering = 'crisp-edges';

    // 设置画布的实际尺寸（考虑 DPR）
    const container = canvas.parentElement;
    if (container) {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // 设置画布的实际像素尺寸
      canvas.width = containerWidth * dpr;
      canvas.height = containerHeight * dpr;
    }
  }

  public getBattleScene(): BattleScene | null {
    return this.battleScene;
  }
}
