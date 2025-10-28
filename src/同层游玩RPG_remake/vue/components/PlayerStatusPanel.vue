<template>
  <div class="player-status-panel">
    <div class="player-name">{{ playerName }}</div>
    <div class="status-container">
      <div class="status-bars">
        <BattleHealthBar
          v-for="bar in statusBars"
          :key="bar.type"
          :label="bar.label"
          :current="bar.current"
          :max="bar.max"
          :type="bar.type"
          :color="bar.color"
        />
      </div>
      <div class="vertical-bars">
        <BattleVerticalHealthBar v-if="hhpBar" :max="hhpBar.max" :type="hhpBar.type" :color="hhpBar.color" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BattleHealthBar from './BattleHealthBar.vue';
import BattleVerticalHealthBar from './BattleVerticalHealthBar.vue';

interface PlayerData {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  endurance?: number;
  maxEndurance?: number;
  stats?: {
    hhp?: number;
  };
}

interface Props {
  playerData?: PlayerData;
}

const props = withDefaults(defineProps<Props>(), {
  playerData: undefined,
});

const playerName = computed(() => props.playerData?.name || '玩家');

const statusBars = computed(() => {
  if (!props.playerData) return [];

  const bars = [
    {
      type: 'hp',
      label: 'HP',
      current: props.playerData.hp ?? 0,
      max: props.playerData.maxHp ?? 1,
      color: undefined,
    },
  ];

  // 添加MP条（如果存在）
  if (props.playerData.mp !== undefined && props.playerData.maxMp !== undefined) {
    bars.push({
      type: 'mp',
      label: 'MP',
      current: props.playerData.mp ?? 0,
      max: props.playerData.maxMp ?? 1,
      color: undefined,
    });
  }

  // 添加Endurance条（如果存在）
  if (props.playerData.endurance !== undefined && props.playerData.maxEndurance !== undefined) {
    bars.push({
      type: 'endurance',
      label: '耐力',
      current: props.playerData.endurance ?? 0,
      max: props.playerData.maxEndurance ?? 1,
      color: undefined,
    });
  }

  return bars;
});

// H血量条数据
const hhpBar = computed(() => {
  if (!props.playerData?.stats?.hhp) return null;

  return {
    type: 'hhp',
    label: 'H血量',
    current: props.playerData.stats.hhp,
    max: props.playerData.stats.hhp, // H血量通常等于最大值
    color: undefined,
  };
});
</script>

<style scoped>
.player-status-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 16px;
  min-width: 200px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: auto;
  z-index: 100;
}

.player-name {
  font-size: 16px;
  font-weight: bold;
  color: #f4e4bc;
  margin-bottom: 12px;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.status-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.status-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vertical-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .player-status-panel {
    bottom: 10px;
    right: 10px;
    min-width: 160px;
    padding: 12px;
  }

  .player-name {
    font-size: 14px;
  }

  .status-container {
    gap: 8px;
  }
}

/* 动画效果 */
.player-status-panel {
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
