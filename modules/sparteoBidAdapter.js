import { deepAccess, deepSetValue, logWarn, logError, parseSizesInput, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { Renderer } from '../src/Renderer.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 */

const BIDDER_CODE = 'sparteo';
const GVLID = 1028;
const TTL = 60;
const HTTP_METHOD = 'POST';
const REQUEST_URL = `https://bid.sparteo.com/auction?network_id=\${NETWORK_ID}\${SITE_DOMAIN_QUERY}\${APP_DOMAIN_QUERY}\${BUNDLE_QUERY}`;
const USER_SYNC_URL_IFRAME = 'https://sync.sparteo.com/sync/iframe.html?from=prebidjs';
let isSynced = window.sparteoCrossfire?.started || false;

const converter = ortbConverter({
  context: {
    // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: TTL // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    const hasSite = !!request.site;
    const hasApp = !!request.app;
    const root = hasSite ? 'site' : (hasApp ? 'app' : null);

    if (root) {
      deepSetValue(request, `${root}.publisher.ext.params.pbjsVersion`, '$prebid.version$');
      const networkId = bidderRequest?.bids?.[0]?.params?.networkId;
      if (networkId) {
        deepSetValue(request, `${root}.publisher.ext.params.networkId`, networkId);
      }
      const pubId = bidderRequest?.bids?.[0]?.params?.publisherId;
      if (pubId) {
        deepSetValue(request, `${root}.publisher.ext.params.publisherId`, pubId);
      }
    }

    return request;
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    deepSetValue(imp, 'ext.sparteo.params', { ...bidRequest.params });
    imp.ext.sparteo.params.adUnitCode = bidRequest.adUnitCode;

    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = deepAccess(bid, 'ext.prebid.type');

    const response = buildBidResponse(bid, context);

    if (context.mediaType === 'video') {
      // nurl is a win-notification tracker (fired by onBidWon), not a VAST URL. ortbConverter's
      // video processor defaults bidResponse.vastUrl to seatbid.nurl, so override that mapping:
      // vastUrl holds the Prebid Cache URL when present, otherwise null. Left pointing at nurl,
      // a VAST consumer (a GAM VAST-tag-URL line item, IMA SDK, ...) would fetch the tracker as
      // if it were VAST — firing the win notification without a real render.
      response.nurl = bid.nurl;
      response.vastUrl = deepAccess(bid, 'ext.prebid.cache.vastXml.url') ?? null;
    }

    // extract renderer config, if present, and create Prebid renderer
    const rendererConfig = deepAccess(bid, 'ext.prebid.renderer') ?? null;
    if (rendererConfig && rendererConfig.url) {
      response.renderer = createRenderer(rendererConfig);
    }

    return response;
  }
});

function createRenderer(rendererConfig) {
  const renderer = Renderer.install({
    url: rendererConfig.url,
    loaded: false,
    config: {
      ...rendererConfig,
      // Prebid loads the renderer script (ANOutstreamVideo) into the document this callback
      // returns, and the player can only resolve a targetId that exists in that same document.
      // Prefer the render document (e.g. a GAM friendly iframe whose slot only lives inside it),
      // and fall back to the source (parent) document when the slot is not in the render document.
      documentResolver: (bid, sourceDocument, renderDocument) =>
        (renderDocument?.getElementById(bid.adUnitCode) ? renderDocument : sourceDocument) || renderDocument
    }
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Sparteo Bid Adapter: Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function outstreamRender(bid, doc) {
  // `doc` is the document Prebid loaded the renderer script into (see documentResolver above),
  // so ANOutstreamVideo lives on its defaultView and can only resolve a slot that exists in it.
  const renderDoc = doc || document;
  const slot = renderDoc.getElementById(bid.adUnitCode);

  if (!slot) {
    logError(`Sparteo Bid Adapter: outstream renderer could not find the ad slot for adUnitCode '${bid.adUnitCode}'.`);
    return;
  }

  const config = bid.renderer.getConfig() ?? {};
  const win = renderDoc.defaultView || window;

  bid.renderer.push(() => {
    if (!win.ANOutstreamVideo || typeof win.ANOutstreamVideo.renderAd !== 'function') {
      logError('Sparteo Bid Adapter: ANOutstreamVideo is not available on the render window.');
      return;
    }
    try {
      win.ANOutstreamVideo.renderAd({
        targetId: slot.id || bid.adUnitCode, // target div id to render video
        adResponse: {
          ad: {
            video: {
              content: bid.vastXml,
              player_width: bid.width,
              player_height: bid.height
            }
          }
        },
        sizes: [bid.width, bid.height],
        rendererOptions: config.options ?? {}
      });
    } catch (err) {
      logError('Sparteo Bid Adapter: ANOutstreamVideo.renderAd threw an error', err);
    }
  });
}

function replaceMacros(payload, endpoint) {
  const networkId =
    payload?.site?.publisher?.ext?.params?.networkId ??
    payload?.app?.publisher?.ext?.params?.networkId;

  let siteDomain;
  let appDomain;
  let bundle;

  if (payload?.site) {
    siteDomain = payload.site?.domain;
    if (!siteDomain && payload.site?.page) {
      try { siteDomain = new URL(payload.site.page).hostname; } catch (e) { }
    }
    if (siteDomain) {
      siteDomain = siteDomain.trim().split('/')[0].split(':')[0].replace(/^www\./, '');
    } else {
      logWarn('Domain not found. Missing the site.domain or the site.page field');
      siteDomain = 'unknown';
    }
  } else if (payload?.app) {
    appDomain = payload.app?.domain || '';
    if (appDomain) {
      appDomain = appDomain.trim().split('/')[0].split(':')[0].replace(/^www\./, '');
    } else {
      appDomain = 'unknown';
    }

    const raw = payload.app?.bundle ?? '';
    const trimmed = String(raw).trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') {
      logWarn('Bundle not found. Missing the app.bundle field.');
      bundle = 'unknown';
    } else {
      bundle = trimmed;
    }
  }

  const macroMap = {
    NETWORK_ID: networkId ?? '',
    BUNDLE_QUERY: payload?.app ? (bundle ? `&bundle=${encodeURIComponent(bundle)}` : '') : '',
    SITE_DOMAIN_QUERY: siteDomain ? `&site_domain=${encodeURIComponent(siteDomain)}` : '',
    APP_DOMAIN_QUERY: appDomain ? `&app_domain=${encodeURIComponent(appDomain)}` : ''
  };

  return endpoint.replace(
    /\$\{(NETWORK_ID|SITE_DOMAIN_QUERY|APP_DOMAIN_QUERY|BUNDLE_QUERY)\}/g,
    (_, key) => String(macroMap[key] ?? '')
  );
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const bannerParams = deepAccess(bid, 'mediaTypes.banner');
    const videoParams = deepAccess(bid, 'mediaTypes.video');

    if (!bid.params) {
      logError('The bid params are missing');
      return false;
    }

    if (!bid.params.networkId && !bid.params.publisherId) {
      // publisherId is deprecated but is still accepted for now for retrocompatibility purpose.
      logError('The networkId is required');
      return false;
    }

    if (!bannerParams && !videoParams) {
      logError('The placement must be of banner or video type');
      return false;
    }

    /**
     * BANNER checks
     */

    if (bannerParams) {
      const sizes = bannerParams.sizes;

      if (!sizes || parseSizesInput(sizes).length === 0) {
        logError('mediaTypes.banner.sizes must be set for banner placement at the right format.');
        return false;
      }
    }

    /**
     * VIDEO checks
     */

    if (videoParams) {
      if (parseSizesInput(videoParams.playerSize).length === 0) {
        logError('mediaTypes.video.playerSize must be set for video placement at the right format.');
        return false;
      }
    }

    return true;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const payload = converter.toORTB({ bidRequests, bidderRequest });

    const endpoint = bidRequests[0].params.endpoint ? bidRequests[0].params.endpoint : REQUEST_URL;
    const url = replaceMacros(payload, endpoint);

    return {
      method: HTTP_METHOD,
      url: url,
      data: payload
    };
  },

  interpretResponse: function (serverResponse, requests) {
    const bids = converter.fromORTB({ response: serverResponse.body, request: requests.data }).bids;

    return bids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    let syncurl = '';

    if (!isSynced && !window.sparteoCrossfire?.started) {
      // Attaching GDPR Consent Params in UserSync url
      if (gdprConsent) {
        syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
        syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
      }
      if (uspConsent) {
        syncurl += '&usp_consent=' + encodeURIComponent(uspConsent);
      }
      if (gppConsent) {
        syncurl += '&gpp=' + encodeURIComponent(gppConsent.gppString || '');
        syncurl += '&gpp_sid=' + encodeURIComponent((gppConsent.applicableSections || []).join(','));
      }

      if (syncOptions.iframeEnabled) {
        isSynced = true;

        window.sparteoCrossfire = {
          started: true
        };

        return [{
          type: 'iframe',
          url: USER_SYNC_URL_IFRAME + syncurl
        }];
      }
    }
  },

  onTimeout: function (timeoutData) {},

  onBidWon: function (bid) {
    if (bid && bid.nurl) {
      triggerPixel(bid.nurl, null);
    }
  },

  onSetTargeting: function (bid) {}
};

registerBidder(spec);
