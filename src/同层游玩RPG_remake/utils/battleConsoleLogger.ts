/**
 * 战斗控制台日志工具
 *
 * 功能：
 * - 控制战斗相关的 console.log 输出
 * - 默认关闭，可通过调试面板开启
 * - console.warn 和 console.error 始终输出
 *
 * 注意：
 * - 此工具只控制控制台输出，不影响战斗日志数据系统（BattleLogItem）
 * - 与战斗日志描述系统（battleLog）完全独立
 */

import { ref } from 'vue';

// 控制台日志开关状态（默认关闭）
const isConsoleLogEnabled = ref(false);

/**
 * 条件输出 console.log
 * 只有在开关开启时才输出
 */
export function battleConsoleLog(...args: any[]): void {
  if (isConsoleLogEnabled.value) {
    console.log(...args);
  }
}

/**
 * 设置控制台日志开关状态
 */
export function setBattleConsoleLogEnabled(enabled: boolean): void {
  isConsoleLogEnabled.value = enabled;
}

/**
 * 获取控制台日志开关状态
 */
export function isBattleConsoleLogEnabled(): boolean {
  return isConsoleLogEnabled.value;
}
