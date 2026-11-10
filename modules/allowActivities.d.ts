import type * as activities from '../src/activities/activities.ts';
import type { ModuleType } from '../src/activities/modules.ts';
import type { StorageType } from '../src/storageManager.ts';
import type { SyncType } from '../src/userSync.ts';

/**
 * Name of a potentially restricted activity, for example 'accessDevice' or 'transmitEids'.
 * Cfr. https://docs.prebid.org/dev-docs/activity-controls.html#activities
 */
export type ActivityName = (typeof activities)[keyof typeof activities];

/**
 * Information about the activity that is about to be performed, passed to rule conditions.
 * Cfr. https://docs.prebid.org/dev-docs/activity-controls.html#rule-conditions
 */
export interface ActivityParams {
  /**
   * Type of the component (usually a module) that wishes to perform the activity.
   * 'prebid' is reserved for Prebid core itself and a few privileged modules.
   */
  componentType: ModuleType;
  /**
   * Name of the component: a bidder code, user ID or RTD submodule name, analytics provider code, or module name.
   */
  componentName: string;
  /**
   * Dot-separated concatenation of `componentType` and `componentName`, e.g. 'bidder.bidderX'.
   */
  component: string;
  /**
   * When `componentType` is 'bidder', the code of the bidder that `componentName` is an alias of
   * (or `componentName` itself if it is not an alias).
   */
  adapterCode?: string;
  /**
   * fetchBids, transmitEids, transmitPreciseGeo, transmitTid, transmitUfpd: name of the Prebid Server (s2s) configuration, if any.
   */
  configName?: string;
  /**
   * accessDevice: the device storage mechanism being accessed.
   */
  storageType?: StorageType;
  /**
   * accessDevice: cookie name or localStorage key.
   */
  storageKey?: string;
  /**
   * accessDevice: true when writing to device storage; false otherwise (e.g. reading or checking availability).
   */
  write?: boolean;
  /**
   * syncUser: type of the user sync.
   */
  syncType?: SyncType;
  /**
   * syncUser: URL of the user sync.
   */
  syncUrl?: string;
  /**
   * Other activity parameters.
   */
  [param: string]: unknown;
}

export interface ActivityRule {
  /**
   * Condition function for this rule; the rule applies only if this returns true. A condition that throws denies the activity.
   * If omitted, the rule always applies.
   */
  condition?: (params: ActivityParams) => boolean;
  /**
   * Whether the activity should be allowed when this rule applies. If omitted, the rule denies the activity.
   */
  allow?: boolean;
  /**
   * Priority of this rule compared to other rules; a lower number means higher priority. Defaults to 1.
   * Rules set by modules (e.g. consent management) have priority 10.
   */
  priority?: number;
}

export interface ActivityConfig {
  /**
   * Whether the activity should be allowed if no other rule applies. Defaults to true.
   */
  default?: boolean;
  /**
   * Rules for this activity.
   */
  rules?: ActivityRule[];
}

/**
 * Map from activity name to its controls.
 */
export type AllowActivitiesConfig = {
  [A in ActivityName]?: ActivityConfig;
};

declare module '../src/config' {
  interface Config {
    /**
     * Activity controls: rules that allow or deny privacy-sensitive activities.
     * Cfr. https://docs.prebid.org/dev-docs/activity-controls.html
     */
    allowActivities?: AllowActivitiesConfig;
  }
}
