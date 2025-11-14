import {
  ortbConverter
} from "../libraries/ortbConverter/converter.js";
import {
  registerBidder
} from "../src/adapters/bidderFactory.js";
import {
  BANNER,
  NATIVE,
  VIDEO
} from "../src/mediaTypes.js";
import {
  Renderer
} from "../src/Renderer.js";
import {
  getStorageManager
} from "../src/storageManager.js";
import {
  hasPurpose1Consent
} from "../src/utils/gdpr.js";
import {
  deepAccess,
  deepSetValue,
  getParameterByName,
  isArray,
  isArrayOfNums,
  isNumber,
  isStr,
  logError,
  logMessage,
  logWarn,
  mergeDeep
} from "../src/utils.js";

const BIDDER_CODE = "msft";
const DEBUG_PARAMS = ['enabled', 'dongle', 'member_id', 'debug_timeout'];
const DEBUG_QUERY_PARAM_MAP = {
  'apn_debug_enabled': 'enabled',
  'apn_debug_dongle': 'dongle',
  'apn_debug_member_id': 'member_id',
  'apn_debug_timeout': 'debug_timeout'
};
const ENDPOINT_URL_NORMAL = "https://ib.adnxs.com/openrtb2/prebidjs";
const ENDPOINT_URL_SIMPLE = "https://ib.adnxs-simple.com/openrtb2/prebidjs";
const GVLID = 32;
const RESPONSE_MEDIA_TYPE_MAP = {
  0: BANNER,
  1: VIDEO,
  3: NATIVE
};
const SOURCE = "pbjs";

const storage = getStorageManager({
  bidderCode: BIDDER_CODE,
});

/**
 * STUFF FOR REQUEST SIDE
 *
 * list of old appnexus bid params -> how to set them now for msft adapter -> where are they in the openRTB request
 * params.placement_id -> params.placement_id -> ext.appnexus.placement_id DONE
 * params.member -> params.member -> query string as `member_id` DONE
 * params.inv_code -> params.inv_code -> imp.tagid DONE
 * params.publisher_id -> ortb.publisher.id -> publisher.id DONE
 * params.frameworks -> params.banner_frameworks -> banner.api (array of ints) DONE
 * params.user -> ortb.user -> user DONE
 * params.allow_smaller_sizes -> params.allow_smaller_sizes -> imp.ext.appnexus.allow_smaller_sizes DONE
 * params.use_pmt_rule -> params.use_pmt_rule -> ext.appnexus.use_pmt_rule (boolean) DONE
 * params.keywords -> params.keywords (for tag level keywords) -> imp.ext.appnexus.keywords (comma delimited string) DONE
 * params.video -> mediaTypes.video -> imp.video DONE
 * params.video.frameworks -> mediatypes.video.api -> imp.video.api (array of ints) DONE
 * params.app -> ortb.app -> app DONE
 * params.reserve -> bidfloor module -> imp.bidfloor DONE
 * params.position -> mediaTypes.banner.pos -> imp.banner.pos DONE
 * params.traffic_source_code -> params.traffic_source_code -> imp.ext.appnexus.traffic_source_code DONE
 * params.supply_type -> ortb.site/app -> site/app DONE
 * params.pub_click -> params.pubclick -> imp.ext.appnexus.pubclick DONE
 * params.ext_inv_code -> params.ext_inv_code -> imp.ext.appnexus.ext_inv_code DONE
 * params.external_imp_id -> params.ext_imp_id -> imp.id (overrides default imp.id) DONE
 *
 * list of ut.tags[] fields that weren't tied to bid params -> where they were read before -> where they go in the openRTB request
 * uuid -> set in adapter -> imp.id DONE
 * primary_size -> imp.banner.w and imp.banner.h (if not already set from mediaTypes.banner.sizes) DONE
 * sizes -> mediaTypes.banner.sizes -> imp.banner.format DONE
 * ad_types -> mediaTypes.banner/video/native -> imp.banner/video/native DONE
 * gpid -> ortb2Imp.ext.gpid (from ortb) -> imp.ext.gpid (from ortb) DONE
 * tid -> ortb.source.tid (from ortb) -> source.tid DONE?
 * hb_source -> set in adapter -> ext.appnexus.hb_source DONE
 * native -> mediaTypes.native (ORTB version) -> imp.native DONE
 *
 * list of ut fields that weren't tied to bid params -> where they were read before -> where they go in the openRTB request
 * schain -> set in adapter from bidRequest.schain -> source.ext.schain DONE
 * iab_support -> set in adapter from mediaTypes.video.api and bid params.frameworks -> source.ext.omidpn and source.ext.omidpv DONE
 * device -> was part of bid.params.app (read now from ortb.device) -> device DONE
 * keywords -> getConfig('appnexusAuctionKeywords') (read now from ortb.site/user) -> site/user DONE
 * gdpr_consent -> set in adapter from bidderRequest.gdprConsent -> regs.ext.gdpr and user.ext.consent DONE
 * privacy -> set in adapter from bidderRequest.uspConsent -> regs.ext.privacy DONE
 * eids -> set in adapter from bidRequest.userId -> user.ext.eids DONE
 * dsa -> set in adapter from ortb.regs.ext.dsa -> regs.ext.dsa DONE
 * coppa -> getConfig('coppa') -> regs.coppa DONE
 * require_asset_url -> mediaTypes.video.context === 'instream' -> imp.ext.appnexus.require_asset_url DONE
 */

/**
 * STUFF FOR RESPONSE SIDE
 *
 * new bid response fields ib is adding
 * old field from UT -> new field in ortb bid response -> where it goes in the bidResponse object
 * advertiser_id -> imp.ext.appnexus.advertiser_id -> bidResponse.advertiserId DONE
 * renderer_config -> imp.ext.appnexus.renderer_config -> bidResponse.rendererConfig DONE
 * renderer_id -> imp.ext.appnexus.renderer_id -> bidResponse.rendererId DONE
 * asset_url -> imp.ext.appnexus.asset_url -> bidResponse.assetUrl DONE
 *
 */

const converter = ortbConverter({
  context: {
    // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them
    netRevenue: true,
    ttl: 300,
  },
  imp(buildImp, bidRequest, context) {
    const extANData = {};
    const bidderParams = bidRequest.params;
    const imp = buildImp(bidRequest, context);
    // banner.topframe, banner.format, banner.pos are handled in processors/banner.js
    // video.mimes, video.protocols, video.w, video.h, video.startdelay are handled in processors/video.js
    // native request is handled in processors/native.js
    if (imp.banner && !imp.banner.w && !imp.banner.h) {
      const primarySizeObj = deepAccess(imp, 'banner.format.0');
      if (primarySizeObj && isNumber(primarySizeObj.w) && isNumber(primarySizeObj.h)) {
        imp.banner.w = primarySizeObj.w;
        imp.banner.h = primarySizeObj.h;
      }
    }

    if (imp?.banner && !imp.banner.api) {
      const bannerFrameworks = bidderParams.banner_frameworks;
      if (isArrayOfNums(bannerFrameworks)) {
        imp.banner.api = bannerFrameworks;
      }
    }

    if (FEATURES.VIDEO && imp?.video) {
      if (deepAccess(bidRequest, 'mediaTypes.video.context') === 'instream') {
        extANData.require_asset_url = true;
      }

      if (imp.video.plcmt) {
        imp.video.placement = imp.video.plcmt;
        delete imp.video.plcmt;
      }
    }

    if (bidderParams) {
      if (bidderParams.placement_id) {
        extANData.placement_id = bidderParams.placement_id;
      } else if (bidderParams.inv_code) {
        deepSetValue(imp, 'tagid', bidderParams.inv_code);
      }

      const optionalParamsTypeMap = {
        allow_smaller_sizes: 'boolean',
        use_pmt_rule: 'boolean',
        keywords: 'string',
        traffic_source_code: 'string',
        pubclick: 'string',
        ext_inv_code: 'string',
        ext_imp_id: 'string'
      };
      Object.entries(optionalParamsTypeMap).forEach(([paramName, paramType]) => {
        if (checkOptionalParams(bidRequest, paramName, paramType)) {
          if (paramName === 'ext_imp_id') {
            imp.id = bidderParams.ext_imp_id;
            return;
          }
          extANData[paramName] = bidderParams[paramName];
        }
      });
    }

    // for force creative we expect the following format:
    // page.html?ast_override_div=divId:creativeId,divId2:creativeId2
    const overrides = getParameterByName('ast_override_div');
    if (isNotEmptyString(overrides)) {
      const adUnitOverride = decodeURIComponent(overrides).split(',').find((pair) => pair.startsWith(`${bidRequest.adUnitCode}:`));
      if (adUnitOverride) {
        const forceCreativeId = adUnitOverride.split(':')[1];
        if (forceCreativeId) {
          extANData.force_creative_id = parseInt(forceCreativeId, 10);
        }
      }
    }

    if (Object.keys(extANData).length > 0) {
      deepSetValue(imp, 'ext.appnexus', extANData);
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    if (request?.user?.ext?.eids?.length > 0) {
      request.user.ext.eids.forEach(eid => {
        if (eid.source === 'adserver.org') {
          eid.rti_partner = 'TDID';
        } else if (eid.source === 'uidapi.com') {
          eid.rti_partner = 'UID2';
        }
      });
    }

    const extANData = {
      prebid: true,
      hb_source: 1,
      sdk: {
        version: '$prebid.version$',
        source: SOURCE
      }
    };

    if (bidderRequest?.refererInfo) {
      const refererinfo = {
        rd_ref: encodeURIComponent(bidderRequest.refererInfo.topmostLocation),
        rd_top: bidderRequest.refererInfo.reachedTop,
        rd_ifs: bidderRequest.refererInfo.numIframes,
        rd_stk: bidderRequest.refererInfo.stack?.map((url) => encodeURIComponent(url)).join(',')
      };
      const pubPageUrl = bidderRequest.refererInfo.canonicalUrl;
      if (isNotEmptyString(pubPageUrl)) {
        refererinfo.rd_can = pubPageUrl;
      }
      extANData.referrer_detection = refererinfo;
    }

    deepSetValue(request, 'ext.appnexus', extANData);
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const { bidRequest } = context;

    // first derive the mediaType from bid data
    let mediaType;
    const bidAdType = bid?.ext?.appnexus?.bid_ad_type;
    const extANData = deepAccess(bid, 'ext.appnexus');

    if (isNumber(bidAdType) && RESPONSE_MEDIA_TYPE_MAP.hasOwnProperty(bidAdType)) {
      context.mediaType = mediaType = RESPONSE_MEDIA_TYPE_MAP[bidAdType];
    }
    const bidResponse = buildBidResponse(bid, context);

    if (extANData.advertiser_id) {
      bidResponse.meta = Object.assign({}, bidResponse.meta, {
        advertiser_id: extANData.advertiser_id
      });
    }

    // replace the placeholder token for trk.js if it's present in eventtrackers
    if (FEATURES.NATIVE && mediaType === NATIVE) {
      try {
        const nativeAdm = bid.adm ? JSON.parse(bid.adm) : {};
        if (nativeAdm?.eventtrackers && isArray(nativeAdm.eventtrackers)) {
          nativeAdm.eventtrackers.forEach(trackCfg => {
            if (trackCfg.url.includes('dom_id=%native_dom_id%')) {
              const prebidParams = 'pbjs_adid=' + bidResponse.adId + ';pbjs_auc=' + bidRequest.adUnitCode;
              trackCfg.url = trackCfg.url.replace('dom_id=%native_dom_id%', prebidParams);
            }
          });
        }
      } catch (e) {
        logError('MSFT Native adm parse error', e);
      }
    }

    if (FEATURES.VIDEO && mediaType === VIDEO) {
      // handle outstream bids, ie setup the renderer
      if (extANData?.renderer_url && extANData?.renderer_id) {
        const adUnitCode = bidRequest?.adUnitCode;
        if (isNotEmptyString(adUnitCode)) {
          // rendererOptions here should be treated as any publisher options for outstream ...
          // ...set within the adUnit.mediaTypes.video.renderer.options or in the adUnit.renderer.options
          let rendererOptions = deepAccess(bidRequest, 'mediaTypes.video.renderer.options');
          if (!rendererOptions) {
            rendererOptions = deepAccess(bidRequest, 'renderer.options');
          }

          // populate imbpus config options in the bidReponse.adResponse.ad object for our outstream renderer to use later
          // renderer_config should be treated as the old rtb.rendererOptions that came from the bidresponse.adResponse
          if (!bidResponse.adResponse) {
            bidResponse.adResponse = {
              ad: {
                notify_url: bid.nurl || '',
                renderer_config: extANData.renderer_config || '',
              },
              auction_id: extANData.auction_id,
              content: bidResponse.vastXml,
              tag_id: extANData.tag_id
            };
          }

          bidResponse.renderer = newRenderer(adUnitCode, {
            renderer_url: extANData.renderer_url,
            renderer_id: extANData.renderer_id,
          }, rendererOptions);
        }
      } else {
        // handle instream bids
        // if nurl and asset_url was set, we need to populate vastUrl field
        if (bid.nurl && extANData?.asset_url) {
          bidResponse.vastUrl = bid.nurl + '&redir=' + encodeURIComponent(extANData.asset_url);
        }
        // if not populated, the VAST in the adm will go to the vastXml field by the ortb converter
      }
    }

    return bidResponse;
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [], // TODO fill in after full transition or as seperately requested
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],

  isBidRequestValid: (bid) => {
    const params = bid.params;
    return !!(
      (typeof params.placement_id === 'number') ||
      (typeof params.member === 'number' && isNotEmptyString(params?.inv_code))
    );
  },

  buildRequests(bidRequests, bidderRequest) {
    const data = converter.toORTB({
      bidRequests,
      bidderRequest,
    });

    const omidSupport = ((bidRequests) || []).find(hasOmidSupport);
    if (omidSupport) {
      mergeDeep(
        data, {
          source: {
            ext: {
              omidpn: 'AppNexus',
              omidpv: '$prebid.version$'
            }
          }
        },
        data);
    }

    // TODO remove later
    logMessage("MSFT openRTB request", data);

    return formatRequest(data, bidderRequest);
  },

  interpretResponse(response, request) {
    const bids = converter.fromORTB({
      response: response.body,
      request: request.data,
    }).bids;

    return bids;
  },

  getUserSyncs: function (
    syncOptions,
    responses,
    gdprConsent,
    uspConsent,
    gppConsent
  ) {
    if (syncOptions.iframeEnabled && hasPurpose1Consent(gdprConsent)) {
      return [{
        type: "iframe",
        url: "https://acdn.adnxs.com/dmp/async_usersync.html",
      }, ];
    }

    if (syncOptions.pixelEnabled) {
      // first attempt using static list
      const imgList = ["https://px.ads.linkedin.com/setuid?partner=appNexus"];
      return imgList.map((url) => ({
        type: "image",
        url,
      }));
    }
  },
};

function isNotEmptyString(value) {
  return isStr(value) && value !== '';
}

function checkOptionalParams(bidRequest, fieldName, expectedType) {
  const value = bidRequest?.params?.[fieldName];
  // allow false, but not undefined, null or empty string
  if (value !== undefined && value !== null && value !== '') {
    const actualType = typeof value;
    if (actualType === expectedType) {
      return true;
    } else {
      logWarn(`Removing invalid bid.param ${fieldName} for adUnitCode ${bidRequest.adUnitCode}, expected ${expectedType}`);
      return false;
    }
  }
  return false;
}

function formatRequest(payload, bidderRequest) {
  let request = [];
  const options = {
    withCredentials: true,
  };

  let endpointUrl = ENDPOINT_URL_NORMAL;
  if (!hasPurpose1Consent(bidderRequest.gdprConsent)) {
    endpointUrl = ENDPOINT_URL_SIMPLE;
  }

  // handle debug info here if needed
  let debugObj = {};
  const debugCookieName = 'apn_prebid_debug';
  const debugCookie = storage.getCookie(debugCookieName) || null;

  // first check cookie
  if (debugCookie) {
    try {
      debugObj = JSON.parse(debugCookie);
    } catch (e) {
      logError('MSFT Debug Auction Cookie Error:\n\n' + e);
    }
  } else {
    // then check query params
    Object.keys(DEBUG_QUERY_PARAM_MAP).forEach(qparam => {
      const qval = getParameterByName(qparam);
      if (isStr(qval) && qval !== '') {
        debugObj[DEBUG_QUERY_PARAM_MAP[qparam]] = qval;
        // keep 'enabled' for old setups still using the cookie, switch to 'debug' when passing to query params
      }
    });
    if (Object.keys(debugObj).length > 0 && !debugObj.hasOwnProperty('enabled')) debugObj.enabled = true;
  }

  if (debugObj?.enabled) {
    endpointUrl += '?' + Object.keys(debugObj)
      .filter(param => DEBUG_PARAMS.includes(param))
      .map(param => (param === 'enabled') ? `debug=${debugObj[param]}` : `${param}=${debugObj[param]}`)
      .join('&');
  }

  // check if member is defined in the bid params
  const matchingBid = ((bidderRequest?.bids) || []).find(bid => bid.params && bid.params.member && isNumber(bid.params.member));
  if (matchingBid) {
    endpointUrl += (endpointUrl.indexOf('?') === -1 ? '?' : '&') + 'member_id=' + matchingBid.params.member;
  }

  if (getParameterByName("apn_test").toUpperCase() === "TRUE") {
    options.customHeaders = {
      "X-Is-Test": 1,
    };
  }

  request.push({
    method: "POST",
    url: endpointUrl,
    data: payload,
    bidderRequest,
    options,
  });

  return request;
}

function newRenderer(adUnitCode, rtbBid, rendererOptions = {}) {
  const renderer = Renderer.install({
    id: rtbBid.renderer_id,
    url: rtbBid.renderer_url,
    config: rendererOptions,
    loaded: false,
    adUnitCode,
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn("Prebid Error calling setRender on renderer", err);
  }

  renderer.setEventHandlers({
    impression: () => logMessage("AppNexus outstream video impression event"),
    loaded: () => logMessage("AppNexus outstream video loaded event"),
    ended: () => {
      logMessage("AppNexus outstream renderer video event");
      document.querySelector(`#${adUnitCode}`).style.display = "none";
    },
  });
  return renderer;
}

/**
 * This function hides google div container for outstream bids to remove unwanted space on page. Appnexus renderer creates a new iframe outside of google iframe to render the outstream creative.
 * @param {string} elementId element id
 */
function hidedfpContainer(elementId) {
  try {
    const el = document
      .getElementById(elementId)
      .querySelectorAll("div[id^='google_ads']");
    if (el[0]) {
      el[0].style.setProperty("display", "none");
    }
  } catch (e) {
    // element not found!
  }
}

function hideSASIframe(elementId) {
  try {
    // find script tag with id 'sas_script'. This ensures it only works if you're using Smart Ad Server.
    const el = document
      .getElementById(elementId)
      .querySelectorAll("script[id^='sas_script']");
    if (el[0]?.nextSibling?.localName === "iframe") {
      el[0].nextSibling.style.setProperty("display", "none");
    }
  } catch (e) {
    // element not found!
  }
}

function handleOutstreamRendererEvents(bid, id, eventName) {
  bid.renderer.handleVideoEvent({
    id,
    eventName,
  });
}

function outstreamRender(bid, doc) {
  hidedfpContainer(bid.adUnitCode);
  hideSASIframe(bid.adUnitCode);
  // push to render queue because ANOutstreamVideo may not be loaded yet
  bid.renderer.push(() => {
    const win = doc?.defaultView || window;
    win.ANOutstreamVideo.renderAd({
      tagId: bid.adResponse.tag_id,
      sizes: [bid.getSize().split("x")],
      targetId: bid.adUnitCode, // target div id to render video
      uuid: bid.requestId,
      adResponse: bid.adResponse, // fix
      rendererOptions: bid.renderer.getConfig(),
    },
    handleOutstreamRendererEvents.bind(null, bid)
    );
  });
}

function hasOmidSupport(bid) {
  // read from mediaTypes.video.api = 7
  // read from bid.params.frameworks = 6 (for banner)
  // change >> ignore bid.params.video.frameworks = 6 (prefer mediaTypes.video.api)
  let hasOmid = false;
  const bidderParams = bid?.params;
  const videoParams = bid?.mediaTypes?.video?.api;
  if (bidderParams?.frameworks && isArray(bidderParams.frameworks)) {
    hasOmid = bid.params.frameworks.includes(6);
  }
  if (!hasOmid && isArray(videoParams) && videoParams.length > 0) {
    hasOmid = videoParams.includes(7);
  }
  return hasOmid;
}

registerBidder(spec);
