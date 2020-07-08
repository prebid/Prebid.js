import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'inmar';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['inm'],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid
   *
   * @param {bidRequest} bid The bid params to validate.
   * @returns {boolean} True if this is a valid bid, and false otherwise
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.pid && bid.params.supplyType);
  },

  /**
   * Build a server request from the list of valid BidRequests
   * @param {validBidRequests} is an array of the valid bids
   * @param {bidderRequest} bidder request object
   * @returns {ServerRequest} Info describing the request to the server
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      var payload = {
        bidfloor: bid.params.bidfloor,
        ifa: bid.params.ifa,
        pid: bid.params.pid,
        supplyType: bid.params.supplyType,
        currencyCode: config.getConfig('currency.adServerCurrency'),
        auctionId: bid.auctionId,
        bidId: bid.bidId,
        bidRequestsCount: bid.bidRequestsCount,
        bidder: bid.bidder,
        bidderRequestId: bid.bidderRequestId,
        tagId: bid.adUnitCode,
        sizes: getBannerSizes(bid),
        referer: (typeof bidderRequest.refererInfo.referer != 'undefined' ? encodeURIComponent(bidderRequest.refererInfo.referer) : null),
        numIframes: (typeof bidderRequest.refererInfo.numIframes != 'undefined' ? bidderRequest.refererInfo.numIframes : null),
        transactionId: bid.transactionId,
        timeout: config.getConfig('bidderTimeout'),
        demand: isDemandTypeVideo(bid) ? 'video' : 'display',
        videoData: getVideoInfo(bid)
      };

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
        payload.gdpr = bidderRequest.gdprConsent.gdprApplies;
      }

      var payloadString = JSON.stringify(payload);

      return {
        method: 'POST',
        url: 'https://prebid.owneriq.net:8443/bidder/pb/bid',
        data: payloadString,
      };
    });
  },

  /**
   * Read the response from the server and build a list of bids
   * @param {serverResponse} Response from the server.
   * @param {bidRequest} Bid request object
   * @returns {bidResponses} Array of bids which were nested inside the server
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    // try catch
    var response = serverResponse.body;
    if (response) {
      var bidResponse = {
        requestId: JSON.parse(bidRequest.data).bidId,
        cpm: response.cpm,
        width: response.width,
        height: response.height,
        creativeId: response.creativeId,
        mediaType: response.mediaType,
        netRevenue: response.netRevenue,
        currency: response.currency,
        ttl: response.ttl,
        dealId: response.dealId,
      };

      if (response.mediaType === 'video') {
        bidResponse.vastXml = response.vastXML;
      } else {
        bidResponse.ad = response.adm
      }

      bidResponses.push(bidResponse);
    }
    return bidResponses
  },

  /**
   * User Syncs
   *
   * @param {syncOptions} Publisher prebid configuration
   * @param {serverResponses} Response from the server
   * @returns {Array}
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: 'https://px.owneriq.net/eucm/p/pb'
      });
    }
    return syncs
  },
};

registerBidder(spec);

function getBannerSizes(bid) {
  let newSizes;
  if (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) {
    newSizes = bid.mediaTypes.banner.sizes
  }
  if (newSizes != null) {
    return newSizes.map(size => ({
      w: size[0],
      h: size[1]
    }));
  }
}

function isDemandTypeVideo(bid) {
  if (bid.mediaTypes != undefined && bid.mediaTypes.video != undefined) {
    return true;
  }
  return false;
}

function getVideoInfo(bid) {
  let videoData;
  if (isDemandTypeVideo(bid)) {
    videoData = {
      format: bid.mediaTypes.video.context,
      playerSize: bid.mediaTypes.video.playerSize,
      mimes: bid.mediaTypes.video.mimes
    };
  }
  return videoData;
}
