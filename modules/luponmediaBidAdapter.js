import {isArray, deepAccess, logWarn, parseSizesInput, deepSetValue, generateUUID, mergeDeep, logError, _each, isFn, formatQS} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER} from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';

const BIDDER_CODE = 'luponmedia';
const ENDPOINT_URL = 'https://rtb.adxpremium.services/openrtb2/auction';

var sizeMap = {
  1: '468x60',
  2: '728x90',
  5: '120x90',
  7: '125x125',
  8: '120x600',
  9: '160x600',
  10: '300x600',
  13: '200x200',
  14: '250x250',
  15: '300x250',
  16: '336x280',
  17: '240x400',
  19: '300x100',
  31: '980x120',
  32: '250x360',
  33: '180x500',
  35: '980x150',
  37: '468x400',
  38: '930x180',
  39: '750x100',
  40: '750x200',
  41: '750x300',
  42: '2x4',
  43: '320x50',
  44: '300x50',
  48: '300x300',
  53: '1024x768',
  54: '300x1050',
  55: '970x90',
  57: '970x250',
  58: '1000x90',
  59: '320x80',
  60: '320x150',
  61: '1000x1000',
  64: '580x500',
  65: '640x480',
  66: '930x600',
  67: '320x480',
  68: '1800x1000',
  72: '320x320',
  73: '320x160',
  78: '980x240',
  79: '980x300',
  80: '980x400',
  83: '480x300',
  85: '300x120',
  90: '548x150',
  94: '970x310',
  95: '970x100',
  96: '970x210',
  101: '480x320',
  102: '768x1024',
  103: '480x280',
  105: '250x800',
  108: '320x240',
  113: '1000x300',
  117: '320x100',
  125: '800x250',
  126: '200x600',
  144: '980x600',
  145: '980x150',
  152: '1000x250',
  156: '640x320',
  159: '320x250',
  179: '250x600',
  195: '600x300',
  198: '640x360',
  199: '640x200',
  213: '1030x590',
  214: '980x360',
  221: '1x1',
  229: '320x180',
  230: '2000x1400',
  232: '580x400',
  234: '6x6',
  251: '2x2',
  256: '480x820',
  257: '400x600',
  258: '500x200',
  259: '998x200',
  264: '970x1000',
  265: '1920x1080',
  274: '1800x200',
  278: '320x500',
  282: '320x400',
  288: '640x380',
  548: '500x1000',
  550: '980x480',
  552: '300x200',
  558: '640x640'
};

_each(sizeMap, (item, key) => sizeMap[item] = key);

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.siteId && bid.params.keyId); // TODO: check for siteId and keyId
  },
  buildRequests: function (bidRequests, bidderRequest) {
    const bRequest = {
      method: 'POST',
      url: ENDPOINT_URL,
      data: null,
      options: {},
      bidderRequest
    };

    let currentImps = [];

    for (let i = 0, len = bidRequests.length; i < len; i++) {
      let newReq = newOrtbBidRequest(bidRequests[i], bidderRequest, currentImps);
      currentImps = newReq.imp;
      bRequest.data = JSON.stringify(newReq);
    }

    return bRequest;
  },
  interpretResponse: (response, request) => {
    const bidResponses = [];
    var respCur = 'USD';
    let parsedRequest = JSON.parse(request.data);
    let parsedReferrer = parsedRequest.site && parsedRequest.site.ref ? parsedRequest.site.ref : '';
    try {
      if (response.body && response.body.seatbid && isArray(response.body.seatbid)) {
        // Supporting multiple bid responses for same adSize
        respCur = response.body.cur || respCur;
        response.body.seatbid.forEach(seatbidder => {
          seatbidder.bid &&
            isArray(seatbidder.bid) &&
            seatbidder.bid.forEach(bid => {
              let newBid = {
                requestId: bid.impid,
                cpm: (parseFloat(bid.price) || 0).toFixed(2),
                width: bid.w,
                height: bid.h,
                creativeId: bid.crid || bid.id,
                dealId: bid.dealid,
                currency: respCur,
                netRevenue: false,
                ttl: 300,
                referrer: parsedReferrer,
                ad: bid.adm
              };

              bidResponses.push(newBid);
            });
        });
      }
    } catch (error) {
      logError(error);
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, _responses, gdprConsent, uspConsent) {
    if (!hasSynced && syncOptions.iframeEnabled) {
      // data is only assigned if params are available to pass to syncEndpoint
      let params = {};

      if (gdprConsent) {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params['gdpr'] = Number(gdprConsent.gdprApplies);
        }
        if (typeof gdprConsent.consentString === 'string') {
          params['gdpr_consent'] = gdprConsent.consentString;
        }
      }

      if (uspConsent) {
        params['us_privacy'] = encodeURIComponent(uspConsent);
      }

      params = Object.keys(params).length ? `?${formatQS(params)}` : '';

      hasSynced = true;
      return {
        type: 'iframe',
        url: `https://user-sync.adxpremium.services/load-cookie.html` + params
      };
    }
  },
  onBidWon: bid => {
    const bidString = JSON.stringify(bid);
    spec.sendWinningsToServer(bidString);
  },
  sendWinningsToServer: data => {
    let mutation = `mutation {createWin(input: {win: {eventData: "${window.btoa(data)}"}}) {win {createTime } } }`;
    let dataToSend = JSON.stringify({ query: mutation });

    ajax('https://analytics.adxpremium.services/graphql', null, dataToSend, {
      contentType: 'application/json',
      method: 'POST'
    });
  }
};

export function hasValidSupplyChainParams(schain) {
  let isValid = false;
  const requiredFields = ['asi', 'sid', 'hp'];
  if (!schain.nodes) return isValid;
  isValid = schain.nodes.reduce((status, node) => {
    if (!status) return status;
    return requiredFields.every(field => node[field]);
  }, true);
  if (!isValid) logError('LuponMedia: required schain params missing');
  return isValid;
}

var hasSynced = false;

export function resetUserSync() {
  hasSynced = false;
}

export function masSizeOrdering(sizes) {
  const MAS_SIZE_PRIORITY = [15, 2, 9];

  return sizes.sort((first, second) => {
    // sort by MAS_SIZE_PRIORITY priority order
    const firstPriority = MAS_SIZE_PRIORITY.indexOf(first);
    const secondPriority = MAS_SIZE_PRIORITY.indexOf(second);

    if (firstPriority > -1 || secondPriority > -1) {
      if (firstPriority === -1) {
        return 1;
      }
      if (secondPriority === -1) {
        return -1;
      }
      return firstPriority - secondPriority;
    }

    // and finally ascending order
    return first - second;
  });
}

function newOrtbBidRequest(bidRequest, bidderRequest, currentImps) {
  bidRequest.startTime = new Date().getTime();

  const bannerParams = deepAccess(bidRequest, 'mediaTypes.banner');

  let bannerSizes = [];

  if (bannerParams && bannerParams.sizes) {
    const sizes = parseSizesInput(bannerParams.sizes);

    // get banner sizes in form [{ w: <int>, h: <int> }, ...]
    const format = sizes.map(size => {
      const [ width, height ] = size.split('x');
      const w = parseInt(width, 10);
      const h = parseInt(height, 10);
      return { w, h };
    });

    bannerSizes = format;
  }

  const data = {
    id: bidRequest.transactionId,
    test: config.getConfig('debug') ? 1 : 0,
    source: {
      tid: bidRequest.transactionId
    },
    tmax: config.getConfig('timeout') || 1500,
    imp: currentImps.concat([{
      id: bidRequest.bidId,
      secure: 1,
      ext: {
        [bidRequest.bidder]: bidRequest.params
      },
      banner: {
        format: bannerSizes
      }
    }]),
    ext: {
      prebid: {
        targeting: {
          includewinners: true,
          // includebidderkeys always false for openrtb
          includebidderkeys: false
        }
      }
    },
    user: {
    }
  }

  setBidFloor(bidRequest, data);

  appendSiteAppDevice(data, bidRequest, bidderRequest);

  setGdprAndPrivacy(bidderRequest, data);
  setUserId(bidRequest, data);

  if (config.getConfig('coppa') === true) {
    deepSetValue(data, 'regs.coppa', 1);
  }

  if (bidRequest.schain && hasValidSupplyChainParams(bidRequest.schain)) {
    deepSetValue(data, 'source.ext.schain', bidRequest.schain);
  }

  setSiteAndUserData(bidRequest, BANNER, data);

  return data;
}

function setGdprAndPrivacy(bidderRequest, data) {
  if (bidderRequest.gdprConsent) {
    // note - gdprApplies & consentString may be undefined in certain use-cases for consentManagement module
    let gdprApplies;
    if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
      gdprApplies = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }

    deepSetValue(data, 'regs.ext.gdpr', gdprApplies);
    deepSetValue(data, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }

  if (bidderRequest.uspConsent) {
    deepSetValue(data, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }
}

function setUserId(bidRequest, data) {
  // Set user uuid
  deepSetValue(data, 'user.id', generateUUID());

  // set crumbs
  if (bidRequest.crumbs && bidRequest.crumbs.pubcid) {
    deepSetValue(data, 'user.buyeruid', bidRequest.crumbs.pubcid);
  } else {
    deepSetValue(data, 'user.buyeruid', generateUUID());
  }

  if (bidRequest.userId && typeof bidRequest.userId === 'object' &&
      (bidRequest.userId.tdid || bidRequest.userId.pubcid || bidRequest.userId.lipb || bidRequest.userId.idl_env)) {
    deepSetValue(data, 'user.ext.eids', []);
    setAdserverOrg(bidRequest, data);
    setPubcommon(bidRequest, data);
    setLiveIntent(bidRequest, data);
    setIdentityLink(bidRequest, data);
  }
}

function setAdserverOrg(bidRequest, data) {
  if (bidRequest.userId.tdid) {
    data.user.ext.eids.push({
      source: 'adserver.org',
      uids: [{
        id: bidRequest.userId.tdid,
        ext: {
          rtiPartner: 'TDID'
        }
      }]
    });
  }
}

function setLiveIntent(bidRequest, data) {
  if (bidRequest.userId.lipb && bidRequest.userId.lipb.lipbid) {
    data.user.ext.eids.push({
      source: 'liveintent.com',
      uids: [{
        id: bidRequest.userId.lipb.lipbid
      }]
    });

    data.user.ext.tpid = {
      source: 'liveintent.com',
      uid: bidRequest.userId.lipb.lipbid
    };

    if (Array.isArray(bidRequest.userId.lipb.segments) && bidRequest.userId.lipb.segments.length) {
      deepSetValue(data, 'rp.target.LIseg', bidRequest.userId.lipb.segments);
    }
  }
}

function setIdentityLink(bidRequest, data) {
  if (bidRequest.userId.idl_env) {
    data.user.ext.eids.push({
      source: 'liveramp.com',
      uids: [{
        id: bidRequest.userId.idl_env
      }]
    });
  }
}

function setPubcommon(bidRequest, data) {
  if (bidRequest.userId.pubcid) {
    data.user.ext.eids.push({
      source: 'pubcommon',
      uids: [{
        id: bidRequest.userId.pubcid,
      }]
    });
  }
}

function setBidFloor(bidRequest, data) {
  let bidFloor;
  if (isFn(bidRequest.getFloor) && !config.getConfig('disableFloors')) {
    let floorInfo;
    try {
      floorInfo = bidRequest.getFloor({
        currency: 'USD',
        mediaType: 'video',
        size: parseSizes(bidRequest, 'video')
      });
    } catch (e) {
      logError('LuponMedia: getFloor threw an error: ', e);
    }
    bidFloor = typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseInt(floorInfo.floor)) ? parseFloat(floorInfo.floor) : undefined;
  } else {
    bidFloor = parseFloat(deepAccess(bidRequest, 'params.floor'));
  }
  if (!isNaN(bidFloor)) {
    data.imp[0].bidfloor = bidFloor;
  }
}

function _getPageUrl(bidRequest, bidderRequest) {
  // TODO: do the fallbacks make sense here?
  let pageUrl = bidderRequest.refererInfo.page;
  if (bidRequest.params.referrer) {
    pageUrl = bidRequest.params.referrer;
  } else if (!pageUrl) {
    pageUrl = bidderRequest.refererInfo.topmostLocation;
  }
  return bidRequest.params.secure ? pageUrl.replace(/^http:/i, 'https:') : pageUrl;
}

function appendSiteAppDevice(data, bidRequest, bidderRequest) {
  if (!data) return;

  // ORTB specifies app OR site
  if (typeof config.getConfig('app') === 'object') {
    data.app = config.getConfig('app');
  } else {
    data.site = {
      page: _getPageUrl(bidRequest, bidderRequest)
    }
  }
  if (typeof config.getConfig('device') === 'object') {
    data.device = config.getConfig('device');
  }
}

/**
 * @param sizes
 * @returns {*}
 */
function mapSizes(sizes) {
  return parseSizesInput(sizes)
    // map sizes while excluding non-matches
    .reduce((result, size) => {
      let mappedSize = parseInt(sizeMap[size], 10);
      if (mappedSize) {
        result.push(mappedSize);
      }
      return result;
    }, []);
}

function parseSizes(bid, mediaType) {
  let params = bid.params;
  if (mediaType === 'video') {
    let size = [];
    if (params.video && params.video.playerWidth && params.video.playerHeight) {
      size = [
        params.video.playerWidth,
        params.video.playerHeight
      ];
    } else if (Array.isArray(deepAccess(bid, 'mediaTypes.video.playerSize')) && bid.mediaTypes.video.playerSize.length === 1) {
      size = bid.mediaTypes.video.playerSize[0];
    } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0 && Array.isArray(bid.sizes[0]) && bid.sizes[0].length > 1) {
      size = bid.sizes[0];
    }
    return size;
  }

  // Deprecated: temp legacy support
  let sizes = [];
  if (Array.isArray(params.sizes)) {
    sizes = params.sizes;
  } else if (typeof deepAccess(bid, 'mediaTypes.banner.sizes') !== 'undefined') {
    sizes = mapSizes(bid.mediaTypes.banner.sizes);
  } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0) {
    sizes = mapSizes(bid.sizes)
  } else {
    logWarn('LuponMedia: no sizes are setup or found');
  }

  return masSizeOrdering(sizes);
}

function setSiteAndUserData(bidRequest, mediaType, data) {
  const BID_FPD = {
    user: {ext: {data: {...bidRequest.params.visitor}}},
    site: {ext: {data: {...bidRequest.params.inventory}}}
  };

  if (bidRequest.params.keywords) BID_FPD.site.keywords = (isArray(bidRequest.params.keywords)) ? bidRequest.params.keywords.join(',') : bidRequest.params.keywords;

  let fpd = mergeDeep({}, bidderRequest.ortb2 || {}, BID_FPD);
  let impData = deepAccess(bidRequest.ortb2Imp, 'ext.data') || {};

  const gpid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
  const SEGTAX = {user: [4], site: [1, 2, 5, 6]};
  const MAP = {user: 'tg_v.', site: 'tg_i.', adserver: 'tg_i.dfp_ad_unit_code', pbadslot: 'tg_i.pbadslot', keywords: 'kw'};
  const validate = function(prop, key, parentName) {
    if (key === 'data' && Array.isArray(prop)) {
      return prop.filter(name => name.segment && deepAccess(name, 'ext.segtax') && SEGTAX[parentName] &&
        SEGTAX[parentName].indexOf(deepAccess(name, 'ext.segtax')) !== -1).map(value => {
        let segments = value.segment.filter(obj => obj.id).reduce((result, obj) => {
          result.push(obj.id);
          return result;
        }, []);
        if (segments.length > 0) return segments.toString();
      }).toString();
    } else if (typeof prop === 'object' && !Array.isArray(prop)) {
      logWarn('LuponMedia: Filtered FPD key: ', key, ': Expected value to be string, integer, or an array of strings/ints');
    } else if (typeof prop !== 'undefined') {
      return (Array.isArray(prop)) ? prop.filter(value => {
        if (typeof value !== 'object' && typeof value !== 'undefined') return value.toString();

        logWarn('LuponMedia: Filtered value: ', value, 'for key', key, ': Expected value to be string, integer, or an array of strings/ints');
      }).toString() : prop.toString();
    }
  };
  const addBannerData = function(obj, name, key, isParent = true) {
    let val = validate(obj, key, name);
    let loc = (MAP[key] && isParent) ? `${MAP[key]}` : (key === 'data') ? `${MAP[name]}iab` : `${MAP[name]}${key}`;
    data[loc] = (data[loc]) ? data[loc].concat(',', val) : val;
  }

  if (mediaType === BANNER) {
    ['site', 'user'].forEach(name => {
      Object.keys(fpd[name]).forEach((key) => {
        if (name === 'site' && key === 'content' && fpd[name][key].data) {
          addBannerData(fpd[name][key].data, name, 'data');
        } else if (key !== 'ext') {
          addBannerData(fpd[name][key], name, key);
        } else if (fpd[name][key].data) {
          Object.keys(fpd[name].ext.data).forEach((key) => {
            addBannerData(fpd[name].ext.data[key], name, key, false);
          });
        }
      });
    });
    Object.keys(impData).forEach((key) => {
      if (key !== 'adserver') {
        addBannerData(impData[key], 'site', key);
      } else if (impData[key].name === 'gam') {
        addBannerData(impData[key].adslot, name, key)
      }
    });

    // add in gpid
    if (gpid) {
      data['p_gpid'] = gpid;
    }

    // only send one of pbadslot or dfp adunit code (prefer pbadslot)
    if (data['tg_i.pbadslot']) {
      delete data['tg_i.dfp_ad_unit_code'];
    }
  } else {
    if (Object.keys(impData).length) {
      mergeDeep(data.imp[0].ext, {data: impData});
    }
    // add in gpid
    if (gpid) {
      data.imp[0].ext.gpid = gpid;
    }

    mergeDeep(data, fpd);
  }
}

registerBidder(spec);
