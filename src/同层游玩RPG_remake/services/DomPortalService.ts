import { inject, injectable } from 'inversify';
import $ from 'jquery';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';

type MountOptions = {
  keyword?: string; // 默认 "【游玩】"
  rootId?: string; // 默认 rpg-root
  appId?: string; // 默认 app
  chatSelector?: string; // 聊天容器兜底选择器，默认 #chat
};

/**
 * 在第0楼中查找包含 keyword 的节点并替换为自有容器；
 * 不关心是否被 <pre> 包裹；使用 MutationObserver 守护容器不被覆盖。
 */
@injectable()
export class DomPortalService {
  private observer: MutationObserver | null = null;
  private mounted = false;
  private options: Required<MountOptions> = {
    keyword: '【游玩】',
    rootId: 'rpg-root',
    appId: 'app',
    chatSelector: '#chat',
  };

  constructor(@inject(TYPES.EventBus) private eventBus: EventBus) {}

  public start(options?: MountOptions): void {
    if (this.mounted) return;
    this.options = { ...this.options, ...(options ?? {}) } as Required<MountOptions>;
    this.mounted = true;
    this.tryMountOnce();
    this.installGuards();
  }

  public stop(): void {
    this.mounted = false;
    try {
      this.observer?.disconnect();
    } catch {
      /* ignore */
    }
    this.observer = null;
  }

  private ensureRootHtml(): JQuery<HTMLElement> {
    const { rootId, appId } = this.options;
    const $existing = $(`#${rootId}`);
    if ($existing.length) return $existing as JQuery<HTMLElement>;
    const $root = $(`<div id="${rootId}"><div id="${appId}"></div></div>`);
    return $root;
  }

  private remountVueApp(): void {
    const remount = (window as any).__RPG_VUE_REMOUNT__;
    const { rootId, appId } = this.options;
    const mountEl = document.querySelector(`#${rootId} #${appId}`);
    if (typeof remount === 'function' && mountEl) {
      try {
        // 检查是否正在初始化中，如果是则跳过重挂载
        const isInitializing = (window as any).__RPG_REMAKE_INIT_DONE__ === false;
        if (isInitializing) {
          console.log('[DomPortalService] 跳过重挂载：正在初始化中');
          return;
        }
        remount(mountEl);
      } catch {
        /* ignore */
      }
    }
  }

  private getLayer0Container(): JQuery<HTMLElement> {
    const win: any = window as any;
    try {
      if (typeof win?.retrieveDisplayedMessage === 'function') {
        const $mes = $(win.retrieveDisplayedMessage(0));
        if ($mes && $mes.length && document.contains($mes[0])) return $mes as JQuery<HTMLElement>;
      }
    } catch {
      /* ignore */
    }
    // 兜底：使用聊天容器
    const $chat = $(this.options.chatSelector);
    if ($chat && $chat.length && document.contains($chat[0])) return $chat as JQuery<HTMLElement>;
    return $('body');
  }

  private tryMountOnce(): void {
    // 检查是否正在初始化中，如果是则跳过DOM操作
    const isInitializing = (window as any).__RPG_REMAKE_INIT_DONE__ === false;
    if (isInitializing) {
      console.log('[DomPortalService] 跳过DOM操作：正在初始化中');
      return;
    }

    const { keyword, rootId } = this.options;
    const $layer0 = this.getLayer0Container();
    if (!$layer0 || $layer0.length === 0 || !document.contains($layer0[0])) return;

    // 已存在则校正位置
    const $existing = $(`#${rootId}`);
    // 查找包含关键字的第一个节点（不限定标签）
    let $slot: JQuery<HTMLElement> | null = null;
    try {
      const $all = ($layer0.find('*') as unknown as JQuery<HTMLElement>).filter((_, el) => {
        const text = (el?.textContent || '').toString();
        return text.includes(keyword);
      });
      if ($all.length > 0) {
        const first: HTMLElement | undefined = $all.get(0) as HTMLElement | undefined;
        if (first && document.contains(first)) {
          $slot = $(first as unknown as HTMLElement) as JQuery<HTMLElement>;
        }
      }
    } catch {
      /* ignore */
    }

    if ($existing.length) {
      // 仅当找到匹配槽位时才移动已有容器
      if ($slot && $slot.length && document.contains($slot[0])) {
        try {
          $existing.detach();
          $slot.replaceWith($existing);
          this.remountVueApp();
        } catch {
          /* ignore */
        }
      }
      // 未找到关键字就保持现状
      return;
    }

    // 不存在容器：仅在找到关键字时插入
    if ($slot && $slot.length && document.contains($slot[0])) {
      const $root = this.ensureRootHtml();
      try {
        $slot.replaceWith($root);
      } catch {
        /* ignore */
      }
      this.remountVueApp();
    }
  }

  private installGuards(): void {
    const target = document.querySelector(this.options.chatSelector) || document.body;
    try {
      this.observer = new MutationObserver(() => {
        if (!this.mounted) return;
        // 仅当匹配到关键字时，尝试重挂
        this.tryMountOnce();
      });
      this.observer.observe(target, { childList: true, subtree: true });
    } catch {
      /* ignore */
    }

    // 同层覆盖/生成结束时，也重试一次位置校正
    this.eventBus.on('same-layer:layer0-overridden', () => this.tryMountOnce());
    this.eventBus.on('same-layer:done', () => this.tryMountOnce());
  }
}

// DomPortalService 实例将通过 Inversify 容器创建
