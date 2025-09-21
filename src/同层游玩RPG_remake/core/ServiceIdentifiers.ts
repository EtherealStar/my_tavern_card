/**
 * 服务标识符定义
 * 使用 Symbol 确保类型安全和唯一性
 */

export const TYPES = {
  // 核心服务
  EventBus: Symbol.for('EventBus'),
  GameCore: Symbol.for('GameCore'),

  // 基础服务
  UIService: Symbol.for('UIService'),

  // MVU 相关服务
  StatDataBindingService: Symbol.for('StatDataBindingService'),

  // 酒馆相关服务 (已合并到 SameLayerService)

  // 游戏状态服务
  GameStateService: Symbol.for('GameStateService'),
  SameLayerService: Symbol.for('SameLayerService'),

  // 存档相关服务
  AutoSaveManager: Symbol.for('AutoSaveManager'),
  SaveLoadManagerService: Symbol.for('SaveLoadManagerService'),

  // 存档管理组件已整合到useSaveLoad中
  // IndexDBSaveManager: Symbol.for('IndexDBSaveManager'),
  // LoadManager: Symbol.for('LoadManager'),

  // 其他服务
  AchievementService: Symbol.for('AchievementService'),
  DomPortalService: Symbol.for('DomPortalService'),
  ResponsiveService: Symbol.for('ResponsiveService'),

  // 指令队列服务
  CommandQueueService: Symbol.for('CommandQueueService'),
} as const;

export type ServiceType = (typeof TYPES)[keyof typeof TYPES];
