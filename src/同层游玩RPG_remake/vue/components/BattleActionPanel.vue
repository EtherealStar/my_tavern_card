<template>
  <div class="action-panel">
    <div class="action-title">行动</div>
    <div class="action-buttons">
      <button
        v-for="action in props.actions"
        :key="action.id"
        class="action-button"
        :class="{
          'action-button--selected': selectedAction === action.id,
          'action-button--disabled': action.disabled,
        }"
        @click="selectAction(action.id)"
        :disabled="action.disabled"
      >
        <div class="action-icon" v-if="action.icon">{{ action.icon }}</div>
        <div class="action-label">{{ action.label }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Action {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

interface Props {
  actions: Action[];
  defaultSelected?: string;
}

const props = withDefaults(defineProps<Props>(), {
  defaultSelected: undefined,
});

const emit = defineEmits<{
  (e: 'action-selected', actionId: string): void;
  (e: 'action-confirmed', actionId: string): void;
}>();

const selectedAction = ref<string | null>(props.defaultSelected || null);

const selectAction = (actionId: string) => {
  const action = props.actions.find(a => a.id === actionId);
  if (action && !action.disabled) {
    selectedAction.value = actionId;
    emit('action-selected', actionId);
    // 点击按钮时直接确认行动
    emit('action-confirmed', actionId);
  }
};

// 监听键盘事件
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && selectedAction.value) {
    emit('action-confirmed', selectedAction.value);
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    const currentIndex = props.actions.findIndex(a => a.id === selectedAction.value);
    let newIndex = currentIndex;

    if (event.key === 'ArrowUp') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : props.actions.length - 1;
    } else {
      newIndex = currentIndex < props.actions.length - 1 ? currentIndex + 1 : 0;
    }

    const newAction = props.actions[newIndex];
    if (newAction && !newAction.disabled) {
      selectedAction.value = newAction.id;
      emit('action-selected', newAction.id);
    }
  }
};

// 组件挂载时添加键盘监听
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  document.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress);
});

// 监听actions变化，自动选择第一个可用行动
watch(
  () => props.actions,
  newActions => {
    if (newActions.length > 0 && !selectedAction.value) {
      const firstAvailable = newActions.find(a => !a.disabled);
      if (firstAvailable) {
        selectedAction.value = firstAvailable.id;
      }
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.action-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 120px;
  position: relative;
  z-index: 10; /* 确保行动面板在正确层级 */
}

.action-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 4px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--button-bg);
  color: var(--button-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  min-height: 36px;
}

.action-button:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
}

.action-button--selected {
  background: #22c55e;
  color: white;
  border-color: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
}

.action-button--selected:hover {
  background: #16a34a;
  transform: translateY(-1px);
}

.action-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f3f4f6;
  color: #9ca3af;
}

.action-button--disabled:hover {
  transform: none;
  box-shadow: none;
}

.action-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.action-label {
  flex: 1;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .action-panel {
    min-width: 100px;
  }

  .action-button {
    padding: 6px 10px;
    font-size: 12px;
    min-height: 32px;
  }

  .action-icon {
    font-size: 14px;
    width: 18px;
  }
}
</style>
