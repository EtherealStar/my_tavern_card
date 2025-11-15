<script setup lang="ts">
import { inject, ref } from 'vue';
import { z } from 'zod';
import type { BattleParticipantExtended } from '../../composables/useBattleState';
import type { EventBus } from '../../core/EventBus';
import { TYPES } from '../../core/ServiceIdentifiers';

// Props
interface Props {
  battleState: any;
  activePlayer: BattleParticipantExtended | null;
  activeEnemy: BattleParticipantExtended | null;
}

const props = defineProps<Props>();

// 依赖注入
const eventBus = inject<EventBus>(TYPES.EventBus);

// 状态
const isImporting = ref(false);
const importError = ref<string | null>(null);
const importSuccess = ref<string | null>(null);

// JSON 验证 Schema
// 资源路径验证函数（支持URL或本地资源路径）
const resourcePathSchema = z.string().refine(
  val => {
    // 如果是有效的URL，则通过
    try {
      new URL(val);
      return true;
    } catch {
      // 如果不是URL，检查是否为本地资源路径
      // 本地资源路径应该以 assets/ 开头，或者是相对路径
      return val.startsWith('assets/') || val.startsWith('./assets/') || val.startsWith('../assets/');
    }
  },
  {
    message: '必须是有效的URL地址或本地资源路径（以 assets/ 开头）',
  },
);

const BattleParticipantStatsSchema = z.object({
  atk: z.number().nonnegative().default(10),
  hatk: z.number().nonnegative().default(10),
  def: z.number().nonnegative().default(0),
  hdef: z.number().min(0).max(0.99).default(0),
  hit: z.number().min(0).default(0.8),
  evade: z.number().min(0).max(1).default(0.1),
  critRate: z.number().min(0).max(1).default(0.05),
  critDamageMultiplier: z.number().min(1).max(5).default(1.5),
  hhp: z.number().nonnegative().default(0),
});

const BattleParticipantSchema = z.object({
  id: z.string(),
  name: z.string().default('Unknown'),
  side: z.enum(['player', 'enemy']).default('enemy'),
  level: z.number().int().min(1).max(20).default(1),
  maxHp: z.number().int().nonnegative().optional(),
  hp: z.number().int().nonnegative().optional(),
  maxMp: z.number().int().nonnegative().optional(),
  mp: z.number().int().nonnegative().optional(),
  stats: BattleParticipantStatsSchema.optional(),
  skills: z.array(z.string()).optional(),
});

// 完整格式验证
const FullBattleConfigSchema = z.object({
  enemy: BattleParticipantSchema,
  player: BattleParticipantSchema,
  battleConfig: z
    .object({
      background: z
        .object({
          image: resourcePathSchema,
        })
        .optional(),
    })
    .optional(),
  metadata: z
    .object({
      version: z.string(),
      created: z.string(),
      description: z.string(),
    })
    .optional(),
});

// 简化格式验证（仅敌人数据）
const SimpleEnemySchema = BattleParticipantSchema;

// 文件处理
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
};

const handleFileDrop = (event: DragEvent) => {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (file) {
    processFile(file);
  }
};

const processFile = async (file: File) => {
  if (!file.name.endsWith('.json')) {
    importError.value = '请选择 JSON 文件';
    return;
  }

  if (file.size > 1024 * 1024) {
    // 1MB limit
    importError.value = '文件大小不能超过 1MB';
    return;
  }

  isImporting.value = true;
  importError.value = null;
  importSuccess.value = null;

  try {
    const text = await file.text();
    const jsonData = JSON.parse(text);

    // 尝试验证为完整格式
    const fullResult = FullBattleConfigSchema.safeParse(jsonData);
    if (fullResult.success) {
      await importFullConfig(fullResult.data);
      return;
    }

    // 尝试验证为简化格式
    const simpleResult = SimpleEnemySchema.safeParse(jsonData);
    if (simpleResult.success) {
      await importSimpleEnemy(simpleResult.data);
      return;
    }

    // 验证失败
    importError.value = 'JSON 格式不正确，请检查文件结构';
  } catch (error) {
    importError.value = `文件解析失败: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    isImporting.value = false;
  }
};

// 导入完整配置
const importFullConfig = async (data: any) => {
  try {
    if (eventBus) {
      eventBus.emit('battle:debug-import-full-config', data);
    }
    importSuccess.value = '完整配置导入成功';
  } catch (error) {
    importError.value = `导入失败: ${error instanceof Error ? error.message : String(error)}`;
  }
};

// 导入简化敌人数据
const importSimpleEnemy = async (data: any) => {
  try {
    if (eventBus) {
      eventBus.emit('battle:debug-import-enemy', data);
    }
    importSuccess.value = '敌人数据导入成功';
  } catch (error) {
    importError.value = `导入失败: ${error instanceof Error ? error.message : String(error)}`;
  }
};

// 导出当前战斗状态
const exportCurrentState = () => {
  try {
    const exportData = {
      enemy: props.activeEnemy,
      player: props.activePlayer,
      battleConfig: props.battleState?.battleConfig?.value,
      metadata: {
        version: '1.0',
        created: new Date().toISOString(),
        description: '当前战斗状态导出',
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `battle_state_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    importSuccess.value = '战斗状态导出成功';
  } catch (error) {
    importError.value = `导出失败: ${error instanceof Error ? error.message : String(error)}`;
  }
};

// 导出敌人数据
const exportEnemyData = () => {
  try {
    if (!props.activeEnemy) {
      importError.value = '没有敌人数据可导出';
      return;
    }

    const jsonString = JSON.stringify(props.activeEnemy, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `enemy_data_${props.activeEnemy.id}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    importSuccess.value = '敌人数据导出成功';
  } catch (error) {
    importError.value = `导出失败: ${error instanceof Error ? error.message : String(error)}`;
  }
};

// 清除消息
const clearMessages = () => {
  importError.value = null;
  importSuccess.value = null;
};

// 示例 JSON 模板
const getExampleJson = () => {
  return {
    enemy: {
      id: 'example_enemy',
      name: '示例敌人',
      side: 'enemy',
      level: 5,
      maxHp: 200,
      hp: 200,
      maxMp: 75,
      mp: 75,
      stats: {
        atk: 25,
        hatk: 20,
        def: 15,
        hdef: 0.3,
        hit: 0.9,
        evade: 0.15,
        critRate: 0.1,
        critDamageMultiplier: 2.0,
        hhp: 50,
      },
      skills: ['power_strike', 'defend'],
    },
    player: {
      id: 'player',
      name: '玩家',
      side: 'player',
      level: 1,
      maxHp: 100,
      hp: 100,
      maxMp: 50,
      mp: 50,
      stats: {
        atk: 15,
        hatk: 12,
        def: 8,
        hdef: 0.2,
        hit: 0.8,
        evade: 0.1,
        critRate: 0.05,
        critDamageMultiplier: 1.5,
        hhp: 0,
      },
      skills: ['power_strike', 'defend', 'heal'],
    },
    metadata: {
      version: '1.0',
      created: new Date().toISOString(),
      description: '示例战斗配置',
    },
  };
};

const downloadExample = () => {
  const exampleData = getExampleJson();
  const jsonString = JSON.stringify(exampleData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'battle_config_example.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="json-import-export">
    <div class="section-header">
      <h3>JSON 导入导出</h3>
    </div>

    <div class="section-content">
      <!-- 导入区域 -->
      <div class="import-section">
        <h4>导入配置</h4>

        <div class="file-drop-zone" @drop="handleFileDrop" @dragover.prevent @dragenter.prevent>
          <div class="drop-zone-content">
            <div class="drop-icon">📁</div>
            <p>拖拽 JSON 文件到此处</p>
            <p class="drop-hint">或点击下方按钮选择文件</p>
          </div>
        </div>

        <div class="file-input-wrapper">
          <input type="file" accept=".json" @change="handleFileSelect" class="file-input" id="json-file-input" />
          <label for="json-file-input" class="file-input-label"> 📂 选择 JSON 文件 </label>
        </div>

        <div v-if="isImporting" class="loading-indicator">
          <div class="spinner"></div>
          <span>正在导入...</span>
        </div>

        <div v-if="importError" class="error-message">
          <span class="error-icon">❌</span>
          <span>{{ importError }}</span>
          <button @click="clearMessages" class="clear-btn">×</button>
        </div>

        <div v-if="importSuccess" class="success-message">
          <span class="success-icon">✅</span>
          <span>{{ importSuccess }}</span>
          <button @click="clearMessages" class="clear-btn">×</button>
        </div>
      </div>

      <!-- 导出区域 -->
      <div class="export-section">
        <h4>导出配置</h4>

        <div class="export-buttons">
          <button @click="exportCurrentState" class="export-btn full-export">📦 导出完整战斗状态</button>
          <button @click="exportEnemyData" class="export-btn enemy-export" :disabled="!activeEnemy">
            👹 导出敌人数据
          </button>
        </div>
      </div>

      <!-- 示例模板 -->
      <div class="example-section">
        <h4>示例模板</h4>

        <div class="example-content">
          <p class="example-description">下载示例 JSON 文件了解正确的数据格式</p>
          <button @click="downloadExample" class="example-btn">📋 下载示例模板</button>
        </div>
      </div>

      <!-- 格式说明 -->
      <div class="format-info">
        <h4>支持格式</h4>

        <div class="format-list">
          <div class="format-item"><strong>完整格式:</strong> 包含敌人、玩家和战斗配置的完整 JSON</div>
          <div class="format-item"><strong>简化格式:</strong> 仅包含敌人数据的简化 JSON</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-import-export {
  background: #1a202c;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, #2d3748, #4a5568);
  border-bottom: 1px solid #4a5568;
}

.section-header h3 {
  margin: 0;
  color: #63b3ed;
  font-size: 14px;
  font-weight: 600;
}

.section-content {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.import-section,
.export-section,
.example-section,
.format-info {
  margin-bottom: 20px;
}

.import-section h4,
.export-section h4,
.example-section h4,
.format-info h4 {
  margin: 0 0 12px 0;
  color: #a0aec0;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 6px;
}

.file-drop-zone {
  border: 2px dashed #4a5568;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  background: #2d3748;
  transition: all 0.3s ease;
  margin-bottom: 12px;
}

.file-drop-zone:hover {
  border-color: #63b3ed;
  background: #4a5568;
}

.drop-zone-content {
  color: #a0aec0;
}

.drop-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.drop-hint {
  font-size: 10px;
  color: #718096;
  margin-top: 4px;
}

.file-input-wrapper {
  position: relative;
  margin-bottom: 12px;
}

.file-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.file-input-label {
  display: inline-block;
  padding: 8px 16px;
  background: #4a5568;
  border: 1px solid #718096;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
}

.file-input-label:hover {
  background: #63b3ed;
  border-color: #90cdf4;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #63b3ed;
  font-size: 11px;
  margin-bottom: 12px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #4a5568;
  border-top: 2px solid #63b3ed;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-message,
.success-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  margin-bottom: 12px;
}

.error-message {
  background: #2d1b1b;
  border: 1px solid #fc8181;
  color: #fc8181;
}

.success-message {
  background: #1b2d1b;
  border: 1px solid #68d391;
  color: #68d391;
}

.clear-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  margin-left: auto;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.export-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.export-btn {
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

.export-btn:hover:not(:disabled) {
  background: #4a5568;
  border-color: #63b3ed;
  transform: translateY(-1px);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.full-export:hover {
  background: #3182ce;
  border-color: #63b3ed;
}

.enemy-export:hover {
  background: #d69e2e;
  border-color: #f6e05e;
}

.example-content {
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  padding: 12px;
}

.example-description {
  margin: 0 0 8px 0;
  color: #a0aec0;
  font-size: 11px;
  line-height: 1.4;
}

.example-btn {
  padding: 6px 12px;
  border: 1px solid #4a5568;
  border-radius: 4px;
  background: #2d3748;
  color: #a0aec0;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s ease;
}

.example-btn:hover {
  background: #4a5568;
  color: white;
  border-color: #63b3ed;
}

.format-list {
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  padding: 12px;
}

.format-item {
  margin-bottom: 8px;
  font-size: 11px;
  color: #a0aec0;
  line-height: 1.4;
}

.format-item:last-child {
  margin-bottom: 0;
}

.format-item strong {
  color: #e2e8f0;
}

/* 滚动条样式 */
.section-content::-webkit-scrollbar {
  width: 6px;
}

.section-content::-webkit-scrollbar-track {
  background: #1a202c;
}

.section-content::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}

.section-content::-webkit-scrollbar-thumb:hover {
  background: #718096;
}
</style>
