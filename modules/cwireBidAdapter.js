import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getStorageManager} from '../src/storageManager.js';
import {BANNER} from '../src/mediaTypes.js';
import {generateUUID, getParameterByName, logInfo} from '../src/utils.js';

// ------------------------------------
const BIDDER_CODE = 'cwire';
const CWID_KEY = 'cw_cwid';

export const BID_ENDPOINT = 'https://prebid.cwi.re/v1/bid';
export const EVENT_ENDPOINT = 'https://prebid.cwi.re/v1/event';

export const storage = getStorageManager({bidderCode: BIDDER_CODE});

/**
 * Retrieve dimensions and CSS max height/width from a given slot and attach the properties to the bidRequest.
 * @param bid
 * @returns {*&{cwExt: {dimensions: {width: number, height: number}, style: {maxWidth: number, maxHeight: number}}}}
 */
function slotDimensions(bid) {
  let adUnitCode = bid.adUnitCode;
  let slotEl = document.getElementById(adUnitCode);

  if (slotEl) {
    logInfo(`Slot element found: ${adUnitCode}`)
    const slotW = slotEl.offsetWidth
    const slotH = slotEl.offsetHeight
    const cssMaxW = slotEl.style?.maxWidth;
    const cssMaxH = slotEl.style?.maxHeight;
    logInfo(`Slot dimensions (w/h): ${slotW} / ${slotH}`)
    logInfo(`Slot Styles (maxW/maxH): ${cssMaxW} / ${cssMaxH}`)

    bid = {
      ...bid,
      cwExt: {
        dimensions: {
          width: slotW,
          height: slotH,
        },
        style: {
          ...(cssMaxW) && {
            maxWidth: cssMaxW
          },
          ...(cssMaxH) && {
            maxHeight: cssMaxH
          }
        }
      }
    }
  }
  return bid
}

/**
 * Extracts feature flags from a comma-separated url parameter `cwfeatures`.
 * @param validBidRequests
 *
 * @returns *[]
 */
function featureFlags(validBidRequests) {
  let ffParam = getParameterByName('cwfeatures')
  if (ffParam) {
    return ffParam.split(',')
  }
  return []
}

/**
 * Reads the CWID from local storage.
 */
function getCwid() {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(CWID_KEY) : null;
}

function hasCwid() {
  return storage.localStorageIsEnabled() && storage.getDataFromLocalStorage(CWID_KEY);
}

/**
 * Store the CWID to local storage.
 */
function updateCwid(cwid) {
  if (storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(CWID_KEY, cwid)
  } else {
    logInfo(`Could not set CWID ${cwid} in localstorage`);
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    // pageId is required
    const valid = !!(bid.params?.pageId)
    return valid;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    // There are more fields on the refererInfo object
    let referrer = bidderRequest?.refererInfo?.page

    // process bid requests
    let processed = validBidRequests
      .map(bid => slotDimensions(bid))
      // Flattens the pageId and placement Id for backwards compatibility.
      .map((bid) => ({...bid, pageId: bid.params?.pageId, placementId: bid.params?.placementId}));

    const payload = {
      slots: processed,
      httpRef: referrer,
      // TODO: Verify whether the auctionId and the usage of pageViewId make sense.
      pageViewId: bidderRequest?.auctionId || generateUUID()
    };

    const cwid = getCwid();

    // Add optional/debug parameters
    let cwcreative = getParameterByName('cwcreative')

    const ff = featureFlags(validBidRequests);

    // Enable debug flag by passing ?cwdebug=true as url parameter.
    // Note: pbjs_debug=true enables it on prebid level
    // More info: https://docs.prebid.org/troubleshooting/troubleshooting-guide.html#turn-on-prebidjs-debug-messages
    const debug = getParameterByName('cwdebug');

    // TODO: refgroups?
    if (cwid) {
      payload.cwid = cwid
    }
    if (ff.length > 0) {
      payload.featureFlags = ff
    }
    if (cwcreative) {
      payload.cwcreative = cwcreative
    }
    if (debug) {
      payload.debug = true
    }
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: BID_ENDPOINT,
      data: payloadString,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    if (!hasCwid()) {
      const cwid = serverResponse.body?.cwid
      if (cwid) {
        updateCwid(cwid);
      }
    }

    // Rename `html` response property to `ad` as used by prebid.
    const bids = serverResponse.body?.bids.map(({html, ...rest}) => ({...rest, ad: html}));
    return bids || [];
  },

  onBidWon: function (bid) {
    logInfo(`Bid won.`)
    const event = {
      type: 'BID_WON',
      payload: {
        bid: bid
      }
    }
    navigator.sendBeacon(EVENT_ENDPOINT, JSON.stringify(event))
  },

  onBidderError: function (error, bidderRequest) {
    logInfo(`Bidder error: ${error}`)
    const event = {
      type: 'BID_ERROR',
      payload: {
        error: error,
        bidderRequest: bidderRequest
      }
    }
    navigator.sendBeacon(EVENT_ENDPOINT, JSON.stringify(event))
  },

};
registerBidder(spec);
