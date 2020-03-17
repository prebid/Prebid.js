import * as utils from '../src/utils';
import { parse as parseUrl } from '../src/url';
import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
import { VIDEO, BANNER } from '../src/mediaTypes';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';

const ADAPTER_VERSION = '1.0';
const BIDDER_CODE = 'advangelists';

export const VIDEO_ENDPOINT = 'https://nep.advangelists.com/xp/get?pubid=';// 0cf8d6d643e13d86a5b6374148a4afac';
export const BANNER_ENDPOINT = 'https://nep.advangelists.com/xp/get?pubid=';// 0cf8d6d643e13d86a5b6374148a4afac';
export const OUTSTREAM_SRC = 'https://player-cdn.beachfrontmedia.com/playerapi/loader/outstream.js';
export const VIDEO_TARGETING = ['mimes', 'playbackmethod', 'maxduration', 'skip'];
export const DEFAULT_MIMES = ['video/mp4', 'application/javascript'];

let pubid = '';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(bidRequest) {
    if (typeof bidRequest != 'undefined') {
      if (bidRequest.bidder !== BIDDER_CODE && typeof bidRequest.params === 'undefined') { return false; }
      if (bidRequest === '' || bidRequest.params.placement === '' || bidRequest.params.pubid === '') { return false; }
      return true;
    } else { return false; }
  },

  buildRequests(bids, bidderRequest) {
    let requests = [];
    let videoBids = bids.filter(bid => isVideoBidValid(bid));
    let bannerBids = bids.filter(bid => isBannerBidValid(bid));
    videoBids.forEach(bid => {
      pubid = getVideoBidParam(bid, 'pubid');
      requests.push({
        method: 'POST',
        url: VIDEO_ENDPOINT + pubid,
        data: createVideoRequestData(bid, bidderRequest),
        bidRequest: bid
      });
    });

    bannerBids.forEach(bid => {
      pubid = getBannerBidParam(bid, 'pubid');
      requests.push({
        method: 'POST',
        url: BANNER_ENDPOINT + pubid,
        data: createBannerRequestData(bid, bidderRequest),
        bidRequest: bid
      });
    });
    return requests;
  },

  interpretResponse(serverResponse, {bidRequest}) {
    let response = serverResponse.body;
    if (response !== null && utils.isEmpty(response) == false) {
      if (isVideoBid(bidRequest)) {
        let bidResponse = {
          requestId: response.id,
          bidderCode: BIDDER_CODE,
          cpm: response.seatbid[0].bid[0].price,
          width: response.seatbid[0].bid[0].w,
          height: response.seatbid[0].bid[0].h,
          ttl: response.seatbid[0].bid[0].ttl || 60,
          creativeId: response.seatbid[0].bid[0].crid,
          currency: response.cur,
          mediaType: VIDEO,
          netRevenue: true
        }

        if (response.seatbid[0].bid[0].adm) {
          bidResponse.vastXml = response.seatbid[0].bid[0].adm;
          bidResponse.adResponse = {
            content: response.seatbid[0].bid[0].adm
          };
        } else {
          bidResponse.vastUrl = response.seatbid[0].bid[0].nurl;
        }

        return bidResponse;
      } else {
        return {
          requestId: response.id,
          bidderCode: BIDDER_CODE,
          cpm: response.seatbid[0].bid[0].price,
          width: response.seatbid[0].bid[0].w,
          height: response.seatbid[0].bid[0].h,
          ad: response.seatbid[0].bid[0].adm,
          ttl: response.seatbid[0].bid[0].ttl || 60,
          creativeId: response.seatbid[0].bid[0].crid,
          currency: response.cur,
          mediaType: BANNER,
          netRevenue: true
        }
      }
    }
  }
};

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isVideoBidValid(bid) {
  return isVideoBid(bid) && getVideoBidParam(bid, 'pubid') && getVideoBidParam(bid, 'placement');
}

function isBannerBidValid(bid) {
  return isBannerBid(bid) && getBannerBidParam(bid, 'pubid') && getBannerBidParam(bid, 'placement');
}

function getVideoBidParam(bid, key) {
  return utils.deepAccess(bid, 'params.video.' + key) || utils.deepAccess(bid, 'params.' + key);
}

function getBannerBidParam(bid, key) {
  return utils.deepAccess(bid, 'params.banner.' + key) || utils.deepAccess(bid, 'params.' + key);
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

function findAndFillParam(o, key, value) {
  try {
    if (typeof value === 'function') {
      o[key] = value();
    } else {
      o[key] = value;
    }
  } catch (ex) {}
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
  let topLocation = getTopWindowLocation(bidderRequest);
  let topReferrer = getTopWindowReferrer();

  let sizes = getVideoSizes(bid);
  let firstSize = getFirstSize(sizes);

  let video = getVideoTargetingParams(bid);
  const o = {
    'device': {
      'langauge': (global.navigator.language).split('-')[0],
      'dnt': (global.navigator.doNotTrack === 1 ? 1 : 0),
      'devicetype': isMobile() ? 4 : isConnectedTV() ? 3 : 2,
      'js': 1,
      'os': getOsVersion()
    },
    'at': 2,
    'site': {},
    'tmax': 3000,
    'cur': ['USD'],
    'id': bid.bidId,
    'imp': [],
    'regs': {
      'ext': {
      }
    },
    'user': {
      'ext': {
      }
    }
  };

  o.site['page'] = topLocation.href;
  o.site['domain'] = topLocation.hostname;
  o.site['search'] = topLocation.search;
  o.site['domain'] = topLocation.hostname;
  o.site['ref'] = topReferrer;
  o.site['mobile'] = isMobile() ? 1 : 0;
  const secure = topLocation.protocol.indexOf('https') === 0 ? 1 : 0;

  o.device['dnt'] = getDoNotTrack() ? 1 : 0;

  findAndFillParam(o.site, 'name', function() {
    return global.top.document.title;
  });

  findAndFillParam(o.device, 'h', function() {
    return global.screen.height;
  });
  findAndFillParam(o.device, 'w', function() {
    return global.screen.width;
  });

  let placement = getVideoBidParam(bid, 'placement');

  for (let j = 0; j < sizes.length; j++) {
    o.imp.push({
      'id': '' + j,
      'displaymanager': '' + BIDDER_CODE,
      'displaymanagerver': '' + ADAPTER_VERSION,
      'tagId': placement,
      'bidfloor': 2.0,
      'bidfloorcur': 'USD',
      'secure': secure,
      'video': Object.assign({
        'id': utils.generateUUID(),
        'pos': 0,
        'w': firstSize.w,
        'h': firstSize.h,
        'mimes': DEFAULT_MIMES
      }, video)

    });
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    let { gdprApplies, consentString } = bidderRequest.gdprConsent;
    o.regs.ext = {'gdpr': gdprApplies ? 1 : 0};
    o.user.ext = {'consent': consentString};
  }

  return o;
}

function getTopWindowLocation(bidderRequest) {
  let url = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer;
  return parseUrl(config.getConfig('pageUrl') || url, { decodeSearchAsString: true });
}

function createBannerRequestData(bid, bidderRequest) {
  let topLocation = getTopWindowLocation(bidderRequest);
  let topReferrer = getTopWindowReferrer();

  let sizes = getBannerSizes(bid);

  const o = {
    'device': {
      'langauge': (global.navigator.language).split('-')[0],
      'dnt': (global.navigator.doNotTrack === 1 ? 1 : 0),
      'devicetype': isMobile() ? 4 : isConnectedTV() ? 3 : 2,
      'js': 1
    },
    'at': 2,
    'site': {},
    'tmax': 3000,
    'cur': ['USD'],
    'id': bid.bidId,
    'imp': [],
    'regs': {
      'ext': {
      }
    },
    'user': {
      'ext': {
      }
    }
  };

  o.site['page'] = topLocation.href;
  o.site['domain'] = topLocation.hostname;
  o.site['search'] = topLocation.search;
  o.site['domain'] = topLocation.hostname;
  o.site['ref'] = topReferrer;
  o.site['mobile'] = isMobile() ? 1 : 0;
  const secure = topLocation.protocol.indexOf('https') === 0 ? 1 : 0;

  o.device['dnt'] = getDoNotTrack() ? 1 : 0;

  findAndFillParam(o.site, 'name', function() {
    return global.top.document.title;
  });

  findAndFillParam(o.device, 'h', function() {
    return global.screen.height;
  });
  findAndFillParam(o.device, 'w', function() {
    return global.screen.width;
  });

  let placement = getBannerBidParam(bid, 'placement');
  for (let j = 0; j < sizes.length; j++) {
    let size = sizes[j];

    o.imp.push({
      'id': '' + j,
      'displaymanager': '' + BIDDER_CODE,
      'displaymanagerver': '' + ADAPTER_VERSION,
      'tagId': placement,
      'bidfloor': 2.0,
      'bidfloorcur': 'USD',
      'secure': secure,
      'banner': {
        'id': utils.generateUUID(),
        'pos': 0,
        'w': size['w'],
        'h': size['h']
      }
    });
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    let { gdprApplies, consentString } = bidderRequest.gdprConsent;
    o.regs.ext = {'gdpr': gdprApplies ? 1 : 0};
    o.user.ext = {'consent': consentString};
  }

  return o;
}

registerBidder(spec);
