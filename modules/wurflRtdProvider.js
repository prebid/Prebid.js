import { submodule } from '../src/hook.js';
import { fetch, sendBeacon } from '../src/ajax.js';
import { loadExternalScript } from '../src/adloader.js';
import {
  mergeDeep,
  prefixLog,
  debugTurnedOn,
} from '../src/utils.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { getStorageManager } from '../src/storageManager.js';
import { getGlobal } from '../src/prebidGlobal.js';

// Constants
const REAL_TIME_MODULE = 'realTimeData';
const MODULE_NAME = 'wurfl';
const MODULE_VERSION = '2.4.0';

// WURFL_JS_HOST is the host for the WURFL service endpoints
const WURFL_JS_HOST = 'https://prebid.wurflcloud.com';
// WURFL_JS_ENDPOINT_PATH is the path for the WURFL.js endpoint used to load WURFL data
const WURFL_JS_ENDPOINT_PATH = '/wurfl.js';
// STATS_HOST is the host for the WURFL stats endpoint
const STATS_HOST = 'https://stats.prebid.wurflcloud.com'
// STATS_ENDPOINT_PATH is the path for the stats endpoint used to send analytics data
const STATS_ENDPOINT_PATH = '/v2/prebid/stats';

// Storage keys for localStorage caching
const WURFL_RTD_STORAGE_KEY = 'wurflrtd';

// OpenRTB 2.0 device type constants
// Based on OpenRTB 2.6 specification
const ORTB2_DEVICE_TYPE = {
  MOBILE_OR_TABLET: 1,
  PERSONAL_COMPUTER: 2,
  CONNECTED_TV: 3,
  PHONE: 4,
  TABLET: 5,
  CONNECTED_DEVICE: 6,
  SET_TOP_BOX: 7,
  OOH_DEVICE: 8
};

// OpenRTB 2.0 device fields that can be enriched from WURFL data
const ORTB2_DEVICE_FIELDS = [
  'make', 'model', 'devicetype', 'os', 'osv', 'hwv',
  'h', 'w', 'ppi', 'pxratio', 'js'
];

// Enrichment type constants
const ENRICHMENT_TYPE = {
  UNKNOWN: 'unknown',
  NONE: 'none',
  LCE: 'lce',
  LCE_ERROR: 'lcefailed',
  WURFL_PUB: 'wurfl_pub',
  WURFL_SSP: 'wurfl_ssp'
};

// Consent class constants
const CONSENT_CLASS = {
  NO: 0,        // No consent/opt-out/COPPA
  PARTIAL: 1,   // Partial or ambiguous
  FULL: 2,      // Full consent or non-GDPR region
  ERROR: -1     // Error computing consent
};

// Default sampling rate constant
const DEFAULT_SAMPLING_RATE = 100;

// Default over quota constant
const DEFAULT_OVER_QUOTA = 0;

// A/B test constants
const AB_TEST = {
  CONTROL_GROUP: 'control',
  TREATMENT_GROUP: 'treatment',
  DEFAULT_SPLIT: 0.5,
  DEFAULT_NAME: 'unknown',
  ENRICHMENT_TYPE_LCE: 'lce',
  ENRICHMENT_TYPE_WURFL: 'wurfl'
};

const logger = prefixLog('[WURFL RTD Submodule]');

// Storage manager for WURFL RTD provider
export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: MODULE_NAME,
});

// bidderEnrichment maps bidder codes to their enrichment type for beacon reporting
let bidderEnrichment;

// enrichmentType tracks the overall enrichment type used in the current auction
let enrichmentType;

// wurflId stores the WURFL ID from device data
let wurflId;

// samplingRate tracks the beacon sampling rate (0-100)
let samplingRate;

// tier stores the WURFL tier from wurfl_pbjs data
let tier;

// overQuota stores the over_quota flag from wurfl_pbjs data (possible values: 0, 1)
let overQuota;

/**
 * Safely gets an object from localStorage with JSON parsing
 * @param {string} key The storage key
 * @returns {Object|null} Parsed object or null if not found/invalid
 */
function getObjectFromStorage(key) {
  if (!storage.hasLocalStorage() || !storage.localStorageIsEnabled()) {
    return null;
  }

  try {
    const dataStr = storage.getDataFromLocalStorage(key);
    return dataStr ? JSON.parse(dataStr) : null;
  } catch (e) {
    logger.logError(`Error parsing stored data for key ${key}:`, e);
    return null;
  }
}

/**
 * Safely sets an object to localStorage with JSON stringification
 * @param {string} key The storage key
 * @param {Object} data The data to store
 * @returns {boolean} Success status
 */
function setObjectToStorage(key, data) {
  if (!storage.hasLocalStorage() || !storage.localStorageIsEnabled()) {
    return false;
  }

  try {
    storage.setDataInLocalStorage(key, JSON.stringify(data));
    return true;
  } catch (e) {
    logger.logError(`Error storing data for key ${key}:`, e);
    return false;
  }
}

/**
 * enrichDeviceFPD enriches the global device object with device data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Object} deviceData Device data to enrich with
 */
function enrichDeviceFPD(reqBidsConfigObj, deviceData) {
  if (!deviceData || !reqBidsConfigObj?.ortb2Fragments?.global) {
    return;
  }

  const prebidDevice = reqBidsConfigObj.ortb2Fragments.global.device || {};
  const enrichedDevice = {};

  ORTB2_DEVICE_FIELDS.forEach(field => {
    // Check if field already exists in prebid device
    if (prebidDevice[field] !== undefined) {
      return;
    }

    // Check if deviceData has a valid value for this field
    if (deviceData[field] === undefined) {
      return;
    }

    // Copy the field value from deviceData to enrichedDevice
    enrichedDevice[field] = deviceData[field];
  });

  // Also copy ext field if present (contains ext.wurfl capabilities)
  if (deviceData.ext) {
    enrichedDevice.ext = deviceData.ext;
  }

  // Use mergeDeep to properly merge into global device
  mergeDeep(reqBidsConfigObj.ortb2Fragments.global, { device: enrichedDevice });
}

/**
 * enrichDeviceBidder enriches bidder-specific device data with WURFL data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Set} bidders Set of bidder codes
 * @param {WurflJSDevice} wjsDevice WURFL.js device data with permissions and caps
 */
function enrichDeviceBidder(reqBidsConfigObj, bidders, wjsDevice) {
  // Initialize bidder fragments if not present
  if (!reqBidsConfigObj.ortb2Fragments.bidder) {
    reqBidsConfigObj.ortb2Fragments.bidder = {};
  }

  const isOverQuota = wjsDevice._isOverQuota();

  bidders.forEach((bidderCode) => {
    const isAuthorized = wjsDevice._isAuthorized(bidderCode);

    if (!isAuthorized) {
      // Over quota + unauthorized -> NO ENRICHMENT
      if (isOverQuota) {
        bidderEnrichment.set(bidderCode, ENRICHMENT_TYPE.NONE);
        return;
      }
      // Under quota + unauthorized -> inherits from global no bidder enrichment
      bidderEnrichment.set(bidderCode, ENRICHMENT_TYPE.WURFL_PUB);
      return;
    }

    // From here: bidder IS authorized
    const bidderDevice = wjsDevice.Bidder(bidderCode);
    bidderEnrichment.set(bidderCode, ENRICHMENT_TYPE.WURFL_SSP);

    // Edge case: authorized but no data (e.g., missing caps)
    if (Object.keys(bidderDevice).length === 0) {
      return;
    }

    // Authorized bidder with data to inject
    const bd = reqBidsConfigObj.ortb2Fragments.bidder[bidderCode] || {};
    mergeDeep(bd, bidderDevice);
    reqBidsConfigObj.ortb2Fragments.bidder[bidderCode] = bd;
  });
}

/**
 * loadWurflJsAsync loads WURFL.js asynchronously and stores response to localStorage
 * @param {Object} config Configuration for WURFL RTD submodule
 * @param {Set} bidders Set of bidder codes
 */
function loadWurflJsAsync(config, bidders) {
  const altHost = config.params?.altHost ?? null;
  const isDebug = debugTurnedOn();

  let host = WURFL_JS_HOST;
  if (altHost) {
    host = altHost;
  }

  const url = new URL(host);
  url.pathname = WURFL_JS_ENDPOINT_PATH;

  // Start timing WURFL.js load
  WurflDebugger.wurflJsLoadStart();

  if (isDebug) {
    url.searchParams.set('debug', 'true');
  }

  url.searchParams.set('mode', 'prebid2');

  // Add bidders list for server optimization
  if (bidders && bidders.size > 0) {
    url.searchParams.set('bidders', Array.from(bidders).join(','));
  }

  // Helper function to load WURFL.js script
  const loadWurflJs = (scriptUrl) => {
    try {
      loadExternalScript(scriptUrl, MODULE_TYPE_RTD, MODULE_NAME, () => {
        window.WURFLPromises.complete.then((res) => {
          logger.logMessage('async WURFL.js data received', res);
          if (res.wurfl_pbjs) {
            // Create optimized cache object with only relevant device data
            WurflDebugger.cacheWriteStart();
            const cacheData = {
              WURFL: res.WURFL,
              wurfl_pbjs: res.wurfl_pbjs,
              expire_at: Date.now() + (res.wurfl_pbjs.ttl * 1000)
            };
            setObjectToStorage(WURFL_RTD_STORAGE_KEY, cacheData);
            WurflDebugger.cacheWriteStop();
            logger.logMessage('WURFL.js device cache stored to localStorage');
          } else {
            logger.logError('invalid async WURFL.js for Prebid response');
          }
        }).catch((err) => {
          logger.logError('async WURFL.js promise error:', err);
        });
      });
    } catch (err) {
      logger.logError('async WURFL.js loading error:', err);
    }
  };

  // Collect Client Hints if available, then load script
  if (navigator?.userAgentData?.getHighEntropyValues) {
    const hints = ['architecture', 'bitness', 'model', 'platformVersion', 'uaFullVersion', 'fullVersionList'];
    navigator.userAgentData.getHighEntropyValues(hints)
      .then(ch => {
        if (ch !== null) {
          url.searchParams.set('uach', JSON.stringify(ch));
        }
      })
      .finally(() => {
        loadWurflJs(url.toString());
      });
  } else {
    // Load script immediately when Client Hints not available
    loadWurflJs(url.toString());
  }
}

/**
 * shouldSample determines if an action should be taken based on sampling rate
 * @param {number} rate Sampling rate from 0-100 (percentage)
 * @returns {boolean} True if should proceed, false if should skip
 */
function shouldSample(rate) {
  if (rate >= 100) {
    return true;
  }
  if (rate <= 0) {
    return false;
  }
  const randomValue = Math.floor(Math.random() * 100);
  return randomValue < rate;
}

/**
 * getConsentClass calculates the consent classification level
 * @param {Object} userConsent User consent data
 * @returns {number} Consent class (0, 1, or 2)
 */
function getConsentClass(userConsent) {
  // Default to no consent if userConsent is not provided or is an empty object
  if (!userConsent || Object.keys(userConsent).length === 0) {
    return CONSENT_CLASS.NO;
  }

  // Check COPPA (Children's Privacy)
  if (userConsent.coppa === true) {
    return CONSENT_CLASS.NO;
  }

  // Check USP/CCPA (US Privacy)
  if (userConsent.usp && typeof userConsent.usp === 'string') {
    if (userConsent.usp.substring(0, 2) === '1Y') {
      return CONSENT_CLASS.NO;
    }
  }

  // Check GDPR object exists
  if (!userConsent.gdpr) {
    return CONSENT_CLASS.FULL; // No GDPR data means not applicable
  }

  // Check GDPR applicability - Note: might be in vendorData
  const gdprApplies = userConsent.gdpr.gdprApplies === true || userConsent.gdpr.vendorData?.gdprApplies === true;

  if (!gdprApplies) {
    return CONSENT_CLASS.FULL;
  }

  // GDPR applies - evaluate purposes
  const vendorData = userConsent.gdpr.vendorData;

  if (!vendorData || !vendorData.purpose) {
    return CONSENT_CLASS.NO;
  }

  const purposes = vendorData.purpose;
  const consents = purposes.consents || {};
  const legitimateInterests = purposes.legitimateInterests || {};

  // Count allowed purposes (7, 8, 10)
  let allowedCount = 0;

  // Purpose 7: Measure ad performance
  if (consents['7'] === true || legitimateInterests['7'] === true) {
    allowedCount++;
  }

  // Purpose 8: Market research
  if (consents['8'] === true || legitimateInterests['8'] === true) {
    allowedCount++;
  }

  // Purpose 10: Develop/improve products
  if (consents['10'] === true || legitimateInterests['10'] === true) {
    allowedCount++;
  }

  // Classify based on allowed purposes count
  if (allowedCount === 0) {
    return CONSENT_CLASS.NO;
  }
  if (allowedCount === 3) {
    return CONSENT_CLASS.FULL;
  }
  return CONSENT_CLASS.PARTIAL;
}

// ==================== CLASSES ====================

// WurflDebugger object for performance tracking and debugging
const WurflDebugger = {
  // Private timing start values
  _moduleExecutionStart: null,
  _cacheReadStart: null,
  _lceDetectionStart: null,
  _cacheWriteStart: null,
  _wurflJsLoadStart: null,

  // Initialize WURFL debug tracking
  init() {
    if (!debugTurnedOn()) {
      // Replace all methods (except init) with no-ops for zero overhead
      Object.keys(this).forEach(key => {
        if (typeof this[key] === 'function' && key !== 'init') {
          this[key] = () => { };
        }
      });
      return;
    }

    // Full debug mode - create/reset window object for tracking
    if (typeof window !== 'undefined') {
      window.WurflRtdDebug = {
        // Module version
        version: MODULE_VERSION,

        // Prebid.js version
        pbjsVersion: getGlobal().version,

        // Data source for current auction
        dataSource: 'unknown', // 'cache' | 'lce'

        // Cache state
        cacheExpired: false,    // Whether the cache was expired when used

        // Simple timing measurements
        moduleExecutionTime: null, // Total time from getBidRequestData start to callback
        cacheReadTime: null,    // Single cache read time (hit or miss)
        lceDetectionTime: null, // LCE detection time (only if dataSource = 'lce')
        cacheWriteTime: null,   // Async cache write time (for future auctions)
        wurflJsLoadTime: null,  // Total time from WURFL.js load start to cache complete

        // The actual data used in current auction
        data: {
          // When dataSource = 'cache'
          wurflData: null,      // The cached WURFL device data
          pbjsData: null,       // The cached wurfl_pbjs data

          // When dataSource = 'lce'
          lceDevice: null       // The LCE-generated device object
        },

        // Beacon payload sent to analytics endpoint
        beaconPayload: null
      };
    }
  },

  // Module execution timing methods
  moduleExecutionStart() {
    this._moduleExecutionStart = performance.now();
  },

  moduleExecutionStop() {
    if (this._moduleExecutionStart === null) return;
    const duration = performance.now() - this._moduleExecutionStart;
    window.WurflRtdDebug.moduleExecutionTime = duration;
    this._moduleExecutionStart = null;
  },

  // Cache read timing methods
  cacheReadStart() {
    this._cacheReadStart = performance.now();
  },

  cacheReadStop() {
    if (this._cacheReadStart === null) return;
    const duration = performance.now() - this._cacheReadStart;
    window.WurflRtdDebug.cacheReadTime = duration;
    this._cacheReadStart = null;
  },

  // LCE detection timing methods
  lceDetectionStart() {
    this._lceDetectionStart = performance.now();
  },

  lceDetectionStop() {
    if (this._lceDetectionStart === null) return;
    const duration = performance.now() - this._lceDetectionStart;
    window.WurflRtdDebug.lceDetectionTime = duration;
    this._lceDetectionStart = null;
  },

  // Cache write timing methods
  cacheWriteStart() {
    this._cacheWriteStart = performance.now();
  },

  cacheWriteStop() {
    if (this._cacheWriteStart === null) return;
    const duration = performance.now() - this._cacheWriteStart;
    window.WurflRtdDebug.cacheWriteTime = duration;
    this._cacheWriteStart = null;

    // Calculate total WURFL.js load time (from load start to cache complete)
    if (this._wurflJsLoadStart !== null) {
      const totalLoadTime = performance.now() - this._wurflJsLoadStart;
      window.WurflRtdDebug.wurflJsLoadTime = totalLoadTime;
      this._wurflJsLoadStart = null;
    }

    // Dispatch custom event when cache write data is available
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent('wurflCacheWriteComplete', {
        detail: {
          duration: duration,
          timestamp: Date.now(),
          debugData: window.WurflRtdDebug
        }
      });
      window.dispatchEvent(event);
    }
  },

  // WURFL.js load timing methods
  wurflJsLoadStart() {
    this._wurflJsLoadStart = performance.now();
  },

  // Data tracking methods
  setDataSource(source) {
    window.WurflRtdDebug.dataSource = source;
  },

  setCacheData(wurflData, pbjsData) {
    window.WurflRtdDebug.data.wurflData = wurflData;
    window.WurflRtdDebug.data.pbjsData = pbjsData;
  },

  setLceData(lceDevice) {
    window.WurflRtdDebug.data.lceDevice = lceDevice;
  },

  setCacheExpired(expired) {
    window.WurflRtdDebug.cacheExpired = expired;
  },

  setBeaconPayload(payload) {
    window.WurflRtdDebug.beaconPayload = payload;
  }
};

// ==================== WURFL JS DEVICE MODULE ====================
const WurflJSDevice = {
  // Private properties
  _wurflData: null,       // WURFL data containing capability values (from window.WURFL)
  _pbjsData: null,        // wurfl_pbjs data with caps array and permissions (from response)
  _basicCaps: null,       // Cached basic capabilities (computed once)
  _pubCaps: null,         // Cached publisher capabilities (computed once)
  _device: null,          // Cached device object (computed once)

  // Constructor from WURFL.js local cache
  fromCache(res) {
    this._wurflData = res.WURFL || {};
    this._pbjsData = res.wurfl_pbjs || {};
    this._basicCaps = null;
    this._pubCaps = null;
    this._device = null;
    return this;
  },

  // Private method - converts a given value to a number
  _toNumber(value) {
    if (value === '' || value === null) {
      return undefined;
    }
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  },

  // Private method - filters capabilities based on indices
  _filterCaps(indexes) {
    const data = {};
    const caps = this._pbjsData.caps;          // Array of capability names
    const wurflData = this._wurflData;         // WURFL data containing capability values

    if (!indexes || !caps || !wurflData) {
      return data;
    }

    indexes.forEach((index) => {
      const capName = caps[index];  // Get capability name by index
      if (capName && capName in wurflData) {
        data[capName] = wurflData[capName];  // Get value from WURFL data
      }
    });

    return data;
  },

  // Private method - gets basic capabilities
  _getBasicCaps() {
    if (this._basicCaps !== null) {
      return this._basicCaps;
    }
    const basicCaps = this._pbjsData.global?.basic_set?.cap_indices || [];
    this._basicCaps = this._filterCaps(basicCaps);
    return this._basicCaps;
  },

  // Private method - gets publisher capabilities
  _getPubCaps() {
    if (this._pubCaps !== null) {
      return this._pubCaps;
    }
    const pubCaps = this._pbjsData.global?.publisher?.cap_indices || [];
    this._pubCaps = this._filterCaps(pubCaps);
    return this._pubCaps;
  },

  // Private method - gets bidder-specific capabilities
  _getBidderCaps(bidderCode) {
    const bidderCaps = this._pbjsData.bidders?.[bidderCode]?.cap_indices || [];
    return this._filterCaps(bidderCaps);
  },

  // Private method - checks if bidder is authorized
  _isAuthorized(bidderCode) {
    return !!(this._pbjsData.bidders && bidderCode in this._pbjsData.bidders);
  },

  // Private method - checks if over quota
  _isOverQuota() {
    return this._pbjsData.over_quota === 1;
  },

  // Private method - returns the ortb2 device type based on WURFL data
  _makeOrtb2DeviceType(wurflData) {
    if (('is_ott' in wurflData) && (wurflData.is_ott)) {
      return ORTB2_DEVICE_TYPE.SET_TOP_BOX;
    }
    if (('is_console' in wurflData) && (wurflData.is_console)) {
      return ORTB2_DEVICE_TYPE.CONNECTED_DEVICE;
    }
    if (('physical_form_factor' in wurflData) && (wurflData.physical_form_factor === 'out_of_home_device')) {
      return ORTB2_DEVICE_TYPE.OOH_DEVICE;
    }
    if (!('form_factor' in wurflData)) {
      return undefined;
    }
    switch (wurflData.form_factor) {
      case 'Desktop':
        return ORTB2_DEVICE_TYPE.PERSONAL_COMPUTER;
      case 'Smartphone':
        return ORTB2_DEVICE_TYPE.PHONE;
      case 'Feature Phone':
        return ORTB2_DEVICE_TYPE.PHONE;
      case 'Tablet':
        return ORTB2_DEVICE_TYPE.TABLET;
      case 'Smart-TV':
        return ORTB2_DEVICE_TYPE.CONNECTED_TV;
      case 'Other Non-Mobile':
        return ORTB2_DEVICE_TYPE.CONNECTED_DEVICE;
      case 'Other Mobile':
        return ORTB2_DEVICE_TYPE.MOBILE_OR_TABLET;
      default:
        return undefined;
    }
  },

  // Public API - returns device object for First Party Data (global)
  // When under quota: returns device fields + ext.wurfl(basic+pub)
  // When over quota: returns device fields only
  FPD() {
    if (this._device !== null) {
      return this._device;
    }

    const wd = this._wurflData;
    if (!wd) {
      this._device = {};
      return this._device;
    }

    this._device = {
      make: wd.brand_name,
      model: wd.model_name,
      devicetype: this._makeOrtb2DeviceType(wd),
      os: wd.advertised_device_os,
      osv: wd.advertised_device_os_version,
      hwv: wd.model_name,
      h: wd.resolution_height,
      w: wd.resolution_width,
      ppi: wd.pixel_density,
      pxratio: this._toNumber(wd.density_class),
      js: this._toNumber(wd.ajax_support_javascript)
    };

    const isOverQuota = this._isOverQuota();
    if (!isOverQuota) {
      const basicCaps = this._getBasicCaps();
      const pubCaps = this._getPubCaps();
      this._device.ext = {
        wurfl: {
          ...basicCaps,
          ...pubCaps
        }
      };
    }

    return this._device;
  },

  // Public API - returns device with bidder-specific ext data
  Bidder(bidderCode) {
    const isAuthorized = this._isAuthorized(bidderCode);
    const isOverQuota = this._isOverQuota();

    // When unauthorized return empty
    if (!isAuthorized) {
      return {};
    }

    // Start with empty device, populate only if publisher is over quota
    // When over quota, we send device data to each authorized bidder individually
    let fpdDevice = {};
    if (isOverQuota) {
      fpdDevice = this.FPD();
    }

    if (!this._pbjsData.caps) {
      return { device: fpdDevice };
    }

    // For authorized bidders: basic + pub + bidder-specific caps
    const wurflData = {
      ...(isOverQuota ? this._getBasicCaps() : {}),
      ...this._getBidderCaps(bidderCode)
    };

    return {
      device: {
        ...fpdDevice,
        ext: {
          wurfl: wurflData
        }
      }
    };
  }
};
// ==================== END WURFL JS DEVICE MODULE ====================

// ==================== WURFL LCE DEVICE MODULE ====================
const WurflLCEDevice = {
  // Private mappings for device detection
  _desktopMapping: new Map([
    ['Windows NT', 'Windows'],
    ['Macintosh; Intel Mac OS X', 'macOS'],
    ['Mozilla/5.0 (X11; Linux', 'Linux'],
    ['X11; Ubuntu; Linux x86_64', 'Linux'],
    ['Mozilla/5.0 (X11; CrOS', 'ChromeOS'],
  ]),

  _tabletMapping: new Map([
    ['iPad; CPU OS ', 'iPadOS'],
  ]),

  _smartphoneMapping: new Map([
    ['Android', 'Android'],
    ['iPhone; CPU iPhone OS', 'iOS'],
  ]),

  _smarttvMapping: new Map([
    ['Web0S', 'LG webOS'],
    ['SMART-TV; Linux; Tizen', 'Tizen'],
  ]),

  _ottMapping: new Map([
    ['Roku', 'Roku OS'],
    ['Xbox', 'Windows'],
    ['PLAYSTATION', 'PlayStation OS'],
    ['PlayStation', 'PlayStation OS'],
  ]),

  _makeMapping: new Map([
    ['motorola', 'Motorola'],
    [' moto ', 'Motorola'],
    ['Android', 'Generic'],
    ['iPad', 'Apple'],
    ['iPhone', 'Apple'],
    ['Firefox', 'Mozilla'],
    ['Edge', 'Microsoft'],
    ['Chrome', 'Google'],
  ]),

  _modelMapping: new Map([
    ['Android', 'Android'],
    ['iPad', 'iPad'],
    ['iPhone', 'iPhone'],
    ['Firefox', 'Firefox'],
    ['Edge', 'Edge'],
    ['Chrome', 'Chrome'],
  ]),

  // Private helper methods
  _parseOsVersion(ua, osName) {
    switch (osName) {
      case 'Windows': {
        const matches = ua.match(/Windows NT ([\d.]+)/);
        return matches ? matches[1] : '';
      }
      case 'macOS': {
        const matches = ua.match(/Mac OS X ([\d_]+)/);
        return matches ? matches[1].replace(/_/g, '.') : '';
      }
      case 'iOS': {
        // iOS 26 specific logic
        const matches1 = ua.match(/iPhone; CPU iPhone OS 18[\d_]+ like Mac OS X\).+(?:Version|FBSV)\/(26[\d.]+)/);
        if (matches1) {
          return matches1[1];
        }
        // iOS 18.x and lower
        const matches2 = ua.match(/iPhone; CPU iPhone OS ([\d_]+) like Mac OS X/);
        return matches2 ? matches2[1].replace(/_/g, '.') : '';
      }
      case 'iPadOS': {
        // iOS 26 specific logic
        const matches1 = ua.match(/iPad; CPU OS 18[\d_]+ like Mac OS X\).+(?:Version|FBSV)\/(26[\d.]+)/);
        if (matches1) {
          return matches1[1];
        }
        // iOS 18.x and lower
        const matches2 = ua.match(/iPad; CPU OS ([\d_]+) like Mac OS X/);
        return matches2 ? matches2[1].replace(/_/g, '.') : '';
      }
      case 'Android': {
        // For Android UAs with a decimal
        const matches1 = ua.match(/Android ([\d.]+)/);
        if (matches1) {
          return matches1[1];
        }
        // For Android UAs without a decimal
        const matches2 = ua.match(/Android ([\d]+)/);
        return matches2 ? matches2[1] : '';
      }
      case 'ChromeOS': {
        const matches = ua.match(/CrOS x86_64 ([\d.]+)/);
        return matches ? matches[1] : '';
      }
      case 'Tizen': {
        const matches = ua.match(/Tizen ([\d.]+)/);
        return matches ? matches[1] : '';
      }
      case 'Roku OS': {
        const matches = ua.match(/Roku\/DVP [\dA-Z]+ [\d.]+\/([\d.]+)/);
        return matches ? matches[1] : '';
      }
      case 'PlayStation OS': {
        // PS4
        const matches1 = ua.match(/PlayStation \d\/([\d.]+)/);
        if (matches1) {
          return matches1[1];
        }
        // PS3
        const matches2 = ua.match(/PLAYSTATION \d ([\d.]+)/);
        return matches2 ? matches2[1] : '';
      }
      case 'Linux':
      case 'LG webOS':
      default:
        return '';
    }
  },

  _makeDeviceInfo(deviceType, osName, ua) {
    return { deviceType, osName, osVersion: this._parseOsVersion(ua, osName) };
  },

  _getDeviceInfo(ua) {
    // Iterate over ottMapping
    // Should remove above Desktop
    for (const [osToken, osName] of this._ottMapping) {
      if (ua.includes(osToken)) {
        return this._makeDeviceInfo(ORTB2_DEVICE_TYPE.SET_TOP_BOX, osName, ua);
      }
    }
    // Iterate over desktopMapping
    for (const [osToken, osName] of this._desktopMapping) {
      if (ua.includes(osToken)) {
        return this._makeDeviceInfo(ORTB2_DEVICE_TYPE.PERSONAL_COMPUTER, osName, ua);
      }
    }
    // Iterate over tabletMapping
    for (const [osToken, osName] of this._tabletMapping) {
      if (ua.includes(osToken)) {
        return this._makeDeviceInfo(ORTB2_DEVICE_TYPE.TABLET, osName, ua);
      }
    }
    // Android Tablets
    if (ua.includes('Android') && !ua.includes('Mobile Safari') && ua.includes('Safari')) {
      return this._makeDeviceInfo(ORTB2_DEVICE_TYPE.TABLET, 'Android', ua);
    }
    // Iterate over smartphoneMapping
    for (const [osToken, osName] of this._smartphoneMapping) {
      if (ua.includes(osToken)) {
        return this._makeDeviceInfo(ORTB2_DEVICE_TYPE.PHONE, osName, ua);
      }
    }
    // Iterate over smarttvMapping
    for (const [osToken, osName] of this._smarttvMapping) {
      if (ua.includes(osToken)) {
        return this._makeDeviceInfo(ORTB2_DEVICE_TYPE.CONNECTED_TV, osName, ua);
      }
    }
    return { deviceType: '', osName: '', osVersion: '' };
  },

  _getDevicePixelRatioValue(osName) {
    switch (osName) {
      case 'Android':
        return 2.0;
      case 'iOS':
        return 3.0;
      case 'iPadOS':
        return 2.0;
      default:
        return 1.0;
    }
  },

  _getMake(ua) {
    for (const [makeToken, brandName] of this._makeMapping) {
      if (ua.includes(makeToken)) {
        return brandName;
      }
    }
    return 'Generic';
  },

  _getModel(ua) {
    for (const [modelToken, modelName] of this._modelMapping) {
      if (ua.includes(modelToken)) {
        return modelName;
      }
    }
    return '';
  },

  _getUserAgent() {
    return window.navigator?.userAgent || '';
  },

  _isRobot(useragent) {
    const botTokens = ['+http', 'Googlebot', 'BingPreview', 'Yahoo! Slurp'];
    for (const botToken of botTokens) {
      if (useragent.includes(botToken)) {
        return true;
      }
    }
    return false;
  },

  // Public API - returns device object for First Party Data (global)
  FPD() {
    // Early exit - check window exists
    if (typeof window === 'undefined') {
      return { js: 1 };
    }

    const device = { js: 1 };
    const useragent = this._getUserAgent();

    // Only process UA-dependent properties if we have a UA
    if (useragent) {
      // Get device info
      const deviceInfo = this._getDeviceInfo(useragent);
      if (deviceInfo.deviceType !== undefined) {
        device.devicetype = deviceInfo.deviceType;
      }
      if (deviceInfo.osName !== undefined) {
        device.os = deviceInfo.osName;
      }
      if (deviceInfo.osVersion !== undefined) {
        device.osv = deviceInfo.osVersion;
      }

      // Make/model
      const make = this._getMake(useragent);
      if (make !== undefined) {
        device.make = make;
      }

      const model = this._getModel(useragent);
      if (model !== undefined) {
        device.model = model;
        device.hwv = model;
      }

      // Device pixel ratio based on OS
      const pixelRatio = this._getDevicePixelRatioValue(deviceInfo.osName);
      if (pixelRatio !== undefined) {
        device.pxratio = pixelRatio;
      }
    }

    // Add ext.wurfl with is_robot detection
    if (useragent) {
      device.ext = {
        wurfl: {
          is_robot: this._isRobot(useragent)
        }
      };
    }

    return device;
  }
};
// ==================== END WURFL LCE DEVICE MODULE ====================

// ==================== A/B TEST MANAGER  ====================

const ABTestManager = {
  _enabled: false,
  _name: null,
  _variant: null,
  _excludeLCE: true,
  _enrichmentType: null,

  /**
   * Initializes A/B test configuration
   * @param {Object} params Configuration params from config.params
   */
  init(params) {
    this._enabled = false;
    this._name = null;
    this._variant = null;
    this._excludeLCE = true;
    this._enrichmentType = null;

    const abTestEnabled = params?.abTest ?? false;
    if (!abTestEnabled) {
      return;
    }

    this._enabled = true;
    this._name = params?.abName ?? AB_TEST.DEFAULT_NAME;
    this._excludeLCE = params?.abExcludeLCE ?? true;

    const split = params?.abSplit ?? AB_TEST.DEFAULT_SPLIT;
    this._variant = this._computeVariant(split);

    logger.logMessage(`A/B test "${this._name}": user in ${this._variant} group (exclude_lce: ${this._excludeLCE})`);
  },

  /**
   * _computeVariant determines A/B test variant assignment based on split
   * @param {number} split Treatment group split from 0-1 (float, e.g., 0.5 = 50% treatment)
   * @returns {string} AB_TEST.TREATMENT_GROUP or AB_TEST.CONTROL_GROUP
   */
  _computeVariant(split) {
    if (split >= 1) {
      return AB_TEST.TREATMENT_GROUP;
    }
    if (split <= 0) {
      return AB_TEST.CONTROL_GROUP;
    }
    return Math.random() < split ? AB_TEST.TREATMENT_GROUP : AB_TEST.CONTROL_GROUP;
  },

  /**
   * Sets the enrichment type encountered in current auction
   * @param {string} enrichmentType 'lce' or 'wurfl'
   */
  setEnrichmentType(enrichmentType) {
    this._enrichmentType = enrichmentType;
  },

  /**
   * Checks if A/B test is enabled for current auction
   * @returns {boolean} True if A/B test should be applied
   */
  isEnabled() {
    if (!this._enabled) return false;
    if (this._enrichmentType === AB_TEST.ENRICHMENT_TYPE_LCE && this._excludeLCE) {
      return false;
    }
    return true;
  },

  /**
   * Checks if enrichment should be skipped (control group)
   * @returns {boolean} True if enrichment should be skipped
   */
  isInControlGroup() {
    if (!this.isEnabled()) {
      return false;
    }
    return (this._variant === AB_TEST.CONTROL_GROUP)
  },

  /**
   * Gets beacon payload fields (returns null if not active for auction)
   * @returns {Object|null}
   */
  getBeaconPayload() {
    if (!this.isEnabled()) {
      return null;
    }

    return {
      ab_name: this._name,
      ab_variant: this._variant
    };
  }
};

// ==================== END A/B TEST MANAGER MODULE ====================

// ==================== EXPORTED FUNCTIONS ====================

/**
 * init initializes the WURFL RTD submodule
 * @param {Object} config Configuration for WURFL RTD submodule
 * @param {Object} userConsent User consent data
 */
const init = (config, userConsent) => {
  // Initialize debugger based on global debug flag
  WurflDebugger.init();

  // Initialize module state
  bidderEnrichment = new Map();
  enrichmentType = ENRICHMENT_TYPE.UNKNOWN;
  wurflId = '';
  samplingRate = DEFAULT_SAMPLING_RATE;
  tier = '';
  overQuota = DEFAULT_OVER_QUOTA;

  logger.logMessage('initialized', { version: MODULE_VERSION });

  // A/B testing: initialize ABTestManager
  ABTestManager.init(config?.params);

  return true;
}

/**
 * getBidRequestData enriches the OpenRTB 2.0 device data with WURFL data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {Object} config Configuration for WURFL RTD submodule
 * @param {Object} userConsent User consent data
 */
const getBidRequestData = (reqBidsConfigObj, callback, config, userConsent) => {
  // Start module execution timing
  WurflDebugger.moduleExecutionStart();

  // Extract bidders from request configuration and set default enrichment
  const bidders = new Set();
  reqBidsConfigObj.adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      bidders.add(bid.bidder);
      bidderEnrichment.set(bid.bidder, ENRICHMENT_TYPE.UNKNOWN);
    });
  });

  // Determine enrichment type based on cache availability
  WurflDebugger.cacheReadStart();
  const cachedWurflData = getObjectFromStorage(WURFL_RTD_STORAGE_KEY);
  WurflDebugger.cacheReadStop();

  const abEnrichmentType = cachedWurflData ? AB_TEST.ENRICHMENT_TYPE_WURFL : AB_TEST.ENRICHMENT_TYPE_LCE;
  ABTestManager.setEnrichmentType(abEnrichmentType);

  // A/B test: Skip enrichment for control group
  if (ABTestManager.isInControlGroup()) {
    logger.logMessage('A/B test control group: skipping enrichment');
    enrichmentType = ENRICHMENT_TYPE.NONE;
    bidders.forEach(bidder => bidderEnrichment.set(bidder, ENRICHMENT_TYPE.NONE));
    WurflDebugger.moduleExecutionStop();
    callback();
    return;
  }

  // Priority 1: Check if WURFL.js response is cached
  if (cachedWurflData) {
    const isExpired = cachedWurflData.expire_at && Date.now() > cachedWurflData.expire_at;

    WurflDebugger.setDataSource('cache');
    WurflDebugger.setCacheExpired(isExpired);
    WurflDebugger.setCacheData(cachedWurflData.WURFL, cachedWurflData.wurfl_pbjs);

    const wjsDevice = WurflJSDevice.fromCache(cachedWurflData);
    if (wjsDevice._isOverQuota()) {
      enrichmentType = ENRICHMENT_TYPE.NONE;
    } else {
      enrichDeviceFPD(reqBidsConfigObj, wjsDevice.FPD());
      enrichmentType = ENRICHMENT_TYPE.WURFL_PUB;
    }
    enrichDeviceBidder(reqBidsConfigObj, bidders, wjsDevice);

    // Store WURFL ID for analytics
    wurflId = cachedWurflData.WURFL?.wurfl_id || '';

    // Store sampling rate for beacon
    samplingRate = cachedWurflData.wurfl_pbjs?.sampling_rate ?? DEFAULT_SAMPLING_RATE;

    // Store tier for beacon
    tier = cachedWurflData.wurfl_pbjs?.tier ?? '';

    // Store over_quota for beacon
    overQuota = cachedWurflData.wurfl_pbjs?.over_quota ?? DEFAULT_OVER_QUOTA;

    // If expired, refresh cache async
    if (isExpired) {
      loadWurflJsAsync(config, bidders);
    }

    logger.logMessage('enrichment completed', {
      type: enrichmentType,
      dataSource: 'cache',
      cacheExpired: isExpired,
      bidders: Object.fromEntries(bidderEnrichment),
      totalBidders: bidderEnrichment.size
    });

    WurflDebugger.moduleExecutionStop();
    callback();
    return;
  }

  // Priority 2: return LCE data
  WurflDebugger.setDataSource('lce');
  WurflDebugger.lceDetectionStart();

  let lceDevice;
  try {
    lceDevice = WurflLCEDevice.FPD();
    enrichmentType = ENRICHMENT_TYPE.LCE;
  } catch (e) {
    logger.logError('Error generating LCE device data:', e);
    lceDevice = { js: 1 };
    enrichmentType = ENRICHMENT_TYPE.LCE_ERROR;
  }

  WurflDebugger.lceDetectionStop();
  WurflDebugger.setLceData(lceDevice);
  enrichDeviceFPD(reqBidsConfigObj, lceDevice);

  // Set enrichment type for all bidders
  bidders.forEach(bidder => bidderEnrichment.set(bidder, enrichmentType));

  // Set default sampling rate for LCE
  samplingRate = DEFAULT_SAMPLING_RATE;

  // Set default tier for LCE
  tier = '';

  // Set default over_quota for LCE
  overQuota = DEFAULT_OVER_QUOTA;

  // Load WURFL.js async for future requests
  loadWurflJsAsync(config, bidders);

  logger.logMessage('enrichment completed', {
    type: enrichmentType,
    dataSource: 'lce',
    bidders: Object.fromEntries(bidderEnrichment),
    totalBidders: bidderEnrichment.size
  });

  WurflDebugger.moduleExecutionStop();
  callback();
}

/**
 * onAuctionEndEvent is called when the auction ends
 * @param {Object} auctionDetails Auction details
 * @param {Object} config Configuration for WURFL RTD submodule
 * @param {Object} userConsent User consent data
 */
function onAuctionEndEvent(auctionDetails, config, userConsent) {
  // Apply sampling
  if (!shouldSample(samplingRate)) {
    logger.logMessage(`beacon skipped due to sampling (rate: ${samplingRate}%)`);
    return;
  }

  const statsHost = config.params?.statsHost ?? null;

  let host = STATS_HOST;
  if (statsHost) {
    host = statsHost;
  }

  let url;
  try {
    url = new URL(host);
    url.pathname = STATS_ENDPOINT_PATH;
  } catch (e) {
    logger.logError('Invalid stats host URL:', host);
    return;
  }

  // Calculate consent class
  let consentClass;
  try {
    consentClass = getConsentClass(userConsent);
    logger.logMessage('consent class', consentClass);
  } catch (e) {
    logger.logError('Error calculating consent class:', e);
    consentClass = CONSENT_CLASS.ERROR;
  }

  // Build a lookup object for winning bid request IDs
  const winningBids = getGlobal().getHighestCpmBids() || [];
  const winningBidIds = {};
  for (let i = 0; i < winningBids.length; i++) {
    const bid = winningBids[i];
    winningBidIds[bid.requestId] = true;
  }

  // Build a lookup object for bid responses: "adUnitCode:bidderCode" -> bid
  const bidResponseMap = {};
  const bidsReceived = auctionDetails.bidsReceived || [];
  for (let i = 0; i < bidsReceived.length; i++) {
    const bid = bidsReceived[i];
    const adUnitCode = bid.adUnitCode;
    const bidderCode = bid.bidder || bid.bidderCode;
    const key = adUnitCode + ':' + bidderCode;
    bidResponseMap[key] = bid;
  }

  // Build ad units array with all bidders (including non-responders)
  const adUnits = [];

  if (auctionDetails.adUnits) {
    for (let i = 0; i < auctionDetails.adUnits.length; i++) {
      const adUnit = auctionDetails.adUnits[i];
      const adUnitCode = adUnit.code;
      const bidders = [];

      // Check each bidder configured for this ad unit
      const bids = adUnit.bids || [];
      for (let j = 0; j < bids.length; j++) {
        const bidConfig = bids[j];
        const bidderCode = bidConfig.bidder;
        const key = adUnitCode + ':' + bidderCode;
        const bidResponse = bidResponseMap[key];

        if (bidResponse) {
          // Bidder responded - include full data
          const isWinner = winningBidIds[bidResponse.requestId] === true;
          bidders.push({
            bidder: bidderCode,
            bdr_enrich: bidderEnrichment.get(bidderCode),
            cpm: bidResponse.cpm,
            currency: bidResponse.currency,
            won: isWinner
          });
        } else {
          // Bidder didn't respond - include without cpm/currency
          bidders.push({
            bidder: bidderCode,
            bdr_enrich: bidderEnrichment.get(bidderCode),
            won: false
          });
        }
      }

      adUnits.push({
        ad_unit_code: adUnitCode,
        bidders: bidders
      });
    }
  }

  logger.logMessage('auction completed', {
    bidsReceived: auctionDetails.bidsReceived ? auctionDetails.bidsReceived.length : 0,
    bidsWon: winningBids.length,
    adUnits: adUnits.length
  });

  // Build complete payload
  const payloadData = {
    version: MODULE_VERSION,
    domain: typeof window !== 'undefined' ? window.location.hostname : '',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    sampling_rate: samplingRate,
    enrichment: enrichmentType,
    wurfl_id: wurflId,
    tier: tier,
    over_quota: overQuota,
    consent_class: consentClass,
    ad_units: adUnits
  };

  // Add A/B test fields if enabled
  const abPayload = ABTestManager.getBeaconPayload();
  if (abPayload) {
    payloadData.ab_name = abPayload.ab_name;
    payloadData.ab_variant = abPayload.ab_variant;
  }

  const payload = JSON.stringify(payloadData);

  // Both sendBeacon and fetch send as text/plain to avoid CORS preflight requests.
  // Server must parse body as JSON regardless of Content-Type header.
  const sentBeacon = sendBeacon(url.toString(), payload);
  if (sentBeacon) {
    WurflDebugger.setBeaconPayload(payloadData);
    return;
  }

  fetch(url.toString(), {
    method: 'POST',
    body: payload,
    mode: 'no-cors',
    keepalive: true
  }).catch((e) => {
    logger.logError('Failed to send beacon via fetch:', e);
  });

  WurflDebugger.setBeaconPayload(payloadData);
}

// ==================== MODULE EXPORT ====================

// The WURFL submodule
export const wurflSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
  onAuctionEndEvent,
}

// Register the WURFL submodule as submodule of realTimeData
submodule(REAL_TIME_MODULE, wurflSubmodule);
