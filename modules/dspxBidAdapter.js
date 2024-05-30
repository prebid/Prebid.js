import {deepAccess, getBidIdParameter, isFn, logError, logMessage, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import {includes} from '../src/polyfill.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 */

const BIDDER_CODE = 'dspx';
const ENDPOINT_URL = 'https://buyer.dspx.tv/request/';
const ENDPOINT_URL_DEV = 'https://dcbuyer.dspx.tv/request/';
const GVLID = 602;
const VIDEO_ORTB_PARAMS = ['mimes', 'minduration', 'maxduration', 'protocols', 'w', 'h', 'startdelay', 'placement', 'linearity', 'skip', 'skipmin',
  'skipafter', 'sequence', 'battr', 'maxextended', 'minbitrate', 'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend', 'delivery', 'pos', 'companionad',
  'api', 'companiontype', 'ext'];

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    return !!(bid.params.placement);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    let payload = {};
    return validBidRequests.map(bidRequest => {
      const params = bidRequest.params;

      const rnd = Math.floor(Math.random() * 99999999999);
      const referrer = bidderRequest.refererInfo.page;
      const bidId = bidRequest.bidId;
      const pbcode = bidRequest.adUnitCode || false; // div id
      // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
      const auctionId = bidRequest.auctionId || false;
      const isDev = params.devMode || false;

      let endpoint = isDev ? ENDPOINT_URL_DEV : ENDPOINT_URL;
      let placementId = params.placement;

      // dev config
      if (isDev && params.dev) {
        endpoint = params.dev.endpoint || endpoint;
        placementId = params.dev.placement || placementId;
        if (params.dev.pfilter !== undefined) {
          params.pfilter = params.dev.pfilter;
        }
      }

      let mediaTypesInfo = getMediaTypesInfo(bidRequest);
      let type = isBannerRequest(bidRequest) ? BANNER : VIDEO;
      let sizes = mediaTypesInfo[type];

      payload = {
        _f: 'auto',
        alternative: 'prebid_js',
        inventory_item_id: placementId,
        srw: sizes ? sizes[0].width : 0,
        srh: sizes ? sizes[0].height : 0,
        idt: 100,
        rnd: rnd,
        ref: referrer,
        bid_id: bidId,
        pbver: '$prebid.version$'
      };

      if (params.pfilter !== undefined) {
        payload.pfilter = params.pfilter;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        if (payload.pfilter !== undefined) {
          if (!payload.pfilter.gdpr_consent) {
            payload.pfilter.gdpr_consent = bidderRequest.gdprConsent.consentString;
            payload.pfilter.gdpr = bidderRequest.gdprConsent.gdprApplies;
          }
        } else {
          payload.pfilter = {
            'gdpr_consent': bidderRequest.gdprConsent.consentString,
            'gdpr': bidderRequest.gdprConsent.gdprApplies
          };
        }
      }

      if (params.bcat !== undefined) {
        payload.bcat = deepAccess(bidderRequest.ortb2Imp, 'bcat') || params.bcat;
      }
      if (params.dvt !== undefined) {
        payload.dvt = params.dvt;
      }
      if (isDev) {
        payload.prebidDevMode = 1;
      }

      // fill userId params
      if (bidRequest.userId) {
        if (bidRequest.userId.netId) {
          payload.did_netid = bidRequest.userId.netId;
        }
        if (bidRequest.userId.id5id) {
          payload.did_id5 = bidRequest.userId.id5id.uid || '0';
          if (bidRequest.userId.id5id.ext.linkType !== undefined) {
            payload.did_id5_linktype = bidRequest.userId.id5id.ext.linkType;
          }
        }
        let uId2 = deepAccess(bidRequest, 'userId.uid2.id');
        if (uId2) {
          payload.did_uid2 = uId2;
        }
        let sharedId = deepAccess(bidRequest, 'userId.sharedid.id');
        if (sharedId) {
          payload.did_sharedid = sharedId;
        }
        let pubcId = deepAccess(bidRequest, 'userId.pubcid');
        if (pubcId) {
          payload.did_pubcid = pubcId;
        }
        let crumbsPubcid = deepAccess(bidRequest, 'crumbs.pubcid');
        if (crumbsPubcid) {
          payload.did_cpubcid = crumbsPubcid;
        }
      }

      if (bidRequest.schain) {
        payload.schain = bidRequest.schain;
      }

      if (payload.pfilter === undefined || !payload.pfilter.floorprice) {
        let bidFloor = getBidFloor(bidRequest);
        if (bidFloor > 0) {
          if (payload.pfilter !== undefined) {
            payload.pfilter.floorprice = bidFloor;
          } else {
            payload.pfilter = { 'floorprice': bidFloor };
          }
          // payload.bidFloor = bidFloor;
        }
      }

      if (auctionId) {
        payload.auctionId = auctionId;
      }
      if (pbcode) {
        payload.pbcode = pbcode;
      }

      payload.media_types = convertMediaInfoForRequest(mediaTypesInfo);
      if (mediaTypesInfo[VIDEO] !== undefined) {
        payload.vctx = getVideoContext(bidRequest);
        if (params.vastFormat !== undefined) {
          payload.vf = params.vastFormat;
        }
        payload.vpl = {};
        let videoParams = deepAccess(bidRequest, 'mediaTypes.video');
        Object.keys(videoParams)
          .filter(key => includes(VIDEO_ORTB_PARAMS, key))
          .forEach(key => payload.vpl[key] = videoParams[key]);
      }

      return {
        method: 'GET',
        url: endpoint,
        data: objectToQueryString(payload),
      };
    });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    logMessage('DSPx: serverResponse', serverResponse);
    logMessage('DSPx: bidRequest', bidRequest);
    const bidResponses = [];
    const response = serverResponse.body;
    const crid = response.crid || 0;
    const cpm = response.cpm / 1000000 || 0;
    if (cpm !== 0 && crid !== 0) {
      const dealId = response.dealid || '';
      const currency = response.currency || 'EUR';
      const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
      const bidResponse = {
        requestId: response.bid_id,
        cpm: cpm,
        width: response.width,
        height: response.height,
        creativeId: crid,
        dealId: dealId,
        currency: currency,
        netRevenue: netRevenue,
        type: response.type,
        ttl: 60,
        meta: {
          advertiserDomains: response.adomain || []
        }
      };

      if (response.vastUrl) {
        bidResponse.vastUrl = response.vastUrl;
        bidResponse.mediaType = 'video';
      }
      if (response.vastXml) {
        bidResponse.vastXml = response.vastXml;
        bidResponse.mediaType = 'video';
      }
      if (response.renderer) {
        bidResponse.renderer = newRenderer(bidRequest, response);
      }

      if (response.videoCacheKey) {
        bidResponse.videoCacheKey = response.videoCacheKey;
      }

      if (response.adTag) {
        bidResponse.ad = response.adTag;
      }

      if (response.bid_appendix) {
        Object.keys(response.bid_appendix).forEach(fieldName => {
          bidResponse[fieldName] = response.bid_appendix[fieldName];
        });
      }

      bidResponses.push(bidResponse);
    }
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (!serverResponses || serverResponses.length === 0) {
      return [];
    }

    const syncs = []

    let gdprParams = '';
    if (gdprConsent) {
      if ('gdprApplies' in gdprConsent && typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        gdprParams = `gdpr_consent=${gdprConsent.consentString}`;
      }
    }

    if (serverResponses.length > 0 && serverResponses[0].body.userSync) {
      if (syncOptions.iframeEnabled) {
        serverResponses[0].body.userSync.iframeUrl.forEach((url) => syncs.push({
          type: 'iframe',
          url: appendToUrl(url, gdprParams)
        }));
      }
      if (syncOptions.pixelEnabled) {
        serverResponses[0].body.userSync.imageUrl.forEach((url) => syncs.push({
          type: 'image',
          url: appendToUrl(url, gdprParams)
        }));
      }
    }
    return syncs;
  }
}

function appendToUrl(url, what) {
  if (!what) {
    return url;
  }
  return url + (url.indexOf('?') !== -1 ? '&' : '?') + what;
}

function objectToQueryString(obj, prefix) {
  let str = [];
  let p;
  for (p in obj) {
    if (obj.hasOwnProperty(p)) {
      let k = prefix ? prefix + '[' + p + ']' : p;
      let v = obj[p];
      str.push((v !== null && typeof v === 'object')
        ? objectToQueryString(v, k)
        : encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  }
  return str.join('&');
}

/**
 * Check if it's a banner bid request
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {boolean} True if it's a banner bid
 */
function isBannerRequest(bid) {
  return bid.mediaType === 'banner' || !!deepAccess(bid, 'mediaTypes.banner') || !isVideoRequest(bid);
}

/**
 * Check if it's a video bid request
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {boolean} True if it's a video bid
 */
function isVideoRequest(bid) {
  return bid.mediaType === 'video' || !!deepAccess(bid, 'mediaTypes.video');
}

/**
 * Get video sizes
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {object}
 */
function getVideoSizes(bid) {
  return parseSizes(deepAccess(bid, 'mediaTypes.video.playerSize') || bid.sizes);
}

/**
 * Get video context
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {object}
 */
function getVideoContext(bid) {
  return deepAccess(bid, 'mediaTypes.video.context') || 'unknown';
}

/**
 * Get banner sizes
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {object} True if it's a video bid
 */
function getBannerSizes(bid) {
  return parseSizes(deepAccess(bid, 'mediaTypes.banner.sizes') || bid.sizes);
}

/**
 * Parse size
 * @param size
 * @returns {object} sizeObj
 */
function parseSize(size) {
  let sizeObj = {}
  sizeObj.width = parseInt(size[0], 10);
  sizeObj.height = parseInt(size[1], 10);
  return sizeObj;
}

/**
 * Parse sizes
 * @param sizes
 * @returns {{width: number , height: number }[]}
 */
function parseSizes(sizes) {
  if (Array.isArray(sizes[0])) { // is there several sizes ? (ie. [[728,90],[200,300]])
    return sizes.map(size => parseSize(size));
  }
  return [parseSize(sizes)]; // or a single one ? (ie. [728,90])
}

/**
 * Get MediaInfo object for server request
 *
 * @param mediaTypesInfo
 * @returns {*}
 */
function convertMediaInfoForRequest(mediaTypesInfo) {
  let requestData = {};
  Object.keys(mediaTypesInfo).forEach(mediaType => {
    requestData[mediaType] = mediaTypesInfo[mediaType].map(size => {
      return size.width + 'x' + size.height;
    }).join(',');
  });
  return requestData;
}

/**
 * Get media types info
 *
 * @param bid
 */
function getMediaTypesInfo(bid) {
  let mediaTypesInfo = {};

  if (bid.mediaTypes) {
    Object.keys(bid.mediaTypes).forEach(mediaType => {
      if (mediaType === BANNER) {
        mediaTypesInfo[mediaType] = getBannerSizes(bid);
      }
      if (mediaType === VIDEO) {
        mediaTypesInfo[mediaType] = getVideoSizes(bid);
      }
    });
  } else {
    mediaTypesInfo[BANNER] = getBannerSizes(bid);
  }
  return mediaTypesInfo;
}

/**
 * Get Bid Floor
 * @param bid
 * @returns {number|*}
 */
function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'EUR',
      mediaType: '*',
      size: '*',
    });
    return bidFloor.floor;
  } catch (_) {
    return 0
  }
}

/**
 * Create a new renderer
 *
 * @param bidRequest
 * @param response
 * @returns {Renderer}
 */
function newRenderer(bidRequest, response) {
  logMessage('DSPx: newRenderer', bidRequest, response);
  const renderer = Renderer.install({
    id: response.renderer.id || response.bid_id,
    url: (bidRequest.params && bidRequest.params.rendererUrl) || response.renderer.url,
    config: response.renderer.options || deepAccess(bidRequest, 'renderer.options'),
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

/**
 * Outstream Render Function
 *
 * @param bid
 */
function outstreamRender(bid) {
  logMessage('DSPx: outstreamRender bid:', bid);
  const embedCode = createOutstreamEmbedCode(bid);
  try {
    const inIframe = getBidIdParameter('iframe', bid.renderer.config);
    if (inIframe && window.document.getElementById(inIframe).nodeName === 'IFRAME') {
      const iframe = window.document.getElementById(inIframe);
      let framedoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      framedoc.body.appendChild(embedCode);
      if (typeof window.dspxRender === 'function') {
        window.dspxRender(bid);
      } else {
        logError('[dspx][renderer] Error: dspxRender function is not found');
      }
      return;
    }

    const slot = getBidIdParameter('slot', bid.renderer.config) || bid.adUnitCode;
    if (slot && window.document.getElementById(slot)) {
      window.document.getElementById(slot).appendChild(embedCode);
      if (typeof window.dspxRender === 'function') {
        window.dspxRender(bid);
      } else {
        logError('[dspx][renderer] Error: dspxRender function is not found');
      }
    } else if (slot) {
      logError('[dspx][renderer] Error: slot not found');
    }
  } catch (err) {
    logError('[dspx][renderer] Error:' + err.message)
  }
}

/**
 * create Outstream Embed Code Node
 *
 * @param bid
 * @returns {DocumentFragment}
 */
function createOutstreamEmbedCode(bid) {
  const fragment = window.document.createDocumentFragment();
  let div = window.document.createElement('div');
  div.innerHTML = deepAccess(bid, 'renderer.config.code', '');
  fragment.appendChild(div);

  // run scripts
  var scripts = div.getElementsByTagName('script');
  var scriptsClone = [];
  for (var idx = 0; idx < scripts.length; idx++) {
    scriptsClone.push(scripts[idx]);
  }
  for (var i = 0; i < scriptsClone.length; i++) {
    var currentScript = scriptsClone[i];
    var s = document.createElement('script');
    for (var j = 0; j < currentScript.attributes.length; j++) {
      var a = currentScript.attributes[j];
      s.setAttribute(a.name, a.value);
    }
    s.appendChild(document.createTextNode(currentScript.innerHTML));
    currentScript.parentNode.replaceChild(s, currentScript);
  }

  return fragment;
}

registerBidder(spec);
