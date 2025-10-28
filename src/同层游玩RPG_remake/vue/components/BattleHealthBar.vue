<template>
  <div class="health-bar-container">
    <div class="health-bar-label">{{ label }}</div>
    <div class="health-bar-wrapper">
      <div class="health-bar-fill" :class="barClass" :style="{ width: `${healthPercentage}%` }"></div>
      <div class="health-bar-decoration"></div>
    </div>
    <div class="health-bar-value">{{ current }}/{{ max }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  current: number;
  max: number;
  type?: 'hp' | 'mp' | 'endurance' | 'hhp' | 'custom';
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'hp',
  color: undefined,
});

const healthPercentage = computed(() => {
  if (props.max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((props.current / props.max) * 100)));
});

const barClass = computed(() => {
  if (props.color) return 'custom-color';

  switch (props.type) {
    case 'hp':
      return 'hp-bar';
    case 'mp':
      return 'mp-bar';
    case 'endurance':
      return 'endurance-bar';
    case 'hhp':
      return 'hhp-bar';
    default:
      return 'hp-bar';
  }
});
</script>

<style scoped>
.health-bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.health-bar-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: left;
}

.health-bar-wrapper {
  position: relative;
  height: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.health-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s ease;
  position: relative;
}

.health-bar-fill.hp-bar {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.health-bar-fill.mp-bar {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.health-bar-fill.endurance-bar {
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
}

.health-bar-fill.hhp-bar {
  background: linear-gradient(90deg, #ec4899, #be185d);
}

.health-bar-fill.custom-color {
  background: v-bind('props.color');
}

.health-bar-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
  pointer-events: none;
}

.health-bar-value {
  font-size: 10px;
  color: var(--text-secondary);
  text-align: right;
  font-weight: 500;
}

/* 敌人血条特殊样式 */
.health-bar-container.enemy-style .health-bar-label {
  color: white;
  font-weight: 700;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.health-bar-container.enemy-style .health-bar-wrapper {
  border: 2px solid #fbbf24;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
}

.health-bar-container.enemy-style .health-bar-fill.hp-bar {
  background: linear-gradient(90deg, #dc2626, #b91c1c);
}

.health-bar-container.enemy-style .health-bar-fill.hhp-bar {
  background: linear-gradient(90deg, #be185d, #9d174d);
}

.health-bar-container.enemy-style .health-bar-value {
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}
</style>
