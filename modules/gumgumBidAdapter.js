import * as utils from 'src/utils'

import { config } from 'src/config'
import { registerBidder } from 'src/adapters/bidderFactory'

const BIDDER_CODE = 'gumgum'
const ALIAS_BIDDER_CODE = ['gg']
const BID_ENDPOINT = `https://g2.gumgum.com/hbid/imp`
const DT_CREDENTIALS = { member: 'YcXr87z2lpbB' }
const TIME_TO_LIVE = 60
let browserParams = {};

// TODO: potential 0 values for browserParams sent to ad server
function _getBrowserParams() {
  let topWindow
  let topScreen
  if (browserParams.vw) {
    // we've already initialized browserParams, just return it.
    return browserParams
  }

  try {
    topWindow = global.top;
    topScreen = topWindow.screen;
  } catch (error) {
    utils.logError(error);
    return browserParams
  }

  browserParams = {
    vw: topWindow.innerWidth,
    vh: topWindow.innerHeight,
    sw: topScreen.width,
    sh: topScreen.height,
    pu: utils.getTopWindowUrl(),
    ce: utils.cookiesAreEnabled(),
    dpr: topWindow.devicePixelRatio || 1
  }
  return browserParams
}

function getWrapperCode(wrapper, data) {
  return wrapper.replace('AD_JSON', window.btoa(JSON.stringify(data)))
}

// TODO: use getConfig()
function _getDigiTrustQueryParams() {
  function getDigiTrustId () {
    var digiTrustUser = (window.DigiTrust && window.DigiTrust.getUser) ? window.DigiTrust.getUser(DT_CREDENTIALS) : {};
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || '';
  };

  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return {};
  }
  return {
    'dt': digiTrustId.id
  };
}

/**
 * Determines whether or not the given bid request is valid.
 *
 * @param {BidRequest} bid The bid params to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */
function isBidRequestValid (bid) {
  const {
    params,
    adUnitCode
  } = bid;

  switch (true) {
    case !!(params.inScreen): break;
    case !!(params.inSlot): break;
    default:
      utils.logWarn(`[GumGum] No product selected for the placement ${adUnitCode}, please check your implementation.`);
      return false;
  }
  return true;
}

/**
 * Make a server request from the list of BidRequests.
 *
 * @param {validBidRequests[]} - an array of bids
 * @return ServerRequest Info describing the request to the server.
 */
function buildRequests (validBidRequests) {
  const bids = [];
  utils._each(validBidRequests, bidRequest => {
    const timeout = config.getConfig('bidderTimeout');
    const {
      bidId,
      params = {},
      transactionId
    } = bidRequest;
    const data = {}

    if (params.inScreen) {
      data.t = params.inScreen;
      data.pi = 2;
    }
    if (params.inSlot) {
      data.si = parseInt(params.inSlot, 10);
      data.pi = 3;
    }

    bids.push({
      id: bidId,
      tmax: timeout,
      tId: transactionId,
      pi: data.pi,
      sizes: bidRequest.sizes,
      url: BID_ENDPOINT,
      method: 'GET',
      data: Object.assign(data, _getBrowserParams(), _getDigiTrustQueryParams())
    })
  });
  return bids;
}

/**
 * Unpack the response from the server into a list of bids.
 *
 * @param {*} serverResponse A successful response from the server.
 * @return {Bid[]} An array of bids which were nested inside the server.
 */
function interpretResponse (serverResponse, bidRequest) {
  const bidResponses = []
  const serverResponseBody = serverResponse.body
  const {
    ad: {
      price: cpm,
      id: creativeId,
      markup
    },
    cw: wrapper
  } = serverResponseBody
  let isTestUnit = (bidRequest.data && bidRequest.data.pi === 3 && bidRequest.data.si === 9)
  let [width, height] = utils.parseSizesInput(bidRequest.sizes)[0].split('x')

  if (creativeId) {
    bidResponses.push({
      // dealId: DEAL_ID,
      // referrer: REFERER,
      ad: wrapper ? getWrapperCode(wrapper, Object.assign({}, serverResponseBody, { bidRequest })) : markup,
      cpm: isTestUnit ? 0.1 : cpm,
      creativeId,
      currency: 'USD',
      height,
      netRevenue: true,
      requestId: bidRequest.id,
      ttl: TIME_TO_LIVE,
      width
    })
  }
  return bidResponses
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ALIAS_BIDDER_CODE,
  isBidRequestValid,
  buildRequests,
  interpretResponse
}
registerBidder(spec)
