import { z } from 'zod';

// 属性名称枚举
export const AttributeNameSchema = z.enum(['力量', '敏捷', '智力', '体质', '魅力', '幸运', '意志']);
export type AttributeName = z.infer<typeof AttributeNameSchema>;

// 属性值 schema
export const AttributeValueSchema = z.number().int().min(0).max(100);
export type AttributeValue = z.infer<typeof AttributeValueSchema>;

// 基础属性 schema
export const BaseAttributesSchema = z.record(AttributeNameSchema, AttributeValueSchema);
export type BaseAttributes = z.infer<typeof BaseAttributesSchema>;

// 当前属性 schema
export const CurrentAttributesSchema = z.record(AttributeNameSchema, AttributeValueSchema);
export type CurrentAttributes = z.infer<typeof CurrentAttributesSchema>;

// 装备槽位枚举
export const EquipmentSlotSchema = z.enum(['weapon', 'armor', 'accessory']);
export type EquipmentSlot = z.infer<typeof EquipmentSlotSchema>;

// 装备物品 schema
export const EquipmentItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    icon: z.string().optional(),
    attributes: z.record(AttributeNameSchema, z.number()).optional(),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
  })
  .optional();
export type EquipmentItem = z.infer<typeof EquipmentItemSchema>;

// 装备信息 schema
export const EquipmentSchema = z.record(EquipmentSlotSchema, EquipmentItemSchema);
export type Equipment = z.infer<typeof EquipmentSchema>;

// 背包物品 schema
export const InventoryItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  count: z.number().int().min(1).default(1),
  category: z.enum(['weapon', 'armor', 'accessory', 'consumable', 'misc']).default('misc'),
  attributes: z.record(AttributeNameSchema, z.number()).optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

// 背包信息 schema
export const InventorySchema = z.record(z.string(), z.array(InventoryItemSchema));
export type Inventory = z.infer<typeof InventorySchema>;

// 角色信息 schema
export const CharacterInfoSchema = z.object({
  name: z.string().min(1).max(50),
  level: z.number().int().min(1).max(100).default(1),
  experience: z.number().int().min(0).default(0),
  health: z.number().int().min(0).default(100),
  maxHealth: z.number().int().min(1).default(100),
  mana: z.number().int().min(0).default(50),
  maxMana: z.number().int().min(0).default(50),
});
export type CharacterInfo = z.infer<typeof CharacterInfoSchema>;

// 统计数据主 schema
export const StatDataSchema = z.object({
  character: CharacterInfoSchema.optional(),
  base_attributes: BaseAttributesSchema.optional(),
  current_attributes: CurrentAttributesSchema.optional(),
  equipment: EquipmentSchema.optional(),
  inventory: InventorySchema.optional(),
  // 其他可能的统计数据
  achievements: z.array(z.string()).optional(),
  quests: z.array(z.string()).optional(),
  skills: z.record(z.string(), z.number()).optional(),
  // 元数据
  lastUpdated: z.string().datetime().optional(),
  version: z.string().optional(),
});
export type StatData = z.infer<typeof StatDataSchema>;

// 数据更新操作 schema
export const StatDataUpdateSchema = z.object({
  type: z.enum(['attribute', 'equipment', 'inventory', 'character']),
  path: z.string().min(1),
  value: z.any(),
  reason: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});
export type StatDataUpdate = z.infer<typeof StatDataUpdateSchema>;

// 数据绑定状态 schema
export const StatDataBindingStateSchema = z.object({
  isLoading: z.boolean().default(false),
  error: z.string().nullable().default(null),
  lastSync: z.string().datetime().optional(),
  isDirty: z.boolean().default(false),
  pendingUpdates: z.array(StatDataUpdateSchema).default([]),
});
export type StatDataBindingState = z.infer<typeof StatDataBindingStateSchema>;

// 数据校验结果 schema
export const ValidationResultSchema = z.object({
  success: z.boolean(),
  data: StatDataSchema.optional(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  corrected: z.boolean().optional(),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// 数据校验和纠错函数
export function validateStatData(data: unknown): ValidationResult {
  const result = StatDataSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`),
  };
}

// 数据纠错函数
export function correctStatData(data: unknown): ValidationResult {
  try {
    // 尝试修复常见的数据问题
    const corrected = { ...data } as any;

    // 确保基础属性存在
    if (!corrected.base_attributes) {
      corrected.base_attributes = {};
    }

    // 确保当前属性存在
    if (!corrected.current_attributes) {
      corrected.current_attributes = { ...corrected.base_attributes };
    }

    // 确保装备信息存在
    if (!corrected.equipment) {
      corrected.equipment = {};
    }

    // 确保背包信息存在
    if (!corrected.inventory) {
      corrected.inventory = {};
    }

    // 验证修正后的数据
    const validation = validateStatData(corrected);

    return {
      ...validation,
      corrected: true,
    };
  } catch (error) {
    return {
      success: false,
      errors: [`数据纠错失败: ${error instanceof Error ? error.message : '未知错误'}`],
    };
  }
}

// 默认统计数据
export const DefaultStatData: StatData = {
  character: {
    name: '无名',
    level: 1,
    experience: 0,
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
  },
  base_attributes: {
    力量: 10,
    敏捷: 10,
    智力: 10,
    体质: 10,
    魅力: 10,
    幸运: 10,
    意志: 10,
  },
  current_attributes: {
    力量: 10,
    敏捷: 10,
    智力: 10,
    体质: 10,
    魅力: 10,
    幸运: 10,
    意志: 10,
  },
  equipment: {},
  inventory: {},
  achievements: [],
  quests: [],
  skills: {},
  lastUpdated: new Date().toISOString(),
  version: '1.0.0',
};
