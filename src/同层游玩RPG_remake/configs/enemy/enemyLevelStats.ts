export interface EnemyLevelStat {
  level: number;
  maxHp: number;
  hhp: number;
  atk: number;
  hatk: number;
  def: number;
  hdef: number;
  critRate: number; // 0-1 概率
  hit: number; // 若<=1 视为比例，需要在使用处转换为百分制
  evade: number; // 若<=1 视为比例，需要在使用处转换为百分制
}

export const ENEMY_LEVEL_STATS: EnemyLevelStat[] = [
  { level: 1, maxHp: 143, hhp: 212, atk: 18, hatk: 20, def: 20, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 2, maxHp: 201, hhp: 272, atk: 52, hatk: 23, def: 20, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 3, maxHp: 265, hhp: 323, atk: 34, hatk: 27, def: 20, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 4, maxHp: 422, hhp: 552, atk: 44, hatk: 44, def: 40, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 5, maxHp: 563, hhp: 693, atk: 61, hatk: 51, def: 50, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 6, maxHp: 729, hhp: 850, atk: 77, hatk: 58, def: 60, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 7, maxHp: 1217, hhp: 1434, atk: 97, hatk: 94, def: 100, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 8, maxHp: 1661, hhp: 1782, atk: 122, hatk: 105, def: 110, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 9, maxHp: 1827, hhp: 2167, atk: 147, hatk: 115, def: 110, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 10, maxHp: 3502, hhp: 4071, atk: 209, hatk: 188, def: 190, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 11, maxHp: 4372, hhp: 2954, atk: 242, hatk: 202, def: 200, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 12, maxHp: 26580, hhp: 11560, atk: 655, hatk: 519, def: 510, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 13, maxHp: 29782, hhp: 13156, atk: 685, hatk: 611, def: 570, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 14, maxHp: 32868, hhp: 14191, atk: 731, hatk: 636, def: 590, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 15, maxHp: 15807, hhp: 15484, atk: 787, hatk: 665, def: 610, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 16, maxHp: 18092, hhp: 17943, atk: 827, hatk: 802, def: 690, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 17, maxHp: 19933, hhp: 19426, atk: 882, hatk: 833, def: 700, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  { level: 18, maxHp: 22020, hhp: 21228, atk: 947, hatk: 869, def: 730, hdef: 0, critRate: 0.1, hit: 0.9, evade: 0.1 },
  {
    level: 19,
    maxHp: 28607,
    hhp: 27689,
    atk: 1072,
    hatk: 1148,
    def: 870,
    hdef: 0,
    critRate: 0.1,
    hit: 0.9,
    evade: 0.1,
  },
  {
    level: 20,
    maxHp: 31658,
    hhp: 30217,
    atk: 1146,
    hatk: 1193,
    def: 890,
    hdef: 0,
    critRate: 0.1,
    hit: 0.9,
    evade: 0.1,
  },
];

export function getEnemyStatsByLevel(level: number): EnemyLevelStat {
  const clamped = Math.max(1, Math.min(20, Math.floor(level)));
  const stat = ENEMY_LEVEL_STATS.find(s => s.level === clamped);
  if (!stat) {
    // 回退到1级
    return ENEMY_LEVEL_STATS[0];
  }
  return stat;
}
