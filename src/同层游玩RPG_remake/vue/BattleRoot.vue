<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import { useBattleSystem } from '同层游玩RPG_remake/composables/useBattleSystem';
import { useBattleConfig } from '../composables/useBattleConfig';
import { useGameServices } from '../composables/useGameServices';
import { useGameStateManager } from '../composables/useGameStateManager';
import type { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import BattleLayout from './components/BattleLayout.vue';
import BattleResultDialog from './components/BattleResultDialog.vue';
const gameState = useGameStateManager();
const battleConfigManager = useBattleConfig();

// 使用游戏服务
const { showSuccess, showError, showWarning } = useGameServices();

// ✅ 在 setup 阶段初始化战斗系统（inject 只能在这里使用）
const battleSystem = useBattleSystem();
const battleState = (battleSystem as any).battleState; // 从 battleSystem 中获取 battleState
const eventBus = inject<EventBus>(TYPES.EventBus);

// 战斗结果相关状态
const showBattleResult = ref(false);
const battleResult = ref<{ winner: 'player' | 'enemy'; summary?: string } | null>(null);

const INITIAL_BATTLE_ID = 'yokai_battle';
const hasRequestedInitialBattle = ref(false);

// 技能选择相关状态
const showSkillSelection = ref(false);

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
  const alive = list.filter(p => p?.side === 'player' && (p?.hp ?? 0) > 0);
  if (alive.length > 0) {
    return alive[0];
  }

  // 如果没找到存活的，查找任何玩家（包括HP为0或未初始化的）
  const anyPlayer = list.find(p => p?.side === 'player');
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
  const alive = list.filter(p => p?.side === 'enemy' && (p?.hp ?? 0) > 0);
  if (alive.length > 0) {
    return alive[0];
  }

  // 如果没找到存活的，查找任何敌人（包括HP为0或未初始化的）
  const anyEnemy = list.find(p => p?.side === 'enemy');
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
      participants: participants.value.map(p => ({ id: p?.id, name: p?.name, side: p?.side })),
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

function onActionSelected(actionId: string) {
  console.log('[BattleRoot] 行动选择:', actionId);
  selectedAction.value = actionId;
}

async function onActionConfirmed(actionId: string) {
  console.log('[BattleRoot] onActionConfirmed called with actionId:', actionId);

  try {
    const player = activePlayer.value;
    const enemy = activeEnemy.value;

    console.log('[BattleRoot] onActionConfirmed - current state:', {
      hasPlayer: !!player,
      hasEnemy: !!enemy,
      player: player ? { id: player.id, name: player.name, side: player.side, hp: player.hp } : null,
      enemy: enemy ? { id: enemy.id, name: enemy.name, side: enemy.side, hp: enemy.hp } : null,
      participantsCount: participants.value.length,
      participants: participants.value.map(p => ({ id: p?.id, name: p?.name, side: p?.side, hp: p?.hp })),
    });

    if (!player || !enemy) {
      console.warn('[BattleRoot] Missing battle targets:', { player, enemy, participants: participants.value });
      showWarning('无法找到有效的战斗目标');
      return;
    }

    // 检查战斗是否已完全初始化
    if (player.hp === undefined || enemy.hp === undefined) {
      console.warn('[BattleRoot] Battle not fully initialized yet:', { playerHp: player.hp, enemyHp: enemy.hp });
      showWarning('战斗尚未完全初始化，请稍候...');
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
    showError('执行行动失败');
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
      showWarning('无法找到有效的战斗目标');
      return;
    }

    // 检查战斗是否已完全初始化
    if (player.hp === undefined || enemy.hp === undefined) {
      console.warn('[BattleRoot] Battle not fully initialized for skill:', { playerHp: player.hp, enemyHp: enemy.hp });
      showWarning('战斗尚未完全初始化，请稍候...');
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
    showError('施放技能失败');
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
    showSuccess('已退出战斗');
  } catch (error) {
    console.error('[BattleRoot] 退出战斗失败:', error);
    showError('退出战斗失败');
  }
}

function closeBattleResult() {
  showBattleResult.value = false;
  battleResult.value = null;
  // 关闭结果对话框时退出战斗
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
  console.log('[BattleRoot] Setting up battle event listeners');

  if (!eventBus) {
    console.warn('[BattleRoot] EventBus not available for battle event listeners');
    return;
  }

  teardownBattleEventListeners();

  battleEventUnsubscribers.push(
    eventBus.on('battle:damage', (data: any) => {
      console.log('[BattleRoot] Damage event:', data);
      console.log('[BattleRoot] ActorId:', data?.actorId, 'TargetId:', data?.targetId);
      setTimeout(() => {
        const attacker = battleState.getParticipant(data?.actorId);
        const target = battleState.getParticipant(data?.targetId);
        console.log('[BattleRoot] Attacker found:', attacker);
        console.log('[BattleRoot] Target found:', target);
        console.log('[BattleRoot] All participants:', battleState.battleState.value?.participants);
        let attackerName = attacker?.name || '未知';
        let targetName = target?.name || '未知';
        if (attackerName === '未知' && data?.actorId) {
          const allParticipants = battleState.battleState.value?.participants || [];
          const foundAttacker = allParticipants.find((p: any) => p.id === data.actorId);
          if (foundAttacker) {
            attackerName = foundAttacker.name;
            console.log('[BattleRoot] Found attacker via fallback:', foundAttacker);
          }
        }
        if (targetName === '未知' && data?.targetId) {
          const allParticipants = battleState.battleState.value?.participants || [];
          const foundTarget = allParticipants.find((p: any) => p.id === data.targetId);
          if (foundTarget) {
            targetName = foundTarget.name;
            console.log('[BattleRoot] Found target via fallback:', foundTarget);
          }
        }
        if (typeof data?.damage === 'number') {
          addBattleLog(`${attackerName} 对 ${targetName} 造成了 ${data.damage} 点伤害！`, 'info');
          if (battleLayoutRef.value && data.targetId) {
            battleLayoutRef.value.showEnemyDamage(data.targetId, data.damage, false);
          }
        }
      }, 0);
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:miss', (data: any) => {
      console.log('[BattleRoot] Miss event:', data);
      console.log('[BattleRoot] Miss ActorId:', data?.actorId);
      setTimeout(() => {
        const attacker = battleState.getParticipant(data?.actorId);
        console.log('[BattleRoot] Miss Attacker found:', attacker);
        let attackerName = attacker?.name || '未知';
        if (attackerName === '未知' && data?.actorId) {
          const allParticipants = battleState.battleState.value?.participants || [];
          const foundAttacker = allParticipants.find((p: any) => p.id === data.actorId);
          if (foundAttacker) {
            attackerName = foundAttacker.name;
            console.log('[BattleRoot] Found miss attacker via fallback:', foundAttacker);
          }
        }
        addBattleLog(`${attackerName} 的攻击未命中！`, 'warning');
      }, 0);
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:critical', (data: any) => {
      console.log('[BattleRoot] Critical event:', data);
      console.log('[BattleRoot] Critical ActorId:', data?.actorId, 'TargetId:', data?.targetId);
      setTimeout(() => {
        const attacker = battleState.getParticipant(data?.actorId);
        const target = battleState.getParticipant(data?.targetId);
        console.log('[BattleRoot] Critical Attacker found:', attacker);
        console.log('[BattleRoot] Critical Target found:', target);
        let attackerName = attacker?.name || '未知';
        let targetName = target?.name || '未知';
        if (attackerName === '未知' && data?.actorId) {
          const allParticipants = battleState.battleState.value?.participants || [];
          const foundAttacker = allParticipants.find((p: any) => p.id === data.actorId);
          if (foundAttacker) {
            attackerName = foundAttacker.name;
            console.log('[BattleRoot] Found critical attacker via fallback:', foundAttacker);
          }
        }
        if (targetName === '未知' && data?.targetId) {
          const allParticipants = battleState.battleState.value?.participants || [];
          const foundTarget = allParticipants.find((p: any) => p.id === data.targetId);
          if (foundTarget) {
            targetName = foundTarget.name;
            console.log('[BattleRoot] Found critical target via fallback:', foundTarget);
          }
        }
        if (typeof data?.damage === 'number') {
          addBattleLog(`暴击！${attackerName} 对 ${targetName} 造成了 ${data.damage} 点伤害！`, 'success');
          if (battleLayoutRef.value && data.targetId) {
            battleLayoutRef.value.showEnemyDamage(data.targetId, data.damage, true);
          }
        }
      }, 0);
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:state-updated', (payload: any) => {
      console.log('[BattleRoot] Battle state updated:', payload);

      // 只处理来自 BattleService 的事件（直接状态对象），忽略来自 useBattleState 的事件（包含 updates 和 battleState 的对象）
      if (payload?.updates !== undefined || payload?.battleState !== undefined) {
        console.log('[BattleRoot] Ignoring battle:state-updated event from useBattleState to prevent circular updates');
        return;
      }

      // 处理来自 BattleService 的状态更新事件
      const resolvedState = payload;
      if (!resolvedState || !Array.isArray(resolvedState.participants)) {
        console.warn('[BattleRoot] Invalid state data from BattleService:', resolvedState);
        return;
      }

      if (isSyncingBattleStateFromEvent) {
        console.log('[BattleRoot] Already syncing battle state, skipping to prevent circular updates');
        return;
      }

      isSyncingBattleStateFromEvent = true;
      try {
        console.log('[BattleRoot] Syncing battle state from BattleService event');
        battleState.updateBattleState(resolvedState);
      } catch (error) {
        console.error('[BattleRoot] Failed to sync battle state from event:', error);
      } finally {
        isSyncingBattleStateFromEvent = false;
      }
    }),
  );

  battleEventUnsubscribers.push(
    eventBus.on('battle:result', (result: any) => {
      console.log('[BattleRoot] Battle result:', result);
      battleResult.value = result;
      showBattleResult.value = true;
    }),
  );

  console.log('[BattleRoot] Battle event listeners set up successfully');
};

onMounted(async () => {
  console.log('[BattleRoot] Component mounted');
  try {
    setupBattleEventListeners();
    if (gameState.isInBattle.value && gameState.hasBattleConfig.value) {
      initializeBattleFromStore();
    } else if (!gameState.isInBattle.value && !hasRequestedInitialBattle.value) {
      hasRequestedInitialBattle.value = true;
      const started = await battleConfigManager.startBattle(INITIAL_BATTLE_ID, undefined, { silent: true });
      if (!started) {
        showError('自动启动战斗失败', '请手动选择战斗配置');
      }
    }
  } catch (error) {
    console.error('[BattleRoot] Failed to initialize battle system:', error);
    showError('战斗系统初始化失败');
  }
});

onUnmounted(() => {
  console.log('[BattleRoot] Component unmounted');
  teardownBattleEventListeners();
});

async function initializeBattleFromStore() {
  const battleConfigItem = gameState.getBattleConfig();
  if (!battleConfigItem) {
    console.warn('[BattleRoot] No battle config in Composable');
    return;
  }
  if (battleState.isInitialized.value) {
    console.log('[BattleRoot] Battle already initialized, skip re-initialization');
    return;
  }
  try {
    console.log('[BattleRoot] Initializing battle system...');

    // 从 BattleConfigItem 中提取实际的 BattleConfig
    const battleConfig = battleConfigItem.config || battleConfigItem;

    if (!battleConfig.participants || battleConfig.participants.length === 0) {
      console.error('[BattleRoot] Battle config missing participants:', battleConfig);
      return;
    }

    console.log('[BattleRoot] Starting battle with config:', {
      participantsCount: battleConfig.participants.length,
      participants: battleConfig.participants.map((p: any) => ({ id: p.id, side: p.side, name: p.name })),
    });

    await battleSystem.startBattle(battleConfig);
    console.log('[BattleRoot] Battle initialized successfully');
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
          <button class="cancel-button" @click="showSkillSelection = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 战斗结果弹窗 -->
    <BattleResultDialog v-if="showBattleResult && battleResult" :result="battleResult" @close="closeBattleResult" />
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
</style>
