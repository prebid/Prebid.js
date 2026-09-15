// the augmentation in this file only applies where the spec is part of the program
import type {} from './userId/spec.js';

export type CriteoIdSystemModuleName = 'criteo';

declare module './userId/spec' {
  interface UserId {
    criteoId: string;
  }

  interface ProvidersToId {
    criteoId: 'criteoId';
  }

  interface ProviderParams {
    criteo: never
  }
}

export {};
