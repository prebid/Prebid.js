import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {getParameterByName, logInfo} from '../src/utils.js';

// ------------------------------------
const BIDDER_CODE = 'cwire';
export const ENDPOINT_URL = 'https://embed.cwi.re/prebid/bid';

/**
 * Retrieve dimensions from a given slot in bidRequest. Attaches the dimensions to the bidRequest by spread operator.
 * @param bid
 * @returns {*&{cwExt: {dimensions: {width: number, height: number}}}}
 */
function slotDimensions(bid) {
  let adUnitCode = bid.adUnitCode;
  let slotEl = document.getElementById(adUnitCode);
  if (slotEl) {
    logInfo(`Slot element found: ${adUnitCode}`)
    const slotW = slotEl.offsetWidth
    const slotH = slotEl.offsetHeight
    const cssMaxW = slotEl.style?.maxWidth;
    logInfo(`Slot dimensions (w/h): ${slotW} / ${slotH}`)

    return {
      ...bid,
      cwExt: {
        dimensions: {
          width: slotW,
          height: slotH,
        },
        ...(cssMaxW) && {
          style: {
            maxWidth: cssMaxW,
          }
        }
      }
    }
  }
}

/**
 * Extracts feature flags from a comma-separated url parameter `cw_features`.
 * @param validBidRequests
 *
 * @returns *[]
 */
function featureFlags(validBidRequests) {
  let ffParam = getParameterByName('cw_features')
  if (ffParam !== '') {
    return ffParam.split(',')
  }
  return []
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
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    // These are passed from C WIRE config:
    // let placementId = getValue(bid.params, 'placementId');
    // let pageId = getValue(bid.params, 'pageId');

    // There are more fields on the refererInfo object
    let referrer = bidderRequest?.refererInfo?.page

    // process bid requests
    let processed = validBidRequests.map(bid => slotDimensions(bid));

    const payload = {
      userTracker: {
        sharedId: '123',
      },
      slots: processed,
      referrer: referrer
      /*
      Use `bidderRequest.bids[]` to get bidder-dependent
      request info.

      If your bidder supports multiple currencies, use
      `config.getConfig(currency)` to find which one the ad
      server needs.

      Pull the requested transaction ID from
      `bidderRequest.bids[].transactionId`.
      */
    };

    // Add optional/debug parameters
    let creativeId = getParameterByName('cw_creative')
    const ff = featureFlags(validBidRequests);

    if (ff.length > 0) {
      payload.featureFlags = ff
    }
    if (creativeId) {
      payload.creativeId = creativeId
    }
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
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
    return serverResponse.body?.bids || [];
  },
};
registerBidder(spec);
