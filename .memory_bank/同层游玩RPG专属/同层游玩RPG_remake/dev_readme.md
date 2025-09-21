# 开发README（同层游玩RPG_remake）

## 运行

- 开发：`pnpm watch`
- 构建：`pnpm build`
- 入口页面：`dist/src/同层游玩RPG_remake/index.html`

## 目录

- `core/`: EventBus、ServiceLocator、GameCore
- `mvc/controllers`: 过渡保留（Creation/Playing）
- `vue/`: Vue 组件（StartView/CreationRoot/PlayingRoot/SaveDialog）
- `services/`: TavernBridge、UI、Storage、Achievement、SameLayer、PlayerService、DomPortalService、IndexedDBSaveService、SaveLoadFacade、AutoSaveManager、WorldbookSaveService
- `models/`: GameState、CreationSchemas、SaveSchemas
- `data/`: backgrounds、worldExpansions
- `shared/`: constants

## 模式

- Vue 组件通过 `inject('eventBus')` 与 `inject('locator')` 获取事件与服务；也可直接注入 `ui/tavern/storage/achievement`。
- 2025-09-04：新增 `player` 服务，可通过 `inject('player')` 获取 `PlayerService`，统一读取 `<user>` 的 MVU 数据并订阅更新。
- 2025-09-11：新增 `saveDb`、`saveFacade` 服务，提供完整的存档功能。
- 控制器不直接操作服务实例，统一通过 `locator.get<T>(key)` 获取（过渡期仍可用）。
- 状态持久化通道顺序：MVU ➜ replaceVariables ➜ localStorage。
- 事件总线统一事件命名：`game:*`、`creation:*`、`playing:*`；新增 `game:start-create-vue`（Start→Creation）。

### 同层游玩（覆盖0层，不新增楼层）

- 服务：`SameLayerService`
  - `generateAndOverrideLayer0({ user_input })`: 非流式生成并覆盖第0层
  - `streamAndOverrideLayer0({ user_input })`: 流式生成，结束时覆盖第0层
  - `overrideLayer0Message(content, data?, { refresh })`: 直接覆盖第0层
  - 依赖 `TavernBridgeService.generate/stream` 获取文本；写回通过 `setChatMessages([{ message_id: 0, message, data }], { refresh: 'none'|'affected'|'all' })`
  - 若第0层不存在，首次会以 `createChatMessages` 在0层创建占位

#### 历史注入（2025-09-04）

- 构建 overrides：
  - `SameLayerService` 在生成前调用 `buildOverridesWithHistory()`，从 `WorldbookSaveService.getChatHistoryPrompts()` 读取并解析世界书聊天历史。
  - 仅注入 `assistant` 历史到 `overrides.chat_history.prompts`，不注入 `user` 历史（但前端照常显示）。
- 配置：
  - `locator.get('sameLayer').setHistoryMaxPrompts('all' | number)` 控制注入条数（默认 `'all'`）。
  - 如需恢复注入 `user`，可在后续为 `SameLayerService` 增加开关（未默认开放）。

- 事件：
  - 输入：`same-layer:request` { inputText: string, stream?: boolean }
  - 过程：`same-layer:progress` { phase: 'start'|'full', text? }
  - 完成：`same-layer:done` { text }
  - 停止：`same-layer:stop`
  - 错误：`same-layer:error` { operation, error }

- Vue端（`PlayingRoot.vue`）：
  - 发送时仅发 `same-layer:request`；订阅 `progress/done/error` 更新 UI；不直接操作 TavernHelper
  - 左侧 `<user>` 面板通过 `PlayerService.readUserPanel()` 获取 `base/current attributes`、`equipment`、`inventory` 并展示；`PlayerService.subscribeUpdates()` 自动刷新。

## 新增服务说明（2025-09-11）

### DOM Portal 服务

- `DomPortalService`: 自动在酒馆第0楼中查找并替换包含"【游玩】"关键字的节点
- 使用 `MutationObserver` 守护容器不被覆盖
- 支持自动重挂 Vue 应用

### 存档系统

- `IndexedDBSaveService`: 基于 IndexedDB 的底层存档服务
- `SaveLoadFacade`: 高层存档操作门面，提供完整的 CRUD 操作
- `AutoSaveManager`: 自动存档管理器，监听 `same-layer:done` 事件
- `SaveDialog.vue`: 功能完整的存档弹窗组件

### 世界扩展系统

- `data/worldExpansions.ts`: 提供世界扩展配置
- 支持为不同世界配置基础开关和可选扩展
- 每个扩展可以控制多个 UID 的启用/禁用

### 玩家数据服务

- `PlayerService`: 统一读取 `<user>` 的 MVU 数据
- 支持订阅 MVU 变量更新，自动刷新玩家面板
- 提供标准化的属性、装备、背包数据接口

## 扩展点

- 新增步骤：在 `CreationController.steps` 追加并在视图模板中增加 `data-step` 区块与指示器。
- 校验：在 `CreationSchemas.ts` 内扩展 Zod Schema 或校验方法。
- 服务：在 `GameCore.init()` 内注册新服务键；控制器通过 `locator` 获取。
- 世界扩展：在 `data/worldExpansions.ts` 中添加新的扩展配置。
- 存档功能：通过 `SaveLoadFacade` 扩展存档操作。

## 样式准则

- 所有样式置于 `#rpg-root` 命名空间内，避免与其他模板冲突。
- 参考旧版视觉：主色 `#ff9097`、强调 `#dcb18c`，按钮/卡片阴影与圆角保持一致。

## 创建流程迁移（2025-08-31 / 2025-09-01）

- 步骤：`difficulty → world → attributes → background`（背景可选）。
- 视图：`mvc/views/creation.html` 中包含四个 `data-step` 分页与指示器；背景页中的 `.backgrounds-grid` 由控制器动态渲染。
- 控制器：原 `CreationController.ts` 逻辑迁移至 `CreationRoot.vue`（Zod 校验、属性点夹紧、导航与事件广播）。
- 视图（Vue）：`App.vue` 切换模式；`StartView.vue` 触发 `game:start-create-vue`；`CreationRoot.vue` 在四步之间切换，`PlayingRoot.vue` 处理示例动作与返回。

## Vue 集成要点

- 构建：webpack 配置 `vue-loader`，并将 `.vue` 置于顶层规则（不嵌入 `oneOf`）。
- 依赖：`vue`、`vue-loader`、`@vue/compiler-sfc`；`externals` 白名单内联 `vue`，避免 CDN。
- 提供/注入：在 `index.ts` 通过 `app.provide` 提供 `locator/eventBus/ui/tavern/storage/achievement`。
- 数据：`data/backgrounds.ts` 提供 `getBackgroundsForWorld(world)` 过滤出身；`models/CreationSchemas.ts` 对齐旧世界枚举并新增 `Background` 类型。
