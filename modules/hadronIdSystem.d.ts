export type HadronIdSystemModuleName = 'hadronId';

export type HadronIdSystemParams = {
  /**
   * Audigent Partner ID obtained from Audigent.
   */
  partnerId: number;
};

declare module './userId/spec' {
  interface UserId {
    hadronId: string;
  }

  interface ProvidersToId {
    hadronId: 'hadronId';
  }

  interface ProviderParams {
    hadronId: HadronIdSystemParams;
  }
}

export {};
