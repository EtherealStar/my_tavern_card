import { MvuVariableService } from '../services/MvuVariableService';
import { SameLayerService } from '../services/SameLayerService';
import { WorldbookService } from '../services/WorldbookService';
import playingHtml from '../views/playing.html?raw';
import { BaseController } from './BaseController';

/**
 * PlayController - 游戏界面控制器
 *
 * 职责：
 * - 管理游戏主界面（使用jQuery操作）
 * - 处理存档和读档操作
 * - 集成AI生成功能（流式和非流式）
 * - 使用Mvu管理游戏状态
 */
export class PlayController extends BaseController {
  private sameLayerService: SameLayerService;
  private worldbookService: WorldbookService;
  private mvuVariableService: MvuVariableService;

  constructor() {
    super();
    this.sameLayerService = this.getService<SameLayerService>('sameLayerService');
    this.worldbookService = this.getService<WorldbookService>('worldbookService');
    this.mvuVariableService = this.getService<MvuVariableService>('mvuVariableService');
  }

  /**
   * 挂载控制器
   */
  mount(selector: string): void {
    if (this.mounted) return;

    try {
      // 渲染界面
      $(selector).html(playingHtml);

      // 绑定事件
      this.bindEvents(selector);

      // 初始化界面状态
      this.initializeInterface(selector);

      this.mounted = true;
      this.emit('controller:mounted', { controller: 'PlayController' });

      console.log('[PlayController] 游戏界面已挂载');
    } catch (error) {
      console.error('[PlayController] 挂载失败:', error);
      this.emit('controller:error', { controller: 'PlayController', error });
    }
  }

  /**
   * 绑定界面事件
   */
  private bindEvents(selector: string): void {
    // 存档按钮
    $(selector)
      .find('.btn-save')
      .on('click', async () => {
        await this.handleSaveGame();
      });

    // 读档按钮
    $(selector)
      .find('.btn-load')
      .on('click', async () => {
        await this.handleLoadGame();
      });

    // 返回主菜单按钮
    $(selector)
      .find('.btn-back-menu')
      .on('click', () => {
        this.handleBackToMenu();
      });

    // AI生成按钮（普通）
    $(selector)
      .find('.btn-ai-generate')
      .on('click', async () => {
        await this.handleAIGenerateNormal(selector);
      });

    // AI生成按钮（流式）
    $(selector)
      .find('.btn-ai-generate-streaming')
      .on('click', async () => {
        await this.handleAIGenerateStreaming(selector);
      });

    // 角色信息按钮
    $(selector)
      .find('.btn-character-info')
      .on('click', () => {
        this.handleShowCharacterInfo();
      });

    // 游戏设置按钮
    $(selector)
      .find('.btn-game-settings')
      .on('click', () => {
        this.handleShowGameSettings();
      });

    // 成就按钮
    $(selector)
      .find('.btn-achievements')
      .on('click', () => {
        this.handleShowAchievements();
      });
  }

  /**
   * 初始化界面状态
   */
  private initializeInterface(selector: string): void {
    try {
      // 从Mvu获取游戏状态
      const gameState = this.mvuVariableService.getMvuVariable('rpg_game', {
        default_value: {},
      });

      // 显示角色信息
      this.updateCharacterInfo(selector, gameState);

      // 显示游戏统计
      this.updateGameStats(selector, gameState);

      // 检查生成功能状态
      const generateReady = typeof generate !== 'undefined';
      $(selector).find('.btn-ai-generate').prop('disabled', !generateReady);
      $(selector).find('.btn-ai-generate-streaming').prop('disabled', !generateReady);

      if (!generateReady) {
        $(selector).find('.ai-status').text('生成功能未就绪').addClass('error');
      } else {
        $(selector).find('.ai-status').text('生成功能就绪').removeClass('error');
      }

      // 获取并显示第0层消息内容
      const layer0Content = this.sameLayerService.getLayer0Message();
      $(selector)
        .find('.current-message-content')
        .text(layer0Content || '暂无内容');

      console.log('[PlayController] 界面初始化完成');
    } catch (error) {
      console.error('[PlayController] 界面初始化失败:', error);
    }
  }

  /**
   * 更新角色信息显示
   */
  private updateCharacterInfo(selector: string, state: any): void {
    try {
      // 显示基本信息
      $(selector)
        .find('.character-name')
        .text(state.character?.name || '未知');
      $(selector)
        .find('.character-world')
        .text(state.world || '未知');
      $(selector)
        .find('.character-difficulty')
        .text(state.difficulty || '未知');

      // 显示属性
      if (state.attributes) {
        $(selector)
          .find('.attr-strength')
          .text(state.attributes.strength || 0);
        $(selector)
          .find('.attr-agility')
          .text(state.attributes.agility || 0);
        $(selector)
          .find('.attr-intelligence')
          .text(state.attributes.intelligence || 0);
        $(selector)
          .find('.attr-constitution')
          .text(state.attributes.constitution || 0);
        $(selector)
          .find('.attr-charisma')
          .text(state.attributes.charisma || 0);
        $(selector)
          .find('.attr-willpower')
          .text(state.attributes.willpower || 0);
        $(selector)
          .find('.attr-luck')
          .text(state.attributes.luck || 0);
      }

      // 显示天赋
      const talents = state.selectedTalents || [];
      const talentText = talents.length > 0 ? talents.map((t: any) => t.name).join('、') : '无';
      $(selector).find('.character-talents').text(talentText);
    } catch (error) {
      console.error('[PlayController] 更新角色信息失败:', error);
    }
  }

  /**
   * 更新游戏统计
   */
  private updateGameStats(selector: string, state: any): void {
    try {
      // 显示天命点
      if (state.destinyPoints) {
        $(selector)
          .find('.destiny-total')
          .text(state.destinyPoints.total || 0);
        $(selector)
          .find('.destiny-used')
          .text(state.destinyPoints.used || 0);
        $(selector)
          .find('.destiny-left')
          .text(state.destinyPoints.left || 0);
      }

      // 显示成就数量
      const achievements = state.achievements || [];
      $(selector).find('.achievements-count').text(achievements.length);

      // 显示游戏时间（如果有记录的话）
      const startTime = state.startTime;
      if (startTime) {
        const playTime = Date.now() - new Date(startTime).getTime();
        const hours = Math.floor(playTime / (1000 * 60 * 60));
        const minutes = Math.floor((playTime % (1000 * 60 * 60)) / (1000 * 60));
        $(selector).find('.play-time').text(`${hours}小时${minutes}分钟`);
      } else {
        $(selector).find('.play-time').text('未知');
      }
    } catch (error) {
      console.error('[PlayController] 更新游戏统计失败:', error);
    }
  }

  /**
   * 处理存档
   */
  private async handleSaveGame(): Promise<void> {
    try {
      // 从Mvu获取当前游戏状态
      const gameState = this.mvuVariableService.getMvuVariable('rpg_game', {
        default_value: {},
      });

      await this.worldbookService.saveGameState(gameState, {
        name: '同层游玩RPG-存档',
        description: `${gameState.character?.name || '角色'} - ${
          gameState.world || '世界'
        } - ${new Date().toLocaleString()}`,
      });

      // 覆盖第0层消息
      await this.sameLayerService.overrideLayer0Message('游戏已保存', {
        rpg: gameState,
        saved_at: new Date().toISOString(),
      });

      this.emit('game:saved', gameState);
      toastr.success('存档成功');

      console.log('[PlayController] 游戏存档成功');
    } catch (error) {
      console.error('[PlayController] 存档失败:', error);
      toastr.error('存档失败');
    }
  }

  /**
   * 处理读档
   */
  private async handleLoadGame(): Promise<void> {
    try {
      const gameState = await this.worldbookService.loadGameState();

      if (gameState) {
        // 更新状态
        this.stateManager.updateState(() => gameState, {
          reason: 'load-game-in-play',
          saveToHistory: false,
        });

        // 写入同层
        await this.sameLayerService.writeGameStateToSameLayer(gameState, '读档成功，游戏状态已更新');

        // 重新初始化界面
        this.initializeInterface('#app');

        this.emit('game:loaded-in-play', gameState);
        toastr.success('读档成功');

        console.log('[PlayController] 游戏读档成功');
      } else {
        toastr.info('没有可用存档');
      }
    } catch (error) {
      console.error('[PlayController] 读档失败:', error);
      toastr.error('读档失败');
    }
  }

  /**
   * 处理返回主菜单
   */
  private handleBackToMenu(): void {
    try {
      // 询问是否保存
      const shouldSave = confirm('是否保存当前游戏进度？');

      if (shouldSave) {
        this.handleSaveGame()
          .then(() => {
            this.navigateToMenu();
          })
          .catch(error => {
            console.error('[PlayController] 保存失败:', error);
            // 即使保存失败也允许返回
            this.navigateToMenu();
          });
      } else {
        this.navigateToMenu();
      }
    } catch (error) {
      console.error('[PlayController] 返回主菜单失败:', error);
    }
  }

  /**
   * 导航到主菜单
   */
  private navigateToMenu(): void {
    this.updateState(
      {
        phase: 'start',
      },
      { reason: 'back-to-menu-from-play' },
    );

    this.emit('game:back-to-menu');
    console.log('[PlayController] 返回主菜单');
  }

  /**
   * 处理AI生成（普通模式）
   */
  private async handleAIGenerateNormal(selector: string): Promise<void> {
    try {
      if (typeof generate === 'undefined') {
        toastr.error('生成功能未就绪');
        return;
      }

      // 从Mvu获取游戏状态
      const gameState = this.mvuVariableService.getMvuVariable('rpg_game', {
        default_value: {},
      });

      // 构建生成提示
      const prompt = this.buildGenerationPrompt(gameState);

      // 显示生成中状态
      const $generateBtn = $(selector).find('.btn-ai-generate');
      const originalText = $generateBtn.text();
      $generateBtn.prop('disabled', true).text('生成中...');

      try {
        // 生成并覆盖第0层消息
        const generatedContent = await this.sameLayerService.generateAndOverrideNormal(prompt, gameState);

        // 更新界面显示
        $(selector).find('.current-message-content').text(generatedContent);

        this.emit('ai:content-generated', {
          content: generatedContent,
          context: gameState,
          streaming: false,
        });
        toastr.success('AI内容生成成功');
      } finally {
        // 恢复按钮状态
        $generateBtn.prop('disabled', false).text(originalText);
      }
    } catch (error) {
      console.error('[PlayController] AI生成失败:', error);
      toastr.error('AI生成失败');
    }
  }

  /**
   * 处理AI生成（流式模式）
   */
  private async handleAIGenerateStreaming(selector: string): Promise<void> {
    try {
      if (typeof generate === 'undefined') {
        toastr.error('生成功能未就绪');
        return;
      }

      // 从Mvu获取游戏状态
      const gameState = this.mvuVariableService.getMvuVariable('rpg_game', {
        default_value: {},
      });

      // 构建生成提示
      const prompt = this.buildGenerationPrompt(gameState);

      // 显示生成中状态
      const $generateBtn = $(selector).find('.btn-ai-generate-streaming');
      const originalText = $generateBtn.text();
      $generateBtn.prop('disabled', true).text('流式生成中...');

      try {
        // 流式生成并覆盖第0层消息
        const generatedContent = await this.sameLayerService.generateAndOverrideStreaming(prompt, gameState);

        // 更新界面显示
        $(selector).find('.current-message-content').text(generatedContent);

        this.emit('ai:content-generated', {
          content: generatedContent,
          context: gameState,
          streaming: true,
        });
        toastr.success('流式AI内容生成成功');
      } finally {
        // 恢复按钮状态
        $generateBtn.prop('disabled', false).text(originalText);
      }
    } catch (error) {
      console.error('[PlayController] 流式AI生成失败:', error);
      toastr.error('流式AI生成失败');
    }
  }

  /**
   * 构建生成提示
   */
  private buildGenerationPrompt(gameState: any): string {
    const parts = ['请基于以下游戏状态生成相应的RPG内容：'];

    if (gameState.character?.name) {
      parts.push(`角色：${gameState.character.name}`);
    }

    if (gameState.world) {
      parts.push(`世界：${gameState.world}`);
    }

    if (gameState.difficulty) {
      parts.push(`难度：${gameState.difficulty}`);
    }

    if (gameState.selectedTalents?.length > 0) {
      const talents = gameState.selectedTalents.map((t: any) => t.name).join('、');
      parts.push(`天赋：${talents}`);
    }

    if (gameState.attributes) {
      parts.push('属性：');
      parts.push(`  力量：${gameState.attributes.strength || 0}`);
      parts.push(`  敏捷：${gameState.attributes.agility || 0}`);
      parts.push(`  智力：${gameState.attributes.intelligence || 0}`);
      parts.push(`  体质：${gameState.attributes.constitution || 0}`);
      parts.push(`  魅力：${gameState.attributes.charisma || 0}`);
      parts.push(`  意志：${gameState.attributes.willpower || 0}`);
      parts.push(`  幸运：${gameState.attributes.luck || 0}`);
    }

    parts.push('');
    parts.push('请生成一个适合当前游戏状态的事件或场景描述。');

    return parts.join('\n');
  }

  /**
   * 显示生成的内容
   */
  private showGeneratedContent(selector: string, content: string): void {
    const $contentArea = $(selector).find('.ai-generated-content');
    if ($contentArea.length > 0) {
      $contentArea.html(`
        <div class="generated-content-wrapper">
          <h4>AI生成内容</h4>
          <div class="content">${content}</div>
          <div class="content-actions">
            <button class="btn btn-sm btn-primary use-content">使用此内容</button>
            <button class="btn btn-sm btn-secondary regenerate">重新生成</button>
          </div>
        </div>
      `);

      // 绑定内容操作事件
      $contentArea.find('.use-content').on('click', () => {
        this.handleUseGeneratedContent(content);
      });

      $contentArea.find('.regenerate').on('click', () => {
        this.handleAIGenerate(selector);
      });
    }
  }

  /**
   * 处理使用生成的内容
   */
  private async handleUseGeneratedContent(content: string): Promise<void> {
    try {
      // 将内容写入同层
      await this.sameLayerService.writeFinalToSameLayer(content, {
        type: 'ai-generated',
        timestamp: new Date().toISOString(),
      });

      this.emit('ai:content-used', { content });
      toastr.success('内容已应用');
    } catch (error) {
      console.error('[PlayController] 使用生成内容失败:', error);
      toastr.error('应用内容失败');
    }
  }

  /**
   * 处理显示角色信息
   */
  private handleShowCharacterInfo(): void {
    try {
      const state = this.getState();

      // 构建角色信息文本
      const info = this.buildCharacterInfoText(state);

      // 显示模态框或弹窗
      this.showModal('角色信息', info);

      this.emit('character:info-viewed');
    } catch (error) {
      console.error('[PlayController] 显示角色信息失败:', error);
      toastr.error('显示角色信息失败');
    }
  }

  /**
   * 构建角色信息文本
   */
  private buildCharacterInfoText(state: any): string {
    const parts = [];

    parts.push(`<strong>姓名：</strong>${state.character?.name || '未知'}`);
    parts.push(`<strong>世界：</strong>${state.world || '未知'}`);
    parts.push(`<strong>难度：</strong>${state.difficulty || '未知'}`);

    if (state.attributes) {
      parts.push('<br><strong>属性：</strong>');
      parts.push(`力量：${state.attributes.strength || 0}`);
      parts.push(`敏捷：${state.attributes.agility || 0}`);
      parts.push(`智力：${state.attributes.intelligence || 0}`);
      parts.push(`体质：${state.attributes.constitution || 0}`);
      parts.push(`魅力：${state.attributes.charisma || 0}`);
      parts.push(`意志：${state.attributes.willpower || 0}`);
      parts.push(`幸运：${state.attributes.luck || 0}`);
    }

    if (state.selectedTalents?.length > 0) {
      parts.push('<br><strong>天赋：</strong>');
      state.selectedTalents.forEach((talent: any) => {
        parts.push(`• ${talent.name}`);
      });
    }

    return parts.join('<br>');
  }

  /**
   * 处理显示游戏设置
   */
  private handleShowGameSettings(): void {
    try {
      // 显示设置面板
      toastr.info('游戏设置功能开发中...');
      this.emit('game:settings-requested');
    } catch (error) {
      console.error('[PlayController] 显示游戏设置失败:', error);
    }
  }

  /**
   * 处理显示成就
   */
  private handleShowAchievements(): void {
    try {
      const achievementService = this.getService<any>('achievementService');
      const achievements = achievementService?.getAchievements?.() || [];

      if (achievements.length > 0) {
        const achievementText = achievements.join('<br>• ');
        this.showModal('成就列表', `• ${achievementText}`);
      } else {
        toastr.info('暂无成就');
      }

      this.emit('achievements:viewed-in-play', achievements);
    } catch (error) {
      console.error('[PlayController] 显示成就失败:', error);
      toastr.error('获取成就信息失败');
    }
  }

  /**
   * 显示模态框
   */
  private showModal(title: string, content: string): void {
    // 简单的模态框实现
    const modal = $(`
      <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <div class="modal-content" style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0;">${title}</h3>
            <button class="btn-close" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      </div>
    `);

    // 绑定关闭事件
    modal.find('.btn-close').on('click', () => modal.remove());
    modal.on('click', e => {
      if (e.target === modal[0]) modal.remove();
    });

    $('body').append(modal);
  }

  /**
   * 卸载控制器
   */
  unmount(): void {
    if (!this.mounted) return;

    try {
      // 移除可能的模态框
      $('.modal-overlay').remove();

      super.unmount();
      console.log('[PlayController] 控制器已卸载');
    } catch (error) {
      console.error('[PlayController] 卸载失败:', error);
    }
  }
}
