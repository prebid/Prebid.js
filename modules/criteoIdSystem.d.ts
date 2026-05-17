export type CriteoIdSystemModuleName = 'criteo';

declare module './userId/spec' {
  interface UserId {
    criteo: string;
  }

  interface ProvidersToId {
    criteo: 'criteo';
  }

  interface ProviderParams {
    criteo: never
  }
}

export {}
