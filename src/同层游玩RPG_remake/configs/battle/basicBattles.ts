import type { BattleConfigItem } from '../../services/BattleConfigService';
import { BattleResourceService } from '../../services/BattleResourceService';

// 获取资源服务实例
const resourceService = new BattleResourceService();
const exampleUrls = resourceService.getExampleUrls();

/**
 * 基础战斗配置
 * 包含各种难度的基础战斗场景
 */

// 简单战斗配置
export const easyBattles: BattleConfigItem[] = [
  {
    id: 'goblin_battle',
    name: '哥布林战斗',
    description: '与弱小哥布林的初次遭遇战',
    difficulty: 'easy',
    tags: ['tutorial', 'goblin', 'forest'],
    config: {
      background: {
        image: exampleUrls.forest_bg,
        scaleMode: 'contain', // 完整显示16:9图片，可能有黑边
      },
      participants: [
        {
          id: 'player',
          name: '勇者',
          side: 'player',
          level: 3, // 简单战斗玩家等级3
          skills: ['power_strike', 'precise_strike'],
          mvuAttributes: {
            力量: 12,
            敏捷: 10,
            防御: 8,
            体质: 6, // hp = 体质 * 20 = 120
            魅力: 5,
            幸运: 4,
            意志: 6, // hhp = 意志 / 50 = 0.12
          },
        },
        {
          id: 'enemy_goblin',
          name: '哥布林',
          side: 'enemy',
          level: 1, // 简单战斗敌人等级1
          skills: ['power_strike'],
          enemyPortrait: {
            image: exampleUrls.goblin,
            position: { x: 0.75, y: 0.4, scale: 0.7 },
            animation: {
              idle: 'goblin_idle',
              attack: 'goblin_attack',
              damage: 'goblin_damage',
            },
            videos: {
              power_strike: {
                src: 'https://files.catbox.moe/sample_video_1.mp4',
                loop: true,
                volume: 0,
                playbackRate: 1.0,
                revertOnEnd: false,
              },
            },
          },
          mvuAttributes: {
            力量: 8,
            敏捷: 6,
            防御: 4,
            体质: 5, // hp = 体质 * 20 = 100
            魅力: 2,
            幸运: 3,
            意志: 4, // hhp = 意志 / 50 = 0.08
          },
        },
      ],
    },
  },
];

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
  {
    id: 'orc_battle',
    name: '兽人战斗',
    description: '与强壮兽人战士的激烈战斗',
    difficulty: 'normal',
    tags: ['orc', 'dungeon', 'warrior'],
    config: {
      background: {
        image: exampleUrls.dungeon_bg,
        scaleMode: 'contain', // 完整显示，适合展示完整场景
        parallax: {
          layers: [
            {
              image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
              speed: 0.2,
              depth: 0.3,
            },
          ],
        },
      },
      participants: [
        {
          id: 'player',
          name: '法师',
          side: 'player',
          level: 10, // 普通战斗玩家等级10
          skills: ['fireball', 'precise_strike'],
          mvuAttributes: {
            力量: 8,
            敏捷: 10,
            防御: 15,
            体质: 6, // hp = 体质 * 20 = 120
            魅力: 8,
            幸运: 6,
            意志: 12, // hhp = 意志 / 50 = 0.24
          },
        },
        {
          id: 'enemy_orc',
          name: '兽人战士',
          side: 'enemy',
          level: 8, // 普通战斗敌人等级8
          skills: ['power_strike'],
          enemyPortrait: {
            image: exampleUrls.orc,
            position: { x: 0.75, y: 0.4, scale: 0.9 },
            animation: {
              idle: 'orc_idle',
              attack: 'orc_attack',
              damage: 'orc_damage',
            },
          },
          mvuAttributes: {
            力量: 15,
            敏捷: 6,
            防御: 4,
            体质: 12, // hp = 体质 * 20 = 240
            魅力: 3,
            幸运: 2,
            意志: 8, // hhp = 意志 / 50 = 0.16
          },
        },
      ],
    },
  },
];

// 困难战斗配置
export const hardBattles: BattleConfigItem[] = [
  {
    id: 'dragon_battle',
    name: '龙族战斗',
    description: '与古老龙族的史诗级战斗',
    difficulty: 'hard',
    tags: ['dragon', 'epic', 'magical'],
    config: {
      background: {
        image: exampleUrls.temple_bg,
        scaleMode: 'cover', // 史诗级战斗，填满画布营造氛围
        parallax: {
          layers: [
            {
              image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
              speed: 0.2,
              depth: 0.3,
            },
            {
              image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
              speed: 0.4,
              depth: 0.6,
            },
          ],
        },
      },
      participants: [
        {
          id: 'player',
          name: '英雄',
          side: 'player',
          level: 16, // 困难战斗玩家等级16
          skills: ['power_strike', 'precise_strike', 'fireball'],
          mvuAttributes: {
            力量: 18,
            敏捷: 15,
            防御: 12,
            体质: 10, // hp = 体质 * 20 = 200
            魅力: 8,
            幸运: 7,
            意志: 10, // hhp = 意志 / 50 = 0.2
          },
        },
        {
          id: 'enemy_dragon',
          name: '古龙',
          side: 'enemy',
          level: 15, // 困难战斗敌人等级15
          skills: ['power_strike', 'fireball'],
          enemyPortrait: {
            image: exampleUrls.dragon,
            position: { x: 0.75, y: 0.35, scale: 1.1 },
            animation: {
              idle: 'dragon_idle',
              attack: 'dragon_attack',
              damage: 'dragon_damage',
            },
            videos: {
              power_strike: {
                src: 'https://files.catbox.moe/sample_video_4.mp4',
                loop: true,
                volume: 0.1,
                playbackRate: 1.0,
                revertOnEnd: false,
              },
              fireball: {
                src: 'https://files.catbox.moe/sample_video_5.mp4',
                loop: false,
                volume: 0.3,
                playbackRate: 1.0,
                revertOnEnd: true,
              },
            },
          },
          mvuAttributes: {
            力量: 20,
            敏捷: 10,
            防御: 18,
            体质: 15, // hp = 体质 * 20 = 300
            魅力: 12,
            幸运: 8,
            意志: 15, // hhp = 意志 / 50 = 0.3
          },
        },
      ],
    },
  },
];

// Boss战斗配置
export const bossBattles: BattleConfigItem[] = [
  {
    id: 'demon_lord_battle',
    name: '恶魔领主战斗',
    description: '与恶魔领主的终极决战',
    difficulty: 'boss',
    tags: ['demon', 'boss', 'final', 'epic'],
    config: {
      background: {
        image: exampleUrls.temple_bg,
        scaleMode: 'cover', // Boss战斗，填满画布营造紧张氛围
        parallax: {
          layers: [
            {
              image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
              speed: 0.2,
              depth: 0.3,
            },
            {
              image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
              speed: 0.4,
              depth: 0.6,
            },
            {
              image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&h=1080&fit=crop',
              speed: 0.8,
              depth: 0.9,
            },
          ],
        },
      },
      participants: [
        {
          id: 'player',
          name: '传奇英雄',
          side: 'player',
          level: 20, // Boss战斗玩家等级20
          skills: ['power_strike', 'precise_strike', 'fireball'],
          mvuAttributes: {
            力量: 20,
            敏捷: 18,
            防御: 15,
            体质: 12, // hp = 体质 * 20 = 240
            魅力: 10,
            幸运: 8,
            意志: 12, // hhp = 意志 / 50 = 0.24
          },
        },
        {
          id: 'boss_demon',
          name: '恶魔领主',
          side: 'enemy',
          level: 20, // Boss战斗敌人等级20
          skills: ['power_strike', 'fireball'],
          enemyPortrait: {
            image: exampleUrls.demon,
            position: { x: 0.75, y: 0.35, scale: 1.2 },
            animation: {
              idle: 'demon_idle',
              attack: 'demon_attack',
              damage: 'demon_damage',
            },
          },
          mvuAttributes: {
            力量: 25,
            敏捷: 15,
            防御: 20,
            体质: 18, // hp = 体质 * 20 = 360
            魅力: 15,
            幸运: 10,
            意志: 18, // hhp = 意志 / 50 = 0.36
          },
        },
      ],
    },
  },
];

// 导出所有基础战斗配置
export const basicBattleConfigs: BattleConfigItem[] = [
  ...easyBattles,
  ...normalBattles,
  ...hardBattles,
  ...bossBattles,
];
