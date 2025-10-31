import {
  buildUrl,
  deepAccess,
  getBidIdParameter,
  isArray,
  isFn,
  isPlainObject,
  isStr,
  logWarn,
  mergeDeep,
  parseUrl,
} from '../src/utils.js';
import {type BidderSpec, registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {ORTB_MTYPES} from '../libraries/ortbConverter/processors/mediaType.js';

// Maintainer: mediapsr@epsilon.com

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Device} Device
 */
const ENV = {
  BIDDER_CODE: 'conversant',
  SUPPORTED_MEDIA_TYPES: [BANNER, VIDEO, NATIVE],
  ENDPOINT: 'https://web.hb.ad.cpe.dotomi.com/cvx/client/hb/ortb/25',
  NET_REVENUE: true,
  DEFAULT_CURRENCY: 'USD',
  GVLID: 24
} as const;

/**
 * Conversant/Epsilon bid adapter parameters
 */
type ConversantBidParams = {
  /** Required. Site ID from Epsilon */
  site_id: string;
  /** Optional. Identifies specific ad placement */
  tag_id?: string;
  /** Optional. Minimum bid floor in USD */
  bidfloor?: number;
  /**
   * Optional. If impression requires secure HTTPS URL creative assets and markup. 0 for non-secure, 1 for secure.
   * Default is non-secure
   */
  secure?: boolean;
  /** Optional. Override the destination URL the request is sent to */
  white_label_url?: string;
  /** Optional. Ad position on the page (1-7, where 1 is above the fold) */
  position?: number;
  /** Optional. Array of supported video MIME types (e.g., ['video/mp4', 'video/webm']) */
  mimes?: string[];
  /** Optional. Maximum video duration in seconds */
  maxduration?: number;
  /** Optional. Array of supported video protocols (1-10) */
  protocols?: number[];
  /** Optional. Array of supported video API frameworks (1-6) */
  api?: number[];
}

declare module '../src/adUnits' {
  interface BidderParams {
    [ENV.BIDDER_CODE]: ConversantBidParams;
  }
}

function setSiteId(bidRequest, request) {
  if (bidRequest.params.site_id) {
    if (request.site) {
      request.site.id = bidRequest.params.site_id;
    } else if (request.app) {
      request.app.id = bidRequest.params.site_id;
    }
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300
  },
  request: function (buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.at = 1;
    request.cur = [ENV.DEFAULT_CURRENCY];
    if (context.bidRequests) {
      const bidRequest = context.bidRequests[0];
      setSiteId(bidRequest, request);
    }

    return request;
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const data = {
      secure: 1,
      bidfloor: getBidFloor(bidRequest) || 0,
      displaymanager: 'Prebid.js',
      displaymanagerver: '$prebid.version$'
    };
    copyOptProperty(bidRequest.params.tag_id, data, 'tagid');
    mergeDeep(imp, data, imp);
    return imp;
  },
  bidResponse: function (buildBidResponse, bid, context) {
    if (!bid.price) return;

    // ensure that context.mediaType is set to banner or video otherwise
    if (!context.mediaType && context.bidRequest.mediaTypes) {
      const [type] = Object.keys(context.bidRequest.mediaTypes);
      if (Object.values(ORTB_MTYPES).includes(type)) {
        context.mediaType = type as any;
      }
    }
    return buildBidResponse(bid, context);
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    return buildResponse(bidResponses, ortbResponse, context);
  },
  overrides: {
    imp: {
      banner(fillBannerImp, imp, bidRequest, context) {
        if (bidRequest.mediaTypes && !bidRequest.mediaTypes.banner) return;
        if (bidRequest.params.position) {
          // fillBannerImp looks for mediaTypes.banner.pos so put it under the right name here
          mergeDeep(bidRequest, {mediaTypes: {banner: {pos: bidRequest.params.position}}});
        }
        fillBannerImp(imp, bidRequest, context);
      },
      video(fillVideoImp, imp, bidRequest, context) {
        if (bidRequest.mediaTypes && !bidRequest.mediaTypes.video) return;
        const videoData = {};
        copyOptProperty(bidRequest.params?.position, videoData, 'pos');
        copyOptProperty(bidRequest.params?.mimes, videoData, 'mimes');
        copyOptProperty(bidRequest.params?.maxduration, videoData, 'maxduration');
        copyOptProperty(bidRequest.params?.protocols, videoData, 'protocols');
        copyOptProperty(bidRequest.params?.api, videoData, 'api');
        imp.video = mergeDeep(videoData, imp.video);
        fillVideoImp(imp, bidRequest, context);
      }
    },
  }
});

export const spec: BidderSpec<typeof ENV.BIDDER_CODE> = {
  code: ENV.BIDDER_CODE,
  gvlid: ENV.GVLID,
  aliases: ['cnvr', 'epsilon'], // short code
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid - The bid params to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (!bid || !bid.params) {
      logWarn(ENV.BIDDER_CODE + ': Missing bid parameters');
      return false;
    }

    if (!isStr(bid.params.site_id)) {
      logWarn(ENV.BIDDER_CODE + ': site_id must be specified as a string');
      return false;
    }

    if (isVideoRequest(bid)) {
      const mimes = bid.params.mimes || deepAccess(bid, 'mediaTypes.video.mimes');
      if (!mimes) {
        // Give a warning but let it pass
        logWarn(ENV.BIDDER_CODE + ': mimes should be specified for videos');
      } else if (!isArray(mimes) || !mimes.every(s => isStr(s))) {
        logWarn(ENV.BIDDER_CODE + ': mimes must be an array of strings');
        return false;
      }
    }

    return true;
  },

  buildRequests: function(bidRequests, bidderRequest) {
    const payload = converter.toORTB({bidderRequest, bidRequests});
    return {
      method: 'POST',
      url: makeBidUrl(bidRequests[0]),
      data: payload,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    return converter.fromORTB({request: bidRequest.data, response: serverResponse.body});
  },

  /**
   * Register User Sync.
   */
  getUserSyncs: function (
    syncOptions,
    responses,
    gdprConsent,
    uspConsent
  ) {
    const params: Record<string, any> = {};
    const syncs = [];

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      params.gdpr = (gdprConsent.gdprApplies) ? 1 : 0;
      params.gdpr_consent = encodeURIComponent(gdprConsent.consentString || '');
    }

    // CCPA
    if (uspConsent) {
      params.us_privacy = encodeURIComponent(uspConsent);
    }

    if (responses && Array.isArray(responses)) {
      responses.forEach(response => {
        if (response?.body?.ext) {
          const ext = response.body.ext;
          const pixels = [{urls: ext.fsyncs, type: 'iframe'}, {urls: ext.psyncs, type: 'image'}]
            .filter((entry) => {
              return entry.urls && Array.isArray(entry.urls) &&
                entry.urls.length > 0 &&
                ((entry.type === 'iframe' && syncOptions.iframeEnabled) ||
                (entry.type === 'image' && syncOptions.pixelEnabled));
            })
            .map((entry) => {
              return entry.urls.map((endpoint) => {
                const urlInfo = parseUrl(endpoint);
                mergeDeep(urlInfo.search, params);
                if (Object.keys(urlInfo.search).length === 0) {
                  delete urlInfo.search;
                }
                return {type: entry.type, url: buildUrl(urlInfo)};
              })
                .reduce((x, y) => x.concat(y), []);
            })
            .reduce((x, y) => x.concat(y), []);
          syncs.push(...pixels);
        }
      });
    }
    return syncs;
  }
};

/**
 * Check if it's a video bid request
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {boolean} True if it's a video bid
 */
function isVideoRequest(bid) {
  return bid.mediaType === 'video' || !!deepAccess(bid, 'mediaTypes.video');
}

/**
 * Copy property if exists from src to dst
 *
 * @param {object} src - source object
 * @param {object} dst - destination object
 * @param {string} dstName - destination property name
 */
function copyOptProperty(src, dst, dstName) {
  if (src) {
    dst[dstName] = src;
  }
}

/**
 * Get the floor price from bid.params for backward compatibility.
 * If not found, then check floor module.
 * @param bid A valid bid object
 * @returns {*|number} floor price
 */
function getBidFloor(bid) {
  let floor = getBidIdParameter('bidfloor', bid.params);

  if (!floor && isFn(bid.getFloor)) {
    const floorObj: { floor: any, currency: string } = bid.getFloor({
      currency: ENV.DEFAULT_CURRENCY,
      mediaType: '*',
      size: '*'
    });

    if (isPlainObject(floorObj) && !isNaN(floorObj.floor) && floorObj.currency === ENV.DEFAULT_CURRENCY) {
      floor = floorObj.floor;
    }
  }

  return floor
}

function makeBidUrl(bid) {
  let bidurl = ENV.ENDPOINT;
  if (bid.params.white_label_url) {
    bidurl = bid.params.white_label_url;
  }
  return bidurl;
}

registerBidder(spec);
