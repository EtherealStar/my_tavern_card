# 进度记录（Progress）

## 已完成

- 好感事件触发增强与随机事件修复（MVU 接入、幂等去重）。
- Memory Bank 核心文档建立与维护。
- 同层游玩RPG_remake Vue 迁移：
  - 构建接入：`vue`、`vue-loader`、`@vue/compiler-sfc`；webpack 顶层 `.vue` 规则与 `VueLoaderPlugin`。
  - 注入：`index.ts` 提供 `locator/eventBus/ui/tavern/storage/achievement`，SFC 通过 `inject` 使用。
  - 组件：`StartView.vue`、`CreationRoot.vue`、`PlayingRoot.vue`；`App.vue` 以 `mode` 切换阶段。
  - 事件：统一 `globalEventBus`；新增 `game:start-create-vue`。
  - GameCore：服务注册保留，不再渲染 jQuery Start/Playing。
  - Playing：实现“小说阅读模式”界面；`TavernBridgeService` 接入生成与流式（含停止）；`UIService.error`；Zod 校验；自动滚动。
  - 同层聊天：基于世界书存档解析历史并注入提示词（仅 assistant），保持前端完整显示且不创建真实楼层；支持流式/非流式与历史条数上限配置。

## 待办

- 可选：对话持久化到 Storage/MVU；样式细化与移动端优化；按需拆分 Creation 子组件；为历史注入增加开关（是否包含 user）。

## 2025-09-01 更新

- Vue 迁移全流程完成；Playing 小说模式 + 生成/流式/停止落地；构建绿色。
