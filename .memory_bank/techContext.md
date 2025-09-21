# 技术上下文

- 语言与构建：TypeScript + Webpack
- 依赖可用：lodash、jquery、jquery-ui、toastr、yaml、zod（本功能主要用 lodash）
- 全局接口：`eventOn`、`getVariables`、`replaceVariables`
- 存储域：聊天变量域（`stat_data.*`）与脚本变量域（触发记录）
- 监听策略：在变量更新尾钩子内进行阶段同步与事件调度
