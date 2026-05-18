import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder, type AdapterRequest, type BidderSpec, type ServerResponse, type ExtendedResponse } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { isStr, isFn, logInfo, logWarn, logError, deepSetValue } from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import type { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import type { SyncType } from '../src/userSync.js';

const BIDDER_CODE = 'hubvisor' as const;
const SYNC_ENDPOINT = 'https://relay.hubvisor.io/v1/sync/pbjs';
const AUCTION_ENDPOINT = 'https://relay.hubvisor.io/v1/auction/pbjs';
const HUBVISOR_PLAYER_URL = 'https://cdn.hubvisor.io/wrapper/common/player.js';

const SYNC_TYPE_MAP: Record<string, SyncType> = {
  image: 'image',
  redirect: 'image',
  iframe: 'iframe',
};

/** Bidder params for the Hubvisor adapter. */
export type HubvisorBidParams = {
  /** Hubvisor placement identifier. */
  placementId?: string;
  /** Optional outstream video rendering configuration. */
  video?: {
    /** Maximum player width in pixels. */
    maxWidth?: number;
    /** Target aspect ratio (e.g. 16/9). */
    targetRatio?: number;
    /** CSS selector for the player container element. */
    selector?: string;
  };
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: HubvisorBidParams;
  }
}

/** Extended adapter request carrying internal state between buildRequests and interpretResponse. */
interface HubvisorAdapterRequest extends AdapterRequest {
  internal?: {
    bidRequestsById: Record<string, BidRequest<typeof BIDDER_CODE>>;
  };
}

interface SyncResponseBody {
  bidders?: Array<{ type: string; url: string }>;
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30,
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const req = request as any;
    if (req.site) {
      req.site.publisher = req.publisher;
    }
    delete req.publisher;
    req.test = isTest() ? 1 : 0;
    return request;
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext.hubvisor.placementId', getPlacementIdFromBidRequest(bidRequest as BidRequest<typeof BIDDER_CODE>));
    return imp;
  },
});

function isTest(): boolean {
  return config.getConfig('test') === true;
}

function getPlacementIdFromBidRequest(bidRequest: BidRequest<typeof BIDDER_CODE>): string | undefined {
  return bidRequest.params?.placementId;
}

function makeOutstreamRenderer(bid: any, videoParameters: HubvisorBidParams['video'] = {}): any {
  const { id } = bid;
  const { maxWidth, targetRatio, selector } = videoParameters;
  const renderer = Renderer.install({
    id,
    url: HUBVISOR_PLAYER_URL,
    loaded: false,
    config: { maxWidth, targetRatio, selector },
  });
  renderer.setRender(render);
  return renderer;
}

function render(bid: any): void {
  const cfg = bid.renderer.getConfig();
  bid.renderer.push(() => {
    const { vastXml, vastUrl, width: targetWidth, height: targetHeight } = bid;
    const { maxWidth, targetRatio } = cfg;
    playOutstream(getSelector(cfg, bid), {
      vastXml,
      vastUrl,
      targetWidth,
      targetHeight,
      maxWidth,
      targetRatio,
      expand: 'no-lazy-load',
      onEvent: (event: string) => {
        switch (event) {
          case 'impression':
            logInfo(`Video impression for ad unit ${bid.adUnitCode}`);
            break;
          case 'error':
            logWarn(`Error while playing video for ad unit ${bid.adUnitCode}`);
            break;
        }
      },
    });
  });
}

function getSelector(cfg: HubvisorBidParams['video'], bid: any): string | (() => Element | null) {
  if (cfg?.selector) {
    return cfg.selector;
  }
  if (window.CSS) {
    return `#${window.CSS.escape(bid.adUnitCode)}`;
  }
  return `#${bid.adUnitCode}`;
}

function playOutstream(containerOrSelector: string | (() => Element | null), options: Record<string, unknown>): void {
  const container = getContainer(containerOrSelector);
  const player = (window as any).HbvPlayer;
  if (!player) {
    logError('Failed to load player!');
    return;
  }
  player.playOutstream(container, options);
}

function getContainer(containerOrSelector: string | (() => Element | null)): Element | null | undefined {
  if (isStr(containerOrSelector)) {
    const container = document.querySelector(containerOrSelector as string);
    if (container) {
      return container;
    }
    logError(`Player container not found for selector ${containerOrSelector}`);
    return undefined;
  }
  if (isFn(containerOrSelector)) {
    const container = (containerOrSelector as () => Element | null)();
    if (container) {
      return container;
    }
    logError('Player container not found for selector function');
    return undefined;
  }
  return containerOrSelector as unknown as Element;
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: 1112,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(_bid: BidRequest<typeof BIDDER_CODE>): boolean {
    return true;
  },

  buildRequests(
    bidRequests: BidRequest<typeof BIDDER_CODE>[],
    bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>
  ): HubvisorAdapterRequest[] {
    const { gdprConsent = {} as { gdprApplies?: boolean; consentString?: string } } = bidderRequest as any;
    const placementIds = bidRequests
      .map(getPlacementIdFromBidRequest)
      .filter((id): id is string => !!id);
    const auctionRequest = converter.toORTB({ bidRequests, bidderRequest });
    const bidRequestsById = bidRequests.reduce<Record<string, BidRequest<typeof BIDDER_CODE>>>((acc, bidRequest) => {
      acc[bidRequest.bidId] = bidRequest;
      return acc;
    }, {});
    const syncData: Record<string, unknown> = {
      gdpr: gdprConsent.gdprApplies ?? false,
      placement_ids: placementIds.join(','),
    };
    if (gdprConsent.consentString) {
      syncData.gdpr_consent = gdprConsent.consentString;
    }
    return [
      {
        method: 'GET',
        url: SYNC_ENDPOINT,
        data: syncData,
      },
      {
        method: 'POST',
        url: AUCTION_ENDPOINT,
        data: auctionRequest,
        internal: { bidRequestsById },
      },
    ];
  },

  interpretResponse(response: ServerResponse, request: AdapterRequest): any[] {
    const hubvisorRequest = request as HubvisorAdapterRequest;
    const { bidRequestsById } = hubvisorRequest.internal ?? {};
    if (!bidRequestsById) {
      return [];
    }
    const bids = (converter.fromORTB({
      response: response.body,
      request: request.data,
    }) as ExtendedResponse).bids ?? [];
    for (const bid of bids) {
      const bidRequest = bidRequestsById[bid.requestId];
      if (bid.mediaType === 'video') {
        const video = bidRequest?.mediaTypes?.video;
        if (video?.context === 'outstream') {
          const videoParameters = bidRequest.params?.video;
          bid.renderer = makeOutstreamRenderer(bid, videoParameters);
        }
      }
    }
    return bids;
  },

  getUserSyncs(
    _syncOptions: { iframeEnabled: boolean; pixelEnabled: boolean },
    serverResponses: ServerResponse[]
  ): { type: SyncType; url: string }[] {
    if (serverResponses.length !== 2) {
      return [];
    }
    const [syncResponse] = serverResponses;
    const body = syncResponse.body as SyncResponseBody | undefined;
    return (body?.bidders ?? []).reduce<{ type: SyncType; url: string }[]>((acc, { type, url }) => {
      const syncType = SYNC_TYPE_MAP[type];
      if (!syncType || !url) {
        return acc;
      }
      return acc.concat({ type: syncType, url });
    }, []);
  },
};

registerBidder(spec);
