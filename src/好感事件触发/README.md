# 好感事件触发器（增强版）

当角色好感度达到阈值（50、100、150）时：

- 先更新角色 `好感事件[0]` 阶段（1/2/3，单调递增，脚本控制变量）
- 若 `世界.随机事件[0] === '无'`，设置为该角色尚未触发的最低阶段对应的好感事件名

## 触发规则

- 角色：`紫音`、`凛`、`枫`
- 阈值→阶段：`50→1`、`100→2`、`150→3`
- 事件名（可后续自定义）：`好感事件-<角色>-阶段<阶段数>`（例如：`好感事件-紫音-阶段1`）
- 一次性：每名角色每阶段只会触发一次（脚本变量域去重）
- 互斥：当 `世界.随机事件[0] !== '无'` 时不触发新的事件；回到“无”时会补触发尚未触发的阶段事件

## 变量路径与存储策略

- 读取/写入：`stat_data.世界.随机事件[0]`
- 读取/写入：`stat_data.<角色>.好感事件[0]`（阶段：0/1/2/3）
- 读取：`stat_data.<角色>.好感度[0]`
- 触发记录：存于脚本变量域根级 `好感事件触发记录`（`getVariables({ type:'script', script_id:getScriptId() })` + `replaceVariables(...)`）

> 说明：不改动聊天变量域结构；触发记录仅在脚本域，避免污染。

## 实现细节

- 监听：`mag_variable_update_ended`
- 工具：`eventOn`、`getVariables`、`replaceVariables`、Lodash `_`
- 更新：直接修改回调入参中的 `variables`；设置 `out_is_updated = true` 以持久化

## MVU 集成（已接入）

- 事件监听：优先使用 `Mvu.events.VARIABLE_UPDATE_ENDED`，在缺省时回退到 `'mag_variable_update_ended'`。
- 变量读取：优先 `Mvu.getMvuVariable(variables, '<相对 stat 路径>')`，如 `'世界.随机事件[0]'`、`'紫音.好感度[0]'`；在缺省时回退到 `_.get(variables, 'stat_data.<...>')`。
- 变量写入：对 `stat_data.*` 的关键写入使用 `Mvu.setMvuVariable(variables, '<相对 stat 路径>', 值, { reason })`，保证 `display_data/delta_data` 同步；在缺省时回退到 `_.set(variables, 'stat_data.<...>', 值)`。
- 非 `stat_data` 域，如 `tavern_helper.*`、脚本变量域，仍使用 `_.get/_.set` + `replaceVariables(...)`。

## 自定义事件名

如需更改事件名，请在 `src/好感事件触发/index.ts` 中替换 `buildEventName(role, stage)` 的实现即可。

已内置的定制：

- 紫音：
  - 阶段1 → 女仆修行
  - 阶段2 → 心理评估
  - 阶段3 → 便利店圣女

## 配置（无需 MVU 初始化）

脚本支持在“脚本变量域”定义开关与固定阶段：

- 根键：`好感事件触发器.配置`
- 字段：
  - `启用全局:boolean`（默认 true）
  - `启用角色.<角色>:boolean`（默认 true）
  - `固定阶段.<角色>:0|1|2|3`（默认 0，表示不固定；>0 表示将阶段至少提升到该值）

示例：

```ts
const svars = getVariables({ type: 'script', script_id: getScriptId() });
_.set(svars, '好感事件触发器.配置.启用全局', true);
_.set(svars, '好感事件触发器.配置.启用角色.凛', false);
_.set(svars, '好感事件触发器.配置.固定阶段.紫音', 2);
await replaceVariables(svars, { type: 'script', script_id: getScriptId() });
```
