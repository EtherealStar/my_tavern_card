# 战斗UI组件系统

基于图片参考设计的战斗界面UI组件系统，提供完整的战斗界面布局和交互功能。

## 组件架构

### 核心组件

1. **BattleLayout.vue** - 主布局容器
   - 管理整体布局结构
   - 响应式设计支持
   - 集成所有子组件

2. **BattleTopHUD.vue** - 顶部HUD区域
   - 敌人状态显示
   - 战斗信息显示
   - 状态指示器

3. **BattleCenterArea.vue** - 中央渲染区域
   - Phaser游戏渲染
   - 战斗特效层
   - 战斗消息提示

4. **BattleBottomHUD.vue** - 底部HUD区域
   - 行动面板
   - 玩家状态栏
   - 控制按钮

### 基础UI组件

1. **BattleHealthBar.vue** - 血条组件
   - 支持HP/MP/耐力等不同类型
   - 自定义颜色支持
   - 动画效果

2. **BattleStatusIndicator.vue** - 状态指示器
   - 多种状态类型
   - 不同尺寸支持
   - 自定义样式

3. **BattleActionPanel.vue** - 行动面板
   - 垂直按钮列表
   - 键盘导航支持
   - 选中状态高亮

4. **BattlePlayerStatusBar.vue** - 玩家状态栏
   - 多条状态条显示
   - 自定义状态支持
   - 响应式布局

5. **BattleEnemyStatusBar.vue** - 敌人状态栏
   - 敌人血条显示
   - 状态指示器集成
   - 特殊样式设计

## 设计特点

### 布局结构
```
┌─────────────────────────────────┐
│ [敌人状态栏]    [状态指示器]     │ ← TopHUD
├─────────────────────────────────┤
│                                 │
│         Phaser渲染区域          │ ← CenterArea
│      (背景 + 敌人立绘)          │
│                                 │
├─────────────────────────────────┤
│ [行动面板]    [玩家状态栏]      │ ← BottomHUD
└─────────────────────────────────┘
```

### 响应式支持
- **宽屏模式 (16:9)**: 左右分栏布局
- **竖屏模式 (3:4)**: 上下堆叠布局
- **移动端**: 触摸友好的按钮尺寸

### 视觉设计
- 竞技场风格背景
- 半透明UI覆盖层
- 动态血条和状态显示
- 平滑的动画过渡

## 使用方法

### 基本使用
```vue
<template>
  <BattleLayout
    :actions="battleActions"
    :enemy-data="enemyData"
    :player-data="playerData"
    :battle-info="battleInfo"
    @action-selected="onActionSelected"
    @action-confirmed="onActionConfirmed"
    @exit-battle="onExitBattle"
  />
</template>

<script setup>
import BattleLayout from './components/BattleLayout.vue';

const battleActions = [
  { id: 'fight', label: '战斗', icon: '⚔️' },
  { id: 'run', label: '逃跑', icon: '🏃' },
];

const enemyData = {
  name: '敌人',
  hp: 100,
  maxHp: 100,
};

const playerData = {
  name: '玩家',
  hp: 80,
  maxHp: 100,
  mp: 50,
  maxMp: 100,
};
</script>
```

### 数据格式

#### 行动数据
```typescript
interface Action {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}
```

#### 敌人数据
```typescript
interface EnemyData {
  name: string;
  hp: number;
  maxHp: number;
  statusIndicators?: StatusIndicator[];
}
```

#### 玩家数据
```typescript
interface PlayerData {
  name: string;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  endurance?: number;
  maxEndurance?: number;
  customStatus?: StatusBar[];
}
```

## 集成说明

### 与Phaser集成
- 使用现有的PhaserManager
- 保持BattleScene的兼容性
- UI组件独立于Phaser渲染

### 与现有系统集成
- 兼容现有的BattleSchemas
- 保持MVU变量系统集成
- 支持现有的战斗逻辑

## 测试

使用 `BattleUITest.vue` 组件进行测试：
```vue
<template>
  <BattleUITest />
</template>
```

## 样式定制

所有组件都使用CSS变量，可以通过修改以下变量来定制样式：
- `--color-primary`: 主色调
- `--color-accent`: 强调色
- `--bg-base`: 基础背景色
- `--bg-surface`: 表面背景色
- `--border-color`: 边框颜色
- `--text-primary`: 主要文字颜色
- `--text-secondary`: 次要文字颜色

## 注意事项

1. 组件使用Vue 3 Composition API
2. 支持TypeScript类型检查
3. 所有组件都是响应式的
4. 与现有系统完全兼容
5. 可以独立使用或组合使用

