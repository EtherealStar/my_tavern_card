// 属性中英文对照表
export const ATTRIBUTE_NAMES = {
  strength: '力量',
  agility: '敏捷',
  intelligence: '智力',
  constitution: '体质',
  charisma: '魅力',
  willpower: '意志',
  luck: '幸运',
} as const;

export type AttributeKey = keyof typeof ATTRIBUTE_NAMES;

// 属性英文名数组
export const ATTRIBUTE_KEYS: AttributeKey[] = [
  'strength',
  'agility',
  'intelligence',
  'constitution',
  'charisma',
  'willpower',
  'luck',
];

// 获取属性中文名
export function getAttributeName(key: AttributeKey): string {
  return ATTRIBUTE_NAMES[key];
}

// 获取所有属性的中英文对照
export function getAllAttributes(): Array<{ key: AttributeKey; name: string }> {
  return ATTRIBUTE_KEYS.map(key => ({
    key,
    name: ATTRIBUTE_NAMES[key],
  }));
}
