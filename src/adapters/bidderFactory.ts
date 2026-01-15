import Adapter from '../adapter.js';
import adapterManager, {
  type BidderRequest,
  type BidRequest,
  type ClientBidderRequest
} from '../adapterManager.js';
import {config} from '../config.js';
import {BannerBid, Bid, BidResponse, createBid} from '../bidfactory.js';
import {type SyncType, userSync} from '../userSync.js';
import {nativeBidIsValid} from '../native.js';
import {isValidVideoBid} from '../video.js';
import {EVENTS, REJECTION_REASON, DEBUG_MODE} from '../constants.js';
import * as events from '../events.js';

import {
  delayExecution,
  isArray,
  isPlainObject,
  logError,
  logWarn,
  memoize,
  parseQueryStringParameters,
  parseSizesInput,
  pick,
  uniques,
  isGzipCompressionSupported,
  compressDataWithGZip,
  getParameterByName,
  debugTurnedOn
} from '../utils.js';
import {hook} from '../hook.js';
import {auctionManager} from '../auctionManager.js';
import {bidderSettings} from '../bidderSettings.js';
import {useMetrics} from '../utils/perfMetrics.js';
import {isActivityAllowed} from '../activities/rules.js';
import {activityParams} from '../activities/activityParams.js';
import {MODULE_TYPE_BIDDER} from '../activities/modules.js';
import {ACTIVITY_TRANSMIT_TID, ACTIVITY_TRANSMIT_UFPD} from '../activities/activities.js';
import type {AnyFunction, Wraps} from "../types/functions.d.ts";
import type {BidderCode, StorageDisclosure} from "../types/common.d.ts";
import type {Ajax, AjaxOptions, XHR} from "../ajax.ts";
import type {AddBidResponse} from "../auction.ts";
import type {MediaType} from "../mediaTypes.ts";
import {CONSENT_GDPR, CONSENT_GPP, CONSENT_USP, type ConsentData} from "../consentHandler.ts";

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
 * @typedef {object} ServerResponse
 *
 * @property {*} body The response body. If this is legal JSON, then it will be parsed. Otherwise it'll be a
 *   string with the body's content.
 * @property {{get: function(string): string}} headers The response headers.
 *   Call this like `ServerResponse.headers.get("Content-Type")`
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
const TIDS = {
  auctionId: (request) => request.ortb2?.source?.tid,
  transactionId: (request) => request.ortb2Imp?.ext?.tid
}

export interface AdapterRequest {
  url: string;
  data: any;
  method?: 'GET' | 'POST';
  options?: Omit<AjaxOptions, 'method'> & { endpointCompression?: boolean };
}

export interface ServerResponse {
  body: any;
  headers: {
    get(header: string): string;
  }
}

export interface ExtendedResponse {
  bids?: BidResponse[]
}

export type AdapterResponse = BidResponse | BidResponse[] | ExtendedResponse;

export type BidderError<B extends BidderCode> = {
  error: XHR;
  bidderRequest: BidderRequest<B>;
}

export interface BidderSpec<BIDDER extends BidderCode> extends StorageDisclosure {
  code: BIDDER;
  supportedMediaTypes?: readonly MediaType[];

  /**
   * General Vendorlist ID.
   * Required, if you want to handle bid requests under the GDPR legislation with the TCF (Transparency and Consent Framework).
   * @see https://iabeurope.eu/tcf-for-vendors/
   */
  gvlid?: number;
  aliases?: readonly (BidderCode | { code: BidderCode, gvlid?: number, skipPbsAliasing?: boolean })[];
  isBidRequestValid(request: BidRequest<BIDDER>): boolean;
  buildRequests(validBidRequests: BidRequest<BIDDER>[], bidderRequest: ClientBidderRequest<BIDDER>): AdapterRequest | AdapterRequest[];
  interpretResponse(response: ServerResponse, request: AdapterRequest): AdapterResponse;
  onBidWon?: (bid: Bid) => void;
  onBidBillable?: (bid: Bid) => void;
  onBidderError?: (error: BidderError<BIDDER>) => void;
  onBidViewable?: (bid: Bid) => void;
  onSetTargeting?: (bid: Bid) => void;
  onAdRenderSucceeded?: (bid: Bid) => void;
  onDataDeletionRequest?: (bidderRequests: BidderRequest<BIDDER>[], cmpRegisterDeletionResponse: any) => void;
  onTimeout?: (bidRequests: (BidRequest<BIDDER> & { timeout: number })[]) => void;
  getUserSyncs?: (
    syncOptions: {
      iframeEnabled: boolean;
      pixelEnabled: boolean;
    },
    responses: ServerResponse[],
    gdprConsent: null | ConsentData[typeof CONSENT_GDPR],
    uspConsent: null | ConsentData[typeof CONSENT_USP],
    gppConsent: null | ConsentData[typeof CONSENT_GPP]
  ) => ({ type: SyncType, url: string })[];
  alwaysHasCapacity?: boolean;
}

export type BidAdapter = {
  callBids: ReturnType<typeof newBidder>['callBids']
}

/**
 * Register a bidder with prebid, using the given spec.
 *
 * If possible, Adapter modules should use this function instead of adapterManager.registerBidAdapter().
 *
 * @param {BidderSpec} spec An object containing the bare-bones functions we need to make a Bidder.
 */
export function registerBidder<B extends BidderCode>(spec: BidderSpec<B>) {
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
      let aliasCode: string = alias as any;
      let gvlid;
      let skipPbsAliasing;
      if (isPlainObject(alias)) {
        aliasCode = alias.code as string;
        gvlid = alias.gvlid;
        skipPbsAliasing = alias.skipPbsAliasing
      }
      adapterManager.aliasRegistry[aliasCode] = spec.code;
      putBidder(Object.assign({}, spec, { code: aliasCode, gvlid, skipPbsAliasing }));
    });
  }
}

export const guardTids: any = memoize(({bidderCode}) => {
  const tidsAllowed = isActivityAllowed(ACTIVITY_TRANSMIT_TID, activityParams(MODULE_TYPE_BIDDER, bidderCode));
  function get(target, prop, receiver) {
    if (TIDS.hasOwnProperty(prop)) {
      return tidsAllowed ? TIDS[prop](target) : null;
    }
    return Reflect.get(target, prop, receiver);
  }
  function privateAccessProxy(target, handler) {
    const proxy = new Proxy(target, handler);
    // always allow methods (such as getFloor) private access to TIDs
    Object.entries(target)
      .filter(([_, v]) => typeof v === 'function')
      .forEach(([prop, fn]: [string, AnyFunction]) => {
        proxy[prop] = fn.bind(target);
      });
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
});

declare module '../events' {
  interface Events {
    /**
     * Fired once for each bidder in each auction (or twice if the bidder is configured for both client and s2s),
     * after processing for that bidder (for that auction) is complete.
     */
    [EVENTS.BIDDER_DONE]: [BidderRequest<BidderCode>];
    /**
     * Fired just before a client bid adapter makes an HTTP request to its exchange.
     */
    [EVENTS.BEFORE_BIDDER_HTTP]: [BidderRequest<BidderCode>, AdapterRequest]
    /**
     * Fired when a bid adapter's HTTP request results in something other than HTTP 2xx or 304.
     * In the case of Prebid Server, this is repeated for each s2s bidder.
     */
    [EVENTS.BIDDER_ERROR]: [BidderError<BidderCode>];
  }
}

/**
 * Make a new bidder from the given spec. This is exported mainly for testing.
 * Adapters will probably find it more convenient to use registerBidder instead.
 *
 * @param {BidderSpec} spec
 */
export function newBidder<B extends BidderCode>(spec: BidderSpec<B>) {
  return Object.assign(Adapter(spec.code), {
    getSpec: function(): BidderSpec<B> {
      return Object.freeze(Object.assign({}, spec));
    },
    registerSyncs,
    callBids: function(
      bidderRequest: ClientBidderRequest<B>,
      addBidResponse: AddBidResponse,
      done: () => void,
      ajax: Ajax,
      onTimelyResponse: (bidder: BidderCode) => void,
      configEnabledCallback: <T extends AnyFunction>(fn: T) => Wraps<T>
    ) {
      if (!Array.isArray(bidderRequest.bids)) {
        return;
      }
      const tidGuard = guardTids(bidderRequest);

      const adUnitCodesHandled = {};
      function addBidWithCode(adUnitCode: string, bid: Bid) {
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
      });

      processBidderRequests(spec, validBidRequests as any, bidderRequest, ajax, configEnabledCallback, {
        onRequest: requestObject => events.emit(EVENTS.BEFORE_BIDDER_HTTP, bidderRequest, requestObject),
        onResponse: (resp) => {
          onTimelyResponse(spec.code);
          responses.push(resp)
        },
        onPaapi: (paapiConfig: any) => {
          const bidRequest = bidRequestMap[paapiConfig.bidId];
          if (bidRequest) {
            addPaapiConfig(bidRequest, paapiConfig);
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
          logError(`Server call for ${spec.code} failed: ${errorMessage} ${error.status}. Continuing without bids.`, {bidRequests: validBidRequests});
        },
        onBid: (bidResponse) => {
          const bidRequest = bidRequestMap[bidResponse.requestId];
          const bid = bidResponse as Bid;
          if (bidRequest) {
            bid.adapterCode = bidRequest.bidder;
            if (isInvalidAlternateBidder(bidResponse.bidderCode, bidRequest.bidder)) {
              logWarn(`${bidResponse.bidderCode} is not a registered partner or known bidder of ${bidRequest.bidder}, hence continuing without bid. If you wish to support this bidder, please mark allowAlternateBidderCodes as true in bidderSettings.`);
              addBidResponse.reject(bidRequest.adUnitCode, bidResponse, REJECTION_REASON.BIDDER_DISALLOWED)
              return;
            }
            // creating a copy of original values as cpm and currency are modified later
            bid.originalCpm = bidResponse.cpm;
            bid.originalCurrency = bidResponse.currency;
            bid.meta = bidResponse.meta || Object.assign({}, bidResponse[bidRequest.bidder]);
            bid.deferBilling = bidRequest.deferBilling;
            bid.deferRendering = bid.deferBilling && (bidResponse.deferRendering ?? typeof spec.onBidBillable !== 'function');
            const prebidBid: Bid = Object.assign(createBid(bidRequest), bid, pick(bidRequest, Object.keys(TIDS)));
            addBidWithCode(bidRequest.adUnitCode, prebidBid);
          } else {
            logWarn(`Bidder ${spec.code} made bid for unknown request ID: ${bidResponse.requestId}. Ignoring.`);
            addBidResponse.reject(null, bidResponse, REJECTION_REASON.INVALID_REQUEST_ID);
          }
        },
        onCompletion: afterAllResponses,
      });
    }
  });

  function isInvalidAlternateBidder(responseBidder, requestBidder) {
    const allowAlternateBidderCodes = bidderSettings.get(requestBidder, 'allowAlternateBidderCodes') || false;
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

const RESPONSE_PROPS = ['bids', 'paapi']
/**
 * Run a set of bid requests - that entails converting them to HTTP requests, sending
 * them over the network, and parsing the responses.
 *
 * @param spec bid adapter spec
 * @param bids bid requests to run
 * @param bidderRequest the bid request object that `bids` is connected to
 * @param ajax ajax method to use
 * @param wrapCallback a function used to wrap every callback (for the purpose of `config.currentBidder`)
 */
export const processBidderRequests = hook('async', function<B extends BidderCode>(
  spec: BidderSpec<B>,
  bids: BidRequest<B>[],
  bidderRequest: ClientBidderRequest<B>,
  ajax: Ajax,
  wrapCallback: <T extends AnyFunction>(fn: T) => Wraps<T>,
  {onRequest, onResponse, onPaapi, onError, onBid, onCompletion}: {
    /**
     * invoked once for each HTTP request built by the adapter - with the raw request
     */
    onRequest: (request: AdapterRequest) => void;
    /**
     * invoked once on each successful HTTP response - with the raw response
     */
    onResponse: (response: ServerResponse) => void;
    /**
     * invoked once for each HTTP error - with status description and response
     */
    onError: (errorMessage: string, xhr: XHR) => void;
    /**
     *  invoked once for each bid in the response - with the bid as returned by interpretResponse
     */
    onBid: (bid: BidResponse) => void;
    /**
     * invoked once with each member of the adapter response's 'paapi' array.
     */
    onPaapi: (paapi: unknown) => void;
    /**
     * invoked once when all bid requests have been processed
     */
    onCompletion: () => void;
  }) {
  const metrics = adapterMetrics(bidderRequest);
  onCompletion = metrics.startTiming('total').stopBefore(onCompletion);
  const tidGuard = guardTids(bidderRequest);
  let requests = metrics.measureTime('buildRequests', () => spec.buildRequests(bids.map(tidGuard.bidRequest), tidGuard.bidderRequest(bidderRequest))) as AdapterRequest[];
  if (!Array.isArray(requests)) {
    requests = [requests];
  }

  if (!requests || requests.length === 0) {
    onCompletion();
    return;
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
      // a BidderAuctionResponse object

      let bids, paapiConfigs;
      if (response && !Object.keys(response).some(key => !RESPONSE_PROPS.includes(key))) {
        bids = response.bids;
        paapiConfigs = response.paapi;
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

    const debugMode = getParameterByName(DEBUG_MODE).toUpperCase() === 'TRUE' || debugTurnedOn();

    function getOptions(defaults) {
      const ro = request.options;
      return Object.assign(defaults, ro, {
        browsingTopics: ro?.hasOwnProperty('browsingTopics') && !ro.browsingTopics
          ? false
          : (bidderSettings.get(spec.code, 'topicsHeader') ?? true) && isActivityAllowed(ACTIVITY_TRANSMIT_UFPD, activityParams(MODULE_TYPE_BIDDER, spec.code)),
        suppressTopicsEnrollmentWarning: ro?.hasOwnProperty('suppressTopicsEnrollmentWarning')
          ? ro.suppressTopicsEnrollmentWarning
          : !debugMode
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
        const enableGZipCompression = request.options?.endpointCompression;
        const callAjax = ({ url, payload }) => {
          ajax(
            url,
            {
              success: onSuccess,
              error: onFailure
            },
            payload,
            getOptions({
              method: 'POST',
              contentType: 'text/plain',
              withCredentials: true
            })
          );
        };

        if (enableGZipCompression && debugMode) {
          logWarn(`Skipping GZIP compression for ${spec.code} as debug mode is enabled`);
        }

        if (enableGZipCompression && !debugMode && isGzipCompressionSupported()) {
          compressDataWithGZip(request.data).then(compressedPayload => {
            const url = new URL(request.url);
            if (!url.searchParams.has('gzip')) {
              url.searchParams.set('gzip', '1');
            }
            callAjax({ url: url.href, payload: compressedPayload });
          });
        } else {
          callAjax({ url: request.url, payload: typeof request.data === 'string' ? request.data : JSON.stringify(request.data) });
        }
        break;
      default:
        logWarn(`Skipping invalid request from ${spec.code}. Request type ${request.method} must be GET or POST`);
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

export const registerSyncInner = hook('async', function(spec: BidderSpec<BidderCode>, responses, gdprConsent, uspConsent, gppConsent) {
  const aliasSyncEnabled = config.getConfig('userSync.aliasSyncEnabled');
  if (spec.getUserSyncs && (aliasSyncEnabled || !adapterManager.aliasRegistry[spec.code])) {
    let syncs = spec.getUserSyncs({
      iframeEnabled: userSync.canBidderRegisterSync('iframe', spec.code),
      pixelEnabled: userSync.canBidderRegisterSync('image', spec.code),
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

export const addPaapiConfig = hook('sync', (request, paapiConfig) => {
}, 'addPaapiConfig');

declare module '../bidfactory' {
  interface BannerBidProperties {
    width?: number;
    height?: number;
    wratio?: number;
    hratio?: number;
  }
}

// check that the bid has a width and height set
function validBidSize(adUnitCode, bid: BannerBid, {index = auctionManager.index} = {}) {
  if ((bid.width || parseInt(bid.width, 10) === 0) && (bid.height || parseInt(bid.height, 10) === 0)) {
    bid.width = parseInt(bid.width, 10);
    bid.height = parseInt(bid.height, 10);
    return true;
  }

  if (bid.wratio != null && bid.hratio != null) {
    bid.wratio = parseInt(bid.wratio, 10);
    bid.hratio = parseInt(bid.hratio, 10);
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
export function isValid(adUnitCode: string, bid: Bid, {index = auctionManager.index} = {}) {
  function hasValidKeys() {
    const bidKeys = Object.keys(bid);
    return COMMON_BID_RESPONSE_KEYS.every(key => bidKeys.includes(key) && ![undefined, null].includes(bid[key]));
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

export function adapterMetrics(bidderRequest) {
  return useMetrics(bidderRequest.metrics).renameWith(n => [`adapter.client.${n}`, `adapters.client.${bidderRequest.bidderCode}.${n}`])
}
