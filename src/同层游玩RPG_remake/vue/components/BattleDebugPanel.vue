<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { BattleParticipantExtended } from '../../composables/useBattleState';
import type { EventBus } from '../../core/EventBus';
import { TYPES } from '../../core/ServiceIdentifiers';
import { isBattleConsoleLogEnabled, setBattleConsoleLogEnabled } from '../../utils/battleConsoleLogger';
import EnemyDataEditor from './EnemyDataEditor.vue';
import JsonImportExport from './JsonImportExport.vue';
import PlayerDataEditor from './PlayerDataEditor.vue';
import SkillManagementPanel from './SkillManagementPanel.vue';

// 依赖注入
const eventBus = inject<EventBus>(TYPES.EventBus);

// Props
interface Props {
  battleState: any;
  activePlayer: BattleParticipantExtended | null;
  activeEnemy: BattleParticipantExtended | null;
}

const props = defineProps<Props>();

// 状态
const activeTab = ref<'enemy' | 'player' | 'import' | 'controls' | 'skills'>('enemy');
const isCollapsed = ref(false);
const consoleLogEnabled = ref(isBattleConsoleLogEnabled());

// 计算属性
const showDebugPanel = computed(() => {
  return props.battleState?.battleConfig?.value?.isDebugMode === true;
});

// 方法
const switchTab = (tab: 'enemy' | 'player' | 'import' | 'controls' | 'skills') => {
  activeTab.value = tab;
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const resetToInitial = () => {
  if (eventBus) {
    eventBus.emit('battle:debug-reset');
  }
};

const undoLastChange = () => {
  if (eventBus) {
    eventBus.emit('battle:debug-undo');
  }
};

const redoLastChange = () => {
  if (eventBus) {
    eventBus.emit('battle:debug-redo');
  }
};

const toggleConsoleLog = () => {
  const newValue = !consoleLogEnabled.value;
  consoleLogEnabled.value = newValue;
  setBattleConsoleLogEnabled(newValue);
};

// 如果不在调试模式，不渲染组件
if (!showDebugPanel.value) {
  // 返回空组件
}
</script>

<template>
  <div v-if="showDebugPanel" class="battle-debug-panel" :class="{ collapsed: isCollapsed }">
    <!-- 调试面板头部 -->
    <div class="debug-header">
      <div class="debug-title">
        <span class="debug-icon">🔧</span>
        <span>战斗调试面板</span>
      </div>
      <div class="debug-controls">
        <button @click="toggleCollapse" class="collapse-btn" :title="isCollapsed ? '展开' : '折叠'">
          {{ isCollapsed ? '▶' : '▼' }}
        </button>
      </div>
    </div>

    <!-- 调试面板内容 -->
    <div v-if="!isCollapsed" class="debug-content">
      <!-- 标签页切换 -->
      <div class="debug-tabs">
        <button
          v-for="tab in [
            { id: 'enemy', label: '敌人数据', icon: '👹' },
            { id: 'player', label: '玩家数据', icon: '🧙' },
            { id: 'skills', label: '技能管理', icon: '✨' },
            { id: 'import', label: '导入导出', icon: '📁' },
            { id: 'controls', label: '调试控制', icon: '⚙️' },
          ]"
          :key="tab.id"
          @click="switchTab(tab.id as any)"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <!-- 敌人数据编辑器 -->
        <div v-if="activeTab === 'enemy'" class="tab-panel">
          <EnemyDataEditor :enemy-data="activeEnemy" :battle-state="battleState" />
        </div>

        <!-- 玩家数据编辑器 -->
        <div v-if="activeTab === 'player'" class="tab-panel">
          <PlayerDataEditor :player-data="activePlayer" :battle-state="battleState" />
        </div>

        <!-- 技能管理面板 -->
        <div v-if="activeTab === 'skills'" class="tab-panel">
          <SkillManagementPanel :battle-state="battleState" :active-player="activePlayer" :active-enemy="activeEnemy" />
        </div>

        <!-- JSON导入导出 -->
        <div v-if="activeTab === 'import'" class="tab-panel">
          <JsonImportExport :battle-state="battleState" :active-player="activePlayer" :active-enemy="activeEnemy" />
        </div>

        <!-- 调试控制 -->
        <div v-if="activeTab === 'controls'" class="tab-panel">
          <div class="debug-controls-panel">
            <h3>调试控制</h3>

            <div class="control-group">
              <h4>状态管理</h4>
              <div class="control-buttons">
                <button @click="resetToInitial" class="control-btn reset-btn">🔄 重置到初始状态</button>
                <button @click="undoLastChange" class="control-btn undo-btn">↶ 撤销</button>
                <button @click="redoLastChange" class="control-btn redo-btn">↷ 重做</button>
              </div>
            </div>

            <div class="control-group">
              <h4>快速设置</h4>
              <div class="control-buttons">
                <button class="control-btn preset-btn" @click="eventBus?.emit('battle:debug-preset', 'easy')">
                  🟢 简单敌人
                </button>
                <button class="control-btn preset-btn" @click="eventBus?.emit('battle:debug-preset', 'normal')">
                  🟡 普通敌人
                </button>
                <button class="control-btn preset-btn" @click="eventBus?.emit('battle:debug-preset', 'hard')">
                  🔴 困难敌人
                </button>
              </div>
            </div>

            <div class="control-group">
              <h4>控制台日志</h4>
              <div class="control-buttons">
                <button
                  @click="toggleConsoleLog"
                  class="control-btn"
                  :class="{ active: consoleLogEnabled }"
                  :style="consoleLogEnabled ? { background: '#38a169', borderColor: '#68d391' } : {}"
                >
                  {{ consoleLogEnabled ? '✅ 控制台信息输出已开启' : '❌ 控制台信息输出已关闭' }}
                </button>
              </div>
            </div>

            <div class="control-group">
              <h4>状态信息</h4>
              <div class="status-info">
                <div class="status-item">
                  <span class="status-label">当前回合:</span>
                  <span class="status-value">{{ battleState?.battleRound?.value || 1 }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">战斗状态:</span>
                  <span class="status-value">{{ battleState?.isBattleActive?.value ? '进行中' : '已结束' }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">参与者数量:</span>
                  <span class="status-value">{{ battleState?.battleState?.value?.participants?.length || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-debug-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #4a5568;
  border-radius: 12px;
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.battle-debug-panel.collapsed {
  width: 200px;
  height: auto;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #2d3748, #4a5568);
  border-radius: 10px 10px 0 0;
  border-bottom: 1px solid #718096;
}

.debug-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 14px;
}

.debug-icon {
  font-size: 16px;
}

.collapse-btn {
  background: transparent;
  border: 1px solid #718096;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  background: #718096;
  border-color: #a0aec0;
}

.debug-content {
  padding: 0;
}

.debug-tabs {
  display: flex;
  background: #2d3748;
  border-bottom: 1px solid #4a5568;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: transparent;
  border: none;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 10px;
}

.tab-btn:hover {
  background: #4a5568;
  color: white;
}

.tab-btn.active {
  background: #4a5568;
  color: white;
  border-bottom: 2px solid #63b3ed;
}

.tab-icon {
  font-size: 14px;
}

.tab-label {
  font-size: 10px;
  font-weight: 500;
}

.tab-content {
  max-height: 60vh;
  overflow-y: auto;
}

.tab-panel {
  padding: 16px;
}

.debug-controls-panel h3 {
  margin: 0 0 16px 0;
  color: #63b3ed;
  font-size: 14px;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 8px;
}

.control-group {
  margin-bottom: 20px;
}

.control-group h4 {
  margin: 0 0 8px 0;
  color: #a0aec0;
  font-size: 12px;
  font-weight: 600;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-btn {
  padding: 8px 12px;
  border: 1px solid #4a5568;
  border-radius: 6px;
  background: #2d3748;
  color: white;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
  text-align: left;
}

.control-btn:hover {
  background: #4a5568;
  border-color: #718096;
  transform: translateY(-1px);
}

.reset-btn:hover {
  background: #e53e3e;
  border-color: #fc8181;
}

.undo-btn:hover {
  background: #d69e2e;
  border-color: #f6e05e;
}

.redo-btn:hover {
  background: #38a169;
  border-color: #68d391;
}

.preset-btn:hover {
  background: #3182ce;
  border-color: #63b3ed;
}

.status-info {
  background: #1a202c;
  border: 1px solid #4a5568;
  border-radius: 6px;
  padding: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 11px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  color: #a0aec0;
}

.status-value {
  color: #63b3ed;
  font-weight: 600;
}

/* 滚动条样式 */
.tab-content::-webkit-scrollbar {
  width: 6px;
}

.tab-content::-webkit-scrollbar-track {
  background: #2d3748;
}

.tab-content::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: #718096;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .battle-debug-panel {
    width: 350px;
    right: 10px;
    top: 10px;
  }

  .battle-debug-panel.collapsed {
    width: 150px;
  }
}

@media (max-width: 480px) {
  .battle-debug-panel {
    width: 300px;
    right: 5px;
    top: 5px;
  }

  .battle-debug-panel.collapsed {
    width: 120px;
  }
}
</style>
