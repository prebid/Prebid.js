export type ThirtyThreeAcrossIdSystemModuleName = '33acrossId';

export type ThirtyThreeAcrossIdSystemParams = {
  /**
   * Partner ID (PID)
   *
   * Please reach out to PrebidUIM@33across.com and request your PID
   */
  pid: string;
  /**
   * Hashed email address in sha256 format
   */
  hem?: string;
  /**
   * Indicates whether a supplemental first-party ID may be stored to improve addressability
   */
  storeFpid?: boolean;
  /**
   * Indicates whether a supplemental third-party ID may be stored to improve addressability
   */
  storeTpid?: boolean;
};

declare module './userId/spec' {
  interface UserId {
    '33acrossId': {
      envelope: string;
    };
  }

  interface ProvidersToId {
    '33acrossId': '33acrossId';
  }

  interface ProviderParams {
    '33acrossId': ThirtyThreeAcrossIdSystemParams;
  }
}

export {};
