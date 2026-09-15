// the augmentation in this file only applies where the spec is part of the program
import type {} from './userId/spec.js';

export type LotamePanoramaIdSystemModuleName = 'lotamePanoramaId';

declare module './userId/spec' {
  interface UserId {
    lotamePanoramaId: string;
  }

  interface ProvidersToId {
    lotamePanoramaId: 'lotamePanoramaId';
  }

  interface ProviderParams {
    lotamePanoramaId: {
      clientId: string;
    }
  }
}

export {};
