import { reactive } from 'vue';

export interface ResponsiveState {
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
  mode: 'landscape' | 'portrait';
  isLandscape: boolean;
  isPortrait: boolean;
}

export class ResponsiveService {
  private state = reactive<ResponsiveState>({
    screenWidth: 0,
    screenHeight: 0,
    aspectRatio: 0,
    mode: 'landscape',
    isLandscape: true,
    isPortrait: false,
  });

  private resizeHandler: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.updateDimensions();
    this.setupResizeListener();
  }

  private updateDimensions(): void {
    this.state.screenWidth = window.innerWidth;
    this.state.screenHeight = window.innerHeight;
    this.state.aspectRatio = this.state.screenWidth / this.state.screenHeight;

    // 判断屏幕模式
    // 16:9 ≈ 1.78, 3:4 = 0.75
    // 如果宽高比大于1.5，认为是宽屏模式；否则是竖屏模式
    if (this.state.aspectRatio > 1.5) {
      this.state.mode = 'landscape';
      this.state.isLandscape = true;
      this.state.isPortrait = false;
    } else {
      this.state.mode = 'portrait';
      this.state.isLandscape = false;
      this.state.isPortrait = true;
    }
  }

  private setupResizeListener(): void {
    this.resizeHandler = () => {
      this.updateDimensions();
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  public getState(): ResponsiveState {
    return this.state;
  }

  public getMode(): 'landscape' | 'portrait' {
    return this.state.mode;
  }

  public isLandscapeMode(): boolean {
    return this.state.isLandscape;
  }

  public isPortraitMode(): boolean {
    return this.state.isPortrait;
  }

  public getAspectRatio(): number {
    return this.state.aspectRatio;
  }

  public destroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }
}

// 单例模式
let responsiveServiceInstance: ResponsiveService | null = null;

export function getResponsiveService(): ResponsiveService {
  if (!responsiveServiceInstance) {
    responsiveServiceInstance = new ResponsiveService();
  }
  return responsiveServiceInstance;
}
