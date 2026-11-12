import type { SchemaFixtureDocumented } from './lib/documented.ts';

export interface WithDocumentedType {
  documented: SchemaFixtureDocumented;
  /** @minLength 1 */
  local: string;
}
export type { WithDocumentedType as default };
