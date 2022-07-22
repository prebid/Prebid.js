import {
  _each,
  cleanObj,
  contains,
  createTrackPixelHtml,
  deepAccess,
  deepSetValue,
  getAdUnitSizes,
  getDNT,
  isArray,
  isArrayOfNums,
  isEmpty,
  isNumber,
  isPlainObject,
  isStr,
  mergeDeep,
  parseGPTSingleSizeArrayToRtbSize
} from '../src/utils.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {find, includes} from '../src/polyfill.js';
import {config} from '../src/config.js';

/*
 * In case you're AdKernel whitelable platform's client who needs branded adapter to
 * work with Adkernel platform - DO NOT COPY THIS ADAPTER UNDER NEW NAME
 *
 * Please contact prebid@adkernel.com and we'll add your adapter as an alias.
 */

const VIDEO_TARGETING = Object.freeze(['mimes', 'minduration', 'maxduration', 'protocols',
  'startdelay', 'linearity', 'boxingallowed', 'playbackmethod', 'delivery',
  'pos', 'api', 'ext']);
const VERSION = '1.6';
const SYNC_IFRAME = 1;
const SYNC_IMAGE = 2;
const SYNC_TYPES = Object.freeze({
  1: 'iframe',
  2: 'image'
});
const GVLID = 14;

const NATIVE_MODEL = [
  {name: 'title', assetType: 'title'},
  {name: 'icon', assetType: 'img', type: 1},
  {name: 'image', assetType: 'img', type: 3},
  {name: 'body', assetType: 'data', type: 2},
  {name: 'body2', assetType: 'data', type: 10},
  {name: 'sponsoredBy', assetType: 'data', type: 1},
  {name: 'phone', assetType: 'data', type: 8},
  {name: 'address', assetType: 'data', type: 9},
  {name: 'price', assetType: 'data', type: 6},
  {name: 'salePrice', assetType: 'data', type: 7},
  {name: 'cta', assetType: 'data', type: 12},
  {name: 'rating', assetType: 'data', type: 3},
  {name: 'downloads', assetType: 'data', type: 5},
  {name: 'likes', assetType: 'data', type: 4},
  {name: 'displayUrl', assetType: 'data', type: 11}
];

const NATIVE_INDEX = NATIVE_MODEL.reduce((acc, val, idx) => {
  acc[val.name] = {id: idx, ...val};
  return acc;
}, {});

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
    {code: 'andbeyond'},
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
    {code: 'catapultx'},
    {code: 'ergadx'},
    {code: 'turktelekom'},
    {code: 'felixads'},
    {code: 'motionspots'},
    {code: 'sonic_twist'}
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
      (bidRequest.mediaTypes.banner || bidRequest.mediaTypes.video || (bidRequest.mediaTypes.native && validateNativeAdUnit(bidRequest.mediaTypes.native)));
  },

  /**
   * Builds http request for each unique combination of adkernel host/zone
   * @param bidRequests {BidRequest[]}
   * @param bidderRequest {BidderRequest}
   * @returns {ServerRequest[]}
   */
  buildRequests: function (bidRequests, bidderRequest) {
    let impGroups = groupImpressionsByHostZone(bidRequests, bidderRequest.refererInfo);
    let requests = [];
    let schain = bidRequests[0].schain;
    _each(impGroups, impGroup => {
      let {host, zoneId, imps} = impGroup;
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
    let response = serverResponse.body;
    if (!response.seatbid) {
      return [];
    }

    let rtbRequest = JSON.parse(serverRequest.data);
    let rtbBids = response.seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    return rtbBids.map(rtbBid => {
      let imp = find(rtbRequest.imp, imp => imp.id === rtbBid.impid);
      let prBid = {
        requestId: rtbBid.impid,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        currency: response.cur || 'USD',
        ttl: 360,
        netRevenue: true
      };
      if ('banner' in imp) {
        prBid.mediaType = BANNER;
        prBid.width = rtbBid.w;
        prBid.height = rtbBid.h;
        prBid.ad = formatAdMarkup(rtbBid);
      } else if ('video' in imp) {
        prBid.mediaType = VIDEO;
        prBid.vastUrl = rtbBid.nurl;
        prBid.width = imp.video.w;
        prBid.height = imp.video.h;
      } else if ('native' in imp) {
        prBid.mediaType = NATIVE;
        prBid.native = buildNativeAd(JSON.parse(rtbBid.adm));
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
  }
};

registerBidder(spec);

/**
 * Dispatch impressions by ad network host and zone
 * @param bidRequests {BidRequest[]}
 * @param refererInfo {refererInfo}
 */
function groupImpressionsByHostZone(bidRequests, refererInfo) {
  let secure = (refererInfo && refererInfo.page?.indexOf('https:') === 0);
  return Object.values(
    bidRequests.map(bidRequest => buildImp(bidRequest, secure))
      .reduce((acc, curr, index) => {
        let bidRequest = bidRequests[index];
        let {zoneId, host} = bidRequest.params;
        let key = `${host}_${zoneId}`;
        acc[key] = acc[key] || {host: host, zoneId: zoneId, imps: []};
        acc[key].imps.push(curr);
        return acc;
      }, {})
  );
}

function getBidFloor(bid, mediaType, sizes) {
  var floor;
  var size = sizes.length === 1 ? sizes[0] : '*';
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({currency: 'USD', mediaType, size});
    if (typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
      floor = parseFloat(floorInfo.floor);
    }
  }
  return floor;
}

/**
 *  Builds rtb imp object for single adunit
 *  @param bidRequest {BidRequest}
 *  @param secure {boolean}
 */
function buildImp(bidRequest, secure) {
  const imp = {
    'id': bidRequest.bidId,
    'tagid': bidRequest.adUnitCode
  };
  var mediaType;
  var sizes = [];

  if (deepAccess(bidRequest, 'mediaTypes.banner')) {
    sizes = getAdUnitSizes(bidRequest);
    imp.banner = {
      format: sizes.map(wh => parseGPTSingleSizeArrayToRtbSize(wh)),
      topframe: 0
    };
    mediaType = BANNER;
  } else if (deepAccess(bidRequest, 'mediaTypes.video')) {
    let video = deepAccess(bidRequest, 'mediaTypes.video');
    imp.video = {};
    if (video.playerSize) {
      sizes = video.playerSize[0];
      imp.video = Object.assign(imp.video, parseGPTSingleSizeArrayToRtbSize(sizes) || {});
    }
    if (bidRequest.params.video) {
      Object.keys(bidRequest.params.video)
        .filter(key => includes(VIDEO_TARGETING, key))
        .forEach(key => imp.video[key] = bidRequest.params.video[key]);
    }
    mediaType = VIDEO;
  } else if (deepAccess(bidRequest, 'mediaTypes.native')) {
    let nativeRequest = buildNativeRequest(bidRequest.mediaTypes.native);
    imp.native = {
      ver: '1.1',
      request: JSON.stringify(nativeRequest)
    };
    mediaType = NATIVE;
  } else {
    throw new Error('Unsupported bid received');
  }
  let floor = getBidFloor(bidRequest, mediaType, sizes);
  if (floor) {
    imp.bidfloor = floor;
  }
  if (secure) {
    imp.secure = 1;
  }
  return imp;
}

/**
 * Builds native request from native adunit
 */
function buildNativeRequest(nativeReq) {
  let request = {ver: '1.1', assets: []};
  for (let k of Object.keys(nativeReq)) {
    let v = nativeReq[k];
    let desc = NATIVE_INDEX[k];
    if (desc === undefined) {
      continue;
    }
    let assetRoot = {
      id: desc.id,
      required: ~~v.required,
    };
    if (desc.assetType === 'img') {
      assetRoot[desc.assetType] = buildImageAsset(desc, v);
    } else if (desc.assetType === 'data') {
      assetRoot.data = cleanObj({type: desc.type, len: v.len});
    } else if (desc.assetType === 'title') {
      assetRoot.title = {len: v.len || 90};
    } else {
      return;
    }
    request.assets.push(assetRoot);
  }
  return request;
}

/**
 *  Builds image asset request
 */
function buildImageAsset(desc, val) {
  let img = {
    type: desc.type
  };
  if (val.sizes) {
    [img.w, img.h] = val.sizes;
  } else if (val.aspect_ratios) {
    img.wmin = val.aspect_ratios[0].min_width;
    img.hmin = val.aspect_ratios[0].min_height;
  }
  return cleanObj(img);
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
  let bidders = isArray(syncRule.bidders) ? syncRule.bidders : [bidderCode];
  let rule = syncRule.filter === 'include';
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
  let filterConfig = config.getConfig('userSync.filterSettings');
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
  let device = mergeDeep({
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
  let {refererInfo} = bidderRequest;
  let appConfig = config.getConfig('app');
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
  let {gdprConsent} = bidderRequest;
  let user = fpd.user || {};
  if (gdprConsent && gdprConsent.consentString !== undefined) {
    deepSetValue(user, 'ext.consent', gdprConsent.consentString);
  }
  let eids = getExtendedUserIds(bidderRequest);
  if (eids) {
    deepSetValue(user, 'ext.eids', eids);
  }
  if (!isEmpty(user)) { return {user: user}; }
}

/**
 * Create privacy regulations object
 * @param bidderRequest {BidderRequest}
 * @returns {{regs: Object} | undefined}
 */
function makeRegulations(bidderRequest) {
  let {gdprConsent, uspConsent} = bidderRequest;
  let regs = {};
  if (gdprConsent) {
    if (gdprConsent.gdprApplies !== undefined) {
      deepSetValue(regs, 'regs.ext.gdpr', ~~gdprConsent.gdprApplies);
    }
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
  let {auctionId, timeout} = bidderRequest;
  let request = {
    'id': auctionId,
    'imp': imps,
    'at': 1,
    'tmax': parseInt(timeout)
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
  let {bidderCode} = bidderRequest;
  let syncMethod = getAllowedSyncMethod(bidderCode);
  if (syncMethod) {
    let res = {};
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
  let fpd = bidderRequest.ortb2 || {};

  let req = mergeDeep(
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
  let site = {
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
  let eids = deepAccess(bidderRequest, 'bids.0.userIdAsEids');
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
 * Creates native ad for native 1.1 response
 */
function buildNativeAd(nativeResp) {
  const {assets, link, imptrackers, jstracker, privacy} = nativeResp.native;
  let nativeAd = {
    clickUrl: link.url,
    impressionTrackers: imptrackers,
    javascriptTrackers: jstracker ? [jstracker] : undefined,
    privacyLink: privacy,
  };
  _each(assets, asset => {
    let assetName = NATIVE_MODEL[asset.id].name;
    let assetType = NATIVE_MODEL[asset.id].assetType;
    nativeAd[assetName] = asset[assetType].text || asset[assetType].value || cleanObj({
      url: asset[assetType].url,
      width: asset[assetType].w,
      height: asset[assetType].h
    });
  });
  return cleanObj(nativeAd);
}
