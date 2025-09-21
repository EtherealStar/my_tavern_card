# 架构与模式（同层游玩RPG_remake）

## 混合模式架构（2025-01-XX 更新）

### 整体架构概览

项目采用**三层混合模式架构**，分为服务层、组合式函数层和Vue组件层：

```
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
│  │   useStatData   │ │ useGameServices │ │ useSaveLoadMgr  │ │
│  │   useAttributes │ │  useWorldbook   │ │  usePlayingLogic│ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   服务层 (Service Layer)                    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │StatDataBinding  │ │  EventBus       │ │  UIService      │ │
│  │TavernGeneration │ │  Achievement    │ │  SaveLoadMgr    │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 架构原则

#### 服务层（Service Layer） - 底层基础设施

**职责**：提供核心业务逻辑和数据访问能力

- 所有服务通过 `ServiceLocator` 管理依赖关系
- 在 `GameCore.init()` 中统一注册所有服务
- 服务间依赖通过 `locator.get<T>('serviceName')` 获取
- 保持服务层的解耦和可测试性
- 使用 Inversify 进行依赖注入管理

**核心服务**：

- **StatDataBindingService**: 统计数据绑定，统一管理MVU变量的读写
- **EventBus**: 事件总线，支持命名空间和通配符订阅
- **TavernGenerationService**: 与酒馆API交互，处理同层聊天
- **UIService**: UI交互服务，提供toastr等提示功能
- **AchievementService**: 成就系统，观察者模式监听游戏事件
- **SaveLoadManagerService**: 存档管理，支持IndexedDB和MVU变量
- **WorldbookSaveService**: 世界书操作，管理游戏世界数据

#### 组合式函数层（Composable Layer） - 中间适配层

**职责**：封装服务层功能，为Vue组件提供响应式接口

- Vue 组件通过 `inject('serviceName')` 获取服务实例
- 利用 Vue 的响应式系统提供更好的开发体验
- Composable（`useStatData`、`useGameServices`、`useSaveLoadManager`）封装服务调用
- 通过 `app.provide` 将服务注入到 Vue 应用
- 支持 Pinia 状态管理

**核心Composables**：

- **useStatData**: 统计数据绑定，提供响应式的属性、装备、背包数据
- **useGameServices**: 游戏服务统一访问，封装UI、事件、存档等功能
- **useSaveLoadManager**: 存档管理，提供保存、加载、删除等操作
- **useWorldbook**: 世界书操作，管理游戏世界配置
- **usePlayingLogic**: 游戏逻辑，处理游戏状态和交互

#### Vue 组件层（View Layer） - 用户界面层

**职责**：提供用户界面和交互体验

- 使用Vue 3 Composition API
- 集成Pinia状态管理
- 支持Tailwind CSS样式系统
- 响应式设计，支持移动端适配

**核心组件**：

- **App.vue**: 应用根组件，管理Start/Creation/Playing模式切换
- **StartView.vue**: 游戏开始界面
- **CreationRoot.vue**: 角色创建流程
- **PlayingRoot.vue**: 游戏主界面（三栏布局）
- **SaveDialog.vue**: 存档管理对话框
- **CommandQueueDialog.vue**: 指令队列对话框
- **InventoryDialog.vue**: 背包管理对话框

### 模块边界（迁移后）

- 视图层：由 Vue 组件接管（`App.vue` 协调 Start/Creation/Playing 模式；`StartView.vue`、`CreationRoot.vue`、`PlayingRoot.vue` 分别实现三个阶段）。
- 事件流：通过 EventBus（全局 `globalEventBus`）发布/订阅，如 `game:started`、`game:start-create-vue`、`game:play-start`、`game:back-start`、`playing:action`。
- 服务注入：`ServiceLocator` 于 `GameCore.init()` 注册，`index.ts` 通过 `app.provide` 注入 `locator/eventBus/ui/tavern/storage/achievement` 到 Vue。
- 存储：`StorageService` 统一对接 MVU/replaceVariables/localStorage 三层，Vue 组件通过注入对象调用。
- MVU交互：统一通过 `MvuService` 封装所有 MVU 操作，提供类型安全、错误处理、重试机制和缓存功能。

## 关键模块

- EventBus：支持命名空间与通配订阅。
- ServiceLocator：集中注册获取服务，避免直接依赖。
- GameCore：集中注册服务与生命周期；不再渲染 jQuery 视图，转为协调 Vue 与 jQuery 创建流程（过渡期）。
- Vue 组件：`StartView.vue`（入口）、`CreationRoot.vue`（创建流程）、`PlayingRoot.vue`（游玩）。
- jQuery 创建流程（过渡）：`CreationController`/`CreationView` 仍可被触发用于回退；优先走 Vue 版本。
- MvuService：统一封装所有 MVU 操作，提供类型安全、错误处理、重试机制和缓存功能，替代直接使用 `window.Mvu`。

## 服务解耦架构（2025-09-11 更新）

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

## 服务注册键名

- `eventBus`、`tavern`、`ui`、`storage`、`achievement`（GameCore 中注册；由 `index.ts` provide 到 Vue）。
- 2025-09-04：新增 `player`（`PlayerService`，提供读取 `<user>` MVU 数据与订阅更新）。
- 2025-01-XX：新增 `mvu`（`MvuService`，统一封装所有 MVU 操作，替代直接使用 `window.Mvu`）。
- 2025-01-XX：新增 `commandQueue`（`CommandQueueService`，指令队列管理）。
- 2025-01-XX：新增 `responsive`（`ResponsiveService`，响应式设计管理）。

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

## 最新架构更新（2025-01-XX）

### 技术栈升级

- **样式系统**: 从 SCSS 迁移到 Tailwind v4，使用 PostCSS 构建
- **构建系统**: 支持 JSX/TSX 和 Vue 组件，通过 babel-loader 处理
- **状态管理**: 集成 Pinia 状态管理，提供 `stores/game.ts` 示例
- **类型系统**: 完整的 TypeScript 类型支持，包括 Vue JSX 类型推断
- **依赖注入**: 基于 Inversify 的完整 DI 容器，支持服务健康监控
- **服务监控**: ServiceContainer 提供完整的服务健康监控和依赖管理

### 核心服务架构

#### MvuService（统一MVU操作）

- 提供类型安全的 MVU 操作接口
- 内置缓存机制和重试逻辑
- 统一的事件订阅管理
- 支持批量操作和错误处理

#### StatDataBindingService（统计数据绑定）

- 统一的统计数据访问接口
- 响应式数据绑定支持
- 安全的数据访问方法（safeGetValue）
- 与 Vue Composable 深度集成

#### 存储系统

- **IndexedDB**: 用于存档和设置的持久化存储
- **MVU变量**: 与酒馆变量系统集成
- **localStorage**: 本地缓存和临时数据

#### 服务健康监控系统

- **ServiceContainer**: 基于 Inversify 的完整 DI 容器
- **健康状态跟踪**: 实时监控所有服务的状态（UNINITIALIZED、INITIALIZING、READY、ERROR）
- **依赖关系管理**: 自动管理服务间的依赖关系，确保正确的初始化顺序
- **故障恢复**: 支持服务重启和自动故障恢复
- **性能统计**: 提供服务统计信息和健康检查报告

### Vue 组件架构

#### 主要组件

- `App.vue`: 应用根组件，管理 Start/Creation/Playing 模式切换
- `StartView.vue`: 游戏开始界面
- `CreationRoot.vue`: 角色创建流程
- `PlayingRoot.vue`: 游戏主界面（三栏布局）
- `LoadingView.vue`: 加载界面，显示初始化进度
- `CommandQueueDialog.vue`: 指令队列对话框

#### Composable 系统

- `useStatData`: 统计数据绑定和响应式更新
- `useAttributes`: 属性管理和显示
- `useEquipment`: 装备管理
- `useSaveLoad`: 存档管理
- `useWorldbook`: 世界书操作
- `useGameServices`: 游戏服务集成
- `useSaveManagement`: 存档管理
- `useCharacterCreation`: 角色创建

### 事件系统

#### 事件命名规范

- `game:*`: 全局生命周期事件
- `playing:*`: 游戏内事件
- `creation:*`: 创建流程事件
- `same-layer:*`: 同层聊天事件

#### 关键事件

- `game:started`: 游戏开始
- `game:start-create-vue`: 开始创建流程
- `game:play-start`: 开始游戏
- `game:back-start`: 返回开始界面
- `same-layer:done`: 同层聊天完成
- `command-queue:added`: 指令添加到队列
- `command-queue:executed`: 指令队列执行完成
- `command-queue:error`: 指令队列执行错误

### 数据流架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vue Components │    │   Composable     │    │   Services      │
│                 │    │                  │    │                 │
│  - StartView    │◄──►│  - useStatData   │◄──►│  - StatDataBinding│
│  - CreationRoot │    │  - useGameServices│    │  - EventBus     │
│  - PlayingRoot  │    │  - useSaveLoadMgr│    │  - UIService    │
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

- **Vue 3**: 组件框架，使用Composition API
- **Pinia**: 状态管理
- **Tailwind CSS**: 样式系统
- **TypeScript**: 类型安全

### 构建工具

- **Webpack**: 模块打包
- **PostCSS**: CSS处理
- **Babel**: JavaScript转译

### 依赖注入

- **Inversify**: 依赖注入容器
- **ServiceLocator**: 服务定位器模式

### 外部集成

- **MVU Framework**: 酒馆变量框架
- **jQuery**: DOM操作和事件处理
- **IndexedDB**: 本地存储
- **Tavern API**: 酒馆交互接口

## 架构优势

1. **分层清晰**: 服务层、组合式函数层、Vue层职责明确
2. **解耦设计**: 通过EventBus和依赖注入实现松耦合
3. **响应式**: 基于Vue的响应式系统，数据变化自动更新UI
4. **类型安全**: 完整的TypeScript类型支持
5. **可测试**: 服务层独立，便于单元测试
6. **可扩展**: 模块化设计，易于添加新功能
7. **性能优化**: 使用纯ref架构，避免computed的缓存开销
8. **错误处理**: 完善的错误处理和重试机制
