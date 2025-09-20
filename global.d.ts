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
>>>>>>> abf5ab2721ef8aa1cccce26ac4d7afd734ec14b4
  export default component;
}

declare const YAML: typeof import('yaml');

declare const z: typeof import('zod');
declare namespace z {
  export type infer<T> = import('zod').infer<T>;
  export type input<T> = import('zod').input<T>;
  export type output<T> = import('zod').output<T>;
}
