import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import { TYPES } from '../core/ServiceIdentifiers';
import type {
  Command,
  CommandConflict,
  CommandQueueHooks,
  CommandQueueService,
  ExecutionResult,
} from '../services/CommandQueueService';
import { CommandType } from '../services/CommandQueueService';
import type { StatDataBindingService } from '../services/StatDataBindingService';
import { useStatData } from './useStatData';
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
  const statDataBinding = inject<StatDataBindingService>(TYPES.StatDataBindingService);

  // UI反馈服务（已移除toast提示，不再使用）
  // const { showSuccess, showError, showWarning } = useGameServices();

  // 事件监听器清理函数
  let unsubscribeUIUpdate: (() => void) | null = null;

  // 物品结构验证辅助函数
  const validateItemStructure = (item: any): boolean => {
    return item && typeof item === 'object' && typeof item.name === 'string' && item.name.trim().length > 0;
  };

  // 检测指令冲突
  const detectConflicts = (commands: Command[]): CommandConflict[] => {
    const conflicts: CommandConflict[] = [];
    const equipmentSlots = new Set<string>();
    const inventoryOperations = new Map<string, number>();

    for (const command of commands) {
      // 检测装备槽位冲突
      if (command.type === 'equip' || command.type === 'unequip' || command.type === 'equip_swap') {
        // 从 action 中提取槽位类型，例如 'equip.weapon' -> 'weapon'
        let slot: string | undefined;
        if (command.type === 'equip_swap') {
          slot = command.params.type; // equip_swap 指令的 params 中有 type 字段
        } else {
          // 从 action 中提取，例如 'equip.weapon' -> 'weapon'
          const actionParts = command.action.split('.');
          if (actionParts.length > 1) {
            slot = actionParts[1];
          }
        }

        if (slot) {
          if (equipmentSlots.has(slot)) {
            conflicts.push({
              type: 'equipment_slot_conflict',
              commands: commands.filter(c => {
                if (c.type === 'equip_swap') {
                  return c.params.type === slot;
                } else {
                  const parts = c.action.split('.');
                  return parts.length > 1 && parts[1] === slot;
                }
              }),
              message: `装备槽位 ${slot} 存在冲突操作`,
            });
          }
          equipmentSlots.add(slot);
        }
      }

      // 检测背包操作冲突
      if (command.type === 'inventory') {
        const key = `${command.params.type}_${command.params.itemIndex}`;
        const count = inventoryOperations.get(key) || 0;
        inventoryOperations.set(key, count + 1);

        if (count > 0) {
          conflicts.push({
            type: 'inventory_operation_conflict',
            commands: commands.filter(
              c => c.params.type === command.params.type && c.params.itemIndex === command.params.itemIndex,
            ),
            message: `背包操作冲突: ${command.params.type}[${command.params.itemIndex}]`,
          });
        }
      }
    }

    return conflicts;
  };

  // 验证数据一致性
  const validateDataConsistency = async (): Promise<boolean> => {
    if (!statDataBinding) {
      return true; // 如果服务不可用，跳过验证
    }

    try {
      const [equipment, inventory, attributes] = await Promise.all([
        statDataBinding.getMvuEquipment(),
        statDataBinding.getMvuInventory(),
        statDataBinding.getMvuCurrentAttributes(),
      ]);

      // 验证装备数据
      for (const [slot, item] of Object.entries(equipment)) {
        if (item && !validateItemStructure(item)) {
          console.error(`[CommandQueue] 装备数据无效: ${slot}`, item);
          return false;
        }
      }

      // 验证背包数据
      for (const [type, items] of Object.entries(inventory)) {
        if (!Array.isArray(items)) {
          console.error(`[CommandQueue] 背包数据格式错误: ${type}`, items);
          return false;
        }
      }

      // 验证属性数据
      for (const [attr, value] of Object.entries(attributes)) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          console.error(`[CommandQueue] 属性数据无效: ${attr}`, value);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[CommandQueue] 数据一致性验证失败:', error);
      return false;
    }
  };

  // 自定义指令执行器 - 处理升级指令
  const executeCommand = async (command: Command): Promise<ExecutionResult | null> => {
    // 如果是升级指令，使用组合式函数处理
    if (command.type === CommandType.LEVEL_UP) {
      try {
        // 延迟导入 useStatData 以避免循环依赖
        const { applyLevelUp } = useStatData();
        const success = await applyLevelUp(command.params.newLevel, command.params.reason);
        return { command, success, result: success };
      } catch (error) {
        return {
          command,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
    // 其他指令返回 null，让服务层使用默认处理
    return null;
  };

  // 设置事件监听器
  const setupEventListeners = () => {
    if (commandQueueService) {
      // 设置钩子函数
      const hooks: CommandQueueHooks = {
        detectConflicts,
        validateDataConsistency,
        executeCommand, // 添加自定义执行器
      };
      commandQueueService.setHooks(hooks);

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
      return false;
    }

    const success = commandQueueService.addCommand(command);
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
  };

  // 执行协调方法
  const executeBeforeMessage = async (): Promise<boolean> => {
    if (!commandQueueService || commandQueueService.isEmpty()) {
      return true; // 没有指令需要执行
    }

    isExecuting.value = true;
    try {
      const success = await commandQueueService.executeAll();
      return success;
    } catch (error) {
      console.error('[useCommandQueue] 执行指令队列失败:', error);
      return false;
    } finally {
      isExecuting.value = false;
    }
  };

  // 便捷方法 - 装备相关
  const addEquipCommand = (type: 'weapon' | 'armor' | 'accessory', item: any): boolean => {
    if (!item || !item.name) {
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

  // 便捷方法 - 装备更换
  const addEquipSwapCommand = (type: 'weapon' | 'armor' | 'accessory', newItem: any, currentItem: any): boolean => {
    if (!newItem || !newItem.name) {
      return false;
    }

    const typeNames = {
      weapon: '武器',
      armor: '防具',
      accessory: '饰品',
    };

    const currentItemName = currentItem?.name || '无';
    const newItemName = newItem.name;

    return addCommand({
      type: CommandType.EQUIP_SWAP,
      action: `equip_swap.${type}`,
      params: {
        type,
        newItem,
        currentItem,
        reason: '用户操作',
      },
      description: `更换${typeNames[type]}: ${currentItemName} → ${newItemName}`,
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

  // 便捷方法 - 升级相关
  const addLevelUpCommand = (newLevel: number, reason: string = '自动升级'): boolean => {
    if (!Number.isFinite(newLevel) || newLevel < 1 || newLevel > 20) {
      console.warn('[useCommandQueue] 无效的等级:', newLevel);
      return false;
    }

    return addCommand({
      type: CommandType.LEVEL_UP,
      action: 'level_up.apply',
      params: { newLevel, reason },
      description: `升级到等级 ${newLevel}`,
      priority: 100, // 设置较高优先级，确保优先执行
      nonRemovable: true, // 标记为不可删除
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
    addEquipSwapCommand,

    // 便捷方法 - 属性
    addAttributeCommand,

    // 便捷方法 - 背包
    addInventoryAddCommand,
    addInventoryRemoveCommand,

    // 便捷方法 - 升级
    addLevelUpCommand,

    // 统计和调试
    getQueueStats,
    getErrorLog,
    clearErrorLog,

    // 生命周期
    setupEventListeners,
    cleanupEventListeners,
  };
}
