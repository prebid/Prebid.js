import { logWarn, logError, deepSetValue, deepAccess, safeJSONEncode } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js'
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getStorageManager } from '../src/storageManager.js';
import { ajax } from '../src/ajax.js';

const BIDDER_CODE = 'performax';
const BIDDER_SHORT_CODE = 'px';
const GVLID = 732
const ENDPOINT = 'https://dale.performax.cz/ortb'
const USER_SYNC_URL = 'https://cdn.performax.cz/px2/cookie_sync_bundle.html';
const USER_SYNC_ORIGIN = 'https://cdn.performax.cz';
const UIDS_STORAGE_KEY = BIDDER_SHORT_CODE + '_uids';
const LOG_EVENT_URL = 'https://chip.performax.cz/error';
const LOG_EVENT_SAMPLE_RATE = 1;
const LOG_EVENT_TYPE_BIDDER_ERROR = 'bidderError';
const LOG_EVENT_TYPE_INTERVENTION = 'intervention';
const LOG_EVENT_TYPE_TIMEOUT = 'timeout';

let isUserSyncsInit = false;

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

/**
 * Sends diagnostic events.
 * @param {string} type - The category of the event
 * @param {Object|Array|string} payload - The data to be logged
 * @param {number} [sampleRate=LOG_EVENT_SAMPLE_RATE] - The probability of logging the event
 * @returns {void}
 */
function logEvent(type, payload, sampleRate = LOG_EVENT_SAMPLE_RATE) {
  if (sampleRate <= Math.random()) {
    return;
  }

  const data = { type, payload };
  const options = { method: 'POST', withCredentials: true, contentType: 'application/json' };

  ajax(LOG_EVENT_URL, undefined, safeJSONEncode(data), options);
}

/**
 * Serializes and stores data.
 * @param {string} key - The unique identifier
 * @param {any} value - The data to store
 * @returns {void}
 */
export function storeData(key, value) {
  if (!storage.localStorageIsEnabled()) {
    logWarn('Local Storage is not enabled');
    return;
  }

  try {
    storage.setDataInLocalStorage(key, JSON.stringify(value));
  } catch (err) {
    logError('Failed to store data: ', err);
  }
}

/**
 * Retrieves and parses data.
 * @param {string} key - The unique identifier
 * @param {any} defaultValue - The value to return if the key is missing or parsing fails.
 * @returns {any} The parsed data
 */
export function readData(key, defaultValue) {
  if (!storage.localStorageIsEnabled()) {
    logWarn('Local Storage is not enabled');
    return defaultValue;
  }

  let rawData = storage.getDataFromLocalStorage(key);

  if (rawData === null) {
    return defaultValue;
  }

  try {
    return JSON.parse(rawData) || {};
  } catch (err) {
    logError(`Error parsing data for key "${key}": `, err);
    return defaultValue;
  }
}

export function resetUserSyncsInit() {
  isUserSyncsInit = false;
}

export const converter = ortbConverter({

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'tagid', bidRequest.params.tagid);
    return imp;
  },

  bidResponse(buildBidResponse, bid, context) {
    context.netRevenue = deepAccess(bid, 'netRevenue');
    context.mediaType = deepAccess(bid, 'mediaType');
    context.currency = deepAccess(bid, 'currency');

    return buildBidResponse(bid, context)
  },

  context: {
    ttl: 360,
  }
})

export const spec = {
  code: BIDDER_CODE,
  aliases: [BIDDER_SHORT_CODE],
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!bid.params.tagid;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const data = converter.toORTB({bidderRequest, bidRequests})

    const uids = readData(UIDS_STORAGE_KEY, {});
    if (Object.keys(uids).length > 0) {
      deepSetValue(data, 'user.ext.uids', uids);
    }

    return [{
      method: 'POST',
      url: ENDPOINT,
      options: {'contentType': 'application/json'},
      data: data
    }]
  },

  interpretResponse: function (bidderResponse, request) {
    if (!bidderResponse.body) return [];
    const response = bidderResponse.body
    const data = {

      seatbid: response.seatbid.map(seatbid => ({
        seat: seatbid.seat,
        bid: seatbid.bid.map(bid => ({
          impid: bid.imp_id,
          w: bid.w,
          h: bid.h,
          requestId: request.data.id,
          price: bid.price,
          currency: response.cur,
          adm: bid.adm,
          crid: bid.id,
          netRevenue: true,
          mediaType: BANNER,
        }))
      }))
    };
    return converter.fromORTB({ response: data, request: request.data }).bids
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    const syncs = [];

    if (!syncOptions.iframeEnabled) {
      logWarn('Please enable iframe based user sync.');
      return syncs;
    }

    let url = USER_SYNC_URL;

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        url += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        url += `?gdpr_consent=${gdprConsent.consentString}`;
      }
    }

    syncs.push({
      type: 'iframe',
      url: url
    });

    if (!isUserSyncsInit) {
      window.addEventListener('message', function (event) {
        if (!event.data || event.origin !== USER_SYNC_ORIGIN || !event.data.flexo_sync_cookie) {
          return;
        }

        const { uid, vendor } = event.data.flexo_sync_cookie;

        if (!uid || !vendor) {
          return;
        }

        const uids = readData(UIDS_STORAGE_KEY, {});
        uids[vendor] = uid;
        storeData(UIDS_STORAGE_KEY, uids);
      });
      isUserSyncsInit = true;
    }

    return syncs;
  },
  onTimeout: function(timeoutData) {
    logEvent(LOG_EVENT_TYPE_TIMEOUT, timeoutData);
  },
  onBidderError: function({ bidderRequest }) {
    logEvent(LOG_EVENT_TYPE_BIDDER_ERROR, bidderRequest);
  },
  onIntervention: function({ bid }) {
    logEvent(LOG_EVENT_TYPE_INTERVENTION, bid);
  }
}

registerBidder(spec);
