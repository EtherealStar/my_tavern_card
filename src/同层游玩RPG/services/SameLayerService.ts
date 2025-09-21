import { EventBus } from '../core/EventBus';

/**
 * SameLayerService - 同层游玩服务
 *
 * 职责：
 * - 处理同层游玩的消息写回（使用酒馆助手函数）
 * - 管理第0层消息的获取和覆盖
 * - 提供流式和非流式AI生成支持
 * - 不继续生成1层和2层消息
 */
export class SameLayerService {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    console.log('[SameLayerService] 同层游玩服务初始化完成');
  }

  /**
   * 获取AI生成的内容（第0楼消息）
   * @param options 获取选项
   */
  async getAIGeneratedContent(
    options: {
      streaming?: boolean;
      prompt?: string;
      context?: Record<string, any>;
    } = {},
  ): Promise<string> {
    try {
      const { streaming = false, prompt = '', context = {} } = options;

      // 发送生成开始事件
      this.eventBus.emit('same-layer:ai-generation-started', {
        streaming,
        prompt,
        context,
        timestamp: new Date(),
      });

      let generatedText = '';

      if (streaming) {
        // 流式生成
        generatedText = await generate({
          user_input: prompt,
          should_stream: true,
        });
      } else {
        // 非流式生成
        generatedText = await generate({
          user_input: prompt,
          should_stream: false,
        });
      }

      // 发送生成完成事件
      this.eventBus.emit('same-layer:ai-generation-completed', {
        generatedText,
        streaming,
        prompt,
        timestamp: new Date(),
      });

      console.log('[SameLayerService] AI内容生成完成');
      return generatedText;
    } catch (error) {
      console.error('[SameLayerService] AI内容生成失败:', error);
      this.eventBus.emit('same-layer:ai-generation-error', {
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * 获取第0层消息内容
   */
  getLayer0Message(): string {
    try {
      const messages = getChatMessages('0');
      if (messages.length === 0) {
        throw new Error('未找到第0楼消息');
      }

      const msg0 = messages[0];
      return msg0.message;
    } catch (error) {
      console.error('[SameLayerService] 获取第0层消息失败:', error);
      return '';
    }
  }

  /**
   * 覆盖第0层消息内容（不继续生成后续层）
   * @param content 新的消息内容
   * @param data 附加数据
   * @param options 覆盖选项
   */
  async overrideLayer0Message(
    content: string,
    data: Record<string, any> = {},
    options: { refresh?: 'none' | 'affected' | 'all' } = {},
  ): Promise<void> {
    try {
      const { refresh = 'none' } = options;

      // 获取第0楼消息
      const messages = getChatMessages('0');
      if (messages.length === 0) {
        throw new Error('未找到第0楼消息');
      }

      const msg0 = messages[0];
      const oldMessage = msg0.message;
      const oldData = { ...msg0.data };

      // 更新消息内容和数据
      msg0.message = content;
      msg0.data = { ...msg0.data, ...data };

      // 写回消息（不触发后续生成）
      await setChatMessages(
        [
          {
            message_id: 0,
            message: content,
            data: msg0.data,
          },
        ],
        { refresh },
      );

      // 发送事件通知
      this.eventBus.emit('same-layer:layer0-overridden', {
        messageId: 0,
        oldMessage,
        newMessage: content,
        oldData,
        newData: msg0.data,
        timestamp: new Date(),
      });

      console.log('[SameLayerService] 第0层消息已覆盖');
    } catch (error) {
      console.error('[SameLayerService] 覆盖第0层消息失败:', error);
      this.eventBus.emit('same-layer:error', {
        operation: 'overrideLayer0Message',
        error,
        content,
        data,
      });
      throw error;
    }
  }

  /**
   * 生成并覆盖第0层消息（流式）
   * @param prompt 生成提示
   * @param context 上下文数据
   */
  async generateAndOverrideStreaming(prompt: string, context: Record<string, any> = {}): Promise<string> {
    try {
      // 生成内容
      const generatedContent = await this.getAIGeneratedContent({
        streaming: true,
        prompt,
        context,
      });

      // 覆盖第0层消息
      await this.overrideLayer0Message(generatedContent, {
        rpg: context,
        generated_at: new Date().toISOString(),
        type: 'ai_generated_streaming',
      });

      this.eventBus.emit('same-layer:streaming-generation-completed', {
        prompt,
        generatedContent,
        context,
        timestamp: new Date(),
      });

      return generatedContent;
    } catch (error) {
      console.error('[SameLayerService] 流式生成并覆盖失败:', error);
      throw error;
    }
  }

  /**
   * 生成并覆盖第0层消息（非流式）
   * @param prompt 生成提示
   * @param context 上下文数据
   */
  async generateAndOverrideNormal(prompt: string, context: Record<string, any> = {}): Promise<string> {
    try {
      // 生成内容
      const generatedContent = await this.getAIGeneratedContent({
        streaming: false,
        prompt,
        context,
      });

      // 覆盖第0层消息
      await this.overrideLayer0Message(generatedContent, {
        rpg: context,
        generated_at: new Date().toISOString(),
        type: 'ai_generated_normal',
      });

      this.eventBus.emit('same-layer:normal-generation-completed', {
        prompt,
        generatedContent,
        context,
        timestamp: new Date(),
      });

      return generatedContent;
    } catch (error) {
      console.error('[SameLayerService] 普通生成并覆盖失败:', error);
      throw error;
    }
  }

  /**
   * 更新指定楼层的消息
   * @param messageId 消息ID
   * @param updates 要更新的字段
   * @param options 更新选项
   */
  async updateMessage(
    messageId: number,
    updates: Partial<{
      message: string;
      data: Record<string, any>;
      is_hidden: boolean;
      name: string;
    }>,
    options: { refresh?: 'none' | 'affected' | 'all' } = {},
  ): Promise<void> {
    try {
      const { refresh = 'affected' } = options;

      // 获取当前消息
      const messages = getChatMessages(messageId.toString());
      if (messages.length === 0) {
        throw new Error(`未找到消息ID ${messageId}`);
      }

      const message = messages[0];
      const oldMessage = { ...message };

      // 应用更新
      Object.assign(message, updates);

      // 写回消息
      await setChatMessages([{ message_id: messageId, ...updates }], { refresh });

      // 发送事件通知
      this.eventBus.emit('same-layer:message-updated', {
        messageId,
        oldMessage,
        newMessage: message,
        updates,
        timestamp: new Date(),
      });

      console.log('[SameLayerService] 消息已更新:', messageId);
    } catch (error) {
      console.error('[SameLayerService] 更新消息失败:', error);
      this.eventBus.emit('same-layer:error', {
        operation: 'updateMessage',
        messageId,
        updates,
        error,
      });
      throw error;
    }
  }

  /**
   * 创建新消息
   * @param messageData 消息数据
   * @param options 创建选项
   */
  async createMessage(
    messageData: {
      role: 'system' | 'assistant' | 'user';
      message: string;
      name?: string;
      is_hidden?: boolean;
      data?: Record<string, any>;
    },
    options: {
      insert_at?: number | 'end';
      refresh?: 'none' | 'affected' | 'all';
    } = {},
  ): Promise<void> {
    try {
      const { insert_at = 'end', refresh = 'affected' } = options;

      await createChatMessages([messageData], { insert_at, refresh });

      // 发送事件通知
      this.eventBus.emit('same-layer:message-created', {
        messageData,
        options,
        timestamp: new Date(),
      });

      console.log('[SameLayerService] 消息已创建');
    } catch (error) {
      console.error('[SameLayerService] 创建消息失败:', error);
      this.eventBus.emit('same-layer:error', {
        operation: 'createMessage',
        messageData,
        options,
        error,
      });
      throw error;
    }
  }

  /**
   * 删除消息
   * @param messageIds 要删除的消息ID数组
   * @param options 删除选项
   */
  async deleteMessages(messageIds: number[], options: { refresh?: 'none' | 'all' } = {}): Promise<void> {
    try {
      const { refresh = 'all' } = options;

      await deleteChatMessages(messageIds, { refresh });

      // 发送事件通知
      this.eventBus.emit('same-layer:messages-deleted', {
        messageIds,
        timestamp: new Date(),
      });

      console.log('[SameLayerService] 消息已删除:', messageIds);
    } catch (error) {
      console.error('[SameLayerService] 删除消息失败:', error);
      this.eventBus.emit('same-layer:error', {
        operation: 'deleteMessages',
        messageIds,
        error,
      });
      throw error;
    }
  }

  /**
   * 获取消息
   * @param range 消息范围
   * @param options 获取选项
   */
  async getMessages(
    range: string | number,
    options: {
      role?: 'all' | 'system' | 'assistant' | 'user';
      hide_state?: 'all' | 'hidden' | 'unhidden';
      include_swipes?: boolean;
    } = {},
  ): Promise<any[]> {
    try {
      const messages = getChatMessages(range, options);

      // 发送事件通知
      this.eventBus.emit('same-layer:messages-retrieved', {
        range,
        options,
        count: messages.length,
        timestamp: new Date(),
      });

      return messages;
    } catch (error) {
      console.error('[SameLayerService] 获取消息失败:', error);
      this.eventBus.emit('same-layer:error', {
        operation: 'getMessages',
        range,
        options,
        error,
      });
      throw error;
    }
  }

  /**
   * 获取最新消息ID
   */
  getLastMessageId(): number {
    try {
      if (typeof getLastMessageId === 'function') {
        return getLastMessageId();
      } else {
        // 备用方法：获取所有消息并找到最大ID
        const messages = getChatMessages('0-999999');
        return messages.length > 0 ? Math.max(...messages.map(m => m.message_id)) : -1;
      }
    } catch (error) {
      console.error('[SameLayerService] 获取最新消息ID失败:', error);
      return -1;
    }
  }

  /**
   * 批量更新消息数据
   * @param updates 更新数组
   * @param options 更新选项
   */
  async batchUpdateMessages(
    updates: Array<{
      message_id: number;
      message?: string;
      data?: Record<string, any>;
      is_hidden?: boolean;
    }>,
    options: { refresh?: 'none' | 'affected' | 'all' } = {},
  ): Promise<void> {
    try {
      const { refresh = 'affected' } = options;

      await setChatMessages(updates, { refresh });

      // 发送事件通知
      this.eventBus.emit('same-layer:batch-updated', {
        updates,
        count: updates.length,
        timestamp: new Date(),
      });

      console.log('[SameLayerService] 批量消息更新完成:', updates.length);
    } catch (error) {
      console.error('[SameLayerService] 批量更新消息失败:', error);
      this.eventBus.emit('same-layer:error', {
        operation: 'batchUpdateMessages',
        updates,
        error,
      });
      throw error;
    }
  }

  /**
   * 写入游戏状态到同层
   * @param gameState 游戏状态
   * @param message 显示消息
   */
  async writeGameStateToSameLayer(gameState: any, message: string = '游戏状态已更新'): Promise<void> {
    try {
      await this.writeFinalToSameLayer(message, {
        rpg: gameState,
        timestamp: new Date().toISOString(),
        version: '2.0',
      });

      this.eventBus.emit('same-layer:game-state-written', {
        gameState,
        message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[SameLayerService] 写入游戏状态失败:', error);
      throw error;
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    console.log('[SameLayerService] 资源清理完成');
  }
}
