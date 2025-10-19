import Phaser from 'phaser';

export class EnemyBattleObject extends Phaser.GameObjects.Container {
  private enemyData: any;
  private portraitSprite!: Phaser.GameObjects.Sprite;
  private videoObjects: Map<string, Phaser.GameObjects.DOMElement> = new Map();
  private currentVideo: Phaser.GameObjects.DOMElement | null = null;
  private readonly defaultPosition = { x: 0.5, y: 0.62 };
  private readonly defaultScaleRatio = 0.7;

  constructor(scene: Phaser.Scene, enemy: any) {
    super(scene);
    this.enemyData = enemy;
    // 将容器加入场景并置于前景
    scene.add.existing(this);
    this.setDepth(50); // 设置容器层级，子元素会在此基础上叠加
    this.createEnemyPortrait();
    this.createEnemyVideos();
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
   * 创建敌人技能视频对象
   */
  private createEnemyVideos(): void {
    if (!this.enemyData.enemyPortrait?.videos) {
      return;
    }

    for (const [skillId, videoConfig] of Object.entries(this.enemyData.enemyPortrait.videos)) {
      this.createVideoDomForSkill(skillId, videoConfig);
    }
  }

  private createVideoDomForSkill(skillId: string, videoConfig: any): Phaser.GameObjects.DOMElement | null {
    try {
      const videoUrl: string = (videoConfig as any).src;
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

      this.videoObjects.set(skillId, el);
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
   * 切换到技能视频
   */
  public switchToSkillVideo(skillId: string): void {
    const videoConfig = this.enemyData.enemyPortrait?.videos?.[skillId];
    if (!videoConfig) {
      console.warn('[EnemyBattleObject] No video config for skill:', skillId);
      return;
    }

    let videoDom = this.videoObjects.get(skillId);
    if (!videoDom && videoConfig) {
      console.warn('[EnemyBattleObject] Lazy create video DOM for missing skill:', skillId);
      videoDom = this.createVideoDomForSkill(skillId, videoConfig) || undefined;
    }
    if (!videoDom) {
      console.warn('[EnemyBattleObject] No video object for skill:', skillId);
      return;
    }

    try {
      // 隐藏当前视频（如果有）
      if (this.currentVideo) {
        this.currentVideo.setVisible(false);
        const currentNode = this.currentVideo.node as HTMLVideoElement;
        try {
          currentNode.pause();
          currentNode.currentTime = 0;
        } catch (e) {
          console.warn('[EnemyBattleObject] pause previous video failed', e);
        }
      }

      // DOM 播放：先显示 DOMElement，再由 'playing' 回调隐藏立绘
      const node = videoDom.node as HTMLVideoElement;
      videoDom.setVisible(true);
      const desiredPlaybackRate = (videoConfig as any).playbackRate ?? 1.0;
      try {
        node.playbackRate = desiredPlaybackRate;
      } catch (e) {
        console.warn('[EnemyBattleObject] set playbackRate failed', e);
      }
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
      console.log('[EnemyBattleObject] Switched to DOM video for skill:', skillId);
    } catch (error) {
      console.error('[EnemyBattleObject] Failed to switch to video for skill:', skillId, error);
      // 出错时回退到立绘
      this.revertToPortrait();
    }
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

    this.portraitSprite.setVisible(true);
    console.log('[EnemyBattleObject] Reverted to portrait');
  }

  public getAvailableVideoSkills(): string[] {
    return Array.from(this.videoObjects.keys());
  }

  /**
   * 销毁敌人对象
   */
  public destroy(): void {
    // 销毁所有视频对象
    this.videoObjects.forEach(dom => {
      try {
        const node = dom.node as HTMLVideoElement;
        node.src = '';
        node.removeAttribute('src');
      } catch (e) {
        console.warn('[EnemyBattleObject] cleanup video node failed', e);
      }
      dom.destroy();
    });
    this.videoObjects.clear();

    if (this.portraitSprite) {
      this.portraitSprite.destroy();
    }
    super.destroy();
  }
}
