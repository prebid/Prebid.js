import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  BANNER
} from '../src/mediaTypes.js';
import {
  deepAccess,
  generateUUID,
  isArray,
  logError
} from '../src/utils.js';
const BIDDER_CODE = 'relevatehealth';
const ENDPOINT_URL = 'https://rtb.relevate.health/prebid/relevate';

function buildRequests(bidRequests, bidderRequest) {
  const requests = [];
  // Loop through each bid request
  bidRequests.forEach(bid => {
    // Construct the bid request object
    const request = {
      id: generateUUID(),
      placementId: bid.params.placement_id,
      imp: [{
        id: bid.bidId,
        banner: getBanner(bid),
        bidfloor: getFloor(bid)
      }],
      site: getSite(bidderRequest),
      user: buildUser(bid)
    };
    // Get uspConsent from bidderRequest
    if (bidderRequest && bidderRequest.uspConsent) {
      request.us_privacy = bidderRequest.uspConsent;
    }
    // Get GPP Consent from bidderRequest
    if (bidderRequest?.gppConsent?.gppString) {
      request.gpp = bidderRequest.gppConsent.gppString;
      request.gpp_sid = bidderRequest.gppConsent.applicableSections;
    } else if (bidderRequest?.ortb2?.regs?.gpp) {
      request.gpp = bidderRequest.ortb2.regs.gpp;
      request.gpp_sid = bidderRequest.ortb2.regs.gpp_sid;
    }
    // Get coppa compliance from bidderRequest
    if (bidderRequest?.ortb2?.regs?.coppa) {
      request.coppa = 1;
    }
    // Push the constructed bid request to the requests array
    requests.push(request);
  });
  // Return the array of bid requests
  return {
    method: 'POST',
    url: ENDPOINT_URL,
    data: JSON.stringify(requests),
    options: {
      contentType: 'application/json',
    }
  };
}
// Format the response as per the standards
function interpretResponse(bidResponse, bidRequest) {
  let resp = [];
  if (bidResponse && bidResponse.body) {
    try {
      let bids = bidResponse.body.seatbid && bidResponse.body.seatbid[0] ? bidResponse.body.seatbid[0].bid : [];
      if (bids) {
        bids.forEach(bidObj => {
          let newBid = formatResponse(bidObj);
          newBid.mediaType = BANNER;
          resp.push(newBid);
        });
      }
    } catch (err) {
      logError(err);
    }
  }
  return resp;
}
// Function to check if Bid is valid
function isBidRequestValid(bid) {
  return !!(bid.params.placement_id && bid.params.user_id);
}
// Function to get banner details
function getBanner(bid) {
  if (deepAccess(bid, 'mediaTypes.banner')) {
    // Fetch width and height from MediaTypes object, if not provided in bid params
    if (deepAccess(bid, 'mediaTypes.banner.sizes') && !bid.params.height && !bid.params.width) {
      let sizes = deepAccess(bid, 'mediaTypes.banner.sizes');
      if (isArray(sizes) && sizes.length > 0) {
        return {
          h: sizes[0][1],
          w: sizes[0][0]
        };
      }
    } else {
      return {
        h: bid.params.height,
        w: bid.params.width
      };
    }
  }
}
// Function to get bid_floor
function getFloor(bid) {
  if (bid.params && bid.params.bid_floor) {
    return bid.params.bid_floor;
  } else {
    return 0;
  }
}
// Function to get site details
function getSite(bidderRequest) {
  let site = {};
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
    site.name = bidderRequest.refererInfo.domain;
  } else {
    site.name = '';
  }
  return site;
}
// Function to format response
function formatResponse(bid) {
  return {
    requestId: bid && bid.impid ? bid.impid : undefined,
    cpm: bid && bid.price ? bid.price : 0.0,
    width: bid && bid.w ? bid.w : 0,
    height: bid && bid.h ? bid.h : 0,
    ad: bid && bid.adm ? bid.adm : '',
    meta: {
      advertiserDomains: bid && bid.adomain ? bid.adomain : []
    },
    creativeId: bid && bid.crid ? bid.crid : undefined,
    netRevenue: false,
    currency: bid && bid.cur ? bid.cur : 'USD',
    ttl: 300,
    dealId: bid && bid.dealId ? bid.dealId : undefined
  };
}
// Function to build the user object
function buildUser(bid) {
  if (bid && bid.params) {
    return {
      id: bid.params.user_id && typeof bid.params.user_id == 'string' ? bid.params.user_id : '',
      buyeruid: localStorage.getItem('adx_profile_guid') ? localStorage.getItem('adx_profile_guid') : '',
      keywords: bid.params.keywords && typeof bid.params.keywords == 'string' ? bid.params.keywords : '',
      customdata: bid.params.customdata && typeof bid.params.customdata == 'string' ? bid.params.customdata : ''
    };
  }
}
// Export const spec
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: BANNER,
  isBidRequestValid,
  buildRequests,
  interpretResponse
}

registerBidder(spec);
