import {
  isArray,
  isFn,
  deepAccess,
  isEmpty,
  contains,
  isInteger,
  getBidIdParameter,
  isPlainObject
} from '../../src/utils.js';
import { BANNER, VIDEO } from '../../src/mediaTypes.js';
import {config} from '../../src/config.js';

export function getFloor(bid, mediaType) {
  if (!isFn(bid.getFloor)) {
    return 0;
  }
  let floorResult = bid.getFloor({
    currency: 'USD',
    mediaType: mediaType,
    size: '*'
  });
  return isPlainObject(floorResult) && floorResult.currency === 'USD' && floorResult.floor ? floorResult.floor : 0;
}

export function getSizesArray(bid, mediaType) {
  let sizesArray = [];

  if (deepAccess(bid, `mediaTypes.${mediaType}.sizes`)) {
    sizesArray = bid.mediaTypes[mediaType].sizes;
  } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0) {
    sizesArray = bid.sizes;
  }

  return sizesArray;
}

export function getSupplyChain(schainObject) {
  if (isEmpty(schainObject)) {
    return '';
  }
  let scStr = `${schainObject.ver},${schainObject.complete}`;
  schainObject.nodes.forEach((node) => {
    scStr += '!';
    scStr += `${getEncodedValIfNotEmpty(node.asi)},`;
    scStr += `${getEncodedValIfNotEmpty(node.sid)},`;
    scStr += `${getEncodedValIfNotEmpty(node.hp)},`;
    scStr += `${getEncodedValIfNotEmpty(node.rid)},`;
    scStr += `${getEncodedValIfNotEmpty(node.name)},`;
    scStr += `${getEncodedValIfNotEmpty(node.domain)}`;
  });
  return scStr;
}

export function getEncodedValIfNotEmpty(val) {
  return (val !== '' && val !== undefined) ? encodeURIComponent(val) : '';
}

export function getAllowedSyncMethod(filterSettings, bidderCode) {
  const iframeConfigsToCheck = ['all', 'iframe'];
  const pixelConfigToCheck = 'image';
  if (filterSettings && iframeConfigsToCheck.some(config => isSyncMethodAllowed(filterSettings[config], bidderCode))) {
    return 'iframe';
  }
  if (!filterSettings || !filterSettings[pixelConfigToCheck] || isSyncMethodAllowed(filterSettings[pixelConfigToCheck], bidderCode)) {
    return 'pixel';
  }
}

export function isSyncMethodAllowed(syncRule, bidderCode) {
  if (!syncRule) {
    return false;
  }
  const isInclude = syncRule.filter === 'include';
  const bidders = isArray(syncRule.bidders) ? syncRule.bidders : [bidderCode];
  return isInclude && contains(bidders, bidderCode);
}

export function getEndpoint(testMode, baseUrl, modes) {
  const protocol = baseUrl.startsWith('http') ? '' : 'https://';
  const url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return testMode
    ? `${protocol}${url}${modes.TEST}`
    : `${protocol}${url}${modes.PRODUCTION}`;
}

export function getDeviceType(ua) {
  if (/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(ua.toLowerCase())) {
    return '5';
  }
  if (/iphone|ipod|android|blackberry|opera|mini|windows\\sce|palm|smartphone|iemobile/i.test(ua.toLowerCase())) {
    return '4';
  }
  if (/smart[-_\\s]?tv|hbbtv|appletv|googletv|hdmi|netcast|viera|nettv|roku|\\bdtv\\b|sonydtv|inettvbrowser|\\btv\\b/i.test(ua.toLowerCase())) {
    return '3';
  }
  return '1';
}

export function generateBidsParams(validBidRequests, bidderRequest) {
  const bidsArray = [];

  if (validBidRequests.length) {
    validBidRequests.forEach(bid => {
      bidsArray.push(generateBidParameters(bid, bidderRequest));
    });
  }

  return bidsArray;
}

export function generateBidParameters(bid, bidderRequest) {
  const { params } = bid;
  const mediaType = isBanner(bid) ? BANNER : VIDEO;
  const sizesArray = getSizesArray(bid, mediaType);

  if (isNaN(params.floorPrice)) {
    params.floorPrice = 0;
  }

  const bidObject = {
    mediaType,
    adUnitCode: getBidIdParameter('adUnitCode', bid),
    sizes: sizesArray,
    floorPrice: Math.max(getFloor(bid, mediaType), params.floorPrice),
    bidId: getBidIdParameter('bidId', bid),
    loop: bid.bidderRequestsCount || 0,
    bidderRequestId: getBidIdParameter('bidderRequestId', bid),
    transactionId: bid.ortb2Imp?.ext?.tid || '',
    coppa: 0,
  };

  const pos = deepAccess(bid, `mediaTypes.${mediaType}.pos`);
  if (pos) {
    bidObject.pos = pos;
  }

  const gpid = deepAccess(bid, `ortb2Imp.ext.gpid`);
  if (gpid) {
    bidObject.gpid = gpid;
  }

  const placementId = params.placementId || deepAccess(bid, `mediaTypes.${mediaType}.name`);
  if (placementId) {
    bidObject.placementId = placementId;
  }

  const mimes = deepAccess(bid, `mediaTypes.${mediaType}.mimes`);
  if (mimes) {
    bidObject.mimes = mimes;
  }

  const api = deepAccess(bid, `mediaTypes.${mediaType}.api`);
  if (api) {
    bidObject.api = api;
  }

  const sua = deepAccess(bid, `ortb2.device.sua`);
  if (sua) {
    bidObject.sua = sua;
  }

  const coppa = deepAccess(bid, `ortb2.regs.coppa`);
  if (coppa) {
    bidObject.coppa = 1;
  }

  if (mediaType === VIDEO) {
    const playbackMethod = deepAccess(bid, `mediaTypes.video.playbackmethod`);
    let playbackMethodValue;

    if (Array.isArray(playbackMethod) && isInteger(playbackMethod[0])) {
      playbackMethodValue = playbackMethod[0];
    } else if (isInteger(playbackMethod)) {
      playbackMethodValue = playbackMethod;
    }

    if (playbackMethodValue) {
      bidObject.playbackMethod = playbackMethodValue;
    }

    const placement = deepAccess(bid, `mediaTypes.video.placement`);
    if (placement) {
      bidObject.placement = placement;
    }

    const minDuration = deepAccess(bid, `mediaTypes.video.minduration`);
    if (minDuration) {
      bidObject.minDuration = minDuration;
    }

    const maxDuration = deepAccess(bid, `mediaTypes.video.maxduration`);
    if (maxDuration) {
      bidObject.maxDuration = maxDuration;
    }

    const skip = deepAccess(bid, `mediaTypes.video.skip`);
    if (skip) {
      bidObject.skip = skip;
    }

    const linearity = deepAccess(bid, `mediaTypes.video.linearity`);
    if (linearity) {
      bidObject.linearity = linearity;
    }

    const protocols = deepAccess(bid, `mediaTypes.video.protocols`);
    if (protocols) {
      bidObject.protocols = protocols;
    }

    const plcmt = deepAccess(bid, `mediaTypes.video.plcmt`);
    if (plcmt) {
      bidObject.plcmt = plcmt;
    }
  }

  return bidObject;
}

export function buildBidResponse(adUnit, DEFAULT_CURRENCY, TTL, VIDEO, BANNER) {
  const bidResponse = {
    requestId: adUnit.requestId,
    cpm: adUnit.cpm,
    currency: adUnit.currency || DEFAULT_CURRENCY,
    width: adUnit.width,
    height: adUnit.height,
    ttl: adUnit.ttl || TTL,
    creativeId: adUnit.creativeId,
    netRevenue: adUnit.netRevenue || true,
    nurl: adUnit.nurl,
    mediaType: adUnit.mediaType,
    meta: {
      mediaType: adUnit.mediaType
    }
  };

  if (adUnit.mediaType === VIDEO) {
    bidResponse.vastXml = adUnit.vastXml;
  } else if (adUnit.mediaType === BANNER) {
    bidResponse.ad = adUnit.ad;
  }

  if (adUnit.adomain && adUnit.adomain.length) {
    bidResponse.meta.advertiserDomains = adUnit.adomain;
  }

  return bidResponse;
}

function isBanner(bid) {
  return bid.mediaTypes && bid.mediaTypes.banner;
}

export function generateGeneralParams(generalObject, bidderRequest, adapterVersion) {
  const domain = window.location.hostname;
  const { syncEnabled, filterSettings } = config.getConfig('userSync') || {};
  const { bidderCode } = bidderRequest;
  const generalBidParams = generalObject.params;
  const timeout = bidderRequest.timeout;
  const adapVer = adapterVersion || '6.0.0';

  const generalParams = {
    wrapper_type: 'prebidjs',
    wrapper_vendor: '$$PREBID_GLOBAL$$',
    wrapper_version: '$prebid.version$',
    adapter_version: adapVer,
    auction_start: bidderRequest.auctionStart,
    publisher_id: generalBidParams.org,
    publisher_name: domain,
    site_domain: domain,
    dnt: (navigator.doNotTrack === 'yes' || navigator.doNotTrack === '1' || navigator.msDoNotTrack === '1') ? 1 : 0,
    device_type: getDeviceType(navigator.userAgent),
    ua: navigator.userAgent,
    is_wrapper: !!generalBidParams.isWrapper,
    session_id: generalBidParams.sessionId || getBidIdParameter('bidderRequestId', generalObject),
    tmax: timeout
  };

  const userIdsParam = getBidIdParameter('userId', generalObject);
  if (userIdsParam) {
    generalParams.userIds = JSON.stringify(userIdsParam);
  }

  const ortb2Metadata = bidderRequest.ortb2 || {};
  if (ortb2Metadata.site) {
    generalParams.site_metadata = JSON.stringify(ortb2Metadata.site);
  }
  if (ortb2Metadata.user) {
    generalParams.user_metadata = JSON.stringify(ortb2Metadata.user);
  }

  if (syncEnabled) {
    const allowedSyncMethod = getAllowedSyncMethod(filterSettings, bidderCode);
    if (allowedSyncMethod) {
      generalParams.cs_method = allowedSyncMethod;
    }
  }

  if (bidderRequest.uspConsent) {
    generalParams.us_privacy = bidderRequest.uspConsent;
  }

  if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
    generalParams.gdpr = bidderRequest.gdprConsent.gdprApplies;
    generalParams.gdpr_consent = bidderRequest.gdprConsent.consentString;
  }

  if (bidderRequest.gppConsent) {
    generalParams.gpp = bidderRequest.gppConsent.gppString;
    generalParams.gpp_sid = bidderRequest.gppConsent.applicableSections;
  } else if (bidderRequest.ortb2?.regs?.gpp) {
    generalParams.gpp = bidderRequest.ortb2.regs.gpp;
    generalParams.gpp_sid = bidderRequest.ortb2.regs.gpp_sid;
  }

  if (generalBidParams.ifa) {
    generalParams.ifa = generalBidParams.ifa;
  }

  if (generalObject.schain) {
    generalParams.schain = getSupplyChain(generalObject.schain);
  }

  if (bidderRequest && bidderRequest.refererInfo) {
    generalParams.referrer = deepAccess(bidderRequest, 'refererInfo.ref');
    generalParams.page_url = deepAccess(bidderRequest, 'refererInfo.page') || deepAccess(window, 'location.href');
    generalParams.site_domain = deepAccess(bidderRequest, 'refererInfo.domain') || deepAccess(window, 'location.hostname');
  }

  return generalParams;
}
