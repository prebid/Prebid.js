import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { getStorageManager } from '../src/storageManager.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { bidderSettings } from '../src/bidderSettings.js';
import {
  createTrackPixelHtml,
  deepAccess,
  deepSetValue,
  getParameterByName,
  isArray,
  isArrayOfNums,
  isEmpty,
  isFn,
  isNumber,
  isPlainObject,
  isStr,
  logError,
  logInfo,
  logMessage,
  logWarn
} from '../src/utils.js';
import { config } from '../src/config.js';
import {
  getANKewyordParamFromMaps,
  getANKeywordParam
} from '../libraries/appnexusUtils/anKeywords.js';
import { convertCamelToUnderscore } from '../libraries/appnexusUtils/anUtils.js';
import { chunk } from '../libraries/chunk/chunk.js';
const BIDDER_CODE = 'mediafuse';
const GVLID = 32;
const ENDPOINT_URL_NORMAL = 'https://ib.adnxs.com/openrtb2/prebidjs';
const ENDPOINT_URL_SIMPLE = 'https://ib.adnxs-simple.com/openrtb2/prebidjs';
const SOURCE = 'pbjs';
const MAX_IMPS_PER_REQUEST = 15;
const DEBUG_PARAMS = ['enabled', 'dongle', 'member_id', 'debug_timeout'];
const DEBUG_QUERY_PARAM_MAP = {
  'apn_debug_enabled': 'enabled',
  'apn_debug_dongle': 'dongle',
  'apn_debug_member_id': 'member_id',
  'apn_debug_timeout': 'debug_timeout'
};
const RESPONSE_MEDIA_TYPE_MAP = {
  0: BANNER,
  1: VIDEO,
  3: NATIVE
};
const VIDEO_TARGETING = ['id', 'minduration', 'maxduration', 'skippable', 'playback_method', 'frameworks', 'context', 'skipoffset'];
const VIDEO_RTB_TARGETING = ['minduration', 'maxduration', 'skip', 'skipafter', 'playbackmethod', 'api'];
// Maps Prebid video context strings to Xandr's ext.appnexus.context integer (OpenRTB bid request)
const VIDEO_CONTEXT_MAP = {
  'instream': 1,
  'outstream': 4,
  'in-banner': 5
};
const USER_PARAMS = ['age', 'externalUid', 'segments', 'gender', 'dnt', 'language'];
const OMID_FRAMEWORK = 6;
const OMID_API = 7;
const VIEWABILITY_URL_START = /\/\/cdn\.adnxs\.com\/v|\/\/cdn\.adnxs-simple\.com\/v/;
const VIEWABILITY_FILE_NAME = 'trk.js';
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
/**
 * Modernized Mediafuse Bid Adapter using ortbConverter.
 */
const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // Resilience for video/banner if buildImp skips them
    if (!imp.video && deepAccess(bidRequest, 'mediaTypes.video')) {
      const playerSize = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
      if (isArray(playerSize)) {
        const size = isArray(playerSize[0]) ? playerSize[0] : playerSize;
        imp.video = { w: size[0], h: size[1] };
      } else {
        imp.video = {};
      }
    }
    if (!imp.banner && deepAccess(bidRequest, 'mediaTypes.banner')) {
      const sizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes');
      if (isArray(sizes) && sizes.length > 0) {
        const size = isArray(sizes[0]) ? sizes[0] : sizes;
        imp.banner = {
          w: size[0], h: size[1],
          format: sizes.map(s => {
            const sz = isArray(s) ? s : [s[0], s[1]];
            return { w: sz[0], h: sz[1] };
          })
        };
      }
    }
    const bidderParams = bidRequest.params;
    const extANData = {
      disable_psa: true
    };
    // Legacy support for placement_id vs placementId
    const placementId = bidderParams.placement_id || bidderParams.placementId;
    if (placementId) {
      extANData.placement_id = parseInt(placementId, 10);
    } else {
      const invCode = bidderParams.inv_code || bidderParams.invCode;
      if (invCode) {
        deepSetValue(imp, 'tagid', invCode);
      }
    }

    if (imp.banner) {
      // primary_size for legacy support
      const firstFormat = deepAccess(imp, 'banner.format.0');
      if (firstFormat) {
        extANData.primary_size = firstFormat;
      }
      if (!imp.banner.api) {
        const bannerFrameworks = bidderParams.banner_frameworks || bidderParams.frameworks;
        if (isArrayOfNums(bannerFrameworks)) {
          extANData.banner_frameworks = bannerFrameworks;
        }
      }
    }

    const gpid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
    if (gpid) {
      extANData.gpid = gpid;
    }

    if (FEATURES.VIDEO && imp.video) {
      if (deepAccess(bidRequest, 'mediaTypes.video.context') === 'instream') {
        extANData.require_asset_url = true;
      }

      const videoParams = bidderParams.video;
      if (videoParams) {
        Object.keys(videoParams)
          .filter(param => VIDEO_TARGETING.includes(param))
          .forEach(param => {
            if (param === 'frameworks') {
              if (isArray(videoParams.frameworks)) {
                extANData.video_frameworks = videoParams.frameworks;
              }
            } else {
              imp.video[param] = videoParams[param];
            }
          });
      }

      const videoMediaType = deepAccess(bidRequest, 'mediaTypes.video');
      if (videoMediaType && imp.video) {
        Object.keys(videoMediaType)
          .filter(param => VIDEO_RTB_TARGETING.includes(param))
          .forEach(param => {
            switch (param) {
              case 'minduration':
              case 'maxduration':
                if (typeof imp.video[param] !== 'number') imp.video[param] = videoMediaType[param];
                break;
              case 'skip':
                if (typeof imp.video['skippable'] !== 'boolean') imp.video['skippable'] = (videoMediaType[param] === 1);
                break;
              case 'skipafter':
                if (typeof imp.video['skipoffset'] !== 'number') imp.video['skipoffset'] = videoMediaType[param];
                break;
              case 'playbackmethod':
                if (typeof imp.video['playback_method'] !== 'number' && isArray(videoMediaType[param])) {
                  const type = videoMediaType[param][0];
                  if (type >= 1 && type <= 4) {
                    imp.video['playback_method'] = type;
                  }
                }
                break;
              case 'api':
                if (!extANData.video_frameworks && isArray(videoMediaType[param])) {
                  const apiTmp = videoMediaType[param].map(val => {
                    const v = (val === 4) ? 5 : (val === 5) ? 4 : val;
                    return (v >= 1 && v <= 5) ? v : undefined;
                  }).filter(v => v !== undefined);
                  extANData.video_frameworks = apiTmp;
                }
                break;
            }
          });
      }

      if (deepAccess(bidRequest, 'mediaTypes.video.context') === 'outstream') {
        imp.video.placement = imp.video.placement || 4;
      }

      const xandrVideoContext = VIDEO_CONTEXT_MAP[deepAccess(bidRequest, 'mediaTypes.video.context')];
      if (xandrVideoContext !== undefined) {
        deepSetValue(imp, 'video.ext.appnexus.context', xandrVideoContext);
      }
    }
    if (bidRequest.renderer) {
      extANData.custom_renderer_present = true;
    }

    // Optional params map
    const optionalParamsMap = {
      'allowSmallerSizes': 'allow_smaller_sizes',
      'usePaymentRule': 'use_pmt_rule',
      'trafficSourceCode': 'traffic_source_code',
      'pubClick': 'pubclick',
      'extInvCode': 'ext_inv_code',
      'externalImpId': 'ext_imp_id',
      'supplyType': 'supply_type'
    };

    Object.entries(optionalParamsMap).forEach(([paramName, ortbName]) => {
      if (bidderParams[paramName] !== undefined) {
        if (ortbName === 'ext_imp_id') {
          imp.id = bidderParams[paramName];
        } else {
          extANData[ortbName] = bidderParams[paramName];
        }
      }
    });

    const knownParams = ['placementId', 'placement_id', 'invCode', 'inv_code', 'member', 'keywords', 'reserve', 'video', 'user', 'app', 'frameworks', 'position', 'publisherId', 'publisher_id', ...Object.keys(optionalParamsMap), ...Object.values(optionalParamsMap), 'banner_frameworks', 'video_frameworks'];
    Object.keys(bidderParams)
      .filter(param => !knownParams.includes(param))
      .forEach(param => {
        extANData[convertCamelToUnderscore(param)] = bidderParams[param];
      });

    // Keywords
    if (!isEmpty(bidderParams.keywords)) {
      const keywords = getANKewyordParamFromMaps(bidderParams.keywords);
      if (keywords && keywords.length > 0) {
        extANData.keywords = keywords.map(kw => kw.key + (kw.value ? '=' + kw.value.join(',') : '')).join(',');
      }
    }

    // Floor
    const bidFloor = getBidFloor(bidRequest);
    if (bidFloor) {
      imp.bidfloor = bidFloor;
      imp.bidfloorcur = 'USD';
    } else {
      delete imp.bidfloor;
      delete imp.bidfloorcur;
    }

    if (Object.keys(extANData).length > 0) {
      deepSetValue(imp, 'ext.appnexus', extANData);
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    // Ensure EIDs are mapped from bids if not already set by ortbConverter
    if (!deepAccess(request, 'user.ext.eids')) {
      const bidderEids = bidderRequest.userIdAsEids || (bidderRequest.bids && bidderRequest.bids[0] && bidderRequest.bids[0].userIdAsEids);
      if (isArray(bidderEids)) {
        deepSetValue(request, 'user.ext.eids', bidderEids);
      }
    }

    if (request.user && request.user.ext && isArray(request.user.ext.eids)) {
      request.user.ext.eids.forEach(eid => {
        let rtiPartner;
        if (eid.source === 'adserver.org') {
          rtiPartner = 'TDID';
        } else if (eid.source === 'uidapi.com') {
          rtiPartner = 'UID2';
        }

        if (rtiPartner) {
          // Set rtiPartner on the first uid's ext object
          if (isArray(eid.uids) && eid.uids[0]) {
            eid.uids[0].ext = Object.assign({}, eid.uids[0].ext, { rtiPartner });
          }
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
        rd_ref: bidderRequest.refererInfo.topmostLocation ? encodeURIComponent(bidderRequest.refererInfo.topmostLocation) : '',
        rd_top: bidderRequest.refererInfo.reachedTop,
        rd_ifs: bidderRequest.refererInfo.numIframes,
        rd_stk: bidderRequest.refererInfo.stack?.map((url) => encodeURIComponent(url)).join(',')
      };
      if (bidderRequest.refererInfo.canonicalUrl) {
        refererinfo.rd_can = bidderRequest.refererInfo.canonicalUrl;
      }
      extANData.referrer_detection = refererinfo;
    }

    // App/Device parameters
    const expandedBids = bidderRequest?.bids || [];
    const memberBid = expandedBids.find(bid => bid.params && bid.params.member);
    const commonBidderParams = memberBid ? memberBid.params : (expandedBids[0] && expandedBids[0].params);

    if (commonBidderParams) {
      if (commonBidderParams.member) {
        extANData.member_id = parseInt(commonBidderParams.member, 10);
      }
      if (commonBidderParams.publisherId) {
        deepSetValue(request, 'site.publisher.id', commonBidderParams.publisherId.toString());
      }
    }

    if (hasOmidSupport(bidderRequest.bids?.[0])) {
      extANData.iab_support = {
        omidpn: 'Mediafuse',
        omidpv: '$prebid.version$'
      };
    }

    deepSetValue(request, 'ext.appnexus', extANData);

    // GDPR / Consent
    if (bidderRequest.gdprConsent) {
      deepSetValue(request, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
      deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);

      if (bidderRequest.gdprConsent.addtlConsent && bidderRequest.gdprConsent.addtlConsent.indexOf('~') !== -1) {
        const ac = bidderRequest.gdprConsent.addtlConsent;
        const acStr = ac.substring(ac.indexOf('~') + 1);
        const addtlConsent = acStr.split('.').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (addtlConsent.length > 0) {
          deepSetValue(request, 'user.ext.addtl_consent', addtlConsent);
        }
      }
    }

    if (bidderRequest.uspConsent) {
      deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    if (bidderRequest.gppConsent) {
      deepSetValue(request, 'regs.gpp', bidderRequest.gppConsent.gppString);
      deepSetValue(request, 'regs.gpp_sid', bidderRequest.gppConsent.applicableSections);
    }

    if (config.getConfig('coppa') === true) {
      deepSetValue(request, 'regs.coppa', 1);
    }

    // User Params
    const userObjBid = ((bidderRequest?.bids) || []).find(bid => bid.params?.user);
    if (userObjBid) {
      const userObj = request.user || {};
      Object.keys(userObjBid.params.user)
        .filter(param => USER_PARAMS.includes(param))
        .forEach((param) => {
          const uparam = convertCamelToUnderscore(param);
          if (param === 'segments' && isArray(userObjBid.params.user[param])) {
            const segs = userObjBid.params.user[param].map(val => {
              if (isNumber(val)) return { 'id': val };
              if (isPlainObject(val)) return val;
              return undefined;
            }).filter(s => s);
            userObj.ext = userObj.ext || {};
            userObj.ext[uparam] = segs;
          } else if (param !== 'segments') {
            userObj[uparam] = userObjBid.params.user[param];
          }
        });
      request.user = userObj;
    }

    // App Params
    const appObjBid = ((bidderRequest?.bids) || []).find(bid => bid.params?.app);
    if (appObjBid) {
      request.app = Object.assign({}, request.app, appObjBid.params.app);
    }

    // Global Keywords
    const mfKeywords = config.getConfig('mediafuseAuctionKeywords');
    if (mfKeywords) {
      const keywords = getANKeywordParam(bidderRequest?.ortb2, mfKeywords);
      if (keywords && keywords.length > 0) {
        const kwString = keywords.map(kw => kw.key + (kw.value ? '=' + kw.value.join(',') : '')).join(',');
        deepSetValue(request, 'ext.appnexus.keywords', kwString);
      }
    }

    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const { bidRequest } = context;
    const bidAdType = bid?.ext?.appnexus?.bid_ad_type;
    const mediaType = RESPONSE_MEDIA_TYPE_MAP[bidAdType];
    const extANData = deepAccess(bid, 'ext.appnexus');
    // Set mediaType for all bids to help ortbConverter determine the correct parser
    if (mediaType) {
      context.mediaType = mediaType;
    }
    let bidResponse;
    try {
      bidResponse = buildBidResponse(bid, context);
    } catch (e) {
      if (bidAdType !== 3 && mediaType !== 'native') {
        logError('Mediafuse: buildBidResponse hook crash', e);
      }
    }
    if (!bidResponse) {
      if (mediaType) {
        bidResponse = {
          requestId: bidRequest?.bidId || bid.impid,
          cpm: bid.price || 0,
          width: bid.w,
          height: bid.h,
          creativeId: bid.crid,
          dealId: bid.dealid,
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          mediaType,
          ad: bid.adm
        };
      } else {
        logWarn('Mediafuse: Could not build bidResponse for unknown mediaType', { bidAdType, mediaType });
        return null;
      }
    }

    if (extANData) {
      bidResponse.mediafuse = {
        buyerMemberId: extANData.buyer_member_id,
        dealPriority: extANData.deal_priority,
        dealCode: extANData.deal_code
      };
      bidResponse.meta = Object.assign({}, bidResponse.meta, {
        advertiserId: extANData.advertiser_id,
        brandId: extANData.brand_id
      });

      if (extANData.buyer_member_id) {
        bidResponse.meta.dchain = {
          ver: '1.0',
          complete: 0,
          nodes: [{
            bsid: extANData.buyer_member_id.toString()
          }]
        };
      }
    }

    if (bid.adomain) {
      const adomain = isArray(bid.adomain) ? bid.adomain : [bid.adomain];
      if (adomain.length > 0) {
        bidResponse.meta = bidResponse.meta || {};
        bidResponse.meta.advertiserDomains = adomain;
      }
    }

    // Video
    if (FEATURES.VIDEO && mediaType === VIDEO) {
      bidResponse.ttl = 3600;
      if (bid.nurl) {
        bidResponse.vastImpUrl = bid.nurl;
      }

      if (extANData?.renderer_url && extANData?.renderer_id) {
        const rendererOptions = deepAccess(bidRequest, 'mediaTypes.video.renderer.options') || deepAccess(bidRequest, 'renderer.options');
        bidResponse.adResponse = {
          ad: {
            notify_url: bid.nurl || '',
            renderer_config: extANData.renderer_config || '',
          },
          auction_id: extANData.auction_id,
          content: bidResponse.vastXml,
          tag_id: extANData.tag_id,
          uuid: bidResponse.requestId
        };
        bidResponse.renderer = newRenderer(bidRequest.adUnitCode, {
          renderer_url: extANData.renderer_url,
          renderer_id: extANData.renderer_id,
        }, rendererOptions);
      } else if (bid.nurl && extANData?.asset_url) {
        bidResponse.vastUrl = bid.nurl + '&redir=' + encodeURIComponent(extANData.asset_url);
      }
    }

    // Native processing: viewability macro replacement and manual asset mapping
    if (FEATURES.NATIVE && (bidAdType === 3 || mediaType === 'native')) {
      bidResponse.mediaType = 'native';
      try {
        const adm = bid.adm;
        const nativeAdm = isStr(adm) ? JSON.parse(adm) : adm || {};

        // 1. Viewability macro replacement
        const eventtrackers = nativeAdm.native?.eventtrackers || nativeAdm.eventtrackers;
        if (eventtrackers && isArray(eventtrackers)) {
          eventtrackers.forEach(trackCfg => {
            if (trackCfg.url && trackCfg.url.includes('dom_id=%native_dom_id%')) {
              const prebidParams = 'pbjs_adid=' + (bidResponse.adId || bidResponse.requestId) + ';pbjs_auc=' + (bidRequest?.adUnitCode || '');
              trackCfg.url = trackCfg.url.replace('dom_id=%native_dom_id%', prebidParams);
            }
          });
          if (nativeAdm.native) {
            nativeAdm.native.eventtrackers = eventtrackers;
          } else {
            nativeAdm.eventtrackers = eventtrackers;
          }
        }
        // Stringify native ADM to ensure 'ad' field is available for tracking
        bidResponse.ad = JSON.stringify(nativeAdm);

        // 2. Manual Mapping - OpenRTB 1.2 asset array format
        const nativeAd = nativeAdm.native || nativeAdm;
        const native = {
          clickUrl: nativeAd.link?.url,
          clickTrackers: nativeAd.link?.clicktrackers || nativeAd.link?.click_trackers || [],
          impressionTrackers: nativeAd.imptrackers || nativeAd.impression_trackers || [],
          privacyLink: nativeAd.privacy || nativeAd.privacy_link,
        };

        const nativeDataTypeById = {};
        const nativeImgTypeById = {};
        try {
          const ortbImp = context.imp || (context.request ?? context.ortbRequest)?.imp?.find(i => i.id === bid.impid);
          if (ortbImp) {
            const reqStr = ortbImp.native?.request;
            const nativeReq = reqStr ? (isStr(reqStr) ? JSON.parse(reqStr) : reqStr) : null;
            (nativeReq?.assets || []).forEach(a => {
              if (a.data?.type) nativeDataTypeById[a.id] = a.data.type;
              if (a.img?.type) nativeImgTypeById[a.id] = a.img.type;
            });
          }
        } catch (e) {
          logError('Mediafuse Native fallback error', e);
        }

        try {
          (nativeAd.assets || []).forEach(asset => {
            if (asset.title) {
              native.title = asset.title.text;
            } else if (asset.img) {
              const imgType = asset.img.type ?? nativeImgTypeById[asset.id];
              if (imgType === 1) {
                native.icon = { url: asset.img.url, width: asset.img.w || asset.img.width, height: asset.img.h || asset.img.height };
              } else {
                native.image = { url: asset.img.url, width: asset.img.w || asset.img.width, height: asset.img.h || asset.img.height };
              }
            } else if (asset.data) {
              switch (asset.data.type ?? nativeDataTypeById[asset.id]) {
                case 1: native.sponsoredBy = asset.data.value; break;
                case 2: native.body = asset.data.value; break;
                case 3: native.rating = asset.data.value; break;
                case 4: native.likes = asset.data.value; break;
                case 5: native.downloads = asset.data.value; break;
                case 6: native.price = asset.data.value; break;
                case 7: native.salePrice = asset.data.value; break;
                case 8: native.phone = asset.data.value; break;
                case 9: native.address = asset.data.value; break;
                case 10: native.body2 = asset.data.value; break;
                case 11: native.displayUrl = asset.data.value; break;
                case 12: native.cta = asset.data.value; break;
              }
            }
          });

          // Fallback for non-asset based native response (AppNexus legacy format)
          if (!native.title && nativeAd.title) {
            native.title = (isStr(nativeAd.title)) ? nativeAd.title : nativeAd.title.text;
          }
          if (!native.body && nativeAd.desc) {
            native.body = nativeAd.desc;
          }
          if (!native.body2 && nativeAd.desc2) native.body2 = nativeAd.desc2;
          if (!native.cta && nativeAd.ctatext) native.cta = nativeAd.ctatext;
          if (!native.rating && nativeAd.rating) native.rating = nativeAd.rating;
          if (!native.sponsoredBy && nativeAd.sponsored) native.sponsoredBy = nativeAd.sponsored;
          if (!native.displayUrl && nativeAd.displayurl) native.displayUrl = nativeAd.displayurl;
          if (!native.address && nativeAd.address) native.address = nativeAd.address;
          if (!native.downloads && nativeAd.downloads) native.downloads = nativeAd.downloads;
          if (!native.likes && nativeAd.likes) native.likes = nativeAd.likes;
          if (!native.phone && nativeAd.phone) native.phone = nativeAd.phone;
          if (!native.price && nativeAd.price) native.price = nativeAd.price;
          if (!native.salePrice && nativeAd.saleprice) native.salePrice = nativeAd.saleprice;

          if (!native.image && nativeAd.main_img) {
            native.image = { url: nativeAd.main_img.url, width: nativeAd.main_img.width, height: nativeAd.main_img.height };
          }
          if (!native.icon && nativeAd.icon) {
            native.icon = { url: nativeAd.icon.url, width: nativeAd.icon.width, height: nativeAd.icon.height };
          }

          bidResponse.native = native;

          let jsTrackers = nativeAd.javascript_trackers;
          const viewabilityConfig = deepAccess(bid, 'ext.appnexus.viewability.config');
          if (viewabilityConfig) {
            const jsTrackerDisarmed = viewabilityConfig.replace(/src=/g, 'data-src=');
            if (jsTrackers == null) {
              jsTrackers = [jsTrackerDisarmed];
            } else if (isStr(jsTrackers)) {
              jsTrackers = [jsTrackers, jsTrackerDisarmed];
            } else if (isArray(jsTrackers)) {
              jsTrackers = [...jsTrackers, jsTrackerDisarmed];
            }
          } else if (isArray(nativeAd.eventtrackers)) {
            const trackers = nativeAd.eventtrackers
              .filter(t => t.method === 1)
              .map(t => (t.url && t.url.match(VIEWABILITY_URL_START) && t.url.indexOf(VIEWABILITY_FILE_NAME) > -1)
                ? t.url.replace(/src=/g, 'data-src=')
                : t.url
              ).filter(url => url);

            if (jsTrackers == null) {
              jsTrackers = trackers;
            } else if (isStr(jsTrackers)) {
              jsTrackers = [jsTrackers, ...trackers];
            } else if (isArray(jsTrackers)) {
              jsTrackers = [...jsTrackers, ...trackers];
            }
          }
          if (bidResponse.native) {
            bidResponse.native.javascriptTrackers = jsTrackers;
          }
        } catch (e) {
          logError('Mediafuse Native mapping error', e);
        }
        // Ensure 'ad' field is set for native responses that lack it
        if (bidResponse.native && !bidResponse.ad) {
          bidResponse.ad = JSON.stringify({ native: bidResponse.native });
        }
      } catch (e) {
        logError('Mediafuse Native JSON parse error', e);
      }
    }

    // Banner Trackers
    if (mediaType === BANNER && extANData?.trackers) {
      extANData.trackers.forEach(tracker => {
        if (tracker.impression_urls) {
          tracker.impression_urls.forEach(url => {
            bidResponse.ad = (bidResponse.ad || '') + createTrackPixelHtml(url);
          });
        }
      });
    }

    return bidResponse;
  }
});

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return (bid.params.reserve != null) ? bid.params.reserve : null;
  }
  // Mediafuse/AppNexus generally expects USD for its RTB endpoints
  let floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
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
    logWarn('Prebid Error calling setRender on renderer', err);
  }

  renderer.setEventHandlers({
    impression: () => logMessage('Mediafuse outstream video impression event'),
    loaded: () => logMessage('Mediafuse outstream video loaded event'),
    ended: () => {
      logMessage('Mediafuse outstream renderer video event');
      const el = document.querySelector(`#${adUnitCode}`);
      if (el) {
        el.style.display = 'none';
      }
    },
  });
  return renderer;
}

function hidedfpContainer(elementId) {
  try {
    const el = document.getElementById(elementId).querySelectorAll("div[id^='google_ads']");
    if (el[0]) {
      el[0].style.setProperty('display', 'none');
    }
  } catch (e) {
    logWarn('Mediafuse: hidedfpContainer error', e);
  }
}

function hideSASIframe(elementId) {
  try {
    const el = document.getElementById(elementId).querySelectorAll("script[id^='sas_script']");
    if (el[0]?.nextSibling?.localName === 'iframe') {
      el[0].nextSibling.style.setProperty('display', 'none');
    }
  } catch (e) {
    logWarn('Mediafuse: hideSASIframe error', e);
  }
}

function handleOutstreamRendererEvents(bid, id, eventName) {
  try {
    bid.renderer.handleVideoEvent({
      id,
      eventName,
    });
  } catch (err) {
    logWarn(`Mediafuse: handleOutstreamRendererEvents error for ${eventName}`, err);
  }
}

function outstreamRender(bid, doc) {
  hidedfpContainer(bid.adUnitCode);
  hideSASIframe(bid.adUnitCode);
  bid.renderer.push(() => {
    const win = doc?.defaultView || window;
    if (win.ANOutstreamVideo) {
      let sizes = bid.getSize();
      if (typeof sizes === 'string' && sizes.indexOf('x') > -1) {
        sizes = [sizes.split('x').map(Number)];
      } else if (!isArray(sizes) || (isArray(sizes) && !isArray(sizes[0]))) {
        sizes = [sizes];
      }

      win.ANOutstreamVideo.renderAd({
        tagId: bid.adResponse.tag_id,
        sizes: sizes,
        targetId: bid.adUnitCode,
        uuid: bid.requestId,
        adResponse: bid.adResponse,
        rendererOptions: bid.renderer.getConfig(),
      },
      handleOutstreamRendererEvents.bind(null, bid)
      );
    }
  });
}

function hasOmidSupport(bid) {
  let hasOmid = false;
  const bidderParams = bid?.params;
  const videoParams = bid?.mediaTypes?.video?.api;
  if (bidderParams?.frameworks && isArray(bidderParams.frameworks)) {
    hasOmid = bidderParams.frameworks.includes(OMID_FRAMEWORK);
  }
  if (!hasOmid && isArray(videoParams)) {
    hasOmid = videoParams.includes(OMID_API);
  }
  return hasOmid;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: function (bid) {
    const params = bid?.params;
    if (!params) return false;
    return !!(params.placementId || params.placement_id || (params.member && (params.invCode || params.inv_code)));
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const options = {
      withCredentials: true
    };

    if (getParameterByName('apn_test')?.toUpperCase() === 'TRUE' || config.getConfig('apn_test') === true) {
      options.customHeaders = { 'X-Is-Test': 1 };
    }

    const requests = [];
    const chunkedRequests = chunk(bidRequests, MAX_IMPS_PER_REQUEST);

    chunkedRequests.forEach(batch => {
      const data = converter.toORTB({ bidRequests: batch, bidderRequest });

      let endpointUrl = ENDPOINT_URL_NORMAL;
      if (!hasPurpose1Consent(bidderRequest.gdprConsent)) {
        endpointUrl = ENDPOINT_URL_SIMPLE;
      }

      // Debug logic
      let debugObj = {};
      const debugCookie = storage.getCookie('apn_prebid_debug');
      if (debugCookie) {
        try {
          debugObj = JSON.parse(debugCookie);
        } catch (e) {
          logWarn('Mediafuse: failed to parse debug cookie', e);
        }
      } else {
        Object.keys(DEBUG_QUERY_PARAM_MAP).forEach(qparam => {
          const qval = getParameterByName(qparam);
          if (qval) debugObj[DEBUG_QUERY_PARAM_MAP[qparam]] = qval;
        });
        if (Object.keys(debugObj).length > 0 && !('enabled' in debugObj)) debugObj.enabled = true;
      }

      if (debugObj.enabled) {
        logInfo('MediaFuse Debug Auction Settings:\n\n' + JSON.stringify(debugObj, null, 4));
        endpointUrl += (endpointUrl.indexOf('?') === -1 ? '?' : '&') +
          Object.keys(debugObj).filter(p => DEBUG_PARAMS.includes(p))
            .map(p => (p === 'enabled') ? `debug=1` : `${p}=${debugObj[p]}`).join('&');
      }

      // member_id optimization
      const memberBid = batch.find(bid => bid.params && bid.params.member);
      const member = memberBid && memberBid.params.member;
      if (member) {
        endpointUrl += (endpointUrl.indexOf('?') === -1 ? '?' : '&') + 'member_id=' + member;
      }

      requests.push({
        method: 'POST',
        url: endpointUrl,
        data,
        bidderRequest,
        options
      });
    });

    return requests;
  },

  interpretResponse: function (serverResponse, request) {
    const bids = converter.fromORTB({
      response: serverResponse.body,
      request: request.data,
      context: {
        ortbRequest: request.data
      }
    }).bids;

    // allowZeroCpmBids check
    const allowZeroCpm = bidderSettings.get(BIDDER_CODE, 'allowZeroCpmBids') === true;
    const filteredBids = bids.filter(bid => allowZeroCpm ? bid.cpm >= 0 : bid.cpm > 0);

    // Debug logging
    if (serverResponse.body?.debug?.debug_info) {
      const debugHeader = 'MediaFuse Debug Auction for Prebid\n\n';
      let debugText = debugHeader + serverResponse.body.debug.debug_info;
      debugText = debugText
        .replace(/(<td>|<th>)/gm, '\t')
        .replace(/(<\/td>|<\/th>)/gm, '\n')
        .replace(/^<br>/gm, '')
        .replace(/(<br>\n|<br>)/gm, '\n')
        .replace(/<h1>(.*)<\/h1>/gm, '\n\n===== $1 =====\n\n')
        .replace(/<h[2-6]>(.*)<\/h[2-6]>/gm, '\n\n*** $1 ***\n\n')
        .replace(/(<([^>]+)>)/igm, '');
      logMessage(debugText);
    }

    return filteredBids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];
    let gdprParams = '';

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        gdprParams = `?gdpr_consent=${gdprConsent.consentString}`;
      }
    }

    if (syncOptions.iframeEnabled && hasPurpose1Consent(gdprConsent)) {
      syncs.push({
        type: 'iframe',
        url: 'https://acdn.adnxs.com/dmp/async_usersync.html' + gdprParams
      });
    }

    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      const userSync = deepAccess(serverResponses[0], 'body.ext.appnexus.userSync');
      if (userSync && userSync.url) {
        let url = userSync.url;
        if (gdprParams) {
          url += (url.indexOf('?') === -1 ? '?' : '&') + gdprParams.substring(1);
        }
        syncs.push({
          type: 'image',
          url: url
        });
      }
    }
    return syncs;
  },

  onBidWon: function (bid) {
    if (bid.native) {
      reloadViewabilityScriptWithCorrectParameters(bid);
    }
  },

  onBidderError: function ({ error, bidderRequest }) {
    logMessage(`Mediafuse Bidder Error: ${error}`, bidderRequest);
  }
};

function reloadViewabilityScriptWithCorrectParameters(bid) {
  const viewJsPayload = getMediafuseViewabilityScriptFromJsTrackers(bid.native.javascriptTrackers);

  if (viewJsPayload) {
    const prebidParams = 'pbjs_adid=' + bid.adId + ';pbjs_auc=' + bid.adUnitCode;
    const jsTrackerSrc = getViewabilityScriptUrlFromPayload(viewJsPayload);
    const newJsTrackerSrc = jsTrackerSrc.replace('dom_id=%native_dom_id%', prebidParams);

    // find iframe containing script tag
    const frameArray = document.getElementsByTagName('iframe');

    // flag to modify only one script — prevents multiple scripts from pointing to the same creative
    let modifiedAScript = false;

    // loop on all iframes
    for (let i = 0; i < frameArray.length && !modifiedAScript; i++) {
      const currentFrame = frameArray[i];
      try {
        const nestedDoc = currentFrame.contentDocument || currentFrame.contentWindow.document;
        if (nestedDoc) {
          const scriptArray = nestedDoc.getElementsByTagName('script');
          for (let j = 0; j < scriptArray.length && !modifiedAScript; j++) {
            const currentScript = scriptArray[j];
            if (currentScript.getAttribute('data-src') === jsTrackerSrc) {
              currentScript.setAttribute('src', newJsTrackerSrc);
              currentScript.setAttribute('data-src', '');
              if (currentScript.removeAttribute) {
                currentScript.removeAttribute('data-src');
              }
              modifiedAScript = true;
            }
          }
        }
      } catch (exception) {
        if (!(exception instanceof DOMException && exception.name === 'SecurityError')) {
          throw exception;
        }
      }
    }
  }
}

function strIsMediafuseViewabilityScript(str) {
  const regexMatchUrlStart = str.match(VIEWABILITY_URL_START);
  const viewUrlStartInStr = regexMatchUrlStart != null && regexMatchUrlStart.length >= 1;
  const regexMatchFileName = str.match(VIEWABILITY_FILE_NAME);
  const fileNameInStr = regexMatchFileName != null && regexMatchFileName.length >= 1;

  return str.startsWith('<script') && fileNameInStr && viewUrlStartInStr;
}

function getMediafuseViewabilityScriptFromJsTrackers(jsTrackerArray) {
  let viewJsPayload;
  if (isStr(jsTrackerArray) && strIsMediafuseViewabilityScript(jsTrackerArray)) {
    viewJsPayload = jsTrackerArray;
  } else if (isArray(jsTrackerArray)) {
    for (let i = 0; i < jsTrackerArray.length; i++) {
      const currentJsTracker = jsTrackerArray[i];
      if (strIsMediafuseViewabilityScript(currentJsTracker)) {
        viewJsPayload = currentJsTracker;
      }
    }
  }
  return viewJsPayload;
}

function getViewabilityScriptUrlFromPayload(viewJsPayload) {
  const indexOfFirstQuote = viewJsPayload.indexOf('src="') + 5;
  const indexOfSecondQuote = viewJsPayload.indexOf('"', indexOfFirstQuote);
  return viewJsPayload.substring(indexOfFirstQuote, indexOfSecondQuote);
}

registerBidder(spec);
