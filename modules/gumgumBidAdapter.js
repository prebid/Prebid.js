import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {_each, deepAccess, getWinDimensions, logError, logWarn, parseSizesInput} from '../src/utils.js';

import {config} from '../src/config.js';
import {getStorageManager} from '../src/storageManager.js';

import {registerBidder} from '../src/adapters/bidderFactory.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'gumgum';
const storage = getStorageManager({bidderCode: BIDDER_CODE});
const ALIAS_BIDDER_CODE = ['gg'];
const BID_ENDPOINT = `https://g2.gumgum.com/hbid/imp`;
const JCSI = { t: 0, rq: 8, pbv: '$prebid.version$' }
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO];
const TIME_TO_LIVE = 60;
const DELAY_REQUEST_TIME = 1800000; // setting to 30 mins
const pubProvidedIdSources = ['dac.co.jp', 'audigent.com', 'id5-sync.com', 'liveramp.com', 'intentiq.com', 'liveintent.com', 'crwdcntrl.net', 'quantcast.com', 'adserver.org', 'yahoo.com']

const invalidRequestIds = {};
let pageViewId = null;

// TODO: potential 0 values for browserParams sent to ad server
function _getBrowserParams(topWindowUrl, mosttopLocation) {
  const paramRegex = paramName => new RegExp(`[?#&](${paramName}=(.*?))($|&)`, 'i');

  let browserParams = {};
  let topWindow;
  let topScreen;
  let topUrl;
  let mosttopURL
  let ggad;
  let ggdeal;
  let ns;

  function getNetworkSpeed () {
    const connection = window.navigator && (window.navigator.connection || window.navigator.mozConnection || window.navigator.webkitConnection);
    const Mbps = connection && (connection.downlink || connection.bandwidth);
    return Mbps ? Math.round(Mbps * 1024) : null;
  }

  function getOgURL () {
    let ogURL = '';
    const ogURLSelector = "meta[property='og:url']";
    const head = document && document.getElementsByTagName('head')[0];
    const ogURLElement = head.querySelector(ogURLSelector);
    ogURL = ogURLElement ? ogURLElement.content : null;
    return ogURL;
  }

  function stripGGParams (url) {
    const params = [
      'ggad',
      'ggdeal'
    ];

    return params.reduce((result, param) => {
      const matches = url.match(paramRegex(param));
      if (!matches) return result;
      matches[1] && (result = result.replace(matches[1], ''));
      matches[3] && (result = result.replace(matches[3], ''));
      return result;
    }, url);
  }

  try {
    topWindow = global.top;
    topScreen = topWindow.screen;
    topUrl = topWindowUrl || '';
    mosttopURL = mosttopLocation || '';
  } catch (error) {
    logError(error);
    return browserParams;
  }

  browserParams = {
    vw: getWinDimensions().innerWidth,
    vh: getWinDimensions().innerHeight,
    sw: topScreen.width,
    sh: topScreen.height,
    pu: stripGGParams(topUrl),
    tpl: mosttopURL,
    ce: storage.cookiesAreEnabled(),
    dpr: topWindow.devicePixelRatio || 1,
    jcsi: JSON.stringify(JCSI),
    ogu: getOgURL()
  };

  ns = getNetworkSpeed();
  if (ns) {
    browserParams.ns = ns;
  }

  ggad = (topUrl.match(paramRegex('ggad')) || [0, 0, 0])[2];
  if (ggad) browserParams[isNaN(ggad) ? 'eAdBuyId' : 'adBuyId'] = ggad;

  ggdeal = (topUrl.match(paramRegex('ggdeal')) || [0, 0, 0])[2];
  if (ggdeal) browserParams.ggdeal = ggdeal;

  return browserParams;
}

function getWrapperCode(wrapper, data) {
  return wrapper.replace('AD_JSON', window.btoa(JSON.stringify(data)))
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
  schainObj.nodes.forEach(node => {
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
function isBidRequestValid(bid) {
  const {
    params,
    adUnitCode
  } = bid;
  const legacyParamID = params.inScreen || params.inScreenPubID || params.inSlot || params.ICV || params.video || params.inVideo;
  const id = legacyParamID || params.slot || params.native || params.zone || params.pubID;

  if (invalidRequestIds[id]) {
    logWarn(`[GumGum] Please check the implementation for ${id} for the placement ${adUnitCode}`);
    return false;
  }

  switch (true) {
    case !!(params.zone): break;
    case !!(params.pubId): break;
    case !!(params.inScreen): break;
    case !!(params.inScreenPubID): break;
    case !!(params.inSlot): break;
    case !!(params.ICV): break;
    case !!(params.video): break;
    case !!(params.inVideo): break;
    case !!(params.videoPubID): break;
    default:
      logWarn(`[GumGum] No product selected for the placement ${adUnitCode}, please check your implementation.`);
      return false;
  }

  if (params.bidfloor && !(typeof params.bidfloor === 'number' && isFinite(params.bidfloor))) {
    logWarn('[GumGum] bidfloor must be a Number');
    return false;
  }

  return true;
}

/**
 * Renames vid params from mediatypes.video keys
 * @param {Object} attributes
 * @returns {Object}
 */
function _getVidParams(attributes) {
  const {
    minduration: mind,
    maxduration: maxd,
    linearity: li,
    startdelay: sd,
    placement: pt,
    plcmt,
    protocols = [],
    playerSize = [],
    skip,
    api,
    mimes,
    playbackmethod,
    playbackend: pbe
  } = attributes;
  const sizes = parseSizesInput(playerSize);
  const [viw, vih] = sizes[0] && sizes[0].split('x');
  let pr = '';

  if (protocols.length) {
    pr = protocols.join(',');
  }

  const result = {
    mind,
    maxd,
    li,
    sd,
    pt,
    pr,
    viw,
    vih,
    skip,
    pbe
  };

  if (plcmt !== undefined && plcmt !== null) {
    result.vplcmt = plcmt;
  }
  if (api && api.length) {
    result.api = api.join(',');
  }
  if (mimes && mimes.length) {
    result.mimes = mimes.join(',');
  }
  if (playbackmethod && playbackmethod.length) {
    result.pbm = playbackmethod.join(',');
  }

  return result;
}

/**
 * Retrieves the bid floor value, which is the minimum acceptable bid for an ad unit.
 * This function calculates the bid floor based on the given media types and other bidding parameters.
 * @param {Object} mediaTypes - The media types specified for the bid, which might influence floor calculations.
 * @param {number} staticBidFloor - The default or static bid floor set for the bid.
 * @param {Object} bid - The bid object which may contain a method to get dynamic floor values.
 * @returns {Object} An object containing the calculated bid floor and its currency.
 */
function _getFloor(mediaTypes, staticBidFloor, bid) {
  const curMediaType = Object.keys(mediaTypes)[0] || 'banner';
  const bidFloor = { floor: 0, currency: 'USD' };

  if (typeof bid.getFloor === 'function') {
    const { currency, floor } = bid.getFloor({
      mediaType: curMediaType,
      size: '*'
    }) || {};
    floor && (bidFloor.floor = floor);
    currency && (bidFloor.currency = currency);

    if (staticBidFloor && floor && currency === 'USD') {
      bidFloor.floor = Math.max(staticBidFloor, parseFloat(floor));
    }
  } else if (staticBidFloor) {
    bidFloor.floor = staticBidFloor
  }

  return bidFloor;
}

/**
 * Retrieves the device data from the ORTB2 object
 * @param {Object} ortb2Data ORTB2 object
 * @returns {Object} Device data
 */
function _getDeviceData(ortb2Data) {
  const _device = deepAccess(ortb2Data, 'device') || {};

  // set device data params from ortb2
  const _deviceRequestParams = {
    ip: _device.ip,
    ipv6: _device.ipv6,
    ua: _device.ua,
    sua: _device.sua ? JSON.stringify(_device.sua) : undefined,
    dnt: _device.dnt,
    os: _device.os,
    osv: _device.osv,
    dt: _device.devicetype,
    lang: _device.language,
    make: _device.make,
    model: _device.model,
    ppi: _device.ppi,
    pxratio: _device.pxratio,
    foddid: _device?.ext?.fiftyonedegrees_deviceId,
  };

  // return device data params with only non-empty values
  return Object.keys(_deviceRequestParams)
    .reduce((r, key) => {
      if (_deviceRequestParams[key] !== undefined) {
        r[key] = _deviceRequestParams[key];
      }
      return r;
    }, {});
}

/**
 * loops through bannerSizes array to get greatest slot dimensions
 * @param {number[][]} sizes
 * @returns {number[]}
 */
function getGreatestDimensions(sizes) {
  let maxw = 0;
  let maxh = 0;
  let greatestVal = 0;
  sizes.forEach(bannerSize => {
    const [width, height] = bannerSize;
    const greaterSide = width > height ? width : height;
    if ((greaterSide > greatestVal) || (greaterSide === greatestVal && width >= maxw && height >= maxh)) {
      greatestVal = greaterSide;
      maxw = width;
      maxh = height;
    }
  });

  return [maxw, maxh];
}

function getEids(userId) {
  const idProperties = [
    'uid',
    'eid',
    'lipbid',
    'envelope',
    'id'
  ];

  return Object.keys(userId).reduce(function (eids, provider) {
    const eid = userId[provider];
    switch (typeof eid) {
      case 'string':
        eids[provider] = eid;
        break;

      case 'object':
        const idProp = idProperties.filter(prop => eid.hasOwnProperty(prop));
        idProp.length && (eids[provider] = eid[idProp[0]]);
        break;
    }
    return eids;
  }, {});
}

/**
 * Builds requests for bids.
 * @param {validBidRequests[]} validBidRequests - An array of valid bid requests.
 * @param {Object} bidderRequest - The bidder's request information.
 * @returns {Object[]} An array of server requests.
 */
function buildRequests(validBidRequests, bidderRequest) {
  const bids = [];
  const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
  const uspConsent = bidderRequest && bidderRequest.uspConsent;
  const gppConsent = bidderRequest && bidderRequest.gppConsent;
  const timeout = bidderRequest && bidderRequest.timeout
  const coppa = config.getConfig('coppa') === true ? 1 : 0;
  const topWindowUrl = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page;
  const mosttopLocation = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.topmostLocation
  _each(validBidRequests, bidRequest => {
    const {
      bidId,
      mediaTypes = {},
      params = {},
      userId = {},
      ortb2Imp,
      adUnitCode = ''
    } = bidRequest;
    const { currency, floor } = _getFloor(mediaTypes, params.bidfloor, bidRequest);
    const eids = getEids(userId);
    const gpid = deepAccess(ortb2Imp, 'ext.gpid');
    const paapiEligible = deepAccess(ortb2Imp, 'ext.ae') === 1
    let sizes = [1, 1];
    let data = {};
    data.displaymanager = 'Prebid.js - gumgum';
    data.displaymanagerver = '$prebid.version$';
    const date = new Date();
    const lt = date.getTime();
    const to = date.getTimezoneOffset();

    // ADTS-174 Removed unnecessary checks to fix failing test
    data.lt = lt;
    data.to = to;
    function jsoStringifynWithMaxLength(data, maxLength) {
      let jsonString = JSON.stringify(data);
      if (jsonString.length <= maxLength) {
        return jsonString;
      } else {
        const truncatedData = data.slice(0, Math.floor(data.length * (maxLength / jsonString.length)));
        jsonString = JSON.stringify(truncatedData);
        return jsonString;
      }
    }
    // Send filtered pubProvidedId's
    if (userId && userId.pubProvidedId) {
      const filteredData = userId.pubProvidedId.filter(item => pubProvidedIdSources.includes(item.source));
      const maxLength = 1800; // replace this with your desired maximum length
      const truncatedJsonString = jsoStringifynWithMaxLength(filteredData, maxLength);
      data.pubProvidedId = truncatedJsonString
    }
    // ADJS-1286 Read id5 id linktype field
    if (userId && userId.id5id && userId.id5id.uid && userId.id5id.ext) {
      data.id5Id = userId.id5id.uid || null
      data.id5IdLinkType = userId.id5id.ext.linkType || null
    }
    // ADTS-169 add adUnitCode to requests
    if (adUnitCode) data.aun = adUnitCode;

    // ADTS-134 Retrieve ID envelopes
    for (const eid in eids) data[eid] = eids[eid];

    if (mediaTypes.banner) {
      sizes = mediaTypes.banner.sizes;
    } else if (mediaTypes.video) {
      sizes = mediaTypes.video.playerSize;
      data = _getVidParams(mediaTypes.video);
    }

    // ADJS-1024 & ADSS-1297 & ADTS-175
    gpid && (data.gpid = gpid);

    if (pageViewId) {
      data.pv = pageViewId;
    }

    if (floor) {
      data.fp = floor;
      data.fpc = currency;
    }
    if (bidderRequest && bidderRequest.ortb2 && bidderRequest.ortb2.site) {
      setIrisId(data, bidderRequest.ortb2.site, params);
      const curl = bidderRequest.ortb2.site.content?.url;
      if (curl) data.curl = curl;
    }
    if (params.iriscat && typeof params.iriscat === 'string') {
      data.iriscat = params.iriscat;
    }
    if (params.zone || params.pubId) {
      params.zone ? (data.t = params.zone) : (data.pubId = params.pubId);

      data.pi = 2; // inscreen
      // override pi if the following is found
      if (params.slot) {
        const [maxw, maxh] = getGreatestDimensions(sizes);
        data.maxw = maxw;
        data.maxh = maxh;
        data.si = params.slot;
        data.pi = 3;
        data.bf = sizes.reduce((acc, curSlotDim) => `${acc}${acc && ','}${curSlotDim[0]}x${curSlotDim[1]}`, '');
      } else if (params.native) {
        data.ni = params.native;
        data.pi = 5;
      } else if (mediaTypes.video) {
        data.pi = mediaTypes.video.linearity === 2 ? 6 : 7; // invideo : video
      } else if (params.product && params.product.toLowerCase() === 'skins') {
        data.pi = 8;
      }
    } else { // legacy params
      data = { ...data, ...handleLegacyParams(params, sizes) };
    }
    if (paapiEligible) {
      data.ae = paapiEligible
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
    if (gppConsent) {
      data.gppString = bidderRequest.gppConsent.gppString ? bidderRequest.gppConsent.gppString : ''
      data.gppSid = Array.isArray(bidderRequest.gppConsent.applicableSections) ? bidderRequest.gppConsent.applicableSections.join(',') : ''
    } else if (!gppConsent && bidderRequest?.ortb2?.regs?.gpp) {
      data.gppString = bidderRequest.ortb2.regs.gpp
      data.gppSid = Array.isArray(bidderRequest.ortb2.regs.gpp_sid) ? bidderRequest.ortb2.regs.gpp_sid.join(',') : ''
    }
    const dsa = deepAccess(bidderRequest, 'ortb2.regs.ext.dsa');
    if (dsa) {
      data.dsa = JSON.stringify(dsa)
    }
    if (coppa) {
      data.coppa = coppa;
    }
    const schain = bidRequest?.ortb2?.source?.ext?.schain;
    if (schain && schain.nodes) {
      data.schain = _serializeSupplyChainObj(schain);
    }
    const tId = deepAccess(ortb2Imp, 'ext.tid') || deepAccess(bidderRequest, 'ortb2.source.tid') || '';
    data.tId = tId
    Object.assign(
      data,
      _getBrowserParams(topWindowUrl, mosttopLocation),
      _getDeviceData(bidderRequest?.ortb2),
    );

    bids.push({
      id: bidId,
      tmax: timeout,
      tId: tId,
      pi: data.pi,
      selector: params.selector,
      sizes,
      url: BID_ENDPOINT,
      method: 'GET',
      data
    });
  });
  return bids;
}
export function getCids(site) {
  if (site.content && Array.isArray(site.content.data)) {
    for (const dataItem of site.content.data) {
      if (typeof dataItem?.name === 'string' && (dataItem.name.includes('iris.com') || dataItem.name.includes('iris.tv'))) {
        return Array.isArray(dataItem.ext?.cids) ? dataItem.ext.cids.join(',') : '';
      }
    }
  }
  return null;
}
export function setIrisId(data, site, params) {
  const irisID = getCids(site);
  if (irisID) {
    data.irisid = irisID;
  } else {
    // Just adding this chechk for safty and if needed  we can remove
    if (params.irisid && typeof params.irisid === 'string') {
      data.irisid = params.irisid;
    }
  }
}

function handleLegacyParams(params, sizes) {
  const data = {};
  if (params.inScreenPubID) {
    data.pubId = params.inScreenPubID;
    data.pi = 2;
  }
  if (params.inScreen) {
    data.t = params.inScreen;
    data.pi = 2;
  }
  if (params.inSlot) {
    const [maxw, maxh] = getGreatestDimensions(sizes);
    data.maxw = maxw;
    data.maxh = maxh;
    data.si = params.inSlot;
    data.pi = 3;
    data.bf = sizes.reduce((acc, curSlotDim) => `${acc}${acc && ','}${curSlotDim[0]}x${curSlotDim[1]}`, '');
  }
  if (params.ICV) {
    data.ni = params.ICV;
    data.pi = 5;
  }
  if (params.videoPubID) {
    data.pubId = params.videoPubID;
    data.pi = 7;
  }
  if (params.video) {
    data.t = params.video;
    data.pi = 7;
  }
  if (params.inVideo) {
    data.t = params.inVideo;
    data.pi = 6;
  }
  return data;
}

/**
 * Unpack the response from the server into a list of bids.
 *
 * @param {*} serverResponse A successful response from the server.
 * @return {Bid[]} An array of bids which were nested inside the server.
 */
function interpretResponse(serverResponse, bidRequest) {
  const bidResponses = []
  const serverResponseBody = serverResponse.body

  if (!serverResponseBody || serverResponseBody.err) {
    const data = bidRequest.data || {};
    const id = data.si || data.ni || data.t || data.pubId;
    const delayTime = serverResponseBody ? serverResponseBody.err.drt : DELAY_REQUEST_TIME;
    invalidRequestIds[id] = { productId: data.pi, timestamp: new Date().getTime() };

    setTimeout(() => {
      !!invalidRequestIds[id] && delete invalidRequestIds[id];
    }, delayTime);
    logWarn(`[GumGum] Please check the implementation for ${id}`);
  }

  const defaultResponse = {
    ad: {
      price: 0,
      id: 0,
      markup: '',
      width: 0,
      height: 0
    },
    pag: {
      pvid: 0
    },
    meta: {
      adomain: [],
      mediaType: ''
    }
  }
  const {
    ad: {
      price: cpm,
      id: creativeId,
      markup,
      cur,
      width: responseWidth,
      height: responseHeight,
      maxw,
      maxh
    },
    cw: wrapper,
    pag: {
      pvid
    },
    jcsi,
    meta: {
      adomain: advertiserDomains,
      mediaType: type
    }
  } = Object.assign(defaultResponse, serverResponseBody);
  const data = bidRequest.data || {};
  const product = data.pi;
  const mediaType = (product === 6 || product === 7) ? VIDEO : BANNER;
  const isTestUnit = (product === 3 && data.si === 9);
  const metaData = {
    advertiserDomains: advertiserDomains || [],
    mediaType: type || mediaType
  };
  let sizes = parseSizesInput(bidRequest.sizes);
  if (maxw && maxh) {
    sizes = [`${maxw}x${maxh}`];
  } else if (product === 5 && sizes.includes('1x1')) {
    sizes = ['1x1'];
  // added logic for in-slot multi-szie
  } else if ((product === 2 && sizes.includes('1x1')) || product === 3) {
    const requestSizesThatMatchResponse = (bidRequest.sizes && bidRequest.sizes.reduce((result, current) => {
      const [ width, height ] = current;
      if (responseWidth === width && responseHeight === height) result.push(current.join('x'));
      return result
    }, [])) || [];
    sizes = requestSizesThatMatchResponse.length ? requestSizesThatMatchResponse : parseSizesInput(bidRequest.sizes)
  }

  const [width, height] = sizes[0].split('x');

  if (jcsi) {
    serverResponseBody.jcsi = JCSI
  }

  // update Page View ID from server response
  pageViewId = pvid

  if (creativeId) {
    bidResponses.push({
      // dealId: DEAL_ID,
      // referrer: REFERER,
      ad: wrapper ? getWrapperCode(wrapper, Object.assign({}, serverResponseBody, { bidRequest })) : markup,
      ...(mediaType === VIDEO && { ad: markup, vastXml: markup }),
      mediaType,
      cpm: isTestUnit ? 0.1 : cpm,
      creativeId,
      currency: cur || 'USD',
      height,
      netRevenue: true,
      requestId: bidRequest.id,
      ttl: TIME_TO_LIVE,
      width,
      meta: metaData
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
function getUserSyncs(syncOptions, serverResponses) {
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
  gvlid: 61,
  aliases: ALIAS_BIDDER_CODE,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES
}
registerBidder(spec)
