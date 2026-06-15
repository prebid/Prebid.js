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
