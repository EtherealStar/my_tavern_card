<template>
  <div id="vue-root-container">
    <StartViewVue v-if="currentPhase === INITIAL" />
    <CreationRoot v-else-if="currentPhase === CREATION" />
    <PlayingRoot v-else-if="currentPhase === PLAYING" />
    <BattleRoot v-else-if="currentPhase === BATTLE" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useGameStateManager } from './composables/useGameStateManager';
import { GamePhase } from './models/GameState';
import BattleRoot from './vue/BattleRoot.vue';
import CreationRoot from './vue/CreationRoot.vue';
import PlayingRoot from './vue/PlayingRoot.vue';
import StartViewVue from './vue/StartView.vue';

// 使用组合式函数作为主要状态源
const gameState = useGameStateManager();

// 计算属性
const currentPhase = computed(() => gameState.currentPhase.value);

// 直接导出枚举给模板使用
const { INITIAL, CREATION, PLAYING, BATTLE } = GamePhase;

onMounted(async () => {
  try {
    // 应用启动
  } catch (error) {
    console.warn('[App] 应用初始化失败:', error);
  }
});
</script>
