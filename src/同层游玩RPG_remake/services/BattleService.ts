import { inject, injectable } from 'inversify';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import {
  BattleAction,
  BattleActionSchema,
  BattleConfig,
  BattleConfigSchema,
  BattleResult,
  BattleState,
  Skill,
} from '../models/BattleSchemas';
import { BattleEngine } from './BattleEngine';
import { BattleResultHandler } from './BattleResultHandler';
import type { SameLayerService } from './SameLayerService';
import { SaveLoadManagerService } from './SaveLoadManagerService';

/**
 * BattleService - 战斗服务协调器
 *
 * 定位：
 * - 服务层与 Phaser 层之间的协调者
 * - 负责战斗的初始化、启动和行动处理
 *
 * 职责：
 * - 初始化战斗（注册技能、验证配置、映射属性）
 * - 启动 Phaser 战斗场景
 * - 协调 BattleEngine 计算和事件发送
 * - 处理战斗结果和后续流程
 *
 * 数据流：
 * Input: 从 useBattleSystem 接收战斗配置和行动
 * Processing: 调用 BattleEngine 进行计算
 * Output: 通过 EventBus 发送事件，触发 Phaser 和 Vue 更新
 *
 * 协调关系：
 * ```
 * BattleService (协调层)
 *   ├─→ BattleEngine (计算引擎)
 *   ├─→ EventBus (事件总线)
 *   ├─→ BattleResultHandler (结果处理)
 *   └─→ SameLayerService (同层消息生成)
 * ```
 */
@injectable()
export class BattleService {
  private skills: Map<string, Skill> = new Map();

  constructor(
    @inject(TYPES.EventBus) private eventBus: EventBus,
    @inject(TYPES.BattleEngine) private engine: BattleEngine,
    @inject(TYPES.BattleResultHandler) private resultHandler: BattleResultHandler,
    @inject(TYPES.SameLayerService) private _sameLayer: SameLayerService,
    @inject(TYPES.SaveLoadManagerService) private _saveLoad: SaveLoadManagerService,
  ) {
    console.log('[BattleService] Service constructed');
  }

  /**
   * 初始化战斗
   *
   * 步骤：
   * 1. 验证战斗配置格式
   * 2. 注册默认技能
   * 3. 映射 MVU 属性到战斗属性
   * 4. 设置 BattleEngine 的技能表
   * 5. 发送初始化完成事件
   *
   * @param config 战斗配置
   * @returns 处理后的战斗配置（包含映射的属性）
   */
  public async initializeBattle(config: BattleConfig): Promise<BattleConfig> {
    console.log('[BattleService] Initializing battle...');

    // Step 1: 验证配置
    const parsed = BattleConfigSchema.safeParse(config);
    if (!parsed.success) {
      console.error('[BattleService] Invalid BattleConfig:', parsed.error);
      throw new Error('Invalid BattleConfig');
    }

    // Step 2: 注册默认技能
    this.registerDefaultSkills();
    console.log('[BattleService] Default skills registered');

    // Step 3: 预加载提示（实际加载由 Phaser BattleScene.preload 处理）
    await this.preloadBattleResources(parsed.data);

    // Step 4: 映射 MVU 属性到战斗属性，并统一初始化HP
    const withStats: BattleConfig = {
      ...parsed.data,
      participants: parsed.data.participants.map(p => {
        const mvu = p.mvuAttributes || {};
        const battleStats = this.mapMvuToBattleStats(mvu, p.level || 1);

        // 统一初始化：只在战斗开始时设置一次HP
        const maxHp = p.maxHp ?? battleStats.calculatedHp;
        const initialHp = p.hp ?? maxHp; // 如果已有HP则保持，否则设为maxHp

        // 验证HP值的合理性
        if (!this.validateHp({ hp: initialHp, maxHp })) {
          console.warn('[BattleService] Invalid HP values, using defaults:', { hp: initialHp, maxHp });
        }

        return {
          ...p,
          maxHp,
          hp: initialHp,
          _hpInitialized: true, // 标记HP已初始化
          stats: p.stats || battleStats,
        };
      }),
    };

    // Step 5: 设置 BattleEngine 的技能表
    this.engine.setSkillMap(this.skills);

    // Step 6: 发送初始化完成事件
    this.eventBus.emit('battle:initialized', withStats);

    console.log('[BattleService] Battle initialized successfully');

    // 避免未使用告警
    if (this._saveLoad) {
      console.log('[BattleService] SaveLoad service available');
    }
    if (this._sameLayer) {
      console.log('[BattleService] SameLayer service available');
    }

    return withStats;
  }

  /**
   * 预加载战斗资源 - 现在由 Phaser Scene.preload 处理
   */
  private async preloadBattleResources(_config: BattleConfig): Promise<void> {
    // 资源预加载现在由 Phaser BattleScene.preload 方法处理
    // BattleResourceService 只负责 URL 验证和路径解析
    console.log('[BattleService] Resource preloading delegated to Phaser BattleScene.preload');
  }

  /**
   * 启动战斗
   *
   * 职责：
   * - 构造 Phaser 场景所需的 payload
   * - 通过 EventBus 发送 battle:start 事件
   * - PhaserManager 监听此事件并启动 BattleScene
   *
   * @param battleState 初始战斗状态
   * @param battleConfig 战斗配置
   */
  public async startBattle(battleState: BattleState, battleConfig: BattleConfig): Promise<void> {
    console.log('[BattleService] Starting battle...');

    if (!battleState) {
      console.error('[BattleService] Cannot start battle - no state provided');
      throw new Error('Battle state not provided');
    }

    // 构造 Phaser 场景 payload
    const payload: any = {
      ...battleState,
      background: battleConfig.background,
      // 使用当前状态中的参与者，避免用配置覆盖为满血
      participants: battleState.participants,
      battleConfig: battleConfig, // 完整配置作为备用
    };

    console.log('[BattleService] Payload prepared:', {
      hasBackground: !!payload.background,
      participantsCount: payload.participants?.length || 0,
    });

    // 发送 battle:start 事件
    // PhaserManager 会监听此事件并启动 BattleScene
    this.eventBus.emit('battle:start', payload);
    console.log('[BattleService] battle:start event emitted');
  }

  /**
   * 处理玩家行动
   *
   * 流程：
   * 1. 验证行动格式
   * 2. 调用 BattleEngine 计算玩家行动
   * 3. 发送战斗事件（伤害、暴击等）
   * 4. 检查战斗是否结束
   * 5. 如果未结束且轮到敌方，执行 AI 行动
   * 6. 返回最新战斗状态
   *
   * @param action 玩家行动
   * @param currentState 当前战斗状态
   * @returns 处理后的新战斗状态
   */
  public async processPlayerAction(action: BattleAction, currentState: BattleState): Promise<BattleState> {
    console.log('[BattleService] processPlayerAction called:', {
      action,
      currentStateParticipants: currentState?.participants?.length || 0,
      currentState: currentState
        ? {
            ended: currentState.ended,
            participants: currentState.participants?.map(p => ({ id: p.id, name: p.name, side: p.side, hp: p.hp })),
          }
        : null,
    });

    // 验证行动格式
    const parsed = BattleActionSchema.safeParse(action);
    if (!parsed.success) {
      console.warn('[BattleService] Invalid action format:', parsed.error);
      return currentState;
    }

    // 调用 BattleEngine 处理玩家行动
    const { newState, events } = this.engine.processAction(currentState, parsed.data);

    console.log('[BattleService] BattleEngine processed action:', {
      newStateParticipants: newState?.participants?.length || 0,
      newState: newState
        ? {
            ended: newState.ended,
            participants: newState.participants?.map(p => ({ id: p.id, name: p.name, side: p.side, hp: p.hp })),
          }
        : null,
      eventsCount: events.length,
    });

    // 先发送战斗事件，让UI组件处理伤害显示
    events.forEach(event => {
      console.log('[BattleService] Emitting event:', event.type, 'with data:', event.data);
      this.eventBus.emit(event.type, event.data);
    });

    // 然后发送状态更新事件，确保状态同步正确
    console.log('[BattleService] Emitting battle:state-updated event with newState:', {
      participantsCount: newState?.participants?.length || 0,
    });
    this.eventBus.emit('battle:state-updated', newState);

    // 检查战斗是否结束
    if (newState.ended) {
      const result = this.engine.getResult(newState);
      if (result) await this.onBattleEnd(result);
      return newState;
    }

    // 敌方 AI 回合
    if (newState.turn === 'enemy') {
      return await this.processEnemyTurn(newState);
    }

    return newState;
  }

  /**
   * 处理敌方回合（AI 行动）
   * @param state 当前战斗状态
   * @returns 处理后的战斗状态
   */
  private async processEnemyTurn(state: BattleState): Promise<BattleState> {
    const enemy = state.participants.find(p => p.side === 'enemy' && (p.hp || 0) > 0);
    const player = state.participants.find(p => p.side === 'player' && (p.hp || 0) > 0);

    if (!enemy || !player) {
      return state;
    }

    // 简单 AI：60% 概率使用技能，否则普攻
    const availableSkills = Array.isArray(enemy.skills) ? enemy.skills : [];
    let aiAction: BattleAction;

    if (availableSkills.length > 0 && Math.random() < 0.6) {
      const skillId = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      aiAction = { type: 'useSkill', actorId: enemy.id, targetId: player.id, skillId };
    } else {
      aiAction = { type: 'attack', actorId: enemy.id, targetId: player.id };
    }

    // 处理 AI 行动
    const { newState: aiNewState, events: aiEvents } = this.engine.processAction(state, aiAction);

    // 先发送 AI 事件（包括battle:skill-used）
    aiEvents.forEach(event => {
      this.eventBus.emit(event.type, event.data);
    });

    // 然后发送状态更新事件
    this.eventBus.emit('battle:state-updated', aiNewState);

    // 检查战斗是否结束
    if (aiNewState.ended) {
      const result = this.engine.getResult(aiNewState);
      if (result) await this.onBattleEnd(result);
      return aiNewState;
    }

    // 不需要手动切回玩家回合，BattleEngine.processAction 已经处理了回合切换
    // 直接返回新状态即可
    return aiNewState;
  }

  private async onBattleEnd(result: BattleResult): Promise<void> {
    // 保存简要结果到IndexedDB settings
    await this.resultHandler.persistAndAnnounce(result);

    this.eventBus.emit('battle:result', result);
  }

  /**
   * 等级表映射 - 严格按照图片中的等级表设置命中率
   */
  private getHitRateByLevel(level: number): number {
    const LEVEL_HIT_RATE_TABLE: Record<number, number> = {
      1: 100.5,
      2: 101,
      3: 101.5,
      4: 102.5,
      5: 103.5,
      6: 105,
      7: 106.5,
      8: 108.5,
      9: 110.5,
      10: 113,
      11: 115.5,
      12: 118.5,
      13: 121.5,
      14: 125,
      15: 128.5,
      16: 132.5,
      17: 136.5,
      18: 141,
      19: 145.5,
      20: 150,
    };

    // 确保等级在1-20范围内，否则使用默认值
    const validLevel = Math.max(1, Math.min(20, level));
    return LEVEL_HIT_RATE_TABLE[validLevel] || 100.5;
  }

  /**
   * MVU → 战斗属性 映射（可调整权重）
   * 注意：此方法只计算基础属性，不包含HP（HP由调用方处理）
   */
  private mapMvuToBattleStats(mvu: Record<string, number>, level: number = 1) {
    const get = (k: string) => Number(mvu?.[k] ?? 0);
    const 力量 = get('力量');
    const 体质 = get('体质');
    const 魅力 = get('魅力');
    const 幸运 = get('幸运');
    const 意志 = get('意志');
    const 防御 = get('防御');

    return {
      atk: Math.max(0, 2 * 力量),
      hatk: Math.max(0, 2 * 魅力),
      def: Math.max(0, 2 * 防御),
      hdef: 0,
      hit: this.getHitRateByLevel(level), // 使用等级表计算命中率
      evade: 0,
      critRate: Math.max(0, 0.002 * 幸运),
      critDamageMultiplier: 1.5,
      hhp: Math.max(0, 意志 / 50), // H血量 = 意志 ÷ 50
      // 血量计算：hp = 体质 * 20（仅用于初始化时的maxHp计算）
      calculatedHp: Math.max(1, 体质 * 20),
    };
  }

  /**
   * HP验证机制
   * 确保HP值的合理性
   */
  private validateHp(participant: { hp: number; maxHp: number }): boolean {
    if (typeof participant.hp !== 'number' || participant.hp < 0) {
      console.warn('[BattleService] Invalid HP value:', participant.hp);
      return false;
    }

    if (participant.hp > participant.maxHp) {
      console.warn('[BattleService] HP exceeds maxHp, clamping:', participant.hp, '->', participant.maxHp);
      participant.hp = participant.maxHp;
    }

    return true;
  }

  /**
   * 注册默认技能：重击、精准打击、火球
   */
  private registerDefaultSkills(): void {
    const list: Skill[] = [
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
      },
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
      },
    ];
    this.skills.clear();
    for (const s of list) this.skills.set(s.id, s);
  }
}
