import { deepAccess, deepClone, isNumber, isArray, isFn, generateUUID } from '../../src/utils.js';
import { config } from '../../src/config.js';
import { BANNER, VIDEO } from '../../src/mediaTypes.js';
import { ORTB_BANNER_PARAMS } from '../../src/banner.js';
import { ORTB_VIDEO_PARAMS } from '../../src/video.js';

// Shared One Bid Tech backend config. All partner-branded adapters that hit
// this backend use the same currency default, TTL, and revenue model --
// routing to the right partner happens via the placementId hash substituted
// into the URL, not via any per-bidder constant here. The endpoint itself is
// passed into buildRequests() by the calling adapter.
const DEFAULT_CUR = 'USD';
const TIME_TO_LIVE = 1200;
const NET_REVENUE = true;
const MTYPE_BANNER = 1;
const MTYPE_VIDEO = 2;

function getBannerSizes(bidRequest) {
  const sizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes');
  return (isArray(sizes) && sizes.length) ? sizes : [];
}

function getVideoSizes(bidRequest) {
  const sizes = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
  if (!isArray(sizes) || !sizes.length) {
    return [];
  }
  return isArray(sizes[0]) ? sizes : [sizes];
}

function getLegacySizes(bidRequest) {
  return isArray(bidRequest.sizes) ? bidRequest.sizes : [];
}

function resolveDeclaredSizes(bidRequest) {
  const videoSizes = getVideoSizes(bidRequest);
  let bannerSizes = getBannerSizes(bidRequest);
  if (!bannerSizes.length && !videoSizes.length) {
    bannerSizes = getLegacySizes(bidRequest);
  }
  return { bannerSizes, videoSizes };
}

function getBidFloor(bidRequest, cur, hasBanner, hasVideo, bannerSizes, videoSizes) {
  const params = bidRequest.params || {};
  const staticFloor = { floor: isNumber(params.bidFloor) ? params.bidFloor : 0, currency: cur };

  if (!isFn(bidRequest.getFloor)) {
    return staticFloor;
  }

  let floorArgs;
  if (hasBanner && hasVideo) {
    floorArgs = { currency: cur, mediaType: '*', size: '*' };
  } else if (hasVideo) {
    floorArgs = { currency: cur, mediaType: VIDEO, size: videoSizes[0] || [] };
  } else {
    floorArgs = { currency: cur, mediaType: BANNER, size: bannerSizes[0] || [] };
  }

  const info = bidRequest.getFloor(floorArgs);
  if (info && isNumber(info.floor)) {
    return { floor: info.floor, currency: info.currency || cur };
  }
  return staticFloor;
}

function pickValidOrtbParams(declared, ortbParams) {
  const picked = {};
  ortbParams.forEach((isValid, name) => {
    if (declared[name] != null && isValid(declared[name])) {
      picked[name] = declared[name];
    }
  });
  return picked;
}

function buildBannerObject(bidRequest, bannerSizes) {
  const banner = pickValidOrtbParams(deepAccess(bidRequest, 'mediaTypes.banner') || {}, ORTB_BANNER_PARAMS);

  banner.w = bannerSizes[0][0];
  banner.h = bannerSizes[0][1];
  banner.format = bannerSizes.map(([w, h]) => ({ w, h }));

  return banner;
}

function buildVideoObject(bidRequest, videoSizes) {
  const video = pickValidOrtbParams(deepAccess(bidRequest, 'mediaTypes.video') || {}, ORTB_VIDEO_PARAMS);

  video.w = videoSizes[0][0];
  video.h = videoSizes[0][1];
  video.mimes = video.mimes || ['video/mp4'];

  return video;
}

function buildImpression(bidRequest) {
  const params = bidRequest.params || {};
  const cur = params.currency || DEFAULT_CUR;
  const { bannerSizes, videoSizes } = resolveDeclaredSizes(bidRequest);
  const hasBanner = bannerSizes.length > 0;
  const hasVideo = videoSizes.length > 0;

  const { floor, currency } = getBidFloor(bidRequest, cur, hasBanner, hasVideo, bannerSizes, videoSizes);

  const { fpdBanner, fpdVideo, fpdImp } = splitImpressionFpd(bidRequest);

  const imp = {
    ...fpdImp,
    id: bidRequest.bidId,
    bidfloor: floor,
    bidfloorcur: currency,
    secure: 1
  };

  if (hasBanner) {
    imp.banner = { ...fpdBanner, ...buildBannerObject(bidRequest, bannerSizes) };
  }

  if (hasVideo) {
    imp.video = { ...fpdVideo, ...buildVideoObject(bidRequest, videoSizes) };
  }

  return imp;
}

function splitImpressionFpd(bidRequest) {
  const fpdImp = deepClone(bidRequest.ortb2Imp || {});
  const fpdBanner = fpdImp.banner;
  const fpdVideo = fpdImp.video;
  ['banner', 'video', 'audio', 'native'].forEach((mediaType) => {
    delete fpdImp[mediaType];
  });
  return { fpdBanner, fpdVideo, fpdImp };
}

function buildConsentBlock(bidderRequest) {
  const consent = {};

  if (bidderRequest.gdprConsent) {
    consent.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    consent.gdprConsentString = bidderRequest.gdprConsent.consentString;
  }

  if (bidderRequest.uspConsent) {
    consent.usPrivacy = bidderRequest.uspConsent;
  }

  if (bidderRequest.gppConsent) {
    consent.gpp = bidderRequest.gppConsent.gppString;
    consent.gppSid = bidderRequest.gppConsent.applicableSections;
  }

  const coppa = config.getConfig('coppa');
  if (coppa) {
    consent.coppa = 1;
  }

  return consent;
}

function resolveSchain(validBidRequests, bidderRequest) {
  const fromOrtb2 = deepAccess(bidderRequest, 'ortb2.source.ext.schain');
  if (fromOrtb2) {
    return fromOrtb2;
  }
  return deepAccess(validBidRequests[0], 'schain');
}

function buildSiteOrApp(bidderRequest) {
  const ortb2 = bidderRequest.ortb2 || {};

  if (ortb2.app) {
    return { app: { ...ortb2.app } };
  }

  const site = { ...ortb2.site };
  const refererInfo = bidderRequest.refererInfo || {};
  if (!site.page && refererInfo.page) {
    site.page = refererInfo.page;
  }
  if (!site.domain && refererInfo.domain) {
    site.domain = refererInfo.domain;
  }
  return { site };
}

const ORTB2_RESTRICTION_FIELDS = ['bcat', 'cattax', 'badv', 'bapp', 'wseat', 'bseat', 'wlang', 'wlangb'];

function buildRestrictions(bidderRequest) {
  const ortb2 = bidderRequest.ortb2 || {};
  const restrictions = {};
  ORTB2_RESTRICTION_FIELDS.forEach((field) => {
    if (ortb2[field] != null) {
      restrictions[field] = ortb2[field];
    }
  });
  return restrictions;
}

export function buildRequests(validBidRequests, bidderRequest, endpointUrl) {
  const placementId = validBidRequests[0].params.placementId;
  const imps = validBidRequests.map(buildImpression);
  const schain = resolveSchain(validBidRequests, bidderRequest);

  const payload = {
    ...buildRestrictions(bidderRequest),
    id: bidderRequest.bidderRequestId || generateUUID(),
    cur: [DEFAULT_CUR],
    imp: imps,
    ...buildSiteOrApp(bidderRequest),
    user: buildConsentBlock(bidderRequest)
  };

  if (schain) {
    payload.source = { ext: { schain } };
  }

  return {
    method: 'POST',
    url: endpointUrl.replace('placement', placementId),
    data: JSON.stringify(payload),
    options: {
      contentType: 'text/plain',
      withCredentials: true
    },
    bids: validBidRequests
  };
}

export function interpretResponse(serverResponse, request) {
  const body = serverResponse && serverResponse.body;
  if (!body || !isArray(body.seatbid)) {
    return [];
  }

  const bidResponses = [];

  body.seatbid.forEach((seat) => {
    (seat.bid || []).forEach((serverBid) => {
      if (!serverBid.price || serverBid.price <= 0) {
        return;
      }

      const matchedRequest = (request.bids || []).find((b) => b.bidId === serverBid.impid);
      const { bannerSizes, videoSizes } = matchedRequest
        ? resolveDeclaredSizes(matchedRequest)
        : { bannerSizes: [], videoSizes: [] };
      const isMultiformat = bannerSizes.length > 0 && videoSizes.length > 0;

      let isVideo;
      if (serverBid.mtype === MTYPE_VIDEO) {
        isVideo = true;
      } else if (serverBid.mtype === MTYPE_BANNER) {
        isVideo = false;
      } else if (isMultiformat) {
        isVideo = typeof serverBid.adm === 'string' && /<VAST/i.test(serverBid.adm);
      } else {
        isVideo = videoSizes.length > 0;
      }

      const sizeSource = isVideo ? videoSizes : bannerSizes;

      const bidResponse = {
        requestId: serverBid.impid,
        cpm: serverBid.price,
        currency: body.cur || DEFAULT_CUR,
        width: serverBid.w || (sizeSource[0] && sizeSource[0][0]),
        height: serverBid.h || (sizeSource[0] && sizeSource[0][1]),
        creativeId: serverBid.crid || serverBid.id,
        nurl: serverBid.nurl,
        netRevenue: NET_REVENUE,
        ttl: TIME_TO_LIVE,
        meta: {
          advertiserDomains: serverBid.adomain || []
        }
      };

      if (isVideo) {
        bidResponse.vastXml = serverBid.adm;
        bidResponse.mediaType = VIDEO;
      } else {
        bidResponse.ad = serverBid.adm;
        bidResponse.mediaType = BANNER;
      }

      bidResponses.push(bidResponse);
    });
  });

  return bidResponses;
}
