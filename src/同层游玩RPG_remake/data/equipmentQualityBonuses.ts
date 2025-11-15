/**
 * 装备品质加成配置
 *
 * 定义不同品质的装备（武器、防具、饰品）对战斗属性的加成值
 * 加成方式：加法（直接加到基础战斗属性上）
 */

/**
 * 装备品质类型
 */
export type EquipmentQuality = '破损' | '普通' | '优良' | '稀有' | '史诗' | '传说' | '神话';

/**
 * 战斗属性加成接口
 */
export interface BattleStatsBonus {
  /** 物理攻击加成（加法） */
  atk?: number;
  /** H攻击加成（加法） */
  hatk?: number;
  /** 物理防御加成（加法） */
  def?: number;
  /** H防御加成（加法，0-0.99范围） */
  hdef?: number;
  /** 命中率加成（加法） */
  hit?: number;
  /** 闪避率加成（加法，0-1范围） */
  evade?: number;
  /** 暴击率加成（加法，0-1范围） */
  critRate?: number;
  /** 暴击伤害倍数加成（加法） */
  critDamageMultiplier?: number;
  /** H血量加成（加法） */
  hhp?: number;
}

/**
 * 武器品质加成配置
 * 基于标准武器的等级数据（等级1-7对应破损-神话）
 * CSV映射：攻击=atk, 暴击=critRate（百分比转小数）
 */
export const WEAPON_QUALITY_BONUSES: Record<EquipmentQuality, BattleStatsBonus> = {
  破损: {
    // 标准武器等级1: 攻击20, 暴击1%
    atk: 20,
    critRate: 0.01,
  },
  普通: {
    // 标准武器等级2: 攻击40, 暴击3%
    atk: 40,
    critRate: 0.03,
  },
  优良: {
    // 标准武器等级3: 攻击80, 暴击6%
    atk: 80,
    critRate: 0.06,
  },
  稀有: {
    // 标准武器等级4: 攻击140, 暴击10%
    atk: 140,
    critRate: 0.1,
  },
  史诗: {
    // 标准武器等级5: 攻击200, 暴击14%
    atk: 200,
    critRate: 0.14,
  },
  传说: {
    // 标准武器等级6: 攻击280, 暴击20%
    atk: 280,
    critRate: 0.2,
  },
  神话: {
    // 标准武器等级7: 攻击400, 暴击29%
    atk: 400,
    critRate: 0.29,
  },
};

/**
 * 防具品质加成配置
 * 基于标准护甲的等级数据（等级1-7对应破损-神话）
 * CSV映射：物理防御=def, H防御=hdef（百分比转小数）
 */
export const ARMOR_QUALITY_BONUSES: Record<EquipmentQuality, BattleStatsBonus> = {
  破损: {
    // 标准护甲等级1: 物理防御20, H防御1%
    def: 20,
    hdef: 0.01,
  },
  普通: {
    // 标准护甲等级2: 物理防御40, H防御2%
    def: 40,
    hdef: 0.02,
  },
  优良: {
    // 标准护甲等级3: 物理防御80, H防御4%
    def: 80,
    hdef: 0.04,
  },
  稀有: {
    // 标准护甲等级4: 物理防御140, H防御7%
    def: 140,
    hdef: 0.07,
  },
  史诗: {
    // 标准护甲等级5: 物理防御200, H防御10%
    def: 200,
    hdef: 0.1,
  },
  传说: {
    // 标准护甲等级6: 物理防御280, H防御14%
    def: 280,
    hdef: 0.14,
  },
  神话: {
    // 标准护甲等级7: 物理防御400, H防御20%
    def: 400,
    hdef: 0.2,
  },
};

/**
 * 饰品品质加成配置
 * 基于标准饰品的等级数据（等级1-7对应破损-神话）
 * CSV映射：H血量=hhp, H攻击=hatk
 */
export const ACCESSORY_QUALITY_BONUSES: Record<EquipmentQuality, BattleStatsBonus> = {
  破损: {
    // 标准饰品等级1: H血量400, H攻击20
    hhp: 400,
    hatk: 20,
  },
  普通: {
    // 标准饰品等级2: H血量800, H攻击40
    hhp: 800,
    hatk: 40,
  },
  优良: {
    // 标准饰品等级3: H血量1600, H攻击80
    hhp: 1600,
    hatk: 80,
  },
  稀有: {
    // 标准饰品等级4: H血量2800, H攻击140
    hhp: 2800,
    hatk: 140,
  },
  史诗: {
    // 标准饰品等级5: H血量4000, H攻击200
    hhp: 4000,
    hatk: 200,
  },
  传说: {
    // 标准饰品等级6: H血量5600, H攻击280
    hhp: 5600,
    hatk: 280,
  },
  神话: {
    // 标准饰品等级7: H血量8000, H攻击400
    hhp: 8000,
    hatk: 400,
  },
};

/**
 * 根据装备类型和品质获取加成
 * @param equipmentType 装备类型：'weapon' | 'armor' | 'accessory'
 * @param quality 装备品质
 * @returns 战斗属性加成对象，如果品质无效则返回空对象
 */
export function getEquipmentQualityBonus(
  equipmentType: 'weapon' | 'armor' | 'accessory',
  quality: string | undefined | null,
): BattleStatsBonus {
  if (!quality) {
    return {};
  }

  let bonuses: Record<EquipmentQuality, BattleStatsBonus>;

  switch (equipmentType) {
    case 'weapon':
      bonuses = WEAPON_QUALITY_BONUSES;
      break;
    case 'armor':
      bonuses = ARMOR_QUALITY_BONUSES;
      break;
    case 'accessory':
      bonuses = ACCESSORY_QUALITY_BONUSES;
      break;
    default:
      return {};
  }

  // 验证品质是否有效
  const validQuality = quality as EquipmentQuality;
  if (bonuses[validQuality]) {
    return bonuses[validQuality];
  }

  // 如果品质无效，返回空对象（不应用加成）
  console.warn(`[equipmentQualityBonuses] 无效的装备品质: ${quality}`);
  return {};
}

/**
 * 合并多个装备加成
 * @param bonuses 多个加成对象数组
 * @returns 合并后的加成对象
 */
export function mergeEquipmentBonuses(bonuses: BattleStatsBonus[]): BattleStatsBonus {
  const merged: BattleStatsBonus = {};

  bonuses.forEach(bonus => {
    if (bonus.atk !== undefined) merged.atk = (merged.atk || 0) + bonus.atk;
    if (bonus.hatk !== undefined) merged.hatk = (merged.hatk || 0) + bonus.hatk;
    if (bonus.def !== undefined) merged.def = (merged.def || 0) + bonus.def;
    if (bonus.hdef !== undefined) merged.hdef = (merged.hdef || 0) + bonus.hdef;
    if (bonus.hit !== undefined) merged.hit = (merged.hit || 0) + bonus.hit;
    if (bonus.evade !== undefined) merged.evade = (merged.evade || 0) + bonus.evade;
    if (bonus.critRate !== undefined) merged.critRate = (merged.critRate || 0) + bonus.critRate;
    if (bonus.critDamageMultiplier !== undefined)
      merged.critDamageMultiplier = (merged.critDamageMultiplier || 0) + bonus.critDamageMultiplier;
    if (bonus.hhp !== undefined) merged.hhp = (merged.hhp || 0) + bonus.hhp;
  });

  return merged;
}
