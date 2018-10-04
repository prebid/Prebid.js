import * as utils from 'src/utils'

import { config } from 'src/config'
import { registerBidder } from 'src/adapters/bidderFactory'
import includes from 'core-js/library/fn/array/includes';

const BIDDER_CODE = 'gumgum'
const ALIAS_BIDDER_CODE = ['gg']
const BID_ENDPOINT = `https://g2.gumgum.com/hbid/imp`
const DT_CREDENTIALS = { member: 'YcXr87z2lpbB' }
const TIME_TO_LIVE = 60

let browserParams = {};
let pageViewId = null

function hasTopAccess () {
  var hasTopAccess = false
  try { hasTopAccess = !!top.document } catch (e) {}
  return hasTopAccess
}

function isInSafeFrame (windowRef) {
  const w = windowRef || window
  if (w.$sf) return w.$sf
  else if (hasTopAccess() && w !== top) return isInSafeFrame(w.parent)
  return null
}

function getGoogleTag (windowRef) {
  try {
    const w = windowRef || window
    var GOOGLETAG = null
    if ('googletag' in w) {
      GOOGLETAG = w.googletag
    } else if (w !== top) {
      GOOGLETAG = getGoogleTag(w.parent)
    }
    return GOOGLETAG
  } catch (error) {
    utils.logError('Error getting googletag ', error)
    return null
  }
}

function getAMPContext (windowRef) {
  const w = windowRef || window
  var context = null
  var nameJSON = null
  if (utils.isPlainObject(w.context)) {
    context = w.context
  } else {
    try {
      nameJSON = JSON.parse(w.name || null)
    } catch (error) {
      utils.logError('Error getting w.name', error)
    }
    if (utils.isPlainObject(nameJSON)) {
      context = nameJSON._context || (nameJSON.attributes ? nameJSON.attributes._context : null)
    }
    if (utils.isPlainObject(w.AMP_CONTEXT_DATA)) {
      context = w.AMP_CONTEXT_DATA
    }
  }
  return context
}

function getJCSI () {
  const entrypointOffset = 7
  const inFrame = (window.top && window.top !== window)
  const frameType = (!inFrame ? 1 : (isInSafeFrame() ? 2 : (hasTopAccess() ? 3 : 4)))
  const context = []
  if (getAMPContext()) {
    context.push(1)
  }
  if (getGoogleTag()) {
    context.push(2)
  }
  const jcsi = {
    ep: entrypointOffset,
    fc: frameType,
    ctx: context
  }
  return JSON.stringify(jcsi)
}

// TODO: potential 0 values for browserParams sent to ad server
function _getBrowserParams() {
  let topWindow
  let topScreen
  let topUrl
  let ggad
  if (browserParams.vw) {
    // we've already initialized browserParams, just return it.
    return browserParams
  }

  try {
    topWindow = global.top;
    topScreen = topWindow.screen;
    topUrl = utils.getTopWindowUrl()
  } catch (error) {
    utils.logError(error);
    return browserParams
  }

  browserParams = {
    vw: topWindow.innerWidth,
    vh: topWindow.innerHeight,
    sw: topScreen.width,
    sh: topScreen.height,
    pu: topUrl,
    ce: utils.cookiesAreEnabled(),
    dpr: topWindow.devicePixelRatio || 1,
    jcsi: getJCSI()
  }
  ggad = (topUrl.match(/#ggad=(\w+)$/) || [0, 0])[1]
  if (ggad) {
    browserParams[isNaN(ggad) ? 'eAdBuyId' : 'adBuyId'] = ggad
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
    dt: digiTrustId.id
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
    case !!(params.ICV): break;
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
function buildRequests (validBidRequests, bidderRequest) {
  const bids = [];
  const gdprConsent = Object.assign({ consentString: null, gdprApplies: true }, bidderRequest && bidderRequest.gdprConsent)
  utils._each(validBidRequests, bidRequest => {
    const timeout = config.getConfig('bidderTimeout');
    const {
      bidId,
      params = {},
      transactionId
    } = bidRequest;
    const data = {}
    if (pageViewId) {
      data.pv = pageViewId
    }
    if (params.inScreen) {
      data.t = params.inScreen;
      data.pi = 2;
    }
    if (params.inSlot) {
      data.si = parseInt(params.inSlot, 10);
      data.pi = 3;
    }
    if (params.ICV) {
      data.ni = parseInt(params.ICV, 10);
      data.pi = 5;
    }
    data.gdprApplies = gdprConsent.gdprApplies;
    if (gdprConsent.gdprApplies) {
      data.gdprConsent = gdprConsent.consentString;
    }

    bids.push({
      id: bidId,
      tmax: timeout,
      tId: transactionId,
      pi: data.pi,
      selector: params.selector,
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
  const defaultResponse = {
    ad: {
      price: 0,
      id: 0,
      markup: ''
    },
    pag: {
      pvid: 0
    }
  }
  const {
    ad: {
      price: cpm,
      id: creativeId,
      markup
    },
    cw: wrapper,
    pag: {
      pvid
    }
  } = Object.assign(defaultResponse, serverResponseBody)
  let data = bidRequest.data || {}
  let product = data.pi
  let isTestUnit = (product === 3 && data.si === 9)
  let sizes = utils.parseSizesInput(bidRequest.sizes)
  let [width, height] = sizes[0].split('x')

  // return 1x1 when breakout expected
  if ((product === 2 || product === 5) && includes(sizes, '1x1')) {
    width = '1'
    height = '1'
  }

  // update Page View ID from server response
  pageViewId = pvid

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

/**
 * Register the user sync pixels which should be dropped after the auction.
 *
 * @param {SyncOptions} syncOptions Which user syncs are allowed?
 * @param {ServerResponse[]} serverResponses List of server's responses.
 * @return {UserSync[]} The user syncs which should be dropped.
 */
function getUserSyncs (syncOptions, serverResponses) {
  const responses = serverResponses.map((response) => {
    return (response.body && response.body.pxs && response.body.pxs.scr) || []
  })
  const userSyncs = responses.reduce(function (usersyncs, response) {
    return usersyncs.concat(response)
  }, [])
  const syncs = userSyncs.map((sync) => {
    return {
      type: sync.t === 'f' ? 'iframe' : 'image',
      url: sync.u
    }
  })
  return syncs;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ALIAS_BIDDER_CODE,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
}
registerBidder(spec)
