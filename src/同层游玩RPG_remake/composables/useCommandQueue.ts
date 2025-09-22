import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import { TYPES } from '../core/ServiceIdentifiers';
import type { Command, CommandQueueService } from '../services/CommandQueueService';
import { CommandType } from '../services/CommandQueueService';
import { useGameServices } from './useGameServices';

/**
 * 指令队列组合式函数
 * 作为服务层和Vue层之间的桥梁，提供响应式接口和便捷方法
 */
export function useCommandQueue() {
  // 响应式状态
  const queue = ref<Command[]>([]);
  const isExecuting = ref(false);
  const queueLength = computed(() => queue.value.length);
  const isEmpty = computed(() => queue.value.length === 0);
  const maxSize = 10;

  // 服务层集成
  const commandQueueService = inject<CommandQueueService>(TYPES.CommandQueueService);

  // UI反馈服务
  const { showSuccess, showError, showWarning } = useGameServices();

  // 事件监听器清理函数
  let unsubscribeUIUpdate: (() => void) | null = null;

  // 设置事件监听器
  const setupEventListeners = () => {
    if (commandQueueService) {
      // 监听队列变化事件，同步到响应式状态
      unsubscribeUIUpdate = commandQueueService.onUIUpdate((newQueue: Command[]) => {
        queue.value = [...newQueue];
      });

      // 监听执行状态变化
      const eventBus = (window as any).__RPG_EVENT_BUS__;
      if (eventBus) {
        eventBus.on('command-queue:executing', () => {
          isExecuting.value = true;
        });

        eventBus.on('command-queue:executed', () => {
          isExecuting.value = false;
        });

        eventBus.on('command-queue:error', () => {
          isExecuting.value = false;
        });
      }
    }
  };

  // 清理事件监听器
  const cleanupEventListeners = () => {
    if (unsubscribeUIUpdate) {
      unsubscribeUIUpdate();
      unsubscribeUIUpdate = null;
    }
  };

  // 指令操作方法
  const addCommand = (command: Omit<Command, 'id' | 'timestamp'>): boolean => {
    if (!commandQueueService) {
      showError('指令队列服务不可用');
      return false;
    }

    const success = commandQueueService.addCommand(command);
    if (success) {
      showSuccess(`操作已加入队列: ${command.description}`);
    } else {
      showError('无法添加指令到队列');
    }
    return success;
  };

  const removeCommand = (id: string): boolean => {
    if (!commandQueueService) {
      return false;
    }
    return commandQueueService.removeCommand(id);
  };

  const clearQueue = (): void => {
    if (!commandQueueService) {
      return;
    }
    commandQueueService.clearQueue();
    showSuccess('指令队列已清空');
  };

  // 执行协调方法
  const executeBeforeMessage = async (): Promise<boolean> => {
    if (!commandQueueService || commandQueueService.isEmpty()) {
      return true; // 没有指令需要执行
    }

    isExecuting.value = true;
    try {
      const success = await commandQueueService.executeAll();
      if (success) {
        showSuccess('指令已执行完成');
      } else {
        showWarning('部分指令执行失败');
      }
      return success;
    } catch (error) {
      console.error('[useCommandQueue] 执行指令队列失败:', error);
      showError('指令队列执行异常');
      return false;
    } finally {
      isExecuting.value = false;
    }
  };

  // 便捷方法 - 装备相关
  const addEquipCommand = (type: 'weapon' | 'armor' | 'accessory', item: any): boolean => {
    if (!item || !item.name) {
      showError('无效的装备物品');
      return false;
    }

    const typeNames = {
      weapon: '武器',
      armor: '防具',
      accessory: '饰品',
    };

    return addCommand({
      type: CommandType.EQUIP,
      action: `equip.${type}`,
      params: { [type]: item, reason: '用户操作' },
      description: `装备${typeNames[type]}: ${item.name}`,
    });
  };

  const addUnequipCommand = (type: 'weapon' | 'armor' | 'accessory'): boolean => {
    const typeNames = {
      weapon: '武器',
      armor: '防具',
      accessory: '饰品',
    };

    return addCommand({
      type: CommandType.UNEQUIP,
      action: `unequip.${type}`,
      params: { reason: '用户操作' },
      description: `卸下${typeNames[type]}`,
    });
  };

  // 便捷方法 - 属性相关
  const addAttributeCommand = (attribute: string, value: number, reason: string = '用户操作'): boolean => {
    return addCommand({
      type: CommandType.ATTRIBUTE,
      action: 'attribute.set',
      params: { attribute, value, reason },
      description: `设置属性 ${attribute} 为 ${value}`,
    });
  };

  // 便捷方法 - 背包相关
  const addInventoryAddCommand = (type: string, item: any, reason: string = '用户操作'): boolean => {
    if (!item || !item.name) {
      showError('无效的物品');
      return false;
    }

    return addCommand({
      type: CommandType.INVENTORY,
      action: 'inventory.add',
      params: { type, item, reason },
      description: `添加物品到背包: ${item.name}`,
    });
  };

  const addInventoryRemoveCommand = (type: string, itemIndex: number, reason: string = '用户操作'): boolean => {
    return addCommand({
      type: CommandType.INVENTORY,
      action: 'inventory.remove',
      params: { type, itemIndex, reason },
      description: `从背包移除物品 (索引: ${itemIndex})`,
    });
  };

  // 获取队列统计信息
  const getQueueStats = () => {
    if (!commandQueueService) {
      return null;
    }

    return {
      length: queueLength.value,
      maxSize,
      isEmpty: isEmpty.value,
      isExecuting: isExecuting.value,
      performanceMetrics: commandQueueService.getPerformanceMetrics(),
    };
  };

  // 获取错误日志
  const getErrorLog = () => {
    if (!commandQueueService) {
      return [];
    }
    return commandQueueService.getErrorLog();
  };

  // 清空错误日志
  const clearErrorLog = () => {
    if (!commandQueueService) {
      return;
    }
    commandQueueService.clearErrorLog();
    showSuccess('错误日志已清空');
  };

  // 生命周期管理
  onMounted(() => {
    setupEventListeners();
  });

  onUnmounted(() => {
    cleanupEventListeners();
  });

  return {
    // 响应式状态
    queue: computed(() => queue.value),
    queueLength,
    isEmpty,
    isExecuting: computed(() => isExecuting.value),
    maxSize,

    // 基础操作方法
    addCommand,
    removeCommand,
    clearQueue,
    executeBeforeMessage,

    // 便捷方法 - 装备
    addEquipCommand,
    addUnequipCommand,

    // 便捷方法 - 属性
    addAttributeCommand,

    // 便捷方法 - 背包
    addInventoryAddCommand,
    addInventoryRemoveCommand,

    // 统计和调试
    getQueueStats,
    getErrorLog,
    clearErrorLog,

    // 生命周期
    setupEventListeners,
    cleanupEventListeners,
  };
}
