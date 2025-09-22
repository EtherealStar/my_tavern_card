<template>
  <div id="vue-root-container">
    <StartViewVue v-if="currentPhase === INITIAL" />
    <CreationRoot v-else-if="currentPhase === CREATION" />
    <PlayingRoot v-else-if="currentPhase === PLAYING" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, type Ref } from 'vue';
import { useGameStateManager } from './composables/useGameStateManager';
import { GamePhase } from './models/GameState';
import CreationRoot from './vue/CreationRoot.vue';
import PlayingRoot from './vue/PlayingRoot.vue';
import StartViewVue from './vue/StartView.vue';

// 使用统一的状态管理器
const gameStateManager = useGameStateManager();

// 明确指定类型
const currentPhase: Ref<GamePhase> = gameStateManager.currentPhase;

// 直接导出枚举给模板使用
const { INITIAL, CREATION, PLAYING } = GamePhase;

onMounted(async () => {
  try {
    (window as any).__RPG_GAME_STATE_MANAGER__ = gameStateManager;
  } catch (error) {
    console.warn('[App] 初始化状态管理器失败:', error);
  }
});
</script>