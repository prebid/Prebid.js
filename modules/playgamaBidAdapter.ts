import { registerBidder } from '../src/adapters/bidderFactory.js';
import type { AdapterRequest, BidderSpec, ServerResponse } from '../src/adapters/bidderFactory.js';
import type { BidRequest } from '../src/adapterManager.js';
import type { Bid, BidResponse } from '../src/bidfactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import type { RendererOptions } from '../src/Renderer.js';
import { getStorageManager } from '../src/storageManager.js';
import { getWinDimensions, prefixLog } from '../src/utils.js';
import { getDevicePixelRatio } from '../libraries/devicePixelRatio/devicePixelRatio.js';

const BIDDER_CODE = 'playgama';
const PGID_COOKIE = '_pgid';
const PGID_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const FLOOR_MEDIA_TYPES = [BANNER, VIDEO] as const;

const ENVIRONMENTS = {
  production: {
    endpoint: 'https://ssp.playgama.com/v2/auction',
    renderersBase: 'https://playgama.com/prebid-renderers',
  },
  staging: {
    endpoint: 'https://ssp-staging.playgama.com/v2/auction',
    renderersBase: 'https://staging.playgama.com/prebid-renderers',
  },
} as const;

export interface PlaygamaBidParams {
  /**
   * Publisher ID issued by Playgama.
   */
  publisherId: string;
  /**
   * Ad unit ID issued by Playgama.
   */
  adUnitId: string;
  /**
   * Playgama environment to bid against. Defaults to `'production'`;
   * `'staging'` is for integration testing only.
   */
  env?: keyof typeof ENVIRONMENTS;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: PlaygamaBidParams;
  }
}

/**
 * Callbacks a publisher may set on `bid.renderer.config` before rendering an
 * outstream or interstitial bid.
 */
export interface PlaygamaRendererConfig {
  onRendered?: () => void;
  onViewable?: () => void;
  onClose?: () => void;
  onError?: (message: string) => void;
}

type RendererFailure = { kind: 'empty' } | { kind: 'error'; reason: string } | { kind: 'timeout' };

interface InterstitialRenderer {
  render(): void;
}

interface OutstreamRenderer {
  init(): Promise<void>;
}

declare global {
  interface Window {
    PgPrebidRenderers?: {
      InterstitialRenderer?: new (
        container: HTMLElement,
        bid: Bid,
        callbacks: { onClose: () => void; onViewable: () => void; onError: (message: string) => void }
      ) => InterstitialRenderer;
      OutstreamRenderer?: new (
        container: HTMLElement,
        ad: { vastXml?: string; vastUrl?: string; width?: number; height?: number },
        callbacks: { onError: (failure: RendererFailure) => void; onReady: () => void; onStarted: () => void }
      ) => OutstreamRenderer;
    };
  }
}

type SspRender =
  | { mode: 'default' }
  | { mode: 'interstitial' | 'outstream' }
  | { mode: 'h5_gam'; viewportGapPx?: number };

type SspBid = BidResponse & {
  render: SspRender;
};

interface SspResponse {
  bids?: SspBid[];
  auction_id?: string;
  ext_pgid?: string;
  sync_pixels?: { type?: string; url?: string }[];
}

interface PlaygamaAdapterRequest extends AdapterRequest {
  bidRequests: BidRequest<typeof BIDDER_CODE>[];
}

const { logError } = prefixLog(BIDDER_CODE);

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

function environment(params: PlaygamaBidParams) {
  return ENVIRONMENTS[params.env] || ENVIRONMENTS.production;
}

function rendererConfig(renderer: Renderer): PlaygamaRendererConfig | undefined {
  return renderer.getConfig() as PlaygamaRendererConfig | undefined;
}

function reportRenderError(renderer: Renderer, message: string) {
  logError(message);
  rendererConfig(renderer)?.onError?.(message);
}

function installRenderer(bidId: string, adUnitCode: string, url: string, what: string): Renderer {
  const renderer = Renderer.install({
    id: bidId,
    url,
    adUnitCode,
    // adloader accepts a {success, error} pair; RendererOptions only names the single-function form
    callback: {
      success: () => {
        renderer.loaded = true;
        renderer.process();
      },
      error: () => reportRenderError(renderer, `Failed to load ${what} renderer script: ${url}`),
    } as unknown as RendererOptions['callback'],
  });
  return renderer;
}

function createInterstitialRenderer(bidId: string, adUnitCode: string, url: string): Renderer {
  const renderer = installRenderer(bidId, adUnitCode, url, 'interstitial');

  // Must not call pbjs.renderAd() here: bid.renderer is still set, so it would re-enter this callback.
  renderer.setRender((bid: Bid) => {
    renderer.push(() => {
      const opts = rendererConfig(renderer);
      const container = document.getElementById(bid.adUnitCode);
      if (!container) {
        reportRenderError(renderer, `Interstitial container not found: ${bid.adUnitCode}`);
        return;
      }
      const InterstitialRenderer = window.PgPrebidRenderers?.InterstitialRenderer;
      if (!InterstitialRenderer) {
        reportRenderError(renderer, 'InterstitialRenderer script did not register itself');
        return;
      }
      let errored = false;
      new InterstitialRenderer(container, bid, {
        onClose: () => opts?.onClose?.(),
        onViewable: () => opts?.onViewable?.(),
        onError: (message) => {
          errored = true;
          reportRenderError(renderer, message);
        },
      }).render();
      if (!errored) {
        opts?.onRendered?.();
      }
    });
  });

  return renderer;
}

function createOutstreamRenderer(bidId: string, adUnitCode: string, url: string): Renderer {
  const renderer = installRenderer(bidId, adUnitCode, url, 'outstream');

  renderer.setRender((bid: Bid) => {
    renderer.push(() => {
      const opts = rendererConfig(renderer);
      const container = document.getElementById(bid.adUnitCode);
      if (!container) {
        reportRenderError(renderer, `Outstream container not found: ${bid.adUnitCode}`);
        return;
      }
      const onError = (failure: RendererFailure) => {
        reportRenderError(renderer, `adError ${JSON.stringify(failure)}`);
      };
      const OutstreamRenderer = window.PgPrebidRenderers?.OutstreamRenderer;
      if (!OutstreamRenderer) {
        onError({ kind: 'error', reason: 'OutstreamRenderer script did not register itself' });
        return;
      }
      // the player replays the ad in a loop, so onReady/onStarted refire; report each once
      let reportRendered = opts?.onRendered;
      let reportViewable = opts?.onViewable;
      new OutstreamRenderer(
        container,
        { vastXml: bid.vastXml, vastUrl: bid.vastUrl, width: bid.width, height: bid.height },
        {
          onError,
          onReady: () => {
            reportRendered?.();
            reportRendered = undefined;
          },
          onStarted: () => {
            reportViewable?.();
            reportViewable = undefined;
          },
        }
      )
        .init()
        .catch(onError);
    });
  });

  return renderer;
}

function viewportSizes(gapPx: number): { width: number; height: number } {
  const { innerWidth, innerHeight } = getWinDimensions();
  return { width: innerWidth - gapPx, height: innerHeight - gapPx };
}

function readFloors(bid: BidRequest<typeof BIDDER_CODE>): Record<string, unknown> {
  return Object.fromEntries(
    FLOOR_MEDIA_TYPES.filter((mediaType) => bid.mediaTypes?.[mediaType]).map((mediaType) => [
      mediaType,
      bid.getFloor?.({ currency: 'USD', mediaType, size: '*' }),
    ])
  );
}

function requestGroups(bidRequests: BidRequest<typeof BIDDER_CODE>[]): BidRequest<typeof BIDDER_CODE>[][] {
  const groups = new Map<string, BidRequest<typeof BIDDER_CODE>[]>();
  bidRequests.forEach((bid) => {
    const key = `${environment(bid.params).endpoint}\n${bid.params.publisherId}`;
    const group = groups.get(key);
    if (group) {
      group.push(bid);
    } else {
      groups.set(key, [bid]);
    }
  });
  return [...groups.values()];
}

function withRenderer(sspBid: SspBid, request: BidRequest<typeof BIDDER_CODE>): BidResponse {
  const { render, requestId, ...bid } = sspBid;
  const { renderersBase } = environment(request.params);

  switch (render.mode) {
    case 'interstitial':
      return {
        ...bid,
        requestId,
        renderer: createInterstitialRenderer(requestId, request.adUnitCode, `${renderersBase}/interstitial.js`),
      };
    case 'outstream':
      return {
        ...bid,
        requestId,
        renderer: createOutstreamRenderer(requestId, request.adUnitCode, `${renderersBase}/outstream.js`),
      };
    case 'h5_gam':
      return {
        ...bid,
        requestId,
        ...(render.viewportGapPx === undefined ? {} : viewportSizes(render.viewportGapPx)),
      };
    default:
      return { ...bid, requestId };
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  disclosureURL: 'local://modules/playgamaBidAdapterDisclosure.json',
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(bid) {
    const { publisherId, adUnitId } = bid.params || ({} as Partial<PlaygamaBidParams>);
    return typeof publisherId === 'string' && publisherId !== '' && typeof adUnitId === 'string' && adUnitId !== '';
  },

  buildRequests(validBidRequests, bidderRequest): PlaygamaAdapterRequest[] {
    const pgid = storage.getCookie(PGID_COOKIE) || undefined;
    // One request per SSP environment and publisher: the SSP runs one publisher per auction,
    // and a staging unit on the page must not drag the production units to the staging SSP.
    return requestGroups(validBidRequests).map((bidRequests) => ({
      method: 'POST',
      url: environment(bidRequests[0].params).endpoint,
      data: JSON.stringify({
        // Prebid repeats bidderRequest.ortb2 on every bid and the bids themselves
        // under bidderRequest.bids; the SSP reads them once from bidder_request.
        valid_bid_requests: bidRequests.map((bid) => ({
          ...bid,
          ortb2: undefined,
          floors: readFloors(bid),
        })),
        bidder_request: { ...bidderRequest, bids: undefined },
        // through the shared accessor, so `disableFingerprintingApis: ['devicepixelratio']` is honoured
        device: { pxratio: getDevicePixelRatio(window) ?? 1 },
        user: { id: pgid },
      }),
      options: { contentType: 'text/plain' },
      bidRequests,
    }));
  },

  interpretResponse(serverResponse, request) {
    const body = serverResponse?.body as SspResponse | undefined;

    if (body?.ext_pgid) {
      storage.setCookie(PGID_COOKIE, body.ext_pgid, new Date(Date.now() + PGID_MAX_AGE_MS).toUTCString(), 'None');
    }

    if (!body?.bids?.length) {
      return [];
    }

    const { bidRequests } = request as PlaygamaAdapterRequest;

    return body.bids.flatMap((sspBid) => {
      const matchingRequest = bidRequests.find((bidRequest) => bidRequest.bidId === sspBid.requestId);
      if (!matchingRequest) {
        return [];
      }
      const bid = body.auction_id
        ? { ...sspBid, meta: { ...sspBid.meta, pgAuctionId: body.auction_id } }
        : sspBid;
      return [withRenderer(bid, matchingRequest)];
    });
  },

  getUserSyncs(syncOptions, serverResponses: ServerResponse[]) {
    const pixels = serverResponses.flatMap((response) => (response?.body as SspResponse | undefined)?.sync_pixels ?? []);
    const hasIframe = pixels.some((pixel) => pixel.type === 'iframe' && pixel.url && syncOptions.iframeEnabled);

    return pixels.flatMap((pixel) => {
      const type = pixel.type === 'iframe' ? 'iframe' : 'image';
      if (!pixel.url || (type === 'iframe' ? !syncOptions.iframeEnabled : !syncOptions.pixelEnabled)) {
        return [];
      }
      return [{ type: hasIframe ? 'iframe' : type, url: pixel.url }];
    });
  },

  onBidderError({ error }) {
    logError('SSP request failed:', error.status, error.statusText);
  },
};

registerBidder(spec);
