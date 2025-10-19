# 战斗日志系统设计（稳定、可扩展、可用于AI提示词生成）

## 目标
- 稳定、无副作用地记录整场战斗的关键事件，形成结构化“战斗日志”。
- 日志对 UI 友好（可直接驱动 `BattleTopHUD`/任何需要的组件），对 AI 友好（可转换为简洁提示词）。
- 可扩展：支持新增事件类型、聚合策略和持久化策略。
- 与现有架构解耦：依赖 EventBus 监听，不侵入引擎与 UI；组合式函数提供响应式接口。

## 核心概念
- 事件源（Event Sources）：来自 `BattleEngine` → `BattleService` 转发的标准事件：
  - `battle:skill-used`、`battle:damage`、`battle:miss`、`battle:critical`、`battle:state-updated`、`battle:ended`。
- 日志项（BattleLogItem）：统一标准化后的记录单元，含时间戳、回合、参与者、动作摘要与原始数据。
- 日志存储（BattleLogStore）：内存中的响应式数组；战斗结束后可持久化至存档/MVU/世界书。
- 转换器（PromptConverter）：将结构化日志转换为用于 LLM 的提示词（可选压缩/聚合策略）。

## 数据结构
```ts
// 最小化但可扩展的数据结构
export type BattleLogKind = 'skill' | 'dmg' | 'miss' | 'crit' | 'state' | 'end';

export interface BattleLogItem {
  id: string;              // 唯一ID（雪花/时间戳+序号）
  t: number;               // 发生时间戳（ms）
  round: number;           // 回合号（从1开始）
  turn: 'player'|'enemy';  // 回合归属
  kind: BattleLogKind;     // 日志类型
  actorId?: string;
  targetId?: string;
  skillId?: string;
  value?: number;          // 伤害等数值
  isCritical?: boolean;
  text: string;            // 面向UI的短文本
  raw?: Record<string, any>; // 原始事件数据备份
}

export interface BattleLogSummary {
  totalRounds: number;
  totalDamageByActor: Record<string, number>;
  criticalCountByActor: Record<string, number>;
  kills: { actorId: string; targetId: string; }[];
}
```

## 生成与监听
- 在 `useBattleLog` 中集中监听 EventBus：
  - 订阅：`battle:skill-used` / `battle:damage` / `battle:miss` / `battle:critical` / `battle:state-updated` / `battle:ended`。
  - 从 `useBattleState` 读取 `round/turn/participants`，生成易读 `text`。
  - 将每个事件映射为 `BattleLogItem` 推入响应式 `logs`。

伪代码：
```ts
export function useBattleLog() {
  const logs = ref<BattleLogItem[]>([]);
  const summary = ref<BattleLogSummary>({...});
  const eventBus = inject<EventBus>(TYPES.EventBus);
  const { battleState, battleRound, currentTurn } = useBattleState();

  function push(kind: BattleLogKind, payload: Partial<BattleLogItem>) {
    const item: BattleLogItem = {
      id: `${Date.now()}-${logs.value.length}`,
      t: Date.now(),
      round: battleRound.value,
      turn: currentTurn.value,
      kind,
      text: payload.text || '',
      ...payload,
    } as BattleLogItem;
    logs.value.push(item);
    updateSummary(item);
  }

  function onSkillUsed(data:{actorId:string;targetId:string;skillId:string}) {
    push('skill', {
      actorId: data.actorId,
      targetId: data.targetId,
      skillId: data.skillId,
      text: `${nameOf(data.actorId)} 使用技能 ${skillNameOf(data.skillId)} 指向 ${nameOf(data.targetId)}`,
      raw: data,
    });
  }

  function onDamage(data:{actorId:string;targetId:string;damage:number;isCritical?:boolean}) {
    push('dmg', {
      actorId: data.actorId,
      targetId: data.targetId,
      value: data.damage,
      isCritical: !!data.isCritical,
      text: `${nameOf(data.actorId)} 对 ${nameOf(data.targetId)} 造成 ${data.damage} 点伤害${data.isCritical?'（暴击）':''}`,
      raw: data,
    });
  }

  // miss/crit/state/end 同理

  onMounted(() => {
    eventBus?.on('battle:skill-used', onSkillUsed);
    eventBus?.on('battle:damage', onDamage);
    // ... 其他事件
  });
  onUnmounted(() => {
    eventBus?.off('battle:skill-used', onSkillUsed);
    eventBus?.off('battle:damage', onDamage);
    // ... 其他事件
  });

  return { logs: readonly(logs), summary: readonly(summary), clear, toPrompt, exportJSON };
}
```

## 稳定性与无bug策略
- 只读依赖：从 `useBattleState` 读取 round/turn/名称映射，避免与引擎相互修改；日志本身是附加记录，不反向驱动状态。
- 明确生命周期：在进入战斗时清空日志；在 `battle:ended` 时合并并持久化；在 `resetBattle` 时清空。
- 异常隔离：事件解析失败或字段缺失时，降级为通用文本，不阻塞主流程；所有监听在卸载时成对清理。
- 防重与顺序：日志 ID 含时间戳+序号，UI 展示 slice(-N)；如需严格序列，可统一在 `BattleService` 发出事件时增加 `seq`。

## 可扩展性
- 事件类型扩展：新增时在 `BattleLogKind` 增补，同时添加映射函数与文本模板。
- 文本模板：集中放在 `renderers.ts`，按语言与简体/繁体/英文切换；支持自定义风格（简洁/叙事）。
- 聚合策略：提供 `aggregate(logs, options)`，将连续普攻合并、只保留关键事件（技能、暴击、致命伤害）。
- 持久化策略：
  - 轻量：保存到 `SaveLoadManagerService` 的当前存档位；
  - 数据驱动：通过 `StatDataBindingService` 写入 MVU 变量（用于跨界面重建）；
  - 世界书：用 `WorldbookSaveService` 记录摘要，便于剧情回顾。

## 与 UI 集成
- `BattleTopHUD`：继续接收 `battleLog`（来自 `useBattleLog.logs`）。
- 任何需要的组件：可订阅 `logs`/`summary`，做分页、筛选、导出。

## 与 AI 提示词集成
- 转换器 `toPrompt(logs, options)`：
  - 目标：将结构化日志转为适合 LLM 的短文本，聚焦信息密度与清晰度。
  - 选项：
    - `style: 'concise'|'narrative'`
    - `includeNumbers: boolean`（是否包含具体伤害/回合）
    - `maxEvents: number`（截断长度）
    - `aggregate: boolean`（是否启用聚合）
  - 示例输出（concise）：
    - 回合1：玩家使用“精准打击”，对妖怪造成12伤害。敌方反击未命中。
    - 回合2：玩家施放“火球”，暴击造成28伤害，妖怪倒下。玩家胜利。

## 持久化与恢复
- 结束时：`exportJSON()` 生成 `{ meta, logs, summary }` 写入存档/MVU；
- 恢复时：`importJSON()` 重建响应式 `logs` 与 `summary`（不影响引擎状态，只用于回放/回顾/提示词生成）。

## 最小落地步骤（不侵入现有逻辑）
1. 新增 `useBattleLog.ts`（组合式函数），只做事件监听与记录。
2. 在 `useBattleSystem` 挂载时创建并保持 `useBattleLog` 实例；在进入/退出战斗时清空/保存。
3. `BattleLayout` 将 `battleLog` 改为消费 `useBattleLog.logs`。
4. 提供 `toPrompt(logs, options)` 并在 `BattleResultHandler` 或 `usePlayingLogic` 中使用。

## 风险与对策
- 事件缺失/顺序不一致 → 在 `BattleService` 统一发出核心事件，日志端只做读；必要时增加 `seq`。
- 大量日志导致内存增长 → UI 展示限制条数；持久化时聚合。
- 多语言/本地化 → 文本模板抽离，集中管理。





