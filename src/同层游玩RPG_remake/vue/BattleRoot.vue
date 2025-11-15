<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import { useBattleSystem } from '同层游玩RPG_remake/composables/useBattleSystem';
import { BattleConfigService } from '同层游玩RPG_remake/services/BattleConfigService';
import { useBattleConfig } from '../composables/useBattleConfig';
import { useStatData } from '../composables/useStatData';
import type { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { getEnemyExpByLevel } from '../data/levelExpTable';
import { historyManager } from '../services/HistoryManager';
import type { StatDataBindingService } from '../services/StatDataBindingService';
import { battleConsoleLog } from '../utils/battleConsoleLogger';
import BattleDebugPanel from './components/BattleDebugPanel.vue';
import BattleLayout from './components/BattleLayout.vue';
import BattleResultDialog from './components/BattleResultDialog.vue';
const battleConfigManager = useBattleConfig();

// 使用统计数据服务（用于经验值结算）
const statData = useStatData();

// ✅ 在 setup 阶段初始化战斗系统（inject 只能在这里使用）
const battleSystem = useBattleSystem();
const battleState = (battleSystem as any).battleState; // 从 battleSystem 中获取 battleState
const eventBus = inject<EventBus>(TYPES.EventBus);
const battleConfigService = inject<BattleConfigService>(TYPES.BattleConfigService);
const statDataBindingService = inject<StatDataBindingService>(TYPES.StatDataBindingService);

// 战斗结果相关状态
const showBattleResult = ref(false);
const battleResult = ref<{ winner: 'player' | 'enemy'; summary?: string } | null>(null);

const INITIAL_BATTLE_ID = 'yokai_battle';
const hasRequestedInitialBattle = ref(false);

// 技能选择相关状态
const showSkillSelection = ref(false);
const showSkillCreator = ref(false);
const newSkill = ref({
  id: '',
  name: '',
  description: '',
  category: 'physical',
  target: 'single',
  powerMultiplier: 1.0,
  flatPower: 0,
  hitModifier: 0,
  critBonus: 0,
  mpCost: 0,
  animationKey: '',
  tags: [],
});
const skillValidationErrors = ref<Record<string, string>>({});

// 战斗行动数据 - 动态计算按钮是否可用
const battleActions = computed(() => [
  { id: 'fight', label: '战斗', icon: '⚔️' },
  { id: 'skill', label: '技能', icon: '✨', disabled: availableSkills.value.length === 0 },
  { id: 'item', label: '道具', icon: '🧪', disabled: true },
  { id: 'run', label: '逃跑', icon: '🏃' },
]);

// 默认选中的行动
const selectedAction = ref('fight');

// BattleLayout 引用
const battleLayoutRef = ref<InstanceType<typeof BattleLayout>>();

// 直接从响应式 battleState 中派生，确保依赖收集
const participants = computed(() => {
  const result = battleState.battleState.value?.participants ?? [];

  // 只在出错时输出调试信息
  if (result.length === 0 && battleState.isInitialized.value) {
    console.warn('[BattleRoot] No participants found in initialized battle state:', {
      hasBattleState: !!battleState.battleState.value,
      hasParticipants: !!battleState.battleState.value?.participants,
      isInitialized: battleState.isInitialized.value,
    });
  }

  return result;
});

const activePlayer = computed(() => {
  const list = participants.value as any[];

  if (!list || list.length === 0) {
    console.warn('[BattleRoot] activePlayer: No participants list or empty list');
    return null;
  }

  // 优先查找存活的玩家（HP > 0）
  const alive = list.filter((p: any) => p?.side === 'player' && (p?.hp ?? 0) > 0);
  if (alive.length > 0) {
    return alive[0];
  }

  // 如果没找到存活的，查找任何玩家（包括HP为0或未初始化的）
  const anyPlayer = list.find((p: any) => p?.side === 'player');
  if (anyPlayer) {
    return anyPlayer;
  }

  console.warn('[BattleRoot] No player found in participants:', list);
  return null;
});

const activeEnemy = computed(() => {
  const list = participants.value as any[];

  if (!list || list.length === 0) {
    console.warn('[BattleRoot] activeEnemy: No participants list or empty list');
    return null;
  }

  // 优先查找存活的敌人（HP > 0）
  const alive = list.filter((p: any) => p?.side === 'enemy' && (p?.hp ?? 0) > 0);
  if (alive.length > 0) {
    return alive[0];
  }

  // 如果没找到存活的，查找任何敌人（包括HP为0或未初始化的）
  const anyEnemy = list.find((p: any) => p?.side === 'enemy');
  if (anyEnemy) {
    return anyEnemy;
  }

  console.warn('[BattleRoot] No enemy found in participants:', list);
  return null;
});

// 获取所有敌人（基于响应式 participants）
const activeEnemies = computed(() => {
  const list = (participants.value as any[]).filter(p => p?.side === 'enemy');

  if (list.length === 0) {
    console.warn('[BattleRoot] No enemies found in participants:', {
      totalParticipants: participants.value.length,
      participants: participants.value.map((p: any) => ({ id: p?.id, name: p?.name, side: p?.side })),
    });
    return [];
  }

  return list.map(enemy => {
    // 转换相对坐标为绝对像素坐标
    let position = { x: 400, y: 300 }; // 默认位置

    if (enemy.enemyPortrait?.position) {
      const relPos = enemy.enemyPortrait.position;
      // 如果坐标是相对值（0-1之间），转换为像素坐标
      if (relPos.x <= 1 && relPos.y <= 1) {
        position = {
          x: Math.round(relPos.x * window.innerWidth),
          y: Math.round(relPos.y * window.innerHeight),
        };
      } else {
        // 如果已经是像素坐标，直接使用
        position = { x: relPos.x, y: relPos.y };
      }
    } else {
      console.warn('[BattleRoot] Enemy missing position data:', {
        enemyId: enemy.id,
        enemyName: enemy.name,
        enemyPortrait: enemy.enemyPortrait,
      });
    }

    return {
      id: enemy.id,
      name: enemy.name,
      hp: enemy.hp ?? 0,
      maxHp: enemy.maxHp ?? 1,
      mp: enemy.mp ?? 0,
      maxMp: enemy.maxMp ?? 0,
      stats: enemy.stats,
      weakness: enemy.weakness, // 添加弱点信息
      enemyPortrait: {
        ...enemy.enemyPortrait,
        position,
      },
    };
  });
});

// 战斗信息
const battleInfo = computed(() => ({
  title: '战斗',
  subtitle: `回合 ${battleState.battleRound.value}`,
}));

// 调试模式判断
const isDebugMode = computed(() => {
  return battleState.battleConfig.value?.isDebugMode === true;
});

// 可用技能计算属性
const availableSkills = computed(() => activePlayer.value?.skills || []);

// 技能特效
const skillEffects = ref<any[]>([]);

// 战斗消息
const battleMessages = ref<any[]>([]);

// 战斗日志（顶部显示）
const battleLog = ref<Array<{ text: string; type: 'info' | 'warning' | 'success' | 'error' }>>([]);

// 技能名称映射
const skillNames: Record<string, string> = {
  power_strike: '重击',
  precise_strike: '精准打击',
  fireball: '火球',
};

function getSkillName(skillId: string): string {
  return skillNames[skillId] || skillId;
}

function validateNewSkill(): boolean {
  const errors: Record<string, string> = {};

  if (!newSkill.value.id?.trim()) {
    errors.id = '技能ID不能为空';
  } else if (battleConfigService?.isValidSkillId(newSkill.value.id)) {
    errors.id = '技能ID已存在';
  }

  if (!newSkill.value.name?.trim()) {
    errors.name = '技能名称不能为空';
  }

  if (newSkill.value.powerMultiplier === undefined || newSkill.value.powerMultiplier < 0) {
    errors.powerMultiplier = '威力倍数不能为负数';
  }

  if (newSkill.value.flatPower === undefined || newSkill.value.flatPower < 0) {
    errors.flatPower = '固定威力不能为负数';
  }

  skillValidationErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function createAndAddSkill() {
  if (!validateNewSkill() || !battleConfigService) return;

  const skill = {
    id: newSkill.value.id!,
    name: newSkill.value.name!,
    description: newSkill.value.description || '',
    category: newSkill.value.category as 'physical' | 'magical',
    target: newSkill.value.target as 'single' | 'all' | 'self',
    powerMultiplier: newSkill.value.powerMultiplier || 1.0,
    flatPower: newSkill.value.flatPower || 0,
    hitModifier: newSkill.value.hitModifier || 0,
    critBonus: newSkill.value.critBonus || 0,
    mpCost: newSkill.value.mpCost || 0,
    animationKey: newSkill.value.animationKey || '',
    tags: newSkill.value.tags || [],
  };

  // 注册技能到服务
  battleConfigService.registerCustomSkill(skill);

  // 添加到当前玩家技能列表
  if (activePlayer.value && !activePlayer.value.skills?.includes(skill.id)) {
    const currentSkills = [...(activePlayer.value.skills || [])];
    currentSkills.push(skill.id);

    // 更新玩家技能
    battleState.updateParticipant(activePlayer.value.id, { skills: currentSkills });
  }

  battleConsoleLog('[BattleRoot] 创建并添加新技能:', skill);

  // 关闭创建器
  showSkillCreator.value = false;
  clearNewSkillForm();
}

function clearNewSkillForm() {
  newSkill.value = {
    id: '',
    name: '',
    description: '',
    category: 'physical',
    target: 'single',
    powerMultiplier: 1.0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    mpCost: 0,
    animationKey: '',
    tags: [],
  };
  skillValidationErrors.value = {};
}

function openSkillCreator() {
  showSkillCreator.value = true;
  clearNewSkillForm();
}

function onActionSelected(actionId: string) {
  battleConsoleLog('[BattleRoot] 行动选择:', actionId);
  selectedAction.value = actionId;
}

async function onActionConfirmed(actionId: string) {
  battleConsoleLog('[BattleRoot] onActionConfirmed called with actionId:', actionId);

  try {
    const player = activePlayer.value;
    const enemy = activeEnemy.value;

    battleConsoleLog('[BattleRoot] onActionConfirmed - current state:', {
      hasPlayer: !!player,
      hasEnemy: !!enemy,
      player: player ? { id: player.id, name: player.name, side: player.side, hp: player.hp } : null,
      enemy: enemy ? { id: enemy.id, name: enemy.name, side: enemy.side, hp: enemy.hp } : null,
      participantsCount: participants.value.length,
      participants: participants.value.map((p: any) => ({ id: p?.id, name: p?.name, side: p?.side, hp: p?.hp })),
    });

    if (!player || !enemy) {
      console.warn('[BattleRoot] Missing battle targets:', { player, enemy, participants: participants.value });
      // 无法找到有效的战斗目标
      return;
    }

    // 检查战斗是否已完全初始化
    if (player.hp === undefined || enemy.hp === undefined) {
      console.warn('[BattleRoot] Battle not fully initialized yet:', { playerHp: player.hp, enemyHp: enemy.hp });
      // 战斗尚未完全初始化
      return;
    }

    switch (actionId) {
      case 'fight':
        await battleSystem.processPlayerAction({ type: 'attack', actorId: player.id, targetId: enemy.id });
        break;
      case 'skill':
        showSkillSelection.value = true;
        break;
      case 'item':
        break;
      case 'run':
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('[BattleRoot] 执行行动失败:', error);
    // 执行行动失败
  }
}

async function onSkillSelected(skillId: string) {
  try {
    const player = activePlayer.value;
    const enemy = activeEnemy.value;

    if (!player || !enemy) {
      console.warn('[BattleRoot] Missing battle targets for skill:', {
        player,
        enemy,
        participants: participants.value,
      });
      // 无法找到有效的战斗目标
      return;
    }

    // 检查战斗是否已完全初始化
    if (player.hp === undefined || enemy.hp === undefined) {
      console.warn('[BattleRoot] Battle not fully initialized for skill:', { playerHp: player.hp, enemyHp: enemy.hp });
      // 战斗尚未完全初始化
      return;
    }

    await battleSystem.processPlayerAction({
      type: 'useSkill',
      actorId: player.id,
      targetId: enemy.id,
      skillId,
    });

    showSkillSelection.value = false;
  } catch (error) {
    console.error('[BattleRoot] 施放技能失败:', error);
    // 施放技能失败
  }
}

function addBattleLog(text: string, type: 'info' | 'warning' | 'success' | 'error' = 'info') {
  battleLog.value.push({ text, type });
  if (battleLog.value.length > 20) {
    battleLog.value = battleLog.value.slice(-20);
  }
}

async function exitBattle() {
  try {
    gameState.exitBattle(true);
    battleState.resetBattle();
    // 已退出战斗
  } catch (error) {
    console.error('[BattleRoot] 退出战斗失败:', error);
    // 退出战斗失败
  }
}

async function closeBattleResult() {
  // 如果战斗胜利，结算经验值
  if (battleResult.value?.winner === 'player') {
    try {
      // 获取敌人信息（从战斗状态中）
      const enemyParticipant = battleState.battleState.value?.participants?.find((p: any) => p.side === 'enemy');

      if (enemyParticipant?.level) {
        // 计算经验值
        const expGained = getEnemyExpByLevel(enemyParticipant.level);

        if (expGained > 0) {
          // 获取当前经验值
          const currentExp = await statData.getTotalExp();
          const newExp = currentExp + expGained;

          // 更新MVU变量
          if (statDataBindingService) {
            await statDataBindingService.setStatDataField('exp', newExp, '战斗胜利获得经验');

            // 刷新经验条
            await statData.refreshExpBarData();

            // 显示提示
            // 获得经验值
          } else {
            console.warn('[BattleRoot] StatDataBindingService 不可用，无法更新经验值');
          }
        }
      }
    } catch (error) {
      console.error('[BattleRoot] 结算经验值失败:', error);
      // 即使失败也继续关闭对话框
    }
  }

  // 关闭对话框和退出战斗
  showBattleResult.value = false;
  battleResult.value = null;
  exitBattle();
}

let isSyncingBattleStateFromEvent = false;
const battleEventUnsubscribers: Array<() => void> = [];

const teardownBattleEventListeners = () => {
  while (battleEventUnsubscribers.length > 0) {
    const unsubscribe = battleEventUnsubscribers.pop();
    try {
      unsubscribe?.();
    } catch (error) {
      console.error('[BattleRoot] Failed to teardown battle event listener:', error);
    }
  }
};

const setupBattleEventListeners = () => {
  battleConsoleLog('[BattleRoot] Setting up battle event listeners');

  if (!eventBus) {
    console.warn('[BattleRoot] EventBus not available for battle event listeners');
    return;
  }

  teardownBattleEventListeners();

  battleEventUnsubscribers.push(
    eventBus.on('battle:damage', (data: any) => {
      battleConsoleLog('[BattleRoot] Damage event:', data);

      // 使用生成的描述而不是简单文本
      if (data.description) {
        addBattleLog(data.description, 'info');
      } else {
        // 降级到原有逻辑
        setTimeout(() => {
          const attacker = battleState.getParticipant(data?.actorId);
          const target = battleState.getParticipant(data?.targetId);
          let attackerName = attacker?.name || '未知';
          let targetName = target?.name || '未知';
          if (attackerName === '未知' && data?.actorId) {
            const allParticipants = battleState.battleState.value?.participants || [];
            const foundAttacker = allParticipants.find((p: any) => p.id === data.actorId);
            if (foundAttacker) {
              attackerName = foundAttacker.name;
            }
          }
          if (targetName === '未知' && data?.targetId) {
            const allParticipants = battleState.battleState.value?.participants || [];
            const foundTarget = allParticipants.find((p: any) => p.id === data.targetId);
            if (foundTarget) {
              targetName = foundTarget.name;
            }
          }
          if (typeof data?.damage === 'number') {
            addBattleLog(`${attackerName} 对 ${targetName} 造成了 ${data.damage} 点伤害！`, 'info');
          }
        }, 0);
      }

      // 显示伤害数字
      if (battleLayoutRef.value && data.targetId) {
        battleLayoutRef.value.showEnemyDamage(data.targetId, data.damage, false);
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:miss', (data: any) => {
      battleConsoleLog('[BattleRoot] Miss event:', data);

      if (data.description) {
        addBattleLog(data.description, 'warning');
      } else {
        // 降级到原有逻辑
        setTimeout(() => {
          const attacker = battleState.getParticipant(data?.actorId);
          let attackerName = attacker?.name || '未知';
          if (attackerName === '未知' && data?.actorId) {
            const allParticipants = battleState.battleState.value?.participants || [];
            const foundAttacker = allParticipants.find((p: any) => p.id === data.actorId);
            if (foundAttacker) {
              attackerName = foundAttacker.name;
            }
          }
          addBattleLog(`${attackerName} 的攻击未命中！`, 'warning');
        }, 0);
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:critical', (data: any) => {
      battleConsoleLog('[BattleRoot] Critical event:', data);

      if (data.description) {
        addBattleLog(data.description, 'success');
      } else {
        // 降级到原有逻辑
        setTimeout(() => {
          const attacker = battleState.getParticipant(data?.actorId);
          const target = battleState.getParticipant(data?.targetId);
          let attackerName = attacker?.name || '未知';
          let targetName = target?.name || '未知';
          if (attackerName === '未知' && data?.actorId) {
            const allParticipants = battleState.battleState.value?.participants || [];
            const foundAttacker = allParticipants.find((p: any) => p.id === data.actorId);
            if (foundAttacker) {
              attackerName = foundAttacker.name;
            }
          }
          if (targetName === '未知' && data?.targetId) {
            const allParticipants = battleState.battleState.value?.participants || [];
            const foundTarget = allParticipants.find((p: any) => p.id === data.targetId);
            if (foundTarget) {
              targetName = foundTarget.name;
            }
          }
          if (typeof data?.damage === 'number') {
            addBattleLog(`暴击！${attackerName} 对 ${targetName} 造成了 ${data.damage} 点伤害！`, 'success');
          }
        }, 0);
      }

      // 显示伤害数字
      if (battleLayoutRef.value && data.targetId) {
        battleLayoutRef.value.showEnemyDamage(data.targetId, data.damage, true);
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:state-updated', (payload: any) => {
      battleConsoleLog('[BattleRoot] Battle state updated:', payload);

      // 只处理来自 BattleService 的事件（直接状态对象），忽略来自 useBattleState 的事件（包含 updates 和 battleState 的对象）
      if (payload?.updates !== undefined || payload?.battleState !== undefined) {
        battleConsoleLog(
          '[BattleRoot] Ignoring battle:state-updated event from useBattleState to prevent circular updates',
        );
        return;
      }

      // 处理来自 BattleService 的状态更新事件
      const resolvedState = payload;
      if (!resolvedState || !Array.isArray(resolvedState.participants)) {
        console.warn('[BattleRoot] Invalid state data from BattleService:', resolvedState);
        return;
      }

      if (isSyncingBattleStateFromEvent) {
        battleConsoleLog('[BattleRoot] Already syncing battle state, skipping to prevent circular updates');
        return;
      }

      isSyncingBattleStateFromEvent = true;
      try {
        battleConsoleLog('[BattleRoot] Syncing battle state from BattleService event');
        battleState.updateBattleState(resolvedState);

        // 记录历史（仅在调试模式下）
        if (isDebugMode.value) {
          historyManager.recordChange(resolvedState, '战斗状态更新');
        }
      } catch (error) {
        console.error('[BattleRoot] Failed to sync battle state from event:', error);
      } finally {
        isSyncingBattleStateFromEvent = false;
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:result', (result: any) => {
      battleConsoleLog('[BattleRoot] Battle result:', result);
      battleResult.value = result;
      showBattleResult.value = true;
    }),
  );

  // 调试面板事件监听器
  battleEventUnsubscribers.push(
    eventBus.on('battle:debug-update-enemy', (data: any) => {
      battleConsoleLog('[BattleRoot] Debug update enemy:', data);
      if (data.participantId && data.updates) {
        battleState.updateParticipant(data.participantId, data.updates);
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:debug-update-player', (data: any) => {
      battleConsoleLog('[BattleRoot] Debug update player:', data);
      if (data.participantId && data.updates) {
        battleState.updateParticipant(data.participantId, data.updates);
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:debug-reset-enemy', (data: any) => {
      battleConsoleLog('[BattleRoot] Debug reset enemy:', data);
      // 重置敌人到初始状态
      if (data.participantId && battleState.battleConfig.value) {
        const initialEnemy = battleState.battleConfig.value.participants.find((p: any) => p.id === data.participantId);
        if (initialEnemy) {
          battleState.updateParticipant(data.participantId, initialEnemy);
        }
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:debug-reset-player', (data: any) => {
      battleConsoleLog('[BattleRoot] Debug reset player:', data);
      // 重置玩家到初始状态
      if (data.participantId && battleState.battleConfig.value) {
        const initialPlayer = battleState.battleConfig.value.participants.find((p: any) => p.id === data.participantId);
        if (initialPlayer) {
          battleState.updateParticipant(data.participantId, initialPlayer);
        }
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:debug-import-enemy', (data: any) => {
      battleConsoleLog('[BattleRoot] Debug import enemy:', data);
      if (activeEnemy.value) {
        battleState.updateParticipant(activeEnemy.value.id, data);
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:debug-import-full-config', (data: any) => {
      battleConsoleLog('[BattleRoot] Debug import full config:', data);
      if (data.enemy && activeEnemy.value) {
        battleState.updateParticipant(activeEnemy.value.id, data.enemy);
      }
      if (data.player && activePlayer.value) {
        battleState.updateParticipant(activePlayer.value.id, data.player);
      }
    }),
  );

  // 历史管理事件监听器
  battleEventUnsubscribers.push(
    eventBus.on('battle:debug-undo', () => {
      battleConsoleLog('[BattleRoot] Debug undo requested');
      const previousState = historyManager.undo();
      if (previousState) {
        battleState.updateBattleState(previousState);
        // 已撤销到上一个状态
      } else {
        // 没有可撤销的操作
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:debug-redo', () => {
      battleConsoleLog('[BattleRoot] Debug redo requested');
      const nextState = historyManager.redo();
      if (nextState) {
        battleState.updateBattleState(nextState);
        // 已重做到下一个状态
      } else {
        // 没有可重做的操作
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:debug-reset', () => {
      battleConsoleLog('[BattleRoot] Debug reset requested');
      if (battleState.battleConfig.value) {
        const initialState = battleState.createInitialState(battleState.battleConfig.value);
        battleState.updateBattleState(initialState);
        historyManager.clear();
        // 已重置到初始状态
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:debug-preset', (preset: string) => {
      battleConsoleLog('[BattleRoot] Debug preset requested:', preset);
      // 根据预设调整敌人属性
      if (activeEnemy.value) {
        let updates: any = {};
        switch (preset) {
          case 'easy':
            updates = {
              hp: 50,
              maxHp: 50,
              level: 1,
              stats: {
                atk: 8,
                hatk: 5,
                def: 2,
                hdef: 0.1,
                hit: 0.7,
                evade: 0.05,
                critRate: 0.02,
                critDamageMultiplier: 1.2,
                hhp: 0,
              },
            };
            break;
          case 'normal':
            updates = {
              hp: 100,
              maxHp: 100,
              level: 3,
              stats: {
                atk: 15,
                hatk: 12,
                def: 5,
                hdef: 0.2,
                hit: 0.8,
                evade: 0.1,
                critRate: 0.05,
                critDamageMultiplier: 1.5,
                hhp: 10,
              },
            };
            break;
          case 'hard':
            updates = {
              hp: 200,
              maxHp: 200,
              level: 5,
              stats: {
                atk: 25,
                hatk: 20,
                def: 10,
                hdef: 0.3,
                hit: 0.9,
                evade: 0.15,
                critRate: 0.1,
                critDamageMultiplier: 2.0,
                hhp: 30,
              },
            };
            break;
        }

        if (Object.keys(updates).length > 0) {
          battleState.updateParticipant(activeEnemy.value.id, updates);
          // 已应用预设
        }
      }
    }),
  );

  battleConsoleLog('[BattleRoot] Battle event listeners set up successfully');
};

onMounted(async () => {
  battleConsoleLog('[BattleRoot] Component mounted');
  try {
    setupBattleEventListeners();
    if (gameState.isInBattle.value && gameState.hasBattleConfig.value) {
      initializeBattleFromStore();
    } else if (!gameState.isInBattle.value && !hasRequestedInitialBattle.value) {
      hasRequestedInitialBattle.value = true;
      const started = await battleConfigManager.startBattle(INITIAL_BATTLE_ID, undefined, { silent: true });
      if (!started) {
        // 自动启动战斗失败
      }
    }
  } catch (error) {
    console.error('[BattleRoot] Failed to initialize battle system:', error);
    // 战斗系统初始化失败
  }
});

onUnmounted(() => {
  battleConsoleLog('[BattleRoot] Component unmounted');
  teardownBattleEventListeners();
});

async function initializeBattleFromStore() {
  const battleConfigItem = gameState.getBattleConfig();
  if (!battleConfigItem) {
    console.warn('[BattleRoot] No battle config in Composable');
    return;
  }
  if (battleState.isInitialized.value) {
    battleConsoleLog('[BattleRoot] Battle already initialized, skip re-initialization');
    return;
  }
  try {
    battleConsoleLog('[BattleRoot] Initializing battle system...');

    // 从 BattleConfigItem 中提取实际的 BattleConfig
    const battleConfig = battleConfigItem.config || battleConfigItem;

    if (!battleConfig.participants || battleConfig.participants.length === 0) {
      console.error('[BattleRoot] Battle config missing participants:', battleConfig);
      return;
    }

    battleConsoleLog('[BattleRoot] Starting battle with config:', {
      participantsCount: battleConfig.participants.length,
      participants: battleConfig.participants.map((p: any) => ({ id: p.id, side: p.side, name: p.name })),
    });

    await battleSystem.startBattle(battleConfig);
    battleConsoleLog('[BattleRoot] Battle initialized successfully');
  } catch (error) {
    console.error('[BattleRoot] Failed to initialize battle:', error);
  }
}
</script>

<template>
  <div class="battle-root rpg-app">
    <BattleLayout
      v-if="battleState.isInitialized.value && participants.length > 0"
      :actions="battleActions"
      :selected-action="selectedAction"
      :battle-info="battleInfo"
      :show-controls="true"
      :show-effects="true"
      :skill-effects="skillEffects"
      :battle-messages="battleMessages"
      :battle-log="battleLog"
      :active-player="activePlayer"
      :active-enemies="activeEnemies"
      @action-selected="onActionSelected"
      @action-confirmed="onActionConfirmed"
      @exit-battle="exitBattle"
      ref="battleLayoutRef"
    />
    <div v-else class="battle-loading">
      <div class="loading-message">战斗系统初始化中...</div>
    </div>

    <div v-if="showSkillSelection" class="skill-selection-overlay">
      <div class="skill-selection-panel">
        <h3>选择技能</h3>
        <div class="skill-buttons">
          <button v-for="skill in availableSkills" :key="skill" @click="onSkillSelected(skill)" class="skill-button">
            {{ getSkillName(skill) }}
          </button>
          <button class="add-skill-button" @click="openSkillCreator">➕ 添加新技能</button>
          <button class="cancel-button" @click="showSkillSelection = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 技能创建器弹窗 -->
    <div v-if="showSkillCreator" class="skill-creator-overlay">
      <div class="skill-creator-panel">
        <h3>创建新技能</h3>
        <div class="skill-form">
          <div class="form-group">
            <label>技能ID *</label>
            <input v-model="newSkill.id" type="text" placeholder="例如: fire_ball" />
            <div v-if="skillValidationErrors.id" class="error-message">{{ skillValidationErrors.id }}</div>
          </div>

          <div class="form-group">
            <label>技能名称 *</label>
            <input v-model="newSkill.name" type="text" placeholder="例如: 火球术" />
            <div v-if="skillValidationErrors.name" class="error-message">{{ skillValidationErrors.name }}</div>
          </div>

          <div class="form-group">
            <label>技能描述</label>
            <textarea v-model="newSkill.description" placeholder="技能描述..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>技能类型</label>
              <select v-model="newSkill.category">
                <option value="physical">物理</option>
                <option value="magical">魔法</option>
              </select>
            </div>

            <div class="form-group">
              <label>目标类型</label>
              <select v-model="newSkill.target">
                <option value="single">单体</option>
                <option value="all">全体</option>
                <option value="self">自身</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>威力倍数</label>
              <input v-model.number="newSkill.powerMultiplier" type="number" step="0.1" min="0" />
              <div v-if="skillValidationErrors.powerMultiplier" class="error-message">
                {{ skillValidationErrors.powerMultiplier }}
              </div>
            </div>

            <div class="form-group">
              <label>固定威力</label>
              <input v-model.number="newSkill.flatPower" type="number" min="0" />
              <div v-if="skillValidationErrors.flatPower" class="error-message">
                {{ skillValidationErrors.flatPower }}
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>命中修正</label>
              <input v-model.number="newSkill.hitModifier" type="number" step="0.01" />
            </div>

            <div class="form-group">
              <label>暴击加成</label>
              <input v-model.number="newSkill.critBonus" type="number" step="0.01" />
            </div>
          </div>

          <div class="form-group">
            <label>动画键</label>
            <input v-model="newSkill.animationKey" type="text" placeholder="例如: fireball_cast" />
          </div>

          <div class="form-group">
            <label>标签 (用逗号分隔)</label>
            <input v-model="newSkill.tags" type="text" placeholder="例如: fire, magical, ranged" />
          </div>

          <div class="form-actions">
            <button @click="createAndAddSkill" class="create-btn">创建并添加</button>
            <button @click="showSkillCreator = false" class="cancel-btn">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 战斗结果弹窗 -->
    <BattleResultDialog v-if="showBattleResult && battleResult" :result="battleResult" @close="closeBattleResult" />

    <!-- 调试面板 -->
    <BattleDebugPanel
      v-if="isDebugMode"
      :battle-state="battleState"
      :active-player="activePlayer"
      :active-enemy="activeEnemy"
    />
  </div>
</template>

<style scoped>
@import '../index.css';

.battle-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 战斗界面动画 */
.battle-root {
  animation: battleEnter 0.5s ease-out;
}

@keyframes battleEnter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 技能选择弹窗样式 */
.skill-selection-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.skill-selection-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  min-width: 300px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.skill-selection-panel h3 {
  margin: 0 0 16px 0;
  text-align: center;
  color: #333;
  font-size: 18px;
}

.skill-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.skill-button {
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.skill-button:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.cancel-button {
  width: 100%;
  padding: 10px;
  border: 1px solid #dc2626;
  border-radius: 8px;
  background: #dc2626;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.add-skill-button {
  padding: 12px 16px;
  background: #38a169;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease;
  margin-bottom: 8px;
}

.add-skill-button:hover {
  background: #2f855a;
}

/* 技能创建器弹窗样式 */
.skill-creator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.skill-creator-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  min-width: 500px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.skill-creator-panel h3 {
  margin: 0 0 20px 0;
  text-align: center;
  color: #333;
  font-size: 18px;
}

.skill-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3182ce;
  box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.2);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.error-message {
  font-size: 12px;
  color: #e53e3e;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.create-btn,
.cancel-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.create-btn {
  background: #38a169;
  color: white;
}

.create-btn:hover {
  background: #2f855a;
}

.cancel-btn {
  background: #f56565;
  color: white;
}

.cancel-btn:hover {
  background: #e53e3e;
}
</style>
