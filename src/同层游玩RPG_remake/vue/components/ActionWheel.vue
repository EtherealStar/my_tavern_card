<template>
  <div class="action-wheel">
    <div class="action-panel">
      <h3 class="panel-title">行动</h3>
      <div class="action-buttons">
        <button
          v-for="action in actions"
          :key="action.id"
          :class="[
            'action-button',
            {
              selected: selectedAction === action.id,
              disabled: action.disabled,
            },
          ]"
          :disabled="action.disabled"
          @click="onActionSelect(action.id)"
        >
          <span class="action-icon">{{ action.icon }}</span>
          <span class="action-label">{{ action.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Action {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

interface Props {
  actions: Action[];
  selectedAction?: string;
}

const props = withDefaults(defineProps<Props>(), {
  actions: () => [],
  selectedAction: undefined,
});

const emit = defineEmits<{
  (e: 'action-select', actionId: string): void;
}>();

const onActionSelect = (actionId: string) => {
  emit('action-select', actionId);
};
</script>

<style scoped>
.action-wheel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  pointer-events: auto;
  z-index: 100;
}

.action-panel {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.8), rgba(160, 82, 45, 0.8));
  border-radius: 12px;
  padding: 16px;
  border: 2px solid rgba(205, 133, 63, 0.5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 200px;
}

.panel-title {
  color: #f4e4bc;
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 12px 0;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #f4e4bc;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  width: 100%;
}

.action-button:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.action-button.selected {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.5);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
  transform: translateY(-1px);
}

.action-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(255, 255, 255, 0.1);
}

.action-button.disabled:hover {
  transform: none;
  box-shadow: none;
}

.action-icon {
  font-size: 18px;
  min-width: 20px;
  text-align: center;
}

.action-label {
  font-size: 14px;
  font-weight: 600;
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .action-wheel {
    bottom: 10px;
    left: 10px;
  }

  .action-panel {
    min-width: 160px;
    padding: 12px;
  }

  .panel-title {
    font-size: 14px;
  }

  .action-button {
    padding: 10px 12px;
    font-size: 13px;
  }

  .action-icon {
    font-size: 16px;
    min-width: 18px;
  }

  .action-label {
    font-size: 13px;
  }
}

/* 动画效果 */
.action-wheel {
  animation: slideInLeft 0.3s ease-out;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.action-button {
  animation: buttonAppear 0.2s ease-out;
}

@keyframes buttonAppear {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 按钮点击效果 */
.action-button:active:not(.disabled) {
  transform: translateY(0) scale(0.98);
}

/* 选中状态的脉冲效果 */
.action-button.selected::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid rgba(34, 197, 94, 0.5);
  border-radius: 10px;
  animation: pulse 2s infinite;
  pointer-events: none;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
