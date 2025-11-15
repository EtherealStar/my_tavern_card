import { inject, injectable } from 'inversify';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { BattleLogItem, BattleStoryResult } from '../models/BattleLogSchemas';
import type { BattleResult } from '../models/BattleSchemas';
import type { SaveLoadManagerService } from './SaveLoadManagerService';

// 参与者信息类型
export interface ParticipantInfo {
  id: string;
  name: string;
  side: 'player' | 'enemy';
}

@injectable()
export class BattleResultHandler {
  constructor(
    @inject(TYPES.EventBus) private eventBus: EventBus,
    @inject(TYPES.SaveLoadManagerService) private saveLoad: SaveLoadManagerService,
  ) {}

  public async persistAndAnnounce(
    result: BattleResult,
    battleLog: BattleLogItem[],
    participants: ParticipantInfo[],
  ): Promise<void> {
    try {
      // 生成战斗故事（传递参与者信息）
      const battleStory = this.generateBattleStory(battleLog, result, participants);

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
  private generateBattleStory(
    battleLog: BattleLogItem[],
    result: BattleResult,
    participants: ParticipantInfo[],
  ): BattleStoryResult {
    const storyParts = [
      this.generateBattleIntroduction(participants),
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
  private generateBattleIntroduction(participants: ParticipantInfo[]): string {
    const participantInfo = this.extractParticipants(participants);
    return `战斗开始了！${participantInfo.player}与${participantInfo.enemy}展开了激烈的对决。`;
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
   * 根据 side 属性准确区分玩家和敌人
   * @param participants 参与者信息
   */
  private extractParticipants(participants: ParticipantInfo[]): { player: string; enemy: string } {
    // 根据 side 属性区分玩家和敌人
    const playerParticipant = participants.find(p => p.side === 'player');
    const enemyParticipant = participants.find(p => p.side === 'enemy');

    return {
      player: playerParticipant?.name || '玩家',
      enemy: enemyParticipant?.name || '敌人',
    };
  }
}
