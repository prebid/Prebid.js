import type { IntentIqABConfigSource } from './intentIqIdSystem';

/**
 * Payload passed to `window.intentIqAnalyticsAdapter_<partnerId>.reportExternalWin()`.
 * Use this when Prebid is NOT the winning bidding platform (e.g. Amazon TAM, GAM).
 */
export interface IiqExternalWinData {
  /**
   * Platform that rendered this impression.
   * 1 = Prebid, 2 = Amazon, 3 = Google, 4 = Open RTB / local Prebid server.
   */
  biddingPlatformId: 1 | 2 | 3 | 4;

  /**
   * Unified auction identifier when running multiple auction solutions.
   */
  partnerAuctionId?: string;

  /**
   * Name of the bidder that won the auction as reported by the platform.
   */
  bidderCode: string;

  /**
   * Prebid auction ID. Leave undefined when Prebid is not the platform.
   */
  prebidAuctionId?: string;

  /**
   * CPM received from the demand-side auction, before any floor adjustments.
   */
  cpm: number;

  /**
   * ISO 4217 currency code for `cpm`, e.g. `'USD'`.
   */
  currency: string;

  /**
   * Pre-adjustment CPM. Leave undefined when Prebid is not the platform.
   */
  originalCpm?: number;

  /**
   * Currency of `originalCpm`. Leave undefined when Prebid is not the platform.
   */
  originalCurrency?: string;

  /**
   * Impression status. Leave undefined when Prebid is not the platform.
   */
  status?: string;

  /**
   * Unique identifier of the ad unit that showed this ad.
   */
  placementId?: string;

  /**
   * Type of ad served.
   */
  adType?: 'banner' | 'video' | 'native' | 'audio';
}

/**
 * Options passed to `pbjs.enableAnalytics({ provider: 'iiqAnalytics', options: { … } })`.
 */
export interface IntentIqAnalyticsAdapterOptions {
  /**
   * Partner ID assigned by IntentIQ. Required.
   */
  partner: number;

  /**
   * Set to `true` to allow manual win reporting via
   * `window.intentIqAnalyticsAdapter_<partnerId>.reportExternalWin()`.
   * Defaults to `false`.
   */
  manualWinReportEnabled?: boolean;

  /**
   * Enable GAM predict-score reporting. Defaults to `false`.
   */
  gamPredictReporting?: boolean;

  /**
   * HTTP method used to send reports. Defaults to `'GET'`.
   */
  reportMethod?: 'GET' | 'POST';

  /**
   * Override for the IntentIQ reporting server base URL.
   */
  reportingServerAddress?: string;

  /**
   * Geo-region routing hint for the reporting server.
   */
  region?: string;

  /**
   * Controls how the `placementId` field in reports is populated:
   * 1 = adUnitCode then placementId (default)
   * 2 = placementId then adUnitCode
   * 3 = adUnitCode only
   * 4 = placementId only
   */
  adUnitConfig?: 1 | 2 | 3 | 4;

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
   * Percentage of users placed in the WITH_IIQ cohort (0–100). Defaults to 95.
   */
  abPercentage?: number;

  /**
   * Comma-separated list of browser names (lowercase) excluded from reporting,
   * e.g. `'chrome,safari'`.
   */
  browserBlackList?: string;

  /**
   * Publisher domain name appended to report URLs.
   */
  domainName?: string;

  /**
   * Freeform key-value pairs appended to every report URL.
   */
  additionalParams?: Record<string, string | number | boolean>;

  /**
   * When `true`, first-party data is stored under a partner-specific key.
   */
  siloEnabled?: boolean;

  /**
   * Reference to the GAM `googletag.pubads()` object for predict-score
   * reporting.
   */
  gamObjectReference?: Record<string, unknown>;
}
