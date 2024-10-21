import {createTrackPixelHtml, _each, deepAccess, getDefinedParams, parseGPTSingleSizeArrayToRtbSize} from '../src/utils.js';
import {VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getRefererInfo} from '../src/refererDetection.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 */

const SOURCE = 'pbjs';
const BIDDER_CODE = 'brid';
const ENDPOINT_URL = 'https://pbs.prebrid.tv/openrtb2/auction';
const GVLID = 934;
const TIME_TO_LIVE = 300;
const VIDEO_PARAMS = [
  'api', 'linearity', 'maxduration', 'mimes', 'minduration', 'plcmt',
  'playbackmethod', 'protocols', 'startdelay'
];

export const spec = {

  code: BIDDER_CODE,
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
        url: ENDPOINT_URL,
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
    const bidResponses = [];

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
          creativeId: bid.adid,
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

        bidResponses.push(bidResponse);
      });
    });

    return bidResponses;
  },

}

/**
 * Helper function to get ad
 *
 * @param {object} bid The bid.
 * @return {object} ad object.
 */
function getAd(bid) {
  let ad, adUrl, vastXml, vastUrl;

  switch (deepAccess(bid, 'ext.prebid.type')) {
    case VIDEO:
      if (bid.adm.substr(0, 4) === 'http') {
        vastUrl = bid.adm;
      } else {
        vastXml = bid.adm;
      };
      break;
    default:
      if (bid.adm && bid.nurl) {
        ad = bid.adm;
        ad += createTrackPixelHtml(decodeURIComponent(bid.nurl));
      } else if (bid.adm) {
        ad = bid.adm;
      } else if (bid.nurl) {
        adUrl = bid.nurl;
      };
  }

  return {ad, adUrl, vastXml, vastUrl};
}

/**
 * Helper function to get site object
 *
 * @return {object} siteObj.
 */
function getSiteObj() {
  const refInfo = (getRefererInfo && getRefererInfo()) || {};

  return {
    page: refInfo.page,
    ref: refInfo.ref,
    domain: refInfo.domain
  };
}

registerBidder(spec);
