import { gameCore } from './core/GameCore';
import './index.scss';

// 采用 jQuery 的加载与卸载钩子
$(() => {
  console.log('[同层游玩RPG] 开始初始化...');

  // 初始化并挂载游戏核心
  gameCore
    .init()
    .then(() => {
      return gameCore.mount('#app');
    })
    .then(() => {
      console.log('[同层游玩RPG] 初始化完成');
    })
    .catch(error => {
      console.error('[同层游玩RPG] 初始化失败:', error);
      $('#app').html(`
      <div style="padding: 20px; text-align: center; color: #ff6b6b;">
        <h3>游戏初始化失败</h3>
        <p>请刷新页面重试</p>
        <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          刷新页面
        </button>
      </div>
    `);
    });
});

$(window).on('unload', () => {
  console.log('[同层游玩RPG] 开始清理...');
  gameCore.unmount();
});

// 暴露给窗口以便调试
(window as any).GameCore = gameCore;
