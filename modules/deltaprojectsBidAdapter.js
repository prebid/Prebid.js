import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import {
  _each,
  _map,
  createTrackPixelHtml,
  deepAccess,
  isFn,
  isNumber,
  logError,
  logWarn,
  setOnAny
} from '../src/utils.js';

export const BIDDER_CODE = 'deltaprojects';
const GVLID = 209;
export const BIDDER_ENDPOINT_URL = 'https://d5p.de17a.com/dogfight/prebid';
export const USERSYNC_URL = 'https://userservice.de17a.com/getuid/prebid';

/** -- isBidRequestValid -- */
function isBidRequestValid(bid) {
  if (!bid) return false;

  // publisher id is required
  const publisherId = deepAccess(bid, 'params.publisherId')
  if (!publisherId) {
    logError('Invalid bid request, missing publisher id in params');
    return false;
  }

  return true;
}

/** -- Build requests -- */
function buildRequests(validBidRequests, bidderRequest) {
  /** == shared == */
  // -- build id
  const id = bidderRequest.bidderRequestId;

  // -- build site
  const publisherId = setOnAny(validBidRequests, 'params.publisherId');
  const siteId = setOnAny(validBidRequests, 'params.siteId');
  const site = {
    id: siteId,
    domain: bidderRequest.refererInfo.domain,
    page: bidderRequest.refererInfo.page,
    ref: bidderRequest.refererInfo.ref,
    publisher: { id: publisherId },
  };

  // -- build device
  const ua = navigator.userAgent;
  const device = {
    ua,
    w: screen.width,
    h: screen.height
  }

  // -- build user, reg
  const user = { ext: {} };
  const regs = { ext: {} };
  const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
  if (gdprConsent) {
    user.ext = { consent: gdprConsent.consentString };
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0
    }
  }

  // -- build tmax
  const tmax = (bidderRequest && bidderRequest.timeout > 0) ? bidderRequest.timeout : undefined;

  // build bid specific
  return validBidRequests.map(validBidRequest => {
    const openRTBRequest = buildOpenRTBRequest(validBidRequest, bidderRequest, id, site, device, user, tmax, regs);
    return {
      method: 'POST',
      url: BIDDER_ENDPOINT_URL,
      data: openRTBRequest,
      options: { contentType: 'application/json' },
      bids: [validBidRequest],
    };
  });
}

function buildOpenRTBRequest(validBidRequest, bidderRequest, id, site, device, user, tmax, regs) {
  // build cur
  const currency = getCurrencyFromBidderRequest(bidderRequest) || deepAccess(validBidRequest, 'params.currency');
  const cur = currency && [currency];

  // build impression
  const impression = buildImpression(validBidRequest, currency);

  // build test
  const test = deepAccess(validBidRequest, 'params.test') ? 1 : 0

  const at = 1

  // build source
  const source = {
    tid: validBidRequest.auctionId,
    fd: 1,
  }

  return {
    id,
    at,
    imp: [impression],
    site,
    device,
    user,
    test,
    tmax,
    cur,
    source,
    regs,
    ext: {},
  };
}

function buildImpression(bid, currency) {
  const impression = {
    id: bid.bidId,
    tagid: bid.params.tagId,
    ext: {},
  };

  const bannerMediaType = deepAccess(bid, `mediaTypes.${BANNER}`);
  impression.banner = buildImpressionBanner(bid, bannerMediaType);

  // bid floor
  const bidFloor = getBidFloor(bid, BANNER, '*', currency);
  if (bidFloor) {
    impression.bidfloor = bidFloor.floor;
    impression.bidfloorcur = bidFloor.currency;
  }

  return impression;
}

function buildImpressionBanner(bid, bannerMediaType) {
  const bannerSizes = (bannerMediaType && bannerMediaType.sizes) || bid.sizes;
  return {
    format: _map(bannerSizes, ([width, height]) => ({ w: width, h: height })),
  };
}

/** -- Interpret response -- */
function interpretResponse(serverResponse) {
  if (!serverResponse.body) {
    logWarn('Response body is invalid, return !!');
    return [];
  }

  const { body: { id, seatbid, cur } } = serverResponse;
  if (!id || !seatbid) {
    logWarn('Id / seatbid of response is invalid, return !!');
    return [];
  }

  const bidResponses = [];

  _each(seatbid, seatbid => {
    _each(seatbid.bid, bid => {
      const bidObj = {
        requestId: bid.impid,
        cpm: parseFloat(bid.price),
        width: parseInt(bid.w),
        height: parseInt(bid.h),
        creativeId: bid.crid || bid.id,
        dealId: bid.dealid || null,
        currency: cur,
        netRevenue: true,
        ttl: 60,
      };

      bidObj.mediaType = BANNER;
      bidObj.ad = bid.adm;
      if (bid.nurl) {
        bidObj.ad += createTrackPixelHtml(decodeURIComponent(bid.nurl));
      }
      if (bid.ext) {
        bidObj[BIDDER_CODE] = bid.ext;
      }
      bidResponses.push(bidObj);
    });
  });
  return bidResponses;
}

/** -- On Bid Won -- */
function onBidWon(bid) {
  let cpm = bid.cpm;
  if (bid.currency && bid.currency !== bid.originalCurrency && typeof bid.getCpmInNewCurrency === 'function') {
    cpm = bid.getCpmInNewCurrency(bid.originalCurrency);
  }
  const wonPrice = Math.round(cpm * 1000000);
  const wonPriceMacroPatten = /\$\{AUCTION_PRICE:B64\}/g;
  bid.ad = bid.ad.replace(wonPriceMacroPatten, wonPrice);
}

/** -- Get user syncs -- */
function getUserSyncs(syncOptions, serverResponses, gdprConsent) {
  const syncs = []

  if (syncOptions.pixelEnabled) {
    let gdprParams;
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        gdprParams = `?gdpr_consent=${gdprConsent.consentString}`;
      }
    } else {
      gdprParams = '';
    }
    syncs.push({
      type: 'image',
      url: USERSYNC_URL + gdprParams
    });
  }
  return syncs;
}

/** -- Get bid floor -- */
export function getBidFloor(bid, mediaType, size, currency) {
  if (isFn(bid.getFloor)) {
    const bidFloorCurrency = currency || 'USD';
    const bidFloor = bid.getFloor({currency: bidFloorCurrency, mediaType: mediaType, size: size});
    if (isNumber(bidFloor?.floor)) {
      return bidFloor;
    }
  }
}

/** -- Register -- */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidWon,
  getUserSyncs,
};

registerBidder(spec);
