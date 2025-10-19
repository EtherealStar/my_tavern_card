import { EventBus } from '../../core/EventBus';
import { BattleResourceService } from '../../services/BattleResourceService';
import { EnemyBattleObject } from '../objects/EnemyBattleObject';
import { PlayerBattleObject } from '../objects/PlayerBattleObject';

/**
 * BattleScene - Phaser 战斗场景
 *
 * 职责：
 * - 资源加载：在 preload 阶段加载背景和敌人立绘
 * - 场景渲染：创建背景、敌人对象等视觉元素
 * - 状态显示：更新 HP、状态指示器等
 * - 事件通信：通过 EventBus 与 Vue 层通信
 *
 * 数据流：
 * - 接收：通过 init(data) 接收战斗配置
 * - 发送：通过 eventBus.emit 发送状态更新事件
 *
 * 不负责：
 * - 战斗逻辑计算（由 BattleEngine 处理）
 * - UI 控制（由 Vue 组件处理）
 * - 状态管理（由 useBattleState 处理）
 */
export class BattleScene extends Phaser.Scene {
  private eventBus: EventBus;
  private resourceService: BattleResourceService;
  private backgroundLayers: Phaser.GameObjects.Image[] = [];
  private enemyObjects: Map<string, EnemyBattleObject> = new Map();
  private playerObject?: PlayerBattleObject;
  private loadedTextureKeys: Map<string, string> = new Map(); // URL -> texture key mapping
  private loadedVideoKeys: Map<string, string> = new Map(); // URL -> video key mapping
  private lastHpById: Map<string, number> = new Map();
  public audioAllowed: boolean = false; // 是否允许按配置出声

  constructor(eventBus: EventBus) {
    super({ key: 'BattleScene' });
    this.eventBus = eventBus;
    this.resourceService = new BattleResourceService();
  }

  init(data?: any): void {
    if (data) {
      // 验证数据是否包含有效的 participants
      if (!data.participants || !Array.isArray(data.participants)) {
        console.warn('[BattleScene] Invalid participants data in init:', data.participants);
        // 设置默认的空数组
        data.participants = [];
      }

      // 将战斗配置存储到注册表中
      this.registry.set('battleConfig', data);

      // 如果有初始战斗状态，立即更新显示
      this.updateBattleDisplay(data);
    } else {
      console.warn('[BattleScene] No data provided in init, using empty config');
      // 设置默认的空配置
      this.registry.set('battleConfig', { participants: [] });
    }
  }

  async preload(): Promise<void> {
    const battleConfig = this.registry.get('battleConfig');
    if (battleConfig) {
      try {
        // 验证并加载背景图片URL
        if (battleConfig.background?.image) {
          const bgKey = `bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const resolvedPath = this.resourceService.resolveAssetPath(battleConfig.background.image);

          this.load.image(bgKey, resolvedPath);
          this.loadedTextureKeys.set(battleConfig.background.image, bgKey);
        }

        // 验证并加载敌人立绘URL
        const enemies =
          battleConfig.participants?.filter((p: any) => p.side === 'enemy' && p.enemyPortrait?.image) || [];

        for (const enemy of enemies) {
          const portraitKey = `enemy_portrait_${enemy.id}_${Date.now()}`;
          const resolvedPath = this.resourceService.resolveAssetPath(enemy.enemyPortrait.image);

          this.load.image(portraitKey, resolvedPath);
          this.loadedTextureKeys.set(enemy.enemyPortrait.image, portraitKey);

          // DOM<video> 方案不再通过 Phaser 预加载视频，改为运行时在 EnemyBattleObject 中创建
          if (enemy.enemyPortrait.videos) {
            // no-op
          }
        }

        // 等待所有URL资源加载完成
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.error('[BattleScene] URL asset loading timeout (30s)');
            reject(new Error('URL asset loading timeout (30s)'));
          }, 30000);

          this.load.once('complete', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.load.on('loaderror', (file: any) => {
            console.error('[BattleScene] Failed to load URL asset:', file.key, file.url);
            // 不要reject，继续加载其他资源
          });

          this.load.once('loadcomplete', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.load.start();
        });
      } catch (error) {
        console.error('[BattleScene] Failed to preload URL battle assets:', error);
        throw error;
      }
    }
  }

  create(): void {
    const battleConfig = this.registry.get('battleConfig');
    if (battleConfig) {
      // 检查所有纹理是否已加载完成
      this.checkTexturesLoaded()
        .then(() => {
          this.createBattleBackground(battleConfig.background);

          // 确保 participants 是有效的数组
          const participants = battleConfig.participants;
          if (participants && Array.isArray(participants)) {
            this.createEnemies(participants);
            this.createPlayer(participants);
          } else {
            console.warn('[BattleScene] No valid participants found in battle config:', participants);
          }
        })
        .catch(error => {
          console.error('[BattleScene] Failed to load textures:', error);
          // 即使纹理加载失败，也尝试创建基本元素
          this.createBattleBackground(battleConfig.background);
          const participants = battleConfig.participants;
          if (participants && Array.isArray(participants)) {
            this.createEnemies(participants);
            this.createPlayer(participants);
          }
        });
    } else {
      console.warn('[BattleScene] No battle config found in registry');
    }

    // 设置事件监听
    this.setupEventListeners();

    // 监听游戏尺寸变化
    this.events.on('resize', this.handleResize, this);

    // 第一次用户交互后允许音频播放（解除浏览器自动播放限制）
    const unlockAudio = () => {
      this.audioAllowed = true;
      this.registry.set('audioAllowed', true);
      this.input.off('pointerdown', unlockAudio);
      this.input.off('pointerup', unlockAudio);
      this.input.off('pointermove', unlockAudio);
      window.removeEventListener('keydown', unlockAudio as any);
    };
    this.input.on('pointerdown', unlockAudio);
    this.input.on('pointerup', unlockAudio);
    this.input.on('pointermove', unlockAudio);
    window.addEventListener('keydown', unlockAudio as any, { once: true });
  }

  /**
   * 设置事件监听器
   * 监听来自 Vue 的战斗状态更新
   */
  private setupEventListeners(): void {
    // 监听战斗状态更新（从 useBattleState 发送）
    this.eventBus.on('battle:state-updated', (data: any) => {
      this.updateBattleDisplay(data);
    });

    // 监听画布尺寸变化（从 PhaserManager 发送）
    this.eventBus.on('phaser:canvas-resized', (data: any) => {
      this.handleCanvasResize(data);
    });

    // 监听技能使用事件
    this.eventBus.on('battle:skill-used', (data: any) => {
      this.handleSkillUsed(data);
    });
  }

  /**
   * 处理游戏尺寸变化
   * 当Phaser游戏尺寸改变时，重新调整背景图片
   */
  private handleResize(_data: { width: number; height: number }): void {
    // 重新创建背景以适应新的尺寸
    const battleConfig = this.registry.get('battleConfig');
    if (battleConfig && battleConfig.background) {
      // 清理现有背景层
      this.backgroundLayers.forEach(layer => {
        layer.destroy();
      });
      this.backgroundLayers = [];

      // 重新创建背景（会使用智能缩放模式）
      this.createBattleBackground(battleConfig.background);
    }
  }

  /**
   * 处理画布尺寸变化
   * 当画布尺寸改变时，重新调整背景图片和游戏元素
   */
  private handleCanvasResize(_data: { width: number; height: number }): void {
    // 重新创建背景以适应新的画布尺寸
    const battleConfig = this.registry.get('battleConfig');
    if (battleConfig && battleConfig.background) {
      // 清理现有背景层
      this.backgroundLayers.forEach(layer => {
        layer.destroy();
      });
      this.backgroundLayers = [];

      // 重新创建背景（会使用最新的画布尺寸和智能缩放模式）
      this.createBattleBackground(battleConfig.background);
    }

    // 重新定位敌人和玩家对象
    this.repositionBattleObjects();
  }

  /**
   * 重新定位战斗对象
   * 当画布尺寸改变时，重新计算敌人和玩家的位置
   */
  private repositionBattleObjects(): void {
    const { width, height } = this.scale;

    // 重新定位玩家对象
    if (this.playerObject) {
      // 玩家位置通常在右侧中央
      const playerX = width * 0.75;
      const playerY = height * 0.5;
      this.playerObject.setPosition(playerX, playerY);
    }

    // 重新定位敌人对象
    this.enemyObjects.forEach((enemyObj, enemyId) => {
      try {
        const data: any = enemyObj.getEnemyData?.() || {};
        const posCfg = data.enemyPortrait?.position || {};
        const cfgX = typeof posCfg.x === 'number' ? posCfg.x : 0.25; // 默认与旧逻辑一致
        const cfgY = typeof posCfg.y === 'number' ? posCfg.y : 0.5;
        const enemyX = width * Phaser.Math.Clamp(cfgX, 0, 1);
        const enemyY = height * Phaser.Math.Clamp(cfgY, 0, 1);
        enemyObj.setPosition(enemyX, enemyY);
      } catch (e) {
        // 兜底：使用旧的默认位置
        const enemyX = width * 0.25;
        const enemyY = height * 0.5;
        enemyObj.setPosition(enemyX, enemyY);
        console.warn(`[BattleScene] Enemy ${enemyId} reposition fallback:`, e);
      }
    });
  }

  /**
   * 检查所有纹理是否已加载完成
   */
  private async checkTexturesLoaded(): Promise<void> {
    const battleConfig = this.registry.get('battleConfig');
    if (!battleConfig) {
      return Promise.resolve();
    }

    const texturesToCheck: string[] = [];

    // 检查背景纹理
    if (battleConfig.background?.image) {
      const bgKey = this.findTextureByUrl(battleConfig.background.image);
      if (bgKey) {
        texturesToCheck.push(bgKey);
      }
    }

    // 检查敌人立绘纹理
    const enemies = battleConfig.participants?.filter((p: any) => p.side === 'enemy' && p.enemyPortrait?.image) || [];
    for (const enemy of enemies) {
      const portraitKey = this.findTextureByUrl(enemy.enemyPortrait.image);
      if (portraitKey) {
        texturesToCheck.push(portraitKey);
      }
    }

    // 等待所有纹理加载完成
    for (const textureKey of texturesToCheck) {
      if (!this.textures.exists(textureKey)) {
        console.warn(`[BattleScene] Texture not found: ${textureKey}`);
        continue;
      }

      const texture = this.textures.get(textureKey);
      if (!texture.source[0] || !texture.source[0].image) {
        console.warn(`[BattleScene] Texture source not ready: ${textureKey}`);
        continue;
      }

      // 检查图片是否完全加载
      const image = texture.source[0].image as HTMLImageElement;
      if (!(image.complete && image.naturalWidth > 0)) {
        // 等待图片加载完成
        await new Promise<void>(resolve => {
          const checkImage = () => {
            if (image.complete && image.naturalWidth > 0) {
              resolve();
            } else {
              setTimeout(checkImage, 100);
            }
          };
          checkImage();
        });
      }
    }
  }

  /**
   * 创建战斗背景
   */
  private createBattleBackground(background: any): void {
    if (!background?.image) {
      return;
    }

    const { width, height } = this.scale;

    try {
      const bgTextureKey = this.findTextureByUrl(background.image);
      if (!bgTextureKey) {
        console.warn('[BattleScene] Background texture not found for URL:', background.image);
        return;
      }

      const texture = this.textures.get(bgTextureKey);
      const source = texture?.getSourceImage() as HTMLImageElement | undefined;
      const sourceWidth = source?.naturalWidth || texture?.getSourceImage()?.width || width;
      const sourceHeight = source?.naturalHeight || texture?.getSourceImage()?.height || height;

      // 智能选择缩放模式
      const scaleMode = this.selectOptimalScaleMode(sourceWidth, sourceHeight, width, height, background.scaleMode);
      const { displayWidth, displayHeight } = this.calculateImageDimensions(
        sourceWidth,
        sourceHeight,
        width,
        height,
        scaleMode,
      );

      const mainBg = this.add
        .image(width / 2, height / 2, bgTextureKey)
        .setDisplaySize(displayWidth, displayHeight)
        .setDepth(0)
        .setOrigin(0.5, 0.5);
      this.backgroundLayers.push(mainBg);

      // 创建视差层（如果有）
      if (background.parallax?.layers) {
        background.parallax.layers.forEach((layer: any, index: number) => {
          if (!this.resourceService.isValidUrl(layer.image)) {
            console.warn('[BattleScene] Invalid parallax layer URL:', layer.image);
            return;
          }

          const layerTextureKey = this.findTextureByUrl(layer.image);
          if (layerTextureKey) {
            const layerTexture = this.textures.get(layerTextureKey);
            const layerSource = layerTexture?.getSourceImage() as HTMLImageElement | undefined;
            const layerWidth = layerSource?.naturalWidth || layerTexture?.getSourceImage()?.width || width;
            const layerHeight = layerSource?.naturalHeight || layerTexture?.getSourceImage()?.height || height;

            // 视差层使用智能缩放模式
            const layerScaleMode = this.selectOptimalScaleMode(
              layerWidth,
              layerHeight,
              width,
              height,
              'cover', // 视差层默认使用 cover 模式
            );
            const { displayWidth: layerDisplayWidth, displayHeight: layerDisplayHeight } =
              this.calculateImageDimensions(layerWidth, layerHeight, width, height, layerScaleMode);

            const parallaxLayer = this.add
              .image(width / 2, height / 2, layerTextureKey)
              .setDisplaySize(layerDisplayWidth, layerDisplayHeight)
              .setDepth(layer.depth ?? index + 1)
              .setOrigin(0.5, 0.5);
            this.backgroundLayers.push(parallaxLayer);
          } else {
            console.warn('[BattleScene] Parallax layer texture not found for URL:', layer.image);
          }
        });
      }
    } catch (error) {
      console.error('[BattleScene] Failed to create background:', error);
      console.error('[BattleScene] Background config was:', background);
    }
  }

  /**
   * 智能选择最优缩放模式
   * @param sourceWidth 原始图片宽度
   * @param sourceHeight 原始图片高度
   * @param canvasWidth 画布宽度
   * @param canvasHeight 画布高度
   * @param configuredMode 配置的缩放模式（可选）
   * @returns 最优的缩放模式
   */
  private selectOptimalScaleMode(
    sourceWidth: number,
    sourceHeight: number,
    canvasWidth: number,
    canvasHeight: number,
    configuredMode?: 'contain' | 'cover' | 'fill',
  ): 'contain' | 'cover' | 'fill' {
    // 如果明确配置了缩放模式，优先使用配置的模式
    if (configuredMode) {
      return configuredMode;
    }

    // 计算宽高比
    const imageAspectRatio = sourceWidth / sourceHeight;
    const canvasAspectRatio = canvasWidth / canvasHeight;

    // 计算宽高比差异
    const aspectRatioDifference = Math.abs(imageAspectRatio - canvasAspectRatio);
    const extremeAspectRatioThreshold = 2.0; // 极端宽高比差异阈值（200%）

    // 新的智能选择策略：默认使用 cover 模式
    // 只有在以下极端情况下才使用 contain 模式：
    // 1. 宽高比差异极大（超过200%）
    // 2. 图片尺寸相对于画布过小（可能导致过度放大）
    const imageArea = sourceWidth * sourceHeight;
    const canvasArea = canvasWidth * canvasHeight;
    const sizeRatio = imageArea / canvasArea;

    if (aspectRatioDifference >= extremeAspectRatioThreshold || sizeRatio < 0.1) {
      // 极端宽高比差异或图片过小时使用 contain 模式
      return 'contain';
    } else {
      // 默认使用 cover 模式填满画布，裁剪多余部分
      return 'cover';
    }
  }

  /**
   * 计算图片显示尺寸
   * @param sourceWidth 原始图片宽度
   * @param sourceHeight 原始图片高度
   * @param canvasWidth 画布宽度
   * @param canvasHeight 画布高度
   * @param scaleMode 缩放模式：'contain' | 'cover' | 'fill'
   * @returns 计算后的显示尺寸
   */
  private calculateImageDimensions(
    sourceWidth: number,
    sourceHeight: number,
    canvasWidth: number,
    canvasHeight: number,
    scaleMode: 'contain' | 'cover' | 'fill' = 'contain',
  ): { displayWidth: number; displayHeight: number } {
    let displayWidth: number;
    let displayHeight: number;

    switch (scaleMode) {
      case 'cover': {
        // 保持宽高比，填满画布（可能裁剪部分内容）
        const coverScale = Math.max(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
        displayWidth = sourceWidth * coverScale;
        displayHeight = sourceHeight * coverScale;
        break;
      }

      case 'fill': {
        // 拉伸填满画布（可能变形）
        displayWidth = canvasWidth;
        displayHeight = canvasHeight;
        break;
      }

      case 'contain':
      default: {
        // 保持宽高比，完整显示（可能有黑边）
        const containScale = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
        displayWidth = sourceWidth * containScale;
        displayHeight = sourceHeight * containScale;
        break;
      }
    }

    return { displayWidth, displayHeight };
  }

  /**
   * 根据URL查找对应的视频键
   */
  public findVideoByUrl(url: string): string | null {
    // 首先尝试从存储的映射中查找
    const storedKey = this.loadedVideoKeys.get(url);
    if (storedKey && this.cache.video.exists(storedKey)) {
      return storedKey;
    }

    console.warn(`[BattleScene] No video found for URL: ${url}`);
    return null;
  }

  /**
   * 根据URL查找对应的纹理键
   */
  public findTextureByUrl(url: string): string | null {
    // 首先尝试从存储的映射中查找
    const storedKey = this.loadedTextureKeys.get(url);
    if (storedKey && this.textures.exists(storedKey)) {
      return storedKey;
    }

    // 如果映射中没有找到，尝试遍历所有纹理
    const textures = this.textures.list;
    const textureKeys = Object.keys(textures);

    // 尝试通过敌人ID匹配（因为纹理键包含敌人ID）
    const urlParts = url.split('/');
    const urlFileName = urlParts[urlParts.length - 1];

    for (const key of textureKeys) {
      // 检查是否包含敌人ID的纹理键
      if (key.includes('enemy_portrait_')) {
        // checking keys

        // 尝试通过URL匹配
        const texture = (textures as any)[key];
        if (texture && texture.source[0]) {
          const source = texture.source[0];

          // 检查直接的src属性
          if (source.src === url) {
            return key;
          }

          // 检查image元素的src属性
          if (source.image && source.image.src === url) {
            return key;
          }

          // 尝试部分匹配（URL的最后部分）
          if (urlFileName && source.src && source.src.includes(urlFileName)) {
            return key;
          }
        }
      }
    }

    console.warn(`[BattleScene] No texture found for URL: ${url}`);
    console.warn(`[BattleScene] This might indicate that the texture was not loaded or the URL mapping is incorrect`);
    return null;
  }

  /**
   * 创建玩家对象
   */
  private createPlayer(participants: any[]): void {
    if (!participants || !Array.isArray(participants)) {
      console.warn('[BattleScene] participants is not a valid array:', participants);
      return;
    }

    const player = participants.find(p => p && p.side === 'player');
    if (player) {
      // 确保玩家数据完整性：仅在未提供时兜底
      if (player.maxHp == null) {
        player.maxHp = 100;
      }

      // 移除HP重置逻辑，HP应该已经在BattleService中正确初始化
      if (player.hp == null || player.hp === undefined) {
        console.warn('[BattleScene] Player HP is null, this should not happen after initialization');
        return; // 不重置HP，让战斗系统处理
      }

      try {
        this.playerObject = new PlayerBattleObject(this, player);
      } catch (error) {
        console.error('[BattleScene] Failed to create player object for:', player.name, error);
      }
    }
  }

  /**
   * 创建敌人对象
   */
  private createEnemies(participants: any[]): void {
    // 添加空值检查
    if (!participants || !Array.isArray(participants)) {
      console.warn('[BattleScene] participants is not a valid array:', participants);
      return;
    }

    const enemies = participants.filter(p => p && p.side === 'enemy');
    enemies.forEach(enemy => {
      if (enemy.enemyPortrait?.image) {
        if (!this.resourceService.isValidUrl(enemy.enemyPortrait.image)) {
          console.warn(
            '[BattleScene] Invalid enemy portrait URL:',
            enemy.enemyPortrait.image,
            'for enemy:',
            enemy.name,
          );
          return;
        }

        // 查找已加载的敌人立绘纹理
        const portraitTextureKey = this.findTextureByUrl(enemy.enemyPortrait.image);
        if (!portraitTextureKey) {
          console.warn(
            '[BattleScene] Enemy portrait texture not found for URL:',
            enemy.enemyPortrait.image,
            'for enemy:',
            enemy.name,
          );
          return;
        }

        try {
          const enemyObj = new EnemyBattleObject(this, enemy);
          this.enemyObjects.set(enemy.id, enemyObj);
        } catch (error) {
          console.error('[BattleScene] Failed to create enemy object for:', enemy.name, error);
        }
      } else {
        // no portrait
      }
    });
  }

  /**
   * 更新战斗显示
   * 根据最新的战斗状态更新敌人 HP、状态等视觉元素
   *
   * @param stateOrData 战斗状态数据（可能是完整状态或更新数据）
   */
  private updateBattleDisplay(stateOrData: any): void {
    try {
      // 处理可能的数据格式
      const state = stateOrData?.battleState || stateOrData;

      if (!state || !state.participants) {
        console.warn('[BattleScene] Invalid state data for display update:', stateOrData);
        return;
      }

      const player = state.participants.find((p: any) => p.side === 'player');
      const enemies = state.participants.filter((p: any) => p.side === 'enemy');

      // 记录每个参与者 hp 变化
      try {
        for (const p of state.participants) {
          const prev = this.lastHpById.get(p.id);
          const curr = typeof p.hp === 'number' ? p.hp : undefined;
          if (typeof prev === 'number' && typeof curr === 'number' && prev !== curr) {
            console.log('[BattleScene] hp changed:', { id: p.id, name: p.name, oldHp: prev, newHp: curr });
          }
          if (typeof curr === 'number') {
            this.lastHpById.set(p.id, curr);
          }
        }
      } catch (e) {
        // ignore logging errors
      }

      // 更新玩家数据（移除血条更新，血条现在由Vue组件显示）
      if (this.playerObject && player) {
        this.playerObject.updatePlayerData(player);
      }

      // 更新敌人数据（移除血条更新，血条现在由Vue组件显示）
      enemies.forEach((enemy: any) => {
        const enemyObj = this.enemyObjects.get(enemy.id);
        if (enemyObj) {
          enemyObj.updateEnemyData(enemy);
        }
      });
    } catch (error) {
      console.error('[BattleScene] Error updating battle display:', error);
    }
  }

  /**
   * 处理技能使用事件
   * 当敌人使用技能时，切换到对应的视频
   */
  private handleSkillUsed(data: any): void {
    try {
      const { actorId, skillId } = data;

      if (!actorId || !skillId) {
        console.warn('[BattleScene] Invalid skill-used event data:', data);
        return;
      }

      // 查找对应的敌人对象
      const enemyObj = this.enemyObjects.get(actorId);
      if (!enemyObj) {
        return;
      }

      // 切换到技能视频
      enemyObj.switchToSkillVideo(skillId);
    } catch (error) {
      console.error('[BattleScene] Error handling skill-used event:', error);
    }
  }

  /**
   * 销毁场景时清理资源
   */
  destroy(): void {
    // 清理事件监听
    try {
      this.eventBus.off('battle:state-updated', this.updateBattleDisplay as any);
      this.eventBus.off('phaser:canvas-resized', this.handleCanvasResize as any);
      this.eventBus.off('battle:skill-used', this.handleSkillUsed as any);
      this.events.off('resize', this.handleResize, this);
    } catch (error) {
      console.warn('[BattleScene] Failed to remove event listeners:', error);
    }

    // 清理玩家对象
    if (this.playerObject) {
      this.playerObject.destroy();
      this.playerObject = undefined;
    }

    // 清理敌人对象
    this.enemyObjects.forEach(enemyObj => {
      enemyObj.destroy();
    });
    this.enemyObjects.clear();

    // 清理背景层
    this.backgroundLayers.forEach(layer => {
      layer.destroy();
    });
    this.backgroundLayers = [];

    // 清理纹理键映射
    this.loadedTextureKeys.clear();
    this.loadedVideoKeys.clear();

    // 由 Phaser 生命周期管理清理，无需显式调用 super.destroy()
  }
}
