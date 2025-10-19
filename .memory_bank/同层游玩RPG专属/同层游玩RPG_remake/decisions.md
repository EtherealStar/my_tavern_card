# 决策记录（同层游玩RPG_remake）

## 2025-08-30 创建流程移植

- 结论：无需修改 EventBus 与 ServiceLocator，保持既有实现。
- 理由：
  - EventBus 已支持命名空间与通配订阅，满足 `game:play-start`/`game:back-start` 等创建流程事件。
  - ServiceLocator 已满足集中注册与按键获取服务的需求，GameCore 已注册 `eventBus`/`tavern`/`ui`/`achievement`。
- 实施：
  - 新增 CreationView、CreationController，StartController 点击开始进入创建流程；GameCore 监听创建完成/返回事件切换视图。
  - 样式在 `#rpg-root` 作用域内迁移旧版外观，确保与 Tailwind 并存。

## 2025-08-31 旧→新世界与出身迁移

- 结论：将旧项目四步（难度/世界/属性/出身）移植为 MVC；暂不移植性别/种族与天赋。
- 改动：
  - `models/CreationSchemas.ts`：`GameWorldSchema` 调整为 `['西幻','都市','武侠','仙侠']`；新增 `Background` 类型。
  - `data/backgrounds.ts`：加入出身数据集与 `getBackgroundsForWorld` 过滤方法。
  - `mvc/views/creation.html`：世界选项替换为四世界；新增 `background` 步骤与指示器；移除天赋步骤。
  - `mvc/controllers/CreationController.ts`：步骤改为四步；根据世界渲染出身卡片；属性点分配沿用校验/校正；背景为可选。
  - `index.scss`：新增 `.backgrounds-grid` 与 `.background-item` 样式。
- 验证：`pnpm build` 通过，`dist/src/同层游玩RPG_remake/index.html` 可运行创建流程并进入 Playing。

## 2025-08-31 新增“性别与种族”步骤与世界限制

- 结论：在属性/出身之后新增“性别与种族”步骤，作为开始游戏前的必选项；在世界选择阶段仅开放“都市”，其他世界暂不可选。
- 理由：与旧项目流程一致（保留性别/种族），并按现阶段内容优先级限制可选世界。
- 实施：
  - `models/CreationSchemas.ts` 新增 `GenderSchema`、`RaceSchema`。
  - `mvc/views/creation.html` 新增 `identity` 步骤；将 `西幻/武侠/仙侠` 按钮 disabled 并加上“即将开放”提示。
  - `mvc/controllers/CreationController.ts` 扩展步骤至四步；新增性别与种族选择逻辑；`canStart()` 需性别与种族均已选择。
  - `index.scss` 为 `.option-btn:disabled` 增加禁用态样式。
- 兼容性：不修改 `EventBus`、`ServiceLocator`、`GameCore` 结构，仅通过 `GameCore` 注册 `StorageService`。

## 2025-09-01 Vue 3 渐进式迁移（Start/Creation/Playing）

- 结论：在不破坏现有服务与事件体系的前提下，引入 Vue 3（SFC + Composition API）接管 UI；通过 `app.provide` 与 `inject` 融合 `ServiceLocator` 与 `globalEventBus`。
- 理由：
  - 组件化模板与本地状态显著降低 UI 维护成本。
  - 现有 MVC 的校验/点数夹紧逻辑易于迁移为组合式函数；事件总线保持一致。
  - 可在构建层面稳定内联打包 `vue`，避免 CDN 外部依赖。
- 实施：
  - 构建：新增 `vue`、`vue-loader`、`@vue/compiler-sfc`，在 webpack 中添加 `.vue` 规则与 `VueLoaderPlugin`，将 `vue` 从 externals 白名单中剔除（内联）。
  - 注入：`index.ts` 在创建根实例时通过 `app.provide` 注入 `locator/eventBus/ui/tavern/storage/achievement`。
  - 视图：新增 `App.vue` 以 `mode` 切换 `StartView.vue`、`CreationRoot.vue`、`PlayingRoot.vue`；`StartView.vue` 触发 `game:start-create-vue`；`CreationRoot.vue` 复用 Zod schema 与属性点夹紧；`PlayingRoot.vue` 广播 `playing:action`。
  - 桥接：`GameCore` 不再渲染 jQuery Start/Playing；保留对 `game:back-start` 的容器重建与 Vue 重挂能力。
  - 验证：`pnpm build` 绿色；`dist/src/同层游玩RPG_remake/index.html` 运行正常，Start→Creation→Playing 全流程可用。

## 2025-09-04 同层聊天提示词历史的注入策略

- 结论：将“当前存档”的世界书聊天记录解析为 prompts，仅注入 `assistant` 历史至 `overrides.chat_history.prompts`；不注入 `user` 历史。
- 理由：
  - 保持同层前端完整显示用户与 AI 历史，但避免在提示词中重复注入用户文本，降低提示词冗余与潜在越界风险。
  - 保持与默认内置顺序兼容（chat_history → user_input），不改变 `user_input` 的位置。
- 实施：
  - `WorldbookSaveService.getChatHistoryPrompts()` 解析世界书块格式为 RolePrompt[]。
  - `SameLayerService.buildOverridesWithHistory()` 过滤掉 `role === 'user'`，仅保留 assistant 历史。
  - `GameCore` 注入 worldbook 到 sameLayer 并设置 `setHistoryMaxPrompts('all')` 默认值。

## 2025-09-07 存档主介质选择：IndexedDB

- 决策：存档数据持久化使用 IndexedDB；世界书继续用于历史注入与记录。
- 理由：跨聊天共享、可选择性清理、结构灵活、便于将来导出/导入。
- 实施：
  - 新增 `IndexedDBSaveService`、`SaveLoadFacade`、`AutoSaveManager`；
  - 在 `GameCore` 注册 `saveDb`、`saveFacade` 并启用 autosave；
  - Playing 右侧增加"存/读档"面板（自动1开关+立即保存；手动5位存/读/删）。
- 读档策略：仅恢复前端消息，不创建真实楼层；同步写回 MVU chat 级 `stat_data`。
- 扩展：导出/导入 JSON（接口已预留）、自动存档2、历史裁剪策略。

## 2025-09-11 DOM Portal 架构：自动容器管理

- 决策：使用 `DomPortalService` 自动在酒馆第0楼中查找并替换包含"【游玩】"关键字的节点。
- 理由：确保游戏界面正确显示在酒馆中，避免手动定位容器的复杂性。
- 实施：
  - 新增 `DomPortalService` 类，使用 `MutationObserver` 守护容器
  - 支持自动重挂 Vue 应用，确保界面稳定性
  - 在 `index.ts` 中启动，与现有初始化流程集成
- 优势：自动化程度高，容错性强，支持动态环境变化。

## 2025-09-11 世界扩展系统：模块化内容管理

- 决策：引入世界扩展系统，支持为不同世界配置可选的内容模块。
- 理由：提高内容管理的灵活性，支持渐进式内容发布，便于用户自定义体验。
- 实施：
  - 新增 `data/worldExpansions.ts` 提供扩展配置
  - 每个扩展可控制多个 UID 的启用/禁用
  - 在创建流程中集成扩展选择界面
- 优势：模块化设计，易于扩展，支持动态切换。

## 2025-09-11 玩家数据服务：统一 MVU 接口

- 决策：创建 `PlayerService` 统一管理玩家数据的读取和更新。
- 理由：简化 MVU 数据访问，提供标准化的数据接口，支持自动更新。
- 实施：
  - 新增 `PlayerService` 类，统一读取 `<user>` 的 MVU 数据
  - 支持订阅 MVU 变量更新，自动刷新玩家面板
  - 在 `PlayingRoot.vue` 中集成，实时显示玩家状态
- 优势：数据访问标准化，自动更新机制，代码复用性高。

## 2025-01-XX 服务解耦重构：混合模式架构

- 决策：采用混合模式架构，服务层使用 ServiceLocator，Vue 组件层使用 Composable。
- 理由：
  - 解决服务间紧耦合问题，避免直接导入依赖
  - 统一 MVU 操作入口，避免重复订阅和冲突
  - 保持现有功能完整性，不破坏 Vue 组件使用方式
- 实施：
  - 扩展 `MvuService` 作为统计数据绑定的统一入口
  - 重构 `StatDataBindingService` 通过 `initializeDependencies()` 获取依赖
  - 重构 `TavernBridgeService` 通过 ServiceLocator 获取 MvuService
  - 更新 `GameCore` 中的服务注册和依赖注入顺序
- 优势：
  - 完全解耦服务间依赖关系
  - 统一 MVU 操作接口，避免重复订阅
  - 保持混合模式架构的完整性
  - 所有现有功能保持不变

## 2025-01-XX 指令队列系统：批量操作和延迟执行

- 决策：实现指令队列系统，支持批量装备操作和延迟执行。
- 理由：
  - 提升用户体验，支持批量操作
  - 确保MVU变量更新与用户输入同步
  - 提供类似购物车的操作体验
- 实施：
  - 创建 `CommandQueueService` 管理指令队列
  - 实现 `CommandExecutor` 执行器，映射指令到StatDataBindingService方法
  - 创建 `CommandQueueDialog.vue` 提供队列操作界面
  - 集成到装备栏，支持冲突检测和数据验证
- 优势：
  - 支持批量操作，提升操作效率
  - 延迟执行确保数据同步
  - 冲突检测避免数据不一致
  - 性能监控和错误处理完善

## 2025-01-XX 服务健康监控：基于Inversify的完整DI容器

- 决策：实现基于Inversify的完整DI容器，支持服务健康监控和依赖管理。
- 理由：
  - 提供完整的服务生命周期管理
  - 支持服务健康状态监控
  - 实现自动故障恢复机制
- 实施：
  - 创建 `ServiceContainer` 类，基于Inversify实现
  - 实现服务健康状态跟踪（UNINITIALIZED、INITIALIZING、READY、ERROR）
  - 添加依赖关系管理和初始化顺序控制
  - 提供服务重启和自动故障恢复功能
- 优势：
  - 完整的服务监控和报告
  - 自动依赖关系管理
  - 支持服务重启和故障恢复
  - 提供性能统计和健康检查

## 2025-01-XX 分阶段初始化：优化启动流程

- 决策：实现分阶段初始化系统，优化启动流程并提供加载进度反馈。
- 理由：
  - 提升用户体验，提供启动进度反馈
  - 优化初始化顺序，减少启动时间
  - 支持服务依赖的渐进式加载
- 实施：
  - 创建 `GameCoreFactory` 实现分阶段初始化
  - 添加 `LoadingView.vue` 显示加载进度
  - 实现进度更新机制和错误处理
  - 优化服务初始化顺序和依赖管理
- 优势：
  - 提供清晰的启动进度反馈
  - 优化初始化性能
  - 支持错误恢复和重试
  - 改善用户体验

## 2025-01-30 Pinia战斗子系统状态管理：解决时序问题

- 决策：使用Pinia重构战斗子系统状态管理，解决BattleRoot状态监听器时序问题。
- 理由：
  - 解决战斗显示时序问题：BattleRoot状态监听器注册时机晚于状态变化通知
  - 提供响应式状态管理：状态变化自动同步到所有组件
  - 简化代码维护：减少大量监听器注册/注销的样板代码
  - 提升开发体验：Vue DevTools支持，便于调试和状态追踪
- 实施：
  - 创建 `stores/gameState.ts` 统一管理游戏状态
  - 创建 `stores/battleState.ts` 专门管理战斗状态和配置
  - 重构 `vue/BattleRoot.vue` 使用Pinia响应式状态
  - 重构 `composables/useBattleConfig.ts` 和 `usePhaserBattle.ts`
  - 创建 `plugins/piniaEventBus.ts` 保持与现有事件总线兼容
- 优势：
  - 彻底解决时序问题：响应式状态自动同步
  - 大幅简化代码：减少样板代码和手动监听
  - 提升开发体验：更好的类型安全和调试支持
  - 保持兼容性：与现有架构无缝集成
  - 性能优化：更高效的状态管理和组件渲染