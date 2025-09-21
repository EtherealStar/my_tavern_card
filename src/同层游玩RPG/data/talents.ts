import type { Talent } from '../models/schemas';

export const TALENTS: Talent[] = [
  // 通用天赋
  {
    id: 'strong',
    name: '天生神力',
    description: '生来就拥有过人的力量',
    cost: 2,
    attributeBonus: { strength: 3 },
  },
  {
    id: 'agile',
    name: '身轻如燕',
    description: '动作敏捷，反应迅速',
    cost: 2,
    attributeBonus: { agility: 3 },
  },
  {
    id: 'intelligent',
    name: '过目不忘',
    description: '记忆力和学习能力超群',
    cost: 2,
    attributeBonus: { intelligence: 3 },
  },
  {
    id: 'tough',
    name: '铜皮铁骨',
    description: '体质强健，抗打击能力强',
    cost: 2,
    attributeBonus: { constitution: 3 },
  },
  {
    id: 'charismatic',
    name: '天生魅力',
    description: '容貌出众，气质非凡',
    cost: 2,
    attributeBonus: { charisma: 3 },
  },
  {
    id: 'willful',
    name: '意志坚定',
    description: '精神力强大，不易被影响',
    cost: 2,
    attributeBonus: { willpower: 3 },
  },
  {
    id: 'lucky',
    name: '天命所归',
    description: '运气超凡，总能逢凶化吉',
    cost: 3,
    attributeBonus: { luck: 4 },
  },
  {
    id: 'balanced',
    name: '全能发展',
    description: '各方面都有不错的表现',
    cost: 3,
    attributeBonus: { strength: 1, agility: 1, intelligence: 1, constitution: 1, charisma: 1, willpower: 1 },
  },

  // 西幻专属天赋
  {
    id: 'mana_affinity',
    name: '魔力亲和',
    description: '对魔法元素有天然的亲和力',
    cost: 3,
    attributeBonus: { intelligence: 2, willpower: 2 },
    world: '西幻',
  },
  {
    id: 'dragon_blood',
    name: '龙族血脉',
    description: '体内流淌着古龙的血液',
    cost: 4,
    attributeBonus: { strength: 2, constitution: 2, charisma: 1 },
    world: '西幻',
  },
  {
    id: 'blessed',
    name: '神明庇护',
    description: '受到神明的特殊眷顾',
    cost: 3,
    attributeBonus: { willpower: 2, luck: 2 },
    world: '西幻',
  },

  // 都市专属天赋
  {
    id: 'tech_genius',
    name: '科技天才',
    description: '对现代科技有超凡的理解力',
    cost: 3,
    attributeBonus: { intelligence: 3, agility: 1 },
    world: '都市',
  },
  {
    id: 'social_butterfly',
    name: '社交达人',
    description: '在任何社交场合都能如鱼得水',
    cost: 2,
    attributeBonus: { charisma: 2, intelligence: 1 },
    world: '都市',
  },
  {
    id: 'urban_survivor',
    name: '都市生存者',
    description: '在复杂的都市环境中如鱼得水',
    cost: 2,
    attributeBonus: { agility: 1, intelligence: 1, willpower: 1 },
    world: '都市',
  },

  // 武侠专属天赋
  {
    id: 'martial_prodigy',
    name: '武学奇才',
    description: '对武功的领悟能力超群',
    cost: 4,
    attributeBonus: { strength: 2, agility: 2, willpower: 1 },
    world: '武侠',
  },
  {
    id: 'inner_power',
    name: '内力深厚',
    description: '天生内力雄厚，修炼事半功倍',
    cost: 3,
    attributeBonus: { constitution: 2, willpower: 2 },
    world: '武侠',
  },
  {
    id: 'sword_heart',
    name: '剑心通明',
    description: '对剑术有天生的领悟',
    cost: 3,
    attributeBonus: { agility: 2, willpower: 1, charisma: 1 },
    world: '武侠',
  },

  // 仙侠专属天赋
  {
    id: 'immortal_root',
    name: '仙灵根骨',
    description: '天生的修仙资质，灵根纯净',
    cost: 5,
    attributeBonus: { intelligence: 3, willpower: 3 },
    world: '仙侠',
  },
  {
    id: 'heaven_defying',
    name: '逆天改命',
    description: '能够逆转天命，改写因果',
    cost: 6,
    attributeBonus: { luck: 3, willpower: 2, intelligence: 1 },
    world: '仙侠',
  },
  {
    id: 'pill_constitution',
    name: '丹药之体',
    description: '对各种丹药效果有加成',
    cost: 3,
    attributeBonus: { constitution: 2, intelligence: 1, luck: 1 },
    world: '仙侠',
  },
];

export function getTalentsForWorld(world: string): Talent[] {
  return TALENTS.filter(talent => !talent.world || talent.world === world);
}
