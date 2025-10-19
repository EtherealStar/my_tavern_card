import { injectable } from 'inversify';

/**
 * 战斗资源服务 - 纯验证和解析层
 *
 * 职责：
 * - 验证 URL 格式是否有效
 * - 解析和标准化资源路径
 * - 提供示例 URL 资源列表
 *
 * 不负责：
 * - 资源预加载（由 Phaser BattleScene.preload 处理）
 * - 资源缓存（由 Phaser 纹理管理器处理）
 * - 加载状态管理（由 Vue 组件层处理）
 */
@injectable()
export class BattleResourceService {
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
   * 解析资源路径（仅支持URL）
   * @param originalPath 原始路径（必须是完整的URL）
   * @returns 验证后的URL路径
   */
  public resolveAssetPath(originalPath: string): string {
    if (!this.isValidUrl(originalPath)) {
      console.error('[BattleResourceService] Invalid URL provided:', originalPath);
      throw new Error(`Invalid URL: ${originalPath}. Only internet URLs are supported.`);
    }

    console.log('[BattleResourceService] Using URL:', originalPath);
    return originalPath;
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
