<!-- @ts-nocheck -->
<template>
  <div class="action-panel tw">
    <button class="btn" @click="onUse('power_strike')">重击</button>
    <button class="btn" @click="onUse('precise_strike')">精准</button>
    <button class="btn primary" @click="onUse('fireball')">火球</button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: 'use-skill', skillId: string): void }>();
function onUse(skillId: string) {
  emit('use-skill', skillId);
}
</script>

<style scoped>
.action-panel {
  display: flex;
  gap: 8px;
}
.btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
}
.btn.primary {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}
.btn.primary:hover {
  filter: brightness(0.95);
}
</style>
