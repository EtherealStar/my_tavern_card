<template>
  <div class="battle-top-hud">
    <!-- 战斗日志栏 -->
    <div class="battle-log-bar" v-if="props.battleLog && props.battleLog.length > 0">
      <div class="battle-log-scroll">
        <div
          v-for="(log, index) in props.battleLog.slice(-5)"
          :key="index"
          class="battle-log-item"
          :class="`log-${log.type}`"
        >
          {{ log.text }}
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="battle-top-status">
      <div class="top-hud-left">
        <!-- 敌人血条现在由Phaser显示，这里不再显示 -->
      </div>
      <div class="top-hud-right">
        <div class="battle-info" v-if="props.battleInfo">
          <div class="battle-title">{{ props.battleInfo.title }}</div>
          <div class="battle-subtitle">{{ props.battleInfo.subtitle }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface BattleInfo {
  title?: string;
  subtitle?: string;
}

interface BattleLog {
  text: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

interface Props {
  battleInfo?: BattleInfo;
  battleLog?: BattleLog[];
}

const props = withDefaults(defineProps<Props>(), {
  battleInfo: undefined,
  battleLog: () => [],
});
</script>

<style scoped>
.battle-top-hud {
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  z-index: 10; /* HUD 层级 - 确保在背景和特效之上 */
  position: relative;
}

.battle-top-hud > * {
  pointer-events: auto;
}

/* 战斗日志栏 */
.battle-log-bar {
  background: rgba(0, 0, 0, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  backdrop-filter: blur(8px);
  max-height: 80px;
  overflow: hidden;
}

.battle-log-scroll {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.battle-log-item {
  font-size: 13px;
  line-height: 1.4;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  animation: logFadeIn 0.3s ease-out;
}

.battle-log-item.log-info {
  color: #93c5fd;
}

.battle-log-item.log-warning {
  color: #fbbf24;
}

.battle-log-item.log-success {
  color: #86efac;
}

.battle-log-item.log-error {
  color: #fca5a5;
}

@keyframes logFadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 状态栏 */
.battle-top-status {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 0 16px 8px 16px;
}

.top-hud-left {
  flex: 1;
  max-width: 300px;
}

.top-hud-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.battle-info {
  text-align: right;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 8px 12px;
  backdrop-filter: blur(4px);
}

.battle-title {
  font-size: 14px;
  font-weight: 700;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  margin-bottom: 2px;
}

.battle-subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .battle-top-hud {
    padding: 12px;
    gap: 12px;
    z-index: 10; /* 确保移动端 HUD 层级正确 */
  }

  .top-hud-left {
    max-width: 200px;
  }

  .battle-info {
    padding: 6px 8px;
  }

  .battle-title {
    font-size: 12px;
  }

  .battle-subtitle {
    font-size: 10px;
  }
}
</style>
