export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type DotNotation<PREFIX extends string, REST extends string> = `${PREFIX}.${REST}`;

export type DeepProperty<T extends object> = keyof T | {
  [K in keyof T]: T[K] extends object
    ? DotNotation<string & K, (string & keyof T[K]) | DotNotation<(string & keyof T[K]), any>>
    : never
}[keyof T];

export type TypeOfDeepProperty<T extends object, K extends DeepProperty<T>> =
    K extends keyof T
      ? T[K]
      : K extends DotNotation<infer PREFIX, infer REST>
        ? PREFIX extends keyof T
          ? T[PREFIX] extends object
            ? REST extends DeepProperty<T[PREFIX]> ?
              TypeOfDeepProperty<T[PREFIX], REST> : never
            : never
          : never
        : never;

export type DeepPropertyName<K extends string> = K extends DotNotation<any, infer REST>
  ? DeepPropertyName<REST>
  : K;
