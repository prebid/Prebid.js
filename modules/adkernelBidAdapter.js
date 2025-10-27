import { getDNT } from '../libraries/navigatorData/dnt.js';
import {
  _each,
  contains,
  createTrackPixelHtml,
  deepAccess,
  deepSetValue,
  getDefinedParams,
  isArray,
  isArrayOfNums,
  isEmpty,
  isNumber,
  isPlainObject,
  isStr,
  mergeDeep,
  parseGPTSingleSizeArrayToRtbSize,
  triggerPixel
} from '../src/utils.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {getAdUnitSizes} from '../libraries/sizeUtils/sizeUtils.js';
import {getBidFloor} from '../libraries/adkernelUtils/adkernelUtils.js'

/**
 * In case you're AdKernel whitelable platform's client who needs branded adapter to
 * work with Adkernel platform - DO NOT COPY THIS ADAPTER UNDER NEW NAME
 *
 * Please contact prebid@adkernel.com and we'll add your adapter as an alias
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const VIDEO_PARAMS = ['pos', 'context', 'placement', 'plcmt', 'api', 'mimes', 'protocols', 'playbackmethod', 'minduration', 'maxduration',
  'startdelay', 'linearity', 'skip', 'skipmin', 'skipafter', 'minbitrate', 'maxbitrate', 'delivery', 'playbackend', 'boxingallowed'];
const VIDEO_FPD = ['battr', 'pos'];
const NATIVE_FPD = ['battr', 'api'];
const BANNER_PARAMS = ['pos'];
const BANNER_FPD = ['btype', 'battr', 'pos', 'api'];
const VERSION = '1.8';
const SYNC_IFRAME = 1;
const SYNC_IMAGE = 2;
const SYNC_TYPES = {
  1: 'iframe',
  2: 'image'
};
const GVLID = 14;

const MULTI_FORMAT_SUFFIX = '__mf';
const MULTI_FORMAT_SUFFIX_BANNER = 'b' + MULTI_FORMAT_SUFFIX;
const MULTI_FORMAT_SUFFIX_VIDEO = 'v' + MULTI_FORMAT_SUFFIX;
const MULTI_FORMAT_SUFFIX_NATIVE = 'n' + MULTI_FORMAT_SUFFIX;

const MEDIA_TYPES = {
  BANNER: 1,
  VIDEO: 2,
  NATIVE: 4
};

/**
 * Adapter for requesting bids from AdKernel white-label display platform
 */
export const spec = {
  code: 'adkernel',
  gvlid: GVLID,
  aliases: [
    {code: 'headbidding'},
    {code: 'adsolut'},
    {code: 'oftmediahb'},
    {code: 'audiencemedia'},
    {code: 'waardex_ak'},
    {code: 'roqoon'},
    {code: 'adbite'},
    {code: 'houseofpubs'},
    {code: 'torchad'},
    {code: 'stringads'},
    {code: 'bcm'},
    {code: 'engageadx'},
    {code: 'converge', gvlid: 248},
    {code: 'adomega'},
    {code: 'denakop'},
    {code: 'rtbanalytica'},
    {code: 'unibots'},
    {code: 'ergadx'},
    {code: 'turktelekom'},
    {code: 'motionspots'},
    {code: 'sonic_twist'},
    {code: 'displayioads'},
    {code: 'rtbdemand_com'},
    {code: 'bidbuddy'},
    {code: 'didnadisplay'},
    {code: 'qortex'},
    {code: 'adpluto'},
    {code: 'headbidder'},
    {code: 'digiad'},
    {code: 'monetix'},
    {code: 'hyperbrainz'},
    {code: 'voisetech'},
    {code: 'global_sun'},
    {code: 'rxnetwork'},
    {code: 'revbid'},
    {code: 'spinx', gvlid: 1308},
    {code: 'oppamedia'},
    {code: 'pixelpluses', gvlid: 1209},
    {code: 'urekamedia'},
    {code: 'smartyexchange'},
    {code: 'infinety'},
    {code: 'qohere'}
  ],
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Validates bid request for adunit
   * @param bidRequest {BidRequest}
   * @returns {boolean}
   */
  isBidRequestValid: function (bidRequest) {
    return 'params' in bidRequest &&
      typeof bidRequest.params.host !== 'undefined' &&
      'zoneId' in bidRequest.params &&
      !isNaN(Number(bidRequest.params.zoneId)) &&
      bidRequest.params.zoneId > 0 &&
      bidRequest.mediaTypes &&
      (bidRequest.mediaTypes.banner || bidRequest.mediaTypes.video ||
        (bidRequest.mediaTypes.native && validateNativeAdUnit(bidRequest.mediaTypes.native))
      );
  },

  /**
   * Builds http request for each unique combination of adkernel host/zone
   * @param bidRequests {BidRequest[]}
   * @param bidderRequest {BidderRequest}
   * @returns {ServerRequest[]}
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const impGroups = groupImpressionsByHostZone(bidRequests, bidderRequest.refererInfo);
    const requests = [];
    const schain = bidRequests[0]?.ortb2?.source?.ext?.schain;
    _each(impGroups, impGroup => {
      const {host, zoneId, imps} = impGroup;
      const request = buildRtbRequest(imps, bidderRequest, schain);
      requests.push({
        method: 'POST',
        url: `https://${host}/hb?zone=${zoneId}&v=${VERSION}`,
        data: JSON.stringify(request)
      });
    });
    return requests;
  },

  /**
   * Parse response from adkernel backend
   * @param serverResponse {ServerResponse}
   * @param serverRequest {ServerRequest}
   * @returns {Bid[]}
   */
  interpretResponse: function (serverResponse, serverRequest) {
    const response = serverResponse.body;
    if (!response.seatbid) {
      return [];
    }

    const rtbRequest = JSON.parse(serverRequest.data);
    const rtbBids = response.seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    return rtbBids.map(rtbBid => {
      const imp = ((rtbRequest.imp) || []).find(imp => imp.id === rtbBid.impid);
      const prBid = {
        requestId: rtbBid.impid,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        currency: response.cur || 'USD',
        ttl: 360,
        netRevenue: true
      };
      if (prBid.requestId.endsWith(MULTI_FORMAT_SUFFIX)) {
        prBid.requestId = stripMultiformatSuffix(prBid.requestId);
      }
      if (rtbBid.mtype === MEDIA_TYPES.BANNER) {
        prBid.mediaType = BANNER;
        prBid.width = rtbBid.w;
        prBid.height = rtbBid.h;
        prBid.ad = formatAdMarkup(rtbBid);
      } else if (rtbBid.mtype === MEDIA_TYPES.VIDEO) {
        prBid.mediaType = VIDEO;
        if (rtbBid.adm) {
          prBid.vastXml = rtbBid.adm;
          if (rtbBid.nurl) {
            prBid.nurl = rtbBid.nurl;
          }
        } else {
          prBid.vastUrl = rtbBid.nurl;
        }
        prBid.width = imp.video.w;
        prBid.height = imp.video.h;
      } else if (rtbBid.mtype === MEDIA_TYPES.NATIVE) {
        prBid.mediaType = NATIVE;
        prBid.native = {
          ortb: buildNativeAd(rtbBid.adm)
        };
      }
      if (isStr(rtbBid.dealid)) {
        prBid.dealId = rtbBid.dealid;
      }
      if (isArray(rtbBid.adomain)) {
        deepSetValue(prBid, 'meta.advertiserDomains', rtbBid.adomain);
      }
      if (isArray(rtbBid.cat)) {
        deepSetValue(prBid, 'meta.secondaryCatIds', rtbBid.cat);
      }
      if (isPlainObject(rtbBid.ext)) {
        if (isNumber(rtbBid.ext.advertiser_id)) {
          deepSetValue(prBid, 'meta.advertiserId', rtbBid.ext.advertiser_id);
        }
        if (isStr(rtbBid.ext.advertiser_name)) {
          deepSetValue(prBid, 'meta.advertiserName', rtbBid.ext.advertiser_name);
        }
        if (isStr(rtbBid.ext.agency_name)) {
          deepSetValue(prBid, 'meta.agencyName', rtbBid.ext.agency_name);
        }
      }

      return prBid;
    });
  },

  /**
   * Extracts user-syncs information from server response
   * @param syncOptions {SyncOptions}
   * @param serverResponses {ServerResponse[]}
   * @returns {UserSync[]}
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    if (!serverResponses || serverResponses.length === 0 || (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled)) {
      return [];
    }
    return serverResponses.filter(rsp => rsp.body && rsp.body.ext && rsp.body.ext.adk_usersync)
      .map(rsp => rsp.body.ext.adk_usersync)
      .reduce((a, b) => a.concat(b), [])
      .map(({url, type}) => ({type: SYNC_TYPES[type], url: url}));
  },

  /**
   * Handle bid win
   * @param bid {Bid}
   */
  onBidWon: function (bid) {
    if (bid.nurl) {
      triggerPixel(bid.nurl);
    }
  }
};

registerBidder(spec);

/**
 * Dispatch impressions by ad network host and zone
 * @param bidRequests {BidRequest[]}
 * @param refererInfo {refererInfo}
 */
function groupImpressionsByHostZone(bidRequests, refererInfo) {
  const secure = (refererInfo && refererInfo.page?.indexOf('https:') === 0);
  return Object.values(
    bidRequests.map(bidRequest => buildImps(bidRequest, secure))
      .reduce((acc, curr, index) => {
        const bidRequest = bidRequests[index];
        const {zoneId, host} = bidRequest.params;
        const key = `${host}_${zoneId}`;
        acc[key] = acc[key] || {host: host, zoneId: zoneId, imps: []};
        acc[key].imps.push(...curr);
        return acc;
      }, {})
  );
}

/**
 *  Builds rtb imp object(s) for single adunit
 *  @param bidRequest {BidRequest}
 *  @param secure {boolean}
 */
function buildImps(bidRequest, secure) {
  const imp = {
    'id': bidRequest.bidId,
    'tagid': bidRequest.adUnitCode
  };
  if (secure) {
    imp.secure = bidRequest.ortb2Imp?.secure ?? 1;
  }
  var sizes = [];
  const mediaTypes = bidRequest.mediaTypes;
  const isMultiformat = (~~!!mediaTypes?.banner + ~~!!mediaTypes?.video + ~~!!mediaTypes?.native) > 1;
  const result = [];
  let typedImp;

  if (mediaTypes?.banner) {
    if (isMultiformat) {
      typedImp = {...imp};
      typedImp.id = imp.id + MULTI_FORMAT_SUFFIX_BANNER;
    } else {
      typedImp = imp;
    }
    sizes = getAdUnitSizes(bidRequest);
    const pbBanner = mediaTypes.banner;
    typedImp.banner = {
      ...getDefinedParamsOrEmpty(bidRequest.ortb2Imp, BANNER_FPD),
      ...getDefinedParamsOrEmpty(pbBanner, BANNER_PARAMS),
      format: sizes.map(wh => parseGPTSingleSizeArrayToRtbSize(wh)),
      topframe: 0
    };
    initImpBidfloor(typedImp, bidRequest, sizes, isMultiformat ? '*' : BANNER);
    result.push(typedImp);
  }

  if (mediaTypes?.video) {
    if (isMultiformat) {
      typedImp = {...imp};
      typedImp.id = typedImp.id + MULTI_FORMAT_SUFFIX_VIDEO;
    } else {
      typedImp = imp;
    }
    const pbVideo = mediaTypes.video;
    typedImp.video = {
      ...getDefinedParamsOrEmpty(bidRequest.ortb2Imp, VIDEO_FPD),
      ...getDefinedParamsOrEmpty(pbVideo, VIDEO_PARAMS)
    };
    if (pbVideo.playerSize) {
      sizes = pbVideo.playerSize[0];
      typedImp.video = Object.assign(typedImp.video, parseGPTSingleSizeArrayToRtbSize(sizes) || {});
    } else if (pbVideo.w && pbVideo.h) {
      typedImp.video.w = pbVideo.w;
      typedImp.video.h = pbVideo.h;
    }
    initImpBidfloor(typedImp, bidRequest, sizes, isMultiformat ? '*' : VIDEO);
    result.push(typedImp);
  }

  if (mediaTypes?.native) {
    if (isMultiformat) {
      typedImp = {...imp};
      typedImp.id = typedImp.id + MULTI_FORMAT_SUFFIX_NATIVE;
    } else {
      typedImp = imp;
    }
    typedImp.native = {
      ...getDefinedParamsOrEmpty(bidRequest.ortb2Imp, NATIVE_FPD),
      request: JSON.stringify(bidRequest.nativeOrtbRequest)
    };
    initImpBidfloor(typedImp, bidRequest, sizes, isMultiformat ? '*' : NATIVE);
    result.push(typedImp);
  }
  return result;
}

function initImpBidfloor(imp, bid, sizes, mediaType) {
  const bidfloor = getBidFloor(bid, mediaType, sizes);
  if (bidfloor) {
    imp.bidfloor = bidfloor;
  }
}

function getDefinedParamsOrEmpty(object, params) {
  if (object === undefined) {
    return {};
  }
  return getDefinedParams(object, params);
}

/**
 * Checks if configuration allows specified sync method
 * @param syncRule {Object}
 * @param bidderCode {string}
 * @returns {boolean}
 */
function isSyncMethodAllowed(syncRule, bidderCode) {
  if (!syncRule) {
    return false;
  }
  const bidders = isArray(syncRule.bidders) ? syncRule.bidders : [bidderCode];
  const rule = syncRule.filter === 'include';
  return contains(bidders, bidderCode) === rule;
}

/**
 * Get preferred user-sync method based on publisher configuration
 * @param bidderCode {string}
 * @returns {number|undefined}
 */
function getAllowedSyncMethod(bidderCode) {
  if (!config.getConfig('userSync.syncEnabled')) {
    return;
  }
  const filterConfig = config.getConfig('userSync.filterSettings');
  if (isSyncMethodAllowed(filterConfig.all, bidderCode) || isSyncMethodAllowed(filterConfig.iframe, bidderCode)) {
    return SYNC_IFRAME;
  } else if (isSyncMethodAllowed(filterConfig.image, bidderCode)) {
    return SYNC_IMAGE;
  }
}

/**
 * Create device object from fpd and host-collected data
 * @param fpd {Object}
 * @returns {{device: Object}}
 */
function makeDevice(fpd) {
  const device = mergeDeep({
    'ip': 'caller',
    'ipv6': 'caller',
    'ua': 'caller',
    'js': 1,
    'language': getLanguage()
  }, fpd.device || {});
  if (getDNT()) {
    device.dnt = 1;
  }
  return {device: device};
}

/**
 * Create site or app description object
 * @param bidderRequest {BidderRequest}
 * @param fpd {Object}
 * @returns {{site: Object}|{app: Object}}
 */
function makeSiteOrApp(bidderRequest, fpd) {
  const {refererInfo} = bidderRequest;
  const appConfig = config.getConfig('app');
  if (isEmpty(appConfig)) {
    return {site: createSite(refererInfo, fpd)}
  } else {
    return {app: appConfig};
  }
}

/**
 * Create user description object
 * @param bidderRequest {BidderRequest}
 * @param fpd {Object}
 * @returns {{user: Object} | undefined}
 */
function makeUser(bidderRequest, fpd) {
  const {gdprConsent} = bidderRequest;
  const user = fpd.user || {};
  if (gdprConsent && gdprConsent.consentString !== undefined) {
    deepSetValue(user, 'ext.consent', gdprConsent.consentString);
  }
  const eids = getExtendedUserIds(bidderRequest);
  if (eids) {
    deepSetValue(user, 'ext.eids', eids);
  }
  if (!isEmpty(user)) {
    return {user: user};
  }
}

/**
 * Create privacy regulations object
 * @param bidderRequest {BidderRequest}
 * @returns {{regs: Object} | undefined}
 */
function makeRegulations(bidderRequest) {
  const {gdprConsent, uspConsent, gppConsent} = bidderRequest;
  const regs = {};
  if (gdprConsent) {
    if (gdprConsent.gdprApplies !== undefined) {
      deepSetValue(regs, 'regs.ext.gdpr', ~~gdprConsent.gdprApplies);
    }
  }
  if (gppConsent) {
    deepSetValue(regs, 'regs.gpp', gppConsent.gppString);
    deepSetValue(regs, 'regs.gpp_sid', gppConsent.applicableSections);
  }
  if (uspConsent) {
    deepSetValue(regs, 'regs.ext.us_privacy', uspConsent);
  }
  if (config.getConfig('coppa')) {
    deepSetValue(regs, 'regs.coppa', 1);
  }
  if (!isEmpty(regs)) {
    return regs;
  }
}

/**
 * Create top-level request object
 * @param bidderRequest {BidderRequest}
 * @param imps {Object} Impressions
 * @param fpd {Object} First party data
 * @returns
 */
function makeBaseRequest(bidderRequest, imps, fpd) {
  const request = {
    'id': bidderRequest.bidderRequestId,
    'imp': imps,
    'at': 1,
    'tmax': parseInt(bidderRequest.timeout)
  };
  if (!isEmpty(fpd.bcat)) {
    request.bcat = fpd.bcat;
  }
  if (!isEmpty(fpd.badv)) {
    request.badv = fpd.badv;
  }
  return request;
}

/**
 * Initialize sync capabilities
 * @param bidderRequest {BidderRequest}
 */
function makeSyncInfo(bidderRequest) {
  const {bidderCode} = bidderRequest;
  const syncMethod = getAllowedSyncMethod(bidderCode);
  if (syncMethod) {
    const res = {};
    deepSetValue(res, 'ext.adk_usersync', syncMethod);
    return res;
  }
}

/**
 * Builds complete rtb request
 * @param imps {Object} Collection of rtb impressions
 * @param bidderRequest {BidderRequest}
 * @param schain {Object=} Supply chain config
 * @return {Object} Complete rtb request
 */
function buildRtbRequest(imps, bidderRequest, schain) {
  const fpd = bidderRequest.ortb2 || {};

  const req = mergeDeep(
    makeBaseRequest(bidderRequest, imps, fpd),
    makeDevice(fpd),
    makeSiteOrApp(bidderRequest, fpd),
    makeUser(bidderRequest, fpd),
    makeRegulations(bidderRequest),
    makeSyncInfo(bidderRequest)
  );
  if (schain) {
    deepSetValue(req, 'source.ext.schain', schain);
  }
  return req;
}

/**
 * Get browser language
 * @returns {String}
 */
function getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}

/**
 * Creates site description object
 */
function createSite(refInfo, fpd) {
  const site = {
    'domain': refInfo.domain,
    'page': refInfo.page
  };
  mergeDeep(site, fpd.site);
  if (refInfo.ref != null) {
    site.ref = refInfo.ref;
  } else {
    delete site.ref;
  }
  return site;
}

function getExtendedUserIds(bidderRequest) {
  const eids = deepAccess(bidderRequest, 'bids.0.userIdAsEids');
  if (isArray(eids)) {
    return eids;
  }
}

/**
 *  Format creative with optional nurl call
 *  @param bid rtb Bid object
 */
function formatAdMarkup(bid) {
  let adm = bid.adm;
  if ('nurl' in bid) {
    adm += createTrackPixelHtml(`${bid.nurl}&px=1`);
  }
  return adm;
}

/**
 * Basic validates to comply with platform requirements
 */
function validateNativeAdUnit(adUnit) {
  return validateNativeImageSize(adUnit.image) && validateNativeImageSize(adUnit.icon) &&
    !deepAccess(adUnit, 'privacyLink.required') && // not supported yet
    !deepAccess(adUnit, 'privacyIcon.required'); // not supported yet
}

/**
 * Validates image asset size definition
 */
function validateNativeImageSize(img) {
  if (!img) {
    return true;
  }
  if (img.sizes) {
    return isArrayOfNums(img.sizes, 2);
  }
  if (isArray(img.aspect_ratios)) {
    return img.aspect_ratios.length > 0 && img.aspect_ratios[0].min_height && img.aspect_ratios[0].min_width;
  }
  return true;
}

/**
 * Creates native ad for native 1.2 response
 */
function buildNativeAd(adm) {
  let resp = JSON.parse(adm);
  // temporary workaround for top-level native object wrapper
  if ('native' in resp) {
    resp = resp.native;
  }
  return resp;
}

function stripMultiformatSuffix(impid) {
  return impid.substr(0, impid.length - MULTI_FORMAT_SUFFIX.length - 1);
}
