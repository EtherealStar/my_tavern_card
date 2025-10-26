# 战斗日志描述系统维护指南

> 最后更新: 2025-01-27
> 版本: 1.0

## 系统概述

战斗日志描述系统为战斗事件提供丰富、生动的叙述性文本，支持通用描述和专属技能描述，最终实现战斗日志驱动的战后故事生成。

## 文件结构

```
src/同层游玩RPG_remake/
├── models/
│   └── BattleLogSchemas.ts          # 日志数据结构定义
├── data/
│   ├── battleDescriptions.ts        # 描述模板
│   └── skillDescriptionMapping.ts   # 技能映射
├── services/
│   ├── BattleService.ts             # 扩展：描述生成和日志收集
│   └── BattleResultHandler.ts       # 扩展：故事生成功能
├── vue/
│   └── BattleRoot.vue               # 优化：使用生成的描述文本
└── docs/
    └── BATTLE_LOG_MAINTENANCE.md    # 本维护指南
```

## 维护操作

### 1. 添加新技能描述

#### 步骤1：在描述模板中添加专属描述

```typescript
// 在 data/battleDescriptions.ts 中添加
export const CUSTOM_SKILL_DESCRIPTIONS: Record<string, CustomSkillDescriptions> = {
  // ... 现有描述
  
  'new_skill': {
    hit: "{actor}释放出强大的新技能，能量击中{target}，造成巨大伤害",
    critical: "新技能暴击！{actor}的技能在{target}身上爆发，造成毁灭性伤害",
    miss: "{actor}的新技能偏离了目标，未能命中{target}"
  }
};
```

#### 步骤2：在技能映射中添加配置

```typescript
// 在 data/skillDescriptionMapping.ts 中添加
export const SKILL_DESCRIPTION_MAPPING: Record<string, SkillDescriptionConfig> = {
  // ... 现有映射
  
  'new_skill': { 
    skillId: 'new_skill', 
    type: DescriptionType.CUSTOM,
    customDescription: 'new_skill'
  }
};
```

#### 步骤3：验证配置

```typescript
// 在 BattleService 中验证
const config = getSkillDescriptionConfig('new_skill');
console.log('技能配置:', config);
```

### 2. 更新通用描述

#### 添加新的物理攻击描述

```typescript
// 在 data/battleDescriptions.ts 中修改
export const PHYSICAL_DESCRIPTIONS: GenericDescriptions = {
  hit: [
    // ... 现有描述
    "新的物理攻击描述模板",
    "另一个物理攻击描述模板"
  ],
  critical: [
    // ... 现有描述
    "新的物理暴击描述模板"
  ],
  miss: [
    // ... 现有描述
    "新的物理未命中描述模板"
  ]
};
```

#### 添加新的魔法攻击描述

```typescript
// 在 data/battleDescriptions.ts 中修改
export const MAGICAL_DESCRIPTIONS: GenericDescriptions = {
  hit: [
    // ... 现有描述
    "新的魔法攻击描述模板"
  ],
  // ... 其他类型
};
```

### 3. 扩展 BattleService 功能

#### 动态添加技能描述

```typescript
// 在运行时添加新技能描述
battleService.addCustomSkillDescription('dynamic_skill', {
  hit: "动态技能的命中描述",
  critical: "动态技能的暴击描述",
  miss: "动态技能的未命中描述"
});
```

#### 动态添加通用描述

```typescript
// 在运行时添加新的通用描述
battleService.addGenericDescriptions(DescriptionType.PHYSICAL, {
  hit: ["新的物理攻击描述"],
  critical: ["新的物理暴击描述"],
  miss: ["新的物理未命中描述"]
});
```

### 4. 性能优化

#### 调整缓存大小

```typescript
// 设置缓存大小限制
battleService.setCacheSizeLimit(2000); // 增加到2000

// 设置日志大小限制
battleService.setLogSizeLimit(500); // 减少到500
```

#### 清理旧数据

```typescript
// 手动清理缓存和日志
battleService.cleanupOldData();

// 清空描述缓存
battleService.clearDescriptionCache();

// 清空战斗日志
battleService.clearBattleLog();
```

#### 监控性能

```typescript
// 获取缓存统计信息
const stats = battleService.getCacheStats();
console.log('缓存统计:', stats);
// 输出: { cacheSize: 150, maxCacheSize: 1000, battleLogSize: 200, maxBattleLogSize: 1000 }
```

### 5. 调试和故障排除

#### 检查描述生成

```typescript
// 在 BattleService 中添加调试日志
private generateDescription(event: any): string {
  console.log('[BattleService] 生成描述:', {
    eventType: event.type,
    data: event.data,
    skillId: event.data.skillId
  });
  
  // ... 生成逻辑
}
```

#### 检查技能映射

```typescript
// 验证技能映射配置
const skillId = 'fireball';
const config = getSkillDescriptionConfig(skillId);
console.log(`技能 ${skillId} 的配置:`, config);

// 检查是否有专属描述
const hasCustom = hasCustomDescription(skillId);
console.log(`技能 ${skillId} 是否有专属描述:`, hasCustom);
```

#### 检查事件数据

```typescript
// 在 BattleRoot.vue 中检查事件数据
eventBus.on('battle:damage', (data: any) => {
  console.log('[BattleRoot] 伤害事件数据:', {
    hasDescription: !!data.description,
    description: data.description,
    originalData: data
  });
});
```

## 常见问题

### Q1: 描述没有生成

**可能原因**：

- 技能ID未在映射中配置
- 描述模板中缺少对应的键
- 事件数据格式不正确

**解决方案**：

1. 检查 `skillDescriptionMapping.ts` 中是否有该技能ID
2. 检查 `battleDescriptions.ts` 中是否有对应的描述模板
3. 在控制台查看事件数据格式

### Q2: 描述重复或单调

**可能原因**：

- 通用描述模板数量不足
- 随机选择逻辑有问题

**解决方案**：

1. 增加通用描述模板的数量
2. 检查 `randomSelect` 方法是否正常工作
3. 考虑添加更多专属技能描述

### Q3: 性能问题

**可能原因**：

- 缓存大小设置不当
- 日志积累过多
- 描述生成过于频繁

**解决方案**：

1. 调整缓存大小限制
2. 定期清理旧数据
3. 优化描述生成逻辑

### Q4: 参与者名称显示为"未知"

**可能原因**：

- `getParticipantName` 方法实现不完整
- 参与者ID不匹配

**解决方案**：

1. 完善 `getParticipantName` 方法的实现
2. 检查参与者ID的正确性
3. 添加参与者名称映射

## 扩展建议

### 1. 支持多语言

```typescript
// 添加语言支持
export enum Language {
  ZH_CN = 'zh-cn',
  EN_US = 'en-us',
  JA_JP = 'ja-jp'
}

// 多语言描述模板
export const MULTILINGUAL_DESCRIPTIONS = {
  [Language.ZH_CN]: PHYSICAL_DESCRIPTIONS,
  [Language.EN_US]: PHYSICAL_DESCRIPTIONS_EN,
  [Language.JA_JP]: PHYSICAL_DESCRIPTIONS_JP
};
```

### 2. 支持动态描述风格

```typescript
// 根据战斗类型选择不同的描述风格
export enum BattleStyle {
  REALISTIC = 'realistic',    // 写实风格
  FANTASY = 'fantasy',        // 奇幻风格
  COMEDY = 'comedy'           // 喜剧风格
}
```

### 3. 支持条件描述

```typescript
// 根据战斗状态选择不同的描述
interface ConditionalDescription {
  condition: (event: any, state: any) => boolean;
  description: string;
}
```

### 4. 集成AI故事生成

```typescript
// 在 BattleResultHandler 中集成AI生成
private async generateAIStory(battleLog: BattleLogItem[]): Promise<string> {
  const prompt = this.buildAIPrompt(battleLog);
  // 调用AI服务生成故事
  return await this.aiService.generateStory(prompt);
}
```

## 版本历史

- **v1.0** (2025-01-27): 初始版本，支持基础描述生成和故事生成

## 相关文档

- `BATTLE_LOG_DESCRIPTION_SYSTEM.md` - 系统设计文档
- `BATTLE_ARCHITECTURE.md` - 战斗系统架构
- `BATTLE_EVENTS.md` - 战斗事件系统
