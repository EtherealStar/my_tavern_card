import { isValidSkillId } from '../../data/skills';

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
  人类: {
    战士: ['power_strike', 'defend'],
    法师: ['fireball', 'ice_shard'],
    盗贼: ['precise_strike', 'stealth'],
    弓箭手: ['precise_strike', 'multi_shot'],
    牧师: ['heal', 'bless'],
  },
  兽人: {
    战士: ['power_strike', 'defend'],
    萨满: ['fireball', 'heal'],
    狂战士: ['power_strike', 'berserker_rage'],
    猎手: ['precise_strike', 'track'],
  },
  精灵: {
    弓箭手: ['precise_strike', 'nature_arrow'],
    德鲁伊: ['heal', 'nature_bolt'],
    法师: ['fireball', 'ice_shard'],
    游侠: ['precise_strike', 'animal_companion'],
  },
  矮人: {
    战士: ['power_strike', 'shield_bash'],
    工匠: ['defend', 'repair'],
    牧师: ['heal', 'bless'],
  },
  龙族: {
    龙战士: ['dragon_breath', 'power_strike'],
    龙法师: ['dragon_breath', 'fireball'],
    龙骑士: ['dragon_breath', 'charge'],
  },
};

// ==================== 立绘映射 ====================

/**
 * 基于种族和变体的立绘映射表
 * 支持不同种族和职业的立绘选择
 */
export const ENEMY_PORTRAIT_MAPPING: Record<string, Record<string, string>> = {
  人类: {
    战士: 'https://example.com/human_warrior.png',
    法师: 'https://example.com/human_mage.png',
    盗贼: 'https://example.com/human_rogue.png',
    弓箭手: 'https://example.com/human_archer.png',
    牧师: 'https://example.com/human_priest.png',
  },
  兽人: {
    战士: 'https://example.com/orc_warrior.png',
    萨满: 'https://example.com/orc_shaman.png',
    狂战士: 'https://example.com/orc_berserker.png',
    猎手: 'https://example.com/orc_hunter.png',
  },
  精灵: {
    弓箭手: 'https://example.com/elf_archer.png',
    德鲁伊: 'https://example.com/elf_druid.png',
    法师: 'https://example.com/elf_mage.png',
    游侠: 'https://example.com/elf_ranger.png',
  },
  矮人: {
    战士: 'https://example.com/dwarf_warrior.png',
    工匠: 'https://example.com/dwarf_craftsman.png',
    牧师: 'https://example.com/dwarf_priest.png',
  },
  龙族: {
    龙战士: 'https://example.com/dragon_warrior.png',
    龙法师: 'https://example.com/dragon_mage.png',
    龙骑士: 'https://example.com/dragon_knight.png',
  },
};

// ==================== 背景映射 ====================

/**
 * 基于地点的背景图片映射表
 * 支持关键字匹配和默认背景
 */
export const LOCATION_BACKGROUND_MAPPING: Record<string, string> = {
  街道: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&h=1080&fit=crop',
  学校: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&h=1080&fit=crop',
  森林: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
  地牢: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
  城市: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&h=1080&fit=crop',
  神殿: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
  洞穴: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
  城堡: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
  村庄: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&h=1080&fit=crop',
  荒野: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
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
