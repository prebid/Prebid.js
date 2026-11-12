interface StringMap<V> {
  [key: string]: V;
}

export interface WithGenericIndexSignature {
  values: StringMap<string>;
}
export type { WithGenericIndexSignature as default };
