import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { getStorageManager } from '../src/storageManager.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { bidderSettings } from '../src/bidderSettings.js';
import {
  deepAccess,
  deepSetValue,
  getParameterByName,
  isArray,
  isArrayOfNums,
  isFn,
  isNumber,
  isPlainObject,
  isStr,
  isEmpty,
  logError,
  logInfo,
  logMessage,
  logWarn,
  createTrackPixelHtml
} from '../src/utils.js';
import { config } from '../src/config.js';
import { APPNEXUS_CATEGORY_MAPPING } from '../libraries/categoryTranslationMapping/index.js';
import {
  getANKewyordParamFromMaps,
  getANKeywordParam
} from '../libraries/appnexusUtils/anKeywords.js';
import { fill } from '../libraries/appnexusUtils/anUtils.js';
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
const USER_PARAMS = ['age', 'externalUid', 'segments', 'gender', 'dnt', 'language'];

const VIEWABILITY_URL_START = /\/\/cdn\.adnxs\.com\/v|\/\/cdn\.adnxs-simple\.com\/v/;
const VIEWABILITY_FILE_NAME = 'trk.js';

const storage = getStorageManager({ bidderCode: BIDDER_CODE });

/**
 * Modernized Mediafuse Bid Adapter using ortbConverter.
 * Compatible with Prebid 9 and 10.
 */

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
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

    const isAdPod = deepAccess(bidRequest, 'mediaTypes.video.context') === 'adpod';
    extANData.hb_source = isAdPod ? 7 : 1;

    if (imp.video) {
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
      if (videoMediaType) {
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
                  }).filter(v => v);
                  extANData.video_frameworks = apiTmp;
                }
                break;
            }
          });
      }

      if (deepAccess(bidRequest, 'mediaTypes.video.context') === 'outstream') {
        imp.video.placement = imp.video.placement || 4;
      }

      if (bidRequest.renderer) {
        extANData.custom_renderer_present = true;
      }
    }

    // Force creative override logic
    const overrides = getParameterByName('ast_override_div');
    if (overrides) {
      const adUnitOverride = decodeURIComponent(overrides).split(',').find((pair) => pair.startsWith(`${bidRequest.adUnitCode}:`));
      if (adUnitOverride) {
        const forceCreativeId = adUnitOverride.split(':')[1];
        if (forceCreativeId) {
          extANData.force_creative_id = parseInt(forceCreativeId, 10);
        }
      }
    }

    // Optional params map
    const optionalParamsMap = {
      'allowSmallerSizes': 'allow_smaller_sizes',
      'usePaymentRule': 'use_pmt_rule',
      'trafficSourceCode': 'traffic_source_code',
      'pubClick': 'pubclick',
      'extInvCode': 'ext_inv_code',
      'externalImpId': 'ext_imp_id',
      'publisherId': 'publisher_id',
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

    // Snake-case catch-all
    const knownParams = ['placementId', 'placement_id', 'invCode', 'inv_code', 'member', 'keywords', 'reserve', 'video', 'user', 'app', 'frameworks', 'position', ...Object.keys(optionalParamsMap), ...Object.values(optionalParamsMap), 'banner_frameworks', 'video_frameworks'];
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
      hb_source: isAdPodRequest(imps) ? 7 : 1,
      sdk: {
        version: '$prebid.version$',
        source: SOURCE
      }
    };

    if (config.getConfig('adpod.brandCategoryExclusion')) {
      extANData.brand_category_uniqueness = true;
    }

    if (bidderRequest?.refererInfo) {
      const refererinfo = {
        rd_ref: encodeURIComponent(bidderRequest.refererInfo.topmostLocation),
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
    const expandedBids = bidderRequest.bids || [];
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
    let mediaType;
    const bidAdType = bid?.ext?.appnexus?.bid_ad_type;
    const extANData = deepAccess(bid, 'ext.appnexus');

    if (isNumber(bidAdType) && RESPONSE_MEDIA_TYPE_MAP.hasOwnProperty(bidAdType)) {
      mediaType = RESPONSE_MEDIA_TYPE_MAP[bidAdType];
      // Native Masquerading
      if (mediaType === NATIVE) {
        context.mediaType = BANNER;
      } else {
        context.mediaType = mediaType;
      }
    }

    const bidResponse = buildBidResponse(bid, context);

    if (mediaType === NATIVE) {
      bidResponse.mediaType = NATIVE;
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
      bidResponse.meta = Object.assign({}, bidResponse.meta, { advertiserDomains: [] });
    }

    // Video
    if (mediaType === VIDEO) {
      bidResponse.ttl = 3600;
      if (bid.nurl) {
        bidResponse.vastImpUrl = bid.nurl;
      }

      const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
      if (videoContext === 'adpod') {
        if (extANData?.brand_category_id && APPNEXUS_CATEGORY_MAPPING[extANData.brand_category_id]) {
          bidResponse.meta.primaryCatId = APPNEXUS_CATEGORY_MAPPING[extANData.brand_category_id];
        }
        bidResponse.video = {
          context: 'adpod',
          dealTier: extANData?.deal_priority
        };
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
        bidResponse.renderer = newRenderer(bidResponse.adUnitCode, {
          renderer_url: extANData.renderer_url,
          renderer_id: extANData.renderer_id,
        }, rendererOptions);
      } else if (bid.nurl && extANData?.asset_url) {
        bidResponse.vastUrl = bid.nurl + '&redir=' + encodeURIComponent(extANData.asset_url);
      }
    }

    // Native Manual Mapping
    if (mediaType === NATIVE) {
      try {
        const nativeAdm = JSON.parse(bid.adm);
        const nativeAd = nativeAdm.native || nativeAdm;
        bidResponse.native = {
          title: nativeAd.title,
          body: nativeAd.desc,
          body2: nativeAd.desc2,
          cta: nativeAd.ctatext,
          rating: nativeAd.rating,
          sponsoredBy: nativeAd.sponsored,
          privacyLink: nativeAd.privacy_link,
          address: nativeAd.address,
          downloads: nativeAd.downloads,
          likes: nativeAd.likes,
          phone: nativeAd.phone,
          price: nativeAd.price,
          salePrice: nativeAd.saleprice,
          clickUrl: nativeAd.link?.url,
          displayUrl: nativeAd.displayurl,
          clickTrackers: nativeAd.link?.click_trackers,
          impressionTrackers: nativeAd.impression_trackers,
        };

        if (nativeAd.main_img) {
          bidResponse.native.image = { url: nativeAd.main_img.url, width: nativeAd.main_img.width, height: nativeAd.main_img.height };
        }
        if (nativeAd.icon) {
          bidResponse.native.icon = { url: nativeAd.icon.url, width: nativeAd.icon.width, height: nativeAd.icon.height };
        }

        let jsTrackers = nativeAd.javascript_trackers;
        const viewabilityConfig = deepAccess(bid, 'ext.appnexus.viewability.config');
        if (viewabilityConfig) {
          const jsTrackerDisarmed = viewabilityConfig.replace('src=', 'data-src=');
          if (jsTrackers === undefined || jsTrackers === null) {
            jsTrackers = [jsTrackerDisarmed];
          } else if (isStr(jsTrackers)) {
            jsTrackers = [jsTrackers, jsTrackerDisarmed];
          } else if (isArray(jsTrackers)) {
            jsTrackers.push(jsTrackerDisarmed);
          }
        } else if (nativeAd.eventtrackers) {
          nativeAd.eventtrackers.forEach(track => {
            if (track.method === 1 && track.url.match(VIEWABILITY_URL_START) && track.url.indexOf(VIEWABILITY_FILE_NAME) > -1) {
              track.url = track.url.replace('src=', 'data-src=');
            }
          });
          const trackers = nativeAd.eventtrackers.filter(t => t.method === 1).map(t => t.url);
          if (jsTrackers === undefined || jsTrackers === null) {
            jsTrackers = trackers;
          } else if (isStr(jsTrackers)) {
            jsTrackers = [jsTrackers, ...trackers];
          } else if (isArray(jsTrackers)) {
            jsTrackers.push(...trackers);
          }
        }
        bidResponse.native.javascriptTrackers = jsTrackers;
      } catch (e) {
        logError('Mediafuse Native adm parse error', e);
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
    return bid.params.reserve ? bid.params.reserve : null;
  }
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
      document.querySelector(`#${adUnitCode}`).style.display = 'none';
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
  } catch (e) { }
}

function hideSASIframe(elementId) {
  try {
    const el = document.getElementById(elementId).querySelectorAll("script[id^='sas_script']");
    if (el[0]?.nextSibling?.localName === 'iframe') {
      el[0].nextSibling.style.setProperty('display', 'none');
    }
  } catch (e) { }
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
  bid.renderer.push(() => {
    const win = doc?.defaultView || window;
    if (win.ANOutstreamVideo) {
      win.ANOutstreamVideo.renderAd({
        tagId: bid.adResponse.tag_id,
        sizes: [bid.getSize().split('x')],
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

function createAdPodRequest(bidRequest) {
  const { durationRangeSec, requireExactDuration, adPodDurationSec } = bidRequest.mediaTypes.video;
  const minAllowedDuration = Math.min(...durationRangeSec);
  const numberOfPlacements = requireExactDuration
    ? Math.max(Math.floor(adPodDurationSec / minAllowedDuration), durationRangeSec.length)
    : Math.floor(adPodDurationSec / minAllowedDuration);

  const requests = fill(bidRequest, numberOfPlacements);
  requests.forEach((req, index) => {
    req.bidId = `${bidRequest.bidId}_${index}`;
  });

  if (requireExactDuration) {
    const divider = Math.ceil(numberOfPlacements / durationRangeSec.length);
    const chunked = chunk(requests, divider);

    durationRangeSec.forEach((duration, index) => {
      if (chunked[index]) {
        chunked[index].forEach(req => {
          deepSetValue(req, 'mediaTypes.video.minduration', duration);
          deepSetValue(req, 'mediaTypes.video.maxduration', duration);
        });
      }
    });
  } else {
    const maxDuration = Math.max(...durationRangeSec);
    requests.forEach(req => {
      deepSetValue(req, 'mediaTypes.video.maxduration', maxDuration);
    });
  }

  return requests;
}

function convertCamelToUnderscore(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function isAdPodRequest(imps) {
  return imps.some(imp => deepAccess(imp, 'ext.appnexus.hb_source') === 7);
}

function hasOmidSupport(bid) {
  let hasOmid = false;
  const bidderParams = bid?.params;
  const videoParams = bid?.mediaTypes?.video?.api;
  if (bidderParams?.frameworks && isArray(bidderParams.frameworks)) {
    hasOmid = bidderParams.frameworks.includes(6);
  }
  if (!hasOmid && isArray(videoParams)) {
    hasOmid = videoParams.includes(7);
  }
  return hasOmid;
}

function reloadViewabilityScriptWithCorrectParameters(bid) {
  const jsTrackers = bid.native?.javascriptTrackers;
  if (!jsTrackers) return;

  const prebidParams = 'pbjs_adid=' + bid.adId + ';pbjs_auc=' + bid.adUnitCode;

  // Find the tracker that needs arming (contains trk.js and has dom_id macro)
  const tracker = isArray(jsTrackers) ? jsTrackers.find(t => t.includes('trk.js')) : (isStr(jsTrackers) && jsTrackers.includes('trk.js') ? jsTrackers : null);
  if (!tracker) return;

  let jsTrackerSrc;
  if (tracker.indexOf('src="') > -1) {
    // It's an HTML-like snippet (Bak style)
    jsTrackerSrc = tracker.substring(tracker.indexOf('src="') + 5, tracker.indexOf('"', tracker.indexOf('src="') + 5));
  } else {
    // It's a raw URL (Modern style)
    jsTrackerSrc = tracker;
  }

  try {
    const frames = document.getElementsByTagName('iframe');
    let modifiedAScript = false;
    for (let i = 0; i < frames.length && !modifiedAScript; i++) {
      const frameDoc = frames[i].contentDocument || frames[i].contentWindow.document;
      if (frameDoc) {
        const scripts = frameDoc.getElementsByTagName('script');
        for (let j = 0; j < scripts.length && !modifiedAScript; j++) {
          const dataSrc = scripts[j].getAttribute('data-src');
          if (dataSrc && dataSrc.includes(jsTrackerSrc.replace('data-src=', 'src=').split('?')[0])) {
            scripts[j].setAttribute('src', dataSrc.replace('dom_id=%native_dom_id%', prebidParams));
            scripts[j].removeAttribute('data-src');
            modifiedAScript = true;
          }
        }
      }
    }
  } catch (e) { }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  alwaysHasCapacity: true,
  aliases: [{ code: 'mediafuseBidAdapter', gvlid: GVLID }],

  isBidRequestValid: function (bid) {
    return !!(bid.params.placementId || bid.params.placement_id || (bid.params.member && (bid.params.invCode || bid.params.inv_code)));
  },

  buildRequests: function (bidRequests, bidderRequest) {
    // AdPod Expansion
    let expandedBidRequests = [];
    bidRequests.forEach(bid => {
      if (deepAccess(bid, 'mediaTypes.video.context') === 'adpod') {
        expandedBidRequests.push(...createAdPodRequest(bid));
      } else {
        expandedBidRequests.push(bid);
      }
    });

    const options = {
      withCredentials: true
    };

    if (getParameterByName('apn_test')?.toUpperCase() === 'TRUE' || config.getConfig('apn_test') === true) {
      options.customHeaders = { 'X-Is-Test': 1 };
    }

    const requests = [];
    const chunkedRequests = chunk(expandedBidRequests, MAX_IMPS_PER_REQUEST);

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
        try { debugObj = JSON.parse(debugCookie); } catch (e) { }
      } else {
        Object.keys(DEBUG_QUERY_PARAM_MAP).forEach(qparam => {
          const qval = getParameterByName(qparam);
          if (qval) debugObj[DEBUG_QUERY_PARAM_MAP[qparam]] = qval;
        });
        if (Object.keys(debugObj).length > 0 && !debugObj.hasOwnProperty('enabled')) debugObj.enabled = true;
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
      request: request.data
    }).bids;

    // allowZeroCpmBids check
    const filteredBids = bids.filter(bid => {
      const allowZeroCpm = bidderSettings.get(BIDDER_CODE, 'allowZeroCpmBids') === true;
      return allowZeroCpm ? bid.cpm >= 0 : bid.cpm > 0;
    });

    // Debug logging
    if (serverResponse.body?.debug?.debug_info) {
      const debugHeader = 'MediaFuse Debug Auction for Prebid\n\n'
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

  onTimeout: function (data) {
    // Bidder specific code
  },

  onSetTargeting: function (bid) {
    // Bidder specific code
  },

  onBidderError: function ({ error, bidderRequest }) {
    logMessage(`Mediafuse Bidder Error: ${error}`, bidderRequest);
  },

  onAdRenderSucceeded: function (bid) {
    // Bidder specific code
  }
};

registerBidder(spec);
