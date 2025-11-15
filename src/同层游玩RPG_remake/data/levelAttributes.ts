/**
 * 等级属性配置表
 * 基于升级表图片数据，定义1-20级每级的基础属性值
 *
 * 属性说明：
 * - strength: 力量
 * - intelligence: 智力
 * - agility: 敏捷
 * - defense: 防御
 * - constitution: 体质
 * - charisma: 魅力
 * - willpower: 意志
 * - luck: 幸运
 */

export interface LevelAttributes {
  strength: number;
  intelligence: number;
  agility: number;
  defense: number;
  constitution: number;
  charisma: number;
  willpower: number;
  luck: number;
}

/**
 * 等级属性表（1-20级）
 * 数据来源：升级表图片
 */
export const LEVEL_ATTRIBUTES_TABLE: Record<number, LevelAttributes> = {
  1: { strength: 2, intelligence: 1, agility: 1, defense: 2, constitution: 4, charisma: 2, willpower: 2, luck: 1 },
  2: { strength: 3, intelligence: 2, agility: 2, defense: 3, constitution: 8, charisma: 3, willpower: 4, luck: 2 },
  3: { strength: 5, intelligence: 4, agility: 3, defense: 5, constitution: 12, charisma: 5, willpower: 5, luck: 3 },
  4: { strength: 8, intelligence: 6, agility: 5, defense: 8, constitution: 20, charisma: 8, willpower: 8, luck: 4 },
  5: { strength: 11, intelligence: 8, agility: 6, defense: 11, constitution: 28, charisma: 11, willpower: 12, luck: 6 },
  6: {
    strength: 15,
    intelligence: 12,
    agility: 9,
    defense: 15,
    constitution: 40,
    charisma: 15,
    willpower: 16,
    luck: 8,
  },
  7: {
    strength: 20,
    intelligence: 16,
    agility: 11,
    defense: 20,
    constitution: 52,
    charisma: 20,
    willpower: 21,
    luck: 11,
  },
  8: {
    strength: 26,
    intelligence: 20,
    agility: 15,
    defense: 26,
    constitution: 68,
    charisma: 26,
    willpower: 28,
    luck: 14,
  },
  9: {
    strength: 32,
    intelligence: 25,
    agility: 18,
    defense: 32,
    constitution: 84,
    charisma: 32,
    willpower: 34,
    luck: 17,
  },
  10: {
    strength: 39,
    intelligence: 31,
    agility: 22,
    defense: 39,
    constitution: 104,
    charisma: 39,
    willpower: 42,
    luck: 21,
  },
  11: {
    strength: 47,
    intelligence: 37,
    agility: 26,
    defense: 47,
    constitution: 124,
    charisma: 47,
    willpower: 50,
    luck: 25,
  },
  12: {
    strength: 56,
    intelligence: 44,
    agility: 31,
    defense: 56,
    constitution: 148,
    charisma: 56,
    willpower: 60,
    luck: 30,
  },
  13: {
    strength: 65,
    intelligence: 52,
    agility: 36,
    defense: 65,
    constitution: 172,
    charisma: 65,
    willpower: 69,
    luck: 35,
  },
  14: {
    strength: 75,
    intelligence: 60,
    agility: 42,
    defense: 75,
    constitution: 200,
    charisma: 75,
    willpower: 80,
    luck: 40,
  },
  15: {
    strength: 86,
    intelligence: 68,
    agility: 48,
    defense: 86,
    constitution: 228,
    charisma: 86,
    willpower: 92,
    luck: 46,
  },
  16: {
    strength: 98,
    intelligence: 78,
    agility: 55,
    defense: 98,
    constitution: 260,
    charisma: 98,
    willpower: 104,
    luck: 52,
  },
  17: {
    strength: 110,
    intelligence: 88,
    agility: 61,
    defense: 110,
    constitution: 292,
    charisma: 110,
    willpower: 117,
    luck: 59,
  },
  18: {
    strength: 123,
    intelligence: 98,
    agility: 69,
    defense: 123,
    constitution: 328,
    charisma: 123,
    willpower: 132,
    luck: 66,
  },
  19: {
    strength: 137,
    intelligence: 109,
    agility: 76,
    defense: 137,
    constitution: 364,
    charisma: 137,
    willpower: 146,
    luck: 73,
  },
  20: {
    strength: 150,
    intelligence: 120,
    agility: 84,
    defense: 150,
    constitution: 400,
    charisma: 150,
    willpower: 160,
    luck: 80,
  },
};

/**
 * 获取指定等级的基础属性
 * @param level 等级（1-20）
 * @returns 该等级的基础属性值，如果等级无效则返回null
 */
export function getAttributesByLevel(level: number): LevelAttributes | null {
  const clampedLevel = Math.max(1, Math.min(20, Math.floor(level)));
  return LEVEL_ATTRIBUTES_TABLE[clampedLevel] || null;
}

/**
 * 计算从某个等级升级到另一个等级的属性增量
 * @param fromLevel 起始等级
 * @param toLevel 目标等级
 * @returns 属性增量对象，如果等级无效则返回null
 */
export function getAttributeIncrement(fromLevel: number, toLevel: number): LevelAttributes | null {
  const fromAttrs = getAttributesByLevel(fromLevel);
  const toAttrs = getAttributesByLevel(toLevel);

  if (!fromAttrs || !toAttrs) {
    return null;
  }

  return {
    strength: toAttrs.strength - fromAttrs.strength,
    intelligence: toAttrs.intelligence - fromAttrs.intelligence,
    agility: toAttrs.agility - fromAttrs.agility,
    defense: toAttrs.defense - fromAttrs.defense,
    constitution: toAttrs.constitution - fromAttrs.constitution,
    charisma: toAttrs.charisma - fromAttrs.charisma,
    willpower: toAttrs.willpower - fromAttrs.willpower,
    luck: toAttrs.luck - fromAttrs.luck,
  };
}

/**
 * 验证等级是否有效
 * @param level 等级
 * @returns 是否在有效范围内（1-20）
 */
export function isValidLevel(level: number): boolean {
  const num = Math.floor(level);
  return num >= 1 && num <= 20 && Number.isFinite(num);
}

