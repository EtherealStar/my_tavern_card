import type { Background } from '../models/schemas';

export const BACKGROUNDS: Background[] = [
  // 通用出身
  {
    id: 'noble',
    name: '贵族出身',
    description: '你生于名门望族，从小接受良好教育，天生具备优雅的气质和卓越的见识',
    cost: 3,
    attributeBonus: { charisma: 2, intelligence: 1 },
  },
  {
    id: 'commoner',
    name: '平民出身',
    description: '你来自普通家庭，朴实的生活培养了你踏实稳重的品格和坚韧的毅力',
    cost: 0,
    attributeBonus: {},
  },
  {
    id: 'merchant',
    name: '商人家庭',
    description: '你出身于商贾世家，从小耳濡目染商业智慧，擅长交际和精明计算',
    cost: 2,
    attributeBonus: { intelligence: 1, charisma: 1 },
  },
  {
    id: 'warrior',
    name: '武者世家',
    description: '你来自世代习武的家族，严格的训练塑造了你强健的体魄和坚定的意志',
    cost: 2,
    attributeBonus: { strength: 1, constitution: 1 },
  },

  // 西幻专属
  {
    id: 'mage_apprentice',
    name: '法师学徒',
    description: '你从小在魔法塔中长大，深受奥术知识熏陶，拥有卓越的魔法天赋和学识',
    cost: 3,
    attributeBonus: { intelligence: 2, willpower: 1 },
    world: '西幻',
  },
  {
    id: 'temple_acolyte',
    name: '神殿侍从',
    description: '你在神圣的殿堂中成长，虔诚的信仰赐予你坚定的意志和神明的庇护',
    cost: 2,
    attributeBonus: { willpower: 2 },
    world: '西幻',
  },

  // 都市专属
  {
    id: 'wealthy_family',
    name: '富裕家庭',
    description: '你生于富裕家庭，从小接受精英教育，拥有优秀的社交能力和商业头脑',
    cost: 4,
    attributeBonus: { charisma: 2, intelligence: 2 },
    world: '都市',
  },
  {
    id: 'middle_class',
    name: '中产阶级',
    description: '你出身于稳定的中产家庭，受过良好教育，拥有平衡的知识和品格',
    cost: 2,
    attributeBonus: { intelligence: 1, willpower: 1 },
    world: '都市',
  },
  {
    id: 'corporate_heir',
    name: '企业继承人',
    description: '你是大企业家族的继承人，从小在商界耳濡目染，掌握着财富与权力',
    cost: 5,
    attributeBonus: { charisma: 3, intelligence: 1, willpower: 1 },
    world: '都市',
  },
  {
    id: 'street_survivor',
    name: '街头生存者',
    description: '你在城市底层长大，街头的残酷磨练出你敏锐的直觉和顽强的生命力',
    cost: 1,
    attributeBonus: { agility: 2, constitution: 1 },
    world: '都市',
  },
  {
    id: 'academic_family',
    name: '书香门第',
    description: '你出身于学者世家，从小沉浸在知识的海洋中，培养了深厚的学术素养',
    cost: 3,
    attributeBonus: { intelligence: 3, willpower: 1 },
    world: '都市',
  },
  {
    id: 'working_class',
    name: '工人阶级',
    description: '你来自普通工人家庭，朴实的环境塑造了你坚韧不拔的品格和实用主义',
    cost: 1,
    attributeBonus: { constitution: 2, strength: 1 },
    world: '都市',
  },
  {
    id: 'artist_family',
    name: '艺术世家',
    description: '你成长在充满艺术气息的家庭中，天生具备独特的审美和超凡的魅力',
    cost: 3,
    attributeBonus: { charisma: 2, intelligence: 1, luck: 1 },
    world: '都市',
  },
  {
    id: 'immigrant_family',
    name: '移民家庭',
    description: '你来自努力奋斗的移民家庭，艰难的环境磨练出你的坚韧意志和适应能力',
    cost: 2,
    attributeBonus: { willpower: 2, constitution: 1 },
    world: '都市',
  },

  // 武侠专属
  {
    id: 'sect_disciple',
    name: '门派弟子',
    description: '你是名门正派的入室弟子，从小修习武学正道，拥有扎实的武功根基',
    cost: 3,
    attributeBonus: { strength: 1, agility: 1, willpower: 1 },
    world: '武侠',
  },
  {
    id: 'wanderer',
    name: '江湖游侠',
    description: '你浪迹天涯行走江湖，丰富的阅历让你见多识广，身法灵活善于应变',
    cost: 2,
    attributeBonus: { agility: 1, charisma: 1 },
    world: '武侠',
  },

  // 仙侠专属
  {
    id: 'immortal_descendant',
    name: '仙人后裔',
    description: '你拥有仙人血脉，天生灵根上佳，注定要在修仙之路上大放异彩',
    cost: 5,
    attributeBonus: { intelligence: 2, willpower: 2, luck: 1 },
    world: '仙侠',
  },
  {
    id: 'mortal_prodigy',
    name: '凡人天才',
    description: '你虽为凡人却资质超凡，过人的悟性让无数仙门为你争相招揽',
    cost: 3,
    attributeBonus: { intelligence: 2, willpower: 1 },
    world: '仙侠',
  },
];

export function getBackgroundsForWorld(world: string): Background[] {
  return BACKGROUNDS.filter(bg => !bg.world || bg.world === world);
}
