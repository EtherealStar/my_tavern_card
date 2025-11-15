import type { GameWorld } from '../models/CreationSchemas';

export type UidToggle = { uid: number; enable: boolean };

export type WorldExpansion = {
  id: string;
  name: string;
  desc: string;
  toggles: UidToggle[];
  // 可选：互斥对。baseUid 表示原始条目（扩展未选中时应为开启），expansionUid 表示扩展条目（扩展选中时开启）
  mutex?: Array<{ baseUid: number; expansionUid: number }>;
};

/**
 * 选择某世界后，默认应应用的一次性 UID 开关计划。
 * 注意：UID 需由使用者根据自身世界书填充；空数组表示当前无默认开关。
 */
export function getWorldBaseToggles(world: GameWorld): UidToggle[] {
  switch (world) {
    case '现代：阴阳师':
      return [
        // 示例：{ uid: 1201, enable: true }, { uid: 2100, enable: false }
      ];
    case '西幻':
    default:
      return [];
  }
}

/**
 * 返回某世界可选扩展列表。每个扩展声明将被启用/关闭的 UID 集合。
 */
export function getWorldExpansions(world: GameWorld): WorldExpansion[] {
  switch (world) {
    case '现代：阴阳师':
      return [
        {
          id: 'sexslave',
          name: '男性性奴化(M向)',
          desc: '女性拥有了对男性的调教权，可以自由对男性进行调教的社会，争取不要太快被变成小狗吧',
          toggles: [
            { uid: 25, enable: true },
            { uid: 26, enable: true },
            { uid: 27, enable: true },
            { uid: 31, enable: true },
            { uid: 42, enable: true },
            { uid: 43, enable: true },
          ],
          // 在此填入互斥对，如：{ baseUid: 100, expansionUid: 200 }
          mutex: [{ baseUid: 13, expansionUid: 41 }],
        },
      ];
    case '西幻':
      return [];
    default:
      return [];
  }
}
