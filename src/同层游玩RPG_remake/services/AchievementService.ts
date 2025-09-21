import { inject, injectable } from 'inversify';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { UIService } from './UIService';

@injectable()
export class AchievementService {
  private unlocked = new Set<string>();

  constructor(
    @inject(TYPES.EventBus) private bus: EventBus,
    @inject(TYPES.UIService) private ui: UIService,
  ) {}

  public register(): void {
    this.bus.on('game:started', () => this.unlock('first_start', '首次开始'));
    this.bus.on('playing:action', () => this.unlock('first_action', '首次动作'));
  }

  private unlock(key: string, title: string): void {
    if (this.unlocked.has(key)) return;
    this.unlocked.add(key);
    this.ui.success('解锁成就', title);
    this.bus.emit('achievement:unlocked', { key, title });
  }
}
