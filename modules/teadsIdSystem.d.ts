// the augmentation in this file only applies where the spec is part of the program
import type {} from './userId/spec.js';

export type TeadsIdSystemModuleName = 'teadsId';

declare module './userId/spec' {
  interface UserId {
    teadsId: string;
  }

  interface ProvidersToId {
    teadsId: 'teadsId';
  }

  interface ProviderParams {
    teadsId: {
      pubId: number | string;
    }
  }
}

export {};
