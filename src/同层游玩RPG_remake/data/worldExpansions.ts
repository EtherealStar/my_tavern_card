import type { GameWorld } from '../models/CreationSchemas';

export type UidToggle = { uid: number; enable: boolean };

export type WorldExpansion = {
  id: string;
  name: string;
  desc: string;
  toggles: UidToggle[];
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
          id: 'sexslave-events',
          name: '男性性奴化',
          desc: '女性拥有了对男性的调教权，可以自由对男性进行调教的社会，争取不要太快被变成小狗吧',
          toggles: [
            { uid: 25, enable: true },
            { uid: 26, enable: true },
            { uid: 27, enable: true },
          ],
        },
      ];
    case '西幻':
      return [];
    default:
      return [];
  }
}

/**
 * @deprecated 请使用 useWorldbookToggle 组合式函数中的 applyExpansionToggles 方法
 * 此函数已被重构到 useWorldbookToggle 中，提供更好的性能和错误处理
 */
export async function applyExpansionWorldbookToggles(
  _world: GameWorld,
  _selectedExpansions: string[],
  _worldbookName: string,
): Promise<void> {
  console.warn('[worldExpansions.ts] applyExpansionWorldbookToggles 已废弃，请使用 useWorldbookToggle 组合式函数');

  // 为了向后兼容，保留基本实现
  console.warn('[worldExpansions.ts] 此函数已废弃，请直接使用 useWorldbookToggle 组合式函数');
  throw new Error('此函数已废弃，请使用 useWorldbookToggle 组合式函数中的 applyExpansionToggles 方法');
}
