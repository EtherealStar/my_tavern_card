# 技术上下文（同层游玩RPG_remake）

## 技术栈概览

### 前端框架
- **Vue 3**: 现代化响应式前端框架
- **TypeScript**: 类型安全的JavaScript超集
- **Pinia**: Vue 3状态管理库
- **Vue Router**: 客户端路由（使用Memory History）

### 样式系统
- **Tailwind CSS v4**: 实用优先的CSS框架
- **PostCSS**: CSS后处理器
- **CSS变量**: 主题和自定义属性支持

### 构建工具
- **Webpack**: 模块打包器
- **Babel**: JavaScript编译器
- **@vue/babel-plugin-jsx**: Vue JSX支持
- **TypeScript Compiler**: TypeScript编译

### 依赖注入
- **Inversify**: 依赖注入容器
- **reflect-metadata**: 元数据反射支持
- **ServiceContainer**: 自定义服务容器，支持健康监控

### 工具库
- **jQuery**: DOM操作和事件处理（过渡期使用）
- **Lodash**: 实用工具函数库
- **Zod**: 数据验证和模式定义

### 存储系统
- **IndexedDB**: 浏览器本地数据库
- **localStorage**: 浏览器本地存储
- **MVU变量**: 酒馆变量系统集成

## 项目结构

```
src/同层游玩RPG_remake/
├── core/                    # 核心架构
│   ├── Container.ts         # 依赖注入容器
│   ├── EventBus.ts          # 事件总线
│   ├── GameCore.ts          # 游戏核心
│   ├── GameCoreFactory.ts   # 游戏核心工厂
│   └── ServiceIdentifiers.ts # 服务标识符
├── services/                # 服务层
│   ├── MvuService.ts        # MVU操作服务
│   ├── StatDataBindingService.ts # 统计数据绑定
│   ├── TavernGenerationService.ts # 酒馆生成服务
│   ├── UIService.ts         # UI服务
│   ├── AchievementService.ts # 成就服务
│   ├── AutoSaveManager.ts   # 自动存档管理
│   ├── IndexedDBSaveService.ts # IndexedDB存档
│   ├── SaveLoadFacade.ts    # 存档加载门面
│   ├── SameLayerService.ts  # 同层聊天服务
│   ├── WorldbookSaveService.ts # 世界书服务
│   ├── GameStateService.ts  # 游戏状态服务
│   ├── DomPortalService.ts  # DOM门户服务
│   ├── CommandQueueService.ts # 指令队列服务
│   └── ResponsiveService.ts # 响应式服务
├── vue/                     # Vue组件
│   ├── App.vue              # 应用根组件
│   ├── StartView.vue        # 开始界面
│   ├── CreationRoot.vue     # 创建流程
│   ├── PlayingRoot.vue      # 游戏主界面
│   ├── SaveDialog.vue       # 存档对话框
│   ├── InventoryDialog.vue  # 背包对话框
│   ├── LoadingView.vue      # 加载界面
│   └── CommandQueueDialog.vue # 指令队列对话框
├── composables/             # Vue组合式函数
│   ├── useStatData.ts       # 统计数据绑定
│   ├── useAttributes.ts     # 属性管理
│   ├── useEquipment.ts      # 装备管理
│   ├── useSaveLoad.ts       # 存档管理
│   ├── useSaveManagement.ts # 存档管理
│   ├── useCharacterCreation.ts # 角色创建
│   ├── useGameServices.ts   # 游戏服务
│   └── useWorldbook.ts      # 世界书操作
├── stores/                  # Pinia状态管理
│   └── game.ts              # 游戏状态
├── models/                  # 数据模型
│   ├── GameState.ts         # 游戏状态模型
│   ├── CreationSchemas.ts   # 创建流程模式
│   ├── SaveSchemas.ts       # 存档模式
│   └── StatDataSchemas.ts   # 统计数据模式
├── data/                    # 静态数据
│   ├── backgrounds.ts       # 出身背景数据
│   └── worldExpansions.ts   # 世界扩展数据
├── utils/                   # 工具函数
│   └── SafeValueHelper.ts   # 安全值处理
├── index.ts                 # 应用入口
├── index.html               # HTML模板
├── index.css                # 样式文件
├── App.vue                  # Vue应用根组件
└── shims-vue.d.ts           # Vue类型声明
```

## 核心架构

### 依赖注入系统
```typescript
// 服务标识符
export const TYPES = {
  EventBus: Symbol('EventBus'),
  UIService: Symbol('UIService'),
  StatDataBindingService: Symbol('StatDataBindingService'),
  CommandQueueService: Symbol('CommandQueueService'),
  ResponsiveService: Symbol('ResponsiveService'),
  // ... 其他服务
};

// 容器配置
container.bind<EventBus>(TYPES.EventBus).to(EventBus).inSingletonScope();
```

### 事件系统
```typescript
// 事件命名规范
interface GameEvents {
  'game:started': void;
  'game:start-create-vue': void;
  'game:play-start': void;
  'game:back-start': void;
  'playing:action': any;
  'same-layer:done': any;
  'command-queue:added': any;
  'command-queue:executed': any;
  'command-queue:error': any;
}

// 事件发布/订阅
eventBus.emit('game:started');
eventBus.on('game:started', () => { /* 处理逻辑 */ });
```

### MVU集成
```typescript
// MVU操作接口
interface MvuService {
  getStatData(userKey: string, options?: MvuOptions): Promise<MvuResult>;
  setStatData(userKey: string, data: any, options?: MvuOptions): Promise<MvuResult>;
  subscribeStatDataUpdates(handler: (data: any) => void): () => void;
}
```

## 开发环境

### 构建配置
```typescript
// webpack.config.ts
module.exports = {
  entry: './src/同层游玩RPG_remake/index.ts',
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.tsx?$/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-typescript'],
          plugins: ['@vue/babel-plugin-jsx']
        }
      }
    ]
  }
};
```

### PostCSS配置
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'tailwindcss': {},
    'autoprefixer': {}
  }
};
```

### TypeScript配置
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## 数据流架构

### 服务层数据流
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vue Components │    │   Composable     │    │   Services      │
│                 │    │                  │    │                 │
│  - StartView    │◄──►│  - useStatData   │◄──►│  - MvuService   │
│  - CreationRoot │    │  - useAttributes │    │  - StatData     │
│  - PlayingRoot  │    │  - useEquipment  │    │  - Storage      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 存储层架构
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MVU Variables │    │   IndexedDB      │    │   localStorage  │
│                 │    │                  │    │                 │
│  - 统计数据      │    │  - 存档数据      │    │  - 临时数据      │
│  - 游戏状态      │    │  - 设置数据      │    │  - 缓存数据      │
│  - 用户数据      │    │  - 历史数据      │    │  - 会话数据      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 性能优化

### 缓存策略
- **MVU缓存**: 5分钟过期时间
- **统计数据缓存**: 1分钟过期时间
- **UI状态缓存**: 会话期间有效
- **存档缓存**: 永久缓存
- **指令队列缓存**: 会话期间有效
- **服务状态缓存**: 实时更新

### 懒加载
- **组件懒加载**: 按需加载Vue组件
- **服务懒加载**: 延迟初始化非关键服务
- **数据懒加载**: 按需加载游戏数据
- **分阶段初始化**: 优化启动流程，提供加载进度反馈

### 虚拟化
- **消息列表**: 虚拟滚动长列表
- **背包物品**: 虚拟化大量物品
- **存档列表**: 虚拟化存档列表

## 错误处理

### 错误分类
1. **网络错误**: 酒馆API调用失败
2. **数据错误**: MVU变量访问失败
3. **UI错误**: 组件渲染失败
4. **业务错误**: 游戏逻辑错误
5. **服务错误**: 服务初始化或运行失败
6. **指令队列错误**: 指令执行失败或冲突

### 错误处理策略
```typescript
// 统一错误处理
try {
  const result = await mvuService.getStatData(userKey);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
} catch (error) {
  console.error('MVU操作失败:', error);
  // 降级处理
  return getDefaultData();
}
```

### 降级机制
- **MVU降级**: 使用本地缓存数据
- **UI降级**: 显示简化界面
- **功能降级**: 禁用非关键功能
- **服务降级**: 自动重启失败的服务
- **指令队列降级**: 跳过冲突指令，继续执行其他指令

## 测试策略

### 单元测试
- **服务测试**: 测试核心服务逻辑
- **工具函数测试**: 测试工具函数
- **数据模型测试**: 测试数据验证

### 集成测试
- **组件测试**: 测试Vue组件集成
- **服务集成测试**: 测试服务间协作
- **数据流测试**: 测试完整数据流

### 端到端测试
- **用户流程测试**: 测试完整用户操作
- **性能测试**: 测试性能指标
- **兼容性测试**: 测试浏览器兼容性

## 部署配置

### 构建产物
- **index.html**: 主页面文件
- **index.js**: 主JavaScript文件
- **index.css**: 样式文件
- **LICENSE.txt**: 许可证文件

### 部署要求
- **酒馆助手**: 需要支持前端界面加载
- **浏览器支持**: 现代浏览器（ES2020+）
- **网络要求**: 支持HTTPS和WebSocket

### 环境变量
```typescript
// 环境配置
interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production';
  API_BASE_URL: string;
  DEBUG_MODE: boolean;
  CACHE_ENABLED: boolean;
}
```

## 安全考虑

### 数据安全
- **输入验证**: 使用Zod进行数据验证
- **XSS防护**: 避免innerHTML，使用textContent
- **CSRF防护**: 验证请求来源

### 存储安全
- **数据加密**: 敏感数据加密存储
- **访问控制**: 限制数据访问权限
- **数据清理**: 定期清理过期数据

## 监控和日志

### 性能监控
- **初始化时间**: 监控应用启动时间
- **内存使用**: 监控内存占用
- **响应时间**: 监控操作响应时间

### 错误监控
- **错误日志**: 记录所有错误信息
- **用户反馈**: 收集用户反馈
- **崩溃报告**: 自动收集崩溃信息

### 使用统计
- **功能使用**: 统计功能使用情况
- **性能指标**: 统计性能指标
- **用户行为**: 分析用户行为模式


