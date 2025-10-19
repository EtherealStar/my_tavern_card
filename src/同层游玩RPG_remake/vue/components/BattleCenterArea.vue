<template>
  <div class="battle-center-area">
    <!-- Phaser游戏渲染区域 -->
    <div class="phaser-container">
      <PhaserGame />
    </div>

    <!-- 战斗特效层 -->
    <div class="battle-effects" v-if="props.showEffects">
      <div class="skill-effects" v-if="props.skillEffects.length > 0">
        <div
          v-for="(effect, index) in props.skillEffects"
          :key="index"
          class="skill-effect"
          :class="effect.type"
          :style="effect.style"
        >
          {{ effect.text }}
        </div>
      </div>
    </div>

    <!-- 战斗信息提示 -->
    <div class="battle-messages" v-if="props.battleMessages.length > 0">
      <div v-for="(message, index) in props.battleMessages" :key="index" class="battle-message" :class="message.type">
        {{ message.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import PhaserGame from './PhaserGame.vue';

// DamageNumber interface removed - no longer using damage popup effects

interface SkillEffect {
  text: string;
  type: 'fire' | 'ice' | 'lightning' | 'heal' | 'buff' | 'debuff';
  style: {
    left: string;
    top: string;
    animationDelay: string;
  };
}

interface BattleMessage {
  text: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

interface Props {
  showEffects?: boolean;
  skillEffects?: SkillEffect[];
  battleMessages?: BattleMessage[];
}

const props = withDefaults(defineProps<Props>(), {
  showEffects: true,
  skillEffects: () => [],
  battleMessages: () => [],
});

// 自动清理过期的消息和特效
const cleanupMessages = () => {
  // 这里可以添加自动清理逻辑
  // 比如5秒后自动移除消息
};

let cleanupInterval: number | null = null;

onMounted(() => {
  // 设置自动清理定时器
  cleanupInterval = setInterval(cleanupMessages, 1000);
});

onUnmounted(() => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
});
</script>

<style scoped>
.battle-center-area {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
}

.phaser-container {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1; /* 背景层 - 最底层 */
  /* 确保完全填充父容器 */
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.battle-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 5; /* 特效层 - 在背景之上，HUD之下 */
}

/* Damage numbers styles removed - no longer using damage popup effects */

.skill-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.skill-effect {
  position: absolute;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  animation: skillEffect 3s ease-out forwards;
  pointer-events: none;
}

.skill-effect.fire {
  color: #f97316;
}

.skill-effect.ice {
  color: #06b6d4;
}

.skill-effect.lightning {
  color: #eab308;
}

.skill-effect.heal {
  color: #22c55e;
}

.skill-effect.buff {
  color: #8b5cf6;
}

.skill-effect.debuff {
  color: #ef4444;
}

.battle-messages {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15; /* 消息层 - 在特效之上，HUD之下 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 80%;
  pointer-events: none;
}

.battle-message {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  backdrop-filter: blur(8px);
  animation: messageSlide 4s ease-out forwards;
}

.battle-message.info {
  background: rgba(59, 130, 246, 0.8);
  color: white;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.battle-message.warning {
  background: rgba(245, 158, 11, 0.8);
  color: white;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.battle-message.success {
  background: rgba(34, 197, 94, 0.8);
  color: white;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.battle-message.error {
  background: rgba(239, 68, 68, 0.8);
  color: white;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

/* Damage animation keyframes removed - no longer using damage popup effects */

@keyframes skillEffect {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateY(-30px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateY(-60px) scale(0.8);
  }
}

@keyframes messageSlide {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  10% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  90% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .damage-number {
    font-size: 20px;
  }

  .damage-number.critical {
    font-size: 24px;
  }

  .skill-effect {
    font-size: 16px;
  }

  .battle-message {
    font-size: 12px;
    padding: 6px 12px;
  }
}
</style>
