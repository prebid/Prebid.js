import {
  createTrackPixelHtml,
  deepAccess,
  deepClone,
  getBidRequest,
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
import {Renderer} from '../src/Renderer.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {ADPOD, BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {INSTREAM, OUTSTREAM} from '../src/video.js';
import {getStorageManager} from '../src/storageManager.js';
import {bidderSettings} from '../src/bidderSettings.js';
import {hasPurpose1Consent} from '../src/utils/gdpr.js';
import {convertOrtbRequestToProprietaryNative} from '../src/native.js';
import {APPNEXUS_CATEGORY_MAPPING} from '../libraries/categoryTranslationMapping/index.js';
import {
  getANKewyordParamFromMaps,
  getANKeywordParam
} from '../libraries/appnexusUtils/anKeywords.js';
import {convertCamelToUnderscore, fill} from '../libraries/appnexusUtils/anUtils.js';
import {chunk} from '../libraries/chunk/chunk.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'mediafuse';
const URL = 'https://ib.adnxs.com/ut/v3/prebid';
const URL_SIMPLE = 'https://ib.adnxs-simple.com/ut/v3/prebid';
const VIDEO_TARGETING = ['id', 'minduration', 'maxduration',
  'skippable', 'playback_method', 'frameworks', 'context', 'skipoffset'];
const VIDEO_RTB_TARGETING = ['minduration', 'maxduration', 'skip', 'skipafter', 'playbackmethod', 'api'];
const USER_PARAMS = ['age', 'externalUid', 'segments', 'gender', 'dnt', 'language'];
const APP_DEVICE_PARAMS = ['device_id']; // appid is collected separately
const DEBUG_PARAMS = ['enabled', 'dongle', 'member_id', 'debug_timeout'];
const VIDEO_MAPPING = {
  playback_method: {
    'unknown': 0,
    'auto_play_sound_on': 1,
    'auto_play_sound_off': 2,
    'click_to_play': 3,
    'mouse_over': 4,
    'auto_play_sound_unknown': 5
  },
  context: {
    'unknown': 0,
    'pre_roll': 1,
    'mid_roll': 2,
    'post_roll': 3,
    'outstream': 4,
    'in-banner': 5
  }
};
const NATIVE_MAPPING = {
  body: 'description',
  body2: 'desc2',
  cta: 'ctatext',
  image: {
    serverName: 'main_image',
    requiredParams: { required: true }
  },
  icon: {
    serverName: 'icon',
    requiredParams: { required: true }
  },
  sponsoredBy: 'sponsored_by',
  privacyLink: 'privacy_link',
  salePrice: 'saleprice',
  displayUrl: 'displayurl'
};
const SOURCE = 'pbjs';
const MAX_IMPS_PER_REQUEST = 15;
const SCRIPT_TAG_START = '<script';
const VIEWABILITY_URL_START = /\/\/cdn\.adnxs\.com\/v|\/\/cdn\.adnxs-simple\.com\/v/;
const VIEWABILITY_FILE_NAME = 'trk.js';
const GVLID = 32;
const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    bidRequests = convertOrtbRequestToProprietaryNative(bidRequests);
    const tags = bidRequests.map(bidToTag);
    const userObjBid = ((bidRequests) || []).find(hasUserInfo);
    let userObj = {};
    if (config.getConfig('coppa') === true) {
      userObj = { 'coppa': true };
    }
    if (userObjBid) {
      Object.keys(userObjBid.params.user)
        .filter(param => USER_PARAMS.includes(param))
        .forEach((param) => {
          const uparam = convertCamelToUnderscore(param);
          if (param === 'segments' && isArray(userObjBid.params.user[param])) {
            const segs = [];
            userObjBid.params.user[param].forEach(val => {
              if (isNumber(val)) {
                segs.push({'id': val});
              } else if (isPlainObject(val)) {
                segs.push(val);
              }
            });
            userObj[uparam] = segs;
          } else if (param !== 'segments') {
            userObj[uparam] = userObjBid.params.user[param];
          }
        });
    }

    const appDeviceObjBid = ((bidRequests) || []).find(hasAppDeviceInfo);
    let appDeviceObj;
    if (appDeviceObjBid && appDeviceObjBid.params && appDeviceObjBid.params.app) {
      appDeviceObj = {};
      Object.keys(appDeviceObjBid.params.app)
        .filter(param => APP_DEVICE_PARAMS.includes(param))
        .forEach(param => {
          appDeviceObj[param] = appDeviceObjBid.params.app[param];
        });
    }

    const appIdObjBid = ((bidRequests) || []).find(hasAppId);
    let appIdObj;
    if (appIdObjBid && appIdObjBid.params && appDeviceObjBid.params.app && appDeviceObjBid.params.app.id) {
      appIdObj = {
        appid: appIdObjBid.params.app.id
      };
    }

    let debugObj = {};
    const debugObjParams = {};
    const debugCookieName = 'apn_prebid_debug';
    const debugCookie = storage.getCookie(debugCookieName) || null;

    if (debugCookie) {
      try {
        debugObj = JSON.parse(debugCookie);
      } catch (e) {
        logError('MediaFuse Debug Auction Cookie Error:\n\n' + e);
      }
    } else {
      const debugBidRequest = ((bidRequests) || []).find(hasDebug);
      if (debugBidRequest && debugBidRequest.debug) {
        debugObj = debugBidRequest.debug;
      }
    }

    if (debugObj && debugObj.enabled) {
      Object.keys(debugObj)
        .filter(param => DEBUG_PARAMS.includes(param))
        .forEach(param => {
          debugObjParams[param] = debugObj[param];
        });
    }

    const memberIdBid = ((bidRequests) || []).find(hasMemberId);
    const member = memberIdBid ? parseInt(memberIdBid.params.member, 10) : 0;
    const schain = bidRequests[0]?.ortb2?.source?.ext?.schain;
    const omidSupport = ((bidRequests) || []).find(hasOmidSupport);

    const payload = {
      tags: [...tags],
      user: userObj,
      sdk: {
        source: SOURCE,
        version: '$prebid.version$'
      },
      schain: schain
    };

    if (omidSupport) {
      payload['iab_support'] = {
        omidpn: 'Mediafuse',
        omidpv: '$prebid.version$'
      };
    }

    if (member > 0) {
      payload.member_id = member;
    }

    if (appDeviceObjBid) {
      payload.device = appDeviceObj;
    }
    if (appIdObjBid) {
      payload.app = appIdObj;
    }

    const mfKeywords = config.getConfig('mediafuseAuctionKeywords');
    payload.keywords = getANKeywordParam(bidderRequest?.ortb2, mfKeywords);

    if (config.getConfig('adpod.brandCategoryExclusion')) {
      payload.brand_category_uniqueness = true;
    }

    if (debugObjParams.enabled) {
      payload.debug = debugObjParams;
      logInfo('MediaFuse Debug Auction Settings:\n\n' + JSON.stringify(debugObjParams, null, 4));
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      // note - objects for impbus use underscore instead of camelCase
      payload.gdpr_consent = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: bidderRequest.gdprConsent.gdprApplies
      };

      if (bidderRequest.gdprConsent.addtlConsent && bidderRequest.gdprConsent.addtlConsent.indexOf('~') !== -1) {
        const ac = bidderRequest.gdprConsent.addtlConsent;
        // pull only the ids from the string (after the ~) and convert them to an array of ints
        const acStr = ac.substring(ac.indexOf('~') + 1);
        payload.gdpr_consent.addtl_consent = acStr.split('.').map(id => parseInt(id, 10));
      }
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }

    if (bidderRequest && bidderRequest.refererInfo) {
      const refererinfo = {
        // TODO: this collects everything it finds, except for canonicalUrl
        rd_ref: encodeURIComponent(bidderRequest.refererInfo.topmostLocation),
        rd_top: bidderRequest.refererInfo.reachedTop,
        rd_ifs: bidderRequest.refererInfo.numIframes,
        rd_stk: bidderRequest.refererInfo.stack.map((url) => encodeURIComponent(url)).join(',')
      };
      payload.referrer_detection = refererinfo;
    }

    const hasAdPodBid = ((bidRequests) || []).find(hasAdPod);
    if (hasAdPodBid) {
      bidRequests.filter(hasAdPod).forEach(adPodBid => {
        const adPodTags = createAdPodRequest(tags, adPodBid);
        // don't need the original adpod placement because it's in adPodTags
        const nonPodTags = payload.tags.filter(tag => tag.uuid !== adPodBid.bidId);
        payload.tags = [...nonPodTags, ...adPodTags];
      });
    }

    if (bidRequests[0].userIdAsEids?.length > 0) {
      const eids = [];
      bidRequests[0].userIdAsEids.forEach(eid => {
        if (!eid || !eid.uids || eid.uids.length < 1) { return; }
        eid.uids.forEach(uid => {
          const tmp = {'source': eid.source, 'id': uid.id};
          if (eid.source === 'adserver.org') {
            tmp.rti_partner = 'TDID';
          } else if (eid.source === 'uidapi.com') {
            tmp.rti_partner = 'UID2';
          }
          eids.push(tmp);
        });
      });

      if (eids.length) {
        payload.eids = eids;
      }
    }

    if (tags[0].publisher_id) {
      payload.publisher_id = tags[0].publisher_id;
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
  interpretResponse: function (serverResponse, { bidderRequest }) {
    serverResponse = serverResponse.body;
    const bids = [];
    if (!serverResponse || serverResponse.error) {
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
      if (serverResponse && serverResponse.error) { errorMessage += `: ${serverResponse.error}`; }
      logError(errorMessage);
      return bids;
    }

    if (serverResponse.tags) {
      serverResponse.tags.forEach(serverBid => {
        const rtbBid = getRtbBid(serverBid);
        if (rtbBid) {
          const cpmCheck = (bidderSettings.get(bidderRequest.bidderCode, 'allowZeroCpmBids') === true) ? rtbBid.cpm >= 0 : rtbBid.cpm > 0;
          if (cpmCheck && this.supportedMediaTypes.includes(rtbBid.ad_type)) {
            const bid = newBid(serverBid, rtbBid, bidderRequest);
            bid.mediaType = parseMediaType(rtbBid);
            bids.push(bid);
          }
        }
      });
    }

    if (serverResponse.debug && serverResponse.debug.debug_info) {
      const debugHeader = 'MediaFuse Debug Auction for Prebid\n\n'
      let debugText = debugHeader + serverResponse.debug.debug_info
      debugText = debugText
        .replace(/(<td>|<th>)/gm, '\t') // Tables
        .replace(/(<\/td>|<\/th>)/gm, '\n') // Tables
        .replace(/^<br>/gm, '') // Remove leading <br>
        .replace(/(<br>\n|<br>)/gm, '\n') // <br>
        .replace(/<h1>(.*)<\/h1>/gm, '\n\n===== $1 =====\n\n') // Header H1
        .replace(/<h[2-6]>(.*)<\/h[2-6]>/gm, '\n\n*** $1 ***\n\n') // Headers
        .replace(/(<([^>]+)>)/igm, ''); // Remove any other tags
      // logMessage('https://console.appnexus.com/docs/understanding-the-debug-auction');
      logMessage(debugText);
    }

    return bids;
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent) {
    if (syncOptions.iframeEnabled && hasPurpose1Consent({gdprConsent})) {
      return [{
        type: 'iframe',
        url: 'https://acdn.adnxs.com/dmp/async_usersync.html'
      }];
    }
  },

  /**
   * Add element selector to javascript tracker to improve native viewability
   * @param {Bid} bid
   */
  onBidWon: function (bid) {
    if (bid.native) {
      reloadViewabilityScriptWithCorrectParameters(bid);
    }
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

    // boolean var to modify only one script. That way if there are muliple scripts,
    // they won't all point to the same creative.
    let modifiedAScript = false;

    // first, loop on all ifames
    for (let i = 0; i < frameArray.length && !modifiedAScript; i++) {
      const currentFrame = frameArray[i];
      try {
        // IE-compatible, see https://stackoverflow.com/a/3999191/2112089
        const nestedDoc = currentFrame.contentDocument || currentFrame.contentWindow.document;

        if (nestedDoc) {
          // if the doc is present, we look for our jstracker
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
        // trying to access a cross-domain iframe raises a SecurityError
        // this is expected and ignored
        if (!(exception instanceof DOMException && exception.name === 'SecurityError')) {
          // all other cases are raised again to be treated by the calling function
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

  return str.startsWith(SCRIPT_TAG_START) && fileNameInStr && viewUrlStartInStr;
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
  // extracting the content of the src attribute
  // -> substring between src=" and "
  const indexOfFirstQuote = viewJsPayload.indexOf('src="') + 5; // offset of 5: the length of 'src=' + 1
  const indexOfSecondQuote = viewJsPayload.indexOf('"', indexOfFirstQuote);
  const jsTrackerSrc = viewJsPayload.substring(indexOfFirstQuote, indexOfSecondQuote);
  return jsTrackerSrc;
}

function formatRequest(payload, bidderRequest) {
  let request = [];
  const options = {
    withCredentials: true
  };

  let endpointUrl = URL;

  if (!hasPurpose1Consent(bidderRequest?.gdprConsent)) {
    endpointUrl = URL_SIMPLE;
  }

  if (getParameterByName('apn_test').toUpperCase() === 'TRUE' || config.getConfig('apn_test') === true) {
    options.customHeaders = {
      'X-Is-Test': 1
    };
  }

  if (payload.tags.length > MAX_IMPS_PER_REQUEST) {
    const clonedPayload = deepClone(payload);

    chunk(payload.tags, MAX_IMPS_PER_REQUEST).forEach(tags => {
      clonedPayload.tags = tags;
      const payloadString = JSON.stringify(clonedPayload);
      request.push({
        method: 'POST',
        url: endpointUrl,
        data: payloadString,
        bidderRequest,
        options
      });
    });
  } else {
    const payloadString = JSON.stringify(payload);
    request = {
      method: 'POST',
      url: endpointUrl,
      data: payloadString,
      bidderRequest,
      options
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
    logWarn('Prebid Error calling setRender on renderer', err);
  }

  renderer.setEventHandlers({
    impression: () => logMessage('MediaFuse outstream video impression event'),
    loaded: () => logMessage('MediaFuse outstream video loaded event'),
    ended: () => {
      logMessage('MediaFuse outstream renderer video event');
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
  const bidRequest = getBidRequest(serverBid.uuid, [bidderRequest]);
  const bid = {
    requestId: serverBid.uuid,
    cpm: rtbBid.cpm,
    creativeId: rtbBid.creative_id,
    dealId: rtbBid.deal_id,
    currency: 'USD',
    netRevenue: true,
    ttl: 300,
    adUnitCode: bidRequest.adUnitCode,
    mediafuse: {
      buyerMemberId: rtbBid.buyer_member_id,
      dealPriority: rtbBid.deal_priority,
      dealCode: rtbBid.deal_code
    }
  };

  // WE DON'T FULLY SUPPORT THIS ATM - future spot for adomain code; creating a stub for 5.0 compliance
  if (rtbBid.adomain) {
    bid.meta = Object.assign({}, bid.meta, { advertiserDomains: [] });
  }

  if (rtbBid.advertiser_id) {
    bid.meta = Object.assign({}, bid.meta, { advertiserId: rtbBid.advertiser_id });
  }

  // temporary function; may remove at later date if/when adserver fully supports dchain
  function setupDChain(rtbBid) {
    const dchain = {
      ver: '1.0',
      complete: 0,
      nodes: [{
        bsid: rtbBid.buyer_member_id.toString()
      }]};

    return dchain;
  }
  if (rtbBid.buyer_member_id) {
    bid.meta = Object.assign({}, bid.meta, {dchain: setupDChain(rtbBid)});
  }

  if (rtbBid.brand_id) {
    bid.meta = Object.assign({}, bid.meta, { brandId: rtbBid.brand_id });
  }

  if (rtbBid.rtb.video) {
    // shared video properties used for all 3 contexts
    Object.assign(bid, {
      width: rtbBid.rtb.video.player_width,
      height: rtbBid.rtb.video.player_height,
      vastImpUrl: rtbBid.notify_url,
      ttl: 3600
    });

    const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
    switch (videoContext) {
      case ADPOD:
        const primaryCatId = (APPNEXUS_CATEGORY_MAPPING[rtbBid.brand_category_id]) ? APPNEXUS_CATEGORY_MAPPING[rtbBid.brand_category_id] : null;
        bid.meta = Object.assign({}, bid.meta, { primaryCatId });
        const dealTier = rtbBid.deal_priority;
        bid.video = {
          context: ADPOD,
          durationSeconds: Math.floor(rtbBid.rtb.video.duration_ms / 1000),
          dealTier
        };
        bid.vastUrl = rtbBid.rtb.video.asset_url;
        break;
      case OUTSTREAM:
        bid.adResponse = serverBid;
        bid.adResponse.ad = bid.adResponse.ads[0];
        bid.adResponse.ad.video = bid.adResponse.ad.rtb.video;
        bid.vastXml = rtbBid.rtb.video.content;

        if (rtbBid.renderer_url) {
          const videoBid = ((bidderRequest.bids) || []).find(bid => bid.bidId === serverBid.uuid);
          const rendererOptions = deepAccess(videoBid, 'renderer.options');
          bid.renderer = newRenderer(bid.adUnitCode, rtbBid, rendererOptions);
        }
        break;
      case INSTREAM:
        bid.vastUrl = rtbBid.notify_url + '&redir=' + encodeURIComponent(rtbBid.rtb.video.asset_url);
        break;
    }
  } else if (rtbBid.rtb[NATIVE]) {
    const nativeAd = rtbBid.rtb[NATIVE];

    // setting up the jsTracker:
    // we put it as a data-src attribute so that the tracker isn't called
    // until we have the adId (see onBidWon)
    const jsTrackerDisarmed = rtbBid.viewability.config.replace('src=', 'data-src=');

    let jsTrackers = nativeAd.javascript_trackers;

    if (jsTrackers === undefined || jsTrackers === null) {
      jsTrackers = jsTrackerDisarmed;
    } else if (isStr(jsTrackers)) {
      jsTrackers = [jsTrackers, jsTrackerDisarmed];
    } else {
      jsTrackers.push(jsTrackerDisarmed);
    }

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
      javascriptTrackers: jsTrackers
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
      if (rtbBid.rtb.trackers) {
        for (let i = 0; i < rtbBid.rtb.trackers[0].impression_urls.length; i++) {
          const url = rtbBid.rtb.trackers[0].impression_urls[i];
          const tracker = createTrackPixelHtml(url);
          bid.ad += tracker;
        }
      }
    } catch (error) {
      logError('Error appending tracking pixel', error);
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
  tag.use_pmt_rule = bid.params.usePaymentRule || false;
  tag.prebid = true;
  tag.disable_psa = true;
  const bidFloor = getBidFloor(bid);
  if (bidFloor) {
    tag.reserve = bidFloor;
  }
  if (bid.params.position) {
    tag.position = { 'above': 1, 'below': 2 }[bid.params.position] || 0;
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
  if (bid.params.publisherId) {
    tag.publisher_id = parseInt(bid.params.publisherId, 10);
  }
  if (bid.params.externalImpId) {
    tag.external_imp_id = bid.params.externalImpId;
  }
  if (!isEmpty(bid.params.keywords)) {
    tag.keywords = getANKewyordParamFromMaps(bid.params.keywords);
  }
  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid');
  if (gpid) {
    tag.gpid = gpid;
  }

  if (bid.mediaType === NATIVE || deepAccess(bid, `mediaTypes.${NATIVE}`)) {
    tag.ad_types.push(NATIVE);
    if (tag.sizes.length === 0) {
      tag.sizes = transformSizes([1, 1]);
    }

    if (bid.nativeParams) {
      const nativeRequest = buildNativeRequest(bid.nativeParams);
      tag[NATIVE] = { layouts: [nativeRequest] };
    }
  }

  const videoMediaType = deepAccess(bid, `mediaTypes.${VIDEO}`);
  const context = deepAccess(bid, 'mediaTypes.video.context');

  if (videoMediaType && context === 'adpod') {
    tag.hb_source = 7;
  } else {
    tag.hb_source = 1;
  }
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
      .filter(param => VIDEO_TARGETING.includes(param))
      .forEach(param => {
        switch (param) {
          case 'context':
          case 'playback_method':
            let type = bid.params.video[param];
            type = (isArray(type)) ? type[0] : type;
            tag.video[param] = VIDEO_MAPPING[param][type];
            break;
          // Deprecating tags[].video.frameworks in favor of tags[].video_frameworks
          case 'frameworks':
            break;
          default:
            tag.video[param] = bid.params.video[param];
        }
      });

    if (bid.params.video.frameworks && isArray(bid.params.video.frameworks)) {
      tag['video_frameworks'] = bid.params.video.frameworks;
    }
  }

  // use IAB ORTB values if the corresponding values weren't already set by bid.params.video
  if (videoMediaType) {
    tag.video = tag.video || {};
    Object.keys(videoMediaType)
      .filter(param => VIDEO_RTB_TARGETING.includes(param))
      .forEach(param => {
        switch (param) {
          case 'minduration':
          case 'maxduration':
            if (typeof tag.video[param] !== 'number') tag.video[param] = videoMediaType[param];
            break;
          case 'skip':
            if (typeof tag.video['skippable'] !== 'boolean') tag.video['skippable'] = (videoMediaType[param] === 1);
            break;
          case 'skipafter':
            if (typeof tag.video['skipoffset'] !== 'number') tag.video['skippoffset'] = videoMediaType[param];
            break;
          case 'playbackmethod':
            if (typeof tag.video['playback_method'] !== 'number') {
              let type = videoMediaType[param];
              type = (isArray(type)) ? type[0] : type;

              // we only support iab's options 1-4 at this time.
              if (type >= 1 && type <= 4) {
                tag.video['playback_method'] = type;
              }
            }
            break;
          case 'api':
            if (!tag['video_frameworks'] && isArray(videoMediaType[param])) {
              // need to read thru array; remove 6 (we don't support it), swap 4 <> 5 if found (to match our adserver mapping for these specific values)
              const apiTmp = videoMediaType[param].map(val => {
                const v = (val === 4) ? 5 : (val === 5) ? 4 : val;

                if (v >= 1 && v <= 5) {
                  return v;
                }
                return undefined;
              }).filter(v => v);
              tag['video_frameworks'] = apiTmp;
            }
            break;
        }
      });
  }

  if (bid.renderer) {
    tag.video = Object.assign({}, tag.video, { custom_renderer_present: true });
  }

  if (bid.params.frameworks && isArray(bid.params.frameworks)) {
    tag['banner_frameworks'] = bid.params.frameworks;
  }

  if (bid.mediaTypes?.banner) {
    tag.ad_types.push(BANNER);
  }

  if (tag.ad_types.length === 0) {
    delete tag.ad_types;
  }

  return tag;
}

/* Turn bid request sizes into ut-compatible format */
function transformSizes(requestSizes) {
  const sizes = [];
  let sizeObj = {};

  if (isArray(requestSizes) && requestSizes.length === 2 &&
    !isArray(requestSizes[0])) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
    sizes.push(sizeObj);
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      const size = requestSizes[i];
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

function hasOmidSupport(bid) {
  let hasOmid = false;
  const bidderParams = bid.params;
  const videoParams = bid.params.video;
  if (bidderParams.frameworks && isArray(bidderParams.frameworks)) {
    hasOmid = bid.params.frameworks.includes(6);
  }
  if (!hasOmid && videoParams && videoParams.frameworks && isArray(videoParams.frameworks)) {
    hasOmid = bid.params.video.frameworks.includes(6);
  }
  return hasOmid;
}

/**
 * Expand an adpod placement into a set of request objects according to the
 * total adpod duration and the range of duration seconds. Sets minduration/
 * maxduration video property according to requireExactDuration configuration
 */
function createAdPodRequest(tags, adPodBid) {
  const { durationRangeSec, requireExactDuration } = adPodBid.mediaTypes.video;

  const numberOfPlacements = getAdPodPlacementNumber(adPodBid.mediaTypes.video);
  const maxDuration = Math.max(...durationRangeSec);

  const tagToDuplicate = tags.filter(tag => tag.uuid === adPodBid.bidId);
  const request = fill(...tagToDuplicate, numberOfPlacements);

  if (requireExactDuration) {
    const divider = Math.ceil(numberOfPlacements / durationRangeSec.length);
    const chunked = chunk(request, divider);

    // each configured duration is set as min/maxduration for a subset of requests
    durationRangeSec.forEach((duration, index) => {
      chunked[index].forEach(tag => {
        setVideoProperty(tag, 'minduration', duration);
        setVideoProperty(tag, 'maxduration', duration);
      });
    });
  } else {
    // all maxdurations should be the same
    request.forEach(tag => setVideoProperty(tag, 'maxduration', maxDuration));
  }

  return request;
}

function getAdPodPlacementNumber(videoParams) {
  const { adPodDurationSec, durationRangeSec, requireExactDuration } = videoParams;
  const minAllowedDuration = Math.min(...durationRangeSec);
  const numberOfPlacements = Math.floor(adPodDurationSec / minAllowedDuration);

  return requireExactDuration
    ? Math.max(numberOfPlacements, durationRangeSec.length)
    : numberOfPlacements;
}

function setVideoProperty(tag, key, value) {
  if (isEmpty(tag.video)) { tag.video = {}; }
  tag.video[key] = value;
}

function getRtbBid(tag) {
  return tag && tag.ads && tag.ads.length && ((tag.ads) || []).find(ad => ad.rtb);
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

    // convert the sizes of image/icon assets to proper format (if needed)
    const isImageAsset = !!(requestKey === NATIVE_MAPPING.image.serverName || requestKey === NATIVE_MAPPING.icon.serverName);
    if (isImageAsset && request[requestKey].sizes) {
      const sizes = request[requestKey].sizes;
      if (isArrayOfNums(sizes) || (isArray(sizes) && sizes.length > 0 && sizes.every(sz => isArrayOfNums(sz)))) {
        request[requestKey].sizes = transformSizes(request[requestKey].sizes);
      }
    }

    if (requestKey === NATIVE_MAPPING.privacyLink) {
      request.privacy_supported = true;
    }
  });

  return request;
}

/**
 * This function hides google div container for outstream bids to remove unwanted space on page. Mediafuse renderer creates a new iframe outside of google iframe to render the outstream creative.
 * @param {string} elementId element id
 */
function hidedfpContainer(elementId) {
  var el = document.getElementById(elementId).querySelectorAll("div[id^='google_ads']");
  if (el[0]) {
    el[0].style.setProperty('display', 'none');
  }
}

function hideSASIframe(elementId) {
  try {
    // find script tag with id 'sas_script'. This ensures it only works if you're using Smart Ad Server.
    const el = document.getElementById(elementId).querySelectorAll("script[id^='sas_script']");
    if (el[0].nextSibling && el[0].nextSibling.localName === 'iframe') {
      el[0].nextSibling.style.setProperty('display', 'none');
    }
  } catch (e) {
    // element not found!
  }
}

function outstreamRender(bid) {
  hidedfpContainer(bid.adUnitCode);
  hideSASIframe(bid.adUnitCode);
  // push to render queue because ANOutstreamVideo may not be loaded
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

/* function addUserId(eids, id, source, rti) {
  if (id) {
    if (rti) {
      eids.push({ source, id, rti_partner: rti });
    } else {
      eids.push({ source, id });
    }
  }
  return eids;
} */

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return (bid.params.reserve) ? bid.params.reserve : null;
  }

  const floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

registerBidder(spec);
