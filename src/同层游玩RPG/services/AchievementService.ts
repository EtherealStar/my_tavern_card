import { EventBus } from '../core/EventBus';
import type { GameWorld } from '../models/schemas';

/**
 * AchievementService - 成就系统服务
 *
 * 职责：
 * - 管理游戏成就的解锁和追踪
 * - 监听游戏事件并触发相应成就
 * - 提供成就查询和统计功能
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  unlockedAt?: Date;
  progress?: {
    current: number;
    target: number;
  };
}

export class AchievementService {
  private eventBus: EventBus;
  private achievements = new Map<string, Achievement>();
  private unlockedAchievements = new Set<string>();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeAchievements();
    this.setupEventListeners();

    console.log('[AchievementService] 成就系统初始化完成');
  }

  /**
   * 初始化成就列表
   */
  private initializeAchievements(): void {
    const achievementDefinitions: Achievement[] = [
      {
        id: 'first_start',
        name: '初次体验',
        description: '第一次开始游戏',
        category: '基础',
      },
      {
        id: 'world_explorer',
        name: '世界探索者',
        description: '体验所有世界类型',
        category: '探索',
        progress: { current: 0, target: 4 },
      },
      {
        id: 'difficulty_master',
        name: '难度大师',
        description: '在困难难度下完成角色创建',
        category: '挑战',
      },
      {
        id: 'talent_collector',
        name: '天赋收集者',
        description: '选择5个或更多天赋',
        category: '收集',
      },
      {
        id: 'save_master',
        name: '存档大师',
        description: '成功保存10次游戏',
        category: '系统',
        progress: { current: 0, target: 10 },
      },
      {
        id: 'ai_enthusiast',
        name: 'AI爱好者',
        description: '使用AI生成功能5次',
        category: 'AI',
        progress: { current: 0, target: 5 },
      },
      {
        id: 'completionist',
        name: '完美主义者',
        description: '解锁所有其他成就',
        category: '终极',
      },
    ];

    achievementDefinitions.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 游戏开始成就
    this.eventBus.on('game:new-started', () => {
      this.unlock('first_start');
    });

    // 世界选择成就
    this.eventBus.on('creation:world-selected', (data: { world: GameWorld }) => {
      this.updateWorldExplorerProgress(data.world);
    });

    // 难度成就
    this.eventBus.on('creation:difficulty-selected', (data: { difficulty: string }) => {
      if (data.difficulty === '困难') {
        this.unlock('difficulty_master');
      }
    });

    // 天赋成就
    this.eventBus.on('creation:completed', () => {
      this.checkTalentCollectorAchievement();
    });

    // 存档成就
    this.eventBus.on('game:saved', () => {
      this.updateProgress('save_master');
    });

    // AI使用成就
    this.eventBus.on('ai:content-generated', () => {
      this.updateProgress('ai_enthusiast');
    });

    // 检查完美主义者成就
    this.eventBus.on('achievement:unlocked', () => {
      this.checkCompletionistAchievement();
    });
  }

  /**
   * 解锁成就
   */
  unlock(achievementId: string): boolean {
    if (this.unlockedAchievements.has(achievementId)) {
      return false; // 已经解锁
    }

    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      console.warn('[AchievementService] 未找到成就:', achievementId);
      return false;
    }

    // 解锁成就
    this.unlockedAchievements.add(achievementId);
    achievement.unlockedAt = new Date();

    // 发送事件和通知
    this.eventBus.emit('achievement:unlocked', {
      achievement,
      timestamp: new Date(),
    });

    // 显示通知
    this.showAchievementNotification(achievement);

    console.log('[AchievementService] 解锁成就:', achievement.name);
    return true;
  }

  /**
   * 更新进度型成就
   */
  updateProgress(achievementId: string, increment: number = 1): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || !achievement.progress) {
      return false;
    }

    if (this.unlockedAchievements.has(achievementId)) {
      return false; // 已经解锁
    }

    // 更新进度
    achievement.progress.current += increment;

    // 检查是否达到目标
    if (achievement.progress.current >= achievement.progress.target) {
      this.unlock(achievementId);
      return true;
    }

    // 发送进度更新事件
    this.eventBus.emit('achievement:progress-updated', {
      achievement,
      progress: achievement.progress,
      timestamp: new Date(),
    });

    return false;
  }

  /**
   * 更新世界探索者进度
   */
  private updateWorldExplorerProgress(world: GameWorld): void {
    const achievement = this.achievements.get('world_explorer');
    if (!achievement || !achievement.progress) return;

    // 使用Set来追踪已体验的世界
    if (!achievement.progress.current) {
      achievement.progress.current = 0;
    }

    // 这里简化处理，实际应该追踪具体体验过的世界
    const experiencedWorlds = new Set<GameWorld>();
    experiencedWorlds.add(world);

    achievement.progress.current = Math.max(achievement.progress.current, experiencedWorlds.size);

    if (achievement.progress.current >= achievement.progress.target) {
      this.unlock('world_explorer');
    }
  }

  /**
   * 检查天赋收集者成就
   */
  private checkTalentCollectorAchievement(): void {
    // 这里需要从状态管理器获取天赋数量
    // 暂时使用事件数据
    this.eventBus.on('creation:talents-changed', (data: { talents: any[] }) => {
      if (data.talents && data.talents.length >= 5) {
        this.unlock('talent_collector');
      }
    });
  }

  /**
   * 检查完美主义者成就
   */
  private checkCompletionistAchievement(): void {
    const totalAchievements = this.achievements.size;
    const unlockedCount = this.unlockedAchievements.size;

    // 排除完美主义者本身
    if (unlockedCount >= totalAchievements - 1 && !this.unlockedAchievements.has('completionist')) {
      this.unlock('completionist');
    }
  }

  /**
   * 获取所有成就
   */
  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * 获取已解锁的成就
   */
  getUnlockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(achievement => this.unlockedAchievements.has(achievement.id));
  }

  /**
   * 获取未解锁的成就
   */
  getLockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(achievement => !this.unlockedAchievements.has(achievement.id));
  }

  /**
   * 获取成就统计
   */
  getStatistics(): {
    total: number;
    unlocked: number;
    locked: number;
    completionRate: number;
    categories: Record<string, { total: number; unlocked: number }>;
  } {
    const total = this.achievements.size;
    const unlocked = this.unlockedAchievements.size;
    const locked = total - unlocked;
    const completionRate = total > 0 ? (unlocked / total) * 100 : 0;

    // 按类别统计
    const categories: Record<string, { total: number; unlocked: number }> = {};

    for (const achievement of this.achievements.values()) {
      const category = achievement.category;
      if (!categories[category]) {
        categories[category] = { total: 0, unlocked: 0 };
      }

      categories[category].total++;
      if (this.unlockedAchievements.has(achievement.id)) {
        categories[category].unlocked++;
      }
    }

    return {
      total,
      unlocked,
      locked,
      completionRate,
      categories,
    };
  }

  /**
   * 检查成就是否已解锁
   */
  isUnlocked(achievementId: string): boolean {
    return this.unlockedAchievements.has(achievementId);
  }

  /**
   * 获取成就进度
   */
  getProgress(achievementId: string): { current: number; target: number } | null {
    const achievement = this.achievements.get(achievementId);
    return achievement?.progress || null;
  }

  /**
   * 显示成就通知
   */
  private showAchievementNotification(achievement: Achievement): void {
    // 使用 toastr 显示成就通知
    if (typeof toastr !== 'undefined') {
      toastr.success(`🏆 解锁成就：${achievement.name}`, achievement.description, {
        timeOut: 5000,
        extendedTimeOut: 2000,
      });
    }

    // 也可以发送自定义通知事件
    this.eventBus.emit('notification:achievement', {
      type: 'achievement',
      title: '成就解锁',
      message: `🏆 ${achievement.name}`,
      description: achievement.description,
      achievement,
    });
  }

  /**
   * 重置所有成就（调试用）
   */
  resetAll(): void {
    this.unlockedAchievements.clear();

    // 重置所有进度
    for (const achievement of this.achievements.values()) {
      if (achievement.progress) {
        achievement.progress.current = 0;
      }
      achievement.unlockedAt = undefined;
    }

    this.eventBus.emit('achievements:reset');
    console.log('[AchievementService] 所有成就已重置');
  }

  /**
   * 导出成就数据
   */
  export(): any {
    return {
      unlockedAchievements: Array.from(this.unlockedAchievements),
      progress: Array.from(this.achievements.values())
        .filter(a => a.progress)
        .map(a => ({
          id: a.id,
          current: a.progress!.current,
          unlockedAt: a.unlockedAt,
        })),
    };
  }

  /**
   * 导入成就数据
   */
  import(data: any): void {
    if (data.unlockedAchievements) {
      this.unlockedAchievements.clear();
      data.unlockedAchievements.forEach((id: string) => {
        this.unlockedAchievements.add(id);
      });
    }

    if (data.progress) {
      data.progress.forEach((item: any) => {
        const achievement = this.achievements.get(item.id);
        if (achievement && achievement.progress) {
          achievement.progress.current = item.current;
          achievement.unlockedAt = item.unlockedAt ? new Date(item.unlockedAt) : undefined;
        }
      });
    }

    console.log('[AchievementService] 成就数据已导入');
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 清理资源
    console.log('[AchievementService] 资源清理完成');
  }
}
