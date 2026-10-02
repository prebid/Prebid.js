import { deepAccess, isNumber, isArray, generateUUID } from '../../src/utils.js';
import { config } from '../../src/config.js';
import { BANNER, VIDEO } from '../../src/mediaTypes.js';

// Shared OneBid Tech backend config. All partner-branded adapters that hit
// this backend use the same currency default, TTL, and revenue model -- routing to the right partner
// happens via the placementId hash substituted into the URL, not via any
// per-bidder constant here.
const DEFAULT_CUR = 'USD';
const TIME_TO_LIVE = 1200;
const NET_REVENUE = true;

function getSizes(bidRequest) {
  const bannerSizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes');
  if (isArray(bannerSizes) && bannerSizes.length) {
    return bannerSizes;
  }
  const videoSizes = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
  if (isArray(videoSizes) && videoSizes.length) {
    return isArray(videoSizes[0]) ? videoSizes : [videoSizes];
  }
  return isArray(bidRequest.sizes) ? bidRequest.sizes : [];
}

function buildImpression(bidRequest) {
  const params = bidRequest.params || {};
  const sizes = getSizes(bidRequest);
  const isVideo = !!deepAccess(bidRequest, 'mediaTypes.video');

  const imp = {
    id: bidRequest.bidId,
    bidfloor: isNumber(params.bidFloor) ? params.bidFloor : 0,
    bidfloorcur: params.currency || DEFAULT_CUR,
    secure: 1
  };

  if (isVideo) {
    imp.video = {
      w: sizes[0] ? sizes[0][0] : undefined,
      h: sizes[0] ? sizes[0][1] : undefined,
      mimes: deepAccess(bidRequest, 'mediaTypes.video.mimes') || ['video/mp4'],
      protocols: deepAccess(bidRequest, 'mediaTypes.video.protocols'),
      placement: deepAccess(bidRequest, 'mediaTypes.video.placement')
    };
  } else {
    imp.banner = {
      w: sizes[0] ? sizes[0][0] : undefined,
      h: sizes[0] ? sizes[0][1] : undefined,
      format: sizes.map(([w, h]) => ({ w, h }))
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

export function buildRequests(validBidRequests, bidderRequest, endpointUrl) {
  const placementId = validBidRequests[0].params.placementId;
  const imps = validBidRequests.map(buildImpression);

  const payload = {
    id: bidderRequest.bidderRequestId || generateUUID(),
    cur: [DEFAULT_CUR],
    imp: imps,
    site: {
      page: bidderRequest.refererInfo && bidderRequest.refererInfo.page,
      domain: bidderRequest.refererInfo && bidderRequest.refererInfo.domain
    },
    user: buildConsentBlock(bidderRequest),
    ext: {
      schain: deepAccess(validBidRequests[0], 'schain')
    }
  };

  return {
    method: 'POST',
    url: endpointUrl.replace('placement', placementId),
    data: JSON.stringify(payload),
    options: {
      contentType: 'application/json',
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

      const bidResponse = {
        requestId: serverBid.impid,
        cpm: serverBid.price,
        currency: body.cur || DEFAULT_CUR,
        width: serverBid.w || (matchedRequest && getSizes(matchedRequest)[0] && getSizes(matchedRequest)[0][0]),
        height: serverBid.h || (matchedRequest && getSizes(matchedRequest)[0] && getSizes(matchedRequest)[0][1]),
        creativeId: serverBid.crid || serverBid.id,
        netRevenue: NET_REVENUE,
        ttl: TIME_TO_LIVE,
        meta: {
          advertiserDomains: serverBid.adomain || []
        }
      };

      if (serverBid.adm && matchedRequest && deepAccess(matchedRequest, 'mediaTypes.video')) {
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
