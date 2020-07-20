import * as utils from '../src/utils.js'

import { BANNER, VIDEO } from '../src/mediaTypes.js';

import { config } from '../src/config.js'
import { getStorageManager } from '../src/storageManager.js';
import includes from 'core-js-pure/features/array/includes';
import { registerBidder } from '../src/adapters/bidderFactory.js'

const storage = getStorageManager();

const BIDDER_CODE = 'gumgum'
const ALIAS_BIDDER_CODE = ['gg']
const BID_ENDPOINT = `https://g2.gumgum.com/hbid/imp`
const JCSI = { t: 0, rq: 8, pbv: '$prebid.version$' }
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO]
const TIME_TO_LIVE = 60
const DELAY_REQUEST_TIME = 1800000; // setting to 30 mins

let invalidRequestIds = {};
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
    return Mbps ? Math.round(Mbps * 1024) : null
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
    topUrl = topWindowUrl || '';
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
    ce: storage.cookiesAreEnabled(),
    dpr: topWindow.devicePixelRatio || 1,
    jcsi: JSON.stringify(JCSI),
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
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return {};
  }
  return {
    dt: digiTrustId.id
  };
}

/**
 * Serializes the supply chain object according to IAB standards
 * @see https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md
 * @param {Object} schainObj supply chain object
 * @returns {string}
 */
function _serializeSupplyChainObj(schainObj) {
  let serializedSchain = `${schainObj.ver},${schainObj.complete}`;

  // order of properties: asi,sid,hp,rid,name,domain
  schainObj.nodes.map(node => {
    serializedSchain += `!${encodeURIComponent(node['asi'] || '')},`;
    serializedSchain += `${encodeURIComponent(node['sid'] || '')},`;
    serializedSchain += `${encodeURIComponent(node['hp'] || '')},`;
    serializedSchain += `${encodeURIComponent(node['rid'] || '')},`;
    serializedSchain += `${encodeURIComponent(node['name'] || '')},`;
    serializedSchain += `${encodeURIComponent(node['domain'] || '')}`;
  })

  return serializedSchain;
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
  const id = params.inScreen || params.inScreenPubID || params.inSlot || params.ICV || params.video || params.inVideo;

  if (invalidRequestIds[id]) {
    utils.logWarn(`[GumGum] Please check the implementation for ${id} for the placement ${adUnitCode}`);
    return false;
  }

  switch (true) {
    case !!(params.inScreen): break;
    case !!(params.inScreenPubID): break;
    case !!(params.inSlot): break;
    case !!(params.ICV): break;
    case !!(params.video): break;
    case !!(params.inVideo): break;
    case !!(params.videoPubID): break;
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
 * Renames vid params from mediatypes.video keys
 * @param {Object} attributes
 * @returns {Object}
 */
function _getVidParams (attributes) {
  const {
    minduration: mind,
    maxduration: maxd,
    linearity: li,
    startdelay: sd,
    placement: pt,
    protocols = [],
    playerSize = []
  } = attributes;
  const sizes = utils.parseSizesInput(playerSize);
  const [viw, vih] = sizes[0] && sizes[0].split('x');
  let pr = '';

  if (protocols.length) {
    pr = protocols.join(',');
  }

  return {
    mind,
    maxd,
    li,
    sd,
    pt,
    pr,
    viw,
    vih
  };
}

/**
 * Make a server request from the list of BidRequests.
 *
 * @param {validBidRequests[]} - an array of bids
 * @return ServerRequest Info describing the request to the server.
 */
function buildRequests (validBidRequests, bidderRequest) {
  const bids = [];
  const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
  const uspConsent = bidderRequest && bidderRequest.uspConsent;
  const timeout = config.getConfig('bidderTimeout');
  const topWindowUrl = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer;
  utils._each(validBidRequests, bidRequest => {
    const {
      bidId,
      mediaTypes = {},
      params = {},
      schain,
      transactionId,
      userId = {}
    } = bidRequest;
    const bannerSizes = mediaTypes.banner && mediaTypes.banner.sizes;
    let data = {};

    if (pageViewId) {
      data.pv = pageViewId;
    }
    if (params.bidfloor) {
      data.fp = params.bidfloor;
    }
    if (params.inScreenPubID) {
      data.pubId = params.inScreenPubID;
      data.pi = 2;
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
    if (params.videoPubID) {
      data = Object.assign(data, _getVidParams(mediaTypes.video));
      data.pubId = params.videoPubID;
      data.pi = 7;
    }
    if (params.video) {
      data = Object.assign(data, _getVidParams(mediaTypes.video));
      data.t = params.video;
      data.pi = 7;
    }
    if (params.inVideo) {
      data = Object.assign(data, _getVidParams(mediaTypes.video));
      data.t = params.inVideo;
      data.pi = 6;
    }
    if (gdprConsent) {
      data.gdprApplies = gdprConsent.gdprApplies ? 1 : 0;
    }
    if (data.gdprApplies) {
      data.gdprConsent = gdprConsent.consentString;
    }
    if (uspConsent) {
      data.uspConsent = uspConsent;
    }
    if (schain && schain.nodes) {
      data.schain = _serializeSupplyChainObj(schain);
    }

    bids.push({
      id: bidId,
      tmax: timeout,
      tId: transactionId,
      pi: data.pi,
      selector: params.selector,
      sizes: bannerSizes,
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

  if (!serverResponseBody || serverResponseBody.err) {
    const data = bidRequest.data || {}
    const id = data.t || data.si || data.ni || data.pubId;
    const delayTime = serverResponseBody ? serverResponseBody.err.drt : DELAY_REQUEST_TIME;
    invalidRequestIds[id] = { productId: data.pi, timestamp: new Date().getTime() };

    setTimeout(() => {
      !!invalidRequestIds[id] && delete invalidRequestIds[id];
    }, delayTime);
    utils.logWarn(`[GumGum] Please check the implementation for ${id}`);
  }

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
      markup,
      cur
    },
    cw: wrapper,
    pag: {
      pvid
    },
    jcsi
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

  if (jcsi) {
    serverResponseBody.jcsi = JCSI
  }

  // update Page View ID from server response
  pageViewId = pvid

  if (creativeId) {
    bidResponses.push({
      // dealId: DEAL_ID,
      // referrer: REFERER,
      ...(product === 7 && { vastXml: markup }),
      ad: wrapper ? getWrapperCode(wrapper, Object.assign({}, serverResponseBody, { bidRequest })) : markup,
      ...(product === 6 && {ad: markup}),
      cpm: isTestUnit ? 0.1 : cpm,
      creativeId,
      currency: cur || 'USD',
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
  getUserSyncs,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES
}
registerBidder(spec)
