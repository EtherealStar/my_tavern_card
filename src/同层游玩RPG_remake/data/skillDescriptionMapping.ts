/**
 * 技能描述映射配置
 *
 * 本文件定义了技能ID到描述类型的映射关系
 */

import { DescriptionType, SkillDescriptionConfig } from '../models/BattleLogSchemas';

// 技能描述映射配置
export const SKILL_DESCRIPTION_MAPPING: Record<string, SkillDescriptionConfig> = {
  // 通用物理技能
  basic_attack: { skillId: 'basic_attack', type: DescriptionType.PHYSICAL },
  sword_strike: { skillId: 'sword_strike', type: DescriptionType.PHYSICAL },
  bow_shot: { skillId: 'bow_shot', type: DescriptionType.PHYSICAL },
  dagger_thrust: { skillId: 'dagger_thrust', type: DescriptionType.PHYSICAL },
  axe_swing: { skillId: 'axe_swing', type: DescriptionType.PHYSICAL },
  spear_thrust: { skillId: 'spear_thrust', type: DescriptionType.PHYSICAL },
  mace_bash: { skillId: 'mace_bash', type: DescriptionType.PHYSICAL },
  claw_attack: { skillId: 'claw_attack', type: DescriptionType.PHYSICAL },
  bite_attack: { skillId: 'bite_attack', type: DescriptionType.PHYSICAL },
  tail_sweep: { skillId: 'tail_sweep', type: DescriptionType.PHYSICAL },

  // 通用魔法技能
  magic_missile: { skillId: 'magic_missile', type: DescriptionType.MAGICAL },
  arcane_blast: { skillId: 'arcane_blast', type: DescriptionType.MAGICAL },
  energy_blast: { skillId: 'energy_blast', type: DescriptionType.MAGICAL },
  spell_bolt: { skillId: 'spell_bolt', type: DescriptionType.MAGICAL },
  magic_beam: { skillId: 'magic_beam', type: DescriptionType.MAGICAL },
  arcane_ray: { skillId: 'arcane_ray', type: DescriptionType.MAGICAL },
  spell_strike: { skillId: 'spell_strike', type: DescriptionType.MAGICAL },

  // 专属技能 - 火系
  fireball: {
    skillId: 'fireball',
    type: DescriptionType.CUSTOM,
    customDescription: 'fireball',
  },
  fire_blast: {
    skillId: 'fire_blast',
    type: DescriptionType.CUSTOM,
    customDescription: 'fireball', // 复用火球描述
  },
  flame_strike: {
    skillId: 'flame_strike',
    type: DescriptionType.CUSTOM,
    customDescription: 'fireball',
  },

  // 专属技能 - 治疗系
  heal: {
    skillId: 'heal',
    type: DescriptionType.CUSTOM,
    customDescription: 'heal',
  },
  greater_heal: {
    skillId: 'greater_heal',
    type: DescriptionType.CUSTOM,
    customDescription: 'heal',
  },
  heal_potion: {
    skillId: 'heal_potion',
    type: DescriptionType.CUSTOM,
    customDescription: 'heal',
  },

  // 专属技能 - 雷系
  lightning_bolt: {
    skillId: 'lightning_bolt',
    type: DescriptionType.CUSTOM,
    customDescription: 'lightning_bolt',
  },
  thunder_strike: {
    skillId: 'thunder_strike',
    type: DescriptionType.CUSTOM,
    customDescription: 'lightning_bolt',
  },
  electric_shock: {
    skillId: 'electric_shock',
    type: DescriptionType.CUSTOM,
    customDescription: 'lightning_bolt',
  },

  // 专属技能 - 冰系
  ice_shard: {
    skillId: 'ice_shard',
    type: DescriptionType.CUSTOM,
    customDescription: 'ice_shard',
  },
  frost_bolt: {
    skillId: 'frost_bolt',
    type: DescriptionType.CUSTOM,
    customDescription: 'ice_shard',
  },
  ice_blast: {
    skillId: 'ice_blast',
    type: DescriptionType.CUSTOM,
    customDescription: 'ice_shard',
  },

  // 专属技能 - 土系
  earth_spike: {
    skillId: 'earth_spike',
    type: DescriptionType.CUSTOM,
    customDescription: 'earth_spike',
  },
  stone_throw: {
    skillId: 'stone_throw',
    type: DescriptionType.CUSTOM,
    customDescription: 'earth_spike',
  },
  rock_slide: {
    skillId: 'rock_slide',
    type: DescriptionType.CUSTOM,
    customDescription: 'earth_spike',
  },

  // 专属技能 - 风系
  wind_slash: {
    skillId: 'wind_slash',
    type: DescriptionType.CUSTOM,
    customDescription: 'wind_slash',
  },
  air_cutter: {
    skillId: 'air_cutter',
    type: DescriptionType.CUSTOM,
    customDescription: 'wind_slash',
  },
  tornado: {
    skillId: 'tornado',
    type: DescriptionType.CUSTOM,
    customDescription: 'wind_slash',
  },

  // 专属技能 - 暗系
  shadow_bolt: {
    skillId: 'shadow_bolt',
    type: DescriptionType.CUSTOM,
    customDescription: 'shadow_bolt',
  },
  dark_magic: {
    skillId: 'dark_magic',
    type: DescriptionType.CUSTOM,
    customDescription: 'shadow_bolt',
  },
  shadow_strike: {
    skillId: 'shadow_strike',
    type: DescriptionType.CUSTOM,
    customDescription: 'shadow_bolt',
  },

  // 专属技能 - 光系
  holy_light: {
    skillId: 'holy_light',
    type: DescriptionType.CUSTOM,
    customDescription: 'holy_light',
  },
  divine_strike: {
    skillId: 'divine_strike',
    type: DescriptionType.CUSTOM,
    customDescription: 'holy_light',
  },
  blessing: {
    skillId: 'blessing',
    type: DescriptionType.CUSTOM,
    customDescription: 'holy_light',
  },
};

/**
 * 获取技能描述配置
 * @param skillId 技能ID
 * @returns 技能描述配置，如果未找到则返回默认物理攻击配置
 */
export function getSkillDescriptionConfig(skillId: string): SkillDescriptionConfig {
  return (
    SKILL_DESCRIPTION_MAPPING[skillId] || {
      skillId,
      type: DescriptionType.PHYSICAL,
    }
  );
}

/**
 * 检查技能是否有专属描述
 * @param skillId 技能ID
 * @returns 是否有专属描述
 */
export function hasCustomDescription(skillId: string): boolean {
  const config = SKILL_DESCRIPTION_MAPPING[skillId];
  return config?.type === DescriptionType.CUSTOM;
}

/**
 * 获取所有已注册的技能ID
 * @returns 技能ID列表
 */
export function getAllSkillIds(): string[] {
  return Object.keys(SKILL_DESCRIPTION_MAPPING);
}

/**
 * 根据描述类型获取技能列表
 * @param type 描述类型
 * @returns 该类型的技能ID列表
 */
export function getSkillsByType(type: DescriptionType): string[] {
  return Object.entries(SKILL_DESCRIPTION_MAPPING)
    .filter(([_, config]) => config.type === type)
    .map(([skillId, _]) => skillId);
}
