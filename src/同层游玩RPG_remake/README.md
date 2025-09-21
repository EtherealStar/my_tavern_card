# 同层游玩RPG · 重制版（MVP）

- 入口：`src/同层游玩RPG_remake/index.ts`
- 页面：`src/同层游玩RPG_remake/index.html`
- 样式：`src/同层游玩RPG_remake/index.css`（Tailwind v4）
- 核心：ServiceLocator、EventBus、GameCore
- 服务：TavernBridge（与酒馆交互）、UI（toastr 提示）、Storage（MVU/变量域/localStorage 三级存储）、Achievement（观察者模式）
- MVC：Start/Playing 视图与控制器（以 `?raw` 导入 HTML 模板，jQuery 渲染与事件绑定）

## 运行

- 已在 `config.yaml` 注册本入口。构建：
  - `pnpm build`（生产）或 `pnpm watch`（开发实时刷新）
- 构建产物：`dist/src/同层游玩RPG_remake/index.html`

## 样式与 Tailwind 使用说明（v4）

- 本项目已从 SCSS 迁移到 Tailwind v4。本地构建通过 PostCSS 完成（见 `postcss.config.js`）。
- 入口样式为 `src/同层游玩RPG_remake/index.css`，包含：
  - `@import 'tailwindcss'` 引入核心样式。
  - 多个 `@source` 指令，扫描 `*.html`/`*.vue`/`*.ts` 以保留所用工具类。
  - `@layer base` 中定义主题 CSS 变量（颜色、阴影等），限定在 `#rpg-root` 作用域以避免与宿主样式冲突。
  - `@layer components` 收敛复杂组件样式（卡片、面板、按钮等），逐步替换为工具类。
- 已移除 `index.html` 中的 CDN 版 Tailwind，请勿再次添加。
- 开发约定：
  - 优先使用 Tailwind 工具类；涉及伪元素、动画、滤镜等复杂样式时，沉入 `index.css` 的 `@layer components`。
  - 仅在 `#rpg-root` 命名空间下编写覆盖，减少外溢影响。
  - 如需 safelist 动态类，优先补充到 `@source` 覆盖范围，确有需要再使用 safelist（v4 默认优先 CSS @source）。

## 交互规范

- 使用 jQuery 的 `$(() => {})` 和 `$(window).on('unload', ...)` 管理加载/卸载；禁止使用 `DOMContentLoaded`
- 样式高度用 `width + aspect-ratio` 控制，避免 `vh`
- 需要额外 HTML 时用 `import tpl from './file.html?raw'`
- 与酒馆交互优先用全局接口（如 `triggerSlash`、`eventOn`），MVU操作统一通过 `MvuService` 进行

## 架构说明

- ServiceLocator：集中注册获取服务，避免耦合
- EventBus：命名空间事件与通配订阅（`game:*`）
- GameCore：统一初始化与挂载流程
- Achievement：观察者模式监听 `game:started` / `playing:action`

## 更新记录

- 2025-09-09：样式系统迁移至 Tailwind v4
  - 新增 `index.css`，移除 CDN 版 Tailwind，逐步将原 `index.scss` 的组件样式沉入 `@layer components`。
  - `StartView.vue`、`CreationRoot.vue`、`PlayingRoot.vue` 主体布局已替换为工具类，保持原视觉与交互。
  - 后续将清理遗留 SCSS 并补充 README 使用规范。

- 2025-09-04：同层聊天与世界书历史注入（仅 assistant）
  - 发送时从“当前存档”的世界书条目解析聊天记录，按原来在世界书中的顺序构建为 RolePrompt[]。
  - 仅将 `assistant` 历史注入为 `overrides.chat_history.prompts`，不注入 `user` 历史，避免用户文本重复并保持可控性。
  - 流式/非流式均支持；未在酒馆网页创建真实楼层，仅影响提示词构造与前端显示。
  - 可通过 `locator.get('sameLayer').setHistoryMaxPrompts('all'|number)` 控制带入的历史条数（默认 'all'）。

- 2025-09-03：Playing 界面三栏布局与小说流改造
  - PlayingRoot.vue：左侧状态栏（HP/MP/等级、可展开天赋），中间小说消息流（用户/AI 分隔条），右侧禁用按钮（地图/人物/亲密关系/读档/系统设置）。
  - 聊天：沿用 same-layer 流式/非流式；流式开关移至“系统设置”弹窗（暂为脚手架）。
  - 交互：输入区支持 Enter 发送、Shift+Enter 换行；支持“停止/清空”。
  - 响应式：窄宽度仅显示中间区域，左右以抽屉形式出现（顶部小按钮切换）。
  - 样式：统一至 `index.scss`；`.novel-content` 背景改为纯白（#fff），新增分隔线样式与通用按钮风格。

- 2025-09-02：引入 JSX/TSX 与 Pinia
  - 构建：通过 `babel-loader` + `@vue/babel-plugin-jsx` 启用 TSX/JSX，`.tsx` 与 `<script setup lang="tsx">` 均可使用。
  - TS：`tsconfig.json` 增加 `jsx: preserve` 与 `jsxImportSource: vue`，获得 Vue JSX 类型推断。
  - Pinia：在入口 `index.ts` 安装 `createPinia()`；新增 `stores/game.ts` 示例，可在组件中 `const game = useGameStore()` 使用。
  - Lint：启用 `eslint-plugin-vue`，并修复 Vue 文件中的规则报错；`PlayingRoot.vue` 保留 `vue/no-v-html` 警告以便后续决策。

- 2025-09-01：存档与世界书改造（记忆银行）
  - 新增前端弹窗收集存档名：点击确定创建，取消则留在创建界面。
  - 世界书条目改为关键词模式（selective），不设置任何关键词；插入位置改为“角色定义之前”。
  - 扫描深度使用默认 same_as_global。
  - 创建时严格检测重名，若存在则提示用户修改名称。
  - 条目 uid 从 1000 开始，若占用则递增分配。
  - 绑定规则：优先角色卡 primary 世界书；无则使用当前聊天绑定；两者皆无时为聊天创建并绑定。

- 2025-08-31：创建流程移植与交互优化
  - 步骤统一为：难度 → 世界 → 属性/出身（出身与属性同页）。
  - 难度与世界选择后自动跳转下一步；属性页不再自动跳转。
  - 属性点分配：
    - 每个属性的滑条最大值恒等于当前难度的总点数（简单=30，普通=20，困难=15）。
    - 拖动某一滑条时，只更新该滑条与其旁的数值输入框，其他滑条不发生视觉跳动。
    - 控制器在输入侧限制“总和不超过上限”：若其他属性之和已占用 X 点，则当前滑条的瞬时输入最多为（上限 - X）。
    - 数字输入嵌入到标签区域（原 `attr-value` 位置），用户可直接输入；值会被自动夹紧到可用剩余点以内。
  - 出身选择并入属性页下方，按所选世界过滤显示；选择后仅更新选中态与开始按钮可用性。
  - 维持 MVC 解耦：视图仅渲染模板，控制器绑定事件与状态推进，服务通过 `locator` 获取。

## 后续拓展

- 角色创建流程（zod 校验）、世界选择、属性分配等
- 存档/读档面板与更多成就
- 分模块场景/战斗系统

## 使用指南补充

### 在组件中使用 Pinia

```ts
import { useGameStore } from '../stores/game';
const game = useGameStore();
game.start('save1');
```

### 使用 TSX/JSX

- 新建 `.tsx` 文件，或使用 `<script setup lang="tsx">`。
- 示例：`vue/Hello.tsx`。
