import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { SaveMessage, SmartHistoryConfig, SmartHistoryResult, processSmartMessageHistory } from '../models/SaveSchemas';
import type { SaveLoadManagerService } from './SaveLoadManagerService';

const TextSchema = z.string().min(1);

// 新增类型定义
interface GenerationResult {
  html: string;
  newMvuData?: Mvu.MvuData;
}

interface StreamGenerationResult {
  abort: () => void;
  cleanup: () => void;
  getResult: () => Promise<GenerationResult | null>;
}

@injectable()
export class SameLayerService {
  private currentStreamHandle: { abort: () => void; cleanup: () => void } | null = null;
  /** 存储最后生成的AI纯文本，供SaveLoadManagerService调用 */
  private lastAIGeneratedPlainText: string = '';

  constructor(
    @inject(TYPES.EventBus) private eventBus: EventBus,
    @inject(TYPES.SaveLoadManagerService) private saveLoadManager: SaveLoadManagerService,
  ) {}

  /**
   * 使用酒馆助手生成一段文本（非流式）
   */
  public async generate(config: any): Promise<string> {
    try {
      const payload = { ...(config ?? {}), should_stream: false };
      const win: any = window as any;
      if (win?.TavernHelper?.generate) {
        return await win.TavernHelper.generate(payload);
      }
    } catch (_) {
      /* ignore */
    }
    return '';
  }

  /**
   * 以流式方式生成文本，并通过回调暴露流式内容与结束事件。
   * 返回值提供 abort/cleanup 以便外部停止与卸载监听。
   */
  public stream(
    config: any,
    handlers: {
      onStart?: () => void;
      onFullText?: (text: string) => void;
      onIncremental?: (text: string) => void;
      onEnd?: (finalText: string) => void;
    } = {},
  ): { abort: () => void; cleanup: () => void } {
    const win: any = window as any;
    const eventOn: any = win?.eventOn;
    const eventRemoveListener: any = win?.eventRemoveListener;

    // 使用字符串常量以避免运行期缺少 iframe_events 变量
    const EVT_STARTED = 'js_generation_started';
    const EVT_FULL = 'js_stream_token_received_fully';
    const EVT_INC = 'js_stream_token_received_incrementally';
    const EVT_END = 'js_generation_ended';

    const fullListener = (text: string) => handlers?.onFullText?.(text);
    const incListener = (text: string) => handlers?.onIncremental?.(text);
    const endListener = (text: string) => {
      try {
        handlers?.onEnd?.(text);
      } finally {
        cleanup();
      }
    };
    const startListener = () => handlers?.onStart?.();

    try {
      eventOn?.(EVT_STARTED, startListener);
      eventOn?.(EVT_FULL, fullListener);
      eventOn?.(EVT_INC, incListener);
      eventOn?.(EVT_END, endListener);
    } catch (_) {
      /* ignore */
    }

    const payload = { ...(config ?? {}), should_stream: true };
    try {
      if (win?.TavernHelper?.generate) {
        // 忽略返回值，结束由事件驱动
        void win.TavernHelper.generate(payload);
      }
    } catch (_) {
      /* ignore */
    }

    function cleanup() {
      try {
        eventRemoveListener?.(EVT_STARTED, startListener);
      } catch {
        /* no-op */ void 0;
      }
      try {
        eventRemoveListener?.(EVT_FULL, fullListener);
      } catch {
        /* no-op */ void 0;
      }
      try {
        eventRemoveListener?.(EVT_INC, incListener);
      } catch {
        /* no-op */ void 0;
      }
      try {
        eventRemoveListener?.(EVT_END, endListener);
      } catch {
        /* no-op */ void 0;
      }
    }

    function abort() {
      try {
        // 优先使用 SillyTavern 停止接口；退回 slash /abort
        if (win?.SillyTavern?.stopGeneration) {
          win.SillyTavern.stopGeneration();
        } else if (typeof win?.triggerSlash === 'function') {
          void win.triggerSlash('/abort');
        }
      } catch (_) {
        /* ignore */
      } finally {
        cleanup();
      }
    }

    return { abort, cleanup };
  }

  /**
   * 获取智能历史管理设置
   * 从游戏设置中读取智能历史管理参数
   */
  private async getSmartHistorySettings(): Promise<SmartHistoryConfig> {
    try {
      const gameSettings = (await this.saveLoadManager.getSetting('game_settings')) as any;
      if (gameSettings?.smartHistory) {
        return {
          assistantMessageLimit: gameSettings.smartHistory.assistantMessageLimit || 30,
          userMessageLimit: gameSettings.smartHistory.userMessageLimit || 20,
          shortSummaryThreshold: gameSettings.smartHistory.shortSummaryThreshold || 15,
          longSummaryThreshold: gameSettings.smartHistory.longSummaryThreshold || 30,
        };
      }
    } catch (error) {
      console.warn('[SameLayerService] 获取智能历史管理设置失败，使用默认值:', error);
    }

    // 返回默认设置
    return {
      assistantMessageLimit: 30,
      userMessageLimit: 20,
      shortSummaryThreshold: 15,
      longSummaryThreshold: 30,
    };
  }

  /** 停止当前流式生成 */
  public stopStreaming(): void {
    try {
      this.currentStreamHandle?.abort?.();
    } finally {
      this.currentStreamHandle = null;
      try {
        this.eventBus.emit('same-layer:terminated');
      } catch {
        /* ignore */
      }
    }
  }

  /** 获取AI输出的纯文本（供SaveLoadManagerService调用） */
  public getLastAIGeneratedPlainText(): string {
    return this.lastAIGeneratedPlainText;
  }

  /**
   * 解析文本中的 MVU 命令
   * @param text 包含 MVU 命令的文本
   * @param oldMvuData 旧的 MVU 数据
   * @returns 新的 MVU 数据，如果没有变化则返回 undefined
   */
  private async parseMvuFromText(text: string, oldMvuData?: Mvu.MvuData): Promise<Mvu.MvuData | undefined> {
    if (!oldMvuData) {
      return undefined;
    }

    try {
      // 解析文本中的 MVU 命令
      const newMvuData = await Mvu.parseMessage(text, oldMvuData);
      return newMvuData;
    } catch (error) {
      console.warn('[SameLayerService] MVU 解析失败:', error);
      return undefined;
    }
  }

  /**
   * 使用存档消息历史进行流式生成
   * 使用酒馆当前预设，通过 overrides 注入存档消息作为聊天历史，保持世界书开启
   * 使用智能历史管理，根据消息数量自动选择使用完整内容或摘要
   * 支持 MVU 变量解析，在生成完成后自动解析文本中的 MVU 命令
   *
   * @example
   * // 基本使用 - 通过存档名获取历史
   * const oldMvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
   * const handle = sameLayerService.generateWithSaveHistory(
   *   {
   *     user_input: "你好，继续我们的对话",
   *     saveName: "我的存档1",
   *     assistantMessageLimit: 30,
   *     userMessageLimit: 20,
   *     shortSummaryThreshold: 15,
   *     longSummaryThreshold: 30
   *   },
   *   {
   *     onStart: () => console.log("开始生成"),
   *     onFullText: (text) => console.log("流式文本:", text), // 原始文本
   *     onEnd: (html) => console.log("最终HTML:", html) // HTML格式
   *   },
   *   oldMvuData // 传入旧的 MVU 数据
   * );
   *
   * // 获取最终结果（包含 MVU 数据）
   * const result = await handle.getResult();
   * if (result?.newMvuData) {
   *   await Mvu.replaceMvuData(result.newMvuData, { type: 'message', message_id: 'latest' });
   * }
   *
   * @example
   * // 通过 slotId 获取历史
   * const oldMvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
   * const handle = sameLayerService.generateWithSaveHistory(
   *   {
   *     user_input: "继续对话",
   *     slotId: "slot_123456",
   *     assistantMessageLimit: 50,
   *     userMessageLimit: 30
   *   },
   *   undefined,
   *   oldMvuData
   * );
   *
   * @example
   * // 停止生成
   * handle.abort();
   * handle.cleanup();
   */
  public generateWithSaveHistory(
    config: {
      user_input: string;
      saveName?: string;
      slotId?: string;
      overrides?: Partial<any>;
      // 智能历史管理配置
      assistantMessageLimit?: number;
      userMessageLimit?: number;
      shortSummaryThreshold?: number;
      longSummaryThreshold?: number;
    },
    handlers?: {
      onStart?: () => void;
      onFullText?: (text: string) => void;
      onIncremental?: (text: string) => void;
      onEnd?: (finalText: string) => void;
    },
    oldMvuData?: Mvu.MvuData,
  ): StreamGenerationResult {
    let lastFull = '';
    let cancelled = false;
    let inner: { abort: () => void; cleanup: () => void } | null = null;
    let finalResult: GenerationResult | null = null;

    // 异步获取存档消息并构建 overrides
    Promise.all([this.getSaveMessages(config.saveName, config.slotId), this.getSmartHistorySettings()])
      .then(([messages, defaultSmartConfig]) => {
        if (cancelled) return;

        // 使用智能历史管理，优先使用传入的参数，否则使用设置中的默认值
        const smartConfig: SmartHistoryConfig = {
          assistantMessageLimit: config.assistantMessageLimit ?? defaultSmartConfig.assistantMessageLimit,
          userMessageLimit: config.userMessageLimit ?? defaultSmartConfig.userMessageLimit,
          shortSummaryThreshold: config.shortSummaryThreshold ?? defaultSmartConfig.shortSummaryThreshold,
          longSummaryThreshold: config.longSummaryThreshold ?? defaultSmartConfig.longSummaryThreshold,
        };

        const smartResult = this.processSmartSaveMessages(messages, smartConfig);
        const prompts = smartResult.prompts;

        console.log('[SameLayerService] 使用智能历史管理:', smartResult.stats);

        // 构建 overrides
        const overrides = {
          ...config.overrides,
          chat_history: {
            with_depth_entries: true, // 保持世界书开启
            prompts: prompts,
          },
        };

        const handle = this.stream(
          {
            user_input: config.user_input,
            should_stream: true,
            overrides,
          },
          {
            onStart: () => handlers?.onStart?.(),
            onFullText: (text: string) => {
              lastFull = text ?? '';
              // 流式过程中传递原始文本，不进行HTML处理
              handlers?.onFullText?.(text);
            },
            onIncremental: (text: string) => {
              // 流式过程中传递原始文本，不进行HTML处理
              handlers?.onIncremental?.(text);
            },
            onEnd: async (finalText: string) => {
              const text = finalText || lastFull || '';
              // 只在最终完成时使用 formatAsDisplayedMessage 处理为 HTML 格式
              const htmlText = formatAsDisplayedMessage(text, { message_id: 0 });

              // 解析 MVU 命令
              const newMvuData = await this.parseMvuFromText(text, oldMvuData);

              // 存储最终结果
              finalResult = {
                html: htmlText,
                newMvuData: newMvuData,
              };

              handlers?.onEnd?.(htmlText);
            },
          },
        );
        inner = handle;
        this.currentStreamHandle = handle;
        if (cancelled) {
          try {
            inner.abort();
          } catch {
            /* ignore */
          }
        }
      })
      .catch(error => {
        console.error('[SameLayerService] 获取存档消息失败，使用无历史生成:', error);
        if (cancelled) return;

        // 构建 overrides 失败时，仍尝试无历史流式
        const overrides = {
          ...config.overrides,
          chat_history: {
            with_depth_entries: true, // 保持世界书开启
            prompts: [],
          },
        };

        const handle = this.stream(
          {
            user_input: config.user_input,
            should_stream: true,
            overrides,
          },
          {
            onStart: () => handlers?.onStart?.(),
            onFullText: (text: string) => {
              lastFull = text ?? '';
              // 流式过程中传递原始文本，不进行HTML处理
              handlers?.onFullText?.(text);
            },
            onIncremental: (text: string) => {
              // 流式过程中传递原始文本，不进行HTML处理
              handlers?.onIncremental?.(text);
            },
            onEnd: async (finalText: string) => {
              const text = finalText || lastFull || '';
              // 只在最终完成时使用 formatAsDisplayedMessage 处理为 HTML 格式
              const htmlText = formatAsDisplayedMessage(text, { message_id: 0 });

              // 解析 MVU 命令
              const newMvuData = await this.parseMvuFromText(text, oldMvuData);

              // 存储最终结果
              finalResult = {
                html: htmlText,
                newMvuData: newMvuData,
              };

              handlers?.onEnd?.(htmlText);
            },
          },
        );
        inner = handle;
        this.currentStreamHandle = handle;
        if (cancelled) {
          try {
            inner.abort();
          } catch {
            /* ignore */
          }
        }
      });

    return {
      abort: () => {
        cancelled = true;
        try {
          inner?.abort?.();
        } finally {
          /* no-op */
        }
      },
      cleanup: () => {
        try {
          inner?.cleanup?.();
        } finally {
          /* no-op */
        }
      },
      getResult: async () => {
        return finalResult;
      },
    };
  }

  /**
   * 使用存档消息历史进行非流式生成
   * 使用酒馆当前预设，通过 overrides 注入存档消息作为聊天历史，保持世界书开启
   * 使用智能历史管理，根据消息数量自动选择使用完整内容或摘要
   * 支持 MVU 变量解析，在生成完成后自动解析文本中的 MVU 命令
   *
   * @example
   * // 基本使用 - 通过存档名获取历史
   * const oldMvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
   * const result = await sameLayerService.generateWithSaveHistorySync({
   *   user_input: "你好，继续我们的对话",
   *   saveName: "我的存档1",
   *   assistantMessageLimit: 30,
   *   userMessageLimit: 20,
   *   shortSummaryThreshold: 15,
   *   longSummaryThreshold: 30
   * }, oldMvuData);
   * console.log("生成的HTML:", result.html);
   * if (result.newMvuData) {
   *   await Mvu.replaceMvuData(result.newMvuData, { type: 'message', message_id: 'latest' });
   * }
   *
   * @example
   * // 通过 slotId 获取历史
   * const oldMvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
   * const result = await sameLayerService.generateWithSaveHistorySync({
   *   user_input: "继续对话",
   *   slotId: "slot_123456",
   *   assistantMessageLimit: 50,
   *   userMessageLimit: 30
   * }, oldMvuData);
   *
   * @example
   * // 使用自定义 overrides
   * const oldMvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
   * const result = await sameLayerService.generateWithSaveHistorySync({
   *   user_input: "继续对话",
   *   saveName: "我的存档1",
   *   assistantMessageLimit: 30,
   *   userMessageLimit: 20,
   *   overrides: {
   *     char_description: "一个温柔的角色"
   *   }
   * }, oldMvuData);
   */
  public async generateWithSaveHistorySync(
    config: {
      user_input: string;
      saveName?: string;
      slotId?: string;
      overrides?: Partial<any>;
      // 智能历史管理配置
      assistantMessageLimit?: number;
      userMessageLimit?: number;
      shortSummaryThreshold?: number;
      longSummaryThreshold?: number;
    },
    oldMvuData?: Mvu.MvuData,
  ): Promise<GenerationResult> {
    try {
      // 获取存档消息和智能历史管理设置
      const [messages, defaultSmartConfig] = await Promise.all([
        this.getSaveMessages(config.saveName, config.slotId),
        this.getSmartHistorySettings(),
      ]);

      // 使用智能历史管理，优先使用传入的参数，否则使用设置中的默认值
      const smartConfig: SmartHistoryConfig = {
        assistantMessageLimit: config.assistantMessageLimit ?? defaultSmartConfig.assistantMessageLimit,
        userMessageLimit: config.userMessageLimit ?? defaultSmartConfig.userMessageLimit,
        shortSummaryThreshold: config.shortSummaryThreshold ?? defaultSmartConfig.shortSummaryThreshold,
        longSummaryThreshold: config.longSummaryThreshold ?? defaultSmartConfig.longSummaryThreshold,
      };

      const smartResult = this.processSmartSaveMessages(messages, smartConfig);
      const prompts = smartResult.prompts;

      console.log('[SameLayerService] 使用智能历史管理:', smartResult.stats);

      // 构建 overrides
      const overrides = {
        ...config.overrides,
        chat_history: {
          with_depth_entries: true, // 保持世界书开启
          prompts: prompts,
        },
      };

      // 执行非流式生成
      const result = await this.generate({
        user_input: config.user_input,
        should_stream: false,
        overrides,
      });

      // 验证返回结果
      const res = TextSchema.safeParse(result);
      if (!res.success) {
        throw new Error('生成结果无效');
      }

      // 使用 formatAsDisplayedMessage 处理为 HTML 格式
      const htmlResult = formatAsDisplayedMessage(result, { message_id: 0 });

      // 解析 MVU 命令
      const newMvuData = await this.parseMvuFromText(result, oldMvuData);

      return {
        html: htmlResult,
        newMvuData: newMvuData,
      };
    } catch (error) {
      console.error('[SameLayerService] 非流式生成失败:', error);

      // 如果获取存档消息失败，尝试无历史生成
      try {
        const overrides = {
          ...config.overrides,
          chat_history: {
            with_depth_entries: true, // 保持世界书开启
            prompts: [],
          },
        };

        const result = await this.generate({
          user_input: config.user_input,
          should_stream: false,
          overrides,
        });

        const res = TextSchema.safeParse(result);
        if (!res.success) {
          throw new Error('生成结果无效');
        }

        // 使用 formatAsDisplayedMessage 处理为 HTML 格式
        const htmlResult = formatAsDisplayedMessage(result, { message_id: 0 });

        // 解析 MVU 命令
        const newMvuData = await this.parseMvuFromText(result, oldMvuData);

        return {
          html: htmlResult,
          newMvuData: newMvuData,
        };
      } catch (fallbackError) {
        console.error('[SameLayerService] 无历史生成也失败:', fallbackError);
        throw new Error('生成失败');
      }
    }
  }

  /**
   * 从存档中获取消息数据
   *
   * @param saveName 存档名称，可选
   * @param slotId 存档槽位ID，可选
   * @returns 返回存档中的消息数组，如果存档不存在或出错则返回空数组
   *
   * @example
   * // 通过存档名获取消息
   * const messages = await this.getSaveMessages("我的存档1");
   *
   * // 通过 slotId 获取消息
   * const messages = await this.getSaveMessages(undefined, "slot_123456");
   */
  private async getSaveMessages(saveName?: string, slotId?: string): Promise<SaveMessage[]> {
    try {
      let targetSlotId = slotId;

      // 如果没有提供 slotId，尝试通过 saveName 查找
      if (!targetSlotId && saveName) {
        const foundSlotId = await this.saveLoadManager.findSlotIdBySaveName(saveName);
        targetSlotId = foundSlotId || undefined;
      }

      if (!targetSlotId) {
        console.warn('[SameLayerService] 无法找到存档，saveName:', saveName, 'slotId:', slotId);
        return [];
      }

      // 从 IndexDB 加载存档数据
      const saveData = await this.saveLoadManager.getSlot(targetSlotId);
      if (!saveData || !saveData.messages) {
        console.warn('[SameLayerService] 存档数据无效或没有消息');
        return [];
      }

      console.log('[SameLayerService] 成功获取存档消息，数量:', saveData.messages.length);
      return saveData.messages;
    } catch (error) {
      console.error('[SameLayerService] 获取存档消息失败:', error);
      return [];
    }
  }

  /**
   * 智能处理存档消息，根据消息数量和阈值决定使用完整内容还是摘要
   *
   * @param messages 存档消息数组
   * @param config 智能历史管理配置
   * @returns 智能处理后的结果
   *
   * @example
   * // 基本使用
   * const result = this.processSmartSaveMessages(messages, {
   *   assistantMessageLimit: 30,
   *   userMessageLimit: 20,
   *   shortSummaryThreshold: 15,
   *   longSummaryThreshold: 30
   * });
   *
   * // 使用默认配置
   * const result = this.processSmartSaveMessages(messages);
   */
  private processSmartSaveMessages(messages: SaveMessage[], config: SmartHistoryConfig = {}): SmartHistoryResult {
    if (!messages || messages.length === 0) {
      return {
        prompts: [],
        stats: {
          totalMessages: 0,
          assistantMessages: 0,
          userMessages: 0,
          usedShortSummary: 0,
          usedLongSummary: 0,
        },
      };
    }

    const result = processSmartMessageHistory(messages, config);

    console.log('[SameLayerService] 智能处理消息历史:', {
      totalMessages: result.stats.totalMessages,
      assistantMessages: result.stats.assistantMessages,
      userMessages: result.stats.userMessages,
      usedShortSummary: result.stats.usedShortSummary,
      usedLongSummary: result.stats.usedLongSummary,
      finalPrompts: result.prompts.length,
    });

    return result;
  }
}
