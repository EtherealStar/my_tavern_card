<!-- @ts-nocheck -->
<template>
  <div
    v-if="visible"
    class="modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
  >
    <div
      class="modal-card equipment-detail-modal max-h-[90vh] w-full max-w-2xl transform animate-[subtleGlow_4s_ease-in-out_infinite_alternate] overflow-y-auto rounded-3xl bg-gradient-to-br from-white via-pink-50 to-white p-8 shadow-[var(--rune-glow)]"
    >
      <!-- 标题栏和关闭按钮 -->
      <div class="modal-header relative mb-6 flex items-center justify-between">
        <div class="modal-title text-2xl font-bold text-purple-800">✦ 装备详情 ✦</div>
        <button
          class="close-btn flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-all duration-200 hover:scale-110 hover:bg-pink-200 hover:text-pink-700"
          @click="close"
          title="关闭装备详情"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 装备详情内容 -->
      <div class="modal-body">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="flex items-center gap-3 text-purple-600">
            <div class="h-6 w-6 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600"></div>
            <span>正在加载装备详情...</span>
          </div>
        </div>

        <!-- 装备详情内容 -->
        <div v-else-if="equipment" class="equipment-detail-body">
          <!-- 装备基本信息 -->
          <div class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6">
            <div class="mb-4 flex items-center gap-4">
              <div class="equip-icon-large" v-html="getEquipmentIcon()"></div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-gray-800">{{ equipment.name || '未知装备' }}</h3>
                <p class="text-sm text-gray-500">{{ getEquipmentTypeName() }}</p>
                <div v-if="equipment.rarity" class="mt-1">
                  <span class="inline-block rounded-full px-2 py-1 text-xs font-medium" :class="getRarityClass()">
                    {{ equipment.rarity }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 装备描述 -->
            <div v-if="equipment.description" class="mb-4">
              <h4 class="mb-2 text-sm font-semibold text-gray-700">装备描述</h4>
              <p class="text-sm leading-relaxed text-gray-600">{{ equipment.description }}</p>
            </div>

            <!-- 装备等级 -->
            <div v-if="equipment.level" class="mb-4">
              <h4 class="mb-2 text-sm font-semibold text-gray-700">装备等级</h4>
              <p class="text-sm text-gray-600">等级 {{ equipment.level }}</p>
            </div>
          </div>

          <!-- 属性加成 -->
          <div
            v-if="equipment.attributes_bonus && Object.keys(equipment.attributes_bonus).length > 0"
            class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6"
          >
            <h4 class="mb-4 text-lg font-semibold text-gray-800">属性加成</h4>
            <div class="attributes-grid grid grid-cols-2 gap-3 md:grid-cols-3">
              <div v-for="(value, attrName) in equipment.attributes_bonus" :key="attrName" class="attribute-item">
                <div class="flex items-center gap-2">
                  <div class="attr-icon" v-html="getAttributeIcon(attrName)"></div>
                  <span class="text-sm text-gray-600">{{ getChineseAttributeName(attrName) }}</span>
                </div>
                <div class="text-lg font-bold" :class="value > 0 ? 'text-green-600' : 'text-red-600'">
                  {{ value > 0 ? '+' : '' }}{{ value }}
                </div>
              </div>
            </div>
          </div>

          <!-- 其他属性 -->
          <div v-if="hasOtherProperties" class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6">
            <h4 class="mb-4 text-lg font-semibold text-gray-800">其他属性</h4>
            <div class="space-y-2">
              <div v-if="equipment.durability" class="flex justify-between text-sm">
                <span class="text-gray-600">耐久度</span>
                <span class="font-medium text-gray-800">{{ equipment.durability }}</span>
              </div>
              <div v-if="equipment.weight" class="flex justify-between text-sm">
                <span class="text-gray-600">重量</span>
                <span class="font-medium text-gray-800">{{ equipment.weight }}</span>
              </div>
              <div v-if="equipment.value" class="flex justify-between text-sm">
                <span class="text-gray-600">价值</span>
                <span class="font-medium text-gray-800">{{ equipment.value }}</span>
              </div>
              <div v-if="equipment.special_effects" class="flex justify-between text-sm">
                <span class="text-gray-600">特殊效果</span>
                <span class="font-medium text-gray-800">{{ equipment.special_effects }}</span>
              </div>
            </div>
          </div>

          <!-- 装备来源信息 -->
          <div class="rounded-xl border border-pink-200 bg-white/80 p-6">
            <h4 class="mb-4 text-lg font-semibold text-gray-800">装备信息</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">装备类型</span>
                <span class="font-medium text-gray-800">{{ getEquipmentTypeName() }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">数据来源</span>
                <span class="font-medium text-purple-600">MVU 变量</span>
              </div>
              <div v-if="equipment.obtained_from" class="flex justify-between">
                <span class="text-gray-600">获得方式</span>
                <span class="font-medium text-gray-800">{{ equipment.obtained_from }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="flex items-center justify-center py-8">
          <div class="text-center text-gray-500">
            <div class="mb-2 text-4xl">⚔️</div>
            <div class="text-lg">暂无装备信息</div>
            <div class="text-sm">该栏位当前没有装备任何物品</div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="modal-actions mt-6 flex justify-between gap-3">
        <!-- 装备/卸下按钮 -->
        <div class="flex gap-3">
          <button
            v-if="!isEquipped"
            class="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-green-600 focus:ring-2 focus:ring-green-300 focus:outline-none"
            @click="handleEquip"
            :disabled="loading"
          >
            <span class="flex items-center gap-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              装备
            </span>
          </button>
          <button
            v-if="isEquipped"
            class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-orange-600 focus:ring-2 focus:ring-orange-300 focus:outline-none"
            @click="handleUnequip"
            :disabled="loading"
          >
            <span class="flex items-center gap-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              卸下
            </span>
          </button>
        </div>

        <!-- 关闭按钮 -->
        <button
          class="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-gray-600 focus:ring-2 focus:ring-gray-300 focus:outline-none"
          @click="close"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useCommandQueue } from '../composables/useCommandQueue';
import { useGameServices } from '../composables/useGameServices';

interface EquipmentItem {
  name?: string;
  description?: string;
  icon?: string;
  rarity?: string;
  level?: number;
  attributes_bonus?: Record<string, number>;
  durability?: number;
  weight?: number;
  value?: number;
  special_effects?: string;
  obtained_from?: string;
}

interface Props {
  visible: boolean;
  equipmentType: 'weapon' | 'armor' | 'accessory';
  equipment: EquipmentItem | null;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  equipmentType: 'weapon',
  equipment: null,
});

// 解构 props 以便在模板中使用
const { visible, equipmentType, equipment } = props;

const emit = defineEmits<{
  close: [];
}>();

const loading = ref(false);

// 使用指令队列和游戏服务
const { addEquipCommand, addUnequipCommand } = useCommandQueue();
const { showSuccess, showError } = useGameServices();

// 属性名映射
const ATTRIBUTE_NAME_MAP: Record<string, string> = {
  strength: '力量',
  agility: '敏捷',
  intelligence: '智力',
  constitution: '体质',
  charisma: '魅力',
  willpower: '意志',
  luck: '幸运',
};

// 装备类型名称映射
const EQUIPMENT_TYPE_NAMES: Record<string, string> = {
  weapon: '武器',
  armor: '防具',
  accessory: '饰品',
};

// 稀有度颜色映射
const RARITY_COLORS: Record<string, string> = {
  普通: 'bg-gray-100 text-gray-800',
  优秀: 'bg-green-100 text-green-800',
  精良: 'bg-blue-100 text-blue-800',
  史诗: 'bg-purple-100 text-purple-800',
  传说: 'bg-yellow-100 text-yellow-800',
  神话: 'bg-red-100 text-red-800',
};

// 计算属性
const hasOtherProperties = computed(() => {
  if (!equipment) return false;
  return !!(equipment.durability || equipment.weight || equipment.value || equipment.special_effects);
});

// 判断是否已装备
const isEquipped = computed(() => {
  return !!equipment && !!equipment.name;
});

// 方法
const close = () => {
  emit('close');
};

// 装备操作
const handleEquip = () => {
  if (!equipment) {
    showError('无法装备：装备信息无效');
    return;
  }

  const success = addEquipCommand(equipmentType, equipment);
  if (success) {
    showSuccess('装备指令已加入队列');
    close();
  } else {
    showError('无法添加装备指令');
  }
};

// 卸下操作
const handleUnequip = () => {
  const success = addUnequipCommand(equipmentType);
  if (success) {
    showSuccess('卸下指令已加入队列');
    close();
  } else {
    showError('无法添加卸下指令');
  }
};

const getEquipmentTypeName = (): string => {
  return EQUIPMENT_TYPE_NAMES[equipmentType] || '未知类型';
};

const getChineseAttributeName = (englishName: string): string => {
  return ATTRIBUTE_NAME_MAP[englishName] || englishName;
};

const getRarityClass = (): string => {
  if (!equipment?.rarity) return 'bg-gray-100 text-gray-800';
  return RARITY_COLORS[equipment.rarity] || 'bg-gray-100 text-gray-800';
};

const getEquipmentIcon = (): string => {
  if (equipment?.icon) {
    return equipment.icon;
  }

  // 默认图标
  const base =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  const close = '</svg>';

  const iconPaths: Record<string, string> = {
    weapon: '<path d="M3 21l6-6M7 17l7-7 3 3-7 7z"/><path d="M14 7l3-3 3 3-3 3"/>',
    armor: '<path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4z"/>',
    accessory: '<circle cx="12" cy="8" r="4"/><path d="M6 21c2-3 14-3 12 0"/>',
  };

  const path = iconPaths[equipmentType] || iconPaths.weapon;
  return base + path + close;
};

const getAttributeIcon = (attributeName: string): string => {
  const base =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  const close = '</svg>';

  const iconPaths: Record<string, string> = {
    strength: '<path d="M5 12h4l1-4 3 10 2-6h4"/>',
    agility: '<path d="M4 20l16-16M14 4h6v6"/>',
    intelligence: '<circle cx="12" cy="12" r="4"/><path d="M2 12h4M18 12h4M12 2v4M12 18v4"/>',
    constitution: '<rect x="6" y="6" width="12" height="12" rx="6"/>',
    charisma: '<path d="M12 21s-6-4-6-9a6 6 0 1112 0c0 5-6 9-6 9z"/>',
    willpower: '<path d="M12 3l3 7h7l-5.5 4 2 7-6.5-4.5L6.5 21l2-7L3 10h7z"/>',
    luck: '<path d="M12 2v20M2 12h20"/>',
  };

  const path = iconPaths[attributeName] || iconPaths.strength;
  return base + path + close;
};

// 监听弹窗显示状态
watch(
  () => visible,
  newVisible => {
    if (newVisible) {
      loading.value = true;
      // 模拟加载延迟
      setTimeout(() => {
        loading.value = false;
      }, 300);
    }
  },
);
</script>

<style scoped>
/* 装备详情弹窗样式 */
.equipment-detail-modal {
  max-width: 600px;
  width: 90vw;
  max-height: 85vh;
}

.modal-header {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

.close-btn {
  flex-shrink: 0;
}

.equipment-detail-body {
  max-height: 60vh;
  overflow-y: auto;
}

.equip-icon-large {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  border-radius: 12px;
  border: 2px solid #d1d5db;
}

.equip-icon-large svg {
  width: 32px;
  height: 32px;
  color: #6b7280;
}

.attr-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attr-icon svg {
  width: 16px;
  height: 16px;
  color: #6b7280;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.attribute-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

/* 响应式优化 */
@media (max-height: 600px) {
  .equipment-detail-modal {
    max-height: 90vh;
  }

  .equipment-detail-body {
    max-height: 70vh;
  }
}

@media (max-width: 480px) {
  .equipment-detail-modal {
    width: 95vw;
    padding: 16px;
  }

  .modal-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .close-btn {
    align-self: flex-end;
  }

  .attributes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
