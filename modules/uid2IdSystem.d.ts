export type Uid2IdSystemModuleName = 'uid2';

export interface Uid2Token {
  advertising_token: string;
  refresh_token: string;
  identity_expires: number;
  refresh_from: number;
  refresh_expires: number;
  refresh_response_key?: string;
}

export interface Uid2IdValue {
  id?: string;
  optout?: boolean;
}

export type Uid2IdSystemParams = {
  /**
   * Overrides the default UID2 API endpoint.
   */
  uid2ApiBase?: string;
  /**
   * The initial UID2 token.
   * This should be the `body` element of the decrypted response from a call to the `/token/generate` or `/token/refresh` endpoint.
   */
  uid2Token?: Uid2Token;
  /**
   * The name of a cookie that holds the initial UID2 token, set by the server.
   * The cookie should contain JSON in the same format as the `uid2Token` param.
   *
   * If `uid2Token` is supplied, this param is ignored.
   */
  uid2Cookie?: string;
  /**
   * The name of a cookie that holds the initial UID2 token, set by the server.
   * The cookie should contain JSON in the same format as the alternative `uid2Token` param.
   * If `uid2Token` is supplied, this param is ignored.
   */
  uid2ServerCookie?: string;
  /**
   * Specify whether to use cookie or localStorage for module-internal storage.
   * It is recommended to not provide this and allow the module to use the default.
   */
  storage?: 'cookie' | 'localStorage';
  /**
   * Server public key for client-side integration (CSTG mode).
   */
  serverPublicKey?: string;
  /**
   * Subscription ID for client-side integration (provided by the UID2 team).
   */
  subscriptionId?: string;
  /**
   * User email for client-side integration. Only one DII parameter may be set.
   */
  email?: string;
  /**
   * Normalized user phone number for client-side integration. Only one DII parameter may be set.
   */
  phone?: string;
  /**
   * Hashed, normalized user email for client-side integration. Only one DII parameter may be set.
   */
  emailHash?: string;
  /**
   * Hashed, normalized user phone for client-side integration. Only one DII parameter may be set.
   */
  phoneHash?: string;
};

declare module './userId/spec' {
  interface UserId {
    uid2: Uid2IdValue;
  }

  interface ProvidersToId {
    uid2: 'uid2';
  }

  interface ProviderParams {
    uid2: Uid2IdSystemParams;
  }
}

export {};
