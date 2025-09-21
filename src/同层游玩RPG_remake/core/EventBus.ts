import { injectable } from 'inversify';

export type EventHandler<T = any> = (payload?: T) => void;

/**
 * 简单事件总线，支持命名空间（如 game:started）与通配订阅（如 game:*）。
 */
@injectable()
export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private debug: boolean = false;

  public setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  public on(eventName: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler);
    return () => this.off(eventName, handler);
  }

  public off(eventName: string, handler: EventHandler): void {
    const set = this.handlers.get(eventName);
    if (set) {
      set.delete(handler);
      if (set.size === 0) this.handlers.delete(eventName);
    }
  }

  public emit<T = any>(eventName: string, payload?: T): void {
    if (this.debug) {
      console.info('[EventBus]', eventName, payload);
    }

    // 精确事件
    const exact = this.handlers.get(eventName);
    exact?.forEach(h => {
      try {
        h(payload);
      } catch (err) {
        console.warn('[EventBus] handler error', eventName, err);
      }
    });

    // 通配：namespace:*
    const nsIndex = eventName.indexOf(':');
    if (nsIndex > 0) {
      const ns = eventName.slice(0, nsIndex);
      const wildcard = `${ns}:*`;
      const wildHandlers = this.handlers.get(wildcard);
      wildHandlers?.forEach(h => {
        try {
          h(payload);
        } catch (err) {
          console.warn('[EventBus] wildcard handler error', wildcard, err);
        }
      });
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}
