import {
  DifficultySchema,
  GameWorldSchema,
  validateAndCorrectAttributes,
  validateDestinyPoints,
} from '../models/schemas';
import creationHtml from '../views/creation-steps.html?raw';
import { BaseController } from './BaseController';

/**
 * CreationController - 角色创建控制器
 *
 * 职责：
 * - 管理分步角色创建流程
 * - 处理难度、世界、属性、天赋选择
 * - 验证创建步骤的完整性
 */
export class CreationController extends BaseController {
  private readonly steps = ['difficulty', 'world', 'attributes', 'talents'] as const;
  private currentStepIndex = 0;

  constructor() {
    super();
  }

  /**
   * 挂载控制器
   */
  mount(selector: string): void {
    if (this.mounted) return;

    try {
      // 渲染界面
      $(selector).html(creationHtml);

      // 初始化步骤
      this.initializeCreation();

      // 绑定事件
      this.bindEvents(selector);

      // 显示当前步骤
      this.showCurrentStep(selector);
      this.updateNavigation(selector);

      this.mounted = true;
      this.emit('controller:mounted', { controller: 'CreationController' });

      console.log('[CreationController] 角色创建界面已挂载');
    } catch (error) {
      console.error('[CreationController] 挂载失败:', error);
      this.emit('controller:error', { controller: 'CreationController', error });
    }
  }

  /**
   * 初始化创建流程
   */
  private initializeCreation(): void {
    const state = this.getState();

    // 确保创建步骤已设置
    if (!state.creation_step) {
      this.updateState(
        {
          creation_step: 'difficulty',
        },
        { reason: 'initialize-creation' },
      );
    }

    // 设置当前步骤索引
    this.currentStepIndex = this.steps.indexOf(state.creation_step as any);
    if (this.currentStepIndex === -1) {
      this.currentStepIndex = 0;
    }
  }

  /**
   * 绑定界面事件
   */
  private bindEvents(selector: string): void {
    // 难度选择
    $(selector)
      .find('.btn-diff')
      .on('click', e => {
        this.handleDifficultySelect(e);
      });

    // 世界选择
    $(selector)
      .find('.btn-world')
      .on('click', e => {
        this.handleWorldSelect(e);
      });

    // 属性分配滑条
    $(selector)
      .find('.slider')
      .on('input', () => {
        this.handleAttributeChange(selector);
      });

    // 天赋选择
    $(selector)
      .find('.btn-talent')
      .on('click', e => {
        this.handleTalentSelect(e);
      });

    // 导航按钮
    $(selector)
      .find('.btn-prev')
      .on('click', () => {
        this.handlePreviousStep(selector);
      });

    $(selector)
      .find('.btn-next')
      .on('click', () => {
        this.handleNextStep(selector);
      });

    $(selector)
      .find('.btn-start-play')
      .on('click', () => {
        this.handleStartPlay();
      });

    $(selector)
      .find('.btn-back-menu')
      .on('click', () => {
        this.handleBackToMenu();
      });

    // 步骤指示器点击
    $(selector)
      .find('.indicator')
      .on('click', e => {
        this.handleStepIndicatorClick(e, selector);
      });
  }

  /**
   * 处理难度选择（使用Zod验证）
   */
  private handleDifficultySelect(e: JQuery.ClickEvent): void {
    try {
      const $btn = $(e.currentTarget);
      const rawDifficulty = $btn.data('diff');

      // 使用Zod验证难度值
      const difficultyValidation = DifficultySchema.safeParse(rawDifficulty);
      if (!difficultyValidation.success) {
        console.error('[CreationController] 无效的难度值:', rawDifficulty);
        toastr.error('无效的难度选择');
        return;
      }

      const difficulty = difficultyValidation.data;

      // 更新UI选择状态
      $('.btn-diff').removeClass('selected');
      $btn.addClass('selected');

      // 使用Zod验证计算点数配置
      const PointsConfigSchema = z.object({
        difficulty: DifficultySchema,
        destinyPoints: z.number().int().min(10).max(100),
        attributePoints: z.number().int().min(10).max(50),
      });

      const pointsConfig = {
        difficulty,
        destinyPoints: difficulty === '简单' ? 60 : difficulty === '普通' ? 50 : 40,
        attributePoints: difficulty === '简单' ? 30 : difficulty === '普通' ? 20 : 15,
      };

      const configValidation = PointsConfigSchema.safeParse(pointsConfig);
      if (!configValidation.success) {
        console.error('[CreationController] 点数配置验证失败:', configValidation.error);
        toastr.error('点数配置错误');
        return;
      }

      const { destinyPoints, attributePoints } = configValidation.data;

      // 构建并验证天命点数据
      const destinyPointsData = {
        total: destinyPoints,
        used: 0,
        left: destinyPoints,
      };

      const destinyValidation = validateDestinyPoints(destinyPointsData);
      if (!destinyValidation.success) {
        console.error('[CreationController] 天命点数据验证失败:', destinyValidation.errors);
        toastr.error('天命点数据错误');
        return;
      }

      // 构建并验证属性数据
      const attributesData = {
        strength: 0,
        agility: 0,
        intelligence: 0,
        constitution: 0,
        charisma: 0,
        willpower: 0,
        luck: 0,
        pointsLeft: attributePoints,
      };

      const attributeValidation = validateAndCorrectAttributes(attributesData, attributePoints);
      if (!attributeValidation.success) {
        console.error('[CreationController] 属性数据验证失败:', attributeValidation.errors);
        toastr.error('属性数据错误');
        return;
      }

      // 更新状态
      this.updateState(
        {
          difficulty,
          destinyPoints: destinyValidation.data!,
          attributes: attributeValidation.data!,
        },
        { reason: 'difficulty-selected', allowCorrection: true },
      );

      this.emit('creation:difficulty-selected', {
        difficulty,
        destinyPoints: destinyValidation.data!.total,
        attributePoints,
      });

      console.log('[CreationController] 已选择难度:', difficulty);
      toastr.success(`已选择${difficulty}难度`);
    } catch (error) {
      console.error('[CreationController] 难度选择失败:', error);
      toastr.error('难度选择失败');
    }
  }

  /**
   * 处理世界选择（使用Zod验证）
   */
  private handleWorldSelect(e: JQuery.ClickEvent): void {
    try {
      const $btn = $(e.currentTarget);
      const rawWorld = $btn.data('world');

      // 使用Zod验证世界值
      const worldValidation = GameWorldSchema.safeParse(rawWorld);
      if (!worldValidation.success) {
        console.error('[CreationController] 无效的世界值:', rawWorld);
        toastr.error('无效的世界选择');
        return;
      }

      const world = worldValidation.data;

      // 更新UI选择状态（使用jQuery）
      $('.btn-world').removeClass('selected');
      $btn.addClass('selected');

      // 更新状态
      this.updateState({ world }, { reason: 'world-selected', allowCorrection: true });

      this.emit('creation:world-selected', { world });
      console.log('[CreationController] 已选择世界:', world);
      toastr.success(`已选择${world}世界`);
    } catch (error) {
      console.error('[CreationController] 世界选择失败:', error);
      toastr.error('世界选择失败');
    }
  }

  /**
   * 处理属性变更（使用Zod验证和纠错）
   */
  private handleAttributeChange(selector: string): void {
    try {
      const state = this.getState();
      const maxPoints = this.getMaxAttributePoints();

      // 使用jQuery收集属性数据
      const rawAttributes: any = {};
      $(selector)
        .find('.slider')
        .each((_, el) => {
          const $slider = $(el);
          const attrKey = $slider.data('attr') as string;
          const rawValue = $slider.val() as string;

          // 验证数值输入
          const numericValue = parseInt(rawValue);
          if (!isNaN(numericValue) && attrKey && attrKey !== 'pointsLeft') {
            rawAttributes[attrKey] = Math.max(0, Math.min(100, numericValue));
          }
        });

      // 添加pointsLeft字段
      rawAttributes.pointsLeft = 0; // 临时值，会在验证时重新计算

      // 使用Zod验证并自动纠正属性
      const validationResult = validateAndCorrectAttributes(rawAttributes, maxPoints);

      if (!validationResult.success) {
        console.error('[CreationController] 属性验证失败:', validationResult.errors);
        toastr.error('属性数据无效');
        return;
      }

      const validatedAttributes = validationResult.data!;

      // 如果进行了自动纠正，更新UI显示
      if (validationResult.corrected) {
        console.warn('[CreationController] 属性已自动纠正');
        toastr.warning('属性点数已自动调整');

        // 更新滑条显示为纠正后的值
        $(selector)
          .find('.slider')
          .each((_, el) => {
            const $slider = $(el);
            const attrKey = $slider.data('attr') as string;

            if (attrKey && attrKey !== 'pointsLeft' && validatedAttributes[attrKey] !== undefined) {
              $slider.val(validatedAttributes[attrKey]);
            }
          });
      }

      // 更新状态
      this.updateState(
        {
          attributes: validatedAttributes,
        },
        { reason: 'attributes-changed', allowCorrection: false }, // 已经验证过了
      );

      // 更新UI显示
      this.refreshAttributesUI(selector);

      const totalUsed =
        validatedAttributes.strength +
        validatedAttributes.agility +
        validatedAttributes.intelligence +
        validatedAttributes.constitution +
        validatedAttributes.charisma +
        validatedAttributes.willpower +
        validatedAttributes.luck;

      this.emit('creation:attributes-changed', {
        attributes: validatedAttributes,
        totalUsed,
        remaining: validatedAttributes.pointsLeft,
        corrected: validationResult.corrected || false,
      });
    } catch (error) {
      console.error('[CreationController] 属性变更失败:', error);
      toastr.error('属性变更失败');
    }
  }

  /**
   * 处理天赋选择
   */
  private handleTalentSelect(e: JQuery.ClickEvent): void {
    try {
      const $btn = $(e.currentTarget);
      const talent = $btn.data('talent') as string;
      const state = this.getState();

      if ($btn.hasClass('selected')) {
        // 取消选择
        $btn.removeClass('selected');
        const updatedTalents = state.selectedTalents.filter(t => t.name !== talent);

        this.updateState(
          {
            selectedTalents: updatedTalents,
          },
          { reason: 'talent-deselected' },
        );

        toastr.info(`取消天赋：${talent}`);
        this.emit('creation:talent-deselected', { talent });
      } else {
        // 选择天赋
        $btn.addClass('selected');

        // 这里应该从天赋数据中获取完整的天赋信息
        const talentData = { name: talent, description: '', cost: 0, attributeBonus: {} };
        const updatedTalents = [...state.selectedTalents, talentData];

        this.updateState(
          {
            selectedTalents: updatedTalents,
          },
          { reason: 'talent-selected' },
        );

        toastr.success(`选择天赋：${talent}`);
        this.emit('creation:talent-selected', { talent: talentData });
      }
    } catch (error) {
      console.error('[CreationController] 天赋选择失败:', error);
      toastr.error('天赋选择失败');
    }
  }

  /**
   * 处理上一步
   */
  private handlePreviousStep(selector: string): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.updateCurrentStep(selector);
    }
  }

  /**
   * 处理下一步
   */
  private handleNextStep(selector: string): void {
    if (this.canProceedToNextStep() && this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.updateCurrentStep(selector);
    } else {
      toastr.warning('请完成当前步骤');
    }
  }

  /**
   * 处理开始游戏
   */
  private handleStartPlay(): void {
    try {
      if (!this.canStartPlay()) {
        toastr.warning('请完成所有创建步骤');
        return;
      }

      this.updateState({ phase: 'playing' }, { reason: 'start-playing' });

      this.emit('creation:completed');
      this.emit('game:play-started');

      console.log('[CreationController] 开始游戏');
    } catch (error) {
      console.error('[CreationController] 开始游戏失败:', error);
      toastr.error('开始游戏失败');
    }
  }

  /**
   * 处理返回主菜单
   */
  private handleBackToMenu(): void {
    try {
      this.updateState(
        {
          phase: 'start',
          creation_step: null,
        },
        { reason: 'back-to-menu' },
      );

      this.emit('creation:cancelled');
      console.log('[CreationController] 返回主菜单');
    } catch (error) {
      console.error('[CreationController] 返回主菜单失败:', error);
    }
  }

  /**
   * 处理步骤指示器点击
   */
  private handleStepIndicatorClick(e: JQuery.ClickEvent, selector: string): void {
    const $indicator = $(e.currentTarget);
    const targetStep = $indicator.data('step') as string;
    const targetIndex = this.steps.indexOf(targetStep as any);

    if (targetIndex !== -1 && this.isStepAccessible(targetIndex)) {
      this.currentStepIndex = targetIndex;
      this.updateCurrentStep(selector);
    }
  }

  /**
   * 更新当前步骤
   */
  private updateCurrentStep(selector: string): void {
    const currentStep = this.steps[this.currentStepIndex];

    this.updateState(
      {
        creation_step: currentStep,
      },
      { reason: 'step-changed' },
    );

    this.showCurrentStep(selector);
    this.updateNavigation(selector);

    this.emit('creation:step-changed', { step: currentStep, index: this.currentStepIndex });
  }

  /**
   * 显示当前步骤
   */
  private showCurrentStep(selector: string): void {
    const currentStep = this.steps[this.currentStepIndex];

    // 隐藏所有步骤页面
    $(selector).find('.step-page').removeClass('active');

    // 显示当前步骤
    $(selector).find(`[data-step="${currentStep}"]`).addClass('active');

    // 更新步骤指示器
    $(selector).find('.indicator').removeClass('active');
    $(selector).find(`.indicator[data-step="${currentStep}"]`).addClass('active');
  }

  /**
   * 更新导航按钮状态
   */
  private updateNavigation(selector: string): void {
    const $prevBtn = $(selector).find('.btn-prev');
    const $nextBtn = $(selector).find('.btn-next');
    const $startBtn = $(selector).find('.btn-start-play');

    // 上一步按钮
    $prevBtn.prop('disabled', this.currentStepIndex <= 0);

    // 下一步和开始游戏按钮
    const canProceed = this.canProceedToNextStep();
    const isLastStep = this.currentStepIndex >= this.steps.length - 1;

    if (isLastStep) {
      $nextBtn.hide();
      $startBtn.show().prop('disabled', !this.canStartPlay());
    } else {
      $nextBtn.show().prop('disabled', !canProceed);
      $startBtn.hide();
    }
  }

  /**
   * 检查是否可以进入下一步
   */
  private canProceedToNextStep(): boolean {
    const state = this.getState();
    const currentStep = this.steps[this.currentStepIndex];

    switch (currentStep) {
      case 'difficulty':
        return !!state.difficulty;
      case 'world':
        return !!state.world;
      case 'attributes':
        return state.attributes.pointsLeft === 0;
      case 'talents':
        return true; // 天赋选择是可选的
      default:
        return false;
    }
  }

  /**
   * 检查是否可以开始游戏
   */
  private canStartPlay(): boolean {
    const state = this.getState();
    return !!(state.difficulty && state.world && state.attributes.pointsLeft === 0);
  }

  /**
   * 检查步骤是否可访问
   */
  private isStepAccessible(stepIndex: number): boolean {
    const state = this.getState();

    switch (stepIndex) {
      case 0: // difficulty
        return true;
      case 1: // world
        return !!state.difficulty;
      case 2: // attributes
        return !!(state.difficulty && state.world);
      case 3: // talents
        return !!(state.difficulty && state.world);
      default:
        return false;
    }
  }

  /**
   * 获取最大属性点数
   */
  private getMaxAttributePoints(): number {
    const state = this.getState();
    const difficulty = state.difficulty;
    return difficulty === '简单' ? 30 : difficulty === '普通' ? 20 : 15;
  }

  /**
   * 刷新属性UI显示
   */
  private refreshAttributesUI(selector: string): void {
    const state = this.getState();
    const attributes = state.attributes;

    // 更新剩余点数显示
    const $pointsLeft = $(selector).find('.points-left');
    $pointsLeft.text(String(attributes.pointsLeft));

    if (attributes.pointsLeft === 0) {
      $pointsLeft.addClass('zero-points');
    } else {
      $pointsLeft.removeClass('zero-points');
    }

    // 更新滑条和数值显示
    $(selector)
      .find('.slider')
      .each((_, el) => {
        const $slider = $(el);
        const attrKey = $slider.data('attr') as string;

        if (attrKey && attrKey !== 'pointsLeft' && attributes[attrKey] !== undefined) {
          const value = attributes[attrKey];
          $slider.val(value);
          $slider.closest('.attr-slider').find('.attr-value').text(String(value));
        }
      });
  }

  /**
   * 卸载控制器
   */
  unmount(): void {
    if (!this.mounted) return;

    try {
      super.unmount();
      console.log('[CreationController] 控制器已卸载');
    } catch (error) {
      console.error('[CreationController] 卸载失败:', error);
    }
  }
}
