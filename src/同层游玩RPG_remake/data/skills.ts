/**
 * 技能数据文件
 *
 * 本文件包含所有技能的定义和配置，与战斗配置和动态敌人系统协同工作
 */

import { Skill } from '../models/BattleSchemas';

/**
 * 默认技能配置
 * 包含所有基础技能的定义
 */
export const DEFAULT_SKILLS: Skill[] = [
  // 物理攻击技能
  {
    id: 'power_strike',
    name: '重击',
    description: '高威力、略低命中',
    category: 'physical',
    target: 'single',
    powerMultiplier: 1.5,
    flatPower: 0,
    hitModifier: -0.1,
    critBonus: 0.05,
    mpCost: 0,
    animationKey: 'power_strike',
    tags: ['basic', 'physical'],
  },
  {
    id: 'precise_strike',
    name: '精准打击',
    description: '低威力、高命中',
    category: 'physical',
    target: 'single',
    powerMultiplier: 0.9,
    flatPower: 0,
    hitModifier: 0.15,
    critBonus: 0,
    mpCost: 0,
    animationKey: 'precise_strike',
    tags: ['basic', 'physical'],
  },

  // 魔法攻击技能
  {
    id: 'fireball',
    name: '火球',
    description: '标准魔法伤害',
    category: 'magical',
    target: 'single',
    powerMultiplier: 1.2,
    flatPower: 5,
    hitModifier: 0,
    critBonus: 0.05,
    mpCost: 10,
    animationKey: 'fireball',
    tags: ['basic', 'magical', 'fire'],
  },
  {
    id: 'ice_shard',
    name: '冰晶',
    description: '冰系魔法攻击',
    category: 'magical',
    target: 'single',
    powerMultiplier: 1.1,
    flatPower: 3,
    hitModifier: 0,
    critBonus: 0.03,
    mpCost: 8,
    animationKey: 'ice_shard',
    tags: ['magical', 'ice'],
  },
  {
    id: 'lightning_bolt',
    name: '闪电术',
    description: '雷系魔法攻击',
    category: 'magical',
    target: 'single',
    powerMultiplier: 1.3,
    flatPower: 4,
    hitModifier: 0,
    critBonus: 0.08,
    mpCost: 12,
    animationKey: 'lightning_bolt',
    tags: ['magical', 'lightning'],
  },

  // 治疗技能
  {
    id: 'heal',
    name: '治疗',
    description: '恢复目标生命值',
    category: 'magical',
    target: 'single',
    powerMultiplier: 0.8,
    flatPower: 20,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 15,
    animationKey: 'heal',
    tags: ['healing', 'magical'],
  },

  // 防御技能
  {
    id: 'defend',
    name: '防御',
    description: '提升防御力',
    category: 'physical',
    target: 'self',
    powerMultiplier: 0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 0,
    animationKey: 'defend',
    tags: ['defensive', 'physical'],
  },

  // 特殊技能
  {
    id: 'magic_missile',
    name: '魔法飞弹',
    description: '基础魔法攻击',
    category: 'magical',
    target: 'single',
    powerMultiplier: 1.0,
    flatPower: 2,
    hitModifier: 0.1,
    critBonus: 0,
    mpCost: 5,
    animationKey: 'magic_missile',
    tags: ['magical', 'basic'],
  },
  {
    id: 'stealth',
    name: '潜行',
    description: '提升闪避率',
    category: 'physical',
    target: 'self',
    powerMultiplier: 0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 0,
    animationKey: 'stealth',
    tags: ['defensive', 'physical'],
  },
  {
    id: 'multi_shot',
    name: '多重射击',
    description: '对多个目标造成伤害',
    category: 'physical',
    target: 'all',
    powerMultiplier: 0.7,
    flatPower: 0,
    hitModifier: -0.05,
    critBonus: 0.02,
    mpCost: 0,
    animationKey: 'multi_shot',
    tags: ['physical', 'ranged'],
  },
  {
    id: 'bless',
    name: '祝福',
    description: '提升目标属性',
    category: 'magical',
    target: 'single',
    powerMultiplier: 0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 8,
    animationKey: 'bless',
    tags: ['support', 'magical'],
  },
  {
    id: 'berserker_rage',
    name: '狂战士之怒',
    description: '提升攻击力但降低防御',
    category: 'physical',
    target: 'self',
    powerMultiplier: 0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 0,
    animationKey: 'berserker_rage',
    tags: ['physical', 'self_buff'],
  },
  {
    id: 'track',
    name: '追踪',
    description: '提升命中率',
    category: 'physical',
    target: 'self',
    powerMultiplier: 0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 0,
    animationKey: 'track',
    tags: ['physical', 'self_buff'],
  },
  {
    id: 'nature_arrow',
    name: '自然之箭',
    description: '自然系远程攻击',
    category: 'physical',
    target: 'single',
    powerMultiplier: 1.1,
    flatPower: 2,
    hitModifier: 0.05,
    critBonus: 0.03,
    mpCost: 0,
    animationKey: 'nature_arrow',
    tags: ['physical', 'ranged', 'nature'],
  },
  {
    id: 'nature_bolt',
    name: '自然之怒',
    description: '自然系魔法攻击',
    category: 'magical',
    target: 'single',
    powerMultiplier: 1.2,
    flatPower: 3,
    hitModifier: 0,
    critBonus: 0.04,
    mpCost: 9,
    animationKey: 'nature_bolt',
    tags: ['magical', 'nature'],
  },
  {
    id: 'animal_companion',
    name: '动物伙伴',
    description: '召唤动物伙伴协助战斗',
    category: 'magical',
    target: 'self',
    powerMultiplier: 0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 20,
    animationKey: 'animal_companion',
    tags: ['magical', 'summon'],
  },
  {
    id: 'shield_bash',
    name: '盾击',
    description: '用盾牌攻击敌人',
    category: 'physical',
    target: 'single',
    powerMultiplier: 0.8,
    flatPower: 0,
    hitModifier: 0.1,
    critBonus: 0,
    mpCost: 0,
    animationKey: 'shield_bash',
    tags: ['physical', 'defensive'],
  },
  {
    id: 'repair',
    name: '修复',
    description: '修复装备',
    category: 'magical',
    target: 'self',
    powerMultiplier: 0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 12,
    animationKey: 'repair',
    tags: ['magical', 'utility'],
  },
  {
    id: 'craft',
    name: '制作',
    description: '制作物品',
    category: 'magical',
    target: 'self',
    powerMultiplier: 0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 15,
    animationKey: 'craft',
    tags: ['magical', 'utility'],
  },
  {
    id: 'dragon_breath',
    name: '龙息',
    description: '龙族的招牌技能',
    category: 'magical',
    target: 'all',
    powerMultiplier: 1.4,
    flatPower: 8,
    hitModifier: 0,
    critBonus: 0.1,
    mpCost: 25,
    animationKey: 'dragon_breath',
    tags: ['magical', 'dragon', 'breath'],
  },
  {
    id: 'charge',
    name: '冲锋',
    description: '冲向敌人造成伤害',
    category: 'physical',
    target: 'single',
    powerMultiplier: 1.3,
    flatPower: 0,
    hitModifier: 0.05,
    critBonus: 0.06,
    mpCost: 0,
    animationKey: 'charge',
    tags: ['physical', 'movement'],
  },
];

/**
 * 技能分类映射
 * 用于快速查找特定类型的技能
 */
export const SKILL_CATEGORIES = {
  physical: [
    'power_strike',
    'precise_strike',
    'defend',
    'stealth',
    'multi_shot',
    'berserker_rage',
    'track',
    'nature_arrow',
    'shield_bash',
    'charge',
  ],
  magical: [
    'fireball',
    'ice_shard',
    'lightning_bolt',
    'heal',
    'magic_missile',
    'bless',
    'nature_bolt',
    'animal_companion',
    'repair',
    'craft',
    'dragon_breath',
  ],
  healing: ['heal'],
  defensive: ['defend', 'stealth', 'shield_bash'],
  fire: ['fireball'],
  ice: ['ice_shard'],
  lightning: ['lightning_bolt'],
  nature: ['nature_arrow', 'nature_bolt', 'animal_companion'],
  dragon: ['dragon_breath'],
  utility: ['repair', 'craft'],
  summon: ['animal_companion'],
  self_buff: ['berserker_rage', 'track'],
  support: ['bless'],
  ranged: ['multi_shot', 'nature_arrow'],
  movement: ['charge'],
  breath: ['dragon_breath'],
} as const;

/**
 * 技能等级配置
 * 不同等级的技能有不同的效果
 */
export const SKILL_LEVEL_CONFIG = {
  power_strike: {
    1: { powerMultiplier: 1.5, hitModifier: -0.1 },
    2: { powerMultiplier: 1.7, hitModifier: -0.08 },
    3: { powerMultiplier: 1.9, hitModifier: -0.05 },
  },
  fireball: {
    1: { powerMultiplier: 1.2, flatPower: 5 },
    2: { powerMultiplier: 1.4, flatPower: 8 },
    3: { powerMultiplier: 1.6, flatPower: 12 },
  },
  heal: {
    1: { powerMultiplier: 0.8, flatPower: 20 },
    2: { powerMultiplier: 1.0, flatPower: 30 },
    3: { powerMultiplier: 1.2, flatPower: 45 },
  },
} as const;

/**
 * 获取技能配置
 */
export function getSkillConfig(skillId: string): Skill | undefined {
  return DEFAULT_SKILLS.find(skill => skill.id === skillId);
}

/**
 * 获取分类技能
 */
export function getSkillsByCategory(category: string): Skill[] {
  const skillIds = SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES];
  if (!skillIds) return [];

  return skillIds.map(id => getSkillConfig(id)).filter(Boolean) as Skill[];
}

/**
 * 获取所有技能
 */
export function getAllSkills(): Skill[] {
  return [...DEFAULT_SKILLS];
}

/**
 * 验证技能ID是否存在
 */
export function isValidSkillId(skillId: string): boolean {
  return DEFAULT_SKILLS.some(skill => skill.id === skillId);
}

/**
 * 根据标签获取技能
 */
export function getSkillsByTag(tag: string): Skill[] {
  return DEFAULT_SKILLS.filter(skill => skill.tags && skill.tags.includes(tag));
}

/**
 * 获取技能等级配置
 */
export function getSkillLevelConfig(skillId: string, level: number): Partial<Skill> | undefined {
  const skillConfig = SKILL_LEVEL_CONFIG[skillId as keyof typeof SKILL_LEVEL_CONFIG];
  if (!skillConfig) return undefined;

  return skillConfig[level as keyof typeof skillConfig];
}

/**
 * 获取技能统计信息
 */
export function getSkillStats(): {
  totalSkills: number;
  physicalSkills: number;
  magicalSkills: number;
  skillCategories: Record<string, number>;
} {
  const categories: Record<string, number> = {};

  DEFAULT_SKILLS.forEach(skill => {
    categories[skill.category] = (categories[skill.category] || 0) + 1;
  });

  return {
    totalSkills: DEFAULT_SKILLS.length,
    physicalSkills: categories.physical || 0,
    magicalSkills: categories.magical || 0,
    skillCategories: categories,
  };
}
