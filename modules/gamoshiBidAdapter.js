import {
  deepAccess,
  deepSetValue,
  isArray,
  isFn,
  isNumber,
  isPlainObject,
  isStr,
  logError,
  logWarn,
  mergeDeep
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {Renderer} from '../src/Renderer.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {ortb25Translator} from '../libraries/ortb2.5Translator/translator.js';
import {getCurrencyFromBidderRequest} from '../libraries/ortb2Utils/currency.js';
const ENDPOINTS = {
  'gamoshi': 'https://rtb.gamoshi.io',
  'cleanmedianet': 'https://bidder.cleanmediaads.com'
};
const GVLID = 644;

const DEFAULT_TTL = 360;    // Default TTL for bid responses in seconds (6 minutes)
const MAX_TMAX = 1000;      // Maximum timeout for bid requests in milliseconds (1 second)
const TRANSLATOR = ortb25Translator();

/**
 * Defines the ORTB converter and customization functions
 */
const CONVERTER = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL
  },
  imp,
  request,
  bidResponse,
  response
});

export const helper = {
  /**
   * Determines the media type from bid extension data
   * @param {Object} bid - The bid object
   * @returns {string} The media type (VIDEO or BANNER)
   */
  getMediaType: function (bid) {
    if (bid.ext) {
      if (bid.ext.media_type) {
        return bid.ext.media_type.toLowerCase();
      } else if (bid.ext.vast_url) {
        return VIDEO;
      } else {
        return BANNER;
      }
    }
    return BANNER;
  },

  getBidFloor(bid, currency = 'USD') {
    if (!isFn(bid.getFloor)) {
      return bid.params.bidfloor ? bid.params.bidfloor : null;
    }
    let bidFloor = bid.getFloor({
      mediaType: '*',
      size: '*',
      currency: currency
    });

    if (isPlainObject(bidFloor) && !isNaN(bidFloor.floor) && bidFloor.currency === currency) {
      return bidFloor.floor;
    }
    return null;
  },
  getUserSyncParams(gdprConsent, uspConsent, gppConsent) {
    let params = {
      'gdpr': 0,
      'gdpr_consent': '',
      'us_privacy': '',
      'gpp': '',
      'gpp_sid': ''
    };
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params['gdpr'] = gdprConsent.gdprApplies === true ? 1 : 0;
      }
      if (params['gdpr'] === 1 && typeof gdprConsent.consentString === 'string') {
        params['gdpr_consent'] = encodeURIComponent(gdprConsent.consentString || '');
      }
    }

    if (uspConsent) {
      params['us_privacy'] = encodeURIComponent(uspConsent);
    }

    if (gppConsent?.gppString) {
      params['gpp'] = gppConsent.gppString;
      params['gpp_sid'] = encodeURIComponent(gppConsent.applicableSections?.toString());
    }
    return params;
  },
  replaceMacros(url, macros) {
    return url
      .replace('[GDPR]', macros['gdpr'])
      .replace('[CONSENT]', macros['gdpr_consent'])
      .replace('[US_PRIVACY]', macros['us_privacy'])
      .replace('[GPP_SID]', macros['gpp_sid'])
      .replace('[GPP]', macros['gpp']);
  },
  getWidthAndHeight(input) {
    let width, height;

    if (Array.isArray(input) && typeof input[0] === 'number' && typeof input[1] === 'number') {
      // Input is like [33, 55]
      width = input[0];
      height = input[1];
    } else if (Array.isArray(input) && Array.isArray(input[0]) && typeof input[0][0] === 'number' && typeof input[0][1] === 'number') {
      // Input is like [[300, 450], [45, 45]]
      width = input[0][0];
      height = input[0][1];
    } else {
      return { width: 300, height: 250 };
    }

    return { width, height };
  }
};

export const spec = {
  code: 'gamoshi',
  gvlid: GVLID,
  aliases: ['gambid', 'cleanmedianet'],
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    let supplyPartnerId = bid.params.supplyPartnerId ||
      bid.params.supply_partner_id || bid.params.inventory_id;
    let hasEndpoint = (!bid.params['rtbEndpoint'] || isStr(bid.params['rtbEndpoint']));

    let floorIfExistMustBeValidPositiveNumber =
      bid.params.bidfloor === undefined ||
        (!isNaN(Number(bid.params.bidfloor)) &&
        Number(bid.params.bidfloor) > 0);

    return !!supplyPartnerId && !isNaN(Number(supplyPartnerId)) && hasEndpoint && floorIfExistMustBeValidPositiveNumber;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      try {
        const params = bidRequest.params;
        const supplyPartnerId = params.supplyPartnerId || params.supply_partner_id || params.inventory_id;
        let type = bidRequest.mediaTypes['banner'] ? BANNER : VIDEO;
        if (!supplyPartnerId && type != null) {
          logError('Gamoshi: supplyPartnerId is required');
          return null;
        }
        bidRequest.mediaTypes.mediaType = type;
        const bidderCode = bidderRequest.bidderCode || 'gamoshi';
        const baseEndpoint = params['rtbEndpoint'] || ENDPOINTS[bidderCode] || 'https://rtb.gamoshi.io';
        const rtbEndpoint = `${baseEndpoint}/r/${supplyPartnerId}/bidr?rformat=open_rtb&reqformat=rtb_json&bidder=prebid` + (params.query ? '&' + params.query : '');
        // Use ORTB converter to build the request
        const ortbRequest = CONVERTER.toORTB({
          bidderRequest,
          bidRequests: [bidRequest]
        });
        if (!ortbRequest || !ortbRequest.imp || ortbRequest.imp.length === 0) {
          logWarn('Gamoshi: Failed to build valid ORTB request');
          return null;
        }
        return {
          method: 'POST',
          url: rtbEndpoint,
          data: ortbRequest,
          bidRequest
        };
      } catch (error) {
        logError('Gamoshi: Error building request:', error);
        return null;
      }
    }).filter(Boolean);
  },
  interpretResponse: function (serverResponse, bidRequest) {
    const response = serverResponse && serverResponse.body;
    if (!response) {
      return [];
    }

    try {
      return CONVERTER.fromORTB({
        response: serverResponse.body,
        request: bidRequest.data
      }).bids || [];
    } catch (error) {
      logError('Gamoshi: Error processing ORTB response:', error);
      return [];
    }
  },
  getUserSyncs (syncOptcions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    const params = helper.getUserSyncParams(gdprConsent, uspConsent, serverResponses[0]?.gppConsent);
    serverResponses.forEach(resp => {
      if (resp.body) {
        const bidResponse = resp.body;
        if (bidResponse.ext && Array.isArray(bidResponse.ext['utrk'])) {
          bidResponse.ext['utrk']
            .forEach(pixel => {
              const url = helper.replaceMacros(pixel.url, params);
              syncs.push({type: pixel.type, url});
            });
        }
        if (Array.isArray(bidResponse.seatbid)) {
          bidResponse.seatbid.forEach(seatBid => {
            if (Array.isArray(seatBid.bid)) {
              seatBid.bid.forEach(bid => {
                if (bid.ext && Array.isArray(bid.ext['utrk'])) {
                  bid.ext['utrk']
                    .forEach(pixel => {
                      const url = helper.replaceMacros(pixel.url, params);
                      syncs.push({type: pixel.type, url});
                    });
                }
              });
            }
          });
        }
      }
    });
    return syncs;
  }
};
function newRenderer(bidRequest, bid, rendererOptions = {}) {
  const renderer = Renderer.install({
    url: (bidRequest.params && bidRequest.params.rendererUrl) || (bid.ext && bid.ext.renderer_url) || 'https://s.gamoshi.io/video/latest/renderer.js',
    config: rendererOptions,
    loaded: false,
  });
  try {
    renderer.setRender(renderOutstream);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}
function renderOutstream(bid) {
  bid.renderer.push(() => {
    const unitId = bid.adUnitCode + '/' + bid.adId;
    window['GamoshiPlayer'].renderAd({
      id: unitId,
      debug: window.location.href.indexOf('pbjsDebug') >= 0,
      placement: document.getElementById(bid.adUnitCode),
      width: bid.width,
      height: bid.height,
      events: {
        ALL_ADS_COMPLETED: () => window.setTimeout(() => {
          window['GamoshiPlayer'].removeAd(unitId);
        }, 300)
      },
      vastUrl: bid.vastUrl,
      vastXml: bid.vastXml
    });
  });
}

/**
 * Builds an impression object for the ORTB 2.5 request.
 *
 * @param {function} buildImp - The function for building an imp object.
 * @param {Object} bidRequest - The bid request object.
 * @param {Object} context - The context object.
 * @returns {Object} The ORTB 2.5 imp object.
 */
function imp(buildImp, bidRequest, context) {
  let imp = buildImp(bidRequest, context);
  if (!imp) {
    logWarn('Gamoshi: Failed to build imp for bid request:', bidRequest);
    return null;
  }
  let isVideo = bidRequest.mediaTypes.mediaType === VIDEO
  if (isVideo) {
    if (!imp.video) {
      imp.video = {};
    }
  } else {
    if (!imp.banner) {
      imp.banner = {};
    }
  }
  const params = bidRequest.params;
  const currency = getCurrencyFromBidderRequest(context.bidderRequest) || 'USD';
  imp.tagid = bidRequest.adUnitCode;
  imp.instl = deepAccess(context.bidderRequest, 'ortb2Imp.instl') === 1 || params.instl === 1 ? 1 : 0;
  imp.bidfloor = helper.getBidFloor(bidRequest, currency) || 0;
  imp.bidfloorcur = currency;
  // Add video-specific properties if applicable
  if (imp.video) {
    const playerSize = bidRequest.mediaTypes?.video?.playerSize || bidRequest.sizes;
    const context = bidRequest.mediaTypes?.video?.context || null;
    const videoParams = mergeDeep({}, bidRequest.params.video || {}, bidRequest.mediaTypes.video);
    deepSetValue(imp, 'video.ext.context', context);
    deepSetValue(imp, 'video.protocols', videoParams.protocols || [1, 2, 3, 4, 5, 6]);
    deepSetValue(imp, "video.pos", videoParams.pos || 0);
    deepSetValue(imp, 'video.mimes', videoParams.mimes || ['video/mp4', 'video/x-flv', 'video/webm', 'application/x-shockwave-flash']);
    deepSetValue(imp, 'video.api', videoParams.api);
    deepSetValue(imp, 'video.skip', videoParams.skip);
    if (videoParams.plcmt && isNumber(videoParams.plcmt)) {
      deepSetValue(imp, 'video.plcmt', videoParams.plcmt);
    }
    deepSetValue(imp, 'video.placement', videoParams.placement);
    deepSetValue(imp, 'video.minduration', videoParams.minduration);
    deepSetValue(imp, 'video.maxduration', videoParams.maxduration);
    deepSetValue(imp, 'video.playbackmethod', videoParams.playbackmethod);
    deepSetValue(imp, 'video.startdelay', videoParams.startdelay);
    let sizes = helper.getWidthAndHeight(playerSize);
    imp.video.w = sizes.width;
    imp.video.h = sizes.height;
  } else {
    if (imp.banner) {
      const sizes = bidRequest.mediaTypes?.banner?.sizes || bidRequest.sizes;
      if (isArray(sizes[0])) {
        imp.banner.w = sizes[0][0];
        imp.banner.h = sizes[0][1];
      } else if (isNumber(sizes[0])) {
        imp.banner.w = sizes[0];
        imp.banner.h = sizes[1];
      } else {
        imp.banner.w = 300;
        imp.banner.h = 250;
      }
      imp.banner.pos = deepAccess(bidRequest, 'mediaTypes.banner.pos') || params.pos || 0;
    }
  }

  return imp;
}

/**
 * Builds a request object for the ORTB 2.5 request.
 *
 * @param {function} buildRequest - The function for building a request object.
 * @param {Array} imps - An array of ORTB 2.5 impression objects.
 * @param {Object} bidderRequest - The bidder request object.
 * @param {Object} context - The context object.
 * @returns {Object} The ORTB 2.5 request object.
 */
function request(buildRequest, imps, bidderRequest, context) {
  let request = buildRequest(imps, bidderRequest, context);
  const bidRequest = context.bidRequests[0];
  const supplyPartnerId = bidRequest.params.supplyPartnerId || bidRequest.params.supply_partner_id || bidRequest.params.inventory_id;

  // Cap the timeout to Gamoshi's maximum
  if (request.tmax && request.tmax > MAX_TMAX) {
    request.tmax = MAX_TMAX;
  }

  // Gamoshi-specific parameters
  deepSetValue(request, 'ext.gamoshi', {
    supplyPartnerId: supplyPartnerId
  });

  request = TRANSLATOR(request);
  return request;
}

/**
 * Build bid from oRTB 2.5 bid.
 *
 * @param buildBidResponse
 * @param bid
 * @param context
 * @returns {*}
 */
function bidResponse(buildBidResponse, bid, context) {
  let bidResponse = buildBidResponse(bid, context);
  const mediaType = helper.getMediaType(bid);

  bidResponse.mediaType = mediaType;

  if (bid.adomain && bid.adomain.length) {
    bidResponse.meta = {
      ...bidResponse.meta,
      advertiserDomains: bid.adomain
    };
  }

  if (mediaType === VIDEO) {
    bidResponse.vastUrl = bid.ext?.vast_url;
    bidResponse.vastXml = bid.adm;

    // Get video context from the original bid request
    const bidRequest = context.bidRequest || context.bidRequests?.[0];
    const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
    if (videoContext === 'outstream') {
      bidResponse.renderer = newRenderer(bidRequest, bid);
    }

    // Add video-specific meta data
    if (bid.ext?.video) {
      bidResponse.meta = {
        ...bidResponse.meta,
        ...bid.ext.video
      };
    }
  } else if (mediaType === BANNER) {
    // Ensure banner ad content is available
    if (bid.adm && !bidResponse.ad) {
      bidResponse.ad = bid.adm;
    }
  }
  return bidResponse;
}

/**
 * Builds bid response from the oRTB 2.5 bid response.
 *
 * @param buildResponse
 * @param bidResponses
 * @param ortbResponse
 * @param context
 * @returns *
 */
function response(buildResponse, bidResponses, ortbResponse, context) {
  return buildResponse(bidResponses, ortbResponse, context);
}
registerBidder(spec);
