import { getAdUnitSizes } from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

const BIDDER_CODE = 'vdoai';
const ENDPOINT_URL = 'https://prebid.vdo.ai/auction';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @return Array Info describing the request to the server.
   * @param validBidRequests
   * @param bidderRequest
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }

    return validBidRequests.map(bidRequest => {
      const sizes = getAdUnitSizes(bidRequest);
      const payload = {
        placementId: bidRequest.params.placementId,
        sizes: sizes,
        bidId: bidRequest.bidId,
        // TODO: is 'page' the right value here?
        referer: bidderRequest.refererInfo.page,
        id: bidRequest.auctionId,
        mediaType: bidRequest.mediaTypes.video ? 'video' : 'banner'
      };
      bidRequest.params.bidFloor && (payload['bidFloor'] = bidRequest.params.bidFloor);
      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;
    const creativeId = response.adid || 0;
    // const width = response.w || 0;
    const width = response.width;
    // const height = response.h || 0;
    const height = response.height;
    const cpm = response.price || 0;

    response.rWidth = width;
    response.rHeight = height;

    const adCreative = response.vdoCreative;

    if (width !== 0 && height !== 0 && cpm !== 0 && creativeId !== 0) {
      // const dealId = response.dealid || '';
      const currency = response.cur || 'USD';
      const netRevenue = true;
      // const referrer = bidRequest.data.referer;
      const bidResponse = {
        requestId: response.bidId,
        cpm: cpm,
        width: width,
        height: height,
        creativeId: creativeId,
        // dealId: dealId,
        currency: currency,
        netRevenue: netRevenue,
        ttl: config.getConfig('_bidderTimeout'),
        // referrer: referrer,
        // ad: response.adm
        // ad: adCreative,
        mediaType: response.mediaType
      };

      if (response.mediaType == 'video') {
        bidResponse.vastXml = adCreative;
      } else {
        bidResponse.ad = adCreative;
      }
      if (response.adDomain) {
        bidResponse.meta = {
          advertiserDomains: response.adDomain
        }
      }
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponse) {
    let syncUrls = serverResponse[0] && serverResponse[0].body && serverResponse[0].body.cookiesync && serverResponse[0].body.cookiesync.bidder_status;

    if (syncOptions.iframeEnabled && syncUrls && syncUrls.length > 0) {
      let prebidSyncUrls = syncUrls.map(syncObj => {
        return {
          url: syncObj.usersync.url,
          type: 'iframe'
        }
      })
      return prebidSyncUrls;
    }
    return [];
  },

  onTImeout: function(data) {},
  onBidWon: function(bid) {},
  onSetTargeting: function(bid) {}
};
registerBidder(spec);
