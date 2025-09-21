import { z } from 'zod';

export const RoleSchema = z.enum(['user', 'assistant']);

export const MessageSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  role: RoleSchema,
  content: z.string().catch(''), // 纯文本内容，用于AI处理和提示词历史
  html: z.string().optional(), // HTML格式内容，用于前端显示
  summary: z
    .object({
      short: z.string().optional(),
      long: z.string().optional(),
    })
    .optional(),
  mvuSnapshot: z.any().optional(),
});

export const SaveDataSchema = z.object({
  slotId: z.string(),
  name: z.string().catch(''),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(MessageSchema).catch([]),
  metadata: z
    .object({
      totalMessages: z.number().default(0),
      lastMessageId: z.string().optional(),
    })
    .optional(),
});

export type SaveData = z.infer<typeof SaveDataSchema>;
export type SaveMessage = z.infer<typeof MessageSchema>;

export function coerceSaveData(input: unknown): SaveData {
  const now = new Date().toISOString();
  const res = SaveDataSchema.safeParse(input);
  if (res.success) return res.data;
  // 最小兜底结构
  return {
    slotId: 'unknown',
    name: '',
    createdAt: now,
    updatedAt: now,
    messages: [],
    metadata: {
      totalMessages: 0,
    },
  };
}

export const SaveSummarySchema = z.object({
  slotId: z.string(),
  name: z.string().catch(''),
  updatedAt: z.string().catch(() => new Date().toISOString()),
  exists: z.boolean().catch(false),
});

export type SaveSummary = z.infer<typeof SaveSummarySchema>;

export const SaveSettingsSchema = z.object({
  auto1: z
    .object({
      enabled: z.boolean().catch(false),
    })
    .catch({ enabled: false }),
});

export type SaveSettings = z.infer<typeof SaveSettingsSchema>;

export function coerceSaveSettings(input: unknown): SaveSettings {
  const res = SaveSettingsSchema.safeParse(input);
  if (res.success) return res.data;
  return { auto1: { enabled: false } };
}

// ==================== 辅助方法 ====================

/**
 * 获取最新统计数据
 */
export function getLatestStatData(saveData: SaveData): any {
  const lastAssistantMessage = [...saveData.messages].reverse().find(msg => msg.role === 'assistant');
  return lastAssistantMessage?.mvuSnapshot || {};
}

/**
 * 获取预览文本
 */
export function getPreview(saveData: SaveData, maxLength: number = 40): string {
  const lastAssistantMessage = [...saveData.messages].reverse().find(msg => msg.role === 'assistant');

  if (!lastAssistantMessage) return '';

  // 优先使用小总结，其次使用HTML内容，最后使用纯文本内容
  const text = lastAssistantMessage.summary?.short || lastAssistantMessage.html || lastAssistantMessage.content;
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}

/**
 * 获取消息总数
 */
export function getTotalMessages(saveData: SaveData): number {
  return saveData.messages.length;
}

/**
 * 获取最后消息ID
 */
export function getLastMessageId(saveData: SaveData): string | undefined {
  const lastMessage = saveData.messages[saveData.messages.length - 1];
  return lastMessage?.id;
}

/**
 * 生成消息ID
 */
export function generateMessageId(): string {
  return crypto.randomUUID();
}

/**
 * 获取消息的显示内容（优先HTML，回退到纯文本）
 */
export function getMessageDisplayContent(message: SaveMessage): string {
  return message.html || message.content || '';
}

/**
 * 获取消息的纯文本内容（用于AI处理）
 */
export function getMessagePlainContent(message: SaveMessage): string {
  return message.content || '';
}

/**
 * 创建消息对象（同时包含纯文本和HTML内容）
 */
export function createMessage(
  role: 'user' | 'assistant',
  content: string,
  html?: string,
  mvuSnapshot?: any,
): Omit<SaveMessage, 'id' | 'timestamp'> {
  return {
    role,
    content,
    html,
    mvuSnapshot,
  };
}

// ==================== 智能历史管理相关类型 ====================

/**
 * 智能历史管理配置
 */
export interface SmartHistoryConfig {
  /** assistant消息条数限制 */
  assistantMessageLimit?: number;
  /** user消息条数限制 */
  userMessageLimit?: number;
  /** 小总结阈值：超过此数量的assistant消息使用summary.short */
  shortSummaryThreshold?: number;
  /** 大总结阈值：超过此数量的assistant消息使用summary.long */
  longSummaryThreshold?: number;
}

/**
 * 智能历史处理结果
 */
export interface SmartHistoryResult {
  prompts: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  stats: {
    totalMessages: number;
    assistantMessages: number;
    userMessages: number;
    usedShortSummary: number;
    usedLongSummary: number;
  };
}

/**
 * 消息内容选择策略
 */
export type MessageContentStrategy = 'content' | 'short' | 'long';

/**
 * 智能处理消息历史，根据消息数量和阈值决定使用完整内容还是摘要
 */
export function processSmartMessageHistory(
  messages: SaveMessage[],
  config: SmartHistoryConfig = {},
): SmartHistoryResult {
  const {
    assistantMessageLimit = 50,
    userMessageLimit = 50,
    shortSummaryThreshold = 20,
    longSummaryThreshold = 50,
  } = config;

  // 按角色分类消息
  const assistantMessages = messages.filter(msg => msg.role === 'assistant');
  const userMessages = messages.filter(msg => msg.role === 'user');

  // 按时间倒序排列（最新的在前）
  const sortedAssistantMessages = [...assistantMessages].reverse();
  const sortedUserMessages = [...userMessages].reverse();

  // 限制消息数量
  const limitedAssistantMessages = sortedAssistantMessages.slice(0, assistantMessageLimit);
  const limitedUserMessages = sortedUserMessages.slice(0, userMessageLimit);

  const prompts: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let usedShortSummary = 0;
  let usedLongSummary = 0;

  // 处理assistant消息
  limitedAssistantMessages.forEach((msg, index) => {
    let content = msg.content || '';

    // 根据位置决定使用哪种内容
    if (index >= longSummaryThreshold && msg.summary?.long) {
      content = msg.summary.long;
      usedLongSummary++;
    } else if (index >= shortSummaryThreshold && msg.summary?.short) {
      content = msg.summary.short;
      usedShortSummary++;
    }

    // 如果摘要为空，回退到完整内容
    if (!content && msg.content) {
      content = msg.content;
    }

    if (content) {
      prompts.push({
        role: 'assistant',
        content,
      });
    }
  });

  // 处理user消息（user消息通常不使用摘要）
  limitedUserMessages.forEach(msg => {
    if (msg.content) {
      prompts.push({
        role: 'user',
        content: msg.content,
      });
    }
  });

  // 按时间顺序重新排列（最旧的在前，最新的在后）
  prompts.sort((a, b) => {
    const aMsg = messages.find(
      msg =>
        msg.role === a.role &&
        (msg.content === a.content || msg.summary?.short === a.content || msg.summary?.long === a.content),
    );
    const bMsg = messages.find(
      msg =>
        msg.role === b.role &&
        (msg.content === b.content || msg.summary?.short === b.content || msg.summary?.long === b.content),
    );

    if (!aMsg || !bMsg) return 0;
    return new Date(aMsg.timestamp).getTime() - new Date(bMsg.timestamp).getTime();
  });

  return {
    prompts,
    stats: {
      totalMessages: messages.length,
      assistantMessages: assistantMessages.length,
      userMessages: userMessages.length,
      usedShortSummary,
      usedLongSummary,
    },
  };
}

/**
 * 获取消息内容选择策略
 */
export function getMessageContentStrategy(
  messageIndex: number,
  shortSummaryThreshold: number = 20,
  longSummaryThreshold: number = 50,
): MessageContentStrategy {
  if (messageIndex >= longSummaryThreshold) {
    return 'long';
  } else if (messageIndex >= shortSummaryThreshold) {
    return 'short';
  } else {
    return 'content';
  }
}
