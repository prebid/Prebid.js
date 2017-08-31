import Adapter from 'src/adapter';
import bidmanager from 'src/bidmanager';
import bidfactory from 'src/bidfactory';
import { STATUS } from 'src/constants';

import { ajax, GET, POST } from 'src/ajax';
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
 * const adapter = newBidder({
 *   code: 'myBidderCode',
 *   areParamsValid: function(paramsObject) { return true/false },
 *   buildRequests: function(bidRequests) { return some ServerRequest(s) },
 *   interpretResponse: function(oneServerResponse) { return some Bids, or throw an error. }
 * });
 */

/**
 * This function aims to minimize the Adapter-specific code for "single request" Bidders. That is, if your adapter
 * only makes a single request to the server for bids, regardless of how many bid requests or ad units are in
 * the Auction, then this function is for you.
 *
 * @param {BidderSpec} spec An object containing the bare-bones functions we need to make a Bidder.
 */
export default function newBidder(spec) {
  return Object.assign(new Adapter(spec.code), {
    callBids: function(bidderRequest) {
      if (!Array.isArray(bidderRequest.bids)) {
        return;
      }

      // callBids must add a NO_BID response for _every_ placementCode, in order for the auction to
      // end properly. This map stores placement codes which we've made _real_ bids on.
      //
      // As we add _real_ bids to the bidmanager, we'll log the placementCodes here too. Once all the real
      // bids have been added, fillNoBids() can be called to end the auction.
      //
      // In Prebid 1.0, this will be simplified to use the `addBidResponse` and `done` callbacks.
      const placementCodesHandled = {};
      function addBidWithCode(placementCode, bid) {
        placementCodesHandled[placementCode] = true;
        bidmanager.addBidResponse(placementCode, bid);
      }
      function fillNoBids() {
        bidderRequest.bids
          .map(bidRequest => bidRequest.placementCode)
          .forEach(placementCode => {
            if (placementCode && !placementCodesHandled[placementCode]) {
              bidmanager.addBidResponse(placementCode, newEmptyBid());
            }
          });
      }

      const bidRequests = bidderRequest.bids.filter(filterAndWarn);
      if (bidRequests.length === 0) {
        fillNoBids();
        return;
      }
      const bidRequestMap = {};
      bidRequests.forEach(bid => {
        bidRequestMap[bid.bidId] = bid;
      });

      let requests = spec.buildRequests(bidRequests);
      if (!requests || requests.length === 0) {
        fillNoBids();
        return;
      }
      if (!Array.isArray(requests)) {
        requests = [requests];
      }

      // Callbacks don't compose as nicely as Promises. We should call fillNoBids() once _all_ the
      // Server requests have returned and been processed. Since `ajax` accepts a single callback,
      // we need to rig up a function which only executes after all the requests have been responded.
      const onResponse = delayExecution(fillNoBids, requests.length)
      requests.forEach(processRequest);

      function processRequest(request) {
        switch (request.type) {
          case GET:
            ajax(
              `${request.endpoint}?${parseQueryStringParameters(request.data)}`,
              {
                success: onSuccess,
                error: onFailure
              },
              undefined,
              {
                method: GET,
                withCredentials: true
              }
            );
            break;
          case POST:
            ajax(
              request.endpoint,
              {
                success: onSuccess,
                error: onFailure
              },
              typeof request.data === 'string' ? request.data : JSON.stringify(request.data),
              {
                method: POST,
                contentType: 'text/plain',
                withCredentials: true
              }
            );
            break;
          default:
            logWarn(`Skipping invalid request from ${spec.code}. Request type ${request.type} must be GET or POST`);
            onResponse();
        }
      }

      // If the server responds successfully, use the adapter code to unpack the Bids from it.
      // If the adapter code fails, no bids should be added. After all the bids have been added, make
      // sure to call the `onResponse` function so that we're one step closer to calling fillNoBids().
      function onSuccess(response) {
        function addBidUsingRequestMap(bid) {
          const bidRequest = bidRequestMap[bid.requestId];
          if (bidRequest) {
            const prebidBid = Object.assign(bidfactory.createBid(STATUS.GOOD, bidRequest), bid);
            addBidWithCode(bidRequest.placementCode, prebidBid);
          } else {
            logWarn(`Bidder ${spec.code} made bid for unknown request ID: ${bid.requestId}. Ignoring.`);
          }
        }

        let bids;
        try {
          bids = spec.interpretResponse(response);
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
      }

      // If the server responds with an error, there's not much we can do. Log it, and make sure to
      // call onResponse() so that we're one step closer to calling fillNoBids().
      function onFailure(err) {
        logError(`Server call for ${spec.code} failed: ${err}. Continuing without bids.`);
        onResponse();
      }
    }
  });

  function filterAndWarn(bid) {
    if (!spec.areParamsValid(bid.params)) {
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

/**
 * @typedef {object} ServerRequest
 *
 * @param {('GET'|'POST')} type The type of request which this is.
 * @param {string} endpoint The endpoint for the request. For example, "//bids.example.com".
 * @param {string|object} data Data to be sent in the request.
 *   If this is a GET request, they'll become query params. If it's a POST request, they'll be added to the body.
 *   Strings will be added as-is. Objects will be unpacked into query params based on key/value mappings, or
 *   JSON-serialized into the Request body.
 */

/**
 * @typedef {object} BidRequest
 *
 * @param {string} bidId A string which uniquely identifies this BidRequest in the current Auction.
 * @param {object} params Any bidder-specific params which the publisher used in their bid request.
 *   This is guaranteed to have passed the spec.areParamsValid() test.
 */

/**
 * @typedef {object} Bid
 *
 * @param {string} requestId The specific BidRequest which this bid is aimed at.
 *   This should correspond to one of the
 * @param {string} ad A URL which can be used to load this ad, if it's chosen by the publisher.
 * @param {number} cpm The bid price, in US cents per thousand impressions.
 * @param {number} height The height of the ad, in pixels.
 * @param {number} width The width of the ad, in pixels.
 *
 * @param [Renderer] renderer A Renderer which can be used as a default for this bid,
 *   if the publisher doesn't override it. This is only relevant for Outstream Video bids.
 */

/**
 * @typedef {object} BidderSpec An object containing the adapter-specific functions needed to
 * make a Bidder.
 *
 * @property {string} code A code which will be used to uniquely identify this bidder. This should be the same
 *   one as is used in the call to registerBidAdapter
 * @property {function(object): boolean} areParamsValid Determines whether or not the given object has all the params
 *   needed to make a valid request.
 * @property {function(BidRequest[]): ServerRequest|ServerRequest[]} buildRequests Build the request to the Server which
 *   requests Bids for the given array of Requests. Each BidRequest in the argument array is guaranteed to have
 *   a "params" property which has passed the areParamsValid() test
 * @property {function(*): Bid[]} interpretResponse Given a successful response from the Server, interpret it
 *   and return the Bid objects. This function will be run inside a try/catch. If it throws any errors, your
 *   bids will be discarded.
 * @property {function(): UserSyncInfo[]} fetchUserSyncs
 */

/**
 * TODO: Move this to the UserSync module after that PR is merged.
 *
 * @typedef {object} UserSyncInfo
 *
 * @param {('image'|'iframe')} type The type of user sync to be done.
 * @param {string} url The URL which makes the sync happen.
 */
