import { computed, inject, ref } from 'vue';
import { TYPES } from '../core/ServiceIdentifiers';
import type { BattleConfig } from '../models/BattleSchemas';
import { GamePhase } from '../models/GameState';
import type { BattleConfigItem, BattleConfigService } from '../services/BattleConfigService';
import type { UIService } from '../services/UIService';
import { useGameStateManager } from './useGameStateManager';

/**
 * 战斗配置管理组合式函数
 * 提供Vue组件使用的战斗配置接口
 */
export function useBattleConfig() {
  const battleConfigService = inject<BattleConfigService>(TYPES.BattleConfigService);
  const ui = inject<UIService>(TYPES.UIService);

  // 使用Composable替代Pinia store
  const gameState = useGameStateManager();

  // 添加调试信息
  console.log('[useBattleConfig] Service injection status:', {
    battleConfigService: !!battleConfigService,
    ui: !!ui,
  });

  // UI 反馈方法包装
  const showSuccess = (title: string, message?: string) => {
    try {
      ui?.success?.(title, message);
    } catch (error) {
      console.warn('[useBattleConfig] UI success failed:', error);
    }
  };

  const showError = (title: string, message?: string) => {
    try {
      ui?.error?.(title, message);
    } catch (error) {
      console.warn('[useBattleConfig] UI error failed:', error);
    }
  };

  const showWarning = (title: string, message?: string) => {
    try {
      ui?.warning?.(title, message);
    } catch (error) {
      console.warn('[useBattleConfig] UI warning failed:', error);
    }
  };

  // 响应式状态
  const isLoading = ref(false);
  const currentConfig = ref<BattleConfigItem | null>(null);

  // 计算属性
  const availableConfigs = computed(() => {
    if (!battleConfigService) return [];
    return battleConfigService.getAvailableConfigs();
  });

  const configsByDifficulty = computed(() => {
    if (!battleConfigService) return {};
    const configs = availableConfigs.value;
    const result: Record<string, BattleConfigItem[]> = {};

    configs.forEach(config => {
      if (!result[config.difficulty]) {
        result[config.difficulty] = [];
      }
      result[config.difficulty].push(config);
    });

    return result;
  });

  const easyConfigs = computed(() => configsByDifficulty.value.easy || []);
  const normalConfigs = computed(() => configsByDifficulty.value.normal || []);
  const hardConfigs = computed(() => configsByDifficulty.value.hard || []);
  const bossConfigs = computed(() => configsByDifficulty.value.boss || []);

  /**
   * 启动指定ID的战斗
   */
  const startBattle = async (
    configId: string,
    overrides?: Partial<BattleConfig>,
    options?: { returnToPrevious?: boolean; silent?: boolean },
  ): Promise<boolean> => {
    console.log('[useBattleConfig] startBattle called with:', { configId, overrides, options });

    if (!battleConfigService) {
      const error = '战斗配置服务不可用';
      console.error('[useBattleConfig]', error);
      if (!options?.silent) showError('启动战斗失败', error);
      return false;
    }

    try {
      isLoading.value = true;

      // 获取战斗配置
      const configItem = battleConfigService.getBattleConfig(configId);
      if (!configItem) {
        const error = `战斗配置不存在: ${configId}`;
        console.error('[useBattleConfig]', error);
        if (!options?.silent) showError('启动战斗失败', error);
        return false;
      }

      // 获取玩家真实名字
      const playerName = (window as any).substitudeMacros?.('{{user}}') || '玩家';
      console.log('[useBattleConfig] 获取到玩家名字:', playerName);

      // 创建最终配置
      let finalConfig: BattleConfig;
      if (overrides) {
        const createdConfig = battleConfigService.createBattleConfigFromExisting(configId, overrides);
        if (!createdConfig) {
          const error = '创建战斗配置失败';
          console.error('[useBattleConfig]', error);
          if (!options?.silent) showError('启动战斗失败', error);
          return false;
        }
        finalConfig = createdConfig;
      } else {
        finalConfig = configItem.config;
      }

      // 更新玩家名字
      if (finalConfig.participants) {
        finalConfig.participants = finalConfig.participants.map(participant => {
          if (participant.side === 'player') {
            return {
              ...participant,
              name: playerName,
            };
          }
          return participant;
        });
        console.log('[useBattleConfig] 已更新玩家名字为:', playerName);
      }

      // 验证配置
      if (!battleConfigService.validateBattleConfig(finalConfig)) {
        const error = '战斗配置验证失败';
        console.error('[useBattleConfig]', error);
        if (!options?.silent) showError('启动战斗失败', error);
        return false;
      }

      // 设置当前配置
      currentConfig.value = configItem;

      // 使用Composable启动战斗
      console.log('[useBattleConfig] Calling gameState.enterBattle with:', {
        finalConfig,
        previousPhase: options?.returnToPrevious ? undefined : GamePhase.PLAYING,
      });

      gameState.enterBattle(finalConfig, options?.returnToPrevious ? undefined : GamePhase.PLAYING);

      const success = true; // Composable操作是同步的
      console.log('[useBattleConfig] enterBattle result:', success);

      if (success) {
        if (!options?.silent) {
          showSuccess('进入战斗！', `正在与 ${configItem.name} 战斗`);
        }
        console.log('[useBattleConfig] 战斗启动成功:', configId);
      } else {
        if (!options?.silent) {
          showError('进入战斗失败');
        }
        console.error('[useBattleConfig] 战斗启动失败:', configId);
      }

      return success;
    } catch (error) {
      console.error('[useBattleConfig] 启动战斗异常:', error);
      if (!options?.silent) {
        showError('启动战斗失败', error instanceof Error ? error.message : String(error));
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 启动随机战斗
   */
  const startRandomBattle = async (
    difficulty?: BattleConfigItem['difficulty'],
    options?: { returnToPrevious?: boolean; silent?: boolean },
  ): Promise<boolean> => {
    if (!battleConfigService) {
      const error = '战斗配置服务不可用';
      console.error('[useBattleConfig]', error);
      if (!options?.silent) showError('启动战斗失败', error);
      return false;
    }

    const randomConfig = battleConfigService.getRandomBattleConfig(difficulty);
    if (!randomConfig) {
      const error = `没有可用的${difficulty || '随机'}战斗配置`;
      console.error('[useBattleConfig]', error);
      if (!options?.silent) showWarning('启动战斗失败', error);
      return false;
    }

    return await startBattle(randomConfig.id, undefined, options);
  };

  /**
   * 基于模板创建并启动战斗
   */
  const startBattleFromTemplate = async (
    templateId: string,
    overrides?: Partial<BattleConfig>,
    options?: { returnToPrevious?: boolean; silent?: boolean },
  ): Promise<boolean> => {
    if (!battleConfigService) {
      const error = '战斗配置服务不可用';
      console.error('[useBattleConfig]', error);
      if (!options?.silent) showError('启动战斗失败', error);
      return false;
    }

    try {
      isLoading.value = true;

      // 基于模板创建配置
      const config = battleConfigService.createBattleConfig(templateId, overrides);
      if (!config) {
        const error = `基于模板创建战斗配置失败: ${templateId}`;
        console.error('[useBattleConfig]', error);
        if (!options?.silent) showError('启动战斗失败', error);
        return false;
      }

      // 验证配置
      if (!battleConfigService.validateBattleConfig(config)) {
        const error = '战斗配置验证失败';
        console.error('[useBattleConfig]', error);
        if (!options?.silent) showError('启动战斗失败', error);
        return false;
      }

      // 使用Composable启动战斗
      gameState.enterBattle(config, options?.returnToPrevious ? undefined : GamePhase.PLAYING);

      const success = true; // Composable操作是同步的

      if (success) {
        if (!options?.silent) {
          showSuccess('进入战斗！', '基于模板创建的战斗');
        }
        console.log('[useBattleConfig] 基于模板的战斗启动成功:', templateId);
      } else {
        if (!options?.silent) {
          showError('进入战斗失败');
        }
        console.error('[useBattleConfig] 基于模板的战斗启动失败:', templateId);
      }

      return success;
    } catch (error) {
      console.error('[useBattleConfig] 基于模板启动战斗异常:', error);
      if (!options?.silent) {
        showError('启动战斗失败', error instanceof Error ? error.message : String(error));
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 获取战斗配置信息
   */
  const getBattleConfigInfo = (configId: string): BattleConfigItem | null => {
    if (!battleConfigService) return null;
    return battleConfigService.getBattleConfig(configId);
  };

  /**
   * 根据标签获取战斗配置
   */
  const getConfigsByTag = (tag: string): BattleConfigItem[] => {
    if (!battleConfigService) return [];
    return battleConfigService.getConfigsByTag(tag);
  };

  /**
   * 获取配置统计信息
   */
  const getConfigStats = () => {
    if (!battleConfigService) return null;
    return battleConfigService.getConfigStats();
  };

  /**
   * 检查配置是否存在
   */
  const hasConfig = (configId: string): boolean => {
    if (!battleConfigService) return false;
    return battleConfigService.getBattleConfig(configId) !== null;
  };

  /**
   * 获取当前战斗配置
   */
  const getCurrentConfig = (): BattleConfigItem | null => {
    return currentConfig.value;
  };

  /**
   * 清除当前配置
   */
  const clearCurrentConfig = (): void => {
    currentConfig.value = null;
  };

  return {
    // 响应式状态
    isLoading: computed(() => isLoading.value),
    currentConfig: computed(() => currentConfig.value),

    // 计算属性
    availableConfigs,
    configsByDifficulty,
    easyConfigs,
    normalConfigs,
    hardConfigs,
    bossConfigs,

    // 方法
    startBattle,
    startRandomBattle,
    startBattleFromTemplate,
    getBattleConfigInfo,
    getConfigsByTag,
    getConfigStats,
    hasConfig,
    getCurrentConfig,
    clearCurrentConfig,

    // Composable状态
    isInBattle: gameState.isInBattle,
    hasBattleConfig: gameState.hasBattleConfig,
    battleConfig: gameState.currentState.battleConfig,
    battleState: gameState.currentState.battleState,
  };
}
