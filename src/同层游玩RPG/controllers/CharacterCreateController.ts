import { EventBus } from '../core/EventBus';
import type { GameState, GameWorld } from '../models/schemas';

export class CharacterCreateController {
  private bus: EventBus;
  private state: GameState;
  constructor(bus: EventBus, state: GameState) {
    this.bus = bus;
    this.state = state;
  }
  mount(root: string, html: string) {
    $(root).html(html);
    $(root)
      .find('.btn-role')
      .on('click', e => {
        const roleType = ($(e.currentTarget).data('role') as '自带' | '自定义') ?? '自带';
        this.state.character = {
          name: roleType === '自带' ? '预设主角' : '自定义主角',
          gender: '自定义',
          roleType,
          world: (this.state.world ?? '西幻') as GameWorld,
          meta: {},
        } as any;
        this.state.phase = 'playing';
        this.bus.emit('character:created');
        this.bus.emit('ui:render');
      });
  }
}
