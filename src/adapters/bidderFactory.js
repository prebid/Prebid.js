import Adapter from 'src/adapter';
import adaptermanager from 'src/adaptermanager';
import { config } from 'src/config';
import { ajax } from 'src/ajax';
import bidmanager from 'src/bidmanager';
import bidfactory from 'src/bidfactory';
import { STATUS } from 'src/constants';
import { userSync } from 'src/userSync';

import { logWarn, logError, parseQueryStringParameters, delayExecution } from 'src/utils';

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
 *   buildRequests: function(bidRequests) { return some ServerRequest(s) },
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
 * @property {function(BidRequest[]): ServerRequest|ServerRequest[]} buildRequests Build the request to the Server
 *   which requests Bids for the given array of Requests. Each BidRequest in the argument array is guaranteed to have
 *   passed the isBidRequestValid() test.
 * @property {function(*, BidRequest): Bid[]} interpretResponse Given a successful response from the Server,
 *   interpret it and return the Bid objects. This function will be run inside a try/catch.
 *   If it throws any errors, your bids will be discarded.
 * @property {function(SyncOptions, Array): UserSync[]} [getUserSyncs] Given an array of all the responses
 *   from the server, determine which user syncs should occur. The argument array will contain every element
 *   which has been sent through to interpretResponse. The order of syncs in this array matters. The most
 *   important ones should come first, since publishers may limit how many are dropped on their page.
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
 *   If this is a GET request, they'll become query params. If it's a POST request, they'll be added to the body.
 *   Strings will be added as-is. Objects will be unpacked into query params based on key/value mappings, or
 *   JSON-serialized into the Request body.
 */

/**
 * @typedef {object} Bid
 *
 * @property {string} requestId The specific BidRequest which this bid is aimed at.
 *   This should correspond to one of the
 * @property {string} ad A URL which can be used to load this ad, if it's chosen by the publisher.
 * @property {string} currency The currency code for the cpm value
 * @property {number} cpm The bid price, in US cents per thousand impressions.
 * @property {number} height The height of the ad, in pixels.
 * @property {number} width The width of the ad, in pixels.
 *
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

/**
 * Register a bidder with prebid, using the given spec.
 *
 * If possible, Adapter modules should use this function instead of adaptermanager.registerBidAdapter().
 *
 * @param {BidderSpec} spec An object containing the bare-bones functions we need to make a Bidder.
 */
export function registerBidder(spec) {
  const mediaTypes = Array.isArray(spec.supportedMediaTypes)
    ? { supportedMediaTypes: spec.supportedMediaTypes }
    : undefined;
  function putBidder(spec) {
    const bidder = newBidder(spec);
    adaptermanager.registerBidAdapter(bidder, spec.code, mediaTypes);
  }

  putBidder(spec);
  if (Array.isArray(spec.aliases)) {
    spec.aliases.forEach(alias => {
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
    callBids: function(bidderRequest) {
      if (!Array.isArray(bidderRequest.bids)) {
        return;
      }

      // callBids must add a NO_BID response for _every_ AdUnit code, in order for the auction to
      // end properly. This map stores placement codes which we've made _real_ bids on.
      //
      // As we add _real_ bids to the bidmanager, we'll log the ad unit codes here too. Once all the real
      // bids have been added, fillNoBids() can be called to add NO_BID bids for any extra ad units, which
      // will end the auction.
      //
      // In Prebid 1.0, this will be simplified to use the `addBidResponse` and `done` callbacks.
      const adUnitCodesHandled = {};
      function addBidWithCode(adUnitCode, bid) {
        adUnitCodesHandled[adUnitCode] = true;
        bidmanager.addBidResponse(adUnitCode, bid);
      }
      function fillNoBids() {
        bidderRequest.bids
          .map(bidRequest => bidRequest.placementCode)
          .forEach(adUnitCode => {
            if (adUnitCode && !adUnitCodesHandled[adUnitCode]) {
              bidmanager.addBidResponse(adUnitCode, newEmptyBid());
            }
          });
      }

      // After all the responses have come back, fill up the "no bid" bids and
      // register any required usersync pixels.
      const responses = [];
      function afterAllResponses() {
        fillNoBids();
        if (spec.getUserSyncs) {
          let syncs = spec.getUserSyncs({
            iframeEnabled: config.getConfig('userSync.iframeEnabled'),
            pixelEnabled: config.getConfig('userSync.pixelEnabled'),
          }, responses);
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

      const bidRequests = bidderRequest.bids.filter(filterAndWarn);
      if (bidRequests.length === 0) {
        afterAllResponses();
        return;
      }
      const bidRequestMap = {};
      bidRequests.forEach(bid => {
        bidRequestMap[bid.bidId] = bid;
      });

      let requests = spec.buildRequests(bidRequests, bidderRequest);
      if (!requests || requests.length === 0) {
        afterAllResponses();
        return;
      }
      if (!Array.isArray(requests)) {
        requests = [requests];
      }

      // Callbacks don't compose as nicely as Promises. We should call fillNoBids() once _all_ the
      // Server requests have returned and been processed. Since `ajax` accepts a single callback,
      // we need to rig up a function which only executes after all the requests have been responded.
      const onResponse = delayExecution(afterAllResponses, requests.length)
      requests.forEach(processRequest);

      function processRequest(request) {
        switch (request.method) {
          case 'GET':
            ajax(
              `${request.url}?${typeof request.data === 'object' ? parseQueryStringParameters(request.data) : request.data}`,
              {
                success: onSuccess,
                error: onFailure
              },
              undefined,
              {
                method: 'GET',
                withCredentials: true
              }
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
              {
                method: 'POST',
                contentType: 'text/plain',
                withCredentials: true
              }
            );
            break;
          default:
            logWarn(`Skipping invalid request from ${spec.code}. Request type ${request.type} must be GET or POST`);
            onResponse();
        }

        // If the server responds successfully, use the adapter code to unpack the Bids from it.
        // If the adapter code fails, no bids should be added. After all the bids have been added, make
        // sure to call the `onResponse` function so that we're one step closer to calling fillNoBids().
        function onSuccess(response) {
          try {
            response = JSON.parse(response);
          } catch (e) { /* response might not be JSON... that's ok. */ }
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
            if (bids.forEach) {
              bids.forEach(addBidUsingRequestMap);
            } else {
              addBidUsingRequestMap(bids);
            }
          }
          onResponse();

          function addBidUsingRequestMap(bid) {
            const bidRequest = bidRequestMap[bid.requestId];
            if (bidRequest) {
              const prebidBid = Object.assign(bidfactory.createBid(STATUS.GOOD, bidRequest), bid);
              addBidWithCode(bidRequest.placementCode, prebidBid);
            } else {
              logWarn(`Bidder ${spec.code} made bid for unknown request ID: ${bid.requestId}. Ignoring.`);
            }
          }
        }

        // If the server responds with an error, there's not much we can do. Log it, and make sure to
        // call onResponse() so that we're one step closer to calling fillNoBids().
        function onFailure(err) {
          logError(`Server call for ${spec.code} failed: ${err}. Continuing without bids.`);
          onResponse();
        }
      }
    }
  });

  function filterAndWarn(bid) {
    if (!spec.isBidRequestValid(bid)) {
      logWarn(`Invalid bid sent to bidder ${spec.code}: ${JSON.stringify(bid)}`);
      return false;
    }
    return true;
  }

  function newEmptyBid() {
    const bid = bidfactory.createBid(STATUS.NO_BID);
    bid.code = spec.code;
    bid.bidderCode = spec.code;
    return bid;
  }
}
