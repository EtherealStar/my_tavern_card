import { inject, onUnmounted, ref } from 'vue';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { PhaserManager } from '../services/PhaserManager';

export function usePhaserBattle() {
  const phaserManager = inject<PhaserManager>(TYPES.PhaserManager);
  const eventBus = inject<EventBus>(TYPES.EventBus);

  const game = ref<Phaser.Game | null>(null);
  const isReady = ref(false);

  const initialize = async (container: HTMLElement) => {
    if (!phaserManager) {
      console.warn('[usePhaserBattle] PhaserManager not available');
      return;
    }

    try {
      game.value = await phaserManager.initializeGame(container);
      isReady.value = true;
      console.log('[usePhaserBattle] Phaser game initialized successfully');

      // 监听 Phaser 游戏就绪事件
      eventBus?.on('phaser:game-ready', (phaserGame: Phaser.Game) => {
        console.log('[usePhaserBattle] Phaser game ready event received:', phaserGame);
        game.value = phaserGame;
        isReady.value = true;
      });

      // 事件监听现在由 useBattleSystem 统一处理
    } catch (error) {
      console.error('[usePhaserBattle] Failed to initialize Phaser game:', error);
      isReady.value = false;
    }
  };

  const startBattleScene = async () => {
    if (!phaserManager || !isReady.value) {
      console.warn('[usePhaserBattle] Cannot start battle scene - not ready');
      return;
    }

    try {
      // 检查是否有战斗配置在 registry 中
      const phaserGame = phaserManager.getGame();
      if (phaserGame) {
        const battleConfig = phaserGame.registry.get('battleConfig');
        if (battleConfig && battleConfig.participants && Array.isArray(battleConfig.participants)) {
          console.log('[usePhaserBattle] Found battle config in registry, starting scene');
          phaserManager.startScene('BattleScene');
        } else {
          console.log('[usePhaserBattle] No valid battle config found, waiting for event');
          // 不直接启动场景，等待事件系统传递配置
        }
      }
    } catch (error) {
      console.error('[usePhaserBattle] Failed to start battle scene:', error);
    }
  };

  const destroy = async () => {
    if (!phaserManager) return;
    await phaserManager.destroyGame();
    isReady.value = false;
    game.value = null;
  };

  // 状态监听现在由 useBattleSystem 统一处理

  onUnmounted(() => {
    void destroy();
  });

  return {
    game,
    isReady,
    initialize,
    startBattleScene,
    destroy,
  };
}
