import { deepAccess, deepSetValue, isArray, logError, logWarn, mergeDeep } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { COMMON_ORTB_VIDEO_PARAMS } from '../libraries/deepintentUtils/index.js';
import { addDealCustomTargetings, addPMPDeals } from '../libraries/dealUtils/dealUtils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const LOG_WARN_PREFIX = 'DeepIntent: ';
const BIDDER_CODE = 'deepintent';
const GVL_ID = 541;
const BIDDER_ENDPOINT = 'https://prebid.deepintent.com/prebid';
const USER_SYNC_URL = 'https://cdn.deepintent.com/syncpixel.html';
const DI_M_V = '1.0.0';

// Extends the shared ORTB video param schema with deepintent-specific validators.
// The converter's fillVideoImp only whitelists param names — it does not validate values.
// This schema is used in the imp() override to validate and warn on malformed params.
export const ORTB_VIDEO_PARAMS = {
  ...COMMON_ORTB_VIDEO_PARAMS,
  'plcmt': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 5),
  'delivery': (value) => [1, 2, 3].indexOf(value) !== -1,
  'pos': (value) => [0, 1, 2, 3, 4, 5, 6, 7].indexOf(value) !== -1,
};

const converter = ortbConverter({
  context: {
    netRevenue: false,
    ttl: 300,
    currency: 'USD',
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    // Ensure ext is always an object; addDealCustomTargetings writes to imp.ext directly
    imp.ext = imp.ext || {};
    imp.tagid = bidRequest.params.tagId || '';
    imp.displaymanager = 'di_prebid';
    imp.displaymanagerver = DI_M_V;

    // params.bidfloor fallback when the price floors module is not active
    if (imp.bidfloor == null && bidRequest.params.bidfloor != null) {
      imp.bidfloor = bidRequest.params.bidfloor;
    }

    // deepintent custom params
    if (bidRequest.params.custom) {
      imp.ext.deepintent = bidRequest.params.custom;
    }

    // Banner: add pos from params. fillBannerImp does not read bidder params.
    // ps: this is a fallback. pos should be set in the mediaType.banner
    if (imp.banner) {
      imp.banner.pos = bidRequest.params.pos || 0;
    }

    // Video: build and validate imp.video independently of fillVideoImp.
    // fillVideoImp (behind FEATURES.VIDEO) whitelists by name but does not validate
    // values, and does not read params.video. We own the full video object here.
    if (deepAccess(bidRequest, 'mediaTypes.video')) {
      const videoAdUnitParams = deepAccess(bidRequest, 'mediaTypes.video', {});
      const videoBidderParams = deepAccess(bidRequest, 'params.video', {});
      // Compute w/h from playerSize (mirrors fillVideoImp's logic)
      const computedParams = {};
      if (Array.isArray(videoAdUnitParams.playerSize)) {
        const tempSize = Array.isArray(videoAdUnitParams.playerSize[0])
          ? videoAdUnitParams.playerSize[0]
          : videoAdUnitParams.playerSize;
        computedParams.w = tempSize[0];
        computedParams.h = tempSize[1];
      }
      const mergedVideoParams = { ...computedParams, ...videoAdUnitParams, ...videoBidderParams };
      const validatedVideo = {};
      Object.keys(ORTB_VIDEO_PARAMS).forEach(paramName => {
        if (Object.prototype.hasOwnProperty.call(mergedVideoParams, paramName)) {
          if (ORTB_VIDEO_PARAMS[paramName](mergedVideoParams[paramName])) {
            validatedVideo[paramName] = mergedVideoParams[paramName];
          } else {
            logWarn(`${LOG_WARN_PREFIX}The OpenRTB video param ${paramName} has been skipped due to misformating. Please refer to OpenRTB 2.5 spec.`);
          }
        }
      });
      imp.video = validatedVideo;
    }

    if (deepAccess(bidRequest, 'params.deals')) {
      addPMPDeals(imp, deepAccess(bidRequest, 'params.deals'), LOG_WARN_PREFIX);
    }

    if (deepAccess(bidRequest, 'params.dctr')) {
      addDealCustomTargetings(imp, deepAccess(bidRequest, 'params.dctr'), LOG_WARN_PREFIX);
    }

    return imp;
  },

  // fillVideoResponse (which sets vastXml) is behind FEATURES.VIDEO.
  // Ensure vastXml is always populated for video bids regardless of feature flags.
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    if (bidResponse.mediaType === VIDEO && bid.adm && !bidResponse.vastXml) {
      bidResponse.vastXml = bid.adm;
    }
    return bidResponse;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    // Explicit first-price auction; OpenRTB default when absent is 2 (second price).
    request.at = 1;

    // User data from bidder params is not part of standard FPD.
    const bidRequest = context.bidRequests[0];
    if (bidRequest?.params?.user) {
      request.user = mergeDeep({}, request.user, bidRequest.params.user);
    }

    // user.eids arrives via FPD (ortb2.user.eids). Mirror to user.ext.eids for
    // legacy DSP compatibility until confirmed no longer needed.
    const eids = deepAccess(request, 'user.eids');
    if (isArray(eids) && eids.length > 0) {
      deepSetValue(request, 'user.ext.eids', eids);
    }

    return request;
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO],
  aliases: [],

  isBidRequestValid: bid => {
    let valid = false;
    if (bid && bid.params && bid.params.tagId) {
      if (typeof bid.params.tagId === 'string' || bid.params.tagId instanceof String) {
        if (bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(VIDEO)) {
          if (bid.mediaTypes[VIDEO].hasOwnProperty('context')) {
            valid = true;
          }
        } else {
          valid = true;
        }
      }
    }
    return valid;
  },

  buildRequests(validBidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
    return {
      method: 'POST',
      url: BIDDER_ENDPOINT,
      data,
      options: {
        contentType: 'application/json'
      }
    };
  },

  interpretResponse(bidResponse, bidRequest) {
    const responses = [];
    if (bidResponse && bidResponse.body) {
      try {
        const result = converter.fromORTB({
          request: bidRequest.data,
          response: bidResponse.body
        });
        responses.push(...(result.bids || []));
      } catch (err) {
        logError(err);
      }
    }
    return responses;
  },

  getUserSyncs: syncOptions => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USER_SYNC_URL
      }];
    }
  }
};

registerBidder(spec);
