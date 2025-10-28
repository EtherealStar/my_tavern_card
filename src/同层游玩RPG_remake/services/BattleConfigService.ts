import { inject, injectable } from 'inversify';
import { EventBus } from '../core/EventBus';
import { TYPES } from '../core/ServiceIdentifiers';
import { DEFAULT_SKILLS } from '../data/skills';
import type { BattleConfig, Skill } from '../models/BattleSchemas';
import { BattleResourceService } from './BattleResourceService';

/**
 * 战斗配置项接口
 */
export interface BattleConfigItem {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'boss';
  config: BattleConfig;
  tags?: string[];
  unlockConditions?: string[];
}

/**
 * 战斗配置模板接口
 */
export interface BattleConfigTemplate {
  id: string;
  name: string;
  type: 'player' | 'enemy' | 'background';
  template: any;
}

/**
 * 技能配置接口
 */
export interface SkillConfigItem {
  id: string;
  skill: Skill;
  source: 'default' | 'custom' | 'imported';
  lastModified?: Date;
}

/**
 * 战斗配置服务（扩展版）
 * 负责管理所有战斗配置和技能配置，提供配置注册、获取、创建等功能
 */
@injectable()
export class BattleConfigService {
  private configs: Map<string, BattleConfigItem> = new Map();
  private templates: Map<string, BattleConfigTemplate> = new Map();
  private skills: Map<string, SkillConfigItem> = new Map();
  private customSkills: Map<string, SkillConfigItem> = new Map();
  private resourceService: BattleResourceService;
  private eventBus: EventBus;

  constructor(
    @inject(TYPES.BattleResourceService) resourceService: BattleResourceService,
    @inject(TYPES.EventBus) eventBus: EventBus,
  ) {
    this.resourceService = resourceService;
    this.eventBus = eventBus;
    this.initializeDefaultSkills();
  }

  // ==================== 技能管理功能 ====================

  /**
   * 初始化默认技能
   */
  private initializeDefaultSkills(): void {
    console.log('[BattleConfigService] 初始化默认技能...');
    DEFAULT_SKILLS.forEach(skill => {
      this.skills.set(skill.id, {
        id: skill.id,
        skill,
        source: 'default',
        lastModified: new Date(),
      });
    });
    console.log(`[BattleConfigService] 已加载 ${this.skills.size} 个默认技能`);
  }

  /**
   * 注册自定义技能
   */
  public registerCustomSkill(skill: Skill): void {
    const skillConfig: SkillConfigItem = {
      id: skill.id,
      skill,
      source: 'custom',
      lastModified: new Date(),
    };

    this.customSkills.set(skill.id, skillConfig);
    console.log(`[BattleConfigService] 注册自定义技能: ${skill.id}`);

    // 发送技能注册事件
    this.eventBus.emit('skill:registered', { skillId: skill.id, skill });
  }

  /**
   * 批量注册自定义技能
   */
  public registerCustomSkills(skills: Skill[]): void {
    skills.forEach(skill => this.registerCustomSkill(skill));
  }

  /**
   * 获取技能
   */
  public getSkill(skillId: string): Skill | undefined {
    // 优先返回自定义技能
    if (this.customSkills.has(skillId)) {
      return this.customSkills.get(skillId)?.skill;
    }

    // 返回默认技能
    return this.skills.get(skillId)?.skill;
  }

  /**
   * 获取技能配置项
   */
  public getSkillConfig(skillId: string): SkillConfigItem | undefined {
    return this.customSkills.get(skillId) || this.skills.get(skillId);
  }

  /**
   * 获取所有技能（包括自定义技能）
   */
  public getAllSkills(): Skill[] {
    const allSkills = new Map<string, Skill>();

    // 添加默认技能
    this.skills.forEach((skillConfig, id) => {
      allSkills.set(id, skillConfig.skill);
    });

    // 添加自定义技能（会覆盖同ID的默认技能）
    this.customSkills.forEach((skillConfig, id) => {
      allSkills.set(id, skillConfig.skill);
    });

    return Array.from(allSkills.values());
  }

  /**
   * 根据分类获取技能
   */
  public getSkillsByCategory(category: string): Skill[] {
    return this.getAllSkills().filter(skill => skill.category === category);
  }

  /**
   * 验证技能ID
   */
  public isValidSkillId(skillId: string): boolean {
    return this.skills.has(skillId) || this.customSkills.has(skillId);
  }

  /**
   * 从战斗配置导入技能
   */
  public importSkillsFromBattleConfig(participants: any[]): void {
    const importedSkills = new Set<string>();

    participants.forEach(participant => {
      if (participant.skills) {
        participant.skills.forEach((skillId: string) => {
          if (!this.isValidSkillId(skillId)) {
            console.warn(`[BattleConfigService] 战斗配置中发现无效技能ID: ${skillId}`);
          } else {
            importedSkills.add(skillId);
          }
        });
      }
    });

    console.log(`[BattleConfigService] 从战斗配置导入了 ${importedSkills.size} 个技能`);

    // 发送技能导入事件
    this.eventBus.emit('skill:imported', {
      skillIds: Array.from(importedSkills),
      source: 'battle_config',
    });
  }

  /**
   * 获取技能统计信息
   */
  public getSkillStats(): {
    totalSkills: number;
    defaultSkills: number;
    customSkills: number;
    skillCategories: Record<string, number>;
  } {
    const allSkills = this.getAllSkills();
    const categories: Record<string, number> = {};

    allSkills.forEach(skill => {
      categories[skill.category] = (categories[skill.category] || 0) + 1;
    });

    return {
      totalSkills: allSkills.length,
      defaultSkills: this.skills.size,
      customSkills: this.customSkills.size,
      skillCategories: categories,
    };
  }

  /**
   * 删除自定义技能
   */
  public deleteCustomSkill(skillId: string): boolean {
    const config = this.getSkillConfig(skillId);
    if (!config || config.source === 'default') {
      console.warn(`[BattleConfigService] 不能删除默认技能: ${skillId}`);
      return false;
    }

    const removed = this.customSkills.delete(skillId);
    if (removed) {
      console.log(`[BattleConfigService] 删除自定义技能: ${skillId}`);

      // 发送技能删除事件
      this.eventBus.emit('skill:deleted', { skillId });
    }

    return removed;
  }

  /**
   * 更新自定义技能
   */
  public updateCustomSkill(skillId: string, updates: Partial<Skill>): boolean {
    const config = this.getSkillConfig(skillId);
    if (!config || config.source === 'default') {
      console.warn(`[BattleConfigService] 不能更新默认技能: ${skillId}`);
      return false;
    }

    const updatedSkill: Skill = {
      ...config.skill,
      ...updates,
      id: skillId, // 确保ID不变
    };

    this.customSkills.set(skillId, {
      ...config,
      skill: updatedSkill,
      lastModified: new Date(),
    });

    console.log(`[BattleConfigService] 更新自定义技能: ${skillId}`);

    // 发送技能更新事件
    this.eventBus.emit('skill:updated', { skillId, skill: updatedSkill });

    return true;
  }

  /**
   * 获取技能来源信息
   */
  public getSkillSource(skillId: string): 'default' | 'custom' | 'imported' | null {
    const config = this.getSkillConfig(skillId);
    return config?.source || null;
  }

  /**
   * 检查技能是否为自定义技能
   */
  public isCustomSkill(skillId: string): boolean {
    return this.customSkills.has(skillId);
  }

  /**
   * 检查技能是否为默认技能
   */
  public isDefaultSkill(skillId: string): boolean {
    return this.skills.has(skillId) && !this.customSkills.has(skillId);
  }

  // ==================== 原有战斗配置功能 ====================

  /**
   * 注册动态战斗配置
   * 用于动态生成的敌人战斗配置
   */
  public registerDynamicBattleConfig(configId: string, battleConfig: BattleConfig): void {
    const configItem: BattleConfigItem = {
      id: configId,
      name: `动态战斗-${configId}`,
      description: '动态生成的敌人战斗配置',
      difficulty: 'normal',
      config: battleConfig,
      tags: ['dynamic', 'enemy'],
    };

    this.configs.set(configId, configItem);
    console.log(`[BattleConfigService] 动态战斗配置已注册: ${configId}`);

    // 从动态配置中导入技能
    this.importSkillsFromBattleConfig(battleConfig.participants || []);
  }

  /**
   * 检查动态配置是否存在
   */
  public hasDynamicConfig(configId: string): boolean {
    return this.configs.has(configId);
  }

  /**
   * 移除动态配置
   */
  public removeDynamicConfig(configId: string): boolean {
    const removed = this.configs.delete(configId);
    if (removed) {
      console.log(`[BattleConfigService] 动态战斗配置已移除: ${configId}`);
    }
    return removed;
  }

  /**
   * 注册战斗配置
   */
  public registerBattleConfig(configItem: BattleConfigItem): void {
    this.configs.set(configItem.id, configItem);

    // 从配置中导入技能
    this.importSkillsFromBattleConfig(configItem.config.participants || []);
  }

  /**
   * 批量注册战斗配置
   */
  public registerBattleConfigs(configItems: BattleConfigItem[]): void {
    configItems.forEach(config => this.registerBattleConfig(config));
  }

  /**
   * 获取战斗配置
   */
  public getBattleConfig(id: string): BattleConfigItem | null {
    return this.configs.get(id) || null;
  }

  /**
   * 获取所有可用的战斗配置
   */
  public getAvailableConfigs(): BattleConfigItem[] {
    return Array.from(this.configs.values());
  }

  /**
   * 根据难度获取战斗配置
   */
  public getConfigsByDifficulty(difficulty: BattleConfigItem['difficulty']): BattleConfigItem[] {
    return this.getAvailableConfigs().filter(config => config.difficulty === difficulty);
  }

  /**
   * 根据标签获取战斗配置
   */
  public getConfigsByTag(tag: string): BattleConfigItem[] {
    return this.getAvailableConfigs().filter(config => config.tags && config.tags.includes(tag));
  }

  /**
   * 注册配置模板
   */
  public registerTemplate(template: BattleConfigTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * 获取配置模板
   */
  public getTemplate(id: string): BattleConfigTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * 创建动态战斗配置
   * 基于模板和覆盖参数创建新的战斗配置
   */
  public createBattleConfig(templateId: string, overrides?: Partial<BattleConfig>): BattleConfig | null {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.error(`[BattleConfigService] 模板不存在: ${templateId}`);
      return null;
    }

    try {
      const config = JSON.parse(JSON.stringify(template.template));
      if (overrides) {
        this.deepMerge(config, overrides);
      }

      // 从创建的配置中导入技能
      this.importSkillsFromBattleConfig(config.participants || []);

      return config;
    } catch (error) {
      console.error(`[BattleConfigService] 创建战斗配置失败:`, error);
      return null;
    }
  }

  /**
   * 基于现有配置创建新配置
   */
  public createBattleConfigFromExisting(baseConfigId: string, overrides?: Partial<BattleConfig>): BattleConfig | null {
    const baseConfig = this.getBattleConfig(baseConfigId);
    if (!baseConfig) {
      console.error(`[BattleConfigService] 基础配置不存在: ${baseConfigId}`);
      return null;
    }

    try {
      const config = JSON.parse(JSON.stringify(baseConfig.config));
      if (overrides) {
        this.deepMerge(config, overrides);
      }

      // 从创建的配置中导入技能
      this.importSkillsFromBattleConfig(config.participants || []);

      return config;
    } catch (error) {
      console.error(`[BattleConfigService] 基于现有配置创建失败:`, error);
      return null;
    }
  }

  /**
   * 验证战斗配置
   * 现在包含技能验证
   */
  public validateBattleConfig(config: BattleConfig): boolean {
    // 开发模式：跳过所有验证
    const DEV_MODE = true;
    if (DEV_MODE) {
      console.log('[BattleConfigService] 开发模式：跳过战斗配置验证');
      return true;
    }

    try {
      // 基本验证
      if (!config.participants || config.participants.length < 2) {
        console.error('[BattleConfigService] 战斗配置验证失败: 参与者数量不足');
        return false;
      }

      // 验证参与者
      for (const participant of config.participants) {
        if (!participant.id || !participant.name || (participant.hp || 0) <= 0) {
          console.error('[BattleConfigService] 战斗配置验证失败: 参与者配置无效', participant);
          return false;
        }

        // 验证技能ID
        if (participant.skills) {
          for (const skillId of participant.skills) {
            if (!this.isValidSkillId(skillId)) {
              console.error(`[BattleConfigService] 战斗配置验证失败: 无效技能ID ${skillId}`, participant);
              return false;
            }
          }
        }
      }

      // 验证背景URL（如果存在）
      if (config.background?.image && !this.resourceService.isValidUrl(config.background.image)) {
        console.error('[BattleConfigService] 战斗配置验证失败: 背景URL无效', config.background.image);
        return false;
      }

      // 验证敌人立绘URL（如果存在）
      for (const participant of config.participants) {
        if (participant.side === 'enemy' && participant.enemyPortrait?.image) {
          if (!this.resourceService.isValidUrl(participant.enemyPortrait.image)) {
            console.error('[BattleConfigService] 战斗配置验证失败: 敌人立绘URL无效', participant.enemyPortrait.image);
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('[BattleConfigService] 战斗配置验证异常:', error);
      return false;
    }
  }

  /**
   * 获取随机战斗配置
   */
  public getRandomBattleConfig(difficulty?: BattleConfigItem['difficulty']): BattleConfigItem | null {
    const configs = difficulty ? this.getConfigsByDifficulty(difficulty) : this.getAvailableConfigs();
    if (configs.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * configs.length);
    return configs[randomIndex];
  }

  /**
   * 清除所有配置
   */
  public clearAllConfigs(): void {
    this.configs.clear();
    this.templates.clear();
    this.customSkills.clear();
    // 注意：不清除默认技能
  }

  /**
   * 获取配置统计信息（扩展版）
   */
  public getConfigStats(): {
    totalConfigs: number;
    configsByDifficulty: Record<string, number>;
    totalTemplates: number;
    skillStats: {
      totalSkills: number;
      defaultSkills: number;
      customSkills: number;
      skillCategories: Record<string, number>;
    };
  } {
    const configs = this.getAvailableConfigs();
    const configsByDifficulty: Record<string, number> = {};

    configs.forEach(config => {
      configsByDifficulty[config.difficulty] = (configsByDifficulty[config.difficulty] || 0) + 1;
    });

    return {
      totalConfigs: configs.length,
      configsByDifficulty,
      totalTemplates: this.templates.size,
      skillStats: this.getSkillStats(),
    };
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          this.deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }
}
