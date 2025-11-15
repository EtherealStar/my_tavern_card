# 战斗子系统架构设计

> 最后更新: 2025-01-27
> 版本: 2.5 (集成战斗经验值结算系统)

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
│  │  - 调试面板    │  │   - BattleDebugPanel (条件显示)  │   │
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
│  │  - 测试模式     │  │ - 历史记录   │  │                │ │
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
│  │  - 日志描述  │  │ - 状态更新 │  │                   │   │
│  │  - 缓存管理  │  │ - 事件生成 │  │                   │   │
│  └──────────────┘  └────────────┘  └───────────────────┘   │
│  ┌──────────────┐  ┌─────────────────────────────────────┐   │
│  │BattleConfigSvc│ │       战斗日志描述系统                │   │
│  │  配置&技能管理│  │  ┌─────────────────────────────────┐ │   │
│  │  - 配置注册  │  │  │    描述模板系统                 │ │   │
│  │  - 技能导入  │  │  │  - 通用描述模板                │ │   │
│  │  - 动态配置  │  │  │  - 专属技能描述                │ │   │
│  │  - 验证管理  │  │  │  - 技能映射配置                │ │   │
│  └──────────────┘  │  └─────────────────────────────────┘ │   │
│  ┌──────────────┐  ┌─────────────────────────────────────┐   │
│  │DynamicEnemySvc│ │       战斗日志描述系统                │   │
│  │  动态敌人生成 │  │  ┌─────────────────────────────────┐ │   │
│  │  - MVU读取   │  │  │    描述生成引擎                 │ │   │
│  │  - 等级生成  │  │  │  - 描述生成逻辑                │ │   │
│  │  - 配置生成  │  │  │  - 缓存机制                    │ │   │
│  │  - 属性映射  │  │  │  - 性能优化                    │ │   │
│  └──────────────┘  │  └─────────────────────────────────┘ │   │
│  ┌──────────────┐  └─────────────────────────────────────┘   │
│  │HistoryManager│                                            │
│  │  历史管理    │                                            │
│  │  - 状态记录  │                                            │
│  │  - 撤销重做  │                                            │
│  │  - 历史限制  │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      数据层 (Data)                           │
│  ┌────────────────┐  ┌─────────────────────────────────┐   │
│  │   skills.ts    │  │     battleDescriptions.ts       │   │
│  │   技能定义     │  │      战斗描述模板               │   │
│  │  - DEFAULT_SKILLS│  │  - 物理攻击描述               │   │
│  │  - 技能分类    │  │  - 魔法攻击描述               │   │
│  │  - 技能配置    │  │  - 专属技能描述               │   │
│  └────────────────┘  └─────────────────────────────────┘   │
│  ┌────────────────┐  ┌─────────────────────────────────┐   │
│  │ basicBattles.ts│  │   skillDescriptionMapping.ts   │   │
│  │   战斗配置     │  │      技能描述映射              │   │
│  │  - 参与者技能  │  │  - 技能ID映射                 │   │
│  │  - 战斗场景    │  │  - 描述类型配置               │   │
│  │  - 难度分级    │  │  - 映射工具函数               │   │
│  └────────────────┘  └─────────────────────────────────┘   │
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
  - **战斗日志描述系统集成**:
    - 使用生成的描述文本显示战斗事件
    - 支持降级到原有简单文本显示
    - 保持向后兼容性
  - **战斗经验值结算**:
    - 在用户确认战斗结果对话框时结算经验值
    - 只有胜利时才结算经验值
    - 根据敌人等级计算经验值
    - 更新MVU变量并刷新经验条UI
- **数据来源**:
  - 从 `useBattleState` 获取响应式战斗数据
  - 从 `useBattleSystem` 调用方法处理行动
  - 从 `useStatData` 获取经验值相关数据
  - 使用 `StatDataBindingService` 更新MVU变量
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
- **BattleDebugPanel**: 战斗调试面板（条件显示）
  - **EnemyDataEditor**: 敌人数据编辑器
  - **PlayerDataEditor**: 玩家数据编辑器
  - **JsonImportExport**: JSON导入导出工具
  - **DebugControls**: 调试控制面板

### 2. 组合式函数层

#### useBattleSystem (战斗编排器)

- **定位**: 战斗流程的唯一编排者
- **职责**:
  - 启动战斗（初始化 → Phaser → 状态同步）
  - 处理玩家行动（调用服务 → 更新状态 → 检查结束）
  - 统一事件处理（避免事件监听分散）
  - 协调各组合式函数和服务
  - **调试模式支持**：
    - 提供 `startTestBattle()` 方法启动调试模式
    - 设置 `isDebugMode` 标记
    - 支持调试事件监听和处理
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
  - **调试功能支持**：
    - 提供 `updateParticipant()` 方法实时修改参与者属性
    - 支持调试模式下的状态历史记录
    - 提供状态快照和恢复功能
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
  - 初始化战斗（验证配置、导入技能、映射属性）
  - 启动 Phaser 场景（构造 payload、发送事件）
  - 处理玩家行动（调用 BattleEngine、发送事件）
  - 处理 AI 回合（简单 AI 逻辑）
  - 处理战斗结束（保存结果、触发后续流程）
  - **战斗日志描述系统**:
    - 生成战斗事件描述（通用描述 + 专属技能描述）
    - 收集和管理战斗日志
    - 描述缓存和性能优化
    - 支持动态描述配置
- **数据流**:

  ```
  Input: 从 useBattleSystem 接收配置和行动
  Processing: 调用 BattleEngine 计算 + 生成描述
  Output: 通过 EventBus 发送带描述的事件
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
  - 解析和标准化资源路径（支持本地资源和外部URL）
  - **统一资源获取入口**：所有战斗相关资源（敌人立绘、技能视频、技能图片、背景图片等）必须通过此服务获取
  - 自动定位 assets 文件夹位置（开发模式和生产模式自动切换）
  - 提供示例 URL 列表
  - 从配置中提取资源 URL
- **核心方法**:
  - `resolveAssetPath(originalPath: string): string` - 解析资源路径，返回可用于加载的完整路径
  - `isValidUrl(url: string): boolean` - 验证URL格式
  - `isLocalAsset(path: string): boolean` - 判断是否为本地资源
  - `extractResourceUrls(config: any)` - 从战斗配置中提取所有资源URL
- **使用场景**:
  - BattleScene.preload() 中加载背景图片和敌人立绘时
  - EnemyBattleObject 中创建技能视频和图片资源时
  - 任何需要获取战斗资源的地方
- **不负责**:
  - 资源预加载（由 Phaser BattleScene.preload 处理）
  - 资源缓存（由 Phaser 纹理管理器处理）

#### BattleConfigService (配置管理)

- **定位**: 战斗配置和技能的管理中心
- **职责**:
  - 注册和管理战斗配置
  - **技能管理系统**:
    - 从 `data/skills.ts` 初始化默认技能
    - 从战斗配置导入使用的技能
    - 提供技能查询和验证功能
    - 支持自定义技能注册
  - 提供配置查询和过滤
  - 验证配置有效性
  - 创建动态配置
  - 支持配置模板系统
  - 提供配置统计信息
  - **动态敌人配置支持**:
    - 注册动态生成的敌人战斗配置
    - 管理动态配置的生命周期
    - 提供动态配置查询和移除功能
- **配置导入流程**:

  ```
  1. BattleConfigInitializer.initialize()
     ↓ 导入 basicBattleConfigs
  2. BattleConfigService.registerBattleConfigs()
     ↓ 注册到内部 Map
  3. BattleConfigService.initializeDefaultSkills()
     ↓ 从 data/skills.ts 加载 DEFAULT_SKILLS
  4. 配置验证和统计
     ↓ 提供查询接口
  5. useBattleConfig 通过依赖注入访问
  ```

- **技能导入流程**:

  ```
  1. BattleService.initializeBattle(config)
     ↓ 调用
  2. BattleConfigService.importSkillsFromBattleConfig(participants)
     ↓ 扫描 participants.skills 数组
  3. 验证技能ID有效性
     ↓ 导入到技能注册表
  4. BattleEngine 使用导入的技能进行计算
  ```

#### DynamicEnemyService (动态敌人生成)

- **定位**: 基于MVU变量的动态敌人生成服务
- **职责**:
  - 从MVU变量读取敌人基础信息（name, race, variantId, gender）
  - 基于玩家等级生成敌人等级（敌人等级 = 玩家等级）
  - 使用硬编码战斗属性配置（不使用MVU属性转换）
  - 生成完整的战斗配置（包含玩家和敌人）
  - 集成到现有战斗流程
- **数据流**:

  ```
  Input: enemyId (敌人ID)
  Processing: 
    1. 从MVU变量获取敌人基础信息
    2. 获取玩家等级
    3. 基于玩家等级确定敌人等级
    4. 使用硬编码战斗属性配置
    5. 获取立绘和背景
    6. 生成技能配置
    7. 获取玩家配置
  Output: BattleConfig (完整战斗配置)
  ```

- **关键特性**:
  - 敌人等级基于玩家等级，确保战斗平衡
  - 使用configs/enemy/enemyConfig.ts中的硬编码配置
  - 支持battle_end字段控制敌人是否可战斗
  - 完全集成到现有战斗系统，无需额外修改

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

#### HistoryManager (历史管理器)

- **定位**: 战斗状态历史管理服务
- **职责**:
  - 记录战斗状态变更历史
  - 提供撤销/重做功能
  - 管理历史记录大小限制
  - 支持状态快照和恢复
  - 提供历史信息查询
- **关键特性**:
  - 最多保存50个历史状态
  - 支持暂停/恢复记录
  - 提供历史导出/导入功能
  - 自动清理过期历史

#### BattleResultHandler (结果处理器)

- **定位**: 战斗结果的后处理服务
- **职责**:
  - 处理战斗结束后的结果保存
  - 触发后续游戏流程
  - 更新游戏状态和成就
  - **战斗故事生成**:
    - 基于战斗日志生成战后故事
    - 整合战斗叙述和结果总结
    - 支持故事结构化管理

### 4. Phaser 层

#### BattleScene

- **定位**: Phaser 战斗场景
- **职责**:
  - 资源加载（在 preload 阶段加载背景和敌人立绘）
    - **必须使用 BattleResourceService.resolveAssetPath() 解析所有资源路径**
    - 背景图片：`resourceService.resolveAssetPath(battleConfig.background.image)`
    - 敌人立绘：`resourceService.resolveAssetPath(enemy.enemyPortrait.image)`
    - 技能图片：`resourceService.resolveAssetPath(skillConfig.src)`
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
      1. 使用 BattleResourceService.resolveAssetPath() 解析资源路径
      2. 使用 Phaser Loader API 加载资源
    - create() 创建游戏对象
    - updateBattleDisplay() 更新显示
  Output: 
    - 渲染到 canvas
  ```

- **资源加载示例**:

  ```typescript
  // 背景图片
  const bgResolvedPath = this.resourceService.resolveAssetPath(battleConfig.background.image);
  this.load.image(bgKey, bgResolvedPath);
  
  // 敌人立绘
  const portraitResolvedPath = this.resourceService.resolveAssetPath(enemy.enemyPortrait.image);
  this.load.image(portraitKey, portraitResolvedPath);
  
  // 技能图片
  const skillImageResolvedPath = this.resourceService.resolveAssetPath(skillConfig.src);
  this.load.image(skillImageKey, skillImageResolvedPath);
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
  - **技能资源管理**：
    - 使用 BattleResourceService.resolveAssetPath() 解析技能视频和图片路径
    - 预加载所有匹配的技能视频资源
    - 根据技能ID动态选择并播放视频/图片资源
- **资源获取**:
  - 所有技能视频和图片资源必须通过 BattleResourceService.resolveAssetPath() 获取
  - 支持动态资源选择（根据敌人种族、变体、类型匹配资源）
  - 支持静态配置回退（兼容旧格式）

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
container.bind<DynamicEnemyService>(TYPES.DynamicEnemyService).to(DynamicEnemyService).inSingletonScope();
container.bind<PhaserManager>(TYPES.PhaserManager).to(PhaserManager).inSingletonScope();
container.bind<HistoryManager>(TYPES.HistoryManager).to(HistoryManager).inSingletonScope();
```

### 服务依赖图

```
GameCore
├── BattleConfigInitializer
│   └── BattleConfigService
│       ├── BattleResourceService
│       └── data/skills.ts (DEFAULT_SKILLS)
├── BattleService
│   ├── EventBus
│   ├── BattleEngine
│   ├── BattleResultHandler
│   ├── BattleConfigService (技能导入)
│   ├── SameLayerService
│   └── SaveLoadManagerService
├── DynamicEnemyService
│   └── StatDataBindingService
├── HistoryManager
│   └── EventBus
└── PhaserManager
    └── EventBus
```

### 初始化顺序

1. **基础服务**: EventBus, UIService
2. **数据层**: data/skills.ts (DEFAULT_SKILLS 静态导入)
3. **配置服务**: BattleResourceService → BattleConfigService → BattleConfigInitializer
4. **计算服务**: BattleEngine, BattleResultHandler
5. **调试服务**: HistoryManager
6. **动态服务**: DynamicEnemyService
7. **协调服务**: BattleService, PhaserManager
8. **核心服务**: GameCore

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
   
8. 技能系统初始化
   BattleConfigService.initializeDefaultSkills()
   ↓ 从 data/skills.ts 加载 DEFAULT_SKILLS
   
9. 配置验证
   BattleConfigService.validateBattleConfig()
   ↓ 验证每个配置的有效性
   
10. 服务就绪
    配置和技能可通过 useBattleConfig 访问
    ↓ 提供
   
11. Vue 组件使用
    useBattleConfig.startBattle(configId)
    - 获取配置
    - 导入技能（从战斗配置）
    - 验证配置
    - 启动战斗
```

### 动态敌人配置完整流程

```
1. MVU变量设置
   enemies.enemy1.name = "哥布林战士"
   enemies.enemy1.race = "人类"
   enemies.enemy1.variantId = "战士"
   enemies.enemy1.battle_end = false
   ↓ 存储到MVU变量系统

2. UI触发
   PlayingRoot.vue 检测到 battle_end = false 的敌人
   ↓ 显示"与敌人战斗"按钮
   用户点击按钮
   ↓ 调用 startDynamicBattle(enemyId)

3. 动态配置生成
   useBattleConfig.startDynamicBattle(enemyId)
   ↓ 调用
   DynamicEnemyService.generateEnemyBattleConfig(enemyId)
   ↓ 处理流程:
   - 从MVU变量获取敌人基础信息
   - 获取玩家等级
   - 基于玩家等级确定敌人等级
   - 使用硬编码战斗属性配置
   - 获取立绘和背景
   - 生成技能配置
   - 获取玩家配置
   ↓ 返回完整BattleConfig

4. 动态配置注册
   BattleConfigService.registerDynamicBattleConfig(configId, battleConfig)
   ↓ 注册到内部Map
   ↓ 配置ID: "dynamic_enemy_" + enemyId

5. 启动战斗
   useBattleConfig.startBattle(dynamicConfigId)
   ↓ 走标准战斗启动流程
   ↓ 与静态配置完全相同的处理方式

6. 战斗结束处理
   战斗结束后，battle_end状态保持不变
   ↓ 敌人仍可重复战斗（除非手动设置为true）
   ↓
7. 用户确认结果对话框
   如果战斗胜利，结算经验值
   - 根据敌人等级计算经验值
   - 更新MVU变量
   - 刷新经验条UI
   ↓ 显示经验值获得提示
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
   - 导入技能（从战斗配置）
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
   - 使用 BattleResourceService.resolveAssetPath() 解析所有资源路径
     * 背景图片：resourceService.resolveAssetPath(battleConfig.background.image)
     * 敌人立绘：resourceService.resolveAssetPath(enemy.enemyPortrait.image)
     * 技能图片：resourceService.resolveAssetPath(skillConfig.src)
   - 使用 Phaser Loader API 加载解析后的资源路径
   ↓
   BattleScene.create() [创建场景]
   - 创建背景（使用解析后的背景图片路径）
   - 创建敌人对象（使用解析后的立绘路径）
   - EnemyBattleObject 使用 BattleResourceService 解析技能视频/图片路径
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
   ↓ 生成描述
   - 根据技能类型选择描述模板
   - 生成战斗事件描述文本
   - 记录到战斗日志
   ↓ eventBus.emit
   - battle:damage (带描述文本)
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
   ↓ 调用 BattleResultHandler
   - 获取战斗日志
   - 生成战斗故事
   - 保存结果和故事
   ↓ 发送 battle:result 事件
   
10. 结束处理
    useBattleSystem.handleBattleEnd(result)
    - gameState.exitBattle()
    - battleState.endBattle()
    - 显示战斗结果对话框（包含战斗故事）
    ↓
11. 用户确认结果对话框
    BattleRoot.vue closeBattleResult()
    ↓ 如果 winner === 'player'
    - 从战斗状态获取敌人等级
    - 使用 getEnemyExpByLevel() 计算经验值
    - 获取当前经验值并累加
    - 使用 StatDataBindingService.setStatDataField() 更新MVU变量
    - 刷新经验条UI（refreshExpBarData()）
    - 显示经验值获得提示
    ↓
12. 退出战斗
    exitBattle()
    - 清理战斗状态
    - 返回游戏主界面
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

- BattleResourceService 负责资源路径解析和验证，统一资源获取入口
- Phaser BattleScene.preload 负责实际加载，利用 Phaser 的加载器
- 避免重复加载和缓存管理
- 确保所有资源路径都经过统一处理，支持开发模式和生产模式自动切换

**实现**:

- 删除了冗余的 `useBattleResourceManager`
- BattleResourceService 提供统一的资源路径解析功能
  - `resolveAssetPath()` 方法统一处理所有资源路径
  - 自动识别本地资源和外部URL
  - 自动处理开发模式和生产模式的路径差异
- **所有资源获取必须通过 BattleResourceService**:
  - 敌人立绘：`resourceService.resolveAssetPath(enemyPortrait.image)`
  - 技能视频：`resourceService.resolveAssetPath(skillVideo.src)`
  - 技能图片：`resourceService.resolveAssetPath(skillImage.src)`
  - 背景图片：`resourceService.resolveAssetPath(background.image)`
- BattleScene.preload 和 EnemyBattleObject 使用解析后的路径加载资源

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

1. **在 `data/skills.ts` 中定义技能**:

   ```typescript
   {
     id: 'new_skill',
     name: '新技能',
     description: '技能描述',
     category: 'physical' | 'magical',
     target: 'single' | 'all' | 'self',
     powerMultiplier: 1.0,
     flatPower: 0,
     hitModifier: 0,
     critBonus: 0,
     animationKey: 'new_skill',
     tags: ['custom', 'special'],
   }
   ```

2. **在战斗配置中使用技能**:

   ```typescript
   // 在 basicBattles.ts 或其他配置文件中
   participants: [
     {
       id: 'player',
       skills: ['power_strike', 'new_skill'], // 添加新技能
       // ... 其他配置
     }
   ]
   ```

3. **在 `BattleEngine` 中实现技能效果计算**（如果需要特殊逻辑）
4. **在 Vue 组件中添加技能选择 UI**（如果需要）
5. **系统自动处理**：
   - `BattleConfigService` 自动从 `DEFAULT_SKILLS` 加载新技能
   - `BattleService` 自动从战斗配置导入使用的技能
   - 无需手动注册技能

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

### 添加新的动态敌人类型

1. **在敌人配置中添加新种族/变体**:

   ```typescript
   // 在 configs/enemy/enemyConfig.ts 中添加
   ENEMY_TYPE_MAPPING['新种族'] = {
     '新变体': 'normal' | 'high_dodge' | 'high_magic'
   };
   
   ENEMY_BATTLE_STATS_CONFIG[level]['新类型'] = {
     atk: 数值,
     hatk: 数值,
     def: 数值,
     hdef: 数值,
     hit: 数值,
     evade: 数值,
     critRate: 数值,
     critDamageMultiplier: 数值,
     hhp: 数值,
     maxHp: 数值,
   };
   ```

2. **添加技能配置**:

   ```typescript
   // 在 configs/enemy/enemyConfig.ts 中添加
   ENEMY_SKILLS_MAPPING['新种族']['新变体'] = ['skill1', 'skill2'];
   ```

3. **添加立绘配置**:

   ```typescript
   // 在 configs/enemy/enemyConfig.ts 中添加
   ENEMY_PORTRAIT_MAPPING['新种族']['新变体'] = '立绘URL';
   ```

4. **在MVU变量中设置敌人**:

   ```yaml
   enemies:
     new_enemy:
       name: "新敌人名称"
       race: "新种族"
       variantId: "新变体"
       gender: "男"
       battle_end: false
   ```

5. **系统自动处理**:
   - PlayingRoot.vue 自动显示战斗按钮
   - DynamicEnemyService 自动生成战斗配置
   - 战斗系统自动处理新敌人类型

### 添加新的战斗对象类型

1. **创建对象类**:

   ```typescript
   // 在 phaser/objects/ 中创建新对象
   export class NewBattleObject extends Phaser.GameObjects.Container {
     private resourceService: BattleResourceService;
     
     constructor(scene: Phaser.Scene, config: any) {
       super(scene);
       // 注入 BattleResourceService
       this.resourceService = scene.registry.get('resourceService');
       // 实现对象逻辑
     }
     
     private loadResource(originalPath: string): string {
       // 必须使用 BattleResourceService 解析资源路径
       return this.resourceService.resolveAssetPath(originalPath);
     }
   }
   ```

2. **在 BattleScene 中使用**:

   ```typescript
   // 在 BattleScene.create() 中创建对象
   const newObject = new NewBattleObject(this, config);
   this.add.existing(newObject);
   ```

### 正确使用 BattleResourceService 获取资源

**重要原则**：所有战斗相关资源（敌人立绘、技能视频、技能图片、背景图片等）必须通过 `BattleResourceService.resolveAssetPath()` 获取，不能直接使用原始路径。

#### 1. 在 BattleScene 中加载资源

```typescript
async preload(): Promise<void> {
  const battleConfig = this.registry.get('battleConfig');
  
  // ✅ 正确：使用 BattleResourceService 解析路径
  if (battleConfig.background?.image) {
    const resolvedPath = this.resourceService.resolveAssetPath(battleConfig.background.image);
    this.load.image(bgKey, resolvedPath);
  }
  
  // ✅ 正确：敌人立绘
  for (const enemy of enemies) {
    const resolvedPath = this.resourceService.resolveAssetPath(enemy.enemyPortrait.image);
    this.load.image(portraitKey, resolvedPath);
  }
  
  // ❌ 错误：直接使用原始路径
  // this.load.image(bgKey, battleConfig.background.image); // 不要这样做！
}
```

#### 2. 在 EnemyBattleObject 中获取技能资源

```typescript
private createVideoDomForSkill(skillId: string, resource: SkillResourceConfig): Phaser.GameObjects.DOMElement | null {
  // ✅ 正确：使用 BattleResourceService 解析路径
  const resolvedPath = this.resourceService.resolveAssetPath(resource.src);
  
  if (resource.type === 'video') {
    // 创建视频元素
    const video = document.createElement('video');
    video.src = resolvedPath; // 使用解析后的路径
    // ...
  } else if (resource.type === 'image') {
    // 创建图片元素
    const img = document.createElement('img');
    img.src = resolvedPath; // 使用解析后的路径
    // ...
  }
  
  // ❌ 错误：直接使用原始路径
  // video.src = resource.src; // 不要这样做！
}
```

#### 3. 支持的路径格式

BattleResourceService 支持多种路径格式：

```typescript
// 外部 URL（直接返回）
const url = 'https://example.com/image.png';
const resolved = resourceService.resolveAssetPath(url);
// 返回: 'https://example.com/image.png'

// 完整路径（自动添加 assets/ 前缀）
const fullPath = 'assets/images/enemies/cat.png';
const resolved = resourceService.resolveAssetPath(fullPath);
// 开发模式: 'http://localhost:8080/同层游玩RPG_remake/assets/images/enemies/cat.png'
// 生产模式: './assets/images/enemies/cat.png'

// 相对路径（自动处理）
const relativePath = './assets/images/enemies/cat.png';
const resolved = resourceService.resolveAssetPath(relativePath);
// 开发模式: 'http://localhost:8080/同层游玩RPG_remake/assets/images/enemies/cat.png'
// 生产模式: './assets/images/enemies/cat.png'

// 简化路径（自动添加 assets/ 前缀）
const simplePath = 'images/enemies/cat.png';
const resolved = resourceService.resolveAssetPath(simplePath);
// 开发模式: 'http://localhost:8080/同层游玩RPG_remake/assets/images/enemies/cat.png'
// 生产模式: './assets/images/enemies/cat.png'
```

#### 4. 资源路径解析流程

```text
原始路径（配置中）
  ↓
BattleResourceService.resolveAssetPath()
  ↓
判断路径类型
  ├─ 外部URL → 直接返回
  └─ 本地资源 → 解析并标准化
      ↓
自动检测环境（开发/生产）
  ↓
构建完整路径
  ├─ 开发模式: http://localhost:8080/项目名/assets/...
  └─ 生产模式: ./assets/...
  ↓
返回解析后的路径
  ↓
Phaser/浏览器加载资源
```

#### 5. 常见错误

```typescript
// ❌ 错误1：直接使用原始路径
this.load.image(key, config.image);

// ❌ 错误2：手动拼接路径
const path = `./assets/${config.image}`;
this.load.image(key, path);

// ❌ 错误3：在非浏览器环境使用
const path = resourceService.resolveAssetPath(config.image);
// 在 Node.js 环境中会返回默认路径，但应该避免在非浏览器环境使用

// ✅ 正确：始终使用 BattleResourceService
const resolvedPath = this.resourceService.resolveAssetPath(config.image);
this.load.image(key, resolvedPath);
```

#### 6. 依赖注入

确保 BattleResourceService 已正确注入：

```typescript
// 在 BattleScene 中
export class BattleScene extends Phaser.Scene {
  private resourceService: BattleResourceService;
  
  init(data?: any): void {
    // 从容器获取服务
    const container = data?.container;
    if (container) {
      this.resourceService = container.get<BattleResourceService>(TYPES.BattleResourceService);
      // 注册到 registry，供子对象使用
      this.registry.set('resourceService', this.resourceService);
    }
  }
}

// 在 EnemyBattleObject 中
export class EnemyBattleObject extends Phaser.GameObjects.Container {
  private resourceService: BattleResourceService;
  
  constructor(scene: Phaser.Scene, config: any) {
    super(scene);
    // 从 registry 获取服务
    this.resourceService = scene.registry.get('resourceService');
  }
}
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

## 战斗日志描述系统架构

### 系统概述

战斗日志描述系统为战斗事件提供丰富、生动的叙述性文本，支持通用描述和专属技能描述，最终实现战斗日志驱动的战后故事生成。

### 架构设计理念

- **集成式架构**：将战斗日志功能直接集成到现有服务中，而非创建独立服务
- **分层描述架构**：通用描述 + 专属技能描述
- **最小化改动**：只需要修改现有文件，无需新增服务
- **向后兼容**：Vue 组件支持降级处理，确保系统稳定性

### 核心组件

#### 1. 数据结构层

**文件**: `models/BattleLogSchemas.ts`

- `DescriptionType` - 描述类型枚举（物理、魔法、专属）
- `BattleLogItem` - 战斗日志项接口
- `SkillDescriptionConfig` - 技能描述配置接口
- `BattleStoryResult` - 战斗故事生成结果接口
- `BattleLogStats` - 战斗日志统计接口

#### 2. 描述模板层

**文件**: `data/battleDescriptions.ts`

- `PHYSICAL_DESCRIPTIONS` - 通用物理攻击描述模板
- `MAGICAL_DESCRIPTIONS` - 通用魔法攻击描述模板
- `CUSTOM_SKILL_DESCRIPTIONS` - 专属技能描述模板

**文件**: `data/skillDescriptionMapping.ts`

- `SKILL_DESCRIPTION_MAPPING` - 技能描述映射配置
- 工具函数：`getSkillDescriptionConfig`, `hasCustomDescription`

#### 3. 服务集成层

**BattleService 扩展**:

```typescript
// 新增属性
private battleLog: BattleLogItem[] = [];
private descriptionCache = new Map<string, string>();
private descriptions = {
  physical: PHYSICAL_DESCRIPTIONS,
  magical: MAGICAL_DESCRIPTIONS,
  custom: CUSTOM_SKILL_DESCRIPTIONS
};

// 新增方法
private generateDescription(event: any): string
private recordBattleEvent(event: any, description: string)
public getBattleLog(): BattleLogItem[]
public getBattleLogStats(): BattleLogStats
```

**BattleResultHandler 扩展**:

```typescript
// 新增方法
private generateBattleStory(battleLog: BattleLogItem[], result: BattleResult): BattleStoryResult
private generateBattleIntroduction(battleLog: BattleLogItem[]): string
private generateBattleNarrative(battleLog: BattleLogItem[]): string
private generateBattleConclusion(result: BattleResult): string
```

#### 4. UI 集成层

**BattleRoot.vue 优化**:

```typescript
// 事件监听优化
eventBus.on('battle:damage', (data: any) => {
  if (data.description) {
    addBattleLog(data.description, 'info');
  } else {
    // 降级到原有逻辑
  }
});
```

### 数据流

#### 描述生成流程

```
战斗事件 → BattleService.generateDescription()
  ↓
根据技能类型选择描述模板
  ↓
替换占位符 ({actor}, {target}, {damage})
  ↓
缓存描述文本
  ↓
记录到战斗日志
  ↓
发送带描述的事件
```

#### 故事生成流程

```
战斗结束 → BattleResultHandler.persistAndAnnounce()
  ↓
获取战斗日志
  ↓
生成战斗故事
  ├─ 战斗介绍
  ├─ 战斗叙述
  └─ 战斗结论
  ↓
保存结果和故事
  ↓
发送故事数据
```

### 性能优化

#### 缓存机制

- **描述缓存**：避免重复生成相同描述
- **缓存大小限制**：默认1000条，自动清理旧缓存
- **缓存键生成**：基于事件特征生成唯一键

#### 内存管理

- **日志大小限制**：默认1000条，自动清理旧日志
- **批量清理**：`cleanupOldData()` 方法
- **统计信息**：提供缓存和日志使用统计

### 扩展性

#### 添加新技能描述

1. 在 `battleDescriptions.ts` 中添加专属描述
2. 在 `skillDescriptionMapping.ts` 中添加映射配置
3. 系统自动识别并使用专属描述

#### 动态配置

```typescript
// 运行时添加技能描述
battleService.addCustomSkillDescription('new_skill', descriptions);

// 运行时添加通用描述
battleService.addGenericDescriptions(DescriptionType.PHYSICAL, descriptions);
```

### 维护指南

#### 添加新技能描述

1. **在描述模板中添加**：

   ```typescript
   CUSTOM_SKILL_DESCRIPTIONS['new_skill'] = {
     hit: "新技能的命中描述",
     critical: "新技能的暴击描述", 
     miss: "新技能的未命中描述"
   };
   ```

2. **在技能映射中添加**：

   ```typescript
   SKILL_DESCRIPTION_MAPPING['new_skill'] = {
     skillId: 'new_skill',
     type: DescriptionType.CUSTOM,
     customDescription: 'new_skill'
   };
   ```

#### 性能调优

```typescript
// 调整缓存大小
battleService.setCacheSizeLimit(2000);

// 调整日志大小
battleService.setLogSizeLimit(500);

// 手动清理
battleService.cleanupOldData();
```

## 战斗经验值结算系统架构

### 系统概述

战斗经验值结算系统在战斗结束后，当用户确认战斗结果对话框时，根据敌人等级计算并结算经验值，更新MVU变量并刷新UI显示。

### 架构设计理念

- **延迟结算架构**：经验值结算不是在战斗结束时立即执行，而是在用户确认结果对话框后结算
- **条件结算**：只有战斗胜利时才结算经验值，失败时不给予经验值
- **基于等级**：经验值根据敌人等级从经验值表中查询获得
- **UI同步**：结算后自动刷新经验条UI，确保显示最新状态

### 核心组件

#### BattleRoot.vue (经验值结算入口)

- **定位**: 战斗结果对话框的关闭处理函数
- **职责**:
  - 检查战斗结果是否为胜利
  - 从战斗状态中获取敌人等级
  - 计算经验值并更新MVU变量
  - 刷新经验条UI
  - 显示经验值获得提示

- **数据流**:

```
用户点击"返回游戏"按钮
  ↓
closeBattleResult()
  ↓
检查 winner === 'player'
  ↓
从 battleState.battleState.value.participants 获取敌人信息
  ↓
获取敌人等级 (enemyParticipant.level)
  ↓
使用 getEnemyExpByLevel(enemyLevel) 计算经验值
  ↓
使用 useStatData.getTotalExp() 获取当前经验值
  ↓
计算新经验值 = 当前经验值 + 获得经验值
  ↓
使用 StatDataBindingService.setStatDataField('exp', newExp) 更新MVU变量
  ↓
使用 useStatData.refreshExpBarData() 刷新经验条UI
  ↓
显示成功提示："获得 X 经验值！"
  ↓
关闭对话框并退出战斗
```

### 经验值计算

#### 经验值表系统

- **数据来源**: `data/levelExpTable.ts`
- **函数**: `getEnemyExpByLevel(level: number): number`
- **经验值表**: `LEVEL_EXP_TABLE`（1-20级）

经验值表示例：

```typescript
1: { enemyExp: 50, expRequired: 50, totalExp: 50, killsRequired: 1 }
2: { enemyExp: 100, expRequired: 100, totalExp: 150, killsRequired: 1 }
3: { enemyExp: 150, expRequired: 300, totalExp: 450, killsRequired: 2 }
// ... 更多等级
```

### 实现细节

#### 结算时机

- **触发点**: `BattleRoot.vue` 的 `closeBattleResult()` 函数
- **触发条件**:
  1. 用户点击战斗结果对话框的"返回游戏"按钮
  2. 战斗结果为胜利（`battleResult.value?.winner === 'player'`）
- **异步处理**: 整个结算过程是异步的，使用 `async/await` 处理

#### 错误处理

- **容错机制**: 即使经验值结算失败，也会继续关闭对话框并退出战斗
- **日志记录**: 所有错误都会记录到控制台，便于调试
- **服务检查**: 在更新MVU变量前检查 `StatDataBindingService` 是否可用

#### UI更新

- **经验条刷新**: 结算后调用 `useStatData.refreshExpBarData()` 刷新经验条数据
- **成功提示**: 使用 `showSuccess()` 显示经验值获得提示
- **自动更新**: UI会自动响应MVU变量的更新，无需手动触发

### 数据流详解

#### 完整结算流程

```
1. 战斗结束
   BattleService.onBattleEnd(result)
   ↓
2. 发送 battle:result 事件
   ↓
3. BattleRoot.vue 监听事件
   - 设置 battleResult.value
   - 显示战斗结果对话框
   ↓
4. 用户查看战斗结果
   - 显示胜利/失败信息
   - 显示战斗回合数
   ↓
5. 用户点击"返回游戏"按钮
   BattleResultDialog @close 事件
   ↓
6. BattleRoot.vue closeBattleResult()
   ↓
7. 检查战斗结果
   如果 winner === 'player'
   ↓
8. 获取敌人信息
   从 battleState.battleState.value.participants 查找敌人
   ↓
9. 计算经验值
   getEnemyExpByLevel(enemyParticipant.level)
   ↓
10. 更新MVU变量
    StatDataBindingService.setStatDataField('exp', newExp, '战斗胜利获得经验')
    ↓
11. 刷新UI
    useStatData.refreshExpBarData()
    ↓
12. 显示提示
    showSuccess(`获得 ${expGained} 经验值！`)
    ↓
13. 关闭对话框
    showBattleResult.value = false
    battleResult.value = null
    ↓
14. 退出战斗
    exitBattle()
```

### 关键代码位置

#### BattleRoot.vue

```typescript
async function closeBattleResult() {
  // 如果战斗胜利，结算经验值
  if (battleResult.value?.winner === 'player') {
    try {
      // 获取敌人信息（从战斗状态中）
      const enemyParticipant = battleState.battleState.value?.participants?.find(
        (p: any) => p.side === 'enemy'
      );

      if (enemyParticipant?.level) {
        // 计算经验值
        const expGained = getEnemyExpByLevel(enemyParticipant.level);
        
        if (expGained > 0) {
          // 获取当前经验值
          const currentExp = await statData.getTotalExp();
          const newExp = currentExp + expGained;
          
          // 更新MVU变量
          if (statDataBindingService) {
            await statDataBindingService.setStatDataField('exp', newExp, '战斗胜利获得经验');
            
            // 刷新经验条
            await statData.refreshExpBarData();
            
            // 显示提示
            showSuccess(`获得 ${expGained} 经验值！`);
          }
        }
      }
    } catch (error) {
      console.error('[BattleRoot] 结算经验值失败:', error);
    }
  }

  // 关闭对话框和退出战斗
  showBattleResult.value = false;
  battleResult.value = null;
  exitBattle();
}
```

### 扩展性

#### 修改经验值规则

如果需要修改经验值计算规则，只需修改 `data/levelExpTable.ts` 中的 `LEVEL_EXP_TABLE` 表即可。

#### 添加额外奖励

可以在经验值结算时添加额外的奖励逻辑，如：

- 战斗评分奖励
- 连续胜利奖励
- 特殊敌人奖励

### 维护注意事项

1. **结算时机**: 确保经验值结算只在用户确认对话框时执行，而不是在战斗结束时执行
2. **数据一致性**: 确保从战斗状态中获取的敌人信息是准确的
3. **错误处理**: 确保结算失败不会影响对话框关闭和战斗退出
4. **UI同步**: 确保经验值更新后UI能够正确刷新

## 战斗调试系统架构

### 系统概述

战斗调试系统为同层游玩RPG_remake项目提供了强大的测试和调试功能，允许开发者在战斗过程中实时调整敌人和玩家属性，导入导出配置，以及使用撤销/重做功能。

### 架构设计理念

- **条件显示架构**：调试功能仅在测试模式下显示，不影响正常游戏体验
- **模块化设计**：调试面板由多个独立组件组成，便于维护和扩展
- **事件驱动通信**：通过EventBus进行调试功能与战斗系统的通信
- **历史管理**：提供完整的状态历史记录和恢复功能

### 核心组件

#### 1. 调试模式判断

**文件**: `models/BattleSchemas.ts`

```typescript
export const BattleConfigSchema = z.object({
  // ... 其他配置
  isDebugMode: z.boolean().optional().default(false),
});
```

**文件**: `composables/useBattleConfig.ts`

```typescript
const startTestBattle = async (configId: string, overrides?: Partial<BattleConfig>) => {
  const debugOverrides = {
    ...overrides,
    isDebugMode: true,
  };
  return await startBattle(configId, debugOverrides, options);
};
```

#### 2. 调试面板组件

**文件**: `vue/components/BattleDebugPanel.vue`

- **定位**: 调试功能的统一入口
- **职责**:
  - 提供标签页切换界面
  - 条件显示（仅在 `isDebugMode` 为 true 时显示）
  - 管理调试面板的折叠/展开状态
  - 协调各个子组件的功能

**子组件**:

- **EnemyDataEditor**: 敌人数据实时编辑器
- **PlayerDataEditor**: 玩家数据实时编辑器  
- **JsonImportExport**: JSON配置导入导出工具
- **DebugControls**: 调试控制面板（撤销/重做/重置）

#### 3. 数据编辑器组件

**EnemyDataEditor.vue**:

- 实时编辑敌人属性（HP、攻击力、防御力等）
- 技能管理系统（添加/移除技能）
- 数据验证和错误提示
- 支持重置到初始状态

**PlayerDataEditor.vue**:

- 实时编辑玩家属性
- 与敌人编辑器相同的功能特性
- 支持更多技能类型

#### 4. JSON导入导出系统

**JsonImportExport.vue**:

- 支持完整格式和简化格式的JSON导入
- 文件拖拽上传和选择
- 数据验证和错误处理
- 示例模板下载
- 当前状态导出功能

#### 5. 历史管理系统

**文件**: `services/HistoryManager.ts`

```typescript
export class HistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex = -1;
  private maxHistorySize = 50;

  recordChange(state: BattleStateExtended, description: string): void
  undo(): BattleStateExtended | null
  redo(): BattleStateExtended | null
  canUndo(): boolean
  canRedo(): boolean
}
```

### 数据流

#### 调试模式启动流程

```
1. 用户调用 startTestBattle()
   ↓
2. useBattleConfig 设置 isDebugMode: true
   ↓
3. BattleRoot.vue 检测到调试模式
   ↓
4. 显示 BattleDebugPanel 组件
   ↓
5. 初始化历史管理器
   ↓
6. 设置调试事件监听器
```

#### 实时数据编辑流程

```
1. 用户在编辑器中修改属性
   ↓
2. 触发 updateField() 方法
   ↓
3. 数据验证和错误检查
   ↓
4. 发送 battle:debug-update-* 事件
   ↓
5. BattleRoot.vue 监听事件
   ↓
6. 调用 battleState.updateParticipant()
   ↓
7. 更新战斗状态
   ↓
8. 记录历史（如果启用）
   ↓
9. 触发响应式更新
```

#### 历史管理流程

```
1. 状态变更时自动记录历史
   ↓
2. HistoryManager.recordChange()
   ↓
3. 存储状态快照
   ↓
4. 用户点击撤销/重做
   ↓
5. HistoryManager.undo()/redo()
   ↓
6. 返回历史状态
   ↓
7. battleState.updateBattleState()
   ↓
8. 恢复战斗状态
```

### 事件系统

#### 调试事件列表

```typescript
// 数据更新事件
'battle:debug-update-enemy'     // 更新敌人数据
'battle:debug-update-player'    // 更新玩家数据

// 重置事件
'battle:debug-reset-enemy'      // 重置敌人到初始状态
'battle:debug-reset-player'     // 重置玩家到初始状态
'battle:debug-reset'             // 重置整个战斗状态

// 历史管理事件
'battle:debug-undo'              // 撤销操作
'battle:debug-redo'              // 重做操作

// 导入导出事件
'battle:debug-import-enemy'     // 导入敌人数据
'battle:debug-import-full-config' // 导入完整配置

// 预设事件
'battle:debug-preset'            // 应用预设配置
```

### 性能优化

#### 历史管理优化

- **大小限制**: 最多保存50个历史状态
- **自动清理**: 超出限制时自动删除最旧的历史
- **暂停记录**: 支持暂停历史记录以节省内存
- **批量操作**: 支持批量历史操作

#### 数据验证优化

- **实时验证**: 输入时立即验证，避免无效数据
- **错误缓存**: 缓存验证错误，避免重复计算
- **类型安全**: 使用TypeScript和Zod确保类型安全

#### 事件处理优化

- **防抖机制**: 避免频繁的状态更新
- **事件过滤**: 只处理必要的调试事件
- **内存管理**: 及时清理事件监听器

### 扩展性

#### 添加新的调试功能

1. **创建新的编辑器组件**:

   ```typescript
   // 在 BattleDebugPanel.vue 中添加新标签页
   { id: 'new-feature', label: '新功能', icon: '🔧' }
   ```

2. **添加新的事件类型**:

   ```typescript
   // 在 BattleRoot.vue 中添加事件监听
   eventBus.on('battle:debug-new-feature', (data) => {
     // 处理新功能
   });
   ```

3. **扩展历史管理**:

   ```typescript
   // 在 HistoryManager 中添加新的历史类型
   recordSpecialChange(type: string, data: any): void
   ```

#### 自定义预设

```typescript
// 添加新的敌人预设
eventBus.emit('battle:debug-preset', 'custom_preset');

// 在事件监听器中处理
case 'custom_preset':
  updates = {
    hp: 150,
    maxHp: 150,
    level: 4,
    stats: { /* 自定义属性 */ }
  };
  break;
```

### 使用指南

#### 启动调试模式

```typescript
// 使用测试战斗按钮启动调试模式
const battleConfig = useBattleConfig();
await battleConfig.startTestBattle('yokai_battle');
```

#### 实时编辑属性

1. 在调试面板中选择"敌人数据"或"玩家数据"标签页
2. 修改属性值（HP、攻击力、防御力等）
3. 系统自动验证并应用更改
4. 使用撤销/重做功能测试不同参数

#### JSON导入导出

1. 选择"导入导出"标签页
2. 拖拽JSON文件或点击选择文件
3. 系统自动验证格式并导入数据
4. 使用导出功能保存当前状态

#### 调试控制

1. 选择"调试控制"标签页
2. 使用撤销/重做按钮测试不同状态
3. 使用重置按钮恢复到初始状态
4. 使用预设按钮快速设置敌人属性

### 维护注意事项

1. **调试功能隔离**: 确保调试功能不影响正常游戏逻辑
2. **性能监控**: 定期检查历史记录和缓存使用情况
3. **事件清理**: 确保调试事件监听器正确清理
4. **数据验证**: 保持数据验证规则的更新
5. **向后兼容**: 确保调试系统与战斗系统的兼容性

## 相关文档

- `BATTLE_EVENTS.md` - 事件契约详细说明
- `BATTLE_LOG_DESCRIPTION_SYSTEM.md` - 战斗日志描述系统设计
- `BATTLE_LOG_MAINTENANCE.md` - 战斗日志系统维护指南
- `BATTLE_DEBUG_SYSTEM.md` - 战斗调试系统设计文档
- `BATTLE_DEBUG_USAGE.md` - 战斗调试系统使用指南
- `progress.md` - 项目进度和已完成功能
- `activeContext.md` - 当前开发上下文
- `basicBattles.ts` - 基础战斗配置定义
- `BattleSchemas.ts` - 战斗数据结构定义
- `skills.ts` - 技能定义和配置
