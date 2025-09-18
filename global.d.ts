declare module '*?raw' {
  const content: string;
  export default content;
}
declare module '*.html' {
  const content: string;
  export default content;
}
declare module '*.css' {
  const content: unknown;
  export default content;
}
declare module '*.vue' {
  import { DefineComponent } from 'vue';
<<<<<<< HEAD
  const component: DefineComponent<{}, {}, any>;
=======
  const component: DefineComponent;
>>>>>>> ffd4084071b1bcc5c10d43ca5a0ee996ddbcf06c
  export default component;
}

declare const YAML: typeof import('yaml');

declare const z: typeof import('zod');
declare namespace z {
  export type infer<T> = import('zod').infer<T>;
  export type input<T> = import('zod').input<T>;
  export type output<T> = import('zod').output<T>;
}
