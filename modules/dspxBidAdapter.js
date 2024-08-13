import {deepAccess, getBidIdParameter, isFn, logError, logMessage, logWarn, isEmptyStr, isArray} from '../src/utils.js';

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
const VIDEO_ORTB_PARAMS = ['mimes', 'minduration', 'maxduration', 'protocols', 'w', 'h', 'startdelay', 'placement', 'plcmt', 'linearity', 'skip', 'skipmin',
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
        pbver: '$prebid.version$',
      };

      payload.pfilter = {};
      if (params.pfilter !== undefined) {
        payload.pfilter = params.pfilter;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        if (!payload.pfilter.gdpr_consent) {
          payload.pfilter.gdpr_consent = bidderRequest.gdprConsent.consentString;
          payload.pfilter.gdpr = bidderRequest.gdprConsent.gdprApplies;
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

      if (!payload.pfilter.floorprice) {
        let bidFloor = getBidFloor(bidRequest);
        if (bidFloor > 0) {
          payload.pfilter.floorprice = bidFloor;
        }
      }

      if (auctionId) {
        payload.auctionId = auctionId;
      }
      if (pbcode) {
        payload.pbcode = pbcode;
      }

      // media types
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

      // iab content
      let content = deepAccess(bidderRequest, 'ortb2.site.content');
      if (content) {
        let stringContent = siteContentToString(content);
        if (stringContent) {
          payload.pfilter.iab_content = stringContent;
        }
      }

      // Google Topics
      const segments = extractUserSegments(bidderRequest);
      if (segments) {
        assignDefinedValues(payload, {
          segtx: segments.segtax,
          segcl: segments.segclass,
          segs: segments.segments
        });
      }

      // schain
      if (bidRequest.schain) {
        payload.schain = bidRequest.schain;
      }

      // fill userId params
      fillUsersIds(bidRequest, payload);

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

/**
 * Adds userIds to payload
 *
 * @param bidRequest
 * @param payload
 */
function fillUsersIds(bidRequest, payload) {
  if (bidRequest.hasOwnProperty('userId')) {
    let didMapping = {
      did_netid: 'userId.netId',
      did_id5: 'userId.id5id.uid',
      did_id5_linktype: 'userId.id5id.ext.linkType',
      did_uid2: 'userId.uid2',
      did_sharedid: 'userId.sharedid',
      did_pubcid: 'userId.pubcid',
      did_uqid: 'userId.utiq',
      did_cruid: 'userId.criteoid',
      did_euid: 'userId.euid',
      // did_tdid: 'unifiedId',
      did_tdid: 'userId.tdid',
      did_ppuid: function() {
        let path = 'userId.pubProvidedId';
        let value = deepAccess(bidRequest, path);
        if (isArray(value)) {
          for (const rec of value) {
            if (rec.uids && rec.uids.length > 0) {
              for (let i = 0; i < rec.uids.length; i++) {
                if ('id' in rec.uids[i] && deepAccess(rec.uids[i], 'ext.stype') === 'ppuid') {
                  return (rec.uids[i].atype ?? '') + ':' + rec.source + ':' + rec.uids[i].id;
                }
              }
            }
          }
        }
        return undefined;
      },
      did_cpubcid: 'crumbs.pubcid'
    };
    for (let paramName in didMapping) {
      let path = didMapping[paramName];

      // handle function
      if (typeof path == 'function') {
        let value = path(paramName);
        if (value) {
          payload[paramName] = value;
        }
        continue;
      }
      // direct access
      let value = deepAccess(bidRequest, path);
      if (typeof value == 'string' || typeof value == 'number') {
        payload[paramName] = value;
      } else if (typeof value == 'object') {
        // trying to find string ID value
        if (typeof deepAccess(bidRequest, path + '.id') == 'string') {
          payload[paramName] = deepAccess(bidRequest, path + '.id');
        } else {
          if (Object.keys(value).length > 0) {
            logError(`DSPx: WARNING: fillUserIds had to use first key in user object to get value for bid.userId key: ${path}.`);
            payload[paramName] = value[Object.keys(value)[0]];
          }
        }
      }
    }
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
  return str.filter(n => n).join('&');
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

/**
 * Convert site.content to string
 * @param content
 */
function siteContentToString(content) {
  if (!content) {
    return '';
  }
  let stringKeys = ['id', 'title', 'series', 'season', 'artist', 'genre', 'isrc', 'url', 'keywords'];
  let intKeys = ['episode', 'context', 'livestream'];
  let arrKeys = ['cat'];
  let retArr = [];
  arrKeys.forEach(k => {
    let val = deepAccess(content, k);
    if (val && Array.isArray(val)) {
      retArr.push(k + ':' + val.join('|'));
    }
  });
  intKeys.forEach(k => {
    let val = deepAccess(content, k);
    if (val && typeof val === 'number') {
      retArr.push(k + ':' + val);
    }
  });
  stringKeys.forEach(k => {
    let val = deepAccess(content, k);
    if (val && typeof val === 'string') {
      retArr.push(k + ':' + encodeURIComponent(val));
    }
  });
  return retArr.join(',');
}

/**
 * Assigns multiple values to the specified keys on an object if the values are not undefined.
 * @param {Object} target - The object to which the values will be assigned.
 * @param {Object} values - An object containing key-value pairs to be assigned.
 */
function assignDefinedValues(target, values) {
  for (const key in values) {
    if (values[key] !== undefined) {
      target[key] = values[key];
    }
  }
}

/**
 * Extracts user segments/topics from the bid request object
 * @param {Object} bid - The bid request object
 * @returns {{segclass: *, segtax: *, segments: *}|undefined} - User segments/topics or undefined if not found
 */
function extractUserSegments(bid) {
  const userData = deepAccess(bid, 'ortb2.user.data') || [];
  for (const dataObj of userData) {
    if (dataObj.segment && isArray(dataObj.segment) && dataObj.segment.length > 0) {
      const segments = dataObj.segment
        .filter(seg => seg.id && !isEmptyStr(seg.id) && isFinite(seg.id))
        .map(seg => Number(seg.id));
      if (segments.length > 0) {
        return {
          segtax: deepAccess(dataObj, 'ext.segtax'),
          segclass: deepAccess(dataObj, 'ext.segclass'),
          segments: segments.join(',')
        };
      }
    }
  }
  return undefined;
}

registerBidder(spec);
