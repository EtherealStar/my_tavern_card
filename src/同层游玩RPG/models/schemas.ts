import { z } from 'zod';

// Zod 验证模式定义
export const GameWorldSchema = z.enum(['西幻', '都市', '武侠', '仙侠']);
export const CreationStepSchema = z.enum(['difficulty', 'world', 'attributes', 'gender-race', 'talents']);
export const DifficultySchema = z.enum(['简单', '普通', '困难']);
export const GamePhaseSchema = z.enum(['start', 'creation', 'playing']);

export const AttributeBonusSchema = z.object({
  strength: z.number().int().min(0).max(100).optional(), // 力量
  agility: z.number().int().min(0).max(100).optional(), // 敏捷
  intelligence: z.number().int().min(0).max(100).optional(), // 智力
  constitution: z.number().int().min(0).max(100).optional(), // 体质
  charisma: z.number().int().min(0).max(100).optional(), // 魅力
  willpower: z.number().int().min(0).max(100).optional(), // 意志
  luck: z.number().int().min(0).max(100).optional(), // 幸运
});

// 类型导出
export type GameWorld = z.infer<typeof GameWorldSchema>;
export type CreationStep = z.infer<typeof CreationStepSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type GamePhase = z.infer<typeof GamePhaseSchema>;
export type AttributeBonus = z.infer<typeof AttributeBonusSchema>;

export const BackgroundSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  cost: z.number().int().min(0).max(50), // 天命点消耗
  attributeBonus: AttributeBonusSchema,
  world: GameWorldSchema.optional(), // 限定世界，如果为空则通用
});

export const TalentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  cost: z.number().int().min(0).max(50), // 天命点消耗
  attributeBonus: AttributeBonusSchema,
  world: GameWorldSchema.optional(), // 限定世界，如果为空则通用
});

export type Background = z.infer<typeof BackgroundSchema>;
export type Talent = z.infer<typeof TalentSchema>;

export const GenderSchema = z.enum(['male', 'female']).nullable();
export const RaceSchema = z.enum(['human', 'elf', 'dwarf', 'orc']).nullable();
export const ThemeSchema = z.enum(['default', 'rose']);

export const CharacterSchema = z.object({
  name: z.string().min(1).max(50),
  gender: GenderSchema,
  race: RaceSchema,
  world: GameWorldSchema,
  background: BackgroundSchema.optional(),
  talents: z.array(TalentSchema).max(10),
  meta: z.record(z.any()).default({}),
});

export const AttributesSchema = z.object({
  strength: z.number().int().min(0).max(100), // 力量
  agility: z.number().int().min(0).max(100), // 敏捷
  intelligence: z.number().int().min(0).max(100), // 智力
  constitution: z.number().int().min(0).max(100), // 体质
  charisma: z.number().int().min(0).max(100), // 魅力
  willpower: z.number().int().min(0).max(100), // 意志
  luck: z.number().int().min(0).max(100), // 幸运
  pointsLeft: z.number().int().min(0).max(100),
});

export const DestinyPointsSchema = z
  .object({
    total: z.number().int().min(0).max(100), // 总天命点
    used: z.number().int().min(0).max(100), // 已使用天命点
    left: z.number().int().min(0).max(100), // 剩余天命点
  })
  .refine(data => data.used + data.left === data.total, {
    message: '已使用点数加剩余点数必须等于总点数',
    path: ['total'],
  });

export const GameStateSchema = z.object({
  phase: GamePhaseSchema,
  creation_step: CreationStepSchema.nullable(),
  world: GameWorldSchema.nullable(),
  character: CharacterSchema.nullable(),
  achievements: z.array(z.string()).default([]),
  difficulty: DifficultySchema.nullable(),
  theme: ThemeSchema.default('default'),
  attributes: AttributesSchema,
  destinyPoints: DestinyPointsSchema,
  selectedGender: GenderSchema,
  selectedRace: RaceSchema,
  selectedBackground: BackgroundSchema.nullable(),
  selectedTalents: z.array(TalentSchema).max(10).default([]),
  streamingEnabled: z.boolean().default(false),
});

export type Character = z.infer<typeof CharacterSchema>;
export type Attributes = z.infer<typeof AttributesSchema>;
export type DestinyPoints = z.infer<typeof DestinyPointsSchema>;
export type GameState = z.infer<typeof GameStateSchema>;

/**
 * 创建初始游戏状态（使用Zod验证和默认值）
 */
export function createInitialGameState(): GameState {
  const initialState = {
    phase: 'start' as const,
    creation_step: null,
    world: null,
    character: null,
    achievements: [],
    difficulty: null,
    theme: 'default' as const,
    attributes: {
      strength: 0,
      agility: 0,
      intelligence: 0,
      constitution: 0,
      charisma: 0,
      willpower: 0,
      luck: 0,
      pointsLeft: 0,
    },
    destinyPoints: { total: 0, used: 0, left: 0 },
    selectedGender: null,
    selectedRace: null,
    selectedBackground: null,
    selectedTalents: [],
    streamingEnabled: false,
  };

  // 使用Zod解析和验证初始状态
  return GameStateSchema.parse(initialState);
}

/**
 * 验证游戏状态
 * @param state 要验证的状态
 * @returns 验证结果
 */
export function validateGameState(state: any): {
  success: boolean;
  data?: GameState;
  errors?: z.ZodError;
} {
  try {
    const validatedState = GameStateSchema.parse(state);
    return { success: true, data: validatedState };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * 安全地更新游戏状态（带验证）
 * @param currentState 当前状态
 * @param updates 更新内容
 * @returns 验证后的新状态
 */
export function safeUpdateGameState(
  currentState: GameState,
  updates: Partial<GameState>,
): { success: boolean; data?: GameState; errors?: z.ZodError } {
  try {
    const newState = { ...currentState, ...updates };
    const validatedState = GameStateSchema.parse(newState);
    return { success: true, data: validatedState };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * 验证并纠正属性分配
 * @param attributes 属性数据
 * @param maxPoints 最大点数
 * @returns 验证并纠正后的属性
 */
export function validateAndCorrectAttributes(
  attributes: any,
  maxPoints: number,
): { success: boolean; data?: Attributes; errors?: z.ZodError; corrected?: boolean } {
  try {
    // 先进行基本验证
    const validatedAttributes = AttributesSchema.parse(attributes);

    // 计算总使用点数
    const totalUsed =
      validatedAttributes.strength +
      validatedAttributes.agility +
      validatedAttributes.intelligence +
      validatedAttributes.constitution +
      validatedAttributes.charisma +
      validatedAttributes.willpower +
      validatedAttributes.luck;

    let corrected = false;
    let finalAttributes = { ...validatedAttributes };

    // 如果超出限制，自动纠正
    if (totalUsed > maxPoints) {
      const ratio = maxPoints / totalUsed;
      finalAttributes = {
        strength: Math.floor(validatedAttributes.strength * ratio),
        agility: Math.floor(validatedAttributes.agility * ratio),
        intelligence: Math.floor(validatedAttributes.intelligence * ratio),
        constitution: Math.floor(validatedAttributes.constitution * ratio),
        charisma: Math.floor(validatedAttributes.charisma * ratio),
        willpower: Math.floor(validatedAttributes.willpower * ratio),
        luck: Math.floor(validatedAttributes.luck * ratio),
        pointsLeft: 0,
      };

      // 重新计算剩余点数
      const newTotalUsed =
        finalAttributes.strength +
        finalAttributes.agility +
        finalAttributes.intelligence +
        finalAttributes.constitution +
        finalAttributes.charisma +
        finalAttributes.willpower +
        finalAttributes.luck;
      finalAttributes.pointsLeft = maxPoints - newTotalUsed;
      corrected = true;
    } else {
      finalAttributes.pointsLeft = maxPoints - totalUsed;
    }

    // 再次验证纠正后的数据
    const finalValidatedAttributes = AttributesSchema.parse(finalAttributes);

    return {
      success: true,
      data: finalValidatedAttributes,
      corrected,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * 验证天命点数分配
 * @param destinyPoints 天命点数据
 * @returns 验证结果
 */
export function validateDestinyPoints(destinyPoints: any): {
  success: boolean;
  data?: DestinyPoints;
  errors?: z.ZodError;
  corrected?: boolean;
} {
  try {
    // 尝试直接验证
    const validatedPoints = DestinyPointsSchema.parse(destinyPoints);
    return { success: true, data: validatedPoints };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // 尝试自动纠正
      const corrected = {
        total: Math.max(0, Math.min(100, destinyPoints.total || 0)),
        used: Math.max(0, Math.min(100, destinyPoints.used || 0)),
        left: 0,
      };

      // 确保总数一致
      if (corrected.used > corrected.total) {
        corrected.used = corrected.total;
      }
      corrected.left = corrected.total - corrected.used;

      try {
        const validatedCorrected = DestinyPointsSchema.parse(corrected);
        return {
          success: true,
          data: validatedCorrected,
          corrected: true,
        };
      } catch (secondError) {
        return { success: false, errors: error };
      }
    }
    throw error;
  }
}
