import type { BattleConfigItem } from '../../services/BattleConfigService';
/**
 * 基础战斗配置
 * 包含各种难度的基础战斗场景
 */

// 简单战斗配置已删除，只保留妖怪战斗

// 普通战斗配置
export const normalBattles: BattleConfigItem[] = [
  {
    id: 'yokai_battle',
    name: '妖怪战斗',
    description: '与神秘妖怪的激烈战斗',
    difficulty: 'normal',
    tags: ['yokai', 'city', 'supernatural'],
    config: {
      background: {
        image: 'https://files.catbox.moe/s2ayan.jpg',
        scaleMode: 'cover', // 填满画布，可能裁剪部分内容
        parallax: {
          layers: [
            {
              image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
              speed: 0.3,
              depth: 0.5,
            },
          ],
        },
      },
      participants: [
        {
          id: 'player',
          name: '勇者',
          side: 'player',
          level: 1,
          skills: ['power_strike', 'precise_strike', 'fireball'],
          mvuAttributes: {
            力量: 3,
            敏捷: 2,
            防御: 3,
            体质: 8,
            魅力: 3,
            幸运: 2,
            意志: 8,
          },
        },
        {
          id: 'enemy_yokai',
          name: '妖怪',
          side: 'enemy',
          level: 1,
          skills: ['power_strike', 'precise_strike'],
          enemyPortrait: {
            image: 'https://files.catbox.moe/899p4x.png',
            position: { x: 0.5, y: 0.6, scale: 0.65 },
            animation: {
              idle: 'yokai_idle',
              attack: 'yokai_attack',
              damage: 'yokai_damage',
            },
            videos: {
              power_strike: {
                src: 'https://files.catbox.moe/lwa07e.mp4',
                loop: false,
                volume: 0.2,
                playbackRate: 1.0,
                revertOnEnd: true,
              },
              precise_strike: {
                src: 'https://files.catbox.moe/88jeby.mp4',
                loop: true,
                volume: 0,
                playbackRate: 1.0,
                revertOnEnd: false,
                offsetX: -80,
                offsetY: -250,
                vScale: 0.6,
              },
            },
          },
          mvuAttributes: {
            力量: 1,
            敏捷: 1,
            防御: 2,
            体质: 3,
            魅力: 1,
            幸运: 1,
            意志: 1,
          },
        },
      ],
    },
  },
];

// 困难战斗配置已删除，只保留妖怪战斗

// Boss战斗配置已删除，只保留妖怪战斗

// 导出所有基础战斗配置（只保留妖怪战斗）
export const basicBattleConfigs: BattleConfigItem[] = [...normalBattles];
