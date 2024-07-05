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
import {
  getStorageManager
} from '../src/storageManager.js';

const BIDDER_CODE = 'relevatehealth';
const ENDPOINT_URL = 'https://rtb.relevate.health/prebid/relevate';
const storage = getStorageManager({ bidderCode: BIDDER_CODE });
const LOCAL_STORAGE_KEY = 'adx_profile_guid';

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
  let banner = {};
  if (deepAccess(bid, 'mediaTypes.banner') && deepAccess(bid, 'mediaTypes.banner.sizes') && !(bid.params.height && bid.params.width)) {
    // Fetch width and height from MediaTypes object, if not provided in bid params
    let bannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');
    if (isArray(bannerSizes) && bannerSizes.length > 0) {
      banner.h = bannerSizes[0][1];
      banner.w = bannerSizes[0][0];
    }
  } else {
    banner.h = bid.params.height;
    banner.w = bid.params.width;
  }
  return banner;
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
  let response = {};
  response.requestId = bid && bid.impid ? bid.impid : undefined;
  response.cpm = bid && bid.price ? bid.price : 0.0;
  response.width = bid && bid.w ? bid.w : 0;
  response.height = bid && bid.h ? bid.h : 0;
  response.ad = bid && bid.adm ? bid.adm : '';
  response.meta = {
    advertiserDomains: bid && bid.adomain ? bid.adomain : []
  };
  response.creativeId = bid && bid.crid ? bid.crid : undefined;
  response.netRevenue = false;
  response.currency = bid && bid.cur ? bid.cur : 'USD';
  response.ttl = 300;
  response.dealId = bid && bid.dealId ? bid.dealId : undefined;
  return response;
}
// Function to get the data from storage
function getStorageValue(key) {
  let storageValue = '';
  if (storage.localStorageIsEnabled()) {
    storageValue = storage.getDataFromLocalStorage(key);
  }
  return storageValue;
}
// Function to build the user object
function buildUser(bid) {
  let user = {};
  if (bid && bid.params) {
    user.id = bid.params.user_id && typeof bid.params.user_id == 'string' ? bid.params.user_id : '';
    user.buyeruid = getStorageValue(LOCAL_STORAGE_KEY) ? getStorageValue(LOCAL_STORAGE_KEY) : '';
    user.keywords = bid.params.keywords && typeof bid.params.keywords == 'string' ? bid.params.keywords : '';
    user.customdata = bid.params.customdata && typeof bid.params.customdata == 'string' ? bid.params.customdata : '';
  }
  return user;
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
