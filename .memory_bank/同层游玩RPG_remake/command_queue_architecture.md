# 指令队列子系统架构文档

## 概述

指令队列系统用于延迟执行用户操作（装备、属性修改等），在用户发送消息时批量执行，确保MVU变量正确同步。

## 架构层次

### 三层架构

```
┌─────────────────────────────────────┐
│   Vue层 (useCommandQueue.ts)         │  ← 响应式接口、具体实现
│   - 响应式状态管理                   │
│   - 冲突检测逻辑                     │
│   - 数据验证逻辑                     │
│   - 便捷方法封装                     │
└──────────────┬──────────────────────┘
               │ inject依赖注入
┌──────────────▼──────────────────────┐
│   服务层 (CommandQueueService.ts)    │  ← 核心业务逻辑
│   - 队列管理                         │
│   - 执行协调                         │
│   - 性能监控                         │
│   - 钩子函数接口                     │
└──────────────┬──────────────────────┘
               │ 依赖注入
┌──────────────▼──────────────────────┐
│   执行层 (CommandExecutor)           │  ← 指令执行
│   - 指令映射                         │
│   - 批量执行                         │
└──────────────┬──────────────────────┘
               │ 调用
┌──────────────▼──────────────────────┐
│   StatDataBindingService             │  ← 数据绑定
│   - 装备操作                         │
│   - 属性更新                         │
└─────────────────────────────────────┘
```

## 核心组件

### 1. CommandQueueService（服务层）

**职责**：队列管理、执行协调、性能监控

**核心方法**：

- `addCommand()` - 添加指令
- `removeCommand()` - 移除指令
- `clearQueue()` - 清空队列
- `executeAll()` - 执行所有指令
- `setHooks()` - 设置钩子函数

**钩子接口**：

```typescript
interface CommandQueueHooks {
  detectConflicts?: (commands: Command[]) => CommandConflict[];
  validateDataConsistency?: () => Promise<boolean>;
  executeCommand?: (command: Command) => Promise<ExecutionResult | null>;
}
```

### 2. useCommandQueue（组合式函数层）

**职责**：响应式状态、具体实现、钩子注入

**核心功能**：

- 响应式队列状态（`queue`, `isExecuting`）
- 实现冲突检测逻辑
- 实现数据一致性验证
- 提供便捷方法（`addEquipCommand`, `addLevelUpCommand` 等）

**钩子实现**：

- `detectConflicts()` - 检测装备槽位冲突、背包操作冲突
- `validateDataConsistency()` - 验证装备、背包、属性数据
- `executeCommand()` - 自定义指令执行器（用于处理升级指令）

### 3. CommandExecutor（执行层）

**职责**：指令执行

**核心功能**：

- 首先检查自定义执行器（钩子函数），如果返回结果则使用自定义结果
- 否则通过 `COMMAND_MAPPING` 映射指令到 `StatDataBindingService` 方法
- 按优先级和时间戳排序执行
- 收集执行结果

**特殊处理**：

- 升级指令（`LEVEL_UP`）由 `useCommandQueue` 中的自定义执行器处理
- 升级使用 `addAttributes` 方法通过增量方式更新属性，而不是直接设置

## 执行流程

```
用户发送消息
    ↓
onSend() 调用 executeBeforeMessage()
    ↓
CommandQueueService.executeAll()
    ↓
1. 检查执行状态
2. 调用钩子检测冲突（可选）
3. 创建 CommandExecutor
4. 批量执行指令
5. 调用钩子验证数据一致性（可选）
6. 清空队列
7. 发送事件通知
    ↓
继续执行 generateMessage()
```

## 指令类型

- `EQUIP` - 装备物品
- `UNEQUIP` - 卸下装备
- `EQUIP_SWAP` - 更换装备
- `ATTRIBUTE` - 属性修改
- `INVENTORY` - 背包操作
- `LEVEL_UP` - 升级

## 关键特性

1. **钩子模式**：服务层通过钩子接口抽象，具体实现在组合式函数层
2. **冲突检测**：执行前检测装备槽位冲突、背包操作冲突
3. **数据验证**：执行后验证装备、背包、属性数据一致性
4. **优先级支持**：指令可按优先级排序执行
5. **不可删除标记**：某些指令（如升级）标记为不可删除
6. **自定义执行器**：支持通过钩子函数自定义指令执行逻辑（升级指令使用此机制）

## 升级指令实现

升级指令（`LEVEL_UP`）的实现方式：

1. **处理位置**：在 `useCommandQueue` 组合式函数中通过自定义执行器处理
2. **升级逻辑**：在 `useStatData` 组合式函数中实现，使用 `addAttributes` 方法通过增量方式更新属性
3. **属性更新**：计算当前等级和目标等级的属性差值，使用 `addAttributes` 增加属性，而不是直接设置
4. **等级更新**：使用 `setStatDataField` 更新等级字段
5. **事件触发**：升级完成后触发 `stat_data:level_up` 事件

**优势**：
- 升级逻辑集中在组合式函数层，便于维护
- 使用增量方式更新属性，更符合业务逻辑
- 支持装备加成等机制正常工作

## 文件位置

- 服务层：`src/同层游玩RPG_remake/services/CommandQueueService.ts`
- 组合式函数：`src/同层游玩RPG_remake/composables/useCommandQueue.ts`
- 使用位置：`src/同层游玩RPG_remake/vue/PlayingRoot.vue` (onSend方法)
