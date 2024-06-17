import Adapter from '../../src/adapter.js';
import {
  deepAccess,
  deepClone,
  flatten,
  generateUUID,
  getPrebidInternal,
  insertUserSyncIframe,
  isNumber,
  isPlainObject,
  isStr,
  logError,
  logInfo,
  logMessage,
  logWarn,
  triggerPixel,
  uniques,
} from '../../src/utils.js';
import { EVENTS, REJECTION_REASON, S2S } from '../../src/constants.js';
import adapterManager, {s2sActivityParams} from '../../src/adapterManager.js';
import {config} from '../../src/config.js';
import {addPaapiConfig, isValid} from '../../src/adapters/bidderFactory.js';
import * as events from '../../src/events.js';
import {includes} from '../../src/polyfill.js';
import {S2S_VENDORS} from './config.js';
import {ajax} from '../../src/ajax.js';
import {hook} from '../../src/hook.js';
import {hasPurpose1Consent} from '../../src/utils/gpdr.js';
import {buildPBSRequest, interpretPBSResponse} from './ortbConverter.js';
import {useMetrics} from '../../src/utils/perfMetrics.js';
import {isActivityAllowed} from '../../src/activities/rules.js';
import {ACTIVITY_TRANSMIT_UFPD} from '../../src/activities/activities.js';

const getConfig = config.getConfig;

const TYPE = S2S.SRC;
let _syncCount = 0;
let _s2sConfigs;

let eidPermissions;

/**
 * @typedef {Object} AdapterOptions
 * @summary s2sConfig parameter that adds arguments to resulting OpenRTB payload that goes to Prebid Server
 * @property {string} adapter
 * @property {boolean} enabled
 * @property {string} endpoint
 * @property {string} syncEndpoint
 * @property {number} timeout
 * @example
 * // example of multiple bidder configuration
 * pbjs.setConfig({
 *    s2sConfig: {
 *       adapterOptions: {
 *          rubicon: {singleRequest: false}
 *          appnexus: {key: "value"}
 *       }
 *    }
 * });
 */

/**
 * @typedef {Object} S2SDefaultConfig
 * @summary Base config properties for server to server header bidding
 * @property {string} [adapter='prebidServer'] adapter code to use for S2S
 * @property {boolean} [allowUnknownBidderCodes=false] allow bids from bidders that were not explicitly requested
 * @property {boolean} [enabled=false] enables S2S bidding
 * @property {number} [timeout=1000] timeout for S2S bidders - should be lower than `pbjs.requestBids({timeout})`
 * @property {number} [syncTimeout=1000] timeout for cookie sync iframe / image rendering
 * @property {number} [maxBids=1]
 * @property {AdapterOptions} [adapterOptions] adds arguments to resulting OpenRTB payload to Prebid Server
 * @property {Object} [syncUrlModifier]
 */

/**
 * @typedef {S2SDefaultConfig} S2SConfig
 * @summary Configuration for server to server header bidding
 * @property {string[]} bidders bidders to request S2S
 * @property {string} endpoint endpoint to contact
 * @property {string} [defaultVendor] used as key to select the bidder's default config from ßprebidServer/config.js
 * @property {boolean} [cacheMarkup] whether to cache the adm result
 * @property {string} [syncEndpoint] endpoint URL for syncing cookies
 * @property {Object} [extPrebid] properties will be merged into request.ext.prebid
 * @property {Object} [ortbNative] base value for imp.native.request
 */

/**
 * @type {S2SDefaultConfig}
 */
export const s2sDefaultConfig = {
  bidders: Object.freeze([]),
  timeout: 1000,
  syncTimeout: 1000,
  maxBids: 1,
  adapter: 'prebidServer',
  allowUnknownBidderCodes: false,
  adapterOptions: {},
  syncUrlModifier: {},
  ortbNative: {
    eventtrackers: [
      {event: 1, methods: [1, 2]}
    ],
  }
};

config.setDefaults({
  's2sConfig': s2sDefaultConfig
});

/**
 * @param {S2SConfig} option
 * @return {boolean}
 */
function updateConfigDefaultVendor(option) {
  if (option.defaultVendor) {
    let vendor = option.defaultVendor;
    let optionKeys = Object.keys(option);
    if (S2S_VENDORS[vendor]) {
      // vendor keys will be set if either: the key was not specified by user
      // or if the user did not set their own distinct value (ie using the system default) to override the vendor
      Object.keys(S2S_VENDORS[vendor]).forEach((vendorKey) => {
        if (s2sDefaultConfig[vendorKey] === option[vendorKey] || !includes(optionKeys, vendorKey)) {
          option[vendorKey] = S2S_VENDORS[vendor][vendorKey];
        }
      });
    } else {
      logError('Incorrect or unavailable prebid server default vendor option: ' + vendor);
      return false;
    }
  }
  // this is how we can know if user / defaultVendor has set it, or if we should default to false
  return option.enabled = typeof option.enabled === 'boolean' ? option.enabled : false;
}

/**
 * @param {S2SConfig} option
 * @return {boolean}
 */
function validateConfigRequiredProps(option) {
  const keys = Object.keys(option);
  if (['accountId', 'endpoint'].filter(key => {
    if (!includes(keys, key)) {
      logError(key + ' missing in server to server config');
      return true;
    }
    return false;
  }).length > 0) {
    return false;
  }
}

// temporary change to modify the s2sConfig for new format used for endpoint URLs;
// could be removed later as part of a major release, if we decide to not support the old format
function formatUrlParams(option) {
  ['endpoint', 'syncEndpoint'].forEach((prop) => {
    if (isStr(option[prop])) {
      let temp = option[prop];
      option[prop] = { p1Consent: temp, noP1Consent: temp };
    }
    if (isPlainObject(option[prop]) && (!option[prop].p1Consent || !option[prop].noP1Consent)) {
      ['p1Consent', 'noP1Consent'].forEach((conUrl) => {
        if (!option[prop][conUrl]) {
          logWarn(`s2sConfig.${prop}.${conUrl} not defined.  PBS request will be skipped in some P1 scenarios.`);
        }
      });
    }
  });
}

/**
 * @param {(S2SConfig[]|S2SConfig)} options
 */
function setS2sConfig(options) {
  if (!options) {
    return;
  }
  const normalizedOptions = Array.isArray(options) ? options : [options];

  const activeBidders = [];
  const optionsValid = normalizedOptions.every((option, i, array) => {
    formatUrlParams(options);
    const updateSuccess = updateConfigDefaultVendor(option);
    if (updateSuccess !== false) {
      const valid = validateConfigRequiredProps(option);
      if (valid !== false) {
        if (Array.isArray(option['bidders'])) {
          array[i]['bidders'] = option['bidders'].filter(bidder => {
            if (activeBidders.indexOf(bidder) === -1) {
              activeBidders.push(bidder);
              return true;
            }
            return false;
          });
        }
        return true;
      }
    }
    logWarn('prebidServer: s2s config is disabled');
    return false;
  });

  if (optionsValid) {
    return _s2sConfigs = normalizedOptions;
  }
}
getConfig('s2sConfig', ({s2sConfig}) => setS2sConfig(s2sConfig));

/**
 * resets the _synced variable back to false, primiarily used for testing purposes
 */
export function resetSyncedStatus() {
  _syncCount = 0;
}

/**
 * @param  {Array} bidderCodes list of bidders to request user syncs for.
 */
function queueSync(bidderCodes, gdprConsent, uspConsent, gppConsent, s2sConfig) {
  if (_s2sConfigs.length === _syncCount) {
    return;
  }
  _syncCount++;

  let filterSettings = {};
  const userSyncFilterSettings = getConfig('userSync.filterSettings');

  if (userSyncFilterSettings) {
    const { all, iframe, image } = userSyncFilterSettings;
    const ifrm = iframe || all;
    const img = image || all;

    if (ifrm) filterSettings = Object.assign({ iframe: ifrm }, filterSettings);
    if (img) filterSettings = Object.assign({ image: img }, filterSettings);
  }

  const payload = {
    uuid: generateUUID(),
    bidders: bidderCodes,
    account: s2sConfig.accountId,
    filterSettings
  };

  let userSyncLimit = s2sConfig.userSyncLimit;
  if (isNumber(userSyncLimit) && userSyncLimit > 0) {
    payload['limit'] = userSyncLimit;
  }

  if (gdprConsent) {
    payload.gdpr = (gdprConsent.gdprApplies) ? 1 : 0;
    // attempt to populate gdpr_consent if we know gdprApplies or it may apply
    if (gdprConsent.gdprApplies !== false) {
      payload.gdpr_consent = gdprConsent.consentString;
    }
  }

  // US Privacy (CCPA) support
  if (uspConsent) {
    payload.us_privacy = uspConsent;
  }

  if (gppConsent) {
    payload.gpp_sid = gppConsent.applicableSections.join();
    // should we add check if applicableSections was not equal to -1 (where user was out of scope)?
    //   this would be similar to what was done above for TCF
    payload.gpp = gppConsent.gppString;
  }

  if (typeof s2sConfig.coopSync === 'boolean') {
    payload.coopSync = s2sConfig.coopSync;
  }

  const jsonPayload = JSON.stringify(payload);
  ajax(getMatchingConsentUrl(s2sConfig.syncEndpoint, gdprConsent),
    (response) => {
      try {
        response = JSON.parse(response);
        doAllSyncs(response.bidder_status, s2sConfig);
      } catch (e) {
        logError(e);
      }
    },
    jsonPayload,
    {
      contentType: 'text/plain',
      withCredentials: true
    });
}

function doAllSyncs(bidders, s2sConfig) {
  if (bidders.length === 0) {
    return;
  }

  // pull the syncs off the list in the order that prebid server sends them
  const thisSync = bidders.shift();

  // if PBS reports this bidder doesn't have an ID, then call the sync and recurse to the next sync entry
  if (thisSync.no_cookie) {
    doPreBidderSync(thisSync.usersync.type, thisSync.usersync.url, thisSync.bidder, doAllSyncs.bind(null, bidders, s2sConfig), s2sConfig);
  } else {
    // bidder already has an ID, so just recurse to the next sync entry
    doAllSyncs(bidders, s2sConfig);
  }
}

/**
 * Modify the cookie sync url from prebid server to add new params.
 *
 * @param {string} type the type of sync, "image", "redirect", "iframe"
 * @param {string} url the url to sync
 * @param {string} bidder name of bidder doing sync for
 * @param {function} done an exit callback; to signify this pixel has either: finished rendering or something went wrong
 * @param {S2SConfig} s2sConfig
 */
function doPreBidderSync(type, url, bidder, done, s2sConfig) {
  if (s2sConfig.syncUrlModifier && typeof s2sConfig.syncUrlModifier[bidder] === 'function') {
    url = s2sConfig.syncUrlModifier[bidder](type, url, bidder);
  }
  doBidderSync(type, url, bidder, done, s2sConfig.syncTimeout)
}

/**
 * Run a cookie sync for the given type, url, and bidder
 *
 * @param {string} type the type of sync, "image", "redirect", "iframe"
 * @param {string} url the url to sync
 * @param {string} bidder name of bidder doing sync for
 * @param {function} done an exit callback; to signify this pixel has either: finished rendering or something went wrong
 * @param {number} timeout: maximum time to wait for rendering in milliseconds
 */
function doBidderSync(type, url, bidder, done, timeout) {
  if (!url) {
    logError(`No sync url for bidder "${bidder}": ${url}`);
    done();
  } else if (type === 'image' || type === 'redirect') {
    logMessage(`Invoking image pixel user sync for bidder: "${bidder}"`);
    triggerPixel(url, done, timeout);
  } else if (type === 'iframe') {
    logMessage(`Invoking iframe user sync for bidder: "${bidder}"`);
    insertUserSyncIframe(url, done, timeout);
  } else {
    logError(`User sync type "${type}" not supported for bidder: "${bidder}"`);
    done();
  }
}

/**
 * Do client-side syncs for bidders.
 *
 * @param {Array} bidders a list of bidder names
 */
function doClientSideSyncs(bidders, gdprConsent, uspConsent, gppConsent) {
  bidders.forEach(bidder => {
    let clientAdapter = adapterManager.getBidAdapter(bidder);
    if (clientAdapter && clientAdapter.registerSyncs) {
      config.runWithBidder(
        bidder,
        clientAdapter.registerSyncs.bind(
          clientAdapter,
          [],
          gdprConsent,
          uspConsent,
          gppConsent
        )
      );
    }
  });
}

/**
 * map wurl to auction id and adId for use in the BID_WON event
 */
let wurlMap = {};

/**
 * @param {string} auctionId
 * @param {string} adId generated value set to bidObject.adId by bidderFactory Bid()
 * @param {string} wurl events.winurl passed from prebidServer as wurl
 */
function addWurl(auctionId, adId, wurl) {
  if ([auctionId, adId].every(isStr)) {
    wurlMap[`${auctionId}${adId}`] = wurl;
  }
}

/**
 * @param {string} auctionId
 * @param {string} adId generated value set to bidObject.adId by bidderFactory Bid()
 */
function removeWurl(auctionId, adId) {
  if ([auctionId, adId].every(isStr)) {
    wurlMap[`${auctionId}${adId}`] = undefined;
  }
}
/**
 * @param {string} auctionId
 * @param {string} adId generated value set to bidObject.adId by bidderFactory Bid()
 * @return {(string|undefined)} events.winurl which was passed as wurl
 */
function getWurl(auctionId, adId) {
  if ([auctionId, adId].every(isStr)) {
    return wurlMap[`${auctionId}${adId}`];
  }
}

/**
 * remove all cached wurls
 */
export function resetWurlMap() {
  wurlMap = {};
}

/**
 * BID_WON event to request the wurl
 * @param {Bid} bid the winning bid object
 */
function bidWonHandler(bid) {
  const wurl = getWurl(bid.auctionId, bid.adId);
  if (isStr(wurl)) {
    logMessage(`Invoking image pixel for wurl on BID_WIN: "${wurl}"`);
    triggerPixel(wurl);

    // remove from wurl cache, since the wurl url was called
    removeWurl(bid.auctionId, bid.adId);
  }
}

function getMatchingConsentUrl(urlProp, gdprConsent) {
  const hasPurpose = hasPurpose1Consent(gdprConsent);
  const url = hasPurpose ? urlProp.p1Consent : urlProp.noP1Consent
  if (!url) {
    logWarn('Missing matching consent URL when gdpr=' + hasPurpose);
  }
  return url;
}

function getConsentData(bidRequests) {
  let gdprConsent, uspConsent, gppConsent;
  if (Array.isArray(bidRequests) && bidRequests.length > 0) {
    gdprConsent = bidRequests[0].gdprConsent;
    uspConsent = bidRequests[0].uspConsent;
    gppConsent = bidRequests[0].gppConsent;
  }
  return { gdprConsent, uspConsent, gppConsent };
}

/**
 * Bidder adapter for Prebid Server
 */
export function PrebidServer() {
  const baseAdapter = new Adapter('prebidServer');

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(s2sBidRequest, bidRequests, addBidResponse, done, ajax) {
    const adapterMetrics = s2sBidRequest.metrics = useMetrics(deepAccess(bidRequests, '0.metrics'))
      .newMetrics()
      .renameWith((n) => [`adapter.s2s.${n}`, `adapters.s2s.${s2sBidRequest.s2sConfig.defaultVendor}.${n}`])
    done = adapterMetrics.startTiming('total').stopBefore(done);
    bidRequests.forEach(req => useMetrics(req.metrics).join(adapterMetrics, {continuePropagation: false}));

    let { gdprConsent, uspConsent, gppConsent } = getConsentData(bidRequests);

    if (Array.isArray(_s2sConfigs)) {
      if (s2sBidRequest.s2sConfig && s2sBidRequest.s2sConfig.syncEndpoint && getMatchingConsentUrl(s2sBidRequest.s2sConfig.syncEndpoint, gdprConsent)) {
        let syncBidders = s2sBidRequest.s2sConfig.bidders
          .map(bidder => adapterManager.aliasRegistry[bidder] || bidder)
          .filter((bidder, index, array) => (array.indexOf(bidder) === index));

        queueSync(syncBidders, gdprConsent, uspConsent, gppConsent, s2sBidRequest.s2sConfig);
      }

      processPBSRequest(s2sBidRequest, bidRequests, ajax, {
        onResponse: function (isValid, requestedBidders, response) {
          if (isValid) {
            bidRequests.forEach(bidderRequest => events.emit(EVENTS.BIDDER_DONE, bidderRequest));
          }
          if (shouldEmitNonbids(s2sBidRequest.s2sConfig, response)) {
            events.emit(EVENTS.SEAT_NON_BID, {
              seatnonbid: response.ext.seatnonbid,
              auctionId: bidRequests[0].auctionId,
              requestedBidders,
              response,
              adapterMetrics
            });
          }
          done(false);
          doClientSideSyncs(requestedBidders, gdprConsent, uspConsent, gppConsent);
        },
        onError(msg, error) {
          logError(`Prebid server call failed: '${msg}'`, error);
          bidRequests.forEach(bidderRequest => events.emit(EVENTS.BIDDER_ERROR, { error, bidderRequest }));
          done(error.timedOut);
        },
        onBid: function ({adUnit, bid}) {
          const metrics = bid.metrics = s2sBidRequest.metrics.fork().renameWith();
          metrics.checkpoint('addBidResponse');
          if ((bid.requestId == null || bid.requestBidder == null) && !s2sBidRequest.s2sConfig.allowUnknownBidderCodes) {
            logWarn(`PBS adapter received bid from unknown bidder (${bid.bidder}), but 's2sConfig.allowUnknownBidderCodes' is not set. Ignoring bid.`);
            addBidResponse.reject(adUnit, bid, REJECTION_REASON.BIDDER_DISALLOWED);
          } else {
            if (metrics.measureTime('addBidResponse.validate', () => isValid(adUnit, bid))) {
              addBidResponse(adUnit, bid);
              if (bid.pbsWurl) {
                addWurl(bid.auctionId, bid.adId, bid.pbsWurl);
              }
            } else {
              addBidResponse.reject(adUnit, bid, REJECTION_REASON.INVALID);
            }
          }
        },
        onFledge: (params) => {
          addPaapiConfig({auctionId: bidRequests[0].auctionId, ...params}, {config: params.config});
        }
      })
    }
  };

  // Listen for bid won to call wurl
  events.on(EVENTS.BID_WON, bidWonHandler);

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type: TYPE
  });
}

/**
 * Build and send the appropriate HTTP request over the network, then interpret the response.
 * @param s2sBidRequest
 * @param bidRequests
 * @param ajax
 * @param onResponse {function(boolean, Array[String])} invoked on a successful HTTP response - with a flag indicating whether it was successful,
 * and a list of the unique bidder codes that were sent in the request
 * @param onError {function(String, {})} invoked on HTTP failure - with status message and XHR error
 * @param onBid {function({})} invoked once for each bid in the response - with the bid as returned by interpretResponse
 */
export const processPBSRequest = hook('sync', function (s2sBidRequest, bidRequests, ajax, {onResponse, onError, onBid, onFledge}) {
  let { gdprConsent } = getConsentData(bidRequests);
  const adUnits = deepClone(s2sBidRequest.ad_units);

  // in case config.bidders contains invalid bidders, we only process those we sent requests for
  const requestedBidders = adUnits
    .map(adUnit => adUnit.bids.map(bid => bid.bidder).filter(uniques))
    .reduce(flatten, [])
    .filter(uniques);

  const request = s2sBidRequest.metrics.measureTime('buildRequests', () => buildPBSRequest(s2sBidRequest, bidRequests, adUnits, requestedBidders, eidPermissions));
  const requestJson = request && JSON.stringify(request);
  logInfo('BidRequest: ' + requestJson);
  const endpointUrl = getMatchingConsentUrl(s2sBidRequest.s2sConfig.endpoint, gdprConsent);
  if (request && requestJson && endpointUrl) {
    const networkDone = s2sBidRequest.metrics.startTiming('net');
    ajax(
      endpointUrl,
      {
        success: function (response) {
          networkDone();
          let result;
          try {
            result = JSON.parse(response);
            const {bids, fledgeAuctionConfigs} = s2sBidRequest.metrics.measureTime('interpretResponse', () => interpretPBSResponse(result, request));
            bids.forEach(onBid);
            if (fledgeAuctionConfigs) {
              fledgeAuctionConfigs.forEach(onFledge);
            }
          } catch (error) {
            logError(error);
          }
          if (!result || (result.status && includes(result.status, 'Error'))) {
            logError('error parsing response: ', result ? result.status : 'not valid JSON');
            onResponse(false, requestedBidders);
          } else {
            onResponse(true, requestedBidders, result);
          }
        },
        error: function () {
          networkDone();
          onError.apply(this, arguments);
        }
      },
      requestJson,
      {
        contentType: 'text/plain',
        withCredentials: true,
        browsingTopics: isActivityAllowed(ACTIVITY_TRANSMIT_UFPD, s2sActivityParams(s2sBidRequest.s2sConfig))
      }
    );
  } else {
    logError('PBS request not made.  Check endpoints.');
  }
}, 'processPBSRequest');

function shouldEmitNonbids(s2sConfig, response) {
  return s2sConfig?.extPrebid?.returnallbidstatus && response?.ext?.seatnonbid;
}

/**
 * Global setter that sets eids permissions for bidders
 * This setter is to be used by userId module when included
 * @param {Array} newEidPermissions
 */
function setEidPermissions(newEidPermissions) {
  eidPermissions = newEidPermissions;
}
getPrebidInternal().setEidPermissions = setEidPermissions;

adapterManager.registerBidAdapter(new PrebidServer(), 'prebidServer');
