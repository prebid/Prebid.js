import {_each, deepAccess, getDefinedParams, parseGPTSingleSizeArrayToRtbSize} from '../src/utils.js';
import {VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getAd, getSiteObj, getSyncResponse} from '../libraries/targetVideoUtils/bidderUtils.js'
import {GVLID, SOURCE, TIME_TO_LIVE, VIDEO_ENDPOINT_URL, VIDEO_PARAMS} from '../libraries/targetVideoUtils/constants.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 */
export const spec = {

  code: 'brid',
  gvlid: GVLID,
  supportedMediaTypes: [VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param {BidderRequest} bidderRequest bidder request object.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    const requests = [];

    _each(bidRequests, function(bid) {
      const placementId = bid.params.placementId;
      const bidId = bid.bidId;
      let sizes = bid.sizes;
      if (sizes && !Array.isArray(sizes[0])) sizes = [sizes];

      const site = getSiteObj();

      const postBody = {
        sdk: {
          source: SOURCE,
          version: '$prebid.version$'
        },
        id: bidderRequest.bidderRequestId,
        site,
        imp: []
      };

      const imp = {
        ext: {
          prebid: {
            storedrequest: {'id': placementId}
          }
        }
      };

      const video = deepAccess(bid, 'mediaTypes.video');
      if (video) {
        imp.video = getDefinedParams(video, VIDEO_PARAMS);
        if (video.playerSize) {
          imp.video = Object.assign(
            imp.video, parseGPTSingleSizeArrayToRtbSize(video.playerSize[0]) || {}
          );
        } else if (video.w && video.h) {
          imp.video.w = video.w;
          imp.video.h = video.h;
        };
      };

      postBody.imp.push(imp);

      const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
      const uspConsent = bidderRequest && bidderRequest.uspConsent;

      if (gdprConsent || uspConsent) {
        postBody.regs = { ext: {} };

        if (uspConsent) {
          postBody.regs.ext.us_privacy = uspConsent;
        };

        if (gdprConsent) {
          if (typeof gdprConsent.gdprApplies !== 'undefined') {
            postBody.regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0;
          };

          if (typeof gdprConsent.consentString !== 'undefined') {
            postBody.user = {
              ext: { consent: gdprConsent.consentString }
            };
          };
        };
      };

      if (bidRequests[0].schain) {
        postBody.schain = bidRequests[0].schain;
      }

      const params = bid.params;

      requests.push({
        method: 'POST',
        url: VIDEO_ENDPOINT_URL,
        data: JSON.stringify(postBody),
        options: {
          withCredentials: true
        },
        bidId,
        params
      });
    });

    return requests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const response = serverResponse.body;
    let highestBid = null;

    if (response && response.seatbid && response.seatbid.length && response.seatbid[0].bid && response.seatbid[0].bid.length) {
      _each(response.seatbid, (resp) => {
        _each(resp.bid, (bid) => {
          const requestId = bidRequest.bidId;
          const params = bidRequest.params;

          const {ad, adUrl, vastUrl, vastXml} = getAd(bid);

          const bidResponse = {
            requestId,
            params,
            cpm: bid.price,
            width: bid.w,
            height: bid.h,
            creativeId: bid.crid || bid.adid,
            currency: response.cur,
            netRevenue: false,
            ttl: TIME_TO_LIVE,
            meta: {
              advertiserDomains: bid.adomain || []
            }
          };

          if (vastUrl || vastXml) {
            bidResponse.mediaType = VIDEO;
            if (vastUrl) bidResponse.vastUrl = vastUrl;
            if (vastXml) bidResponse.vastXml = vastXml;
          } else {
            bidResponse.ad = ad;
            bidResponse.adUrl = adUrl;
          };

          if (!highestBid || highestBid.cpm < bidResponse.cpm) {
            highestBid = bidResponse;
          }
        });
      });
    }

    return highestBid ? [highestBid] : [];
  },

  /**
   * Determine the user sync type (either 'iframe' or 'image') based on syncOptions.
   * Construct the sync URL by appending required query parameters such as gdpr, ccpa, and coppa consents.
   * Return an array containing an object with the sync type and the constructed URL.
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
    return getSyncResponse(syncOptions, gdprConsent, uspConsent, gppConsent, 'brid');
  }

}

registerBidder(spec);
