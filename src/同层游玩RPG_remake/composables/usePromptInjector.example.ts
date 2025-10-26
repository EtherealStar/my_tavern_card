/**
 * usePromptInjector 使用示例
 * 展示如何在战斗子系统、指令队列等功能中使用提示注入器
 */

import { usePromptInjector } from './usePromptInjector';

// 示例：战斗子系统使用
export function useBattlePromptExample() {
  const { addSessionInjection, addNextInjection, clearBySource } = usePromptInjector();

  // 战斗开始时注入系统提示
  const startBattle = () => {
    addSessionInjection('你现在处于战斗状态。请根据当前战斗情况做出合理的行动决策。', {
      position: 'in_chat',
      should_scan: true,
      source: 'battle',
      priority: 10,
    });
  };

  // 战斗结束时清理提示
  const endBattle = () => {
    clearBySource('battle', 'session');
  };

  // 为下一次攻击注入特定提示
  const prepareAttack = (attackType: string) => {
    addNextInjection(`请使用${attackType}攻击，并描述攻击过程和结果。`, {
      position: 'in_chat',
      should_scan: true,
      source: 'battle',
      priority: 5,
    });
  };

  return {
    startBattle,
    endBattle,
    prepareAttack,
  };
}

// 示例：指令队列使用
export function useCommandQueuePromptExample() {
  const { addNextInjection, addSessionInjection, clearBySource } = usePromptInjector();

  // 开始执行指令队列
  const startCommandQueue = () => {
    addSessionInjection('你正在执行一系列指令。请按照指令顺序执行，并在每个指令完成后报告结果。', {
      position: 'in_chat',
      should_scan: true,
      source: 'queue',
      priority: 8,
    });
  };

  // 为特定指令注入提示
  const addCommandPrompt = (command: string) => {
    addNextInjection(`执行指令：${command}。请详细描述执行过程和结果。`, {
      position: 'in_chat',
      should_scan: true,
      source: 'queue',
      priority: 3,
    });
  };

  // 结束指令队列
  const endCommandQueue = () => {
    clearBySource('queue', 'session');
  };

  return {
    startCommandQueue,
    addCommandPrompt,
    endCommandQueue,
  };
}

// 示例：在 PlayingRoot.vue 中使用
export function usePlayingRootPromptExample() {
  const { addSystemHintNext, addSystemHintSession, getStatus } = usePromptInjector();

  // 添加临时系统提示（仅下一次生成）
  const addTemporaryHint = (hint: string) => {
    addSystemHintNext(hint, {
      source: 'ui',
      priority: 1,
    });
  };

  // 添加持久系统提示（会话级）
  const addPersistentHint = (hint: string) => {
    addSystemHintSession(hint, {
      source: 'ui',
      priority: 2,
    });
  };

  // 获取当前状态（调试用）
  const debugStatus = () => {
    console.log('提示注入器状态:', getStatus());
  };

  return {
    addTemporaryHint,
    addPersistentHint,
    debugStatus,
  };
}
