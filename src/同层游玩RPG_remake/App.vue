<!-- eslint-disable -->
<!-- @ts-nocheck -->
<template>
  <div id="vue-root-container">
    <StartViewVue v-if="currentPhase === GamePhase.INITIAL" />
    <CreationRoot v-else-if="currentPhase === GamePhase.CREATION" />
    <PlayingRoot v-else-if="currentPhase === GamePhase.PLAYING" />
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import { useGameStateManager } from './composables/useGameStateManager';
import { GamePhase } from './models/GameState';
import CreationRoot from './vue/CreationRoot.vue';
import PlayingRoot from './vue/PlayingRoot.vue';
import StartViewVue from './vue/StartView.vue';

// 使用统一的状态管理器
const gameStateManager = useGameStateManager();

// 直接使用状态管理器提供的响应式状态
const currentPhase = gameStateManager.currentPhase;

// 将 GamePhase 暴露给模板
const GamePhaseEnum = GamePhase;

// 暴露给模板使用
defineExpose({
  GamePhase: GamePhaseEnum,
  currentPhase,
});

onMounted(async () => {
  try {
    // 将状态管理器暴露到全局，供其他组合式函数使用
    (window as any).__RPG_GAME_STATE_MANAGER__ = gameStateManager;
  } catch (error) {
    console.warn('[App] 初始化状态管理器失败:', error);
  }
});
</script>

<style scoped>
#vue-root-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
