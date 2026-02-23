import {
  _each,
  getBidIdParameter,
  getUniqueIdentifierStr,
  isArray,
  logError,
  logWarn
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {getMinSize} from '../libraries/sizeUtils/sizeUtils.js';
import {getAdMarkup, getBidFloor, getDeviceType, getViewability, isViewabilityMeasurable} from '../libraries/omsUtils/index.js';

const BIDDER_CODE = 'onomagic';
const URL = 'https://bidder.onomagic.com/hb';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

function buildRequests(bidReqs, bidderRequest) {
  try {
    let referrer = '';
    if (bidderRequest && bidderRequest.refererInfo) {
      referrer = bidderRequest.refererInfo.page;
    }
    const onomagicImps = [];
    const publisherId = getBidIdParameter('publisherId', bidReqs[0].params);
    _each(bidReqs, function (bid) {
      let bidSizes = (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) || bid.sizes;
      bidSizes = ((isArray(bidSizes) && isArray(bidSizes[0])) ? bidSizes : [bidSizes]);
      bidSizes = bidSizes.filter(size => isArray(size));
      const processedSizes = bidSizes.map(size => ({w: parseInt(size[0], 10), h: parseInt(size[1], 10)}));

      const element = document.getElementById(bid.adUnitCode);
      const minSize = getMinSize(processedSizes);
      const viewabilityAmount = isViewabilityMeasurable(element)
        ? getViewability(element, minSize)
        : 'na';
      const viewabilityAmountRounded = isNaN(viewabilityAmount) ? viewabilityAmount : Math.round(viewabilityAmount);

      const imp = {
        id: bid.bidId,
        banner: {
          format: processedSizes,
          ext: {
            viewability: viewabilityAmountRounded
          }
        },
        tagid: String(bid.adUnitCode)
      };
      const bidFloor = getBidFloor(bid);
      if (bidFloor) {
        imp.bidfloor = bidFloor;
      }
      onomagicImps.push(imp);
    });
    const onomagicBidReq = {
      id: getUniqueIdentifierStr(),
      imp: onomagicImps,
      site: {
        // TODO: does the fallback make sense here?
        domain: bidderRequest?.refererInfo?.domain || window.location.host,
        page: referrer,
        publisher: {
          id: publisherId
        }
      },
      device: {
        devicetype: getDeviceType(),
        w: screen.width,
        h: screen.height
      },
      tmax: bidderRequest?.timeout
    };

    return {
      method: 'POST',
      url: URL,
      data: JSON.stringify(onomagicBidReq),
      options: {contentType: 'text/plain', withCredentials: false}
    };
  } catch (e) {
    logError(e, {bidReqs, bidderRequest});
  }
}

function isBidRequestValid(bid) {
  if (typeof bid.params === 'undefined') {
    return false;
  }

  if (typeof bid.params.publisherId === 'undefined') {
    return false;
  }

  return true;
}

function interpretResponse(serverResponse) {
  if (!serverResponse.body || typeof serverResponse.body !== 'object') {
    logWarn('Onomagic server returned empty/non-json response: ' + JSON.stringify(serverResponse.body));
    return [];
  }
  const { body: {id, seatbid} } = serverResponse;
  try {
    const onomagicBidResponses = [];
    if (id &&
      seatbid &&
      seatbid.length > 0 &&
      seatbid[0].bid &&
      seatbid[0].bid.length > 0) {
      seatbid[0].bid.forEach(onomagicBid => {
        onomagicBidResponses.push({
          requestId: onomagicBid.impid,
          cpm: parseFloat(onomagicBid.price),
          width: parseInt(onomagicBid.w),
          height: parseInt(onomagicBid.h),
          creativeId: onomagicBid.crid || onomagicBid.id,
          currency: 'USD',
          netRevenue: true,
          mediaType: BANNER,
          ad: getAdMarkup(onomagicBid),
          ttl: 60,
          meta: {
            advertiserDomains: onomagicBid && onomagicBid.adomain ? onomagicBid.adomain : []
          }
        });
      });
    }
    return onomagicBidResponses;
  } catch (e) {
    logError(e, {id, seatbid});
  }
}

// Don't do user sync for now
function getUserSyncs(syncOptions, responses, gdprConsent) {
  return [];
}

registerBidder(spec);
