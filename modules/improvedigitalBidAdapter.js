import { deepSetValue, logError, _each, getBidRequest, isNumber, isArray, deepAccess, isFn, isPlainObject, logWarn, getBidIdParameter, getUniqueIdentifierStr, isEmpty, isInteger } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import { createEidsArray } from './userId/eids.js';
import includes from 'core-js-pure/features/array/includes.js';

const BIDDER_CODE = 'improvedigital';
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';
const VIDEO_TARGETING = ['skip', 'skipmin', 'skipafter'];

export const spec = {
  version: '7.4.0',
  code: BIDDER_CODE,
  gvlid: 253,
  aliases: ['id'],
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && (bid.params.placementId || (bid.params.placementKey && bid.params.publisherId)));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    let normalizedBids = bidRequests.map((bidRequest) => {
      return getNormalizedBidRequest(bidRequest);
    });

    let idClient = new ImproveDigitalAdServerJSClient('hb');
    let requestParameters = {
      singleRequestMode: (config.getConfig('improvedigital.singleRequest') === true),
      returnObjType: idClient.CONSTANTS.RETURN_OBJ_TYPE.URL_PARAMS_SPLIT,
      libVersion: this.version
    };

    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString) {
      requestParameters.gdpr = bidderRequest.gdprConsent.consentString;
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      requestParameters.usPrivacy = bidderRequest.uspConsent;
    }

    if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
      requestParameters.referrer = bidderRequest.refererInfo.referer;
    }

    requestParameters.schain = bidRequests[0].schain;

    if (bidRequests[0].userId) {
      const eids = createEidsArray(bidRequests[0].userId);
      if (eids.length) {
        deepSetValue(requestParameters, 'user.ext.eids', eids);
      }
    }

    let requestObj = idClient.createRequest(
      normalizedBids, // requestObject
      requestParameters
    );

    if (requestObj.errors && requestObj.errors.length > 0) {
      logError('ID WARNING 0x01');
    }
    requestObj.requests.forEach(request => request.bidderRequest = bidderRequest);
    return requestObj.requests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, {bidderRequest}) {
    const bids = [];
    _each(serverResponse.body.bid, function (bidObject) {
      if (!bidObject.price || bidObject.price === null ||
        bidObject.hasOwnProperty('errorCode') ||
        (!bidObject.adm && !bidObject.native)) {
        return;
      }
      const bidRequest = getBidRequest(bidObject.id, [bidderRequest]);
      const bid = {};

      if (bidObject.native) {
        // Native
        bid.native = getNormalizedNativeAd(bidObject.native);
        // Expose raw oRTB response to the client to allow parsing assets not directly supported by Prebid
        bid.ortbNative = bidObject.native;
        if (bidObject.nurl) {
          bid.native.impressionTrackers.unshift(bidObject.nurl);
        }
        bid.mediaType = NATIVE;
      } else if (bidObject.ad_type && bidObject.ad_type === 'video') {
        bid.vastXml = bidObject.adm;
        bid.mediaType = VIDEO;
        if (isOutstreamVideo(bidRequest)) {
          bid.adResponse = {
            content: bid.vastXml,
            height: bidObject.h,
            width: bidObject.w
          };
          bid.renderer = createRenderer(bidRequest);
        }
      } else {
        // Banner
        let nurl = '';
        if (bidObject.nurl && bidObject.nurl.length > 0) {
          nurl = `<img src="${bidObject.nurl}" width="0" height="0" style="display:none">`;
        }
        bid.ad = `${nurl}<script>${bidObject.adm}</script>`;
        bid.mediaType = BANNER;
      }

      // Common properties
      bid.cpm = parseFloat(bidObject.price);
      bid.creativeId = bidObject.crid;
      bid.currency = bidObject.currency ? bidObject.currency.toUpperCase() : 'USD';

      // Deal ID. Composite ads can have multiple line items and the ID of the first
      // dealID line item will be used.
      if (isNumber(bidObject.lid) && bidObject.buying_type && bidObject.buying_type !== 'rtb') {
        bid.dealId = bidObject.lid;
      } else if (Array.isArray(bidObject.lid) &&
        Array.isArray(bidObject.buying_type) &&
        bidObject.lid.length === bidObject.buying_type.length) {
        let isDeal = false;
        bidObject.buying_type.forEach((bt, i) => {
          if (isDeal) return;
          if (bt && bt !== 'rtb') {
            isDeal = true;
            bid.dealId = bidObject.lid[i];
          }
        });
      }

      bid.height = bidObject.h;
      bid.netRevenue = bidObject.isNet ? bidObject.isNet : false;
      bid.requestId = bidObject.id;
      bid.ttl = 300;
      bid.width = bidObject.w;

      if (!bid.width || !bid.height) {
        bid.width = 1;
        bid.height = 1;
      }

      if (bidObject.adomain) {
        bid.meta = {
          advertiserDomains: bidObject.adomain
        };
      }

      bids.push(bid);
    });
    return bids;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    if (syncOptions.pixelEnabled) {
      const syncs = [];
      serverResponses.forEach(response => {
        response.body.bid.forEach(bidObject => {
          if (isArray(bidObject.sync)) {
            bidObject.sync.forEach(syncElement => {
              if (syncs.indexOf(syncElement) === -1) {
                syncs.push(syncElement);
              }
            });
          }
        });
      });
      return syncs.map(sync => ({ type: 'image', url: sync }));
    }
    return [];
  }
};

function isInstreamVideo(bid) {
  const mediaTypes = Object.keys(deepAccess(bid, 'mediaTypes', {}));
  const videoMediaType = deepAccess(bid, 'mediaTypes.video');
  const context = deepAccess(bid, 'mediaTypes.video.context');
  return bid.mediaType === 'video' || (mediaTypes.length === 1 && videoMediaType && context !== 'outstream');
}

function isOutstreamVideo(bid) {
  const videoMediaType = deepAccess(bid, 'mediaTypes.video');
  const context = deepAccess(bid, 'mediaTypes.video.context');
  return videoMediaType && context === 'outstream';
}

function getVideoTargetingParams(bid) {
  const result = {};
  Object.keys(Object(bid.mediaTypes.video))
    .filter(key => includes(VIDEO_TARGETING, key))
    .forEach(key => {
      result[ key ] = bid.mediaTypes.video[ key ];
    });
  Object.keys(Object(bid.params.video))
    .filter(key => includes(VIDEO_TARGETING, key))
    .forEach(key => {
      result[ key ] = bid.params.video[ key ];
    });
  return result;
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return null;
  }
  const floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [bid.width, bid.height],
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse,
      rendererOptions: bid.renderer.getConfig()
    }, handleOutstreamRendererEvents.bind(null, bid));
  });
}

function handleOutstreamRendererEvents(bid, id, eventName) {
  bid.renderer.handleVideoEvent({ id, eventName });
}

function createRenderer(bidRequest) {
  const renderer = Renderer.install({
    id: bidRequest.adUnitCode,
    url: RENDERER_URL,
    loaded: false,
    config: deepAccess(bidRequest, 'renderer.options'),
    adUnitCode: bidRequest.adUnitCode
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function getNormalizedBidRequest(bid) {
  let adUnitId = getBidIdParameter('adUnitCode', bid) || null;
  let placementId = getBidIdParameter('placementId', bid.params) || null;
  let publisherId = null;
  let placementKey = null;

  if (placementId === null) {
    publisherId = getBidIdParameter('publisherId', bid.params) || null;
    placementKey = getBidIdParameter('placementKey', bid.params) || null;
  }
  const keyValues = getBidIdParameter('keyValues', bid.params) || null;
  const singleSizeFilter = getBidIdParameter('size', bid.params) || null;
  const bidId = getBidIdParameter('bidId', bid);
  const transactionId = getBidIdParameter('transactionId', bid);
  const currency = config.getConfig('currency.adServerCurrency');

  let normalizedBidRequest = {};
  if (isInstreamVideo(bid)) {
    normalizedBidRequest.adTypes = [ VIDEO ];
  }
  if (isInstreamVideo(bid) || isOutstreamVideo(bid)) {
    normalizedBidRequest.video = getVideoTargetingParams(bid);
  }
  if (placementId) {
    normalizedBidRequest.placementId = placementId;
  } else {
    if (publisherId) {
      normalizedBidRequest.publisherId = publisherId;
    }
    if (placementKey) {
      normalizedBidRequest.placementKey = placementKey;
    }
  }

  if (keyValues) {
    normalizedBidRequest.keyValues = keyValues;
  }

  if (config.getConfig('improvedigital.usePrebidSizes') === true && !isInstreamVideo(bid) && !isOutstreamVideo(bid) && bid.sizes && bid.sizes.length > 0) {
    normalizedBidRequest.format = bid.sizes;
  } else if (singleSizeFilter && singleSizeFilter.w && singleSizeFilter.h) {
    normalizedBidRequest.size = {};
    normalizedBidRequest.size.h = singleSizeFilter.h;
    normalizedBidRequest.size.w = singleSizeFilter.w;
  }

  if (bidId) {
    normalizedBidRequest.id = bidId;
  }
  if (adUnitId) {
    normalizedBidRequest.adUnitId = adUnitId;
  }
  if (transactionId) {
    normalizedBidRequest.transactionId = transactionId;
  }
  if (currency) {
    normalizedBidRequest.currency = currency;
  }
  // Floor
  let bidFloor = getBidFloor(bid);
  let bidFloorCur = null;
  if (!bidFloor) {
    bidFloor = getBidIdParameter('bidFloor', bid.params);
    bidFloorCur = getBidIdParameter('bidFloorCur', bid.params);
  }
  if (bidFloor) {
    normalizedBidRequest.bidFloor = bidFloor;
    normalizedBidRequest.bidFloorCur = bidFloorCur ? bidFloorCur.toUpperCase() : 'USD';
  }
  return normalizedBidRequest;
}

function getNormalizedNativeAd(rawNative) {
  const native = {};
  if (!rawNative || !isArray(rawNative.assets)) {
    return null;
  }
  // Assets
  rawNative.assets.forEach(asset => {
    if (asset.title) {
      native.title = asset.title.text;
    } else if (asset.data) {
      switch (asset.data.type) {
        case 1:
          native.sponsoredBy = asset.data.value;
          break;
        case 2:
          native.body = asset.data.value;
          break;
        case 3:
          native.rating = asset.data.value;
          break;
        case 4:
          native.likes = asset.data.value;
          break;
        case 5:
          native.downloads = asset.data.value;
          break;
        case 6:
          native.price = asset.data.value;
          break;
        case 7:
          native.salePrice = asset.data.value;
          break;
        case 8:
          native.phone = asset.data.value;
          break;
        case 9:
          native.address = asset.data.value;
          break;
        case 10:
          native.body2 = asset.data.value;
          break;
        case 11:
          native.displayUrl = asset.data.value;
          break;
        case 12:
          native.cta = asset.data.value;
          break;
      }
    } else if (asset.img) {
      switch (asset.img.type) {
        case 2:
          native.icon = {
            url: asset.img.url,
            width: asset.img.w,
            height: asset.img.h
          };
          break;
        case 3:
          native.image = {
            url: asset.img.url,
            width: asset.img.w,
            height: asset.img.h
          };
          break;
      }
    }
  });
  // Trackers
  if (rawNative.eventtrackers) {
    native.impressionTrackers = [];
    rawNative.eventtrackers.forEach(tracker => {
      // Only handle impression event. Viewability events are not supported yet.
      if (tracker.event !== 1) return;
      switch (tracker.method) {
        case 1: // img
          native.impressionTrackers.push(tracker.url);
          break;
        case 2: // js
          // javascriptTrackers is a string. If there's more than one JS tracker in bid response, the last script will be used.
          native.javascriptTrackers = `<script src=\"${tracker.url}\"></script>`;
          break;
      }
    });
  } else {
    native.impressionTrackers = rawNative.imptrackers || [];
    native.javascriptTrackers = rawNative.jstracker;
  }
  if (rawNative.link) {
    native.clickUrl = rawNative.link.url;
    native.clickTrackers = rawNative.link.clicktrackers;
  }
  if (rawNative.privacy) {
    native.privacyLink = rawNative.privacy;
  }
  return native;
}
registerBidder(spec);

export function ImproveDigitalAdServerJSClient(endPoint) {
  this.CONSTANTS = {
    AD_SERVER_BASE_URL: 'ice.360yield.com',
    END_POINT: endPoint || 'hb',
    AD_SERVER_URL_PARAM: 'jsonp=',
    CLIENT_VERSION: 'JS-6.4.0',
    MAX_URL_LENGTH: 2083,
    ERROR_CODES: {
      MISSING_PLACEMENT_PARAMS: 2,
      LIB_VERSION_MISSING: 3
    },
    RETURN_OBJ_TYPE: {
      DEFAULT: 0,
      URL_PARAMS_SPLIT: 1
    }
  };

  this.getErrorReturn = function(errorCode) {
    return {
      idMappings: {},
      requests: {},
      'errorCode': errorCode
    };
  };

  this.createRequest = function(requestObject, requestParameters, extraRequestParameters) {
    if (!requestParameters.libVersion) {
      return this.getErrorReturn(this.CONSTANTS.ERROR_CODES.LIB_VERSION_MISSING);
    }

    requestParameters.returnObjType = requestParameters.returnObjType || this.CONSTANTS.RETURN_OBJ_TYPE.DEFAULT;
    requestParameters.adServerBaseUrl = 'https://' + (requestParameters.adServerBaseUrl || this.CONSTANTS.AD_SERVER_BASE_URL);

    let impressionObjects = [];
    let impressionObject;
    if (isArray(requestObject)) {
      for (let counter = 0; counter < requestObject.length; counter++) {
        impressionObject = this.createImpressionObject(requestObject[counter]);
        impressionObjects.push(impressionObject);
      }
    } else {
      impressionObject = this.createImpressionObject(requestObject);
      impressionObjects.push(impressionObject);
    }

    let returnIdMappings = true;
    if (requestParameters.returnObjType === this.CONSTANTS.RETURN_OBJ_TYPE.URL_PARAMS_SPLIT) {
      returnIdMappings = false;
    }

    let returnObject = {};
    returnObject.requests = [];
    if (returnIdMappings) {
      returnObject.idMappings = [];
    }
    let errors = null;

    let baseUrl = `${requestParameters.adServerBaseUrl}/${this.CONSTANTS.END_POINT}?${this.CONSTANTS.AD_SERVER_URL_PARAM}`;

    let bidRequestObject = {
      bid_request: this.createBasicBidRequestObject(requestParameters, extraRequestParameters)
    };
    for (let counter = 0; counter < impressionObjects.length; counter++) {
      impressionObject = impressionObjects[counter];

      if (impressionObject.errorCode) {
        errors = errors || [];
        errors.push({
          errorCode: impressionObject.errorCode,
          adUnitId: impressionObject.adUnitId
        });
      } else {
        if (returnIdMappings) {
          returnObject.idMappings.push({
            adUnitId: impressionObject.adUnitId,
            id: impressionObject.impressionObject.id
          });
        }
        bidRequestObject.bid_request.imp = bidRequestObject.bid_request.imp || [];
        bidRequestObject.bid_request.imp.push(impressionObject.impressionObject);

        let writeLongRequest = false;
        const outputUri = baseUrl + encodeURIComponent(JSON.stringify(bidRequestObject));
        if (outputUri.length > this.CONSTANTS.MAX_URL_LENGTH) {
          writeLongRequest = true;
          if (bidRequestObject.bid_request.imp.length > 1) {
            // Pop the current request and process it again in the next iteration
            bidRequestObject.bid_request.imp.pop();
            if (returnIdMappings) {
              returnObject.idMappings.pop();
            }
            counter--;
          }
        }

        if (writeLongRequest ||
            !requestParameters.singleRequestMode ||
            counter === impressionObjects.length - 1) {
          returnObject.requests.push(this.formatRequest(requestParameters, bidRequestObject));
          bidRequestObject = {
            bid_request: this.createBasicBidRequestObject(requestParameters, extraRequestParameters)
          };
        }
      }
    }

    if (errors) {
      returnObject.errors = errors;
    }

    return returnObject;
  };

  this.formatRequest = function(requestParameters, bidRequestObject) {
    switch (requestParameters.returnObjType) {
      case this.CONSTANTS.RETURN_OBJ_TYPE.URL_PARAMS_SPLIT:
        return {
          method: 'GET',
          url: `${requestParameters.adServerBaseUrl}/${this.CONSTANTS.END_POINT}`,
          data: `${this.CONSTANTS.AD_SERVER_URL_PARAM}${encodeURIComponent(JSON.stringify(bidRequestObject))}`
        };
      default:
        const baseUrl = `${requestParameters.adServerBaseUrl}/` +
          `${this.CONSTANTS.END_POINT}?${this.CONSTANTS.AD_SERVER_URL_PARAM}`;
        return {
          url: baseUrl + encodeURIComponent(JSON.stringify(bidRequestObject))
        }
    }
  };

  this.createBasicBidRequestObject = function(requestParameters, extraRequestParameters) {
    let impressionBidRequestObject = {};
    impressionBidRequestObject.secure = 1;
    if (requestParameters.requestId) {
      impressionBidRequestObject.id = requestParameters.requestId;
    } else {
      impressionBidRequestObject.id = getUniqueIdentifierStr();
    }
    if (requestParameters.domain) {
      impressionBidRequestObject.domain = requestParameters.domain;
    }
    if (requestParameters.page) {
      impressionBidRequestObject.page = requestParameters.page;
    }
    if (requestParameters.ref) {
      impressionBidRequestObject.ref = requestParameters.ref;
    }
    if (requestParameters.callback) {
      impressionBidRequestObject.callback = requestParameters.callback;
    }
    if (requestParameters.libVersion) {
      impressionBidRequestObject.version = requestParameters.libVersion + '-' + this.CONSTANTS.CLIENT_VERSION;
    }
    if (requestParameters.referrer) {
      impressionBidRequestObject.referrer = requestParameters.referrer;
    }
    if (requestParameters.gdpr || requestParameters.gdpr === 0) {
      impressionBidRequestObject.gdpr = requestParameters.gdpr;
    }
    if (requestParameters.usPrivacy) {
      impressionBidRequestObject.us_privacy = requestParameters.usPrivacy;
    }
    if (requestParameters.schain) {
      impressionBidRequestObject.schain = requestParameters.schain;
    }
    if (requestParameters.user) {
      impressionBidRequestObject.user = requestParameters.user;
    }
    if (extraRequestParameters) {
      for (let prop in extraRequestParameters) {
        impressionBidRequestObject[prop] = extraRequestParameters[prop];
      }
    }

    return impressionBidRequestObject;
  };

  this.createImpressionObject = function(placementObject) {
    let outputObject = {};
    let impressionObject = {};
    outputObject.impressionObject = impressionObject;

    if (placementObject.id) {
      impressionObject.id = placementObject.id;
    } else {
      impressionObject.id = getUniqueIdentifierStr();
    }
    if (placementObject.adTypes) {
      impressionObject.ad_types = placementObject.adTypes;
    }
    if (placementObject.adUnitId) {
      outputObject.adUnitId = placementObject.adUnitId;
    }
    if (placementObject.currency) {
      impressionObject.currency = placementObject.currency.toUpperCase();
    }
    if (placementObject.bidFloor) {
      impressionObject.bidfloor = placementObject.bidFloor;
    }
    if (placementObject.bidFloorCur) {
      impressionObject.bidfloorcur = placementObject.bidFloorCur.toUpperCase();
    }
    if (placementObject.placementId) {
      impressionObject.pid = placementObject.placementId;
    }
    if (placementObject.publisherId) {
      impressionObject.pubid = placementObject.publisherId;
    }
    if (placementObject.placementKey) {
      impressionObject.pkey = placementObject.placementKey;
    }
    if (placementObject.transactionId) {
      impressionObject.tid = placementObject.transactionId;
    }
    if (!isEmpty(placementObject.video)) {
      const video = Object.assign({}, placementObject.video);
      // skip must be 0 or 1
      if (video.skip !== 1) {
        delete video.skipmin;
        delete video.skipafter;
        if (video.skip !== 0) {
          logWarn(`video.skip: invalid value '${video.skip}'. Expected 0 or 1`);
          delete video.skip;
        }
      }
      if (!isEmpty(video)) {
        impressionObject.video = video;
      }
    }
    if (placementObject.keyValues) {
      for (let key in placementObject.keyValues) {
        for (let valueCounter = 0; valueCounter < placementObject.keyValues[key].length; valueCounter++) {
          impressionObject.kvw = impressionObject.kvw || {};
          impressionObject.kvw[key] = impressionObject.kvw[key] || [];
          impressionObject.kvw[key].push(placementObject.keyValues[key][valueCounter]);
        }
      }
    }

    impressionObject.banner = {};
    if (placementObject.size && placementObject.size.w && placementObject.size.h) {
      impressionObject.banner.w = placementObject.size.w;
      impressionObject.banner.h = placementObject.size.h;
    }

    // Set of desired creative sizes
    // Input Format: array of pairs, i.e. [[300, 250], [250, 250]]
    if (placementObject.format && isArray(placementObject.format)) {
      const format = placementObject.format
        .filter(sizePair => sizePair.length === 2 &&
            isInteger(sizePair[0]) &&
            isInteger(sizePair[1]) &&
            sizePair[0] >= 0 &&
            sizePair[1] >= 0)
        .map(sizePair => {
          return { w: sizePair[0], h: sizePair[1] }
        });
      if (format.length > 0) {
        impressionObject.banner.format = format;
      }
    }

    if (!impressionObject.pid &&
    !impressionObject.pubid &&
    !impressionObject.pkey &&
    !(impressionObject.banner && impressionObject.banner.w && impressionObject.banner.h)) {
      outputObject.impressionObject = null;
      outputObject.errorCode = this.CONSTANTS.ERROR_CODES.MISSING_PLACEMENT_PARAMS;
    }
    return outputObject;
  };
}
