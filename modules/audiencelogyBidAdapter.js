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
const BIDDER_CODE = 'audiencelogy';
const ENDPOINT_URL = 'https://rtb.audiencelogy.com/prebid';

function buildRequests(bidRequests, bidderRequest) {
  const requests = [];
  let nid = 0;
  // Loop for each bid request
  bidRequests.forEach(bid => {
    // Create the bid request object
    const request = {
      id: generateUUID(),
      imp: [{
        id: bid.bidId,
        bidfloor: fetchFloor(bid),
        banner: fetchBanner(bid)
      }],
      placementId: bid.params.placement_id,
      site: fetchSite(bidderRequest),
      user: setUser(bid)
    };
    // Fetch GPP Consent from bidderRequest
    if (bidderRequest?.gppConsent?.gppString) {
      request.gpp = bidderRequest.gppConsent.gppString;
      request.gpp_sid = bidderRequest.gppConsent.applicableSections;
    } else if (bidderRequest?.ortb2?.regs?.gpp) {
      request.gpp = bidderRequest.ortb2.regs.gpp;
      request.gpp_sid = bidderRequest.ortb2.regs.gpp_sid;
    }
    // Fetch coppa compliance from bidderRequest
    if (bidderRequest?.ortb2?.regs?.coppa) {
      request.coppa = 1;
    }
    // Fetch uspConsent from bidderRequest
    if (bidderRequest && bidderRequest.uspConsent) {
      request.us_privacy = bidderRequest.uspConsent;
    }
    // Push the created bid request to the requests array
    requests.push(request);
    // Set nid value
    nid = bid.params.nid;
  });
  // Return the array of bid requests
  return {
    method: 'POST',
    url: `${ENDPOINT_URL}/${nid}`,
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
          let newBid = buildResponse(bidObj);
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
// Function for checking validity of Bid
function isBidRequestValid(bid) {
  return !!(bid.params.placement_id && bid.params.user_id && bid.params.nid);
}
// Function to fetch bid_floor
function fetchFloor(bid) {
  if (bid.params && bid.params.bid_floor) {
    return bid.params.bid_floor;
  } else {
    return 0;
  }
}
// Function to fetch banner details
function fetchBanner(bid) {
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
// Function to fetch site details
function fetchSite(bidderRequest) {
  let site = {};
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
    site.name = bidderRequest.refererInfo.domain;
  } else {
    site.name = '';
  }
  return site;
}
// Function to create response
function buildResponse(bid) {
  return {
    requestId: bid && bid.impid ? bid.impid : undefined,
    width: bid && bid.w ? bid.w : 0,
    height: bid && bid.h ? bid.h : 0,
    cpm: bid && bid.price ? bid.price : 0.0,
    ad: bid && bid.adm ? bid.adm : '',
    creativeId: bid && bid.crid ? bid.crid : undefined,
    meta: {
      advertiserDomains: bid && bid.adomain ? bid.adomain : []
    },
    netRevenue: false,
    currency: bid && bid.cur ? bid.cur : 'USD',
    dealId: bid && bid.dealId ? bid.dealId : undefined,
    ttl: 300
  };
}
// Function to build the user object
function setUser(bid) {
  if (bid && bid.params) {
    return {
      buyeruid: localStorage.getItem('adx_profile_guid') ? localStorage.getItem('adx_profile_guid') : '',
      id: bid.params.user_id && typeof bid.params.user_id == 'string' ? bid.params.user_id : '',
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
