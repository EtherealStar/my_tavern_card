import type { GameState } from '../models/schemas';

export class WorldbookSaveService {
  private worldbookName: string | null = null;

  async ensureChatWorldbook(): Promise<string> {
    if (!this.worldbookName) {
      this.worldbookName = await getOrCreateChatWorldbook('current');
    }
    return this.worldbookName;
  }

  async save(state: GameState): Promise<void> {
    const name = await this.ensureChatWorldbook();
    const entry = {
      name: '同层游玩RPG-存档',
      enabled: true,
      uid: Date.now(),
      strategy: { type: 'constant', keys: [], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 1 },
      position: { type: 'after_author_note', role: 'assistant', depth: 0, order: 0 },
      content: JSON.stringify(state),
      probability: 100,
      recursion: { prevent_incoming: true, prevent_outgoing: true, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null },
      extra: { tag: 'save' },
    } as any;

    const worldbook = await getWorldbook(name);
    const others = worldbook.filter(e => e?.extra?.tag !== 'save');
    await replaceWorldbook(name, [...others, entry]);
  }

  async load(): Promise<GameState | null> {
    const name = await this.ensureChatWorldbook();
    const worldbook = await getWorldbook(name);
    const latest = _.maxBy(
      worldbook.filter(e => e?.extra?.tag === 'save'),
      e => e.uid,
    );
    if (!latest) return null;
    try {
      const obj = JSON.parse(latest.content);
      // 容错：不强制 zod 校验，留给上层处理
      return obj as GameState;
    } catch (e) {
      console.error('[WorldbookSaveService] 读取存档失败', e);
      return null;
    }
  }
}
