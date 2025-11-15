import $ from 'jquery';
import { createApp } from 'vue';
import App from './App.vue';
import { serviceContainer } from './core/Container';
import { GameCoreFactory } from './core/GameCoreFactory';
import { TYPES } from './core/ServiceIdentifiers';
import './index.css';

let remakeCore: any = null;

function ensurePersistentRoot(jq?: any): HTMLElement {
  const ROOT_ID = 'rpg-root';
  const APP_ID = 'app';
  const $$: any = jq || (window as any).$ || (window as any).jQuery || ($ as any);
  let $root = $$(`#${ROOT_ID}`);
  if ($root.length === 0) {
    $$('body').append(
      `<main id="${ROOT_ID}" class="tw w-full max-w-[850px] mx-auto"><div id="${APP_ID}" class="rpg-app"></div></main>`,
    );
    $root = $$(`#${ROOT_ID}`);
  }
  let $app = $root.find(`#${APP_ID}`);
  if ($app.length === 0) {
    $root.append(`<div id="${APP_ID}" class="rpg-app"></div>`);
    $app = $root.find(`#${APP_ID}`);
  }
  return $app[0] as HTMLElement;
}

async function ensureJQueryLoaded(): Promise<void> {
  const w: any = window as any;
  if (w.$ && typeof w.$ === 'function') return;
  await new Promise<void>(resolve => {
    try {
      const s = document.createElement('script');
      s.src = 'https://fastly.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js';
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    } catch {
      resolve();
    }
  });
}

(async () => {
  await ensureJQueryLoaded();
  const $$: any = (window as any).$ || (window as any).jQuery || ($ as any);

  // 在 jQuery 可用后再执行初始化逻辑
  ensurePersistentRoot($$);
  if ((window as any).__RPG_REMAKE_INIT_DONE__) {
    return;
  }
  (window as any).__RPG_REMAKE_INIT_DONE__ = true;

  // 加载并应用阅读设置
  function loadReadingSettings() {
    try {
      const saved = localStorage.getItem('rpg_reading_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        const root = document.getElementById('rpg-root');
        if (root) {
          root.style.setProperty('--reading-font-family', settings.fontFamily);
          root.style.setProperty('--reading-font-size', `${settings.fontSize}px`);
          root.style.setProperty('--reading-line-height', String(settings.lineHeight));
          root.style.setProperty('--reading-max-width', `${settings.maxWidth}px`);
          root.style.setProperty('--reading-paragraph-spacing', `${settings.paragraphSpacing}px`);
        }
      }
    } catch (error) {
      console.warn('[RPG] 加载阅读设置失败:', error);
    }
  }
  loadReadingSettings();

  try {
    // 等待服务初始化完成
    await GameCoreFactory.initializeWithStages();

    // 获取GameCore实例
    remakeCore = GameCoreFactory.getInstance();
    (window as any).RPGRemakeCore = remakeCore;

    // 挂载GameCore（不清空DOM）
    remakeCore?.mount('#app');

    // 在 #app 内部追加一个 Vue 根容器，逐步迁移内容到 Vue
    const $root = $$('#app');
    if ($root.length) {
      const vueId = 'vue-root';
      if ($root.find(`#${vueId}`).length === 0) {
        $root.append(`<div id="${vueId}"></div>`);
      }
      const mountEl = document.getElementById(vueId);
      if (mountEl) {
        const app = createApp(App);
        // 暴露以便卸载/重挂
        (window as any).__RPG_VUE_APP__ = app;
        // 提供服务与事件总线给 Vue 组件使用
        // 使用Symbol作为key确保类型安全和唯一性，与inject保持一致
        try {
          app.provide(TYPES.EventBus, serviceContainer.get(TYPES.EventBus));
        } catch (error) {
          console.error('[index.ts] EventBus 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.SameLayerService, serviceContainer.get(TYPES.SameLayerService));
        } catch (error) {
          console.error('[index.ts] SameLayerService 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.StatDataBindingService, serviceContainer.get(TYPES.StatDataBindingService));
        } catch (error) {
          console.error('[index.ts] StatDataBindingService 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.SaveLoadManagerService, serviceContainer.get(TYPES.SaveLoadManagerService));
        } catch (error) {
          console.error('[index.ts] SaveLoadManagerService 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.ResponsiveService, serviceContainer.get(TYPES.ResponsiveService));
        } catch (error) {
          console.error('[index.ts] ResponsiveService 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.CommandQueueService, serviceContainer.get(TYPES.CommandQueueService));
        } catch (error) {
          console.error('[index.ts] CommandQueueService 服务获取失败:', error);
        }

        // 提供战斗与Phaser相关服务
        try {
          app.provide(TYPES.PhaserManager, serviceContainer.get(TYPES.PhaserManager));
        } catch (error) {
          console.error('[index.ts] PhaserManager 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.BattleService, serviceContainer.get(TYPES.BattleService));
        } catch (error) {
          console.error('[index.ts] BattleService 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.BattleEngine, serviceContainer.get(TYPES.BattleEngine));
        } catch (error) {
          console.error('[index.ts] BattleEngine 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.BattleResultHandler, serviceContainer.get(TYPES.BattleResultHandler));
        } catch (error) {
          console.error('[index.ts] BattleResultHandler 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.BattleConfigService, serviceContainer.get(TYPES.BattleConfigService));
        } catch (error) {
          console.error('[index.ts] BattleConfigService 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.BattleConfigInitializer, serviceContainer.get(TYPES.BattleConfigInitializer));
        } catch (error) {
          console.error('[index.ts] BattleConfigInitializer 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.DynamicEnemyService, serviceContainer.get(TYPES.DynamicEnemyService));
        } catch (error) {
          console.error('[index.ts] DynamicEnemyService 服务获取失败:', error);
        }

        // 提供游戏状态服务给状态管理器使用
        try {
          app.provide(TYPES.GameStateService, serviceContainer.get(TYPES.GameStateService));
        } catch (error) {
          console.error('[index.ts] GameStateService 服务获取失败:', error);
        }

        try {
          app.provide(TYPES.GlobalStateManager, serviceContainer.get(TYPES.GlobalStateManager));
        } catch (error) {
          console.error('[index.ts] GlobalStateManager 服务获取失败:', error);
        }
        (window as any).__RPG_VUE_REMOUNT__ = (el: Element) => {
          try {
            (window as any).__RPG_VUE_APP__?.unmount?.();
          } catch {
            /* no-op */ void 0;
          }
          const next = createApp(App);
          (window as any).__RPG_VUE_APP__ = next;
          try {
            next.provide(TYPES.EventBus, serviceContainer.get(TYPES.EventBus));
          } catch (error) {
            console.error('[index.ts] EventBus 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.SameLayerService, serviceContainer.get(TYPES.SameLayerService));
          } catch (error) {
            console.error('[index.ts] SameLayerService 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.StatDataBindingService, serviceContainer.get(TYPES.StatDataBindingService));
          } catch (error) {
            console.error('[index.ts] StatDataBindingService 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.SaveLoadManagerService, serviceContainer.get(TYPES.SaveLoadManagerService));
          } catch (error) {
            console.error('[index.ts] SaveLoadManagerService 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.ResponsiveService, serviceContainer.get(TYPES.ResponsiveService));
          } catch (error) {
            console.error('[index.ts] ResponsiveService 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.CommandQueueService, serviceContainer.get(TYPES.CommandQueueService));
          } catch (error) {
            console.error('[index.ts] CommandQueueService 服务获取失败 (remount):', error);
          }

          // 提供战斗与Phaser相关服务
          try {
            next.provide(TYPES.PhaserManager, serviceContainer.get(TYPES.PhaserManager));
          } catch (error) {
            console.error('[index.ts] PhaserManager 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.BattleService, serviceContainer.get(TYPES.BattleService));
          } catch (error) {
            console.error('[index.ts] BattleService 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.BattleEngine, serviceContainer.get(TYPES.BattleEngine));
          } catch (error) {
            console.error('[index.ts] BattleEngine 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.BattleResultHandler, serviceContainer.get(TYPES.BattleResultHandler));
          } catch (error) {
            console.error('[index.ts] BattleResultHandler 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.BattleConfigService, serviceContainer.get(TYPES.BattleConfigService));
          } catch (error) {
            console.error('[index.ts] BattleConfigService 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.BattleConfigInitializer, serviceContainer.get(TYPES.BattleConfigInitializer));
          } catch (error) {
            console.error('[index.ts] BattleConfigInitializer 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.DynamicEnemyService, serviceContainer.get(TYPES.DynamicEnemyService));
          } catch (error) {
            console.error('[index.ts] DynamicEnemyService 服务获取失败 (remount):', error);
          }

          // 提供游戏状态服务给状态管理器使用
          try {
            next.provide(TYPES.GameStateService, serviceContainer.get(TYPES.GameStateService));
          } catch (error) {
            console.error('[index.ts] GameStateService 服务获取失败 (remount):', error);
          }

          try {
            next.provide(TYPES.GlobalStateManager, serviceContainer.get(TYPES.GlobalStateManager));
          } catch (error) {
            console.error('[index.ts] GlobalStateManager 服务获取失败 (remount):', error);
          }
          next.mount(el);
        };
        app.mount(mountEl);

        // 延迟启动 DOM Portal，确保Vue应用完全挂载后再进行DOM位置管理
        setTimeout(() => {
          try {
            const domPortalService = serviceContainer.get(TYPES.DomPortalService) as any;
            domPortalService.start({ keyword: '【游玩】' });
          } catch {
            /* no-op */ void 0;
          }
        }, 100);

        // 延迟注册GameCore事件监听器，确保Vue应用完全挂载后再注册
        // 这样可以确保事件监听器注册的时序正确，避免事件传递失败
        setTimeout(() => {
          try {
            remakeCore?.registerSameLayerEventListeners();
          } catch (error) {
            console.error('[index.ts] 注册GameCore事件监听器失败:', error);
          }
        }, 200);
      }
    }
  } catch (error: any) {
    console.error('[同层游玩RPG_remake] 初始化失败:', error);

    // 显示错误信息
    const $root = $$('#rpg-root');
    $root.html(`
      <div style="
        padding: 20px; 
        text-align: center; 
        color: #ff6b6b;
        background: #fff5f5;
        border: 1px solid #fed7d7;
        border-radius: 8px;
        margin: 20px;
      ">
        <h3 style="margin-bottom: 10px;">初始化失败</h3>
        <p style="margin-bottom: 15px;">${error instanceof Error ? error.message : String(error)}</p>
        <button onclick="window.location.reload()" style="
          margin-top: 10px; 
          padding: 8px 16px; 
          background: #007bff; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer;
        ">
          刷新页面
        </button>
      </div>
    `);
  }
})();

window.addEventListener('pagehide', () => {
  try {
    remakeCore?.unmount();
    const app: any = (window as any).__RPG_VUE_APP__;
    if (app && typeof app.unmount === 'function') {
      app.unmount();
    }
  } catch (error) {
    console.warn('[同层游玩RPG_remake] 卸载清理异常:', error);
  }
});
