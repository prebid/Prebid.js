import Adapter from '../adapter.js';
import adapterManager from '../adapterManager.js';
import {config} from '../config.js';
import {createBid} from '../bidfactory.js';
import {userSync} from '../userSync.js';
import {nativeBidIsValid} from '../native.js';
import {isValidVideoBid} from '../video.js';
import { EVENTS, STATUS, REJECTION_REASON } from '../constants.js';
import * as events from '../events.js';
import {includes} from '../polyfill.js';
import {
  delayExecution,
  isArray,
  isPlainObject,
  logError,
  logWarn, memoize,
  parseQueryStringParameters,
  parseSizesInput, pick,
  uniques
} from '../utils.js';
import {hook} from '../hook.js';
import {auctionManager} from '../auctionManager.js';
import {bidderSettings} from '../bidderSettings.js';
import {useMetrics} from '../utils/perfMetrics.js';
import {isActivityAllowed} from '../activities/rules.js';
import {activityParams} from '../activities/activityParams.js';
import {MODULE_TYPE_BIDDER} from '../activities/modules.js';
import {ACTIVITY_TRANSMIT_TID, ACTIVITY_TRANSMIT_UFPD} from '../activities/activities.js';

/**
 * @typedef {import('../mediaTypes.js').MediaType} MediaType
 * @typedef {import('../Renderer.js').Renderer} Renderer
 */

/**
 * This file aims to support Adapters during the Prebid 0.x -> 1.x transition.
 *
 * Prebid 1.x and Prebid 0.x will be in separate branches--perhaps for a long time.
 * This function defines an API for adapter construction which is compatible with both versions.
 * Adapters which use it can maintain their code in master, and only this file will need to change
 * in the 1.x branch.
 *
 * Typical usage looks something like:
 *
 * const adapter = registerBidder({
 *   code: 'myBidderCode',
 *   aliases: ['alias1', 'alias2'],
 *   supportedMediaTypes: ['video', 'native'],
 *   isBidRequestValid: function(paramsObject) { return true/false },
 *   buildRequests: function(bidRequests, bidderRequest) { return some ServerRequest(s) },
 *   interpretResponse: function(oneServerResponse) { return some Bids, or throw an error. }
 * });
 *
 * @see BidderSpec for the full API and more thorough descriptions.
 *
 */

/**
 * @typedef {object} BidderSpec An object containing the adapter-specific functions needed to
 * make a Bidder.
 *
 * @property {string} code A code which will be used to uniquely identify this bidder. This should be the same
 *   one as is used in the call to registerBidAdapter
 * @property {string[]} [aliases] A list of aliases which should also resolve to this bidder.
 * @property {MediaType[]} [supportedMediaTypes] A list of Media Types which the adapter supports.
 * @property {function(object): boolean} isBidRequestValid Determines whether or not the given bid has all the params
 *   needed to make a valid request.
 * @property {function(BidRequest[], bidderRequest): ServerRequest|ServerRequest[]} buildRequests Build the request to the Server
 *   which requests Bids for the given array of Requests. Each BidRequest in the argument array is guaranteed to have
 *   passed the isBidRequestValid() test.
 * @property {function(ServerResponse, BidRequest): Bid[]} interpretResponse Given a successful response from the Server,
 *   interpret it and return the Bid objects. This function will be run inside a try/catch.
 *   If it throws any errors, your bids will be discarded.
 * @property {function(SyncOptions, ServerResponse[]): UserSync[]} [getUserSyncs] Given an array of all the responses
 *   from the server, determine which user syncs should occur. The argument array will contain every element
 *   which has been sent through to interpretResponse. The order of syncs in this array matters. The most
 *   important ones should come first, since publishers may limit how many are dropped on their page.
 * @property {function(object): object} transformBidParams Updates bid params before creating bid request
 }}
 */

/**
 * @typedef {object} BidRequest
 *
 * @property {string} bidId A string which uniquely identifies this BidRequest in the current Auction.
 * @property {object} params Any bidder-specific params which the publisher used in their bid request.
 */

/**
 * @typedef {object} BidderAuctionResponse An object encapsulating an adapter response for current Auction
 *
 * @property {Array<Bid>} bids? Contextual bids returned by this adapter, if any
 * @property {Array<{bidId: String, config: {}}>} paapiAuctionConfigs? Array of paapi auction configs, each scoped to a particular bidId
 */

/**
 * @typedef {object} ServerRequest
 *
 * @property {('GET'|'POST')} method The type of request which this is.
 * @property {string} url The endpoint for the request. For example, "//bids.example.com".
 * @property {string|object} data Data to be sent in the request.
 * @property {object} options Content-Type set in the header of the bid request, overrides default 'text/plain'.
 *   If this is a GET request, they'll become query params. If it's a POST request, they'll be added to the body.
 *   Strings will be added as-is. Objects will be unpacked into query params based on key/value mappings, or
 *   JSON-serialized into the Request body.
 */

/**
 * @typedef {object} ServerResponse
 *
 * @property {*} body The response body. If this is legal JSON, then it will be parsed. Otherwise it'll be a
 *   string with the body's content.
 * @property {{get: function(string): string}} headers The response headers.
 *   Call this like `ServerResponse.headers.get("Content-Type")`
 */

/**
 * @typedef {object} Bid
 *
 * @property {string} requestId The specific BidRequest which this bid is aimed at.
 *   This should match the BidRequest.bidId which this Bid targets.
 * @property {string} ad A URL which can be used to load this ad, if it's chosen by the publisher.
 * @property {string} currency The currency code for the cpm value
 * @property {number} cpm The bid price, in US cents per thousand impressions.
 * @property {number} ttl Time-to-live - how long (in seconds) Prebid can use this bid.
 * @property {boolean} netRevenue Boolean defining whether the bid is Net or Gross.  The default is true (Net).
 * @property {number} height The height of the ad, in pixels.
 * @property {number} width The width of the ad, in pixels.
 *
 * @property {object} [native] Object for storing native creative assets
 * @property {object} [video] Object for storing video response data
 * @property {object} [meta] Object for storing bid meta data
 * @property {string} [meta.primaryCatId] The IAB primary category ID
 * @property {Renderer} renderer A Renderer which can be used as a default for this bid,
 *   if the publisher doesn't override it. This is only relevant for Outstream Video bids.
 */

/**
 * @typedef {Object} SyncOptions
 *
 * An object containing information about usersyncs which the adapter should obey.
 *
 * @property {boolean} iframeEnabled True if iframe usersyncs are allowed, and false otherwise
 * @property {boolean} pixelEnabled True if image usersyncs are allowed, and false otherwise
 */

/**
 * TODO: Move this to the UserSync module after that PR is merged.
 *
 * @typedef {object} UserSync
 *
 * @property {('image'|'iframe')} type The type of user sync to be done.
 * @property {string} url The URL which makes the sync happen.
 */

// common params for all mediaTypes
const COMMON_BID_RESPONSE_KEYS = ['cpm', 'ttl', 'creativeId', 'netRevenue', 'currency'];
const TIDS = ['auctionId', 'transactionId'];

/**
 * Register a bidder with prebid, using the given spec.
 *
 * If possible, Adapter modules should use this function instead of adapterManager.registerBidAdapter().
 *
 * @param {BidderSpec} spec An object containing the bare-bones functions we need to make a Bidder.
 */
export function registerBidder(spec) {
  const mediaTypes = Array.isArray(spec.supportedMediaTypes)
    ? { supportedMediaTypes: spec.supportedMediaTypes }
    : undefined;
  function putBidder(spec) {
    const bidder = newBidder(spec);
    adapterManager.registerBidAdapter(bidder, spec.code, mediaTypes);
  }

  putBidder(spec);
  if (Array.isArray(spec.aliases)) {
    spec.aliases.forEach(alias => {
      let aliasCode = alias;
      let gvlid;
      let skipPbsAliasing;
      if (isPlainObject(alias)) {
        aliasCode = alias.code;
        gvlid = alias.gvlid;
        skipPbsAliasing = alias.skipPbsAliasing
      }
      adapterManager.aliasRegistry[aliasCode] = spec.code;
      putBidder(Object.assign({}, spec, { code: aliasCode, gvlid, skipPbsAliasing }));
    });
  }
}

export function guardTids(bidderCode) {
  if (isActivityAllowed(ACTIVITY_TRANSMIT_TID, activityParams(MODULE_TYPE_BIDDER, bidderCode))) {
    return {
      bidRequest: (br) => br,
      bidderRequest: (br) => br
    };
  }
  function get(target, prop, receiver) {
    if (TIDS.includes(prop)) {
      return null;
    }
    return Reflect.get(target, prop, receiver);
  }
  function privateAccessProxy(target, handler) {
    const proxy = new Proxy(target, handler);
    // always allow methods (such as getFloor) private access to TIDs
    Object.entries(target)
      .filter(([_, v]) => typeof v === 'function')
      .forEach(([prop, fn]) => proxy[prop] = fn.bind(target));
    return proxy;
  }
  const bidRequest = memoize((br) => privateAccessProxy(br, {get}), (arg) => arg.bidId);
  /**
   * Return a view on bidd(er) requests where auctionId/transactionId are nulled if the bidder is not allowed `transmitTid`.
   *
   * Because both auctionId and transactionId are used for Prebid's own internal bookkeeping, we cannot simply erase them
   * from request objects; and because request objects are quite complex and not easily cloneable, we hide the IDs
   * with a proxy instead. This should be used only around the adapter logic.
   */
  return {
    bidRequest,
    bidderRequest: (br) => privateAccessProxy(br, {
      get(target, prop, receiver) {
        if (prop === 'bids') return br.bids.map(bidRequest);
        return get(target, prop, receiver);
      }
    })
  }
}

/**
 * Make a new bidder from the given spec. This is exported mainly for testing.
 * Adapters will probably find it more convenient to use registerBidder instead.
 *
 * @param {BidderSpec} spec
 */
export function newBidder(spec) {
  return Object.assign(new Adapter(spec.code), {
    getSpec: function() {
      return Object.freeze(Object.assign({}, spec));
    },
    registerSyncs,
    callBids: function(bidderRequest, addBidResponse, done, ajax, onTimelyResponse, configEnabledCallback) {
      if (!Array.isArray(bidderRequest.bids)) {
        return;
      }
      const tidGuard = guardTids(bidderRequest.bidderCode);

      const adUnitCodesHandled = {};
      function addBidWithCode(adUnitCode, bid) {
        const metrics = useMetrics(bid.metrics);
        metrics.checkpoint('addBidResponse');
        adUnitCodesHandled[adUnitCode] = true;
        if (metrics.measureTime('addBidResponse.validate', () => isValid(adUnitCode, bid))) {
          addBidResponse(adUnitCode, bid);
        } else {
          addBidResponse.reject(adUnitCode, bid, REJECTION_REASON.INVALID)
        }
      }

      // After all the responses have come back, call done() and
      // register any required usersync pixels.
      const responses = [];
      function afterAllResponses() {
        done();
        config.runWithBidder(spec.code, () => {
          events.emit(EVENTS.BIDDER_DONE, bidderRequest);
          registerSyncs(responses, bidderRequest.gdprConsent, bidderRequest.uspConsent, bidderRequest.gppConsent);
        });
      }

      const validBidRequests = adapterMetrics(bidderRequest)
        .measureTime('validate', () => bidderRequest.bids.filter((br) => filterAndWarn(tidGuard.bidRequest(br))));

      if (validBidRequests.length === 0) {
        afterAllResponses();
        return;
      }
      const bidRequestMap = {};
      validBidRequests.forEach(bid => {
        bidRequestMap[bid.bidId] = bid;
        // Delete this once we are 1.0
        if (!bid.adUnitCode) {
          bid.adUnitCode = bid.placementCode
        }
      });

      processBidderRequests(spec, validBidRequests.map(tidGuard.bidRequest), tidGuard.bidderRequest(bidderRequest), ajax, configEnabledCallback, {
        onRequest: requestObject => events.emit(EVENTS.BEFORE_BIDDER_HTTP, bidderRequest, requestObject),
        onResponse: (resp) => {
          onTimelyResponse(spec.code);
          responses.push(resp)
        },
        onPaapi: (paapiConfig) => {
          const bidRequest = bidRequestMap[paapiConfig.bidId];
          if (bidRequest) {
            addComponentAuction(bidRequest, paapiConfig.config);
          } else {
            logWarn('Received fledge auction configuration for an unknown bidId', paapiConfig);
          }
        },
        // If the server responds with an error, there's not much we can do beside logging.
        onError: (errorMessage, error) => {
          if (!error.timedOut) {
            onTimelyResponse(spec.code);
          }
          adapterManager.callBidderError(spec.code, error, bidderRequest)
          events.emit(EVENTS.BIDDER_ERROR, { error, bidderRequest });
          logError(`Server call for ${spec.code} failed: ${errorMessage} ${error.status}. Continuing without bids.`);
        },
        onBid: (bid) => {
          const bidRequest = bidRequestMap[bid.requestId];
          if (bidRequest) {
            bid.adapterCode = bidRequest.bidder;
            if (isInvalidAlternateBidder(bid.bidderCode, bidRequest.bidder)) {
              logWarn(`${bid.bidderCode} is not a registered partner or known bidder of ${bidRequest.bidder}, hence continuing without bid. If you wish to support this bidder, please mark allowAlternateBidderCodes as true in bidderSettings.`);
              addBidResponse.reject(bidRequest.adUnitCode, bid, REJECTION_REASON.BIDDER_DISALLOWED)
              return;
            }
            // creating a copy of original values as cpm and currency are modified later
            bid.originalCpm = bid.cpm;
            bid.originalCurrency = bid.currency;
            bid.meta = bid.meta || Object.assign({}, bid[bidRequest.bidder]);
            const prebidBid = Object.assign(createBid(STATUS.GOOD, bidRequest), bid, pick(bidRequest, TIDS));
            addBidWithCode(bidRequest.adUnitCode, prebidBid);
          } else {
            logWarn(`Bidder ${spec.code} made bid for unknown request ID: ${bid.requestId}. Ignoring.`);
            addBidResponse.reject(null, bid, REJECTION_REASON.INVALID_REQUEST_ID);
          }
        },
        onCompletion: afterAllResponses,
      });
    }
  });

  function isInvalidAlternateBidder(responseBidder, requestBidder) {
    let allowAlternateBidderCodes = bidderSettings.get(requestBidder, 'allowAlternateBidderCodes') || false;
    let alternateBiddersList = bidderSettings.get(requestBidder, 'allowedAlternateBidderCodes');
    if (!!responseBidder && !!requestBidder && requestBidder !== responseBidder) {
      alternateBiddersList = isArray(alternateBiddersList) ? alternateBiddersList.map(val => val.trim().toLowerCase()).filter(val => !!val).filter(uniques) : alternateBiddersList;
      if (!allowAlternateBidderCodes || (isArray(alternateBiddersList) && (alternateBiddersList[0] !== '*' && !alternateBiddersList.includes(responseBidder)))) {
        return true;
      }
    }

    return false;
  }

  function registerSyncs(responses, gdprConsent, uspConsent, gppConsent) {
    registerSyncInner(spec, responses, gdprConsent, uspConsent, gppConsent);
  }

  function filterAndWarn(bid) {
    if (!spec.isBidRequestValid(bid)) {
      logWarn(`Invalid bid sent to bidder ${spec.code}: ${JSON.stringify(bid)}`);
      return false;
    }
    return true;
  }
}

// Transition from 'fledge' to 'paapi'
// TODO: remove this in prebid 9
const PAAPI_RESPONSE_PROPS = ['paapiAuctionConfigs', 'fledgeAuctionConfigs'];
const RESPONSE_PROPS = ['bids'].concat(PAAPI_RESPONSE_PROPS);
function getPaapiConfigs(adapterResponse) {
  const [paapi, fledge] = PAAPI_RESPONSE_PROPS.map(prop => adapterResponse[prop]);
  if (paapi != null && fledge != null) {
    throw new Error(`Adapter response should use ${PAAPI_RESPONSE_PROPS[0]} over ${PAAPI_RESPONSE_PROPS[1]}, not both`);
  }
  return paapi ?? fledge;
}

/**
 * Run a set of bid requests - that entails converting them to HTTP requests, sending
 * them over the network, and parsing the responses.
 *
 * @param spec bid adapter spec
 * @param bids bid requests to run
 * @param bidderRequest the bid request object that `bids` is connected to
 * @param ajax ajax method to use
 * @param wrapCallback {function(callback)} a function used to wrap every callback (for the purpose of `config.currentBidder`)
 * @param onRequest {function({})} invoked once for each HTTP request built by the adapter - with the raw request
 * @param onResponse {function({})} invoked once on each successful HTTP response - with the raw response
 * @param onError {function(String, {})} invoked once for each HTTP error - with status code and response
 * @param onBid {function({})} invoked once for each bid in the response - with the bid as returned by interpretResponse
 * @param onCompletion {function()} invoked once when all bid requests have been processed
 */
export const processBidderRequests = hook('sync', function (spec, bids, bidderRequest, ajax, wrapCallback, {onRequest, onResponse, onPaapi, onError, onBid, onCompletion}) {
  const metrics = adapterMetrics(bidderRequest);
  onCompletion = metrics.startTiming('total').stopBefore(onCompletion);

  let requests = metrics.measureTime('buildRequests', () => spec.buildRequests(bids, bidderRequest));

  if (!requests || requests.length === 0) {
    onCompletion();
    return;
  }
  if (!Array.isArray(requests)) {
    requests = [requests];
  }

  const requestDone = delayExecution(onCompletion, requests.length);

  requests.forEach((request) => {
    const requestMetrics = metrics.fork();
    function addBid(bid) {
      if (bid != null) bid.metrics = requestMetrics.fork().renameWith();
      onBid(bid);
    }
    // If the server responds successfully, use the adapter code to unpack the Bids from it.
    // If the adapter code fails, no bids should be added. After all the bids have been added,
    // make sure to call the `requestDone` function so that we're one step closer to calling onCompletion().
    const onSuccess = wrapCallback(function(response, responseObj) {
      networkDone();
      try {
        response = JSON.parse(response);
      } catch (e) { /* response might not be JSON... that's ok. */ }

      // Make response headers available for #1742. These are lazy-loaded because most adapters won't need them.
      response = {
        body: response,
        headers: headerParser(responseObj)
      };
      onResponse(response);

      try {
        response = requestMetrics.measureTime('interpretResponse', () => spec.interpretResponse(response, request));
      } catch (err) {
        logError(`Bidder ${spec.code} failed to interpret the server's response. Continuing without bids`, null, err);
        requestDone();
        return;
      }

      // adapters can reply with:
      // a single bid
      // an array of bids
      // a BidderAuctionResponse object ({bids: [*], paapiAuctionConfigs: [*]})

      let bids, paapiConfigs;
      if (response && !Object.keys(response).some(key => !RESPONSE_PROPS.includes(key))) {
        bids = response.bids;
        paapiConfigs = getPaapiConfigs(response);
      } else {
        bids = response;
      }
      if (isArray(paapiConfigs)) {
        paapiConfigs.forEach(onPaapi);
      }
      if (bids) {
        if (isArray(bids)) {
          bids.forEach(addBid);
        } else {
          addBid(bids);
        }
      }
      requestDone();

      function headerParser(xmlHttpResponse) {
        return {
          get: responseObj.getResponseHeader.bind(responseObj)
        };
      }
    });

    const onFailure = wrapCallback(function (errorMessage, error) {
      networkDone();
      onError(errorMessage, error);
      requestDone();
    });

    onRequest(request);

    const networkDone = requestMetrics.startTiming('net');

    function getOptions(defaults) {
      const ro = request.options;
      return Object.assign(defaults, ro, {
        browsingTopics: ro?.hasOwnProperty('browsingTopics') && !ro.browsingTopics
          ? false
          : (bidderSettings.get(spec.code, 'topicsHeader') ?? true) && isActivityAllowed(ACTIVITY_TRANSMIT_UFPD, activityParams(MODULE_TYPE_BIDDER, spec.code))
      })
    }
    switch (request.method) {
      case 'GET':
        ajax(
          `${request.url}${formatGetParameters(request.data)}`,
          {
            success: onSuccess,
            error: onFailure
          },
          undefined,
          getOptions({
            method: 'GET',
            withCredentials: true
          })
        );
        break;
      case 'POST':
        ajax(
          request.url,
          {
            success: onSuccess,
            error: onFailure
          },
          typeof request.data === 'string' ? request.data : JSON.stringify(request.data),
          getOptions({
            method: 'POST',
            contentType: 'text/plain',
            withCredentials: true
          })
        );
        break;
      default:
        logWarn(`Skipping invalid request from ${spec.code}. Request type ${request.type} must be GET or POST`);
        requestDone();
    }

    function formatGetParameters(data) {
      if (data) {
        return `?${typeof data === 'object' ? parseQueryStringParameters(data) : data}`;
      }

      return '';
    }
  })
}, 'processBidderRequests')

export const registerSyncInner = hook('async', function(spec, responses, gdprConsent, uspConsent, gppConsent) {
  const aliasSyncEnabled = config.getConfig('userSync.aliasSyncEnabled');
  if (spec.getUserSyncs && (aliasSyncEnabled || !adapterManager.aliasRegistry[spec.code])) {
    let filterConfig = config.getConfig('userSync.filterSettings');
    let syncs = spec.getUserSyncs({
      iframeEnabled: !!(filterConfig && (filterConfig.iframe || filterConfig.all)),
      pixelEnabled: !!(filterConfig && (filterConfig.image || filterConfig.all)),
    }, responses, gdprConsent, uspConsent, gppConsent);
    if (syncs) {
      if (!Array.isArray(syncs)) {
        syncs = [syncs];
      }
      syncs.forEach((sync) => {
        userSync.registerSync(sync.type, spec.code, sync.url)
      });
      userSync.bidderDone(spec.code);
    }
  }
}, 'registerSyncs')

export const addComponentAuction = hook('sync', (request, fledgeAuctionConfig) => {
}, 'addComponentAuction');

// check that the bid has a width and height set
function validBidSize(adUnitCode, bid, {index = auctionManager.index} = {}) {
  if ((bid.width || parseInt(bid.width, 10) === 0) && (bid.height || parseInt(bid.height, 10) === 0)) {
    bid.width = parseInt(bid.width, 10);
    bid.height = parseInt(bid.height, 10);
    return true;
  }

  const bidRequest = index.getBidRequest(bid);
  const mediaTypes = index.getMediaTypes(bid);

  const sizes = (bidRequest && bidRequest.sizes) || (mediaTypes && mediaTypes.banner && mediaTypes.banner.sizes);
  const parsedSizes = parseSizesInput(sizes);

  // if a banner impression has one valid size, we assign that size to any bid
  // response that does not explicitly set width or height
  if (parsedSizes.length === 1) {
    const [ width, height ] = parsedSizes[0].split('x');
    bid.width = parseInt(width, 10);
    bid.height = parseInt(height, 10);
    return true;
  }

  return false;
}

// Validate the arguments sent to us by the adapter. If this returns false, the bid should be totally ignored.
export function isValid(adUnitCode, bid, {index = auctionManager.index} = {}) {
  function hasValidKeys() {
    let bidKeys = Object.keys(bid);
    return COMMON_BID_RESPONSE_KEYS.every(key => includes(bidKeys, key) && !includes([undefined, null], bid[key]));
  }

  function errorMessage(msg) {
    return `Invalid bid from ${bid.bidderCode}. Ignoring bid: ${msg}`;
  }

  if (!adUnitCode) {
    logWarn('No adUnitCode was supplied to addBidResponse.');
    return false;
  }

  if (!bid) {
    logWarn(`Some adapter tried to add an undefined bid for ${adUnitCode}.`);
    return false;
  }

  if (!hasValidKeys()) {
    logError(errorMessage(`Bidder ${bid.bidderCode} is missing required params. Check http://prebid.org/dev-docs/bidder-adapter-1.html for list of params.`));
    return false;
  }

  if (FEATURES.NATIVE && bid.mediaType === 'native' && !nativeBidIsValid(bid, {index})) {
    logError(errorMessage('Native bid missing some required properties.'));
    return false;
  }
  if (FEATURES.VIDEO && bid.mediaType === 'video' && !isValidVideoBid(bid, {index})) {
    logError(errorMessage(`Video bid does not have required vastUrl or renderer property`));
    return false;
  }
  if (bid.mediaType === 'banner' && !validBidSize(adUnitCode, bid, {index})) {
    logError(errorMessage(`Banner bids require a width and height`));
    return false;
  }

  return true;
}

function adapterMetrics(bidderRequest) {
  return useMetrics(bidderRequest.metrics).renameWith(n => [`adapter.client.${n}`, `adapters.client.${bidderRequest.bidderCode}.${n}`])
}
