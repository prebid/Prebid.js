export type Id5IdSystemModuleName = 'id5Id';

export interface Id5AbTestingConfig {
  /**
   * Set this to `true` to turn on this feature
   */
  enabled?: boolean;
  /**
   * Must be a number between `0.0` and `1.0` (inclusive) and is used to determine the percentage of requests that fall into the control group (and thus not exposing the ID5 ID). For example, a value of `0.20` will result in 20% of requests without an ID5 ID and 80% with an ID.
   */
  controlGroupPct?: number;
}

export interface Id5SubmoduleParams {
  /**
   * The Partner Number you received from ID5.
   */
  partner: number;
  /**
   * Partner-supplied data used for linking ID5 IDs across domains.
   * See https://wiki.id5.io/en/identitycloud/retrieve-id5-ids/passing-partner-data-to-id5 for details on generating the string.
   * Omit the parameter or leave as an empty string if no data to supply
   */
  pd?: string;
  /**
   * An identifier provided by ID5 to technology partners who manage Prebid setups on behalf of publishers.
   * Reach out to prebid@id5.io if you have questions about this parameter
   */
  provider?: string;
  /**
   * The URL for the id5-prebid external module. It is recommended to use the latest version at the URL in the example.
   * Source code available at https://github.com/id5io/id5-api.js/blob/master/src/id5PrebidModule.js.
   */
  externalModuleUrl?: string;
  /**
   * Set this to `true` to force turn off extensions call. Default `false`
   */
  disableExtensions?: boolean;
  /**
   * Set this to `true` to enable cookie syncing with other ID5 partners. Default `false`.
   * See https://wiki.id5.io/docs/initiate-cookie-sync-to-id5 for details.
   */
  canCookieSync?: boolean;
  /**
   * When this parameter is set the ID5 module will set appropriate GAM pubads targeting tags
   */
  gamTargetingPrefix?: string;
  /**
   * When this parameter is set the ID5 module will execute `window.id5tags.cmd` callbacks for custom targeting tags
   */
  exposeTargeting?: boolean;
  /**
   * Allows publishers to easily run an A/B Test. If enabled and the user is in the Control Group, the ID5 ID will NOT be exposed to bid adapters for that request
   */
  abTesting?: Id5AbTestingConfig;
}

declare module './userId/spec' {
  interface UserId {
    id5id: {
      uid?: string;
      ext?: Record<string, unknown>;
    };
  }

  interface ProvidersToId {
    id5Id: 'id5id';
  }

  interface ProviderParams {
    id5Id: Id5SubmoduleParams;
  }
}

export {};
