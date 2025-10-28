# 战斗调试系统使用指南

## 概述

战斗调试系统为同层游玩RPG_remake项目提供了强大的测试和调试功能，允许开发者在战斗过程中实时调整敌人和玩家属性，导入导出配置，以及使用撤销/重做功能。

## 功能特性

### 1. 开发模式判断
- **普通战斗**：正常游戏模式，不显示调试功能
- **测试战斗**：调试模式，显示完整的调试面板

### 2. 实时数据编辑
- **敌人数据编辑器**：修改敌人属性（HP、攻击力、防御力等）
- **玩家数据编辑器**：修改玩家属性（HP、攻击力、防御力等）
- **技能管理**：添加/移除技能

### 3. JSON导入导出
- **完整格式**：包含敌人、玩家和战斗配置的完整JSON
- **简化格式**：仅包含敌人数据的简化JSON
- **示例模板**：提供标准格式的示例文件

### 4. 调试控制
- **撤销/重做**：支持操作历史记录
- **重置功能**：恢复到战斗初始状态
- **快速预设**：简单、普通、困难敌人预设

## 使用方法

### 启动调试模式

```typescript
// 使用测试战斗按钮启动调试模式
const battleConfig = useBattleConfig();
await battleConfig.startTestBattle('yokai_battle');
```

### 普通模式 vs 调试模式

```typescript
// 普通战斗（不显示调试面板）
await battleConfig.startBattle('yokai_battle');

// 测试战斗（显示调试面板）
await battleConfig.startTestBattle('yokai_battle');
```

### 实时编辑属性

调试面板支持实时编辑以下属性：

#### 基础属性
- **名称**：角色显示名称
- **等级**：1-20级
- **当前HP**：0-99999
- **最大HP**：1-99999

#### 战斗属性
- **物理攻击**：0-9999
- **H攻击**：0-9999
- **物理防御**：0-9999
- **H防御**：0-0.99（比例值）
- **命中率**：0-10
- **闪避率**：0-1
- **暴击率**：0-1
- **暴击伤害倍数**：1-5
- **H血量**：0-99999

#### 技能管理
- 添加/移除技能
- 支持技能：power_strike, precise_strike, fireball, defend, heal, magic_missile, shield

### JSON导入导出

#### 导出当前状态

```typescript
// 在调试面板中点击"导出完整战斗状态"
// 将下载包含当前战斗状态的JSON文件
```

#### 导入配置

```typescript
// 支持两种格式：

// 1. 完整格式
{
  "enemy": { /* 敌人数据 */ },
  "player": { /* 玩家数据 */ },
  "battleConfig": { /* 战斗配置 */ },
  "metadata": { /* 元数据 */ }
}

// 2. 简化格式（仅敌人）
{
  "id": "enemy_id",
  "name": "敌人名称",
  "side": "enemy",
  "level": 5,
  "hp": 200,
  "maxHp": 200,
  "stats": { /* 战斗属性 */ },
  "skills": ["skill1", "skill2"]
}
```

### 调试控制功能

#### 撤销/重做
- **撤销**：回到上一个状态
- **重做**：前进到下一个状态
- **历史记录**：最多保存50个状态

#### 重置功能
- **重置到初始状态**：恢复到战斗开始时的状态
- **清空历史记录**：清除所有撤销/重做历史

#### 快速预设
- **简单敌人**：低属性，适合测试
- **普通敌人**：中等属性，标准难度
- **困难敌人**：高属性，挑战难度

## 技术实现

### 架构设计

```
BattleRoot.vue
├── BattleLayout (正常战斗界面)
└── BattleDebugPanel (调试面板 - 条件显示)
    ├── EnemyDataEditor (敌人数据编辑器)
    ├── PlayerDataEditor (玩家数据编辑器)
    ├── JsonImportExport (JSON导入导出)
    └── DebugControls (调试控制)
```

### 事件系统

调试系统使用事件总线进行通信：

```typescript
// 更新敌人数据
eventBus.emit('battle:debug-update-enemy', {
  participantId: 'enemy_id',
  updates: { hp: 100, atk: 25 }
});

// 撤销操作
eventBus.emit('battle:debug-undo');

// 导入敌人数据
eventBus.emit('battle:debug-import-enemy', enemyData);
```

### 历史管理

```typescript
import { historyManager } from './services/HistoryManager';

// 记录状态变更
historyManager.recordChange(battleState, '状态描述');

// 撤销
const previousState = historyManager.undo();

// 重做
const nextState = historyManager.redo();
```

## 最佳实践

### 1. 测试流程
1. 使用 `startTestBattle()` 启动调试模式
2. 在调试面板中调整敌人属性
3. 测试战斗平衡性
4. 使用撤销/重做功能快速测试不同参数
5. 导出满意的配置供后续使用

### 2. 数据验证
- 所有输入都会进行实时验证
- 无效值会显示错误提示
- 确保数据在合理范围内

### 3. 性能考虑
- 历史记录限制在50条以内
- 使用防抖机制避免频繁更新
- 及时清理事件监听器

### 4. 错误处理
- 文件导入失败时显示详细错误信息
- 网络错误时提供重试选项
- 数据验证失败时保持原有状态

## 故障排除

### 常见问题

1. **调试面板不显示**
   - 确保使用 `startTestBattle()` 而不是 `startBattle()`
   - 检查 `isDebugMode` 是否为 `true`

2. **属性修改不生效**
   - 检查数据验证是否通过
   - 确认事件监听器正常工作

3. **JSON导入失败**
   - 检查JSON格式是否正确
   - 确认必需字段是否存在
   - 验证数值范围是否合理

4. **撤销/重做不工作**
   - 检查历史管理器是否正常初始化
   - 确认状态变更是否被正确记录

### 调试技巧

1. **使用浏览器控制台**
   ```javascript
   // 查看当前战斗状态
   console.log(window.__RPG_VUE_APP__);
   
   // 查看历史记录
   console.log(historyManager.getHistoryInfo());
   ```

2. **检查事件流**
   ```javascript
   // 监听所有调试事件
   eventBus.on('battle:debug-*', (data) => {
     console.log('Debug event:', data);
   });
   ```

3. **验证数据完整性**
   ```javascript
   // 检查参与者数据
   const participants = battleState.battleState.value?.participants;
   console.log('Participants:', participants);
   ```

## 扩展开发

### 添加新属性编辑器

1. 在对应的Editor组件中添加新控件
2. 更新数据验证规则
3. 在BattleParticipantStats接口中添加新属性
4. 更新UI布局和交互逻辑

### 自定义预设

```typescript
// 添加新的敌人预设
eventBus.emit('battle:debug-preset', 'custom_preset');

// 在事件监听器中处理
case 'custom_preset':
  updates = {
    hp: 150,
    maxHp: 150,
    level: 4,
    stats: {
      atk: 18,
      hatk: 15,
      def: 8,
      hdef: 0.25,
      hit: 0.85,
      evade: 0.12,
      critRate: 0.07,
      critDamageMultiplier: 1.7,
      hhp: 25
    }
  };
  break;
```

### 集成外部工具

```typescript
// 与外部配置管理工具集成
const externalConfig = await fetchConfigFromExternalTool();
eventBus.emit('battle:debug-import-full-config', externalConfig);
```

## 总结

战斗调试系统为游戏开发提供了强大的测试和调试工具，通过实时属性编辑、配置管理和历史记录功能，大大提升了开发效率和游戏平衡性调试的便利性。合理使用这些功能可以显著加速游戏开发进程。
