type Flat<T> = { [K in keyof T]: T[K] }

/**
 * `T` as it looks after JSON serialization, which drops undefined values: `x: V | undefined` becomes `x?: V`.
 * Shallow; nested types are taken as they are.
 */
export type Serialized<T> = Flat<
  { [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined> } &
  { [K in keyof T as undefined extends T[K] ? never : K]: T[K] }
>

/**
 * `Serialized<T>` with the types of some of its properties replaced by those in `O`.
 * Resolves to `never` if `O` names a property `T` does not have.
 */
export type Override<T, O> = keyof O extends keyof T ? Serialized<Omit<T, keyof O> & O> : never
