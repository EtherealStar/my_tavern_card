import { inject, injectable } from 'inversify';
import { basicBattleConfigs } from '../configs/battle/basicBattles';
import { TYPES } from '../core/ServiceIdentifiers';
import type { BattleConfigService } from './BattleConfigService';

/**
 * 战斗配置初始化器
 * 负责在服务启动时注册所有战斗配置
 */
@injectable()
export class BattleConfigInitializer {
  private battleConfigService: BattleConfigService;

  constructor(@inject(TYPES.BattleConfigService) battleConfigService: BattleConfigService) {
    this.battleConfigService = battleConfigService;
  }

  /**
   * 初始化所有战斗配置
   */
  public async initialize(): Promise<void> {
    try {
      console.log('[BattleConfigInitializer] 开始初始化战斗配置...');

      // 注册所有预定义的战斗配置
      this.battleConfigService.registerBattleConfigs(basicBattleConfigs);

      // 获取统计信息
      const stats = this.battleConfigService.getConfigStats();
      console.log('[BattleConfigInitializer] 战斗配置初始化完成:', stats);

      // 验证所有配置
      this.validateAllConfigs();
    } catch (error) {
      console.error('[BattleConfigInitializer] 战斗配置初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证所有战斗配置
   */
  private validateAllConfigs(): void {
    const configs = this.battleConfigService.getAvailableConfigs();
    let validCount = 0;
    let invalidCount = 0;

    for (const configItem of configs) {
      if (this.battleConfigService.validateBattleConfig(configItem.config)) {
        validCount++;
      } else {
        invalidCount++;
        console.warn(`[BattleConfigInitializer] 配置验证失败: ${configItem.id} - ${configItem.name}`);
      }
    }

    console.log(`[BattleConfigInitializer] 配置验证完成: ${validCount} 个有效, ${invalidCount} 个无效`);

    if (invalidCount > 0) {
      console.warn(`[BattleConfigInitializer] 发现 ${invalidCount} 个无效配置，请检查配置定义`);
    }
  }

  /**
   * 获取初始化状态
   */
  public getInitializationStatus(): {
    isInitialized: boolean;
    configCount: number;
    stats: any;
  } {
    const stats = this.battleConfigService.getConfigStats();
    return {
      isInitialized: stats.totalConfigs > 0,
      configCount: stats.totalConfigs,
      stats,
    };
  }
}
