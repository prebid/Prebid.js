import { logInfo, logError, isNumber, isStr, isEmpty } from '../src/utils.js';
import { registerVideoSupport } from '../src/adServerManager.js';
import { targeting } from '../src/targeting.js';
import { config } from '../src/config.js';
import { ajaxBuilder } from '../src/ajax.js';
import { getPriceBucketString } from '../src/cpmBucketManager.js';
import { getPriceByGranularity } from '../src/auction.js';
import { auctionManager } from '../src/auctionManager.js';

const SERVER_PROTOCOL = 'https';
const SERVER_HOST = 'p.konduit.me';

const KONDUIT_PREBID_MODULE_VERSION = '1.0.0';
const MODULE_NAME = 'Konduit';

const KONDUIT_ID_CONFIG = 'konduit.konduitId';
const SEND_ALL_BIDS_CONFIG = 'enableSendAllBids';

export const errorMessages = {
  NO_KONDUIT_ID: 'A konduitId param is required to be in configs',
  NO_BIDS: 'No bids received in the auction',
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

function _logInfo() {
  logInfo(...addLogLabel(arguments));
}

function _logError() {
  logError(...addLogLabel(arguments));
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

function composeBidsProcessorRequestPayload(bid) {
  return {
    auctionId: bid.auctionId,
    vastUrl: bid.vastUrl,
    bidderCode: bid.bidderCode,
    creativeId: bid.creativeId,
    adUnitCode: bid.adUnitCode,
    cpm: bid.cpm,
    currency: bid.currency,
  };
}

function setDefaultKCpmToBid(bid, winnerBid, priceGranularity) {
  bid.kCpm = bid.cpm;

  if (!bid.adserverTargeting) {
    bid.adserverTargeting = {};
  }

  const kCpm = getPriceByGranularity(priceGranularity)(bid);

  if (config.getConfig(SEND_ALL_BIDS_CONFIG)) {
    bid.adserverTargeting[`k_cpm_${bid.bidderCode}`] = kCpm;
  }

  if ((winnerBid.bidderCode === bid.bidderCode) && (winnerBid.creativeId === bid.creativeId)) {
    bid.adserverTargeting.k_cpm = kCpm;
  }
}

function addKCpmToBid(kCpm, bid, winnerBid, priceGranularity) {
  if (isNumber(kCpm)) {
    bid.kCpm = kCpm;
    const priceStringsObj = getPriceBucketString(
      kCpm,
      config.getConfig('customPriceBucket'),
      config.getConfig('currency.granularityMultiplier')
    );

    const calculatedKCpm = priceStringsObj.custom || priceStringsObj[priceGranularity] || priceStringsObj.med;

    if (config.getConfig(SEND_ALL_BIDS_CONFIG)) {
      bid.adserverTargeting[`k_cpm_${bid.bidderCode}`] = calculatedKCpm;
    }

    if ((winnerBid.bidderCode === bid.bidderCode) && (winnerBid.creativeId === bid.creativeId)) {
      bid.adserverTargeting.k_cpm = calculatedKCpm;
    }
  }
}

function addKonduitCacheKeyToBid(cacheKey, bid, winnerBid) {
  if (isStr(cacheKey)) {
    bid.konduitCacheKey = cacheKey;

    if (config.getConfig(SEND_ALL_BIDS_CONFIG)) {
      bid.adserverTargeting[`k_cache_key_${bid.bidderCode}`] = cacheKey;
    }

    if ((winnerBid.bidderCode === bid.bidderCode) && (winnerBid.creativeId === bid.creativeId)) {
      bid.adserverTargeting.k_cache_key = cacheKey;
      bid.adserverTargeting.konduit_cache_key = cacheKey;
    }
  }
}

/**
 * This function accepts an object with bid and tries to cache it while generating k_cache_key for it.
 * In addition, it returns a list with updated bid objects where k_cpm key is added
 * @param {Object} options
 * @param {Object} [options.bid] - a winner bid provided by a client
 * @param {Object} [options.bids] - bids array provided by a client for "Send All Bids" scenario
 * @param {string} [options.adUnitCode] - ad unit code that is used to get winning bids
 * @param {string} [options.timeout] - timeout for Konduit bids processor HTTP request
 * @param {function} [options.callback] - callback function to be executed on HTTP request end; the function is invoked with two parameters - error and bids
 */
export function processBids(options = {}) {
  const konduitId = config.getConfig(KONDUIT_ID_CONFIG);
  options = options || {};

  if (!konduitId) {
    _logError(errorMessages.NO_KONDUIT_ID);

    if (options.callback) {
      options.callback(new Error(errorMessages.NO_KONDUIT_ID), []);
    }

    return null;
  }

  const publisherBids = options.bids || auctionManager.getBidsReceived();

  const winnerBid = options.bid || targeting.getWinningBids(options.adUnitCode, publisherBids)[0];
  const bids = [];

  if (config.getConfig(SEND_ALL_BIDS_CONFIG)) {
    bids.push(...publisherBids);
  } else if (winnerBid) {
    bids.push(winnerBid);
  }

  if (!bids.length) {
    _logError(errorMessages.NO_BIDS);

    if (options.callback) {
      options.callback(new Error(errorMessages.NO_BIDS), []);
    }

    return null;
  }

  const priceGranularity = config.getConfig('priceGranularity');

  const bidsToProcess = [];

  bids.forEach((bid) => {
    setDefaultKCpmToBid(bid, winnerBid, priceGranularity);
    bidsToProcess.push(composeBidsProcessorRequestPayload(bid));
  });

  sendRequest({
    method: 'POST',
    path: '/api/bidsProcessor',
    timeout: options.timeout || 1000,
    payload: {
      clientId: konduitId,
      konduitPrebidModuleVersion: KONDUIT_PREBID_MODULE_VERSION,
      enableSendAllBids: config.getConfig(SEND_ALL_BIDS_CONFIG),
      bids: bidsToProcess,
      bidResponsesCount: auctionManager.getBidsReceived().length,
    },
    callbacks: {
      success: (data) => {
        let error = null;
        _logInfo('Bids processed successfully ', data);
        try {
          const { kCpmData, cacheData } = JSON.parse(data);

          if (isEmpty(cacheData)) {
            throw new Error(errorMessages.CACHE_FAILURE);
          }

          winnerBid.adserverTargeting.konduit_id = konduitId;
          winnerBid.adserverTargeting.k_id = konduitId;

          bids.forEach((bid) => {
            const processedBidKey = `${bid.bidderCode}:${bid.creativeId}`;
            addKCpmToBid(kCpmData[processedBidKey], bid, winnerBid, priceGranularity);
            addKonduitCacheKeyToBid(cacheData[processedBidKey], bid, winnerBid);
          })
        } catch (err) {
          error = err;
          _logError('Error parsing JSON response for bidsProcessor data: ', err)
        }

        if (options.callback) {
          options.callback(error, bids);
        }
      },
      error: (error) => {
        _logError('Bids were not processed successfully ', error);
        if (options.callback) {
          options.callback(isStr(error) ? new Error(error) : error, bids);
        }
      }
    }
  });
}

registerVideoSupport('konduit', {
  processBids: processBids,
});
