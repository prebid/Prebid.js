import { isStr, isNumber, logWarn, logError } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 */

const GVLID = 793;
const ADAPTER_VERSION = '2.0.0';
const BIDDER_CODE = 'aps';
const AAX_ENDPOINT = 'https://web.ads.aps.amazon-adsystem.com/e/pb/bid';
const DEFAULT_PREBID_CREATIVE_JS_URL =
  'https://client.aps.amazon-adsystem.com/prebid-creative.js';

/**
 * Records an event by pushing a CustomEvent onto a global queue.
 * Creates an account-specific store on window._aps if needed.
 * Automatically prefixes eventName with 'prebidAdapter/' if not already prefixed.
 * Automatically appends '/didTrigger' if there is no third part provided in the event name.
 *
 * @param {string} eventName - The name of the event to record
 * @param {object} data - Event data object, typically containing an 'error' property
 */
function record(eventName, data) {
  // Check if telemetry is enabled
  if (config.readConfig('aps.telemetry') === false) {
    return;
  }

  // Automatically prefix eventName with 'prebidAdapter/' if not already prefixed
  const prefixedEventName = eventName.startsWith('prebidAdapter/')
    ? eventName
    : `prebidAdapter/${eventName}`;

  // Automatically append 'didTrigger' if there is no third part provided in the event name
  const parts = prefixedEventName.split('/');
  const finalEventName =
    parts.length < 3 ? `${prefixedEventName}/didTrigger` : prefixedEventName;

  const accountID = config.readConfig('aps.accountID');
  if (!accountID) {
    return;
  }

  window._aps = window._aps || new Map();
  if (!window._aps.has(accountID)) {
    window._aps.set(accountID, {
      queue: [],
      store: new Map(),
    });
  }

  // Ensure analytics key exists unless error key is present
  const detailData = { ...data };
  if (!detailData.error) {
    detailData.analytics = detailData.analytics || {};
  }

  window._aps.get(accountID).queue.push(
    new CustomEvent(finalEventName, {
      detail: {
        ...detailData,
        source: 'prebid-adapter',
        libraryVersion: ADAPTER_VERSION,
      },
    })
  );
}

/**
 * Validates whether a given account ID is valid.
 *
 * @param {string|number} accountID - The account ID to validate
 * @returns {boolean} Returns true if the account ID is valid, false otherwise
 */
function isValidAccountID(accountID) {
  // null/undefined are not acceptable
  if (accountID == null) {
    return false;
  }

  // Numbers are valid (including 0)
  if (isNumber(accountID)) {
    return true;
  }

  // Strings must have content after trimming
  if (isStr(accountID)) {
    return accountID.trim().length > 0;
  }

  // Other types are invalid
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

    if (request.user) {
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
    request.ext.account = config.readConfig('aps.accountID');
    request.cur = request.cur ?? ['USD'];

    // Validate and process impressions - fail fast on structural issues
    if (!request.imp || !Array.isArray(request.imp)) {
      throw new Error('Request must contain a valid impressions array');
    }

    request.imp.forEach((imp, index) => {
      if (!imp) {
        throw new Error(`Impression at index ${index} is null or undefined`);
      }

      if (!imp.banner) {
        return;
      }

      const doesHWExist = imp.banner.w >= 0 && imp.banner.h >= 0;
      const doesFormatExist =
        Array.isArray(imp.banner.format) && imp.banner.format.length > 0;

      if (!doesHWExist && doesFormatExist) {
        const { w, h } = imp.banner.format[0];
        if (typeof w !== 'number' || typeof h !== 'number') {
          throw new Error(
            `Invalid banner format dimensions at impression ${index}: w=${w}, h=${h}`
          );
        }
        imp.banner.w = w;
        imp.banner.h = h;
      }
    });

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    let vastUrl;
    if (bid.mtype === 2) {
      vastUrl = bid.adm;
      // Making sure no adm value is passed down to prevent issues with some renderers
      delete bid.adm;
    }

    const bidResponse = buildBidResponse(bid, context);
    if (bidResponse.mediaType === VIDEO) {
      bidResponse.vastUrl = vastUrl;
    }

    return bidResponse;
  },
});

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Validates the bid request.
   * Always fires 100% of requests when account ID is valid.
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    record('isBidRequestValid');
    try {
      const accountID = config.readConfig('aps.accountID');
      if (!isValidAccountID(accountID)) {
        logWarn(`Invalid accountID: ${accountID}`);
        return false;
      }
      return true;
    } catch (err) {
      record('isBidRequestValid/didError', { error: err });
      logError('Error while validating bid request', err);
    }
  },

  /**
   * Constructs the server request for the bidder.
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    record('buildRequests');
    try {
      let endpoint = config.readConfig('aps.debugURL') ?? AAX_ENDPOINT;
      // Append debug parameters to the URL if debug mode is enabled.
      if (config.readConfig('aps.debug')) {
        const debugQueryChar = endpoint.includes('?') ? '&' : '?';
        const renderMethod = config.readConfig('aps.renderMethod');
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
    } catch (err) {
      record('buildRequests/didError', { error: err });
      logError('Error while building bid request', err);
    }
  },

  /**
   * Interprets the response from the server.
   * Constructs a creative script to render the ad using a prebid creative JS.
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[] | {bids: Bid[]}}
   */
  interpretResponse: (response, request) => {
    record('interpretResponse');
    try {
      const interpretedResponse = converter.fromORTB({
        response: response.body,
        request: request.data,
      });
      const accountID = config.readConfig('aps.accountID');

      const creativeUrl =
        config.readConfig('aps.creativeURL') || DEFAULT_PREBID_CREATIVE_JS_URL;

      interpretedResponse.bids.forEach((bid) => {
        if (bid.mediaType !== VIDEO) {
          delete bid.ad;
          bid.ad = `<script src="${creativeUrl}"></script>
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
</script>`.trim();
        }
      });

      return interpretedResponse.bids;
    } catch (err) {
      record('interpretResponse/didError', { error: err });
      logError('Error while interpreting bid response', err);
    }
  },

  /**
   * Register user syncs to be processed during the shared user ID sync activity
   *
   * @param {Object} syncOptions - Options for user synchronization
   * @param {Array} serverResponses - Array of bid responses
   * @param {Object} gdprConsent - GDPR consent information
   * @param {Object} uspConsent - USP consent information
   * @returns {Array} Array of user sync objects
   */
  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {
    record('getUserSyncs');
    try {
      const userSyncs = serverResponses.flatMap(
        (res) => res?.body?.ext?.userSyncs ?? []
      );
      return userSyncs.filter(
        (s) =>
          (s.type === 'iframe' && syncOptions.iframeEnabled) ||
          (s.type === 'image' && syncOptions.pixelEnabled)
      );
    } catch (err) {
      record('getUserSyncs/didError', { error: err });
      logError('Error while getting user syncs', err);
    }
  },

  onTimeout: (timeoutData) => {
    record('onTimeout', { error: timeoutData });
  },

  onSetTargeting: (bid) => {
    record('onSetTargeting');
  },

  onAdRenderSucceeded: (bid) => {
    record('onAdRenderSucceeded');
  },

  onBidderError: (error) => {
    record('onBidderError', { error });
  },

  onBidWon: (bid) => {
    record('onBidWon');
  },

  onBidAttribute: (bid) => {
    record('onBidAttribute');
  },

  onBidBillable: (bid) => {
    record('onBidBillable');
  },
};

registerBidder(spec);
