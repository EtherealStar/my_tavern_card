import { EventBus } from '../core/EventBus';
import type { GameState } from '../models/schemas';

/**
 * WorldbookService - 世界书服务
 *
 * 职责：
 * - 管理世界书的创建和操作
 * - 处理游戏状态的存档和读档
 * - 提供世界书条目的增删改查
 * - 支持多种存档策略
 */
export class WorldbookService {
  private eventBus: EventBus;
  private worldbookName: string | null = null;
  private saveStrategy: 'overwrite' | 'versioned' | 'tagged' = 'tagged';

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    console.log('[WorldbookService] 世界书服务初始化完成');
  }

  /**
   * 确保聊天世界书存在
   * @param chatId 聊天ID，默认为'current'
   */
  async ensureChatWorldbook(chatId: string = 'current'): Promise<string> {
    if (!this.worldbookName) {
      try {
        this.worldbookName = await getOrCreateChatWorldbook(chatId);

        this.eventBus.emit('worldbook:ensured', {
          worldbookName: this.worldbookName,
          chatId,
          timestamp: new Date(),
        });

        console.log('[WorldbookService] 世界书已确保:', this.worldbookName);
      } catch (error) {
        console.error('[WorldbookService] 确保世界书失败:', error);
        this.eventBus.emit('worldbook:error', {
          operation: 'ensureChatWorldbook',
          chatId,
          error,
        });
        throw error;
      }
    }
    return this.worldbookName;
  }

  /**
   * 保存游戏状态
   * @param state 游戏状态
   * @param options 保存选项
   */
  async saveGameState(
    state: GameState,
    options: {
      name?: string;
      description?: string;
      overwrite?: boolean;
    } = {},
  ): Promise<void> {
    try {
      const { name = '同层游玩RPG-存档', description = '自动保存的游戏状态', overwrite = true } = options;

      const worldbookName = await this.ensureChatWorldbook();

      // 创建存档条目
      const saveEntry = this.createSaveEntry(state, name, description);

      // 获取现有世界书
      const worldbook = await getWorldbook(worldbookName);

      // 根据策略处理存档
      const updatedWorldbook = this.applySaveStrategy(worldbook, saveEntry, overwrite);

      // 替换世界书
      await replaceWorldbook(worldbookName, updatedWorldbook);

      this.eventBus.emit('worldbook:game-saved', {
        state,
        entryName: name,
        worldbookName,
        timestamp: new Date(),
      });

      console.log('[WorldbookService] 游戏状态已保存:', name);
    } catch (error) {
      console.error('[WorldbookService] 保存游戏状态失败:', error);
      this.eventBus.emit('worldbook:error', {
        operation: 'saveGameState',
        state,
        options,
        error,
      });
      throw error;
    }
  }

  /**
   * 加载游戏状态
   * @param options 加载选项
   */
  async loadGameState(
    options: {
      name?: string;
      latest?: boolean;
    } = {},
  ): Promise<GameState | null> {
    try {
      const { name = '同层游玩RPG-存档', latest = true } = options;

      const worldbookName = await this.ensureChatWorldbook();
      const worldbook = await getWorldbook(worldbookName);

      // 查找存档条目
      const saveEntries = worldbook.filter(
        entry => entry?.extra?.tag === 'save' && (name ? entry.name === name : true),
      );

      if (saveEntries.length === 0) {
        console.log('[WorldbookService] 未找到存档');
        return null;
      }

      // 选择要加载的存档
      const targetEntry = latest
        ? _.maxBy(saveEntries, entry => entry.uid)
        : saveEntries.find(entry => entry.name === name) || saveEntries[0];

      if (!targetEntry) {
        return null;
      }

      // 解析游戏状态
      const gameState = JSON.parse(targetEntry.content) as GameState;

      this.eventBus.emit('worldbook:game-loaded', {
        gameState,
        entryName: targetEntry.name,
        worldbookName,
        timestamp: new Date(),
      });

      console.log('[WorldbookService] 游戏状态已加载:', targetEntry.name);
      return gameState;
    } catch (error) {
      console.error('[WorldbookService] 加载游戏状态失败:', error);
      this.eventBus.emit('worldbook:error', {
        operation: 'loadGameState',
        options,
        error,
      });
      return null;
    }
  }

  /**
   * 获取所有存档列表
   */
  async getSaveList(): Promise<
    Array<{
      name: string;
      uid: number;
      createdAt: Date;
      description?: string;
    }>
  > {
    try {
      const worldbookName = await this.ensureChatWorldbook();
      const worldbook = await getWorldbook(worldbookName);

      const saveEntries = worldbook
        .filter(entry => entry?.extra?.tag === 'save')
        .map(entry => ({
          name: entry.name,
          uid: entry.uid,
          createdAt: new Date(entry.uid), // UID通常是时间戳
          description: entry.extra?.description,
        }))
        .sort((a, b) => b.uid - a.uid); // 按时间倒序

      this.eventBus.emit('worldbook:save-list-retrieved', {
        count: saveEntries.length,
        worldbookName,
        timestamp: new Date(),
      });

      return saveEntries;
    } catch (error) {
      console.error('[WorldbookService] 获取存档列表失败:', error);
      this.eventBus.emit('worldbook:error', {
        operation: 'getSaveList',
        error,
      });
      return [];
    }
  }

  /**
   * 删除存档
   * @param name 存档名称
   * @param uid 存档UID（可选，用于精确删除）
   */
  async deleteSave(name: string, uid?: number): Promise<boolean> {
    try {
      const worldbookName = await this.ensureChatWorldbook();
      const worldbook = await getWorldbook(worldbookName);

      const filteredWorldbook = worldbook.filter(entry => {
        if (entry?.extra?.tag !== 'save') return true;
        if (entry.name !== name) return true;
        if (uid && entry.uid !== uid) return true;
        return false;
      });

      const deleted = filteredWorldbook.length < worldbook.length;

      if (deleted) {
        await replaceWorldbook(worldbookName, filteredWorldbook);

        this.eventBus.emit('worldbook:save-deleted', {
          name,
          uid,
          worldbookName,
          timestamp: new Date(),
        });

        console.log('[WorldbookService] 存档已删除:', name);
      }

      return deleted;
    } catch (error) {
      console.error('[WorldbookService] 删除存档失败:', error);
      this.eventBus.emit('worldbook:error', {
        operation: 'deleteSave',
        name,
        uid,
        error,
      });
      return false;
    }
  }

  /**
   * 添加世界书条目
   * @param entry 条目数据
   */
  async addEntry(entry: {
    name: string;
    content: string;
    keys?: string[];
    keys_secondary?: { logic: 'and_any' | 'or_all'; keys: string[] };
    enabled?: boolean;
    probability?: number;
    position?: {
      type: 'before_author_note' | 'after_author_note';
      role?: 'system' | 'assistant' | 'user';
      depth?: number;
      order?: number;
    };
    extra?: Record<string, any>;
  }): Promise<void> {
    try {
      const worldbookName = await this.ensureChatWorldbook();
      const worldbook = await getWorldbook(worldbookName);

      const newEntry = {
        name: entry.name,
        enabled: entry.enabled ?? true,
        uid: Date.now(),
        strategy: {
          type: 'constant',
          keys: entry.keys || [],
          keys_secondary: entry.keys_secondary || { logic: 'and_any', keys: [] },
          scan_depth: 1,
        },
        position: entry.position || {
          type: 'after_author_note',
          role: 'assistant',
          depth: 0,
          order: 0,
        },
        content: entry.content,
        probability: entry.probability ?? 100,
        recursion: { prevent_incoming: true, prevent_outgoing: true, delay_until: null },
        effect: { sticky: null, cooldown: null, delay: null },
        extra: entry.extra || {},
      };

      const updatedWorldbook = [...worldbook, newEntry];
      await replaceWorldbook(worldbookName, updatedWorldbook);

      this.eventBus.emit('worldbook:entry-added', {
        entry: newEntry,
        worldbookName,
        timestamp: new Date(),
      });

      console.log('[WorldbookService] 世界书条目已添加:', entry.name);
    } catch (error) {
      console.error('[WorldbookService] 添加世界书条目失败:', error);
      this.eventBus.emit('worldbook:error', {
        operation: 'addEntry',
        entry,
        error,
      });
      throw error;
    }
  }

  /**
   * 更新世界书条目
   * @param name 条目名称
   * @param updates 更新内容
   */
  async updateEntry(
    name: string,
    updates: Partial<{
      content: string;
      keys: string[];
      enabled: boolean;
      probability: number;
    }>,
  ): Promise<boolean> {
    try {
      const worldbookName = await this.ensureChatWorldbook();
      const worldbook = await getWorldbook(worldbookName);

      const entryIndex = worldbook.findIndex(entry => entry.name === name);
      if (entryIndex === -1) {
        return false;
      }

      // 更新条目
      const updatedEntry = { ...worldbook[entryIndex] };
      if (updates.content !== undefined) updatedEntry.content = updates.content;
      if (updates.enabled !== undefined) updatedEntry.enabled = updates.enabled;
      if (updates.probability !== undefined) updatedEntry.probability = updates.probability;
      if (updates.keys !== undefined) updatedEntry.strategy.keys = updates.keys;

      worldbook[entryIndex] = updatedEntry;
      await replaceWorldbook(worldbookName, worldbook);

      this.eventBus.emit('worldbook:entry-updated', {
        name,
        updates,
        worldbookName,
        timestamp: new Date(),
      });

      console.log('[WorldbookService] 世界书条目已更新:', name);
      return true;
    } catch (error) {
      console.error('[WorldbookService] 更新世界书条目失败:', error);
      this.eventBus.emit('worldbook:error', {
        operation: 'updateEntry',
        name,
        updates,
        error,
      });
      return false;
    }
  }

  /**
   * 删除世界书条目
   * @param name 条目名称
   */
  async deleteEntry(name: string): Promise<boolean> {
    try {
      const worldbookName = await this.ensureChatWorldbook();
      const worldbook = await getWorldbook(worldbookName);

      const filteredWorldbook = worldbook.filter(entry => entry.name !== name);
      const deleted = filteredWorldbook.length < worldbook.length;

      if (deleted) {
        await replaceWorldbook(worldbookName, filteredWorldbook);

        this.eventBus.emit('worldbook:entry-deleted', {
          name,
          worldbookName,
          timestamp: new Date(),
        });

        console.log('[WorldbookService] 世界书条目已删除:', name);
      }

      return deleted;
    } catch (error) {
      console.error('[WorldbookService] 删除世界书条目失败:', error);
      this.eventBus.emit('worldbook:error', {
        operation: 'deleteEntry',
        name,
        error,
      });
      return false;
    }
  }

  /**
   * 设置保存策略
   */
  setSaveStrategy(strategy: 'overwrite' | 'versioned' | 'tagged'): void {
    this.saveStrategy = strategy;
    console.log('[WorldbookService] 保存策略设置为:', strategy);
  }

  /**
   * 创建存档条目
   */
  private createSaveEntry(state: GameState, name: string, description: string): any {
    return {
      name,
      enabled: true,
      uid: Date.now(),
      strategy: {
        type: 'constant',
        keys: [],
        keys_secondary: { logic: 'and_any', keys: [] },
        scan_depth: 1,
      },
      position: {
        type: 'after_author_note',
        role: 'assistant',
        depth: 0,
        order: 0,
      },
      content: JSON.stringify(state, null, 2),
      probability: 100,
      recursion: { prevent_incoming: true, prevent_outgoing: true, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null },
      extra: {
        tag: 'save',
        description,
        version: '2.0',
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * 应用保存策略
   */
  private applySaveStrategy(worldbook: any[], saveEntry: any, overwrite: boolean): any[] {
    const existingSaves = worldbook.filter(entry => entry?.extra?.tag === 'save');
    const otherEntries = worldbook.filter(entry => entry?.extra?.tag !== 'save');

    switch (this.saveStrategy) {
      case 'overwrite':
        // 只保留最新的存档
        return [...otherEntries, saveEntry];

      case 'versioned':
        // 保留所有版本，但限制数量
        const maxVersions = 10;
        const sortedSaves = [...existingSaves, saveEntry].sort((a, b) => b.uid - a.uid).slice(0, maxVersions);
        return [...otherEntries, ...sortedSaves];

      case 'tagged':
      default:
        // 根据名称覆盖同名存档
        if (overwrite) {
          const filteredSaves = existingSaves.filter(entry => entry.name !== saveEntry.name);
          return [...otherEntries, ...filteredSaves, saveEntry];
        } else {
          return [...worldbook, saveEntry];
        }
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.worldbookName = null;
    console.log('[WorldbookService] 资源清理完成');
  }
}
