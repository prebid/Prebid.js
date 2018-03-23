// Vuble Adapter

import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'vuble';

const ENVS = ['com', 'net'];
const CURRENCIES = {
  com: 'EUR',
  net: 'USD'
};
const TTL = 60;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['video'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (utils.isEmpty(bid.sizes) || utils.parseSizesInput(bid.sizes).length == 0) {
      return false;
    }

    if (!utils.deepAccess(bid, 'mediaTypes.video.context')) {
      return false;
    }

    if (!utils.contains(ENVS, bid.params.env)) {
      return false;
    }

    return !!(bid.params.env && bid.params.pubId && bid.params.zoneId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests) {
    return validBidRequests.map(bid => {
      // We take the first size
      let size = utils.parseSizesInput(bid.sizes)[0].split('x');

      // Get the page's url
      let referrer = utils.getTopWindowUrl();
      if (bid.params.referrer) {
        referrer = bid.params.referrer;
      }

      // Get Video Context
      let context = utils.deepAccess(bid, 'mediaTypes.video.context');

      let url = '//player.mediabong.' + bid.params.env + '/prebid/request';
      let data = {
        width: size[0],
        height: size[1],
        pub_id: bid.params.pubId,
        zone_id: bid.params.zoneId,
        context: context,
        floor_price: bid.params.floorPrice ? bid.params.floorPrice : 0,
        url: referrer,
        env: bid.params.env,
        bid_id: bid.bidId
      };

      return {
        method: 'POST',
        url: url,
        data: data
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bid) {
    const responseBody = serverResponse.body;

    if (typeof responseBody !== 'object' || responseBody.status !== 'ok') {
      return [];
    }

    let responses = [];
    let reponse = {
      requestId: bid.data.bid_id,
      cpm: responseBody.cpm,
      width: bid.data.width,
      height: bid.data.height,
      ttl: TTL,
      creativeId: responseBody.creativeId,
      netRevenue: true,
      currency: CURRENCIES[bid.data.env],
      vastUrl: responseBody.url,
      mediaType: 'video'
    };
    responses.push(reponse);

    return responses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    if (syncOptions.iframeEnabled) {
      if (serverResponses.length > 0) {
        let responseBody = serverResponses[0].body;
        if (typeof responseBody !== 'object' || responseBody.iframeSync) {
          return [{
            type: 'iframe',
            url: responseBody.iframeSync
          }];
        }
      }
    }
    return [];
  }
};

registerBidder(spec);
