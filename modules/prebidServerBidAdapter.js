import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS, S2S } from 'src/constants';
import { cookieSet } from 'src/cookie.js';
import adaptermanager from 'src/adaptermanager';
import { config } from 'src/config';
import { VIDEO } from 'src/mediaTypes';
import { isValid } from 'src/adapters/bidderFactory';
import includes from 'core-js/library/fn/array/includes';

const getConfig = config.getConfig;

const TYPE = S2S.SRC;
let _synced = false;
const DEFAULT_S2S_TTL = 60;
const DEFAULT_S2S_CURRENCY = 'USD';
const DEFAULT_S2S_NETREVENUE = true;

let _s2sConfig;
config.setDefaults({
  's2sConfig': {
    enabled: false,
    timeout: 1000,
    maxBids: 1,
    adapter: 'prebidServer'
  }
});

/**
 * Set config for server to server header bidding
 * @typedef {Object} options - required
 * @property {boolean} enabled enables S2S bidding
 * @property {string[]} bidders bidders to request S2S
 * @property {string} endpoint endpoint to contact
 *  === optional params below ===
 * @property {number} [timeout] timeout for S2S bidders - should be lower than `pbjs.requestBids({timeout})`
 * @property {boolean} [cacheMarkup] whether to cache the adm result
 * @property {string} [adapter] adapter code to use for S2S
 * @property {string} [syncEndpoint] endpoint URL for syncing cookies
 * @property {string} [cookieSetUrl] url for cookie set library, if passed then cookieSet is enabled
 */
function setS2sConfig(options) {
  let keys = Object.keys(options);

  if (['accountId', 'bidders', 'endpoint'].filter(key => {
    if (!includes(keys, key)) {
      utils.logError(key + ' missing in server to server config');
      return true;
    }
    return false;
  }).length > 0) {
    return;
  }

  _s2sConfig = options;
  if (options.syncEndpoint) {
    queueSync(options.bidders);
  }
}
getConfig('s2sConfig', ({s2sConfig}) => setS2sConfig(s2sConfig));

/**
 * @param  {Array} bidderCodes list of bidders to request user syncs for.
 */
function queueSync(bidderCodes) {
  if (_synced) {
    return;
  }
  _synced = true;
  const payload = JSON.stringify({
    uuid: utils.generateUUID(),
    bidders: bidderCodes
  });
  ajax(_s2sConfig.syncEndpoint, (response) => {
    try {
      response = JSON.parse(response);
      response.bidder_status.forEach(bidder => doBidderSync(bidder.usersync.type, bidder.usersync.url, bidder.bidder));
    } catch (e) {
      utils.logError(e);
    }
  },
  payload, {
    contentType: 'text/plain',
    withCredentials: true
  });
}

/**
 * Run a cookie sync for the given type, url, and bidder
 *
 * @param {string} type the type of sync, "image", "redirect", "iframe"
 * @param {string} url the url to sync
 * @param {string} bidder name of bidder doing sync for
 */
function doBidderSync(type, url, bidder) {
  if (!url) {
    utils.logError(`No sync url for bidder "${bidder}": ${url}`);
  } else if (type === 'image' || type === 'redirect') {
    utils.logMessage(`Invoking image pixel user sync for bidder: "${bidder}"`);
    utils.triggerPixel(url);
  } else if (type == 'iframe') {
    utils.logMessage(`Invoking iframe user sync for bidder: "${bidder}"`);
    utils.insertUserSyncIframe(url);
  } else {
    utils.logError(`User sync type "${type}" not supported for bidder: "${bidder}"`);
  }
}

/**
 * Try to convert a value to a type.
 * If it can't be done, the value will be returned.
 *
 * @param {string} typeToConvert The target type. e.g. "string", "number", etc.
 * @param {*} value The value to be converted into typeToConvert.
 */
function tryConvertType(typeToConvert, value) {
  if (typeToConvert === 'string') {
    return value && value.toString();
  } else if (typeToConvert === 'number') {
    return Number(value);
  } else {
    return value;
  }
}

const tryConvertString = tryConvertType.bind(null, 'string');
const tryConvertNumber = tryConvertType.bind(null, 'number');

const paramTypes = {
  'appnexus': {
    'member': tryConvertString,
    'invCode': tryConvertString,
    'placementId': tryConvertNumber
  },
  'rubicon': {
    'accountId': tryConvertNumber,
    'siteId': tryConvertNumber,
    'zoneId': tryConvertNumber
  },
  'indexExchange': {
    'siteID': tryConvertNumber
  },
  'audienceNetwork': {
    'placementId': tryConvertString
  },
  'pubmatic': {
    'publisherId': tryConvertString,
    'adSlot': tryConvertString
  },
  'districtm': {
    'member': tryConvertString,
    'invCode': tryConvertString,
    'placementId': tryConvertNumber
  },
  'pulsepoint': {
    'cf': tryConvertString,
    'cp': tryConvertNumber,
    'ct': tryConvertNumber
  },
  'conversant': {
    'site_id': tryConvertString,
    'secure': tryConvertNumber,
    'mobile': tryConvertNumber
  },
};

function _getDigiTrustQueryParams() {
  function getDigiTrustId() {
    let digiTrustUser = window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser({member: 'T9QSFKPDN9'}));
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || null;
  }
  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return null;
  }
  return {
    id: digiTrustId.id,
    keyv: digiTrustId.keyv,
    pref: 0
  };
}

/**
 * Bidder adapter for Prebid Server
 */
export function PrebidServer() {
  let baseAdapter = new Adapter('prebidServer');

  function convertTypes(adUnits) {
    adUnits.forEach(adUnit => {
      adUnit.bids.forEach(bid => {
        const types = paramTypes[bid.bidder] || [];
        Object.keys(types).forEach(key => {
          if (bid.params[key]) {
            bid.params[key] = types[key](bid.params[key]);

            // don't send invalid values
            if (isNaN(bid.params[key])) {
              delete bid.params.key;
            }
          }
        });
      });
    });
  }

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(s2sBidRequest, bidRequests, addBidResponse, done, ajax) {
    const isDebug = !!getConfig('debug');
    const adUnits = utils.deepClone(s2sBidRequest.ad_units);
    adUnits.forEach(adUnit => {
      let videoMediaType = utils.deepAccess(adUnit, 'mediaTypes.video');
      if (videoMediaType) {
        // pbs expects a ad_unit.video attribute if the imp is video
        adUnit.video = Object.assign({}, videoMediaType);
        delete adUnit.mediaTypes;
        // default is assumed to be 'banner' so if there is a video type we assume video only until PBS can support multi format auction.
        adUnit.media_types = [VIDEO];
      }
    });
    convertTypes(adUnits);
    let requestJson = {
      account_id: _s2sConfig.accountId,
      tid: s2sBidRequest.tid,
      max_bids: _s2sConfig.maxBids,
      timeout_millis: _s2sConfig.timeout,
      secure: _s2sConfig.secure,
      cache_markup: _s2sConfig.cacheMarkup,
      url: utils.getTopWindowUrl(),
      prebid_version: '$prebid.version$',
      ad_units: adUnits.filter(hasSizes),
      is_debug: isDebug
    };

    let digiTrust = _getDigiTrustQueryParams();

    // grab some global config and pass it along
    ['app', 'device'].forEach(setting => {
      let value = getConfig(setting);
      if (typeof value === 'object') {
        requestJson[setting] = value;
      }
    });

    if (digiTrust) {
      requestJson.digiTrust = digiTrust;
    }

    // in case config.bidders contains invalid bidders, we only process those we sent requests for.
    const requestedBidders = requestJson.ad_units.map(adUnit => adUnit.bids.map(bid => bid.bidder).filter(utils.uniques)).reduce(utils.flatten).filter(utils.uniques);
    function processResponse(response) {
      handleResponse(response, requestedBidders, bidRequests, addBidResponse, done);
    }
    const payload = JSON.stringify(requestJson);
    ajax(_s2sConfig.endpoint, processResponse, payload, {
      contentType: 'text/plain',
      withCredentials: true
    });
  };

  // at this point ad units should have a size array either directly or mapped so filter for that
  function hasSizes(unit) {
    return unit.sizes && unit.sizes.length;
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response, requestedBidders, bidRequests, addBidResponse, done) {
    let result;
    try {
      result = JSON.parse(response);

      if (result.status === 'OK' || result.status === 'no_cookie') {
        if (result.bidder_status) {
          result.bidder_status.forEach(bidder => {
            if (bidder.no_cookie) {
              doBidderSync(bidder.usersync.type, bidder.usersync.url, bidder.bidder);
            }
          });
        }

        // do client-side syncs if available
        requestedBidders.forEach(bidder => {
          let clientAdapter = adaptermanager.getBidAdapter(bidder);
          if (clientAdapter && clientAdapter.registerSyncs) {
            clientAdapter.registerSyncs([]);
          }
        });

        if (result.bids) {
          result.bids.forEach(bidObj => {
            let bidRequest = utils.getBidRequest(bidObj.bid_id, bidRequests);
            let cpm = bidObj.price;
            let status;
            if (cpm !== 0) {
              status = STATUS.GOOD;
            } else {
              status = STATUS.NO_BID;
            }

            let bidObject = bidfactory.createBid(status, bidRequest);
            bidObject.source = TYPE;
            bidObject.creative_id = bidObj.creative_id;
            bidObject.bidderCode = bidObj.bidder;
            bidObject.cpm = cpm;
            if (bidObj.cache_id) {
              bidObject.cache_id = bidObj.cache_id;
            }
            if (bidObj.cache_url) {
              bidObject.cache_url = bidObj.cache_url;
            }
            // From ORTB see section 4.2.3: adm Optional means of conveying ad markup in case the bid wins; supersedes the win notice if markup is included in both.
            if (bidObj.media_type === VIDEO) {
              bidObject.mediaType = VIDEO;
              if (bidObj.adm) {
                bidObject.vastXml = bidObj.adm;
              }
              if (bidObj.nurl) {
                bidObject.vastUrl = bidObj.nurl;
              }
            } else {
              if (bidObj.adm && bidObj.nurl) {
                bidObject.ad = bidObj.adm;
                bidObject.ad += utils.createTrackPixelHtml(decodeURIComponent(bidObj.nurl));
              } else if (bidObj.adm) {
                bidObject.ad = bidObj.adm;
              } else if (bidObj.nurl) {
                bidObject.adUrl = bidObj.nurl
              }
            }

            bidObject.width = bidObj.width;
            bidObject.height = bidObj.height;
            bidObject.adserverTargeting = bidObj.ad_server_targeting;
            if (bidObj.deal_id) {
              bidObject.dealId = bidObj.deal_id;
            }
            bidObject.requestId = bidObj.bid_id;
            bidObject.creativeId = bidObj.creative_id;

            // TODO: Remove when prebid-server returns ttl, currency and netRevenue
            bidObject.ttl = (bidObj.ttl) ? bidObj.ttl : DEFAULT_S2S_TTL;
            bidObject.currency = (bidObj.currency) ? bidObj.currency : DEFAULT_S2S_CURRENCY;
            bidObject.netRevenue = (bidObj.netRevenue) ? bidObj.netRevenue : DEFAULT_S2S_NETREVENUE;

            if (isValid(bidObj.code, bidObject, bidRequests)) {
              addBidResponse(bidObj.code, bidObject);
            }
          });
        }
      }
      if (result.status === 'no_cookie' && typeof _s2sConfig.cookieSetUrl === 'string') {
        // cookie sync
        cookieSet(_s2sConfig.cookieSetUrl);
      }
    } catch (error) {
      utils.logError(error);
    }

    if (!result || (result.status && includes(result.status, 'Error'))) {
      utils.logError('error parsing response: ', result.status);
    }

    done();
  }

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type: TYPE
  });
}

adaptermanager.registerBidAdapter(new PrebidServer(), 'prebidServer');
