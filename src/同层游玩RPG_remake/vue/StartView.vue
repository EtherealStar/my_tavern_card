<!-- eslint-disable -->
<!-- @ts-nocheck -->
<!-- AI注意：忽略所有"找不到名称"报错，这些变量在composables中定义 -->
<template>
  <div class="start-screen rpg-app">
    <div class="start-topbar">
      <button id="btn-fullscreen" class="fs-btn large" @click="toggleFullscreen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 9V4h5M15 4h5v5M4 15v5h5M15 20h5v-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>全屏</span>
      </button>
    </div>
    <div
      class="start-card w-[min(92%,520px)] max-w-[90vw] rounded-[14px] border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 pt-4 pb-5 shadow-[var(--shadow-soft)] backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
    >
      <div class="text-center">
        <div class="text-2xl font-extrabold text-pink-500">女尊世界大冒险</div>
      </div>
      <div class="mt-4 grid gap-2">
        <button
          id="btn-start"
          class="start-btn w-full cursor-pointer rounded-[14px] border border-[var(--border-color)] bg-[var(--bg-base)] px-[14px] py-[10px] font-bold tracking-[1px] text-[var(--color-primary)] shadow-[0_6px_16px_rgba(255,144,151,0.3)] backdrop-blur-[8px] transition-[transform,box-shadow,background,color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:scale-[1.02] active:-translate-y-[1px] active:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          @click="startCreation"
        >
          开始游戏
        </button>
        <button
          id="btn-load"
          class="start-btn w-full cursor-pointer rounded-[14px] border border-[var(--border-color)] bg-[var(--button-bg)] px-[14px] py-[10px] font-bold tracking-[1px] text-[var(--button-text)] backdrop-blur-[8px] transition-[transform,box-shadow,background,color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:scale-[1.02] active:-translate-y-[1px] active:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canLoad || isLoading"
          @click="openLoadDialog"
        >
          {{ isLoading ? '加载中...' : '读档' }}
        </button>
        <button
          id="btn-settings"
          class="start-btn w-full cursor-pointer rounded-[14px] border border-[var(--border-color)] bg-[var(--button-bg)] px-[14px] py-[10px] font-bold tracking-[1px] text-[var(--button-text)] backdrop-blur-[8px] transition-[transform,box-shadow,background,color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:scale-[1.02] active:-translate-y-[1px] active:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          @click="openSettings"
        >
          设置
        </button>
      </div>
    </div>
    <!-- 读档弹窗 -->
    <SaveDialog v-if="showSaveDialog" mode="start" @close="() => (showSaveDialog = false)" @loaded="handleLoaded" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useGameStateManager } from '../composables/useGameStateManager';
import { useSaveLoad } from '../composables/useSaveLoad';
import SaveDialog from './SaveDialog.vue';

const saveLoad = useSaveLoad();
const gameState = useGameStateManager();

// 从Composable获取状态和方法
const { checkSaveAvailability, isLoading, loadGame } = saveLoad;

const showSaveDialog = ref(false);
const canLoad = ref(false);

onMounted(async () => {
  // 立即检查存档可用性，服务已在Vue挂载前初始化完成
  try {
    canLoad.value = await checkSaveAvailability();
  } catch (error) {
    console.warn('[StartView] 存档可用性检查失败，将在降级模式下运行:', error);
    canLoad.value = false;
  }
});

async function startCreation() {
  try {
    // 使用Composable进行状态切换
    const success = await gameState.transitionToCreation();

    if (!success) {
      console.warn('[StartView] 启动创建流程失败');
    }
  } catch (error) {
    console.error('[StartView] Failed to start creation:', error);
  }
}

function openLoadDialog() {
  try {
    if (showSaveDialog.value) {
      // 如果对话框已经打开，先关闭再重新打开，避免重复打开
      showSaveDialog.value = false;
      setTimeout(() => {
        showSaveDialog.value = true;
      }, 50);
    } else {
      showSaveDialog.value = true;
    }
  } catch (error) {
    console.error('Error opening load dialog:', error);
  }
}

async function handleLoaded(data: any) {
  try {
    // 先关闭对话框，避免组件切换时的vnode问题
    showSaveDialog.value = false;

    // 使用 Composable 处理读档逻辑
    const success = await loadGame(data);

    if (success) {
      // 切换到游玩状态
      const transitionSuccess = await gameState.transitionToPlaying(data.name, data.slotId);

      if (!transitionSuccess) {
        console.warn('[StartView] 状态切换失败');
        return;
      }

      // 使用 nextTick 确保对话框完全关闭后再切换界面
      await nextTick();
    }
  } catch (error) {
    console.error('handleLoaded failed:', error);
    const errorMessage = error instanceof Error ? error.message : '读档失败';
    console.warn('[StartView] 读档失败:', errorMessage);
    // 确保对话框关闭
    showSaveDialog.value = false;
  }
}

function openSettings() {
  console.info('[StartView] 设置面板未实现');
}

async function toggleFullscreen() {
  try {
    const rpgRoot = document.getElementById('rpg-root');
    if (!rpgRoot) return;

    // 使用浏览器的实际全屏状态来判断，而不是CSS类
    const isFullscreen = !!document.fullscreenElement;

    if (isFullscreen) {
      // 退出全屏
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } else {
      // 进入全屏
      try {
        await rpgRoot.requestFullscreen();
      } catch {
        // 浏览器全屏失败，使用CSS全屏
        rpgRoot.classList.add('fullscreen');
      }
    }
  } catch {
    // 忽略错误
  }
}
</script>

<style scoped>
@import '../index.css';

/* StartView组件特定样式 - 通用样式已移至index.css */
</style>
