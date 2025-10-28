<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import type { BattleParticipantExtended } from '../../composables/useBattleState';
import type { EventBus } from '../../core/EventBus';
import { TYPES } from '../../core/ServiceIdentifiers';

// Props
interface Props {
  playerData: BattleParticipantExtended | null;
  battleState: any;
}

const props = defineProps<Props>();

// 依赖注入
const eventBus = inject<EventBus>(TYPES.EventBus);

// 响应式数据
const editingData = ref<Partial<BattleParticipantExtended>>({});
const validationErrors = ref<Record<string, string>>({});

// 计算属性
const hasPlayerData = computed(() => !!props.playerData);

// 初始化编辑数据
const initializeEditingData = () => {
  if (props.playerData) {
    editingData.value = {
      id: props.playerData.id,
      name: props.playerData.name,
      hp: props.playerData.hp,
      maxHp: props.playerData.maxHp,
      mp: props.playerData.mp,
      maxMp: props.playerData.maxMp,
      level: props.playerData.level,
      stats: { ...props.playerData.stats } as any,
      skills: [...(props.playerData.skills || [])],
    };
  }
};

// 监听玩家数据变化
watch(
  () => props.playerData,
  () => {
    initializeEditingData();
  },
  { immediate: true },
);

// 验证函数
const validateValue = (field: string, value: any): string | null => {
  switch (field) {
    case 'hp':
    case 'maxHp':
    case 'mp':
    case 'maxMp':
      if (typeof value !== 'number' || value < 0 || value > 99999) {
        return '血量/魔法值必须在 0-99999 之间';
      }
      break;
    case 'level':
      if (typeof value !== 'number' || value < 1 || value > 20) {
        return '等级必须在 1-20 之间';
      }
      break;
    case 'atk':
    case 'hatk':
    case 'def':
    case 'hhp':
      if (typeof value !== 'number' || value < 0 || value > 9999) {
        return '属性值必须在 0-9999 之间';
      }
      break;
    case 'hdef':
    case 'evade':
    case 'critRate':
      if (typeof value !== 'number' || value < 0 || value > 1) {
        return '比例值必须在 0-1 之间';
      }
      break;
    case 'hit':
      if (typeof value !== 'number' || value < 0 || value > 10) {
        return '命中率必须在 0-10 之间';
      }
      break;
    case 'critDamageMultiplier':
      if (typeof value !== 'number' || value < 1 || value > 5) {
        return '暴击伤害倍数必须在 1-5 之间';
      }
      break;
  }
  return null;
};

// 更新字段值
const updateField = (field: string, value: any) => {
  // 验证值
  const error = validateValue(field, value);
  if (error) {
    validationErrors.value[field] = error;
    return;
  }

  // 清除错误
  delete validationErrors.value[field];

  // 更新数据
  if (field.startsWith('stats.')) {
    const statField = field.split('.')[1];
    if (!editingData.value.stats) {
      editingData.value.stats = {} as any;
    }
    (editingData.value.stats as any)[statField] = value;
  } else {
    (editingData.value as any)[field] = value;
  }

  // 发送更新事件
  if (eventBus && props.playerData) {
    eventBus.emit('battle:debug-update-player', {
      participantId: props.playerData.id,
      updates: { [field]: value },
    });
  }
};

// 重置到初始值
const resetToInitial = () => {
  initializeEditingData();
  validationErrors.value = {};

  if (eventBus && props.playerData) {
    eventBus.emit('battle:debug-reset-player', {
      participantId: props.playerData.id,
    });
  }
};

// 应用所有更改
const applyChanges = () => {
  if (eventBus && props.playerData) {
    eventBus.emit('battle:debug-update-player', {
      participantId: props.playerData.id,
      updates: editingData.value,
    });
  }
};

// 技能管理
const addSkill = (skill: { id: string; name: string; mpCost: number }) => {
  if (!editingData.value.skills) {
    editingData.value.skills = [];
  }
  if (!editingData.value.skills.includes(skill.id)) {
    editingData.value.skills.push(skill.id);
    updateField('skills', editingData.value.skills);
  }
};

const removeSkill = (skillId: string) => {
  if (editingData.value.skills) {
    editingData.value.skills = editingData.value.skills.filter(s => s !== skillId);
    updateField('skills', editingData.value.skills);
  }
};

// 可用技能列表
// 可用技能列表（包含MP消耗信息）
const availableSkills = [
  { id: 'power_strike', name: '重击', mpCost: 0 },
  { id: 'precise_strike', name: '精准打击', mpCost: 0 },
  { id: 'fireball', name: '火球术', mpCost: 10 },
  { id: 'defend', name: '防御', mpCost: 0 },
  { id: 'heal', name: '治疗', mpCost: 15 },
  { id: 'magic_missile', name: '魔法飞弹', mpCost: 5 },
  { id: 'shield', name: '护盾', mpCost: 8 },
];
</script>

<template>
  <div v-if="hasPlayerData" class="player-data-editor">
    <div class="editor-header">
      <h3>玩家数据编辑</h3>
      <div class="editor-actions">
        <button @click="resetToInitial" class="action-btn reset-btn" title="重置到初始值">🔄</button>
        <button @click="applyChanges" class="action-btn apply-btn" title="应用所有更改">✓</button>
      </div>
    </div>

    <div class="editor-content">
      <!-- 基础属性 -->
      <div class="field-group">
        <h4>基础属性</h4>

        <div class="field-row">
          <label class="field-label">名称:</label>
          <input
            v-model="editingData.name"
            @input="updateField('name', $event.target.value)"
            class="field-input"
            type="text"
          />
        </div>

        <div class="field-row">
          <label class="field-label">等级:</label>
          <input
            v-model.number="editingData.level"
            @input="updateField('level', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="1"
            max="20"
          />
          <span v-if="validationErrors.level" class="error-text">{{ validationErrors.level }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">当前HP:</label>
          <input
            v-model.number="editingData.hp"
            @input="updateField('hp', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="99999"
          />
          <span v-if="validationErrors.hp" class="error-text">{{ validationErrors.hp }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">最大HP:</label>
          <input
            v-model.number="editingData.maxHp"
            @input="updateField('maxHp', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="1"
            max="99999"
          />
          <span v-if="validationErrors.maxHp" class="error-text">{{ validationErrors.maxHp }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">当前MP:</label>
          <input
            v-model.number="editingData.mp"
            @input="updateField('mp', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="99999"
          />
          <span v-if="validationErrors.mp" class="error-text">{{ validationErrors.mp }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">最大MP:</label>
          <input
            v-model.number="editingData.maxMp"
            @input="updateField('maxMp', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="99999"
          />
          <span v-if="validationErrors.maxMp" class="error-text">{{ validationErrors.maxMp }}</span>
        </div>
      </div>

      <!-- 战斗属性 -->
      <div class="field-group">
        <h4>战斗属性</h4>

        <div class="field-row">
          <label class="field-label">物理攻击:</label>
          <input
            v-model.number="editingData.stats.atk"
            @input="updateField('stats.atk', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="9999"
          />
          <span v-if="validationErrors['stats.atk']" class="error-text">{{ validationErrors['stats.atk'] }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">H攻击:</label>
          <input
            v-model.number="editingData.stats.hatk"
            @input="updateField('stats.hatk', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="9999"
          />
          <span v-if="validationErrors['stats.hatk']" class="error-text">{{ validationErrors['stats.hatk'] }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">物理防御:</label>
          <input
            v-model.number="editingData.stats.def"
            @input="updateField('stats.def', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="9999"
          />
          <span v-if="validationErrors['stats.def']" class="error-text">{{ validationErrors['stats.def'] }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">H防御:</label>
          <input
            v-model.number="editingData.stats.hdef"
            @input="updateField('stats.hdef', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="1"
            step="0.01"
          />
          <span v-if="validationErrors['stats.hdef']" class="error-text">{{ validationErrors['stats.hdef'] }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">命中率:</label>
          <input
            v-model.number="editingData.stats.hit"
            @input="updateField('stats.hit', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="10"
            step="0.1"
          />
          <span v-if="validationErrors['stats.hit']" class="error-text">{{ validationErrors['stats.hit'] }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">闪避率:</label>
          <input
            v-model.number="editingData.stats.evade"
            @input="updateField('stats.evade', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="1"
            step="0.01"
          />
          <span v-if="validationErrors['stats.evade']" class="error-text">{{ validationErrors['stats.evade'] }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">暴击率:</label>
          <input
            v-model.number="editingData.stats.critRate"
            @input="updateField('stats.critRate', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="1"
            step="0.01"
          />
          <span v-if="validationErrors['stats.critRate']" class="error-text">{{
            validationErrors['stats.critRate']
          }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">暴击伤害:</label>
          <input
            v-model.number="editingData.stats.critDamageMultiplier"
            @input="updateField('stats.critDamageMultiplier', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="1"
            max="5"
            step="0.1"
          />
          <span v-if="validationErrors['stats.critDamageMultiplier']" class="error-text">{{
            validationErrors['stats.critDamageMultiplier']
          }}</span>
        </div>

        <div class="field-row">
          <label class="field-label">H血量:</label>
          <input
            v-model.number="editingData.stats.hhp"
            @input="updateField('stats.hhp', Number($event.target.value))"
            class="field-input number-input"
            type="number"
            min="0"
            max="99999"
          />
          <span v-if="validationErrors['stats.hhp']" class="error-text">{{ validationErrors['stats.hhp'] }}</span>
        </div>
      </div>

      <!-- 技能管理 -->
      <div class="field-group">
        <h4>技能管理</h4>

        <div class="skills-section">
          <div class="current-skills">
            <label class="field-label">当前技能:</label>
            <div class="skill-tags">
              <span v-for="skill in editingData.skills" :key="skill" class="skill-tag">
                {{ skill }}
                <button @click="removeSkill(skill)" class="remove-skill-btn">×</button>
              </span>
            </div>
          </div>

          <div class="add-skills">
            <label class="field-label">添加技能:</label>
            <div class="skill-buttons">
              <button
                v-for="skill in availableSkills"
                :key="skill.id"
                @click="addSkill(skill)"
                :disabled="editingData.skills?.includes(skill.id)"
                class="skill-btn"
                :title="`${skill.name} (MP消耗: ${skill.mpCost})`"
              >
                <div class="skill-name">{{ skill.name }}</div>
                <div class="skill-mp-cost">MP: {{ skill.mpCost }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="no-data-message">
    <p>没有玩家数据可编辑</p>
  </div>
</template>

<style scoped>
.player-data-editor {
  background: #1a202c;
  border-radius: 8px;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #2d3748, #4a5568);
  border-bottom: 1px solid #4a5568;
}

.editor-header h3 {
  margin: 0;
  color: #63b3ed;
  font-size: 14px;
  font-weight: 600;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #718096;
  border-radius: 6px;
  background: #2d3748;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #4a5568;
  border-color: #a0aec0;
  transform: translateY(-1px);
}

.reset-btn:hover {
  background: #e53e3e;
  border-color: #fc8181;
}

.apply-btn:hover {
  background: #38a169;
  border-color: #68d391;
}

.editor-content {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.field-group {
  margin-bottom: 20px;
}

.field-group h4 {
  margin: 0 0 12px 0;
  color: #a0aec0;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 6px;
}

.field-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.field-label {
  min-width: 80px;
  color: #e2e8f0;
  font-size: 11px;
  font-weight: 500;
}

.field-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #4a5568;
  border-radius: 4px;
  background: #2d3748;
  color: white;
  font-size: 11px;
  font-family: 'Courier New', monospace;
}

.field-input:focus {
  outline: none;
  border-color: #63b3ed;
  box-shadow: 0 0 0 1px #63b3ed;
}

.number-input {
  width: 80px;
  flex: none;
}

.error-text {
  color: #fc8181;
  font-size: 10px;
  font-style: italic;
}

.skills-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.current-skills {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.skill-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #4a5568;
  border-radius: 4px;
  font-size: 10px;
  color: white;
}

.remove-skill-btn {
  background: transparent;
  border: none;
  color: #fc8181;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.remove-skill-btn:hover {
  background: #fc8181;
  color: white;
}

.add-skills {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.skill-btn {
  padding: 6px 10px;
  border: 1px solid #4a5568;
  border-radius: 4px;
  background: #2d3748;
  color: #a0aec0;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.skill-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.skill-mp-cost {
  font-size: 9px;
  color: #63b3ed;
  font-weight: 500;
}

.skill-btn:hover:not(:disabled) {
  background: #4a5568;
  color: white;
  border-color: #63b3ed;
}

.skill-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-data-message {
  padding: 20px;
  text-align: center;
  color: #a0aec0;
  font-style: italic;
}

/* 滚动条样式 */
.editor-content::-webkit-scrollbar {
  width: 6px;
}

.editor-content::-webkit-scrollbar-track {
  background: #1a202c;
}

.editor-content::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}

.editor-content::-webkit-scrollbar-thumb:hover {
  background: #718096;
}
</style>
