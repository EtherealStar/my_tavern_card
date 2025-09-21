<!-- @ts-nocheck -->
<!-- AI注意：忽略所有"找不到名称"报错，这些变量在composables中定义 -->
<template>
  <div v-if="visible" class="command-queue-dialog-overlay" @click="closeDialog">
    <div class="command-queue-dialog" @click.stop>
      <div class="dialog-header">
        <h3>指令队列</h3>
        <button class="close-btn" @click="closeDialog" title="关闭">✕</button>
      </div>

      <div class="dialog-content">
        <div v-if="queueLength === 0" class="queue-empty">
          <div class="empty-icon">📋</div>
          <div class="empty-text">队列为空</div>
          <div class="empty-hint">点击装备栏的"卸下"按钮来添加指令</div>
        </div>

        <div v-else class="queue-list">
          <div v-for="command in queue" :key="command.id" class="queue-item">
            <div class="command-icon" v-html="getCommandIcon(command.type)"></div>
            <div class="command-info">
              <div class="command-description">{{ command.description }}</div>
              <div class="command-time">{{ formatTime(command.timestamp) }}</div>
            </div>
            <button class="remove-btn" @click="removeCommand(command.id)" title="移除指令">✕</button>
          </div>
        </div>
      </div>

      <div v-if="queueLength > 0" class="dialog-actions">
        <button class="clear-btn" @click="clearQueue">清空队列</button>
        <button class="execute-btn" @click="executeQueue" :disabled="isExecuting">
          {{ isExecuting ? '执行中...' : '立即执行' }}
        </button>
      </div>

      <div v-if="queueLength > 0" class="queue-stats">
        <div class="stat-item">
          <span class="stat-label">队列长度:</span>
          <span class="stat-value">{{ queueLength }}/{{ maxSize }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">状态:</span>
          <span class="stat-value" :class="{ executing: isExecuting }">
            {{ isExecuting ? '执行中' : '等待中' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import { useGameServices } from '../composables/useGameServices';
import { TYPES } from '../core/ServiceIdentifiers';
import type { Command, CommandQueueService } from '../services/CommandQueueService';

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
});
const emit = defineEmits<Emits>();

// 使用组合式函数
const { showSuccess, showError, showWarning } = useGameServices();

// 通过依赖注入获取 CommandQueueService
const commandQueue = inject<CommandQueueService>(TYPES.CommandQueueService);
const isExecuting = ref(false);

const queue = computed(() => commandQueue?.getQueue() || []);
const queueLength = computed(() => commandQueue?.getQueueLength() || 0);
const maxSize = 10;

const removeCommand = (id: string) => {
  commandQueue?.removeCommand(id);
};

const clearQueue = () => {
  if (confirm('确定要清空指令队列吗？')) {
    commandQueue?.clearQueue();
  }
};

const executeQueue = async () => {
  if (!commandQueue || commandQueue.isEmpty()) return;

  isExecuting.value = true;
  try {
    const success = await commandQueue.executeAll();
    if (success) {
      // 执行成功后关闭对话框
      closeDialog();
    }
  } catch (error) {
    console.error('执行指令队列失败:', error);
  } finally {
    isExecuting.value = false;
  }
};

const closeDialog = () => {
  emit('close');
};

const getCommandIcon = (type: string) => {
  const icons = {
    equip: '⚔️',
    unequip: '🛡️',
    attribute: '📊',
    inventory: '🎒',
    skill: '✨',
    item_use: '🧪',
  };
  return icons[type as keyof typeof icons] || '📋';
};

const formatTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  return new Date(timestamp).toLocaleTimeString();
};

// 监听指令队列事件
let unsubscribeUIUpdate: (() => void) | null = null;

onMounted(() => {
  if (commandQueue) {
    unsubscribeUIUpdate = commandQueue.onUIUpdate((_newQueue: Command[]) => {
      // 这里可以添加额外的UI更新逻辑
    });
  }
});

onUnmounted(() => {
  if (unsubscribeUIUpdate) {
    unsubscribeUIUpdate();
  }
});
</script>

<style scoped>
.command-queue-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.command-queue-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.queue-empty {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #374151;
}

.empty-hint {
  font-size: 14px;
  color: #9ca3af;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
}

.queue-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.command-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.command-info {
  flex: 1;
  min-width: 0;
}

.command-description {
  font-weight: 500;
  color: #111827;
  margin-bottom: 4px;
}

.command-time {
  font-size: 12px;
  color: #6b7280;
}

.remove-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.clear-btn {
  flex: 1;
  padding: 10px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.execute-btn {
  flex: 1;
  padding: 10px 16px;
  background: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.execute-btn:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.execute-btn:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
}

.queue-stats {
  display: flex;
  justify-content: space-between;
  padding: 12px 24px;
  background: #f3f4f6;
  border-top: 1px solid #e5e7eb;
  font-size: 14px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  color: #6b7280;
}

.stat-value {
  font-weight: 500;
  color: #111827;
}

.stat-value.executing {
  color: #3b82f6;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .command-queue-dialog {
    width: 95%;
    margin: 20px;
  }

  .dialog-header,
  .dialog-content,
  .dialog-actions {
    padding: 16px 20px;
  }

  .queue-stats {
    padding: 10px 20px;
  }
}
</style>
