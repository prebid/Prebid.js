import { logMessage, getDNT, deepSetValue, deepAccess, _map, logWarn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {config} from '../src/config.js';
const BIDDER_CODE = 'bizzclick';
const ACCOUNTID_MACROS = '[account_id]';
const URL_ENDPOINT = `https://us-e-node1.bizzclick.com/bid?rtb_seat_id=prebidjs&secret_key=${ACCOUNTID_MACROS}`;
const NATIVE_ASSET_IDS = { 0: 'title', 2: 'icon', 3: 'image', 5: 'sponsoredBy', 4: 'body', 1: 'cta' };
const NATIVE_PARAMS = {
  title: {
    id: 0,
    name: 'title'
  },
  icon: {
    id: 2,
    type: 1,
    name: 'img'
  },
  image: {
    id: 3,
    type: 3,
    name: 'img'
  },
  sponsoredBy: {
    id: 5,
    name: 'data',
    type: 1
  },
  body: {
    id: 4,
    name: 'data',
    type: 2
  },
  cta: {
    id: 1,
    type: 12,
    name: 'data'
  }
};
const NATIVE_VERSION = '1.2';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return Boolean(bid.params.accountId) && Boolean(bid.params.placementId)
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    if (validBidRequests && validBidRequests.length === 0) return []
    let accuontId = validBidRequests[0].params.accountId;
    const endpointURL = URL_ENDPOINT.replace(ACCOUNTID_MACROS, accuontId);
    let winTop = window;
    let location;
    try {
      location = new URL(bidderRequest.refererInfo.referer)
      winTop = window.top;
    } catch (e) {
      location = winTop.location;
      logMessage(e);
    };
    let bids = [];
    for (let bidRequest of validBidRequests) {
      let impObject = prepareImpObject(bidRequest);
      let data = {
        id: bidRequest.bidId,
        test: config.getConfig('debug') ? 1 : 0,
        at: 1,
        cur: ['USD'],
        device: {
          w: winTop.screen.width,
          h: winTop.screen.height,
          dnt: getDNT() ? 1 : 0,
          language: (navigator && navigator.language) ? navigator.language.indexOf('-') != -1 ? navigator.language.split('-')[0] : navigator.language : '',
        },
        site: {
          page: location.pathname,
          host: location.host
        },
        source: {
          tid: bidRequest.transactionId,
          ext: {
            schain: {}
          }
        },
        regs: {
          coppa: config.getConfig('coppa') === true ? 1 : 0,
          ext: {}
        },
        user: {
          ext: {}
        },
        ext: {
          ts: Date.now()
        },
        tmax: bidRequest.timeout,
        imp: [impObject],
      };

      let connection = navigator.connection || navigator.webkitConnection;
      if (connection && connection.effectiveType) {
        data.device.connectiontype = connection.effectiveType;
      }
      if (bidRequest) {
        if (bidRequest.schain) {
          deepSetValue(data, 'source.ext.schain', bidRequest.schain);
        }

        if (bidRequest.gdprConsent && bidRequest.gdprConsent.gdprApplies) {
          deepSetValue(data, 'regs.ext.gdpr', bidRequest.gdprConsent.gdprApplies ? 1 : 0);
          deepSetValue(data, 'user.ext.consent', bidRequest.gdprConsent.consentString);
        }

        if (bidRequest.uspConsent !== undefined) {
          deepSetValue(data, 'regs.ext.us_privacy', bidRequest.uspConsent);
        }
      }
      bids.push(data)
    }
    return {
      method: 'POST',
      url: endpointURL,
      data: bids
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse) => {
    if (!serverResponse || !serverResponse.body) return []
    let bizzclickResponse = serverResponse.body;
    let bids = [];
    for (let response of bizzclickResponse) {
      let mediaType = response.seatbid[0].bid[0].ext && response.seatbid[0].bid[0].ext.mediaType ? response.seatbid[0].bid[0].ext.mediaType : BANNER;
      let bid = {
        requestId: response.id,
        cpm: response.seatbid[0].bid[0].price,
        width: response.seatbid[0].bid[0].w,
        height: response.seatbid[0].bid[0].h,
        ttl: response.ttl || 1200,
        currency: response.cur || 'USD',
        netRevenue: true,
        creativeId: response.seatbid[0].bid[0].crid,
        dealId: response.seatbid[0].bid[0].dealid,
        mediaType: mediaType
      };

      bid.meta = {};
      if (response.seatbid[0].bid[0].adomain && response.seatbid[0].bid[0].adomain.length > 0) {
        bid.meta.advertiserDomains = response.seatbid[0].bid[0].adomain;
      }

      switch (mediaType) {
        case VIDEO:
          bid.vastXml = response.seatbid[0].bid[0].adm
          bid.vastUrl = response.seatbid[0].bid[0].ext.vastUrl
          break
        case NATIVE:
          bid.native = parseNative(response.seatbid[0].bid[0].adm)
          break
        default:
          bid.ad = response.seatbid[0].bid[0].adm
      }
      bids.push(bid);
    }
    return bids;
  },
};
/**
 * Determine type of request
 *
 * @param bidRequest
 * @param type
 * @returns {boolean}
 */
const checkRequestType = (bidRequest, type) => {
  return (typeof deepAccess(bidRequest, `mediaTypes.${type}`) !== 'undefined');
}
const parseNative = admObject => {
  const { assets, link, imptrackers, jstracker } = admObject.native;
  const result = {
    clickUrl: link.url,
    clickTrackers: link.clicktrackers || undefined,
    impressionTrackers: imptrackers || undefined,
    javascriptTrackers: jstracker ? [ jstracker ] : undefined
  };
  assets.forEach(asset => {
    const kind = NATIVE_ASSET_IDS[asset.id];
    const content = kind && asset[NATIVE_PARAMS[kind].name];
    if (content) {
      result[kind] = content.text || content.value || { url: content.url, width: content.w, height: content.h };
    }
  });
  return result;
}
const prepareImpObject = (bidRequest) => {
  let impObject = {
    id: bidRequest.transactionId,
    secure: 1,
    ext: {
      placementId: bidRequest.params.placementId
    }
  };
  if (checkRequestType(bidRequest, BANNER)) {
    impObject.banner = addBannerParameters(bidRequest);
  }
  if (checkRequestType(bidRequest, VIDEO)) {
    impObject.video = addVideoParameters(bidRequest);
  }
  if (checkRequestType(bidRequest, NATIVE)) {
    impObject.native = {
      ver: NATIVE_VERSION,
      request: addNativeParameters(bidRequest)
    };
  }
  return impObject
};
const addNativeParameters = bidRequest => {
  let impObject = {
    id: bidRequest.transactionId,
    ver: NATIVE_VERSION,
  };
  const assets = _map(bidRequest.mediaTypes.native, (bidParams, key) => {
    const props = NATIVE_PARAMS[key];
    const asset = {
      required: bidParams.required & 1,
    };
    if (props) {
      asset.id = props.id;
      let wmin, hmin;
      let aRatios = bidParams.aspect_ratios;
      if (aRatios && aRatios[0]) {
        aRatios = aRatios[0];
        wmin = aRatios.min_width || 0;
        hmin = aRatios.ratio_height * wmin / aRatios.ratio_width | 0;
      }
      if (bidParams.sizes) {
        const sizes = flatten(bidParams.sizes);
        wmin = sizes[0];
        hmin = sizes[1];
      }
      asset[props.name] = {}
      if (bidParams.len) asset[props.name]['len'] = bidParams.len;
      if (props.type) asset[props.name]['type'] = props.type;
      if (wmin) asset[props.name]['wmin'] = wmin;
      if (hmin) asset[props.name]['hmin'] = hmin;
      return asset;
    }
  }).filter(Boolean);
  impObject.assets = assets;
  return impObject
}
const addBannerParameters = (bidRequest) => {
  let bannerObject = {};
  const size = parseSizes(bidRequest, 'banner');
  bannerObject.w = size[0];
  bannerObject.h = size[1];
  return bannerObject;
};
const parseSizes = (bid, mediaType) => {
  let mediaTypes = bid.mediaTypes;
  if (mediaType === 'video') {
    let size = [];
    if (mediaTypes.video && mediaTypes.video.w && mediaTypes.video.h) {
      size = [
        mediaTypes.video.w,
        mediaTypes.video.h
      ];
    } else if (Array.isArray(deepAccess(bid, 'mediaTypes.video.playerSize')) && bid.mediaTypes.video.playerSize.length === 1) {
      size = bid.mediaTypes.video.playerSize[0];
    } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0 && Array.isArray(bid.sizes[0]) && bid.sizes[0].length > 1) {
      size = bid.sizes[0];
    }
    return size;
  }
  let sizes = [];
  if (Array.isArray(mediaTypes.banner.sizes)) {
    sizes = mediaTypes.banner.sizes[0];
  } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0) {
    sizes = bid.sizes
  } else {
    logWarn('no sizes are setup or found');
  }
  return sizes
}
const addVideoParameters = (bidRequest) => {
  let videoObj = {};
  let supportParamsList = ['mimes', 'minduration', 'maxduration', 'protocols', 'startdelay', 'placement', 'skip', 'skipafter', 'minbitrate', 'maxbitrate', 'delivery', 'playbackmethod', 'api', 'linearity']
  for (let param of supportParamsList) {
    if (bidRequest.mediaTypes.video[param] !== undefined) {
      videoObj[param] = bidRequest.mediaTypes.video[param];
    }
  }
  const size = parseSizes(bidRequest, 'video');
  videoObj.w = size[0];
  videoObj.h = size[1];
  return videoObj;
}
const flatten = arr => {
  return [].concat(...arr);
}
registerBidder(spec);
