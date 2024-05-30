import {
  deepAccess,
  deepClone,
  deepSetValue,
  getUniqueIdentifierStr,
  isArray,
  isFn,
  logWarn,
  parseSizesInput,
  parseUrl,
  formatQS
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {Renderer} from '../src/Renderer.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {find, includes} from '../src/polyfill.js';

const ADAPTER_VERSION = '1.21';
const ADAPTER_NAME = 'BFIO_PREBID';
const OUTSTREAM = 'outstream';
const CURRENCY = 'USD';

export const VIDEO_ENDPOINT = 'https://reachms.bfmio.com/bid.json?exchange_id=';
export const BANNER_ENDPOINT = 'https://display.bfmio.com/prebid_display';
export const OUTSTREAM_SRC = 'https://player-cdn.beachfrontmedia.com/playerapi/loader/outstream.js';
export const SYNC_IFRAME_ENDPOINT = 'https://sync.bfmio.com/sync_iframe';
export const SYNC_IMAGE_ENDPOINT = 'https://sync.bfmio.com/syncb';

export const VIDEO_TARGETING = ['mimes', 'playbackmethod', 'maxduration', 'placement', 'plcmt', 'skip', 'skipmin', 'skipafter'];
export const DEFAULT_MIMES = ['video/mp4', 'application/javascript'];

export const SUPPORTED_USER_IDS = [
  { key: 'tdid', source: 'adserver.org', rtiPartner: 'TDID', queryParam: 'tdid' },
  { key: 'idl_env', source: 'liveramp.com', rtiPartner: 'idl', queryParam: 'idl' },
  { key: 'uid2.id', source: 'uidapi.com', rtiPartner: 'UID2', queryParam: 'uid2' },
  { key: 'hadronId', source: 'audigent.com', atype: 1, queryParam: 'hadronid' }
];

let appId = '';

export const spec = {
  code: 'beachfront',
  supportedMediaTypes: [ VIDEO, BANNER ],

  isBidRequestValid(bid) {
    if (isVideoBid(bid)) {
      if (!getVideoBidParam(bid, 'appId')) {
        logWarn('Beachfront: appId param is required for video bids.');
        return false;
      }
      if (!getVideoBidParam(bid, 'bidfloor')) {
        logWarn('Beachfront: bidfloor param is required for video bids.');
        return false;
      }
    }
    if (isBannerBid(bid)) {
      if (!getBannerBidParam(bid, 'appId')) {
        logWarn('Beachfront: appId param is required for banner bids.');
        return false;
      }
      if (!getBannerBidParam(bid, 'bidfloor')) {
        logWarn('Beachfront: bidfloor param is required for banner bids.');
        return false;
      }
    }
    return true;
  },

  buildRequests(bids, bidderRequest) {
    let requests = [];
    let videoBids = bids.filter(bid => isVideoBidValid(bid));
    let bannerBids = bids.filter(bid => isBannerBidValid(bid));
    videoBids.forEach(bid => {
      appId = getVideoBidParam(bid, 'appId');
      requests.push({
        method: 'POST',
        url: VIDEO_ENDPOINT + appId,
        data: createVideoRequestData(bid, bidderRequest),
        bidRequest: bid
      });
    });
    if (bannerBids.length) {
      appId = getBannerBidParam(bannerBids[0], 'appId');
      requests.push({
        method: 'POST',
        url: BANNER_ENDPOINT,
        data: createBannerRequestData(bannerBids, bidderRequest),
        bidRequest: bannerBids
      });
    }
    return requests;
  },

  interpretResponse(response, { bidRequest }) {
    response = response.body;

    if (isVideoBid(bidRequest)) {
      if (!response || !response.bidPrice) {
        logWarn(`No valid video bids from ${spec.code} bidder`);
        return [];
      }
      let sizes = getVideoSizes(bidRequest);
      let firstSize = getFirstSize(sizes);
      let context = deepAccess(bidRequest, 'mediaTypes.video.context');
      let responseType = getVideoBidParam(bidRequest, 'responseType') || 'both';
      let responseMeta = Object.assign({ mediaType: VIDEO, advertiserDomains: [] }, response.meta);
      let bidResponse = {
        requestId: bidRequest.bidId,
        cpm: response.bidPrice,
        width: firstSize.w,
        height: firstSize.h,
        creativeId: response.crid || response.cmpId,
        meta: responseMeta,
        renderer: context === OUTSTREAM ? createRenderer(bidRequest) : null,
        mediaType: VIDEO,
        currency: CURRENCY,
        netRevenue: true,
        ttl: 300
      };

      if (responseType === 'nurl' || responseType === 'both') {
        bidResponse.vastUrl = response.url;
      }

      if (responseType === 'adm' || responseType === 'both') {
        bidResponse.vastXml = response.vast;
      }

      return bidResponse;
    } else {
      if (!response || !response.length) {
        logWarn(`No valid banner bids from ${spec.code} bidder`);
        return [];
      }
      return response
        .filter(bid => bid.adm)
        .map((bid) => {
          let request = find(bidRequest, req => req.adUnitCode === bid.slot);
          let responseMeta = Object.assign({ mediaType: BANNER, advertiserDomains: [] }, bid.meta);
          return {
            requestId: request.bidId,
            bidderCode: spec.code,
            ad: bid.adm,
            creativeId: bid.crid,
            cpm: bid.price,
            width: bid.w,
            height: bid.h,
            meta: responseMeta,
            mediaType: BANNER,
            currency: CURRENCY,
            netRevenue: true,
            ttl: 300
          };
        });
    }
  },

  getUserSyncs(syncOptions, serverResponses = [], gdprConsent = {}, uspConsent = '', gppConsent = {}) {
    let { gdprApplies, consentString = '' } = gdprConsent;
    let { gppString = '', applicableSections = [] } = gppConsent;
    let bannerResponse = find(serverResponses, (res) => isArray(res.body));

    let syncs = [];
    let params = {
      id: appId,
      gdpr: gdprApplies ? 1 : 0,
      gc: consentString,
      gce: 1,
      us_privacy: uspConsent,
      gpp: gppString,
      gpp_sid: Array.isArray(applicableSections) ? applicableSections.join(',') : ''
    };

    if (bannerResponse) {
      if (syncOptions.iframeEnabled) {
        bannerResponse.body
          .filter(bid => bid.sync)
          .forEach(bid => {
            syncs.push({
              type: 'iframe',
              url: bid.sync
            });
          });
      }
    } else if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${SYNC_IFRAME_ENDPOINT}?ifg=1&${formatQS(params)}`
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `${SYNC_IMAGE_ENDPOINT}?pid=144&${formatQS(params)}`
      });
    }

    return syncs;
  }
};

function createRenderer(bidRequest) {
  const renderer = Renderer.install({
    id: bidRequest.bidId,
    url: OUTSTREAM_SRC,
    loaded: false
  });

  renderer.setRender(bid => {
    bid.renderer.push(() => {
      window.Beachfront.Player(bid.adUnitCode, {
        adTagUrl: bid.vastUrl,
        width: bid.width,
        height: bid.height,
        expandInView: getPlayerBidParam(bidRequest, 'expandInView', false),
        collapseOnComplete: getPlayerBidParam(bidRequest, 'collapseOnComplete', true),
        progressColor: getPlayerBidParam(bidRequest, 'progressColor'),
        adPosterColor: getPlayerBidParam(bidRequest, 'adPosterColor')
      });
    });
  });

  return renderer;
}

function getFirstSize(sizes) {
  return (sizes && sizes.length) ? sizes[0] : { w: undefined, h: undefined };
}

function parseSizes(sizes) {
  return parseSizesInput(sizes).map(size => {
    let [ width, height ] = size.split('x');
    return {
      w: parseInt(width, 10) || undefined,
      h: parseInt(height, 10) || undefined
    };
  });
}

function getVideoSizes(bid) {
  return parseSizes(deepAccess(bid, 'mediaTypes.video.playerSize') || bid.sizes);
}

function getBannerSizes(bid) {
  return parseSizes(deepAccess(bid, 'mediaTypes.banner.sizes') || bid.sizes);
}

function getOsVersion() {
  let clientStrings = [
    { s: 'Android', r: /Android/ },
    { s: 'iOS', r: /(iPhone|iPad|iPod)/ },
    { s: 'Mac OS X', r: /Mac OS X/ },
    { s: 'Mac OS', r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/ },
    { s: 'Linux', r: /(Linux|X11)/ },
    { s: 'Windows 10', r: /(Windows 10.0|Windows NT 10.0)/ },
    { s: 'Windows 8.1', r: /(Windows 8.1|Windows NT 6.3)/ },
    { s: 'Windows 8', r: /(Windows 8|Windows NT 6.2)/ },
    { s: 'Windows 7', r: /(Windows 7|Windows NT 6.1)/ },
    { s: 'Windows Vista', r: /Windows NT 6.0/ },
    { s: 'Windows Server 2003', r: /Windows NT 5.2/ },
    { s: 'Windows XP', r: /(Windows NT 5.1|Windows XP)/ },
    { s: 'UNIX', r: /UNIX/ },
    { s: 'Search Bot', r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/ }
  ];
  let cs = find(clientStrings, cs => cs.r.test(navigator.userAgent));
  return cs ? cs.s : 'unknown';
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

function getDoNotTrack() {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNoTrack === '1' || navigator.doNotTrack === 'yes';
}

function isVideoBid(bid) {
  return deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

function getVideoBidParam(bid, key) {
  return deepAccess(bid, 'params.video.' + key) || deepAccess(bid, 'params.' + key);
}

function getBannerBidParam(bid, key) {
  return deepAccess(bid, 'params.banner.' + key) || deepAccess(bid, 'params.' + key);
}

function getPlayerBidParam(bid, key, defaultValue) {
  let param = deepAccess(bid, 'params.player.' + key);
  return param === undefined ? defaultValue : param;
}

function getBannerBidFloor(bid) {
  let floorInfo = isFn(bid.getFloor) ? bid.getFloor({ currency: CURRENCY, mediaType: 'banner', size: '*' }) : {};
  return floorInfo.floor || getBannerBidParam(bid, 'bidfloor');
}

function getVideoBidFloor(bid) {
  let floorInfo = isFn(bid.getFloor) ? bid.getFloor({ currency: CURRENCY, mediaType: 'video', size: '*' }) : {};
  return floorInfo.floor || getVideoBidParam(bid, 'bidfloor');
}

function isVideoBidValid(bid) {
  return isVideoBid(bid) && getVideoBidParam(bid, 'appId') && getVideoBidParam(bid, 'bidfloor');
}

function isBannerBidValid(bid) {
  return isBannerBid(bid) && getBannerBidParam(bid, 'appId') && getBannerBidParam(bid, 'bidfloor');
}

function getTopWindowLocation(bidderRequest) {
  return parseUrl(bidderRequest?.refererInfo?.page, { decodeSearchAsString: true });
}

function getEids(bid) {
  return SUPPORTED_USER_IDS
    .map(getUserId(bid))
    .filter(x => x);
}

function getUserId(bid) {
  return ({ key, source, rtiPartner, atype }) => {
    let id = deepAccess(bid, `userId.${key}`);
    return id ? formatEid(id, source, rtiPartner, atype) : null;
  };
}

function formatEid(id, source, rtiPartner, atype) {
  let uid = { id };
  if (rtiPartner) {
    uid.ext = { rtiPartner };
  }
  if (atype) {
    uid.atype = atype;
  }
  return {
    source,
    uids: [uid]
  };
}

function getVideoTargetingParams(bid) {
  const result = {};
  const excludeProps = ['playerSize', 'context', 'w', 'h'];
  Object.keys(Object(bid.mediaTypes.video))
    .filter(key => !includes(excludeProps, key))
    .forEach(key => {
      result[ key ] = bid.mediaTypes.video[ key ];
    });
  Object.keys(Object(bid.params.video))
    .filter(key => includes(VIDEO_TARGETING, key))
    .forEach(key => {
      result[ key ] = bid.params.video[ key ];
    });
  return result;
}

function createVideoRequestData(bid, bidderRequest) {
  let sizes = getVideoSizes(bid);
  let firstSize = getFirstSize(sizes);
  let video = getVideoTargetingParams(bid);
  let appId = getVideoBidParam(bid, 'appId');
  let bidfloor = getVideoBidFloor(bid);
  let tagid = getVideoBidParam(bid, 'tagid');
  let topLocation = getTopWindowLocation(bidderRequest);
  let eids = getEids(bid);
  let ortb2 = deepClone(bidderRequest.ortb2);
  let payload = {
    isPrebid: true,
    appId: appId,
    domain: document.location.hostname,
    id: getUniqueIdentifierStr(),
    imp: [{
      video: Object.assign({
        w: firstSize.w,
        h: firstSize.h,
        mimes: DEFAULT_MIMES
      }, video),
      bidfloor: bidfloor,
      tagid: tagid,
      secure: topLocation.protocol.indexOf('https') === 0 ? 1 : 0,
      displaymanager: ADAPTER_NAME,
      displaymanagerver: ADAPTER_VERSION
    }],
    site: {
      ...deepAccess(ortb2, 'site', {}),
      page: topLocation.href,
      domain: topLocation.hostname
    },
    device: {
      ua: navigator.userAgent,
      language: navigator.language,
      devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2,
      dnt: getDoNotTrack() ? 1 : 0,
      js: 1,
      geo: {}
    },
    app: deepAccess(ortb2, 'app'),
    user: deepAccess(ortb2, 'user'),
    cur: [CURRENCY]
  };

  if (bidderRequest && bidderRequest.uspConsent) {
    deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    let { gdprApplies, consentString } = bidderRequest.gdprConsent;
    deepSetValue(payload, 'regs.ext.gdpr', gdprApplies ? 1 : 0);
    deepSetValue(payload, 'user.ext.consent', consentString);
  }

  if (bidderRequest && bidderRequest.gppConsent) {
    let { gppString, applicableSections } = bidderRequest.gppConsent;
    deepSetValue(payload, 'regs.gpp', gppString);
    deepSetValue(payload, 'regs.gpp_sid', applicableSections);
  }

  if (bid.schain) {
    deepSetValue(payload, 'source.ext.schain', bid.schain);
  }

  if (eids.length > 0) {
    deepSetValue(payload, 'user.ext.eids', eids);
  }

  let connection = navigator.connection || navigator.webkitConnection;
  if (connection && connection.effectiveType) {
    deepSetValue(payload, 'device.connectiontype', connection.effectiveType);
  }

  return payload;
}

function createBannerRequestData(bids, bidderRequest) {
  let topLocation = getTopWindowLocation(bidderRequest);
  let topReferrer = bidderRequest.refererInfo?.ref;
  let slots = bids.map(bid => {
    return {
      slot: bid.adUnitCode,
      id: getBannerBidParam(bid, 'appId'),
      bidfloor: getBannerBidFloor(bid),
      tagid: getBannerBidParam(bid, 'tagid'),
      sizes: getBannerSizes(bid)
    };
  });
  let ortb2 = deepClone(bidderRequest.ortb2);
  let payload = {
    slots: slots,
    ortb2: ortb2,
    page: topLocation.href,
    domain: topLocation.hostname,
    search: topLocation.search,
    secure: topLocation.protocol.indexOf('https') === 0 ? 1 : 0,
    referrer: topReferrer,
    ua: navigator.userAgent,
    deviceOs: getOsVersion(),
    isMobile: isMobile() ? 1 : 0,
    dnt: getDoNotTrack() ? 1 : 0,
    adapterVersion: ADAPTER_VERSION,
    adapterName: ADAPTER_NAME
  };

  if (bidderRequest && bidderRequest.uspConsent) {
    payload.usPrivacy = bidderRequest.uspConsent;
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    let { gdprApplies, consentString } = bidderRequest.gdprConsent;
    payload.gdpr = gdprApplies ? 1 : 0;
    payload.gdprConsent = consentString;
  }

  if (bidderRequest && bidderRequest.gppConsent) {
    let { gppString, applicableSections } = bidderRequest.gppConsent;
    payload.gpp = gppString;
    payload.gppSid = applicableSections;
  }

  if (bids[0] && bids[0].schain) {
    payload.schain = bids[0].schain;
  }

  SUPPORTED_USER_IDS.forEach(({ key, queryParam }) => {
    let id = deepAccess(bids, `0.userId.${key}`)
    if (id) {
      payload[queryParam] = id;
    }
  });

  return payload;
}

registerBidder(spec);
