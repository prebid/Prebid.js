import {
  buildUrl,
  deepAccess,
  deepSetValue,
  getBidIdParameter,
  isArray,
  isFn,
  isPlainObject,
  isStr,
  logError,
  logWarn,
  mergeDeep,
  parseUrl,
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {ORTB_MTYPES} from '../libraries/ortbConverter/processors/mediaType.js';

// Maintainer: mediapsr@epsilon.com

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Device} Device
 */

const GVLID = 24;

const BIDDER_CODE = 'conversant';
export const storage = getStorageManager({gvlid: GVLID, bidderCode: BIDDER_CODE});
const URL = 'https://web.hb.ad.cpe.dotomi.com/cvx/client/hb/ortb/25';

function setSiteId(bidRequest, request) {
  if (bidRequest.params.site_id) {
    if (request.site) {
      request.site.id = bidRequest.params.site_id;
    }
    if (request.app) {
      request.app.id = bidRequest.params.site_id;
    }
  }
}

function setPubcid(bidRequest, request) {
  // Add common id if available
  const pubcid = getPubcid(bidRequest);
  if (pubcid) {
    deepSetValue(request, 'user.ext.fpc', pubcid);
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300
  },
  request: function (buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.at = 1;
    if (context.bidRequests) {
      const bidRequest = context.bidRequests[0];
      setSiteId(bidRequest, request);
      setPubcid(bidRequest, request);
    }

    return request;
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const data = {
      secure: 1,
      bidfloor: getBidFloor(bidRequest) || 0,
      displaymanager: 'Prebid.js',
      displaymanagerver: '$prebid.version$'
    };
    copyOptProperty(bidRequest.params.tag_id, data, 'tagid');
    mergeDeep(imp, data, imp);
    return imp;
  },
  bidResponse: function (buildBidResponse, bid, context) {
    if (!bid.price) return;

    // ensure that context.mediaType is set to banner or video otherwise
    if (!context.mediaType && context.bidRequest.mediaTypes) {
      const [type] = Object.keys(context.bidRequest.mediaTypes);
      if (Object.values(ORTB_MTYPES).includes(type)) {
        context.mediaType = type;
      }
    }
    const bidResponse = buildBidResponse(bid, context);
    return bidResponse;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    const response = buildResponse(bidResponses, ortbResponse, context);
    return response.bids;
  },
  overrides: {
    imp: {
      banner(fillBannerImp, imp, bidRequest, context) {
        if (bidRequest.mediaTypes && !bidRequest.mediaTypes.banner) return;
        if (bidRequest.params.position) {
          // fillBannerImp looks for mediaTypes.banner.pos so put it under the right name here
          mergeDeep(bidRequest, {mediaTypes: {banner: {pos: bidRequest.params.position}}});
        }
        fillBannerImp(imp, bidRequest, context);
      },
      video(fillVideoImp, imp, bidRequest, context) {
        if (bidRequest.mediaTypes && !bidRequest.mediaTypes.video) return;
        const videoData = {};
        copyOptProperty(bidRequest.params?.position, videoData, 'pos');
        copyOptProperty(bidRequest.params?.mimes, videoData, 'mimes');
        copyOptProperty(bidRequest.params?.maxduration, videoData, 'maxduration');
        copyOptProperty(bidRequest.params?.protocols, videoData, 'protocols');
        copyOptProperty(bidRequest.params?.api, videoData, 'api');
        imp.video = mergeDeep(videoData, imp.video);
        fillVideoImp(imp, bidRequest, context);
      }
    },
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['cnvr', 'epsilon'], // short code
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid - The bid params to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (!bid || !bid.params) {
      logWarn(BIDDER_CODE + ': Missing bid parameters');
      return false;
    }

    if (!isStr(bid.params.site_id)) {
      logWarn(BIDDER_CODE + ': site_id must be specified as a string');
      return false;
    }

    if (isVideoRequest(bid)) {
      const mimes = bid.params.mimes || deepAccess(bid, 'mediaTypes.video.mimes');
      if (!mimes) {
        // Give a warning but let it pass
        logWarn(BIDDER_CODE + ': mimes should be specified for videos');
      } else if (!isArray(mimes) || !mimes.every(s => isStr(s))) {
        logWarn(BIDDER_CODE + ': mimes must be an array of strings');
        return false;
      }
    }

    return true;
  },

  buildRequests: function(bidRequests, bidderRequest) {
    const payload = converter.toORTB({bidderRequest, bidRequests});
    const result = {
      method: 'POST',
      url: makeBidUrl(bidRequests[0]),
      data: payload,
    };
    return result;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    return converter.fromORTB({request: bidRequest.data, response: serverResponse.body});
  },

  /**
   * Register User Sync.
   */
  getUserSyncs: function(syncOptions, responses, gdprConsent, uspConsent) {
    let params = {};
    const syncs = [];

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      params.gdpr = (gdprConsent.gdprApplies) ? 1 : 0;
      params.gdpr_consent = encodeURIComponent(gdprConsent.consentString || '');
    }

    // CCPA
    if (uspConsent) {
      params.us_privacy = encodeURIComponent(uspConsent);
    }

    if (responses && responses.ext) {
      const pixels = [{urls: responses.ext.fsyncs, type: 'iframe'}, {urls: responses.ext.psyncs, type: 'image'}]
        .filter((entry) => {
          return entry.urls &&
            ((entry.type === 'iframe' && syncOptions.iframeEnabled) ||
            (entry.type === 'image' && syncOptions.pixelEnabled));
        })
        .map((entry) => {
          return entry.urls.map((endpoint) => {
            let urlInfo = parseUrl(endpoint);
            mergeDeep(urlInfo.search, params);
            if (Object.keys(urlInfo.search).length === 0) {
              delete urlInfo.search; // empty search object causes buildUrl to add a trailing ? to the url
            }
            return {type: entry.type, url: buildUrl(urlInfo)};
          })
            .reduce((x, y) => x.concat(y), []);
        })
        .reduce((x, y) => x.concat(y), []);
      syncs.push(...pixels);
    }
    return syncs;
  }
};

function getPubcid(bidRequest) {
  let pubcid = null;
  if (bidRequest.userId && bidRequest.userId.pubcid) {
    pubcid = bidRequest.userId.pubcid;
  } else if (bidRequest.crumbs && bidRequest.crumbs.pubcid) {
    pubcid = bidRequest.crumbs.pubcid;
  }
  if (!pubcid) {
    const pubcidName = getBidIdParameter('pubcid_name', bidRequest.params) || '_pubcid';
    pubcid = readStoredValue(pubcidName);
  }
  return pubcid;
}

/**
 * Check if it's a video bid request
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {boolean} True if it's a video bid
 */
function isVideoRequest(bid) {
  return bid.mediaType === 'video' || !!deepAccess(bid, 'mediaTypes.video');
}

/**
 * Copy property if exists from src to dst
 *
 * @param {object} src - source object
 * @param {object} dst - destination object
 * @param {string} dstName - destination property name
 */
function copyOptProperty(src, dst, dstName) {
  if (src) {
    dst[dstName] = src;
  }
}

/**
 * Look for a stored value from both cookie and local storage and return the first value found.
 * @param key Key for the search
 * @return {string} Stored value
 */
function readStoredValue(key) {
  let storedValue;
  try {
    // check cookies first
    storedValue = storage.getCookie(key);

    if (!storedValue) {
      // check expiration time before reading local storage
      const storedValueExp = storage.getDataFromLocalStorage(`${key}_exp`);
      if (storedValueExp === '' || (storedValueExp && (new Date(storedValueExp)).getTime() - Date.now() > 0)) {
        storedValue = storage.getDataFromLocalStorage(key);
        storedValue = storedValue ? decodeURIComponent(storedValue) : storedValue;
      }
    }

    // deserialize JSON if needed
    if (isStr(storedValue) && storedValue.charAt(0) === '{') {
      storedValue = JSON.parse(storedValue);
    }
  } catch (e) {
    logError(e);
  }

  return storedValue;
}

/**
 * Get the floor price from bid.params for backward compatibility.
 * If not found, then check floor module.
 * @param bid A valid bid object
 * @returns {*|number} floor price
 */
function getBidFloor(bid) {
  let floor = getBidIdParameter('bidfloor', bid.params);

  if (!floor && isFn(bid.getFloor)) {
    const floorObj = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*'
    });

    if (isPlainObject(floorObj) && !isNaN(floorObj.floor) && floorObj.currency === 'USD') {
      floor = floorObj.floor;
    }
  }

  return floor
}

function makeBidUrl(bid) {
  let bidurl = URL;
  if (bid.params.white_label_url) {
    bidurl = bid.params.white_label_url;
  }
  return bidurl;
}

registerBidder(spec);
