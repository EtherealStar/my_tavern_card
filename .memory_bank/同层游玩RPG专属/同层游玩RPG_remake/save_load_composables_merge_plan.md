# 存读档组合式函数合并方案（同层游玩RPG_remake）

## 文档信息

- **创建日期**: 2025-01-XX
- **版本**: 1.0
- **状态**: 计划阶段
- **优先级**: 高

## 问题分析

### 当前状况

项目中的存读档功能存在多个组合式函数和类，功能重叠严重：

1. **useSaveLoadManager.ts** - Vue Composable，提供响应式状态和SaveLoadManagerService的包装
2. **LoadManager.ts** - 类，处理读档到UI的逻辑，包含MVU快照管理
3. **IndexDBSaveManager.ts** - 类，专门处理IndexDB存档的UI反馈
4. **SaveLoadFacade.ts** - 类，提供存档管理的门面模式

### 功能重叠分析

#### 重叠功能列表

| 功能        | useSaveLoadManager | LoadManager | IndexDBSaveManager | SaveLoadFacade |
| ----------- | ------------------ | ----------- | ------------------ | -------------- |
| 存档创建    | ✅                  | ❌           | ✅                  | ✅              |
| 存档删除    | ✅                  | ❌           | ✅                  | ✅              |
| 存档重命名  | ✅                  | ❌           | ❌                  | ✅              |
| 存档列表    | ✅                  | ❌           | ✅                  | ✅              |
| 读档操作    | ✅                  | ✅           | ✅                  | ❌              |
| UI反馈处理  | ❌                  | ❌           | ✅                  | ✅              |
| MVU快照管理 | ✅                  | ✅           | ❌                  | ✅              |
| 数据验证    | ✅                  | ❌           | ❌                  | ❌              |
| 响应式状态  | ✅                  | ❌           | ❌                  | ❌              |

#### 问题总结

1. **功能分散**: 相同功能在多个文件中重复实现
2. **接口不统一**: 不同组件调用不同的接口
3. **维护困难**: 修改功能需要同时更新多个文件
4. **类型不一致**: 不同实现返回不同的数据类型
5. **错误处理重复**: 每个文件都有自己的错误处理逻辑

## 合并方案

### 方案一：统一Vue Composable（推荐）

创建一个统一的 `useSaveLoad.ts` composable，整合所有功能。

#### 优势

- 符合Vue 3 Composition API最佳实践
- 更好的响应式支持
- 统一的类型定义
- 简化的API接口
- 更好的开发体验

#### 架构设计

```typescript
// src/同层游玩RPG_remake/composables/useSaveLoad.ts
export function useSaveLoad() {
  // 整合所有功能：
  // 1. 响应式状态管理
  // 2. 存档CRUD操作
  // 3. 读档到UI逻辑
  // 4. MVU快照管理
  // 5. 数据源分离
  // 6. UI反馈处理
}
```

### 方案二：保持分层架构，简化接口

保留核心服务层，简化组合式函数：

- 保留：SaveLoadManagerService（核心业务逻辑）
- 保留：SaveLoadFacade（门面模式）
- 合并：useSaveLoadManager + LoadManager + IndexDBSaveManager → useSaveLoad

## 详细实施计划

### 第一阶段：创建统一的useSaveLoad composable

#### 1.1 功能整合设计

**核心功能模块**：

```typescript
export function useSaveLoad() {
  // ==================== 响应式状态 ====================
  const isLoading = ref(false);
  const isSaving = ref(false);
  const dataSourceConfig = ref<DataSourceConfig>({...});

  // ==================== 存档管理 ====================
  const createSave = async (name: string, options?: CreateSaveOptions) => {...};
  const deleteSave = async (slotId: string) => {...};
  const deleteSaves = async (slotIds: string[]) => {...};
  const renameSave = async (slotId: string, newName: string) => {...};
  const listSaves = async () => {...};

  // ==================== 读档管理 ====================
  const loadSave = async (slotId: string): Promise<LoadResult> => {...};
  const loadToUI = async (slotId: string, uiContext: UIContext) => {...};
  const loadUnified = async (saveName: string): Promise<LoadResult> => {...};

  // ==================== MVU快照管理 ====================
  const saveMVUSnapshot = async (saveName: string) => {...};
  const restoreMVUSnapshot = async (saveName: string) => {...};

  // ==================== 数据源分离 ====================
  const loadWithDataSourceSeparation = async (saveName: string) => {...};
  const updateDataSourceConfig = (config: Partial<DataSourceConfig>) => {...};

  // ==================== UI反馈处理 ====================
  const handleUIFeedback = (operation: string, success: boolean, error?: string) => {...};

  return {
    // 响应式状态
    isLoading,
    isSaving,
    dataSourceConfig,
    
    // 存档管理
    createSave,
    deleteSave,
    deleteSaves,
    renameSave,
    listSaves,
    
    // 读档管理
    loadSave,
    loadToUI,
    loadUnified,
    
    // MVU快照管理
    saveMVUSnapshot,
    restoreMVUSnapshot,
    
    // 数据源分离
    loadWithDataSourceSeparation,
    updateDataSourceConfig,
    
    // 服务状态
    isAvailable,
  };
}
```

#### 1.2 类型定义整合

```typescript
// 统一的类型定义
export interface UIContext {
  messages: any; // Ref<Paragraph[]>
  streamingHtml: any; // Ref<string>
  isStreaming: any; // Ref<boolean>
  isSending: any; // Ref<boolean>
  scrollToBottom: () => void;
  nextTick: () => Promise<void>;
}

export interface LoadResult {
  success: boolean;
  data?: SaveData | SeparatedDataResult;
  error?: string;
  source: 'worldbook' | 'indexdb' | 'unified';
}

export interface DataSourceConfig {
  promptSource: 'indexdb' | 'worldbook';
  uiSource: 'indexdb' | 'worldbook';
}
```

#### 1.3 错误处理统一

```typescript
// 统一的错误处理机制
const handleError = (operation: string, error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : `${operation}失败`;
  console.error(`[useSaveLoad] ${operation}失败:`, error);
  
  // UI反馈
  ui?.error?.(`${operation}失败`, errorMessage);
  
  // 事件通知
  eventBus?.emit('save-load:error', { operation, error: errorMessage });
  
  throw new Error(errorMessage);
};
```

### 第二阶段：更新Vue组件引用

#### 2.1 需要更新的文件

**主要组件**：

- `PlayingRoot.vue` - 替换useSaveLoadManager引用
- `SaveDialog.vue` - 替换useSaveLoadManager引用
- `CreationRoot.vue` - 更新相关引用

**更新示例**：

```typescript
// 更新前
import { useSaveLoadManager } from '../composables/useSaveLoadManager';
const { createSave, deleteSave, loadSave } = useSaveLoadManager();

// 更新后
import { useSaveLoad } from '../composables/useSaveLoad';
const { createSave, deleteSave, loadSave } = useSaveLoad();
```

#### 2.2 接口兼容性处理

```typescript
// 保持向后兼容的接口映射
const useSaveLoadManager = () => {
  const saveLoad = useSaveLoad();
  
  // 映射旧接口到新接口
  return {
    ...saveLoad,
    // 保持旧的方法名
    loadSaveToUI: saveLoad.loadToUI,
    loadGame: saveLoad.loadUnified,
  };
};
```

### 第三阶段：清理冗余文件

#### 3.1 可以删除的文件

- `useSaveLoadManager.ts` - 功能已整合到useSaveLoad
- `LoadManager.ts` - 功能已整合到useSaveLoad
- `IndexDBSaveManager.ts` - 功能已整合到useSaveLoad

#### 3.2 保留的文件

- `SaveLoadFacade.ts` - 作为底层服务门面
- `SaveLoadManagerService.ts` - 核心业务逻辑

#### 3.3 依赖注入更新

更新 `Container.ts` 和 `ServiceIdentifiers.ts`：

```typescript
// 移除不再需要的服务注册
// container.bind<LoadManager>(TYPES.LoadManager).to(LoadManager);
// container.bind<IndexDBSaveManager>(TYPES.IndexDBSaveManager).to(IndexDBSaveManager);

// 保留核心服务
container.bind<SaveLoadManagerService>(TYPES.SaveLoadManagerService).to(SaveLoadManagerService);
container.bind<SaveLoadFacade>(TYPES.SaveLoadFacade).to(SaveLoadFacade);
```

### 第四阶段：测试和验证

#### 4.1 功能测试

- [ ] 存档创建功能
- [ ] 存档删除功能
- [ ] 存档重命名功能
- [ ] 存档列表获取
- [ ] 读档功能
- [ ] MVU快照管理
- [ ] 数据源分离功能
- [ ] UI反馈处理

#### 4.2 兼容性测试

- [ ] 现有Vue组件正常工作
- [ ] 现有API调用不受影响
- [ ] 错误处理机制正常
- [ ] 响应式状态更新正常

#### 4.3 性能测试

- [ ] 读档性能无下降
- [ ] 内存使用无增加
- [ ] 响应时间无增加

## 实施时间表

### 第1周：基础架构搭建

- [ ] 创建useSaveLoad.ts基础结构
- [ ] 实现核心接口定义
- [ ] 添加类型定义
- [ ] 实现基础功能

### 第2周：功能整合

- [ ] 整合存档管理功能
- [ ] 整合读档功能
- [ ] 整合MVU快照管理
- [ ] 整合UI反馈处理

### 第3周：组件更新

- [ ] 更新PlayingRoot.vue
- [ ] 更新SaveDialog.vue
- [ ] 更新CreationRoot.vue
- [ ] 测试组件功能

### 第4周：清理和优化

- [ ] 删除冗余文件
- [ ] 更新依赖注入配置
- [ ] 完善错误处理
- [ ] 性能优化

## 风险评估

### 高风险

1. **接口变更影响**: 可能影响现有组件的功能
   - **缓解措施**: 提供兼容性接口，逐步迁移

2. **数据丢失风险**: 合并过程中可能丢失数据
   - **缓解措施**: 充分测试，备份现有数据

### 中风险

1. **性能下降**: 合并后可能影响性能
   - **缓解措施**: 性能测试，优化关键路径

2. **类型错误**: TypeScript类型定义可能不匹配
   - **缓解措施**: 严格的类型检查，逐步验证

### 低风险

1. **开发时间延长**: 合并过程可能比预期时间长
   - **缓解措施**: 分阶段实施，及时调整计划

## 成功标准

### 功能标准

- [ ] 所有存读档功能正常工作
- [ ] UI反馈机制正常
- [ ] MVU快照管理正常
- [ ] 数据源分离功能正常

### 性能标准

- [ ] 读档时间不超过2秒
- [ ] 内存使用不超过60MB
- [ ] 响应时间不超过50ms

### 代码质量标准

- [ ] TypeScript类型覆盖率100%
- [ ] ESLint通过率95%以上
- [ ] 代码重复率降低50%以上
- [ ] 文件数量减少25%以上

## 后续优化

### 短期优化

1. **性能优化**: 优化读档性能，减少用户等待时间
2. **错误处理**: 完善错误处理机制，提供更好的用户体验
3. **类型安全**: 加强类型定义，提高代码质量

### 长期优化

1. **缓存策略**: 实现智能缓存，提升性能
2. **数据压缩**: 实现数据压缩，减少存储空间
3. **增量同步**: 实现增量数据同步，提升效率

## 总结

这个合并方案将显著简化项目的存读档功能架构，减少代码重复，提高维护性。通过统一的Vue Composable接口，开发者可以更容易地使用存读档功能，同时保持代码的类型安全和响应式特性。

实施过程中需要特别注意向后兼容性，确保现有功能不受影响。通过分阶段实施和充分测试，可以最大程度降低风险，确保项目稳定运行。
