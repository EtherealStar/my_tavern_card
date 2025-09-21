# 世界书存档功能移除指南

## 概述

本文档详细说明如何从同层游玩RPG_remake项目中彻底移除世界书存档功能，改为仅使用IndexDB进行存档管理。此操作将简化项目架构，提高性能，并消除世界书与IndexDB之间的数据同步复杂性。

## 当前世界书存档功能分析

### 核心组件
- **WorldbookSaveService**: 负责创建世界书条目、监听酒馆事件、写入聊天记录
- **WorldbookSaveManager**: Vue组件与世界书存档的交互层
- **useWorldbook**: Vue Composable，提供世界书操作接口
- **存档流程集成**: 在创建、删除、读取存档时都会操作世界书条目

### 主要功能
1. 自动创建世界书条目用于存储聊天历史
2. 监听酒馆消息事件，实时写入聊天记录到世界书
3. 读档时从世界书恢复聊天历史
4. 删除存档时同步删除世界书条目
5. 历史注入功能，将世界书内容注入为提示词

## 移除方案详细步骤

### 步骤1: 删除核心世界书服务文件

**需要删除的文件:**
```
src/同层游玩RPG_remake/services/WorldbookSaveService.ts
src/同层游玩RPG_remake/composables/WorldbookSaveManager.ts  
src/同层游玩RPG_remake/composables/useWorldbook.ts
```

**操作说明:**
- 这些文件包含所有世界书存档相关的核心逻辑
- 删除后需要更新所有引用这些文件的地方

### 步骤2: 修改服务标识符

**文件:** `src/同层游玩RPG_remake/core/ServiceIdentifiers.ts`

**需要移除的标识符:**
```typescript
// 移除这些标识符
WorldbookSaveService: Symbol.for('WorldbookSaveService'),
WorldbookSaveManager: Symbol.for('WorldbookSaveManager'),
```

**操作说明:**
- 从TYPES对象中移除相关标识符
- 确保没有其他地方引用这些标识符

### 步骤3: 修改依赖注入容器

**文件:** `src/同层游玩RPG_remake/core/Container.ts`

**需要移除的内容:**
```typescript
// 移除导入
import { WorldbookSaveService } from '../services/WorldbookSaveService';

// 移除绑定
this.container.bind<WorldbookSaveService>(TYPES.WorldbookSaveService).to(WorldbookSaveService).inSingletonScope();

// 移除依赖关系中的 WorldbookSaveService
// 在 serviceDependencies 中移除所有包含 'WorldbookSaveService' 的依赖
```

**具体修改:**
- 移除第76行的WorldbookSaveService绑定
- 更新第139、147、154、164行的依赖关系数组，移除'WorldbookSaveService'

### 步骤4: 修改存档管理服务

**文件:** `src/同层游玩RPG_remake/services/SaveLoadManagerService.ts`

**需要移除的内容:**
1. 构造函数中的WorldbookSaveService依赖注入
2. createSave()方法中的`await this.worldbook.ensureSaveEntry(name)`
3. deleteSave()方法中的世界书删除逻辑
4. writeToWorldbook()方法（第274行）
5. loadFromWorldbook()方法（第418行）
6. loadFromWorldbookForUI()方法（第1102行）
7. 所有世界书相关的历史注入逻辑

**具体修改:**
```typescript
// 移除构造函数参数
constructor(
  @inject(TYPES.IndexedDBSaveService) private db: IndexedDBSaveService,
  @inject(TYPES.StatDataBindingService) private statDataBinding: StatDataBindingService,
  // 移除: @inject(TYPES.WorldbookSaveService) private worldbook: WorldbookSaveService,
  @inject(TYPES.SameLayerService) private sameLayerService: SameLayerService,
  @inject(TYPES.EventBus) private eventBus: EventBus,
) {
  this.setupAutoSaveListener();
}

// 在createSave()中移除
async createSave(name: string, options?: CreateSaveOptions): Promise<SaveData> {
  // ... 其他代码 ...
  
  // 移除: await this.worldbook.ensureSaveEntry(name);
  
  // ... 其他代码 ...
}
```

### 步骤5: 修改存档门面服务

**文件:** `src/同层游玩RPG_remake/composables/SaveLoadFacade.ts`

**需要移除的内容:**
1. 构造函数中的WorldbookSaveService依赖注入
2. remove()方法中的世界书删除逻辑（第67行）
3. removeMany()方法中的批量世界书删除逻辑（第175-185行）

**具体修改:**
```typescript
// 移除构造函数参数
constructor(
  @inject(TYPES.IndexedDBSaveService) private db: IndexedDBSaveService,
  // 移除: @inject(TYPES.WorldbookSaveService) private worldbook: WorldbookSaveService,
  @inject(TYPES.SaveLoadManagerService) private saveLoadManager: SaveLoadManagerService,
  @inject(TYPES.UIService) private ui: UIService,
) {}

// 简化remove()方法
public async remove(slotId: string): Promise<void> {
  // 直接删除 IndexedDB 中的存档
  await this.db.deleteSlot(slotId);
}
```

### 步骤6: 修改读档管理器

**文件:** `src/同层游玩RPG_remake/composables/LoadManager.ts`

**需要移除的内容:**
1. 构造函数中的WorldbookSaveService依赖注入
2. loadFromWorldbookToUI()方法（第55行）
3. loadUnified()方法中的世界书读档逻辑（第123-129行）
4. setSendHistoryInjectionEnabled()调用（第136行）

**具体修改:**
```typescript
// 移除构造函数参数
constructor(
  @inject(TYPES.SaveLoadFacade) private facade: SaveLoadFacade,
  @inject(TYPES.SaveLoadManagerService) private saveLoadManager: SaveLoadManagerService,
  @inject(TYPES.StatDataBindingService) private statDataBinding: StatDataBindingService,
  @inject(TYPES.UIService) private ui: UIService,
  // 移除: @inject(TYPES.WorldbookSaveService) private worldbook: WorldbookSaveService,
) {}

// 简化loadUnified()方法
async loadUnified(saveName: string): Promise<LoadResult> {
  try {
    console.log(`[LoadManager] 开始统一读档: ${saveName}`);

    // 仅从IndexDB读取
    const slotId = await this.saveLoadManager.findSlotIdBySaveName(saveName);
    if (!slotId) {
      throw new Error('存档不存在');
    }

    const indexDBData = await this.saveLoadManager.loadFromIndexDB(slotId);
    if (!indexDBData) {
      throw new Error('存档数据损坏');
    }

    // 恢复MVU变量快照
    await this.restoreMVUSnapshot(saveName);
    console.log(`[LoadManager] MVU快照恢复完成: ${saveName}`);

    console.log(`[LoadManager] 统一读档成功: ${saveName}`);
    return {
      success: true,
      source: 'indexdb',
      data: {
        saveName,
        messages: indexDBData.messages,
        indexDBData,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '读档失败';
    console.error(`[LoadManager] 统一读档失败: ${saveName}`, error);
    return {
      success: false,
      error: errorMessage,
      source: 'indexdb',
    };
  }
}
```

### 步骤7: 修改游戏核心

**文件:** `src/同层游玩RPG_remake/core/GameCore.ts`

**需要移除的内容:**
1. 构造函数中的WorldbookSaveService依赖注入
2. registerTavernEventListeners()调用（第107行）

**具体修改:**
```typescript
// 移除构造函数参数
constructor(
  @inject(TYPES.EventBus) private eventBus: EventBus,
  @inject(TYPES.UIService) private ui: UIService,
  @inject(TYPES.IndexedDBSaveService) private db: IndexedDBSaveService,
  @inject(TYPES.StatDataBindingService) private statDataBinding: StatDataBindingService,
  @inject(TYPES.TavernGenerationService) private tavern: TavernGenerationService,
  // 移除: @inject(TYPES.WorldbookSaveService) private worldbookSaveService: WorldbookSaveService,
  @inject(TYPES.GameStateService) private gameState: GameStateService,
  @inject(TYPES.SameLayerService) private sameLayerService: SameLayerService,
  @inject(TYPES.AchievementService) private achievement: AchievementService,
  @inject(TYPES.SaveLoadFacade) private saveFacade: SaveLoadFacade,
  @inject(TYPES.SaveLoadManagerService) private saveLoadManager: SaveLoadManagerService,
  @inject(TYPES.LoadManager) private loadManager: LoadManager,
  @inject(TYPES.CommandQueueService) private commandQueue: CommandQueueService,
) {
  this.initializeServices();
}

// 在initializeServices()中移除
private initializeServices(): void {
  // ... 其他初始化代码 ...
  
  // 移除: this.worldbookSaveService.registerTavernEventListeners();
  
  // ... 其他初始化代码 ...
}
```

### 步骤8: 修改数据模型

**文件:** `src/同层游玩RPG_remake/models/GameState.ts`

**需要移除的内容:**
```typescript
// 移除worldbook字段
export const GameStateSchema = z.object({
  player: PlayerSchema.optional(),
  started: z.boolean().default(false),
  /** 当前存档名 */
  saveName: z.string().optional(),
  /** 最后加载时间 */
  lastLoaded: z.number().optional(),
  // 移除以下字段:
  // /** 世界书信息：名称与条目名 */
  // worldbook: z
  //   .object({
  //     name: z.string(),
  //     entryName: z.string(),
  //   })
  //   .optional(),
});
```

**文件:** `src/同层游玩RPG_remake/models/SaveSchemas.ts`

**需要移除的内容:**
```typescript
// 移除以下接口定义:
// - DataSourceConfig
// - UIChatMessage 接口中的 source 字段
// - SeparatedDataResult
// - DataIntegrityValidation
```

### 步骤9: 修改Vue组件

**需要检查的文件:**
- `src/同层游玩RPG_remake/vue/PlayingRoot.vue`
- `src/同层游玩RPG_remake/vue/CreationRoot.vue`
- `src/同层游玩RPG_remake/stores/game.ts`

**需要移除的内容:**
1. 所有对`useWorldbook`的引用
2. 所有对`WorldbookSaveManager`的引用
3. 世界书相关的状态管理
4. 世界书相关的方法调用

### 步骤10: 修改Composables

**文件:** `src/同层游玩RPG_remake/composables/useGameServices.ts`

**需要移除的内容:**
1. 对`WorldbookSaveService`的依赖注入
2. 相关的服务可用性检查

**具体修改:**
```typescript
export function useGameServices() {
  const eventBus = inject<EventBus>('eventBus');
  const ui = inject<UIService>('ui');
  const saveLoadManager = inject<SaveLoadManagerService>('saveLoadManager');
  const tavern = inject<TavernGenerationService>('tavern');
  const achievement = inject<AchievementService>('achievement');
  // 移除: const worldbook = inject<WorldbookSaveService>('worldbook');

  // 在isServiceAvailable()中移除worldbook检查
  const isServiceAvailable = (serviceName: string): boolean => {
    switch (serviceName) {
      case 'ui':
        return !!ui;
      case 'saveLoadManager':
        return !!saveLoadManager;
      case 'tavern':
        return !!tavern;
      case 'achievement':
        return !!achievement;
      case 'eventBus':
        return !!eventBus;
      // 移除: case 'worldbook': return !!worldbook;
      default:
        return false;
    }
  };
}
```

## 清理后的架构

### 新的存档流程
```
创建存档 -> IndexedDBSaveService -> 仅存储到IndexDB
读取存档 -> IndexedDBSaveService -> 仅从IndexDB读取  
删除存档 -> IndexedDBSaveService -> 仅从IndexDB删除
```

### 简化的服务依赖关系
```
SaveLoadManagerService -> IndexedDBSaveService
SaveLoadFacade -> IndexedDBSaveService
LoadManager -> SaveLoadManagerService
GameCore -> 移除WorldbookSaveService依赖
```

## 测试验证

### 功能测试清单
- [ ] 创建新存档功能正常
- [ ] 读取存档功能正常
- [ ] 删除存档功能正常
- [ ] 重命名存档功能正常
- [ ] 存档列表显示正常
- [ ] MVU变量快照保存/恢复正常
- [ ] 游戏状态管理正常

### 回归测试
- [ ] 现有IndexDB存档数据不受影响
- [ ] Vue组件渲染正常
- [ ] 服务依赖注入正常
- [ ] 错误处理机制完整

## 注意事项

### 向后兼容性
- 确保现有的IndexDB存档数据不受影响
- 保持所有现有API接口的向后兼容性
- 确保Vue组件的使用方式不变

### 错误处理
- 移除世界书相关代码后，需要确保错误处理逻辑的完整性
- 所有存档操作都应该有适当的错误提示

### 性能优化
- 移除世界书同步逻辑后，存档操作应该更快
- 减少了对酒馆事件的监听，降低了系统负载

## 风险评估

### 低风险操作
- 删除独立的服务文件
- 移除未使用的导入和引用

### 中风险操作  
- 修改依赖注入配置
- 更新服务构造函数

### 高风险操作
- 修改存档管理核心逻辑
- 修改读档流程
- 需要仔细测试所有存档相关功能

## 实施建议

1. **分阶段实施**: 建议分步骤进行，每完成一个步骤后进行测试
2. **备份代码**: 在开始修改前，建议创建代码备份
3. **充分测试**: 每个步骤完成后都要进行功能测试
4. **文档更新**: 修改完成后更新相关技术文档

## 预期收益

1. **架构简化**: 移除复杂的双存储同步逻辑
2. **性能提升**: 减少不必要的世界书操作
3. **维护性**: 降低代码复杂度，便于后续维护
4. **稳定性**: 减少数据同步导致的不一致问题

---

**最后更新**: 2025-01-XX  
**文档版本**: 1.0  
**维护者**: 项目开发团队
