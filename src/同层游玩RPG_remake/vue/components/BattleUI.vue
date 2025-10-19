<template>
  <div class="battle-ui">
    <!-- 玩家状态面板 (右下角) -->
    <PlayerStatusPanel 
      v-if="activePlayer"
      :player-data="activePlayer"
      class="player-status-panel"
    />
    
    <!-- 敌人状态面板 (敌人上方) -->
    <EnemyStatusPanel 
      v-for="enemy in activeEnemies"
      :key="enemy.id"
      :enemy-data="enemy"
      :position="enemy.enemyPortrait?.position"
      class="enemy-status-panel"
      ref="enemyStatusRefs"
    />
    
    <!-- 行动轮盘 (左下角) -->
    <ActionWheel 
      :actions="battleActions"
      :selected-action="selectedAction"
      @action-select="onActionSelect"
      class="action-wheel"
    />
    
    <!-- 战斗信息 (顶部) -->
    <BattleInfo 
      v-if="battleInfo"
      :battle-info="battleInfo"
      class="battle-info"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ActionWheel from './ActionWheel.vue';
import BattleInfo from './BattleInfo.vue';
import EnemyStatusPanel from './EnemyStatusPanel.vue';
import PlayerStatusPanel from './PlayerStatusPanel.vue';

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
    position: {
      x: number;
      y: number;
    };
  };
}

interface Action {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

interface BattleInfo {
  title?: string;
  subtitle?: string;
}

interface Props {
  activePlayer?: PlayerData;
  activeEnemies?: EnemyData[];
  battleActions?: Action[];
  selectedAction?: string;
  battleInfo?: BattleInfo;
}

const props = withDefaults(defineProps<Props>(), {
  activePlayer: undefined,
  activeEnemies: () => [],
  battleActions: () => [],
  selectedAction: undefined,
  battleInfo: undefined,
});

const emit = defineEmits<{
  (e: 'action-select', actionId: string): void;
}>();

const enemyStatusRefs = ref<InstanceType<typeof EnemyStatusPanel>[]>([]);

const onActionSelect = (actionId: string) => {
  emit('action-select', actionId);
};

// 暴露方法供外部调用
defineExpose({
  showEnemyDamage: (enemyId: string, damage: number, isCritical: boolean = false) => {
    const enemyRef = enemyStatusRefs.value.find(ref => ref.enemyData?.id === enemyId);
    if (enemyRef) {
      if (isCritical) {
        enemyRef.showCriticalDamage(damage);
      } else {
        enemyRef.showDamageNumber(damage);
      }
    }
  }
});
</script>

<style scoped>
.battle-ui {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 允许点击穿透到Phaser层 */
  z-index: 10;
}

.player-status-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  pointer-events: auto;
}

.enemy-status-panel {
  position: absolute;
  pointer-events: auto;
}

.action-wheel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  pointer-events: auto;
}

.battle-info {
  position: fixed;
  top: 20px;
  right: 20px;
  pointer-events: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .player-status-panel {
    bottom: 10px;
    right: 10px;
  }
  
  .action-wheel {
    bottom: 10px;
    left: 10px;
  }
  
  .battle-info {
    top: 10px;
    right: 10px;
  }
}

/* 整体动画效果 */
.battle-ui {
  animation: battleUIFadeIn 0.5s ease-out;
}

@keyframes battleUIFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 确保UI元素在Phaser层之上 */
.battle-ui > * {
  position: relative;
  z-index: 100;
}
</style>

