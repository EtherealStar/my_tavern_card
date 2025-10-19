import Phaser from 'phaser';

export class PlayerBattleObject extends Phaser.GameObjects.Container {
  private playerData: any;
  private readonly playerPosition = { x: 0.5, y: 0.8 }; // 中央底部

  constructor(scene: Phaser.Scene, player: any) {
    super(scene);
    this.playerData = player;
    // 将容器加入场景并置于前景
    scene.add.existing(this);
    this.setDepth(50); // 设置容器层级，子元素会在此基础上叠加
    this.setPlayerPosition();
  }

  /**
   * 设置玩家对象位置
   */
  private setPlayerPosition(): void {
    const { width, height } = this.scene.scale;
    super.setPosition(width * this.playerPosition.x, height * this.playerPosition.y);
  }

  /**
   * 更新玩家数据（保留基本功能，移除血条更新）
   */
  public updatePlayerData(newData: any): void {
    this.playerData = { ...this.playerData, ...newData };
  }

  /**
   * 获取玩家数据
   */
  public getPlayerData(): any {
    return this.playerData;
  }

  /**
   * 销毁玩家对象
   */
  public destroy(): void {
    super.destroy();
  }
}
