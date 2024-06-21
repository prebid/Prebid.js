import {
  deepAccess,
  generateUUID,
  isArray,
  logError
} from '../src/utils.js';
import {
  BANNER
} from '../src/mediaTypes.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'audiencelogy';
const ENDPOINT_URL = 'https://rtb.audiencelogy.com/prebid';

// Export const spec
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: BANNER,
  // Determines whether or not the given bid request is valid
  isBidRequestValid: function (bid) {
    return !!(bid.params.placement_id && bid.params.user_id && bid.params.nid);
  },
  // Make a server request from the list of BidRequests
  buildRequests: function (bidRequests, bidderRequest) {
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
  },
  // Unpack the response from the server into a list of bids.
  interpretResponse: function (bidResponse, bidRequest) {
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
}
// Function to fetch bid_floor
const fetchFloor = (bid) => {
  if (bid.params && bid.params.bid_floor) {
    return bid.params.bid_floor;
  } else {
    return 0;
  }
}
// Function to fetch banner details
const fetchBanner = (bid) => {
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
const fetchSite = (bidderRequest) => {
  let site = {};
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
    site.name = bidderRequest.refererInfo.domain;
  } else {
    site.name = '';
  }
  return site;
}
// Function to create response
const buildResponse = (bid) => {
  let response = {};
  response.requestId = bid && bid.impid ? bid.impid : undefined;
  response.width = bid && bid.w ? bid.w : 0;
  response.height = bid && bid.h ? bid.h : 0;
  response.cpm = bid && bid.price ? bid.price : 0.0;
  response.ad = bid && bid.adm ? bid.adm : '';
  response.creativeId = bid && bid.crid ? bid.crid : undefined;
  response.meta = {
    advertiserDomains: bid && bid.adomain ? bid.adomain : []
  };
  response.netRevenue = false;
  response.currency = bid && bid.cur ? bid.cur : 'USD';
  response.dealId = bid && bid.dealId ? bid.dealId : undefined;
  response.ttl = 300;
  return response;
}
// Function to build the user object
const setUser = (bid) => {
  let user = {};
  if (bid && bid.params) {
    user.buyeruid = localStorage.getItem('adx_profile_guid') ? localStorage.getItem('adx_profile_guid') : '';
    user.id = bid.params.user_id && typeof bid.params.user_id == 'string' ? bid.params.user_id : '';
    user.keywords = bid.params.keywords && typeof bid.params.keywords == 'string' ? bid.params.keywords : '';
    user.customdata = bid.params.customdata && typeof bid.params.customdata == 'string' ? bid.params.customdata : '';
  }
  return user;
}
registerBidder(spec);
