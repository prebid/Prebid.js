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
