import { inject, injectable } from 'inversify';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import type { BattleResult } from '../models/BattleSchemas';
import type { SaveLoadManagerService } from './SaveLoadManagerService';

@injectable()
export class BattleResultHandler {
  constructor(
    @inject(TYPES.EventBus) private eventBus: EventBus,
    @inject(TYPES.SaveLoadManagerService) private saveLoad: SaveLoadManagerService,
  ) {}

  public async persistAndAnnounce(result: BattleResult): Promise<void> {
    try {
      await this.saveLoad.setSetting('battle:last_result', {
        timestamp: new Date().toISOString(),
        result,
      });
      this.eventBus.emit('battle:result-persisted', result);
    } catch (error) {
      console.warn('[BattleResultHandler] persist failed:', error);
    }
  }
}

