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

        <!-- 背包物品列表 -->
        <div v-else class="equipment-detail-body">
          <!-- 当前装备信息 -->
          <div v-if="equipment" class="mb-6 rounded-xl border border-pink-200 bg-white/80 p-6">
            <h4 class="mb-4 text-lg font-semibold text-gray-800">当前装备</h4>
            <div class="flex items-center gap-4">
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
              <button
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
          </div>

          <!-- 背包物品列表 -->
          <div class="rounded-xl border border-pink-200 bg-white/80 p-6">
            <h4 class="mb-4 text-lg font-semibold text-gray-800">
              背包中的{{ getEquipmentTypeName() }} ({{ inventoryItems.length }}件)
            </h4>

            <div v-if="inventoryItems.length === 0" class="flex items-center justify-center py-8">
              <div class="text-center text-gray-500">
                <div class="mb-2 text-4xl">📦</div>
                <div class="text-lg">背包中没有{{ getEquipmentTypeName() }}</div>
                <div class="text-sm">去探索世界寻找更多装备吧！</div>
              </div>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(item, index) in inventoryItems"
                :key="index"
                class="equipment-item-card relative rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-pink-300 hover:shadow-md"
                :class="{ 'border-green-300 bg-green-50': isItemCurrentlyEquipped(item) }"
              >
                <!-- 当前装备标记 -->
                <div v-if="isItemCurrentlyEquipped(item)" class="absolute -top-2 -right-2">
                  <div class="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="equip-icon" v-html="getItemIcon(item)"></div>
                  <div class="flex-1">
                    <h5 class="text-lg font-semibold text-gray-800">{{ item.name || '未知装备' }}</h5>
                    <p v-if="item.description" class="text-sm text-gray-600">{{ item.description }}</p>
                    <div v-if="item.rarity" class="mt-1">
                      <span
                        class="inline-block rounded-full px-2 py-1 text-xs font-medium"
                        :class="getItemRarityClass(item)"
                      >
                        {{ item.rarity }}
                      </span>
                    </div>
                    <div v-if="item.attributes_bonus && Object.keys(item.attributes_bonus).length > 0" class="mt-2">
                      <div class="flex flex-wrap gap-2">
                        <span
                          v-for="(value, attrName) in item.attributes_bonus"
                          :key="attrName"
                          class="text-xs text-gray-600"
                        >
                          {{ getChineseAttributeName(attrName) }}{{ value > 0 ? '+' : '' }}{{ value }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    v-if="!isItemCurrentlyEquipped(item)"
                    class="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-green-600 focus:ring-2 focus:ring-green-300 focus:outline-none"
                    @click="handleEquip(item)"
                    :disabled="loading"
                  >
                    <span class="flex items-center gap-2">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      {{ equipment && equipment.name ? '更换' : '装备' }}
                    </span>
                  </button>
                  <div v-else class="px-4 py-2 text-sm font-medium text-green-600">当前装备</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="modal-actions mt-6 flex justify-end gap-3">
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
import { ref, toRefs, watch } from 'vue';
import { useCommandQueue } from '../composables/useCommandQueue';
// import { useGameServices } from '../composables/useGameServices';

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
  inventoryItems: EquipmentItem[]; // 背包中对应装备类型的物品列表
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  equipmentType: 'weapon',
  equipment: null,
  inventoryItems: () => [],
});

// 解构 props 以便在模板中使用
const { equipmentType, equipment, inventoryItems, visible } = toRefs(props);

const emit = defineEmits<{
  close: [];
}>();

const loading = ref(false);

// 使用指令队列和游戏服务
const { addEquipCommand, addUnequipCommand, addEquipSwapCommand } = useCommandQueue();
// showSuccess, showError 暂未使用

// 属性名映射
const ATTRIBUTE_NAME_MAP: Record<string, string> = {
  strength: '力量',
  agility: '敏捷',
  defense: '防御',
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

// 计算属性已移除，不再需要

// 方法
const close = () => {
  emit('close');
};

// 装备操作
const handleEquip = (item: EquipmentItem) => {
  if (!item) {
    return;
  }

  // 如果当前有装备，使用更换指令；否则使用装备指令
  if (equipment.value && equipment.value.name) {
    const success = addEquipSwapCommand(equipmentType.value, item, equipment.value);
    if (success) {
      close();
    }
  } else {
    const success = addEquipCommand(equipmentType.value, item);
    if (success) {
      close();
    }
  }
};

// 卸下操作
const handleUnequip = () => {
  const success = addUnequipCommand(equipmentType.value);
  if (success) {
    close();
  }
};

// 检查物品是否为当前装备
const isItemCurrentlyEquipped = (item: EquipmentItem): boolean => {
  return !!(equipment.value && item.name === equipment.value.name);
};

const getEquipmentTypeName = (): string => {
  const typeName = EQUIPMENT_TYPE_NAMES[equipmentType.value];
  if (typeName) {
    return typeName;
  }

  // 如果映射中没有找到，根据 equipmentType 值返回默认名称
  switch (equipmentType.value) {
    case 'weapon':
      return '武器';
    case 'armor':
      return '防具';
    case 'accessory':
      return '饰品';
    default:
      return '装备';
  }
};

const getChineseAttributeName = (englishName: string): string => {
  return ATTRIBUTE_NAME_MAP[englishName] || englishName;
};

const getRarityClass = (): string => {
  if (!equipment.value?.rarity) return 'bg-gray-100 text-gray-800';
  return RARITY_COLORS[equipment.value.rarity] || 'bg-gray-100 text-gray-800';
};

const getItemRarityClass = (item: EquipmentItem): string => {
  if (!item?.rarity) return 'bg-gray-100 text-gray-800';
  return RARITY_COLORS[item.rarity] || 'bg-gray-100 text-gray-800';
};

const getEquipmentIcon = (): string => {
  if (equipment.value?.icon) {
    return equipment.value.icon;
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

  const path = iconPaths[equipmentType.value] || iconPaths.weapon;
  return base + path + close;
};

const getItemIcon = (item: EquipmentItem): string => {
  if (item?.icon) {
    return item.icon;
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

  const path = iconPaths[equipmentType.value] || iconPaths.weapon;
  return base + path + close;
};

// getAttributeIcon 函数已移除，不再使用

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

.equipment-item-card {
  position: relative;
  transition: all 0.2s ease;
}

.equipment-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.equip-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  border-radius: 8px;
  border: 2px solid #d1d5db;
  flex-shrink: 0;
}

.equip-icon svg {
  width: 24px;
  height: 24px;
  color: #6b7280;
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
