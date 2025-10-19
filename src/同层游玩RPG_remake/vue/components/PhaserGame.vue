<template>
  <div ref="root" class="phaser-game-container"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { usePhaserBattle } from '../../composables/usePhaserBattle';

const root = ref<HTMLElement | null>(null);
const { initialize, destroy } = usePhaserBattle();

onMounted(async () => {
  if (root.value) {
    try {
      console.log('[PhaserGame] Starting Phaser game initialization...');
      await initialize(root.value);
      console.log('[PhaserGame] Phaser game initialized successfully');

      // 等待一帧确保 Phaser 完全初始化
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('[PhaserGame] Phaser game ready, waiting for battle configuration events...');
      // 不再直接启动战斗场景，完全依赖事件系统
      // 战斗场景将在收到 battle:start 或 game:enter-battle 事件时启动
    } catch (error) {
      console.error('[PhaserGame] Failed to initialize Phaser game:', error);
    }
  }
});

onUnmounted(async () => {
  await destroy();
});
</script>

<style scoped>
.phaser-game-container {
  width: 100%;
  height: 100%;
  background: #0b1020;
  border-radius: 12px;
  overflow: hidden;
  /* 移除固定宽高比限制，让容器自适应填充父容器 */
  min-height: 0;
  flex: 1;
}
</style>
