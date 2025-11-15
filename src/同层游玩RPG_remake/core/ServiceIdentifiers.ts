/**
 * 服务标识符定义
 * 使用 Symbol 确保类型安全和唯一性
 */

export const TYPES = {
  // 核心服务
  EventBus: Symbol.for('EventBus'),
  GameCore: Symbol.for('GameCore'),

  // MVU 相关服务
  StatDataBindingService: Symbol.for('StatDataBindingService'),

  // 酒馆相关服务 (已合并到 SameLayerService)

  // 游戏状态服务
  GameStateService: Symbol.for('GameStateService'),
  SameLayerService: Symbol.for('SameLayerService'),

  // 存档相关服务
  AutoSaveManager: Symbol.for('AutoSaveManager'),
  SaveLoadManagerService: Symbol.for('SaveLoadManagerService'),

  // 其他服务
  DomPortalService: Symbol.for('DomPortalService'),
  ResponsiveService: Symbol.for('ResponsiveService'),
  GlobalStateManager: Symbol.for('GlobalStateManager'),

  // 指令队列服务
  CommandQueueService: Symbol.for('CommandQueueService'),

  // 战斗相关服务
  BattleConfigService: Symbol.for('BattleConfigService'),
  BattleConfigInitializer: Symbol.for('BattleConfigInitializer'),
  BattleService: Symbol.for('BattleService'),
  BattleEngine: Symbol.for('BattleEngine'),
  BattleResultHandler: Symbol.for('BattleResultHandler'),
  BattleResourceService: Symbol.for('BattleResourceService'),
  DynamicEnemyService: Symbol.for('DynamicEnemyService'),

  // Phaser相关服务
  PhaserManager: Symbol.for('PhaserManager'),
} as const;

export type ServiceType = (typeof TYPES)[keyof typeof TYPES];
