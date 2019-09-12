import * as utils from '../src/utils'

import { config } from '../src/config'
import includes from 'core-js/library/fn/array/includes';
import { registerBidder } from '../src/adapters/bidderFactory'

const BIDDER_CODE = 'gumgum'
const ALIAS_BIDDER_CODE = ['gg']
const BID_ENDPOINT = `https://g2.gumgum.com/hbid/imp`
const DT_CREDENTIALS = { member: 'YcXr87z2lpbB' }
const TIME_TO_LIVE = 60

let browserParams = {};
let pageViewId = null

// TODO: potential 0 values for browserParams sent to ad server
function _getBrowserParams(topWindowUrl) {
  let topWindow
  let topScreen
  let topUrl
  let ggad
  let ns
  function getNetworkSpeed () {
    const connection = window.navigator && (window.navigator.connection || window.navigator.mozConnection || window.navigator.webkitConnection)
    const Mbps = connection && (connection.downlink || connection.bandwidth)
    return Mbps ? Math.round(Mbps * 1024) : null // 1 megabit -> 1024 kilobits
  }
  function getOgURL () {
    let ogURL = ''
    const ogURLSelector = "meta[property='og:url']"
    const head = document && document.getElementsByTagName('head')[0]
    const ogURLElement = head.querySelector(ogURLSelector)
    ogURL = ogURLElement ? ogURLElement.content : null
    return ogURL
  }
  if (browserParams.vw) {
    // we've already initialized browserParams, just return it.
    return browserParams
  }

  try {
    topWindow = global.top;
    topScreen = topWindow.screen;
    topUrl = topWindowUrl || utils.getTopWindowUrl();
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
    jcsi: JSON.stringify({ t: 0, rq: 8 }),
    ogu: getOgURL()
  }

  ns = getNetworkSpeed()
  if (ns) {
    browserParams.ns = ns
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

function _getTradeDeskIDParam(userId) {
  const unifiedIdObj = {};
  if (userId.tdid) {
    unifiedIdObj.tdid = userId.tdid;
  }
  return unifiedIdObj;
}

function _getDigiTrustQueryParams(userId) {
  let digiTrustId = userId.digitrustid && userId.digitrustid.data;
  if (!digiTrustId) {
    const digiTrustUser = (window.DigiTrust && window.DigiTrust.getUser) ? window.DigiTrust.getUser(DT_CREDENTIALS) : {};
    digiTrustId = (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || '';
  }
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

  if (params.bidfloor && !(typeof params.bidfloor === 'number' && isFinite(params.bidfloor))) {
    utils.logWarn('[GumGum] bidfloor must be a Number');
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
      transactionId,
      userId = {}
    } = bidRequest;
    const data = {};
    const topWindowUrl = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer;
    if (pageViewId) {
      data.pv = pageViewId
    }
    if (params.bidfloor) {
      data.fp = params.bidfloor;
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
    data.gdprApplies = gdprConsent.gdprApplies ? 1 : 0;
    if (gdprConsent.gdprApplies) {
      data.gdprConsent = gdprConsent.consentString;
    }

    bids.push({
      id: bidId,
      tmax: timeout,
      tId: transactionId,
      pi: data.pi,
      selector: params.selector,
      sizes: bidRequest.sizes || bidRequest.mediatype[banner].sizes,
      url: BID_ENDPOINT,
      method: 'GET',
      data: Object.assign(data, _getBrowserParams(topWindowUrl), _getDigiTrustQueryParams(userId), _getTradeDeskIDParam(userId))
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
  if (product === 5 && includes(sizes, '1x1')) {
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
