/**
 * 等级经验值配置表
 * 基于 rpg-exp-table-csv.txt 数据，定义1-20级每级的经验值信息
 *
 * 字段说明：
 * - enemyExp: 敌人经验值（击败该等级敌人获得的经验值）
 * - expRequired: 升级所需EXP（从当前等级升级到下一等级需要的经验值）
 * - totalExp: 累计总EXP（从1级到当前等级所需的总经验值）
 * - killsRequired: 需击杀数（从当前等级升级到下一等级需要击败的敌人数量）
 */

import { isValidLevel } from './levelAttributes';

export interface LevelExpInfo {
  /** 敌人经验值（击败该等级敌人获得的经验值） */
  enemyExp: number;
  /** 升级所需EXP（从当前等级升级到下一等级需要的经验值） */
  expRequired: number;
  /** 累计总EXP（从1级到当前等级所需的总经验值） */
  totalExp: number;
  /** 需击杀数（从当前等级升级到下一等级需要击败的敌人数量） */
  killsRequired: number;
}

/**
 * 等级经验值表（1-20级）
 * 数据来源：用户提供的新升级经验表
 */
export const LEVEL_EXP_TABLE: Record<number, LevelExpInfo> = {
  1: { enemyExp: 10, expRequired: 10, totalExp: 10, killsRequired: 1 },
  2: { enemyExp: 20, expRequired: 40, totalExp: 50, killsRequired: 2 },
  3: { enemyExp: 40, expRequired: 80, totalExp: 130, killsRequired: 2 },
  4: { enemyExp: 80, expRequired: 160, totalExp: 290, killsRequired: 2 },
  5: { enemyExp: 160, expRequired: 320, totalExp: 610, killsRequired: 2 },
  6: { enemyExp: 320, expRequired: 640, totalExp: 1250, killsRequired: 2 },
  7: { enemyExp: 640, expRequired: 1920, totalExp: 3170, killsRequired: 3 },
  8: { enemyExp: 1280, expRequired: 3840, totalExp: 7010, killsRequired: 3 },
  9: { enemyExp: 2560, expRequired: 7680, totalExp: 14690, killsRequired: 3 },
  10: { enemyExp: 5120, expRequired: 15360, totalExp: 30050, killsRequired: 3 },
  11: { enemyExp: 10240, expRequired: 30720, totalExp: 60770, killsRequired: 3 },
  12: { enemyExp: 20480, expRequired: 61440, totalExp: 122210, killsRequired: 3 },
  13: { enemyExp: 40960, expRequired: 122880, totalExp: 245090, killsRequired: 3 },
  14: { enemyExp: 81920, expRequired: 245760, totalExp: 490850, killsRequired: 3 },
  15: { enemyExp: 163840, expRequired: 491520, totalExp: 982370, killsRequired: 3 },
  16: { enemyExp: 327680, expRequired: 983040, totalExp: 1965410, killsRequired: 3 },
  17: { enemyExp: 655360, expRequired: 1966080, totalExp: 3931490, killsRequired: 3 },
  18: { enemyExp: 1310720, expRequired: 3932160, totalExp: 7863650, killsRequired: 3 },
  19: { enemyExp: 2621440, expRequired: 7864320, totalExp: 15727970, killsRequired: 3 },
  20: { enemyExp: 5242880, expRequired: 15728640, totalExp: 31456610, killsRequired: 3 },
};

/**
 * 获取指定等级的经验值信息
 * @param level 等级（1-20）
 * @returns 该等级的经验值信息，如果等级无效则返回null
 *
 * @example
 * ```typescript
 * const expInfo = getExpInfoByLevel(5);
 * console.log(`敌人经验值: ${expInfo.enemyExp}`);
 * console.log(`升级所需EXP: ${expInfo.expRequired}`);
 * console.log(`累计总EXP: ${expInfo.totalExp}`);
 * ```
 */
export function getExpInfoByLevel(level: number): LevelExpInfo | null {
  const clampedLevel = Math.max(1, Math.min(20, Math.floor(level)));
  return LEVEL_EXP_TABLE[clampedLevel] || null;
}

/**
 * 获取指定等级的敌人经验值
 * @param level 等级（1-20）
 * @returns 击败该等级敌人获得的经验值，如果等级无效则返回0
 *
 * @example
 * ```typescript
 * const enemyExp = getEnemyExpByLevel(5);
 * console.log(`击败5级敌人获得 ${enemyExp} 经验值`);
 * ```
 */
export function getEnemyExpByLevel(level: number): number {
  const expInfo = getExpInfoByLevel(level);
  return expInfo?.enemyExp || 0;
}

/**
 * 获取从当前等级升级到下一等级所需的经验值
 * @param level 当前等级（1-20）
 * @returns 升级到下一等级所需的经验值，如果等级无效或已满级则返回0
 *
 * @example
 * ```typescript
 * const expRequired = getExpRequiredByLevel(5);
 * console.log(`从5级升级到6级需要 ${expRequired} 经验值`);
 * ```
 */
export function getExpRequiredByLevel(level: number): number {
  const expInfo = getExpInfoByLevel(level);
  return expInfo?.expRequired || 0;
}

/**
 * 获取从1级到指定等级所需的总经验值
 * @param level 等级（1-20）
 * @returns 累计总经验值，如果等级无效则返回0
 *
 * @example
 * ```typescript
 * const totalExp = getTotalExpByLevel(5);
 * console.log(`从1级到5级总共需要 ${totalExp} 经验值`);
 * ```
 */
export function getTotalExpByLevel(level: number): number {
  const expInfo = getExpInfoByLevel(level);
  return expInfo?.totalExp || 0;
}

/**
 * 获取从当前等级升级到下一等级需要击败的敌人数量
 * @param level 当前等级（1-20）
 * @returns 需击败的敌人数量，如果等级无效或已满级则返回0
 *
 * @example
 * ```typescript
 * const killsRequired = getKillsRequiredByLevel(5);
 * console.log(`从5级升级到6级需要击败 ${killsRequired} 个敌人`);
 * ```
 */
export function getKillsRequiredByLevel(level: number): number {
  const expInfo = getExpInfoByLevel(level);
  return expInfo?.killsRequired || 0;
}

/**
 * 根据累计经验值计算当前等级
 * @param totalExp 累计总经验值
 * @returns 当前等级（1-20），如果经验值不足以升级则返回1
 *
 * @example
 * ```typescript
 * const level = calculateLevelByTotalExp(1350);
 * console.log(`累计经验值1350对应等级: ${level}`); // 输出: 5
 * ```
 */
export function calculateLevelByTotalExp(totalExp: number): number {
  if (!Number.isFinite(totalExp) || totalExp < 0) {
    return 1;
  }

  // 从最高等级向下查找
  for (let level = 20; level >= 1; level--) {
    const expInfo = getExpInfoByLevel(level);
    if (expInfo && totalExp >= expInfo.totalExp) {
      return level;
    }
  }

  return 1;
}

/**
 * 计算从当前经验值到下一等级还需要多少经验值
 * @param currentLevel 当前等级（1-20）
 * @param currentExp 当前经验值
 * @returns 还需要多少经验值才能升级，如果已经可以升级则返回0或负数
 *
 * @example
 * ```typescript
 * const expNeeded = calculateExpNeededToNextLevel(5, 1000);
 * console.log(`还需要 ${expNeeded} 经验值才能升级`);
 * ```
 */
export function calculateExpNeededToNextLevel(currentLevel: number, currentExp: number): number {
  const expInfo = getExpInfoByLevel(currentLevel);
  if (!expInfo) {
    return 0;
  }

  // 当前经验值对应的总经验值
  const currentTotalExp = getTotalExpByLevel(currentLevel) - expInfo.expRequired + currentExp;
  const nextLevelTotalExp = getTotalExpByLevel(currentLevel + 1);

  if (!nextLevelTotalExp) {
    // 已经满级
    return 0;
  }

  const expNeeded = nextLevelTotalExp - currentTotalExp;
  return Math.max(0, expNeeded);
}

// 注意：isValidLevel 函数已从 levelAttributes 导入，避免重复定义
// 重新导出以供外部使用
export { isValidLevel };
