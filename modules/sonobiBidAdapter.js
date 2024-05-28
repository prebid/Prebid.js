import { registerBidder } from '../src/adapters/bidderFactory.js';
import { parseSizesInput, logError, generateUUID, isEmpty, deepAccess, logWarn, logMessage, isFn, isPlainObject } from '../src/utils.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { userSync } from '../src/userSync.js';
import { bidderSettings } from '../src/bidderSettings.js';
import { getAllOrtbKeywords } from '../libraries/keywords/keywords.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'sonobi';
const STR_ENDPOINT = 'https://apex.go.sonobi.com/trinity.json';
const PAGEVIEW_ID = generateUUID();
const OUTSTREAM_REDNERER_URL = 'https://mtrx.go.sonobi.com/sbi_outstream_renderer.js';

export const spec = {
  code: BIDDER_CODE,
  gvlid: 104,
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid - The bid params to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    if (!bid.params) {
      return false;
    }
    if (!bid.params.ad_unit && !bid.params.placement_id) {
      return false;
    }

    if (!deepAccess(bid, 'mediaTypes.banner') && !deepAccess(bid, 'mediaTypes.video')) {
      return false;
    }

    if (deepAccess(bid, 'mediaTypes.banner')) { // Sonobi does not support multi type bids, favor banner over video
      if (!deepAccess(bid, 'mediaTypes.banner.sizes') && !bid.params.sizes) {
        // sizes at the banner or params level is required.
        return false;
      }
    } else if (deepAccess(bid, 'mediaTypes.video')) {
      if (deepAccess(bid, 'mediaTypes.video.context') === 'outstream' && !deepAccess(bid, 'mediaTypes.video.playerSize')) {
        // playerSize is required for outstream video adUnits
        return false;
      }
      if (deepAccess(bid, 'mediaTypes.video.context') === 'instream' && !deepAccess(bid, 'mediaTypes.video.playerSize')) {
        // playerSize is required for instream adUnits.
        return false;
      }
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return {object} ServerRequest - Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const bids = validBidRequests.map(bid => {
      let slotIdentifier = _validateSlot(bid);
      if (/^[\/]?[\d]+[[\/].+[\/]?]?$/.test(slotIdentifier)) {
        slotIdentifier = slotIdentifier.charAt(0) === '/' ? slotIdentifier : '/' + slotIdentifier;
        return {
          [`${slotIdentifier}|${bid.bidId}`]: `${_validateSize(bid)}|${_validateFloor(bid)}${_validateGPID(bid)}${_validateMediaType(bid)}`
        }
      } else if (/^[0-9a-fA-F]{20}$/.test(slotIdentifier) && slotIdentifier.length === 20) {
        return {
          [bid.bidId]: `${slotIdentifier}|${_validateSize(bid)}|${_validateFloor(bid)}${_validateGPID(bid)}${_validateMediaType(bid)}`
        }
      } else {
        logError(`The ad unit code or Sonobi Placement id for slot ${bid.bidId} is invalid`);
      }
    });

    let data = {};
    bids.forEach((bid) => { Object.assign(data, bid); });

    const payload = {
      'key_maker': JSON.stringify(data),
      // TODO: is 'page' the right value here?
      'ref': bidderRequest.refererInfo.page,
      's': generateUUID(),
      'pv': PAGEVIEW_ID,
      'vp': _getPlatform(),
      'lib_name': 'prebid',
      'lib_v': '$prebid.version$',
      'us': 0,
      'iqid': bidderSettings.get(BIDDER_CODE, 'storageAllowed') ? JSON.stringify(loadOrCreateFirstPartyData()) : null,
    };

    const fpd = bidderRequest.ortb2;

    if (fpd) {
      delete fpd.experianRtidData; // Omit the experian data since we already pass this through a dedicated query param
      delete fpd.experianRtidKey
      payload.fpd = JSON.stringify(fpd);
    }

    if (config.getConfig('userSync') && config.getConfig('userSync').syncsPerBidder) {
      payload.us = config.getConfig('userSync').syncsPerBidder;
    }

    // use userSync's internal function to determine if we can drop an iframe sync pixel
    if (_iframeAllowed()) {
      payload.ius = 1;
    } else {
      payload.ius = 0;
    }

    if (deepAccess(validBidRequests[0], 'params.hfa')) {
      payload.hfa = deepAccess(validBidRequests[0], 'params.hfa');
    }

    if (validBidRequests[0].params.referrer) {
      payload.ref = validBidRequests[0].params.referrer;
    }

    // Apply GDPR parameters to request.
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = bidderRequest.gdprConsent.gdprApplies ? 'true' : 'false';
      if (bidderRequest.gdprConsent.consentString) {
        payload.consent_string = bidderRequest.gdprConsent.consentString;
      }
    }

    if (validBidRequests[0].schain) {
      payload.schain = JSON.stringify(validBidRequests[0].schain);
    }

    const eids = deepAccess(validBidRequests[0], 'userIdAsEids');
    if (Array.isArray(eids) && eids.length > 0) {
      payload.eids = JSON.stringify(eids);
    }

    let keywords = getAllOrtbKeywords(bidderRequest.ortb2, ...validBidRequests.map(br => br.params.keywords)).join(',');

    if (keywords) {
      payload.kw = keywords;
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }

    if (config.getConfig('coppa') === true) {
      payload.coppa = 1;
    } else {
      payload.coppa = 0;
    }

    // If there is no key_maker data, then don't make the request.
    if (isEmpty(data)) {
      return null;
    }

    let url = STR_ENDPOINT;

    if (deepAccess(validBidRequests[0], 'params.bid_request_url')) {
      url = deepAccess(validBidRequests[0], 'params.bid_request_url');
    }

    return {
      method: 'GET',
      url: url,
      withCredentials: true,
      data: payload,
      bidderRequests: validBidRequests
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidderRequest - Info describing the request to the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, bidderRequest) => {
    const bidResponse = serverResponse.body;
    const bidsReturned = [];
    const referrer = bidderRequest.data.ref;
    if (Object.keys(bidResponse.slots).length === 0) {
      return bidsReturned;
    }

    Object.keys(bidResponse.slots).forEach(slot => {
      const bid = bidResponse.slots[slot];
      const bidId = _getBidIdFromTrinityKey(slot);
      const bidRequest = _findBidderRequest(bidderRequest.bidderRequests, bidId);
      let mediaType = null;
      if (bid.sbi_ct === 'video') {
        mediaType = 'video';
        const context = deepAccess(bidRequest, 'mediaTypes.video.context');
        if (context === 'outstream') {
          mediaType = 'outstream';
        }
      }

      const createCreative = _creative(mediaType, referrer);
      if (bid.sbi_aid && bid.sbi_mouse && bid.sbi_size) {
        const [
          width = 1,
          height = 1
        ] = bid.sbi_size.split('x');
        let aDomains = [];
        if (bid.sbi_adomain) {
          aDomains = [bid.sbi_adomain];
        }
        const bids = {
          requestId: bidId,
          cpm: Number(bid.sbi_mouse),
          width: Number(width),
          height: Number(height),
          ad: createCreative(bidResponse.sbi_dc, bid.sbi_aid),
          ttl: 500,
          creativeId: bid.sbi_crid || bid.sbi_aid,
          aid: bid.sbi_aid,
          netRevenue: true,
          currency: 'USD',
          meta: {
            advertiserDomains: aDomains
          }
        };

        if (bid.sbi_dozer) {
          bids.dealId = bid.sbi_dozer;
        }

        if (mediaType === 'video') {
          bids.mediaType = 'video';
          bids.vastUrl = createCreative(bidResponse.sbi_dc, bid.sbi_aid);
          delete bids.ad;
          delete bids.width;
          delete bids.height;
        } else if (mediaType === 'outstream' && bidRequest) {
          delete bids.ad; // Some pubs expect bids.ad to be a vast xml structure, we have a vatUrl so lets delete this.
          bids.mediaType = 'video';
          bids.vastUrl = createCreative(bidResponse.sbi_dc, bid.sbi_aid);
          bids.renderer = newRenderer(bidRequest.adUnitCode, bids, deepAccess(
            bidRequest,
            'renderer.options'
          ));
          let videoSize = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
          if (videoSize) {
            bids.width = videoSize[0];
            bids.height = videoSize[1];
          }
        }
        bidsReturned.push(bids);
      }
    });
    return bidsReturned;
  },
  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    const syncs = [];
    try {
      if (syncOptions.pixelEnabled) {
        serverResponses[0].body.sbi_px.forEach(pixel => {
          syncs.push({
            type: pixel.type,
            url: pixel.url
          });
        });
      }
    } catch (e) { }
    return syncs;
  }
};

function _findBidderRequest(bidderRequests, bidId) {
  for (let i = 0; i < bidderRequests.length; i++) {
    if (bidderRequests[i].bidId === bidId) {
      return bidderRequests[i];
    }
  }
}

// This function takes all the possible sizes.
// returns string csv.
function _validateSize(bid) {
  let size = [];
  if (deepAccess(bid, 'mediaTypes.video.playerSize')) {
    size.push(deepAccess(bid, 'mediaTypes.video.playerSize'))
  }
  if (deepAccess(bid, 'mediaTypes.video.sizes')) {
    size.push(deepAccess(bid, 'mediaTypes.video.sizes'))
  }
  if (deepAccess(bid, 'params.sizes')) {
    size.push(deepAccess(bid, 'params.sizes'));
  }
  if (deepAccess(bid, 'mediaTypes.banner.sizes')) {
    size.push(deepAccess(bid, 'mediaTypes.banner.sizes'))
  }
  if (deepAccess(bid, 'sizes')) {
    size.push(deepAccess(bid, 'sizes'))
  }
  // Pass the 2d sizes array into parseSizeInput to flatten it into an array of x separated sizes.
  // Then throw it into Set to uniquify it.
  // Then spread it to an array again. Then join it into a csv of sizes.
  return [...new Set(parseSizesInput(...size))].join(',');
}

function _validateSlot(bid) {
  if (bid.params.ad_unit) {
    return bid.params.ad_unit;
  }
  return bid.params.placement_id;
}

function _validateFloor(bid) {
  const floor = getBidFloor(bid);

  if (floor) {
    return `f=${floor},`;
  }
  return '';
}

function _validateGPID(bid) {
  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid') || deepAccess(bid, 'ortb2Imp.ext.data.pbadslot') || deepAccess(getGptSlotInfoForAdUnitCode(bid.adUnitCode), 'gptSlot') || bid.params.ad_unit;

  if (gpid) {
    return `gpid=${gpid},`
  }
  return ''
}

function _validateMediaType(bidRequest) {
  let mediaType;
  if (deepAccess(bidRequest, 'mediaTypes.video')) {
    mediaType = 'video';
  } else if (deepAccess(bidRequest, 'mediaTypes.banner')) {
    mediaType = 'display';
  }

  let mediaTypeValidation = '';
  if (mediaType === 'video') {
    mediaTypeValidation = 'c=v,';
    if (deepAccess(bidRequest, 'mediaTypes.video.playbackmethod')) {
      mediaTypeValidation = `${mediaTypeValidation}pm=${deepAccess(bidRequest, 'mediaTypes.video.playbackmethod').join(':')},`;
    }
    if (deepAccess(bidRequest, 'mediaTypes.video.placement')) {
      let placement = deepAccess(bidRequest, 'mediaTypes.video.placement');
      mediaTypeValidation = `${mediaTypeValidation}p=${placement},`;
    }
    if (deepAccess(bidRequest, 'mediaTypes.video.plcmt')) {
      let plcmt = deepAccess(bidRequest, 'mediaTypes.video.plcmt');
      mediaTypeValidation = `${mediaTypeValidation}pl=${plcmt},`;
    }
  } else if (mediaType === 'display') {
    mediaTypeValidation = 'c=d,';
  }

  return mediaTypeValidation;
}

const _creative = (mediaType, referer) => (sbiDc, sbiAid) => {
  if (mediaType === 'video' || mediaType === 'outstream') {
    return _videoCreative(sbiDc, sbiAid, referer)
  }
  const src = `https://${sbiDc}apex.go.sonobi.com/sbi.js?aid=${sbiAid}&as=null&ref=${encodeURIComponent(referer)}`;
  return '<script type="text/javascript" src="' + src + '"></script>';
};

function _videoCreative(sbiDc, sbiAid, referer) {
  return `https://${sbiDc}apex.go.sonobi.com/vast.xml?vid=${sbiAid}&ref=${encodeURIComponent(referer)}`
}

function _getBidIdFromTrinityKey(key) {
  return key.split('|').slice(-1)[0]
}

/**
 * @param context - the window to determine the innerWidth from. This is purely for test purposes as it should always be the current window
 */
export const _isInbounds = (context = window) => (lowerBound = 0, upperBound = Number.MAX_SAFE_INTEGER) => context.innerWidth >= lowerBound && context.innerWidth < upperBound;

/**
 * @param context - the window to determine the innerWidth from. This is purely for test purposes as it should always be the current window
 */
export function _getPlatform(context = window) {
  const isInBounds = _isInbounds(context);
  const MOBILE_VIEWPORT = {
    lt: 768
  };
  const TABLET_VIEWPORT = {
    lt: 992,
    ge: 768
  };
  if (isInBounds(0, MOBILE_VIEWPORT.lt)) {
    return 'mobile'
  }
  if (isInBounds(TABLET_VIEWPORT.ge, TABLET_VIEWPORT.lt)) {
    return 'tablet'
  }
  return 'desktop';
}
/**
 * Check for local storage
 * Generate a UUID for the user if one does not exist in local storage
 * Store the UUID in local storage for future use
 * @return {object} firstPartyData - Data object containing first party information
 */
function loadOrCreateFirstPartyData() {
  var localStorageEnabled;

  var FIRST_PARTY_KEY = '_iiq_fdata';
  var tryParse = function (data) {
    try {
      return JSON.parse(data);
    } catch (err) {
      return null;
    }
  };
  var readData = function (key) {
    if (hasLocalStorage()) {
      return window.localStorage.getItem(key);
    }
    return null;
  };
  var hasLocalStorage = function () {
    if (typeof localStorageEnabled != 'undefined') { return localStorageEnabled; } else {
      try {
        localStorageEnabled = !!window.localStorage;
        return localStorageEnabled;
      } catch (e) {
        localStorageEnabled = false;
      }
    }
    return false;
  };
  var generateGUID = function () {
    var d = new Date().getTime();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  };
  var storeData = function (key, value) {
    try {
      if (hasLocalStorage()) {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      return null;
    }
  };
  var firstPartyData = tryParse(readData(FIRST_PARTY_KEY));
  if (!firstPartyData || !firstPartyData.pcid) {
    var firstPartyId = generateGUID();
    firstPartyData = { pcid: firstPartyId, pcidDate: Date.now() };
  } else if (firstPartyData && !firstPartyData.pcidDate) {
    firstPartyData.pcidDate = Date.now();
  }
  storeData(FIRST_PARTY_KEY, JSON.stringify(firstPartyData));
  return firstPartyData;
};

function newRenderer(adUnitCode, bid, rendererOptions = {}) {
  const renderer = Renderer.install({
    id: bid.aid,
    url: OUTSTREAM_REDNERER_URL,
    config: rendererOptions,
    loaded: false,
    adUnitCode
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }

  renderer.setEventHandlers({
    impression: () => logMessage('Sonobi outstream video impression event'),
    loaded: () => logMessage('Sonobi outstream video loaded event'),
    ended: () => {
      logMessage('Sonobi outstream renderer video event');
      // document.querySelector(`#${adUnitCode}`).style.display = 'none';
    }
  });
  return renderer;
}

function outstreamRender(bid) {
  // push to render queue because SbiOutstreamRenderer may not be loaded yet
  bid.renderer.push(() => {
    const [
      width,
      height
    ] = bid.getSize().split('x');
    const renderer = new window.SbiOutstreamRenderer();
    renderer.init({
      vastUrl: bid.vastUrl,
      height,
      width,
    });
    renderer.setRootElement(bid.adUnitCode);
  });
}

function _iframeAllowed() {
  return userSync.canBidderRegisterSync('iframe', BIDDER_CODE);
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return (bid.params.floor) ? bid.params.floor : null;
  }

  let floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });

  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return '';
}

registerBidder(spec);
