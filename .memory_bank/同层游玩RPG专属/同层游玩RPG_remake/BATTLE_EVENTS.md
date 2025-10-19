# 战斗系统事件契约

本文档定义了战斗系统中所有事件的命名规范和数据格式。

## 事件命名规范

- 所有战斗相关事件使用 `battle:` 前缀
- 使用 kebab-case 命名风格
- 事件名应清晰表达其含义

## 事件流向

### Phaser → Vue 事件

这些事件由 Phaser/Service 层发送，Vue 组件层监听。

#### `battle:initialized`

**发送者**: `BattleService.initializeBattle()`  
**接收者**: `useBattleSystem`  
**时机**: 战斗配置验证完成、技能注册完成后  
**数据格式**:

```typescript
{
  config: BattleConfig,  // 处理后的战斗配置（包含映射的属性）
  battleState: BattleState  // 初始战斗状态
}
```

#### `battle:start`

**发送者**: `BattleService.startBattle()`  
**接收者**: `PhaserManager`  
**时机**: 准备启动 Phaser 场景时  
**数据格式**:

```typescript
{
  participants: BattleParticipant[],
  turn: 'player' | 'enemy',
  ended: false,
  background: BackgroundConfig,
  battleConfig: BattleConfig  // 完整配置作为备用
}
```

#### `battle:state-updated`

**发送者**: `useBattleState.updateBattleState()`  
**接收者**: `BattleScene`, Vue 组件  
**时机**: 战斗状态发生变化时（每次行动后）  
**数据格式**:

```typescript
{
  updates?: Partial<BattleStateExtended>,  // 更新的字段
  battleState: BattleStateExtended  // 完整的最新状态
}
```

#### `battle:damage`

**发送者**: `BattleEngine.processAction()` → `BattleService`  
**接收者**: `BattleRoot.vue` (用于显示伤害数字)  
**时机**: 造成伤害时  
**数据格式**:

```typescript
{
  actorId: string,  // 攻击者ID
  targetId: string,  // 目标ID
  damage: number,  // 伤害值
  isCritical: boolean  // 是否暴击
}
```

#### `battle:miss`

**发送者**: `BattleEngine.processAction()` → `BattleService`  
**接收者**: `BattleRoot.vue` (用于显示未命中提示)  
**时机**: 攻击未命中时  
**数据格式**:

```typescript
{
  actorId: string,  // 攻击者ID
  targetId: string  // 目标ID
}
```

#### `battle:critical`

**发送者**: `BattleEngine.processAction()` → `BattleService`  
**接收者**: `BattleRoot.vue` (用于显示暴击特效)  
**时机**: 发生暴击时  
**数据格式**:

```typescript
{
  actorId: string,  // 攻击者ID
  targetId: string,  // 目标ID
  damage: number  // 暴击伤害值
}
```

#### `battle:result`

**发送者**: `BattleService.onBattleEnd()` 和 `useBattleState.endBattle()`  
**接收者**: `useBattleSystem` 和 `BattleRoot.vue`  
**时机**: 战斗结束时  
**数据格式**:

```typescript
{
  winner: 'player' | 'enemy',
  rounds: number,  // 回合数
  summary?: string,  // 战斗总结
  battleState?: BattleStateExtended  // 完整战斗状态（可选）
}
```

#### `battle:participant-updated`

**发送者**: `useBattleState.updateParticipant()`  
**接收者**: `BattleScene` (用于更新单个参与者显示)  
**时机**: 单个参与者状态更新时  
**数据格式**:

```typescript
{
  participantId: string,
  updates: Partial<BattleParticipantExtended>,
  participant: BattleParticipantExtended  // 完整的参与者数据
}
```

### Vue → Phaser 事件

这些事件由 Vue 组件发送，Phaser/Service 层监听。

当前架构中，Vue 不直接发送事件到 Phaser，而是通过方法调用：

```
Vue 组件 
  ↓ 调用方法
useBattleSystem.processPlayerAction()
  ↓ 调用方法
BattleService.processPlayerAction()
  ↓ 发送事件
EventBus.emit('battle:damage', ...)
  ↓ 监听
Phaser BattleScene / Vue 组件
```

## 数据流示意图

### 启动战斗流程

```
useBattleConfig.startBattle()
  ↓
useGameStateManager.enterBattle()
  ↓ battle:enter-battle
useBattleSystem.startBattle()
  ↓
BattleService.initializeBattle()
  ↓ battle:initialized
useBattleState.initializeBattle()
  ↓
BattleService.startBattle()
  ↓ battle:start
PhaserManager → BattleScene
```

### 玩家行动流程

```
BattleRoot.vue 用户点击
  ↓
useBattleSystem.processPlayerAction()
  ↓
BattleService.processPlayerAction()
  ↓
BattleEngine.processAction() [纯计算]
  ↓ 返回 { newState, events }
BattleService 发送事件
  ├─→ battle:damage / battle:miss / battle:critical
  └─→ battle:state-updated
       ↓
useBattleState.updateBattleState()
  ↓ battle:state-updated
├─→ BattleScene 更新显示
└─→ Vue 组件响应式更新
```

### 战斗结束流程

```
BattleEngine 检测到 ended = true
  ↓
BattleService.onBattleEnd()
  ↓ battle:result
useBattleSystem.handleBattleEnd()
  ↓
useGameStateManager.exitBattle()
  ↓
useBattleState.endBattle()
  ↓
BattleRoot 显示结果对话框
```

## 事件监听位置

### useBattleSystem

- 监听: `battle:initialized`, `battle:result`
- 发送: 无（通过调用其他服务的方法间接发送）

### useBattleState

- 监听: 无（被动接收方法调用）
- 发送: `battle:state-updated`, `battle:participant-updated`, `battle:result`

### BattleService

- 监听: 无
- 发送: `battle:initialized`, `battle:start`, `battle:state-updated`, `battle:damage`, `battle:miss`, `battle:critical`, `battle:result`

### BattleScene

- 监听: `battle:state-updated`
- 发送: 无

### BattleRoot.vue

- 监听: `battle:damage`, `battle:miss`, `battle:critical`, `battle:result`
- 发送: 无（通过调用 useBattleSystem 方法）

## 最佳实践

1. **单向数据流**: Vue → useBattleSystem → BattleService → EventBus → Phaser/Vue
2. **事件命名**: 使用 `battle:` 前缀，动词-名词格式（如 `battle:damage`）
3. **数据格式**: 始终使用对象格式，包含必要的上下文信息
4. **错误处理**: 事件处理器应该捕获异常，避免影响其他监听器
5. **日志记录**: 关键事件应该记录日志，便于调试

## 注意事项

- ⚠️ 避免循环事件：A 监听 B 发送的事件，B 又监听 A 发送的事件
- ⚠️ 事件数据应该是可序列化的（避免包含函数或循环引用）
- ⚠️ 不要在事件处理器中执行长时间运行的操作
- ⚠️ 事件名称一旦确定，不要轻易修改（影响范围大）
