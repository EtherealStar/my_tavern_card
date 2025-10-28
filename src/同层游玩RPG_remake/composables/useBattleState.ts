/**
 * useBattleState - 战斗状态管理组合式函数
 *
 * 定位：
 * - 战斗状态的**唯一真相源**（Single Source of Truth）
 * - 所有战斗相关状态都应该从这里读取
 * - 所有战斗状态变更都应该通过这里的方法进行
 *
 * 职责：
 * - 维护战斗配置和战斗状态
 * - 提供响应式的战斗数据访问
 * - 处理状态更新并发送事件通知
 * - 管理参与者状态和回合流转
 *
 * 数据流：
 * Input: 从 useBattleSystem 接收状态更新
 * Output: 通过 computed 提供响应式数据给 Vue 组件
 *         通过 EventBus 发送状态变更事件
 *
 * 使用方式：
 * ```typescript
 * const battleState = useBattleState();
 *
 * // 读取状态
 * const hp = battleState.playerParticipant.value?.hp;
 *
 * // 更新状态
 * battleState.updateParticipant('player1', { hp: 50 });
 * ```
 */

import { computed, inject, readonly, ref } from 'vue';
import type { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import type { BattleConfig, BattleParticipant } from '../models/BattleSchemas';

export interface BattleParticipantExtended {
  id: string;
  name: string;
  side: 'player' | 'enemy';
  level: number;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  stats?: {
    hhp?: number;
    [key: string]: any;
  };
  skills?: string[];
  background?: string;
  mvuAttributes?: Record<string, number>;
  enemyPortrait?: {
    image?: string;
    [key: string]: any;
  };
}

export interface BattleConfigExtended {
  participants: BattleParticipantExtended[];
  background?: string | { image?: string; [key: string]: any };
  id?: string;
  name?: string;
}

export interface BattleStateExtended {
  started: boolean;
  ended: boolean;
  winner?: 'player' | 'enemy' | null;
  currentTurn: 'player' | 'enemy';
  turn: 'player' | 'enemy';
  participants: BattleParticipantExtended[];
  round: number;
  summary?: string;
  // 确保包含所有必需的属性
  id?: string;
  name?: string;
  background?: string;
}

export function useBattleState() {
  // 依赖注入
  const eventBus = inject<EventBus>(TYPES.EventBus);

  // 唯一的状态管理
  const battleConfig = ref<BattleConfigExtended | null>(null);
  const battleState = ref<BattleStateExtended | null>(null);
  const isInitialized = ref(false);

  // 计算属性
  const hasConfig = computed(() => !!battleConfig.value);
  const hasState = computed(() => !!battleState.value);
  const isBattleActive = computed(() => battleState.value?.started && !battleState.value?.ended);
  const playerParticipant = computed(() => {
    const stateParticipants = battleState.value?.participants;
    if (Array.isArray(stateParticipants)) {
      return stateParticipants.find(p => p.side === 'player');
    }
    const configParticipants = battleConfig.value?.participants;
    return Array.isArray(configParticipants) ? configParticipants.find(p => p.side === 'player') : undefined;
  });
  const enemyParticipants = computed(() => {
    const stateParticipants = battleState.value?.participants;
    if (Array.isArray(stateParticipants)) {
      return stateParticipants.filter(p => p.side === 'enemy');
    }
    const configParticipants = battleConfig.value?.participants;
    return Array.isArray(configParticipants) ? configParticipants.filter(p => p.side === 'enemy') : [];
  });
  const backgroundImage = computed(() => {
    const background = battleConfig.value?.background;
    if (typeof background === 'string') {
      return background;
    }
    if (background && typeof background === 'object' && 'image' in background) {
      return (background as any).image;
    }
    return undefined;
  });
  const currentTurn = computed(() => battleState.value?.currentTurn || 'player');
  const battleRound = computed(() => battleState.value?.round || 1);
  const isBattleEnded = computed(() => battleState.value?.ended || false);
  const battleWinner = computed(() => battleState.value?.winner);

  // 事件发送辅助函数
  const emitEvent = (eventName: string, data?: any) => {
    if (eventBus?.emit) {
      eventBus.emit(eventName, data);
    }
  };

  // 创建初始战斗状态
  const createInitialState = (config: BattleConfigExtended): BattleStateExtended => {
    // 验证配置对象
    if (!config) {
      console.error('[useBattleState] config is null or undefined');
      throw new Error('Invalid battle config: config is null or undefined');
    }

    // 验证 participants 是否为数组
    if (!Array.isArray(config.participants)) {
      console.error('[useBattleState] config.participants is not an array:', {
        config,
        participants: config.participants,
        participantsType: typeof config.participants,
        participantsIsArray: Array.isArray(config.participants),
      });
      throw new Error('Invalid battle config: participants must be an array');
    }

    return {
      started: true,
      ended: false,
      winner: null,
      currentTurn: 'player',
      participants: [...config.participants],
      round: 1,
      turn: 'player',
    };
  };

  // ==================== Actions ====================

  /**
   * 初始化战斗
   * @param config 战斗配置
   */
  const initializeBattle = (config: BattleConfigExtended) => {
    console.log('[useBattleState] initializeBattle called with config:', {
      hasConfig: !!config,
      participantsCount: config?.participants?.length || 0,
      participants: config?.participants?.map(p => ({ id: p.id, name: p.name, side: p.side })) || [],
    });

    battleConfig.value = config;
    battleState.value = createInitialState(config);
    isInitialized.value = true;

    console.log('[useBattleState] Battle initialized:', {
      hasBattleState: !!battleState.value,
      participantsCount: battleState.value?.participants?.length || 0,
      isInitialized: isInitialized.value,
    });

    // 注意：不再发送 battle:initialized 事件，因为 useBattleSystem 已经通过 BattleService 处理了
    // 这避免了事件重复发送和数据结构不匹配的问题
  };

  /**
   * 更新战斗状态
   * @param updates 要更新的字段或完整状态
   */
  const updateBattleState = (updates: Partial<BattleStateExtended> | BattleStateExtended) => {
    console.log('[useBattleState] updateBattleState called with:', {
      hasUpdates: !!updates,
      updatesType: typeof updates,
      hasParticipants: updates && 'participants' in updates,
      participantsIsArray: updates && 'participants' in updates ? Array.isArray(updates.participants) : false,
      participantsCount:
        updates && 'participants' in updates && Array.isArray(updates.participants) ? updates.participants.length : 0,
      currentBattleState: !!battleState.value,
      currentParticipantsCount: battleState.value?.participants?.length || 0,
    });

    // 如果battleState.value是null，但updates包含完整状态，则直接设置
    if (!battleState.value && updates && 'participants' in updates && Array.isArray(updates.participants)) {
      console.log('[useBattleState] Setting initial battle state from updates');
      battleState.value = updates as BattleStateExtended;
      return;
    }

    if (battleState.value) {
      // 检查参与者数据是否有效
      if (updates && 'participants' in updates) {
        if (!Array.isArray(updates.participants)) {
          console.error('[useBattleState] Invalid participants data in updates:', updates.participants);
          return;
        }
        if (updates.participants.length === 0) {
          console.warn('[useBattleState] WARNING: Updates contain empty participants array!', {
            updates,
            currentParticipants: battleState.value.participants,
          });
        }
      }

      // 简化状态更新，不重新计算HP
      const oldState = { ...battleState.value };
      battleState.value = { ...battleState.value, ...updates };

      console.log('[useBattleState] Battle state updated:', {
        oldParticipantsCount: oldState.participants?.length || 0,
        newParticipantsCount: battleState.value.participants?.length || 0,
        participantsChanged: oldState.participants?.length !== battleState.value.participants?.length,
      });

      // 发送事件 - 通知 Phaser 和其他组件状态已更新
      emitEvent('battle:state-updated', { updates, battleState: battleState.value });
    } else {
      console.warn('[useBattleState] Cannot update battle state - battleState.value is null/undefined');
    }
  };

  /**
   * 更新参与者状态
   * @param participantId 参与者ID
   * @param updates 要更新的字段
   */
  const updateParticipant = (participantId: string, updates: Partial<BattleParticipantExtended>) => {
    if (battleState.value) {
      const participantIndex = battleState.value.participants.findIndex((p: any) => p.id === participantId);
      if (participantIndex !== -1) {
        // hp 变化日志（仅当 hp 实际变化时输出）
        try {
          const prevHp = battleState.value.participants[participantIndex].hp;
          const nextHp = updates.hp ?? prevHp;
          if (typeof prevHp === 'number' && typeof nextHp === 'number' && prevHp !== nextHp) {
            console.log('[useBattleState] hp changed (partial):', {
              participantId,
              name: battleState.value.participants[participantIndex].name,
              oldHp: prevHp,
              newHp: nextHp,
            });
          }
        } catch {
          // ignore logging errors
        }

        // mp 变化日志（仅当 mp 实际变化时输出）
        try {
          const prevMp = battleState.value.participants[participantIndex].mp;
          const nextMp = updates.mp ?? prevMp;
          if (typeof prevMp === 'number' && typeof nextMp === 'number' && prevMp !== nextMp) {
            console.log('[useBattleState] mp changed (partial):', {
              participantId,
              name: battleState.value.participants[participantIndex].name,
              oldMp: prevMp,
              newMp: nextMp,
            });
          }
        } catch {
          // ignore logging errors
        }

        // hhp 变化日志（仅当 hhp 实际变化时输出）
        try {
          const prevHhp = battleState.value.participants[participantIndex].stats?.hhp;
          const nextHhp = updates.stats?.hhp ?? prevHhp;
          if (typeof prevHhp === 'number' && typeof nextHhp === 'number' && prevHhp !== nextHhp) {
            console.log('[useBattleState] hhp changed (partial):', {
              participantId,
              name: battleState.value.participants[participantIndex].name,
              oldHhp: prevHhp,
              newHhp: nextHhp,
            });
          }
        } catch {
          // ignore logging errors
        }

        battleState.value.participants[participantIndex] = {
          ...battleState.value.participants[participantIndex],
          ...updates,
        };

        // 同时更新配置中的参与者信息，保持一致性
        if (battleConfig.value) {
          const configParticipantIndex = battleConfig.value.participants.findIndex(p => p.id === participantId);
          if (configParticipantIndex !== -1) {
            battleConfig.value.participants[configParticipantIndex] = {
              ...battleConfig.value.participants[configParticipantIndex],
              ...updates,
            };
          }
        }

        // 发送事件 - 通知 Phaser 更新显示
        emitEvent('battle:participant-updated', {
          participantId,
          updates,
          participant: battleState.value.participants[participantIndex],
        });

        // 同时发送状态更新事件，确保所有组件同步
        emitEvent('battle:state-updated', { battleState: battleState.value });
      }
    }
  };

  const nextTurn = () => {
    if (battleState.value) {
      battleState.value.currentTurn = battleState.value.currentTurn === 'player' ? 'enemy' : 'player';
      battleState.value.turn = battleState.value.currentTurn;

      // 发送事件总线事件
      emitEvent('battle:turn-changed', {
        currentTurn: battleState.value.currentTurn,
        round: battleState.value.round,
      });
    }
  };

  const nextRound = () => {
    if (battleState.value) {
      battleState.value.round += 1;

      // 发送事件总线事件
      emitEvent('battle:round-changed', {
        round: battleState.value.round,
      });
    }
  };

  const endBattle = (winner: 'player' | 'enemy', summary?: string) => {
    if (battleState.value) {
      battleState.value = {
        ...battleState.value,
        ended: true,
        winner,
        summary,
      };

      // 发送事件总线事件 - 统一使用 battle:result
      emitEvent('battle:result', {
        winner,
        summary,
        rounds: battleState.value.round,
        battleState: battleState.value,
      });
    }
  };

  // 处理战斗结束
  const handleBattleEnd = async (result: any) => {
    if (battleState.value) {
      endBattle(result.winner, result.summary);
    }
  };

  const resetBattle = () => {
    battleConfig.value = null;
    battleState.value = null;
    isInitialized.value = false;

    // 发送事件总线事件
    emitEvent('battle:reset');
  };

  // 工具方法
  const getParticipant = (participantId: string): BattleParticipantExtended | undefined => {
    // 优先从 battleState 获取
    if (battleState.value?.participants) {
      const participant = battleState.value.participants.find(p => p.id === participantId);
      if (participant) {
        return participant;
      }
    }
    // 如果 battleState 中没有，从 battleConfig 获取
    if (battleConfig.value?.participants) {
      const participant = battleConfig.value.participants.find(p => p.id === participantId);
      if (participant) {
        return participant;
      }
    }
    return undefined;
  };

  const getParticipantsBySide = (side: 'player' | 'enemy'): BattleParticipantExtended[] => {
    // 优先从 battleState 获取
    if (battleState.value?.participants) {
      return battleState.value.participants.filter(p => p.side === side);
    }
    // 如果 battleState 中没有，从 battleConfig 获取
    if (battleConfig.value?.participants) {
      return battleConfig.value.participants.filter(p => p.side === side);
    }
    return [];
  };

  const isParticipantAlive = (participantId: string): boolean => {
    const participant = getParticipant(participantId);
    return participant ? (participant.hp || 0) > 0 : false;
  };

  const getAliveParticipants = (side?: 'player' | 'enemy'): BattleParticipantExtended[] => {
    let participants: BattleParticipantExtended[] = [];

    if (side) {
      participants = getParticipantsBySide(side);
    } else if (battleState.value?.participants) {
      // 获取所有参与者
      participants = battleState.value.participants;
    } else if (battleConfig.value?.participants) {
      participants = battleConfig.value.participants;
    }

    return participants.filter(p => (p.hp || 0) > 0);
  };

  return {
    // 状态
    battleConfig: readonly(battleConfig),
    battleState: readonly(battleState),
    isInitialized: readonly(isInitialized),

    // 计算属性
    hasConfig,
    hasState,
    isBattleActive,
    playerParticipant,
    enemyParticipants,
    backgroundImage,
    currentTurn,
    battleRound,
    isBattleEnded,
    battleWinner,

    // Actions
    initializeBattle,
    updateBattleState,
    updateParticipant,
    nextTurn,
    nextRound,
    endBattle,
    handleBattleEnd,
    resetBattle,

    // 工具方法
    getParticipant,
    getParticipantsBySide,
    isParticipantAlive,
    getAliveParticipants,
  };
}
