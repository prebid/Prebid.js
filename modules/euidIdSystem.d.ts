export type EuidIdSystemModuleName = 'euid';

export interface EuidToken {
  advertising_token: string;
  refresh_token: string;
  identity_expires: number;
  refresh_from: number;
  refresh_expires: number;
  refresh_response_key?: string;
}

export interface EuidIdValue {
  id?: string;
  optout?: boolean;
}

export type EuidIdSystemParams = {
  /**
   * Overrides the default EUID API endpoint.
   */
  euidApiBase?: string;
  /**
   * The initial EUID token.
   * This should be `body` element of the decrypted response from a call to the `/token/generate` or `/token/refresh` endpoint.
   */
  euidToken?: EuidToken;
  /**
   * The name of a cookie which holds the initial EUID token, set by the server.
   * The cookie should contain JSON in the same format as the `euidToken` param.
   *
   * If `euidToken` is supplied, this param is ignored.
   */
  euidCookie?: string;
  /**
   * Specify whether to use cookie or localStorage for module-internal storage.
   * It is recommended to not provide this and allow the module to use the default.
   */
  storage?: 'cookie' | 'localStorage';
  /**
   * Server public key for client-side token generation (CSTG mode).
   */
  serverPublicKey?: string;
  /**
   * Subscription ID for CSTG mode (provided by the EUID team).
   */
  subscriptionId?: string;
  /**
   * User email for CSTG mode. Only one DII parameter may be set.
   */
  email?: string;
  /**
   * Normalized user phone number for CSTG mode. Only one DII parameter may be set.
   */
  phone?: string;
  /**
   * Hashed, normalized user email for CSTG mode. Only one DII parameter may be set.
   */
  emailHash?: string;
  /**
   * Hashed, normalized user phone for CSTG mode. Only one DII parameter may be set.
   */
  phoneHash?: string;
};

declare module './userId/spec' {
  interface UserId {
    euid: EuidIdValue;
  }

  interface ProvidersToId {
    euid: 'euid';
  }

  interface ProviderParams {
    euid: EuidIdSystemParams;
  }
}

export {};
