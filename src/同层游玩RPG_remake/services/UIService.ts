import { injectable } from 'inversify';

@injectable()
export class UIService {
  public info(title: string, message?: string): void {
    try {
      // 全局 toastr 来自项目依赖
      (window as any).toastr?.info(message ?? '', title);
    } catch (_) {
      console.info(`[UI] ${title}`, message ?? '');
    }
  }

  public success(title: string, message?: string): void {
    try {
      (window as any).toastr?.success(message ?? '', title);
    } catch (_) {
      console.log(`[UI] ${title}`, message ?? '');
    }
  }

  public error(title: string, message?: string): void {
    try {
      (window as any).toastr?.error(message ?? '', title);
    } catch (_) {
      console.error(`[UI] ${title}`, message ?? '');
    }
  }

  public warning(title: string, message?: string): void {
    try {
      (window as any).toastr?.warning(message ?? '', title);
    } catch (_) {
      console.warn(`[UI] ${title}`, message ?? '');
    }
  }
}
