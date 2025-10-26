/**
 * 战斗日志描述系统数据结构定义
 *
 * 本文件定义了战斗日志描述系统所需的所有数据结构和类型定义
 */

// 描述类型枚举
export enum DescriptionType {
  PHYSICAL = 'physical', // 物理攻击通用描述
  MAGICAL = 'magical', // 魔法攻击通用描述
  CUSTOM = 'custom', // 专属技能描述
}

// 技能描述配置接口
export interface SkillDescriptionConfig {
  skillId: string;
  type: DescriptionType;
  customDescription?: string; // 专属描述键名（如果type为CUSTOM）
}

// 战斗日志项接口
export interface BattleLogItem {
  id: string;
  timestamp: number;
  type: string;
  actorId: string;
  targetId: string;
  skillId: string;
  damage?: number;
  isCritical: boolean;
  isMiss: boolean;
  description: string;
}

// 描述风格枚举
export enum DescriptionStyle {
  CONCISE = 'concise', // 简洁风格
  NARRATIVE = 'narrative', // 叙事风格
  DRAMATIC = 'dramatic', // 戏剧风格
}

// 通用描述模板接口
export interface GenericDescriptions {
  hit: string[];
  critical: string[];
  miss: string[];
}

// 专属技能描述接口
export interface CustomSkillDescriptions {
  hit: string;
  critical: string;
  miss: string;
}

// 描述模板集合接口
export interface DescriptionTemplates {
  physical: GenericDescriptions;
  magical: GenericDescriptions;
  custom: Record<string, CustomSkillDescriptions>;
}

// 战斗故事生成结果接口
export interface BattleStoryResult {
  introduction: string;
  narrative: string;
  conclusion: string;
  fullStory: string;
}

// 战斗日志统计接口
export interface BattleLogStats {
  totalEvents: number;
  criticalHits: number;
  misses: number;
  averageDamage: number;
  battleDuration: number; // 毫秒
  participants: string[];
}

