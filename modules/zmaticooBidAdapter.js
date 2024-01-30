import {deepAccess, isArray, isBoolean, isNumber, isStr, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

const BIDDER_CODE = 'zmaticoo';
const ENDPOINT_URL = 'https://bid.zmaticoo.com/prebid/bid';
const DEFAULT_CUR = 'USD';
const TTL = 200;
const NET_REV = true;

const DATA_TYPES = {
  'NUMBER': 'number',
  'STRING': 'string',
  'BOOLEAN': 'boolean',
  'ARRAY': 'array',
  'OBJECT': 'object'
};
const VIDEO_CUSTOM_PARAMS = {
  'mimes': DATA_TYPES.ARRAY,
  'minduration': DATA_TYPES.NUMBER,
  'maxduration': DATA_TYPES.NUMBER,
  'startdelay': DATA_TYPES.NUMBER,
  'playbackmethod': DATA_TYPES.ARRAY,
  'api': DATA_TYPES.ARRAY,
  'protocols': DATA_TYPES.ARRAY,
  'w': DATA_TYPES.NUMBER,
  'h': DATA_TYPES.NUMBER,
  'battr': DATA_TYPES.ARRAY,
  'linearity': DATA_TYPES.NUMBER,
  'placement': DATA_TYPES.NUMBER,
  'plcmt': DATA_TYPES.NUMBER,
  'minbitrate': DATA_TYPES.NUMBER,
  'maxbitrate': DATA_TYPES.NUMBER,
  'skip': DATA_TYPES.NUMBER
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    // check for all required bid fields
    if (!(bid && bid.bidId && bid.params)) {
      logWarn('Invalid bid request - missing required bid data');
      return false;
    }

    if (!(bid.params.pubId)) {
      logWarn('Invalid bid request - missing required field pubId');
      return false;
    }

    if (!(bid.params.device && bid.params.device.ip)) {
      logWarn('Invalid bid request - missing required device data');
      return false;
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Bids[]} validBidRequests - an array of bidRequest objects
   * @param {BidderRequest} bidderRequest - master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const secure = 1;
    const request = validBidRequests[0];
    const params = request.params;
    const imps = validBidRequests.map(request => {
      const impData = {
        id: request.bidId,
        secure: secure,
        ext: {
          bidder: {
            pubId: params.pubId
          }
        }
      };
      if (params.tagid) {
        impData.tagid = params.tagid;
      }
      if (request.mediaTypes) {
        for (const mediaType in request.mediaTypes) {
          switch (mediaType) {
            case BANNER:
              impData.banner = buildBanner(request);
              break;
            case VIDEO:
              impData.video = buildVideo(request);
              break;
          }
        }
      }
      if (!impData.banner && !impData.video) {
        impData.banner = buildBanner(request);
      }
      if (typeof request.getFloor === 'function') {
        const floorInfo = request.getFloor({
          currency: 'USD',
          mediaType: impData.video ? 'video' : 'banner',
          size: [impData.video ? impData.video.w : impData.banner.w, impData.video ? impData.video.h : impData.banner.h]
        });
        if (floorInfo && floorInfo.floor) {
          impData.bidfloor = floorInfo.floor;
        }
      }
      if (!impData.bidfloor && params.bidfloor) {
        impData.bidfloor = params.bidfloor;
      }
      return impData;
    });
    let payload = {
      id: bidderRequest.bidderRequestId,
      imp: imps,
      site: params.site ? params.site : {},
      app: params.app ? params.app : {},
      device: params.device ? params.device : {},
      user: params.user ? params.user : {},
      at: params.at,
      tmax: params.tmax,
      wseat: params.wseat,
      bseat: params.bseat,
      allimps: params.allimps,
      cur: [DEFAULT_CUR],
      wlang: params.wlang,
      bcat: deepAccess(bidderRequest.ortb2Imp, 'bcat') || params.bcat,
      badv: params.badv,
      bapp: params.bapp,
      source: params.source ? params.source : {},
      regs: params.regs ? params.regs : {},
      ext: params.ext ? params.ext : {}
    };
    payload.device.ua = navigator.userAgent;
    payload.device.ip = navigator.ip;
    payload.site.page = bidderRequest.refererInfo.page;
    payload.site.mobile = /(ios|ipod|ipad|iphone|android)/i.test(navigator.userAgent) ? 1 : 0;
    if (params.test) {
      payload.test = params.test;
    }
    if (request.gdprConsent) {
      payload.regs.ext = Object.assign(payload.regs.ext, {gdpr: request.gdprConsent.gdprApplies === true ? 1 : 0});
    }
    if (request.gdprConsent && request.gdprConsent.gdprApplies) {
      payload.user.ext = Object.assign(payload.user.ext, {consent: request.gdprConsent.consentString});
    }
    const postUrl = ENDPOINT_URL;
    return {
      method: 'POST', url: postUrl, data: JSON.stringify(payload),
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequest The payload from the server's response.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    let bidResponses = [];
    const response = (serverResponse || {}).body;
    if (response && response.seatbid && response.seatbid[0].bid && response.seatbid[0].bid.length) {
      response.seatbid.forEach(zmSeatbid => {
        zmSeatbid.bid.forEach(zmBid => {
          let bid = {
            requestId: zmBid.impid,
            cpm: zmBid.price,
            currency: response.cur,
            width: zmBid.w,
            height: zmBid.h,
            ad: zmBid.adm,
            ttl: TTL,
            creativeId: zmBid.crid,
            netRevenue: NET_REV,
          };
          if (zmBid.adomain && zmBid.adomain.length) {
            bid.meta = {
              advertiserDomains: zmBid.adomain
            };
          }
          bidResponses.push(bid);
        })
      })
    }
    return bidResponses;
  }
}

function buildBanner(request) {
  let sizes = request.sizes;
  if (request.mediaTypes && request.mediaTypes.banner && request.mediaTypes.banner.sizes) {
    sizes = request.mediaTypes.banner.sizes;
  }
  return {
    w: sizes[0][0], h: sizes[0][1]
  };
}

function buildVideo(request) {
  let video = {};
  const videoParams = deepAccess(request, 'mediaTypes.video', {});
  for (const key in VIDEO_CUSTOM_PARAMS) {
    if (videoParams.hasOwnProperty(key)) {
      video[key] = checkParamDataType(key, videoParams[key], VIDEO_CUSTOM_PARAMS[key]);
    }
  }
  if (videoParams.playerSize) {
    if (isArray(videoParams.playerSize[0])) {
      video.w = parseInt(videoParams.playerSize[0][0], 10);
      video.h = parseInt(videoParams.playerSize[0][1], 10);
    } else if (isNumber(videoParams.playerSize[0])) {
      video.w = parseInt(videoParams.playerSize[0], 10);
      video.h = parseInt(videoParams.playerSize[1], 10);
    }
  }
  return video;
}

function checkParamDataType(key, value, datatype) {
  let functionToExecute;
  switch (datatype) {
    case DATA_TYPES.BOOLEAN:
      functionToExecute = isBoolean;
      break;
    case DATA_TYPES.NUMBER:
      functionToExecute = isNumber;
      break;
    case DATA_TYPES.STRING:
      functionToExecute = isStr;
      break;
    case DATA_TYPES.ARRAY:
      functionToExecute = isArray;
      break;
  }
  if (functionToExecute(value)) {
    return value;
  }
  logWarn('Ignoring param key: ' + key + ', expects ' + datatype + ', found ' + typeof value);
  return undefined;
}

registerBidder(spec);
