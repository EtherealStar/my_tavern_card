import type { Background, GameWorld } from '../models/CreationSchemas';
import type { UidToggle } from './worldExpansions';

export const BACKGROUNDS: Background[] = [
  // 通用出身
  // 西幻
  {
    id: 'mage_apprentice',
    name: '法师学徒',
    description: '魔法塔熏陶，奥术天赋卓越',
    cost: 3,
    attributeBonus: { defense: 2, willpower: 1 },
    world: '西幻',
    worldbookToggles: [
      // 示例：{ uid: 2001, enable: true }, // 法师相关世界书条目
      // { uid: 2002, enable: true }, // 奥术知识条目
    ],
    exclusiveToggles: [
      // 示例：{ uid: 3001, enable: false }, // 关闭战士相关条目
    ],
  },
  {
    id: 'temple_acolyte',
    name: '神殿侍从',
    description: '信仰虔诚，受神明庇护',
    cost: 2,
    attributeBonus: { willpower: 2 },
    world: '西幻',
    raceRestrictions: ['人族'],
    worldbookToggles: [
      // 示例：{ uid: 2003, enable: true }, // 神殿相关条目
      // { uid: 2004, enable: true }, // 信仰系统条目
    ],
    exclusiveToggles: [
      // 示例：{ uid: 2001, enable: false }, // 关闭法师学徒的条目
    ],
  },

  // 都市
  {
    id: 'fujiwara',
    name: '藤原末裔',
    description:
      '在你的家园和至亲消逝后，仅存的亲人守护着你的日常。但潜藏于你血脉的宿命终将苏醒，迫使你踏上揭开被遗忘的真相的道路。',
    cost: 1,
    attributeBonus: { charisma: 2, willpower: 2, luck: 1 },
    world: '现代：阴阳师',
    raceRestrictions: ['人族'],
    genderRestrictions: ['男性', '男生女相'],
    worldbookToggles: [
      { uid: 24, enable: true },
      // { uid: 1002, enable: true }, // 血脉觉醒条目
    ],
    exclusiveToggles: [
      // 示例：{ uid: 1003, enable: false }, // 关闭猫妖相关条目
      // { uid: 1004, enable: false }, // 关闭犬妖相关条目
    ],
  },
  {
    id: 'cat',
    name: '猫妖',
    description: '作为一只猫妖,你游走在人类都市的霓虹灯影中,寻找着能长期提供"精气"的伴侣。',
    cost: 1,
    attributeBonus: { charisma: 2, defense: 2 },
    world: '现代：阴阳师',
    genderRestrictions: ['女性', '扶她'],
    raceRestrictions: ['妖族'],
    worldbookToggles: [
      // 示例：{ uid: 1003, enable: true }, // 猫妖相关条目
      // { uid: 1005, enable: true }, // 精气系统条目
    ],
    exclusiveToggles: [
      // 示例：{ uid: 1001, enable: false }, // 关闭藤原末裔条目
      // { uid: 1004, enable: false }, // 关闭犬妖条目
    ],
  },
  {
    id: 'dog',
    name: '犬妖',
    description: '忠诚的犬妖，直觉敏锐，生命力顽强',
    cost: 1,
    attributeBonus: { strength: 2, constitution: 1, agility: 1 },
    world: '现代：阴阳师',
    genderRestrictions: ['女性', '扶她'],
    raceRestrictions: ['妖族'],
    worldbookToggles: [
      // 示例：{ uid: 1004, enable: true }, // 犬妖相关条目
      // { uid: 1006, enable: true }, // 忠诚特质条目
    ],
    exclusiveToggles: [
      // 示例：{ uid: 1001, enable: false }, // 关闭藤原末裔条目
      // { uid: 1003, enable: false }, // 关闭猫妖条目
    ],
  },
];

export function getBackgroundsForWorld(world: GameWorld): Background[] {
  return BACKGROUNDS.filter(bg => !bg.world || bg.world === world);
}

/**
 * 获取某出身的世界书开关配置
 * @param backgroundId 出身ID
 * @returns 该出身的世界书开关配置
 */
export function getBackgroundToggles(backgroundId: string): UidToggle[] {
  const background = BACKGROUNDS.find(bg => bg.id === backgroundId);
  return background?.worldbookToggles || [];
}

/**
 * 获取某出身的独占开关配置（需要关闭的其他出身的世界书）
 * @param backgroundId 出身ID
 * @returns 需要关闭的世界书开关配置
 */
export function getBackgroundExclusiveToggles(backgroundId: string): UidToggle[] {
  const background = BACKGROUNDS.find(bg => bg.id === backgroundId);
  return background?.exclusiveToggles || [];
}

/**
 * 获取所有其他出身的世界书开关（用于关闭）
 * @param selectedBackgroundId 已选择的出身ID
 * @returns 需要关闭的所有其他出身的世界书开关
 */
export function getAllOtherBackgroundToggles(selectedBackgroundId: string): UidToggle[] {
  const allToggles: UidToggle[] = [];

  BACKGROUNDS.forEach(bg => {
    if (bg.id !== selectedBackgroundId && bg.worldbookToggles) {
      // 将其他出身的世界书开关设置为关闭
      bg.worldbookToggles.forEach(toggle => {
        allToggles.push({ uid: toggle.uid, enable: false });
      });
    }
  });

  return allToggles;
}

/**
 * @deprecated 请使用 useWorldbookToggle 组合式函数中的 applyBackgroundToggles 方法
 * 此函数已被重构到 useWorldbookToggle 中，提供更好的性能和错误处理
 */
export async function applyBackgroundWorldbookToggles(_backgroundId: string, _worldbookName: string): Promise<void> {
  console.warn('[backgrounds.ts] applyBackgroundWorldbookToggles 已废弃，请使用 useWorldbookToggle 组合式函数');

  // 为了向后兼容，保留基本实现
  console.warn('[backgrounds.ts] 此函数已废弃，请直接使用 useWorldbookToggle 组合式函数');
  throw new Error('此函数已废弃，请使用 useWorldbookToggle 组合式函数中的 applyBackgroundToggles 方法');
}
