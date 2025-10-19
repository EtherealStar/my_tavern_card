<template>
  <div class="battle-info" v-if="props.battleInfo">
    <div class="battle-title" v-if="props.battleInfo.title">{{ props.battleInfo.title }}</div>
    <div class="battle-subtitle" v-if="props.battleInfo.subtitle">{{ props.battleInfo.subtitle }}</div>
  </div>
</template>

<script setup lang="ts">
interface BattleInfo {
  title?: string;
  subtitle?: string;
}

interface Props {
  battleInfo?: BattleInfo;
}

const props = withDefaults(defineProps<Props>(), {
  battleInfo: undefined,
});
</script>

<style scoped>
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
</style>

