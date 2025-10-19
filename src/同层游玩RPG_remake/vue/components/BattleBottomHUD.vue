<template>
  <div class="battle-bottom-hud">
    <div class="bottom-hud-left">
      <BattleActionPanel
        :actions="props.actions"
        :default-selected="props.defaultSelectedAction"
        @action-selected="onActionSelected"
        @action-confirmed="onActionConfirmed"
      />
    </div>
    <div class="bottom-hud-center">
      <!-- 玩家血条现在由Phaser显示，这里不再显示 -->
    </div>
    <div class="bottom-hud-right">
      <div class="battle-controls" v-if="props.showControls">
        <button class="control-button" @click="onExitBattle">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          退出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BattleActionPanel from './BattleActionPanel.vue';

interface Action {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

interface Props {
  actions: Action[];
  defaultSelectedAction?: string;
  showControls?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultSelectedAction: undefined,
  showControls: true,
});

const emit = defineEmits<{
  (e: 'action-selected', actionId: string): void;
  (e: 'action-confirmed', actionId: string): void;
  (e: 'exit-battle'): void;
}>();

const onActionSelected = (actionId: string) => {
  emit('action-selected', actionId);
};

const onActionConfirmed = (actionId: string) => {
  emit('action-confirmed', actionId);
};

const onExitBattle = () => {
  emit('exit-battle');
};
</script>

<style scoped>
.battle-bottom-hud {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  padding: 16px;
  pointer-events: none;
  z-index: 10; /* HUD 层级 - 确保在背景和特效之上 */
  position: relative;
}

.battle-bottom-hud > * {
  pointer-events: auto;
}

.bottom-hud-left {
  flex: 0 0 auto;
  min-width: 140px;
}

.bottom-hud-center {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 300px;
}

.bottom-hud-right {
  flex: 0 0 auto;
  min-width: 100px;
  display: flex;
  justify-content: flex-end;
}

.battle-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--button-text);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.control-button:hover {
  background: var(--color-primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
}

.control-button svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .battle-bottom-hud {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px;
    z-index: 10; /* 确保移动端 HUD 层级正确 */
  }

  .bottom-hud-left,
  .bottom-hud-center,
  .bottom-hud-right {
    flex: none;
    min-width: auto;
    max-width: none;
  }

  .bottom-hud-center {
    order: 1;
  }

  .bottom-hud-left {
    order: 2;
  }

  .bottom-hud-right {
    order: 3;
    justify-content: center;
  }

  .battle-controls {
    flex-direction: row;
    justify-content: center;
  }
}
</style>
