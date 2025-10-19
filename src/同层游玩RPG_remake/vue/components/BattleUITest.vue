<template>
  <div class="battle-ui-test">
    <h2>战斗UI组件测试</h2>

    <!-- 测试血条组件 -->
    <div class="test-section">
      <h3>血条组件测试</h3>
      <div class="test-row">
        <BattleHealthBar label="HP" :current="80" :max="100" type="hp" />
        <BattleHealthBar label="MP" :current="60" :max="100" type="mp" />
        <BattleHealthBar label="耐力" :current="30" :max="100" type="endurance" />
      </div>
    </div>

    <!-- 测试状态指示器 -->
    <div class="test-section">
      <h3>状态指示器测试</h3>
      <div class="test-row">
        <BattleStatusIndicator label="HP%" value="80%" type="percentage" />
        <BattleStatusIndicator label="Arousal" value="25" type="arousal" />
        <BattleStatusIndicator label="Level" value="15" type="default" />
      </div>
    </div>

    <!-- 测试行动面板 -->
    <div class="test-section">
      <h3>行动面板测试</h3>
      <BattleActionPanel
        :actions="testActions"
        default-selected="fight"
        @action-selected="onActionSelected"
        @action-confirmed="onActionConfirmed"
      />
    </div>

    <!-- 测试玩家状态栏 -->
    <div class="test-section">
      <h3>玩家状态栏测试</h3>
      <BattlePlayerStatusBar
        player-name="测试玩家"
        :hp="150"
        :max-hp="200"
        :mp="80"
        :max-mp="120"
        :endurance="45"
        :max-endurance="100"
      />
    </div>

    <!-- 测试敌人状态栏 -->
    <div class="test-section">
      <h3>敌人状态栏测试</h3>
      <BattleEnemyStatusBar
        enemy-name="测试敌人"
        :hp="120"
        :max-hp="150"
        :status-indicators="[{ label: 'Arousal', value: 15, type: 'arousal', size: 'small' }]"
      />
    </div>

    <!-- 测试完整布局 -->
    <div class="test-section">
      <h3>完整战斗布局测试</h3>
      <div class="battle-layout-test">
        <BattleLayout
          :actions="testActions"
          :enemy-data="testEnemyData"
          :player-data="testPlayerData"
          :battle-info="testBattleInfo"
          :arousal-level="25"
          :default-selected-action="'fight'"
          :show-controls="true"
          :show-effects="true"
          :damage-numbers="[]"
          :skill-effects="[]"
          :battle-messages="[]"
          @action-selected="onActionSelected"
          @action-confirmed="onActionConfirmed"
          @exit-battle="onExitBattle"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BattleActionPanel from './BattleActionPanel.vue';
import BattleEnemyStatusBar from './BattleEnemyStatusBar.vue';
import BattleHealthBar from './BattleHealthBar.vue';
import BattleLayout from './BattleLayout.vue';
import BattlePlayerStatusBar from './BattlePlayerStatusBar.vue';
import BattleStatusIndicator from './BattleStatusIndicator.vue';

// 测试数据
const testActions = ref([
  { id: 'fight', label: '战斗', icon: '⚔️' },
  { id: 'run', label: '逃跑', icon: '🏃' },
  { id: 'item', label: '道具', icon: '🧪', disabled: true },
  { id: 'skill', label: '技能', icon: '✨', disabled: true },
]);

const testEnemyData = ref({
  name: '测试敌人',
  hp: 120,
  maxHp: 150,
  statusIndicators: [
    {
      label: 'Arousal',
      value: 25,
      type: 'arousal' as const,
      size: 'small' as const,
    },
  ],
});

const testPlayerData = ref({
  name: '测试玩家',
  hp: 150,
  maxHp: 200,
  mp: 80,
  maxMp: 120,
  endurance: 45,
  maxEndurance: 100,
});

const testBattleInfo = ref({
  title: '测试战斗',
  subtitle: '回合 1',
});

// 事件处理
const onActionSelected = (actionId: string) => {
  console.log('行动选择:', actionId);
};

const onActionConfirmed = (actionId: string) => {
  console.log('行动确认:', actionId);
};

const onExitBattle = () => {
  console.log('退出战斗');
};
</script>

<style scoped>
.battle-ui-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.test-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #374151;
}

.test-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.battle-layout-test {
  height: 600px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}
</style>

