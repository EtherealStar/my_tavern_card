<template>
  <div class="vertical-health-bar-container">
    <div class="vertical-health-bar-label">{{ label }}</div>
    <div class="vertical-health-bar-wrapper">
      <div class="vertical-health-bar-fill" :class="barClass" :style="{ height: `${healthPercentage}%` }"></div>
      <div class="vertical-health-bar-decoration"></div>
    </div>
    <div class="vertical-health-bar-value">{{ current }}/{{ max }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  current: number;
  max: number;
  type?: 'hhp' | 'custom';
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'hhp',
  color: undefined,
});

const healthPercentage = computed(() => {
  if (props.max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((props.current / props.max) * 100)));
});

const barClass = computed(() => {
  if (props.color) return 'custom-color';

  switch (props.type) {
    case 'hhp':
      return 'hhp-bar';
    default:
      return 'hhp-bar';
  }
});
</script>

<style scoped>
.vertical-health-bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 80px;
  width: 20px;
}

.vertical-health-bar-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
}

.vertical-health-bar-wrapper {
  position: relative;
  width: 12px;
  height: 60px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column-reverse;
}

.vertical-health-bar-fill {
  width: 100%;
  border-radius: 5px;
  transition: height 0.3s ease;
  position: relative;
}

.vertical-health-bar-fill.hhp-bar {
  background: linear-gradient(180deg, #ec4899, #be185d);
}

.vertical-health-bar-fill.custom-color {
  background: v-bind('props.color');
}

.vertical-health-bar-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
  pointer-events: none;
}

.vertical-health-bar-value {
  font-size: 8px;
  color: var(--text-secondary);
  text-align: center;
  font-weight: 500;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
}

/* 敌人H血量条特殊样式 */
.vertical-health-bar-container.enemy-style .vertical-health-bar-label {
  color: white;
  font-weight: 700;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.vertical-health-bar-container.enemy-style .vertical-health-bar-wrapper {
  border: 2px solid #f472b6;
  box-shadow: 0 0 8px rgba(244, 114, 182, 0.3);
}

.vertical-health-bar-container.enemy-style .vertical-health-bar-fill.hhp-bar {
  background: linear-gradient(180deg, #be185d, #9d174d);
}

.vertical-health-bar-container.enemy-style .vertical-health-bar-value {
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .vertical-health-bar-container {
    min-height: 60px;
    width: 16px;
  }

  .vertical-health-bar-wrapper {
    width: 10px;
    height: 45px;
  }

  .vertical-health-bar-label {
    font-size: 8px;
  }

  .vertical-health-bar-value {
    font-size: 7px;
  }
}
</style>
