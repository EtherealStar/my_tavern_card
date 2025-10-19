## 战斗日志驱动的战后故事生成（HOWTO，不改代码版）

本指南说明如何在不立即修改源码的前提下，规划与实施“战后根据战斗日志自动生成叙事内容”的能力。实际接入点、方法名与调用时机均以说明方式呈现，便于后续逐步落地。

---

### 1) 目标与范围

- 目标：在战斗结束时，利用“战斗日志”作为提示词上下文，调用现有生成链路输出战斗叙事文本，并纳入现有的保存/显示流程。
- 范围：不改变现有架构，新增服务与调用点位的设计说明，包含事件采集、日志结构、提示词模板与测试策略。

---

### 2) 事件与数据流（说明）

事件来源（BattleEngine → BattleService）建议采集：
- `battle:skill-used`（技能释放）
- `battle:miss`（未命中）
- `battle:critical`（暴击）
- `battle:damage`（伤害）
- `battle:state-updated`（回合与血量状态变更）
- `battle:result`（结算结果）

数据流（说明）：
1. `BattleService.initializeBattle(config)`：创建并 `start()` 日志记录，收集参与者信息。
2. `BattleService.processPlayerAction/processEnemyTurn`：按 `events` 顺序 `record()`；当检测到回合切换时 `nextRound()`。
3. `BattleService.onBattleEnd(result)`：调用 `finalize(result)`，随后 `toPrompt()` 产出提示词片段，拼装“战后故事”提示词并调用 `SameLayerService.generateWithSaveHistorySync(...)`。

---

### 3) BattleLog 结构（说明）

核心字段：
- `participants`: { id, name, side }[]
- `round`: 当前回合号
- `events`: 按时间序的数组，每项含 { round, type, actorId, targetId, skillId?, hit?, crit?, damage?, hpAfter? }
- `summary`: { winner, rounds }

公开方法（说明）：
- `start(config, initialState)`：记录参与者与初始回合
- `record(eventType, data, snapshot?)`：记录关键事件
- `nextRound()`：回合自增
- `finalize(result)`：写入结果
- `toPrompt(options?)`：产出提示词片段（见 §5）
- `reset()`：清空

压缩策略（长战斗）：
- 合并连续普攻（命中但低伤）为一行摘要
- 必保留：技能、暴击、致命击倒、回合关键转折

---

### 4) 接入点（不改代码的对照说明）

- 初始化：`BattleService.initializeBattle` 调用 `battleLog.start(config, initialState)`。
- 记录：
  - 玩家路径：`processPlayerAction` 在 `engine.processAction` 结果返回后，遍历 `events` 调用 `battleLog.record(...)`。
  - AI 路径：`processEnemyTurn` 对 `aiEvents` 同理。
  - 当 `state.turn` 切回玩家且 `round` 自增时，对应调用 `battleLog.nextRound()`。
- 结算：`onBattleEnd(result)` 调用：
  - `battleLog.finalize(result)`
  - `const logText = battleLog.toPrompt({ maxLines: 120 })`；
  - `SameLayerService.generateWithSaveHistorySync({ user_input: composePrompt(logText, result), slotId })`。

---

### 5) 提示词模板（说明）

`composePrompt(logText, result)` 建议结构：
```
【战斗结果】
- 胜负：${result.winner === 'player' ? '玩家胜' : '玩家败'}
- 回合：${result.rounds ?? 'N/A'}

【战斗日志】
${logText}

【写作要求】
- 输出紧凑、叙事连贯、突出关键转折与情绪张力
- 不要逐字复述日志，允许合理润色
- 长度约 500~800 字
```

`logText` 由 `toPrompt()` 产生：
- 每回合 3-6 行；过长回合自动压缩
- 行格式示例：`R${round}·${actorName} 使用「${skillName}」命中 ${targetName}（${crit ? '暴击' : '普通'}，伤害 ${damage}）`

---

### 6) 与 usePlayingLogic 协作（可选）

若希望由 UI 层触发生成，可添加一个薄封装：
- `usePlayingLogic.generateBattleStory(logText: string): Promise<boolean>`
- 内部直接调用现有 `generateMessageSync/Stream` 与 `postProcessMessage`
- 由 `BattleService` 在结算时通过全局总线通知 UI，UI 再调用该方法

保持默认：直接在 `BattleService.onBattleEnd` 使用 `SameLayerService` 触发一次最小生成，UI 会自动展示保存的消息。

---

### 7) 测试策略（说明）

- 单元测试：
  - 事件采样：`useSkill / miss / crit / damage` 组合顺序正确
  - 长战斗压缩策略的边界（多回合合并）
  - `toPrompt` 长度与格式
- 集成测试：
  - 胜/负、玩家/AI 技能混合
  - 资源失败/网络异常时生成回退
- 手动验证：
  - 在示例战斗中触发多次技能与暴击，观察提示词内容与最终叙事质量

---

### 8) 里程碑

- M1：日志服务设计完成与接入点确认（本文档）
- M2：小流量灰度接入，生成一次战后故事（与现有简要结果并存）
- M3：提示词模板参数化，允许用户设置风格与长度
- M4：与 MVU 变量（世界观/语气）融合，提升一致性






















