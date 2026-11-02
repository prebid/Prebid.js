import { deepAccess, deepSetValue, isStr, logWarn } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { parseUntrustedJSON } from '../src/utils/untrustedJson.js';

/**
 * @typedef {import('./luponmediaBidAdapter.d.ts').LuponmediaBidderParams} LuponmediaBidderParams
 */

const BIDDER_CODE = 'luponmedia';
const GVLID = 1132;

const DEFAULT_HOST = 'https://api.imanego.com';
const SYNC_URL = 'https://sync.imanego.com/sync';
// OpenRTB 2.6 seatbid.bid[].mtype by bid type.
const MTYPES = { banner: 1, video: 2, audio: 3, native: 4 };
const LOCAL_ENDPOINT = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
// Video is outstream only. Outstream bids play in Prebid's outstream renderer unless the ad unit
// brings its own.
const OUTSTREAM = 'outstream';
export const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';
// Integration key issued by LuponMedia: lowercase parts separated by dots.
const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}(\.[a-z0-9][a-z0-9_-]{0,62}){0,3}$/;

function serverOrigin() {
  const devEndpoint = config.getConfig('luponmedia.devEndpoint');
  return isStr(devEndpoint) && LOCAL_ENDPOINT.test(devEndpoint) ? devEndpoint : DEFAULT_HOST;
}

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: 'USD',
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (imp.video && !isOutstream(bidRequest)) {
      delete imp.video;
    }
    if (imp.native) {
      imp.native.request = completeNativeRequest(imp.native.request);
    }
    deepSetValue(imp, 'ext.prebid.imanego.key', keyOf(bidRequest.params));
    deepSetValue(imp, 'ext.prebid.adunitcode', bidRequest.adUnitCode);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    // request.id is the Prebid auctionId.
    request.id = bidderRequest.auctionId;
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    // Prebid drops bids without mtype; take it from ext.prebid.type when it is missing.
    if (!bid.mtype) {
      bid.mtype = MTYPES[bid.ext?.prebid?.type] ?? MTYPES.banner;
    }
    if (bid.mtype === MTYPES.native) {
      // Prebid needs the OpenRTB native response; it may arrive wrapped in {"native": ...}.
      const ortb = nativeResponse(bid.adm);
      if (!ortb) {
        logWarn(`${BIDDER_CODE}: native bid without assets dropped`, bid.id);
        return;
      }
      bid = { ...bid, adm: ortb };
    }
    // Prebid requires a creative id; not every partner sets crid.
    if (!bid.crid) {
      bid = { ...bid, crid: bid.id };
    }
    const bidResponse = buildBidResponse(bid, context);
    if (bidResponse.mediaType === VIDEO) {
      // The VAST is in adm; nurl is a win notice, not a VAST URL.
      delete bidResponse.vastUrl;
      if (!hasOwnRenderer(context.bidRequest)) {
        bidResponse.renderer = outstreamRenderer(bidResponse);
      }
    }
    // Bids are presented as luponmedia; the seat is kept in meta.
    bidResponse.meta = { ...bidResponse.meta, seat: context.seatbid?.seat };
    // The video nurl is not used as a VAST URL above, so it serves as the win notice when there is
    // no win event.
    const winUrl = bid.ext?.prebid?.events?.win ?? (bidResponse.mediaType === VIDEO ? bid.nurl : undefined);
    if (isStr(winUrl)) {
      bidResponse.winUrl = winUrl;
    }
    return bidResponse;
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    if (!keyOf(bid?.params)) {
      logWarn(`${BIDDER_CODE}: params.key (integration key from LuponMedia) is missing or invalid`, bid?.params);
      return false;
    }
    // Instream video is not sent; the ad unit is valid while another format remains.
    if (bid.mediaTypes?.video && !bid.mediaTypes.banner && !bid.mediaTypes.native && !isOutstream(bid)) {
      logWarn(`${BIDDER_CODE}: only outstream video is supported (mediaTypes.video.context: 'outstream')`, bid.adUnitCode);
      return false;
    }
    return true;
  },

  // One request per key prefix (the key's first part).
  buildRequests(bidRequests, bidderRequest) {
    const groups = new Map();
    bidRequests.forEach((bidRequest) => {
      const client = keyOf(bidRequest.params).split('.')[0];
      if (!groups.has(client)) {
        groups.set(client, []);
      }
      groups.get(client).push(bidRequest);
    });

    const origin = serverOrigin();
    return Array.from(groups, ([client, bidRequests]) => ({
      method: 'POST',
      url: `${origin}/openrtb2/auction?key=${encodeURIComponent(client)}`,
      data: converter.toORTB({ bidRequests, bidderRequest }),
      options: { contentType: 'text/plain', withCredentials: true },
    }));
  },

  interpretResponse(response, request) {
    if (!response?.body) {
      return [];
    }
    // Several bids per ad unit are normal. Highest first, so Prebid's multibid module, which keeps
    // the first maxBids it receives, keeps the best ones.
    return converter.fromORTB({ response: response.body, request: request.data }).bids
      .filter((bid) => bid.mediaType !== VIDEO || isStr(bid.vastXml))
      .sort((a, b) => b.cpm - a.cpm);
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    if (hasSynced || !syncOptions.iframeEnabled) {
      return [];
    }
    hasSynced = true;

    const params = [];
    const add = (key, value) => {
      if (value !== undefined && value !== null && value !== '') {
        params.push(`${key}=${encodeURIComponent(value)}`);
      }
    };
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        add('gdpr', gdprConsent.gdprApplies ? 1 : 0);
      }
      add('gdpr_consent', gdprConsent.consentString);
    }
    add('us_privacy', uspConsent);
    if (gppConsent) {
      add('gpp', gppConsent.gppString);
      add('gpp_sid', (gppConsent.applicableSections || []).join(','));
    }

    const devSync = config.getConfig('luponmedia.devSyncEndpoint');
    const base = isStr(devSync) && LOCAL_ENDPOINT.test(devSync) ? `${devSync}/sync` : SYNC_URL;
    return [{ type: 'iframe', url: params.length ? `${base}?${params.join('&')}` : base }];
  },

  onBidWon(bid) {
    if (isStr(bid?.winUrl)) {
      ajax(bid.winUrl, null, undefined, { method: 'GET', keepalive: true });
    }
  },
};

// User sync runs once per page.
let hasSynced = false;

export function resetUserSync() {
  hasSynced = false;
}

// Event trackers and placement type are required downstream; Prebid leaves them out of the native
// request unless the ad unit sets them.
function completeNativeRequest(request) {
  try {
    const req = JSON.parse(request);
    req.plcmttype = req.plcmttype ?? 1; // in the feed
    req.eventtrackers = req.eventtrackers ?? [{ event: 1, methods: [1] }]; // impression, image pixel
    return JSON.stringify(req);
  } catch (e) {
    return request;
  }
}

function nativeResponse(adm) {
  let ortb = adm;
  if (isStr(adm)) {
    try {
      ortb = parseUntrustedJSON(adm);
    } catch (e) {
      return undefined;
    }
  }
  ortb = ortb?.native ?? ortb;
  return Array.isArray(ortb?.assets) ? ortb : undefined;
}

function isOutstream(bidRequest) {
  return deepAccess(bidRequest, 'mediaTypes.video.context') === OUTSTREAM;
}

// A renderer set by the publisher (ad unit or mediaTypes.video) is used instead of the default one,
// unless it is a backup only.
function hasOwnRenderer(bidRequest) {
  return [bidRequest?.renderer, deepAccess(bidRequest, 'mediaTypes.video.renderer')]
    .some((renderer) => renderer && renderer.backupOnly !== true);
}

function outstreamRenderer(bid) {
  const renderer = Renderer.install({
    id: bid.requestId,
    url: OUTSTREAM_RENDERER_URL,
    adUnitCode: bid.adUnitCode,
    loaded: false,
  });
  try {
    renderer.setRender(renderOutstream);
  } catch (e) {
    logWarn(`${BIDDER_CODE}: outstream renderer not set`, e);
  }
  return renderer;
}

// renderOutstream plays the bid in the ad unit's div (its id is the ad unit code).
function renderOutstream(bid) {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [bid.playerWidth, bid.playerHeight],
      targetId: bid.adUnitCode,
      adResponse: { content: bid.vastXml },
      rendererOptions: bid.renderer.getConfig(),
    });
  });
}

// keyOf returns the normalized integration key of the bid params, or undefined.
function keyOf(params) {
  if (!isStr(params?.key)) {
    return undefined;
  }
  const key = params.key.trim().toLowerCase();
  return KEY_PATTERN.test(key) ? key : undefined;
}

registerBidder(spec);
