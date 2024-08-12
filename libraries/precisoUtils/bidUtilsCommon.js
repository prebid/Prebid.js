import { config } from '../../src/config.js';
import {
  isFn,
  isStr,
  deepAccess,
  getWindowTop,
  triggerPixel
} from '../../src/utils.js';
import { BANNER, VIDEO, NATIVE } from '../../src/mediaTypes.js';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId ||
        !bid.ttl || !bid.currency || !bid.meta) {
    return false;
  }

  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastXml || bid.vastUrl);
    case NATIVE:
      return Boolean(bid.native && bid.native.impressionTrackers);
    default:
      return false;
  }
}

export function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidFloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    return bidFloor.floor;
  } catch (_) {
    return 0
  }
}

export function isBidRequestValid(bid) {
  return Boolean(bid.bidId && bid.params && bid.params.placementId);
}

export const buildBidRequests = (adurl) => (validBidRequests = [], bidderRequest) => {
  const winTop = getWindowTop();
  const location = winTop.location;
  const placements = [];

  const request = {
    deviceWidth: winTop.screen.width,
    deviceHeight: winTop.screen.height,
    language: (navigator && navigator.language) ? navigator.language.split('-')[0] : '',
    host: location.host,
    page: location.pathname,
    placements: placements
  };
  consentCheck(bidderRequest, request);

  // if (bidderRequest) {
  //   if (bidderRequest.uspConsent) {
  //     request.ccpa = bidderRequest.uspConsent;
  //   }
  //   if (bidderRequest.gdprConsent) {
  //     request.gdpr = bidderRequest.gdprConsent;
  //   }
  // }

  const len = validBidRequests.length;
  for (let i = 0; i < len; i++) {
    const bid = validBidRequests[i];
    const placement = {
      placementId: bid.params.placementId,
      bidId: bid.bidId,
      schain: bid.schain || {},
      bidfloor: getBidFloor(bid)
    };

    if (typeof bid.userId !== 'undefined') {
      placement.userId = bid.userId;
    }

    const mediaType = bid.mediaTypes;

    if (mediaType && mediaType[BANNER] && mediaType[BANNER].sizes) {
      placement.sizes = mediaType[BANNER].sizes;
      placement.adFormat = BANNER;
    }

    placements.push(placement);
  }

  return {
    method: 'POST',
    url: adurl,
    data: request
  };
}

export function interpretResponse(serverResponse) {
  let response = [];
  for (let i = 0; i < serverResponse.body.length; i++) {
    let resItem = serverResponse.body[i];
    if (isBidResponseValid(resItem)) {
      const advertiserDomains = resItem.adomain && resItem.adomain.length ? resItem.adomain : [];
      resItem.meta = { ...resItem.meta, advertiserDomains };

      response.push(resItem);
    }
  }
  return response;
}

export function consentCheck(bidderRequest, req) {
  if (bidderRequest) {
    if (bidderRequest.uspConsent) {
      req.ccpa = bidderRequest.uspConsent;
    }
    if (bidderRequest.gdprConsent) {
      req.gdpr = bidderRequest.gdprConsent
    }
    if (bidderRequest.gppConsent) {
      req.gpp = bidderRequest.gppConsent;
    }
  }
}

export const buildUserSyncs = (syncOptions, serverResponses, gdprConsent, uspConsent, syncEndpoint) => {
  let syncType = syncOptions.iframeEnabled ? 'iframe' : 'image';
  const isCk2trk = syncEndpoint.includes('ck.2trk.info');

  // Base sync URL
  let syncUrl = isCk2trk ? syncEndpoint : `${syncEndpoint}/${syncType}?pbjs=1`;

  if (gdprConsent && gdprConsent.consentString) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      syncUrl += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    } else {
      syncUrl += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
    }
  } else {
    syncUrl += isCk2trk ? `&gdpr=0&gdpr_consent=` : '';
  }

  if (isCk2trk) {
    syncUrl += uspConsent ? `&us_privacy=${uspConsent}` : `&us_privacy=`;
    syncUrl += (syncOptions.iframeEnabled) ? `&t=4` : `&t=2`
  } else {
    if (uspConsent && uspConsent.consentString) {
      syncUrl += `&ccpa_consent=${uspConsent.consentString}`;
    }
    const coppa = config.getConfig('coppa') ? 1 : 0;
    syncUrl += `&coppa=${coppa}`;
  }

  return [{
    type: syncType,
    url: syncUrl
  }];
}

export function bidWinReport (bid) {
  const cpm = deepAccess(bid, 'adserverTargeting.hb_pb') || '';
  if (isStr(bid.nurl) && bid.nurl !== '') {
    bid.nurl = bid.nurl.replace(/\${AUCTION_PRICE}/, cpm);
    triggerPixel(bid.nurl);
  }
}
