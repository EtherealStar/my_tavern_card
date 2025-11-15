import { isValidSkillId } from '../../data/skills';
import type { SkillResourceConfig } from '../../models/BattleSchemas';

// ==================== 类型定义 ====================

export type EnemyType = 'normal' | 'high_dodge' | 'high_magic';

export interface EnemyBattleStats {
  atk: number; // 物理攻击
  hatk: number; // 魔法攻击
  def: number; // 物理防御
  hdef: number; // 魔法防御
  hit: number; // 命中率
  evade: number; // 闪避率
  critRate: number; // 暴击率
  critDamageMultiplier: number; // 暴击伤害倍数
  hhp: number; // 魔法血量
  maxHp: number; // 最大血量
}

// ==================== 敌人类型映射 ====================

/**
 * 根据种族和变体确定敌人类型
 * 用于决定使用哪种战斗属性配置
 */
export const ENEMY_TYPE_MAPPING: Record<string, Record<string, EnemyType>> = {
  人类: {
    战士: 'normal',
    法师: 'high_magic',
    盗贼: 'high_dodge',
    弓箭手: 'high_dodge',
    牧师: 'normal',
  },
  兽人: {
    战士: 'normal',
    萨满: 'high_magic',
    狂战士: 'normal',
    猎手: 'high_dodge',
  },
  精灵: {
    弓箭手: 'high_dodge',
    德鲁伊: 'high_magic',
    法师: 'high_magic',
    游侠: 'high_dodge',
  },
  矮人: {
    战士: 'normal',
    工匠: 'normal',
    牧师: 'normal',
  },
  龙族: {
    龙战士: 'normal',
    龙法师: 'high_magic',
    龙骑士: 'normal',
  },
};

// ==================== 1-20级硬编码战斗属性配置 ====================

/**
 * 1-20级敌人战斗属性配置表
 * 每种类型（normal/high_dodge/high_magic）都有平衡的属性设计
 */
export const ENEMY_BATTLE_STATS_CONFIG: Record<number, Record<EnemyType, EnemyBattleStats>> = {
  // 1级敌人配置
  1: {
    normal: {
      atk: 12,
      hatk: 8,
      def: 10,
      hdef: 5,
      hit: 100.5,
      evade: 5,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 100,
    },
    high_dodge: {
      atk: 10,
      hatk: 8,
      def: 6,
      hdef: 5,
      hit: 100.5,
      evade: 25,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 80,
    },
    high_magic: {
      atk: 8,
      hatk: 15,
      def: 8,
      hdef: 10,
      hit: 100.5,
      evade: 5,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 90,
    },
  },
  // 2级敌人配置
  2: {
    normal: {
      atk: 14,
      hatk: 10,
      def: 12,
      hdef: 6,
      hit: 101.0,
      evade: 6,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 120,
    },
    high_dodge: {
      atk: 12,
      hatk: 10,
      def: 8,
      hdef: 6,
      hit: 101.0,
      evade: 28,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 100,
    },
    high_magic: {
      atk: 10,
      hatk: 18,
      def: 10,
      hdef: 12,
      hit: 101.0,
      evade: 6,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 110,
    },
  },
  // 3级敌人配置
  3: {
    normal: {
      atk: 16,
      hatk: 12,
      def: 14,
      hdef: 7,
      hit: 101.5,
      evade: 7,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 140,
    },
    high_dodge: {
      atk: 14,
      hatk: 12,
      def: 10,
      hdef: 7,
      hit: 101.5,
      evade: 31,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 120,
    },
    high_magic: {
      atk: 12,
      hatk: 21,
      def: 12,
      hdef: 14,
      hit: 101.5,
      evade: 7,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 130,
    },
  },
  // 4级敌人配置
  4: {
    normal: {
      atk: 18,
      hatk: 14,
      def: 16,
      hdef: 8,
      hit: 102.0,
      evade: 8,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 160,
    },
    high_dodge: {
      atk: 16,
      hatk: 14,
      def: 12,
      hdef: 8,
      hit: 102.0,
      evade: 34,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 140,
    },
    high_magic: {
      atk: 14,
      hatk: 24,
      def: 14,
      hdef: 16,
      hit: 102.0,
      evade: 8,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 150,
    },
  },
  // 5级敌人配置
  5: {
    normal: {
      atk: 20,
      hatk: 16,
      def: 18,
      hdef: 9,
      hit: 102.5,
      evade: 9,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 180,
    },
    high_dodge: {
      atk: 18,
      hatk: 16,
      def: 14,
      hdef: 9,
      hit: 102.5,
      evade: 37,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 160,
    },
    high_magic: {
      atk: 16,
      hatk: 27,
      def: 16,
      hdef: 18,
      hit: 102.5,
      evade: 9,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 170,
    },
  },
  // 6-10级敌人配置
  6: {
    normal: {
      atk: 22,
      hatk: 18,
      def: 20,
      hdef: 10,
      hit: 103.0,
      evade: 10,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 200,
    },
    high_dodge: {
      atk: 20,
      hatk: 18,
      def: 16,
      hdef: 10,
      hit: 103.0,
      evade: 40,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 180,
    },
    high_magic: {
      atk: 18,
      hatk: 30,
      def: 18,
      hdef: 20,
      hit: 103.0,
      evade: 10,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 190,
    },
  },
  7: {
    normal: {
      atk: 24,
      hatk: 20,
      def: 22,
      hdef: 11,
      hit: 103.5,
      evade: 11,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 220,
    },
    high_dodge: {
      atk: 22,
      hatk: 20,
      def: 18,
      hdef: 11,
      hit: 103.5,
      evade: 43,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 200,
    },
    high_magic: {
      atk: 20,
      hatk: 33,
      def: 20,
      hdef: 22,
      hit: 103.5,
      evade: 11,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 210,
    },
  },
  8: {
    normal: {
      atk: 26,
      hatk: 22,
      def: 24,
      hdef: 12,
      hit: 104.0,
      evade: 12,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 240,
    },
    high_dodge: {
      atk: 24,
      hatk: 22,
      def: 20,
      hdef: 12,
      hit: 104.0,
      evade: 46,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 220,
    },
    high_magic: {
      atk: 22,
      hatk: 36,
      def: 22,
      hdef: 24,
      hit: 104.0,
      evade: 12,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 230,
    },
  },
  9: {
    normal: {
      atk: 28,
      hatk: 24,
      def: 26,
      hdef: 13,
      hit: 104.5,
      evade: 13,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 260,
    },
    high_dodge: {
      atk: 26,
      hatk: 24,
      def: 22,
      hdef: 13,
      hit: 104.5,
      evade: 49,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 240,
    },
    high_magic: {
      atk: 24,
      hatk: 39,
      def: 24,
      hdef: 26,
      hit: 104.5,
      evade: 13,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 250,
    },
  },
  10: {
    normal: {
      atk: 30,
      hatk: 26,
      def: 28,
      hdef: 14,
      hit: 105.0,
      evade: 14,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 280,
    },
    high_dodge: {
      atk: 28,
      hatk: 26,
      def: 24,
      hdef: 14,
      hit: 105.0,
      evade: 52,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 260,
    },
    high_magic: {
      atk: 26,
      hatk: 42,
      def: 26,
      hdef: 28,
      hit: 105.0,
      evade: 14,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 270,
    },
  },
  // 11-15级敌人配置
  11: {
    normal: {
      atk: 32,
      hatk: 28,
      def: 30,
      hdef: 15,
      hit: 105.5,
      evade: 15,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 300,
    },
    high_dodge: {
      atk: 30,
      hatk: 28,
      def: 26,
      hdef: 15,
      hit: 105.5,
      evade: 55,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 280,
    },
    high_magic: {
      atk: 28,
      hatk: 45,
      def: 28,
      hdef: 30,
      hit: 105.5,
      evade: 15,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 290,
    },
  },
  12: {
    normal: {
      atk: 34,
      hatk: 30,
      def: 32,
      hdef: 16,
      hit: 106.0,
      evade: 16,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 320,
    },
    high_dodge: {
      atk: 32,
      hatk: 30,
      def: 28,
      hdef: 16,
      hit: 106.0,
      evade: 58,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 300,
    },
    high_magic: {
      atk: 30,
      hatk: 48,
      def: 30,
      hdef: 32,
      hit: 106.0,
      evade: 16,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 310,
    },
  },
  13: {
    normal: {
      atk: 36,
      hatk: 32,
      def: 34,
      hdef: 17,
      hit: 106.5,
      evade: 17,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 340,
    },
    high_dodge: {
      atk: 34,
      hatk: 32,
      def: 30,
      hdef: 17,
      hit: 106.5,
      evade: 61,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 320,
    },
    high_magic: {
      atk: 32,
      hatk: 51,
      def: 32,
      hdef: 34,
      hit: 106.5,
      evade: 17,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 330,
    },
  },
  14: {
    normal: {
      atk: 38,
      hatk: 34,
      def: 36,
      hdef: 18,
      hit: 107.0,
      evade: 18,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 360,
    },
    high_dodge: {
      atk: 36,
      hatk: 34,
      def: 32,
      hdef: 18,
      hit: 107.0,
      evade: 64,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 340,
    },
    high_magic: {
      atk: 34,
      hatk: 54,
      def: 34,
      hdef: 36,
      hit: 107.0,
      evade: 18,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 350,
    },
  },
  15: {
    normal: {
      atk: 40,
      hatk: 36,
      def: 38,
      hdef: 19,
      hit: 107.5,
      evade: 19,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 380,
    },
    high_dodge: {
      atk: 38,
      hatk: 36,
      def: 34,
      hdef: 19,
      hit: 107.5,
      evade: 67,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 360,
    },
    high_magic: {
      atk: 36,
      hatk: 57,
      def: 36,
      hdef: 38,
      hit: 107.5,
      evade: 19,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 370,
    },
  },
  // 16-20级敌人配置
  16: {
    normal: {
      atk: 42,
      hatk: 38,
      def: 40,
      hdef: 20,
      hit: 108.0,
      evade: 20,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 400,
    },
    high_dodge: {
      atk: 40,
      hatk: 38,
      def: 36,
      hdef: 20,
      hit: 108.0,
      evade: 70,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 380,
    },
    high_magic: {
      atk: 38,
      hatk: 60,
      def: 38,
      hdef: 40,
      hit: 108.0,
      evade: 20,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 390,
    },
  },
  17: {
    normal: {
      atk: 44,
      hatk: 40,
      def: 42,
      hdef: 21,
      hit: 108.5,
      evade: 21,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 420,
    },
    high_dodge: {
      atk: 42,
      hatk: 40,
      def: 38,
      hdef: 21,
      hit: 108.5,
      evade: 73,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 400,
    },
    high_magic: {
      atk: 40,
      hatk: 63,
      def: 40,
      hdef: 42,
      hit: 108.5,
      evade: 21,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 410,
    },
  },
  18: {
    normal: {
      atk: 46,
      hatk: 42,
      def: 44,
      hdef: 22,
      hit: 109.0,
      evade: 22,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 440,
    },
    high_dodge: {
      atk: 44,
      hatk: 42,
      def: 40,
      hdef: 22,
      hit: 109.0,
      evade: 76,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 420,
    },
    high_magic: {
      atk: 42,
      hatk: 66,
      def: 42,
      hdef: 44,
      hit: 109.0,
      evade: 22,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 430,
    },
  },
  19: {
    normal: {
      atk: 48,
      hatk: 44,
      def: 46,
      hdef: 23,
      hit: 109.5,
      evade: 23,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 460,
    },
    high_dodge: {
      atk: 46,
      hatk: 44,
      def: 42,
      hdef: 23,
      hit: 109.5,
      evade: 79,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.1,
      maxHp: 440,
    },
    high_magic: {
      atk: 44,
      hatk: 69,
      def: 44,
      hdef: 46,
      hit: 109.5,
      evade: 23,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0.2,
      maxHp: 450,
    },
  },
  // 20级敌人配置
  20: {
    normal: {
      atk: 50,
      hatk: 46,
      def: 48,
      hdef: 24,
      hit: 110.0,
      evade: 24,
      critRate: 0.1,
      critDamageMultiplier: 2.0,
      hhp: 0.3,
      maxHp: 500,
    },
    high_dodge: {
      atk: 48,
      hatk: 46,
      def: 44,
      hdef: 24,
      hit: 110.0,
      evade: 82,
      critRate: 0.1,
      critDamageMultiplier: 2.0,
      hhp: 0.3,
      maxHp: 480,
    },
    high_magic: {
      atk: 46,
      hatk: 72,
      def: 46,
      hdef: 48,
      hit: 110.0,
      evade: 24,
      critRate: 0.1,
      critDamageMultiplier: 2.0,
      hhp: 0.5,
      maxHp: 490,
    },
  },
};

// ==================== 技能映射 ====================

/**
 * 基于种族和变体的技能映射表
 * 现在引用技能数据文件中的技能ID
 */
export const ENEMY_SKILLS_MAPPING: Record<string, Record<string, string[]>> = {
  猫妖: {
    主播: ['power_strike'],
    女仆: ['power_strike'],
  },
  犬妖: {
    保镖: ['power_strike'],
    运动系: ['power_strike'],
  },
  附身灵: {
    OL: ['power_strike'],
    辣妹: ['power_strike'],
  },
};

// ==================== 立绘映射 ====================

/**
 * 基于种族和变体的立绘映射表
 *
 * 路径格式说明：
 * - 本地资源：使用简化格式，只需填写相对于 assets 文件夹的路径
 *   例如：images/enemies/cat_streamer.png
 *   系统会自动定位 assets 文件夹并构建完整路径
 * - 外部 URL：直接使用完整 URL
 *   例如：https://files.catbox.moe/899p4x.png
 */
export const ENEMY_PORTRAIT_MAPPING: Record<string, Record<string, string>> = {
  猫妖: {
    主播: 'images/enemies/cat_streamer.png',
    女仆: 'images/enemies/cat_maid.png',
  },
  犬妖: {
    保镖: 'images/enemies/dog_guard.png',
    运动系: 'images/enemies/dog_sporty.png',
  },
  附身灵: {
    OL: 'https://files.catbox.moe/899p4x.png',
    辣妹: 'https://files.catbox.moe/qpq49n.png',
  },
};

// ==================== 背景映射 ====================

/**
 * 基于地点的背景图片映射表
 * 支持关键字匹配和默认背景
 */
export const LOCATION_BACKGROUND_MAPPING: Record<string, string> = {
  街道: '../../assets/images/backgrounds/street.jpg',
};

// ==================== 核心查询函数 ====================

/**
 * 根据种族和变体确定敌人类型
 * @param race 种族
 * @param variantId 变体ID
 * @returns 敌人类型
 */
export function getEnemyTypeByRaceAndVariant(race: string, variantId: string): EnemyType {
  const raceMapping = ENEMY_TYPE_MAPPING[race];
  if (!raceMapping) {
    return 'normal'; // 默认类型
  }

  return raceMapping[variantId] || 'normal'; // 默认类型
}

/**
 * 获取敌人战斗属性（直接返回硬编码配置）
 * @param level 敌人等级 (1-20)
 * @param type 敌人类型
 * @returns 战斗属性配置
 */
export function getEnemyBattleStats(level: number, type: EnemyType): EnemyBattleStats {
  const levelConfig = ENEMY_BATTLE_STATS_CONFIG[level];
  if (!levelConfig) {
    throw new Error(`未找到等级 ${level} 的敌人配置`);
  }

  const typeConfig = levelConfig[type];
  if (!typeConfig) {
    throw new Error(`未找到类型 ${type} 的敌人配置`);
  }

  return { ...typeConfig };
}

/**
 * 根据种族和变体获取技能列表（增强版）
 * 现在会验证技能ID的有效性
 */
export function getSkillsByRaceAndVariant(race: string, variantId: string): string[] {
  const raceSkills = ENEMY_SKILLS_MAPPING[race];
  if (!raceSkills) {
    return ['power_strike']; // 默认技能
  }

  const variantSkills = raceSkills[variantId];
  if (!variantSkills) {
    return ['power_strike']; // 默认技能
  }

  // 验证所有技能ID的有效性
  const validSkills = variantSkills.filter(skillId => isValidSkillId(skillId));

  // 如果有无效技能，记录警告
  const invalidSkills = variantSkills.filter(skillId => !isValidSkillId(skillId));
  if (invalidSkills.length > 0) {
    console.warn(`[enemyConfig] 发现无效技能ID: ${invalidSkills.join(', ')}`);
  }

  return validSkills.length > 0 ? validSkills : ['power_strike'];
}

/**
 * 根据种族和变体获取敌人立绘URL
 * @param race 种族
 * @param variantId 变体ID
 * @returns 立绘URL
 */
export function getEnemyPortraitByRaceAndVariant(race: string, variantId: string): string {
  const raceMap = ENEMY_PORTRAIT_MAPPING[race];
  if (!raceMap) {
    return 'https://example.com/default_enemy.png';
  }

  const portrait = raceMap[variantId];
  return portrait || raceMap['default'] || 'https://example.com/default_enemy.png';
}

/**
 * 根据地点关键字获取背景图片URL
 * @param location 地点名称
 * @returns 背景图片URL
 */
export function getBackgroundByLocationKeyword(location: string): string {
  // 关键字匹配
  for (const [keyword, backgroundUrl] of Object.entries(LOCATION_BACKGROUND_MAPPING)) {
    if (location.includes(keyword)) {
      return backgroundUrl;
    }
  }

  // 默认背景
  return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop';
}

/**
 * 获取所有支持的种族列表
 * @returns 种族列表
 */
export function getSupportedRaces(): string[] {
  return Object.keys(ENEMY_TYPE_MAPPING);
}

/**
 * 获取指定种族支持的所有变体列表
 * @param race 种族
 * @returns 变体列表
 */
export function getSupportedVariants(race: string): string[] {
  const raceMapping = ENEMY_TYPE_MAPPING[race];
  return raceMapping ? Object.keys(raceMapping) : [];
}

/**
 * 验证种族和变体组合是否有效
 * @param race 种族
 * @param variantId 变体ID
 * @returns 是否有效
 */
export function isValidRaceVariantCombination(race: string, variantId: string): boolean {
  const raceMapping = ENEMY_TYPE_MAPPING[race];
  return raceMapping ? variantId in raceMapping : false;
}

// ==================== 技能资源映射 ====================

/**
 * 技能资源映射表
 * 支持为每个技能配置多个资源（视频/图片），并根据敌人类型和变体选择
 *
 * 配置格式：
 * - 每个技能ID对应一个资源配置数组
 * - 每个资源配置可以包含选择条件（race, variantId, enemyType, tags）
 * - 系统会根据敌人信息自动选择匹配的资源
 *
 * 选择优先级：
 * 1. 精确匹配（同时匹配 race 和 variantId）
 * 2. 类型匹配（匹配 enemyType）
 * 3. 种族匹配（仅匹配 race）
 * 4. 默认资源（无条件的资源或第一个资源）
 */
export const ENEMY_SKILL_RESOURCES_MAPPING: Record<string, SkillResourceConfig[]> = {
  // 示例：power_strike 技能的多资源配置
  power_strike: [
    // 猫妖主播的专属资源（随机从两个视频中选择）
    {
      src: 'https://files.catbox.moe/zk5lpz.mp4',
      type: 'video' as const,
      conditions: {
        race: '猫妖',
        variantId: '主播',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/88jeby.mp4',
      type: 'video' as const,
      conditions: {
        race: '猫妖',
        variantId: '主播',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    // 犬妖运动系的专属资源（随机从六个图片中选择）
    {
      src: 'https://files.catbox.moe/40zt4t.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '运动系',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/6z2y2p.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '运动系',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/wni142.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '运动系',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/h13dj2.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '运动系',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/yzxkd6.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '运动系',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/f7bwww.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '运动系',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    // 犬妖保镖的专属资源（随机从六个图片中选择）
    {
      src: 'https://files.catbox.moe/aiqcab.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '保镖',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/ol9fkb.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '保镖',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/qtupxr.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '保镖',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/a0r0yj.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '保镖',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/0jv5yy.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '保镖',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
    {
      src: 'https://files.catbox.moe/178e9h.png',
      type: 'image' as const,
      conditions: {
        race: '犬妖',
        variantId: '保镖',
      },
      loop: false,
      volume: 0,
      playbackRate: 1.0,
      revertOnEnd: true,
    },
  ],
  // 可以继续添加其他技能的资源映射
};

/**
 * 根据敌人信息选择技能资源
 * @param skillId 技能ID
 * @param race 敌人种族
 * @param variantId 敌人变体ID
 * @param enemyType 敌人类型
 * @returns 选中的资源配置，如果未找到则返回 undefined
 */
export function getSkillResourceByRaceAndVariant(
  skillId: string,
  race: string,
  variantId: string,
  enemyType: EnemyType,
): SkillResourceConfig | undefined {
  const resources = ENEMY_SKILL_RESOURCES_MAPPING[skillId];
  if (!resources || resources.length === 0) {
    return undefined;
  }

  // 评分系统：为每个资源计算匹配分数
  const scoredResources = resources.map(resource => {
    let score = 0;
    const conditions = resource.conditions;

    if (!conditions) {
      // 无条件的资源作为默认资源，分数为0
      return { resource, score: 0 };
    }

    // 精确匹配：同时匹配 race 和 variantId（最高优先级）
    if (conditions.race === race && conditions.variantId === variantId) {
      score = 100;
    }
    // 类型匹配：匹配 enemyType（次高优先级）
    else if (conditions.enemyType === enemyType) {
      score = 50;
    }
    // 种族匹配：仅匹配 race（较低优先级）
    else if (conditions.race === race && !conditions.variantId) {
      score = 25;
    }
    // 变体匹配：仅匹配 variantId（较低优先级）
    else if (conditions.variantId === variantId && !conditions.race) {
      score = 20;
    }

    return { resource, score };
  });

  // 按分数排序，选择分数最高的资源
  scoredResources.sort((a, b) => b.score - a.score);

  // 如果最高分数为0，说明没有匹配的资源，返回第一个默认资源
  if (scoredResources[0].score === 0) {
    // 查找第一个无条件的资源
    const defaultResource = resources.find(r => !r.conditions);
    return defaultResource || resources[0];
  }

  // 找到所有最高分的资源（可能有多个相同最高分）
  const maxScore = scoredResources[0].score;
  const topScoredResources = scoredResources.filter(item => item.score === maxScore);

  // 如果有多个最高分资源，随机选择一个
  if (topScoredResources.length > 1) {
    const randomIndex = Math.floor(Math.random() * topScoredResources.length);
    return topScoredResources[randomIndex].resource;
  }

  // 只有一个最高分资源，直接返回
  return scoredResources[0].resource;
}

/**
 * 获取技能的所有资源配置
 * @param skillId 技能ID
 * @returns 资源配置数组，如果未找到则返回空数组
 */
export function getSkillResources(skillId: string): SkillResourceConfig[] {
  return ENEMY_SKILL_RESOURCES_MAPPING[skillId] || [];
}

/**
 * 获取所有精确匹配的资源（用于预加载）
 * 只返回精确匹配的资源（同时匹配 race 和 variantId），不返回其他匹配的资源
 * @param skillId 技能ID
 * @param race 敌人种族
 * @param variantId 敌人变体ID
 * @param enemyType 敌人类型（此参数保留用于兼容性，但不会被使用）
 * @returns 精确匹配的资源数组
 */
export function getAllMatchingSkillResources(
  skillId: string,
  race: string,
  variantId: string,
  _enemyType: EnemyType,
): SkillResourceConfig[] {
  const resources = ENEMY_SKILL_RESOURCES_MAPPING[skillId];
  if (!resources || resources.length === 0) {
    return [];
  }

  // 只返回精确匹配的资源（同时匹配 race 和 variantId）
  const exactMatches = resources.filter(resource => {
    const conditions = resource.conditions;
    if (!conditions) {
      // 无条件的资源不作为精确匹配
      return false;
    }
    // 精确匹配：同时匹配 race 和 variantId
    return conditions.race === race && conditions.variantId === variantId;
  });

  return exactMatches;
}

/**
 * 为技能列表生成资源映射
 * 根据敌人信息为每个技能选择最匹配的资源
 * @param skillIds 技能ID列表
 * @param race 敌人种族
 * @param variantId 敌人变体ID
 * @param enemyType 敌人类型
 * @returns 技能ID到资源配置的映射（兼容旧格式）
 */
export function generateSkillResourceMap(
  skillIds: string[],
  race: string,
  variantId: string,
  enemyType: EnemyType,
): Record<string, SkillResourceConfig> {
  const resourceMap: Record<string, SkillResourceConfig> = {};

  for (const skillId of skillIds) {
    const resource = getSkillResourceByRaceAndVariant(skillId, race, variantId, enemyType);
    if (resource) {
      resourceMap[skillId] = resource;
    }
  }

  return resourceMap;
}

// ==================== 敌人弱点配置 ====================

/**
 * 根据种族和变体获取敌人弱点类型
 * 注意：敌人弱点会动态随机配置，此函数仅作为备用或默认值获取
 * @param _race 种族（预留参数，目前未使用）
 * @param _variantId 变体ID（预留参数，目前未使用）
 * @returns 弱点类型（'体术' | '符术'），如果未配置则返回 undefined
 */
export function getEnemyWeakness(_race: string, _variantId: string): '体术' | '符术' | undefined {
  // 注意：此函数目前返回 undefined，因为弱点会动态随机配置
  // 如果后续需要预设弱点，可以在此添加映射表
  // 例如：
  // const weaknessMapping: Record<string, Record<string, '体术' | '符术'>> = {
  //   人类: { 战士: '体术', 法师: '符术' },
  //   ...
  // };
  return undefined;
}
