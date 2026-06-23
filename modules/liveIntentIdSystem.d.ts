export type LiveIntentIdSystemModuleName = 'liveIntentId';

export interface LiveIntentCollectConfig {
  /**
   * This parameter defines whether the first-party identifiers that LiveConnect creates and updates are stored in a cookie jar, or in local storage.
   * If nothing is set, default behaviour would be `cookie`.
   */
  fpiStorageStrategy?: 'cookie' | 'ls' | 'none';
  /**
   * This configuration parameter defines the maximum duration of a call to the collector endpoint.
   * By default, 5000 milliseconds.
   */
  ajaxTimeout?: number;
  /**
   * The expiration time of an identifier created and updated by LiveConnect.
   * By default, 730 days.
   */
  fpiExpirationDays?: number;
  /**
   * The parameter defines where the signal pixels are pointing to.
   * The params and paths will be defined subsequently.
   * If the parameter is not set, LiveConnect will by default emit the signal towards https://rp.liadm.com.
   */
  collectorUrl?: string;
  /**
   * LiveIntent’s media business entity application ID.
   */
  appId?: string;
}

export type LiveIntentRequestedAttributesOverrides = Partial<{
  nonId: boolean;
  uid2: boolean;
  medianet: boolean;
  magnite: boolean;
  bidswitch: boolean;
  pubmatic: boolean;
  openx: boolean;
  sovrn: boolean;
  index: boolean;
  thetradedesk: boolean;
  tdif: boolean;
  sharethrough: boolean;
  vidazoo: boolean;
  zetassp: boolean;
  triplelift: boolean;
  segments: boolean;
  nexxen: boolean;
  fpid: boolean
}>;

export type LiveIntentFpid = {
  /**
   * The cookie/localstorage key name
   */
  name?: string;
  /**
   * The parameter defines where to get the identifier from.
   * Either from the cookie jar, `cookie`, or from the local storage, `html5`.
   */
  strategy?: 'cookie' | 'html5';
};

export type LiveIntentIdSystemParams = {
  /**
   * The unique identifier for each publisher (for existing LiveIntent customers)
   */
  publisherId?: string;
  /**
   * The unique identifier for each distributor (for existing LiveIntent customers).
   * It will be ignored if `liCollectConfig.appId` is provided.
   */
  distributorId?: string;
  /**
   * This configuration parameter defines the maximum duration of a call to the IdentityResolution endpoint.
   * By default, 5000 milliseconds.
   */
  ajaxTimeout?: number;
  /**
   * The name of the partner whose data will be returned in the response.
   */
  partner?: string;
  /**
   * Used to send additional identifiers in the request for LiveIntent to resolve against the LiveIntent ID and additional attributes.
   */
  identifiersToResolve?: string[];
  requestedAttributesOverrides?: LiveIntentRequestedAttributesOverrides;
  /**
   * The hashed email address of a user.
   * We can accept the hashes, which use the following hashing algorithms: md5, sha1, sha2.
   */
  emailHash?: string;
  /**
   * The IPv4 address of a user.
   */
  ipv4?: string;
  /**
   * The IPv6 address of a user.
   */
  ipv6?: string;
  /**
   * The user agent of a user.
   */
  userAgent?: string;
  /**
   * Use this to change the default endpoint URL if you can call the LiveIntent Identity Exchange within your own domain.
   */
  url?: string;
  /**
   * Container of all collector params.
   */
  liCollectConfig?: LiveIntentCollectConfig;
  /**
   * First party identifier
   */
  fpid?: LiveIntentFpid;
  /**
   * Delay expressed in milliseconds
   */
  fireEventDelay?: number;
};

declare module './userId/spec' {
  interface UserId {
    lipb: {
      lipbid?: string;
      nonId?: string;
      segments?: string[];
      [key: string]: unknown;
    };
  }

  interface ProvidersToId {
    liveIntentId: 'lipb';
  }

  interface ProviderParams {
    liveIntentId: LiveIntentIdSystemParams;
  }
}

export {};
