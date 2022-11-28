import { deepAccess, logError, parseUrl, parseSizesInput, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { VIDEO } from '../src/mediaTypes.js';
import find from 'core-js-pure/features/array/find.js'; // eslint-disable-line prebid/validate-imports

const BIDDER_CODE = 'viously';
// const GVLID = 1028;
const CURRENCY = 'EUR';
const TTL = 60;
const HTTP_METHOD = 'POST';
const REQUEST_URL = 'https://bidder.viously.com/bid';
const REQUIRED_VIDEO_PARAMS = ['context', 'playbackmethod', 'playerSize'];
const REQUIRED_VIOUSLY_PARAMS = ['pid'];

export const spec = {
  code: BIDDER_CODE,
  // gvlid: GVLID,
  supportedMediaTypes: [VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    let videoParams = deepAccess(bid, 'mediaTypes.video');

    if (!bid.params) {
      logError('The bid params are missing');
      return false;
    }

    if (!videoParams) {
      logError('The placement must be of video type');
      return false;
    }

    /**
     * VIDEO checks
     */

    let areParamsValid = true;

    REQUIRED_VIDEO_PARAMS.forEach(function(videoParam) {
      if (typeof videoParams[videoParam] === 'undefined') {
        logError('mediaTypes.video.' + videoParam + ' must be set for video placement.');
        areParamsValid = false;
      }
    });

    if (parseSizesInput(videoParams.playerSize).length === 0) {
      logError('mediaTypes.video.playerSize must be set for video placement at the right format.');
      return false;
    }

    /**
     * Viously checks
     */

    REQUIRED_VIOUSLY_PARAMS.forEach(function(viouslyParam) {
      if (typeof bid.params[viouslyParam] === 'undefined') {
        logError('The ' + viouslyParam + ' is missing.');
        areParamsValid = false;
      }
    });

    if (!areParamsValid) {
      return false;
    }

    return true;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    let payload = {};

    /** Viously Publisher ID */
    if (validBidRequests[0].params.pid) {
      payload.pid = validBidRequests[0].params.pid;
    }

    // Referer Info
    if (config.getConfig('pageUrl')) {
      let parsedUrl = parseUrl(config.getConfig('pageUrl'));

      payload.domain = parsedUrl.hostname;
      payload.page_domain = config.getConfig('pageUrl');
    } else if (bidderRequest && bidderRequest.refererInfo) {
      let parsedUrl = parseUrl(bidderRequest.refererInfo.page);

      payload.domain = parsedUrl.hostname;
      payload.page_domain = bidderRequest.refererInfo.page;
    }
    if (payload.domain) {
      /** Make sur that the scheme is not part of the domain */
      payload.domain = payload.domain.replace(/(^\w+:|^)\/\//, '');
      payload.domain = payload.domain.replace(/\/$/, '');
    }

    // Handle GDPR
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = bidderRequest.gdprConsent.gdprApplies;
      payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
      if (bidderRequest.gdprConsent.addtlConsent && bidderRequest.gdprConsent.addtlConsent.indexOf('~') !== -1) {
        payload.addtl_consent = bidderRequest.gdprConsent.addtlConsent;
      }
    }

    // US Privacy
    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }

    // Schain
    if (validBidRequests[0].schain) {
      payload.schain = validBidRequests[0].schain;
    }
    // Currency
    payload.currency_code = CURRENCY;

    // User IDs
    if (validBidRequests[0].userIdAsEids) {
      payload.users_uid = validBidRequests[0].userIdAsEids;
    }

    // Placements
    payload.placements = validBidRequests.map(bidRequest => {
      let request = {
        id: bidRequest.adUnitCode,
        bid_id: bidRequest.bidId
      };

      request.video_params = {
        context: deepAccess(bidRequest, 'mediaTypes.video.context'),
        playbackmethod: deepAccess(bidRequest, 'mediaTypes.video.playbackmethod'),
        size: parseSizesInput(deepAccess(bidRequest, 'mediaTypes.video.playerSize'))
      };

      return request;
    });

    return {
      method: HTTP_METHOD,
      url: validBidRequests[0].params.endpoint ? validBidRequests[0].params.endpoint : REQUEST_URL,
      data: payload
    };
  },

  interpretResponse: function(serverResponse, requests) {
    const bidResponses = [];
    const responseBody = serverResponse.body;

    if (responseBody.ads && responseBody.ads.length > 0) {
      responseBody.ads.forEach(function(bidResponse) {
        if (bidResponse.bid) {
          let bidRequest = find(requests.data.placements, bid => bid.bid_id === bidResponse.bid_id);

          if (bidRequest) {
            let sizes = bidResponse.size.split('x');

            const bid = {
              requestId: bidRequest.bid_id,
              id: bidResponse.id,
              cpm: bidResponse.cpm,
              width: sizes[0],
              height: sizes[1],
              creativeId: bidResponse.creative_id || '',
              currency: CURRENCY,
              netRevenue: true,
              ttl: TTL,
              mediaType: 'video',
              meta: {},
              // Tracking data
              nurl: bidResponse.nurl ? bidResponse.nurl : []
            };

            if (bidResponse.ad_url) {
              bid.vastUrl = bidResponse.ad_url;
            } else {
              bid.vastXml = bidResponse.ad;
            }

            bidResponses.push(bid);
          }
        }
      });
    }

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {},

  onTimeout: function(timeoutData) {},

  onBidWon: function(bid) {
    if (bid && bid.nurl && bid.nurl.length > 0) {
      bid.nurl.forEach(function(winUrl) {
        triggerPixel(winUrl, null);
      });
    }
  },

  onSetTargeting: function(bid) {}
};

registerBidder(spec);
