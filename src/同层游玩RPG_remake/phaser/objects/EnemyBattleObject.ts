import Phaser from 'phaser';
import type { EnemyType } from '../../configs/enemy/enemyConfig';
import { getAllMatchingSkillResources, getEnemyTypeByRaceAndVariant } from '../../configs/enemy/enemyConfig';
import type { SkillResourceConfig } from '../../models/BattleSchemas';
import { BattleResourceService } from '../../services/BattleResourceService';
export class EnemyBattleObject extends Phaser.GameObjects.Container {
  private enemyData: any;
  private portraitSprite!: Phaser.GameObjects.Sprite;
  // 修改为每个技能存储多个视频对象（用于随机选择）
  private videoObjects: Map<string, Phaser.GameObjects.DOMElement[]> = new Map();
  private imageObjects: Map<string, Phaser.GameObjects.Image> = new Map();
  private currentVideo: Phaser.GameObjects.DOMElement | null = null;
  private currentImage: Phaser.GameObjects.Image | null = null;
  private readonly defaultPosition = { x: 0.5, y: 0.62 };
  private readonly defaultScaleRatio = 0.7;
  // 敌人的种族、变体、类型信息，用于动态选择资源
  private enemyRace: string | undefined;
  private enemyVariantId: string | undefined;
  private enemyType: EnemyType | undefined;
  private resourceService: BattleResourceService;

  constructor(scene: Phaser.Scene, enemy: any, resourceService?: BattleResourceService) {
    super(scene);
    this.enemyData = enemy;
    // 存储敌人的种族、变体、类型信息，用于动态选择资源
    this.enemyRace = enemy.race;
    this.enemyVariantId = enemy.variantId;
    // 如果敌人数据中有 enemyType，直接使用；否则根据 race 和 variantId 计算
    this.enemyType =
      enemy.enemyType ||
      (this.enemyRace && this.enemyVariantId
        ? getEnemyTypeByRaceAndVariant(this.enemyRace, this.enemyVariantId)
        : undefined);
    // 获取或创建 BattleResourceService
    this.resourceService = resourceService || new BattleResourceService();
    // 将容器加入场景并置于前景
    scene.add.existing(this);
    this.setDepth(50); // 设置容器层级，子元素会在此基础上叠加
    this.createEnemyPortrait();
    // 预加载所有匹配的视频资源
    this.preloadAllSkillVideos();
    try {
      const keys = Array.from(this.videoObjects.keys());
      console.log('[EnemyBattleObject] Video skills registered:', keys);
    } catch (e) {
      console.warn('[EnemyBattleObject] log registered video skills failed', e);
    }
    this.setEnemyPosition();
  }

  /**
   * 创建敌人立绘
   */
  private createEnemyPortrait(): void {
    if (!this.enemyData.enemyPortrait?.image) {
      console.warn('[EnemyBattleObject] No enemy portrait image specified for:', this.enemyData.name);
      return;
    }

    const battleScene = this.scene as any;
    const portraitKey = battleScene.findTextureByUrl?.(this.enemyData.enemyPortrait.image);

    if (!portraitKey) {
      console.error(
        '[EnemyBattleObject] Could not find texture for enemy portrait:',
        this.enemyData.enemyPortrait.image,
      );
      return;
    }

    console.log('[EnemyBattleObject] Creating portrait with key:', portraitKey);

    // 创建敌人立绘精灵
    this.portraitSprite = this.scene.add.sprite(0, 0, portraitKey);
    this.portraitSprite.setOrigin(0.5, 0.5);

    const textureSource = this.portraitSprite.texture.getSourceImage() as HTMLImageElement;
    const sourceHeight = textureSource?.naturalHeight || this.portraitSprite.height || 1;

    // 计算缩放比例，确保高度不超过屏幕的60%
    const maxHeight = this.scene.scale.height * 0.6;
    const scaleRatio = Math.min(maxHeight / sourceHeight, this.defaultScaleRatio);

    this.portraitSprite.setScale(scaleRatio);
    this.portraitSprite.setDepth(100);

    this.add(this.portraitSprite);
  }

  /**
   * 预加载所有匹配的技能视频资源
   * 根据敌人的种族、变体、类型，为每个技能预加载所有精确匹配的视频资源
   */
  private preloadAllSkillVideos(): void {
    if (!this.enemyRace || !this.enemyVariantId || !this.enemyType) {
      console.error('[EnemyBattleObject] Cannot preload videos: missing enemy info', {
        race: this.enemyRace,
        variantId: this.enemyVariantId,
        enemyType: this.enemyType,
        enemyData: {
          race: this.enemyData.race,
          variantId: this.enemyData.variantId,
          enemyType: this.enemyData.enemyType,
        },
      });
      // 回退到旧格式：使用静态配置
      this.createEnemyVideosLegacy();
      return;
    }

    // 获取敌人的技能列表
    const skills = this.enemyData.skills || [];
    if (skills.length === 0) {
      console.warn('[EnemyBattleObject] No skills found for enemy:', this.enemyData.name);
      // 回退到旧格式：使用静态配置
      this.createEnemyVideosLegacy();
      return;
    }

    // 为每个技能预加载所有精确匹配的视频资源
    for (const skillId of skills) {
      const matchingResources = getAllMatchingSkillResources(
        skillId,
        this.enemyRace!,
        this.enemyVariantId!,
        this.enemyType!,
      );

      if (matchingResources.length === 0) {
        // 如果没有精确匹配的资源，尝试使用静态配置（兼容旧格式）
        console.error('[EnemyBattleObject] No exact matching resources found for skill', {
          skillId,
          race: this.enemyRace,
          variantId: this.enemyVariantId,
          enemyType: this.enemyType,
        });
        const staticConfig = this.enemyData.enemyPortrait?.videos?.[skillId] as SkillResourceConfig | undefined;
        if (staticConfig && staticConfig.type !== 'image') {
          const videoDom = this.createVideoDomForSkill(skillId, staticConfig);
          if (videoDom) {
            this.videoObjects.set(skillId, [videoDom]);
          } else {
            console.error('[EnemyBattleObject] Failed to create video DOM from static config', {
              skillId,
              staticConfig,
            });
          }
        } else {
          console.error('[EnemyBattleObject] No static config available for skill', { skillId });
        }
        continue;
      }

      // 为每个匹配的资源创建视频对象
      const videoDoms: Phaser.GameObjects.DOMElement[] = [];
      for (const resource of matchingResources) {
        // 只预加载视频资源，图片资源在需要时创建
        if (resource.type === 'video') {
          const videoDom = this.createVideoDomForSkill(skillId, resource);
          if (videoDom) {
            videoDoms.push(videoDom);
          } else {
            console.error('[EnemyBattleObject] Failed to create video DOM for resource', {
              skillId,
              resourceUrl: resource.src,
              resourceType: resource.type,
            });
          }
        }
      }

      if (videoDoms.length > 0) {
        this.videoObjects.set(skillId, videoDoms);
        console.log(`[EnemyBattleObject] Preloaded ${videoDoms.length} video(s) for skill: ${skillId}`);
      } else {
        console.error('[EnemyBattleObject] No video objects created for skill', {
          skillId,
          matchingResourcesCount: matchingResources.length,
          videoResourcesCount: matchingResources.filter(r => r.type === 'video').length,
        });
      }
    }
  }

  /**
   * 创建敌人技能资源对象（视频和图片）- 旧格式兼容
   */
  private createEnemyVideosLegacy(): void {
    if (!this.enemyData.enemyPortrait?.videos) {
      return;
    }

    for (const [skillId, resourceConfig] of Object.entries(this.enemyData.enemyPortrait.videos)) {
      // 检查是否为新的资源配置格式
      const config = resourceConfig as any;

      // 兼容旧格式：如果配置有 src 属性，直接使用
      if (config.src) {
        if (config.type === 'image') {
          this.createImageForSkill(skillId, config);
        } else {
          // 默认为视频
          const videoDom = this.createVideoDomForSkill(skillId, config);
          if (videoDom) {
            this.videoObjects.set(skillId, [videoDom]);
          }
        }
      } else {
        // 旧格式：直接作为视频配置处理
        const videoDom = this.createVideoDomForSkill(skillId, config);
        if (videoDom) {
          this.videoObjects.set(skillId, [videoDom]);
        }
      }
    }
  }

  private createVideoDomForSkill(skillId: string, videoConfig: any): Phaser.GameObjects.DOMElement | null {
    try {
      const originalVideoUrl: string = (videoConfig as any).src;
      // 使用 BattleResourceService 解析资源路径（支持本地资源和外部URL）
      const videoUrl = this.resourceService.resolveAssetPath(originalVideoUrl);
      const el = this.scene.add.dom(0, 0, 'video');
      el.setOrigin(0.5, 0.5);
      el.setDepth(101);
      el.setVisible(false);
      // 缩放：默认与立绘一致，可被 vScale 叠加
      const vScale = typeof (videoConfig as any).vScale === 'number' ? (videoConfig as any).vScale : 1;
      el.setScale(this.portraitSprite.scaleX * vScale, this.portraitSprite.scaleY * vScale);

      const node = el.node as HTMLVideoElement;
      node.crossOrigin = 'anonymous';
      node.muted = true; // muted-first，避免自动播放限制
      node.autoplay = true;
      (node as any).playsInline = true;
      node.loop = !!(videoConfig as any).loop;
      try {
        node.playbackRate = (videoConfig as any).playbackRate ?? 1.0;
      } catch (e) {
        console.warn('[EnemyBattleObject] set playbackRate failed', e);
      }
      node.src = videoUrl;
      node.style.pointerEvents = 'none';
      node.style.objectFit = 'contain';

      // 事件：成功播放后再隐藏立绘并显示视频
      const onPlaying = () => {
        this.portraitSprite.setVisible(false);
        el.setVisible(true);

        // 若允许音频则按配置解除静音
        const desiredVolume = (videoConfig as any).volume ?? 0;
        const sceneAny = this.scene as any;
        const audioAllowed: boolean = !!(sceneAny.audioAllowed || this.scene.registry.get('audioAllowed'));
        if (audioAllowed && desiredVolume > 0) {
          try {
            node.muted = false;
            node.volume = desiredVolume;
          } catch (e) {
            console.warn('[EnemyBattleObject] set volume failed', e);
          }
        }
      };
      node.addEventListener('playing', onPlaying, { once: true });

      // 失败回退
      const onError = () => {
        console.warn('[EnemyBattleObject] DOM video failed for skill:', skillId, videoUrl);
        this.revertToPortrait();
      };
      node.addEventListener('error', onError, { once: true });
      node.addEventListener('stalled', onError, { once: true } as any);

      // 结束回退（非循环且未禁止回退）
      node.addEventListener('ended', () => {
        if ((videoConfig as any).revertOnEnd !== false) this.revertToPortrait();
      });

      // 位置偏移：相对于敌人容器中心点
      const offsetX = typeof (videoConfig as any).offsetX === 'number' ? (videoConfig as any).offsetX : 0;
      const offsetY = typeof (videoConfig as any).offsetY === 'number' ? (videoConfig as any).offsetY : 0;
      el.setPosition(offsetX, offsetY);

      // 注意：不再在这里设置 videoObjects，因为现在存储的是数组
      // 视频对象会在 preloadAllSkillVideos 或 switchToSkillVideoInternal 中添加
      this.add(el);
      console.log('[EnemyBattleObject] Created DOM video for skill:', skillId, 'url:', videoUrl);
      return el;
    } catch (error) {
      console.error('[EnemyBattleObject] Failed to create DOM video for skill:', skillId, error);
      return null;
    }
  }

  /**
   * 设置敌人对象位置
   */
  private setEnemyPosition(): void {
    const { width, height } = this.scene.scale;
    const positionConfig = this.enemyData.enemyPortrait?.position || {};
    const x = typeof positionConfig.x === 'number' ? positionConfig.x : this.defaultPosition.x;
    const y = typeof positionConfig.y === 'number' ? positionConfig.y : this.defaultPosition.y;
    super.setPosition(width * Phaser.Math.Clamp(x, 0, 1), height * Phaser.Math.Clamp(y, 0, 1));
  }

  /**
   * 更新敌人数据（保留基本功能，移除血条更新）
   */
  public updateEnemyData(newData: any): void {
    this.enemyData = { ...this.enemyData, ...newData };
  }

  /**
   * 获取敌人数据
   */
  public getEnemyData(): any {
    return this.enemyData;
  }

  /**
   * 获取敌人位置（供Vue组件使用）
   */
  public getPosition(): { x: number; y: number } {
    return {
      x: this.x,
      y: this.y,
    };
  }

  /**
   * 创建图片资源对象
   */
  private createImageForSkill(skillId: string, imageConfig: SkillResourceConfig): Phaser.GameObjects.Image | null {
    try {
      const imageUrl: string = imageConfig.src;
      const battleScene = this.scene as any;
      const imageKey = battleScene.findTextureByUrl?.(imageUrl);

      if (!imageKey) {
        console.warn('[EnemyBattleObject] Could not find texture for skill image:', imageUrl);
        return null;
      }

      // 创建图片对象
      const imageObj = this.scene.add.image(0, 0, imageKey);
      imageObj.setOrigin(0.5, 0.5);
      imageObj.setDepth(101);
      imageObj.setVisible(false);

      // 缩放：默认与立绘一致，可被 vScale 叠加
      const vScale = typeof imageConfig.vScale === 'number' ? imageConfig.vScale : 1;
      imageObj.setScale(this.portraitSprite.scaleX * vScale, this.portraitSprite.scaleY * vScale);

      // 位置偏移：相对于敌人容器中心点
      const offsetX = typeof imageConfig.offsetX === 'number' ? imageConfig.offsetX : 0;
      const offsetY = typeof imageConfig.offsetY === 'number' ? imageConfig.offsetY : 0;
      imageObj.setPosition(offsetX, offsetY);

      this.imageObjects.set(skillId, imageObj);
      this.add(imageObj);
      console.log('[EnemyBattleObject] Created image for skill:', skillId, 'url:', imageUrl);
      return imageObj;
    } catch (error) {
      console.error('[EnemyBattleObject] Failed to create image for skill:', skillId, error);
      return null;
    }
  }

  /**
   * 切换到技能资源（视频或图片）
   * 从预加载的资源中随机选择一个播放
   */
  public switchToSkillVideo(skillId: string): void {
    // 从预加载的视频对象中随机选择一个
    const videoDoms = this.videoObjects.get(skillId);
    if (videoDoms && videoDoms.length > 0) {
      // 随机选择一个视频对象
      const randomIndex = Math.floor(Math.random() * videoDoms.length);
      const selectedVideoDom = videoDoms[randomIndex];
      if (!selectedVideoDom) {
        console.error('[EnemyBattleObject] Selected video DOM is null', {
          skillId,
          videoDomsLength: videoDoms.length,
          randomIndex,
        });
        return;
      }
      // 输出随机选择阶段的调试日志
      const selectedVideoUrl = (selectedVideoDom.node as HTMLVideoElement).src;
      console.log('[EnemyBattleObject] Random selection for skill', {
        skillId,
        preloadedVideoCount: videoDoms.length,
        randomIndex,
        selectedVideoUrl,
      });
      this.switchToPreloadedVideo(skillId, selectedVideoDom);
      return;
    }

    // 如果没有预加载的视频，尝试使用静态配置（兼容旧格式）
    console.error('[EnemyBattleObject] No preloaded videos found for skill', {
      skillId,
      availableSkills: Array.from(this.videoObjects.keys()),
      videoDomsCount: videoDoms?.length || 0,
    });
    const staticConfig = this.enemyData.enemyPortrait?.videos?.[skillId] as SkillResourceConfig | undefined;
    if (staticConfig) {
      const resourceType = staticConfig.type || 'video';
      if (resourceType === 'image') {
        this.switchToSkillImage(skillId, staticConfig);
      } else {
        // 动态创建视频对象（兼容旧格式）
        this.switchToSkillVideoInternal(skillId, staticConfig);
      }
      return;
    }

    console.error('[EnemyBattleObject] No resource config for skill', {
      skillId,
      hasStaticConfig: !!staticConfig,
      enemyPortraitVideos: this.enemyData.enemyPortrait?.videos ? Object.keys(this.enemyData.enemyPortrait.videos) : [],
    });
  }

  /**
   * 切换到技能图片
   */
  private switchToSkillImage(skillId: string, imageConfig: SkillResourceConfig): void {
    let imageObj = this.imageObjects.get(skillId);
    if (!imageObj && imageConfig) {
      console.warn('[EnemyBattleObject] Lazy create image for missing skill:', skillId);
      imageObj = this.createImageForSkill(skillId, imageConfig) || undefined;
    }
    if (!imageObj) {
      console.warn('[EnemyBattleObject] No image object for skill:', skillId);
      return;
    }

    try {
      // 隐藏当前视频和图片（如果有）
      if (this.currentVideo) {
        this.currentVideo.setVisible(false);
        const currentNode = this.currentVideo.node as HTMLVideoElement;
        try {
          currentNode.pause();
          currentNode.currentTime = 0;
        } catch (e) {
          console.warn('[EnemyBattleObject] pause previous video failed', e);
        }
        this.currentVideo = null;
      }
      if (this.currentImage) {
        this.currentImage.setVisible(false);
        this.currentImage = null;
      }

      // 显示图片并隐藏立绘
      imageObj.setVisible(true);
      this.portraitSprite.setVisible(false);
      this.currentImage = imageObj;
      console.log('[EnemyBattleObject] Switched to image for skill:', skillId);
    } catch (error) {
      console.error('[EnemyBattleObject] Failed to switch to image for skill:', skillId, error);
      // 出错时回退到立绘
      this.revertToPortrait();
    }
  }

  /**
   * 切换到预加载的视频对象
   * @param skillId 技能ID
   * @param videoDom 预加载的视频对象
   */
  private switchToPreloadedVideo(skillId: string, videoDom: Phaser.GameObjects.DOMElement): void {
    try {
      // 隐藏当前视频和图片（如果有）
      if (this.currentVideo) {
        this.currentVideo.setVisible(false);
        const currentNode = this.currentVideo.node as HTMLVideoElement;
        try {
          currentNode.pause();
          currentNode.currentTime = 0;
        } catch (e) {
          console.warn('[EnemyBattleObject] pause previous video failed', e);
        }
        this.currentVideo = null;
      }
      if (this.currentImage) {
        this.currentImage.setVisible(false);
        this.currentImage = null;
      }

      // 重置视频到开始位置并播放
      const node = videoDom.node as HTMLVideoElement;
      const videoUrl = node.src;
      try {
        node.currentTime = 0;
        node.playbackRate = 1.0;
      } catch (e) {
        console.warn('[EnemyBattleObject] reset video failed', e);
      }

      // DOM 播放：先显示 DOMElement，再由 'playing' 回调隐藏立绘
      videoDom.setVisible(true);
      node.muted = true;
      try {
        node.play().catch(() => {
          this.revertToPortrait();
        });
      } catch (e) {
        console.warn('[EnemyBattleObject] video.play threw', e);
        this.revertToPortrait();
      }

      this.currentVideo = videoDom;
      // 输出视频播放阶段的调试日志
      console.log('[EnemyBattleObject] Switched to preloaded video for skill', {
        skillId,
        videoUrl,
      });
    } catch (error) {
      console.error('[EnemyBattleObject] Failed to switch to preloaded video for skill:', skillId, error);
      // 出错时回退到立绘
      this.revertToPortrait();
    }
  }

  /**
   * 切换到技能视频（内部方法，兼容旧格式）
   * 支持动态创建或更新视频对象
   */
  private switchToSkillVideoInternal(skillId: string, videoConfig: SkillResourceConfig): void {
    // 兼容旧格式：尝试从预加载的资源中查找
    const videoDoms = this.videoObjects.get(skillId);
    if (videoDoms && videoDoms.length > 0) {
      // 如果已经有预加载的资源，使用预加载的资源
      const randomIndex = Math.floor(Math.random() * videoDoms.length);
      this.switchToPreloadedVideo(skillId, videoDoms[randomIndex]);
      return;
    }

    // 如果没有预加载的资源，动态创建（兼容旧格式）
    console.log('[EnemyBattleObject] Creating video DOM for skill (legacy):', skillId);
    const videoDom = this.createVideoDomForSkill(skillId, videoConfig);
    if (!videoDom) {
      console.warn('[EnemyBattleObject] Failed to create video DOM for skill:', skillId);
      return;
    }

    // 将新创建的视频对象添加到预加载列表中
    const existingDoms = this.videoObjects.get(skillId) || [];
    existingDoms.push(videoDom);
    this.videoObjects.set(skillId, existingDoms);

    // 使用新创建的视频对象
    this.switchToPreloadedVideo(skillId, videoDom);
  }

  /**
   * 回退到立绘显示
   */
  public revertToPortrait(): void {
    if (this.currentVideo) {
      this.currentVideo.setVisible(false);
      const node = this.currentVideo.node as HTMLVideoElement;
      try {
        node.pause();
        node.currentTime = 0;
      } catch (e) {
        console.warn('[EnemyBattleObject] revert pause failed', e);
      }
      this.currentVideo = null;
    }

    if (this.currentImage) {
      this.currentImage.setVisible(false);
      this.currentImage = null;
    }

    this.portraitSprite.setVisible(true);
    console.log('[EnemyBattleObject] Reverted to portrait');
  }

  public getAvailableVideoSkills(): string[] {
    return Array.from(this.videoObjects.keys());
  }

  /**
   * 销毁敌人对象
   * 清理所有预加载的视频资源
   */
  public destroy(): void {
    // 销毁所有视频对象（现在每个技能可能有多个视频对象）
    this.videoObjects.forEach(videoDoms => {
      videoDoms.forEach(dom => {
        try {
          const node = dom.node as HTMLVideoElement;
          // 停止播放
          try {
            node.pause();
            node.currentTime = 0;
          } catch (e) {
            console.warn('[EnemyBattleObject] pause video failed during cleanup:', e);
          }
          // 清理视频源
          node.src = '';
          node.removeAttribute('src');
          // 移除所有事件监听器
          node.removeEventListener('playing', () => {});
          node.removeEventListener('error', () => {});
          node.removeEventListener('stalled', () => {});
          node.removeEventListener('ended', () => {});
        } catch (e) {
          console.warn('[EnemyBattleObject] cleanup video node failed:', e);
        }
        try {
          dom.destroy();
        } catch (e) {
          console.warn('[EnemyBattleObject] destroy video DOM failed:', e);
        }
      });
    });
    this.videoObjects.clear();

    // 销毁所有图片对象
    this.imageObjects.forEach(image => {
      try {
        image.destroy();
      } catch (e) {
        console.warn('[EnemyBattleObject] cleanup image failed', e);
      }
    });
    this.imageObjects.clear();

    if (this.portraitSprite) {
      this.portraitSprite.destroy();
    }
    super.destroy();
  }
}
