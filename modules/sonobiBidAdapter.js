import { registerBidder } from 'src/adapters/bidderFactory';
import { getTopWindowLocation, parseSizesInput, logError, generateUUID, deepAccess, isEmpty } from '../src/utils';
import { BANNER, VIDEO } from '../src/mediaTypes';
import find from 'core-js/library/fn/array/find';
import { config } from '../src/config';

const BIDDER_CODE = 'sonobi';
const STR_ENDPOINT = 'https://apex.go.sonobi.com/trinity.json';
const PAGEVIEW_ID = generateUUID();

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid - The bid params to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: bid => !!(bid.params && (bid.params.ad_unit || bid.params.placement_id) && (bid.params.sizes || bid.sizes)),

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
      'ref': getTopWindowLocation().href,
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

    if (validBidRequests[0].params.hfa) {
      payload.hfa = validBidRequests[0].params.hfa;
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
   * @param {*} bidderRequests - Info describing the request to the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, { bidderRequests }) => {
    const bidResponse = serverResponse.body;
    const bidsReturned = [];

    if (Object.keys(bidResponse.slots).length === 0) {
      return bidsReturned;
    }

    Object.keys(bidResponse.slots).forEach(slot => {
      const bidId = _getBidIdFromTrinityKey(slot);
      const bidRequest = find(bidderRequests, bidReqest => bidReqest.bidId === bidId);
      const videoMediaType = deepAccess(bidRequest, 'mediaTypes.video');
      const mediaType = bidRequest.mediaType || (videoMediaType ? 'video' : null);
      const createCreative = _creative(mediaType);
      const bid = bidResponse.slots[slot];
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

        const creativeType = bid.sbi_ct;
        if (creativeType && (creativeType === 'video' || creativeType === 'outstream')) {
          bids.mediaType = 'video';
          bids.vastUrl = createCreative(bidResponse.sbi_dc, bid.sbi_aid);
          delete bids.ad;
          delete bids.width;
          delete bids.height;
        }
        bidsReturned.push(bids);
      }
    });
    return bidsReturned;
  },
  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, serverResponses) => {
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

function _validateSize (bid) {
  if (bid.params.sizes) {
    return parseSizesInput(bid.params.sizes).join(',');
  }
  return parseSizesInput(bid.sizes).join(',');
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

const _creative = (mediaType) => (sbiDc, sbiAid) => {
  if (mediaType === 'video') {
    return _videoCreative(sbiDc, sbiAid)
  }
  const src = `https://${sbiDc}apex.go.sonobi.com/sbi.js?aid=${sbiAid}&as=null&ref=${encodeURIComponent(getTopWindowLocation().href)}`;
  return '<script type="text/javascript" src="' + src + '"></script>';
};

function _videoCreative(sbiDc, sbiAid) {
  return `https://${sbiDc}apex.go.sonobi.com/vast.xml?vid=${sbiAid}&ref=${encodeURIComponent(getTopWindowLocation().href)}`
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

registerBidder(spec);
