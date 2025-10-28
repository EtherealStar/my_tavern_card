import { inject, injectable } from 'inversify';
import {
  getBackgroundByLocationKeyword,
  getEnemyBattleStats,
  getEnemyPortraitByRaceAndVariant,
  getEnemyTypeByRaceAndVariant,
  getSkillsByRaceAndVariant,
} from '../configs/enemy/enemyConfig';
import { TYPES } from '../core/ServiceIdentifiers';
import type { BattleConfig, BattleParticipant } from '../models/BattleSchemas';
import type { StatDataBindingService } from './StatDataBindingService';

/**
 * 动态敌人生成服务
 * 根据MVU变量中的敌人信息动态生成战斗配置
 */
@injectable()
export class DynamicEnemyService {
  constructor(@inject(TYPES.StatDataBindingService) private statDataBinding: StatDataBindingService) {}

  /**
   * 根据敌人ID生成动态战斗配置
   */
  async generateEnemyBattleConfig(enemyId: string): Promise<BattleConfig> {
    try {
      // 1. 从MVU变量获取敌人基础信息
      const enemyInfo = await this.getEnemyInfo(enemyId);
      if (!enemyInfo) {
        throw new Error(`无法获取敌人信息: ${enemyId}`);
      }

      // 2. 获取玩家等级
      const playerLevel = await this.getPlayerLevel();

      // 3. 基于玩家等级确定敌人等级
      const enemyLevel = playerLevel; // 敌人等级 = 玩家等级

      // 4. 使用硬编码战斗属性（不使用MVU转换）
      const enemyType = getEnemyTypeByRaceAndVariant(enemyInfo.race, enemyInfo.variantId);
      const battleStats = getEnemyBattleStats(enemyLevel, enemyType);

      // 5. 获取立绘和背景
      const portrait = getEnemyPortraitByRaceAndVariant(enemyInfo.race, enemyInfo.variantId);
      const background = await this.getBattleBackground();

      // 6. 生成技能配置
      const skills = getSkillsByRaceAndVariant(enemyInfo.race, enemyInfo.variantId);

      // 7. 获取玩家配置
      const playerConfig = await this.getPlayerConfig();

      // 8. 构建战斗配置
      return {
        background: { image: background, scaleMode: 'cover' },
        isDebugMode: false,
        participants: [
          playerConfig,
          {
            id: enemyId,
            name: enemyInfo.name,
            side: 'enemy',
            level: enemyLevel,
            maxHp: battleStats.maxHp,
            hp: battleStats.maxHp,
            stats: battleStats,
            skills: skills,
            enemyPortrait: {
              image: portrait,
              position: { x: 0.75, y: 0.4, scale: 0.8 },
            },
          },
        ],
      };
    } catch (error) {
      console.error('[DynamicEnemyService] 生成敌人战斗配置失败:', error);
      throw error;
    }
  }

  /**
   * 从MVU变量获取敌人信息
   */
  private async getEnemyInfo(enemyId: string): Promise<{
    id: string;
    name: string;
    variantId: string;
    gender: string;
    race: string;
  } | null> {
    try {
      const name = await this.statDataBinding.getAttributeValue(`enemies.${enemyId}.name`, '未知敌人');
      const variantId = await this.statDataBinding.getAttributeValue(`enemies.${enemyId}.variantId`, '未知');
      const gender = await this.statDataBinding.getAttributeValue(`enemies.${enemyId}.gender`, '未知');
      const race = await this.statDataBinding.getAttributeValue(`enemies.${enemyId}.race`, '未知');

      return {
        id: enemyId,
        name: String(name),
        variantId: String(variantId),
        gender: String(gender),
        race: String(race),
      };
    } catch (error) {
      console.error('[DynamicEnemyService] 获取敌人信息失败:', error);
      return null;
    }
  }

  /**
   * 获取玩家等级
   */
  private async getPlayerLevel(): Promise<number> {
    try {
      const level = await this.statDataBinding.getAttributeValue('level', 1);
      return Number(level);
    } catch (error) {
      console.error('[DynamicEnemyService] 获取玩家等级失败:', error);
      return 1; // 默认等级
    }
  }

  /**
   * 获取战斗背景
   */
  private async getBattleBackground(): Promise<string> {
    try {
      const location = await this.statDataBinding.getCurrentLocation();
      return getBackgroundByLocationKeyword(location);
    } catch (error) {
      console.error('[DynamicEnemyService] 获取战斗背景失败:', error);
      return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop'; // 默认背景
    }
  }

  /**
   * 获取玩家战斗配置
   */
  private async getPlayerConfig(): Promise<BattleParticipant> {
    try {
      // 获取玩家名字
      const playerName = (window as any).substitudeMacros?.('{{user}}') || '玩家';

      // 获取玩家属性（这里需要从MVU变量获取）
      const strength = await this.statDataBinding.getAttributeValue('current_attributes.strength', 10);
      const intelligence = await this.statDataBinding.getAttributeValue('current_attributes.intelligence', 10);
      const agility = await this.statDataBinding.getAttributeValue('current_attributes.agility', 10);
      const defense = await this.statDataBinding.getAttributeValue('current_attributes.defense', 10);
      const constitution = await this.statDataBinding.getAttributeValue('current_attributes.constitution', 10);
      const willpower = await this.statDataBinding.getAttributeValue('current_attributes.willpower', 10);
      const luck = await this.statDataBinding.getAttributeValue('current_attributes.luck', 10);

      // 计算战斗属性
      const maxHp = Number(constitution) * 10 + 50;
      const maxMp = Number(intelligence) * 5; // MP = 智力 * 5
      const battleStats = {
        atk: Number(strength) * 2,
        hatk: Number(willpower) * 1.5,
        def: Number(defense) * 1.2,
        hdef: Number(constitution) * 1.0,
        hit: 100.0,
        evade: Number(agility) * 0.5,
        critRate: Number(luck) * 0.01,
        critDamageMultiplier: 1.5,
        hhp: 0.1,
      };

      return {
        id: 'player',
        name: playerName,
        side: 'player',
        level: await this.getPlayerLevel(),
        maxHp: maxHp,
        hp: maxHp,
        maxMp: maxMp,
        mp: maxMp,
        stats: battleStats,
        skills: ['power_strike', 'defend', 'heal'], // 基础技能
      };
    } catch (error) {
      console.error('[DynamicEnemyService] 获取玩家配置失败:', error);
      // 返回默认玩家配置
      return {
        id: 'player',
        name: '玩家',
        side: 'player',
        level: 1,
        maxHp: 100,
        hp: 100,
        maxMp: 50, // 默认MP = 10智力 * 5
        mp: 50,
        stats: {
          atk: 20,
          hatk: 15,
          def: 12,
          hdef: 10,
          hit: 100.0,
          evade: 5,
          critRate: 0.05,
          critDamageMultiplier: 1.5,
          hhp: 0.1,
        },
        skills: ['power_strike', 'defend', 'heal'],
      };
    }
  }
}
