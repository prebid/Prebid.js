export type IntentIqIdSystemModuleName = 'intentIqId';

/**
 * A/B testing configuration source — controls how the test group is assigned.
 * - `'percentage'`  — random assignment based on `abPercentage`
 * - `'group'`       — fixed group supplied via the `group` param
 * - `'IIQServer'`   — server-driven assignment (default)
 * - `'disabled'`    — A/B testing disabled; always use IIQ
 */
export type IntentIqABConfigSource = 'percentage' | 'group' | 'IIQServer' | 'disabled';

export interface IntentIqIdSystemParams {
  /**
   * Partner ID assigned by IntentIQ. Required.
   */
  partner: number;

  /**
   * Invoked when the identity lookup completes or times out.
   * Receives the resolved EID payload or an empty string when the browser is
   * blacklisted or the user is opted out.
   */
  callback?: (data: { eids: unknown[] } | string) => void;

  /**
   * Milliseconds to wait for the server response before firing `callback`
   * with whatever data is currently available. Defaults to 500 ms.
   */
  timeoutInMillis?: number;

  /**
   * Comma-separated list of browser names (lowercase) that should be
   * excluded from identity resolution, e.g. `'chrome,safari'`.
   */
  browserBlackList?: string;

  /**
   * Publisher domain name, used to build the referrer URL parameter.
   */
  domainName?: string;

  /**
   * When `true`, first-party data is stored under a partner-specific key so
   * multiple IntentIQ configurations on the same page do not collide.
   */
  siloEnabled?: boolean;

  /**
   * Called whenever the resolved A/B group changes.
   * Receives the new group (`'A'` | `'B'`) and the server termination-cause
   * code when available.
   */
  groupChanged?: (group: 'A' | 'B', terminationCause?: number) => void;

  /**
   * Reference to the GAM `googletag.pubads()` object for automatic targeting
   * key injection.
   */
  gamObjectReference?: Record<string, unknown>;

  /**
   * GAM targeting key used to pass the A/B group. Defaults to
   * `'intent_iq_group'`.
   */
  gamParameterName?: string;

  /**
   * Percentage of users placed in the WITH_IIQ (group A) cohort.
   * Accepts 0–100; values outside that range are clamped. Defaults to 95.
   * Only used when `ABTestingConfigurationSource` is `'percentage'` or
   * `'IIQServer'` (no prior server termination cause).
   */
  abPercentage?: number;

  /**
   * Determines how the A/B test group is assigned. Defaults to `'IIQServer'`.
   */
  ABTestingConfigurationSource?: IntentIqABConfigSource;

  /**
   * Explicit A/B group override. Only used when
   * `ABTestingConfigurationSource` is `'group'`.
   */
  group?: 'A' | 'B';

  /**
   * Human-readable metadata tag describing the integration source
   * (e.g. `'prebid'`, `'amp'`). Translated to a numeric code internally.
   */
  sourceMetaData?: string;

  /**
   * Numeric metadata code for the integration source when a specific
   * override is required.
   */
  sourceMetaDataExternal?: number;

  /**
   * Freeform key-value pairs appended to every pixel request.
   */
  additionalParams?: Record<string, string | number | boolean>;

  /**
   * Timeout in milliseconds for fetching Client Hints before falling back
   * to an empty string. Defaults to 10 ms.
   */
  chTimeout?: number;

  /**
   * Partner-supplied first-party client identifier.
   */
  partnerClientId?: string;

  /**
   * Type code for `partnerClientId`. Must be a positive integer recognised
   * by the IntentIQ server.
   */
  partnerClientIdType?: number;
}

declare module './userId/spec' {
  interface UserId {
    intentIqId: string;
  }

  interface ProvidersToId {
    intentIqId: 'intentIqId';
  }

  interface ProviderParams {
    intentIqId: IntentIqIdSystemParams;
  }
}

export {};
