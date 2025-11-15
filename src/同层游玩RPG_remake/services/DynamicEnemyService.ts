import { inject, injectable } from 'inversify';
import { getEnemyStatsByLevel } from '同层游玩RPG_remake/configs/enemy/enemyLevelStats';
import {
  generateSkillResourceMap,
  getBackgroundByLocationKeyword,
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

      // 4. 查表获取基础战斗属性（来源：enemyLevelStats），并按类型施加修正
      const enemyType = getEnemyTypeByRaceAndVariant(enemyInfo.race, enemyInfo.variantId);
      const base = getEnemyStatsByLevel(enemyLevel);
      // 命中/闪避值：若为比例（<=1），转换为百分制以兼容现有引擎
      const normalizedHit = base.hit <= 1 ? base.hit * 100 : base.hit;
      const normalizedEvade = base.evade <= 1 ? base.evade * 100 : base.evade;

      // 类型修正：保持轻量且与名称语义一致
      const typeAdjusted = (() => {
        switch (enemyType) {
          case 'high_dodge':
            return {
              atk: base.atk * 0.95,
              hatk: base.hatk,
              def: base.def * 0.9,
              hdef: base.hdef,
              hit: normalizedHit,
              evade: normalizedEvade + 20,
              critRate: base.critRate,
              critDamageMultiplier: 1.5,
              hhp: base.hhp,
              maxHp: Math.max(1, Math.floor(base.maxHp * 0.9)),
            } as const;
          case 'high_magic':
            return {
              atk: base.atk * 0.9,
              hatk: base.hatk * 1.2,
              def: base.def,
              hdef: base.hdef * 1.2,
              hit: normalizedHit,
              evade: normalizedEvade,
              critRate: base.critRate,
              critDamageMultiplier: 1.5,
              hhp: base.hhp,
              maxHp: base.maxHp,
            } as const;
          default:
            return {
              atk: base.atk,
              hatk: base.hatk,
              def: base.def,
              hdef: base.hdef,
              hit: normalizedHit,
              evade: normalizedEvade,
              critRate: base.critRate,
              critDamageMultiplier: 1.5,
              hhp: base.hhp,
              maxHp: base.maxHp,
            } as const;
        }
      })();

      // 将 hdef 和 evade 从百分制转换为比例制（Schema 要求 0-1 之间的小数）
      // hdef: 如果值 > 1，则除以 100；否则保持原值，但确保不超过 0.99
      // evade: 如果值 > 1，则除以 100；否则保持原值，但确保不超过 1
      const normalizeHdef = (value: number): number => {
        if (value > 1) {
          return Math.min(0.99, value / 100);
        }
        return Math.min(0.99, value);
      };

      const normalizeEvade = (value: number): number => {
        if (value > 1) {
          return Math.min(1, value / 100);
        }
        return Math.min(1, value);
      };

      const battleStats = {
        atk: Number(typeAdjusted.atk),
        hatk: Number(typeAdjusted.hatk),
        def: Number(typeAdjusted.def),
        hdef: normalizeHdef(Number(typeAdjusted.hdef)),
        hit: Number(typeAdjusted.hit),
        evade: normalizeEvade(Number(typeAdjusted.evade)),
        critRate: Number(typeAdjusted.critRate),
        critDamageMultiplier: Number(typeAdjusted.critDamageMultiplier),
        hhp: Number(typeAdjusted.hhp),
        maxHp: Number(typeAdjusted.maxHp),
      };

      // 5. 获取立绘和背景
      const portrait = getEnemyPortraitByRaceAndVariant(enemyInfo.race, enemyInfo.variantId);
      const background = await this.getBattleBackground();

      // 6. 生成技能配置
      const skills = getSkillsByRaceAndVariant(enemyInfo.race, enemyInfo.variantId);

      // 7. 生成技能资源映射（根据敌人信息为每个技能选择最匹配的资源）
      const skillResourceMap = generateSkillResourceMap(skills, enemyInfo.race, enemyInfo.variantId, enemyType);

      // 8. 获取敌人弱点（如果MVU变量中有配置，则使用；否则可以随机生成）
      // 注意：目前弱点会动态随机配置，这里先尝试从MVU变量获取
      let weakness: '体术' | '符术' | undefined;
      try {
        const weaknessValue = await this.statDataBinding.getAttributeValue(`enemies.${enemyId}.weakness`, undefined);
        if (weaknessValue === '体术' || weaknessValue === '符术') {
          weakness = weaknessValue;
        }
      } catch (error) {
        console.warn('[DynamicEnemyService] 获取敌人弱点失败，将使用默认值:', error);
      }

      // 9. 获取玩家配置
      const playerConfig = await this.getPlayerConfig();

      // 10. 构建战斗配置
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
            weakness: weakness, // 设置敌人弱点
            // 添加敌人的种族、变体、类型信息，供 EnemyBattleObject 动态选择资源使用
            // 使用类型断言，因为这些字段不在 BattleParticipant 类型中，但我们需要它们
            race: enemyInfo.race,
            variantId: enemyInfo.variantId,
            enemyType: enemyType,
            enemyPortrait: {
              image: portrait,
              position: { x: 0.75, y: 0.4, scale: 0.8 },
              videos: skillResourceMap, // 设置技能资源映射（保留用于兼容性，但实际会在释放技能时动态选择）
            },
          } as BattleParticipant & { race: string; variantId: string; enemyType: any },
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
      const variant = await this.statDataBinding.getAttributeValue(`enemies.${enemyId}.variant`, '未知');
      const gender = await this.statDataBinding.getAttributeValue(`enemies.${enemyId}.gender`, '未知');
      const race = await this.statDataBinding.getAttributeValue(`enemies.${enemyId}.race`, '未知');

      return {
        id: enemyId,
        name: String(name),
        variantId: String(variant),
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
      // 将 hdef 和 evade 转换为比例制（Schema 要求 0-1 之间的小数）
      // hdef: constitution * 1.0 是百分制，需要除以 100 转换为比例制
      // evade: agility * 0.5 是百分制，需要除以 100 转换为比例制
      const hdefValue = (Number(constitution) * 1.0) / 100;
      const evadeValue = (Number(agility) * 0.5) / 100;
      const battleStats = {
        atk: Number(strength) * 2,
        hatk: Number(willpower) * 1.5,
        def: Number(defense) * 1.2,
        hdef: Math.min(0.99, hdefValue), // 确保不超过 0.99
        hit: 100.0,
        evade: Math.min(1, evadeValue), // 确保不超过 1
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
      // 注意：hdef 和 evade 需要使用比例制（0-1 之间的小数）
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
          hdef: 0.1, // 10% 转换为比例制 0.1
          hit: 100.0,
          evade: 0.05, // 5% 转换为比例制 0.05
          critRate: 0.05,
          critDamageMultiplier: 1.5,
          hhp: 0.1,
        },
        skills: ['power_strike', 'defend', 'heal'],
      };
    }
  }
}
