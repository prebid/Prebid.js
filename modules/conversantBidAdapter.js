import { logWarn, isStr, deepAccess, isArray, getBidIdParameter, deepSetValue, isEmpty, _each, convertTypes, parseUrl, mergeDeep, buildUrl, _map, logError, isFn, isPlainObject } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import { config } from '../src/config.js';

const GVLID = 24;

const BIDDER_CODE = 'conversant';
export const storage = getStorageManager({gvlid: GVLID, bidderCode: BIDDER_CODE});
const URL = 'https://web.hb.ad.cpe.dotomi.com/cvx/client/hb/ortb/25';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['cnvr'], // short code
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

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param bidderRequest
   * @return {ServerRequest} Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const page = (bidderRequest && bidderRequest.refererInfo) ? bidderRequest.refererInfo.referer : '';
    let siteId = '';
    let requestId = '';
    let pubcid = null;
    let pubcidName = '_pubcid';
    let bidurl = URL;

    const conversantImps = validBidRequests.map(function(bid) {
      const bidfloor = getBidFloor(bid);

      siteId = getBidIdParameter('site_id', bid.params) || siteId;
      pubcidName = getBidIdParameter('pubcid_name', bid.params) || pubcidName;

      requestId = bid.auctionId;

      const imp = {
        id: bid.bidId,
        secure: 1,
        bidfloor: bidfloor || 0,
        displaymanager: 'Prebid.js',
        displaymanagerver: '$prebid.version$'
      };
      if (bid.ortb2Imp) {
        mergeDeep(imp, bid.ortb2Imp);
      }

      copyOptProperty(bid.params.tag_id, imp, 'tagid');

      if (isVideoRequest(bid)) {
        const videoData = deepAccess(bid, 'mediaTypes.video') || {};
        const format = convertSizes(videoData.playerSize || bid.sizes);
        const video = {};

        if (format && format[0]) {
          copyOptProperty(format[0].w, video, 'w');
          copyOptProperty(format[0].h, video, 'h');
        }

        copyOptProperty(bid.params.position || videoData.pos, video, 'pos');
        copyOptProperty(bid.params.mimes || videoData.mimes, video, 'mimes');
        copyOptProperty(bid.params.maxduration || videoData.maxduration, video, 'maxduration');
        copyOptProperty(bid.params.protocols || videoData.protocols, video, 'protocols');
        copyOptProperty(bid.params.api || videoData.api, video, 'api');

        imp.video = video;
      } else {
        const bannerData = deepAccess(bid, 'mediaTypes.banner') || {};
        const format = convertSizes(bannerData.sizes || bid.sizes);
        const banner = {format: format};

        copyOptProperty(bid.params.position || bannerData.pos, banner, 'pos');

        imp.banner = banner;
      }

      if (bid.userId && bid.userId.pubcid) {
        pubcid = bid.userId.pubcid;
      } else if (bid.crumbs && bid.crumbs.pubcid) {
        pubcid = bid.crumbs.pubcid;
      }
      if (bid.params.white_label_url) {
        bidurl = bid.params.white_label_url;
      }

      return imp;
    });

    const payload = {
      id: requestId,
      imp: conversantImps,
      site: {
        id: siteId,
        mobile: document.querySelector('meta[name="viewport"][content*="width=device-width"]') !== null ? 1 : 0,
        page: page
      },
      device: getDevice(),
      at: 1
    };

    let userExt = {};

    // pass schain object if it is present
    const schain = deepAccess(validBidRequests, '0.schain');
    if (schain) {
      deepSetValue(payload, 'source.ext.schain', schain);
    }

    if (bidderRequest) {
      // Add GDPR flag and consent string
      if (bidderRequest.gdprConsent) {
        userExt.consent = bidderRequest.gdprConsent.consentString;

        if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
          deepSetValue(payload, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
        }
      }

      if (bidderRequest.uspConsent) {
        deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      }
    }

    if (!pubcid) {
      pubcid = readStoredValue(pubcidName);
    }

    // Add common id if available
    if (pubcid) {
      userExt.fpc = pubcid;
    }

    // Add Eids if available
    const eids = collectEids(validBidRequests);
    if (eids.length > 0) {
      userExt.eids = eids;
    }

    // Only add the user object if it's not empty
    if (!isEmpty(userExt)) {
      payload.user = {ext: userExt};
    }

    const firstPartyData = config.getConfig('ortb2') || {};
    mergeDeep(payload, firstPartyData);

    return {
      method: 'POST',
      url: bidurl,
      data: payload,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const requestMap = {};
    serverResponse = serverResponse.body;

    if (bidRequest && bidRequest.data && bidRequest.data.imp) {
      _each(bidRequest.data.imp, imp => requestMap[imp.id] = imp);
    }

    if (serverResponse && isArray(serverResponse.seatbid)) {
      _each(serverResponse.seatbid, function(bidList) {
        _each(bidList.bid, function(conversantBid) {
          const responseCPM = parseFloat(conversantBid.price);
          if (responseCPM > 0.0 && conversantBid.impid) {
            const responseAd = conversantBid.adm || '';
            const responseNurl = conversantBid.nurl || '';
            const request = requestMap[conversantBid.impid];

            const bid = {
              requestId: conversantBid.impid,
              currency: serverResponse.cur || 'USD',
              cpm: responseCPM,
              creativeId: conversantBid.crid || '',
              ttl: 300,
              netRevenue: true
            };
            bid.meta = {};
            if (conversantBid.adomain && conversantBid.adomain.length > 0) {
              bid.meta.advertiserDomains = conversantBid.adomain;
            }

            if (request.video) {
              if (responseAd.charAt(0) === '<') {
                bid.vastXml = responseAd;
              } else {
                bid.vastUrl = responseAd;
              }

              bid.mediaType = 'video';
              bid.width = request.video.w;
              bid.height = request.video.h;
            } else {
              bid.ad = responseAd + '<img src="' + responseNurl + '" />';
              bid.width = conversantBid.w;
              bid.height = conversantBid.h;
            }

            bidResponses.push(bid);
          }
        })
      });
    }

    return bidResponses;
  },

  /**
   * Covert bid param types for S2S
   * @param {Object} params bid params
   * @param {Boolean} isOpenRtb boolean to check openrtb2 protocol
   * @return {Object} params bid params
   */
  transformBidParams: function(params, isOpenRtb) {
    return convertTypes({
      'site_id': 'string',
      'secure': 'number',
      'mobile': 'number'
    }, params);
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

/**
 * Determine do-not-track state
 *
 * @returns {boolean}
 */
function getDNT() {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNoTrack === '1' || navigator.doNotTrack === 'yes';
}

/**
 * Return openrtb device object that includes ua, width, and height.
 *
 * @returns {Device} Openrtb device object
 */
function getDevice() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    h: screen.height,
    w: screen.width,
    dnt: getDNT() ? 1 : 0,
    language: navigator[language].split('-')[0],
    make: navigator.vendor ? navigator.vendor : '',
    ua: navigator.userAgent
  };
}

/**
 * Convert arrays of widths and heights to an array of objects with w and h properties.
 *
 * [[300, 250], [300, 600]] => [{w: 300, h: 250}, {w: 300, h: 600}]
 *
 * @param {Array.<Array.<number>>} bidSizes - arrays of widths and heights
 * @returns {object[]} Array of objects with w and h
 */
function convertSizes(bidSizes) {
  let format;
  if (Array.isArray(bidSizes)) {
    if (bidSizes.length === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
      format = [{w: bidSizes[0], h: bidSizes[1]}];
    } else {
      format = _map(bidSizes, d => { return {w: d[0], h: d[1]}; });
    }
  }

  return format;
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
 * Collect IDs from validBidRequests and store them as an extended id array
 * @param bidRequests valid bid requests
 */
function collectEids(bidRequests) {
  const request = bidRequests[0]; // bidRequests have the same userId object
  const eids = [];
  if (isArray(request.userIdAsEids) && request.userIdAsEids.length > 0) {
    // later following white-list can be converted to block-list if needed
    const requiredSourceValues = {
      'epsilon.com': 1,
      'adserver.org': 1,
      'liveramp.com': 1,
      'criteo.com': 1,
      'id5-sync.com': 1,
      'parrable.com': 1,
      'liveintent.com': 1
    };
    request.userIdAsEids.forEach(function(eid) {
      if (requiredSourceValues.hasOwnProperty(eid.source)) {
        eids.push(eid);
      }
    });
  }
  return eids;
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

registerBidder(spec);
