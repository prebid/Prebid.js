import {
  deepSetValue,
  generateUUID,
  logError
} from '../../src/utils.js';

// Declare native assets
const NATIVE_ASSETS = [
  { id: 1, required: 1, title: { len: 100 } }, // Title
  { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } }, // Main image
  { id: 3, required: 0, data: { type: 1, len: 140 } }, // Body
  { id: 4, required: 1, data: { type: 2 } }, // Sponsored by
  { id: 5, required: 1, icon: { w: 50, h: 50 } }, // Icon
  { id: 6, required: 1, data: { type: 12, len: 15 } } // Call to action
];
// Function to get Request
export const getBannerRequest = (bidRequests, bidderRequest, ENDPOINT) => {
  const request = [];
  // Loop for each bid request
  bidRequests.forEach(bidReq => {
    const guid = generateUUID();
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
    req.MediaType = getMediaType(bidReq);
    // Adding eids if passed
    if (bidReq.userIdAsEids) {
      req.user.ext.eids = bidReq.userIdAsEids;
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
  return formatResponse(bidResponse, mediaType);
}
// Function to get NATIVE Response
export const getNativeResponse = (bidResponse, bidRequest, mediaType) => {
  const assets = JSON.parse(JSON.parse(bidRequest.data)[0].imp[0].native.request).assets;
  return formatResponse(bidResponse, mediaType, assets);
}
// Function to format response
const formatResponse = (bidResponse, mediaType, assets) => {
  const responseArray = [];
  if (bidResponse) {
    try {
      const bidResp = bidResponse?.body?.seatbid ?? [];
      if (bidResp && bidResp[0] && bidResp[0].bid) {
        bidResp[0].bid.forEach(bidReq => {
          const response = {};
          response.requestId = bidReq.impid;
          response.cpm = bidReq.price;
          response.width = bidReq.w;
          response.height = bidReq.h;
          response.ad = bidReq.adm;
          response.meta = {
            advertiserDomains: bidReq.adomain,
            primaryCatId: bidReq.cat || [],
            attr: bidReq.attr || []
          };
          response.creativeId = bidReq.crid;
          response.netRevenue = false;
          response.currency = 'USD';
          response.ttl = 300;
          response.dealId = bidReq.dealId;
          response.mediaType = mediaType;
          if (mediaType === 'native') {
            const nativeResp = JSON.parse(bidReq.adm).native;
            const nativeData = {
              clickUrl: nativeResp.link.url,
              impressionTrackers: nativeResp.imptrackers
            };
            nativeResp.assets.forEach(asst => {
              const data = getNativeAssestData(asst, assets);
              nativeData[data.key] = data.value;
            });
            response.native = nativeData;
          }
          responseArray.push(response);
        });
      }
    } catch (e) {
      logError(e);
    }
  }
  return responseArray;
}
// Function to get imp based on Media Type
const getImpDetails = (bidReq) => {
  const imp = {};
  if (bidReq) {
    imp.id = bidReq.bidId;
    imp.bidfloor = getFloorPrice(bidReq);
    if (bidReq.mediaTypes.native) {
      const assets = { assets: NATIVE_ASSETS };
      imp.native = { request: JSON.stringify(assets) };
    } else if (bidReq.mediaTypes.banner) {
      imp.banner = getBannerDetails(bidReq);
    }
  }
  return imp;
}
// Function to get banner object
const getBannerDetails = (bidReq) => {
  const response = {};
  if (bidReq.mediaTypes.banner) {
    // Fetch width and height from MediaTypes object, if not provided in bidReq params
    if (bidReq.mediaTypes.banner.sizes && !bidReq.params.height && !bidReq.params.width) {
      const sizes = bidReq.mediaTypes.banner.sizes;
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
  const bidfloor = bidReq?.params?.bid_floor ?? 0;
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
  const user = {};
  if (bidReq && bidReq.ortb2 && bidReq.ortb2.user) {
    user.id = bidReq.ortb2.user.id ? bidReq.ortb2.user.id : '';
    user.buyeruid = bidReq.ortb2.user.buyeruid ? bidReq.ortb2.user.buyeruid : '';
    user.keywords = bidReq.ortb2.user.keywords ? bidReq.ortb2.user.keywords : '';
    user.customdata = bidReq.ortb2.user.customdata ? bidReq.ortb2.user.customdata : '';
    user.ext = bidReq.ortb2.user.ext ? bidReq.ortb2.user.ext : '';
  } else {
    user.id = '';
    user.buyeruid = '';
    user.keywords = '';
    user.customdata = '';
    user.ext = {};
  }
  return user;
}
// Function to get asset data for response
const getNativeAssestData = (params, assets) => {
  const response = {};
  if (params.title) {
    response.key = 'title';
    response.value = params.title.text;
  }
  if (params.data) {
    response.key = getAssetData(params.id, assets);
    response.value = params.data.value;
  }
  if (params.img) {
    response.key = getAssetImageDataType(params.id, assets);
    response.value = {
      url: params.img.url,
      height: params.img.h,
      width: params.img.w
    }
  }
  return response;
}
// Function to get asset data types based on id
const getAssetData = (paramId, asset) => {
  let resp = '';
  for (let i = 0; i < asset.length; i++) {
    if (asset[i].id === paramId) {
      switch (asset[i].data.type) {
        case 1 : resp = 'sponsored';
          break;
        case 2 : resp = 'desc';
          break;
        case 12 : resp = 'cta';
          break;
      }
    }
  }
  return resp;
}
// Function to get image type based on the id
const getAssetImageDataType = (paramId, asset) => {
  let resp = '';
  for (let i = 0; i < asset.length; i++) {
    if (asset[i].id === paramId) {
      switch (asset[i].img.type) {
        case 1 : resp = 'icon';
          break;
        case 3 : resp = 'image';
          break;
      }
    }
  }
  return resp;
}
// Function to get Media Type
const getMediaType = (bidReq) => {
  if (bidReq.mediaTypes.native) {
    return 'native';
  } else if (bidReq.mediaTypes.banner) {
    return 'banner';
  }
}
