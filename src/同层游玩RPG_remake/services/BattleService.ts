import { inject, injectable } from 'inversify';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { CUSTOM_SKILL_DESCRIPTIONS, MAGICAL_DESCRIPTIONS, PHYSICAL_DESCRIPTIONS } from '../data/battleDescriptions';
import {
  getEquipmentQualityBonus,
  mergeEquipmentBonuses,
  type BattleStatsBonus,
} from '../data/equipmentQualityBonuses';
import { getSkillDescriptionConfig } from '../data/skillDescriptionMapping';
import { BattleLogItem, BattleLogStats, DescriptionStyle, DescriptionType } from '../models/BattleLogSchemas';
import {
  BattleAction,
  BattleActionSchema,
  BattleConfig,
  BattleConfigSchema,
  BattleResult,
  BattleState,
  Skill,
} from '../models/BattleSchemas';
import { BattleConfigService } from './BattleConfigService';
import { BattleEngine } from './BattleEngine';
import { BattleResultHandler, type ParticipantInfo } from './BattleResultHandler';
import type { SameLayerService } from './SameLayerService';
import { SaveLoadManagerService } from './SaveLoadManagerService';
import type { StatDataBindingService } from './StatDataBindingService';

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
  // 移除: private skills: Map<string, Skill> = new Map();

  // 战斗日志描述系统相关属性
  private battleLog: BattleLogItem[] = []; // 战斗日志收集
  private descriptionCache = new Map<string, string>(); // 描述缓存
  private maxCacheSize = 1000; // 缓存大小限制
  private maxBattleLogSize = 1000; // 日志大小限制

  // 参与者名称映射表
  private participantNameMap = new Map<string, string>();

  // 当前战斗配置（用于获取参与者信息）
  private currentBattleConfig: BattleConfig | null = null;

  // 描述模板
  private descriptions = {
    physical: PHYSICAL_DESCRIPTIONS,
    magical: MAGICAL_DESCRIPTIONS,
    custom: CUSTOM_SKILL_DESCRIPTIONS,
  };

  constructor(
    @inject(TYPES.EventBus) private eventBus: EventBus,
    @inject(TYPES.BattleEngine) private engine: BattleEngine,
    @inject(TYPES.BattleResultHandler) private resultHandler: BattleResultHandler,
    @inject(TYPES.SameLayerService) private _sameLayer: SameLayerService,
    @inject(TYPES.SaveLoadManagerService) private _saveLoad: SaveLoadManagerService,
    @inject(TYPES.BattleConfigService) private battleConfigService: BattleConfigService, // 使用合并后的服务
    @inject(TYPES.StatDataBindingService) private statDataBinding: StatDataBindingService, // 用于获取装备信息
  ) {}

  /**
   * 初始化战斗
   *
   * 步骤：
   * 1. 验证战斗配置格式
   * 2. 从战斗配置服务导入技能
   * 3. 映射 MVU 属性到战斗属性
   * 4. 设置 BattleEngine 的技能表
   * 5. 发送初始化完成事件
   *
   * @param config 战斗配置
   * @returns 处理后的战斗配置（包含映射的属性）
   */
  public async initializeBattle(config: BattleConfig): Promise<BattleConfig> {
    // Step 1: 验证配置
    const parsed = BattleConfigSchema.safeParse(config);
    if (!parsed.success) {
      console.error('[BattleService] Invalid BattleConfig:', parsed.error);
      throw new Error('Invalid BattleConfig');
    }

    // Step 2: 从战斗配置服务导入技能（替代原来的注册默认技能）
    this.battleConfigService.importSkillsFromBattleConfig(parsed.data.participants);

    // Step 2.5: 建立参与者名称映射
    this.participantNameMap.clear();
    parsed.data.participants.forEach((participant: any) => {
      this.participantNameMap.set(participant.id, participant.name);
    });

    // Step 3: 预加载提示（实际加载由 Phaser BattleScene.preload 处理）
    await this.preloadBattleResources(parsed.data);

    // Step 4: 映射 MVU 属性到战斗属性，并统一初始化HP
    // 使用 Promise.all 处理异步装备加成
    const participantsWithStats = await Promise.all(
      parsed.data.participants.map(async (p: any) => {
        const mvu = p.mvuAttributes || {};
        let battleStats = this.mapMvuToBattleStats(mvu, p.level || 1);

        // 如果是玩家，应用装备品质加成
        if (p.id === 'player' || p.side === 'player') {
          battleStats = await this.applyEquipmentBonuses(battleStats);
        }

        // 统一初始化：只在战斗开始时设置一次HP和MP
        const maxHp = p.maxHp ?? battleStats.calculatedHp;
        const initialHp = p.hp ?? maxHp; // 如果已有HP则保持，否则设为maxHp

        const maxMp = p.maxMp ?? battleStats.calculatedMp;
        const initialMp = p.mp ?? maxMp; // 如果已有MP则保持，否则设为maxMp

        // 验证HP值的合理性
        if (!this.validateHp({ hp: initialHp, maxHp })) {
          console.warn('[BattleService] Invalid HP values, using defaults:', { hp: initialHp, maxHp });
        }

        return {
          ...p,
          maxHp,
          hp: initialHp,
          maxMp,
          mp: initialMp,
          _hpInitialized: true, // 标记HP已初始化
          _mpInitialized: true, // 标记MP已初始化
          stats: p.stats || battleStats,
        };
      }),
    );

    const withStats: BattleConfig = {
      ...parsed.data,
      participants: participantsWithStats,
    };

    // Step 5: 保存当前战斗配置（用于后续获取参与者信息）
    this.currentBattleConfig = withStats;

    // Step 6: 设置 BattleEngine 的技能表
    const allSkills = this.battleConfigService.getAllSkills();
    const skillMap = new Map<string, Skill>();
    allSkills.forEach(skill => {
      skillMap.set(skill.id, skill);
    });
    this.engine.setSkillMap(skillMap);

    // Step 7: 发送初始化完成事件
    this.eventBus.emit('battle:initialized', withStats);

    return withStats;
  }

  /**
   * 预加载战斗资源 - 现在由 Phaser Scene.preload 处理
   */
  private async preloadBattleResources(_config: BattleConfig): Promise<void> {
    // 资源预加载现在由 Phaser BattleScene.preload 方法处理
    // BattleResourceService 只负责 URL 验证和路径解析
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

    // 发送 battle:start 事件
    // PhaserManager 会监听此事件并启动 BattleScene
    this.eventBus.emit('battle:start', payload);
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
    // 验证行动格式
    const parsed = BattleActionSchema.safeParse(action);
    if (!parsed.success) {
      console.warn('[BattleService] Invalid action format:', parsed.error);
      return currentState;
    }

    // 调用 BattleEngine 处理玩家行动
    const { newState, events } = this.engine.processAction(currentState, parsed.data);

    // 先发送战斗事件，让UI组件处理伤害显示
    events.forEach(event => {
      // 生成描述并记录到战斗日志
      const description = this.generateDescription(event);
      this.recordBattleEvent(event, description);

      // 发送带描述的增强事件
      this.eventBus.emit(event.type, {
        ...event.data,
        description,
      });
    });

    // 然后发送状态更新事件，确保状态同步正确
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
    const enemy = state.participants.find((p: any) => p.side === 'enemy' && (p.hp || 0) > 0);
    const player = state.participants.find((p: any) => p.side === 'player' && (p.hp || 0) > 0);

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
      // 生成描述并记录到战斗日志
      const description = this.generateDescription(event);
      this.recordBattleEvent(event, description);

      // 发送带描述的增强事件
      this.eventBus.emit(event.type, {
        ...event.data,
        description,
      });
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
    const battleLog = this.getBattleLog();
    const participants = this.getParticipantsInfo();
    await this.resultHandler.persistAndAnnounce(result, battleLog, participants);

    this.eventBus.emit('battle:result', result);

    // 清理参与者名称映射表和当前战斗配置
    this.participantNameMap.clear();
    this.currentBattleConfig = null;
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
   * 注意：此方法只计算基础属性，不包含HP和MP（HP和MP由调用方处理）
   */
  private mapMvuToBattleStats(mvu: Record<string, number>, level: number = 1) {
    const get = (k: string) => Number(mvu?.[k] ?? 0);
    const 力量 = get('力量');
    const 智力 = get('智力');
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
      hhp: Math.max(0, 意志 * 50), // H血量 = 意志 * 50
      // 血量计算：hp = 体质 * 20（仅用于初始化时的maxHp计算）
      calculatedHp: Math.max(1, 体质 * 20),
      // 魔法值计算：mp = 智力 * 5（仅用于初始化时的maxMp计算）
      calculatedMp: Math.max(0, 智力 * 5),
    };
  }

  /**
   * 应用装备品质加成到战斗属性
   *
   * 获取玩家的武器、防具、饰品，根据品质应用加成
   * 加成方式：加法（直接加到基础战斗属性上）
   *
   * @param battleStats 基础战斗属性
   * @returns 应用装备加成后的战斗属性
   */
  private async applyEquipmentBonuses(battleStats: any): Promise<any> {
    try {
      // 获取玩家装备
      const [weapon, armor, accessory] = await Promise.all([
        this.statDataBinding.getEquippedWeapon().catch(() => null),
        this.statDataBinding.getEquippedArmor().catch(() => null),
        this.statDataBinding.getEquippedAccessory().catch(() => null),
      ]);

      // 收集所有装备的加成
      const bonuses: BattleStatsBonus[] = [];

      // 武器加成
      if (weapon && weapon.quality) {
        const weaponBonus = getEquipmentQualityBonus('weapon', weapon.quality);
        if (Object.keys(weaponBonus).length > 0) {
          bonuses.push(weaponBonus);
        }
      }

      // 防具加成
      if (armor && armor.quality) {
        const armorBonus = getEquipmentQualityBonus('armor', armor.quality);
        if (Object.keys(armorBonus).length > 0) {
          bonuses.push(armorBonus);
        }
      }

      // 饰品加成
      if (accessory && accessory.quality) {
        const accessoryBonus = getEquipmentQualityBonus('accessory', accessory.quality);
        if (Object.keys(accessoryBonus).length > 0) {
          bonuses.push(accessoryBonus);
        }
      }

      // 如果没有加成，直接返回原始属性
      if (bonuses.length === 0) {
        return battleStats;
      }

      // 合并所有加成
      const mergedBonus = mergeEquipmentBonuses(bonuses);

      // 应用加成到战斗属性（加法）
      const enhancedStats = { ...battleStats };

      if (mergedBonus.atk !== undefined) {
        enhancedStats.atk = Math.max(0, (enhancedStats.atk || 0) + mergedBonus.atk);
      }
      if (mergedBonus.hatk !== undefined) {
        enhancedStats.hatk = Math.max(0, (enhancedStats.hatk || 0) + mergedBonus.hatk);
      }
      if (mergedBonus.def !== undefined) {
        enhancedStats.def = Math.max(0, (enhancedStats.def || 0) + mergedBonus.def);
      }
      if (mergedBonus.hdef !== undefined) {
        // hdef 范围限制在 0-0.99
        enhancedStats.hdef = Math.max(0, Math.min(0.99, (enhancedStats.hdef || 0) + mergedBonus.hdef));
      }
      if (mergedBonus.hit !== undefined) {
        enhancedStats.hit = Math.max(0, (enhancedStats.hit || 0) + mergedBonus.hit);
      }
      if (mergedBonus.evade !== undefined) {
        // evade 范围限制在 0-1
        enhancedStats.evade = Math.max(0, Math.min(1, (enhancedStats.evade || 0) + mergedBonus.evade));
      }
      if (mergedBonus.critRate !== undefined) {
        // critRate 范围限制在 0-1
        enhancedStats.critRate = Math.max(0, Math.min(1, (enhancedStats.critRate || 0) + mergedBonus.critRate));
      }
      if (mergedBonus.critDamageMultiplier !== undefined) {
        enhancedStats.critDamageMultiplier = Math.max(
          1,
          (enhancedStats.critDamageMultiplier || 1.5) + mergedBonus.critDamageMultiplier,
        );
      }
      if (mergedBonus.hhp !== undefined) {
        enhancedStats.hhp = Math.max(0, (enhancedStats.hhp || 0) + mergedBonus.hhp);
      }

      return enhancedStats;
    } catch (error) {
      // 如果获取装备失败，记录错误但不影响战斗初始化
      console.error('[BattleService] 应用装备加成失败:', error);
      return battleStats;
    }
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

  // ==================== 战斗日志描述系统 ====================

  /**
   * 生成战斗日志描述
   * @param event 战斗事件
   * @returns 生成的描述文本
   */
  private generateDescription(event: any): string {
    const cacheKey = this.generateCacheKey(event);

    if (this.descriptionCache.has(cacheKey)) {
      return this.descriptionCache.get(cacheKey)!;
    }

    const description = this.generateDescriptionInternal(event);
    this.descriptionCache.set(cacheKey, description);

    // 清理缓存
    this.cleanupCache();

    return description;
  }

  /**
   * 内部描述生成方法
   */
  private generateDescriptionInternal(event: any): string {
    const { data } = event;
    const { actorId, targetId, skillId, damage, isCritical, isMiss, mpCost, hhpChange } = data;

    // 获取参与者名称
    const actor = this.getParticipantName(actorId);
    const target = this.getParticipantName(targetId);

    // 处理MP消耗事件
    if (event.type === 'battle:mp-consumed') {
      return `${actor} 消耗了 ${mpCost} 点MP`;
    }

    // 处理HHP变化事件
    if (event.type === 'battle:hhp-changed') {
      return `${target} 的H血量减少了 ${Math.abs(hhpChange)} 点`;
    }

    // 处理MP不足事件
    if (event.type === 'battle:insufficient-mp') {
      return `${actor} MP不足，无法使用技能`;
    }

    // 处理弱点揭示事件
    if (event.type === 'battle:weakness-revealed') {
      const weakness = data.weakness;
      if (weakness) {
        return `${actor}使用灵能汇聚于双眼，探查敌人，发现敌人的弱点是${weakness}`;
      } else {
        return `${actor}使用灵能汇聚于双眼，探查敌人，但没有发现明显的弱点`;
      }
    }

    // 根据技能类型选择描述模板
    const skillConfig = getSkillDescriptionConfig(skillId);
    let template: string;

    if (skillConfig?.type === DescriptionType.CUSTOM) {
      template = this.getCustomDescription(skillConfig.customDescription!, isCritical, isMiss);
    } else {
      template = this.getGenericDescription(skillConfig?.type || DescriptionType.PHYSICAL, isCritical, isMiss);
    }

    // 替换占位符
    return template
      .replace(/{actor}/g, actor)
      .replace(/{target}/g, target)
      .replace(/{damage}/g, damage?.toString() || '0');
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(event: any): string {
    const { data } = event;
    const { actorId, targetId, skillId, isCritical, isMiss } = data;
    return `${actorId}-${targetId}-${skillId}-${isCritical}-${isMiss}`;
  }

  /**
   * 清理缓存
   */
  private cleanupCache() {
    if (this.descriptionCache.size > this.maxCacheSize) {
      const entries = Array.from(this.descriptionCache.entries());
      const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
      toDelete.forEach(([key]) => this.descriptionCache.delete(key));
    }
  }

  /**
   * 获取专属技能描述
   */
  private getCustomDescription(skillKey: string, isCritical: boolean, isMiss: boolean): string {
    const skillDescs = this.descriptions.custom[skillKey];
    if (!skillDescs) return this.getGenericDescription(DescriptionType.PHYSICAL, isCritical, isMiss);

    if (isMiss) return skillDescs.miss;
    if (isCritical) return skillDescs.critical;
    return skillDescs.hit;
  }

  /**
   * 获取通用描述
   */
  private getGenericDescription(type: DescriptionType, isCritical: boolean, isMiss: boolean): string {
    // 只处理物理和魔法描述
    if (type === DescriptionType.CUSTOM) {
      return this.getGenericDescription(DescriptionType.PHYSICAL, isCritical, isMiss);
    }

    const descs = this.descriptions[type];
    if (!descs) return this.getGenericDescription(DescriptionType.PHYSICAL, isCritical, isMiss);

    if (isMiss) return this.randomSelect(descs.miss);
    if (isCritical) return this.randomSelect(descs.critical);
    return this.randomSelect(descs.hit);
  }

  /**
   * 随机选择描述
   */
  private randomSelect(descriptions: string[]): string {
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * 获取参与者名称
   */
  private getParticipantName(participantId?: string): string {
    if (!participantId) return '未知';

    // 从参与者名称映射表中获取名称
    const name = this.participantNameMap.get(participantId);
    if (name) {
      return name;
    }

    // 如果映射表中没有找到，记录警告并返回默认值
    console.warn(`[BattleService] Participant name not found for ID: ${participantId}`);
    return '未知';
  }

  /**
   * 记录战斗事件
   */
  private recordBattleEvent(event: any, description: string) {
    const logItem: BattleLogItem = {
      id: `${Date.now()}-${this.battleLog.length}`,
      timestamp: Date.now(),
      type: event.type,
      actorId: event.data.actorId,
      targetId: event.data.targetId,
      skillId: event.data.skillId,
      damage: event.data.damage,
      isCritical: event.data.isCritical,
      isMiss: event.data.isMiss,
      description,
    };

    this.battleLog.push(logItem);

    // 限制日志大小
    if (this.battleLog.length > this.maxBattleLogSize) {
      this.battleLog = this.battleLog.slice(-this.maxBattleLogSize);
    }
  }

  /**
   * 获取战斗日志
   */
  public getBattleLog(): BattleLogItem[] {
    return [...this.battleLog];
  }

  /**
   * 获取参与者信息（用于战斗故事生成）
   * @returns 参与者信息数组，包含 id、name 和 side
   */
  public getParticipantsInfo(): ParticipantInfo[] {
    if (!this.currentBattleConfig) {
      console.warn('[BattleService] No current battle config available');
      return [];
    }

    return this.currentBattleConfig.participants.map(p => ({
      id: p.id,
      name: p.name,
      side: p.side,
    }));
  }

  /**
   * 清空战斗日志
   */
  public clearBattleLog() {
    this.battleLog = [];
  }

  /**
   * 设置描述风格
   */
  public setDescriptionStyle(style: DescriptionStyle) {
    // 暂时不实现，保留接口
  }

  /**
   * 获取战斗日志统计
   */
  public getBattleLogStats(): BattleLogStats {
    const totalEvents = this.battleLog.length;
    const criticalHits = this.battleLog.filter(log => log.isCritical).length;
    const misses = this.battleLog.filter(log => log.isMiss).length;
    const damageEvents = this.battleLog.filter(log => log.damage && log.damage > 0);
    const averageDamage =
      damageEvents.length > 0 ? damageEvents.reduce((sum, log) => sum + (log.damage || 0), 0) / damageEvents.length : 0;

    const participants = [
      ...new Set([...this.battleLog.map(log => log.actorId), ...this.battleLog.map(log => log.targetId)]),
    ].filter(id => id && id !== '未知');

    const battleDuration =
      this.battleLog.length > 0 ? this.battleLog[this.battleLog.length - 1].timestamp - this.battleLog[0].timestamp : 0;

    return {
      totalEvents,
      criticalHits,
      misses,
      averageDamage,
      battleDuration,
      participants,
    };
  }

  /**
   * 添加自定义技能描述
   */
  public addCustomSkillDescription(skillId: string, descriptions: any) {
    this.descriptions.custom[skillId] = descriptions;
  }

  /**
   * 添加通用描述模板
   */
  public addGenericDescriptions(type: DescriptionType, descriptions: any) {
    this.descriptions[type] = { ...this.descriptions[type], ...descriptions };
  }

  /**
   * 清空描述缓存
   */
  public clearDescriptionCache() {
    this.descriptionCache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats() {
    return {
      cacheSize: this.descriptionCache.size,
      maxCacheSize: this.maxCacheSize,
      battleLogSize: this.battleLog.length,
      maxBattleLogSize: this.maxBattleLogSize,
    };
  }

  /**
   * 设置缓存大小限制
   */
  public setCacheSizeLimit(maxSize: number) {
    this.maxCacheSize = Math.max(100, maxSize); // 最小100
    this.cleanupCache();
  }

  /**
   * 设置日志大小限制
   */
  public setLogSizeLimit(maxSize: number) {
    this.maxBattleLogSize = Math.max(100, maxSize); // 最小100
    if (this.battleLog.length > this.maxBattleLogSize) {
      this.battleLog = this.battleLog.slice(-this.maxBattleLogSize);
    }
  }

  /**
   * 批量清理旧数据
   */
  public cleanupOldData() {
    // 清理缓存
    this.cleanupCache();

    // 清理日志
    if (this.battleLog.length > this.maxBattleLogSize) {
      this.battleLog = this.battleLog.slice(-this.maxBattleLogSize);
    }
  }

  /**
   * 获取参与者名称映射统计信息
   */
  public getParticipantNameMapStats() {
    return {
      mapSize: this.participantNameMap.size,
      mappings: Array.from(this.participantNameMap.entries()).map(([id, name]) => ({ id, name })),
    };
  }
}
