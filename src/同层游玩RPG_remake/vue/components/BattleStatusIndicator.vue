<template>
  <div class="status-indicator" :class="indicatorClass">
    <div class="status-label">{{ label }}</div>
    <div class="status-value">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  value: string | number;
  type?: 'default' | 'percentage' | 'arousal' | 'custom';
  size?: 'small' | 'medium' | 'large';
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  size: 'medium',
});

const indicatorClass = computed(() => {
  return [`status-${props.type}`, `status-${props.size}`];
});
</script>

<style scoped>
.status-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 8px 12px;
  min-width: 60px;
  backdrop-filter: blur(4px);
}

.status-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  margin-bottom: 2px;
  font-weight: 500;
}

.status-value {
  font-size: 14px;
  color: white;
  text-align: center;
  font-weight: 700;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* 尺寸变体 */
.status-indicator.status-small {
  padding: 4px 8px;
  min-width: 50px;
}

.status-indicator.status-small .status-label {
  font-size: 9px;
}

.status-indicator.status-small .status-value {
  font-size: 12px;
}

.status-indicator.status-large {
  padding: 12px 16px;
  min-width: 80px;
}

.status-indicator.status-large .status-label {
  font-size: 12px;
}

.status-indicator.status-large .status-value {
  font-size: 16px;
}

/* 类型变体 */
.status-indicator.status-percentage {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.4);
}

.status-indicator.status-percentage .status-value {
  color: #22c55e;
}

.status-indicator.status-arousal {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.status-indicator.status-arousal .status-value {
  color: #ef4444;
}

.status-indicator.status-custom {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.4);
}

.status-indicator.status-custom .status-value {
  color: #8b5cf6;
}
</style>
