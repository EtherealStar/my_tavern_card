import type { UidToggle } from '../data/worldExpansions';
import type { GameWorld } from '../models/CreationSchemas';

/**
 * 世界书开关操作结果
 */
export type WorldbookToggleResult = {
  success: boolean;
  affectedUids: number[];
  error?: string;
};

/**
 * 世界书开关配置
 */
export type WorldbookToggleConfig = {
  worldbookName: string;
  toggles: UidToggle[];
  atomic?: boolean; // 是否原子操作
};

/**
 * 世界书开关管理组合式函数
 *
 * 功能：
 * 1. 获取角色卡绑定的世界书
 * 2. 按 uid 在世界书中寻找和开关条目
 * 3. 提供出身和扩展的世界书开关管理
 * 4. 支持批量开关操作
 */
export function useWorldbookToggle() {
  /**
   * 获取角色卡绑定的世界书名称
   * 优先使用角色卡的 primary 世界书，其次使用聊天绑定的世界书
   *
   * @returns 绑定的世界书名称，如果没有则返回 null
   */
  const getBoundWorldbookName = async (): Promise<string | null> => {
    try {
      // 1. 尝试获取角色卡绑定的世界书
      const charWorldbooks = getCharWorldbookNames('current');
      if (charWorldbooks.primary) {
        return charWorldbooks.primary;
      }

      // 2. 尝试获取聊天绑定的世界书
      const chatWorldbook = getChatWorldbookName('current');
      if (chatWorldbook) {
        return chatWorldbook;
      }

      console.warn('[useWorldbookToggle] 未找到绑定的世界书');
      return null;
    } catch (error) {
      console.error('[useWorldbookToggle] 获取绑定世界书失败:', error);
      return null;
    }
  };

  /**
   * 按 uid 在世界书中寻找和开关单个条目
   *
   * @param worldbookName 世界书名称
   * @param uid 条目 uid
   * @param enabled 是否启用
   * @returns 操作结果
   */
  const toggleWorldbookEntry = async (
    worldbookName: string,
    uid: number,
    enabled: boolean,
  ): Promise<WorldbookToggleResult> => {
    try {
      await updateWorldbookWith(
        worldbookName,
        worldbook => {
          return worldbook.map(entry => {
            if (entry.uid === uid) {
              return { ...entry, enabled };
            }
            return entry;
          });
        },
        { render: 'immediate' },
      );

      return {
        success: true,
        affectedUids: [uid],
      };
    } catch (error) {
      console.error(`[useWorldbookToggle] 开关条目失败: 世界书=${worldbookName}, uid=${uid}`, error);
      return {
        success: false,
        affectedUids: [],
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  };

  /**
   * 批量开关世界书条目
   *
   * @param worldbookName 世界书名称
   * @param toggles 开关配置列表
   * @param atomic 是否原子操作（默认 true）
   * @returns 操作结果
   */
  const toggleWorldbookEntries = async (
    worldbookName: string,
    toggles: UidToggle[],
    _atomic: boolean = true,
  ): Promise<WorldbookToggleResult> => {
    if (toggles.length === 0) {
      return {
        success: true,
        affectedUids: [],
      };
    }

    try {
      const affectedUids: number[] = [];

      await updateWorldbookWith(
        worldbookName,
        worldbook => {
          return worldbook.map(entry => {
            const toggle = toggles.find(t => t.uid === entry.uid);
            if (toggle) {
              affectedUids.push(entry.uid);
              return { ...entry, enabled: toggle.enable };
            }
            return entry;
          });
        },
        { render: 'immediate' },
      );

      return {
        success: true,
        affectedUids,
      };
    } catch (error) {
      console.error(`[useWorldbookToggle] 批量开关失败: 世界书=${worldbookName}`, error);
      return {
        success: false,
        affectedUids: [],
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  };

  /**
   * 应用出身世界书开关
   * 使用角色卡绑定的世界书，按出身配置开关相应条目
   *
   * @param backgroundId 出身ID
   * @returns 操作结果
   */
  const applyBackgroundToggles = async (backgroundId: string): Promise<WorldbookToggleResult> => {
    try {
      // 1. 获取绑定的世界书
      const worldbookName = await getBoundWorldbookName();
      if (!worldbookName) {
        return {
          success: false,
          affectedUids: [],
          error: '未找到绑定的世界书',
        };
      }

      // 2. 获取出身的世界书开关配置
      const { getBackgroundToggles, getBackgroundExclusiveToggles, getAllOtherBackgroundToggles } = await import(
        '../data/backgrounds'
      );

      const backgroundToggles = getBackgroundToggles(backgroundId);
      const exclusiveToggles = getBackgroundExclusiveToggles(backgroundId);
      const otherBackgroundToggles = getAllOtherBackgroundToggles(backgroundId);

      // 3. 合并所有开关配置
      const allToggles = [...backgroundToggles, ...exclusiveToggles, ...otherBackgroundToggles];

      // 4. 应用开关
      const result = await toggleWorldbookEntries(worldbookName, allToggles);

      return result;
    } catch (error) {
      console.error(`[useWorldbookToggle] 应用出身世界书开关失败: 出身=${backgroundId}`, error);
      return {
        success: false,
        affectedUids: [],
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  };

  /**
   * 应用扩展世界书开关
   * 使用角色卡绑定的世界书，按扩展配置开关相应条目
   *
   * @param world 世界类型
   * @param selectedExpansions 选择的扩展ID列表
   * @returns 操作结果
   */
  const applyExpansionToggles = async (
    world: GameWorld,
    selectedExpansions: string[],
  ): Promise<WorldbookToggleResult> => {
    try {
      // 1. 获取绑定的世界书
      const worldbookName = await getBoundWorldbookName();
      if (!worldbookName) {
        return {
          success: false,
          affectedUids: [],
          error: '未找到绑定的世界书',
        };
      }

      // 2. 获取扩展的世界书开关配置
      const { getWorldExpansions } = await import('../data/worldExpansions');
      const allExpansions = getWorldExpansions(world);

      // 3. 构建所有扩展的开关计划（使用去重映射，确保最终状态唯一且可覆盖）
      const toggleMap = new Map<number, boolean>();

      for (const expansion of allExpansions) {
        const isSelected = selectedExpansions.includes(expansion.id);

        // 根据是否选中来决定开关状态（扩展自身声明的 toggles）
        for (const toggle of expansion.toggles) {
          toggleMap.set(toggle.uid, isSelected ? toggle.enable : false);
        }

        // 处理互斥对：选中 → base 关 / expansion 开；未选中 → base 开 / expansion 关
        if (expansion.mutex && expansion.mutex.length > 0) {
          for (const pair of expansion.mutex) {
            if (isSelected) {
              toggleMap.set(pair.baseUid, false);
              toggleMap.set(pair.expansionUid, true);
            } else {
              toggleMap.set(pair.baseUid, true);
              toggleMap.set(pair.expansionUid, false);
            }
          }
        }
      }

      const allToggles = Array.from(toggleMap.entries()).map(([uid, enable]) => ({ uid, enable }));

      // 4. 应用开关
      const result = await toggleWorldbookEntries(worldbookName, allToggles);

      return result;
    } catch (error) {
      console.error(`[useWorldbookToggle] 应用扩展世界书开关失败: 世界=${world}`, error);
      return {
        success: false,
        affectedUids: [],
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  };

  /**
   * 获取世界书条目的启用状态
   *
   * @param worldbookName 世界书名称
   * @param uid 条目 uid
   * @returns 条目是否启用，如果条目不存在则返回 null
   */
  const getWorldbookEntryStatus = async (worldbookName: string, uid: number): Promise<boolean | null> => {
    try {
      const worldbook = await getWorldbook(worldbookName);
      const entry = worldbook.find(e => e.uid === uid);
      return entry ? entry.enabled : null;
    } catch (error) {
      console.error(`[useWorldbookToggle] 获取条目状态失败: 世界书=${worldbookName}, uid=${uid}`, error);
      return null;
    }
  };

  /**
   * 获取世界书中所有条目的状态
   *
   * @param worldbookName 世界书名称
   * @returns 条目状态映射 {uid: enabled}
   */
  const getAllWorldbookEntryStatuses = async (worldbookName: string): Promise<Record<number, boolean>> => {
    try {
      const worldbook = await getWorldbook(worldbookName);
      const statusMap: Record<number, boolean> = {};

      worldbook.forEach(entry => {
        statusMap[entry.uid] = entry.enabled;
      });

      return statusMap;
    } catch (error) {
      console.error(`[useWorldbookToggle] 获取所有条目状态失败: 世界书=${worldbookName}`, error);
      return {};
    }
  };

  return {
    // 核心功能
    getBoundWorldbookName,
    toggleWorldbookEntry,
    toggleWorldbookEntries,

    // 业务功能
    applyBackgroundToggles,
    applyExpansionToggles,

    // 查询功能
    getWorldbookEntryStatus,
    getAllWorldbookEntryStatuses,
  };
}
