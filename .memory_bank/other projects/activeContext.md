# 当前活跃上下文（Active Context）

- 当前聚焦：同层游玩RPG_remake 前端 UI 由 Vue 3 接管（Start/Creation/Playing 全流程），与 ServiceLocator/EventBus 融合。
- 近期变更：
  - 引入 Vue 3 与 SFC 构建（vue-loader / @vue/compiler-sfc），`.vue` 规则顶层配置；`vue` 内联打包。
  - `index.ts` 通过 `app.provide` 注入 `locator/eventBus/ui/tavern/storage/achievement`；Vue 组件通过 `inject` 使用。
  - `App.vue`：基于 `mode` 切换 `StartView.vue`、`CreationRoot.vue`、`PlayingRoot.vue`；`StartView.vue` 触发 `game:start-create-vue`。
  - `CreationRoot.vue`：迁移 Zod 校验与属性点夹紧逻辑；四步导航与事件广播对齐 MVC 实现。
  - `GameCore`：保留服务注册，不再渲染 jQuery Start/Playing；支持 back-start 时容器重建与 Vue 重挂。
  - `PlayingRoot.vue`：实现“小说阅读模式”（自上而下展示段落，无对话气泡）；底部输入区支持 Enter 发送、Shift+Enter 换行，勾选“流式传输”、显示“停止”按钮；生成中文本自动滚动到底部。
  - `TavernBridgeService`：新增 `generate(config)` 与 `stream(config, handlers)`；流式基于 iframe 事件（`js_generation_started`/`js_stream_token_received_fully`/`js_stream_token_received_incrementally`/`js_generation_ended`）回调；停止优先调用 `SillyTavern.stopGeneration()`，回退 `/abort`。
  - `UIService`：新增 `error(title, message)`；Playing 失败时提示。
  - 使用 zod 校验生成结果（最小一字符）；构建通过。
  - 同层聊天：发送时从“当前存档”世界书条目解析历史，仅将 `assistant` 历史注入 generate 的 `overrides.chat_history.prompts`；不注入 `user` 历史，但前端仍完整显示。通过 `sameLayer.setHistoryMaxPrompts('all'|number)` 控制历史条数，默认 `'all'`。
- 下一步：
  - 可选：对话持久化到 `storage`/MVU，并提供恢复/清空能力。
  - 可选：样式细化与移动端适配；长文本虚拟滚动优化。
  - 可选：按需拆分 Creation 子组件；更新项目 README 与文档截图。
