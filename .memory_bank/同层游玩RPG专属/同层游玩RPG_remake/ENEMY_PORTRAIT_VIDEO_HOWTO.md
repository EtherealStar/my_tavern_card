## 敌人立绘：按技能切换为视频（实现指引 HOWTO）

本指南给出从配置到事件、到 Phaser 表现层的完整落地步骤，并与 MVU 敌人类型机制兼容。

---

### 1) 模型与配置

在敌人参与者的 `enemyPortrait` 下新增 `videos`，按 `skillId` 映射视频参数：

```ts
type SkillVideoMap = Record<string, {
  src: string;
  loop?: boolean;
  volume?: number; // 0~1，考虑浏览器自动播放策略，建议默认 0
  playbackRate?: number; // 默认 1.0
  revertOnEnd?: boolean; // 非 loop 时播放结束后回退到图片，默认 true
}>;

// 参与者.enemyPortrait 扩展示意
interface EnemyPortrait {
  image: string;
  position?: { x: number; y: number; scale?: number };
  animation?: { idle?: string; attack?: string; damage?: string };
  videos?: SkillVideoMap;
}
```

在示例配置 `src/同层游玩RPG_remake/configs/battle/basicBattles.ts` 中给敌人添加：

```ts
enemyPortrait: {
  image: 'https://example.com/enemy.png',
  position: { x: 0.75, y: 0.4, scale: 0.9 },
  videos: {
    power_strike: { src: 'https://example.com/enemy_ps.mp4', loop: true, volume: 0, revertOnEnd: false },
    fireball:     { src: 'https://example.com/enemy_fb.mp4', loop: false, volume: 0.2, revertOnEnd: true }
  }
}
```

---

### 2) 配置校验（`BattleConfigService.validateBattleConfig`）

- 保持现有 `enemyPortrait.image` 校验。
- 若存在 `enemyPortrait.videos`，对其中每个 `src` 使用 `BattleResourceService.isValidUrl()` 校验。
- 校验失败时返回 `false` 并打印错误，便于在 `BattleConfigInitializer` 汇总无效配置。

---

### 3) 引擎事件（`BattleEngine.processAction`）

在处理 `useSkill` 且存在 `skillId` 时，新增事件以便表现层响应：

```ts
events.push({
  type: 'battle:skill-used',
  data: { actorId: actor.id, targetId: target.id, skillId: action.skillId }
});
```

说明：该事件不改变伤害/命中计算，仅提供“技能已释放”的时间点给 UI/Phaser 使用。

---

### 4) 服务转发（`BattleService`）

- 玩家与 AI 两条路径都会得到 `BattleEngine` 产出的 `events`。
- 保持 `battle:state-updated` 先行广播，再逐个广播事件（已有逻辑），确保 `battle:skill-used` 能到达 Phaser。

---

### 5) Phaser 实现（`phaser/scenes/BattleScene.ts`）

建议实现要点：

1. 预加载策略（其一即可）：
   - 静态预加载：在 `preload()` 读取 `payload.participants`，扫描 `enemyPortrait.videos` 并 `this.load.video(key, src)`。
   - 按需加载：在首次收到 `battle:skill-used` 时，若该 `src` 未缓存则 `this.load.video` 后播放。需在 `create()` 内注册一次性 loader complete 回调。

2. 显示结构：
   - 为每个敌人建立容器，包含：图片 sprite（默认可见）+ video 显示对象（默认隐藏）。
   - 将 video 对象与 `enemyId + skillId` 建立映射，或仅存一个可复用 video 并在播放前切源。

3. 事件监听：
   - 订阅 `battle:skill-used`：
     - 若 `actorId` 为敌方、且 `videos[skillId]` 存在：
       - 停止/隐藏图片 sprite，显示/播放视频；应用 `loop`、`volume`、`playbackRate`。
       - 非 `loop` 且 `revertOnEnd !== false`：在 `ended` 回调中回退图片。
     - 若视频缺失/加载失败：保持图片，并打印 `console.warn`。

4. 回退策略：
   - 循环视频通常代表技能持续特效，可在下一次行动或自定义计时后回退。
   - 非循环视频播放完毕自动回退。

---

### 6) MVU 敌人类型集成（可选）

为支持同族多类型与多皮肤，推荐在 MVU 敌人对象中加入：

```ts
enemyTypeId: string;     // 主类型：如 'yokai.kappa'
variantId?: string;      // 变体/皮肤：如 'rare'
formId?: string;         // 形态：如 'phase1'
race: string;            // 种族：如 'yokai'
bossTier?: string;       // boss 等级：如 'final'
tags?: string[];         // 自由标签
portraitOverrideId?: string; // 显式覆盖立绘/视频方案ID
portraitSeed?: number;   // 稳定随机立绘用
```

实现 PortraitResolver：

- 优先级：覆盖 > type+variant+form > type+variant > type > 标签组合（含 race） > 默认。
- 在战斗初始化时调用，得到最终 `enemyPortrait`（含 `videos`），注入到配置里。

---

### 7) 测试清单

- 单元：
  - 校验：无 `videos`、有 `videos`、URL 无效。
  - 引擎：`useSkill` 产生 `battle:skill-used`，其他行动不产生。

- 集成：
  - 玩家与 AI 各触发一次带视频的技能：能切换并播放；非 loop 自动回退；loop 可在下一行动回退。
  - 视频加载失败时不崩溃并保持图片。

- 手测：
  - 在 `basicBattles.ts` 为某个敌人填充 1~2 个 `videos` 映射，进入战斗验证。

---

### 8) 维护与扩展

- 将分散在 `basicBattles.ts` 的 `videos` 逐步迁移到集中注册表（资产服务），便于复用和运维。
- 增加过渡动画（淡入/淡出、遮罩）与多候选权重（结合 `portraitSeed`）。
- 在 `.memory_bank/.../BATTLE_EVENTS.md` 中补充 `battle:skill-used` 事件规范。










