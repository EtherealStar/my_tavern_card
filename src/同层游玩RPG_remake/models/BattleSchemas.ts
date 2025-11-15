import { z } from 'zod';

// URL验证函数
const urlSchema = z.string().url('必须是有效的URL地址');

// 资源路径验证函数（支持URL或本地资源路径）
const resourcePathSchema = z.string().refine(
  val => {
    // 如果是有效的URL，则通过
    try {
      new URL(val);
      return true;
    } catch {
      // 如果不是URL，检查是否为本地资源路径
      // 支持以下格式：
      // 1. 完整路径：assets/... 或 ./assets/... 或 ../assets/...
      // 2. 简化路径：images/... 或 其他不以 :// 开头的路径（由 BattleResourceService 处理）
      const isFullPath = val.startsWith('assets/') || val.startsWith('./assets/') || val.startsWith('../assets/');
      const isSimplifiedPath = !val.includes('://') && val.length > 0;
      return isFullPath || isSimplifiedPath;
    }
  },
  {
    message: '必须是有效的URL地址或本地资源路径（支持完整路径或简化路径）',
  },
);

// 技能资源类型
export type SkillResourceType = 'video' | 'image';

// 技能资源选择条件
export const SkillResourceConditionSchema = z.object({
  race: z.string().optional(), // 种族匹配
  variantId: z.string().optional(), // 变体匹配
  enemyType: z.enum(['normal', 'high_dodge', 'high_magic']).optional(), // 敌人类型匹配
  tags: z.array(z.string()).optional(), // 标签匹配
});

export type SkillResourceCondition = z.infer<typeof SkillResourceConditionSchema>;

// 单个技能资源配置
export const SkillResourceConfigSchema = z.object({
  src: resourcePathSchema, // 资源URL（视频或图片）
  type: z.enum(['video', 'image']).default('video'), // 资源类型
  conditions: SkillResourceConditionSchema.optional(), // 选择条件（可选）
  // 视频特有属性
  loop: z.boolean().optional().default(false),
  volume: z.number().min(0).max(1).optional().default(0), // 0-1，考虑浏览器自动播放策略，建议默认0
  playbackRate: z.number().min(0.1).max(5).optional().default(1.0), // 默认1.0
  revertOnEnd: z.boolean().optional().default(true), // 非loop时播放结束后回退到图片，默认true
  // 显示属性（相对敌人容器）
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
  vScale: z.number().positive().optional(),
});

export type SkillResourceConfig = z.infer<typeof SkillResourceConfigSchema>;

// 技能资源映射类型（支持多资源配置）
export const SkillResourceMapSchema = z.record(
  z.string(), // 技能ID
  z.union([
    // 兼容旧格式：单个资源配置（自动转换为数组）
    SkillResourceConfigSchema,
    // 新格式：资源配置数组
    z.array(SkillResourceConfigSchema),
  ]),
);

export type SkillResourceMap = z.infer<typeof SkillResourceMapSchema>;

// 向后兼容：技能视频映射类型（保持旧格式支持）
export const SkillVideoMapSchema = z.record(
  z.string(),
  z.object({
    src: urlSchema,
    loop: z.boolean().optional().default(false),
    volume: z.number().min(0).max(1).optional().default(0), // 0-1，考虑浏览器自动播放策略，建议默认0
    playbackRate: z.number().min(0.1).max(5).optional().default(1.0), // 默认1.0
    revertOnEnd: z.boolean().optional().default(true), // 非loop时播放结束后回退到图片，默认true
    // 仅影响视频显示的可选位置与缩放参数（相对敌人容器）
    offsetX: z.number().optional(),
    offsetY: z.number().optional(),
    vScale: z.number().positive().optional(),
  }),
);

export type SkillVideoMap = z.infer<typeof SkillVideoMapSchema>;

// 基础参与者（最小MVP）
export const BattleParticipantSchema = z.object({
  id: z.string(),
  name: z.string().default('Unknown'),
  maxHp: z.number().int().nonnegative().optional(), // 血量由体质*20自动计算
  hp: z.number().int().nonnegative().optional(), // 血量由体质*20自动计算
  maxMp: z.number().int().nonnegative().optional(), // 魔法值由智力*5自动计算
  mp: z.number().int().nonnegative().optional(), // 魔法值由智力*5自动计算
  side: z.enum(['player', 'enemy']).default('enemy'),
  level: z.number().int().min(1).max(20).default(1), // 等级属性 1-20级
  // 仅为敌人添加立绘字段（仅支持URL）
  enemyPortrait: z
    .object({
      image: resourcePathSchema, // 敌人立绘图片URL或本地资源路径
      position: z
        .object({
          x: z.number().default(0.75), // 敌人立绘位置 (0-1)
          y: z.number().default(0.4),
          scale: z.number().default(0.8), // 敌人立绘缩放
        })
        .optional(),
      animation: z
        .object({
          idle: z.string().optional(), // 待机动画
          attack: z.string().optional(), // 攻击动画
          damage: z.string().optional(), // 受伤动画
        })
        .optional(),
      videos: z.union([SkillVideoMapSchema, SkillResourceMapSchema]).optional(), // 技能到资源的映射（支持旧格式和新格式）
    })
    .optional(),
  // 战斗属性（派生自 MVU 或直接给定）
  stats: z
    .object({
      atk: z.number().nonnegative().default(10), // 物理攻击
      hatk: z.number().nonnegative().default(10), // H攻击
      def: z.number().nonnegative().default(0), // 物理防御（绝对值）
      hdef: z.number().min(0).max(0.99).default(0), // H防御（作为具体数值的比例 0-1）
      hit: z.number().min(0).default(0.8), // 命中率 0-∞，允许溢出
      evade: z.number().min(0).max(1).default(0.1), // 闪避率 0-1
      critRate: z.number().min(0).max(1).default(0.05), // 暴击率 0-1
      critDamageMultiplier: z.number().min(1).max(5).default(1.5), // 暴击伤害倍数
      hhp: z.number().nonnegative().default(0), // H血量
      calculatedHp: z.number().nonnegative().optional(), // 计算出的血量（临时字段）
      calculatedMp: z.number().nonnegative().optional(), // 计算出的魔法值（临时字段）
    })
    .optional(),
  // 参与者已学习的技能（引用 Skill.id）
  skills: z.array(z.string()).optional(),
  // 预留：MVU 原始属性（力量/敏捷/防御/体质/魅力/幸运/意志），用于运行时转换
  mvuAttributes: z.record(z.string(), z.number()).optional(),
  // 弱点类型（仅敌人使用）
  weakness: z.enum(['体术', '符术']).optional(),
});

export type BattleParticipant = z.infer<typeof BattleParticipantSchema>;

// 战斗配置
export const BattleConfigSchema = z.object({
  background: z
    .object({
      image: resourcePathSchema, // 背景图片URL或本地资源路径
      scaleMode: z.enum(['contain', 'cover', 'fill']).optional(), // 缩放模式
      parallax: z
        .object({
          layers: z
            .array(
              z.object({
                image: resourcePathSchema, // 视差层图片URL或本地资源路径
                speed: z.number().default(0.5), // 视差滚动速度
                depth: z.number().default(1), // 层级深度
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
  participants: z.array(BattleParticipantSchema).min(2),
  // 调试模式标记
  isDebugMode: z.boolean().optional().default(false),
});

export type BattleConfig = z.infer<typeof BattleConfigSchema>;

// 技能定义
export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.enum(['physical', 'magical']),
  target: z.enum(['single', 'all', 'self']).default('single'),
  powerMultiplier: z.number().default(1),
  flatPower: z.number().default(0),
  hitModifier: z.number().default(0),
  critBonus: z.number().default(0),
  critDamageOverride: z.number().optional(),
  mpCost: z.number().int().nonnegative().default(0), // MP消耗
  animationKey: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type Skill = z.infer<typeof SkillSchema>;

// 行动定义：支持 普攻/技能
export const BattleActionSchema = z.object({
  type: z.enum(['attack', 'useSkill']),
  actorId: z.string(),
  targetId: z.string(),
  skillId: z.string().optional(),
});

export type BattleAction = z.infer<typeof BattleActionSchema>;

// 战斗状态
export const BattleStateSchema = z.object({
  participants: z.array(BattleParticipantSchema),
  turn: z.enum(['player', 'enemy']).default('player'),
  ended: z.boolean().default(false),
  winner: z.enum(['player', 'enemy']).optional(),
  round: z.number().int().nonnegative().default(1),
});

export type BattleState = z.infer<typeof BattleStateSchema>;

// 战斗结果
export const BattleResultSchema = z.object({
  winner: z.enum(['player', 'enemy']),
  rounds: z.number().int().nonnegative().default(1),
  summary: z.string().optional(),
});

export type BattleResult = z.infer<typeof BattleResultSchema>;

// 工具函数
export function cloneState(state: BattleState): BattleState {
  return JSON.parse(JSON.stringify(state));
}
