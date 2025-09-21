# 同层游玩RPG_remake · 项目记忆库（专属）

- 目的：集中记录重制版的架构约定、实现决策与开发指引，避免跨会话遗忘。
- 范围：仅覆盖 `src/同层游玩RPG_remake` 相关内容；全局层面的项目信息仍存放在顶层 Memory Bank。

## 目录

- architecture.md：架构与模式
- decisions.md：重要技术/产品决策
- dev_readme.md：开发与扩展指引
- mixed_mode_architecture.md：混合模式架构详细文档

## 2025-09-10 更新（存/读档完善、UpdateVariable 覆盖、Creation 写入 MVU）

- 存/读档 UI 与流程
  - 新增 `vue/SaveDialog.vue` 作为复用的二级弹窗；在 `StartView.vue` 与 `PlayingRoot.vue` 中挂接。
  - SaveDialog 功能：列出全部存档；单选读档；多选删除（红色按钮，二次确认）；重命名；“导入存档”按钮占位（接口留空）；Playing 专属“新建存档”。
  - 读档后写回 MVU：将存档内的 `stat_data` 覆盖回当前聊天的 MVU；UI 消息按存档 `messages` 恢复显示。
  - 从 StartView 读档会将存档数据放入 `window.__RPG_PENDING_SAVE_DATA__` 并切换到 Playing，Playing 在 `onMounted` 自动应用该数据。

- 存档服务扩展
  - `services/SaveLoadFacade.ts` 新增：`list()`、`removeMany(ids)`、`rename(id, newName)`、`createNew(baseName, messages, statData, mvuSnapshots)`。
  - 新建存档命名规则：“初始命名-YYYY/M/D HH:MM”。支持用户后续重命名；不限制槽位数量。

- 世界书与提示词同步
  - `WorldbookSaveService` 新增 `setEntryContentFromMessages(messages)`：用存档消息覆盖写入当前存档对应世界书条目内容（按旧块格式，以便后续解析成 prompts）。
  - 读档后：会确保世界书条目存在、覆盖条目内容，并调用“一次性”注入，保证模型能读到历史（SameLayer `buildOverridesWithHistory` 不再过滤 user）。

- UpdateVariable 覆盖策略（重要）
  - 在 tavern 事件 `message_received/js_generation_ended` 时，从 AI 最终输出中用正则 `/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gm` 抽取片段。
  - 覆盖写入到“酒馆 0 楼消息”的 `<update></update>` 标签：若 `<update>` 不存在则创建；若已存在，删除其中旧内容并放入新片段（严格覆盖，不追加）。
  - 实现位置：`WorldbookSaveService.injectUpdateVariableIntoLayer0()`，在事件回调中调用。

- Creation 阶段写入 MVU（等待初始化）
  - 在 `CreationRoot.vue` 创建存档名后，等待当前聊天变量 `initialized_lorebooks` 包含 `'大冒险'` 再写入 `statdata`。
  - 写入内容：用户在创建时的属性点分配 + `background.attributeBonus` 的合成，覆盖 `<user>.base_attributes` / `<user>.current_attributes`。
  - 等待策略：最多 15s 轻量轮询；超时则尽量继续写入避免阻塞。

- 关键文件
  - `vue/SaveDialog.vue`：二级弹窗。
  - `vue/StartView.vue`：读档入口，读档后跳转 Playing 并设置一次性历史注入。
  - `vue/PlayingRoot.vue`：存档入口，支持新建/重命名/多选删除；`onMounted` 自动应用挂起读档数据。
  - `services/SaveLoadFacade.ts`：服务门面扩展。
  - `services/WorldbookSaveService.ts`：增加 `<UpdateVariable>` 覆盖 0 楼 `<update>`；世界书条目覆盖写入方法。
  - `services/SameLayerService.ts`：overrides 中保留 user/assistant 历史，满足"读档后追加上下文"的需求。

- 已知与后续
  - "导入存档"仅占位，待实现导入 JSON 文本/文件并落入 IndexedDB 的流程。
  - UI 样式细节可继续优化；删除确认弹层、错误提示已接入 UIService。

## 2025-09-11 更新（DOM Portal、完整存档系统、世界扩展、玩家服务）

- DOM Portal 服务
  - 新增 `services/DomPortalService.ts`：在第0楼中查找包含"【游玩】"关键字的节点并替换为自有容器
  - 使用 `MutationObserver` 守护容器不被覆盖，支持自动重挂 Vue 应用
  - 在 `index.ts` 中启动，确保界面正确显示在酒馆中

- 完整存档系统架构
  - **IndexedDBSaveService**: 基于 IndexedDB 的底层存档服务，数据库名 `tavern_rpg_saves`
  - **SaveLoadFacade**: 高层存档操作门面，提供完整的 CRUD 操作
  - **AutoSaveManager**: 自动存档管理器，监听 `same-layer:done` 事件自动保存
  - **SaveDialog.vue**: 功能完整的存档弹窗，支持读档、删除、重命名、导入导出

- 世界扩展系统
  - 新增 `data/worldExpansions.ts`：支持为不同世界配置基础开关和可选扩展
  - 每个扩展可以控制多个 UID 的启用/禁用，支持动态切换
  - 在创建流程中集成，用户可选择启用哪些扩展

- 玩家服务 (PlayerService)
  - 新增 `services/PlayerService.ts`：统一读取 `<user>` 的 MVU 数据
  - 支持订阅 MVU 变量更新，自动刷新玩家面板
  - 提供标准化的属性、装备、背包数据接口

- 增强的世界书服务
  - 新增 `injectUpdateVariableIntoLayer0()` 方法：从 AI 输出中提取 `<UpdateVariable>` 并覆盖到第0楼
  - 新增 `setEntryContentFromMessages()` 方法：用存档消息重建世界书条目内容
  - 支持历史注入的一次性开关控制，读档后可自动注入历史

- 创建流程的 MVU 集成
  - 在 `CreationRoot.vue` 中新增 MVU 初始化轮询机制
  - 等待 `initialized_lorebooks` 包含 '大冒险' 后再写入属性数据
  - 支持属性点分配 + 背景加成的合成写入到 MVU

- 同层服务的增强
  - 支持历史条数限制配置 (`setHistoryMaxPrompts`)
  - 保留 user/assistant 历史（不再过滤 user），满足读档后追加上下文的需求
  - 增强的错误处理和事件系统

- 新增数据模型

## 2025-09-11 更新（MVU服务统一化）

- MVU交互统一化
  - 将所有直接使用 `window.Mvu` 的地方替换为通过 `MvuService` 调用
  - `TavernBridgeService` 改为使用 `MvuService` 的事件订阅机制
  - 更新交互规范：MVU操作统一通过 `MvuService` 进行，不再直接使用 `Mvu.*`
  - 确保所有MVU操作都经过统一的错误处理、重试机制和缓存功能

- 架构更新
  - 在 `ServiceLocator` 中注册 `mvu` 服务（`MvuService` 实例）
  - 更新架构文档，明确MVU交互的统一入口
  - 保持向后兼容性，所有现有功能继续正常工作

## 2025-01-XX 更新（服务解耦重构：混合模式架构）

- 混合模式架构实施
  - **服务层**：使用 ServiceLocator 管理所有服务依赖关系
  - **Vue 组件层**：使用 Composable 和 inject 获取服务实例
  - 完全解耦服务间依赖，避免直接导入

- MvuService 扩展为统一入口
  - 新增统计数据绑定专用方法：`getStatData`、`setStatData`、`getStatAttribute`、`setStatAttribute`
  - 新增统一事件订阅管理：`subscribeStatDataUpdates`
  - 新增批量更新方法：`batchUpdateStatAttributes`
  - 避免多个服务重复订阅相同 MVU 事件

- 服务依赖注入优化
  - `StatDataBindingService` 通过 `initializeDependencies()` 从 ServiceLocator 获取 MvuService
  - `TavernBridgeService` 通过 `locator.get<MvuService>('mvu')` 获取服务实例
  - `GameCore` 中优化服务注册顺序，确保依赖正确初始化

- 保持现有功能完整性
  - 所有存储服务（`WorldbookSaveService`、`IndexedDBSaveService`）功能完全保留
  - Vue Composable（`useStatData`、`useAttributes`、`useEquipment`）使用方式不变
  - 所有现有 API 接口保持向后兼容

- 解决的服务间冲突
  - MVU服务重复依赖问题
  - 事件系统重复订阅问题
  - 服务初始化顺序问题
  - 直接依赖而非通过 ServiceLocator 的问题

## 2025-09-11 增量更新（MVU stat_data 放宽、Creation 写回、读档覆盖、错误提示与右键菜单）

- MVU 变量读取放宽（仅依赖 stat_data）
  - `services/PlayerService.ts`：读取 `<user>` 面板时，优先通过 `Mvu.getMvuData/getMvuVariable` 读取 `stat_data`；若 MVU 暂不可用则回退 `getVariables({ type: 'chat' })` 直接读取 `stat_data`；不再依赖 `display_data/delta_data`。
  - 目的：修复“前端无法显示 mvu 变量”和“statdata 初始化但读空”的问题。

- Creation 写回属性并创建存档
  - `vue/CreationRoot.vue`：在确认存档名后，计算属性“基础为 0 = 出身加成 + 玩家分配点”（天赋暂为 0），写入：
    - `stat_data.<user>.base_attributes`
    - `stat_data.<user>.current_attributes`
  - 同步创建 IndexedDB 存档：`saveFacade.createNew(name, [], chat, snapshots)`，保证 `SaveDialog` 立刻可见。

- 读档覆盖 MVU 与世界书
  - `vue/PlayingRoot.vue:onDialogLoaded`：
    - 将存档 `statData` 覆盖写入当前聊天 MVU 的 `stat_data`；
    - 用 `worldbook.setEntryContentFromMessages(messages)` 覆盖世界书条目内容，确保历史用于后续提示词；
    - 历史注入仅通过 `overrides`，不创建新楼层，保持“只有第 0 层”的约束。

- 生成终止/错误提示
  - `services/SameLayerService.ts`：`stopStreaming()` 触发 `same-layer:terminated`；
  - `vue/PlayingRoot.vue`：监听 `same-layer:error/terminated`，在中间聊天区插入一条“临时 system 消息：API生成出错，请重试。”（不会进入提示词）；
    - 用户右键删除或再次发送消息时，自动清除该临时消息。

- 右键菜单（复制/删除）与世界书同步
  - `vue/PlayingRoot.vue`：为 user/ai/system 段落提供右键菜单（复制、删除）；
  - 删除后：
    - 从 UI 移除该条；
    - 以当前 UI 的 user/ai 列表覆盖写入世界书（`setEntryContentFromMessages`），从而同步删除对应的 AI 记录；
    - system/临时消息不会写入世界书，也不会进入提示词。

- 保持“0 层”语义
  - 读档历史仅通过 `SameLayerService.buildOverridesWithHistory()` 注入提示词，不创建任何新楼层；
  - 生成流仍覆盖/展示于第 0 层上下文中。

- 相关文件
  - `services/PlayerService.ts`、`services/SameLayerService.ts`
  - `vue/CreationRoot.vue`、`vue/PlayingRoot.vue`
  - `services/SaveLoadFacade.ts`（既有）与 `vue/SaveDialog.vue` 协作

  - `models/SaveSchemas.ts`：完整的存档数据结构定义
  - `models/GameState.ts`：游戏状态管理
  - `shared/constants.ts`：共享常量定义

## 2025-09-07 更新（IndexedDB 存/读档落地）

- 存储：使用浏览器 IndexedDB，DB 名 `tavern_rpg_saves`；对象仓库 `saves`（key: `slotId`）、`settings`（key: `key`）。
- 槽位：`auto1`（自动存档1）/ `auto2`（预留）/ `m1..m5`（五个手动位）。
- SaveData：
  - `slotId`｜`name`｜`createdAt`｜`updatedAt`｜`preview(40)`
  - `messages[{ role: 'user'|'ai', text: string }]`（纯文本）
  - `statData`（MVU chat 级 `stat_data`）
  - `mvuSnapshots[{ at, kind: 'chat'|'message', messageId?, data? }]`
- 服务：
  - `IndexedDBSaveService`（IDB 读写与设置）
  - `SaveLoadFacade`（手动存/读/删，40 字预览）
  - `AutoSaveManager`（监听 `same-layer:done` 自动保存到 `auto1`，兜底 tavern 事件）
- UI（Playing 右侧“存/读档”）：
  - 自动存档1：启用开关（`settings.auto1.enabled`）、立即保存；自动2占位。
  - 手动 5 位：未存档→“存档”；已存档→显示名和 40 字预览，并提供“读档/删除（红色，二次确认）”。
  - 读档：仅恢复前端消息，不创建真实楼层；同步写回 MVU chat 级 `stat_data`。
- 关系：世界书仍用于历史注入（不变）；存档走 IndexedDB，与之互补。
- 扩展位：导出/导入 JSON（已留内部接口，UI 未开放）、自动存档2、历史压缩策略。

修复：

- 修复 `PlayingRoot.vue` SFC 结构错误导致挂载失败。
- 修复 `CreationRoot.vue` 模板误入 TS 代码引发的“nav 控件”异常显示，并补全开始游戏的命名弹窗。

## 2025-09-01 更新（Vue 迁移完成）

- 引入 Vue 3 接管 UI：新增 `App.vue`、`vue/StartView.vue`、`vue/CreationRoot.vue`、`vue/PlayingRoot.vue`。
- `index.ts` 提供 `locator/eventBus/ui/tavern/storage/achievement` 给 Vue。
- `GameCore` 负责服务注册与 Vue 重挂桥接；不再直接渲染 jQuery Start/Playing。
- 构建：webpack 支持 `.vue` 与 `VueLoaderPlugin`；`vue` 内联打包。

## 已知问题与修复记录

### 白屏（未渲染元素）

- 现象：打开 `dist/src/同层游玩RPG_remake/index.html` 出现白屏，未看到 `Start/Creation/Playing` 界面。
- 日志/线索：源码 `src/同层游玩RPG_remake/index.ts`、`core/GameCore.ts` 使用了 `$()`、`$(window)` 等 jQuery API，但在 ESM 模块作用域未显式导入 jQuery，依赖 HTML 中的 CDN 注入 `window.$`；构建后模块可能在执行时取不到 `$`。
- 根因：在模块作用域直接使用全局 `$`，在某些打包与执行顺序下未定义，导致初始化逻辑未运行，DOM 未挂载 Vue 根容器（或未触发 `GameCore.mount` 内部逻辑）。
- 修复：为模块显式引入 jQuery。
  - `src/同层游玩RPG_remake/index.ts` 顶部：`import $ from 'jquery';`
  - `src/同层游玩RPG_remake/core/GameCore.ts` 顶部：`import $ from 'jquery';`
  - 重新构建：`npm run build`（已通过）。
- 验证：构建产物 `dist/src/同层游玩RPG_remake/index.html` 可正常渲染；`Start → Creation → Playing` 流程可用。

## 2025-09-04 更新（Playing 界面重构 & MVU 集成）

- Playing 布局与样式：
  - 左/右侧栏宽度对称（200px/200px），保留窄屏抽屉；中栏维持小说流布局。
  - 用户消息卡片化，AI 段落后自动插入分隔线以区分与下一次用户输入。
- 左侧 `<user>` 面板（MVU 驱动）：
  - 头像：使用 `<div id="user-avatar" class="user_avatar">`（酒馆宏自动替换）+ 预留自定义头像接口。
  - 属性：七项属性方框化展示（当前值/基础值/名称），无值显示占位符。
  - 装备：武器/防具/饰品一行三列，无装备显示“未装备××”。
  - 背包：按钮打开小弹窗，按 武器/防具/饰品/其他 分类只读展示当前物品。
- 右侧功能按钮：地图禁用，人物/亲密关系/读档/系统设置以弹窗形式占位。
- 图标：采用内联 SVG，覆盖属性、装备与弹窗项。
- MVU 集成：
  - 新增 `services/PlayerService.ts` 统一读取 `<user>.{base_attributes,current_attributes,equipment,inventory}`，订阅 `VARIABLE_UPDATE_ENDED` 后刷新。
  - 在 `GameCore` 注册 `player` 服务，并通过 `index.ts` 提供给 Vue 组件（`app.provide('player')`）。
  - `PlayingRoot.vue` 使用 `PlayerService` 渲染左侧面板数据；保留占位符策略。
- ESLint：为避免对 `.vue` 模板的 JSX 误报，忽略 `**/*.vue`（不影响构建与运行）。
