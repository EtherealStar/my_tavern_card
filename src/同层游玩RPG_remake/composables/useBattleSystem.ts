import { inject, nextTick, onMounted, onUnmounted, readonly, ref } from 'vue';
import type { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import type { BattleAction, BattleConfig, BattleResult } from '../models/BattleSchemas';
import type { BattleService } from '../services/BattleService';
import { useBattleState } from './useBattleState';
import { useGameStateManager } from './useGameStateManager';
import { usePhaserBattle } from './usePhaserBattle';

/**
 * useBattleSystem - 战斗系统编排器
 *
 * 定位：
 * - 战斗流程的**唯一编排者**（Battle Orchestrator）
 * - 协调所有战斗相关的组合式函数和服务
 * - 作为 Vue 组件和服务层之间的桥梁
 *
 * 职责：
 * - 启动战斗流程（初始化 → 启动 Phaser → 通知 Vue）
 * - 处理玩家行动（Vue → Service → Engine → State → Phaser）
 * - 处理战斗结束（清理状态 → 退出战斗）
 * - 统一事件处理（避免事件监听分散）
 *
 * 数据流：
 * Input: Vue 组件调用方法（startBattle, processPlayerAction）
 * Output: 通过 useBattleState 更新状态，触发 Vue 响应式更新
 *
 * 协调关系：
 * ```
 * useBattleSystem (编排层)
 *   ├─→ useBattleState (状态层)
 *   ├─→ usePhaserBattle (Phaser层)
 *   ├─→ useGameStateManager (游戏状态层)
 *   └─→ BattleService (服务层)
 * ```
 *
 * 使用方式：
 * ```typescript
 * const battleSystem = useBattleSystem();
 *
 * // 启动战斗
 * await battleSystem.startBattle(battleConfig);
 *
 * // 处理玩家行动
 * await battleSystem.processPlayerAction({
 *   type: 'attack',
 *   actorId: 'player',
 *   targetId: 'enemy'
 * });
 * ```
 */

export function useBattleSystem() {
  const battleService = inject<BattleService>(TYPES.BattleService);
  const eventBus = inject<EventBus>(TYPES.EventBus);

  // 使用组合式函数
  const gameState = useGameStateManager();
  const battleState = useBattleState();
  const phaserBattle = usePhaserBattle();

  const result = ref<BattleResult | null>(null);

  // ==================== 统一事件处理 ====================

  /**
   * 处理战斗开始事件
   * 从 BattleService 发送的初始化完成事件
   */
  const handleBattleStart = (config: BattleConfig) => {
    // 验证配置
    if (!config || !Array.isArray(config.participants)) {
      console.error('[useBattleSystem] Invalid config in handleBattleStart:', config);
      throw new Error('Invalid battle config: participants must be an array');
    }

    try {
      battleState.initializeBattle(config);
      phaserBattle.startBattleScene();
    } catch (error) {
      console.error('[useBattleSystem] Failed to handle battle start event:', error);
      throw error;
    }
  };

  /**
   * 处理战斗结束事件
   * 从 BattleService 发送的 battle:result 事件触发
   */
  const handleBattleEnd = (battleResult: BattleResult) => {
    // 不直接退出战斗，让 BattleRoot.vue 显示结果对话框
    // gameState.exitBattle(true); // 移除直接退出
    battleState.handleBattleEnd(battleResult);
    result.value = battleResult;
  };

  // ==================== 生命周期管理 ====================

  onMounted(() => {
    // 统一的事件监听
    eventBus?.on('battle:initialized', handleBattleStart as any);
    eventBus?.on('battle:result', handleBattleEnd as any);
  });

  onUnmounted(() => {
    // 清理事件监听
    eventBus?.off('battle:initialized', handleBattleStart as any);
    eventBus?.off('battle:result', handleBattleEnd as any);
  });

  // ==================== 业务逻辑方法 ====================

  /**
   * 启动战斗
   *
   * 流程：
   * 1. 调用 BattleService 初始化（注册技能、验证配置）
   * 2. 初始化战斗状态（通过 useBattleState）
   * 3. 等待 Vue nextTick 确保 Phaser 视图已挂载
   * 4. 启动 Phaser BattleScene
   *
   * @param config 战斗配置
   */
  const startBattle = async (config: BattleConfig) => {
    if (!battleService) {
      console.error('[useBattleSystem] BattleService not available');
      throw new Error('BattleService not available');
    }

    if (battleState.isInitialized.value) {
      return;
    }

    try {
      // Step 1: 初始化 BattleService（注册技能、验证配置、映射属性）
      // 这会发送 battle:initialized 事件，触发 handleBattleStart 来初始化战斗状态
      const processedConfig = await battleService.initializeBattle(config);

      // Step 2: 等待 Vue 更新，确保 Phaser 容器已挂载
      await nextTick();

      // Step 3: 启动 Phaser 战斗场景
      if (battleState.battleState.value) {
        // 使用类型断言解决readonly类型问题
        await battleService.startBattle(battleState.battleState.value as any, processedConfig);
      } else {
        console.error('[useBattleSystem] Battle state is null after initialization');
        throw new Error('Battle state initialization failed');
      }
    } catch (error) {
      console.error('[useBattleSystem] Failed to start battle:', error);
      throw error;
    }
  };

  /**
   * 处理玩家行动
   *
   * 流程：
   * 1. 调用 BattleService.processPlayerAction
   * 2. BattleService 内部调用 BattleEngine 计算
   * 3. BattleEngine 返回新状态和事件
   * 4. BattleService 发送事件到 EventBus
   * 5. useBattleState 监听事件并更新状态
   * 6. Vue 组件响应式更新 UI
   * 7. Phaser 监听事件并更新显示
   *
   * @param action 玩家行动
   */
  const processPlayerAction = async (action: BattleAction) => {
    if (!battleService || !battleState.battleState.value) {
      console.error('[useBattleSystem] BattleService or battle state not available');
      throw new Error('BattleService or battle state not available');
    }

    try {
      // 调用 BattleService 处理行动并获取新状态
      // BattleService 会：
      // 1. 调用 BattleEngine 计算
      // 2. 发送事件（battle:damage, battle:miss 等）
      // 3. 处理 AI 回合
      // 4. 返回新状态
      const newState = await battleService.processPlayerAction(action, battleState.battleState.value as any);

      // 更新 battleState 中的状态，确保状态同步
      if (newState) {
        battleState.updateBattleState(newState);
      } else {
        console.error('[useBattleSystem] BattleService.processPlayerAction returned null/undefined newState!');
      }

      // 检查战斗是否结束
      if (newState?.ended) {
        // 不直接退出战斗，让 BattleService 发送 battle:result 事件
        // gameState.exitBattle(true); // 移除直接退出
        battleState.endBattle(newState.winner || 'player');

        result.value = {
          winner: newState.winner || 'player',
          rounds: battleState.battleRound.value || 1,
          summary: newState.winner === 'player' ? '胜利！' : '失败…',
        };
      }
    } catch (error) {
      console.error('[useBattleSystem] Failed to process player action:', error);
      throw error;
    }
  };

  /**
   * 获取当前战斗状态
   * @returns 当前战斗状态，如果没有则返回 null
   */
  const getCurrentState = () => {
    return battleState.battleState.value || null;
  };

  /**
   * 重置战斗系统
   * 清理战斗结果和相关状态
   */
  const resetBattleSystem = () => {
    result.value = null;
  };

  return {
    // 状态（从Composables获取）
    state: battleState.battleState,
    battleState: battleState, // 返回完整的 battleState 对象
    isInBattle: gameState.isInBattle,
    result: readonly(result),

    // 方法
    startBattle,
    processPlayerAction,
    getCurrentState,
    resetBattleSystem,
  };
}
