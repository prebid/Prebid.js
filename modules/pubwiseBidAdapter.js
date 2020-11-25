import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
const VERSION = '0.0.1';
const UNDEFINED = undefined;
const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const BIDDER_CODE = 'pubwise';
const ENDPOINT_URL = 'https://bid.pubwise.io/prebid';
// const USERSYNC_URL = '//127.0.0.1:8080/usersync'

const NATIVE_ASSETS_LIST = {
  'TITLE': { ID: 1, KEY: 'title', TYPE: 0 },
  'IMAGE': { ID: 2, KEY: 'image', TYPE: 0 },
  'ICON': { ID: 3, KEY: 'icon', TYPE: 0 },
  'SPONSOREDBY': { ID: 4, KEY: 'sponsoredBy', TYPE: 1 },
  'BODY': { ID: 5, KEY: 'body', TYPE: 2 },
  'CLICKURL': { ID: 6, KEY: 'clickUrl', TYPE: 0 },
  'VIDEO': { ID: 7, KEY: 'video', TYPE: 0 },
  'EXT': { ID: 8, KEY: 'ext', TYPE: 0 },
  'DATA': { ID: 9, KEY: 'data', TYPE: 0 },
  'LOGO': { ID: 10, KEY: 'logo', TYPE: 0 },
  'SPONSORED': { ID: 11, KEY: 'sponsored', TYPE: 1 },
  'DESC': { ID: 12, KEY: 'data', TYPE: 2 },
  'RATING': { ID: 13, KEY: 'rating', TYPE: 3 },
  'LIKES': { ID: 14, KEY: 'likes', TYPE: 4 },
  'DOWNLOADS': { ID: 15, KEY: 'downloads', TYPE: 5 },
  'PRICE': { ID: 16, KEY: 'price', TYPE: 6 },
  'SALEPRICE': { ID: 17, KEY: 'saleprice', TYPE: 7 },
  'PHONE': { ID: 18, KEY: 'phone', TYPE: 8 },
  'ADDRESS': { ID: 19, KEY: 'address', TYPE: 9 },
  'DESC2': { ID: 20, KEY: 'desc2', TYPE: 10 },
  'DISPLAYURL': { ID: 21, KEY: 'displayurl', TYPE: 11 },
  'CTA': { ID: 22, KEY: 'cta', TYPE: 12 }
};

const NATIVE_ASSET_IMAGE_TYPE_LIST = {
  'ICON': 1,
  'LOGO': 2,
  'IMAGE': 3
}

// to render any native unit we have to have a few items
const NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS = [
  {
    id: NATIVE_ASSETS_LIST.SPONSOREDBY.ID,
    required: true,
    data: {
      type: 1
    }
  },
  {
    id: NATIVE_ASSETS_LIST.TITLE.ID,
    required: true,
  },
  {
    id: NATIVE_ASSETS_LIST.IMAGE.ID,
    required: true,
  }
]

let globInvalidNativeRequest = false
let NATIVE_ASSET_ID_TO_KEY_MAP = {};
let NATIVE_ASSET_KEY_TO_ASSET_MAP = {};

// together allows traversal of NATIVE_ASSETS_LIST in any direction
// id -> key
utils._each(NATIVE_ASSETS_LIST, anAsset => { NATIVE_ASSET_ID_TO_KEY_MAP[anAsset.ID] = anAsset.KEY });
// key -> asset
utils._each(NATIVE_ASSETS_LIST, anAsset => { NATIVE_ASSET_KEY_TO_ASSET_MAP[anAsset.KEY] = anAsset });

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (bid.params && bid.params) {
      if (!utils.isStr(bid.params.siteId)) {
        utils.logWarn('siteId is required for bid', bid);
        return false;
      }
    }

    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    var bid;

    var refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    var conf = _initConf(refererInfo);
    var payload = _createBidTemplate(conf);

    validBidRequests.forEach(pbBid => {
      utils.logInfo('pbBid', pbBid)
      bid = utils.deepClone(pbBid);

      bid.sizes = _transformSizes(bid.sizes);

      _parseAdSlotParams(bid);

      payload.site.publisher.id = bid.params.siteId.trim();

      utils.logWarn('Bid Payload', payload)

      var impObj = _createImpTemplate(bid, conf);
      if (impObj) {
        payload.imp.push(impObj);
      } else {
        utils.logWarn('Bid impObj Invalid', bid)
      }
    });

    let options = {contentType: 'application/json'};

    if (!_hasPurpose1Consent(bidderRequest)) {
      options.withCredentials = false
    }

    utils.logInfo('PubWise Request Options', options);
    utils.logInfo('PubWise Request Payload', payload);

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(payload),
      options,
      bidderRequest: bidderRequest
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequests) {
    const serverResponseBody = serverResponse.body;
    const bidResponses = [];

    utils.logInfo('PubWise Server Response Body', serverResponseBody);
    utils.logInfo('PubWise Server Response BidRequest', bidRequests);

    if (!serverResponseBody.Banner && serverResponseBody.Native) {
      return [];
    }

    serverResponseBody.Banner.forEach(serverBid => {
      utils.logInfo('Banner Bid', serverBid);
      const bidResponse = {
        requestId: serverBid.RequestID,
        cpm: serverBid.CPM,
        width: serverBid.Width,
        height: serverBid.Height,
        creativeId: serverBid.CreativeID,
        dealId: serverBid.DealID,
        currency: serverBid.Currency,
        netRevenue: serverBid.NetRevenue,
        ttl: serverBid.TTL,
        referrer: '',
        ad: serverBid.Ad
      };
      bidResponses.push(bidResponse);
    });

    serverResponseBody.Native.forEach(serverBid => {
      utils.logInfo('Native Bid', serverBid);
      const bidResponse = {
        requestId: serverBid.RequestID,
        cpm: serverBid.CPM,
        width: serverBid.Width,
        height: serverBid.Height,
        creativeId: serverBid.CreativeID,
        dealId: serverBid.DealID,
        currency: serverBid.Currency,
        netRevenue: serverBid.NetRevenue,
        ttl: serverBid.TTL,
        referrer: ''
      };
      bidResponse[NATIVE] = {
        title: serverBid['Native'].Title,
        body: serverBid['Native'].Body,
        cta: '',
        sponsoredBy: serverBid['Native'].Body,
        image: {
          url: serverBid['Native'].Image.URL,
          height: serverBid['Native'].Image.Height,
          width: serverBid['Native'].Image.Width,
        },
        icon: {
          url: serverBid['Native'].Icon.URL,
          height: serverBid['Native'].Icon.Height,
          width: serverBid['Native'].Icon.Width,
        },
        clickUrl: '',
        impressionTrackers: '',
      }
      if (serverBid['Native'].ClickUrl) {
        bidResponse[NATIVE].clickUrl = serverBid['Native'].ClickUrl;
      }
      if (serverBid['Native'].impressionTrackers) {
        bidResponse[NATIVE].impressionTrackers = serverBid['Native'].impressionTrackers;
      }
      if (serverBid['Native'].CTA) {
        bidResponse[NATIVE].cta = serverBid['Native'].CTA;
      }
      bidResponses.push(bidResponse);
    });

    utils.logInfo('PubWise Active Bid Responses', bidResponses);
    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []

    return syncs;
  }
}

function _parseAdSlotParams(bid) {
  bid.params.adUnit = '';
  bid.params.adUnitIndex = '0';
  bid.params.width = 0;
  bid.params.height = 0;
  bid.params.adSlot = _cleanSlotName(bid.params.adSlot);

  var slot = bid.params.adSlot;
  var splits = slot.split(':');

  slot = splits[0];
  if (splits.length == 2) {
    bid.params.adUnitIndex = splits[1];
  }
  // check if size is mentioned in sizes array. in that case do not check for @ in adslot
  splits = slot.split('@');
  bid.params.adUnit = splits[0];
  if (splits.length > 1) {
    // i.e size is specified in adslot, so consider that and ignore sizes array
    splits = splits[1].split('x');
    if (splits.length != 2) {
      utils.logWarn('AdSlot Error: adSlot not in required format');
      return;
    }
    bid.params.width = parseInt(splits[0], 10);
    bid.params.height = parseInt(splits[1], 10);
  } else if (bid.hasOwnProperty('mediaTypes') &&
         bid.mediaTypes.hasOwnProperty(BANNER) &&
          bid.mediaTypes.banner.hasOwnProperty('sizes')) {
    var i = 0;
    var sizeArray = [];
    for (;i < bid.mediaTypes.banner.sizes.length; i++) {
      if (bid.mediaTypes.banner.sizes[i].length === 2) { // sizes[i].length will not be 2 in case where size is set as fluid, we want to skip that entry
        sizeArray.push(bid.mediaTypes.banner.sizes[i]);
      }
    }
    bid.mediaTypes.banner.sizes = sizeArray;
    if (bid.mediaTypes.banner.sizes.length >= 1) {
      // set the first size in sizes array in bid.params.width and bid.params.height. These will be sent as primary size.
      // The rest of the sizes will be sent in format array.
      bid.params.width = bid.mediaTypes.banner.sizes[0][0];
      bid.params.height = bid.mediaTypes.banner.sizes[0][1];
      bid.mediaTypes.banner.sizes = bid.mediaTypes.banner.sizes.splice(1, bid.mediaTypes.banner.sizes.length - 1);
    }
  }
}

function _cleanSlotName(slotName) {
  if (utils.isStr(slotName)) {
    return slotName.replace(/^\s+/g, '').replace(/\s+$/g, '');
  }
  return '';
}

function _initConf(refererInfo) {
  return {
    pageURL: (refererInfo && refererInfo.referer) ? refererInfo.referer : window.location.href,
    refURL: window.document.referrer
  };
}

function _createBidTemplate(conf) {
  return {
    id: '' + new Date().getTime(),
    at: AUCTION_TYPE,
    cur: [DEFAULT_CURRENCY],
    imp: [],
    site: {
      page: conf.pageURL,
      ref: conf.refURL,
      publisher: {}
    },
    device: {
      ua: navigator.userAgent,
      js: 1,
      dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
      h: screen.height,
      w: screen.width,
      language: navigator.language
    },
    user: {},
    test: 0,
    ext: {'version': VERSION}
  };
}

function _createImpTemplate(bid, conf) {
  var impObj = {};
  var bannerObj;
  var nativeObj = {};
  var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : [];
  var mediaTypes = '';
  var format = [];

  utils.logInfo('the burrent params', bid.params)

  impObj = {
    id: bid.bidId,
    tagid: bid.params.adUnit || bid.adUnitCode,
    bidfloor: _cleanParam('bidfloor', bid.params.bidfloor),
    secure: 1,
    bidfloorcur: bid.params.currency ? _cleanParam('currency', bid.params.currency) : DEFAULT_CURRENCY
  };

  if (bid.hasOwnProperty('mediaTypes')) {
    for (mediaTypes in bid.mediaTypes) {
      switch (mediaTypes) {
        case BANNER:
          bannerObj = _createBannerImp(bid);
          if (bannerObj !== UNDEFINED) {
            impObj.banner = bannerObj;
          }
          break;
        case NATIVE:
          nativeObj['request'] = JSON.stringify(_createNativeImp(bid.nativeParams));
          if (!globInvalidNativeRequest) {
            impObj.native = nativeObj;
          } else {
            utils.logWarn('Error: Error in Native adunit ' + bid.params.adUnit + '. Ignoring the adunit.');
          }
          break;
      }
    }
  } else {
    // mediaTypes is not present, so this is a banner only impression
    // this part of code is required for older testcases with no 'mediaTypes' to run succesfully.
    bannerObj = {
      pos: 0,
      w: bid.params.width,
      h: bid.params.height,
      topframe: utils.inIframe() ? 0 : 1
    };
    if (utils.isArray(sizes) && sizes.length > 1) {
      sizes = sizes.splice(1, sizes.length - 1);
      sizes.forEach(size => {
        format.push({
          w: size[0],
          h: size[1]
        });
      });
      bannerObj.format = format;
    }
    impObj.banner = bannerObj;
  }

  _addFloorFromFloorModule(impObj, bid);

  return impObj.hasOwnProperty(BANNER) ||
          impObj.hasOwnProperty(NATIVE) ? impObj : UNDEFINED;
}

function _createBannerImp(bid) {
  var sizes = bid.mediaTypes.banner.sizes;
  var format = [];
  var bannerObj;
  if (sizes !== UNDEFINED && utils.isArray(sizes)) {
    bannerObj = {};
    if (!bid.params.width && !bid.params.height) {
      if (sizes.length === 0) {
        // i.e. since bid.params does not have width or height, and length of sizes is 0, need to ignore this banner imp
        bannerObj = UNDEFINED;
        utils.logWarn('Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
        return bannerObj;
      } else {
        bannerObj.w = parseInt(sizes[0][0], 10);
        bannerObj.h = parseInt(sizes[0][1], 10);
        sizes = sizes.splice(1, sizes.length - 1);
      }
    } else {
      bannerObj.w = bid.params.width;
      bannerObj.h = bid.params.height;
    }
    if (sizes.length > 0) {
      format = [];
      sizes.forEach(function (size) {
        if (size.length > 1) {
          format.push({ w: size[0], h: size[1] });
        }
      });
      if (format.length > 0) {
        bannerObj.format = format;
      }
    }
    bannerObj.pos = 0;
    bannerObj.topframe = utils.inIframe() ? 0 : 1;
  } else {
    utils.logWarn('Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
    bannerObj = UNDEFINED;
  }
  return bannerObj;
}

function _createNativeImp(params) {
  var nativeRequestObject = {
    assets: []
  };
  for (var key in params) {
    if (params.hasOwnProperty(key)) {
      var assetObj = {};
      if (!(nativeRequestObject.assets && nativeRequestObject.assets.length > 0 && nativeRequestObject.assets.hasOwnProperty(key))) {
        switch (key) {
          case NATIVE_ASSETS_LIST.TITLE.KEY:
            if (params[key].len || params[key].length) {
              assetObj = {
                id: NATIVE_ASSETS_LIST.TITLE.ID,
                required: params[key].required ? 1 : 0,
                title: {
                  len: params[key].len || params[key].length,
                  ext: params[key].ext
                }
              };
            } else {
              utils.logWarn('Error: Title Length is required for native ad: ' + JSON.stringify(params));
            }
            break;
          case NATIVE_ASSETS_LIST.IMAGE.KEY:
            if (params[key].sizes && params[key].sizes.length > 0) {
              assetObj = {
                id: NATIVE_ASSETS_LIST.IMAGE.ID,
                required: params[key].required ? 1 : 0,
                img: {
                  type: NATIVE_ASSETS_LIST.IMAGE,
                  w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : UNDEFINED),
                  h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : UNDEFINED),
                  wmin: params[key].wmin || params[key].minimumWidth || (params[key].minsizes ? params[key].minsizes[0] : UNDEFINED),
                  hmin: params[key].hmin || params[key].minimumHeight || (params[key].minsizes ? params[key].minsizes[1] : UNDEFINED),
                  mimes: params[key].mimes,
                  ext: params[key].ext,
                }
              };
            } else {
              utils.logWarn('Error: Image sizes is required for native ad: ' + JSON.stringify(params));
            }
            break;
          case NATIVE_ASSETS_LIST.ICON.KEY:
            if (params[key].sizes && params[key].sizes.length > 0) {
              assetObj = {
                id: NATIVE_ASSETS_LIST.ICON.ID,
                required: params[key].required ? 1 : 0,
                img: {
                  type: NATIVE_ASSET_IMAGE_TYPE_LIST.ICON,
                  w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : UNDEFINED),
                  h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : UNDEFINED),
                }
              };
            } else {
              utils.logWarn('Error: Icon sizes is required for native ad: ' + JSON.stringify(params));
            };
            break;
          case NATIVE_ASSETS_LIST.VIDEO.KEY:
            assetObj = {
              id: NATIVE_ASSETS_LIST.VIDEO.ID,
              required: params[key].required ? 1 : 0,
              video: {
                minduration: params[key].minduration,
                maxduration: params[key].maxduration,
                protocols: params[key].protocols,
                mimes: params[key].mimes,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSETS_LIST.EXT.KEY:
            assetObj = {
              id: NATIVE_ASSETS_LIST.EXT.ID,
              required: params[key].required ? 1 : 0,
            };
            break;
          case NATIVE_ASSETS_LIST.LOGO.KEY:
            assetObj = {
              id: NATIVE_ASSETS_LIST.LOGO.ID,
              required: params[key].required ? 1 : 0,
              img: {
                type: NATIVE_ASSETS_LIST.LOGO,
                w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : UNDEFINED),
                h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : UNDEFINED)
              }
            };
            break;
          case NATIVE_ASSETS_LIST.SPONSOREDBY.KEY:
          case NATIVE_ASSETS_LIST.BODY.KEY:
          case NATIVE_ASSETS_LIST.RATING.KEY:
          case NATIVE_ASSETS_LIST.LIKES.KEY:
          case NATIVE_ASSETS_LIST.DOWNLOADS.KEY:
          case NATIVE_ASSETS_LIST.PRICE.KEY:
          case NATIVE_ASSETS_LIST.SALEPRICE.KEY:
          case NATIVE_ASSETS_LIST.PHONE.KEY:
          case NATIVE_ASSETS_LIST.ADDRESS.KEY:
          case NATIVE_ASSETS_LIST.DESC2.KEY:
          case NATIVE_ASSETS_LIST.DISPLAYURL.KEY:
          case NATIVE_ASSETS_LIST.CTA.KEY:
            assetObj = _commonNativeRequestObject(NATIVE_ASSET_KEY_TO_ASSET_MAP[key], params);
            break;
        }
      }
    }
    if (assetObj && assetObj.id) {
      nativeRequestObject.assets[nativeRequestObject.assets.length] = assetObj;
    }
  };

  // for native image adtype prebid has to have few required assests i.e. title,sponsoredBy, image
  // if any of these are missing from the request then request will not be sent
  var requiredAssetCount = NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS.length;
  var presentrequiredAssetCount = 0;
  NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS.forEach(ele => {
    var lengthOfExistingAssets = nativeRequestObject.assets.length;
    for (var i = 0; i < lengthOfExistingAssets; i++) {
      if (ele.id == nativeRequestObject.assets[i].id) {
        presentrequiredAssetCount++;
        break;
      }
    }
  });
  if (requiredAssetCount == presentrequiredAssetCount) {
    globInvalidNativeRequest = false;
  } else {
    globInvalidNativeRequest = true;
  }
  return nativeRequestObject;
}

function _commonNativeRequestObject(nativeAsset, params) {
  var key = nativeAsset.KEY;
  return {
    id: nativeAsset.ID,
    required: params[key].required ? 1 : 0,
    data: {
      type: nativeAsset.TYPE,
      len: params[key].len,
      ext: params[key].ext
    }
  };
}

function _cleanParam(paramName, paramValue) {
  if (!utils.isStr(paramValue)) {
    paramValue && utils.logWarn('Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
    return UNDEFINED;
  }

  switch (paramName) {
    case 'bidfloor':
      return parseFloat(paramValue) || UNDEFINED;
    case 'lat':
      return parseFloat(paramValue) || UNDEFINED;
    case 'lon':
      return parseFloat(paramValue) || UNDEFINED;
    case 'yob':
      return parseInt(paramValue) || UNDEFINED;
    default:
      return paramValue;
  }
}

function _addFloorFromFloorModule(impObj, bid) {
  let bidFloor = -1; // indicates no floor

  // get lowest floor from floorModule
  if (typeof bid.getFloor === 'function' && !config.getConfig('pubwise.disableFloors')) {
    [BANNER, NATIVE].forEach(mediaType => {
      if (impObj.hasOwnProperty(mediaType)) {
        let floorInfo = bid.getFloor({ currency: impObj.bidfloorcur, mediaType: mediaType, size: '*' });
        if (typeof floorInfo === 'object' && floorInfo.currency === impObj.bidfloorcur && !isNaN(parseInt(floorInfo.floor))) {
          let mediaTypeFloor = parseFloat(floorInfo.floor);
          bidFloor = (bidFloor == -1 ? mediaTypeFloor : Math.min(mediaTypeFloor, bidFloor))
        }
      }
    });
  }

  // get highest, if none then take the default -1
  if (impObj.bidfloor) {
    bidFloor = Math.max(bidFloor, impObj.bidfloor)
  }

  // assign if it has a valid floor - > 0
  impObj.bidfloor = ((!isNaN(bidFloor) && bidFloor > 0) ? bidFloor : UNDEFINED);
}

function _hasPurpose1Consent(bidderRequest) {
  let result = true;
  if (bidderRequest && bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.gdprApplies && bidderRequest.gdprConsent.apiVersion === 2) {
      result = !!(utils.deepAccess(bidderRequest.gdprConsent, 'vendorData.purpose.consents.1') === true);
    }
  }
  return result;
}

/* Modify sizes into more compatible format for downstream processing */
function _transformSizes(requestSizes) {
  let sizes = [];
  let sizeObj = {};

  if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
    !utils.isArray(requestSizes[0])) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
    sizes.push(sizeObj);
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      let size = requestSizes[i];
      sizeObj = {};
      sizeObj.width = parseInt(size[0], 10);
      sizeObj.height = parseInt(size[1], 10);
      sizes.push(sizeObj);
    }
  }

  return sizes;
}

registerBidder(spec);
