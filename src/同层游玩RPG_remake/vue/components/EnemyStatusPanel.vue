<template>
  <div class="enemy-status-panel" :style="positionStyle">
    <div class="enemy-name">{{ enemyName }}</div>
    <BattleHealthBar label="HP" :current="currentHp" :max="maxHp" type="hp" />
    <!-- 伤害数字显示 -->
    <div v-if="showDamage" class="damage-number" :class="damageClass">
      {{ damageValue }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BattleHealthBar from './BattleHealthBar.vue';

interface EnemyData {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  position?: {
    x: number;
    y: number;
  };
}

interface Props {
  enemyData?: EnemyData;
  position?: {
    x: number;
    y: number;
  };
}

const props = withDefaults(defineProps<Props>(), {
  enemyData: undefined,
  position: undefined,
});

// 伤害数字显示
const showDamage = ref(false);
const damageValue = ref(0);
const damageClass = ref('');

const enemyName = computed(() => props.enemyData?.name || '敌人');
const currentHp = computed(() => props.enemyData?.hp ?? 0);
const maxHp = computed(() => props.enemyData?.maxHp ?? 1);

const positionStyle = computed(() => {
  const pos = props.position || props.enemyData?.position;
  if (!pos) return {};

  return {
    position: 'absolute',
    left: `${pos.x}px`,
    top: `${pos.y - 60}px`, // 显示在敌人上方
    transform: 'translateX(-50%)', // 居中对齐
  };
});

// 监听伤害事件
watch(
  () => props.enemyData?.hp,
  (newHp, oldHp) => {
    if (oldHp !== undefined && newHp !== undefined && newHp < oldHp) {
      const damage = oldHp - newHp;
      showDamageNumber(damage);
    }
  },
);

function showDamageNumber(damage: number) {
  damageValue.value = damage;
  damageClass.value = 'damage-normal';
  showDamage.value = true;

  // 3秒后隐藏
  setTimeout(() => {
    showDamage.value = false;
  }, 3000);
}

// 暴露方法供外部调用
defineExpose({
  showDamageNumber,
  showCriticalDamage: (damage: number) => {
    damageValue.value = damage;
    damageClass.value = 'damage-critical';
    showDamage.value = true;

    setTimeout(() => {
      showDamage.value = false;
    }, 3000);
  },
});
</script>

<style scoped>
.enemy-status-panel {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  padding: 8px;
  min-width: 150px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: auto;
  z-index: 50;
}

.enemy-name {
  font-size: 14px;
  font-weight: bold;
  color: white;
  margin-bottom: 6px;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.damage-number {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  animation: damageFloat 3s ease-out forwards;
  pointer-events: none;
  z-index: 100;
}

.damage-number.damage-normal {
  color: #fbbf24;
}

.damage-number.damage-critical {
  color: #ef4444;
  font-size: 22px;
  animation: criticalDamageFloat 3s ease-out forwards;
}

@keyframes damageFloat {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-50px);
  }
}

@keyframes criticalDamageFloat {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) translateY(-25px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-50px) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .enemy-status-panel {
    min-width: 120px;
    padding: 6px;
  }

  .enemy-name {
    font-size: 12px;
  }

  .damage-number {
    font-size: 16px;
  }

  .damage-number.damage-critical {
    font-size: 18px;
  }
}

/* 动画效果 */
.enemy-status-panel {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
