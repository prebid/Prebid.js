import {
  deepAccess,
  logMessage,
  getBidIdParameter,
  logError,
  logWarn,
  isSafeFrameWindow,
  inIframe,
  getWindowSelf
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { getViewportSize } from '../libraries/viewport/viewport.js';
import { getViewability } from '../libraries/percentInView/percentInView.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { getAdUnitElement } from '../src/utils/adUnits.js';

import {
  fillUsersIds,
  handleSyncUrls,
  objectToQueryString,
  isBannerRequest,
  getVideoContext,
  convertMediaInfoForRequest,
  getMediaTypesInfo,
  getBidFloor,
  siteContentToString,
  assignDefinedValues,
  extractUserSegments,
  interpretResponse
} from '../libraries/dspxUtils/bidderUtils.js';
import { Renderer } from '../src/Renderer.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 */
const BIDDER_CODE = 'dspx';
const ENDPOINT_URL = 'https://buyer.dspx.tv/request/';
const ENDPOINT_URL_DEV = 'https://dcbuyer.dspx.tv/request/';
const GVLID = 602;
const VPL_COMPACT_ARRAY_FIELDS = ['protocols', 'battr', 'playbackmethod', 'delivery', 'api'];
const VIDEO_ORTB_PARAMS = ['maxduration', 'protocols', 'w', 'h', 'startdelay', 'placement', 'plcmt', 'linearity', 'skip',
  'skipafter', 'sequence', 'battr', 'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend', 'delivery', 'pos', 'api'];

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

      const mediaTypesInfo = getMediaTypesInfo(bidRequest);
      const type = isBannerRequest(bidRequest) ? BANNER : VIDEO;
      const sizes = mediaTypesInfo[type];
      const { width: vpWidth, height: vpHeight } = getViewportSize();

      payload = {
        _f: 'auto',
        alternative: 'prebid_js',
        inventory_item_id: placementId,
        srw: sizes ? sizes[0].width : 0,
        srh: sizes ? sizes[0].height : 0,
        vpw: vpWidth,
        vph: vpHeight,
        idt: 100,
        rnd: rnd,
        ref: referrer,
        bid_id: bidId,
        pbver: '$prebid.version$',
      };

      payload.pfilter = params.pfilter ?? {};
      payload.instl = deepAccess(bidRequest.ortb2Imp, 'instl');
      payload.bcat = deepAccess(bidderRequest.ortb2, 'bcat') ? bidderRequest.ortb2.bcat.join(",") : (params.bcat ?? null);
      payload.pcat = deepAccess(bidderRequest.ortb2, 'site.pagecat') ? bidderRequest.ortb2.site.pagecat.join(",") : null;
      payload.dvt = params.dvt ?? null;
      isDev && (payload.prebidDevMode = 1);

      // Frame/Container Context
      payload.topf = inIframe() ? null : 1;
      payload.safeframe = isSafeFrameWindow() ? 1 : null; // SafeFrame API available

      if (bidderRequest && bidderRequest.gdprConsent) {
        if (!payload.pfilter.gdpr_consent) {
          payload.pfilter.gdpr_consent = bidderRequest.gdprConsent.consentString;
          payload.pfilter.gdpr = bidderRequest.gdprConsent.gdprApplies;
        }
      }

      if (!payload.pfilter.floorprice) {
        const bidFloor = getBidFloor(bidRequest);
        if (bidFloor > 0) {
          payload.pfilter.floorprice = bidFloor;
        }
      }

      // Add viewability metrics: sv=svx_svy_svw_svh_svv
      const slotElement = getAdUnitElement(bidRequest);
      if (slotElement) {
        const rect = getBoundingClientRect(slotElement);
        const svx = Math.round(rect.left);
        const svy = Math.round(rect.top);
        const svw = Math.round(rect.width);
        const svh = Math.round(rect.height);
        // self, not top: we also measure inside frames, where top.document throws
        const expectedSize = sizes ? { w: sizes[0].width, h: sizes[0].height } : undefined;
        const svv = Math.round(getViewability(slotElement, getWindowSelf(), expectedSize));
        payload.sv = [svx, svy, svw, svh, svv].join('_');
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
        const videoParams = deepAccess(bidRequest, 'mediaTypes.video');
        Object.keys(videoParams)
          .filter(key => VIDEO_ORTB_PARAMS.includes(key))
          .forEach(key => {
            const value = videoParams[key];
            if (Array.isArray(value) && value.length === 0) {
              return;
            }
            payload.vpl[key] = VPL_COMPACT_ARRAY_FIELDS.includes(key) && Array.isArray(value)
              ? value.join(',')
              : value;
          });
      }

      // iab content
      const content = deepAccess(bidderRequest, 'ortb2.site.content');
      if (content) {
        const stringContent = siteContentToString(content);
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
      const schain = bidRequest?.ortb2?.source?.ext?.schain;
      if (schain && schain.ver && schain.complete && schain.nodes) {
        let schainString = schain.ver + "," + schain.complete;
        for (const node of schain.nodes) {
          schainString += '!' + [
            node.asi ?? '',
            node.sid ?? '',
            node.hp ?? '',
            node.rid ?? '',
            node.name ?? '',
            node.domain ?? '',
          ].join(",");
        }
        payload.schain = schainString;
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
    const bidResponses = interpretResponse(serverResponse, bidRequest, (bidRequest, response) => newRenderer(bidRequest, response));
    bidResponses.forEach(bidResponse => {
      if (!bidResponse.mediaType) {
        bidResponse.mediaType = BANNER;
      }
    });
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    return handleSyncUrls(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent, { enforcePurpose1: true });
  }
};

/**
 * Outstream Render Function
 *
 * @param bid
 */
function outstreamRender(bid) {
  logMessage('[DSPx][outstreamRender] bid:', bid);
  const embedCode = createOutstreamEmbedCode(bid);
  try {
    const inIframe = getBidIdParameter('iframe', bid.renderer.config);
    if (inIframe && window.document.getElementById(inIframe).nodeName === 'IFRAME') {
      const iframe = window.document.getElementById(inIframe);
      const framedoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      framedoc.body.appendChild(embedCode);
      if (typeof window.dspxRender === 'function') {
        window.dspxRender(bid);
      } else {
        logError('[DSPx][outstreamRender] Error: dspxRender function is not found');
      }
      return;
    }

    const slot = getBidIdParameter('slot', bid.renderer.config) || bid.adUnitCode;
    if (slot && window.document.getElementById(slot)) {
      window.document.getElementById(slot).appendChild(embedCode);
      if (typeof window.dspxRender === 'function') {
        window.dspxRender(bid);
      } else {
        logError('[DSPx][outstreamRender] Error: dspxRender function is not found');
      }
    } else if (slot) {
      logError('[DSPx][outstreamRender] Error: slot not found');
    }
  } catch (err) {
    logError('[DSPx][outstreamRender] Error:' + err.message);
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
  const div = window.document.createElement('div');
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
 * Create a new renderer
 *
 * @param bidRequest
 * @param response
 * @returns {Renderer}
 */
function newRenderer(bidRequest, response) {
  logMessage('[DSPx] newRenderer', bidRequest, response);
  const renderer = Renderer.install({
    id: response.renderer.id || response.bid_id,
    url: (bidRequest.params && bidRequest.params.rendererUrl) || response.renderer.url,
    config: response.renderer.options || deepAccess(bidRequest, 'renderer.options'),
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('[DSPx]Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

registerBidder(spec);
