import {
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
      let bidResp = bidResponse.body && bidResponse.body.seatbid && bidResponse.body.seatbid[0] ? bidResponse.body.seatbid[0].bid : [];
      if (bidResp) {
        bidResp.forEach(bidReq => {
          let response = {};
          response.requestId = bidReq.impid ? bidReq.impid : undefined;
          response.cpm = bidReq.price ? bidReq.price : 0.0;
          response.width = bidReq.w ? bidReq.w : 0;
          response.height = bidReq.h ? bidReq.h : 0;
          response.ad = bidReq.adm ? bidReq.adm : '';
          response.meta = {
            advertiserDomains: bidReq.adomain ? bidReq.adomain : []
          };
          response.creativeId = bidReq.crid ? bidReq.crid : undefined;
          response.netRevenue = false;
          response.currency = bidReq.cur ? bidReq.cur : 'USD';
          response.ttl = 300;
          response.dealId = bidReq.dealId ? bidReq.dealId : undefined;
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
  let bidfloor = bidReq.params && bidReq.params.bid_floor ? bidReq.params.bid_floor : 0
  return bidfloor;
}
// Function to get site object
const getSiteDetails = (bidderRequest) => {
  let page = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page ? bidderRequest.refererInfo.page : '';
  let name = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.domain ? bidderRequest.refererInfo.domain : '';
  return {page: page, name: name};
}
// Function to build the user object
const getUserDetails = (bidReq) => {
  let user = {};
  if (bidReq.params) {
    user.id = bidReq.params.user_id ? bidReq.params.user_id : '';
    user.buyeruid = bidReq.params.buyeruid ? bidReq.params.buyeruid : ''; ;
    user.keywords = bidReq.params.keywords ? bidReq.params.keywords : '';
    user.customdata = bidReq.params.customdata ? bidReq.params.customdata : '';
  }
  return user;
}
