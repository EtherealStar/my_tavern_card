import { injectable } from 'inversify';
import {
  generateMessageId,
  getLastMessageId,
  SaveData,
  SaveDataSchema,
  SaveMessage,
  SaveSummary,
} from '../models/SaveSchemas';

/**
 * 存档标识符（支持slotId和存档名）
 */
export type SaveIdentifier = string | { slotId?: string; saveName?: string };

/**
 * 读档结果
 */
export interface LoadResult {
  success: boolean;
  data?: SaveData;
  error?: string;
}

/**
 * 游戏数据接口
 */
export interface GameData {
  messages: SaveMessage[];
  statData: any;
  mvuSnapshots: any[];
}

/**
 * 游戏数据提供者接口
 */
export interface GameDataProvider {
  getMessages(): SaveMessage[];
  getStatData(): any;
  getMVUSnapshots(): any[];
}

type TxMode = 'readonly' | 'readwrite';

/**
 * 存读档功能集中管理服务
 *
 * 统一管理所有存读档相关功能，包括：
 * - 存档管理（创建、删除、重命名、列表）
 * - 读档管理（加载、验证）
 * - IndexedDB 数据访问
 * - 游戏状态管理
 *
 * 设计原则：
 * - 服务层不直接与UI层交互
 * - 使用crypto生成标准UUID作为slotId
 * - 统一使用ISO时间戳格式
 * - 支持通过slotId或存档名进行查找
 */
@injectable()
export class SaveLoadManagerService {
  // IndexedDB 相关属性（整合自 IndexedDBSaveService）
  private db: IDBDatabase | null = null;
  private readonly dbName = 'tavern_rpg_saves';
  private readonly dbVersion = 1;
  private readonly stores = { saves: 'saves', settings: 'settings' } as const;
  private _isReady = false;

  constructor() {
    // 移除构造函数中的异步初始化，改为懒加载
  }

  /**
   * 初始化数据库
   */
  public async init(): Promise<void> {
    if (this.db) return;

    const maxRetries = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SaveLoadManagerService] 初始化数据库 (尝试 ${attempt}/${maxRetries})`);
        this.db = await this.openDb();
        this._isReady = true;
        console.log('[SaveLoadManagerService] 数据库初始化成功');
        return;
      } catch (error) {
        console.error(`[SaveLoadManagerService] 数据库初始化失败 (尝试 ${attempt}/${maxRetries}):`, error);

        if (attempt === maxRetries) {
          throw new Error(`数据库初始化失败，已重试 ${maxRetries} 次: ${error}`);
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  /**
   * 检查服务是否已初始化并准备就绪
   */
  public isReady(): boolean {
    return this._isReady && this.db !== null;
  }

  /**
   * 等待服务就绪
   */
  public async waitForReady(timeout: number = 10000): Promise<boolean> {
    if (this.isReady()) return true;

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (this.isReady()) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  /**
   * 打开数据库
   */
  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.stores.saves)) {
          db.createObjectStore(this.stores.saves, { keyPath: 'slotId' });
        }
        if (!db.objectStoreNames.contains(this.stores.settings)) {
          db.createObjectStore(this.stores.settings, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 创建事务
   */
  private tx<T>(store: keyof SaveLoadManagerService['stores'], mode: TxMode, work: (store: IDBObjectStore) => T): T {
    if (!this.db) throw new Error('IndexedDB not initialized');
    const tx = this.db.transaction(this.stores[store], mode);
    const os = tx.objectStore(this.stores[store]);
    return work(os);
  }

  /**
   * 获取存档数据
   */
  public async getSlot(slotId: string): Promise<SaveData | null> {
    await this.init();
    return await new Promise((resolve, reject) => {
      try {
        const req = this.tx('saves', 'readonly', s => s.get(slotId) as IDBRequest);
        req.onsuccess = () => {
          const v = req.result;
          if (!v) return resolve(null);
          const parsed = SaveDataSchema.safeParse(v);
          resolve(parsed.success ? parsed.data : (v as SaveData));
        };
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 保存存档数据
   */
  public async putSlot(data: SaveData): Promise<void> {
    await this.init();
    return await new Promise((resolve, reject) => {
      try {
        const req = this.tx('saves', 'readwrite', s => s.put(data) as IDBRequest);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 删除存档数据
   */
  public async deleteSlot(slotId: string): Promise<void> {
    await this.init();
    return await new Promise((resolve, reject) => {
      try {
        const req = this.tx('saves', 'readwrite', s => s.delete(slotId) as IDBRequest);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 获取设置
   */
  public async getSetting<T = unknown>(key: string): Promise<T | null> {
    await this.init();
    return await new Promise((resolve, reject) => {
      try {
        const req = this.tx('settings', 'readonly', s => s.get(key) as IDBRequest);
        req.onsuccess = () => {
          const v = req.result;
          resolve(v ? (v.value as T) : null);
        };
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 设置设置
   */
  public async setSetting<T = unknown>(key: string, value: T): Promise<void> {
    await this.init();
    return await new Promise((resolve, reject) => {
      try {
        const req = this.tx('settings', 'readwrite', s => s.put({ key, value }) as IDBRequest);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 导出存档（预留接口）
   */
  public async exportSlot(slotId: string): Promise<SaveData | null> {
    return await this.getSlot(slotId);
  }

  /**
   * 导入存档（预留接口）
   */
  public async importSlot(slotId: string, data: SaveData): Promise<void> {
    await this.putSlot({ ...data, slotId });
  }

  /**
   * 创建存档
   */
  async createSave(saveName: string, gameData: GameData): Promise<SaveData> {
    const startTime = Date.now();
    console.log(`[SaveLoadManager] 开始创建存档: ${saveName}`);

    try {
      // 1. 检查存档名是否已存在
      const existingSlotId = await this.findSlotIdBySaveName(saveName);
      if (existingSlotId) {
        const error = new Error('DUPLICATE_NAME');
        error.name = 'DUPLICATE_NAME';
        throw error;
      }

      // 2. 生成slotId和时间戳
      const slotId = this.generateSlotId();
      const timestamp = this.generateTimestamp();

      // 3. 处理消息数据
      const processedMessages = gameData.messages.map(msg => {
        const role = this.normalizeRole(msg.role);
        return {
          ...msg,
          id: msg.id || generateMessageId(),
          timestamp: msg.timestamp || timestamp,
          role: role,
          content: msg.content || '',
        };
      });

      // 4. 创建存档数据
      const saveData: SaveData = {
        slotId,
        name: saveName,
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: processedMessages,
        metadata: {
          totalMessages: processedMessages.length,
          lastMessageId: getLastMessageId({ messages: processedMessages } as SaveData),
        },
      };

      // 5. 保存到IndexedDB
      await this.putSlot(saveData);

      const duration = Date.now() - startTime;
      console.log(`[SaveLoadManager] 存档创建成功: ${saveName} (耗时: ${duration}ms)`);
      return saveData;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[SaveLoadManager] 存档创建失败: ${saveName} (耗时: ${duration}ms)`, error);
      throw error;
    }
  }

  /**
   * 删除单个存档
   */
  async deleteSave(identifier: SaveIdentifier): Promise<void> {
    try {
      // 1. 解析存档标识符
      const slotId = await this.resolveSaveIdentifier(identifier);
      if (!slotId) {
        throw new Error('存档不存在');
      }

      // 2. 获取存档数据以获取存档名称
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        throw new Error('存档不存在');
      }

      // 3. 删除IndexDB存档
      await this.deleteSlot(slotId);

      console.log(`[SaveLoadManager] 成功删除存档: ${saveData.name}`);
    } catch (error) {
      console.error(`[SaveLoadManager] 删除存档失败:`, error);
      throw error;
    }
  }

  /**
   * 批量删除存档
   */
  async deleteSaves(identifiers: SaveIdentifier[]): Promise<void> {
    const saveNames: string[] = [];

    try {
      // 1. 解析所有存档标识符并收集存档名称
      for (const identifier of identifiers) {
        const slotId = await this.resolveSaveIdentifier(identifier);
        if (slotId) {
          const saveData = await this.getSlot(slotId);
          if (saveData?.name) {
            saveNames.push(saveData.name);
          }
        }
      }

      // 2. 删除所有存档
      for (const identifier of identifiers) {
        await this.deleteSave(identifier);
      }

      console.log(`[SaveLoadManager] 批量删除存档完成: ${identifiers.length} 个`);
    } catch (error) {
      console.error(`[SaveLoadManager] 批量删除存档失败:`, error);
      throw error;
    }
  }

  /**
   * 重命名存档
   */
  async renameSave(identifier: SaveIdentifier, newName: string): Promise<void> {
    try {
      // 1. 解析存档标识符
      const slotId = await this.resolveSaveIdentifier(identifier);
      if (!slotId) {
        throw new Error('存档不存在');
      }

      // 2. 获取存档数据
      const data = await this.getSlot(slotId);
      if (!data) {
        throw new Error('存档不存在');
      }

      // 3. 更新存档名称和时间戳
      const updatedData = {
        ...data,
        name: newName,
        updatedAt: this.generateTimestamp(),
      };

      await this.putSlot(updatedData);
      console.log(`[SaveLoadManager] 成功重命名存档: ${data.name} -> ${newName}`);
    } catch (error) {
      console.error(`[SaveLoadManager] 重命名存档失败:`, error);
      throw error;
    }
  }

  /**
   * 获取存档列表
   */
  async listSaves(): Promise<SaveSummary[]> {
    try {
      await this.init();
      return await new Promise((resolve, reject) => {
        try {
          const out: SaveSummary[] = [];
          const req = this.tx('saves', 'readonly', s => s.openCursor() as IDBRequest<IDBCursorWithValue | null>);
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              const v = cursor.value as SaveData;
              out.push({
                slotId: v.slotId,
                name: v.name,
                updatedAt: v.updatedAt,
                exists: true,
              });
              cursor.continue();
            } else {
              resolve(out);
            }
          };
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });
    } catch (error) {
      console.error('[SaveLoadManager] 获取存档列表失败:', error);
      return [];
    }
  }

  /**
   * 生成slotId（使用crypto生成标准UUID）
   */
  private generateSlotId(): string {
    return crypto.randomUUID();
  }

  /**
   * 生成ISO时间戳
   */
  private generateTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * 解析存档标识符，返回实际的slotId
   */
  private async resolveSaveIdentifier(identifier: SaveIdentifier): Promise<string | null> {
    if (typeof identifier === 'string') {
      // 优先作为slotId查找
      const bySlotId = await this.getSlot(identifier);
      if (bySlotId) return identifier;

      // 如果slotId不存在，作为存档名查找
      return await this.findSlotIdBySaveName(identifier);
    }

    // 对象形式：优先slotId，其次存档名
    if (identifier.slotId) {
      const bySlotId = await this.getSlot(identifier.slotId);
      if (bySlotId) return identifier.slotId;
    }

    if (identifier.saveName) {
      return await this.findSlotIdBySaveName(identifier.saveName);
    }

    return null;
  }

  // ==================== 读档管理 ====================

  /**
   * 加载存档数据
   */
  async loadSave(identifier: SaveIdentifier): Promise<LoadResult> {
    try {
      // 1. 解析存档标识符
      const slotId = await this.resolveSaveIdentifier(identifier);
      if (!slotId) {
        return {
          success: false,
          error: '存档不存在',
        };
      }

      // 2. 获取存档数据
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        return {
          success: false,
          error: '存档不存在',
        };
      }

      // 3. 验证存档数据
      if (!this.validateSaveData(saveData)) {
        return {
          success: false,
          error: '存档数据无效',
        };
      }

      return {
        success: true,
        data: saveData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '读档失败';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 验证存档数据
   */
  validateSaveData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.name || typeof data.name !== 'string') {
      return false;
    }

    if (!Array.isArray(data.messages)) {
      return false;
    }

    // 验证消息格式
    for (const message of data.messages) {
      if (!message || typeof message !== 'object') {
        return false;
      }
      if (!['user', 'assistant'].includes(message.role)) {
        return false;
      }
      if (typeof message.content !== 'string') {
        return false;
      }
      if (!message.id || typeof message.id !== 'string') {
        return false;
      }
      if (!message.timestamp || typeof message.timestamp !== 'string') {
        return false;
      }
    }

    return true;
  }

  /**
   * 标准化角色类型
   */
  private normalizeRole(role: any): 'user' | 'assistant' {
    if (role === 'assistant') {
      return 'assistant';
    }
    return 'user';
  }

  /**
   * 更新游戏状态（已移除持久化，仅用于兼容性）
   */
  async updateGameState(data: SaveData): Promise<boolean> {
    try {
      // 游戏状态不再持久化，此方法保留用于兼容性
      console.log('[SaveLoadManager] 游戏状态不再持久化，存档信息:', data.name);
      return true;
    } catch (error) {
      console.error('[SaveLoadManager] 更新游戏状态失败:', error);
      return false;
    }
  }

  /**
   * 检查存档可用性
   */
  async checkSaveAvailability(): Promise<boolean> {
    try {
      // 通过检查存档列表来判断是否有可用存档
      const saves = await this.listSaves();
      return saves.length > 0;
    } catch (error) {
      console.error('[SaveLoadManager] 检查存档可用性失败:', error);
      return false;
    }
  }

  /**
   * 加载游戏数据（兼容旧接口）
   * 从开始界面读档时使用，只更新游戏状态，不处理UI消息恢复
   * UI消息恢复由组合式函数层的loadToUI处理
   */
  async loadGame(data: any): Promise<boolean> {
    try {
      // 验证数据
      if (!this.validateSaveData(data)) {
        throw new Error('存档数据格式无效');
      }

      // 更新游戏状态
      const stateSuccess = await this.updateGameState(data);
      if (!stateSuccess) {
        console.warn('[SaveLoadManager] 状态更新失败，继续执行');
      }

      console.log('[SaveLoadManager] 游戏数据加载成功，游戏状态已更新');
      return true;
    } catch (error) {
      console.error('[SaveLoadManager] 加载游戏数据失败:', error);
      return false;
    }
  }

  /**
   * 根据存档名称查找对应的slotId
   */
  async findSlotIdBySaveName(saveName: string): Promise<string | null> {
    try {
      const summaries = await this.listSaves();
      const match = summaries.find(summary => summary.name === saveName);
      return match ? match.slotId : null;
    } catch (error) {
      console.error('[SaveLoadManager] 查找slotId失败:', error);
      return null;
    }
  }

  // ==================== 消息管理 ====================

  /**
   * 添加消息到存档
   */
  async addMessage(slotId: string, message: Omit<SaveMessage, 'id' | 'timestamp'>): Promise<SaveMessage> {
    try {
      // 1. 获取存档数据
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        throw new Error('存档不存在');
      }

      // 2. 创建新消息
      const newMessage: SaveMessage = {
        ...message,
        id: generateMessageId(),
        timestamp: this.generateTimestamp(),
      };

      // 3. 添加到消息数组
      const updatedMessages = [...saveData.messages, newMessage];

      // 4. 更新存档数据
      const updatedSaveData: SaveData = {
        ...saveData,
        messages: updatedMessages,
        updatedAt: this.generateTimestamp(),
        metadata: {
          totalMessages: updatedMessages.length,
          lastMessageId: newMessage.id,
        },
      };

      // 5. 保存到IndexedDB
      await this.putSlot(updatedSaveData);

      console.log(`[SaveLoadManager] 成功添加消息到存档: ${slotId}`);
      return newMessage;
    } catch (error) {
      console.error(`[SaveLoadManager] 添加消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 添加用户消息
   */
  async addUserMessage(slotId: string, content: string, html?: string): Promise<SaveMessage> {
    return await this.addMessage(slotId, {
      role: 'user',
      content,
      html,
    });
  }

  /**
   * 添加助手消息
   */
  async addAssistantMessage(slotId: string, content: string, html?: string, mvuSnapshot?: any): Promise<SaveMessage> {
    return await this.addMessage(slotId, {
      role: 'assistant',
      content,
      html,
      mvuSnapshot,
    });
  }

  /**
   * 删除消息
   */
  async deleteMessage(slotId: string, messageId: string): Promise<boolean> {
    try {
      // 1. 获取存档数据
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        throw new Error('存档不存在');
      }

      // 2. 查找并删除消息
      const messageIndex = saveData.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        return false; // 消息不存在
      }

      const updatedMessages = saveData.messages.filter(msg => msg.id !== messageId);

      // 3. 更新存档数据
      const updatedSaveData: SaveData = {
        ...saveData,
        messages: updatedMessages,
        updatedAt: this.generateTimestamp(),
        metadata: {
          totalMessages: updatedMessages.length,
          lastMessageId: updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1].id : undefined,
        },
      };

      // 4. 保存到IndexedDB
      await this.putSlot(updatedSaveData);

      console.log(`[SaveLoadManager] 成功删除消息: ${messageId} from ${slotId}`);
      return true;
    } catch (error) {
      console.error(`[SaveLoadManager] 删除消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 批量删除消息
   */
  async deleteMessages(slotId: string, messageIds: string[]): Promise<number> {
    try {
      // 1. 获取存档数据
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        throw new Error('存档不存在');
      }

      // 2. 过滤掉要删除的消息
      const updatedMessages = saveData.messages.filter(msg => !messageIds.includes(msg.id));
      const deletedCount = saveData.messages.length - updatedMessages.length;

      if (deletedCount === 0) {
        return 0; // 没有消息被删除
      }

      // 3. 更新存档数据
      const updatedSaveData: SaveData = {
        ...saveData,
        messages: updatedMessages,
        updatedAt: this.generateTimestamp(),
        metadata: {
          totalMessages: updatedMessages.length,
          lastMessageId: updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1].id : undefined,
        },
      };

      // 4. 保存到IndexedDB
      await this.putSlot(updatedSaveData);

      console.log(`[SaveLoadManager] 成功批量删除消息: ${deletedCount} 条 from ${slotId}`);
      return deletedCount;
    } catch (error) {
      console.error(`[SaveLoadManager] 批量删除消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 删除最后一条消息
   */
  async deleteLastMessage(slotId: string): Promise<SaveMessage | null> {
    try {
      // 1. 获取存档数据
      const saveData = await this.getSlot(slotId);
      if (!saveData || saveData.messages.length === 0) {
        return null;
      }

      // 2. 获取最后一条消息
      const lastMessage = saveData.messages[saveData.messages.length - 1];

      // 3. 删除最后一条消息
      const success = await this.deleteMessage(slotId, lastMessage.id);
      return success ? lastMessage : null;
    } catch (error) {
      console.error(`[SaveLoadManager] 删除最后消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 清空所有消息
   */
  async clearMessages(slotId: string): Promise<number> {
    try {
      // 1. 获取存档数据
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        throw new Error('存档不存在');
      }

      const messageCount = saveData.messages.length;

      // 2. 更新存档数据
      const updatedSaveData: SaveData = {
        ...saveData,
        messages: [],
        updatedAt: this.generateTimestamp(),
        metadata: {
          totalMessages: 0,
          lastMessageId: undefined,
        },
      };

      // 3. 保存到IndexedDB
      await this.putSlot(updatedSaveData);

      console.log(`[SaveLoadManager] 成功清空消息: ${messageCount} 条 from ${slotId}`);
      return messageCount;
    } catch (error) {
      console.error(`[SaveLoadManager] 清空消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 获取最后一条消息
   */
  async getLastMessage(slotId: string): Promise<SaveMessage | null> {
    try {
      const saveData = await this.getSlot(slotId);
      if (!saveData || saveData.messages.length === 0) {
        return null;
      }
      return saveData.messages[saveData.messages.length - 1];
    } catch (error) {
      console.error(`[SaveLoadManager] 获取最后消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 获取最后一条消息的内容（用于文本概览）
   */
  async getLastMessageContent(slotId: string): Promise<string> {
    try {
      const lastMessage = await this.getLastMessage(slotId);
      return lastMessage?.content || '';
    } catch (error) {
      console.error(`[SaveLoadManager] 获取最后消息内容失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 获取最后一条助手消息
   */
  async getLastAssistantMessage(slotId: string): Promise<SaveMessage | null> {
    try {
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        return null;
      }

      // 从后往前查找最后一条assistant消息
      for (let i = saveData.messages.length - 1; i >= 0; i--) {
        if (saveData.messages[i].role === 'assistant') {
          return saveData.messages[i];
        }
      }
      return null;
    } catch (error) {
      console.error(`[SaveLoadManager] 获取最后助手消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 获取最后一条用户消息
   */
  async getLastUserMessage(slotId: string): Promise<SaveMessage | null> {
    try {
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        return null;
      }

      // 从后往前查找最后一条user消息
      for (let i = saveData.messages.length - 1; i >= 0; i--) {
        if (saveData.messages[i].role === 'user') {
          return saveData.messages[i];
        }
      }
      return null;
    } catch (error) {
      console.error(`[SaveLoadManager] 获取最后用户消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 按角色获取消息
   */
  async getMessagesByRole(slotId: string, role: 'user' | 'assistant'): Promise<SaveMessage[]> {
    try {
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        return [];
      }
      return saveData.messages.filter(msg => msg.role === role);
    } catch (error) {
      console.error(`[SaveLoadManager] 按角色获取消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 根据ID获取消息
   */
  async getMessageById(slotId: string, messageId: string): Promise<SaveMessage | null> {
    try {
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        return null;
      }
      return saveData.messages.find(msg => msg.id === messageId) || null;
    } catch (error) {
      console.error(`[SaveLoadManager] 根据ID获取消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 更新消息
   */
  async updateMessage(slotId: string, messageId: string, updates: Partial<SaveMessage>): Promise<boolean> {
    try {
      // 1. 获取存档数据
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        throw new Error('存档不存在');
      }

      // 2. 查找消息
      const messageIndex = saveData.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        return false; // 消息不存在
      }

      // 3. 更新消息
      const updatedMessages = [...saveData.messages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        ...updates,
        id: messageId, // 确保ID不被修改
      };

      // 4. 更新存档数据
      const updatedSaveData: SaveData = {
        ...saveData,
        messages: updatedMessages,
        updatedAt: this.generateTimestamp(),
      };

      // 5. 保存到IndexedDB
      await this.putSlot(updatedSaveData);

      console.log(`[SaveLoadManager] 成功更新消息: ${messageId} in ${slotId}`);
      return true;
    } catch (error) {
      console.error(`[SaveLoadManager] 更新消息失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 更新消息内容
   */
  async updateMessageContent(slotId: string, messageId: string, content: string): Promise<boolean> {
    return await this.updateMessage(slotId, messageId, { content });
  }

  /**
   * 更新消息HTML内容
   */
  async updateMessageHtml(slotId: string, messageId: string, html: string): Promise<boolean> {
    return await this.updateMessage(slotId, messageId, { html });
  }

  /**
   * 同时更新消息的纯文本和HTML内容
   */
  async updateMessageContentAndHtml(
    slotId: string,
    messageId: string,
    content: string,
    html: string,
  ): Promise<boolean> {
    return await this.updateMessage(slotId, messageId, { content, html });
  }

  /**
   * 添加消息短摘要
   */
  async addMessageShortSummary(slotId: string, messageId: string, shortSummary: string): Promise<boolean> {
    try {
      const message = await this.getMessageById(slotId, messageId);
      if (!message) {
        return false;
      }

      const currentSummary = message.summary || {};
      return await this.updateMessage(slotId, messageId, {
        summary: {
          ...currentSummary,
          short: shortSummary,
        },
      });
    } catch (error) {
      console.error(`[SaveLoadManager] 添加消息短摘要失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 添加消息长摘要
   */
  async addMessageLongSummary(slotId: string, messageId: string, longSummary: string): Promise<boolean> {
    try {
      const message = await this.getMessageById(slotId, messageId);
      if (!message) {
        return false;
      }

      const currentSummary = message.summary || {};
      return await this.updateMessage(slotId, messageId, {
        summary: {
          ...currentSummary,
          long: longSummary,
        },
      });
    } catch (error) {
      console.error(`[SaveLoadManager] 添加消息长摘要失败: ${slotId}`, error);
      throw error;
    }
  }

  // ==================== MVU快照查询接口 ====================

  /**
   * 获取存档中所有消息的 MVU 快照
   */
  async getMVUSnapshots(slotId: string): Promise<any[]> {
    try {
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        return [];
      }

      // 提取所有消息中的 MVU 快照
      const snapshots = saveData.messages
        .filter(msg => msg.mvuSnapshot !== undefined && msg.mvuSnapshot !== null)
        .map(msg => msg.mvuSnapshot);

      console.log(`[SaveLoadManager] 获取到 ${snapshots.length} 个 MVU 快照 from ${slotId}`);
      return snapshots;
    } catch (error) {
      console.error(`[SaveLoadManager] 获取 MVU 快照失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 获取存档中所有助手消息的 MVU 快照
   */
  async getAssistantMVUSnapshots(slotId: string): Promise<any[]> {
    try {
      const saveData = await this.getSlot(slotId);
      if (!saveData) {
        return [];
      }

      // 提取所有助手消息中的 MVU 快照
      const snapshots = saveData.messages
        .filter(msg => msg.role === 'assistant' && msg.mvuSnapshot !== undefined && msg.mvuSnapshot !== null)
        .map(msg => msg.mvuSnapshot);

      console.log(`[SaveLoadManager] 获取到 ${snapshots.length} 个助手 MVU 快照 from ${slotId}`);
      return snapshots;
    } catch (error) {
      console.error(`[SaveLoadManager] 获取助手 MVU 快照失败: ${slotId}`, error);
      throw error;
    }
  }

  /**
   * 获取存档中最新的 MVU 快照（无论角色是 assistant 还是 user）
   */
  async getLatestMVUSnapshot(slotId: string): Promise<any | null> {
    try {
      const saveData = await this.getSlot(slotId);
      if (!saveData || saveData.messages.length === 0) {
        return null;
      }

      // 从后往前查找最新的有 MVU 快照的消息
      for (let i = saveData.messages.length - 1; i >= 0; i--) {
        const message = saveData.messages[i];
        if (message.mvuSnapshot !== undefined && message.mvuSnapshot !== null) {
          console.log(`[SaveLoadManager] 找到最新 MVU 快照 from ${slotId}, 角色: ${message.role}`);
          return message.mvuSnapshot;
        }
      }

      console.log(`[SaveLoadManager] 未找到 MVU 快照 from ${slotId}`);
      return null;
    } catch (error) {
      console.error(`[SaveLoadManager] 获取最新 MVU 快照失败: ${slotId}`, error);
      throw error;
    }
  }
}
