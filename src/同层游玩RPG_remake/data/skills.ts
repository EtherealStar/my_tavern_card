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
    hitModifier: 0,
    critBonus: 0.05,
    mpCost: 0,
    animationKey: 'power_strike',
    tags: ['basic', 'physical', '体术'],
  },
  // 探查技能
  {
    id: 'investigate_weakness',
    name: '探查弱点',
    description: '探查敌人的弱点类型',
    category: 'magical',
    target: 'single',
    powerMultiplier: 0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 8,
    animationKey: 'investigate',
    tags: ['investigate', 'magical'],
  },

  // 物理攻击技能 
  {
    id: 'slash_1001',
    name: '斩击',
    description: '将灵能蓄积于木刀之上，斩击敌人',
    category: 'physical',
    target: 'single',
    powerMultiplier: 2.0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 6,
    animationKey: 'slash',
    tags: ['basic', 'physical', '体术'],
  },
  {
    id: 'iai_slash_1002',
    name: '居合',
    description: '蓄力后瞬间拔刀，斩出一击',
    category: 'physical',
    target: 'single',
    powerMultiplier: 4.0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 24,
    animationKey: 'iai_slash',
    tags: ['physical', '体术'],
  },

  // 符术技能 
  {
    id: 'demon_break_talisman_1011',
    name: '破魔符',
    description: '丢出封印了灵能的破魔符，对敌人造成伤害',
    category: 'physical',
    target: 'single',
    powerMultiplier: 1.8,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 6,
    animationKey: 'demon_break_talisman',
    tags: ['physical', '符术'],
  },
  {
    id: 'flame_talisman_1012',
    name: '火炎符',
    description: '丢出火炎符，变化为火球，对敌人造成伤害',
    category: 'physical',
    target: 'single',
    powerMultiplier: 3.6,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 22,
    animationKey: 'flame_talisman',
    tags: ['physical', '符术'],
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
