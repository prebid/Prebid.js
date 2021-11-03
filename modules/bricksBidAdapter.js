import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
// import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import find from 'core-js-pure/features/array/find.js';

const BIDDER_CODE = 'bricks';
const GVLID = 1028;
const CURRENCY = 'EUR';
const TTL = 60;
const HTTP_METHOD = 'POST';
const REQUEST_URL = 'https://dev-bidadapter.viously.io/catch';
const USER_SYNC_URL = 'https://sync.bricks-co.com/sync';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    let bannerParams = utils.deepAccess(bid, 'mediaTypes.banner');
    let videoParams = utils.deepAccess(bid, 'mediaTypes.video');

    if (!bid.params) {
      utils.logError('The bid params are missing');
      return false;
    }

    if (!bid.params.account) {
      utils.logError('The account is missing');
      return false;
    }

    if (!bid.params.id) {
      utils.logError('The id is missing');
      return false;
    }

    if (!bannerParams && !videoParams) {
      utils.logError('The placement must be of banner or video type');
      return false;
    }

    /**
     * BANNER checks
     */

    if (bannerParams) {
      let sizes = bannerParams.sizes;

      if (!sizes || utils.parseSizesInput(sizes).length == 0) {
        utils.logError('mediaTypes.banner.sizes must be set for banner placement at the right format.');
        return false;
      }

      if (!bannerParams.pos) {
        utils.logError('mediaTypes.banner.pos must be set for banner placement.');
        return false;
      }
    }

    /**
     * VIDEO checks
     */

    if (videoParams) {
      let requiredVideoParams = ['playerSize', 'protocols', 'api', 'mimes', 'skip', 'startdelay', 'placement', 'linearity', 'minduration', 'maxduration', 'context'];
      let areParamsValid = true;

      requiredVideoParams.forEach(function(videoParam) {
        if (typeof videoParams[videoParam] === 'undefined') {
          utils.logError('mediaTypes.video.' + videoParam + ' must be set for video placement.');
          areParamsValid = false;
        }
      });

      if (!areParamsValid) {
        return false;
      }

      if (utils.parseSizesInput(videoParams.playerSize).length == 0) {
        utils.logError('mediaTypes.video.playerSize must be set for video placement at the right format.');
        return false;
      }
    }

    return true;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    let payload = {};

    // Bricks account type
    if (validBidRequests[0].params.account) {
      payload.account = validBidRequests[0].params.account;
    }

    // Referer Info
    if (bidderRequest && bidderRequest.refererInfo) {
      let parsedUrl = utils.parseUrl(bidderRequest.refererInfo.referer);

      payload.domain = parsedUrl.hostname;
      payload.page_domain = bidderRequest.refererInfo.referer;
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

    // TODO: blocklist : check data ?
    // Blocklist
    if (validBidRequests[0].params.blocklist) {
      payload.blocklist = validBidRequests[0].params.blocklist;
    }

    // Placements
    payload.placements = validBidRequests.map(bidRequest => {
      let request = {
        id: bidRequest.params.id,
        bid_id: bidRequest.bidId
      };

      if (utils.deepAccess(bidRequest, 'mediaTypes.banner')) {
        let position = utils.deepAccess(bidRequest, 'mediaTypes.banner.pos');

        request.type = BANNER;

        request.sizes = utils.parseSizesInput(utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes'));

        // TODO: floor
        if (utils.isFn(bidRequest.getFloor)) {
          let floor = bidRequest.getFloor({
            mediaType: BANNER,
            currency: CURRENCY,
            size: '*'
          });

          if (floor) {
            request.floor = floor.floor;
            request.floor_currency = floor.currency;
          }
        }

        if (position) {
          request.position = position;
        }
      } else {
        request.type = VIDEO;

        request.sizes = utils.parseSizesInput(utils.deepAccess(bidRequest, 'mediaTypes.video.playerSize'));

        // TODO: floor
        if (utils.isFn(bidRequest.getFloor)) {
          let floor = bidRequest.getFloor({
            mediaType: VIDEO,
            currency: CURRENCY,
            size: '*'
          });

          if (floor) {
            request.floor = floor.floor;
            request.floor_currency = floor.currency;
          }
        }

        request.video_params = {
          protocols: utils.deepAccess(bidRequest, 'mediaTypes.video.protocols'),
          api: utils.deepAccess(bidRequest, 'mediaTypes.video.api'),
          mimes: utils.deepAccess(bidRequest, 'mediaTypes.video.mimes'),
          skip: utils.deepAccess(bidRequest, 'mediaTypes.video.skip'),
          startdelay: utils.deepAccess(bidRequest, 'mediaTypes.video.startdelay'),
          placement: utils.deepAccess(bidRequest, 'mediaTypes.video.placement'),
          linearity: utils.deepAccess(bidRequest, 'mediaTypes.video.linearity'),
          minduration: utils.deepAccess(bidRequest, 'mediaTypes.video.minduration'),
          maxduration: utils.deepAccess(bidRequest, 'mediaTypes.video.maxduration'),
          outstream: (utils.deepAccess(bidRequest, 'mediaTypes.video.context') == 'outstream' ? 'true' : 'false'),
        };
      }
      return request;
    });

    return {
      method: HTTP_METHOD,
      url: REQUEST_URL,
      data: payload
    };
  },

  interpretResponse: function(serverResponse, requests) {
    const bidResponses = [];

    if (!!serverResponse.ads && !!serverResponse.ads.length) {
      serverResponse.ads.forEach(function(bidResponse) {
        if (bidResponse.bid) {
          let bidRequest = find(requests.data, bid => bid.id === bidResponse.id);

          if (bidRequest) {
            let sizes = bidResponse.size.split('x');

            const bid = {
              requestId: bidRequest.bid_id,
              id: bidResponse.id,
              cpm: bidResponse.cpm,
              width: sizes[0],
              height: sizes[1],
              creativeId: bidResponse.creative_id,
              currency: CURRENCY,
              netRevenue: true,
              ttl: TTL,
              mediaType: bidResponse.type,
              meta: {
                advertiserDomains: [bidResponse.adomain]
              }
            };

            if (bidResponse.type == VIDEO) {
              if (bidResponse.ad_url) {
                bid.vastUrl = bidResponse.ad_url;
              } else {
                bid.vastXml = bidResponse.ad;
              }
            } else {
              bid.ad = bidResponse.ad;
            }

            bidResponses.push(bid);
          }
        }
      });
    }

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (serverResponses.length > 0) {
      if (syncOptions.iframeEnabled) {
        // TODO GDPR ?
        // let syncUrl = USER_SYNC_URL;

        // if (gdprConsent) {
        //   syncUrl += '?gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
        //   syncUrl += '?consent=' + encodeURIComponent(gdprConsent.consentString || '');
        // }
        // if (uspConsent) {
        //   syncUrl += '?usp=' + uspConsent;
        // }

        return {
          type: 'iframe',
          url: USER_SYNC_URL
        };
      }
    }

    return [];
  },

  onTimeout: function(timeoutData) {},

  onBidWon: function(bid) {},

  onSetTargeting: function(bid) {}
}

registerBidder(spec);
