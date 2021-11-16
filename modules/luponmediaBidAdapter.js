import {isArray, logMessage, deepAccess, logWarn, parseSizesInput, deepSetValue, generateUUID, isEmpty, logError, _each, isFn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER} from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';

const BIDDER_CODE = 'luponmedia';
const ENDPOINT_URL = 'https://rtb.adxpremium.services/openrtb2/auction';

const DIGITRUST_PROP_NAMES = {
  PREBID_SERVER: {
    id: 'id',
    keyv: 'keyv'
  }
};

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
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    let allUserSyncs = [];
    if (!hasSynced && (syncOptions.iframeEnabled || syncOptions.pixelEnabled)) {
      responses.forEach(csResp => {
        if (csResp.body && csResp.body.ext && csResp.body.ext.usersyncs) {
          try {
            let response = csResp.body.ext.usersyncs
            let bidders = response.bidder_status;
            for (let synci in bidders) {
              let thisSync = bidders[synci];
              if (thisSync.no_cookie) {
                let url = thisSync.usersync.url;
                let type = thisSync.usersync.type;

                if (!url) {
                  logError(`No sync url for bidder luponmedia.`);
                } else if ((type === 'image' || type === 'redirect') && syncOptions.pixelEnabled) {
                  logMessage(`Invoking image pixel user sync for luponmedia`);
                  allUserSyncs.push({type: 'image', url: url});
                } else if (type == 'iframe' && syncOptions.iframeEnabled) {
                  logMessage(`Invoking iframe user sync for luponmedia`);
                  allUserSyncs.push({type: 'iframe', url: url});
                } else {
                  logError(`User sync type "${type}" not supported for luponmedia`);
                }
              }
            }
          } catch (e) {
            logError(e);
          }
        }
      });
    } else {
      logWarn('Luponmedia: Please enable iframe/pixel based user sync.');
    }

    hasSynced = true;
    return allUserSyncs;
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

  appendSiteAppDevice(data, bidRequest, bidderRequest);

  const digiTrust = _getDigiTrustQueryParams(bidRequest, 'PREBID_SERVER');
  if (digiTrust) {
    deepSetValue(data, 'user.ext.digitrust', digiTrust);
  }

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

    if (bidRequest.userId.pubcid) {
      data.user.ext.eids.push({
        source: 'pubcommon',
        uids: [{
          id: bidRequest.userId.pubcid,
        }]
      });
    }

    // support liveintent ID
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

    // support identityLink (aka LiveRamp)
    if (bidRequest.userId.idl_env) {
      data.user.ext.eids.push({
        source: 'liveramp.com',
        uids: [{
          id: bidRequest.userId.idl_env
        }]
      });
    }
  }

  if (config.getConfig('coppa') === true) {
    deepSetValue(data, 'regs.coppa', 1);
  }

  if (bidRequest.schain && hasValidSupplyChainParams(bidRequest.schain)) {
    deepSetValue(data, 'source.ext.schain', bidRequest.schain);
  }

  const siteData = Object.assign({}, bidRequest.params.inventory, config.getConfig('fpd.context'));
  const userData = Object.assign({}, bidRequest.params.visitor, config.getConfig('fpd.user'));

  if (!isEmpty(siteData) || !isEmpty(userData)) {
    const bidderData = {
      bidders: [ bidderRequest.bidderCode ],
      config: {
        fpd: {}
      }
    };

    if (!isEmpty(siteData)) {
      bidderData.config.fpd.site = siteData;
    }

    if (!isEmpty(userData)) {
      bidderData.config.fpd.user = userData;
    }

    deepSetValue(data, 'ext.prebid.bidderconfig.0', bidderData);
  }

  const pbAdSlot = deepAccess(bidRequest, 'fpd.context.pbAdSlot');
  if (typeof pbAdSlot === 'string' && pbAdSlot) {
    deepSetValue(data.imp[0].ext, 'context.data.adslot', pbAdSlot);
  }

  return data;
}

function _getDigiTrustQueryParams(bidRequest = {}, endpointName) {
  if (!endpointName || !DIGITRUST_PROP_NAMES[endpointName]) {
    return null;
  }
  const propNames = DIGITRUST_PROP_NAMES[endpointName];

  function getDigiTrustId() {
    const bidRequestDigitrust = deepAccess(bidRequest, 'userId.digitrustid.data');
    if (bidRequestDigitrust) {
      return bidRequestDigitrust;
    }

    let digiTrustUser = (window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser({member: 'T9QSFKPDN9'})));
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || null;
  }

  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return null;
  }

  const digiTrustQueryParams = {
    [propNames.id]: digiTrustId.id,
    [propNames.keyv]: digiTrustId.keyv
  };
  if (propNames.pref) {
    digiTrustQueryParams[propNames.pref] = 0;
  }
  return digiTrustQueryParams;
}

function _getPageUrl(bidRequest, bidderRequest) {
  let pageUrl = config.getConfig('pageUrl');
  if (bidRequest.params.referrer) {
    pageUrl = bidRequest.params.referrer;
  } else if (!pageUrl) {
    pageUrl = bidderRequest.refererInfo.referer;
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

registerBidder(spec);
