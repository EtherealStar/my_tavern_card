/**
 * 战斗描述模板定义
 *
 * 本文件包含所有战斗事件的描述模板，支持通用描述和专属技能描述
 */

import { CustomSkillDescriptions, GenericDescriptions } from '../models/BattleLogSchemas';

// 通用物理攻击描述模板
export const PHYSICAL_DESCRIPTIONS: GenericDescriptions = {
  hit: [
    '利剑划过空气，在{target}身上留下一道深深的伤口，鲜血飞溅',
    '重拳击中{target}的胸口，发出沉闷的撞击声',
    '锋利的刀刃切过{target}的皮肤，留下一道血痕',
    '{actor}的武器精准命中{target}的要害部位',
    '武器与{target}的身体碰撞，发出金属撞击的声音',
    '{actor}挥舞着武器，在{target}身上留下一道伤痕',
    '沉重的攻击让{target}后退了几步',
    '{actor}的攻势如暴风骤雨般袭向{target}',
  ],
  critical: [
    '致命一击！{actor}的武器深深刺入{target}的身体，鲜血如泉涌般喷出',
    '暴击！{actor}的攻击造成了毁灭性的伤害，{target}发出痛苦的惨叫',
    '完美命中！{actor}的武器在{target}身上留下了无法愈合的伤口',
    '重击！{actor}的全力一击让{target}几乎失去平衡',
    '致命暴击！{actor}的攻击撕裂了{target}的防御，造成巨大伤害',
    '完美时机！{actor}抓住了{target}的破绽，造成了致命一击',
    '暴击命中！{actor}的武器在{target}身上留下了深深的伤口',
    '致命打击！{actor}的攻击让{target}受到了重创',
  ],
  miss: [
    '{actor}的攻击被{target}敏捷地闪避了',
    '{actor}的武器只击中了空气，{target}轻松躲过',
    '攻击落空，{target}展现了出色的闪避技巧',
    '{actor}的攻击被{target}的护甲弹开',
    '{target}巧妙地避开了{actor}的攻击',
    '{actor}的攻击被{target}的盾牌格挡',
    '{target}以灵活的身法躲过了{actor}的攻势',
    '{actor}的攻击偏离了目标，未能造成伤害',
  ],
};

// 通用魔法攻击描述模板
export const MAGICAL_DESCRIPTIONS: GenericDescriptions = {
  hit: [
    '魔法能量在{target}身上爆发，造成元素伤害',
    '{actor}释放的魔法击中{target}，能量波纹四散',
    '元素之力在{target}周围炸裂，造成魔法伤害',
    '{actor}的咒语生效，{target}被魔法能量包围',
    '魔法光芒击中{target}，能量在{target}身上闪烁',
    '{actor}的法术在{target}身上产生了强烈的魔法反应',
    '元素能量在{target}周围爆发，造成持续的魔法伤害',
    '{actor}的魔法攻击精准命中{target}的要害',
  ],
  critical: [
    '魔法暴击！强大的元素能量在{target}身上爆炸，光芒四射',
    '法术暴击！{actor}的魔法造成了毁灭性的元素伤害',
    '魔法共鸣！{actor}的法术与{target}产生了强烈的能量反应',
    '元素爆发！{actor}的魔法能量在{target}身上产生了连锁反应',
    '法术暴击！{actor}的魔法力量在{target}身上爆发，造成巨大伤害',
    '元素共鸣！{actor}的法术与{target}产生了强烈的魔法反应',
    '魔法暴击！{actor}的咒语在{target}身上产生了毁灭性的效果',
    '元素爆发！{actor}的魔法能量在{target}周围产生了强烈的爆炸',
  ],
  miss: [
    '{target}的魔法抗性抵消了{actor}的法术',
    '{actor}的魔法能量消散在空气中，未能命中{target}',
    '法术失效，{target}展现了对魔法的天然抗性',
    '{actor}的咒语被{target}的魔法护盾反弹',
    '{target}的魔法抗性让{actor}的法术失去了效果',
    '{actor}的魔法能量被{target}的护盾完全吸收',
    '法术偏离，{actor}的魔法攻击未能命中目标',
    '{target}的魔法抗性让{actor}的法术化为乌有',
  ],
};

// 专属技能描述模板
export const CUSTOM_SKILL_DESCRIPTIONS: Record<string, CustomSkillDescriptions> = {
  fireball: {
    hit: '{actor}释放出炽热的火球，火球在空中划出弧线，准确命中{target}，火焰瞬间包围了{target}的身体',
    critical: '火球术暴击！巨大的火球在{target}身上爆炸，火焰冲天而起，{target}被熊熊烈火包围',
    miss: '{actor}的火球术偏离了目标，火球在{target}身边爆炸，只造成了轻微的灼烧',
  },
  heal: {
    hit: '{actor}释放出温暖的治疗光芒，光芒包围{target}，{target}的伤口开始愈合',
    critical: '治疗暴击！强烈的治愈能量从{actor}身上涌出，{target}的伤势瞬间恢复',
    miss: '治疗法术未能完全生效，{target}的伤势只得到了部分缓解',
  },
  lightning_bolt: {
    hit: '闪电从{actor}手中射出，电光击中{target}，电流在{target}身上跳跃',
    critical: '闪电暴击！强大的电流在{target}身上爆发，电光四射，{target}被电击得颤抖不已',
    miss: '{actor}的闪电术被{target}的绝缘护甲阻挡，电流消散',
  },
  ice_shard: {
    hit: '冰晶从{actor}手中射出，刺骨的寒气包围{target}，冰晶在{target}身上碎裂',
    critical: '冰霜暴击！巨大的冰锥刺向{target}，寒气瞬间冻结了{target}的周围',
    miss: '{actor}的冰晶术被{target}的热量融化，未能造成伤害',
  },
  earth_spike: {
    hit: '地面突然裂开，尖锐的岩石从地下刺出，{target}被地刺击中',
    critical: '地刺暴击！巨大的岩石尖刺从地下爆发，{target}被多根地刺同时刺中',
    miss: '{actor}的地刺术被{target}敏捷地跳开，地刺只刺中了空气',
  },
  wind_slash: {
    hit: '锐利的风刃从{actor}手中射出，风刃切过{target}的身体',
    critical: '风刃暴击！强烈的风刃在{target}身上留下了深深的伤口，鲜血飞溅',
    miss: '{actor}的风刃被{target}的护甲弹开，风刃消散在空气中',
  },
  shadow_bolt: {
    hit: '黑暗的能量从{actor}手中射出，暗影击中{target}，{target}被黑暗能量包围',
    critical: '暗影暴击！强大的黑暗能量在{target}身上爆发，{target}被黑暗吞噬',
    miss: '{actor}的暗影术被{target}的光明护盾驱散，黑暗能量消散',
  },
  holy_light: {
    hit: '神圣的光芒从{actor}手中射出，圣光击中{target}，{target}被神圣能量包围',
    critical: '圣光暴击！强烈的神圣能量在{target}身上爆发，{target}被圣光净化',
    miss: '{actor}的圣光术被{target}的黑暗护盾阻挡，神圣能量消散',
  },
};

