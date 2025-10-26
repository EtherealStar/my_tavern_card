## 敌人立绘视频切换（基于技能触发）实施计划

### 背景与目标

当敌人释放某些特殊技能时，将敌人的立绘从静态图片切换为视频并循环播放，以模拟 Live2D 类似的动态效果。该能力需要：

- 在战斗配置中将技能与视频 URL 建立映射（可含 loop、音量、速率、回退行为等参数）。
- 在引擎/服务层明确发出“技能被使用”的事件，以便 Phaser 能精准感知并切换立绘。
- 在 Phaser 的 BattleScene 中预加载视频资源并切换显示层（图片 <-> 视频），完成播放后的回退与容错。

---

### 设计总览

1) 配置扩展（BattleSchemas / basicBattles.ts）

- 在每个敌方参与者的 `enemyPortrait` 下新增可选字段：
  - `videos?: Record<string, { src: string; loop?: boolean; volume?: number; playbackRate?: number; revertOnEnd?: boolean }>`
  - key 为 `skillId`，value 为视频配置。
- 在 `basicBattles.ts` 示例中为部分技能（如 `power_strike`, `fireball`）添加视频映射，确保可演示。

2) 校验扩展（BattleConfigService）

- 若 `enemyPortrait.videos` 存在，逐项验证 `src` 为有效 URL（沿用 `BattleResourceService.isValidUrl`）。
  - 校验失败的配置标记为无效，不阻断其他配置。

3) 事件扩展（BattleEngine / BattleService）

- BattleEngine：在处理 `useSkill` 时，除现有伤害/暴击事件外，新增事件 `battle:skill-used`，data: `{ actorId, targetId, skillId }`。
- BattleService：像转发其他 `events` 一样转发 `battle:skill-used`。AI 回合同样转发。

4) Phaser 集成（BattleScene.ts）

- 预加载：扫描 `participants[].enemyPortrait.videos`，使用 Phaser Loader 预加载所有视频资源（或按需延迟加载，首次触发时再加载并缓存）。
- 显示结构：为每个敌人立绘构建可切换的容器（图片 sprite + video texture / DOM）。
- 监听事件：接收 `battle:skill-used`，若 `actorId` 指向敌方参与者且存在对应 `skillId` 的视频：
  - 隐藏图片 sprite，显示/播放视频；`loop` 按配置；`volume`/`playbackRate` 同步到视频对象。
  - 若 `revertOnEnd !== false`：播放完成后回退到图片（loop 时可用计时/外部事件触发回退）。
- 容错：视频缺失或加载失败时，保持静态图不变并记录告警。

---

### 变更清单（文件级）

- `src/同层游玩RPG_remake/models/BattleSchemas.ts`（或等价模型定义处）
  - 在参与者结构中扩展 `enemyPortrait.videos` 字段类型。

- `src/同层游玩RPG_remake/services/BattleConfigService.ts`
  - 在 `validateBattleConfig()` 中，新增 `videos` URL 校验逻辑。

- `src/同层游玩RPG_remake/services/BattleEngine.ts`
  - 在 `processAction()` 处理 `useSkill` 分支时，追加 `battle:skill-used` 事件入列。

- `src/同层游玩RPG_remake/services/BattleService.ts`
  - 转发 `battle:skill-used`（玩家与 AI 均生效）。

- `src/同层游玩RPG_remake/configs/battle/basicBattles.ts`
  - 为示例敌人添加 `enemyPortrait.videos` 映射（至少 1~2 个技能）。

- `src/同层游玩RPG_remake/phaser/scenes/BattleScene.ts`
  - 预加载与显示层切换：添加视频资源加载、创建 video 对象/texture、事件驱动切换与回退。

---

### 事件时序（核心）

1. 玩家或 AI 选择并执行行动（`BattleService.processPlayerAction` 或 AI 分支）。
2. `BattleEngine.processAction`：
   - 如果 `action.type === 'useSkill'` 且存在 `skillId`：入列 `battle:skill-used`。
   - 计算命中/伤害/暴击，产生对应事件。
3. `BattleService` 先广播 `battle:state-updated`，再按序广播事件队列（含 `battle:skill-used`）。
4. `BattleScene` 监听并响应：
   - 对 `battle:skill-used`：按照配置切换敌人立绘为视频（loop/音量等策略）。
   - 对 `battle:damage`/`battle:critical` 等：维持现有效果。

---

### 兼容性与回退

- 无 `videos` 字段：按现有静态图流程。
- URL 无效或视频加载失败：不阻断战斗流程，仅回退静态图。
- 多敌人：以 `actorId` 精准定位；每个敌人各自管理视频状态。
- 性能：可配置为按需加载并缓存，避免初始加载过多视频资源。

---

### 验收标准（DoD）

- 在 `basicBattles.ts` 至少 1 场战斗的敌人上配置 `enemyPortrait.videos`，指定 1 个技能→视频。
- 触发该技能时，立绘能从图片切换到视频并循环播放（或按配置回退）。
- 在视频缺失/加载失败时，界面正常运行并回退静态图。
- 不影响现有图片立绘与战斗事件的渲染流程。

---

### 风险与缓解

- 不同浏览器的自动播放限制（需静音/用户交互后播放）：
  - 默认 `volume=0` 或使用 muted 属性，待首次用户交互后再升音量。
- 视频资源跨域问题：
  - 优先使用允许跨域播放的资源域，或本地/同源资源。
- 内存与性能：
  - 使用按需加载与销毁策略；循环视频时限制分辨率与码率。

---

### 下一步

1) 扩展 Schema 与基础配置示例。
2) 增强配置校验。
3) 引擎事件与服务转发。
4) Phaser 预加载与切换实现。
5) 手动/自动化测试用例补齐（包含失败回退路径）。












