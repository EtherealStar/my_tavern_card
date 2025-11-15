# Webpack Dev Server 集成计划

## 文档信息

- **创建日期**: 2025-01-24
- **状态**: 计划阶段
- **相关项目**: 同层游玩RPG_remake
- **目标**: 集成 webpack-dev-server 以解决 CORS 问题并提升开发体验

## 背景和目标

### 当前问题

1. **CORS 问题**
   - 本地开发时，如果直接打开 HTML 文件（`file://` 协议），浏览器会阻止访问本地资源
   - 资源路径解析依赖 `window.location.pathname`，在 iframe 中可能不准确
   - 需要手动启动 HTTP 服务器来访问项目

2. **开发体验问题**
   - 需要手动管理静态资源服务器
   - 没有自动热更新（HMR）
   - 资源路径在不同环境下可能不一致

3. **多入口管理**
   - 项目有多个前端界面入口（如 `同层游玩RPG_remake`、`界面示例` 等）
   - 需要统一的服务方式访问所有入口

### 目标

1. **解决 CORS 问题**
   - 通过 HTTP 服务器自动提供静态资源
   - 避免 `file://` 协议的 CORS 限制
   - 确保资源路径在所有环境下都能正确解析

2. **提升开发体验**
   - 自动热更新（HMR）
   - 自动刷新浏览器
   - 更好的错误提示和调试体验

3. **简化资源路径处理**
   - 统一资源路径解析逻辑
   - 支持本地资源和外部 URL
   - 确保开发和生产环境的一致性

## 解决方案概述

### 使用 webpack-dev-server

**优势**:

- ✅ 自动提供 HTTP 服务器，避免 CORS 问题
- ✅ 支持热更新（HMR），提升开发效率
- ✅ 自动处理静态资源，简化路径配置
- ✅ 支持多入口访问，通过路径访问不同项目
- ✅ 与现有 socket.io 热更新通知可以共存

**架构**:

```text
┌─────────────────────────────────────────────────────────┐
│              Webpack Dev Server (端口 8080)              │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  静态资源服务 (dist 目录)                          │  │
│  │  - /同层游玩RPG_remake/index.html                  │  │
│  │  - /同层游玩RPG_remake/assets/...                 │  │
│  │  - /界面示例/index.html                           │  │
│  │  - /界面示例/assets/...                           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  热更新 (HMR)                                      │  │
│  │  - 自动检测文件变化                                 │  │
│  │  - 自动刷新浏览器                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              酒馆 (SillyTavern)                          │
│  $('body').load('http://localhost:8080/同层游玩RPG_remake/index.html') │
└─────────────────────────────────────────────────────────┘
```

## 详细实施步骤

### 步骤 1: 安装依赖

```bash
pnpm add -D webpack-dev-server
```

### 步骤 2: 修改 webpack 配置

在 `webpack.config.ts` 中添加 `devServer` 配置：

```typescript
// webpack.config.ts
function parse_configuration(entry: Entry): (_env: any, argv: any) => webpack.Configuration {
  const script_filepath = path.parse(entry.script);

  return (_env, argv) => ({
    // ... 现有配置 ...
    
    // 添加 devServer 配置
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
        publicPath: '/',
        watch: true,
      },
      port: 8080,
      host: '0.0.0.0', // 允许外部访问（用于酒馆）
      hot: true, // 启用热更新
      open: false, // 不自动打开浏览器
      allowedHosts: 'all', // 允许所有主机访问
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
      // 支持多个入口的路由
      historyApiFallback: {
        rewrites: [
          // 可以根据需要添加路由重写规则
        ],
      },
      // 开发环境下的压缩设置
      compress: true,
      // 客户端日志级别
      client: {
        logging: 'info',
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },
    
    // 修改 output.publicPath（开发环境）
    output: {
      // ... 现有配置 ...
      publicPath: argv.mode === 'development' ? '/' : '',
      // ... 其他配置 ...
    },
  });
}
```

### 步骤 3: 简化 BattleResourceService

修改 `src/同层游玩RPG_remake/services/BattleResourceService.ts`：

```typescript
// 简化路径解析逻辑
public resolveAssetPath(originalPath: string): string {
  // 如果是外部 URL，直接返回
  if (this.isValidUrl(originalPath)) {
    console.log('[BattleResourceService] Using external URL:', originalPath);
    return originalPath;
  }

  // 如果是本地资源路径，使用相对路径
  if (this.isLocalAsset(originalPath)) {
    // 移除开头的 ./ 或 assets/
    let cleanPath = originalPath.replace(/^\.\//, '').replace(/^assets\//, '');
    
    // 确保路径以 assets/ 开头
    if (!cleanPath.startsWith('assets/')) {
      cleanPath = `assets/${cleanPath}`;
    }

    // 在开发环境中，webpack-dev-server 会自动处理相对路径
    // 在生产环境中，使用相对路径（./assets/...）
    const resolvedPath = `./${cleanPath}`;

    console.log('[BattleResourceService] Using local asset:', resolvedPath);
    return resolvedPath;
  }

  // 如果既不是 URL 也不是本地资源，抛出错误
  console.error('[BattleResourceService] Invalid path provided:', originalPath);
  throw new Error(
    `Invalid resource path: ${originalPath}. Must be a valid URL or local asset path (starting with 'assets/').`,
  );
}

// 移除 getBasePath() 方法，不再需要复杂的路径解析
```

### 步骤 4: 更新 package.json scripts

```json
{
  "scripts": {
    "dev": "webpack serve --mode development",
    "build:dev": "webpack --mode development",
    "build": "webpack --mode production",
    "watch": "webpack --mode development --watch --progress",
    // ... 其他脚本 ...
  }
}
```

### 步骤 5: 处理多个入口

由于项目有多个入口，webpack-dev-server 会：

- 服务整个 `dist` 目录
- 通过路径访问不同入口：
  - `http://localhost:8080/同层游玩RPG_remake/index.html`
  - `http://localhost:8080/界面示例/index.html`
  - `http://localhost:8080/脚本示例/index.js`

### 步骤 6: 与现有 socket.io 集成

现有的 socket.io 热更新通知（端口 6621）可以与 webpack-dev-server 共存：

- **socket.io**: 用于通知酒馆页面更新（`iframe_updated` 事件）
- **webpack-dev-server HMR**: 用于浏览器自动刷新

两者可以同时工作，互不干扰。

## 配置说明

### devServer 配置详解

| 配置项              | 值                             | 说明                     |
| ------------------- | ------------------------------ | ------------------------ |
| `static.directory`  | `path.join(__dirname, 'dist')` | 静态资源目录             |
| `static.publicPath` | `'/'`                          | 静态资源的公共路径       |
| `port`              | `8080`                         | 服务器端口               |
| `host`              | `'0.0.0.0'`                    | 允许外部访问（用于酒馆） |
| `hot`               | `true`                         | 启用热更新               |
| `open`              | `false`                        | 不自动打开浏览器         |
| `allowedHosts`      | `'all'`                        | 允许所有主机访问         |
| `headers`           | CORS 头                        | 设置跨域访问头           |
| `compress`          | `true`                         | 启用 gzip 压缩           |

### output.publicPath 配置

- **开发环境**: `'/'` - 使用绝对路径，webpack-dev-server 会自动处理
- **生产环境**: `''` - 使用相对路径，适合静态部署

## 使用方式

### 开发环境

1. **启动开发服务器**:

   ```bash
   pnpm dev
   ```

2. **访问项目**:
   - 浏览器访问: `http://localhost:8080/同层游玩RPG_remake/index.html`
   - 其他入口: `http://localhost:8080/界面示例/index.html`

3. **在酒馆中加载**:

   ```javascript
   // 在酒馆中加载项目
   $('body').load('http://localhost:8080/同层游玩RPG_remake/index.html')
   ```

### 生产环境

生产环境仍然使用 `webpack` 命令构建：

```bash
# 开发构建
pnpm build:dev

# 生产构建
pnpm build
```

构建后的文件在 `dist` 目录，可以上传到服务器。

## 资源路径处理

### 本地资源路径

在配置中使用本地资源：

```typescript
config: {
  background: {
    // 使用本地资源路径（相对于 HTML 文件）
    image: 'assets/images/bg1.jpg',
  },
  participants: [
    {
      enemyPortrait: {
        // 使用本地资源路径
        image: 'assets/images/enemy1.png',
      },
    },
  ],
}
```

### 路径解析逻辑

1. **外部 URL**: 直接使用，不做任何处理

   ```typescript
   image: 'https://example.com/bg.jpg'
   ```

2. **本地资源**: 使用相对路径（`./assets/...`）

   ```typescript
   image: 'assets/images/bg.jpg'  // 会被解析为 ./assets/images/bg.jpg
   ```

3. **webpack-dev-server 处理**:
   - 开发环境：自动处理相对路径，映射到 `dist` 目录
   - 生产环境：相对路径相对于 HTML 文件位置

## 注意事项

### 1. 端口冲突

- webpack-dev-server 使用端口 **8080**
- socket.io 监听服务使用端口 **6621**
- 确保端口未被占用

### 2. 多入口访问

- 所有入口通过路径访问，不是自动路由
- 需要知道具体的入口路径才能访问
- 例如: `http://localhost:8080/同层游玩RPG_remake/index.html`

### 3. 资源路径

- 本地资源路径必须以 `assets/` 开头
- 使用相对路径（`./assets/...`）确保在所有环境下都能工作
- 外部 URL 仍然支持，系统会自动识别

### 4. 热更新

- webpack-dev-server 的 HMR 用于浏览器自动刷新
- socket.io 的 `iframe_updated` 事件用于通知酒馆页面更新
- 两者可以共存，互不干扰

### 5. 生产构建

- 生产环境仍然使用 `webpack` 命令构建
- `webpack-dev-server` 仅用于开发环境
- 构建后的文件在 `dist` 目录，可以上传到服务器

## 最佳实践

### 1. 资源组织

建议按类型组织资源：

```
src/同层游玩RPG_remake/
  ├── assets/
  │   ├── images/
  │   │   ├── backgrounds/    # 背景图片
  │   │   ├── enemies/        # 敌人立绘
  │   │   └── ui/             # UI 图片
  │   ├── audio/              # 音频文件
  │   └── videos/             # 视频文件
  └── ...
```

### 2. 路径使用

- **推荐**: 使用 `assets/images/bg.jpg` 格式
- **避免**: 使用绝对路径或复杂的相对路径
- **支持**: 外部 URL 仍然支持

### 3. 开发流程

1. 启动开发服务器: `pnpm dev`
2. 在浏览器中访问项目
3. 修改代码，自动热更新
4. 在酒馆中加载项目进行测试

### 4. 调试

- 使用浏览器开发者工具调试
- webpack-dev-server 提供详细的错误信息
- 支持 source map，方便调试

## 迁移检查清单

- [ ] 安装 `webpack-dev-server` 依赖
- [ ] 修改 `webpack.config.ts` 添加 `devServer` 配置
- [ ] 修改 `output.publicPath` 根据环境设置
- [ ] 简化 `BattleResourceService.resolveAssetPath()` 方法
- [ ] 更新 `package.json` 添加 `dev` 脚本
- [ ] 测试本地资源路径解析
- [ ] 测试外部 URL 路径解析
- [ ] 测试热更新功能
- [ ] 测试在酒馆中加载项目
- [ ] 更新文档说明新的使用方式

## 预期效果

### 解决的问题

1. ✅ **CORS 问题**: 通过 HTTP 服务器自动解决
2. ✅ **资源路径**: 统一使用相对路径，简化解析逻辑
3. ✅ **开发体验**: 自动热更新，提升开发效率
4. ✅ **多入口支持**: 统一服务所有入口

### 提升的体验

1. ✅ **自动刷新**: 修改代码后自动刷新浏览器
2. ✅ **热更新**: 支持 HMR，更快看到变化
3. ✅ **错误提示**: 更好的错误信息和调试体验
4. ✅ **资源管理**: 自动处理静态资源，无需手动配置

## 后续优化

### 可能的改进

1. **路由优化**: 配置 `historyApiFallback` 支持 SPA 路由
2. **代理配置**: 如果需要，可以配置代理处理 API 请求
3. **性能优化**: 配置缓存策略，提升加载速度
4. **开发工具**: 集成更多开发工具，提升调试体验

## 相关文档

- [本地资源使用指南](../src/同层游玩RPG_remake/docs/LOCAL_ASSETS_USAGE.md)
- [Webpack 官方文档](https://webpack.js.org/configuration/dev-server/)
- [项目架构文档](./architecture.md)

## 更新记录

- **2025-01-24**: 创建计划文档
