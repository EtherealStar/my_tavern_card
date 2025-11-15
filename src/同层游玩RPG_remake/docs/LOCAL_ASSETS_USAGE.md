# 本地资源使用指南

## 概述

项目现在支持使用本地图片资源，避免 CORS 问题。你可以在本地开发时使用本地图片，上传到服务器后也能正常访问服务器中的图片。

## 资源目录结构

在项目的 `src` 目录下，每个子项目都可以有自己的 `assets` 目录：

```
src/
  └── 同层游玩RPG_remake/
      ├── assets/          # 本地资源目录
      │   ├── images/      # 图片资源
      │   │   ├── bg1.jpg
      │   │   └── enemy1.png
      │   └── ...
      ├── index.ts
      └── ...
```

构建后，资源会被复制到 `dist` 目录：

```
dist/
  └── 同层游玩RPG_remake/
      ├── assets/          # 构建后的资源目录
      │   ├── images/
      │   │   ├── bg1.jpg
      │   │   └── enemy1.png
      │   └── ...
      ├── index.html
      └── index.js
```

## 使用方法

### 1. 在战斗配置中使用本地资源

在战斗配置文件中，你可以使用本地资源路径：

```typescript
import type { BattleConfigItem } from '../../services/BattleConfigService';

export const myBattles: BattleConfigItem[] = [
  {
    id: 'local_battle',
    name: '本地资源战斗',
    description: '使用本地图片资源的战斗',
    difficulty: 'normal',
    config: {
      background: {
        // 使用本地资源路径（相对于 assets 目录）
        image: 'assets/images/bg1.jpg',
        // 或者使用外部 URL（仍然支持）
        // image: 'https://example.com/bg.jpg',
      },
      participants: [
        {
          id: 'enemy1',
          name: '敌人',
          side: 'enemy',
          enemyPortrait: {
            // 使用本地资源路径
            image: 'assets/images/enemy1.png',
          },
        },
      ],
    },
  },
];
```

### 2. 资源路径格式

支持以下格式的本地资源路径：

- `assets/images/bg.jpg` - 推荐格式
- `./assets/images/bg.jpg` - 相对路径
- `../assets/images/bg.jpg` - 相对路径（向上查找）

**注意**：路径必须以 `assets/` 开头，或者以 `./assets/` 或 `../assets/` 开头。

### 3. 外部 URL 仍然支持

如果你需要使用外部 URL，仍然可以直接使用：

```typescript
config: {
  background: {
    image: 'https://example.com/bg.jpg', // 外部 URL
  },
}
```

系统会自动识别是本地资源还是外部 URL。

## 工作原理

### 1. Webpack 构建

在构建时，webpack 会自动：
- 检测每个项目的 `assets` 目录
- 将资源复制到 `dist` 目录的对应位置
- 保持目录结构不变

### 2. 资源路径解析

`BattleResourceService` 会自动处理资源路径：

- **外部 URL**：直接使用，不做任何处理
- **本地资源**：根据当前页面的路径，自动解析为正确的相对路径

### 3. 路径解析逻辑

```typescript
// 示例：如果当前页面是 dist/同层游玩RPG_remake/index.html
// 资源路径 assets/images/bg.jpg 会被解析为：
// ./assets/images/bg.jpg 或 /同层游玩RPG_remake/assets/images/bg.jpg
```

## 最佳实践

### 1. 资源组织

建议按类型组织资源：

```
assets/
  ├── images/
  │   ├── backgrounds/    # 背景图片
  │   ├── enemies/        # 敌人立绘
  │   └── ui/             # UI 图片
  ├── audio/              # 音频文件
  └── videos/             # 视频文件
```

### 2. 命名规范

- 使用小写字母和连字符：`enemy-goblin.png`
- 避免空格和特殊字符
- 使用有意义的文件名

### 3. 资源大小

- 图片建议使用 WebP 格式以减小文件大小
- 压缩图片以减少加载时间
- 考虑使用外部 CDN 存储大型资源

## 常见问题

### Q: 为什么我的图片加载失败？

A: 请检查：
1. 资源文件是否存在于 `src/项目名/assets/` 目录中
2. 路径是否正确（必须以 `assets/` 开头）
3. 构建后资源是否被复制到 `dist` 目录

### Q: 可以使用相对路径吗？

A: 可以，但建议使用 `assets/` 开头的路径，这样更清晰。

### Q: 本地资源和外部 URL 可以混用吗？

A: 可以，系统会自动识别并处理。

### Q: 上传到服务器后需要做什么？

A: 不需要额外操作。只要确保 `dist` 目录中的 `assets` 文件夹一起上传到服务器，资源路径会自动解析为正确的相对路径。

## 示例

完整示例请参考 `src/同层游玩RPG_remake/configs/battle/basicBattles.ts` 和 `src/同层游玩RPG_remake/configs/enemy/enemyConfig.ts`。

