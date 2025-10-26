import { inject, injectable } from 'inversify';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { BattleLogItem, BattleStoryResult } from '../models/BattleLogSchemas';
import type { BattleResult } from '../models/BattleSchemas';
import type { SaveLoadManagerService } from './SaveLoadManagerService';
@injectable()
export class BattleResultHandler {
  constructor(
    @inject(TYPES.EventBus) private eventBus: EventBus,
    @inject(TYPES.SaveLoadManagerService) private saveLoad: SaveLoadManagerService,
  ) {}

  public async persistAndAnnounce(result: BattleResult, battleLog: BattleLogItem[]): Promise<void> {
    try {
      // 生成战斗故事
      const battleStory = this.generateBattleStory(battleLog, result);

      await this.saveLoad.setSetting('battle:last_result', {
        timestamp: new Date().toISOString(),
        result,
        battleLog, // 新增：保存战斗日志
        battleStory, // 新增：保存战斗故事
      });

      this.eventBus.emit('battle:result-persisted', { result, battleLog, battleStory });
    } catch (error) {
      console.warn('[BattleResultHandler] persist failed:', error);
    }
  }

  /**
   * 生成战斗故事
   */
  private generateBattleStory(battleLog: BattleLogItem[], result: BattleResult): BattleStoryResult {
    const storyParts = [
      this.generateBattleIntroduction(battleLog),
      this.generateBattleNarrative(battleLog),
      this.generateBattleConclusion(result),
    ];

    const fullStory = storyParts.join('\n\n');

    return {
      introduction: storyParts[0],
      narrative: storyParts[1],
      conclusion: storyParts[2],
      fullStory,
    };
  }

  /**
   * 生成战斗介绍
   */
  private generateBattleIntroduction(battleLog: BattleLogItem[]): string {
    const participants = this.extractParticipants(battleLog);
    return `战斗开始了！${participants.player}与${participants.enemy}展开了激烈的对决。`;
  }

  /**
   * 生成战斗叙述
   */
  private generateBattleNarrative(battleLog: BattleLogItem[]): string {
    return battleLog.map(log => log.description).join(' ');
  }

  /**
   * 生成战斗结论
   */
  private generateBattleConclusion(result: BattleResult): string {
    if (result.winner === 'player') {
      return `经过${result.rounds}回合的激战，玩家取得了胜利！`;
    } else {
      return `经过${result.rounds}回合的激战，玩家败北了...`;
    }
  }

  /**
   * 提取参与者信息
   */
  private extractParticipants(battleLog: BattleLogItem[]): { player: string; enemy: string } {
    const participants = [
      ...new Set([...battleLog.map(log => log.actorId), ...battleLog.map(log => log.targetId)]),
    ].filter(id => id && id !== '未知');

    // 简单假设第一个是玩家，第二个是敌人
    return {
      player: participants[0] || '玩家',
      enemy: participants[1] || '敌人',
    };
  }
}
