import { deepAccess, generateUUID, isFn, parseSizesInput, parseUrl } from '../../src/utils.js';
import { config } from '../../src/config.js';
import { find, includes } from '../../src/polyfill.js';

export const DEFAULT_MIMES = ['video/mp4', 'application/javascript'];

export function isBannerBid(bid) {
  return deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

export function isVideoBid(bid) {
  return deepAccess(bid, 'mediaTypes.video');
}

export function getBannerBidFloor(bid) {
  let floorInfo = isFn(bid.getFloor) ? bid.getFloor({ currency: 'USD', mediaType: 'banner', size: '*' }) : {};
  return floorInfo?.floor || getBannerBidParam(bid, 'bidfloor');
}

export function getVideoBidFloor(bid) {
  let floorInfo = isFn(bid.getFloor) ? bid.getFloor({ currency: 'USD', mediaType: 'video', size: '*' }) : {};
  return floorInfo.floor || getVideoBidParam(bid, 'bidfloor');
}

export function isVideoBidValid(bid) {
  return isVideoBid(bid) && getVideoBidParam(bid, 'pubid') && getVideoBidParam(bid, 'placement');
}

export function isBannerBidValid(bid) {
  return isBannerBid(bid) && getBannerBidParam(bid, 'pubid') && getBannerBidParam(bid, 'placement');
}

export function getVideoBidParam(bid, key) {
  return deepAccess(bid, 'params.video.' + key) || deepAccess(bid, 'params.' + key);
}

export function getBannerBidParam(bid, key) {
  return deepAccess(bid, 'params.banner.' + key) || deepAccess(bid, 'params.' + key);
}

export function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

export function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

export function getDoNotTrack() {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNoTrack === '1' || navigator.doNotTrack === 'yes';
}

export function findAndFillParam(o, key, value) {
  try {
    if (typeof value === 'function') {
      o[key] = value();
    } else {
      o[key] = value;
    }
  } catch (ex) {}
}

export function getOsVersion() {
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

export function getFirstSize(sizes) {
  return (sizes && sizes.length) ? sizes[0] : { w: undefined, h: undefined };
}

export function parseSizes(sizes) {
  return parseSizesInput(sizes).map(size => {
    let [ width, height ] = size.split('x');
    return {
      w: parseInt(width, 10) || undefined,
      h: parseInt(height, 10) || undefined
    };
  });
}

export function getVideoSizes(bid) {
  return parseSizes(deepAccess(bid, 'mediaTypes.video.playerSize') || bid.sizes);
}

export function getBannerSizes(bid) {
  return parseSizes(deepAccess(bid, 'mediaTypes.banner.sizes') || bid.sizes);
}

export function getTopWindowReferrer(bidderRequest) {
  return bidderRequest?.refererInfo?.ref || '';
}

export function getTopWindowLocation(bidderRequest) {
  return parseUrl(bidderRequest?.refererInfo?.page, {decodeSearchAsString: true});
}

export function getVideoTargetingParams(bid, VIDEO_TARGETING) {
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

export function createRequestData(bid, bidderRequest, isVideo, getBidParam, getSizes, getBidFloor, BIDDER_CODE, ADAPTER_VERSION) {
  let topLocation = getTopWindowLocation(bidderRequest);
  let topReferrer = getTopWindowReferrer(bidderRequest);
  let paramSize = getBidParam(bid, 'size');
  let sizes = [];
  let coppa = config.getConfig('coppa');

  if (typeof paramSize !== 'undefined' && paramSize != '') {
    sizes = parseSizes(paramSize);
  } else {
    sizes = getSizes(bid);
  }

  const firstSize = getFirstSize(sizes);
  let floor = getBidFloor(bid) || (isVideo ? 0.5 : 0.1);
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
    'tmax': Math.min(3000, bidderRequest.timeout),
    'cur': ['USD'],
    'id': bid.bidId,
    'imp': [],
    'regs': {
      'ext': {}
    },
    'user': {
      'ext': {}
    }
  };

  o.site['page'] = topLocation.href;
  o.site['domain'] = topLocation.hostname;
  o.site['search'] = topLocation.search;
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

  let placement = getBidParam(bid, 'placement');
  let impType = isVideo ? {
    'video': Object.assign({
      'id': generateUUID(),
      'pos': 0,
      'w': firstSize.w,
      'h': firstSize.h,
      'mimes': DEFAULT_MIMES
    }, getVideoTargetingParams(bid))
  } : {
    'banner': {
      'id': generateUUID(),
      'pos': 0,
      'w': firstSize.w,
      'h': firstSize.h
    }
  };

  for (let j = 0; j < sizes.length; j++) {
    o.imp.push({
      'id': '' + j,
      'displaymanager': '' + BIDDER_CODE,
      'displaymanagerver': '' + ADAPTER_VERSION,
      'tagId': placement,
      'bidfloor': floor,
      'bidfloorcur': 'USD',
      'secure': secure,
      ...impType
    });
  }

  if (coppa) {
    o.regs.ext = {'coppa': 1};
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    let { gdprApplies, consentString } = bidderRequest.gdprConsent;
    o.regs.ext = {'gdpr': gdprApplies ? 1 : 0};
    o.user.ext = {'consent': consentString};
  }

  return o;
}
