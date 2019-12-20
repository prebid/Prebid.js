import { registerBidder } from '../src/adapters/bidderFactory';
import { parseSizesInput, logError, generateUUID, isEmpty, deepAccess, logWarn, logMessage } from '../src/utils';
import { BANNER, VIDEO } from '../src/mediaTypes';
import { config } from '../src/config';
import { Renderer } from '../src/Renderer';
import { userSync } from '../src/userSync';

const BIDDER_CODE = 'sonobi';
const STR_ENDPOINT = 'https://apex.go.sonobi.com/trinity.json';
const PAGEVIEW_ID = generateUUID();
const SONOBI_DIGITRUST_KEY = 'fhnS5drwmH';
const OUTSTREAM_REDNERER_URL = 'https://mtrx.go.sonobi.com/sbi_outstream_renderer.js';

export const spec = {
  code: BIDDER_CODE,
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
      if (deepAccess(bid, 'mediaTypes.video.context') === 'outstream' && !bid.params.sizes) {
        // bids.params.sizes is required for outstream video adUnits
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
          [`${slotIdentifier}|${bid.bidId}`]: `${_validateSize(bid)}${_validateFloor(bid)}`
        }
      } else if (/^[0-9a-fA-F]{20}$/.test(slotIdentifier) && slotIdentifier.length === 20) {
        return {
          [bid.bidId]: `${slotIdentifier}|${_validateSize(bid)}${_validateFloor(bid)}`
        }
      } else {
        logError(`The ad unit code or Sonobi Placement id for slot ${bid.bidId} is invalid`);
      }
    });

    let data = {};
    bids.forEach((bid) => { Object.assign(data, bid); });

    const payload = {
      'key_maker': JSON.stringify(data),
      'ref': bidderRequest.refererInfo.referer,
      's': generateUUID(),
      'pv': PAGEVIEW_ID,
      'vp': _getPlatform(),
      'lib_name': 'prebid',
      'lib_v': '$prebid.version$',
      'us': 0,
    };

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
    } else if (deepAccess(validBidRequests[0], 'userId.pubcid')) {
      payload.hfa = `PRE-${validBidRequests[0].userId.pubcid}`;
    } else if (deepAccess(validBidRequests[0], 'crumbs.pubcid')) {
      payload.hfa = `PRE-${validBidRequests[0].crumbs.pubcid}`;
    }

    if (deepAccess(validBidRequests[0], 'userId.tdid')) {
      payload.tdid = validBidRequests[0].userId.tdid;
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

    const digitrust = _getDigiTrustObject(SONOBI_DIGITRUST_KEY);

    if (digitrust) {
      payload.digid = digitrust.id;
      payload.digkeyv = digitrust.keyv;
    }

    if (validBidRequests[0].schain) {
      payload.schain = JSON.stringify(validBidRequests[0].schain)
    }
    if (deepAccess(validBidRequests[0], 'userId') && Object.keys(validBidRequests[0].userId).length > 0) {
      payload.userid = JSON.stringify(validBidRequests[0].userId);
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }

    // If there is no key_maker data, then don't make the request.
    if (isEmpty(data)) {
      return null;
    }

    return {
      method: 'GET',
      url: STR_ENDPOINT,
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
          currency: 'USD'
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
          bids.mediaType = 'video';
          bids.vastUrl = createCreative(bidResponse.sbi_dc, bid.sbi_aid);
          bids.renderer = newRenderer(bidRequest.adUnitCode, bids, deepAccess(
            bidRequest,
            'renderer.options'
          ));
          let videoSize = deepAccess(bidRequest, 'params.sizes');
          if (Array.isArray(videoSize) && Array.isArray(videoSize[0])) { // handle case of multiple sizes
            videoSize = videoSize[0] // Only take the first size for outstream
          }
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
    } catch (e) {}
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

function _validateSize (bid) {
  if (deepAccess(bid, 'mediaTypes.video')) {
    return ''; // Video bids arent allowed to override sizes via the trinity request
  }

  if (bid.params.sizes) {
    return parseSizesInput(bid.params.sizes).join(',');
  }
  if (deepAccess(bid, 'mediaTypes.banner.sizes')) {
    return parseSizesInput(deepAccess(bid, 'mediaTypes.banner.sizes')).join(',');
  }

  // Handle deprecated sizes definition
  if (bid.sizes) {
    return parseSizesInput(bid.sizes).join(',');
  }
}

function _validateSlot (bid) {
  if (bid.params.ad_unit) {
    return bid.params.ad_unit;
  }
  return bid.params.placement_id;
}

function _validateFloor (bid) {
  if (bid.params.floor) {
    return `|f=${bid.params.floor}`;
  }
  return '';
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

function _getBidIdFromTrinityKey (key) {
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

// https://github.com/digi-trust/dt-cdn/wiki/Integration-Guide
function _getDigiTrustObject(key) {
  function getDigiTrustId() {
    let digiTrustUser = window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser({member: key}));
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || null;
  }
  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return null;
  }
  return digiTrustId;
}

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

registerBidder(spec);
