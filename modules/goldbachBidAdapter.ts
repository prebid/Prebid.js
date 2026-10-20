import { ajax } from '../src/ajax.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, logError } from '../src/utils.js';
import { registerBidder, type AdapterRequest, type BidderSpec, type ExtendedResponse } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getAdUnitElement } from '../src/utils/adUnits.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { Renderer } from '../src/Renderer.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import type { BidRequest } from '../src/adapterManager.js';
import type { Bid } from '../src/bidfactory.js';

const IS_LOCAL_MODE = false;
const BIDDER_CODE = 'goldbach' as const;
const GVLID = 580;
const URL = 'https://goldlayer-api.prod.gbads.net/openrtb/2.5/auction';
const URL_LOCAL = 'http://localhost:3000/openrtb/2.5/auction';
const URL_METRICS = 'https://goldlayer-api.prod.gbads.net/metrics';
const URL_METRICS_LOCAL = 'http://localhost:3000/metrics';
const METHOD = 'POST';
const DEFAULT_CURRENCY = 'USD';
const METRICS_SAMPLE_RATE_REGULAR = 0.001;
const METRICS_SAMPLE_RATE_ERROR = 0.001;
const AUCTION_TYPE_FAST = 'fast';
const MAX_GET_PAYLOAD_LENGTH = 11 * 1024;
const MIN_FALLBACK_VIEWPORT_PX = 50;

const RENDERER_OPTIONS = {
  OUTSTREAM_GP: {
    URL: 'https://goldplayer.prod.gbadtech.io/scripts/goldplayer.js'
  }
};

const EVENTS = {
  BID_WON: 'bid_won',
  TARGETING: 'targeting_set',
  RENDER: 'creative_render',
  RENDER_FAILED: 'creative_render_failed',
  TIMEOUT: 'timeout',
  ERROR: 'error'
} as const;

export type GoldbachBidParams = {
  publisherId: string;
  slotId?: string;
  customTargeting?: Record<string, unknown>;
  auctionType?: 'full' | 'fast';
  divId?: string;
  mockResponse?: boolean;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: GoldbachBidParams;
  }
}

type GoldbachBidRequest = BidRequest<typeof BIDDER_CODE>;

interface GoldbachAdapterRequest extends AdapterRequest {
  ortbRequest?: unknown;
}

type OutstreamMount = {
  container: HTMLElement;
  doc: Document;
  obstruction?: HTMLElement;
};

type GoldPlayerOptions = {
  vastUrl?: string;
  vastXML?: string;
  autoplay: boolean;
  muted: boolean;
  controls: boolean;
  resizeMode: 'auto';
  styling: { progressbarColor: string };
  publisherProvidedWidth?: number;
  publisherProvidedHeight?: number;
  divContainerElement: HTMLElement;
};

type GoldPlayerWindow = Window & {
  GoldPlayer?: new (options: GoldPlayerOptions) => { play(): void };
};

type GptWindow = Window & {
  googletag?: {
    apiReady?: boolean;
    pubads?: () => { getSlots(): Array<{ getSlotElementId(): string }> };
  };
};

export const dep = {
  ajax
};

const toBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const getSameOriginFrameElement = (doc: Document | null | undefined): HTMLElement | null => {
  try {
    return (doc?.defaultView?.frameElement as HTMLElement | null) || null;
  } catch (e) {
    return null;
  }
};

const getGptSlotElementIds = (win: Window | null | undefined): Set<string> => {
  try {
    const gpt = (win as GptWindow | null | undefined)?.googletag;
    if (!gpt?.apiReady || typeof gpt.pubads !== 'function') return new Set();
    return new Set(gpt.pubads().getSlots().map((slot) => slot.getSlotElementId()));
  } catch (e) {
    return new Set();
  }
};

const resolveOutstreamMount = (
  bid: Bid,
  pageDocument: Document | null | undefined,
  creativeDocument: Document | null | undefined,
  publisherDivId?: string
): OutstreamMount | null => {
  const findOnPage = (id: string | undefined): HTMLElement | null => {
    if (!id || typeof pageDocument?.getElementById !== 'function') return null;
    try {
      return pageDocument.getElementById(id);
    } catch (e) {
      return null;
    }
  };

  const publisherContainer = findOnPage(publisherDivId);
  if (publisherContainer) return { container: publisherContainer, doc: publisherContainer.ownerDocument || pageDocument };

  const adUnitContainer = findOnPage(bid.adUnitCode) || getAdUnitElement(bid);
  if (adUnitContainer) return { container: adUnitContainer, doc: adUnitContainer.ownerDocument || pageDocument };

  const creativeFrame = getSameOriginFrameElement(creativeDocument);
  if (creativeFrame && creativeFrame.ownerDocument === pageDocument) {
    const slotElementIds = getGptSlotElementIds(pageDocument?.defaultView);
    for (let ancestor = creativeFrame.parentElement, child: HTMLElement = creativeFrame; ancestor; child = ancestor, ancestor = ancestor.parentElement) {
      if (ancestor.id && slotElementIds.has(ancestor.id)) return { container: ancestor, doc: pageDocument, obstruction: child };
    }
    const gamWrapper = typeof creativeFrame.closest === 'function'
      ? (creativeFrame.closest('[id^="google_ads_iframe"]') as HTMLElement | null)
      : null;
    if (gamWrapper?.parentElement) return { container: gamWrapper.parentElement, doc: pageDocument, obstruction: gamWrapper };
  }

  const gptSlotContainer = findOnPage(getGptSlotInfoForAdUnitCode(bid.adUnitCode).divId);
  if (gptSlotContainer) return { container: gptSlotContainer, doc: pageDocument };

  const creativeWindow = creativeDocument?.defaultView;
  const creativeFrameHasUsableSize = !!creativeWindow &&
    creativeWindow.innerWidth >= MIN_FALLBACK_VIEWPORT_PX &&
    creativeWindow.innerHeight >= MIN_FALLBACK_VIEWPORT_PX;
  if (creativeFrameHasUsableSize && creativeDocument.body) return { container: creativeDocument.body, doc: creativeDocument };

  return null;
};

const findLeftoverAdServerFrames = (container: HTMLElement): HTMLElement[] => {
  if (typeof container?.querySelectorAll !== 'function') return [];
  const gamFrames = Array.from(container.querySelectorAll<HTMLElement>("div[id^='google_ads'], iframe[id^='google_ads']"));
  const outermostGamFrames = gamFrames.filter((frame) => !gamFrames.some((other) => other !== frame && other.contains(frame)));
  const smartAdServerFrames = Array.from(container.querySelectorAll<HTMLScriptElement>("script[id^='sas_script']"))
    .map((script) => script.nextElementSibling)
    .filter((element): element is HTMLIFrameElement => element?.localName === 'iframe');
  return [...outermostGamFrames, ...smartAdServerFrames].filter((frame) => frame.style.display !== 'none');
};

const collapseLeftoverAdServerFrame = (mount: OutstreamMount): void => {
  if (mount.obstruction) {
    mount.obstruction.style.setProperty('display', 'none');
    return;
  }
  const leftoverFrames = findLeftoverAdServerFrames(mount.container);
  const leftoverFrameIsUnambiguous = leftoverFrames.length === 1;
  if (leftoverFrameIsUnambiguous) leftoverFrames[0].style.setProperty('display', 'none');
};

const reportOutstreamFailure = (adUnitCode: string, publisherId: unknown, reason: string): void => {
  logError(`${BIDDER_CODE}: not rendering outstream ad on '${adUnitCode}': ${reason}`);
  sendMetrics({
    event: EVENTS.RENDER_FAILED,
    data: { publisherId, adUnitCode, reason },
  }, METRICS_SAMPLE_RATE_ERROR);
};

const getRendererForBid = (bidRequest: GoldbachBidRequest) => {
  const publisherRendererTakesPrecedence = !!bidRequest.renderer && bidRequest.renderer.backupOnly !== true;
  if (publisherRendererTakesPrecedence) return undefined;

  const firstPartyData = bidRequest.ortb2Imp?.ext?.data as { divId?: string } | undefined;
  const publisherDivId = bidRequest.params?.divId || firstPartyData?.divId;
  let mount: OutstreamMount | null = null;
  let creativeDocument: Document | null = null;

  const renderer = Renderer.install({
    id: bidRequest.bidId,
    url: RENDERER_OPTIONS.OUTSTREAM_GP.URL,
    adUnitCode: bidRequest.adUnitCode,
    config: {
      documentResolver: (bid: Bid, sourceDocument: Document, renderDocument: Document | undefined) => {
        creativeDocument = renderDocument || null;
        mount = resolveOutstreamMount(bid, sourceDocument, renderDocument, publisherDivId);
        return mount?.doc || sourceDocument || renderDocument;
      }
    },
    callback: Object.assign(
      () => {
        renderer.loaded = true;
        renderer.process();
      },
      {
        error: () => {
          reportOutstreamFailure(bidRequest.adUnitCode, bidRequest.params?.publisherId, 'player script failed to load');
        },
      }
    ),
  });

  renderer.setRender((bid: Bid, doc: Document) => {
    const videoParams = bidRequest.mediaTypes?.video || {};
    const playerSize = videoParams.playerSize;
    const playerSizeTuple = (Array.isArray(playerSize?.[0]) ? playerSize[0] : playerSize) as [number, number] | undefined;
    const playbackmethod = Array.isArray(videoParams.playbackmethod) ? videoParams.playbackmethod[0] : videoParams.playbackmethod;
    const isMuted = typeof playbackmethod === 'number' && [2, 6].includes(playbackmethod);
    const isAutoplay = typeof playbackmethod === 'number' && [1, 2].includes(playbackmethod);

    renderer.push(() => {
      const resolvedMount = mount || resolveOutstreamMount(bid, doc, creativeDocument, publisherDivId);
      const GoldPlayer = (resolvedMount?.doc?.defaultView as GoldPlayerWindow | null | undefined)?.GoldPlayer;
      if (!GoldPlayer) {
        const reason = resolvedMount ? 'player script not available in mount document' : 'no visible container found';
        reportOutstreamFailure(bid.adUnitCode, deepAccess(bid, `ext.${BIDDER_CODE}.publisherId`), reason);
        return;
      }
      if (resolvedMount.doc !== creativeDocument) {
        collapseLeftoverAdServerFrame(resolvedMount);
      }
      const player = new GoldPlayer({
        vastUrl: bid.vastUrl,
        vastXML: bid.vastXml,
        autoplay: isAutoplay,
        muted: isMuted,
        controls: true,
        resizeMode: 'auto',
        styling: { progressbarColor: '#000' },
        publisherProvidedWidth: playerSizeTuple?.[0],
        publisherProvidedHeight: playerSizeTuple?.[1],
        divContainerElement: resolvedMount.container,
      });
      player.play();
    });
  });
  return renderer;
};

const converter = ortbConverter({
  context: { netRevenue: true, ttl: 3600 },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    const impExt = (imp.ext || {}) as Record<string, any>;
    imp.ext = impExt;
    impExt[BIDDER_CODE] = impExt[BIDDER_CODE] || {};
    impExt[BIDDER_CODE].targetings = bidRequest?.params?.customTargeting || {};
    impExt[BIDDER_CODE].slotId = bidRequest?.params?.slotId || bidRequest?.adUnitCode;

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const ortbRequest = buildRequest(imps, bidderRequest, context);
    const { bidRequests = [] } = context;
    const firstBidRequest = bidRequests?.[0];

    if (bidRequests.length > 0) {
      const requestExt = (ortbRequest.ext || {}) as Record<string, any>;
      ortbRequest.ext = requestExt;
      requestExt[BIDDER_CODE] = requestExt[BIDDER_CODE] || {};
      requestExt[BIDDER_CODE].publisherId = firstBidRequest?.params?.publisherId;
      requestExt[BIDDER_CODE].mockResponse = firstBidRequest?.params?.mockResponse || false;
      requestExt[BIDDER_CODE].auctionStartTime = Date.now();
    }

    if (bidderRequest?.gdprConsent) {
      ortbRequest.regs = ortbRequest.regs || {};
      ortbRequest.regs.ext = ortbRequest.regs.ext || {};
      ortbRequest.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      ortbRequest.user = ortbRequest.user || {};
      ortbRequest.user.ext = ortbRequest.user.ext || {};
      ortbRequest.user.ext.consent = bidderRequest.gdprConsent.consentString;
    }

    return ortbRequest;
  },
  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = deepAccess(bid, 'ext.prebid.type');
    const bidResponse = buildBidResponse(bid, context);
    const { bidRequest } = context;

    bidResponse.currency = bidResponse.currency || deepAccess(bid, 'ext.origbidcur') || DEFAULT_CURRENCY;
    bidResponse.cpm = bidResponse.cpm || deepAccess(bid, 'price');

    bidResponse.meta = bidResponse.meta || {};
    bidResponse.meta.advertiserDomains = deepAccess(bid, 'adomain');
    bidResponse.meta.mediaType = deepAccess(bid, 'ext.prebid.type');
    bidResponse.meta.primaryCatId = deepAccess(bid, 'ext.prebid.video.primary_category');
    bidResponse.meta.secondaryCatIds = deepAccess(bid, 'ext.prebid.video.secondary_categories');

    const bidResponseWithExt = bidResponse as typeof bidResponse & { ext?: Record<string, any> };
    const responseExt = bidResponseWithExt.ext || {};
    bidResponseWithExt.ext = responseExt;
    responseExt[BIDDER_CODE] = responseExt[BIDDER_CODE] || {};
    responseExt[BIDDER_CODE].publisherId = deepAccess(bid, 'ext.goldbach.publisherId') || bidRequest?.params?.publisherId;

    if (bidResponse.mediaType === VIDEO && bidRequest.mediaTypes.video.context === 'outstream' && (bidResponse.vastUrl || bidResponse.vastXml)) {
      bidResponse.renderer = getRendererForBid(bidRequest as GoldbachBidRequest);
    }
    return bidResponse;
  }
});

const sendMetrics = (data: { event: string; data: Record<string, unknown> }, sampleRate = 0.0001): void => {
  try {
    if (Math.random() > sampleRate) return;
    const url = IS_LOCAL_MODE ? URL_METRICS_LOCAL : URL_METRICS;
    const payload = {
      ...data,
      source: 'goldbach_pbjs',
      projected: 1 / sampleRate,
      ts: Date.now()
    };
    dep.ajax(url, null, JSON.stringify(payload), {
      withCredentials: false,
      method: 'POST',
      contentType: 'text/plain',
      keepalive: true,
    });
  } catch (error) {
  }
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid(bid) {
    return typeof bid.params?.publisherId === 'string' && bid.params.publisherId.length > 0;
  },
  buildRequests(bidRequests, bidderRequest) {
    const url = IS_LOCAL_MODE ? URL_LOCAL : URL;
    const data = converter.toORTB({ bidRequests, bidderRequest });

    if (bidRequests?.[0]?.params?.auctionType === AUCTION_TYPE_FAST) {
      const encoded = toBase64Url(JSON.stringify(data));
      if (encoded.length <= MAX_GET_PAYLOAD_LENGTH) {
        const fastRequest: GoldbachAdapterRequest = {
          method: 'GET',
          url: url,
          data: { b: encoded },
          ortbRequest: data,
          options: {
            withCredentials: true,
          }
        };
        return fastRequest;
      }
    }

    return {
      method: METHOD,
      url: url,
      data: data,
      options: {
        withCredentials: true,
        contentType: 'text/plain',
        endpointCompression: true,
      }
    };
  },
  interpretResponse(ortbResponse, request) {
    const goldbachRequest = request as GoldbachAdapterRequest;
    const response = converter.fromORTB({
      response: ortbResponse.body,
      request: goldbachRequest.ortbRequest || goldbachRequest.data,
    }) as ExtendedResponse;
    return response.bids ?? [];
  },
  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs: Array<{ type: 'image' | 'iframe'; url: string }> = [];
    if (!hasPurpose1Consent(gdprConsent)) return syncs;

    const serverSyncs = deepAccess(serverResponses, '0.body.ext.goldbach.syncs');
    if (!Array.isArray(serverSyncs)) return syncs;

    const gdprApplies = gdprConsent?.gdprApplies ? '1' : '0';
    const gdprConsentEncoded = encodeURIComponent(gdprConsent?.consentString || '');
    const usPrivacy = uspConsent ? encodeURIComponent(uspConsent) : '';
    const gppString = encodeURIComponent(gppConsent?.gppString || '');
    const gppSid = encodeURIComponent((gppConsent?.applicableSections || []).join(','));

    for (const sync of serverSyncs) {
      if (typeof sync?.url !== 'string') continue;
      if (sync.type === 'image' && !syncOptions.pixelEnabled) continue;
      if (sync.type === 'iframe' && !syncOptions.iframeEnabled) continue;
      if (sync.type !== 'image' && sync.type !== 'iframe') continue;
      syncs.push({
        type: sync.type,
        url: sync.url
          .replace(/\{\{GDPR\}\}/g, gdprApplies)
          .replace(/\{\{GDPR_CONSENT\}\}/g, gdprConsentEncoded)
          .replace(/\{\{USP\}\}/g, usPrivacy)
          .replace(/\{\{GPP\}\}/g, gppString)
          .replace(/\{\{GPP_SID\}\}/g, gppSid),
      });
    }
    return syncs;
  },
  onTimeout(timeoutData) {
    const timedOutParams = timeoutData?.[0]?.params as unknown as GoldbachBidParams[] | undefined;
    const payload = {
      event: EVENTS.TIMEOUT,
      data: {
        publisherId: timedOutParams?.[0]?.publisherId,
        timeoutData: timeoutData,
      }
    };
    sendMetrics(payload, METRICS_SAMPLE_RATE_ERROR);
  },
  onBidWon(bid) {
    const payload = {
      event: EVENTS.BID_WON,
      data: {
        publisherId: deepAccess(bid, `ext.${BIDDER_CODE}.publisherId`),
        creativeId: bid.creativeId,
        adUnitCode: bid.adUnitCode,
        mediaType: bid.mediaType,
        size: bid.size,
        cpm: bid.cpm,
        currency: bid.currency,
      }
    };
    sendMetrics(payload, METRICS_SAMPLE_RATE_REGULAR);
  },
  onSetTargeting(bid) {
    const payload = {
      event: EVENTS.TARGETING,
      data: {
        publisherId: deepAccess(bid, `ext.${BIDDER_CODE}.publisherId`),
        creativeId: bid.creativeId,
        adUnitCode: bid.adUnitCode,
        mediaType: bid.mediaType,
        size: bid.size,
        cpm: bid.cpm,
        currency: bid.currency,
      }
    };
    sendMetrics(payload, METRICS_SAMPLE_RATE_REGULAR);
  },
  onBidderError({ error, bidderRequest }) {
    const status = error?.status ?? 0;
    const type = error?.timedOut ? 'timeout'
      : status === 0 ? 'network'
        : status >= 500 ? 'server'
          : status >= 400 ? 'client'
            : 'unknown';
    const payload = {
      event: EVENTS.ERROR,
      data: {
        publisherId: bidderRequest?.bids?.[0]?.params?.publisherId,
        type,
        status,
      }
    };
    sendMetrics(payload, METRICS_SAMPLE_RATE_ERROR);
  },
  onAdRenderSucceeded(bid) {
    const payload = {
      event: EVENTS.RENDER,
      data: {
        publisherId: deepAccess(bid, `ext.${BIDDER_CODE}.publisherId`),
        creativeId: bid.creativeId,
        adUnitCode: bid.adUnitCode,
        mediaType: bid.mediaType,
        size: bid.size,
        cpm: bid.cpm,
        currency: bid.currency,
      }
    };
    sendMetrics(payload, METRICS_SAMPLE_RATE_REGULAR);
  },
};

registerBidder(spec);
