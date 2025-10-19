<template>
  <div class="modal-mask">
    <div class="modal-card" :class="resultClass">
      <div class="title">
        <span class="result-icon">{{ resultIcon }}</span>
        <span>{{ resultTitle }}</span>
      </div>
      <div class="body">
        <div class="result-text">{{ resultText }}</div>
        <div v-if="props.result.rounds" class="result-detail">战斗回合数: {{ props.result.rounds }}</div>
      </div>
      <div class="footer">
        <button class="btn btn-primary" @click="$emit('close')">返回游戏</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ result: { winner: 'player' | 'enemy'; summary?: string; rounds?: number } }>();
const emit = defineEmits<{
  close: [];
}>();

const resultClass = computed(() => (props.result.winner === 'player' ? 'victory' : 'defeat'));

const resultIcon = computed(() => (props.result.winner === 'player' ? '🎉' : '💀'));

const resultTitle = computed(() => (props.result.winner === 'player' ? '战斗胜利！' : '战斗失败...'));

const resultText = computed(
  () => props.result.summary || (props.result.winner === 'player' ? '你成功击败了敌人！' : '你被敌人击败了...'),
);
</script>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.modal-card {
  width: 400px;
  max-width: 90%;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease-out;
}

.modal-card.victory {
  border: 3px solid #22c55e;
}

.modal-card.defeat {
  border: 3px solid #ef4444;
}

.title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.victory .title {
  color: #22c55e;
}

.defeat .title {
  color: #ef4444;
}

.result-icon {
  font-size: 32px;
}

.body {
  margin: 16px 0;
  text-align: center;
}

.result-text {
  font-size: 16px;
  color: #374151;
  margin-bottom: 12px;
  line-height: 1.6;
}

.result-detail {
  font-size: 14px;
  color: #6b7280;
  margin-top: 8px;
}

.footer {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  transform: translateY(-2px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
