import type { EID } from './userId/spec';

export type PubProvidedIdSystemModuleName = 'pubProvidedId';

export type PubProvidedIdSystemParams = {
  /**
   * Publisher-provided extended identifiers to pass through to bid requests.
   */
  eids?: EID[];
  /**
   * Function returning additional publisher-provided extended identifiers.
   * Results are concatenated with `eids`.
   */
  eidsFunction?: () => EID[];
};

declare module './userId/spec' {
  interface UserId {
    pubProvidedId: EID[];
  }

  interface ProvidersToId {
    pubProvidedId: 'pubProvidedId';
  }

  interface ProviderParams {
    pubProvidedId: PubProvidedIdSystemParams;
  }
}

export {};
