# 系统模式与架构要点

- 事件钩子：`mag_variable_update_ended`
- 事件钩子：优先 `Mvu.events.VARIABLE_UPDATE_ENDED`，缺省回退 `'mag_variable_update_ended'`
- 变量路径：统一走 `stat_data`
- 阶段同步：基于好感度阈值计算目标阶段，`好感事件[0]` 单调递增
- 去重策略：脚本变量域根 `好感事件触发记录[角色][阶段]=true`
- 事件调度：`世界.随机事件[0] === '无'` 时，触发角色最低未触发阶段事件
- 变量访问：优先通过 `Mvu.getMvuVariable`/`Mvu.setMvuVariable` 读写 `stat_data.*`，以保证 `display_data`/`delta_data` 的一致更新；非 `stat_data` 域保持 lodash 读写
- 可定制点：`buildEventName(role, stage)` 可被替换为项目自定义命名/映射
- 特殊剧情触发模式：对玩家态变量（如 `{{user}}.淫堕值`）设阈值与条件（如 `{{user}}.实力等级 === 'S'`），若世界空闲则优先触发关键剧情（如 `圣女传承`），并统一记录在 `tavern_helper.random_events.triggered` 去重列表中
