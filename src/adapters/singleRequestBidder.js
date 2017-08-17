import Adapter from 'src/adapter';
import bidmanager from 'src/bidmanager';
import bidfactory from 'src/bidfactory';
import { STATUS } from 'src/constants';

import { ajax, GET, POST } from 'src/ajax';
import { logWarn, logError, parseQueryStringParameters } from 'src/utils';

/**
 * This file supports bidders which follow a "single request architecture."
 * That is, they take _all_ the bid request data, make a single request to the server, and receive a
 * response containing _all_ the bids.
 *
 * Typical usage looks something like:
 *
 * const adapter = newBidder({
 *   code: 'myBidderCode',
 *   areParamsValid: function(paramsObject) { return true/false },
 *   buildRequest: function(bidRequests) { return some ServerRequest },
 *   interpretResponse: function(anything) { return some Bids, or throw an error. }
 * });
 */

/**
 * This function aims to minimize the Adapter-specific code for "single request" Bidders. That is, if your adapter
 * only makes a single request to the server for bids, regardless of how many bid requests or ad units are in
 * the Auction, then this function is for you.
 *
 * @param {SingleRequestBidder} spec An object containing the bare-bones functions we need to make a Bidder.
 */
export function newBidder(spec) {
  return Object.assign(new Adapter(spec.code), {
    callBids: function(bidsRequest) {
      if (!bidsRequest.bids || !bidsRequest.bids.filter) {
        return;
      }
      const bidRequests = bidsRequest.bids.filter(filterAndWarn);
      if (bidRequests.length === 0) {
        return;
      }
      const request = spec.buildRequest(bidRequests);

      function onSuccess(response) {
        const bidRequestMap = {};
        bidRequests.forEach(bid => {
          bidRequestMap[bid.bidId] = bid;
        })

        let bids;
        try {
          bids = spec.interpretResponse(response);
        } catch (err) {
          logError(`Bidder ${spec.code} failed to interpret the server's response. Continuing without bids`, null, err);
          addEmptyBids(bidRequests);
          return;
        }

        bids.forEach((bid) => {
          const copy = copyWithDefaults(bid, bidRequestMap[bid.requestId]);
          bidmanager.addBidResponse(bidRequestMap[bid.requestId].placementCode, copy);
        });
        if (bids.length === 0) {
          addEmptyBids(bidRequests);
        }
      }

      function onError(err) {
        logError(`Server call for ${spec.code} failed. Continuing without bids.`, null, err);
        addEmptyBids(bidRequests);
      }

      switch (request.type) {
        case GET:
          ajax(
            `${request.endpoint}?${parseQueryStringParameters(request.data)}`,
            {
              success: onSuccess,
              error: onError
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
              error: onError
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
          throw new Error(`buildRequest() must return a bid whose type is either "get" or "post". Got ${request.type}`);
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

  function addEmptyBids(bidRequests) {
    Object.keys(bidRequests)
      .map(bidRequest => bidRequest.placementCode)
      .forEach(placementCode => {
        bidmanager.addBidResponse(placementCode, newEmptyBid());
      });
  }

  function newEmptyBid() {
    const bid = bidfactory.createBid(STATUS.NO_BID);
    bid.code = spec.code;
    bid.bidderCode = spec.code;
    return bid;
  }
}

function copyWithDefaults(bid, bidRequest) {
  return Object.assign({
    getStatusCode: function() {
      return STATUS.GOOD;
    },
    getSize: function() {
      return bid.width + 'x' + bid.height;
    },
    bidderCode: bidRequest.bidder,
    code: bidRequest.bidder,
    mediaType: 'banner',
    adId: bidRequest.bidId,
    width: 0,
    height: 0,
    statusMessage: 'Bid available',
  }, bid);
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
 *   if the publisher doesn't override it. This is only relevant for Outstream bids.
 * @param [UserSyncInfo] userSyncs An object with the data needed to run a user sync, for this bid.
 */

/**
 * @typedef {object} SingleRequestBidder An object containing the adapter-specific functions needed to
 * make a Bidder.
 *
 * @property {string} code A code which will be used to uniquely identify this bidder. This should be the same
 *   one as is used in the call to registerBidAdapter
 * @property {function(object): boolean} areParamsValid Determines whether or not the given object has all the params
 *   needed to make a valid request.
 * @property {function(BidRequest[]): ServerRequest} buildRequest Build the request to the Server which
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
