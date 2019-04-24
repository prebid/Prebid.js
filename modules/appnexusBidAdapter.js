import { Renderer } from '../src/Renderer';
import * as utils from '../src/utils';
import { config } from '../src/config';
import { registerBidder, getIabSubCategory } from '../src/adapters/bidderFactory';
import { BANNER, NATIVE, VIDEO, ADPOD } from '../src/mediaTypes';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';

const BIDDER_CODE = 'appnexus';
const URL = '//ib.adnxs.com/ut/v3/prebid';
const VIDEO_TARGETING = ['id', 'mimes', 'minduration', 'maxduration',
  'startdelay', 'skippable', 'playback_method', 'frameworks'];
const USER_PARAMS = ['age', 'externalUid', 'segments', 'gender', 'dnt', 'language'];
const APP_DEVICE_PARAMS = ['geo', 'device_id']; // appid is collected separately
const DEBUG_PARAMS = ['enabled', 'dongle', 'member_id', 'debug_timeout'];
const NATIVE_MAPPING = {
  body: 'description',
  body2: 'desc2',
  cta: 'ctatext',
  image: {
    serverName: 'main_image',
    requiredParams: { required: true },
    minimumParams: { sizes: [{}] },
  },
  icon: {
    serverName: 'icon',
    requiredParams: { required: true },
    minimumParams: { sizes: [{}] },
  },
  sponsoredBy: 'sponsored_by',
  privacyLink: 'privacy_link',
  salePrice: 'saleprice',
  displayUrl: 'displayurl'
};
const SOURCE = 'pbjs';
const MAX_IMPS_PER_REQUEST = 15;
const mappingFileUrl = '//acdn.adnxs.com/prebid/appnexus-mapping/mappings.json';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['appnexusAst', 'brealtime', 'emxdigital', 'pagescience', 'defymedia', 'gourmetads', 'matomy', 'featureforward', 'oftmedia', 'districtm'],
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    const tags = bidRequests.map(bidToTag);
    const userObjBid = find(bidRequests, hasUserInfo);
    let userObj;
    if (userObjBid) {
      userObj = {};
      Object.keys(userObjBid.params.user)
        .filter(param => includes(USER_PARAMS, param))
        .forEach(param => userObj[param] = userObjBid.params.user[param]);
    }

    const appDeviceObjBid = find(bidRequests, hasAppDeviceInfo);
    let appDeviceObj;
    if (appDeviceObjBid && appDeviceObjBid.params && appDeviceObjBid.params.app) {
      appDeviceObj = {};
      Object.keys(appDeviceObjBid.params.app)
        .filter(param => includes(APP_DEVICE_PARAMS, param))
        .forEach(param => appDeviceObj[param] = appDeviceObjBid.params.app[param]);
    }

    const appIdObjBid = find(bidRequests, hasAppId);
    let appIdObj;
    if (appIdObjBid && appIdObjBid.params && appDeviceObjBid.params.app && appDeviceObjBid.params.app.id) {
      appIdObj = {
        appid: appIdObjBid.params.app.id
      };
    }

    let debugObj = {};
    let debugObjParams = {};
    const debugCookieName = 'apn_prebid_debug';
    const debugCookie = utils.getCookie(debugCookieName) || null;

    if (debugCookie) {
      try {
        debugObj = JSON.parse(debugCookie);
      } catch (e) {
        utils.logError('AppNexus Debug Auction Cookie Error:\n\n' + e);
      }
    } else {
      const debugBidRequest = find(bidRequests, hasDebug);
      if (debugBidRequest && debugBidRequest.debug) {
        debugObj = debugBidRequest.debug;
      }
    }

    if (debugObj && debugObj.enabled) {
      Object.keys(debugObj)
        .filter(param => includes(DEBUG_PARAMS, param))
        .forEach(param => {
          debugObjParams[param] = debugObj[param];
        });
    }

    const memberIdBid = find(bidRequests, hasMemberId);
    const member = memberIdBid ? parseInt(memberIdBid.params.member, 10) : 0;

    const payload = {
      tags: [...tags],
      user: userObj,
      sdk: {
        source: SOURCE,
        version: '$prebid.version$'
      }
    };

    if (member > 0) {
      payload.member_id = member;
    }

    if (appDeviceObjBid) {
      payload.device = appDeviceObj
    }
    if (appIdObjBid) {
      payload.app = appIdObj;
    }

    if (config.getConfig('adpod.brandCategoryExclusion')) {
      payload.brand_category_uniqueness = true;
    }

    if (debugObjParams.enabled) {
      payload.debug = debugObjParams;
      utils.logInfo('AppNexus Debug Auction Settings:\n\n' + JSON.stringify(debugObjParams, null, 4));
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      // note - objects for impbus use underscore instead of camelCase
      payload.gdpr_consent = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: bidderRequest.gdprConsent.gdprApplies
      };
    }

    if (bidderRequest && bidderRequest.refererInfo) {
      let refererinfo = {
        rd_ref: encodeURIComponent(bidderRequest.refererInfo.referer),
        rd_top: bidderRequest.refererInfo.reachedTop,
        rd_ifs: bidderRequest.refererInfo.numIframes,
        rd_stk: bidderRequest.refererInfo.stack.map((url) => encodeURIComponent(url)).join(',')
      }
      payload.referrer_detection = refererinfo;
    }

    const hasAdPodBid = find(bidRequests, hasAdPod);
    if (hasAdPodBid) {
      bidRequests.filter(hasAdPod).forEach(adPodBid => {
        const adPodTags = createAdPodRequest(tags, adPodBid);
        // don't need the original adpod placement because it's in adPodTags
        const nonPodTags = payload.tags.filter(tag => tag.uuid !== adPodBid.bidId);
        payload.tags = [...nonPodTags, ...adPodTags];
      });
    }

    const request = formatRequest(payload, bidderRequest);
    return request;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, {bidderRequest}) {
    serverResponse = serverResponse.body;
    const bids = [];
    if (!serverResponse || serverResponse.error) {
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
      if (serverResponse && serverResponse.error) { errorMessage += `: ${serverResponse.error}`; }
      utils.logError(errorMessage);
      return bids;
    }

    if (serverResponse.tags) {
      serverResponse.tags.forEach(serverBid => {
        const rtbBid = getRtbBid(serverBid);
        if (rtbBid) {
          if (rtbBid.cpm !== 0 && includes(this.supportedMediaTypes, rtbBid.ad_type)) {
            const bid = newBid(serverBid, rtbBid, bidderRequest);
            bid.mediaType = parseMediaType(rtbBid);
            bids.push(bid);
          }
        }
      });
    }

    if (serverResponse.debug && serverResponse.debug.debug_info) {
      let debugHeader = 'AppNexus Debug Auction for Prebid\n\n'
      let debugText = debugHeader + serverResponse.debug.debug_info
      debugText = debugText
        .replace(/(<td>|<th>)/gm, '\t') // Tables
        .replace(/(<\/td>|<\/th>)/gm, '\n') // Tables
        .replace(/^<br>/gm, '') // Remove leading <br>
        .replace(/(<br>\n|<br>)/gm, '\n') // <br>
        .replace(/<h1>(.*)<\/h1>/gm, '\n\n===== $1 =====\n\n') // Header H1
        .replace(/<h[2-6]>(.*)<\/h[2-6]>/gm, '\n\n*** $1 ***\n\n') // Headers
        .replace(/(<([^>]+)>)/igm, ''); // Remove any other tags
      utils.logMessage('https://console.appnexus.com/docs/understanding-the-debug-auction');
      utils.logMessage(debugText);
    }

    return bids;
  },

  /**
   * @typedef {Object} mappingFileInfo
   * @property {string} url  mapping file json url
   * @property {number} refreshInDays prebid stores mapping data in localstorage so you can return in how many days you want to update value stored in localstorage.
   * @property {string} localStorageKey unique key to store your mapping json in localstorage
   */

  /**
   * Returns mapping file info. This info will be used by bidderFactory to preload mapping file and store data in local storage
   * @returns {mappingFileInfo}
   */
  getMappingFileInfo: function() {
    return {
      url: mappingFileUrl,
      refreshInDays: 7
    }
  },

  getUserSyncs: function(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html'
      }];
    }
  },

  transformBidParams: function(params, isOpenRtb) {
    params = utils.convertTypes({
      'member': 'string',
      'invCode': 'string',
      'placementId': 'number',
      'keywords': utils.transformBidderParamKeywords
    }, params);

    if (isOpenRtb) {
      params.use_pmt_rule = (typeof params.usePaymentRule === 'boolean') ? params.usePaymentRule : false;
      if (params.usePaymentRule) { delete params.usePaymentRule; }

      if (isPopulatedArray(params.keywords)) {
        params.keywords.forEach(deleteValues);
      }

      Object.keys(params).forEach(paramKey => {
        let convertedKey = utils.convertCamelToUnderscore(paramKey);
        if (convertedKey !== paramKey) {
          params[convertedKey] = params[paramKey];
          delete params[paramKey];
        }
      });
    }

    return params;
  }
}

function isPopulatedArray(arr) {
  return !!(utils.isArray(arr) && arr.length > 0);
}

function deleteValues(keyPairObj) {
  if (isPopulatedArray(keyPairObj.value) && keyPairObj.value[0] === '') {
    delete keyPairObj.value;
  }
}

function formatRequest(payload, bidderRequest) {
  let request = [];

  if (payload.tags.length > MAX_IMPS_PER_REQUEST) {
    const clonedPayload = utils.deepClone(payload);

    utils.chunk(payload.tags, MAX_IMPS_PER_REQUEST).forEach(tags => {
      clonedPayload.tags = tags;
      const payloadString = JSON.stringify(clonedPayload);
      request.push({
        method: 'POST',
        url: URL,
        data: payloadString,
        bidderRequest
      });
    });
  } else {
    const payloadString = JSON.stringify(payload);
    request = {
      method: 'POST',
      url: URL,
      data: payloadString,
      bidderRequest
    };
  }

  return request;
}

function newRenderer(adUnitCode, rtbBid, rendererOptions = {}) {
  const renderer = Renderer.install({
    id: rtbBid.renderer_id,
    url: rtbBid.renderer_url,
    config: rendererOptions,
    loaded: false,
    adUnitCode
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }

  renderer.setEventHandlers({
    impression: () => utils.logMessage('AppNexus outstream video impression event'),
    loaded: () => utils.logMessage('AppNexus outstream video loaded event'),
    ended: () => {
      utils.logMessage('AppNexus outstream renderer video event');
      document.querySelector(`#${adUnitCode}`).style.display = 'none';
    }
  });
  return renderer;
}

/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @param rtbBid
 * @param bidderRequest
 * @return Bid
 */
function newBid(serverBid, rtbBid, bidderRequest) {
  const bidRequest = utils.getBidRequest(serverBid.uuid, [bidderRequest]);
  const bid = {
    requestId: serverBid.uuid,
    cpm: rtbBid.cpm,
    creativeId: rtbBid.creative_id,
    dealId: rtbBid.deal_id,
    currency: 'USD',
    netRevenue: true,
    ttl: 300,
    adUnitCode: bidRequest.adUnitCode,
    appnexus: {
      buyerMemberId: rtbBid.buyer_member_id,
      dealPriority: rtbBid.deal_priority,
      dealCode: rtbBid.deal_code
    }
  };

  if (rtbBid.rtb.video) {
    Object.assign(bid, {
      width: rtbBid.rtb.video.player_width,
      height: rtbBid.rtb.video.player_height,
      vastUrl: rtbBid.rtb.video.asset_url,
      vastImpUrl: rtbBid.notify_url,
      ttl: 3600
    });

    const videoContext = utils.deepAccess(bidRequest, 'mediaTypes.video.context');
    if (videoContext === ADPOD) {
      const iabSubCatId = getIabSubCategory(bidRequest.bidder, rtbBid.brand_category_id);
      bid.meta = {
        iabSubCatId
      };

      bid.video = {
        context: ADPOD,
        durationSeconds: Math.floor(rtbBid.rtb.video.duration_ms / 1000),
      };
    }

    // This supports Outstream Video
    if (rtbBid.renderer_url) {
      const rendererOptions = utils.deepAccess(
        bidderRequest.bids[0],
        'renderer.options'
      );

      Object.assign(bid, {
        adResponse: serverBid,
        renderer: newRenderer(bid.adUnitCode, rtbBid, rendererOptions)
      });
      bid.adResponse.ad = bid.adResponse.ads[0];
      bid.adResponse.ad.video = bid.adResponse.ad.rtb.video;
    }
  } else if (rtbBid.rtb[NATIVE]) {
    const nativeAd = rtbBid.rtb[NATIVE];
    bid[NATIVE] = {
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
      clickUrl: nativeAd.link.url,
      displayUrl: nativeAd.displayurl,
      clickTrackers: nativeAd.link.click_trackers,
      impressionTrackers: nativeAd.impression_trackers,
      javascriptTrackers: nativeAd.javascript_trackers
    };
    if (nativeAd.main_img) {
      bid['native'].image = {
        url: nativeAd.main_img.url,
        height: nativeAd.main_img.height,
        width: nativeAd.main_img.width,
      };
    }
    if (nativeAd.icon) {
      bid['native'].icon = {
        url: nativeAd.icon.url,
        height: nativeAd.icon.height,
        width: nativeAd.icon.width,
      };
    }
  } else {
    Object.assign(bid, {
      width: rtbBid.rtb.banner.width,
      height: rtbBid.rtb.banner.height,
      ad: rtbBid.rtb.banner.content
    });
    try {
      const url = rtbBid.rtb.trackers[0].impression_urls[0];
      const tracker = utils.createTrackPixelHtml(url);
      bid.ad += tracker;
    } catch (error) {
      utils.logError('Error appending tracking pixel', error);
    }
  }

  return bid;
}

function bidToTag(bid) {
  const tag = {};
  tag.sizes = transformSizes(bid.sizes);
  tag.primary_size = tag.sizes[0];
  tag.ad_types = [];
  tag.uuid = bid.bidId;
  if (bid.params.placementId) {
    tag.id = parseInt(bid.params.placementId, 10);
  } else {
    tag.code = bid.params.invCode;
  }
  tag.allow_smaller_sizes = bid.params.allowSmallerSizes || false;
  tag.use_pmt_rule = bid.params.usePaymentRule || false
  tag.prebid = true;
  tag.disable_psa = true;
  if (bid.params.reserve) {
    tag.reserve = bid.params.reserve;
  }
  if (bid.params.position) {
    tag.position = {'above': 1, 'below': 2}[bid.params.position] || 0;
  }
  if (bid.params.trafficSourceCode) {
    tag.traffic_source_code = bid.params.trafficSourceCode;
  }
  if (bid.params.privateSizes) {
    tag.private_sizes = transformSizes(bid.params.privateSizes);
  }
  if (bid.params.supplyType) {
    tag.supply_type = bid.params.supplyType;
  }
  if (bid.params.pubClick) {
    tag.pubclick = bid.params.pubClick;
  }
  if (bid.params.extInvCode) {
    tag.ext_inv_code = bid.params.extInvCode;
  }
  if (bid.params.externalImpId) {
    tag.external_imp_id = bid.params.externalImpId;
  }
  if (!utils.isEmpty(bid.params.keywords)) {
    let keywords = utils.transformBidderParamKeywords(bid.params.keywords);

    if (keywords.length > 0) {
      keywords.forEach(deleteValues);
    }
    tag.keywords = keywords;
  }

  if (bid.mediaType === NATIVE || utils.deepAccess(bid, `mediaTypes.${NATIVE}`)) {
    tag.ad_types.push(NATIVE);
    if (tag.sizes.length === 0) {
      tag.sizes = transformSizes([1, 1]);
    }

    if (bid.nativeParams) {
      const nativeRequest = buildNativeRequest(bid.nativeParams);
      tag[NATIVE] = {layouts: [nativeRequest]};
    }
  }

  const videoMediaType = utils.deepAccess(bid, `mediaTypes.${VIDEO}`);
  const context = utils.deepAccess(bid, 'mediaTypes.video.context');

  if (bid.mediaType === VIDEO || videoMediaType) {
    tag.ad_types.push(VIDEO);
  }

  // instream gets vastUrl, outstream gets vastXml
  if (bid.mediaType === VIDEO || (videoMediaType && context !== 'outstream')) {
    tag.require_asset_url = true;
  }

  if (bid.params.video) {
    tag.video = {};
    // place any valid video params on the tag
    Object.keys(bid.params.video)
      .filter(param => includes(VIDEO_TARGETING, param))
      .forEach(param => tag.video[param] = bid.params.video[param]);
  }

  if (
    (utils.isEmpty(bid.mediaType) && utils.isEmpty(bid.mediaTypes)) ||
    (bid.mediaType === BANNER || (bid.mediaTypes && bid.mediaTypes[BANNER]))
  ) {
    tag.ad_types.push(BANNER);
  }

  return tag;
}

/* Turn bid request sizes into ut-compatible format */
function transformSizes(requestSizes) {
  let sizes = [];
  let sizeObj = {};

  if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
    !utils.isArray(requestSizes[0])) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
    sizes.push(sizeObj);
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      let size = requestSizes[i];
      sizeObj = {};
      sizeObj.width = parseInt(size[0], 10);
      sizeObj.height = parseInt(size[1], 10);
      sizes.push(sizeObj);
    }
  }

  return sizes;
}

function hasUserInfo(bid) {
  return !!bid.params.user;
}

function hasMemberId(bid) {
  return !!parseInt(bid.params.member, 10);
}

function hasAppDeviceInfo(bid) {
  if (bid.params) {
    return !!bid.params.app
  }
}

function hasAppId(bid) {
  if (bid.params && bid.params.app) {
    return !!bid.params.app.id
  }
  return !!bid.params.app
}

function hasDebug(bid) {
  return !!bid.debug
}

function hasAdPod(bid) {
  return (
    bid.mediaTypes &&
    bid.mediaTypes.video &&
    bid.mediaTypes.video.context === ADPOD
  );
}

/**
 * Expand an adpod placement into a set of request objects according to the
 * total adpod duration and the range of duration seconds. Sets minduration/
 * maxduration video property according to requireExactDuration configuration
 */
function createAdPodRequest(tags, adPodBid) {
  const { durationRangeSec, requireExactDuration } = adPodBid.mediaTypes.video;

  const numberOfPlacements = getAdPodPlacementNumber(adPodBid.mediaTypes.video);
  const maxDuration = utils.getMaxValueFromArray(durationRangeSec);

  const tagToDuplicate = tags.filter(tag => tag.uuid === adPodBid.bidId);
  let request = utils.fill(...tagToDuplicate, numberOfPlacements);

  if (requireExactDuration) {
    const divider = Math.ceil(numberOfPlacements / durationRangeSec.length);
    const chunked = utils.chunk(request, divider);

    // each configured duration is set as min/maxduration for a subset of requests
    durationRangeSec.forEach((duration, index) => {
      chunked[index].map(tag => {
        setVideoProperty(tag, 'minduration', duration);
        setVideoProperty(tag, 'maxduration', duration);
      });
    });
  } else {
    // all maxdurations should be the same
    request.map(tag => setVideoProperty(tag, 'maxduration', maxDuration));
  }

  return request;
}

function getAdPodPlacementNumber(videoParams) {
  const { adPodDurationSec, durationRangeSec, requireExactDuration } = videoParams;
  const minAllowedDuration = utils.getMinValueFromArray(durationRangeSec);
  const numberOfPlacements = Math.floor(adPodDurationSec / minAllowedDuration);

  return requireExactDuration
    ? Math.max(numberOfPlacements, durationRangeSec.length)
    : numberOfPlacements;
}

function setVideoProperty(tag, key, value) {
  if (utils.isEmpty(tag.video)) { tag.video = {}; }
  tag.video[key] = value;
}

function getRtbBid(tag) {
  return tag && tag.ads && tag.ads.length && find(tag.ads, ad => ad.rtb);
}

function buildNativeRequest(params) {
  const request = {};

  // map standard prebid native asset identifier to /ut parameters
  // e.g., tag specifies `body` but /ut only knows `description`.
  // mapping may be in form {tag: '<server name>'} or
  // {tag: {serverName: '<server name>', requiredParams: {...}}}
  Object.keys(params).forEach(key => {
    // check if one of the <server name> forms is used, otherwise
    // a mapping wasn't specified so pass the key straight through
    const requestKey =
      (NATIVE_MAPPING[key] && NATIVE_MAPPING[key].serverName) ||
      NATIVE_MAPPING[key] ||
      key;

    // required params are always passed on request
    const requiredParams = NATIVE_MAPPING[key] && NATIVE_MAPPING[key].requiredParams;
    request[requestKey] = Object.assign({}, requiredParams, params[key]);

    // minimum params are passed if no non-required params given on adunit
    const minimumParams = NATIVE_MAPPING[key] && NATIVE_MAPPING[key].minimumParams;

    if (requiredParams && minimumParams) {
      // subtract required keys from adunit keys
      const adunitKeys = Object.keys(params[key]);
      const requiredKeys = Object.keys(requiredParams);
      const remaining = adunitKeys.filter(key => !includes(requiredKeys, key));

      // if none are left over, the minimum params needs to be sent
      if (remaining.length === 0) {
        request[requestKey] = Object.assign({}, request[requestKey], minimumParams);
      }
    }
  });

  return request;
}

function outstreamRender(bid) {
  // push to render queue because ANOutstreamVideo may not be loaded yet
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      tagId: bid.adResponse.tag_id,
      sizes: [bid.getSize().split('x')],
      targetId: bid.adUnitCode, // target div id to render video
      uuid: bid.adResponse.uuid,
      adResponse: bid.adResponse,
      rendererOptions: bid.renderer.getConfig()
    }, handleOutstreamRendererEvents.bind(null, bid));
  });
}

function handleOutstreamRendererEvents(bid, id, eventName) {
  bid.renderer.handleVideoEvent({ id, eventName });
}

function parseMediaType(rtbBid) {
  const adType = rtbBid.ad_type;
  if (adType === VIDEO) {
    return VIDEO;
  } else if (adType === NATIVE) {
    return NATIVE;
  } else {
    return BANNER;
  }
}

registerBidder(spec);
