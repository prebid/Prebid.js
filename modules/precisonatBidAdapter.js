import {deepAccess, logInfo} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {convertOrtbRequestToProprietaryNative} from '../src/native.js';
import { NATIVE } from '../src/mediaTypes.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { buildUserSyncs, consentCheck } from '../libraries/precisoUtils/bidUtilsCommon.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'precisonat';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: BIDDER_CODE });
const SUPPORTED_MEDIA_TYPES = [NATIVE];
const GVLID = 874;
let precisonatId = 'NA';
let sharedId = 'NA';
const endpoint = 'https://ssp-bidder.mndtrk.com/bid_request/openrtb';
let syncEndpoint = 'https://ck.2trk.info/rtb/user/usersync.aspx?';

async function getapi(url) {
  try {
    // Storing response
    const response = await fetch(url);

    // Storing data in form of JSON
    var data = await response.json();

    const dataMap = new Map(Object.entries(data));
    const uuidValue = dataMap.get('UUID');

    if (!Object.is(uuidValue, null) && !Object.is(uuidValue, undefined)) {
      storage.setDataInLocalStorage('_pre|id', uuidValue);
    }
    return data;
  } catch (error) {
    logInfo('Error in preciso precall' + error);
  }
}

const buildRequests = (endpoint) => (validBidRequests = [], bidderRequest) => {
  // convert Native ORTB definition to old-style prebid native definition
  validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
  var city = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let req = {
    // bidRequest: bidderRequest,
    id: validBidRequests[0].auctionId,
    cur: validBidRequests[0].params.currency || ['USD'],
    imp: validBidRequests.map(slot => mapImpression(slot, bidderRequest)),
    //   imp: validBidRequests.map(req => {
    //     const { bidId, sizes } = req
    //     const impValue = {
    //       id: bidId,
    //       bidfloor: req.params.bidFloor,
    //       bidfloorcur: req.params.currency
    //     }
    //     if (req.mediaTypes.banner) {
    //       impValue.banner = {
    //         format: (req.mediaTypes.banner.sizes || sizes).map(size => {
    //           return { w: size[0], h: size[1] }
    //         }),

    //       }
    //     }
    //     return impValue
    //   }),
    user: {
      id: validBidRequests[0].userId.pubcid || '',
      buyeruid: validBidRequests[0].buyerUid || '',
      geo: {
        country: validBidRequests[0].params.region || city,
        region: validBidRequests[0].params.region || city
      },

    },
    device: validBidRequests[0].ortb2.device,
    site: validBidRequests[0].ortb2.site,
    source: validBidRequests[0].ortb2.source,
    bcat: validBidRequests[0].ortb2.bcat || validBidRequests[0].params.bcat,
    badv: validBidRequests[0].ortb2.badv || validBidRequests[0].params.badv,
    wlang: validBidRequests[0].ortb2.wlang || validBidRequests[0].params.wlang,
  };
  if (req.device && req.device != 'undefined') {
    req.device.geo = {
      country: req.user.geo.country,
      region: req.user.geo.region
    };
  };
  req.site.publisher = {
    publisherId: validBidRequests[0].params.publisherId
  };

  //  req.language.indexOf('-') != -1 && (req.language = req.language.split('-')[0])
  consentCheck(bidderRequest, req);
  return {
    method: 'POST',
    url: endpoint,
    data: req,

  };
}

// Codes defined by OpenRTB Native Ads 1.1 specification
export const OPENRTB = {
  NATIVE: {
    IMAGE_TYPE: {
      ICON: 1,
      MAIN: 3,
    },
    ASSET_ID: {
      TITLE: 1,
      IMAGE: 3,
      ICON: 2,
      DATA: 4,
      SPONSORED: 5,
      CTA: 6
    },
    DATA_ASSET_TYPE: {
      SPONSORED: 1,
      DESC: 2,
      CTA_TEXT: 12,
    },
  }
};

function mapImpression(slot, bidderRequest) {
  const imp = {
    id: slot.bidId,
    // banner: mapBanner(slot),
    native: mapNative(slot),
    tagid: slot.adUnitCode.toString(),
    bidfloor: slot.params.bidFloor,
    bidfloorcur: slot.params.currency
  };

  // const bidfloor = applyFloor(slot);
  // if (bidfloor) {
  //   imp.bidfloor = bidfloor;
  // }

  if (bidderRequest.paapi?.enabled) {
    imp.ext = imp.ext || {};
    imp.ext.ae = slot?.ortb2Imp?.ext?.ae
  } else {
    if (imp.ext?.ae) {
      delete imp.ext.ae;
    }
  }

  const tid = deepAccess(slot, 'ortb2Imp.ext.tid');
  if (tid) {
    imp.ext = imp.ext || {};
    imp.ext.tid = tid;
  }

  return imp;
}

function mapNative(slot) {
  if (slot.mediaType === 'native' || deepAccess(slot, 'mediaTypes.native')) {
    let request = {
      // assets: mapNativeAssets(slot)
      assets: slot.nativeOrtbRequest.assets,
      ver: '1.2'
    };
    return {
      request: JSON.stringify(request)
    }
  }
}

// function mapNativeAssets(slot) {
//   const params = slot.nativeParams || deepAccess(slot, 'mediaTypes.native');
//   logInfo('Native params in Bid Adapter preciso:: ' + JSON.stringify(params));
//   const assets = [];
//   if (params.title) {
//     assets.push({
//       id: OPENRTB.NATIVE.ASSET_ID.TITLE,
//       required: params.title.required ? 1 : 0,
//       title: {
//         len: params.title.len || 25
//       }
//     })
//   }
//   if (params.image) {
//     assets.push({
//       id: OPENRTB.NATIVE.ASSET_ID.IMAGE,
//       required: params.image.required ? 1 : 0,
//       img: mapNativeImage(params.image, OPENRTB.NATIVE.IMAGE_TYPE.MAIN)
//     })
//   }
//   if (params.icon) {
//     assets.push({
//       id: OPENRTB.NATIVE.ASSET_ID.ICON,
//       required: params.icon.required ? 1 : 0,
//       img: mapNativeImage(params.icon, OPENRTB.NATIVE.IMAGE_TYPE.ICON)
//     })
//   }
//   if (params.sponsoredBy) {
//     assets.push({
//       id: OPENRTB.NATIVE.ASSET_ID.SPONSORED,
//       required: params.sponsoredBy.required ? 1 : 0,
//       data: {
//         type: OPENRTB.NATIVE.DATA_ASSET_TYPE.SPONSORED,
//         len: params.sponsoredBy.len
//       }
//     })
//   }
//   if (params.body) {
//     assets.push({
//       id: OPENRTB.NATIVE.ASSET_ID.BODY,
//       required: params.body.request ? 1 : 0,
//       data: {
//         type: OPENRTB.NATIVE.DATA_ASSET_TYPE.DESC,
//         len: params.body.len
//       }
//     })
//   }
//   if (params.cta) {
//     assets.push({
//       id: OPENRTB.NATIVE.ASSET_ID.CTA,
//       required: params.cta.required ? 1 : 0,
//       data: {
//         type: OPENRTB.NATIVE.DATA_ASSET_TYPE.CTA_TEXT,
//         len: params.cta.len
//       }
//     })
//   }
//   return assets;
// }

// function mapNativeImage(image, type) {
//   const img = {type: type};
//   if (image.aspect_ratios) {
//     const ratio = image.aspect_ratios[0];
//     const minWidth = ratio.min_width || 100;
//     img.wmin = minWidth;
//     img.hmin = (minWidth / ratio.ratio_width * ratio.ratio_height);
//   }
//   if (image.sizes) {
//     const size = Array.isArray(image.sizes[0]) ? image.sizes[0] : image.sizes;
//     img.w = size[0];
//     img.h = size[1];
//   }
//   return img
// }

function interpretNativeBid(serverBid) {
  return {
    requestId: serverBid.impid,
    mediaType: NATIVE,
    cpm: serverBid.price,
    creativeId: serverBid.adid,
    width: 1,
    height: 1,
    ttl: 300,
    meta: {
      advertiserDomains: serverBid.adomain
    },
    netRevenue: true,
    currency: 'USD',
    native: interpretNativeAd(serverBid.adm),
  }
}

function interpretNativeAd(adm) {
  const native = JSON.parse(adm).native;
  const result = {
    clickUrl: encodeURI(native.link.url),
    impressionTrackers: encodeURI(native.eventtrackers[0].url),
    clickTrackers: encodeURI(native.link.clicktrackers)

  };
  native.assets.forEach(asset => {
    switch (asset.id) {
      case OPENRTB.NATIVE.ASSET_ID.TITLE:
        result.title = asset.title.text;
        break;
      case OPENRTB.NATIVE.ASSET_ID.IMAGE:
        result.image = {
          url: encodeURI(asset.img.url),
          width: asset.img.w || 300,
          height: asset.img.h || 250
        };
        break;
      case OPENRTB.NATIVE.ASSET_ID.ICON:
        result.icon = {
          url: encodeURI(asset.img.url),
          width: asset.img.w || 10,
          height: asset.img.h || 10
        };
        break;
      case OPENRTB.NATIVE.ASSET_ID.DATA:
        result.body = asset.data.value;
        break;
      case OPENRTB.NATIVE.ASSET_ID.SPONSORED:
        result.sponsoredBy = asset.data.value;
        break;
      case OPENRTB.NATIVE.ASSET_ID.CTA:
        result.cta = asset.data.value;
        break;
    }
  });
  return result;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: (bid) => {
    logInfo('TESTETSTETSTETSTETST')
    sharedId = storage.getDataFromLocalStorage('_sharedid') || storage.getCookie('_sharedid');
    let precisoBid = true;
    const preCall = 'https://ssp-usersync.mndtrk.com/getUUID?sharedId=' + sharedId;
    precisonatId = storage.getDataFromLocalStorage('_pre|id');
    if (Object.is(precisonatId, 'NA') || Object.is(precisonatId, null) || Object.is(precisonatId, undefined)) {
      if (!bid.precisoBid) {
        precisoBid = false;
        getapi(preCall);
      }
    }

    return Boolean(bid.bidId && bid.params && bid.params.publisherId && precisoBid);
  },
  buildRequests: buildRequests(endpoint),
  interpretResponse(serverResponse) {
    logInfo('preciso bidder interpretResponse starts');
    const responseBody = serverResponse.body;
    logInfo('preciso response body curenncy:' + responseBody.cur);
    // if (!isArray(responseBody)) {
    //   return [];
    // }
    logInfo('Preciso native Response');
    const bids = [];
    responseBody.seatbid.forEach(seat => {
      seat.bid.forEach(serverBid => {
        logInfo('Preciso bid price:' + serverBid.price);
        logInfo('Preciso bid adm :' + serverBid.adm);

        if (!serverBid.price) {
          return;
        }
        // if (serverBid.adm.indexOf('{') === 1) {
        let interpretedBid = interpretNativeBid(serverBid);
        bids.push(interpretedBid);
        // }
      })
    });
    logInfo('preciso returns bids::' + bids[0].toString);
    return bids;
  },
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    const isSpec = syncOptions.spec;
    if (!Object.is(isSpec, true)) {
      let syncId = storage.getCookie('_sharedid');
      syncEndpoint = syncEndpoint + 'id=' + syncId;
    } else {
      syncEndpoint = syncEndpoint + 'id=NA';
    }

    return buildUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, syncEndpoint);
  }
};

registerBidder(spec);
