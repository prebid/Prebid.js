import * as utils from '../src/utils';
import { parse as parseUrl } from '../src/url';
import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
import { Renderer } from '../src/Renderer';
import { VIDEO, BANNER } from '../src/mediaTypes';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';

const ADAPTER_VERSION = '1.9';
const ADAPTER_NAME = 'BFIO_PREBID';
const OUTSTREAM = 'outstream';

export const VIDEO_ENDPOINT = 'https://reachms.bfmio.com/bid.json?exchange_id=';
export const BANNER_ENDPOINT = 'https://display.bfmio.com/prebid_display';
export const OUTSTREAM_SRC = 'https://player-cdn.beachfrontmedia.com/playerapi/loader/outstream.js';

export const VIDEO_TARGETING = ['mimes', 'playbackmethod', 'maxduration', 'placement'];
export const DEFAULT_MIMES = ['video/mp4', 'application/javascript'];

let appId = '';

export const spec = {
  code: 'beachfront',
  supportedMediaTypes: [ VIDEO, BANNER ],

  isBidRequestValid(bid) {
    return !!(isVideoBidValid(bid) || isBannerBidValid(bid));
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
      if (!response || !response.url || !response.bidPrice) {
        utils.logWarn(`No valid video bids from ${spec.code} bidder`);
        return [];
      }
      let sizes = getVideoSizes(bidRequest);
      let firstSize = getFirstSize(sizes);
      let context = utils.deepAccess(bidRequest, 'mediaTypes.video.context');
      return {
        requestId: bidRequest.bidId,
        bidderCode: spec.code,
        vastUrl: response.url,
        vastXml: response.vast,
        cpm: response.bidPrice,
        width: firstSize.w,
        height: firstSize.h,
        creativeId: response.crid || response.cmpId,
        renderer: context === OUTSTREAM ? createRenderer(bidRequest) : null,
        mediaType: VIDEO,
        currency: 'USD',
        netRevenue: true,
        ttl: 300
      };
    } else {
      if (!response || !response.length) {
        utils.logWarn(`No valid banner bids from ${spec.code} bidder`);
        return [];
      }
      return response
        .filter(bid => bid.adm)
        .map((bid) => {
          let request = find(bidRequest, req => req.adUnitCode === bid.slot);
          return {
            requestId: request.bidId,
            bidderCode: spec.code,
            ad: bid.adm,
            creativeId: bid.crid,
            cpm: bid.price,
            width: bid.w,
            height: bid.h,
            mediaType: BANNER,
            currency: 'USD',
            netRevenue: true,
            ttl: 300
          };
        });
    }
  },

  getUserSyncs(syncOptions, serverResponses = [], gdprConsent = {}, uspConsent = '') {
    let syncs = [];
    let { gdprApplies, consentString = '' } = gdprConsent;
    let bannerResponse = find(serverResponses, (res) => utils.isArray(res.body));

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
        url: `https://sync.bfmio.com/sync_iframe?ifg=1&id=${appId}&gdpr=${gdprApplies ? 1 : 0}&gc=${consentString}&gce=1&us_privacy=${uspConsent}`
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `https://sync.bfmio.com/syncb?pid=144&id=${appId}&gdpr=${gdprApplies ? 1 : 0}&gc=${consentString}&gce=1&us_privacy=${uspConsent}`
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
  return utils.parseSizesInput(sizes).map(size => {
    let [ width, height ] = size.split('x');
    return {
      w: parseInt(width, 10) || undefined,
      h: parseInt(height, 10) || undefined
    };
  });
}

function getVideoSizes(bid) {
  return parseSizes(utils.deepAccess(bid, 'mediaTypes.video.playerSize') || bid.sizes);
}

function getBannerSizes(bid) {
  return parseSizes(utils.deepAccess(bid, 'mediaTypes.banner.sizes') || bid.sizes);
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
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

function getVideoBidParam(bid, key) {
  return utils.deepAccess(bid, 'params.video.' + key) || utils.deepAccess(bid, 'params.' + key);
}

function getBannerBidParam(bid, key) {
  return utils.deepAccess(bid, 'params.banner.' + key) || utils.deepAccess(bid, 'params.' + key);
}

function getPlayerBidParam(bid, key, defaultValue) {
  let param = utils.deepAccess(bid, 'params.player.' + key);
  return param === undefined ? defaultValue : param;
}

function isVideoBidValid(bid) {
  return isVideoBid(bid) && getVideoBidParam(bid, 'appId') && getVideoBidParam(bid, 'bidfloor');
}

function isBannerBidValid(bid) {
  return isBannerBid(bid) && getBannerBidParam(bid, 'appId') && getBannerBidParam(bid, 'bidfloor');
}

function getTopWindowLocation(bidderRequest) {
  let url = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer;
  return parseUrl(config.getConfig('pageUrl') || url, { decodeSearchAsString: true });
}

function getTopWindowReferrer() {
  try {
    return window.top.document.referrer;
  } catch (e) {
    return '';
  }
}

function getVideoTargetingParams(bid) {
  return Object.keys(Object(bid.params.video))
    .filter(param => includes(VIDEO_TARGETING, param))
    .reduce((obj, param) => {
      obj[ param ] = bid.params.video[ param ];
      return obj;
    }, {});
}

function createVideoRequestData(bid, bidderRequest) {
  let sizes = getVideoSizes(bid);
  let firstSize = getFirstSize(sizes);
  let video = getVideoTargetingParams(bid);
  let appId = getVideoBidParam(bid, 'appId');
  let bidfloor = getVideoBidParam(bid, 'bidfloor');
  let topLocation = getTopWindowLocation(bidderRequest);
  let payload = {
    isPrebid: true,
    appId: appId,
    domain: document.location.hostname,
    id: utils.getUniqueIdentifierStr(),
    imp: [{
      video: Object.assign({
        w: firstSize.w,
        h: firstSize.h,
        mimes: DEFAULT_MIMES
      }, video),
      bidfloor: bidfloor,
      secure: topLocation.protocol === 'https:' ? 1 : 0,
      displaymanager: ADAPTER_NAME,
      displaymanagerver: ADAPTER_VERSION
    }],
    site: {
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
    regs: {
      ext: {}
    },
    user: {
      ext: {}
    },
    cur: ['USD']
  };

  if (bidderRequest && bidderRequest.uspConsent) {
    payload.regs.ext.us_privacy = bidderRequest.uspConsent;
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    let { gdprApplies, consentString } = bidderRequest.gdprConsent;
    payload.regs.ext.gdpr = gdprApplies ? 1 : 0;
    payload.user.ext.consent = consentString;
  }

  if (bid.userId && bid.userId.tdid) {
    payload.user.ext.eids = [{
      source: 'adserver.org',
      uids: [{
        id: bid.userId.tdid,
        ext: {
          rtiPartner: 'TDID'
        }
      }]
    }];
  }

  let connection = navigator.connection || navigator.webkitConnection;
  if (connection && connection.effectiveType) {
    payload.device.connectiontype = connection.effectiveType;
  }

  return payload;
}

function createBannerRequestData(bids, bidderRequest) {
  let topLocation = getTopWindowLocation(bidderRequest);
  let topReferrer = getTopWindowReferrer();
  let slots = bids.map(bid => {
    return {
      slot: bid.adUnitCode,
      id: getBannerBidParam(bid, 'appId'),
      bidfloor: getBannerBidParam(bid, 'bidfloor'),
      sizes: getBannerSizes(bid)
    };
  });
  let payload = {
    slots: slots,
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

  if (bids[0] && bids[0].userId && bids[0].userId.tdid) {
    payload.tdid = bids[0].userId.tdid;
  }

  return payload;
}

registerBidder(spec);
