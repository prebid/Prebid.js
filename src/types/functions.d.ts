export type AnyFunction = (...args: any[]) => any;
export type Wraps<T extends AnyFunction> = (...args: Parameters<T>) => ReturnType<T>;
