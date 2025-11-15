import { injectable } from 'inversify';

/**
 * 战斗资源服务 - 纯验证和解析层
 *
 * 职责：
 * - 验证 URL 格式是否有效
 * - 自动定位 assets 文件夹位置
 * - 解析和标准化资源路径（支持本地资源和外部URL）
 * - 提供示例 URL 资源列表
 *
 * 不负责：
 * - 资源预加载（由 Phaser BattleScene.preload 处理）
 * - 资源缓存（由 Phaser 纹理管理器处理）
 * - 加载状态管理（由 Vue 组件层处理）
 */
@injectable()
export class BattleResourceService {
  private assetsBasePath: string | null = null;

  /**
   * 检测是否在开发模式（webpack-dev-server）
   * 只要检测到是 localhost 就认为是开发环境
   * 因为生产环境不会在 localhost 上运行
   * @returns 是否在 webpack-dev-server 中运行
   */
  private isWebpackDevServer(): boolean {
    if (typeof window === 'undefined' || !window.location) {
      return false;
    }

    const hostname = window.location.hostname;

    // 只要 hostname 是 localhost 或 127.0.0.1，就认为是开发环境
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    // 如果是 blob URL，检查 origin 中的 hostname
    if (window.location.protocol === 'blob:') {
      try {
        // blob URL 格式：blob:http://127.0.0.1:8000/...
        const originMatch = window.location.href.match(/blob:(https?:\/\/[^/]+)/);
        if (originMatch) {
          const originUrl = new URL(originMatch[1]);
          const originHostname = originUrl.hostname;
          if (originHostname === 'localhost' || originHostname === '127.0.0.1') {
            return true;
          }
        }
      } catch {
        // 忽略解析错误
      }
    }

    return false;
  }

  /**
   * 从 URL 路径中提取项目名称
   * 支持正常 URL 和 blob URL
   * 例如：/同层游玩RPG_remake/index.html -> 同层游玩RPG_remake
   * @returns 项目名称，如果无法提取则返回 null
   */
  private getProjectName(): string | null {
    if (typeof window === 'undefined' || !window.location) {
      return null;
    }

    // 方法1: 从 window.location.pathname 提取（正常 URL）
    if (window.location.protocol !== 'blob:') {
      const pathname = window.location.pathname;
      const parts = pathname.split('/').filter(p => p && p !== 'index.html');
      if (parts.length > 0) {
        return parts[0];
      }
    }

    // 方法2: 从 document.referrer 提取（blob URL 情况下）
    if (typeof document !== 'undefined' && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        const pathname = referrerUrl.pathname;
        const parts = pathname.split('/').filter(p => p && p !== 'index.html');
        if (parts.length > 0) {
          return parts[0];
        }
      } catch {
        // 忽略无效的 referrer URL
      }
    }

    // 方法3: 从 document.baseURI 提取（blob URL 情况下）
    if (typeof document !== 'undefined' && document.baseURI) {
      try {
        const baseUrl = new URL(document.baseURI);
        const pathname = baseUrl.pathname;
        const parts = pathname.split('/').filter(p => p && p !== 'index.html');
        if (parts.length > 0) {
          return parts[0];
        }
      } catch {
        // 忽略无效的 baseURI
      }
    }

    return null;
  }

  /**
   * 自动检测并获取 assets 文件夹的基础路径
   *
   * 开发模式（webpack-dev-server）：返回完整 URL http://localhost:8080/项目名/assets/
   * 生产模式（服务器部署）：返回相对路径 ./assets/
   *
   * @returns assets 文件夹的基础路径
   */
  private getAssetsBasePath(): string {
    // 如果已经缓存，直接返回
    if (this.assetsBasePath !== null) {
      return this.assetsBasePath;
    }

    try {
      if (typeof window === 'undefined' || !window.location) {
        // 非浏览器环境，使用生产模式路径
        this.assetsBasePath = './assets/';
        return this.assetsBasePath;
      }

      const isDevServer = this.isWebpackDevServer();
      let projectName = this.getProjectName();

      // 如果检测到是开发环境，即使项目名是 null，也应该使用开发模式
      if (isDevServer) {
        // 如果无法提取项目名，使用默认的项目名
        if (!projectName) {
          projectName = '同层游玩RPG_remake';
          console.warn('[BattleResourceService] 无法提取项目名，使用默认项目名:', projectName);
        }

        // 开发模式：使用完整的 URL（包括协议、主机名和端口）
        // 例如：http://localhost:8080/同层游玩RPG_remake/assets/
        // 这样可以确保在 iframe 中也能正确访问到 8080 端口的资源

        // 获取开发服务器的 origin（默认 8080 端口）
        let devServerOrigin: string;
        if (window.location.protocol === 'blob:') {
          // blob URL 情况下，使用默认的 8080 端口
          devServerOrigin = 'http://localhost:8080';
        } else {
          // 正常 URL，检查端口是否为 8080
          const port = window.location.port;
          if (port === '8080') {
            devServerOrigin = window.location.origin;
          } else {
            // 如果不是 8080，使用默认的 8080
            devServerOrigin = `http://${window.location.hostname}:8080`;
          }
        }

        this.assetsBasePath = `${devServerOrigin}/${projectName}/assets/`;
        console.log('[BattleResourceService] 开发模式 - 使用完整 URL:', this.assetsBasePath);
      } else {
        // 生产模式：使用相对路径
        // ./assets/
        // 相对路径会基于 iframe 的 document URL 正确解析
        this.assetsBasePath = './assets/';
        console.log('[BattleResourceService] 生产模式 - 使用相对路径:', this.assetsBasePath);
      }

      console.log('[BattleResourceService] 环境检测:', {
        基础路径: this.assetsBasePath,
        是否开发服务器: isDevServer,
        项目名称: projectName,
        当前URL: window.location.href,
        Origin: window.location.origin,
        Protocol: window.location.protocol,
        Referrer: typeof document !== 'undefined' ? document.referrer : 'N/A',
        BaseURI: typeof document !== 'undefined' ? document.baseURI : 'N/A',
      });

      return this.assetsBasePath;
    } catch (error) {
      console.warn('[BattleResourceService] 检测 assets 路径失败，使用默认路径:', error);
      this.assetsBasePath = './assets/';
      return this.assetsBasePath;
    }
  }

  /**
   * 验证URL是否有效
   * @param url 要验证的URL
   * @returns 是否为有效的URL
   */
  public isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 判断是否为本地资源路径
   * @param path 资源路径
   * @returns 是否为本地资源路径
   */
  public isLocalAsset(path: string): boolean {
    // 如果是完整的 URL，则不是本地资源
    if (this.isValidUrl(path)) {
      return false;
    }
    // 相对路径或以 assets/ 开头的路径视为本地资源
    // 或者不包含 :// 的路径（可能是简化的路径，如 images/enemies/cat.png）
    return (
      path.startsWith('assets/') ||
      path.startsWith('./assets/') ||
      path.startsWith('../assets/') ||
      !path.includes('://')
    );
  }

  /**
   * 解析资源路径（支持本地资源和外部URL）
   *
   * 支持的路径格式：
   * 1. 外部 URL: https://example.com/image.png
   * 2. 完整路径: assets/images/enemies/cat_streamer.png
   * 3. 相对路径: ./assets/images/enemies/cat_streamer.png 或 ../../assets/images/enemies/cat_streamer.png
   * 4. 简化路径: images/enemies/cat_streamer.png（自动添加 assets/ 前缀）
   *
   * 开发模式：返回 http://localhost:8080/同层游玩RPG_remake/assets/images/...
   * 生产模式：返回 ./assets/images/...
   *
   * @param originalPath 原始路径（可以是本地资源路径或完整的URL）
   * @returns 解析后的资源路径
   */
  public resolveAssetPath(originalPath: string): string {
    // 如果是外部 URL，直接返回
    if (this.isValidUrl(originalPath)) {
      console.log('[BattleResourceService] 使用外部 URL:', originalPath);
      return originalPath;
    }

    // 如果是本地资源路径，自动定位 assets 文件夹并构建正确路径
    if (this.isLocalAsset(originalPath)) {
      let cleanPath = originalPath;

      // 步骤1: 移除开头的 ../ 或 ./
      cleanPath = cleanPath.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');

      // 步骤2: 移除开头的 assets/
      cleanPath = cleanPath.replace(/^assets\//, '');

      // 步骤3: 获取 assets 基础路径并构建完整路径
      const basePath = this.getAssetsBasePath();
      const finalPath = `${basePath}${cleanPath}`;

      console.log('[BattleResourceService] 解析资源路径:', {
        原始路径: originalPath,
        清理后: cleanPath,
        基础路径: basePath,
        最终路径: finalPath,
      });

      return finalPath;
    }

    // 如果既不是 URL 也不是本地资源，抛出错误
    console.error('[BattleResourceService] 无效的路径:', originalPath);
    throw new Error(`Invalid resource path: ${originalPath}. Must be a valid URL or local asset path.`);
  }

  /**
   * 获取示例URL资源列表
   * @returns 示例URL列表
   */
  public getExampleUrls(): Record<string, string> {
    return {
      // 背景图片示例URL
      forest_bg: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      dungeon_bg: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
      city_bg: 'https://i.redd.it/70aowhraoxf81.jpg',
      temple_bg: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',

      // 敌人立绘示例URL（使用占位图片服务）
      goblin: 'https://picsum.photos/512/512?random=1',
      orc: 'https://picsum.photos/512/512?random=2',
      dragon: 'https://picsum.photos/512/512?random=3',
      demon: 'https://picsum.photos/512/512?random=4',
      yokai: 'https://files.catbox.moe/w67gzr.png',
    };
  }

  /**
   * 验证 URL 列表是否全部有效
   * @param urls URL 列表
   * @returns 验证结果，包含有效和无效的 URL 列表
   */
  public validateUrls(urls: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const url of urls) {
      if (this.isValidUrl(url)) {
        valid.push(url);
      } else {
        invalid.push(url);
      }
    }

    return { valid, invalid };
  }

  /**
   * 从战斗配置中提取所有资源 URL
   * @param config 战斗配置
   * @returns 资源 URL 列表
   */
  public extractResourceUrls(config: any): {
    background?: string;
    enemies: string[];
    parallaxLayers: string[];
  } {
    const result = {
      background: config.background?.image,
      enemies: [] as string[],
      parallaxLayers: [] as string[],
    };

    // 提取敌人立绘 URL
    if (config.participants && Array.isArray(config.participants)) {
      for (const participant of config.participants) {
        if (participant.side === 'enemy' && participant.enemyPortrait?.image) {
          result.enemies.push(participant.enemyPortrait.image);
        }
      }
    }

    // 提取视差层 URL
    if (config.background?.parallax?.layers && Array.isArray(config.background.parallax.layers)) {
      for (const layer of config.background.parallax.layers) {
        if (layer.image) {
          result.parallaxLayers.push(layer.image);
        }
      }
    }

    return result;
  }
}
