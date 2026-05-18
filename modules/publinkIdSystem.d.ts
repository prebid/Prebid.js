import type { UserIdConfig } from './userId/spec';

export interface PublinkIdParams {
  /**
   * Required. Hashed email address (hex string), for example MD5.
   */
  e: string;
  /**
   * Required. API key provided by Epsilon.
   */
  api_key: string;
  /**
   * Required. Site identifier provided by Epsilon.
   */
  site_id: string;
}

export type PublinkIdConfig = UserIdConfig<'publinkId'>;

declare module './userId/spec' {
  interface UserId {
    publinkId: string;
  }

  interface ProvidersToId {
    publinkId: 'publinkId';
  }

  interface ProviderParams {
    publinkId: PublinkIdParams;
  }
}

export {};
