export type PairIdSystemModuleName = 'pairId';

export interface PairIdLiverampParams {
  /**
   * storage key to fetch liveramp provided PAIR Id, the default value is `_lr_pairId`
   */
  storageKey?: string;
}

export type PairIdSystemParams = {
  /**
   * Container of all liveramp cleanroom specified params.
   */
  liveramp?: PairIdLiverampParams;
};

declare module './userId/spec' {
  interface UserId {
    pairId: string[];
  }

  interface ProvidersToId {
    pairId: 'pairId';
  }

  interface ProviderParams {
    pairId: PairIdSystemParams;
  }
}

export {};
