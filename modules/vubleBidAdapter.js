// Vuble Adapter

import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import { Renderer } from '../src/Renderer';

const BIDDER_CODE = 'vuble';

const ENVS = ['com', 'net'];
const CURRENCIES = {
  com: 'EUR',
  net: 'USD'
};
const TTL = 60;

const outstreamRender = bid => {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [bid.width, bid.height],
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse,
      rendererOptions: {
        showBigPlayButton: false,
        showProgressBar: 'bar',
        showVolume: false,
        allowFullscreen: true,
        skippable: false,
      }
    });
  });
}

const createRenderer = (bid, serverResponse) => {
  const renderer = Renderer.install({
    id: serverResponse.renderer_id,
    url: serverResponse.renderer_url,
    loaded: false,
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
}

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
    return validBidRequests.map(bidRequest => {
      // We take the first size
      let size = utils.parseSizesInput(bidRequest.sizes)[0].split('x');

      // Get the page's url
      let referrer = utils.getTopWindowUrl();
      if (bidRequest.params.referrer) {
        referrer = bidRequest.params.referrer;
      }

      // Get Video Context
      let context = utils.deepAccess(bidRequest, 'mediaTypes.video.context');

      let url = '//player.mediabong.' + bidRequest.params.env + '/prebid/request';
      let data = {
        width: size[0],
        height: size[1],
        pub_id: bidRequest.params.pubId,
        zone_id: bidRequest.params.zoneId,
        context: context,
        floor_price: bidRequest.params.floorPrice ? bidRequest.params.floorPrice : 0,
        url: referrer,
        env: bidRequest.params.env,
        bid_id: bidRequest.bidId,
        adUnitCode: bidRequest.adUnitCode
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
  interpretResponse: function (serverResponse, bidRequest) {
    const responseBody = serverResponse.body;

    if (typeof responseBody !== 'object' || responseBody.status !== 'ok') {
      return [];
    }

    let bids = [];
    let bid = {
      requestId: bidRequest.data.bid_id,
      cpm: responseBody.cpm,
      width: bidRequest.data.width,
      height: bidRequest.data.height,
      ttl: TTL,
      creativeId: responseBody.creativeId,
      dealId: responseBody.dealId,
      netRevenue: true,
      currency: CURRENCIES[bidRequest.data.env],
      vastUrl: responseBody.url,
      mediaType: 'video'
    };

    if (responseBody.renderer_url) {
      let adResponse = {
        ad: {
          video: {
            content: responseBody.content
          }
        }
      };

      Object.assign(bid, {
        adResponse: adResponse,
        adUnitCode: bidRequest.data.adUnitCode,
        renderer: createRenderer(bid, responseBody)
      });
    }

    bids.push(bid);

    return bids;
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
