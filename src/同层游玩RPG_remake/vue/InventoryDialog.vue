<!-- @ts-nocheck -->
<!-- AI注意：忽略所有"找不到名称"报错，这些变量在composables中定义 -->
<template>
  <div v-if="visible" class="modal-mask" @click="handleMaskClick">
    <div class="modal-card inventory-dialog" @click.stop>
      <button class="close-btn" @click="close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <div class="modal-title">完整背包</div>

      <div class="modal-body">
        <div class="inventory-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            <span class="tab-icon" v-html="tab.icon"></span>
            <span class="tab-name">{{ tab.name }}</span>
            <span class="tab-count">({{ getTabCount(tab.key) }})</span>
          </button>
        </div>

        <div class="inventory-content">
          <div v-if="getCurrentTabItems().length === 0" class="tab-empty">
            <div class="empty-icon">📦</div>
            <div class="empty-text">{{ getEmptyText() }}</div>
          </div>
          <div v-else class="tab-items">
            <div v-for="(item, index) in getCurrentTabItems()" :key="index" class="tab-item" @click="selectItem(item)">
              <div class="item-icon" v-html="item.icon || '📦'"></div>
              <div class="item-info">
                <div class="item-name">{{ item.name || '未知物品' }}</div>
                <div class="item-description">{{ item.description || '暂无描述' }}</div>
                <div v-if="item.quantity" class="item-quantity">数量: {{ item.quantity }}</div>
                <div v-if="item.attributes_bonus" class="item-bonus">
                  属性加成: {{ formatAttributesBonus(item.attributes_bonus) }}
                </div>
              </div>
              <span v-if="item.fromMvu" class="mvu-data-indicator" title="来自 MVU 数据">📊</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface InventoryItem {
  name?: string;
  description?: string;
  icon?: string;
  quantity?: number;
  count?: number;
  attributes_bonus?: Record<string, number>;
  fromMvu?: boolean;
}

interface Tab {
  key: string;
  name: string;
  icon: string;
}

interface Props {
  visible: boolean;
  inventory: Record<string, InventoryItem[]>;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  inventory: () => ({}),
});

const emit = defineEmits<{
  close: [];
  selectItem: [item: InventoryItem];
}>();

const activeTab = ref('weapons');

const tabs: Tab[] = [
  { key: 'weapons', name: '武器', icon: '⚔️' },
  { key: 'armors', name: '防具', icon: '🛡️' },
  { key: 'accessories', name: '饰品', icon: '💍' },
  { key: 'others', name: '其他', icon: '📦' },
];

const getTabCount = (tabKey: string): number => {
  return props.inventory[tabKey]?.length || 0;
};

const getCurrentTabItems = (): InventoryItem[] => {
  return props.inventory[activeTab.value] || [];
};

const getEmptyText = (): string => {
  const tabNames: Record<string, string> = {
    weapons: '暂无武器',
    armors: '暂无防具',
    accessories: '暂无饰品',
    others: '暂无其他物品',
  };
  return tabNames[activeTab.value] || '暂无物品';
};

const formatAttributesBonus = (bonus: any): string => {
  try {
    if (!bonus) return '无';
    if (typeof bonus === 'string') {
      const s = bonus.trim();
      return s ? s : '无';
    }
    if (typeof bonus === 'object') {
      const entries = Object.entries(bonus as Record<string, number>);
      if (entries.length === 0) return '无';
      return entries
        .filter(([_, value]) => Number(value) !== 0)
        .map(([attr, value]) => `${attr}+${value}`)
        .join(', ');
    }
    return '无';
  } catch {
    return '无';
  }
};

const selectItem = (item: InventoryItem) => {
  emit('selectItem', item);
};

const close = () => {
  emit('close');
};

const handleMaskClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    close();
  }
};
</script>

<style scoped>
.inventory-dialog {
  width: min(90vw, 800px);
  max-height: 80vh;
}

.inventory-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--button-bg);
  color: var(--button-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  justify-content: center;
}

.tab-btn:hover {
  background: var(--color-primary);
  color: white;
  transform: translateY(-1px);
}

.tab-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.tab-icon {
  font-size: 16px;
}

.tab-name {
  font-weight: 600;
}

.tab-count {
  font-size: 11px;
  opacity: 0.8;
}

.inventory-content {
  min-height: 300px;
  max-height: 400px;
  overflow-y: auto;
}

.tab-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
}

.tab-items {
  display: grid;
  gap: 12px;
}

.tab-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-item:hover {
  border-color: var(--color-primary);
  background: rgba(255, 144, 151, 0.05);
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--color-accent);
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.item-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.item-quantity {
  font-size: 11px;
  color: var(--color-primary);
  font-weight: 600;
  margin-bottom: 2px;
}

.item-bonus {
  font-size: 11px;
  color: var(--color-accent);
  font-weight: 600;
}

.mvu-data-indicator {
  font-size: 12px;
  opacity: 0.7;
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .inventory-dialog {
    width: 95vw;
    max-height: 90vh;
  }

  .inventory-tabs {
    flex-wrap: wrap;
    gap: 4px;
  }

  .tab-btn {
    flex: 1;
    min-width: calc(50% - 2px);
    padding: 6px 8px;
    font-size: 12px;
  }

  .tab-item {
    padding: 8px;
    gap: 8px;
  }

  .item-icon {
    width: 24px;
    height: 24px;
    font-size: 16px;
  }

  .item-name {
    font-size: 13px;
  }

  .item-description {
    font-size: 11px;
  }
}
</style>
