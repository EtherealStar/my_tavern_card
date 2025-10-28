import { z } from 'zod';
import type { UidToggle } from '../data/worldExpansions';

export const DifficultySchema = z.enum(['简单', '普通', '困难']);
export type Difficulty = z.infer<typeof DifficultySchema>;

// 对齐旧项目的世界枚举
export const GameWorldSchema = z.enum(['西幻', '现代：阴阳师']);
export type GameWorld = z.infer<typeof GameWorldSchema>;

// 角色性别与种族
export const GenderSchema = z.enum(['男性', '女性', '男生女相', '扶她']);
export type Gender = z.infer<typeof GenderSchema>;

export const RaceSchema = z.enum(['人族', '灵族', '妖族']);
export type Race = z.infer<typeof RaceSchema>;

export const DestinyPointsSchema = z.object({
  total: z.number().int().min(0),
  used: z.number().int().min(0),
  left: z.number().int().min(0),
});
export type DestinyPoints = z.infer<typeof DestinyPointsSchema>;

export type AttributeKey =
  | 'strength'
  | 'agility'
  | 'defense'
  | 'constitution'
  | 'charisma'
  | 'willpower'
  | 'luck'
  | 'intelligence';

// 统一的属性顺序定义
export const ATTRIBUTE_KEYS: AttributeKey[] = [
  'strength',
  'intelligence',
  'agility',
  'defense',
  'constitution',
  'charisma',
  'willpower',
  'luck',
];

export const CHINESE_ATTRIBUTE_NAMES = ['力量', '智力', '敏捷', '防御', '体质', '魅力', '意志', '幸运'];

// 属性键到中文名的映射
export const ATTRIBUTE_NAME_MAP: Record<AttributeKey, string> = {
  strength: '力量',
  intelligence: '智力',
  agility: '敏捷',
  defense: '防御',
  constitution: '体质',
  charisma: '魅力',
  willpower: '意志',
  luck: '幸运',
};

export interface Attributes {
  strength: number;
  intelligence: number;
  agility: number;
  defense: number;
  constitution: number;
  charisma: number;
  willpower: number;
  luck: number;
  pointsLeft: number;
}

// Zod 验证模式
export const AttributesSchema = z.object({
  strength: z.number().int().min(0),
  intelligence: z.number().int().min(0),
  agility: z.number().int().min(0),
  defense: z.number().int().min(0),
  constitution: z.number().int().min(0),
  charisma: z.number().int().min(0),
  willpower: z.number().int().min(0),
  luck: z.number().int().min(0),
  pointsLeft: z.number().int().min(0),
});

// 中文属性对象验证模式
export const ChineseAttributesSchema = z.object({
  力量: z.number().int().min(0),
  智力: z.number().int().min(0),
  敏捷: z.number().int().min(0),
  防御: z.number().int().min(0),
  体质: z.number().int().min(0),
  魅力: z.number().int().min(0),
  意志: z.number().int().min(0),
  幸运: z.number().int().min(0),
});

// 出身（背景）类型定义，供数据集与控制器使用
export interface Background {
  id: string;
  name: string;
  description: string;
  cost: number; // 天命点消耗
  attributeBonus: Partial<Record<AttributeKey, number>>;
  world?: GameWorld; // 限定世界；不填为通用
  genderRestrictions?: Gender[]; // 性别限制；不填为无限制
  raceRestrictions?: Race[]; // 种族限制；不填为无限制
  worldbookToggles?: UidToggle[]; // 该出身特有的世界书开关
  exclusiveToggles?: UidToggle[]; // 选择该出身时需要关闭的其他出身的世界书
}

export function buildEmptyAttributes(maxPoints: number): Attributes {
  return {
    strength: 0,
    intelligence: 0,
    agility: 0,
    defense: 0,
    constitution: 0,
    charisma: 0,
    willpower: 0,
    luck: 0,
    pointsLeft: Math.max(0, maxPoints),
  };
}

export function validateDestinyPoints(input: Partial<DestinyPoints>): {
  success: boolean;
  data?: DestinyPoints;
  errors?: string[];
} {
  const total = Math.max(0, Number(input.total ?? 0));
  const usedRaw = Math.max(0, Number(input.used ?? 0));
  const used = Math.min(usedRaw, total);
  const left = Math.max(0, total - used);

  const parsed = DestinyPointsSchema.safeParse({ total, used, left });
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  return { success: false, errors: parsed.error.issues.map(i => i.message) };
}

export function validateAndCorrectAttributes(
  raw: Partial<Record<AttributeKey | 'pointsLeft', number>>,
  maxPoints: number,
): {
  success: boolean;
  data?: Attributes;
  corrected?: boolean;
  errors?: string[];
} {
  const keys: AttributeKey[] = [
    'strength',
    'intelligence',
    'agility',
    'defense',
    'constitution',
    'charisma',
    'willpower',
    'luck',
  ];

  const clamped: Record<AttributeKey, number> = {
    strength: 0,
    intelligence: 0,
    agility: 0,
    defense: 0,
    constitution: 0,
    charisma: 0,
    willpower: 0,
    luck: 0,
  };

  let corrected = false;

  for (const key of keys) {
    const value = Number(raw[key] ?? 0);
    const v = isFinite(value) ? Math.max(0, Math.min(100, Math.floor(value))) : 0;
    if (v !== value) corrected = true;
    clamped[key] = v;
  }

  let sum = keys.reduce((acc, k) => acc + clamped[k], 0);
  const target = Math.max(0, Math.floor(maxPoints));

  if (sum > target) {
    // 依序回退直至满足总点数限制
    corrected = true;
    const order = [...keys];
    let i = order.length - 1;
    while (sum > target && i >= 0) {
      const k = order[i];
      if (clamped[k] > 0) {
        clamped[k] -= 1;
        sum -= 1;
      } else {
        i -= 1;
      }
      if (clamped[k] === 0) i -= 1;
    }
  }

  const pointsLeft = Math.max(0, target - sum);
  const data: Attributes = { ...clamped, pointsLeft };
  return { success: true, data, corrected };
}

// ==================== MVU数据结构验证 ====================

// 物品数据结构验证
export const InventoryItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  attributes_bonus: z.record(z.string(), z.number()).optional(),
  quantity: z.number().optional(),
});

// 背包数据结构验证
export const InventorySchema = z.object({
  weapons: z.array(InventoryItemSchema),
  armors: z.array(InventoryItemSchema),
  accessories: z.array(InventoryItemSchema),
  others: z.array(InventoryItemSchema),
});

// 角色数据结构验证
export const CharacterSchema = z.object({
  id: z.number(),
  gender: z.string(),
  background: z.string(),
  personality: z.string(),
  outfit: z.string(),
  thoughts: z.string(),
  relationship: z.string(),
  others: z.string(),
  events: z.array(z.any()),
  attributes: z.object({
    strength: z.number(),
    intelligence: z.number(),
    agility: z.number(),
    defense: z.number(),
    constitution: z.number(),
    charisma: z.number(),
    willpower: z.number(),
    luck: z.number(),
  }),
  affinity: z.number(),
});

// 人物关系数据结构验证
export const RelationshipsSchema = z.record(z.string(), CharacterSchema);

// 装备数据结构验证
export const EquipmentSchema = z.object({
  weapon: z.any().nullable(),
  armor: z.any().nullable(),
  accessory: z.any().nullable(),
});

// 完整的统计数据验证
export const StatDataSchema = z.object({
  base_attributes: ChineseAttributesSchema,
  current_attributes: ChineseAttributesSchema,
  equipment: EquipmentSchema,
  inventory: InventorySchema,
  relationships: RelationshipsSchema,
  date: z.string(),
  time: z.string(),
  location: z.string(),
  random_event: z.string(),
});
