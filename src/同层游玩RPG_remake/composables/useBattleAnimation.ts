import { onUnmounted, readonly, ref } from 'vue';

/**
 * 战斗动画管理组合式函数
 * 提供战斗相关的动画效果，如击中闪烁、伤害效果等
 */
export function useBattleAnimation() {
  const isAnimating = ref(false);
  const animationQueue = ref<Array<() => void>>([]);

  /**
   * 播放击中闪烁效果
   * @param target Phaser 游戏对象
   */
  const playHitFlash = (target: Phaser.GameObjects.GameObject | null): void => {
    try {
      if (!target || !('scene' in target)) return;
      const anyTarget: any = target as any;
      const scene: Phaser.Scene | undefined = anyTarget.scene;
      if (!scene) return;

      const origAlpha = anyTarget.alpha ?? 1;
      isAnimating.value = true;

      scene.tweens.add({
        targets: anyTarget,
        alpha: 0.2,
        yoyo: true,
        duration: 120,
        repeat: 2,
        onComplete: () => {
          anyTarget.alpha = origAlpha;
          isAnimating.value = false;
          processAnimationQueue();
        },
      });
    } catch (error) {
      console.warn('[useBattleAnimation] Hit flash animation failed:', error);
      isAnimating.value = false;
      processAnimationQueue();
    }
  };

  /**
   * 播放伤害数字效果
   * @param target Phaser 游戏对象
   * @param damage 伤害数值
   * @param isCritical 是否暴击
   */
  const playDamageNumber = (
    target: Phaser.GameObjects.GameObject | null,
    damage: number,
    isCritical: boolean = false,
  ): void => {
    try {
      if (!target || !('scene' in target)) return;
      const anyTarget: any = target as any;
      const scene: Phaser.Scene | undefined = anyTarget.scene;
      if (!scene) return;

      const x = anyTarget.x || 0;
      const y = anyTarget.y || 0;

      const damageText = scene.add.text(x, y - 50, damage.toString(), {
        fontSize: isCritical ? '32px' : '24px',
        color: isCritical ? '#ff4444' : '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      });

      // 设置锚点居中
      damageText.setOrigin(0.5, 0.5);

      // 播放上升和淡出动画
      scene.tweens.add({
        targets: damageText,
        y: y - 100,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => {
          damageText.destroy();
        },
      });
    } catch (error) {
      console.warn('[useBattleAnimation] Damage number animation failed:', error);
    }
  };

  /**
   * 播放屏幕震动效果
   * @param scene Phaser 场景
   * @param intensity 震动强度
   * @param duration 持续时间
   */
  const playScreenShake = (scene: Phaser.Scene, intensity: number = 10, duration: number = 200): void => {
    try {
      const camera = scene.cameras.main;
      const originalX = camera.x;
      const originalY = camera.y;

      scene.tweens.add({
        targets: camera,
        x: originalX + (Math.random() - 0.5) * intensity,
        y: originalY + (Math.random() - 0.5) * intensity,
        duration: duration / 4,
        yoyo: true,
        repeat: 3,
        ease: 'Power2',
        onComplete: () => {
          camera.x = originalX;
          camera.y = originalY;
        },
      });
    } catch (error) {
      console.warn('[useBattleAnimation] Screen shake animation failed:', error);
    }
  };

  /**
   * 播放技能特效
   * @param scene Phaser 场景
   * @param skillId 技能ID
   * @param target 目标对象
   */
  const playSkillEffect = (
    scene: Phaser.Scene,
    skillId: string,
    target: Phaser.GameObjects.GameObject | null,
  ): void => {
    try {
      if (!target) return;

      // 根据技能ID播放不同的特效
      switch (skillId) {
        case 'fireball':
          playFireballEffect(scene, target);
          break;
        case 'power_strike':
          playPowerStrikeEffect(scene, target);
          break;
        case 'precise_strike':
          playPreciseStrikeEffect(scene, target);
          break;
        default:
          playGenericSkillEffect(scene, target);
      }
    } catch (error) {
      console.warn('[useBattleAnimation] Skill effect animation failed:', error);
    }
  };

  /**
   * 播放火球特效
   */
  const playFireballEffect = (scene: Phaser.Scene, target: Phaser.GameObjects.GameObject): void => {
    const anyTarget: any = target as any;
    const x = anyTarget.x || 0;
    const y = anyTarget.y || 0;

    // 创建火球粒子效果
    const particles = scene.add.particles(x, y, 'fire', {
      speed: { min: 50, max: 100 },
      scale: { start: 0.5, end: 0 },
      lifespan: 500,
      quantity: 10,
    });

    // 1秒后销毁粒子
    scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  };

  /**
   * 播放重击特效
   */
  const playPowerStrikeEffect = (scene: Phaser.Scene, target: Phaser.GameObjects.GameObject): void => {
    const anyTarget: any = target as any;
    const x = anyTarget.x || 0;
    const y = anyTarget.y || 0;

    // 创建冲击波效果
    const shockwave = scene.add.circle(x, y, 10, 0xffffff, 0.8);

    scene.tweens.add({
      targets: shockwave,
      radius: 100,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        shockwave.destroy();
      },
    });
  };

  /**
   * 播放精准打击特效
   */
  const playPreciseStrikeEffect = (scene: Phaser.Scene, target: Phaser.GameObjects.GameObject): void => {
    const anyTarget: any = target as any;
    const x = anyTarget.x || 0;
    const y = anyTarget.y || 0;

    // 创建十字准星效果
    const crosshair = scene.add.graphics();
    crosshair.lineStyle(2, 0x00ff00, 1);
    // 绘制十字准星
    crosshair.moveTo(x - 20, y);
    crosshair.lineTo(x + 20, y);
    crosshair.moveTo(x, y - 20);
    crosshair.lineTo(x, y + 20);
    crosshair.strokePath();

    scene.tweens.add({
      targets: crosshair,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        crosshair.destroy();
      },
    });
  };

  /**
   * 播放通用技能特效
   */
  const playGenericSkillEffect = (scene: Phaser.Scene, target: Phaser.GameObjects.GameObject): void => {
    const anyTarget: any = target as any;
    const x = anyTarget.x || 0;
    const y = anyTarget.y || 0;

    // 创建简单的闪光效果
    const flash = scene.add.circle(x, y, 30, 0xffffff, 0.5);

    scene.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        flash.destroy();
      },
    });
  };

  /**
   * 添加动画到队列
   * @param animation 动画函数
   */
  const queueAnimation = (animation: () => void): void => {
    animationQueue.value.push(animation);
    if (!isAnimating.value) {
      processAnimationQueue();
    }
  };

  /**
   * 处理动画队列
   */
  const processAnimationQueue = (): void => {
    if (animationQueue.value.length > 0 && !isAnimating.value) {
      const nextAnimation = animationQueue.value.shift();
      if (nextAnimation) {
        nextAnimation();
      }
    }
  };

  /**
   * 清除所有动画
   */
  const clearAnimations = (): void => {
    animationQueue.value = [];
    isAnimating.value = false;
  };

  // 组件卸载时清理
  onUnmounted(() => {
    clearAnimations();
  });

  return {
    // 状态
    isAnimating: readonly(isAnimating),

    // 动画方法
    playHitFlash,
    playDamageNumber,
    playScreenShake,
    playSkillEffect,

    // 队列管理
    queueAnimation,
    clearAnimations,
  };
}
