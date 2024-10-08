import {
  deepAccess,
  deepSetValue,
  generateUUID,
  logError
} from '../../src/utils.js';

// Function to get Request
export const getBannerRequest = (bidRequests, bidderRequest, ENDPOINT) => {
  let request = [];
  // Loop for each bid request
  bidRequests.forEach(bidReq => {
    let guid = generateUUID();
    const req = {
      id: guid,
      imp: [getImpDetails(bidReq)],
      placementId: bidReq.params.placement_id,
      site: getSiteDetails(bidderRequest),
      user: getUserDetails(bidReq)
    };
    // Fetch GPP Consent from bidderRequest
    if (bidderRequest && bidderRequest.gppConsent && bidderRequest.gppConsent.gppString) {
      deepSetValue(req, 'regs.gpp', bidderRequest.gppConsent.gppString);
      deepSetValue(req, 'regs.gpp_sid', bidderRequest.gppConsent.applicableSections);
    } else if (bidderRequest && bidderRequest.ortb2 && bidderRequest.ortb2.regs && bidderRequest.ortb2.regs.gpp) {
      deepSetValue(req, 'regs.gpp', bidderRequest.ortb2.regs.gpp);
      deepSetValue(req, 'regs.gpp_sid', bidderRequest.ortb2.regs.gpp_sid);
    }
    // Fetch coppa compliance from bidderRequest
    if (bidderRequest && bidderRequest.ortb2 && bidderRequest.ortb2.regs && bidderRequest.ortb2.regs.coppa) {
      deepSetValue(req, 'regs.coppa', 1);
    }
    // Fetch uspConsent from bidderRequest
    if (bidderRequest?.uspConsent) {
      deepSetValue(req, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }
    request.push(req);
  });
  // Return the array of request
  return {
    method: 'POST',
    url: ENDPOINT,
    data: JSON.stringify(request),
    options: {
      contentType: 'application/json',
    }
  };
}
// Function to get Response
export const getBannerResponse = (bidResponse, mediaType) => {
  let responseArray = [];
  if (bidResponse) {
    try {
      let bidResp = deepAccess(bidResponse, 'body.seatbid', []);
      if (bidResp && bidResp[0] && bidResp[0].bid) {
        bidResp[0].bid.forEach(bidReq => {
          let response = {};
          response.requestId = bidReq.impid;
          response.cpm = bidReq.price;
          response.width = bidReq.w;
          response.height = bidReq.h;
          response.ad = bidReq.adm;
          response.meta = {
            advertiserDomains: bidReq.adomain
          };
          response.creativeId = bidReq.crid;
          response.netRevenue = false;
          response.currency = 'USD';
          response.ttl = 300;
          response.dealId = bidReq.dealId;
          response.mediaType = mediaType;
          responseArray.push(response);
        });
      }
    } catch (e) {
      logError(e);
    }
  }
  return responseArray;
}
// Function to get imp
const getImpDetails = (bidReq) => {
  let imp = {};
  if (bidReq) {
    imp.id = bidReq.bidId;
    imp.bidfloor = getFloorPrice(bidReq);
    imp.banner = getBannerDetails(bidReq);
  }
  return imp;
}
// Function to get banner object
const getBannerDetails = (bidReq) => {
  let response = {};
  if (bidReq.mediaTypes.banner) {
    // Fetch width and height from MediaTypes object, if not provided in bidReq params
    if (bidReq.mediaTypes.banner.sizes && !bidReq.params.height && !bidReq.params.width) {
      let sizes = bidReq.mediaTypes.banner.sizes;
      if (sizes.length > 0) {
        response.h = sizes[0][1];
        response.w = sizes[0][0];
      }
    } else {
      response.h = bidReq.params.height;
      response.w = bidReq.params.width;
    }
  }
  return response;
}
// Function to get floor price
const getFloorPrice = (bidReq) => {
  let bidfloor = deepAccess(bidReq, 'params.bid_floor', 0);
  return bidfloor;
}
// Function to get site object
const getSiteDetails = (bidderRequest) => {
  let page = '';
  let name = '';
  if (bidderRequest && bidderRequest.refererInfo) {
    page = bidderRequest.refererInfo.page;
    name = bidderRequest.refererInfo.domain;
  }
  return {page: page, name: name};
}
// Function to build the user object
const getUserDetails = (bidReq) => {
  let user = {};
  if (bidReq && bidReq.ortb2 && bidReq.ortb2.user) {
    user.id = bidReq.ortb2.user.id ? bidReq.ortb2.user.id : '';
    user.buyeruid = bidReq.ortb2.user.buyeruid ? bidReq.ortb2.user.buyeruid : '';
    user.keywords = bidReq.ortb2.user.keywords ? bidReq.ortb2.user.keywords : '';
    user.customdata = bidReq.ortb2.user.customdata ? bidReq.ortb2.user.customdata : '';
  } else {
    user.id = '';
    user.buyeruid = '';
    user.keywords = '';
    user.customdata = '';
  }
  return user;
}
