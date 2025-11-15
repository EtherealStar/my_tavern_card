import { z } from 'zod';

export const PlayerSchema = z.object({
  name: z.string().trim().min(1, '昵称不能为空').max(24, '昵称过长'),
});

export type Player = z.infer<typeof PlayerSchema>;

// 游戏阶段枚举
export enum GamePhase {
  INITIAL = 'initial', // 初始状态 - 主菜单
  CREATION = 'creation', // 创建状态 - 角色创建流程
  PLAYING = 'playing', // 进行状态 - 游戏进行中
  BATTLE = 'battle', // 战斗状态 - 战斗进行中
}

// 创建数据模式
export const CreationDataSchema = z.object({
  difficulty: z.enum(['简单', '普通', '困难']).optional(),
  world: z.enum(['西幻', '现代：阴阳师']).optional(),
  expansions: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.number()).optional(),
  background: z.string().optional(),
  gender: z.enum(['男性', '女性', '男生女相', '扶她']).optional(),
  race: z.enum(['人族', '灵族', '妖族']).optional(),
});

export type CreationData = z.infer<typeof CreationDataSchema>;

export const GameStateSchema = z.object({
  /** 当前游戏阶段 */
  phase: z.nativeEnum(GamePhase).default(GamePhase.INITIAL),
  /** 玩家信息 */
  player: PlayerSchema.optional(),
  /** 游戏是否已开始（向后兼容） */
  started: z.boolean().default(false),
  /** 当前存档名 */
  saveName: z.string().optional(),
  /** 当前存档的 slotId */
  slotId: z.string().optional(),
  /** 最后加载时间 */
  lastLoaded: z.number().optional(),
  /** 创建状态相关数据 */
  creationData: CreationDataSchema.optional(),
  /** 战斗配置 */
  battleConfig: z.any().optional(),
  /** 战斗状态 */
  battleState: z.any().optional(),
  /** 进入战斗前的阶段 */
  previousPhase: z.nativeEnum(GamePhase).optional(),
});

export type GameState = z.infer<typeof GameStateSchema>;

export function coerceGameState(value: unknown): GameState {
  const parsed = GameStateSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return { phase: GamePhase.INITIAL, started: false };
}

export const DefaultGameState: GameState = {
  phase: GamePhase.INITIAL,
  started: false,
};

// ==================== 状态管理相关类型 ====================

// 状态切换选项
export const GameStateTransitionOptionsSchema = z.object({
  saveName: z.string().optional(),
  slotId: z.string().optional(), // 新增：支持直接传递 slotId
  creationData: CreationDataSchema.optional(),
  skipPersistence: z.boolean().optional(),
  silent: z.boolean().optional(), // 不触发UI反馈
});

export type GameStateTransitionOptions = z.infer<typeof GameStateTransitionOptionsSchema>;

// 状态管理错误类型
export interface GameStateError extends Error {
  code: 'SERVICE_UNAVAILABLE' | 'TRANSITION_FAILED' | 'PERSISTENCE_ERROR' | 'VALIDATION_ERROR';
  phase?: GamePhase;
  options?: GameStateTransitionOptions;
  originalError?: Error;
}

// 服务状态类型
export interface ServiceStatus {
  gameStateService: boolean;
  eventBus: boolean;
}

// 状态变化事件类型
export interface GameStateEvents {
  // 状态变化事件
  'game:state-changed': { newState: GameState; oldState: GameState };
  'game:phase-changed': { newPhase: GamePhase; oldPhase: GamePhase };

  // 状态切换事件
  'game:transition-start': { targetPhase: GamePhase; options?: GameStateTransitionOptions };
  'game:transition-complete': { targetPhase: GamePhase; success: boolean };
  'game:transition-failed': { targetPhase: GamePhase; error: GameStateError };

  // 组合式函数协调事件
  'game:composable-sync': { phase: GamePhase; composable: string };
  'game:composable-ready': { phase: GamePhase; composable: string };
}
