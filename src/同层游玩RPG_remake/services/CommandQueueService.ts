import { inject, injectable } from 'inversify';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { StatDataBindingService } from './StatDataBindingService';

// 指令类型枚举
export enum CommandType {
  EQUIP = 'equip', // 装备物品
  UNEQUIP = 'unequip', // 卸下装备
  EQUIP_SWAP = 'equip_swap', // 更换装备（将旧装备放入背包，新装备装备上）
  ATTRIBUTE = 'attribute', // 属性修改
  INVENTORY = 'inventory', // 背包操作
  SKILL = 'skill', // 技能使用
  ITEM_USE = 'item_use', // 物品使用
  LEVEL_UP = 'level_up', // 升级
}

// 指令接口
export interface Command {
  id: string; // 唯一标识
  type: CommandType; // 指令类型
  action: string; // 具体操作名称
  params: Record<string, any>; // 操作参数
  description: string; // 用户友好的描述
  timestamp: number; // 创建时间
  priority?: number; // 优先级（可选）
  dependencies?: string[]; // 依赖的指令ID（可选）
  nonRemovable?: boolean; // 是否不可删除（可选）
}

// 队列状态
export interface QueueState {
  commands: Command[]; // 指令列表
  maxSize: number; // 最大队列长度
  isExecuting: boolean; // 是否正在执行
  lastExecuted: number; // 最后执行时间
}

// 执行结果
export interface ExecutionResult {
  command: Command;
  success: boolean;
  result?: any;
  error?: string;
}

// 指令冲突
export interface CommandConflict {
  type: string;
  commands: Command[];
  message: string;
}

// 指令队列钩子接口
export interface CommandQueueHooks {
  // 冲突检测
  detectConflicts?: (commands: Command[]) => CommandConflict[];

  // 数据一致性验证
  validateDataConsistency?: () => Promise<boolean>;

  // 自定义指令执行器（可选）
  // 如果返回 null，则使用默认的 COMMAND_MAPPING 处理
  executeCommand?: (command: Command) => Promise<ExecutionResult | null>;
}

@injectable()
export class CommandQueueService {
  private queue: Command[] = [];
  private maxSize: number = 10;
  private isExecuting: boolean = false;
  private eventBus: EventBus;
  private statDataBinding: StatDataBindingService;
  private performanceMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    maxExecutionTime: 0,
  };
  private errorLog: Array<{
    timestamp: Date;
    error: string;
    command?: Command;
    context?: any;
  }> = [];
  private uiUpdateCallbacks = new Set<(queue: Command[]) => void>();
  private cleanupTasks = new Set<() => void>();
  private maxExecutionTime = 5000; // 5秒超时
  private executionTimeout: number | null = null;
  private hooks?: CommandQueueHooks;

  constructor(
    @inject(TYPES.EventBus) eventBus: EventBus,
    @inject(TYPES.StatDataBindingService) statDataBinding: StatDataBindingService,
  ) {
    this.eventBus = eventBus;
    this.statDataBinding = statDataBinding;

    // 注册页面卸载清理
    this.registerCleanup(() => {
      window.removeEventListener('pagehide', this.handlePageHide);
    });

    window.addEventListener('pagehide', this.handlePageHide.bind(this));
  }

  // 添加指令到队列
  addCommand(command: Omit<Command, 'id' | 'timestamp'>): boolean {
    if (this.queue.length >= this.maxSize) {
      console.warn('[CommandQueue] 队列已满，无法添加新指令');
      return false;
    }

    const newCommand: Command = {
      ...command,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.queue.push(newCommand);
    this.eventBus.emit('command-queue:added', newCommand);
    this.notifyUIUpdate();
    return true;
  }

  // 移除指令
  removeCommand(id: string): boolean {
    const index = this.queue.findIndex(cmd => cmd.id === id);
    if (index === -1) return false;

    const command = this.queue[index];
    // 检查是否为不可删除的指令
    if (command.nonRemovable === true) {
      console.warn('[CommandQueue] 无法删除不可删除的指令:', command.description);
      return false;
    }

    const removed = this.queue.splice(index, 1)[0];
    this.eventBus.emit('command-queue:removed', removed);
    this.notifyUIUpdate();
    return true;
  }

  // 清空队列
  clearQueue(): void {
    // 保留不可删除的指令
    const nonRemovableCommands = this.queue.filter(cmd => cmd.nonRemovable === true);
    const cleared = this.queue.filter(cmd => cmd.nonRemovable !== true);

    this.queue = nonRemovableCommands;

    if (cleared.length > 0) {
      this.eventBus.emit('command-queue:cleared', cleared);
      this.notifyUIUpdate();
    }

    if (nonRemovableCommands.length > 0) {
      console.log(`[CommandQueue] 保留了 ${nonRemovableCommands.length} 个不可删除的指令`);
    }
  }

  // 执行所有指令
  async executeAll(): Promise<boolean> {
    if (this.isExecuting || this.queue.length === 0) {
      return false;
    }

    // 检查指令冲突（使用钩子函数）
    if (this.hooks?.detectConflicts) {
      const conflicts = this.hooks.detectConflicts(this.queue);
      if (conflicts.length > 0) {
        console.warn('[CommandQueue] 检测到指令冲突:', conflicts);
        this.eventBus.emit('command-queue:conflicts', conflicts);
        return false;
      }
    }

    this.isExecuting = true;
    this.eventBus.emit('command-queue:executing', this.queue);

    const startTime = performance.now();
    this.performanceMetrics.totalExecutions++;

    // 设置执行超时
    this.executionTimeout = window.setTimeout(() => {
      console.error('[CommandQueue] 指令执行超时');
      this.eventBus.emit('command-queue:timeout');
    }, this.maxExecutionTime);

    try {
      const executor = new CommandExecutor(this.statDataBinding, this.hooks);
      const results = await executor.executeBatch(this.queue);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 更新性能指标
      const allSuccess = results.every((r: ExecutionResult) => r.success);
      if (allSuccess) {
        this.performanceMetrics.successfulExecutions++;
      } else {
        this.performanceMetrics.failedExecutions++;
      }

      this.performanceMetrics.averageExecutionTime =
        (this.performanceMetrics.averageExecutionTime * (this.performanceMetrics.totalExecutions - 1) + executionTime) /
        this.performanceMetrics.totalExecutions;

      if (executionTime > this.performanceMetrics.maxExecutionTime) {
        this.performanceMetrics.maxExecutionTime = executionTime;
      }

      // 验证数据一致性（使用钩子函数）
      if (this.hooks?.validateDataConsistency) {
        const dataConsistent = await this.hooks.validateDataConsistency();
        if (!dataConsistent) {
          console.warn('[CommandQueue] 数据一致性验证失败');
          this.logError('数据一致性验证失败', undefined, { results, executionTime });
        }
      }

      // 清空已执行的指令
      this.queue = [];
      this.eventBus.emit('command-queue:executed', results);
      this.notifyUIUpdate();

      console.log(`[CommandQueue] 执行完成，耗时: ${executionTime.toFixed(2)}ms`);
      return allSuccess;
    } catch (error) {
      this.performanceMetrics.failedExecutions++;
      console.error('[CommandQueue] 执行指令失败:', error);
      this.eventBus.emit('command-queue:error', error);
      this.logError('执行指令失败', undefined, error);
      return false;
    } finally {
      this.isExecuting = false;
      if (this.executionTimeout) {
        clearTimeout(this.executionTimeout);
        this.executionTimeout = null;
      }
    }
  }

  // 获取队列状态
  getQueue(): Command[] {
    return [...this.queue];
  }

  // 获取队列长度
  getQueueLength(): number {
    return this.queue.length;
  }

  // 检查队列是否为空
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  // 获取性能指标
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  // 获取错误日志
  getErrorLog() {
    return [...this.errorLog];
  }

  // 清空错误日志
  clearErrorLog() {
    this.errorLog = [];
  }

  // 注册UI更新回调
  onUIUpdate(callback: (queue: Command[]) => void): () => void {
    this.uiUpdateCallbacks.add(callback);
    return () => this.uiUpdateCallbacks.delete(callback);
  }

  // 设置钩子函数
  public setHooks(hooks: CommandQueueHooks): void {
    this.hooks = hooks;
  }

  // 清理所有资源
  public cleanup(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('[CommandQueue] 清理任务执行失败:', error);
      }
    });
    this.cleanupTasks.clear();

    // 清理队列
    this.queue = [];
    this.isExecuting = false;

    // 清理事件监听
    this.eventBus.off('command-queue:added', () => {});
    this.eventBus.off('command-queue:removed', () => {});
    this.eventBus.off('command-queue:cleared', () => {});
    this.eventBus.off('command-queue:executing', () => {});
    this.eventBus.off('command-queue:executed', () => {});
    this.eventBus.off('command-queue:error', () => {});
    this.eventBus.off('command-queue:conflicts', () => {});
    this.eventBus.off('command-queue:timeout', () => {});
  }

  // 通知UI更新
  private notifyUIUpdate(): void {
    const queue = [...this.queue];
    this.uiUpdateCallbacks.forEach(callback => {
      try {
        callback(queue);
      } catch (error) {
        console.error('[CommandQueue] UI更新回调执行失败:', error);
      }
    });
  }

  // 记录错误
  private logError(error: string, command?: Command, context?: any): void {
    const logEntry = {
      timestamp: new Date(),
      error,
      command,
      context,
    };

    this.errorLog.push(logEntry);

    // 限制日志数量，避免内存泄漏
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-50);
    }

    console.error('[CommandQueue] 错误日志:', logEntry);
  }

  // 注册清理任务
  private registerCleanup(task: () => void): void {
    this.cleanupTasks.add(task);
  }

  // 处理页面卸载
  private handlePageHide(): void {
    this.cleanup();
  }

  // 生成唯一ID
  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 指令到StatDataBindingService方法的映射
export const COMMAND_MAPPING = {
  // 装备相关
  'equip.weapon': { method: 'equipWeapon', params: ['weapon', 'reason'] },
  'equip.armor': { method: 'equipArmor', params: ['armor', 'reason'] },
  'equip.accessory': { method: 'equipAccessory', params: ['accessory', 'reason'] },
  'unequip.weapon': { method: 'unequipWeapon', params: ['reason'] },
  'unequip.armor': { method: 'unequipArmor', params: ['reason'] },
  'unequip.accessory': { method: 'unequipAccessory', params: ['reason'] },

  // 装备更换（新增）
  'equip_swap.weapon': { method: 'swapEquipment', params: ['weapon', 'newWeapon', 'reason'] },
  'equip_swap.armor': { method: 'swapEquipment', params: ['armor', 'newArmor', 'reason'] },
  'equip_swap.accessory': { method: 'swapEquipment', params: ['accessory', 'newAccessory', 'reason'] },

  // 属性相关
  'attribute.set': { method: 'setBaseAttribute', params: ['attribute', 'value', 'reason'] },
  'attribute.update': { method: 'updateBaseAttributes', params: ['attributes', 'reason'] },

  // 背包相关
  'inventory.add': { method: 'addToInventory', params: ['type', 'item', 'reason'] },
  'inventory.remove': { method: 'removeFromInventory', params: ['type', 'itemIndex', 'reason'] },
  'inventory.clear': { method: 'clearInventoryType', params: ['type', 'reason'] },

  // 升级相关 - 已移除，现在由 useCommandQueue 中的自定义执行器处理
} as const;

// 指令执行器类
class CommandExecutor {
  constructor(
    private statDataBinding: StatDataBindingService,
    private hooks?: CommandQueueHooks,
  ) {}

  // 批量执行指令
  async executeBatch(commands: Command[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    // 按优先级和依赖关系排序
    const sortedCommands = this.sortCommands(commands);

    for (const command of sortedCommands) {
      try {
        const result = await this.executeCommand(command);
        results.push(result);
      } catch (error) {
        results.push({
          command,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // 执行单个指令
  private async executeCommand(command: Command): Promise<ExecutionResult> {
    // 首先检查是否有自定义执行器（钩子函数）
    if (this.hooks?.executeCommand) {
      try {
        const customResult = await this.hooks.executeCommand(command);
        // 如果自定义执行器返回了结果（非 null），则使用自定义结果
        if (customResult !== null) {
          return customResult;
        }
        // 如果返回 null，继续使用默认处理
      } catch (error) {
        // 如果自定义执行器抛出错误，返回错误结果
        return {
          command,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // 使用默认的 COMMAND_MAPPING 处理
    const mapping = COMMAND_MAPPING[command.action as keyof typeof COMMAND_MAPPING];
    if (!mapping) {
      throw new Error(`Unknown command action: ${command.action}`);
    }

    const method = (this.statDataBinding as any)[mapping.method];
    if (typeof method !== 'function') {
      throw new Error(`Method ${mapping.method} not found in StatDataBindingService`);
    }

    // 验证参数数量
    const expectedParams = mapping.params.length;
    const actualParams = Object.keys(command.params).length;

    if (actualParams !== expectedParams) {
      throw new Error(
        `Parameter count mismatch for ${command.action}: expected ${expectedParams}, got ${actualParams}`,
      );
    }

    // 执行方法
    try {
      // 按照映射的参数顺序提取参数值
      const paramValues = mapping.params.map(paramName => command.params[paramName]);
      const result = await method.call(this.statDataBinding, ...paramValues);
      return { command, success: true, result };
    } catch (error) {
      return {
        command,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // 排序指令（处理依赖关系）
  private sortCommands(commands: Command[]): Command[] {
    return commands.sort((a, b) => {
      // 按优先级排序
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }

      // 按时间戳排序
      return a.timestamp - b.timestamp;
    });
  }
}
