<template>
  <div class="battle-layout" :class="layoutClass">
    <!-- 全屏背景渲染区域 -->
    <div class="battle-background-container">
      <BattleCenterArea
        :show-effects="props.showEffects"
        :skill-effects="props.skillEffects"
        :battle-messages="props.battleMessages"
      />

      <!-- 敌人状态覆盖在背景上方（按坐标定位） -->
      <EnemyStatusPanel
        v-for="enemy in props.activeEnemies"
        :key="enemy.id"
        :enemy-data="enemy"
        :position="enemy.enemyPortrait?.position"
        class="enemy-status-overlay"
        ref="enemyStatusRefs"
      />
    </div>

    <!-- 顶部HUD覆盖层 -->
    <div class="battle-top-hud-overlay">
      <BattleTopHUD :battle-info="props.battleInfo" :battle-log="props.battleLog" />
    </div>

    <!-- 左下角行动面板（点击即确认） -->
    <ActionWheel :actions="props.actions" :selected-action="props.selectedAction" @action-select="handleActionSelect" />

    <!-- 右下角玩家状态（可选） -->
    <PlayerStatusPanel v-if="props.activePlayer" :player-data="props.activePlayer" class="player-status-overlay" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import ActionWheel from './ActionWheel.vue';
import BattleCenterArea from './BattleCenterArea.vue';
import BattleTopHUD from './BattleTopHUD.vue';
import EnemyStatusPanel from './EnemyStatusPanel.vue';
import PlayerStatusPanel from './PlayerStatusPanel.vue';
interface Action {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

// 移除了EnemyData和PlayerData接口，因为血条现在由Phaser显示

interface BattleInfo {
  title?: string;
  subtitle?: string;
}

// DamageNumber interface removed - no longer using damage popup effects

interface SkillEffect {
  text: string;
  type: 'fire' | 'ice' | 'lightning' | 'heal' | 'buff' | 'debuff';
  style: {
    left: string;
    top: string;
    animationDelay: string;
  };
}

interface BattleMessage {
  text: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

interface BattleLog {
  text: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

interface PlayerData {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  endurance?: number;
  maxEndurance?: number;
}

interface EnemyData {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  enemyPortrait?: {
    position?: { x: number; y: number };
  };
}

interface Props {
  actions: Action[];
  selectedAction?: string;
  battleInfo?: BattleInfo;
  showControls?: boolean;
  showEffects?: boolean;
  skillEffects?: SkillEffect[];
  battleMessages?: BattleMessage[];
  battleLog?: BattleLog[];
  activePlayer?: PlayerData;
  activeEnemies?: EnemyData[];
  layoutMode?: 'landscape' | 'portrait' | 'auto';
}

const props = withDefaults(defineProps<Props>(), {
  selectedAction: undefined,
  battleInfo: undefined,
  showControls: true,
  showEffects: true,
  skillEffects: () => [],
  battleMessages: () => [],
  battleLog: () => [],
  activePlayer: undefined,
  activeEnemies: () => [],
  layoutMode: 'auto',
});

const emit = defineEmits<{
  (e: 'action-selected', actionId: string): void;
  (e: 'action-confirmed', actionId: string): void;
  (e: 'exit-battle'): void;
}>();

// 响应式布局检测
const screenMode = ref<'landscape' | 'portrait'>('landscape');

const updateScreenMode = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  screenMode.value = width > height ? 'landscape' : 'portrait';
};

const layoutClass = computed(() => {
  if (props.layoutMode === 'auto') {
    return `battle-layout--${screenMode.value}`;
  }
  return `battle-layout--${props.layoutMode}`;
});

const onActionSelected = (actionId: string) => {
  emit('action-selected', actionId);
};

const onActionConfirmed = (actionId: string) => {
  emit('action-confirmed', actionId);
};

// 点击即确认的中介：忽略禁用项，派发选中与确认
const handleActionSelect = (actionId: string) => {
  const action = props.actions.find(a => a.id === actionId);
  if (action && action.disabled) {
    return;
  }
  emit('action-selected', actionId);
  emit('action-confirmed', actionId);
};

const onExitBattle = () => {
  emit('exit-battle');
};

onMounted(() => {
  updateScreenMode();
  window.addEventListener('resize', updateScreenMode);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenMode);
});

// 暴露方法：展示敌人伤害数字
const enemyStatusRefs = ref<InstanceType<typeof EnemyStatusPanel>[]>([]);
defineExpose({
  showEnemyDamage: (enemyId: string, damage: number, isCritical: boolean = false) => {
    const enemyRef = enemyStatusRefs.value.find(ref => ref?.enemyData?.id === enemyId);
    if (enemyRef) {
      if (isCritical) {
        enemyRef.showCriticalDamage(damage);
      } else {
        enemyRef.showDamageNumber(damage);
      }
    }
  },
});
</script>

<style scoped>
.battle-layout {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  z-index: 1; /* 基础层级 */
}

/* 全屏背景容器 */
.battle-background-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 1; /* 背景层 - 最底层 */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 顶部HUD覆盖层 */
.battle-top-hud-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10; /* HUD 层级 - 在背景之上 */
  pointer-events: auto;
}

/* 敌人状态覆盖层（挂在背景容器内部，使用绝对定位） */
.enemy-status-overlay {
  position: absolute;
}

/* 玩家状态固定在右下角 */
.player-status-overlay {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

/* 宽屏模式布局 */
.battle-layout--landscape {
  /* 默认布局，适合宽屏 */
}

.battle-layout--landscape .battle-top-hud-overlay {
  height: 120px;
}

.battle-layout--landscape .battle-bottom-hud-overlay {
  height: 140px;
}

/* 竖屏模式布局 */
.battle-layout--portrait {
  /* 竖屏优化布局 */
}

.battle-layout--portrait .battle-top-hud-overlay {
  height: 100px;
}

.battle-layout--portrait .battle-bottom-hud-overlay {
  height: 160px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .battle-layout--landscape .battle-top-hud-overlay {
    height: 80px;
    z-index: 10; /* 确保移动端 HUD 层级正确 */
  }

  /* 行动面板和玩家状态在移动端靠近边缘 */
  .player-status-overlay {
    bottom: 10px;
    right: 10px;
  }

  .battle-layout--portrait .battle-top-hud-overlay {
    height: 70px;
    z-index: 10; /* 确保移动端 HUD 层级正确 */
  }

  .player-status-overlay {
    bottom: 10px;
    right: 10px;
  }
}

/* 战斗界面进入动画 */
.battle-layout {
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
</style>
