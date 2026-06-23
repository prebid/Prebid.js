export type PublinkIdSystemModuleName = 'publinkId';

export type PublinkIdSystemParams = {
  /**
   * Hashed email address of the user.
   * Supports MD5 and SHA256.
   */
  e: string;
  /**
   * API key provided by Epsilon.
   */
  api_key: string;
  /**
   * Site ID provided by Epsilon.
   */
  site_id: string;
};

declare module './userId/spec' {
  interface UserId {
    publinkId: string;
  }

  interface ProvidersToId {
    publinkId: 'publinkId';
  }

  interface ProviderParams {
    publinkId: PublinkIdSystemParams;
  }
}

export {};
