import Adapter from '../../src/adapter.js';
import {
  compressDataWithGZip,
  debugTurnedOn,
  deepClone,
  flatten,
  generateUUID,
  getParameterByName,
  insertUserSyncIframe,
  isGzipCompressionSupported,
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
import {DEBUG_MODE, EVENTS, REJECTION_REASON, S2S} from '../../src/constants.js';
import adapterManager, {s2sActivityParams} from '../../src/adapterManager.js';
import {config} from '../../src/config.js';
import {addPaapiConfig, isValid} from '../../src/adapters/bidderFactory.js';
import * as events from '../../src/events.js';
import {ajax} from '../../src/ajax.js';
import {hook} from '../../src/hook.js';
import {hasPurpose1Consent} from '../../src/utils/gdpr.js';
import {buildPBSRequest, interpretPBSResponse} from './ortbConverter.js';
import {useMetrics} from '../../src/utils/perfMetrics.js';
import {isActivityAllowed} from '../../src/activities/rules.js';
import {ACTIVITY_TRANSMIT_UFPD} from '../../src/activities/activities.js';
import type {Identifier, BidderCode} from '../../src/types/common.d.ts';
import type {Metrics} from "../../src/utils/perfMetrics.ts";
import type {ORTBResponse} from "../../src/types/ortb/response.d.ts";
import type {NativeRequest} from '../../src/types/ortb/native.d.ts';
import type {SyncType} from "../../src/userSync.ts";

const getConfig = config.getConfig;

const TYPE = S2S.SRC;
let _syncCount = 0;
let _s2sConfigs: S2SConfig[];

type Endpoint = string | {
  /**
   * Defines the auction endpoint or the cookie_sync endpoint for the Prebid Server cluster for non-consent requests or users who grant consent.
   */
  p1Consent: string;
  /**
   * Defines the auction endpoint or the cookie_sync endpoint for the Prebid Server cluster for users who do not grant consent.
   * (This is useful for a server configured to not accept any cookies to ensure compliance regulations.)
   */
  noP1Consent: string;
};

type S2SConfig = {
  /**
   * Your Prebid Server account ID. This is obtained from whoever’s hosting your Prebid Server.
   */
  accountId: string;
  /**
   * A handle for this configuration, used to reference a specific server (when multiple are present) from ad unit configuration
   */
  name?: string;
  /**
   * Which bidders auctions should take place on the server side
   */
  bidders?: BidderCode[];
  /**
   * Allow Prebid Server to bid on behalf of bidders that are not explicitly listed in the adUnit.
   * Defaults to false.
   */
  allowUnknownBidderCodes?: boolean;
  /**
   * Enables this s2sConfig block - defaults to false
   */
  enabled?: boolean;
  /**
   * Number of milliseconds allowed for the server-side auctions.
   * This should be approximately 200ms-300ms less than your Prebid.js timeout to allow for all bids to be returned
   * in a timely manner. Defaults to 75% of bidderTimeout or `maxTimeout`, whichever is lesser.
   */
  timeout?: number;
  /**
   * Upper limit on the default timeout. Defaults to 1500.
   */
  maxTimeout?: number;
  /**
   * Adapter to use to connect to Prebid Server. Defaults to ‘prebidServer’
   */
  adapter?: string;
  /**
   * Defines the auction endpoint for the Prebid Server cluster.
   */
  endpoint: Endpoint;
  /**
   * Defines the cookie_sync endpoint for the Prebid Server cluster.
   */
  syncEndpoint: Endpoint;
  /**
   * Max number of userSync URLs that can be executed by Prebid Server cookie_sync per request.
   * If not defined, PBS will execute all userSync URLs included in the request.
   */
  userSyncLimit?: number;
  /**
   * Maximum number of milliseconds allowed for each server-side userSync to load. Default is 1000.
   */
  syncTimeout?: number;
  /**
   * Functions to modify a bidder’s sync url before the actual call to the sync endpoint.
   * Bidder must be enabled for s2sConfig.
   */
  syncUrlModifier?: {
    [bidder: BidderCode]: (type: SyncType, url: string, bidder: BidderCode) => string;
  };
  /**
   * Whether or not PBS is allowed to perform “cooperative syncing” for bidders not on this page.
   * Publishers help each other improve match rates by allowing this. Default is true.
   */
  coopSync?: boolean;
  /**
   * Configures the default TTL in the Prebid Server adapter to use when Prebid Server does not return a bid TTL.
   * Defaults to 60.
   */
  defaultTTL?: number;
  /**
   * Arguments will be added to resulting OpenRTB payload to Prebid Server in every impression object at request.imp[].ext.BIDDER
   */
  adapterOptions?: { [bidder: BidderCode]: Record<string, unknown> };
  /**
   * Arguments will be added to resulting OpenRTB payload to Prebid Server in request.ext.prebid.
   */
  extPrebid?: Record<string, unknown>;
  /**
   * Base value for imp.native.request
   */
  ortbNative?: Partial<NativeRequest>;
  /**
   * If true, enable gzip compression of outgoing requests.
   */
  endpointCompression?: boolean
  /**
   * If true, exclude ad units that have no bidders defined.
   */
  filterBidderlessCalls?: boolean;
}

export const s2sDefaultConfig: Partial<S2SConfig> = {
  bidders: Object.freeze([]) as any,
  syncTimeout: 1000,
  adapter: 'prebidServer',
  allowUnknownBidderCodes: false,
  adapterOptions: {},
  syncUrlModifier: {},
  ortbNative: {
    eventtrackers: [
      {event: 1, methods: [1, 2]}
    ],
  },
  maxTimeout: 1500,
  filterBidderlessCalls: false
};

config.setDefaults({
  's2sConfig': s2sDefaultConfig
});

declare module '../../src/config' {
  interface Config {
    s2sConfig?: S2SConfig | S2SConfig[];
  }
}

function updateConfigDefaults(s2sConfig: S2SConfig) {
  if (s2sConfig.adapter == null) {
    s2sConfig.adapter = 'prebidServer';
  }
  return true;
}

function validateConfigRequiredProps(s2sConfig: S2SConfig) {
  for (const key of ['accountId', 'endpoint']) {
    if (s2sConfig[key] == null) {
      logError(key + ' missing in server to server config');
      return false;
    }
  }
  return true;
}

// temporary change to modify the s2sConfig for new format used for endpoint URLs;
// could be removed later as part of a major release, if we decide to not support the old format
function formatUrlParams(option) {
  ['endpoint', 'syncEndpoint'].forEach((prop) => {
    if (isStr(option[prop])) {
      const temp = option[prop];
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

export function validateConfig(options: S2SConfig[]) {
  if (!options) {
    return;
  }
  options = Array.isArray(options) ? options : [options];
  const activeBidders = new Set();
  return options.filter(s2sConfig => {
    formatUrlParams(s2sConfig);
    if (
      updateConfigDefaults(s2sConfig) &&
      validateConfigRequiredProps(s2sConfig) &&
      s2sConfig.enabled
    ) {
      if (Array.isArray(s2sConfig.bidders)) {
        s2sConfig.bidders = s2sConfig.bidders.filter(bidder => {
          if (activeBidders.has(bidder)) {
            return false;
          } else {
            activeBidders.add(bidder);
            return true;
          }
        })
      }
      return true;
    } else {
      logWarn('prebidServer: s2s config is disabled', s2sConfig);
      return false;
    }
  })
}

/**
 * @param {(S2SConfig[]|S2SConfig)} options
 */
function setS2sConfig(options) {
  options = validateConfig(options);
  if (options.length) {
    _s2sConfigs = options;
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
function queueSync(bidderCodes, gdprConsent, uspConsent, gppConsent, s2sConfig: S2SConfig) {
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

  const payload: any = {
    uuid: generateUUID(),
    bidders: bidderCodes,
    account: s2sConfig.accountId,
    filterSettings
  };

  const userSyncLimit = s2sConfig.userSyncLimit;
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
        const responseJson = JSON.parse(response);
        doAllSyncs(responseJson.bidder_status, s2sConfig);
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
 * @param {number} timeout maximum time to wait for rendering in milliseconds
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
    const clientAdapter = adapterManager.getBidAdapter(bidder);
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

export type SeatNonBid = {
  /**
   * Auction ID associated with the PBS response.
   */
  auctionId: Identifier;
  /**
   * The PBS response's `ext.seatnonbid`.
   */
  seatnonbid: unknown;
  /**
   * Bidders that were included in the request to PBS.
   */
  requestedBidders: BidderCode[];
  /**
   * PBS response data.
   */
  response: ORTBResponse;
  adapterMetrics: Metrics;
}

export type PbsAnalytics = SeatNonBid & {
  /**
   * The PBS response's `ext.prebid.analytics.tags`.
   */
  atag: unknown;
}

declare module '../../src/events' {
  interface Events {
    [EVENTS.SEAT_NON_BID]: [SeatNonBid];
    [EVENTS.PBS_ANALYTICS]: [PbsAnalytics];
    [EVENTS.BEFORE_PBS_HTTP]: [PbsRequestData];
  }
}

/**
 * Bidder adapter for Prebid Server
 */
export function PrebidServer() {
  const baseAdapter: any = Adapter('prebidServer');

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(s2sBidRequest, bidRequests, addBidResponse, done, ajax) {
    const adapterMetrics = s2sBidRequest.metrics = useMetrics(bidRequests?.[0]?.metrics)
      .newMetrics()
      .renameWith((n) => [`adapter.s2s.${n}`, `adapters.s2s.${s2sBidRequest.s2sConfig.defaultVendor}.${n}`])
    done = adapterMetrics.startTiming('total').stopBefore(done);
    bidRequests.forEach(req => useMetrics(req.metrics).join(adapterMetrics, {stopPropagation: true}));

    const { gdprConsent, uspConsent, gppConsent } = getConsentData(bidRequests);

    if (Array.isArray(_s2sConfigs)) {
      if (s2sBidRequest.s2sConfig && s2sBidRequest.s2sConfig.syncEndpoint && getMatchingConsentUrl(s2sBidRequest.s2sConfig.syncEndpoint, gdprConsent)) {
        const s2sAliases = (s2sBidRequest.s2sConfig.extPrebid && s2sBidRequest.s2sConfig.extPrebid.aliases) ?? {};
        const syncBidders = s2sBidRequest.s2sConfig.bidders
          .map(bidder => adapterManager.aliasRegistry[bidder] || s2sAliases[bidder] || bidder)
          .filter((bidder, index, array) => (array.indexOf(bidder) === index));

        queueSync(syncBidders, gdprConsent, uspConsent, gppConsent, s2sBidRequest.s2sConfig);
      }

      processPBSRequest(s2sBidRequest, bidRequests, ajax, {
        onResponse: function (isValid, requestedBidders, response) {
          if (isValid) {
            bidRequests.forEach(bidderRequest => events.emit(EVENTS.BIDDER_DONE, bidderRequest));
          }
          const { seatNonBidData, atagData } = getAnalyticsFlags(s2sBidRequest.s2sConfig, response)
          if (seatNonBidData) {
            events.emit(EVENTS.SEAT_NON_BID, {
              seatnonbid: response.ext.seatnonbid,
              auctionId: bidRequests[0].auctionId,
              requestedBidders,
              response,
              adapterMetrics
            });
          }
          // pbs analytics event
          if (seatNonBidData || atagData) {
            const data: PbsAnalytics = {
              seatnonbid: seatNonBidData,
              atag: atagData,
              auctionId: bidRequests[0].auctionId,
              requestedBidders,
              response,
              adapterMetrics
            }
            events.emit(EVENTS.PBS_ANALYTICS, data);
          }
          done(false);
          doClientSideSyncs(requestedBidders, gdprConsent, uspConsent, gppConsent);
        },
        onError(msg, error) {
          const {p1Consent = '', noP1Consent = ''} = s2sBidRequest?.s2sConfig?.endpoint || {};
          if (p1Consent === noP1Consent) {
            logError(`Prebid server call failed: '${msg}'. Endpoint: "${p1Consent}"}`, error);
          } else {
            logError(`Prebid server call failed: '${msg}'. Endpoints: p1Consent "${p1Consent}", noP1Consent "${noP1Consent}"}`, error);
          }
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
            } else {
              addBidResponse.reject(adUnit, bid, REJECTION_REASON.INVALID);
            }
          }
        },
        onFledge: (params) => {
          config.runWithBidder(params.bidder, () => {
            addPaapiConfig({auctionId: bidRequests[0].auctionId, ...params}, {config: params.config});
          })
        }
      })
    }
  };

  Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type: TYPE
  });
}

type PbsRequestData = {
  endpointUrl: string;
  requestJson: string;
  customHeaders: Record<string, string>;
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
export const processPBSRequest = hook('async', function (s2sBidRequest, bidRequests, ajax, {onResponse, onError, onBid, onFledge}) {
  const { gdprConsent } = getConsentData(bidRequests);
  const adUnits = deepClone(s2sBidRequest.ad_units);

  // in case config.bidders contains invalid bidders, we only process those we sent requests for
  const requestedBidders = adUnits
    .map(adUnit => adUnit.bids.map(bid => bid.bidder).filter(uniques))
    .reduce(flatten, [])
    .filter(uniques);

  const request = s2sBidRequest.metrics.measureTime('buildRequests', () => buildPBSRequest(s2sBidRequest, bidRequests, adUnits, requestedBidders));
  const requestData: PbsRequestData = {
    endpointUrl: getMatchingConsentUrl(s2sBidRequest.s2sConfig.endpoint, gdprConsent),
    requestJson: request && JSON.stringify(request),
    customHeaders: s2sBidRequest?.s2sConfig?.customHeaders ?? {},
  };
  events.emit(EVENTS.BEFORE_PBS_HTTP, requestData)
  logInfo('BidRequest: ' + requestData);
  if (request && requestData.requestJson && requestData.endpointUrl) {
    const callAjax = (payload, endpointUrl) => {
      const networkDone = s2sBidRequest.metrics.startTiming('net');
      ajax(
        endpointUrl,
        {
          success: function (response) {
            networkDone();
            let result;
            try {
              result = JSON.parse(response);
              const {bids, paapi} = s2sBidRequest.metrics.measureTime('interpretResponse', () => interpretPBSResponse(result, request));
              bids.forEach(onBid);
              if (paapi) {
                paapi.forEach(onFledge);
              }
            } catch (error) {
              logError(error);
            }
            if (!result || (result.status && result.status.includes('Error'))) {
              logError('error parsing response: ', result ? result.status : 'not valid JSON');
              onResponse(false, requestedBidders);
            } else {
              onResponse(true, requestedBidders, result);
            }
          },
          error: function (...args) {
            networkDone();
            onError.apply(this, args);
          }
        },
        payload,
        {
          contentType: 'text/plain',
          withCredentials: true,
          browsingTopics: isActivityAllowed(ACTIVITY_TRANSMIT_UFPD, s2sActivityParams(s2sBidRequest.s2sConfig)),
          customHeaders: requestData.customHeaders
        }
      );
    }

    const enableGZipCompression = s2sBidRequest.s2sConfig.endpointCompression && !requestData.customHeaders['Content-Encoding'];
    const debugMode = getParameterByName(DEBUG_MODE).toUpperCase() === 'TRUE' || debugTurnedOn();
    if (enableGZipCompression && debugMode) {
      logWarn('Skipping GZIP compression for PBS as debug mode is enabled');
    }

    if (enableGZipCompression && !debugMode && isGzipCompressionSupported()) {
      compressDataWithGZip(requestData.requestJson).then(compressedPayload => {
        const url = new URL(requestData.endpointUrl);
        url.searchParams.set('gzip', '1');
        callAjax(compressedPayload, url.href);
      });
    } else {
      callAjax(requestData.requestJson, requestData.endpointUrl);
    }
  } else {
    logError('PBS request not made.  Check endpoints.');
  }
}, 'processPBSRequest');

function getAnalyticsFlags(s2sConfig, response) {
  return {
    atagData: getAtagData(response),
    seatNonBidData: getNonBidData(s2sConfig, response)
  }
}
function getNonBidData(s2sConfig, response) {
  return s2sConfig?.extPrebid?.returnallbidstatus ? response?.ext?.seatnonbid : undefined;
}

function getAtagData(response) {
  return response?.ext?.prebid?.analytics?.tags;
}

adapterManager.registerBidAdapter(new PrebidServer(), 'prebidServer');
