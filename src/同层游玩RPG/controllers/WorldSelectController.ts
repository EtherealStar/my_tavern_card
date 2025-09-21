import { EventBus } from '../core/EventBus';
import type { GameState, GameWorld } from '../models/schemas';

export class WorldSelectController {
  private bus: EventBus;
  private state: GameState;
  constructor(bus: EventBus, state: GameState) {
    this.bus = bus;
    this.state = state;
  }
  mount(root: string, html: string) {
    $(root).html(html);
    $(root)
      .find('.btn-world')
      .on('click', e => {
        const world = ($(e.currentTarget).data('world') as GameWorld) ?? '西幻';
        this.state.world = world;
        this.state.phase = 'character_create';
        this.bus.emit('world:selected', world);
        this.bus.emit('ui:render');
      });
  }
}
