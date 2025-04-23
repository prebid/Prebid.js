import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 * @typedef {import('../src/adapters/bidderFactory.js').TimedOutBid} TimedOutBid
 */

const GVLID = 793;
export const ADAPTER_VERSION = "1.0.0";
const BIDDER_CODE = 'aps';
const AAX_ENDPOINT = 'https://web.ads.aps.amazon-adsystem.com/e/pb/bid';
const DEFAULT_PREBID_CREATIVE_JS_URL =
  'https://client.aps.amazon-adsystem.com/prebid-creative.js';
const storageManager = getStorageManager({ bidderCode: BIDDER_CODE });
let hasReferencePixelFired = false;

/**
 * Wraps a function with error handling.
 * If the wrapped function throws, the passed callback is executed.
 */
function analyticsWrapper(fn, cb) {
  return function (...args) {
    try {
      return fn.apply(this, args);
    } catch (e) {
      // Wrap error in the context of the specific function (key)
      cb(e);
      throw e;
    }
  };
}

/**
 * Records an event by pushing a CustomEvent onto a global queue.
 * Creates an account-specific store on window._aps if needed.
 */
function record(eventName, data) {
  // Ensure data is an object; if not wrap it as { error: data }
  if (typeof data !== 'object' || data === null) {
    data = { error: data };
  }
  // If an error is provided and it's not an instance of Error, wrap it with a helpful message.
  if (data.error && !(data.error instanceof Error)) {
    data.error = new Error('Wrapped non-standard error: ' + String(data.error));
  }
  const accountID = config.getConfig('accountID');
  window._aps = window._aps || new Map();
  if (!window._aps.has(accountID)) {
    window._aps.set(accountID, {
      queue: [],
      store: new Map(),
    });
  }

  return new Promise((resolve, reject) => {
    window._aps.get(accountID).queue.push(
      new CustomEvent(eventName, {
        detail: {
          ...data,
          resolve,
          reject,
          source: 'prebid-adapter'
        },
      })
    );
  });
}

/**
 * Checks if the given parameter is a function.
 */
function isFunction(func) {
  return typeof func === 'function';
}

/**
 * Registers analytics by wrapping each function in the provided spec object
 * with error handling via analyticsWrapper.
 */
function addCustomAnalytics(spec) {
  Object.keys(spec).forEach(key => {
    if (isFunction(spec[key])) {
      // Wrap each function so that errors are recorded with a standardized event name.
      spec[key] = analyticsWrapper(spec[key], (e) =>
        record(`prebidAdapter/${key}/didFail`, { error: e })
      );
    }
  });
}

/**
 * Retrieves the prebid global store scoped by accountID.
 * This ensures that each account gets its own isolated global store.
 *
 * @param {boolean} createIfNotExists - If true, the store will be created if missing.
 * @returns {object | null} The account-specific aps_prebid object or null.
 */
function getApsPrebidGlobal(createIfNotExists = false) {
  // Retrieve the accountID from configuration; default to 'default' if not provided.
  const accountID = config.getConfig('accountID') || 'default';

  // If the global container exists, check if the account-specific store exists.
  if (typeof window.aps_prebid === 'object' && window.aps_prebid !== null) {
    if (
      typeof window.aps_prebid[accountID] === 'object' &&
      window.aps_prebid[accountID] !== null
    ) {
      return window.aps_prebid[accountID];
    } else if (createIfNotExists) {
      window.aps_prebid[accountID] = {};
      return window.aps_prebid[accountID];
    }
  } else if (createIfNotExists) {
    // Create the global container and account-specific store if needed.
    window.aps_prebid = {};
    window.aps_prebid[accountID] = {};
    return window.aps_prebid[accountID];
  }
  return null;
}

/**
 * Safely reads a value from localStorage using the storageManager.
 *
 * @param {string} key - The key to retrieve from localStorage.
 * @return {string|null} The stored value, or null if unavailable.
 */
function safelyReadFromLocalStorage(key) {
  try {
    if (storageManager.localStorageIsEnabled()) {
      return storageManager.getDataFromLocalStorage(key);
    }
  } catch (error) {
    // Record error related to localStorage read failure.
    record('prebidAdapter/localStorage/didFail', { error: error });
  }
  return null;
}

/**
 * Retrieves the stored configuration specific to the account from localStorage.
 * Uses the key 'aps_prebid_{accountID}' to ensure account-specific storage.
 *
 * @returns {object|null} Parsed configuration object or null if not found/invalid.
 */
function getStoredConfig() {
  const accountID = config.getConfig('accountID') || 'default';
  const storageKey = `aps_prebid_${accountID}`;
  const storedConfigStr = safelyReadFromLocalStorage(storageKey);
  if (storedConfigStr) {
    try {
      return JSON.parse(storedConfigStr);
    } catch (error) {
      // Record error if JSON parsing of stored configuration fails.
      record('prebidAdapter/storedConfig/didFail', { error: error });
    }
  }
  return null;
}

/**
 * Helper function to validate a canary rate value from different sources.
 * Records an error event if the value is NaN or out of the expected range.
 *
 * @param {*} rawRate - The raw rate value from configuration.
 * @param {string} nanLabel - Label to use for a NaN error event.
 * @param {string} rangeLabel - Label to use for a range error event.
 * @returns {number|null} The valid rate or null if invalid.
 */
function validateRate(rawRate, nanLabel, rangeLabel) {
  const rate = Number(rawRate);
  if (isNaN(rate)) {
    // Record error for NaN canary rate with specific source label.
    record(`prebidAdapter/canaryRate${nanLabel}/didFail`, { error: rawRate });
    return null;
  }
  if (rate < 0 || rate > 1) {
    // Record error for out-of-range canary rate with specific source label.
    record(`prebidAdapter/canaryRate${rangeLabel}/didFail`, { error: rate });
    return null;
  }
  return rate;
}

/**
 * Object to determine the instructed role.
 * It checks in order:
 * 1. Global variable (window.aps_prebid.roleInstructions.prebid)
 * 2. localStorage (stored config)
 * 3. Publisher configuration (config.getConfig('roleInstruction'))
 * 4. Hardcoded fallback ('canary')
 */
const instructedRole = {
  get: function () {
    // 1. Check global store for role instructions.
    const apsGlobalStore = getApsPrebidGlobal();
    if (
      apsGlobalStore &&
      apsGlobalStore.roleInstructions &&
      typeof apsGlobalStore.roleInstructions.prebid === 'string'
    ) {
      return apsGlobalStore.roleInstructions.prebid;
    }
    // 2. Check stored configuration in localStorage.
    const storedConfigObj = getStoredConfig();
    if (
      storedConfigObj &&
      storedConfigObj.roleInstructions &&
      typeof storedConfigObj.roleInstructions.prebid === 'string'
    ) {
      return storedConfigObj.roleInstructions.prebid;
    }
    // 3. Check publisher configuration.
    const roleInstruction = config.getConfig('roleInstruction');
    if (typeof roleInstruction === 'string') {
      return roleInstruction;
    }
    // 4. Fallback to hardcoded value.
    return 'canary';
  },
};

/**
 * Object representing the assumed role for both prebid and webclient.
 * Provides getter and setter that interact with the global store.
 */
const assumedRole = {
  get: function (context = 'prebid') {
    const apsGlobalStore = getApsPrebidGlobal();
    return apsGlobalStore && apsGlobalStore.currentRoles
      ? apsGlobalStore.currentRoles[context]
      : undefined;
  },
  set: function (context, role) {
    if (role === undefined) {
      role = context;
      context = 'prebid';
    }
    // Ensure that the global store exists.
    const apsGlobalStore = getApsPrebidGlobal(true);
    apsGlobalStore.currentRoles = apsGlobalStore.currentRoles || {};
    apsGlobalStore.currentRoles[context] = role;
  },
};

/**
 * Object to determine the canary rate.
 * Checks the canary rate from:
 * 1. Global variable (window.aps_prebid.canaryRate)
 * 2. localStorage (stored config)
 * 3. Publisher configuration (config.getConfig('canaryRate'))
 * 4. Defaults to 2%
 */
const canaryRate = {
  get: function () {
    // 1. Global variable check.
    const apsGlobalStore = getApsPrebidGlobal();
    if (
      apsGlobalStore &&
      (typeof apsGlobalStore.canaryRate === 'number' ||
        typeof apsGlobalStore.canaryRate === 'string')
    ) {
      const validRate = validateRate(apsGlobalStore.canaryRate, 'GlobalNaN', 'GlobalRange');
      if (validRate !== null) {
        return validRate;
      }
    }
    // 2. localStorage configuration check.
    const storedConfigObj = getStoredConfig();
    if (
      storedConfigObj &&
      (typeof storedConfigObj.canaryRate === 'number' ||
        typeof storedConfigObj.canaryRate === 'string')
    ) {
      const validRate = validateRate(storedConfigObj.canaryRate, 'StoredNaN', 'StoreRange');
      if (validRate !== null) {
        return validRate;
      }
    }
    // 3. Publisher configuration check.
    const publisherConfig = config.getConfig('canaryRate');
    if (
      typeof publisherConfig === 'number' ||
      typeof publisherConfig === 'string'
    ) {
      const validRate = validateRate(publisherConfig, 'ConfigNaN', 'ConfigRange');
      if (validRate !== null) {
        return validRate;
      }
    }
    // 4. Fallback to default 2%.
    return 2 / 100;
  },
};

/**
 * Determines the appropriate prebid role based on remote configuration and current roles.
 *
 * If prebid has no role assigned, instructedRole is used.
 * If prebid is currently 'primary' and instructedRole is 'canary', then webclient's role is checked.
 *
 * @return {string} The role that should be used.
 */
function determineRole() {
  const currentRole = assumedRole.get();
  const newRole = instructedRole.get();

  if (!currentRole) {
    return newRole;
  }

  if (currentRole === 'primary' && newRole === 'canary') {
    if (assumedRole.get('webclient') === 'primary') {
      return 'canary';
    }
    return 'primary';
  }

  return newRole;
}

/**
 * Determines if the request should fire based on the role.
 * 'primary' always fires, while 'canary' fires based on a random roll.
 *
 * @param {string} role - The role to evaluate.
 * @return {boolean} True if the request should fire, false otherwise.
 */
function shouldFireRequest(role) {
  if (role === 'primary') {
    return true;
  }
  if (role === 'canary') {
    const rate = canaryRate.get();
    return Math.random() < rate;
  }
  return false;
}

export const converter = ortbConverter({
  context: {
    netRevenue: true,
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    // Remove precise geo locations for privacy.
    if (request?.device?.geo) {
      delete request.device.geo.lat;
      delete request.device.geo.lon;
    }

    if (request?.user) {
      // Remove sensitive user data.
      delete request.user.gender;
      delete request.user.yob;
      // Remove both 'keywords' and alternate 'kwarry' if present.
      delete request.user.keywords;
      delete request.user.kwarry;
      delete request.user.customdata;
      delete request.user.geo;
      delete request.user.data;
    }

    request.ext = request.ext ?? {};
    request.ext.account = config.getConfig('accountID');
    request.cur = request.cur ?? ['USD'];

    (request.imp ?? []).forEach((imp) => {
      if (!imp || !imp.banner) {
        return;
      }

      const doesHWExist = imp.banner.w >= 0 && imp.banner.h >= 0;
      const doesFormatExist = (imp.banner.format ?? []).length > 0;
      if (!doesHWExist && doesFormatExist) {
        const { w, h } = imp.banner.format[0];
        imp.banner.w = w;
        imp.banner.h = h;
      }
    });

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    return buildBidResponse(bid, context);
  },
});

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Validates the bid request.
   * Records a reference pixel if it hasn't been fired yet,
   * determines the role, updates the global state, and checks if the request should fire.
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    if (!hasReferencePixelFired) {
      // Fire the reference pixel event with a 1/100 sampling rate.
      if (Math.random() < 0.01) {
        record('prebidAdapter/bidRefPixel/fire', { error: ADAPTER_VERSION });
      }
      hasReferencePixelFired = true;
    }

    const role = determineRole();
    assumedRole.set('prebid', role);
    return shouldFireRequest(role);
  },

  /**
   * Constructs the server request for the bidder.
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    let endpoint = config.getConfig('debugURL') ?? AAX_ENDPOINT;
    // Append debug parameters to the URL if debug mode is enabled.
    if (config.getConfig('debug')) {
      const debugQueryChar = endpoint.includes('?') ? '&' : '?';
      const renderMethod = config.getConfig('renderMethod');
      if (renderMethod === 'fif') {
        endpoint += debugQueryChar + 'amzn_debug_mode=fif&amzn_debug_mode=1';
      } else {
        endpoint += debugQueryChar + 'amzn_debug_mode=1';
      }
    }
    return {
      method: 'POST',
      url: endpoint,
      data: converter.toORTB({ bidRequests, bidderRequest }),
      options: {
        contentType: 'application/json',
      },
    };
  },

  onBidderError: ({ error, bidderRequest }) => {
    // Record bidder error with standardized event format.
    record('prebidAdapter/bid/didFail', { error: error });
  },

  onTimeout: (timeout) => {
    // Record timeout event with a didTimeout action.
    record('prebidAdapter/bid/didTimeout', { error: timeout });
  },

  /**
   * Interprets the response from the server.
   * Constructs a creative script to render the ad using a prebid creative JS.
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[] | {bids: Bid[], fledgeAuctionConfigs: object[]}}
   */
  interpretResponse: (response, request) => {
    const interpretedResponse = converter.fromORTB({
      response: response.body,
      request: request.data,
    });
    const accountID = config.getConfig('accountID');

    const creativeUrl =
      config.getConfig('creativeURL') || DEFAULT_PREBID_CREATIVE_JS_URL;

    interpretedResponse.bids.forEach((bid) => {
      // Remove any previous ad markup.
      delete bid.ad;
      // Create ad markup using a trimmed template literal to avoid extra whitespace.
      bid.ad = (
`<script src="${creativeUrl}"></script>
<script>
  const accountID = '${accountID}';
  window._aps = window._aps || new Map();
  if (!window._aps.has(accountID)) {
    window._aps.set(accountID, { queue: [], store: new Map([['listeners', new Map()]]) });
  }
  window._aps.get(accountID).queue.push(
    new CustomEvent('prebid/creative/render', {
      detail: {
        aaxResponse: '${btoa(JSON.stringify(response.body))}',
        seatBidId: ${JSON.stringify(bid.seatBidId)}
      }
    })
  );
</script>`).trim();
    });

    return interpretedResponse.bids;
  },
};

addCustomAnalytics(spec);

registerBidder(spec);
