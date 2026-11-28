import type { Serialized } from '../../../../schema/helpers.d.ts';
import type { SchemaFixtureOther } from './nested/other.d.ts';

interface SchemaFixtureTree {
  children: SchemaFixtureTree[];
}

interface SchemaFixtureWithUndefined {
  maybe: string | undefined;
  always: string;
}

/** @additionalProperties false */
export interface SchemaFixtureRoot {
  other: SchemaFixtureOther;
  tree: SchemaFixtureTree;
  serialized: Serialized<SchemaFixtureWithUndefined>;
  nullable: string | null;
  optional?: number;
  tuple: [number, string];
  open: { [key: string]: unknown };
}
export type { SchemaFixtureRoot as default };
