export const RANDOM_EVENT_PATH = 'stat_data.世界.随机事件[0]';

/**
 * 获取用户键名，支持多种回退机制
 */
function getUserKey(): string {
  try {
    // 尝试使用 substitudeMacros 函数
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof substitudeMacros === 'function') {
      const result = substitudeMacros('<user>');
      if (result && result !== '<user>' && typeof result === 'string') {
        console.log('[Constants] 使用 substitudeMacros 获取用户键:', result);
        return result;
      }
    }

    // 回退1: 尝试从酒馆助手变量获取
    if (typeof (window as any).getVariables === 'function') {
      const vars = (window as any).getVariables({ type: 'global' });
      const userName = vars?.user_name || vars?.username;
      if (userName && typeof userName === 'string') {
        console.log('[Constants] 从全局变量获取用户键:', userName);
        return userName;
      }
    }

    // 回退2: 尝试从SillyTavern获取
    const st = (window as any).SillyTavern;
    if (st?.name1) {
      console.log('[Constants] 从SillyTavern获取用户键:', st.name1);
      return st.name1;
    }

    // 回退3: 从聊天消息中推断用户名
    if (typeof (window as any).getChatMessages === 'function') {
      try {
        const messages = (window as any).getChatMessages();
        const userMessage = messages.find((msg: any) => msg.is_user);
        if (userMessage?.name) {
          console.log('[Constants] 从聊天消息推断用户键:', userMessage.name);
          return userMessage.name;
        }
      } catch {
        // ignore
      }
    }

    // 最终回退: 使用默认值
    console.warn('[Constants] 无法获取用户键，使用默认值: <user>');
    return '<user>';
  } catch (error) {
    console.error('[Constants] 获取用户键时发生错误:', error);
    return '<user>';
  }
}

// 延迟获取用户键，确保在需要时才计算
export let userKey = '<user>';

// 提供动态更新用户键的函数
export function updateUserKey(): string {
  userKey = getUserKey();
  return userKey;
}

// 在模块加载时尝试获取一次
try {
  userKey = getUserKey();
} catch {
  // ignore
}
export const TRIGGERED_RANDOM_EVENTS_PATH = 'tavern_helper.random_events.triggered';
