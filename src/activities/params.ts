import { MODULE_TYPE_BIDDER, type ModuleType } from './modules.js';
import { hook } from '../hook.js';
import type { StorageType } from '../storageManager.ts';
import type { SyncType } from '../userSync.ts';
import type { AdUnit, AdUnitBid } from '../adUnits.ts';
import type { Bid } from '../bidfactory.ts';
import type { ORTBFragments } from '../types/common.d.ts';
import type { AnalyticsConfig } from '../../libraries/analyticsAdapter/AnalyticsAdapter.ts';

/**
 * Component ID - who is trying to perform the activity?
 * Relevant for all activities.
 */
export const ACTIVITY_PARAM_COMPONENT = 'component';
export const ACTIVITY_PARAM_COMPONENT_TYPE = 'componentType';
export const ACTIVITY_PARAM_COMPONENT_NAME = 'componentName';

/**
 * Code of the bid adapter that `componentName` is an alias of.
 * May be the same as the component name.
 *
 * relevant for all activities, but only when componentType is 'bidder'.
 */
export const ACTIVITY_PARAM_ADAPTER_CODE = 'adapterCode';

/**
 * Storage type - either 'html5' or 'cookie'.
 * Relevant for: accessDevice
 */
export const ACTIVITY_PARAM_STORAGE_TYPE = 'storageType';

/**
 * Storage key - cookie name or localStorage key.
 * Relevant for: accessDevice
 */
export const ACTIVITY_PARAM_STORAGE_KEY = 'storageKey';

/**
 * True if attempting to write to device storage; false otherwise (e.g. when reading from or checking availability of storage).
 * Relevant for: accessDevice
 */
export const ACTIVITY_PARAM_STORAGE_WRITE = 'write';

/**
 * s2sConfig[].configName, used to identify a particular s2s instance
 * relevant for: fetchBids, but only when component is 'prebid.pbsBidAdapter'
 */
export const ACTIVITY_PARAM_S2S_NAME = 'configName';
/**
 * user sync type - 'iframe' or 'pixel'
 * relevant for: syncUser
 */
export const ACTIVITY_PARAM_SYNC_TYPE = 'syncType';
/**
 * user sync URL
 * relevant for: syncUser
 */
export const ACTIVITY_PARAM_SYNC_URL = 'syncUrl';
/**
 * Configuration options for analytics adapter - the argument passed to `enableAnalytics`.
 * Relevant for: reportAnalytics
 * @private
 */
export const ACTIVITY_PARAM_ANL_CONFIG = '_config';

/**
 * Parameters of an activity, as seen by publisher-defined rules (`allowActivities`): private (`_`-prefixed)
 * parameters are not included.
 */
export interface PublicActivityParams {
  /**
   * Type of the component (usually a module) that wishes to perform the activity.
   */
  [ACTIVITY_PARAM_COMPONENT_TYPE]: ModuleType;
  /**
   * Name of the component: a bidder code, user ID or RTD submodule name, analytics provider code, or module name.
   */
  [ACTIVITY_PARAM_COMPONENT_NAME]: string;
  /**
   * `componentType` and `componentName` joined by a dot, e.g. 'bidder.bidderX'.
   */
  [ACTIVITY_PARAM_COMPONENT]: string;
  /**
   * When `componentType` is 'bidder', the code of the bidder that `componentName` is an alias of
   * (or `componentName` itself if it is not an alias).
   */
  [ACTIVITY_PARAM_ADAPTER_CODE]?: string;
  /**
   * Name of the Prebid Server (s2s) configuration, if any.
   */
  [ACTIVITY_PARAM_S2S_NAME]?: string;
  /**
   * accessDevice: the device storage mechanism being accessed.
   */
  [ACTIVITY_PARAM_STORAGE_TYPE]?: StorageType;
  /**
   * accessDevice: cookie name or localStorage key.
   */
  [ACTIVITY_PARAM_STORAGE_KEY]?: string;
  /**
   * accessDevice: true when writing to device storage; false otherwise (e.g. reading or checking availability).
   */
  [ACTIVITY_PARAM_STORAGE_WRITE]?: boolean;
  /**
   * syncUser: type of the user sync.
   */
  [ACTIVITY_PARAM_SYNC_TYPE]?: SyncType;
  /**
   * syncUser: URL of the user sync.
   */
  [ACTIVITY_PARAM_SYNC_URL]?: string;
  /**
   * fetchBids: the ad unit's bid definition; acceptBid: the bid response.
   */
  bid?: AdUnitBid | Partial<Bid>;
  /**
   * fetchBids, acceptBid: the ad unit.
   */
  adUnit?: AdUnit;
  /**
   * fetchBids, acceptBid: first party data for the bidder.
   */
  ortb2?: ORTBFragments['global'];
  /**
   * fetchBids: auction ID.
   */
  auctionId?: string;
  /**
   * fetchBids: true if the bidder is fetched only through Prebid Server.
   */
  isS2S?: boolean;
  /**
   * enrichEids (userId): false when checking whether an already initialized submodule's IDs may be used.
   */
  init?: boolean;
  [param: string]: unknown;
}

export interface ActivityParams extends PublicActivityParams {
  [ACTIVITY_PARAM_ANL_CONFIG]?: AnalyticsConfig<any>;
}

export function activityParamsBuilder(resolveAlias: (alias: string) => string) {
  return function activityParams(moduleType: ModuleType, moduleName: string, params?: Partial<ActivityParams>): ActivityParams {
    const defaults: ActivityParams = {
      [ACTIVITY_PARAM_COMPONENT_TYPE]: moduleType,
      [ACTIVITY_PARAM_COMPONENT_NAME]: moduleName,
      [ACTIVITY_PARAM_COMPONENT]: `${moduleType}.${moduleName}`
    };
    if (moduleType === MODULE_TYPE_BIDDER) {
      defaults[ACTIVITY_PARAM_ADAPTER_CODE] = resolveAlias(moduleName);
    }
    return buildActivityParams(Object.assign(defaults, params));
  };
}

export const buildActivityParams = hook('sync', (params: ActivityParams) => params);
