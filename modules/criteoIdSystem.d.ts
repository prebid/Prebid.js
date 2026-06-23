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
