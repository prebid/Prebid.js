import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { toOrtbNativeRequest } from '../src/native.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js';
import { deepSetValue, deepAccess, mergeDeep, getUniqueIdentifierStr, logMessage, logWarn, logError } from '../src/utils.js';
import { EVENT_TYPE_IMPRESSION, TRACKER_METHOD_IMG } from '../src/eventTrackers.js';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300
  },
  processors: pbsExtensions,
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    // Add publisherId to site or app
    addOrtbPublisherData(request, context.bidRequests || []);

    return request;
  },
  imp(buildImp, bidRequest, context) {
    if (bidRequest?.params?.placementId) {
      bidRequest.ortb2Imp = bidRequest.ortb2Imp || {};
      bidRequest.ortb2Imp.ext = bidRequest.ortb2Imp.ext || {};
      bidRequest.ortb2Imp.ext.prebid = bidRequest.ortb2Imp.ext.prebid || {};
      bidRequest.ortb2Imp.ext.prebid.storedrequest = bidRequest.ortb2Imp.ext.prebid.storedrequest || {};
      bidRequest.ortb2Imp.ext.prebid.storedrequest.id = bidRequest.params.placementId;
    }

    const imp = buildImp(bidRequest, context);

    // The pbsExtensions params processor sets imp.ext.prebid.bidder.ocm = bid.params, which makes
    // PBS try to call a server-side bidder named "ocm" with those params instead of resolving demand
    // from the stored request — that is what breaks the OCM setup. Remove only that field; the rest
    // of imp.ext.prebid (storedrequest, the price-floors floorMin set by setImpExtPrebidFloors, and
    // adunitcode) is valid for PBS and passes through. imp.bidfloor / imp.bidfloorcur live at the imp
    // root, are populated by the price-floors module, and are untouched here.
    if (imp?.ext?.prebid?.bidder) {
      delete imp.ext.prebid.bidder;
    }

    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);

    // Attach the OCM outstream video renderer here rather than in interpretResponse: the converter
    // exposes context.bidRequest (the original Prebid bid request, matched to this bid by imp id),
    // which is the only place the video context (outstream vs instream) is known. interpretResponse
    // only receives the ServerRequest, so it cannot tell which bids are outstream.
    maybeAttachOutstreamRenderer(bidResponse, context.bidRequest);

    // Register the impression event URL PBS returns at bid.ext.prebid.events.imp as an ORTB event
    // tracker so Prebid core fires it at billing time. The matching win URL is registered upstream by
    // the shared pbsExtensions processor (addEventTrackers). See addPbsEventTrackers.
    addPbsEventTrackers(bidResponse, bid);

    return bidResponse;
  }
});

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

/**
 * OCM bidder-specific parameters (the adapter's public interface). The type is declared in the
 * co-located ocmBidAdapter.d.ts, which also augments the global `BidderParams` map so `adUnit.bids[]`
 * with `bidder: 'ocm'` are typed. Importing it here pulls the declaration into the TS program.
 * @typedef {import('./ocmBidAdapter.d.ts').OcmBidParams} OcmBidParams
 */

const ENDPOINT = 'https://pbam.orangeclickmedia.com/openrtb2/auction';

// getUserSyncs can only emit GET descriptors, but PBS /cookie_sync is POST-only. Syncing is
// therefore routed through a GET-renderable loader page (hosted on the OCM origin) that POSTs to
// /cookie_sync and drops the per-bidder sync pixels it returns. See ocmBidAdapter.md and the
// reference loader in tasks/cookie_sync.html.
const USER_SYNC_LOADER = 'https://pbam.orangeclickmedia.com/static/cookie_sync.html';

// Maximum number of bidders forwarded to a single cookie_sync (mirrors the cookie_sync `limit`).
const MAX_SYNC_COUNT = 10;

const BIDDER_CODE = 'ocm';

const GVLID = 1148;

// Outstream video renderer. OCM outstream bids are rendered client-side by the OCM Video Player;
// Prebid's Renderer lazily loads this script (via loadExternalScript) the first time such a bid
// renders, and it exposes the global `window.OcmPlayer(containerId, config, callback)`. Instream
// video is deliberately left to the publisher's own player / ad server, so no renderer is attached
// for it. The same player is used as a custom renderer in the OCM prebid wrapper (dsg-core).
const RENDERER_URL = 'https://cdn.orangeclickmedia.com/tech/libs/ocm-player.js';

/**
 * Checks if the bid request includes video media type
 * @param {BidRequest} bid - The bid request object to check
 * @returns {boolean} True if video media type is present, false otherwise
 */
function hasTypeVideo(bid) {
  return typeof bid.mediaTypes !== 'undefined' && typeof bid.mediaTypes.video !== 'undefined';
}

/**
 * Determines if the native request uses ORTB (OpenRTB) format
 * @param {BidRequest} bidRequest - The bid request to check
 * @returns {boolean} True if using ORTB native format, false otherwise
 */
function isNativeOrtbVersion(bidRequest) {
  return bidRequest.mediaTypes.native.ortb && typeof bidRequest.mediaTypes.native.ortb === 'object';
}

/**
 * Validates a native asset object according to ORTB native spec
 * Checks for required fields: id, content (title/img/data/video), and type-specific requirements
 * @param {Object} asset - The native asset to validate
 * @returns {boolean} True if the asset is valid, false otherwise
 */
function isValidAsset(asset) {
  // Asset must have a valid integer ID
  if (!asset.hasOwnProperty('id') || !Number.isInteger(asset.id)) {
    return false;
  }

  // Asset must contain at least one content type
  const hasValidContent = asset.title || asset.img || asset.data || asset.video;
  if (!hasValidContent) {
    return false;
  }

  // Title assets must have a valid length
  if (asset.title && (!asset.title.len || !Number.isInteger(asset.title.len))) {
    return false;
  }

  // Data assets must have a valid type
  if (asset.data && (!asset.data.type || !Number.isInteger(asset.data.type))) {
    return false;
  }

  // Video assets must have required fields: mimes, duration constraints, and protocols.
  // Duration bounds are checked with Number.isInteger so a legitimate minduration/maxduration of 0
  // is not mistakenly rejected as falsy.
  if (asset.video && (!asset.video.mimes || !Number.isInteger(asset.video.minduration) || !Number.isInteger(asset.video.maxduration) || !asset.video.protocols)) {
    return false;
  }

  return true;
}

/**
 * Validates a native event tracker object according to ORTB native spec
 * Checks for required event type and tracking methods
 * @param {Object} et - The event tracker to validate
 * @returns {boolean} True if the event tracker is valid, false otherwise
 */
function isValidEventTracker(et) {
  // Event tracker must have a valid event type (integer) and at least one method
  if (!et.event || !Number.isInteger(et.event) || !Array.isArray(et.methods) || et.methods.length === 0) {
    return false;
  }

  return true;
}

/**
 * Validates a bid request for a specific media type
 * @param {string} type - The media type to validate (BANNER, VIDEO, or NATIVE)
 * @param {BidRequest} bid - The bid request to validate
 * @returns {boolean} True if the bid is valid for the specified media type, false otherwise
 */
function isValid(type, bid) {
  // Banner bids must declare at least one size
  if (type === BANNER) {
    return hasBannerSizes(bid);
  }

  // Video bids must have a valid context (outstream/instream) and at least one player size
  if (type === VIDEO && hasTypeVideo(bid)) {
    const context = bid.mediaTypes.video.context;
    if (context === 'outstream' || context === 'instream') {
      return hasVideoSize(bid);
    }
  }

  // Native bids must have valid assets and optionally valid event trackers
  if (type === NATIVE) {
    // Read mediaTypes.native defensively: isValid(NATIVE, ...) is evaluated for every bid (see
    // isBidRequestValid), including banner/video bids or malformed bids with no mediaTypes at all, so
    // the presence check must not assume mediaTypes exists (mirrors hasBannerSizes / hasTypeVideo).
    const native = bid?.mediaTypes?.native;
    if (typeof native !== 'object' || native === null) {
      return false;
    }

    // Handle legacy native params by converting to ORTB format
    if (!isNativeOrtbVersion(bid)) {
      if (bid.nativeParams === undefined) return false;
      const ortbConversion = toOrtbNativeRequest(bid.nativeParams);
      return ortbConversion && ortbConversion.assets &&
        Array.isArray(ortbConversion.assets) && ortbConversion.assets.length > 0 &&
        ortbConversion.assets.every(asset => isValidAsset(asset));
    }

    // Validate ORTB native format
    let isValidAssets = false;
    let isValidEventTrackers;

    const assets = bid.mediaTypes.native?.ortb?.assets;
    const eventTrackers = bid.mediaTypes.native?.ortb?.eventtrackers;

    // At least one valid asset is required
    if (assets && Array.isArray(assets) && assets.length > 0 && assets.every(asset => isValidAsset(asset))) {
      isValidAssets = true;
    }

    // Event trackers are optional, but if present must be valid
    if (eventTrackers && Array.isArray(eventTrackers) && eventTrackers.length > 0) {
      isValidEventTrackers = eventTrackers.every(eventTracker => isValidEventTracker(eventTracker));
    } else {
      isValidEventTrackers = true;
    }
    return isValidAssets && isValidEventTrackers;
  }

  return false;
}

/**
 * Determines whether a bid declares at least one banner size.
 * Reads mediaTypes.banner.sizes — the shape Prebid core normalizes ad-unit sizes into. The actual
 * ORTB sizes are built by ortbConverter; this is only a presence check for validation, so no size
 * objects are allocated here.
 * @param {BidRequest} bid - The bid request object
 * @returns {boolean} True if at least one banner size is present, false otherwise
 */
function hasBannerSizes(bid) {
  const sizes = bid?.mediaTypes?.banner?.sizes;
  return Array.isArray(sizes) && sizes.length > 0;
}

/**
 * Determines whether a video bid declares at least one player size.
 * @param {BidRequest} bid - The bid request object with video media type
 * @returns {boolean} True if at least one player size is present, false otherwise
 */
function hasVideoSize(bid) {
  const playerSize = bid?.mediaTypes?.video?.playerSize;
  return Array.isArray(playerSize) && playerSize.length > 0;
}

/**
 * Determines whether or not the given bid request is valid.
 * Validates required parameters (publisherId, placementId) and media type specifications.
 * @param {BidRequest} bid - The bid request object to validate
 * @returns {boolean} True if this is a valid bid with all required params and at least one valid media type, false otherwise
 */
function isBidRequestValid(bid) {
  if (!bid?.params) {
    return false;
  }

  /** @type {OcmBidParams} */
  const params = bid.params;
  // publisherId and placementId are both required and must be strings
  if (typeof params.publisherId !== 'string' || typeof params.placementId !== 'string') {
    return false;
  }

  // Bid must be valid for at least one supported media type
  return isValid(BANNER, bid) || isValid(VIDEO, bid) || isValid(NATIVE, bid);
}

/**
 * Adds publisher identification data to the OpenRTB request
 * Merges publisherId from bid params into the site or app publisher object
 * @param {Object} data - The OpenRTB request data object
 * @param {Array<BidRequest>} bidRequests - Array of bid requests containing publisher params
 * @returns {void}
 */
function addOrtbPublisherData(data, bidRequests) {
  const params = bidRequests[0]?.params || {};
  const key = data.app ? 'app' : 'site';

  // Set the publisher id unconditionally so it is attached even when the converter/FPD
  // did not pre-seed a publisher object (deepSetValue creates the intermediate objects).
  if (params.publisherId) {
    deepSetValue(data, `${key}.publisher.id`, params.publisherId);
  }
}

/**
 * Constructs server requests from the list of valid bid requests.
 * Builds OpenRTB-formatted requests to send to the OCM bid server.
 * @param {Array<BidRequest>} bidRequests - Array of valid bid requests
 * @param {Object} bidderRequest - Additional data for the bidder request (referer, GDPR consent, etc.)
 * @returns {ServerRequest} Server request object with url, method, and data
 */
function buildRequests(bidRequests, bidderRequest) {
  const ortbRequest = converter.toORTB({ bidderRequest, bidRequests });

  return {
    method: 'POST',
    url: ENDPOINT,
    data: ortbRequest,
  };
}

/**
 * Parses the server response and converts it into bid response objects.
 * Interprets OpenRTB bid responses and maps them to Prebid bid objects.
 * @param {Object} response - The server's response object
 * @param {Object} request - The original bidder request for reference
 * @returns {Array} Array of bid response objects
 */
function interpretResponse(response, request) {
  // Return the bids array (not the converter's wrapper object): bidderFactory only treats a wrapper
  // as a BidderAuctionResponse when its keys are limited to bids/paapi, so returning the array is
  // the robust, conventional contract. Every bid is attributed to OCM — PBS resolves demand from
  // real server-side seats, and Prebid would otherwise drop those bids as alternate bidder codes.
  const { bids = [] } = converter.fromORTB({ request: request.data, response: response.body });
  bids.forEach((bid) => {
    bid.bidderCode = BIDDER_CODE;
  });
  return bids;
}

/**
 * Registers user syncs (cookie syncing) for OCM's Prebid Server.
 *
 * Because `getUserSyncs` can only return GET descriptors while PBS `/cookie_sync` is POST-only, the
 * sync is routed through a GET-renderable loader page (USER_SYNC_LOADER) hosted on the OCM origin.
 * This adapter hands the loader the participating bidder list and consent signals; the loader then
 * POSTs to `/cookie_sync` (with credentials) and drops the per-bidder sync pixels it returns.
 *
 * The bidder list comes from the auction response (`ext.responsetimemillis` keys, plus any seatbid
 * seats) — i.e. the bidders PBS actually invoked for the stored request — because the client has no
 * visibility into the stored request's contents.
 *
 * @param {Object} syncOptions - Allowed sync types. The loader itself is delivered as an iframe, and
 *   the enabled types (iframeEnabled/pixelEnabled) are forwarded to it so it only drops syncs of a type
 *   the publisher permitted.
 * @param {Array} serverResponses - Auction responses; source of the participating bidder list
 * @param {Object} gdprConsent - GDPR consent data (gdprApplies, consentString)
 * @param {string} uspConsent - US privacy (CCPA) consent string
 * @param {Object} gppConsent - GPP consent data (gppString, applicableSections)
 * @returns {Array<{type: string, url: string}>} A single iframe sync to the loader, or empty if disabled / no bidders
 */
function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
  // The loader is an HTML page, so it can only be delivered as an iframe sync; if iframe syncing is
  // disabled there is nothing to return. The sync types the loader is then allowed to actually drop
  // (iframe vs image/redirect) are constrained by the `filter` it is passed below, derived from
  // syncOptions, so a disabled sync type never fires from inside the loader iframe.
  if (!syncOptions.iframeEnabled) {
    return [];
  }

  // PBS reports the bidders it invoked for the stored request in the auction response.
  const bidders = new Set();
  (serverResponses || []).forEach((response) => {
    const body = response?.body;
    Object.keys(body?.ext?.responsetimemillis || {}).forEach((bidder) => bidders.add(bidder));
    (body?.seatbid || []).forEach((seatbid) => {
      if (seatbid?.seat) bidders.add(seatbid.seat);
    });
  });

  if (bidders.size === 0) {
    return [];
  }

  // Forward the sync policy Prebid authorised so the loader can constrain its PBS /cookie_sync POST
  // (filterSettings + coopSync) instead of dropping whatever PBS returns into the hidden iframe.
  // Without this, image/redirect syncs (when only iframe is enabled) or cooperatively-synced bidders
  // the publisher never authorised would still fire from inside the loader iframe. iframe is always
  // allowed at this point (we returned early otherwise); image is allowed only when pixelEnabled.
  const filter = syncOptions.pixelEnabled ? 'iframe,image' : 'iframe';

  const params = [
    `bidders=${encodeURIComponent([...bidders].slice(0, MAX_SYNC_COUNT).join(','))}`,
    `limit=${MAX_SYNC_COUNT}`,
    `filter=${encodeURIComponent(filter)}`,
    // Prebid only authorised syncing the bidders that participated in this auction, so disable PBS
    // cooperative syncing (which would sync additional, unrequested bidders).
    'coopSync=0'
  ];

  // The cookie_sync `account` is taken solely from the account PBS echoes in the auction response
  // (ext.account), which is scoped to exactly these responses. Deriving it per-auction here — rather
  // than from a shared module-level value captured in buildRequests — is what keeps overlapping OCM
  // auctions (or multiple pbjs instances) from leaking one auction's publisher account into another's
  // sync. OCM's PBS echoes ext.account for this purpose.
  const account = (serverResponses || [])
    .map((response) => response?.body?.ext?.account)
    .find(Boolean);
  if (account) {
    params.push(`account=${encodeURIComponent(account)}`);
  }

  if (gdprConsent) {
    if (gdprConsent.gdprApplies !== undefined) {
      params.push(`gdpr=${gdprConsent.gdprApplies ? 1 : 0}`);
    }
    if (gdprConsent.consentString) {
      params.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`);
    }
  }

  if (uspConsent) {
    params.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
  }

  if (gppConsent) {
    if (gppConsent.gppString) {
      params.push(`gpp=${encodeURIComponent(gppConsent.gppString)}`);
    }
    if (Array.isArray(gppConsent.applicableSections) && gppConsent.applicableSections.length > 0) {
      params.push(`gpp_sid=${encodeURIComponent(gppConsent.applicableSections.join(','))}`);
    }
  }

  return [{ type: 'iframe', url: `${USER_SYNC_LOADER}?${params.join('&')}` }];
}

/**
 * Determines whether a bid request is an outstream video placement. Only outstream needs a
 * client-side renderer: instream video is played by the publisher's own video player / ad server,
 * while banner and native are rendered by Prebid core.
 * @param {BidRequest} bidRequest - The originating bid request
 * @returns {boolean} True if mediaTypes.video.context === 'outstream'
 */
function isOutstreamVideo(bidRequest) {
  return deepAccess(bidRequest, 'mediaTypes.video.context') === 'outstream';
}

/**
 * Determines whether a renderer object counts as a publisher-supplied renderer. This mirrors Prebid
 * core's isRendererPreferredFromAdUnit (src/Renderer.js), which only prefers an ad-unit/mediaType
 * renderer that defines BOTH `url` and `render`. In particular, the documented OCM override shape
 * `mediaTypes.video.renderer.options` (an options-only holder with no `url`/`render`) is NOT a
 * publisher renderer, so it must not suppress the OCM renderer.
 * @param {Object} [renderer] - A candidate renderer (ad unit or mediaTypes.video level)
 * @returns {boolean} True if it is a real publisher renderer that should take precedence
 */
function isPublisherRenderer(renderer) {
  return !!(renderer && renderer.url && renderer.render && renderer.backupOnly !== true);
}

/**
 * Determines whether the OCM renderer should be installed on a bid. It is skipped only when the
 * publisher supplied their own real renderer (at the ad unit or mediaTypes.video level) that is not
 * flagged backupOnly, so the publisher's renderer wins. An options-only renderer holder (the
 * documented `mediaTypes.video.renderer.options` override) does not count and still gets the OCM
 * renderer, matching the precedence Prebid core enforces at render time (isRendererPreferredFromAdUnit).
 * @param {BidRequest} bidRequest - The originating bid request
 * @returns {boolean} True if the OCM renderer should be installed
 */
function shouldAttachRenderer(bidRequest) {
  return !(isPublisherRenderer(bidRequest?.renderer) ||
    isPublisherRenderer(deepAccess(bidRequest, 'mediaTypes.video.renderer')));
}

/**
 * Attaches the OCM outstream video renderer to a bid response when applicable, mutating it in place.
 * No-op for non-video bids, instream video, or when a publisher renderer takes precedence.
 * @param {Object} bidResponse - The bid response built by the ORTB converter
 * @param {BidRequest} [bidRequest] - The originating bid request (context.bidRequest)
 * @returns {void}
 */
function maybeAttachOutstreamRenderer(bidResponse, bidRequest) {
  if (!bidResponse || bidResponse.mediaType !== VIDEO || !bidRequest) {
    return;
  }
  if (isOutstreamVideo(bidRequest) && shouldAttachRenderer(bidRequest)) {
    bidResponse.renderer = createRenderer(bidRequest);
  }
}

/**
 * Builds a (not-yet-loaded) Prebid Renderer for an outstream video bid. The Renderer lazily loads
 * RENDERER_URL via loadExternalScript on first render, then calls ocmOutstreamRender. Publisher
 * overrides from mediaTypes.video.renderer.options (or params.rendererConfig) are stored on the
 * renderer config and deep-merged into the player config at render time.
 * @param {BidRequest} bidRequest - The originating bid request
 * @returns {Renderer} The configured renderer
 */
function createRenderer(bidRequest) {
  const config = deepAccess(bidRequest, 'mediaTypes.video.renderer.options') ||
    deepAccess(bidRequest, 'params.rendererConfig') || {};

  const renderer = Renderer.install({
    id: bidRequest.adUnitCode,
    url: RENDERER_URL,
    config,
    adUnitCode: bidRequest.adUnitCode,
    loaded: false
  });

  try {
    renderer.setRender(ocmOutstreamRender);
  } catch (e) {
    logError(`${BIDDER_CODE}: error calling setRender on outstream renderer`, e);
  }

  return renderer;
}

/**
 * Renderer entry point Prebid invokes when an outstream bid wins and must be displayed. Rendering is
 * deferred via renderer.push so the player call only runs once RENDERER_URL has loaded and
 * window.OcmPlayer is defined (push buffers the call until then; see src/Renderer.js).
 * @param {Object} bid - The winning bid (vastUrl/vastXml, playerWidth/playerHeight, adUnitCode, renderer)
 * @param {Document} [doc] - Document Prebid wants the ad rendered into (defaults to window.document)
 * @returns {void}
 */
function ocmOutstreamRender(bid, doc) {
  bid.renderer.push(() => renderOcmPlayer(bid, doc));
}

/**
 * Instantiates the OCM Video Player for an outstream bid. Locates the ad slot by adUnitCode, injects
 * a dedicated wrapper element (so the player cannot clobber sibling slot content), builds the player
 * config from the bid, and calls the global window.OcmPlayer(containerId, config, callback).
 * @param {Object} bid - The winning bid
 * @param {Document} [doc] - Target document (defaults to window.document)
 * @returns {void}
 */
function renderOcmPlayer(bid, doc) {
  const ownerDocument = doc || document;

  if (typeof window.OcmPlayer !== 'function') {
    logError(`${BIDDER_CODE}: window.OcmPlayer unavailable; cannot render outstream bid for ${bid?.adUnitCode}`);
    return;
  }

  const slot = ownerDocument.getElementById(bid.adUnitCode);
  if (!slot) {
    logError(`${BIDDER_CODE}: outstream container '${bid.adUnitCode}' not found`);
    return;
  }

  // Render into a dedicated child element so repeat renders / multiple slots cannot collide.
  const wrapper = ownerDocument.createElement('div');
  wrapper.id = `ocm-player-wrapper-${bid.adId || getUniqueIdentifierStr()}`;
  slot.appendChild(wrapper);

  try {
    window.OcmPlayer(wrapper.id, buildOcmPlayerConfig(bid), () => {
      logMessage(`${BIDDER_CODE}: OCM player ready for ad unit ${bid.adUnitCode}`);
    });
  } catch (e) {
    logError(`${BIDDER_CODE}: OCM player failed to render for ${bid.adUnitCode}`, e);
  }
}

/**
 * Builds the OCM Video Player config for an outstream bid, mirroring the defaults used by OCM's
 * prebid wrapper (in-article outstream, muted autoplay, collapse on completion). The VAST source —
 * preferring the hosted bid.vastUrl and falling back to inline bid.vastXml — is injected as the
 * preroll, and the player is sized from the bid's player/creative dimensions. Publisher overrides
 * stored on the renderer config are deep-merged last so they take precedence.
 * @param {Object} bid - The winning bid
 * @returns {Object} The config object passed to window.OcmPlayer
 */
function buildOcmPlayerConfig(bid) {
  const overrides = (typeof bid.renderer?.getConfig === 'function' && bid.renderer.getConfig()) || {};

  const width = bid.playerWidth || bid.width;
  const height = bid.playerHeight || bid.height;
  const vast = bid.vastUrl || bid.vastXml;

  const config = {
    player: {
      outstream: { type: 'in-article' },
      titleBar: false,
      playAds: true,
      autoplay: true,
      autoplayInview: true,
      autoplayInviewPct: 50,
      pauseWhenOutOfViewport: false,
      volume: true,
      fullscreen: false,
      controls: true,
      controlsTimeout: 500,
      autohideAdControls: true,
      startVolume: 0,
      muted: true,
      onVideoEnd: 'collapse'
    },
    playlist: [],
    ads: {
      data: {},
      preroll: [{ waterfall: [{ vast: { url: vast } }] }],
      prebid: { enabled: false }
    }
  };

  if (width != null) {
    config.player.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height != null) {
    config.player.height = typeof height === 'number' ? `${height}px` : height;
  }

  return mergeDeep(config, overrides);
}

/**
 * Registers the impression event URL PBS returns on a bid at `bid.ext.prebid.events.imp` as an ORTB
 * event tracker on the bid response, so Prebid core fires it at the protocol-defined time instead of
 * this adapter pinging it directly. It is added as an EVENT_TYPE_IMPRESSION image pixel, which core
 * fires when the bid is billed — on render for a normal ad unit, or on `pbjs.triggerBilling()` for a
 * unit that defers billing (adapterManager.triggerBilling, invoked from auction addWinningBid).
 *
 * The win URL (`bid.ext.prebid.events.win`) is intentionally not handled here: the shared pbsExtensions
 * processor (addEventTrackers in libraries/pbsExtensions/processors/eventTrackers.js) already maps it
 * to an EVENT_TYPE_WIN tracker, which core fires the moment the bid wins (markWinningBid in
 * src/adRendering). That processor does not map `events.imp` — the impression URL this fills in.
 *
 * The dedup guard is still needed on the impression path: that same shared processor maps a legacy
 * `bid.burl` to an EVENT_TYPE_IMPRESSION tracker, so when PBS sets `burl` to the same `/event` URL it
 * puts in `events.imp`, skipping the duplicate avoids firing the impression twice. For video, PBS
 * injects the impression tracker into the VAST server-side, so `events.imp` is normally absent on
 * video bids and nothing is added for them.
 * @param {Object} bidResponse - The bid response built by the ORTB converter (mutated in place)
 * @param {Object} bid - The raw ORTB bid, source of ext.prebid.events.imp
 * @returns {void}
 */
function addPbsEventTrackers(bidResponse, bid) {
  const impUrl = bid?.ext?.prebid?.events?.imp;
  if (!bidResponse || !impUrl) {
    return;
  }

  bidResponse.eventtrackers = bidResponse.eventtrackers || [];
  const alreadyTracked = bidResponse.eventtrackers.some(
    (tracker) => tracker.event === EVENT_TYPE_IMPRESSION && tracker.method === TRACKER_METHOD_IMG && tracker.url === impUrl
  );
  if (!alreadyTracked) {
    bidResponse.eventtrackers.push({ method: TRACKER_METHOD_IMG, event: EVENT_TYPE_IMPRESSION, url: impUrl });
  }
}

// No onBidWon handler is registered. OCM's billing URL (bid.burl) is turned into an ORTB
// EVENT_TYPE_IMPRESSION tracker by the shared pbsExtensions processor (see addPbsEventTrackers), and
// Prebid core fires that tracker exactly once at billing time (adapterManager.triggerBilling). Firing
// burl again from onBidWon would double-count the billing event. The win-notice URL (bid.nurl) is
// likewise consumed by the ORTB converter per media type (a render pixel for banner, the creative URL
// for video/audio), so the adapter never pings it directly either.

/**
 * Logs a warning when OCM bid request(s) time out. Auction analytics are reported separately by
 * the OCM analytics adapter (ocmPbaAdapter), so this handler is log-only to aid debugging and
 * deliberately performs no network calls (avoiding duplicate event reporting).
 * @param {Array<Object>} timeoutData - Array of timeout information objects
 * @returns {void}
 */
function onTimeout(timeoutData) {
  logWarn(`${BIDDER_CODE}: bid request(s) timed out`, timeoutData);
}

/**
 * Logs an error when the OCM server responds with an error. Log-only for debugging; no network
 * calls are made because analytics are handled by the OCM analytics adapter (ocmPbaAdapter).
 * @param {Object} args - Error context
 * @param {Object} args.error - The error/XHR object
 * @param {Object} args.bidderRequest - The originating bidder request
 * @returns {void}
 */
function onBidderError({ error, bidderRequest }) {
  logError(`${BIDDER_CODE}: server responded with an error`, error, bidderRequest);
}

/**
 * Bidder adapter specification object for OCM
 * @type {Object}
 */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
  getUserSyncs: getUserSyncs,
  onTimeout: onTimeout,
  onBidderError: onBidderError,
};

registerBidder(spec);
