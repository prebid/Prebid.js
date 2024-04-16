import {
  createTrackPixelHtml,
  deepAccess,
  deepClone,
  getBidRequest,
  getParameterByName,
  getUniqueIdentifierStr,
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
import {find, includes} from '../src/polyfill.js';
import {INSTREAM, OUTSTREAM} from '../src/video.js';
import {getStorageManager} from '../src/storageManager.js';
import {bidderSettings} from '../src/bidderSettings.js';
import {hasPurpose1Consent} from '../src/utils/gpdr.js';
import {convertOrtbRequestToProprietaryNative} from '../src/native.js';
import {APPNEXUS_CATEGORY_MAPPING} from '../libraries/categoryTranslationMapping/index.js';
import {
  convertKeywordStringToANMap,
  getANKewyordParamFromMaps,
  getANKeywordParam,
  transformBidderParamKeywords
} from '../libraries/appnexusUtils/anKeywords.js';
import {convertCamelToUnderscore, fill} from '../libraries/appnexusUtils/anUtils.js';
import {convertTypes} from '../libraries/transformParamsUtils/convertTypes.js';
import {chunk} from '../libraries/chunk/chunk.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'appnexus';
const URL = 'https://ib.adnxs.com/ut/v3/prebid';
const URL_SIMPLE = 'https://ib.adnxs-simple.com/ut/v3/prebid';
const VIDEO_TARGETING = ['id', 'minduration', 'maxduration',
  'skippable', 'playback_method', 'frameworks', 'context', 'skipoffset'];
const VIDEO_RTB_TARGETING = ['minduration', 'maxduration', 'skip', 'skipafter', 'playbackmethod', 'api', 'startdelay', 'placement', 'plcmt'];
const USER_PARAMS = ['age', 'externalUid', 'external_uid', 'segments', 'gender', 'dnt', 'language'];
const APP_DEVICE_PARAMS = ['geo', 'device_id']; // appid is collected separately
const DEBUG_PARAMS = ['enabled', 'dongle', 'member_id', 'debug_timeout'];
const DEBUG_QUERY_PARAM_MAP = {
  'apn_debug_dongle': 'dongle',
  'apn_debug_member_id': 'member_id',
  'apn_debug_timeout': 'debug_timeout'
};
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
    'in-banner': 5,
    'in-feed': 6,
    'interstitial': 7,
    'accompanying_content_pre_roll': 8,
    'accompanying_content_mid_roll': 9,
    'accompanying_content_post_roll': 10
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
const VIEWABILITY_URL_START = /\/\/cdn\.adnxs\.com\/v|\/\/cdn\.adnxs\-simple\.com\/v/;
const VIEWABILITY_FILE_NAME = 'trk.js';
const GVLID = 32;
const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [
    { code: 'appnexusAst', gvlid: 32 },
    { code: 'emxdigital', gvlid: 183 },
    { code: 'emetriq', gvlid: 213 },
    { code: 'pagescience', gvlid: 32 },
    { code: 'gourmetads', gvlid: 32 },
    { code: 'matomy', gvlid: 32 },
    { code: 'featureforward', gvlid: 32 },
    { code: 'oftmedia', gvlid: 32 },
    { code: 'adasta', gvlid: 32 },
    { code: 'beintoo', gvlid: 618 },
    { code: 'projectagora', gvlid: 1032 },
    { code: 'uol', gvlid: 32 },
    { code: 'adzymic', gvlid: 32 },
  ],
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(
      (bid.params.placementId || bid.params.placement_id) ||
      (bid.params.member && (bid.params.invCode || bid.params.inv_code)));
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
    const userObjBid = find(bidRequests, hasUserInfo);
    let userObj = {};
    if (config.getConfig('coppa') === true) {
      userObj = { 'coppa': true };
    }
    if (userObjBid) {
      Object.keys(userObjBid.params.user)
        .filter(param => includes(USER_PARAMS, param))
        .forEach((param) => {
          let uparam = convertCamelToUnderscore(param);
          if (param === 'segments' && isArray(userObjBid.params.user[param])) {
            let segs = [];
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
    const debugCookie = storage.getCookie(debugCookieName) || null;

    if (debugCookie) {
      try {
        debugObj = JSON.parse(debugCookie);
      } catch (e) {
        logError('AppNexus Debug Auction Cookie Error:\n\n' + e);
      }
    } else {
      Object.keys(DEBUG_QUERY_PARAM_MAP).forEach(qparam => {
        let qval = getParameterByName(qparam);
        if (isStr(qval) && qval !== '') {
          debugObj[DEBUG_QUERY_PARAM_MAP[qparam]] = qval;
          debugObj.enabled = true;
        }
      });
      debugObj = convertTypes({
        'member_id': 'number',
        'debug_timeout': 'number'
      }, debugObj);

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
    const schain = bidRequests[0].schain;
    const omidSupport = find(bidRequests, hasOmidSupport);

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
        omidpn: 'Appnexus',
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

    // grab the ortb2 keyword data (if it exists) and convert from the comma list string format to object format
    let ortb2 = deepClone(bidderRequest && bidderRequest.ortb2);

    let anAuctionKeywords = deepClone(config.getConfig('appnexusAuctionKeywords')) || {};
    let auctionKeywords = getANKeywordParam(ortb2, anAuctionKeywords)
    if (auctionKeywords.length > 0) {
      payload.keywords = auctionKeywords;
    }

    if (config.getConfig('adpod.brandCategoryExclusion')) {
      payload.brand_category_uniqueness = true;
    }

    if (debugObjParams.enabled) {
      payload.debug = debugObjParams;
      logInfo('AppNexus Debug Auction Settings:\n\n' + JSON.stringify(debugObjParams, null, 4));
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      // note - objects for impbus use underscore instead of camelCase
      payload.gdpr_consent = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: bidderRequest.gdprConsent.gdprApplies
      };

      if (bidderRequest.gdprConsent.addtlConsent && bidderRequest.gdprConsent.addtlConsent.indexOf('~') !== -1) {
        let ac = bidderRequest.gdprConsent.addtlConsent;
        // pull only the ids from the string (after the ~) and convert them to an array of ints
        let acStr = ac.substring(ac.indexOf('~') + 1);
        payload.gdpr_consent.addtl_consent = acStr.split('.').map(id => parseInt(id, 10));
      }
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }

    if (bidderRequest?.gppConsent) {
      payload.privacy = {
        gpp: bidderRequest.gppConsent.gppString,
        gpp_sid: bidderRequest.gppConsent.applicableSections
      }
    } else if (bidderRequest?.ortb2?.regs?.gpp) {
      payload.privacy = {
        gpp: bidderRequest.ortb2.regs.gpp,
        gpp_sid: bidderRequest.ortb2.regs.gpp_sid
      }
    }

    if (bidderRequest && bidderRequest.refererInfo) {
      let refererinfo = {
        // TODO: are these the correct referer values?
        rd_ref: encodeURIComponent(bidderRequest.refererInfo.topmostLocation),
        rd_top: bidderRequest.refererInfo.reachedTop,
        rd_ifs: bidderRequest.refererInfo.numIframes,
        rd_stk: bidderRequest.refererInfo.stack.map((url) => encodeURIComponent(url)).join(',')
      };
      let pubPageUrl = bidderRequest.refererInfo.canonicalUrl;
      if (isStr(pubPageUrl) && pubPageUrl !== '') {
        refererinfo.rd_can = pubPageUrl;
      }
      payload.referrer_detection = refererinfo;
    }

    if (FEATURES.VIDEO) {
      const hasAdPodBid = find(bidRequests, hasAdPod);
      if (hasAdPodBid) {
        bidRequests.filter(hasAdPod).forEach(adPodBid => {
          const adPodTags = createAdPodRequest(tags, adPodBid);
          // don't need the original adpod placement because it's in adPodTags
          const nonPodTags = payload.tags.filter(tag => tag.uuid !== adPodBid.bidId);
          payload.tags = [...nonPodTags, ...adPodTags];
        });
      }
    }

    if (bidRequests[0].userId) {
      let eids = [];
      bidRequests[0].userIdAsEids.forEach(eid => {
        if (!eid || !eid.uids || eid.uids.length < 1) { return; }
        eid.uids.forEach(uid => {
          let tmp = {'source': eid.source, 'id': uid.id};
          if (eid.source == 'adserver.org') {
            tmp.rti_partner = 'TDID';
          } else if (eid.source == 'uidapi.com') {
            tmp.rti_partner = 'UID2';
          }
          eids.push(tmp);
        });
      });
      if (eids.length) {
        payload.eids = eids;
      }
    }

    if (bidderRequest?.ortb2?.regs?.ext?.dsa) {
      const pubDsaObj = bidderRequest.ortb2.regs.ext.dsa;
      const dsaObj = {};
      ['dsarequired', 'pubrender', 'datatopub'].forEach((dsaKey) => {
        if (isNumber(pubDsaObj[dsaKey])) {
          dsaObj[dsaKey] = pubDsaObj[dsaKey];
        }
      });

      if (isArray(pubDsaObj.transparency) && pubDsaObj.transparency.every((v) => isPlainObject(v))) {
        const tpData = [];
        pubDsaObj.transparency.forEach((tpObj) => {
          if (isStr(tpObj.domain) && tpObj.domain != '' && isArray(tpObj.dsaparams) && tpObj.dsaparams.every((v) => isNumber(v))) {
            tpData.push(tpObj);
          }
        });
        if (tpData.length > 0) {
          dsaObj.transparency = tpData;
        }
      }

      if (!isEmpty(dsaObj)) payload.dsa = dsaObj;
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
          if (cpmCheck && includes(this.supportedMediaTypes, rtbBid.ad_type)) {
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
      logMessage('https://console.appnexus.com/docs/understanding-the-debug-auction');
      logMessage(debugText);
    }

    return bids;
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
    function checkGppStatus(gppConsent) {
      // user sync suppression for adapters is handled in activity controls and not needed in adapters
      return true;
    }

    if (syncOptions.iframeEnabled && hasPurpose1Consent(gdprConsent) && checkGppStatus(gppConsent)) {
      return [{
        type: 'iframe',
        url: 'https://acdn.adnxs.com/dmp/async_usersync.html'
      }];
    }
  },

  transformBidParams: function (params, isOpenRtb, adUnit, bidRequests) {
    let conversionFn = transformBidderParamKeywords;
    if (isOpenRtb === true) {
      let s2sEndpointUrl = null;
      let s2sConfig = config.getConfig('s2sConfig');

      if (isPlainObject(s2sConfig)) {
        s2sEndpointUrl = deepAccess(s2sConfig, 'endpoint.p1Consent');
      } else if (isArray(s2sConfig)) {
        s2sConfig.forEach(s2sCfg => {
          if (includes(s2sCfg.bidders, adUnit.bids[0].bidder)) {
            s2sEndpointUrl = deepAccess(s2sCfg, 'endpoint.p1Consent');
          }
        });
      }

      if (s2sEndpointUrl && s2sEndpointUrl.match('/openrtb2/prebid')) {
        conversionFn = convertKeywordsToString;
      }
    }

    params = convertTypes({
      'member': 'string',
      'invCode': 'string',
      'placementId': 'number',
      'keywords': conversionFn,
      'publisherId': 'number'
    }, params);

    if (isOpenRtb) {
      Object.keys(params).forEach(paramKey => {
        let convertedKey = convertCamelToUnderscore(paramKey);
        if (convertedKey !== paramKey) {
          params[convertedKey] = params[paramKey];
          delete params[paramKey];
        }
      });

      params.use_pmt_rule = (typeof params.use_payment_rule === 'boolean') ? params.use_payment_rule : false;
      if (params.use_payment_rule) { delete params.use_payment_rule; }
    }

    return params;
  }
};

function strIsAppnexusViewabilityScript(str) {
  if (!str || str === '') return false;

  let regexMatchUrlStart = str.match(VIEWABILITY_URL_START);
  let viewUrlStartInStr = regexMatchUrlStart != null && regexMatchUrlStart.length >= 1;

  let regexMatchFileName = str.match(VIEWABILITY_FILE_NAME);
  let fileNameInStr = regexMatchFileName != null && regexMatchFileName.length >= 1;

  return str.startsWith(SCRIPT_TAG_START) && fileNameInStr && viewUrlStartInStr;
}

function formatRequest(payload, bidderRequest) {
  let request = [];
  let options = {
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
    impression: () => logMessage('AppNexus outstream video impression event'),
    loaded: () => logMessage('AppNexus outstream video loaded event'),
    ended: () => {
      logMessage('AppNexus outstream renderer video event');
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
  const adId = getUniqueIdentifierStr();
  const bid = {
    adId: adId,
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

  if (rtbBid.adomain) {
    bid.meta = Object.assign({}, bid.meta, { advertiserDomains: [rtbBid.adomain] });
  }

  if (rtbBid.advertiser_id) {
    bid.meta = Object.assign({}, bid.meta, { advertiserId: rtbBid.advertiser_id });
  }

  if (rtbBid.dsa) {
    bid.meta = Object.assign({}, bid.meta, { dsa: rtbBid.dsa });
  }

  // temporary function; may remove at later date if/when adserver fully supports dchain
  function setupDChain(rtbBid) {
    let dchain = {
      ver: '1.0',
      complete: 0,
      nodes: [{
        bsid: rtbBid.buyer_member_id.toString()
      }],
    };

    return dchain;
  }
  if (rtbBid.buyer_member_id) {
    bid.meta = Object.assign({}, bid.meta, {dchain: setupDChain(rtbBid)});
  }

  if (rtbBid.brand_id) {
    bid.meta = Object.assign({}, bid.meta, { brandId: rtbBid.brand_id });
  }

  if (FEATURES.VIDEO && rtbBid.rtb.video) {
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
          const videoBid = find(bidderRequest.bids, bid => bid.bidId === serverBid.uuid);
          let rendererOptions = deepAccess(videoBid, 'mediaTypes.video.renderer.options'); // mediaType definition has preference (shouldn't options be .config?)
          if (!rendererOptions) {
            rendererOptions = deepAccess(videoBid, 'renderer.options'); // second the adUnit definition has preference (shouldn't options be .config?)
          }
          bid.renderer = newRenderer(bid.adUnitCode, rtbBid, rendererOptions);
        }
        break;
      case INSTREAM:
        bid.vastUrl = rtbBid.notify_url + '&redir=' + encodeURIComponent(rtbBid.rtb.video.asset_url);
        break;
    }
  } else if (FEATURES.NATIVE && rtbBid.rtb[NATIVE]) {
    const nativeAd = rtbBid.rtb[NATIVE];
    let viewScript;

    if (strIsAppnexusViewabilityScript(rtbBid.viewability.config)) {
      let prebidParams = 'pbjs_adid=' + adId + ';pbjs_auc=' + bidRequest.adUnitCode;
      viewScript = rtbBid.viewability.config.replace('dom_id=%native_dom_id%', prebidParams);
    }

    let jsTrackers = nativeAd.javascript_trackers;
    if (jsTrackers == undefined) {
      jsTrackers = viewScript;
    } else if (isStr(jsTrackers)) {
      jsTrackers = [jsTrackers, viewScript];
    } else {
      jsTrackers.push(viewScript);
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
      video: nativeAd.video,
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
  Object.keys(bid.params).forEach(paramKey => {
    let convertedKey = convertCamelToUnderscore(paramKey);
    if (convertedKey !== paramKey) {
      bid.params[convertedKey] = bid.params[paramKey];
      delete bid.params[paramKey];
    }
  });
  tag.sizes = transformSizes(bid.sizes);
  tag.primary_size = tag.sizes[0];
  tag.ad_types = [];
  tag.uuid = bid.bidId;
  if (bid.params.placement_id) {
    tag.id = parseInt(bid.params.placement_id, 10);
  } else {
    tag.code = bid.params.inv_code;
  }
  tag.allow_smaller_sizes = bid.params.allow_smaller_sizes || false;
  tag.use_pmt_rule = (typeof bid.params.use_payment_rule === 'boolean') ? bid.params.use_payment_rule
    : (typeof bid.params.use_pmt_rule === 'boolean') ? bid.params.use_pmt_rule : false;
  tag.prebid = true;
  tag.disable_psa = true;
  let bidFloor = getBidFloor(bid);
  if (bidFloor) {
    tag.reserve = bidFloor;
  }
  if (bid.params.position) {
    tag.position = { 'above': 1, 'below': 2 }[bid.params.position] || 0;
  } else {
    let mediaTypePos = deepAccess(bid, `mediaTypes.banner.pos`) || deepAccess(bid, `mediaTypes.video.pos`);
    // only support unknown, atf, and btf values for position at this time
    if (mediaTypePos === 0 || mediaTypePos === 1 || mediaTypePos === 3) {
      // ortb spec treats btf === 3, but our system interprets btf === 2; so converting the ortb value here for consistency
      tag.position = (mediaTypePos === 3) ? 2 : mediaTypePos;
    }
  }
  if (bid.params.traffic_source_code) {
    tag.traffic_source_code = bid.params.traffic_source_code;
  }
  if (bid.params.private_sizes) {
    tag.private_sizes = transformSizes(bid.params.private_sizes);
  }
  if (bid.params.supply_type) {
    tag.supply_type = bid.params.supply_type;
  }
  if (bid.params.pub_click) {
    tag.pubclick = bid.params.pub_click;
  }
  if (bid.params.ext_inv_code) {
    tag.ext_inv_code = bid.params.ext_inv_code;
  }
  if (bid.params.publisher_id) {
    tag.publisher_id = parseInt(bid.params.publisher_id, 10);
  }
  if (bid.params.external_imp_id) {
    tag.external_imp_id = bid.params.external_imp_id;
  }

  const auKeywords = getANKewyordParamFromMaps(convertKeywordStringToANMap(deepAccess(bid, 'ortb2Imp.ext.data.keywords')), bid.params?.keywords);
  if (auKeywords.length > 0) {
    tag.keywords = auKeywords;
  }

  let gpid = deepAccess(bid, 'ortb2Imp.ext.gpid') || deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
  if (gpid) {
    tag.gpid = gpid;
  }

  if (FEATURES.NATIVE && (bid.mediaType === NATIVE || deepAccess(bid, `mediaTypes.${NATIVE}`))) {
    tag.ad_types.push(NATIVE);
    if (tag.sizes.length === 0) {
      tag.sizes = transformSizes([1, 1]);
    }

    if (bid.nativeParams) {
      const nativeRequest = buildNativeRequest(bid.nativeParams);
      tag[NATIVE] = { layouts: [nativeRequest] };
    }
  }

  if (FEATURES.VIDEO) {
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
        .filter(param => includes(VIDEO_TARGETING, param))
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
        .filter(param => includes(VIDEO_RTB_TARGETING, param))
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
                let apiTmp = videoMediaType[param].map(val => {
                  let v = (val === 4) ? 5 : (val === 5) ? 4 : val;

                  if (v >= 1 && v <= 5) {
                    return v;
                  }
                }).filter(v => v);
                tag['video_frameworks'] = apiTmp;
              }
              break;
            case 'startdelay':
            case 'plcmt':
            case 'placement':
              if (typeof tag.video.context !== 'number') {
                const plcmt = videoMediaType['plcmt'];
                const placement = videoMediaType['placement'];
                const startdelay = videoMediaType['startdelay'];
                const contextVal = getContextFromPlcmt(plcmt, startdelay) || getContextFromPlacement(placement) || getContextFromStartDelay(startdelay);
                tag.video.context = VIDEO_MAPPING.context[contextVal];
              }
              break;
          }
        });
    }

    if (bid.renderer) {
      tag.video = Object.assign({}, tag.video, { custom_renderer_present: true });
    }
  } else {
    tag.hb_source = 1;
  }

  if (bid.params.frameworks && isArray(bid.params.frameworks)) {
    tag['banner_frameworks'] = bid.params.frameworks;
  }

  if (deepAccess(bid, `mediaTypes.${BANNER}`)) {
    tag.ad_types.push(BANNER);
  }

  if (tag.ad_types.length === 0) {
    delete tag.ad_types;
  }

  return tag;
}

/* Turn bid request sizes into ut-compatible format */
function transformSizes(requestSizes) {
  let sizes = [];
  let sizeObj = {};

  if (isArray(requestSizes) && requestSizes.length === 2 &&
    !isArray(requestSizes[0])) {
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

function getContextFromPlacement(ortbPlacement) {
  if (!ortbPlacement) {
    return;
  }

  if (ortbPlacement === 2) {
    return 'in-banner';
  } else if (ortbPlacement === 3) {
    return 'outstream';
  } else if (ortbPlacement === 4) {
    return 'in-feed';
  } else if (ortbPlacement === 5) {
    return 'intersitial';
  }
}

function getContextFromStartDelay(ortbStartDelay) {
  if (!ortbStartDelay) {
    return;
  }

  if (ortbStartDelay === 0) {
    return 'pre_roll';
  } else if (ortbStartDelay === -1) {
    return 'mid_roll';
  } else if (ortbStartDelay === -2) {
    return 'post_roll';
  }
}

function getContextFromPlcmt(ortbPlcmt, ortbStartDelay) {
  if (!ortbPlcmt) {
    return;
  }

  if (ortbPlcmt === 2) {
    if (!ortbStartDelay) {
      return;
    }
    if (ortbStartDelay === 0) {
      return 'accompanying_content_pre_roll';
    } else if (ortbStartDelay === -1) {
      return 'accompanying_content_mid_roll';
    } else if (ortbStartDelay === -2) {
      return 'accompanying_content_post_roll';
    }
  } else if (ortbPlcmt === 3) {
    return 'interstitial';
  } else if (ortbPlcmt === 4) {
    return 'outstream';
  }
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
    hasOmid = includes(bid.params.frameworks, 6);
  }
  if (!hasOmid && videoParams && videoParams.frameworks && isArray(videoParams.frameworks)) {
    hasOmid = includes(bid.params.video.frameworks, 6);
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
  let request = fill(...tagToDuplicate, numberOfPlacements);

  if (requireExactDuration) {
    const divider = Math.ceil(numberOfPlacements / durationRangeSec.length);
    const chunked = chunk(request, divider);

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

    // convert the sizes of image/icon assets to proper format (if needed)
    const isImageAsset = !!(requestKey === NATIVE_MAPPING.image.serverName || requestKey === NATIVE_MAPPING.icon.serverName);
    if (isImageAsset && request[requestKey].sizes) {
      let sizes = request[requestKey].sizes;
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
 * This function hides google div container for outstream bids to remove unwanted space on page. Appnexus renderer creates a new iframe outside of google iframe to render the outstream creative.
 * @param {string} elementId element id
 */
function hidedfpContainer(elementId) {
  try {
    const el = document.getElementById(elementId).querySelectorAll("div[id^='google_ads']");
    if (el[0]) {
      el[0].style.setProperty('display', 'none');
    }
  } catch (e) {
    // element not found!
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

function outstreamRender(bid, doc) {
  hidedfpContainer(bid.adUnitCode);
  hideSASIframe(bid.adUnitCode);
  // push to render queue because ANOutstreamVideo may not be loaded yet
  bid.renderer.push(() => {
    const win = doc?.defaultView || window;
    win.ANOutstreamVideo.renderAd({
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

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return (bid.params.reserve) ? bid.params.reserve : null;
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

// keywords: { 'genre': ['rock', 'pop'], 'pets': ['dog'] } goes to 'genre=rock,genre=pop,pets=dog'
function convertKeywordsToString(keywords) {
  let result = '';
  Object.keys(keywords).forEach(key => {
    // if 'text' or ''
    if (isStr(keywords[key])) {
      if (keywords[key] !== '') {
        result += `${key}=${keywords[key]},`
      } else {
        result += `${key},`;
      }
    } else if (isArray(keywords[key])) {
      if (keywords[key][0] === '') {
        result += `${key},`
      } else {
        keywords[key].forEach(val => {
          result += `${key}=${val},`
        });
      }
    }
  });

  // remove last trailing comma
  result = result.substring(0, result.length - 1);
  return result;
}

registerBidder(spec);
