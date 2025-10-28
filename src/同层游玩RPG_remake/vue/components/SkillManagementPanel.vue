<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import type { BattleParticipantExtended } from '../../composables/useBattleState';
import type { EventBus } from '../../core/EventBus';
import { TYPES } from '../../core/ServiceIdentifiers';
import type { Skill } from '../../models/BattleSchemas';
import type { BattleConfigService } from '../../services/BattleConfigService';

// Props
interface Props {
  battleState: any;
  activePlayer: BattleParticipantExtended | null;
  activeEnemy: BattleParticipantExtended | null;
}

const props = defineProps<Props>();

// 依赖注入
const eventBus = inject<EventBus>(TYPES.EventBus);
const battleConfigService = inject<BattleConfigService>(TYPES.BattleConfigService);

// 响应式数据
const activeSubTab = ref<'list' | 'create' | 'import'>('list');
const newSkill = ref<Partial<Skill>>({
  id: '',
  name: '',
  description: '',
  category: 'physical',
  target: 'single',
  powerMultiplier: 1.0,
  flatPower: 0,
  hitModifier: 0,
  critBonus: 0,
  animationKey: '',
  tags: [],
});
const validationErrors = ref<Record<string, string>>({});
const importFile = ref<File | null>(null);
const importError = ref<string>('');

// 计算属性
const allSkills = computed(() => {
  if (!battleConfigService) return [];
  return battleConfigService.getAllSkills();
});

const customSkills = computed(() => {
  if (!battleConfigService) return [];
  return allSkills.value.filter(skill => {
    const config = battleConfigService.getSkillConfig(skill.id);
    return config?.source === 'custom';
  });
});

const defaultSkills = computed(() => {
  if (!battleConfigService) return [];
  return allSkills.value.filter(skill => {
    const config = battleConfigService.getSkillConfig(skill.id);
    return config?.source === 'default';
  });
});

// 方法
const switchSubTab = (tab: 'list' | 'create' | 'import') => {
  activeSubTab.value = tab;
  clearForm();
};

const clearForm = () => {
  newSkill.value = {
    id: '',
    name: '',
    description: '',
    category: 'physical',
    target: 'single',
    powerMultiplier: 1.0,
    flatPower: 0,
    hitModifier: 0,
    critBonus: 0,
    animationKey: '',
    tags: [],
  };
  validationErrors.value = {};
  importError.value = '';
  importFile.value = null;
};

const validateSkill = (): boolean => {
  const errors: Record<string, string> = {};

  if (!newSkill.value.id?.trim()) {
    errors.id = '技能ID不能为空';
  } else if (battleConfigService?.isValidSkillId(newSkill.value.id)) {
    errors.id = '技能ID已存在';
  }

  if (!newSkill.value.name?.trim()) {
    errors.name = '技能名称不能为空';
  }

  if (newSkill.value.powerMultiplier === undefined || newSkill.value.powerMultiplier < 0) {
    errors.powerMultiplier = '威力倍数不能为负数';
  }

  if (newSkill.value.flatPower === undefined || newSkill.value.flatPower < 0) {
    errors.flatPower = '固定威力不能为负数';
  }

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const createSkill = () => {
  if (!validateSkill() || !battleConfigService) return;

  const skill: Skill = {
    id: newSkill.value.id!,
    name: newSkill.value.name!,
    description: newSkill.value.description || '',
    category: newSkill.value.category as 'physical' | 'magical',
    target: newSkill.value.target as 'single' | 'all' | 'self',
    powerMultiplier: newSkill.value.powerMultiplier || 1.0,
    flatPower: newSkill.value.flatPower || 0,
    hitModifier: newSkill.value.hitModifier || 0,
    critBonus: newSkill.value.critBonus || 0,
    animationKey: newSkill.value.animationKey || '',
    tags: newSkill.value.tags || [],
  };

  battleConfigService.registerCustomSkill(skill);
  console.log('[SkillManagementPanel] 创建新技能:', skill);

  // 发送事件通知其他组件
  if (eventBus) {
    eventBus.emit('skill:created', { skill });
  }

  clearForm();
  switchSubTab('list');
};

const deleteSkill = (skillId: string) => {
  if (!battleConfigService) return;

  // 注意：这里只能删除自定义技能，默认技能不能删除
  const config = battleConfigService.getSkillConfig(skillId);
  if (config?.source === 'default') {
    console.warn('[SkillManagementPanel] 不能删除默认技能:', skillId);
    return;
  }

  // 发送删除事件
  if (eventBus) {
    eventBus.emit('skill:delete', { skillId });
  }
};

const assignSkillToPlayer = (skillId: string) => {
  if (eventBus) {
    eventBus.emit('skill:assign-to-player', { skillId });
  }
};

const assignSkillToEnemy = (skillId: string) => {
  if (eventBus) {
    eventBus.emit('skill:assign-to-enemy', { skillId });
  }
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    importFile.value = file;
    importError.value = '';
  }
};

const importSkills = async () => {
  if (!importFile.value || !battleConfigService) return;

  try {
    const text = await importFile.value.text();
    const skills: Skill[] = JSON.parse(text);

    if (!Array.isArray(skills)) {
      throw new Error('技能文件格式错误：应该是技能数组');
    }

    let successCount = 0;
    let errorCount = 0;

    for (const skill of skills) {
      try {
        // 验证技能格式
        if (!skill.id || !skill.name || !skill.category) {
          throw new Error(`技能格式错误: ${skill.id || 'unknown'}`);
        }

        // 检查是否已存在
        if (battleConfigService.isValidSkillId(skill.id)) {
          console.warn(`[SkillManagementPanel] 技能已存在，跳过: ${skill.id}`);
          continue;
        }

        battleConfigService.registerCustomSkill(skill);
        successCount++;
      } catch (error) {
        console.error(`[SkillManagementPanel] 导入技能失败: ${skill.id}`, error);
        errorCount++;
      }
    }

    console.log(`[SkillManagementPanel] 技能导入完成: 成功 ${successCount} 个，失败 ${errorCount} 个`);

    if (successCount > 0) {
      // 发送导入成功事件
      if (eventBus) {
        eventBus.emit('skill:imported', {
          skillIds: skills.slice(0, successCount).map(s => s.id),
          source: 'file_import',
        });
      }
    }

    if (errorCount > 0) {
      importError.value = `导入完成，但有 ${errorCount} 个技能导入失败`;
    } else {
      importError.value = '';
      clearForm();
      switchSubTab('list');
    }
  } catch (error) {
    console.error('[SkillManagementPanel] 导入技能文件失败:', error);
    importError.value = `导入失败: ${error instanceof Error ? error.message : '未知错误'}`;
  }
};

const downloadTemplate = () => {
  const template: Skill[] = [
    {
      id: 'example_skill',
      name: '示例技能',
      description: '这是一个示例技能',
      category: 'physical',
      target: 'single',
      powerMultiplier: 1.2,
      flatPower: 5,
      hitModifier: 0.1,
      critBonus: 0.05,
      animationKey: 'example_skill',
      tags: ['example', 'physical'],
    },
  ];

  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'skill_template.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 监听标签变化
watch(
  () => activeSubTab.value,
  () => {
    clearForm();
  },
);
</script>

<template>
  <div class="skill-management-panel">
    <h3>技能管理</h3>

    <!-- 子标签页 -->
    <div class="sub-tabs">
      <button
        v-for="tab in [
          { id: 'list', label: '技能列表', icon: '📋' },
          { id: 'create', label: '创建技能', icon: '➕' },
          { id: 'import', label: '导入技能', icon: '📁' },
        ]"
        :key="tab.id"
        @click="switchSubTab(tab.id as any)"
        class="sub-tab-btn"
        :class="{ active: activeSubTab === tab.id }"
      >
        <span class="sub-tab-icon">{{ tab.icon }}</span>
        <span class="sub-tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- 技能列表 -->
    <div v-if="activeSubTab === 'list'" class="sub-tab-content">
      <div class="skill-stats">
        <div class="stat-item">
          <span class="stat-label">总技能数:</span>
          <span class="stat-value">{{ allSkills.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">默认技能:</span>
          <span class="stat-value">{{ defaultSkills.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">自定义技能:</span>
          <span class="stat-value">{{ customSkills.length }}</span>
        </div>
      </div>

      <!-- 默认技能 -->
      <div v-if="defaultSkills.length > 0" class="skill-section">
        <h4>默认技能</h4>
        <div class="skill-list">
          <div v-for="skill in defaultSkills" :key="skill.id" class="skill-item default-skill">
            <div class="skill-info">
              <div class="skill-name">{{ skill.name }}</div>
              <div class="skill-details">
                <span class="skill-category">{{ skill.category }}</span>
                <span class="skill-target">{{ skill.target }}</span>
                <span class="skill-power">{{ skill.powerMultiplier }}x + {{ skill.flatPower }}</span>
              </div>
            </div>
            <div class="skill-actions">
              <button @click="assignSkillToPlayer(skill.id)" class="action-btn assign-btn" title="分配给玩家">
                👤
              </button>
              <button @click="assignSkillToEnemy(skill.id)" class="action-btn assign-btn" title="分配给敌人">👹</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 自定义技能 -->
      <div v-if="customSkills.length > 0" class="skill-section">
        <h4>自定义技能</h4>
        <div class="skill-list">
          <div v-for="skill in customSkills" :key="skill.id" class="skill-item custom-skill">
            <div class="skill-info">
              <div class="skill-name">{{ skill.name }}</div>
              <div class="skill-details">
                <span class="skill-category">{{ skill.category }}</span>
                <span class="skill-target">{{ skill.target }}</span>
                <span class="skill-power">{{ skill.powerMultiplier }}x + {{ skill.flatPower }}</span>
              </div>
            </div>
            <div class="skill-actions">
              <button @click="assignSkillToPlayer(skill.id)" class="action-btn assign-btn" title="分配给玩家">
                👤
              </button>
              <button @click="assignSkillToEnemy(skill.id)" class="action-btn assign-btn" title="分配给敌人">👹</button>
              <button @click="deleteSkill(skill.id)" class="action-btn delete-btn" title="删除技能">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="allSkills.length === 0" class="empty-state">
        <p>暂无技能数据</p>
      </div>
    </div>

    <!-- 创建技能 -->
    <div v-if="activeSubTab === 'create'" class="sub-tab-content">
      <div class="skill-form">
        <div class="form-group">
          <label>技能ID *</label>
          <input v-model="newSkill.id" type="text" placeholder="例如: fire_ball" />
          <div v-if="validationErrors.id" class="error-message">{{ validationErrors.id }}</div>
        </div>

        <div class="form-group">
          <label>技能名称 *</label>
          <input v-model="newSkill.name" type="text" placeholder="例如: 火球术" />
          <div v-if="validationErrors.name" class="error-message">{{ validationErrors.name }}</div>
        </div>

        <div class="form-group">
          <label>技能描述</label>
          <textarea v-model="newSkill.description" placeholder="技能描述..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>技能类型</label>
            <select v-model="newSkill.category">
              <option value="physical">物理</option>
              <option value="magical">魔法</option>
            </select>
          </div>

          <div class="form-group">
            <label>目标类型</label>
            <select v-model="newSkill.target">
              <option value="single">单体</option>
              <option value="all">全体</option>
              <option value="self">自身</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>威力倍数</label>
            <input v-model.number="newSkill.powerMultiplier" type="number" step="0.1" min="0" />
            <div v-if="validationErrors.powerMultiplier" class="error-message">
              {{ validationErrors.powerMultiplier }}
            </div>
          </div>

          <div class="form-group">
            <label>固定威力</label>
            <input v-model.number="newSkill.flatPower" type="number" min="0" />
            <div v-if="validationErrors.flatPower" class="error-message">{{ validationErrors.flatPower }}</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>命中修正</label>
            <input v-model.number="newSkill.hitModifier" type="number" step="0.01" />
          </div>

          <div class="form-group">
            <label>暴击加成</label>
            <input v-model.number="newSkill.critBonus" type="number" step="0.01" />
          </div>
        </div>

        <div class="form-group">
          <label>动画键</label>
          <input v-model="newSkill.animationKey" type="text" placeholder="例如: fireball_cast" />
        </div>

        <div class="form-group">
          <label>标签 (用逗号分隔)</label>
          <input v-model="newSkill.tags" type="text" placeholder="例如: fire, magical, ranged" />
        </div>

        <div class="form-actions">
          <button @click="createSkill" class="create-btn">创建技能</button>
          <button @click="clearForm" class="clear-btn">清空表单</button>
        </div>
      </div>
    </div>

    <!-- 导入技能 -->
    <div v-if="activeSubTab === 'import'" class="sub-tab-content">
      <div class="import-section">
        <h4>导入技能文件</h4>
        <p class="import-description">
          支持导入JSON格式的技能文件。文件应包含技能数组，每个技能包含id、name、category等属性。
        </p>

        <div class="file-input-section">
          <input ref="fileInput" type="file" accept=".json" @change="handleFileSelect" class="file-input" />
          <div v-if="importFile" class="file-info">
            <span class="file-name">{{ importFile.name }}</span>
            <span class="file-size">{{ (importFile.size / 1024).toFixed(1) }} KB</span>
          </div>
        </div>

        <div v-if="importError" class="error-message">{{ importError }}</div>

        <div class="import-actions">
          <button @click="importSkills" :disabled="!importFile" class="import-btn">导入技能</button>
          <button @click="downloadTemplate" class="template-btn">下载模板</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skill-management-panel {
  padding: 0;
}

.skill-management-panel h3 {
  margin: 0 0 16px 0;
  color: #63b3ed;
  font-size: 14px;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 8px;
}

.sub-tabs {
  display: flex;
  background: #2d3748;
  border-radius: 6px;
  margin-bottom: 16px;
  overflow: hidden;
}

.sub-tab-btn {
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

.sub-tab-btn:hover {
  background: #4a5568;
  color: white;
}

.sub-tab-btn.active {
  background: #4a5568;
  color: white;
}

.sub-tab-icon {
  font-size: 12px;
}

.sub-tab-label {
  font-size: 9px;
  font-weight: 500;
}

.sub-tab-content {
  max-height: 50vh;
  overflow-y: auto;
}

.skill-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background: #1a202c;
  border: 1px solid #4a5568;
  border-radius: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 10px;
  color: #a0aec0;
}

.stat-value {
  font-size: 14px;
  color: #63b3ed;
  font-weight: bold;
}

.skill-section {
  margin-bottom: 20px;
}

.skill-section h4 {
  margin: 0 0 8px 0;
  color: #a0aec0;
  font-size: 12px;
  font-weight: 600;
}

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.skill-item:hover {
  background: #4a5568;
  border-color: #718096;
}

.skill-item.default-skill {
  border-left: 3px solid #38a169;
}

.skill-item.custom-skill {
  border-left: 3px solid #d69e2e;
}

.skill-info {
  flex: 1;
}

.skill-name {
  font-size: 12px;
  font-weight: 600;
  color: white;
  margin-bottom: 2px;
}

.skill-details {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: #a0aec0;
}

.skill-category,
.skill-target,
.skill-power {
  padding: 2px 4px;
  background: #1a202c;
  border-radius: 3px;
}

.skill-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #4a5568;
  border-radius: 4px;
  background: #2d3748;
  color: white;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #4a5568;
  border-color: #718096;
}

.assign-btn:hover {
  background: #3182ce;
  border-color: #63b3ed;
}

.delete-btn:hover {
  background: #e53e3e;
  border-color: #fc8181;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #a0aec0;
  font-size: 12px;
}

.skill-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 11px;
  color: #a0aec0;
  font-weight: 600;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 6px 8px;
  border: 1px solid #4a5568;
  border-radius: 4px;
  background: #2d3748;
  color: white;
  font-size: 11px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #63b3ed;
  box-shadow: 0 0 0 2px rgba(99, 179, 237, 0.2);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.error-message {
  font-size: 10px;
  color: #fc8181;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.create-btn,
.clear-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #4a5568;
  border-radius: 6px;
  background: #2d3748;
  color: white;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.create-btn:hover {
  background: #38a169;
  border-color: #68d391;
}

.clear-btn:hover {
  background: #e53e3e;
  border-color: #fc8181;
}

.import-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-section h4 {
  margin: 0;
  color: #a0aec0;
  font-size: 12px;
  font-weight: 600;
}

.import-description {
  font-size: 11px;
  color: #a0aec0;
  line-height: 1.4;
  margin: 0;
}

.file-input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-input {
  padding: 8px;
  border: 1px solid #4a5568;
  border-radius: 6px;
  background: #2d3748;
  color: white;
  font-size: 11px;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #1a202c;
  border: 1px solid #4a5568;
  border-radius: 4px;
  font-size: 10px;
}

.file-name {
  color: #63b3ed;
  font-weight: 500;
}

.file-size {
  color: #a0aec0;
}

.import-actions {
  display: flex;
  gap: 8px;
}

.import-btn,
.template-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #4a5568;
  border-radius: 6px;
  background: #2d3748;
  color: white;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.import-btn:hover {
  background: #3182ce;
  border-color: #63b3ed;
}

.import-btn:disabled {
  background: #4a5568;
  color: #a0aec0;
  cursor: not-allowed;
}

.template-btn:hover {
  background: #d69e2e;
  border-color: #f6e05e;
}

/* 滚动条样式 */
.sub-tab-content::-webkit-scrollbar {
  width: 6px;
}

.sub-tab-content::-webkit-scrollbar-track {
  background: #2d3748;
}

.sub-tab-content::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}

.sub-tab-content::-webkit-scrollbar-thumb:hover {
  background: #718096;
}
</style>
