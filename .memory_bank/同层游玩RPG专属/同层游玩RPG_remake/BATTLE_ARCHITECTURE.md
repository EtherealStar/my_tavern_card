# 战斗子系统架构设计

> 最后更新: 2025-10-03
> 版本: 2.1 (Vue架构修复后)

## 架构概览

战斗子系统采用**清晰分层架构**，各层职责明确，通过事件总线进行通信。

### 架构图

```text
┌─────────────────────────────────────────────────────────────┐
│                         Vue 层 (UI)                          │
│  ┌────────────────┐  ┌──────────────────────────────────┐   │
│  │ BattleRoot.vue │  │   Battle UI Components           │   │
│  │  - 用户交互    │  │   - BattleLayout                 │   │
│  │  - UI 呈现     │  │   - BattleActionPanel            │   │
│  │  - 事件监听    │  │   - BattleTopHUD / BottomHUD     │   │
│  └────────────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   组合式函数层 (Composables)                 │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ useBattleSystem │  │useBattleState│  │usePhaserBattle │ │
│  │  战斗编排器     │  │ 状态真相源   │  │ Phaser 桥梁    │ │
│  │  - 启动战斗     │  │ - 状态管理   │  │ - 场景管理     │ │
│  │  - 处理行动     │  │ - 事件发送   │  │ - 初始化       │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      服务层 (Services)                       │
│  ┌──────────────┐  ┌────────────┐  ┌───────────────────┐   │
│  │BattleService │  │BattleEngine│  │BattleResourceSvc  │   │
│  │  协调器      │  │ 计算引擎   │  │  资源验证         │   │
│  │  - 初始化    │  │ - 伤害计算 │  │  - URL 验证       │   │
│  │  - AI 处理   │  │ - 命中判定 │  │  - 路径解析       │   │
│  └──────────────┘  └────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      Phaser 层 (Rendering)                   │
│  ┌────────────────┐  ┌─────────────────────────────────┐   │
│  │  BattleScene   │  │     EnemyBattleObject           │   │
│  │  - 资源加载    │  │     - 敌人立绘                  │   │
│  │  - 场景渲染    │  │     - HP 条显示                 │   │
│  │  - 显示更新    │  │     - 动画播放                  │   │
│  └────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕
                       ┌──────────────┐
                       │  EventBus    │
                       │  事件总线     │
                       └──────────────┘
```

## 核心组件职责

### 1. Vue 层

#### BattleRoot.vue

- **定位**: 战斗 UI 的根组件
- **职责**:
  - 渲染战斗界面（使用 BattleLayout 组件）
  - 处理用户交互（点击按钮、选择技能）
  - 监听战斗事件（伤害、暴击、未命中）
  - 显示战斗消息和日志
  - 显示战斗结果对话框
- **数据来源**:
  - 从 `useBattleState` 获取响应式战斗数据
  - 从 `useBattleSystem` 调用方法处理行动
- **不负责**:
  - 战斗逻辑计算
  - 状态管理
  - Phaser 渲染

#### Battle UI Components

- **BattleLayout**: 整体布局容器
- **BattleActionPanel**: 行动选择面板（战斗、技能、道具、逃跑）
- **BattleTopHUD**: 顶部 HUD（敌人信息）
- **BattleBottomHUD**: 底部 HUD（玩家信息）
- **BattleStatusBar**: HP/MP 状态条
- **BattleResultDialog**: 战斗结果弹窗

### 2. 组合式函数层

#### useBattleSystem (战斗编排器)

- **定位**: 战斗流程的唯一编排者
- **职责**:
  - 启动战斗（初始化 → Phaser → 状态同步）
  - 处理玩家行动（调用服务 → 更新状态 → 检查结束）
  - 统一事件处理（避免事件监听分散）
  - 协调各组合式函数和服务
- **数据流**:

  ```text
  Input: Vue 组件调用方法
  Processing: 协调 BattleService, useBattleState, usePhaserBattle
  Output: 通过 useBattleState 更新状态，触发响应式更新
  ```

#### useBattleState (状态真相源)

- **定位**: 战斗状态的唯一真相源 (Single Source of Truth)
- **职责**:
  - 维护 `battleConfig` 和 `battleState`
  - 提供响应式的战斗数据访问
  - 处理状态更新并发送事件
  - 管理参与者状态和回合流转
- **数据流**:

  ```text
  Input: 从 useBattleSystem 接收状态更新
  Storage: ref(battleState), ref(battleConfig)
  Output: 
    - 通过 computed 提供响应式数据给 Vue
    - 通过 EventBus 发送 battle:state-updated 事件
  ```

- **关键特性**:
  - 所有战斗相关状态都从这里读取
  - 所有状态变更都通过这里的方法进行
  - 确保状态一致性

#### usePhaserBattle (Phaser 桥梁)

- **定位**: Vue 与 Phaser 之间的桥梁
- **职责**:
  - 初始化 Phaser 游戏实例
  - 管理 Phaser 场景生命周期
  - 提供 Phaser 游戏实例访问
- **不负责**:
  - 战斗逻辑
  - 事件监听（由 useBattleSystem 统一处理）

### 3. 服务层

#### BattleService (协调器)

- **定位**: 服务层与 Phaser 层之间的协调者
- **职责**:
  - 初始化战斗（验证配置、注册技能、映射属性）
  - 启动 Phaser 场景（构造 payload、发送事件）
  - 处理玩家行动（调用 BattleEngine、发送事件）
  - 处理 AI 回合（简单 AI 逻辑）
  - 处理战斗结束（保存结果、触发后续流程）
- **数据流**:

  ```
  Input: 从 useBattleSystem 接收配置和行动
  Processing: 调用 BattleEngine 计算
  Output: 通过 EventBus 发送事件
  ```

#### BattleEngine (计算引擎)

- **定位**: 纯逻辑计算引擎
- **职责**:
  - 处理战斗行动的数值计算（命中、伤害、暴击）
  - 管理战斗状态流转
  - 生成战斗事件
- **特点**:
  - 纯函数，无副作用
  - 不依赖 Phaser、Vue 或任何 UI 框架
  - 可独立测试
- **数据流**:

  ```
  Input: BattleState + BattleAction
  Processing: 纯计算（命中判定、伤害计算、状态更新）
  Output: { newState: BattleState, events: BattleEvent[] }
  ```

#### BattleResourceService (资源验证)

- **定位**: 资源验证和路径解析服务
- **职责**:
  - 验证 URL 格式
  - 解析和标准化资源路径
  - 提供示例 URL 列表
  - 从配置中提取资源 URL
- **不负责**:
  - 资源预加载（由 Phaser BattleScene.preload 处理）
  - 资源缓存（由 Phaser 纹理管理器处理）

#### BattleConfigService (配置管理)

- **定位**: 战斗配置的管理中心
- **职责**:
  - 注册和管理战斗配置
  - 提供配置查询和过滤
  - 验证配置有效性
  - 创建动态配置
  - 支持配置模板系统
  - 提供配置统计信息
- **配置导入流程**:

  ```
  1. BattleConfigInitializer.initialize()
     ↓ 导入 basicBattleConfigs
  2. BattleConfigService.registerBattleConfigs()
     ↓ 注册到内部 Map
  3. 配置验证和统计
     ↓ 提供查询接口
  4. useBattleConfig 通过依赖注入访问
  ```

#### BattleConfigInitializer (配置初始化器)

- **定位**: 战斗配置的启动时注册器
- **职责**:
  - 在服务启动时注册所有预定义配置
  - 验证所有配置的有效性
  - 提供初始化状态查询
- **初始化流程**:

  ```
  GameCore.initializeAdvancedServices()
    ↓ 调用
  BattleConfigInitializer.initialize()
    ↓ 注册
  basicBattleConfigs (easyBattles, normalBattles, hardBattles, bossBattles)
    ↓ 验证
  BattleConfigService.validateBattleConfig()
  ```

#### BattleResultHandler (结果处理器)

- **定位**: 战斗结果的后处理服务
- **职责**:
  - 处理战斗结束后的结果保存
  - 触发后续游戏流程
  - 更新游戏状态和成就

### 4. Phaser 层

#### BattleScene

- **定位**: Phaser 战斗场景
- **职责**:
  - 资源加载（在 preload 阶段加载背景和敌人立绘）
  - 场景渲染（创建背景、敌人对象等视觉元素）
  - 状态显示（更新 HP、状态指示器）
  - 事件通信（监听 battle:state-updated 事件）
- **数据流**:

  ```
  Input: 
    - 通过 init(data) 接收战斗配置
    - 通过 EventBus 监听状态更新
  Processing: 
    - preload() 加载资源
    - create() 创建游戏对象
    - updateBattleDisplay() 更新显示
  Output: 
    - 渲染到 canvas
  ```

- **不负责**:
  - 战斗逻辑计算
  - UI 控制
  - 状态管理

#### EnemyBattleObject

- **定位**: 敌人显示对象
- **职责**:
  - 创建敌人立绘精灵
  - 显示敌人 UI（名称、HP 条）
  - 更新敌人状态显示
  - 播放敌人动画

#### PlayerBattleObject

- **定位**: 玩家显示对象
- **职责**:
  - 创建玩家立绘精灵
  - 显示玩家 UI（名称、HP/MP 条）
  - 更新玩家状态显示
  - 播放玩家动画

#### PhaserManager

- **定位**: Phaser 游戏实例管理器
- **职责**:
  - 管理 Phaser 游戏实例的生命周期
  - 处理场景切换和销毁
  - 提供游戏实例访问接口
  - 监听战斗相关事件

## 服务依赖关系

### 依赖注入容器配置

战斗子系统通过 Inversify 容器管理服务依赖关系：

```typescript
// 核心服务绑定
container.bind<EventBus>(TYPES.EventBus).to(EventBus).inSingletonScope();
container.bind<GameCore>(TYPES.GameCore).to(GameCore).inSingletonScope();

// 战斗相关服务绑定
container.bind<BattleResourceService>(TYPES.BattleResourceService).to(BattleResourceService).inSingletonScope();
container.bind<BattleConfigService>(TYPES.BattleConfigService).to(BattleConfigService).inSingletonScope();
container.bind<BattleConfigInitializer>(TYPES.BattleConfigInitializer).to(BattleConfigInitializer).inSingletonScope();
container.bind<BattleEngine>(TYPES.BattleEngine).to(BattleEngine).inSingletonScope();
container.bind<BattleResultHandler>(TYPES.BattleResultHandler).to(BattleResultHandler).inSingletonScope();
container.bind<BattleService>(TYPES.BattleService).to(BattleService).inSingletonScope();
container.bind<PhaserManager>(TYPES.PhaserManager).to(PhaserManager).inSingletonScope();
```

### 服务依赖图

```
GameCore
├── BattleConfigInitializer
│   └── BattleConfigService
│       └── BattleResourceService
├── BattleService
│   ├── EventBus
│   ├── BattleEngine
│   ├── BattleResultHandler
│   ├── SameLayerService
│   └── SaveLoadManagerService
└── PhaserManager
    └── EventBus
```

### 初始化顺序

1. **基础服务**: EventBus, UIService
2. **配置服务**: BattleResourceService → BattleConfigService → BattleConfigInitializer
3. **计算服务**: BattleEngine, BattleResultHandler
4. **协调服务**: BattleService, PhaserManager
5. **核心服务**: GameCore

## 数据流详解

### 配置导入完整流程

```
1. 应用启动
   index.ts 或应用入口
   ↓ 创建
   
2. 服务容器
   ServiceContainer.configureBindings()
   ↓ 绑定所有服务
   
3. 游戏核心初始化
   GameCore.initializeBusinessServices()
   ↓ 初始化基础服务
   
4. 高级服务初始化
   GameCore.initializeAdvancedServices()
   ↓ 调用
   
5. 配置初始化器
   BattleConfigInitializer.initialize()
   ↓ 导入
   
6. 基础战斗配置
   basicBattleConfigs (从 basicBattles.ts)
   - easyBattles: 哥布林战斗等
   - normalBattles: 妖怪战斗、兽人战斗等
   - hardBattles: 龙族战斗等
   - bossBattles: 恶魔领主战斗等
   ↓ 注册
   
7. 配置服务
   BattleConfigService.registerBattleConfigs()
   ↓ 存储到 Map<string, BattleConfigItem>
   
8. 配置验证
   BattleConfigService.validateBattleConfig()
   ↓ 验证每个配置的有效性
   
9. 服务就绪
   配置可通过 useBattleConfig 访问
   ↓ 提供
   
10. Vue 组件使用
    useBattleConfig.startBattle(configId)
    - 获取配置
    - 验证配置
    - 启动战斗
```

### 启动战斗完整流程

```
1. Vue 组件调用
   BattleRoot.vue 或其他组件
   ↓ 调用
   
2. 配置管理
   useBattleConfig.startBattle(configId)
   ↓
   gameState.enterBattle(config)
   ↓ 发送 game:enter-battle 事件
   
3. 战斗编排
   useBattleSystem.startBattle(config)
   ↓
   
4. 服务初始化
   BattleService.initializeBattle(config)
   - 验证配置
   - 注册技能
   - 映射 MVU 属性 → 战斗属性
   - 设置 BattleEngine 技能表
   ↓ 发送 battle:initialized 事件
   
5. 状态初始化
   useBattleState.initializeBattle(config)
   - 创建初始战斗状态
   - 设置 battleConfig 和 battleState
   ↓
   
6. 启动 Phaser
   BattleService.startBattle(battleState, config)
   ↓ 发送 battle:start 事件
   
7. Phaser 场景
   PhaserManager 监听 battle:start
   ↓
   BattleScene.init(payload)
   ↓
   BattleScene.preload() [加载资源]
   ↓
   BattleScene.create() [创建场景]
   - 创建背景
   - 创建敌人对象
   - 设置事件监听
   ↓
   
8. 渲染完成
   战斗界面显示，等待玩家行动
```

### 玩家行动完整流程

```
1. 用户交互
   BattleRoot.vue 用户点击"战斗"按钮
   ↓ 调用
   
2. 编排层处理
   useBattleSystem.processPlayerAction({
     type: 'attack',
     actorId: 'player',
     targetId: 'enemy'
   })
   ↓ 调用
   
3. 服务层处理
   BattleService.processPlayerAction(action, currentState)
   - 验证行动格式
   ↓ 调用
   
4. 引擎计算
   BattleEngine.processAction(state, action)
   【纯计算，无副作用】
   - 深拷贝状态
   - 获取攻击者和目标
   - 命中判定 (Math.random() vs hitChance)
   - 暴击判定
   - 伤害计算 (基础伤害 × 暴击倍率)
   - 应用伤害
   - 检查战斗结束
   - 切换回合
   ↓ 返回
   { newState, events: [
       { type: 'battle:damage', data: { targetId, damage, isCritical } }
     ]
   }
   
5. 发送事件
   BattleService 遍历 events
   ↓ eventBus.emit
   - battle:damage
   - battle:state-updated
   
6. 状态更新
   useBattleState.updateBattleState(newState)
   - 更新 battleState.value
   ↓ 发送 battle:state-updated 事件
   
7. 多方响应
   ┌─→ BattleScene 监听 battle:state-updated
   │   - updateBattleDisplay(state)
   │   - 更新敌人 HP 显示
   │
   ├─→ BattleRoot.vue 监听 battle:damage
   │   - 显示伤害数字
   │   - 添加战斗日志
   │
   └─→ Vue 响应式系统
       - computed 自动更新
       - 组件重新渲染
       
8. AI 回合（如果需要）
   如果 newState.turn === 'enemy'
   ↓
   BattleService.processEnemyTurn(state)
   - 简单 AI 选择技能或普攻
   ↓ 重复步骤 4-7
   
9. 检查战斗结束
   如果 newState.ended === true
   ↓
   BattleService.onBattleEnd(result)
   ↓ 发送 battle:result 事件
   
10. 结束处理
    useBattleSystem.handleBattleEnd(result)
    - gameState.exitBattle()
    - battleState.endBattle()
    - 显示战斗结果对话框
```

### 状态同步机制

```
唯一真相源: useBattleState
    ↓
┌─────────────────────────────────────┐
│  battleState (ref)                  │
│  {                                  │
│    participants: [...],             │
│    turn: 'player' | 'enemy',        │
│    ended: false,                    │
│    winner: undefined,               │
│    round: 1                         │
│  }                                  │
└─────────────────────────────────────┘
    ↓ 通过 computed 提供
┌──────────────┬──────────────┬──────────────┐
│ playerData   │  enemyData   │  battleInfo  │
│ (computed)   │  (computed)  │  (computed)  │
└──────────────┴──────────────┴──────────────┘
    ↓ 传递给
┌─────────────────────────────────────┐
│  Vue 组件 (BattleLayout, HUD...)    │
│  - 通过 props 接收                   │
│  - 响应式更新                        │
└─────────────────────────────────────┘

同时，状态更新时：
useBattleState.updateBattleState(updates)
    ↓ 发送事件
battle:state-updated
    ↓ 监听
BattleScene.updateBattleDisplay(state)
    - 更新 Phaser 游戏对象显示
```

## 关键设计决策

### 1. 单一状态源 (Single Source of Truth)

**决策**: useBattleState 是战斗状态的唯一真相源

**理由**:

- 避免状态分散导致的不一致
- 简化调试（只需要查看一个地方）
- 便于状态持久化和恢复

**实现**:

- 所有组件通过 `useBattleState` 读取状态
- 状态更新统一通过 `useBattleState` 的方法
- Phaser 场景不维护自己的状态，只负责渲染

### 2. 纯函数计算引擎

**决策**: BattleEngine 作为纯函数计算引擎

**理由**:

- 可测试性强（输入 → 输出，无副作用）
- 可预测性高（相同输入总是产生相同输出）
- 可复用性好（不依赖特定框架）

**实现**:

- 深拷贝输入状态，不修改原状态
- 只进行数值计算，不发送事件（由 BattleService 负责）
- 返回新状态和事件列表

### 3. 事件驱动架构

**决策**: 使用 EventBus 进行跨层通信

**理由**:

- 解耦各层（发送者不需要知道接收者）
- 灵活扩展（新增监听器不影响现有代码）
- 符合游戏开发常见模式

**实现**:

- 明确的事件命名规范（`battle:` 前缀）
- 标准化的事件数据格式
- 单向数据流（避免循环依赖）

### 4. 资源加载职责分离

**决策**: 资源验证（Service）与资源加载（Phaser）分离

**理由**:

- BattleResourceService 只负责 URL 验证，轻量级
- Phaser BattleScene.preload 负责实际加载，利用 Phaser 的加载器
- 避免重复加载和缓存管理

**实现**:

- 删除了冗余的 `useBattleResourceManager`
- BattleResourceService 提供 URL 验证和提取功能
- BattleScene.preload 使用 Phaser Loader API 加载资源

### 5. 清晰的行动处理链

**决策**: Vue → useBattleSystem → BattleService → BattleEngine

**理由**:

- 职责分层清晰
- 每一层只负责自己的事情
- 便于测试和维护

**实现**:

```typescript
// Vue 层：用户交互
onActionConfirmed(actionId)

// 编排层：协调流程
useBattleSystem.processPlayerAction(action)

// 服务层：业务逻辑
BattleService.processPlayerAction(action, state)

// 计算层：纯计算
BattleEngine.processAction(state, action)
```

### 6. 配置驱动的战斗系统

**决策**: 使用配置文件定义战斗场景，支持动态配置

**理由**:

- 便于添加新的战斗场景
- 支持不同难度的战斗配置
- 配置与代码分离，易于维护

**实现**:

```typescript
// 配置定义 (basicBattles.ts)
export const easyBattles: BattleConfigItem[] = [
  {
    id: 'goblin_battle',
    name: '哥布林战斗',
    difficulty: 'easy',
    config: {
      background: { image: '...' },
      participants: [...]
    }
  }
];

// 配置使用 (useBattleConfig.ts)
const startBattle = async (configId: string) => {
  const configItem = battleConfigService.getBattleConfig(configId);
  // 启动战斗...
};
```

### 7. 错误处理与容错机制

**决策**: 分层错误处理，优雅降级

**理由**:

- 提高系统稳定性
- 提供用户友好的错误提示
- 支持部分功能失败时的继续运行

**实现**:

```typescript
// 资源加载：非阻塞式错误处理
try {
  this.load.image(key, url);
} catch (error) {
  console.warn(`资源加载失败: ${key}`, error);
  // 继续执行，使用默认资源
}

// 服务初始化：阻塞式错误处理
try {
  await this.battleConfigInitializer.initialize();
} catch (error) {
  console.error('战斗配置初始化失败:', error);
  throw error; // 阻止应用启动
}

// 用户操作：优雅降级
try {
  await battleSystem.processPlayerAction(action);
} catch (error) {
  uiService.error('操作失败', error.message);
  // 不中断游戏流程
}
```

## 优化成果

### 重构前的问题

1. ❌ 功能重叠
   - `BattleResourceService` 和 `useBattleResourceManager` 都在做资源管理

2. ❌ 职责不清
   - BattleScene 既渲染又管理状态
   - BattleService 职责过重

3. ❌ 状态分散
   - useBattleState、BattleService、BattleScene 都维护状态副本

4. ❌ 事件监听分散
   - 各个组件都在监听和发送事件，难以追踪数据流

### 重构后的改进

1. ✅ 消除功能重叠
   - 删除了 `useBattleResourceManager`
   - BattleResourceService 只负责验证

2. ✅ 职责明确
   - 每个组件都有清晰的文档说明职责
   - BattleEngine 是纯计算引擎
   - BattleScene 只负责渲染

3. ✅ 单一状态源
   - useBattleState 是唯一的真相源
   - 其他地方只读取，不维护副本

4. ✅ 统一事件处理
   - useBattleSystem 统一处理事件监听
   - 清晰的事件契约文档

5. ✅ 简化数据流
   - 单向数据流，避免循环依赖
   - 明确的数据流向图

## 扩展指南

### 添加新的战斗行动类型

1. 在 `BattleSchemas.ts` 中扩展 `BattleAction` 类型
2. 在 `BattleEngine.processAction` 中添加处理逻辑
3. 在 Vue 组件中添加对应的 UI 按钮
4. 更新事件文档

### 添加新的战斗事件

1. 在 `BattleEngine.ts` 的 `BattleEvent` 接口中添加新事件类型
2. 在计算逻辑中生成该事件
3. 在 Vue 组件中监听该事件
4. 在 `BATTLE_EVENTS.md` 中记录事件契约

### 添加新的技能

1. 在 `BattleService.registerDefaultSkills` 中注册技能
2. 在 `BattleEngine` 中实现技能效果计算
3. 在 Vue 组件中添加技能选择 UI
4. 在配置文件中将技能分配给角色

### 优化 AI 逻辑

1. 在 `BattleService.processEnemyTurn` 中修改 AI 决策
2. 可以添加更复杂的 AI 策略（如血量阈值判断）
3. 可以添加不同难度的 AI 配置

### 添加新的战斗配置

1. **创建配置定义**:

   ```typescript
   // 在 basicBattles.ts 中添加新配置
   export const newBattles: BattleConfigItem[] = [
     {
       id: 'new_battle',
       name: '新战斗',
       difficulty: 'normal',
       tags: ['custom', 'special'],
       config: {
         background: { image: '...' },
         participants: [...]
       }
     }
   ];
   ```

2. **注册配置**:

   ```typescript
   // 在 basicBattleConfigs 中导出
   export const basicBattleConfigs: BattleConfigItem[] = [
     ...easyBattles,
     ...normalBattles,
     ...hardBattles,
     ...bossBattles,
     ...newBattles, // 添加新配置
   ];
   ```

3. **使用配置**:

   ```typescript
   // 在 Vue 组件中使用
   const battleConfig = useBattleConfig();
   await battleConfig.startBattle('new_battle');
   ```

### 添加新的战斗对象类型

1. **创建对象类**:

   ```typescript
   // 在 phaser/objects/ 中创建新对象
   export class NewBattleObject extends Phaser.GameObjects.Container {
     constructor(scene: Phaser.Scene, config: any) {
       super(scene);
       // 实现对象逻辑
     }
   }
   ```

2. **在 BattleScene 中使用**:

   ```typescript
   // 在 BattleScene.create() 中创建对象
   const newObject = new NewBattleObject(this, config);
   this.add.existing(newObject);
   ```

### 扩展 MVU 属性映射

1. **在 BattleService 中添加映射**:

   ```typescript
   private mapMvuToBattleStats(mvuAttributes: Record<string, number>) {
     return {
       atk: mvuAttributes.力量 * 2,
       matk: mvuAttributes.智力 * 1.5,
       def: mvuAttributes.体质 * 1.2,
       // 添加新的属性映射
       newStat: mvuAttributes.新属性 * 1.0,
     };
   }
   ```

2. **在配置中使用**:

   ```typescript
   // 在战斗配置中添加新属性
   mvuAttributes: {
     力量: 12,
     智力: 10,
     新属性: 8, // 新添加的属性
   }
   ```

## 性能优化建议

1. **状态更新批处理**
   - 考虑合并多个小的状态更新为一次大更新
   - 使用防抖/节流优化频繁更新

2. **事件发送优化**
   - 避免在循环中发送大量事件
   - 考虑事件队列机制

3. **Phaser 渲染优化**
   - 使用对象池管理游戏对象
   - 优化纹理加载（使用纹理图集）

4. **计算优化**
   - BattleEngine 中的计算已经是纯函数，性能良好
   - 如果需要，可以添加结果缓存

5. **资源加载优化**
   - 预加载常用资源
   - 使用资源压缩和缓存
   - 实现资源懒加载

6. **内存管理**
   - 及时清理事件监听器
   - 销毁不再使用的 Phaser 对象
   - 避免内存泄漏

## 维护注意事项

1. **修改战斗逻辑时**
   - 优先修改 BattleEngine（纯函数，易维护）
   - 更新文档

2. **修改数据流时**
   - 更新架构图和数据流图
   - 确保单向数据流不被破坏
   - 检查是否有循环依赖

3. **添加新功能时**
   - 遵循现有的分层架构
   - 明确新组件的职责
   - 更新相关文档

4. **性能问题排查**
   - 检查是否有不必要的状态拷贝
   - 检查事件监听器是否正确移除
   - 使用 Vue DevTools 和 Phaser Debug 工具

## Vue架构问题与修复记录

### 发现的关键问题

#### 问题1：Vue依赖注入时机错误

**现象**：`BattleService or battle state not available` 错误
**根本原因**：在 `BattleRoot.vue` 的 `onMounted` 中调用 `useBattleSystem()`，但 Vue 的 `inject()` 只能在 setup 阶段使用

```typescript
// ❌ 错误：在 onMounted 中调用
onMounted(async () => {
  battleSystem.value = useBattleSystem();  // inject 此时失效！
});
```

**修复方案**：将 `useBattleSystem()` 移到 setup 阶段

```typescript
// ✅ 正确：在 setup 阶段初始化
const battleSystem = useBattleSystem();
```

#### 问题2：战斗状态初始化时机错误

**现象**：`BattleScene` 完全没有启动，没有 `battle:start` 事件
**根本原因**：在 `useBattleSystem.startBattle()` 中，`battleState.battleState.value` 为 null，因为状态初始化是异步的

```typescript
// ❌ 错误：检查时状态还未初始化
if (battleState.battleState.value) {  // 这里为 null！
  await battleService.startBattle(...);
}
```

**修复方案**：在 `startBattle` 中主动初始化状态

```typescript
// ✅ 正确：主动初始化状态
battleState.initializeBattle(processedConfig);
if (battleState.battleState.value) {
  await battleService.startBattle(...);
}
```

#### 问题3：资源加载超时过短

**现象**：背景和敌人立绘无法显示
**根本原因**：`BattleScene.preload()` 中超时设置为3秒，对网络资源太短

**修复方案**：将超时时间从3000ms改为30000ms

#### 问题4：资源加载错误处理过于严格

**现象**：单个资源加载失败导致整个场景无法启动
**修复方案**：改为非阻塞式错误处理，允许部分资源加载失败

### Vue架构最佳实践

#### 1. 依赖注入时机

- ✅ **正确**：在 setup 阶段调用 `inject()` 和 composables
- ❌ **错误**：在生命周期钩子中调用 `inject()`

#### 2. 状态初始化顺序

```typescript
// 正确的初始化顺序
const startBattle = async (config: BattleConfig) => {
  // 1. 初始化服务
  const processedConfig = await battleService.initializeBattle(config);
  
  // 2. 初始化状态
  battleState.initializeBattle(processedConfig);
  
  // 3. 等待DOM更新
  await nextTick();
  
  // 4. 启动场景
  await battleService.startBattle(battleState.battleState.value, processedConfig);
};
```

#### 3. 事件监听设置

- 在 `onMounted` 中设置事件监听
- 在 `onUnmounted` 中清理事件监听
- 避免在 setup 阶段设置事件监听（可能导致内存泄漏）

#### 4. 错误处理策略

- 资源加载：非阻塞式，允许部分失败
- 服务初始化：阻塞式，失败则抛出错误
- 用户操作：优雅降级，显示错误提示

### 修复后的数据流

```
Vue组件 (BattleRoot.vue)
  ↓ setup阶段: useBattleSystem()
  ↓ onMounted: 设置事件监听
  ↓ 用户操作: battleSystem.processPlayerAction()
  ↓
useBattleSystem (编排器)
  ↓ 调用: battleService.processPlayerAction()
  ↓ 更新: battleState.updateBattleState()
  ↓ 发送: battle:state-updated 事件
  ↓
BattleService (协调器)
  ↓ 调用: battleEngine.processAction()
  ↓ 发送: battle:damage/miss/critical 事件
  ↓
BattleScene (Phaser渲染)
  ↓ 监听: battle:state-updated
  ↓ 更新: 显示HP、状态等
```

## 调试与故障排除

### 常见问题诊断

1. **战斗无法启动**
   - 检查服务依赖注入是否正常
   - 验证战斗配置是否有效
   - 查看控制台错误信息

2. **资源加载失败**
   - 检查 URL 是否可访问
   - 验证资源格式是否正确
   - 查看网络请求状态

3. **状态同步问题**
   - 检查事件监听器是否正确设置
   - 验证状态更新是否触发
   - 查看 Vue 响应式系统状态

4. **Phaser 场景问题**
   - 检查 Phaser 实例是否正常创建
   - 验证场景切换逻辑
   - 查看 Phaser 调试信息

### 调试工具

1. **Vue DevTools**
   - 查看组件状态
   - 监控响应式数据变化
   - 检查事件触发

2. **Phaser Debug**
   - 查看游戏对象状态
   - 监控场景切换
   - 检查资源加载

3. **浏览器控制台**
   - 查看详细错误信息
   - 监控网络请求
   - 检查内存使用

### 日志系统

战斗子系统使用统一的日志前缀进行调试：

```typescript
// 各组件使用统一的日志前缀
console.log('[useBattleSystem] 消息');
console.log('[BattleService] 消息');
console.log('[BattleEngine] 消息');
console.log('[BattleScene] 消息');
```

## 测试策略

### 单元测试

1. **BattleEngine 测试**
   - 测试纯函数计算逻辑
   - 验证输入输出正确性
   - 测试边界条件

2. **服务层测试**
   - 测试服务初始化
   - 验证配置处理
   - 测试错误处理

### 集成测试

1. **战斗流程测试**
   - 测试完整战斗流程
   - 验证状态同步
   - 测试事件传递

2. **UI 集成测试**
   - 测试用户交互
   - 验证响应式更新
   - 测试错误处理

### 性能测试

1. **资源加载测试**
   - 测试加载时间
   - 验证内存使用
   - 测试并发加载

2. **渲染性能测试**
   - 测试帧率稳定性
   - 验证内存泄漏
   - 测试长时间运行

## 相关文档

- `BATTLE_EVENTS.md` - 事件契约详细说明
- `progress.md` - 项目进度和已完成功能
- `activeContext.md` - 当前开发上下文
- `basicBattles.ts` - 基础战斗配置定义
- `BattleSchemas.ts` - 战斗数据结构定义
