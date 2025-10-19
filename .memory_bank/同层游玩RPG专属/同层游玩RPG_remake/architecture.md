# 架构与模式（同层游玩RPG_remake）

## 混合模式架构（2025-01-24 更新）

### 整体架构概览

项目采用**三层混合模式架构**，分为服务层、组合式函数层和Vue组件层：

```text
┌─────────────────────────────────────────────────────────────┐
│                    Vue 组件层 (UI Layer)                    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │   StartView     │ │  CreationRoot   │ │  PlayingRoot    │ │
│  │   SaveDialog    │ │  CommandQueue   │ │  InventoryDialog│ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                组合式函数层 (Composable Layer)               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │   useStatData   │ │ useGameServices │ │ useSaveLoad     │ │
│  │useGameStateMgr  │ │  useWorldbook   │ │  usePlayingLogic│ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   服务层 (Service Layer)                    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │StatDataBinding  │ │  EventBus       │ │  UIService      │ │
│  │SameLayerService │ │  Achievement    │ │  SaveLoadMgr    │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 核心架构特点

1. **分阶段初始化**: 通过 `GameCoreFactory` 实现四阶段服务初始化
2. **依赖注入**: 基于 Inversify 的完整 DI 容器，支持服务健康监控
3. **事件驱动**: 全局 EventBus 支持命名空间和通配符订阅
4. **响应式数据**: 纯 ref 架构，避免 computed 缓存开销
5. **状态管理**: 统一的游戏状态管理器，协调所有组合式函数
6. **MVU集成**: 完全基于 MVU 框架的数据绑定和变量管理

### 架构原则

#### 服务层（Service Layer） - 底层基础设施

**职责**：提供核心业务逻辑和数据访问能力

- 所有服务通过 `ServiceContainer` 管理依赖关系
- 在 `GameCoreFactory` 中分阶段初始化所有服务
- 服务间依赖通过 `serviceContainer.get<T>(TYPES.ServiceName)` 获取
- 保持服务层的解耦和可测试性
- 使用 Inversify 进行依赖注入管理，支持服务健康监控

**核心服务**：

- **StatDataBindingService**: 统计数据绑定，统一管理MVU变量的读写，提供纯ref架构支持
- **EventBus**: 事件总线，支持命名空间和通配符订阅，全局事件协调
- **SameLayerService**: 同层聊天服务，整合了原TavernGenerationService功能
- **UIService**: UI交互服务，提供toastr等提示功能
- **AchievementService**: 成就系统，观察者模式监听游戏事件
- **SaveLoadManagerService**: 存档管理，支持IndexedDB和MVU变量，整合了原多个存档服务
- **CommandQueueService**: 指令队列管理，支持装备操作延迟执行
- **GameStateService**: 游戏状态管理，统一管理游戏阶段切换
- **DomPortalService**: DOM门户服务，管理游戏界面在酒馆中的显示位置
- **ResponsiveService**: 响应式设计管理，支持移动端适配

#### 组合式函数层（Composable Layer） - 中间适配层

**职责**：封装服务层功能，为Vue组件提供响应式接口

- Vue 组件通过 `inject(TYPES.ServiceName)` 获取服务实例
- 利用 Vue 的响应式系统提供更好的开发体验
- 采用纯 ref 架构，避免 computed 缓存开销，确保数据变化时立即重新渲染
- 通过 `app.provide` 将服务注入到 Vue 应用
- 支持 Pinia 状态管理，提供 `useGameStore` 示例

**核心Composables**：

- **useStatData**: 统计数据绑定，提供响应式的属性、装备、背包数据，基于MVU框架
- **useGameStateManager**: 游戏状态管理，统一协调所有组合式函数的状态同步
- **useGameServices**: 游戏服务统一访问，封装UI、事件、存档等功能
- **useSaveLoad**: 存档管理，整合了原多个存档相关服务，提供保存、加载、删除等操作
- **useWorldbookToggle**: 世界书操作，管理游戏世界配置和扩展
- **usePlayingLogic**: 游戏逻辑，处理游戏状态和交互
- **useCharacterCreation**: 角色创建，管理创建流程的状态和数据
- **useGameSettings**: 游戏设置，管理游戏配置和用户偏好

#### Vue 组件层（View Layer） - 用户界面层

**职责**：提供用户界面和交互体验

- 使用Vue 3 Composition API
- 集成Pinia状态管理
- 支持Tailwind CSS样式系统
- 响应式设计，支持移动端适配
- 基于 `useGameStateManager` 统一状态管理

**核心组件**：

- **App.vue**: 应用根组件，管理Start/Creation/Playing模式切换，协调所有子组件
- **StartView.vue**: 游戏开始界面，提供开始游戏、读档、设置等功能
- **CreationRoot.vue**: 角色创建流程，支持难度选择、世界选择、属性分配等
- **PlayingRoot.vue**: 游戏主界面（三栏布局），集成聊天、状态栏、操作面板
- **SaveDialog.vue**: 存档管理对话框，支持手动存档、读档、删除等操作
- **CommandQueueDialog.vue**: 指令队列对话框，管理装备操作队列
- **InventoryDialog.vue**: 背包管理对话框，管理物品和装备

### 模块边界（2025-09-22）

- **视图层**：完全由 Vue 组件接管，`App.vue` 协调 Start/Creation/Playing 模式切换
- **事件流**：通过 EventBus 发布/订阅，支持命名空间和通配符，如 `game:*`、`playing:*`、`creation:*`
- **服务注入**：`ServiceContainer` 在 `GameCoreFactory` 中分阶段初始化，`index.ts` 通过 `app.provide` 注入所有服务到 Vue
- **存储**：`SaveLoadManagerService` 统一管理 IndexedDB 和 MVU 变量，Vue 组件通过组合式函数调用
- **MVU交互**：完全基于 MVU 框架，通过 `StatDataBindingService` 提供类型安全的数据绑定
- **状态管理**：`useGameStateManager` 统一协调所有组合式函数的状态同步

## 关键模块

### 核心架构模块

- **GameCoreFactory**: 分阶段服务初始化管理器，确保服务依赖关系正确
- **ServiceContainer**: 基于 Inversify 的完整 DI 容器，支持服务健康监控和依赖管理
- **EventBus**: 全局事件总线，支持命名空间和通配符订阅，协调各层通信
- **useGameStateManager**: 游戏状态管理器，统一协调所有组合式函数的状态同步

### 数据管理模块

- **StatDataBindingService**: 统计数据绑定服务，完全基于 MVU 框架，提供纯 ref 架构支持
- **SaveLoadManagerService**: 存档管理服务，整合了原多个存档相关服务，支持 IndexedDB 和 MVU 变量
- **SameLayerService**: 同层聊天服务，整合了原 TavernGenerationService 功能

### 用户界面模块

- **Vue 组件系统**: 完全基于 Vue 3 Composition API，支持响应式设计和移动端适配
- **组合式函数系统**: 提供响应式接口，采用纯 ref 架构，避免 computed 缓存开销
- **指令队列系统**: 支持装备操作延迟执行，确保 MVU 变量更新与用户输入同步

## 服务解耦架构（2025-01-24 更新）

### 服务依赖管理

- **MvuService**：作为 MVU 操作的统一入口，提供统计数据绑定专用方法
- **StatDataBindingService**：通过 `initializeDependencies()` 方法从 ServiceLocator 获取 MvuService
- **TavernBridgeService**：通过 `locator.get<MvuService>('mvu')` 获取服务实例
- **所有存储服务**：保持现有功能完整，只优化依赖注入方式

### 统计数据绑定统一接口

MvuService 新增的专用方法：

- `getStatData(userKey, options)` - 获取统计数据
- `setStatData(userKey, data, options)` - 设置统计数据
- `getStatAttribute(userKey, attributePath, options)` - 获取特定属性
- `setStatAttribute(userKey, attributePath, value, options)` - 设置特定属性
- `subscribeStatDataUpdates(handler)` - 统一事件订阅管理
- `batchUpdateStatAttributes(userKey, attributes, options)` - 批量更新属性

### 服务初始化顺序

1. 注册基础服务（eventBus、mvu）
2. 初始化 MvuService
3. 注册依赖 MvuService 的服务并初始化依赖
4. 注册其他服务

### 同层聊天与世界书历史注入（2025-09-04）

- SameLayerService：
  - 在生成前构建 `overrides.chat_history.prompts`，来源为 `WorldbookSaveService.getChatHistoryPrompts()` 解析出的历史。
  - 仅注入 `assistant` 角色的历史，不注入 `user`，以避免用户文本重复注入提示词；前端仍完整显示 user/assistant。
  - `setHistoryMaxPrompts('all'|number)` 控制注入条数；默认 `'all'`。
  - `setWorldbookService(wb)` 由 GameCore 注入依赖。
- GameCore：注册后对 SameLayerService 注入 worldbook 并设置默认历史上限。

## 事件系统架构

### EventBus设计

```typescript
// 支持命名空间事件
eventBus.emit('game:started', data);
eventBus.emit('playing:action', actionData);

// 支持通配符订阅
eventBus.on('game:*', handler); // 监听所有game命名空间事件
```

### 事件命名规范

- **前缀命名**：`game:*`（全局生命周期）、`playing:*`（游玩内事件）、`creation:*`（创建流程事件）
- **新增事件**：`game:start-create-vue` 由 Vue Start 触发，`App.vue` 切换到创建模式
- **通配订阅**：`game:*` 可用于监听所有游戏级事件
- **数据更新事件**：`stat_data:updated`、`mvu:update-ended` 用于响应式数据绑定

### 数据流架构

#### 响应式数据绑定

```typescript
// 服务层更新数据
statDataBindingService.setAttributeValue('strength', 15);

// 通过EventBus通知更新
eventBus.emit('stat_data:updated', newData);

// Composable层接收事件并更新ref
const unsubscribe = eventBus.on('stat_data:updated', (data) => {
  statData.value = data;
  baseAttributes.value = data.baseAttributes;
});

// Vue组件自动重新渲染
```

#### MVU变量集成

- 所有数据操作通过MVU框架进行
- 支持`[值, "描述"]`格式的数据结构
- 自动处理变量更新和同步
- 提供缓存和重试机制

## 服务注册键名（2025-09-22）

### 核心服务标识符

- **TYPES.EventBus**: 全局事件总线
- **TYPES.GameCore**: 游戏核心服务
- **TYPES.UIService**: UI交互服务
- **TYPES.StatDataBindingService**: 统计数据绑定服务
- **TYPES.GameStateService**: 游戏状态服务
- **TYPES.SameLayerService**: 同层聊天服务
- **TYPES.SaveLoadManagerService**: 存档管理服务
- **TYPES.AchievementService**: 成就系统服务
- **TYPES.DomPortalService**: DOM门户服务
- **TYPES.ResponsiveService**: 响应式设计服务
- **TYPES.CommandQueueService**: 指令队列服务

### 服务注入方式

所有服务通过 `serviceContainer.get<T>(TYPES.ServiceName)` 获取，并在 `index.ts` 中通过 `app.provide` 注入到 Vue 应用。

## 存/读档子系统（2025-09-07 / 2025-09-11）

- 存储介质：IndexedDB（DB: `tavern_rpg_saves`；Stores: `saves`, `settings`）。
- 服务：
  - `IndexedDBSaveService`（低层 IDB 访问）
  - `SaveLoadFacade`（高层手动保存/加载/删除，40 字预览）
  - `AutoSaveManager`（订阅 `same-layer:done` 自动保存）
- 集成：`GameCore.init()` 注册并暴露为 `saveDb`、`saveFacade`；`PlayingRoot.vue` 读取这些服务并提供 Save/Load 弹窗。
- 行为：
  - 自动存档1：受 `settings.auto1.enabled` 控制；完成一次 AI 回复即保存到 `auto1`。
  - 手动存档：5 个槽位，可命名；删除有二次确认；显示 40 字 AI 片段预览。
  - 读档：仅恢复前端消息，不创建真实楼层；同步写入 MVU chat 级 `stat_data` 以便继续游玩。

## DOM Portal 子系统（2025-09-11）

- 服务：`DomPortalService` 负责在酒馆第0楼中查找包含"【游玩】"关键字的节点并替换为自有容器。
- 功能：
  - 自动检测关键字位置并插入游戏界面容器
  - 使用 `MutationObserver` 守护容器不被覆盖
  - 支持自动重挂 Vue 应用
- 集成：在 `index.ts` 中启动，确保界面正确显示在酒馆中。

## 世界扩展子系统（2025-09-11）

- 数据：`data/worldExpansions.ts` 提供世界扩展配置。
- 功能：
  - 支持为不同世界配置基础开关和可选扩展
  - 每个扩展可以控制多个 UID 的启用/禁用
  - 在创建流程中集成，用户可选择启用哪些扩展
- 集成：`CreationRoot.vue` 中提供扩展选择界面，通过 `WorldbookSaveService.applyUidToggles()` 应用。

## 玩家数据子系统（2025-09-11）

- 服务：`PlayerService` 统一读取 `<user>` 的 MVU 数据。
- 功能：
  - 提供标准化的属性、装备、背包数据接口
  - 支持订阅 MVU 变量更新，自动刷新玩家面板
  - 在 `PlayingRoot.vue` 中集成，实时显示玩家状态
- 集成：通过 `GameCore.init()` 注册为 `player` 服务，Vue 组件通过 `inject('player')` 获取。

## 指令队列系统（2025-01-XX）

### 系统概述

指令队列系统允许用户将装备操作（如卸下武器）暂存到队列中，在下次发送消息时批量执行，确保MVU变量更新与用户输入同步。

### 核心组件

#### CommandQueueService

- **职责**: 指令队列的核心管理服务
- **功能**: 指令的增删改查、队列状态管理、事件通知、持久化支持
- **特性**: 支持冲突检测、数据一致性验证、性能监控

#### CommandExecutor

- **职责**: 指令执行器
- **功能**: 映射指令到StatDataBindingService方法、批量执行指令、错误处理和回滚
- **特性**: 支持指令排序、依赖关系处理、执行结果反馈

#### CommandQueueDialog.vue

- **职责**: 队列显示组件
- **功能**: 显示待执行指令列表、提供队列操作界面、集成到装备栏
- **特性**: 响应式设计、实时状态更新、用户友好交互

### 技术特性

- **批量操作**: 支持一次性执行多个装备操作
- **延迟执行**: 操作暂存，与用户输入一起发送
- **MVU同步**: 确保操作后的MVU变量变化能正确传递给LLM
- **冲突检测**: 自动检测装备槽位冲突和背包操作冲突
- **数据验证**: 执行后验证数据一致性
- **性能监控**: 记录执行时间、成功率等指标

## 服务冲突修复（2025-01-XX）

### 修复的问题

1. **MVU服务重复订阅**: 统一通过 `MvuService.subscribeStatDataUpdates()` 接口管理事件订阅
2. **服务初始化重复**: 移除 `StatDataBindingService` 中的重复MVU初始化
3. **事件系统冲突**: 优化 `AutoSaveManager` 的事件订阅，避免与 `WorldbookSaveService` 冲突
4. **缓存管理统一**: 将缓存管理统一委托给 `MvuService`

### 架构改进

- **统一事件订阅机制**: 所有MVU相关事件通过 `MvuService` 统一管理
- **明确服务职责分工**: 各服务职责更加清晰，避免功能重叠
- **优化初始化顺序**: 基础服务优先，依赖服务延迟获取依赖

### 性能提升

- 减少重复事件订阅，避免同一事件被多次处理
- 统一缓存管理，减少内存占用和缓存不一致
- 优化初始化流程，减少重复初始化操作

详细修复记录见：`src/同层游玩RPG_remake/SERVICE_CONFLICTS_FIX.md`

## 最新架构更新（2025-09-22）

### 技术栈升级

- **样式系统**: 使用 Tailwind CSS，支持响应式设计和移动端适配
- **构建系统**: 支持 Vue 组件和 TypeScript，通过 webpack 构建
- **状态管理**: 集成 Pinia 状态管理，提供 `stores/game.ts` 示例
- **类型系统**: 完整的 TypeScript 类型支持，包括 Vue 组件类型推断
- **依赖注入**: 基于 Inversify 的完整 DI 容器，支持服务健康监控
- **服务监控**: ServiceContainer 提供完整的服务健康监控和依赖管理

### 核心服务架构

#### StatDataBindingService（统计数据绑定）

- 完全基于 MVU 框架的统计数据访问接口
- 提供纯 ref 架构支持，确保数据变化时立即重新渲染
- 安全的数据访问方法，支持类型安全的数据绑定
- 与 Vue Composable 深度集成，提供响应式数据绑定

#### SaveLoadManagerService（存档管理）

- 统一的存档管理接口，整合了原多个存档相关服务
- 支持 IndexedDB 持久化存储和 MVU 变量集成
- 提供存档创建、读取、删除、重命名等完整功能
- 支持自动存档和手动存档，提供存档预览功能

#### SameLayerService（同层聊天）

- 整合了原 TavernGenerationService 功能
- 支持流式和非流式文本生成
- 提供同层聊天历史管理和世界书集成
- 支持智能历史处理和聊天上下文管理

#### 服务健康监控系统

- **ServiceContainer**: 基于 Inversify 的完整 DI 容器
- **健康状态跟踪**: 实时监控所有服务的状态（UNINITIALIZED、INITIALIZING、READY、ERROR）
- **依赖关系管理**: 自动管理服务间的依赖关系，确保正确的初始化顺序
- **故障恢复**: 支持服务重启和自动故障恢复
- **性能统计**: 提供服务统计信息和健康检查报告

### Vue 组件架构

#### 主要组件

- `App.vue`: 应用根组件，管理 Start/Creation/Playing 模式切换，协调所有子组件
- `StartView.vue`: 游戏开始界面，提供开始游戏、读档、设置等功能
- `CreationRoot.vue`: 角色创建流程，支持难度选择、世界选择、属性分配等
- `PlayingRoot.vue`: 游戏主界面（三栏布局），集成聊天、状态栏、操作面板
- `SaveDialog.vue`: 存档管理对话框，支持手动存档、读档、删除等操作
- `CommandQueueDialog.vue`: 指令队列对话框，管理装备操作队列
- `InventoryDialog.vue`: 背包管理对话框，管理物品和装备

#### Composable 系统

- `useStatData`: 统计数据绑定和响应式更新，基于 MVU 框架
- `useGameStateManager`: 游戏状态管理，统一协调所有组合式函数的状态同步
- `useSaveLoad`: 存档管理，整合了原多个存档相关服务
- `useWorldbookToggle`: 世界书操作，管理游戏世界配置和扩展
- `useGameServices`: 游戏服务集成，提供统一的服务访问接口
- `useCharacterCreation`: 角色创建，管理创建流程的状态和数据
- `usePlayingLogic`: 游戏逻辑，处理游戏状态和交互
- `useGameSettings`: 游戏设置，管理游戏配置和用户偏好

### 事件系统

#### 事件命名规范

- `game:*`: 全局生命周期事件
- `playing:*`: 游戏内事件
- `creation:*`: 创建流程事件
- `same-layer:*`: 同层聊天事件
- `command-queue:*`: 指令队列事件
- `save-load:*`: 存档管理事件

#### 关键事件

- `game:started`: 游戏开始
- `game:start-create-vue`: 开始创建流程
- `game:play-start`: 开始游戏
- `game:back-start`: 返回开始界面
- `game:transition-start`: 状态切换开始
- `game:transition-complete`: 状态切换完成
- `game:transition-failed`: 状态切换失败
- `same-layer:done`: 同层聊天完成
- `command-queue:added`: 指令添加到队列
- `command-queue:executed`: 指令队列执行完成
- `command-queue:error`: 指令队列执行错误
- `save-load:error`: 存档操作错误

### 数据流架构

```text
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vue Components │    │   Composable     │    │   Services      │
│                 │    │                  │    │                 │
│  - StartView    │◄──►│  - useStatData   │◄──►│  - StatDataBinding│
│  - CreationRoot │    │  - useGameStateMgr│    │  - EventBus     │
│  - PlayingRoot  │    │  - useSaveLoad   │    │  - UIService    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   EventBus      │    │   MVU Framework  │    │   Tavern API    │
│                 │    │                  │    │                 │
│  - 事件发布/订阅  │    │  - 变量管理      │    │  - 酒馆交互      │
│  - 命名空间支持  │    │  - 数据绑定      │    │  - 世界书操作    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 技术栈

### 前端技术

- **Vue 3**: 组件框架，使用 Composition API
- **Pinia**: 状态管理，提供 `useGameStore` 示例
- **Tailwind CSS**: 样式系统，支持响应式设计
- **TypeScript**: 类型安全，完整的类型支持

### 构建工具

- **Webpack**: 模块打包，支持 Vue 组件和 TypeScript
- **PostCSS**: CSS 处理，支持 Tailwind CSS
- **Babel**: JavaScript 转译

### 依赖注入

- **Inversify**: 依赖注入容器，支持服务健康监控
- **ServiceContainer**: 服务容器，管理服务依赖关系

### 外部集成

- **MVU Framework**: 酒馆变量框架，完全基于 MVU 的数据绑定
- **jQuery**: DOM 操作和事件处理
- **IndexedDB**: 本地存储，用于存档和设置
- **Tavern API**: 酒馆交互接口，通过 SameLayerService 集成

## 架构优势

1. **分层清晰**: 服务层、组合式函数层、Vue 层职责明确，边界清晰
2. **解耦设计**: 通过 EventBus 和依赖注入实现松耦合，易于维护和测试
3. **响应式**: 基于 Vue 的响应式系统，采用纯 ref 架构，数据变化自动更新 UI
4. **类型安全**: 完整的 TypeScript 类型支持，包括 Vue 组件类型推断
5. **可测试**: 服务层独立，便于单元测试和集成测试
6. **可扩展**: 模块化设计，易于添加新功能和服务
7. **性能优化**: 使用纯 ref 架构，避免 computed 的缓存开销，确保数据变化时立即重新渲染
8. **错误处理**: 完善的错误处理和重试机制，支持服务健康监控
9. **状态管理**: 统一的游戏状态管理器，协调所有组合式函数的状态同步
10. **服务监控**: 完整的服务健康监控系统，支持依赖关系管理和故障恢复
