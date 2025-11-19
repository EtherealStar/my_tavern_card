# MVU变量中文化计划

## MVU属性改名计划（英→中文）

### 背景

当前 `stat_data` 必须展示为中文属性键（`力量`、`体质` 等），但应用内部（类型、计算、战斗逻辑）仍大量依赖英文键（`strength`、`constitution`）。本计划要求：**所有与 MVU 交互的操作统一转换为中文键**，而内部实现仍可保留英文键，只需在“进入/离开 MVU”边界做一次转换。

---

### 范围（按文件列出具体更改点）

1. **MVU 模板 & 更新规则**
   - `mvu变量表.yml`：把 `base_attributes`、`current_attributes` 中的 key 全部改成中文；$meta 模板示例同步更新。
   - `mvu变量更新规则.yml`：所有命令/路径示例使用中文键；必要时加注说明“所有 MVU 路径仅接受中文键”。
2. **数据模型与静态表**
   - TypeScript 层（`models/CreationSchemas.ts`、`data/levelAttributes.ts`、`data/backgrounds.ts`、`data/levelExpTable.ts`）可继续保留英文键，便于现有逻辑；新增统一的“英文 ↔ 中文”映射帮助函数供边界转换使用。
3. **服务层**
   - `StatDataBindingService.ts`：
     - 新增 `toChineseAttributes()` / `toChinesePath()` 等转换函数；所有调用 `Mvu.get/set/replace` 之前先将英文键对象转换为中文键对象；
     - 读取 MVU 后立刻调用 `toEnglishAttributes()` 将中文键映射回英文供内部使用；
     - 事件日志与 `notifyBindingHandlers()` 仍可输出英文键，但面向 MVU 的 payload 必须是中文键。
   - 其他服务（`DynamicEnemyService.ts`、`CommandQueueService.ts`、装备/背包服务等）若直接与 MVU 交互，应改为通过上述转换工具处理，避免散落的手写映射。
4. **组合式函数**
   - `useStatData.ts` 等组合式函数继续以英文键驱动内部逻辑，但在调用 `StatDataBindingService` 进行 MVU 读写时依赖统一的转换函数；
   - 对 UI 暴露的数据仍可为中文字段（便于展示），实现层无需改写大量英文键逻辑。
5. **前端 Vue 组件**
   - `PlayingRoot.vue`、`BattleRoot.vue`、`CommandQueueDialog.vue`、属性/装备展示组件等：凡是依赖属性键的逻辑、模板、校验、排序，全部替换为中文字段名。
   - `EquipmentDetailDialog.vue`、`InventoryDialog.vue` 等若有属性加成展示，字段名与文案保持中文。
6. **存档与世界书**
   - `SaveLoadManagerService.ts`、`SaveDialog.vue`：序列化/反序列化 `stat_data` 时使用中文键；读取旧存档时需要迁移脚本（单独任务处理），本计划默认只支持中文键。
   - `WorldbookSaveService.ts`：写入/覆盖世界书条目时使用中文键（包括 `<UpdateVariable>` 模板）。
7. **脚本与类型声明**
   - `src/mvu更新脚本`（若仍使用）中的变量定义、示例输出换成中文键。
   - `@types` 目录下所有 `stat_data` 相关声明更新为中文字段，确保类型检查一致。

---

### 实施步骤（逐层推进）

1. **准备阶段**
   - 在 `models/CreationSchemas.ts` 中定义唯一的中文属性枚举/类型，作为全局真相源。
   - 在 `data/*.ts` 中完成静态表的中文化，先通过单元测试验证导出的数据结构。
2. **MVU 模板更新**
   - 修改 `mvu变量表.yml`、`mvu变量更新规则.yml` 并更新任何文档中引用的样例。
   - 若有自动生成脚本，先跑一遍验证生成结果。
3. **服务层重构**
   - 先改 `StatDataBindingService.ts` 的内部实现和外部 API 签名，确保所有方法读写中文键；
   - 紧接着更新 `DynamicEnemyService.ts`、`CommandQueueService.ts`、装备/背包服务等依赖模块。
4. **组合式函数与 UI**
   - 更新 `useStatData.ts` 及其他组合式函数；
   - 批量搜索 Vue 组件内的属性键字符串，逐个替换并调试。
5. **存档/世界书/脚本**
   - Save/Load、世界书、外部脚本在与 MVU 交互或输出 JSON 到 UI 之前，同样通过转换层生成中文键。
6. **测试回归**
   - 角色创建→属性展示→装备/背包→指令队列→战斗→存档/读档→世界书注入的全链路测试；
   - 结合 `pnpm test`（若有）与手动验证，确认 UI 与数据一致。

---

### 注意事项

- **边界统一转换**：唯一需要改写的是“MVU 交互层”，内部 TypeScript 仍可保持英文键；确保所有 `Mvu.*` 调用前后都经过转换。
- **搜索与替换**：重点搜索 `Mvu.`、`setStatDataField`、`addMvuVariable` 等触点，确认都走过转换函数。
- **回滚策略**：转换层位于 `StatDataBindingService`，若出现问题，可集中回滚，不影响内部英文逻辑。

---

### 测试清单

1. **角色创建**
   - 属性分配、背景加成写入 MVU，确认 `stat_data` 内键为中文。
2. **背包/装备/指令队列**
   - 添加/移除装备与物品、执行队列时，检查所有路径均为中文。
3. **战斗系统**
   - 敌人生成、属性读取、战斗结果写回过程中无英文键残留。
4. **存档/读档 & 世界书**
   - 新建/读取存档，`stat_data` 与世界书条目应为中文字段。
5. **脚本/调试工具**
   - 若有外部脚本读取 `stat_data`，需更新并验证输出。
