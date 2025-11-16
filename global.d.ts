declare module '*?raw' {
  const content: string;
  export default content;
}
<<<<<<< HEAD
=======
declare module '*?url' {
  const content: string;
  export default content;
}
>>>>>>> 4d711bd501f9f52d211bfb86391113e9f3d8504e
declare module '*.html' {
  const content: string;
  export default content;
}
<<<<<<< HEAD
=======
declare module '*.md' {
  const content: string;
  export default content;
}
>>>>>>> 4d711bd501f9f52d211bfb86391113e9f3d8504e
declare module '*.css' {
  const content: unknown;
  export default content;
}
<<<<<<< HEAD
=======
declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}
>>>>>>> 4d711bd501f9f52d211bfb86391113e9f3d8504e

declare const YAML: typeof import('yaml');

declare const z: typeof import('zod');
declare namespace z {
  export type infer<T> = import('zod').infer<T>;
  export type input<T> = import('zod').input<T>;
  export type output<T> = import('zod').output<T>;
}
<<<<<<< HEAD

// 添加SaveDialog相关的类型定义
interface SaveSummary {
  slotId: string;
  name: string;
  preview: string;
  updatedAt: string;
  exists: boolean;
}

interface SaveFacade {
  list(): Promise<SaveSummary[]>;
  load(slotId: string): Promise<any>;
  createNew(name: string, messages: any[], stat: any, snapshots: any[]): Promise<void>;
  removeMany(slotIds: string[]): Promise<void>;
  rename(slotId: string, newName: string): Promise<void>;
}

interface UIService {
  error(message: string, title?: string): void;
  success(message: string, title?: string): void;
  info(message: string, title?: string): void;
}

interface StorageService {
  getState(): Promise<{ saveName?: string; [key: string]: any }>;
}

interface Locator {
  get(serviceName: 'saveFacade'): SaveFacade;
  get(serviceName: string): any;
}

// Vue注入类型声明
declare module '@vue/runtime-core' {
  interface ComponentInternalInstance {
    provides: {
      locator?: Locator;
      ui?: UIService;
      storage?: StorageService;
    };
  }
}

// 全局对象类型声明
declare global {
  interface Window {
    // RPG 相关全局变量
    __RPG_UI_MESSAGES__?: Array<{ role: 'user' | 'ai'; text: string }>;
    __RPG_LAST_MVU_SNAPSHOTS__?: any[];

    // MVU 框架
    Mvu?: {
      getMvuData: (options: { type: string }) => Promise<any>;
      getMvuVariable: (data: any, key: string, options?: { default_value?: any }) => Promise<any>;
      setMvuVariable: (data: any, key: string, value: any, options?: { reason?: string }) => Promise<any>;
      replaceMvuData: (data: any, options: { type: string }) => Promise<any>;
    };

    // 酒馆助手函数 - 改为必需的
    getVariables: (options?: { type?: string }) => Promise<any>;
    replaceVariables: (key: string, value: any) => Promise<void>;

    // UI 库
    toastr?: {
      info: (message: string, title?: string) => void;
      success: (message: string, title?: string) => void;
      error: (message: string, title?: string) => void;
    };
  }
}
export {};
=======
>>>>>>> 4d711bd501f9f52d211bfb86391113e9f3d8504e
