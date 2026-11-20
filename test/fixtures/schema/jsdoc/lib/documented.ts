export interface SchemaFixtureDocumented {
  /**
   * Has a description.
   * @pattern ^never$
   * @minimum 100
   */
  constrained: string;
  /** @type string */
  retyped: number;
  /** @ignore */
  ignored: boolean;
}
