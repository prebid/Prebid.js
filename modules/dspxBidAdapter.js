import { createIframe, deepAccess, logMessage, getBidIdParameter, logError, logWarn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

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

      const mediaTypesInfo = getMediaTypesInfo(bidRequest);
      const type = isBannerRequest(bidRequest) ? BANNER : VIDEO;
      const sizes = mediaTypesInfo[type];

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

      payload.pfilter = params.pfilter ?? {};
      payload.bcat = deepAccess(bidderRequest.ortb2, 'bcat') ? bidderRequest.ortb2.bcat.join(",") : (params.bcat ?? null);
      payload.pcat = deepAccess(bidderRequest.ortb2, 'site.pagecat') ? bidderRequest.ortb2.site.pagecat.join(",") : null;
      payload.dvt = params.dvt ?? null;
      isDev && (payload.prebidDevMode = 1);

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
            payload.vpl[key] = videoParams[key];
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
    return interpretResponse(serverResponse, bidRequest, (bidRequest, response) => newRenderer(bidRequest, response));
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    return handleSyncUrls(syncOptions, serverResponses, gdprConsent);
  }
};

/**
 * Outstream Render Function
 *
 * @param bid
 */
function outstreamRender(bid) {
  logMessage('[DSPx][outstreamRender] bid:', bid);
  try {
    const rendererConfig = (bid.renderer && bid.renderer.config) || {};
    const slot = getBidIdParameter('slot', rendererConfig) || bid.adUnitCode;
    const slotEl = slot && window.document.getElementById(slot);
    if (!slotEl) {
      logError('[DSPx][outstreamRender] Error: slot not found');
      return;
    }
    slotEl.appendChild(createOutstreamEmbedCode(bid));
    if (typeof window.dspxRender === 'function') {
      window.dspxRender(bid);
    } else {
      logError('[DSPx][outstreamRender] Error: dspxRender function is not found');
    }
  } catch (err) {
    logError('[DSPx][outstreamRender] Error:' + err.message);
  }
}

/**
 * Strip executable markup from a response-supplied HTML string.
 * Parse in an inert document so handler attributes never compile against the page.
 */
export function sanitizeOutstreamMarkup(html) {
  const inert = window.document.implementation.createHTMLDocument('');
  inert.body.innerHTML = html || '';
  Array.from(inert.querySelectorAll('script')).forEach((script) => script.remove());
  Array.from(inert.body.querySelectorAll('*')).forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return inert.body.innerHTML;
}

/**
 * Create outstream embed code. Markup from the bid response is placed in a
 * renderer iframe and is never reconstituted as page-level script.
 *
 * @param bid
 * @returns {DocumentFragment}
 */
export function createOutstreamEmbedCode(bid) {
  const fragment = window.document.createDocumentFragment();
  const width = bid.width || '100%';
  const height = bid.height || '100%';
  const iframe = createIframe(window.document, {
    width,
    height
  }, {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    border: '0px'
  });
  iframe.srcdoc = sanitizeOutstreamMarkup(deepAccess(bid, 'renderer.config.code', '') || '');
  fragment.appendChild(iframe);
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
