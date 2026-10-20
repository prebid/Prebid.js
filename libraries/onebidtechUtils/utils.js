import { deepAccess, isNumber, isArray, isFn, generateUUID } from '../../src/utils.js';
import { config } from '../../src/config.js';
import { BANNER, VIDEO } from '../../src/mediaTypes.js';

// Shared OneBid Tech backend config. All partner-branded adapters that hit
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
  const staticFloor = isNumber(params.bidFloor) ? params.bidFloor : 0;

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
  return (info && isNumber(info.floor)) ? info.floor : staticFloor;
}

function buildImpression(bidRequest) {
  const params = bidRequest.params || {};
  const cur = params.currency || DEFAULT_CUR;
  const { bannerSizes, videoSizes } = resolveDeclaredSizes(bidRequest);
  const hasBanner = bannerSizes.length > 0;
  const hasVideo = videoSizes.length > 0;

  const imp = {
    id: bidRequest.bidId,
    bidfloor: getBidFloor(bidRequest, cur, hasBanner, hasVideo, bannerSizes, videoSizes),
    bidfloorcur: cur,
    secure: 1
  };

  if (hasBanner) {
    imp.banner = {
      w: bannerSizes[0][0],
      h: bannerSizes[0][1],
      format: bannerSizes.map(([w, h]) => ({ w, h }))
    };
  }

  if (hasVideo) {
    imp.video = {
      w: videoSizes[0][0],
      h: videoSizes[0][1],
      mimes: deepAccess(bidRequest, 'mediaTypes.video.mimes') || ['video/mp4'],
      protocols: deepAccess(bidRequest, 'mediaTypes.video.protocols'),
      placement: deepAccess(bidRequest, 'mediaTypes.video.placement')
    };
  }

  return imp;
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

export function buildRequests(validBidRequests, bidderRequest, endpointUrl) {
  const placementId = validBidRequests[0].params.placementId;
  const imps = validBidRequests.map(buildImpression);
  const schain = resolveSchain(validBidRequests, bidderRequest);

  const payload = {
    id: bidderRequest.bidderRequestId || generateUUID(),
    cur: [DEFAULT_CUR],
    imp: imps,
    site: {
      page: bidderRequest.refererInfo && bidderRequest.refererInfo.page,
      domain: bidderRequest.refererInfo && bidderRequest.refererInfo.domain
    },
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
