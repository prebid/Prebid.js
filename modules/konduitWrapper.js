import { registerVideoSupport } from '../src/adServerManager.js';
import { targeting } from '../src/targeting.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { ajaxBuilder } from '../src/ajax.js';
import { getPriceBucketString } from '../src/cpmBucketManager.js';
import { getPriceByGranularity } from '../src/auction.js';

const SERVER_PROTOCOL = 'https';
const SERVER_HOST = 'p.konduit.me';

const MODULE_NAME = 'Konduit';

const KONDUIT_ID_CONFIG = 'konduit.konduitId';

export const errorMessages = {
  NO_KONDUIT_ID: 'A konduitId param is required to be in configs',
  NO_BID: 'A bid was not found',
  CACHE_FAILURE: 'A bid was not cached',
};

// This function is copy from prebid core
function formatQS(query) {
  return Object
    .keys(query)
    .map(k => Array.isArray(query[k])
      ? query[k].map(v => `${k}[]=${v}`).join('&')
      : `${k}=${query[k]}`)
    .join('&');
}

// This function is copy from prebid core
function buildUrl(obj) {
  return (obj.protocol || 'http') + '://' +
    (obj.host ||
      obj.hostname + (obj.port ? `:${obj.port}` : '')) +
    (obj.pathname || '') +
    (obj.search ? `?${formatQS(obj.search || '')}` : '') +
    (obj.hash ? `#${obj.hash}` : '');
}

function addLogLabel(args) {
  args = [].slice.call(args);
  args.unshift(`${MODULE_NAME}: `);
  return args;
}

function logInfo() {
  utils.logInfo(...addLogLabel(arguments));
}

function logError() {
  utils.logError(...addLogLabel(arguments));
}

function sendRequest ({ host = SERVER_HOST, protocol = SERVER_PROTOCOL, method = 'GET', path, payload, callbacks, timeout }) {
  const formattedUrlOptions = {
    protocol: protocol,
    hostname: host,
    pathname: path,
  };
  if (method === 'GET') {
    formattedUrlOptions.search = payload;
  }

  let konduitAnalyticsRequestUrl = buildUrl(formattedUrlOptions);
  const ajax = ajaxBuilder(timeout);

  ajax(
    konduitAnalyticsRequestUrl,
    callbacks,
    method === 'POST' ? JSON.stringify(payload) : null,
    {
      contentType: 'application/json',
      method,
      withCredentials: true
    }
  );
}

/**
 * This function accepts an object with bid and tries to cache it while generating konduit_cache_key for it.
 * In addition, it returns a list with updated bid objects where k_cpm key is added
 * @param {Object} options
 * @param {Object} [options.bid] - winner bid from publisher
 * @param {string} [options.adUnitCode] - to look for winner bid
 * @param {string} [options.timeout] - timeout for bidsProcessor request
 * @param {function} [options.callback] - callback will be called in the end of the request
 */
export function processBids(options = {}) {
  const konduitId = config.getConfig(KONDUIT_ID_CONFIG);
  options = options || {};

  if (!konduitId) {
    logError(errorMessages.NO_KONDUIT_ID);

    if (options.callback) {
      options.callback(new Error(errorMessages.NO_KONDUIT_ID));
    }

    return null;
  }

  const bid = options.bid || targeting.getWinningBids(options.adUnitCode)[0];

  if (!bid) {
    logError(errorMessages.NO_BID);

    if (options.callback) {
      options.callback(new Error(errorMessages.NO_BID));
    }

    return null;
  }

  const priceGranularity = config.getConfig('priceGranularity');

  bid.kCpm = bid.cpm;

  if (!bid.adserverTargeting) {
    bid.adserverTargeting = {};
  }

  bid.adserverTargeting.k_cpm = getPriceByGranularity(priceGranularity)(bid);

  const bidsToProcess = [{
    auctionId: bid.auctionId,
    vastUrl: bid.vastUrl,
    bidderCode: bid.bidderCode,
    creativeId: bid.creativeId,
    adUnitCode: bid.adUnitCode,
    cpm: bid.cpm,
    currency: bid.currency,
  }];

  sendRequest({
    method: 'POST',
    path: '/api/bidsProcessor',
    timeout: options.timeout || 1000,
    payload: {
      clientId: konduitId,
      bids: bidsToProcess,
    },
    callbacks: {
      success: (data) => {
        let error = null;
        logInfo('Bids processed successfully ', data);
        try {
          const { kCpmData, cacheData } = JSON.parse(data);
          const processedBidKey = `${bid.bidderCode}:${bid.creativeId}`;

          if (!utils.isEmpty(cacheData)) {
            bid.adserverTargeting.konduit_id = konduitId;
          } else {
            error = new Error(errorMessages.CACHE_FAILURE);
          }

          if (utils.isNumber(kCpmData[processedBidKey])) {
            bid.kCpm = kCpmData[processedBidKey];
            const priceStringsObj = getPriceBucketString(
              bid.kCpm,
              config.getConfig('customPriceBucket'),
              config.getConfig('currency.granularityMultiplier')
            );
            bid.adserverTargeting.k_cpm = priceStringsObj.custom || priceStringsObj[priceGranularity] || priceStringsObj.med;
          }

          if (utils.isStr(cacheData[processedBidKey])) {
            bid.konduitCacheKey = cacheData[processedBidKey];
            bid.adserverTargeting.konduit_cache_key = cacheData[processedBidKey];
          }
        } catch (err) {
          error = err;
          logError('Error parsing JSON response for bidsProcessor data: ', err)
        }

        if (options.callback) {
          options.callback(error, [bid]);
        }
      },
      error: (error) => {
        logError('Bid was not processed successfully ', error);
        if (options.callback) {
          options.callback(utils.isStr(error) ? new Error(error) : error, [bid]);
        }
      }
    }
  });
}

registerVideoSupport('konduit', {
  processBids: processBids,
});
