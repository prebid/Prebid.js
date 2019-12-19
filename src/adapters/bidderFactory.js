import Adapter from '../adapter';
import adapterManager from '../adapterManager';
import { config } from '../config';
import { createBid } from '../bidfactory';
import { userSync } from '../userSync';
import { nativeBidIsValid } from '../native';
import { isValidVideoBid } from '../video';
import CONSTANTS from '../constants.json';
import events from '../events';
import includes from 'core-js/library/fn/array/includes';
import { ajax } from '../ajax';
import { logWarn, logError, parseQueryStringParameters, delayExecution, parseSizesInput, getBidderRequest, flatten, uniques, timestamp, setDataInLocalStorage, getDataFromLocalStorage, deepAccess, isArray } from '../utils';
import { ADPOD } from '../mediaTypes';
import { getHook } from '../hook';

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
 */

/**
 * @typedef {object} BidderSpec An object containing the adapter-specific functions needed to
 * make a Bidder.
 *
 * @property {string} code A code which will be used to uniquely identify this bidder. This should be the same
 *   one as is used in the call to registerBidAdapter
 * @property {string[]} [aliases] A list of aliases which should also resolve to this bidder.
 * @property {MediaType[]} [supportedMediaTypes]: A list of Media Types which the adapter supports.
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
 * @property {{get: function(string): string} headers The response headers.
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
 * @property {string} [meta.iabSubCatId] The IAB subcategory ID
 * @property [Renderer] renderer A Renderer which can be used as a default for this bid,
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
const COMMON_BID_RESPONSE_KEYS = ['requestId', 'cpm', 'ttl', 'creativeId', 'netRevenue', 'currency'];

const DEFAULT_REFRESHIN_DAYS = 1;

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
      adapterManager.aliasRegistry[alias] = spec.code;
      putBidder(Object.assign({}, spec, { code: alias }));
    });
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
      return Object.freeze(spec);
    },
    registerSyncs,
    callBids: function(bidderRequest, addBidResponse, done, ajax, onTimelyResponse, configEnabledCallback) {
      if (!Array.isArray(bidderRequest.bids)) {
        return;
      }

      const adUnitCodesHandled = {};
      function addBidWithCode(adUnitCode, bid) {
        adUnitCodesHandled[adUnitCode] = true;
        if (isValid(adUnitCode, bid, [bidderRequest])) {
          addBidResponse(adUnitCode, bid);
        }
      }

      // After all the responses have come back, call done() and
      // register any required usersync pixels.
      const responses = [];
      function afterAllResponses() {
        done();
        events.emit(CONSTANTS.EVENTS.BIDDER_DONE, bidderRequest);
        registerSyncs(responses, bidderRequest.gdprConsent, bidderRequest.uspConsent);
      }

      const validBidRequests = bidderRequest.bids.filter(filterAndWarn);
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

      let requests = spec.buildRequests(validBidRequests, bidderRequest);
      if (!requests || requests.length === 0) {
        afterAllResponses();
        return;
      }
      if (!Array.isArray(requests)) {
        requests = [requests];
      }

      // Callbacks don't compose as nicely as Promises. We should call done() once _all_ the
      // Server requests have returned and been processed. Since `ajax` accepts a single callback,
      // we need to rig up a function which only executes after all the requests have been responded.
      const onResponse = delayExecution(configEnabledCallback(afterAllResponses), requests.length)
      requests.forEach(processRequest);

      function formatGetParameters(data) {
        if (data) {
          return `?${typeof data === 'object' ? parseQueryStringParameters(data) : data}`;
        }

        return '';
      }

      function processRequest(request) {
        switch (request.method) {
          case 'GET':
            ajax(
              `${request.url}${formatGetParameters(request.data)}`,
              {
                success: configEnabledCallback(onSuccess),
                error: onFailure
              },
              undefined,
              Object.assign({
                method: 'GET',
                withCredentials: true
              }, request.options)
            );
            break;
          case 'POST':
            ajax(
              request.url,
              {
                success: configEnabledCallback(onSuccess),
                error: onFailure
              },
              typeof request.data === 'string' ? request.data : JSON.stringify(request.data),
              Object.assign({
                method: 'POST',
                contentType: 'text/plain',
                withCredentials: true
              }, request.options)
            );
            break;
          default:
            logWarn(`Skipping invalid request from ${spec.code}. Request type ${request.type} must be GET or POST`);
            onResponse();
        }

        // If the server responds successfully, use the adapter code to unpack the Bids from it.
        // If the adapter code fails, no bids should be added. After all the bids have been added, make
        // sure to call the `onResponse` function so that we're one step closer to calling done().
        function onSuccess(response, responseObj) {
          onTimelyResponse(spec.code);

          try {
            response = JSON.parse(response);
          } catch (e) { /* response might not be JSON... that's ok. */ }

          // Make response headers available for #1742. These are lazy-loaded because most adapters won't need them.
          response = {
            body: response,
            headers: headerParser(responseObj)
          };
          responses.push(response);

          let bids;
          try {
            bids = spec.interpretResponse(response, request);
          } catch (err) {
            logError(`Bidder ${spec.code} failed to interpret the server's response. Continuing without bids`, null, err);
            onResponse();
            return;
          }

          if (bids) {
            if (isArray(bids)) {
              bids.forEach(addBidUsingRequestMap);
            } else {
              addBidUsingRequestMap(bids);
            }
          }
          onResponse(bids);

          function addBidUsingRequestMap(bid) {
            const bidRequest = bidRequestMap[bid.requestId];
            if (bidRequest) {
              // creating a copy of original values as cpm and currency are modified later
              bid.originalCpm = bid.cpm;
              bid.originalCurrency = bid.currency;
              const prebidBid = Object.assign(createBid(CONSTANTS.STATUS.GOOD, bidRequest), bid);
              addBidWithCode(bidRequest.adUnitCode, prebidBid);
            } else {
              logWarn(`Bidder ${spec.code} made bid for unknown request ID: ${bid.requestId}. Ignoring.`);
            }
          }

          function headerParser(xmlHttpResponse) {
            return {
              get: responseObj.getResponseHeader.bind(responseObj)
            };
          }
        }

        // If the server responds with an error, there's not much we can do. Log it, and make sure to
        // call onResponse() so that we're one step closer to calling done().
        function onFailure(err) {
          onTimelyResponse(spec.code);

          logError(`Server call for ${spec.code} failed: ${err}. Continuing without bids.`);
          onResponse();
        }
      }
    }
  });

  function registerSyncs(responses, gdprConsent, uspConsent) {
    if (spec.getUserSyncs && !adapterManager.aliasRegistry[spec.code]) {
      let filterConfig = config.getConfig('userSync.filterSettings');
      let syncs = spec.getUserSyncs({
        iframeEnabled: !!(filterConfig && (filterConfig.iframe || filterConfig.all)),
        pixelEnabled: !!(filterConfig && (filterConfig.image || filterConfig.all)),
      }, responses, gdprConsent, uspConsent);
      if (syncs) {
        if (!Array.isArray(syncs)) {
          syncs = [syncs];
        }
        syncs.forEach((sync) => {
          userSync.registerSync(sync.type, spec.code, sync.url)
        });
      }
    }
  }

  function filterAndWarn(bid) {
    if (!spec.isBidRequestValid(bid)) {
      logWarn(`Invalid bid sent to bidder ${spec.code}: ${JSON.stringify(bid)}`);
      return false;
    }
    return true;
  }
}

export function preloadBidderMappingFile(fn, adUnits) {
  if (!config.getConfig('adpod.brandCategoryExclusion')) {
    return fn.call(this, adUnits);
  }
  let adPodBidders = adUnits
    .filter((adUnit) => deepAccess(adUnit, 'mediaTypes.video.context') === ADPOD)
    .map((adUnit) => adUnit.bids.map((bid) => bid.bidder))
    .reduce(flatten, [])
    .filter(uniques);

  adPodBidders.forEach(bidder => {
    let bidderSpec = adapterManager.getBidAdapter(bidder);
    if (bidderSpec.getSpec().getMappingFileInfo) {
      let info = bidderSpec.getSpec().getMappingFileInfo();
      let refreshInDays = (info.refreshInDays) ? info.refreshInDays : DEFAULT_REFRESHIN_DAYS;
      let key = (info.localStorageKey) ? info.localStorageKey : bidderSpec.getSpec().code;
      let mappingData = getDataFromLocalStorage(key);
      if (!mappingData || timestamp() < mappingData.lastUpdated + refreshInDays * 24 * 60 * 60 * 1000) {
        ajax(info.url,
          {
            success: (response) => {
              try {
                response = JSON.parse(response);
                let mapping = {
                  lastUpdated: timestamp(),
                  mapping: response.mapping
                }
                setDataInLocalStorage(key, JSON.stringify(mapping));
              } catch (error) {
                logError(`Failed to parse ${bidder} bidder translation mapping file`);
              }
            },
            error: () => {
              logError(`Failed to load ${bidder} bidder translation file`)
            }
          },
        );
      }
    }
  });
  fn.call(this, adUnits);
}

getHook('checkAdUnitSetup').before(preloadBidderMappingFile);

/**
 * Reads the data stored in localstorage and returns iab subcategory
 * @param {string} bidderCode bidderCode
 * @param {string} category bidders category
 */
export function getIabSubCategory(bidderCode, category) {
  let bidderSpec = adapterManager.getBidAdapter(bidderCode);
  if (bidderSpec.getSpec().getMappingFileInfo) {
    let info = bidderSpec.getSpec().getMappingFileInfo();
    let key = (info.localStorageKey) ? info.localStorageKey : bidderSpec.getBidderCode();
    let data = getDataFromLocalStorage(key);
    if (data) {
      try {
        data = JSON.parse(data);
      } catch (error) {
        logError(`Failed to parse ${bidderCode} mapping data stored in local storage`);
      }
      return (data.mapping[category]) ? data.mapping[category] : null;
    }
  }
}

// check that the bid has a width and height set
function validBidSize(adUnitCode, bid, bidRequests) {
  if ((bid.width || parseInt(bid.width, 10) === 0) && (bid.height || parseInt(bid.height, 10) === 0)) {
    bid.width = parseInt(bid.width, 10);
    bid.height = parseInt(bid.height, 10);
    return true;
  }

  const adUnit = getBidderRequest(bidRequests, bid.bidderCode, adUnitCode);

  const sizes = adUnit && adUnit.bids && adUnit.bids[0] && adUnit.bids[0].sizes;
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
export function isValid(adUnitCode, bid, bidRequests) {
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

  if (bid.mediaType === 'native' && !nativeBidIsValid(bid, bidRequests)) {
    logError(errorMessage('Native bid missing some required properties.'));
    return false;
  }
  if (bid.mediaType === 'video' && !isValidVideoBid(bid, bidRequests)) {
    logError(errorMessage(`Video bid does not have required vastUrl or renderer property`));
    return false;
  }
  if (bid.mediaType === 'banner' && !validBidSize(adUnitCode, bid, bidRequests)) {
    logError(errorMessage(`Banner bids require a width and height`));
    return false;
  }

  return true;
}
