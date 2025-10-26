# 战斗日志描述系统设计

> 最后更新: 2025-01-27
> 版本: 2.0 (集成式架构设计)

## 系统概述

战斗日志描述系统旨在为战斗事件提供丰富、生动的叙述性文本，支持通用描述和专属技能描述，最终实现战斗日志驱动的战后故事生成。

**架构设计理念**：采用**集成式架构**，将战斗日志功能直接集成到现有服务中，而非创建独立服务，保持架构简洁性和一致性。

## 核心设计理念

### 1. 集成式架构设计

- **扩展现有服务**：在 BattleService 中集成描述生成功能
- **复用现有流程**：利用现有的事件处理机制
- **保持架构一致**：遵循现有的依赖注入模式
- **最小化改动**：只需要修改现有文件，无需新增服务

### 2. 分层描述架构

- **通用描述**：适用于大多数技能的标准化描述
  - 物理攻击描述：适用于近战、远程物理技能
  - 魔法攻击描述：适用于各种魔法技能
- **专属描述**：为特殊技能提供独特的叙述文本
- **动态选择**：根据技能类型自动选择合适的描述模板

### 2. 描述类型分类

```typescript
// 描述类型枚举
export enum DescriptionType {
  PHYSICAL = 'physical',    // 物理攻击通用描述
  MAGICAL = 'magical',     // 魔法攻击通用描述
  CUSTOM = 'custom'        // 专属技能描述
}

// 技能描述配置接口
export interface SkillDescriptionConfig {
  skillId: string;
  type: DescriptionType;
  customDescription?: string;  // 专属描述键名（如果type为CUSTOM）
}
```

## 描述模板系统

### 1. 通用物理攻击描述模板

```typescript
const PHYSICAL_DESCRIPTIONS = {
  hit: [
    "利剑划过空气，在{target}身上留下一道深深的伤口，鲜血飞溅",
    "重拳击中{target}的胸口，发出沉闷的撞击声",
    "锋利的刀刃切过{target}的皮肤，留下一道血痕",
    "{actor}的武器精准命中{target}的要害部位",
    "武器与{target}的身体碰撞，发出金属撞击的声音"
  ],
  critical: [
    "致命一击！{actor}的武器深深刺入{target}的身体，鲜血如泉涌般喷出",
    "暴击！{actor}的攻击造成了毁灭性的伤害，{target}发出痛苦的惨叫",
    "完美命中！{actor}的武器在{target}身上留下了无法愈合的伤口",
    "重击！{actor}的全力一击让{target}几乎失去平衡"
  ],
  miss: [
    "{actor}的攻击被{target}敏捷地闪避了",
    "{actor}的武器只击中了空气，{target}轻松躲过",
    "攻击落空，{target}展现了出色的闪避技巧",
    "{actor}的攻击被{target}的护甲弹开"
  ]
};
```

### 2. 通用魔法攻击描述模板

```typescript
const MAGICAL_DESCRIPTIONS = {
  hit: [
    "魔法能量在{target}身上爆发，造成元素伤害",
    "{actor}释放的魔法击中{target}，能量波纹四散",
    "元素之力在{target}周围炸裂，造成魔法伤害",
    "{actor}的咒语生效，{target}被魔法能量包围",
    "魔法光芒击中{target}，能量在{target}身上闪烁"
  ],
  critical: [
    "魔法暴击！强大的元素能量在{target}身上爆炸，光芒四射",
    "法术暴击！{actor}的魔法造成了毁灭性的元素伤害",
    "魔法共鸣！{actor}的法术与{target}产生了强烈的能量反应",
    "元素爆发！{actor}的魔法能量在{target}身上产生了连锁反应"
  ],
  miss: [
    "{target}的魔法抗性抵消了{actor}的法术",
    "{actor}的魔法能量消散在空气中，未能命中{target}",
    "法术失效，{target}展现了对魔法的天然抗性",
    "{actor}的咒语被{target}的魔法护盾反弹"
  ]
};
```

### 3. 专属技能描述模板

```typescript
const CUSTOM_SKILL_DESCRIPTIONS = {
  'fireball': {
    hit: "{actor}释放出炽热的火球，火球在空中划出弧线，准确命中{target}，火焰瞬间包围了{target}的身体",
    critical: "火球术暴击！巨大的火球在{target}身上爆炸，火焰冲天而起，{target}被熊熊烈火包围",
    miss: "{actor}的火球术偏离了目标，火球在{target}身边爆炸，只造成了轻微的灼烧"
  },
  'heal': {
    hit: "{actor}释放出温暖的治疗光芒，光芒包围{target}，{target}的伤口开始愈合",
    critical: "治疗暴击！强烈的治愈能量从{actor}身上涌出，{target}的伤势瞬间恢复",
    miss: "治疗法术未能完全生效，{target}的伤势只得到了部分缓解"
  },
  'lightning_bolt': {
    hit: "闪电从{actor}手中射出，电光击中{target}，电流在{target}身上跳跃",
    critical: "闪电暴击！强大的电流在{target}身上爆发，电光四射，{target}被电击得颤抖不已",
    miss: "{actor}的闪电术被{target}的绝缘护甲阻挡，电流消散"
  },
  'ice_shard': {
    hit: "冰晶从{actor}手中射出，刺骨的寒气包围{target}，冰晶在{target}身上碎裂",
    critical: "冰霜暴击！巨大的冰锥刺向{target}，寒气瞬间冻结了{target}的周围",
    miss: "{actor}的冰晶术被{target}的热量融化，未能造成伤害"
  }
};
```

## 技能描述映射系统

### 1. 映射配置

```typescript
// 技能描述映射配置
export const SKILL_DESCRIPTION_MAPPING: Record<string, SkillDescriptionConfig> = {
  // 通用物理技能
  'basic_attack': { skillId: 'basic_attack', type: DescriptionType.PHYSICAL },
  'sword_strike': { skillId: 'sword_strike', type: DescriptionType.PHYSICAL },
  'bow_shot': { skillId: 'bow_shot', type: DescriptionType.PHYSICAL },
  'dagger_thrust': { skillId: 'dagger_thrust', type: DescriptionType.PHYSICAL },
  
  // 通用魔法技能
  'magic_missile': { skillId: 'magic_missile', type: DescriptionType.MAGICAL },
  'arcane_blast': { skillId: 'arcane_blast', type: DescriptionType.MAGICAL },
  'shadow_bolt': { skillId: 'shadow_bolt', type: DescriptionType.MAGICAL },
  
  // 专属技能
  'fireball': { 
    skillId: 'fireball', 
    type: DescriptionType.CUSTOM,
    customDescription: 'fireball'
  },
  'heal': { 
    skillId: 'heal', 
    type: DescriptionType.CUSTOM,
    customDescription: 'heal'
  },
  'lightning_bolt': { 
    skillId: 'lightning_bolt', 
    type: DescriptionType.CUSTOM,
    customDescription: 'lightning_bolt'
  },
  'ice_shard': { 
    skillId: 'ice_shard', 
    type: DescriptionType.CUSTOM,
    customDescription: 'ice_shard'
  }
};
```

## 集成式架构实现

### 1. 在 BattleService 中集成描述生成

```typescript
// 扩展现有的 BattleService
export class BattleService {
  private skills: Map<string, Skill> = new Map();
  private battleLog: BattleLogItem[] = []; // 新增：战斗日志收集

  // 新增：描述模板
  private descriptions = {
    physical: PHYSICAL_DESCRIPTIONS,
    magical: MAGICAL_DESCRIPTIONS,
    custom: CUSTOM_SKILL_DESCRIPTIONS
  };

  /**
   * 生成战斗日志描述
   * @param event 战斗事件
   * @returns 生成的描述文本
   */
  private generateDescription(event: BattleEvent): string {
    const { type, data } = event;
    const { actorId, targetId, skillId, damage, isCritical, isMiss } = data;
    
    // 获取参与者名称
    const actor = this.getParticipantName(actorId);
    const target = this.getParticipantName(targetId);
    
    // 根据技能类型选择描述模板
    const skillConfig = SKILL_DESCRIPTION_MAPPING[skillId];
    let template: string;
    
    if (skillConfig?.type === DescriptionType.CUSTOM) {
      template = this.getCustomDescription(skillConfig.customDescription!, isCritical, isMiss);
    } else {
      template = this.getGenericDescription(skillConfig?.type || DescriptionType.PHYSICAL, isCritical, isMiss);
    }
    
    // 替换占位符
    return template
      .replace(/{actor}/g, actor)
      .replace(/{target}/g, target)
      .replace(/{damage}/g, damage?.toString() || '0');
  }

  /**
   * 获取专属技能描述
   */
  private getCustomDescription(skillKey: string, isCritical: boolean, isMiss: boolean): string {
    const skillDescs = this.descriptions.custom[skillKey];
    if (!skillDescs) return this.getGenericDescription(DescriptionType.PHYSICAL, isCritical, isMiss);

    if (isMiss) return skillDescs.miss;
    if (isCritical) return skillDescs.critical;
    return skillDescs.hit;
  }

  /**
   * 获取通用描述
   */
  private getGenericDescription(type: DescriptionType, isCritical: boolean, isMiss: boolean): string {
    const descs = this.descriptions[type];
    if (!descs) return this.getGenericDescription(DescriptionType.PHYSICAL, isCritical, isMiss);

    if (isMiss) return this.randomSelect(descs.miss);
    if (isCritical) return this.randomSelect(descs.critical);
    return this.randomSelect(descs.hit);
  }

  /**
   * 随机选择描述
   */
  private randomSelect(descriptions: string[]): string {
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * 获取参与者名称
   */
  private getParticipantName(participantId?: string): string {
    if (!participantId) return '未知';
    // 这里需要从当前战斗状态中获取参与者信息
    // 具体实现依赖于现有的参与者管理逻辑
    return '未知'; // 临时实现
  }
}
```

### 2. 修改现有的事件处理流程

```typescript
// 在 BattleService.processPlayerAction 中集成描述生成
public async processPlayerAction(action: BattleAction, currentState: BattleState): Promise<BattleState> {
  // ... 现有逻辑 ...
  
  // 调用 BattleEngine 处理玩家行动
  const { newState, events } = this.engine.processAction(currentState, parsed.data);

  // 先发送战斗事件，让UI组件处理伤害显示
  events.forEach(event => {
    // 生成描述
    const description = this.generateDescription(event);
    
    // 记录到战斗日志
    this.recordBattleEvent(event, description);
    
    // 发送带描述的增强事件
    this.eventBus.emit(event.type, {
      ...event.data,
      description
    });
  });
  
  // ... 其余逻辑 ...
}

/**
 * 记录战斗事件
 */
private recordBattleEvent(event: BattleEvent, description: string) {
  const logItem: BattleLogItem = {
    id: `${Date.now()}-${this.battleLog.length}`,
    timestamp: Date.now(),
    type: event.type,
    actorId: event.data.actorId,
    targetId: event.data.targetId,
    skillId: event.data.skillId,
    damage: event.data.damage,
    isCritical: event.data.isCritical,
    isMiss: event.data.isMiss,
    description
  };
  
  this.battleLog.push(logItem);
}

/**
 * 获取战斗日志
 */
getBattleLog(): BattleLogItem[] {
  return [...this.battleLog];
}

/**
 * 清空战斗日志
 */
clearBattleLog() {
  this.battleLog = [];
}
```

## 集成到现有战斗系统

### 1. 修改 BattleRoot.vue

```typescript
// 在 BattleRoot.vue 中优化事件监听，使用生成的描述
battleEventUnsubscribers.push(
  eventBus.on('battle:damage', (data: any) => {
    // 使用生成的描述而不是简单文本
    if (data.description) {
      addBattleLog(data.description, 'info');
    } else {
      // 降级到原有逻辑
      const attackerName = battleState.getParticipant(data?.actorId)?.name || '未知';
      const targetName = battleState.getParticipant(data?.targetId)?.name || '未知';
      addBattleLog(`${attackerName} 对 ${targetName} 造成了 ${data.damage} 点伤害！`, 'info');
    }
    
    // 显示伤害数字
    if (battleLayoutRef.value && data.targetId) {
      battleLayoutRef.value.showEnemyDamage(data.targetId, data.damage, false);
    }
  })
);

battleEventUnsubscribers.push(
  eventBus.on('battle:miss', (data: any) => {
    if (data.description) {
      addBattleLog(data.description, 'warning');
    } else {
      // 降级到原有逻辑
      const attackerName = battleState.getParticipant(data?.actorId)?.name || '未知';
      addBattleLog(`${attackerName} 的攻击未命中！`, 'warning');
    }
  })
);

battleEventUnsubscribers.push(
  eventBus.on('battle:critical', (data: any) => {
    if (data.description) {
      addBattleLog(data.description, 'success');
    } else {
      // 降级到原有逻辑
      const attackerName = battleState.getParticipant(data?.actorId)?.name || '未知';
      const targetName = battleState.getParticipant(data?.targetId)?.name || '未知';
      addBattleLog(`暴击！${attackerName} 对 ${targetName} 造成了 ${data.damage} 点伤害！`, 'success');
    }
    
    // 显示伤害数字
    if (battleLayoutRef.value && data.targetId) {
      battleLayoutRef.value.showEnemyDamage(data.targetId, data.damage, true);
    }
  })
);
```

### 2. 在 BattleResultHandler 中集成故事生成

```typescript
// 在 BattleResultHandler 中添加故事生成功能
export class BattleResultHandler {
  constructor(
    @inject(TYPES.EventBus) private eventBus: EventBus,
    @inject(TYPES.SaveLoadManagerService) private saveLoad: SaveLoadManagerService,
    @inject(TYPES.BattleService) private battleService: BattleService, // 新增依赖
  ) {}

  public async persistAndAnnounce(result: BattleResult): Promise<void> {
    try {
      // 获取战斗日志
      const battleLog = this.battleService.getBattleLog();
      
      // 生成战斗故事
      const battleStory = this.generateBattleStory(battleLog, result);
      
      await this.saveLoad.setSetting('battle:last_result', {
        timestamp: new Date().toISOString(),
        result,
        battleLog,        // 新增：保存战斗日志
        battleStory,      // 新增：保存战斗故事
      });
      
      this.eventBus.emit('battle:result-persisted', { result, battleLog, battleStory });
    } catch (error) {
      console.warn('[BattleResultHandler] persist failed:', error);
    }
  }

  /**
   * 生成战斗故事
   */
  private generateBattleStory(battleLog: BattleLogItem[], result: BattleResult): string {
    const storyParts = [
      this.generateBattleIntroduction(battleLog),
      this.generateBattleNarrative(battleLog),
      this.generateBattleConclusion(result)
    ];
    
    return storyParts.join('\n\n');
  }

  /**
   * 生成战斗介绍
   */
  private generateBattleIntroduction(battleLog: BattleLogItem[]): string {
    const participants = this.extractParticipants(battleLog);
    return `战斗开始了！${participants.player}与${participants.enemy}展开了激烈的对决。`;
  }

  /**
   * 生成战斗叙述
   */
  private generateBattleNarrative(battleLog: BattleLogItem[]): string {
    return battleLog
      .map(log => log.description)
      .join(' ');
  }

  /**
   * 生成战斗结论
   */
  private generateBattleConclusion(result: BattleResult): string {
    if (result.winner === 'player') {
      return `经过${result.rounds}回合的激战，玩家取得了胜利！`;
    } else {
      return `经过${result.rounds}回合的激战，玩家败北了...`;
    }
  }
}
```

## 架构设计优势

### 2. 实现流程

#### 步骤1：扩展 BattleService

```typescript
// 在 BattleService 中添加：
// - 描述模板管理
// - 描述生成方法
// - 日志收集功能
// - 修改事件发送逻辑
```

#### 步骤2：扩展 BattleResultHandler

```typescript
// 在 BattleResultHandler 中添加：
// - 故事生成方法
// - 集成战斗日志数据
// - 扩展保存数据结构
```

#### 步骤3：优化 Vue 组件

```typescript
// 在 BattleRoot.vue 中：
// - 使用生成的描述文本
// - 保持向后兼容性
// - 添加降级处理机制
```

### 3. AI 故事生成集成（可选）

```typescript
// 在 BattleResultHandler 中集成 AI 故事生成（可选功能）
export class BattleResultHandler {
  async persistAndAnnounce(result: BattleResult): Promise<void> {
    try {
      // 获取战斗日志
      const battleLog = this.battleService.getBattleLog();
      
      // 生成基础战斗故事
      const battleStory = this.generateBattleStory(battleLog, result);
      
      // 可选：调用 AI 生成更丰富的故事
      let aiStory: string | undefined;
      try {
        const prompt = this.buildAIPrompt(battleStory, result);
        aiStory = await this.generateAIStory(prompt);
      } catch (error) {
        console.warn('[BattleResultHandler] AI story generation failed:', error);
        // 继续使用基础故事
      }
      
      // 保存结果
      await this.saveLoad.setSetting('battle:last_result', {
        timestamp: new Date().toISOString(),
        result,
        battleLog,
        battleStory,
        aiStory
      });
      
      this.eventBus.emit('battle:result-persisted', { result, battleStory, aiStory });
    } catch (error) {
      console.warn('[BattleResultHandler] persist failed:', error);
    }
  }

  private buildAIPrompt(battleStory: string, result: BattleResult): string {
    return `
【战斗结果】
- 胜负：${result.winner === 'player' ? '玩家胜' : '玩家败'}
- 回合：${result.rounds ?? 'N/A'}

【战斗日志】
${battleStory}

【写作要求】
- 基于以上战斗日志，生成一段生动的战斗叙述
- 输出紧凑、叙事连贯、突出关键转折与情绪张力
- 不要逐字复述日志，允许合理润色
- 长度约 500~800 字
- 保持与游戏世界观的风格一致
    `;
  }
}
```

```typescript
// 在 BattleService 中添加风格配置
export class BattleService {
  private descriptionStyle: DescriptionStyle = DescriptionStyle.NARRATIVE;
  
  setDescriptionStyle(style: DescriptionStyle) {
    this.descriptionStyle = style;
  }
  
  private generateDescription(event: BattleEvent): string {
    // 根据风格选择不同的描述模板
    const styleTemplates = this.getStyleTemplates(this.descriptionStyle);
    // ... 其余逻辑
  }
}

// 描述风格配置
export enum DescriptionStyle {
  CONCISE = 'concise',      // 简洁风格
  NARRATIVE = 'narrative',  // 叙事风格
  DRAMATIC = 'dramatic'     // 戏剧风格
}
```

## 性能优化

### 1. 描述缓存

```typescript
// 在 BattleService 中添加缓存机制
export class BattleService {
  private descriptionCache = new Map<string, string>();
  private maxCacheSize = 1000;
  
  private generateDescription(event: BattleEvent): string {
    const cacheKey = this.generateCacheKey(event);
    
    if (this.descriptionCache.has(cacheKey)) {
      return this.descriptionCache.get(cacheKey)!;
    }
    
    const description = this.generateDescriptionInternal(event);
    this.descriptionCache.set(cacheKey, description);
    
    // 清理缓存
    this.cleanupCache();
    
    return description;
  }
  
  private cleanupCache() {
    if (this.descriptionCache.size > this.maxCacheSize) {
      const entries = Array.from(this.descriptionCache.entries());
      const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
      toDelete.forEach(([key]) => this.descriptionCache.delete(key));
    }
  }
}
```

### 2. 内存管理

```typescript
// 在 BattleService 中添加内存管理
export class BattleService {
  private maxBattleLogSize = 1000;
  
  private recordBattleEvent(event: BattleEvent, description: string) {
    const logItem: BattleLogItem = {
      // ... 日志项创建
    };
    
    this.battleLog.push(logItem);
    
    // 限制日志大小
    if (this.battleLog.length > this.maxBattleLogSize) {
      this.battleLog = this.battleLog.slice(-this.maxBattleLogSize);
    }
  }
}
```

## 维护指南

### 1. 添加新技能描述

```typescript
// 1. 在 data/battleDescriptions.ts 中添加描述
CUSTOM_SKILL_DESCRIPTIONS['new_skill'] = {
  hit: "新技能的命中描述",
  critical: "新技能的暴击描述",
  miss: "新技能的未命中描述"
};

// 2. 在 data/skillDescriptionMapping.ts 中添加映射
SKILL_DESCRIPTION_MAPPING['new_skill'] = {
  skillId: 'new_skill',
  type: DescriptionType.CUSTOM,
  customDescription: 'new_skill'
};
```

### 2. 更新通用描述

```typescript
// 在 data/battleDescriptions.ts 中添加新的物理攻击描述
PHYSICAL_DESCRIPTIONS.hit.push("新的物理攻击描述模板");
PHYSICAL_DESCRIPTIONS.critical.push("新的物理暴击描述模板");
PHYSICAL_DESCRIPTIONS.miss.push("新的物理未命中描述模板");
```

### 3. 扩展 BattleService 功能

```typescript
// 在 BattleService 中添加新方法
export class BattleService {
  /**
   * 添加自定义技能描述
   */
  addCustomSkillDescription(skillId: string, descriptions: CustomSkillDescriptions) {
    CUSTOM_SKILL_DESCRIPTIONS[skillId] = descriptions;
    SKILL_DESCRIPTION_MAPPING[skillId] = {
      skillId,
      type: DescriptionType.CUSTOM,
      customDescription: skillId
    };
  }

  /**
   * 添加通用描述模板
   */
  addGenericDescriptions(type: DescriptionType, descriptions: GenericDescriptions) {
    this.descriptions[type] = { ...this.descriptions[type], ...descriptions };
  }
}
```

## 相关文档

- `BATTLE_ARCHITECTURE.md` - 战斗子系统架构
- `BATTLE_EVENTS.md` - 战斗事件系统
- `BATTLE_LOG_SYSTEM_DESIGN.md` - 战斗日志系统设计
- `BATTLE_LOG_STORY_HOWTO.md` - 战后故事生成指南

## 架构设计总结

### 设计原则

1. **集成式架构**：将战斗日志功能直接集成到现有服务中
2. **最小化改动**：只需要修改现有文件，无需创建新服务
3. **保持一致性**：遵循现有的依赖注入和事件处理模式
4. **向后兼容**：Vue 组件支持降级处理，确保系统稳定性

### 实现优势

- ✅ **无需新服务**：直接扩展现有服务功能
- ✅ **职责清晰**：每个服务保持原有职责，只添加相关功能
- ✅ **易于维护**：不需要管理额外的服务依赖
- ✅ **性能优化**：内置缓存和内存管理机制
- ✅ **扩展性强**：支持自定义描述风格和动态配置

### 文件结构

```
src/同层游玩RPG_remake/
├── services/
│   ├── BattleService.ts              # 扩展：描述生成和日志收集
│   └── BattleResultHandler.ts       # 扩展：故事生成功能
├── data/
│   ├── battleDescriptions.ts        # 描述模板
│   └── skillDescriptionMapping.ts   # 技能映射
├── models/
│   └── BattleLogSchemas.ts          # 日志数据结构
└── vue/
    └── BattleRoot.vue               # 优化：使用生成的描述文本
```

## 版本历史

- **v1.0** (2025-01-27): 初始设计，支持通用和专属描述
- **v2.0** (2025-01-27): 集成式架构设计，无需独立服务
- **v2.1** (计划): 支持自定义描述风格
- **v2.2** (计划): 集成 AI 故事生成
