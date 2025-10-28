import { BattleAction, BattleResult, BattleState, Skill } from '../models/BattleSchemas';

/**
 * 战斗引擎 - 纯逻辑计算层
 *
 * 职责：
 * - 处理战斗行动的数值计算（命中、伤害、暴击等）
 * - 管理战斗状态流转
 * - 生成战斗事件
 *
 * 特点：
 * - 无副作用的纯函数
 * - 不依赖 Phaser、Vue 或任何 UI 框架
 * - 可独立测试
 *
 * 数据流：
 * Input: BattleState + BattleAction
 * Output: { newState: BattleState, events: BattleEvent[] }
 */

export interface BattleEvent {
  type: 'battle:damage' | 'battle:miss' | 'battle:critical' | 'battle:state-updated' | 'battle:skill-used' | 'battle:mp-consumed' | 'battle:hhp-changed' | 'battle:insufficient-mp';
  data: {
    actorId?: string;
    targetId?: string;
    damage?: number;
    skillId?: string;
    mpCost?: number;
    hhpChange?: number;
    [key: string]: any;
  };
}

export class BattleEngine {
  private skillMap: Map<string, Skill> = new Map();

  /**
   * 设置技能映射表
   */
  public setSkillMap(map: Map<string, Skill>): void {
    this.skillMap = map;
  }

  /**
   * 处理战斗行动 - 核心战斗逻辑
   *
   * @param state 当前战斗状态（不会被修改）
   * @param action 要执行的行动
   * @returns 新状态和生成的事件列表
   */
  public processAction(state: BattleState, action: BattleAction): { newState: BattleState; events: BattleEvent[] } {
    console.log('[BattleEngine] processAction called:', {
      action,
      stateParticipants: state?.participants?.length || 0,
      state: state
        ? {
            ended: state.ended,
            participants: state.participants?.map((p: any) => ({ id: p.id, name: p.name, side: p.side, hp: p.hp })),
          }
        : null,
    });

    // 战斗已结束，不处理行动
    if (state.ended) {
      console.log('[BattleEngine] Battle already ended, returning current state');
      return { newState: state, events: [] };
    }

    // 深拷贝状态，确保不修改原状态
    const next = JSON.parse(JSON.stringify(state)) as BattleState;
    console.log('[BattleEngine] Created deep copy of state:', {
      nextParticipants: next?.participants?.length || 0,
      next: next
        ? {
            ended: next.ended,
            participants: next.participants?.map((p: any) => ({ id: p.id, name: p.name, side: p.side, hp: p.hp })),
          }
        : null,
    });

    const actor = next.participants.find((p: any) => p.id === action.actorId);
    const target = next.participants.find((p: any) => p.id === action.targetId);

    // 验证参与者存在
    if (!actor || !target) {
      console.warn('[BattleEngine] 无效的行动者或目标:', action);
      console.warn(
        '[BattleEngine] 可用参与者:',
        next.participants.map((p: any) => ({ id: p.id, name: p.name })),
      );
      return { newState: next, events: [] };
    }

    console.log('[BattleEngine] 处理行动:', {
      actionType: action.type,
      actorId: action.actorId,
      targetId: action.targetId,
      actorName: actor.name,
      targetName: target.name,
    });

    const events: BattleEvent[] = [];

    // 解析技能（若为 useSkill）
    const skill = action.type === 'useSkill' && action.skillId ? this.skillMap.get(action.skillId) : undefined;

    // 如果是使用技能，先发出技能使用事件
    if (action.type === 'useSkill' && action.skillId) {
      events.push({
        type: 'battle:skill-used',
        data: {
          actorId: actor.id,
          targetId: target.id,
          skillId: action.skillId,
        },
      });

      // 检查MP消耗
      if (skill?.mpCost && skill.mpCost > 0) {
        if ((actor.mp || 0) < skill.mpCost) {
          // MP不足，无法使用技能
          events.push({
            type: 'battle:insufficient-mp',
            data: {
              actorId: actor.id,
              skillId: action.skillId,
              requiredMp: skill.mpCost,
              currentMp: actor.mp || 0,
            },
          });
          // 切换回合
          next.turn = next.turn === 'player' ? 'enemy' : 'player';
          return { newState: next, events };
        }

        // 扣除MP
        actor.mp = Math.max(0, (actor.mp || 0) - skill.mpCost);
        
        // 发送MP消耗事件
        events.push({
          type: 'battle:mp-consumed',
          data: {
            actorId: actor.id,
            skillId: action.skillId,
            mpCost: skill.mpCost,
            remainingMp: actor.mp,
          },
        });
      }
    }

    // 命中判定：命中率 = 命中 - 闪避 + 技能修正
    const attackerStats = actor.stats || {
      atk: 10,
      hatk: 10,
      def: 0,
      hdef: 0,
      hit: 0.8,
      evade: 0.1,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0,
    };
    const defenderStats = target.stats || {
      atk: 10,
      hatk: 10,
      def: 0,
      hdef: 0,
      hit: 0.8,
      evade: 0.1,
      critRate: 0.05,
      critDamageMultiplier: 1.5,
      hhp: 0,
    };

    const hitModifier = skill?.hitModifier ?? 0;
    // 命中率计算：命中率 - 闪避率 + 技能修正，允许溢出
    const hitChance = Math.max(0.05, (attackerStats.hit || 0) - (defenderStats.evade || 0) + hitModifier);
    // 命中检查
    if (Math.random() > hitChance) {
      events.push({
        type: 'battle:miss',
        data: {
          actorId: actor.id,
          targetId: target.id,
        },
      });
      // 切换回合
      next.turn = next.turn === 'player' ? 'enemy' : 'player';
      return { newState: next, events };
    }

    // 暴击判定
    const baseCrit = attackerStats.critRate || 0;
    const critChance = Math.min(0.95, Math.max(0, baseCrit + (skill?.critBonus ?? 0)));
    const isCritical = Math.random() < critChance;

    // 伤害计算
    const category = skill?.category || 'physical';
    const powerMultiplier = skill?.powerMultiplier ?? 1;
    const flatPower = skill?.flatPower ?? 0;

    let baseDamage = 0;
    if (category === 'physical') {
      // 物理伤害 = 物理攻击×倍率 + 固伤 - 物理防御/2
      baseDamage = (attackerStats.atk || 0) * powerMultiplier + flatPower - (defenderStats.def || 0) / 2;
    } else {
      // 魔法伤害 = (H攻击×倍率 + 固伤) × (1 - H防御)
      const hdef = Math.min(0.9, Math.max(0, defenderStats.hdef || 0));
      baseDamage = ((attackerStats.hatk || 0) * powerMultiplier + flatPower) * (1 - hdef);
    }

    baseDamage = Math.max(1, Math.round(baseDamage));

    const critMul = skill?.critDamageOverride ?? attackerStats.critDamageMultiplier ?? 1.5;
    const finalDamage = isCritical ? Math.max(1, Math.round(baseDamage * critMul)) : baseDamage;

    // 暴击事件
    if (isCritical) {
      events.push({
        type: 'battle:critical',
        data: {
          actorId: actor.id,
          targetId: target.id,
          damage: finalDamage,
        },
      });
    }

    // 应用伤害
    target.hp = Math.max(0, (target.hp || 0) - finalDamage);

    // 确保HP不超过maxHp
    if (target.maxHp !== undefined) {
      target.hp = Math.min(target.hp, target.maxHp);
    }

    // HHP变化处理（H攻击时减少目标HHP）
    if (category === 'magical' && target.stats?.hhp && target.stats.hhp > 0) {
      const hhpDamage = Math.min(target.stats.hhp, Math.max(1, Math.round(finalDamage * 0.1)));
      target.stats.hhp = Math.max(0, target.stats.hhp - hhpDamage);
      
      if (hhpDamage > 0) {
        events.push({
          type: 'battle:hhp-changed',
          data: {
            actorId: actor.id,
            targetId: target.id,
            hhpChange: -hhpDamage,
            remainingHhp: target.stats.hhp,
          },
        });
      }
    }

    // 伤害事件
    events.push({
      type: 'battle:damage',
      data: {
        actorId: actor.id,
        targetId: target.id,
        damage: finalDamage,
        isCritical,
      },
    });

    // 切换回合
    const wasPlayerTurn = next.turn === 'player';
    next.turn = next.turn === 'player' ? 'enemy' : 'player';

    // 只有当从敌人回合回到玩家回合时，才增加回合数（玩家回合 + 敌人回合 = 1个完整回合）
    if (!wasPlayerTurn && next.turn === 'player') {
      next.round = (next.round || 1) + 1;
    }

    // 结束判定
    const playerAlive = next.participants.some((p: any) => p.side === 'player' && (p.hp || 0) > 0);
    const enemyAlive = next.participants.some((p: any) => p.side === 'enemy' && (p.hp || 0) > 0);
    if (!playerAlive || !enemyAlive) {
      next.ended = true;
      next.winner = playerAlive ? 'player' : 'enemy';
      return { newState: next, events };
    }

    console.log('[BattleEngine] Returning processed state:', {
      newStateParticipants: next?.participants?.length || 0,
      newState: next
        ? {
            ended: next.ended,
            turn: next.turn,
            round: next.round,
            participants: next.participants?.map((p: any) => ({ id: p.id, name: p.name, side: p.side, hp: p.hp })),
          }
        : null,
      eventsCount: events.length,
    });

    return { newState: next, events };
  }

  /**
   * 获取战斗结果
   * @param state 战斗状态
   * @returns 战斗结果，如果战斗未结束则返回 null
   */
  public getResult(state: BattleState): BattleResult | null {
    if (!state.ended || !state.winner) return null;
    return {
      winner: state.winner,
      rounds: state.round || 1, // 使用实际回合数
      summary: state.winner === 'player' ? '你击败了敌人。' : '你被打败了。',
    };
  }

  /**
   * 获取技能信息
   * @param skillId 技能ID
   * @returns 技能对象，如果不存在则返回 undefined
   */
  public getSkill(skillId: string): Skill | undefined {
    return this.skillMap.get(skillId);
  }

  /**
   * 获取所有已注册的技能
   * @returns 技能ID列表
   */
  public getAllSkillIds(): string[] {
    return Array.from(this.skillMap.keys());
  }
}
