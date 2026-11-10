import { config } from '../../src/config.js';
import * as events from '../../src/events.js';
import { logError, logWarn, mergeDeep } from '../../src/utils.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import { EVENTS } from '../../src/constants.js';
import {
  AD_ERROR,
  AD_IMPRESSION,
  additionalEvents,
  AUCTION_AD_LOAD_ABORT,
  BID_ERROR,
  BID_IMPRESSION,
  videoEvents
} from '../../libraries/video/constants/events.js';
import { PLACEMENT } from '../../libraries/video/constants/ortb.js';
import { videoKey } from '../../libraries/video/constants/constants.js';
import { videoCoreFactory } from './coreVideo.js';
import { gamSubmoduleFactory } from './gamAdServerSubmodule.js';
import { tracker, videoImpressionVerifierFactory } from './videoImpressionVerifier.js';
import { AdQueueCoordinator } from './adQueue.js';
import { getNearestSizeBucket, normalizeSizeBuckets } from './sizeBuckets.js';
import { getExternalVideoEventName, getExternalVideoEventPayload } from '../../libraries/video/shared/helpers.js';
import { VIDEO } from '../../src/mediaTypes.js';
import { auctionManager } from '../../src/auctionManager.js';
import { doRender } from '../../src/adRendering.js';
import { getHook } from '../../src/hook.js';
import { type VideoBid } from '../../src/bidfactory.js';
import type { BidderCode, Size } from "../../src/types/common.d.ts";
import type { ORTBImp, ORTBRequest } from "../../src/types/ortb/request.d.ts";
import type { DeepPartial } from "../../src/types/objects.d.ts";
import type { AdServerVendor } from "../../libraries/video/constants/vendorCodes.ts";
import type { VideoEvent } from "../../libraries/video/constants/events.ts";
import { isRendererAllowed } from "../../src/utils/renderers.ts";

const allVideoEvents = Object.keys(videoEvents).map(eventKey => videoEvents[eventKey]);

events.addEvents(allVideoEvents.concat(additionalEvents).map(getExternalVideoEventName) as any);

declare module '../../src/events' {
  interface EventNames {
    video: VideoEvent
  }
}

export interface AdServerConfig {
  /**
   * The identifier of the AdServer vendor (i.e. gam, etc).
   */
  vendorCode: AdServerVendor
  /**
   * Your AdServer Ad Tag. The targeting params of the winning bid will be appended.
   */
  baseAdTagUrl?: string;
  /**
   * Querystring parameters that will be used to construct the video ad tag URL.
   */
  params?: Record<string, string>;
}

interface AdUnitVideoOptions {
  /**
   * Unique identifier of the player provider, used to specify which player should be used to render the ad.
   * Equivalent to the HTML Div Id of the player.
   */
  divId: string;
  /**
   * Configuration for ad server integration. Supersedes video.adServer configurations defined in the Prebid Config.
   */
  adServer?: AdServerConfig
}

export interface VideoProviderConfig {
  /**
   * The identifier of the Video Provider vendor (i.e. 1 for JW Player, 2 for videojs, etc).
   */
  vendorCode: number;
  /**
   * The HTML element id of the player or its placeholder div.
   */
  divId: string;
  playerConfig?: Record<string, unknown>;
  /**
   * Configuration for ad server integration, applied to all ad units linked to this provider.
   */
  adServer?: AdServerConfig;
}

export interface VideoModuleConfig {
  /**
   * List of Provider configurations; one for each player instance that should be integrated.
   */
  providers: VideoProviderConfig[];
  /**
   * Defaults to true. Set to false to prevent the Video Module from enriching `site.content` in the bidder request.
   */
  contentEnrichmentEnabled?: boolean;
  /**
   * Div Id of the video player intended to populate `site.content` in the bidder request.
   */
  mainContentDivId?: string;
  /**
   * Configuration for ad server integration, applied to all providers and ad units.
   */
  adServer?: AdServerConfig;
  /**
   * List of player sizes, as `[width, height]`, that the video module should report instead of
   * the player's actual size. Since players are often sized dynamically, their real dimensions
   * rarely match the sizes that demand targets; when this is set, the size reported for each ad unit
   * (`mediaTypes.video.playerSize`, `.w` and `.h`, which become `imp.video.w` / `imp.video.h`)
   * is the bucket nearest to the player's actual size, and the actual size is
   * reported as `imp.video.ext.true_size` (`{w, h}`).
   *
   * "Nearest" is the smallest Euclidean distance between `[width, height]` pairs; ties go to the bucket
   * listed first. Entries that are not a pair of positive integers are ignored (with a warning).
   * Bucketing is skipped for ad units where the publisher has set `playerSize`, `w` or `h`.
   */
  sizeBuckets?: Size[];
}

declare module '../../src/config' {
  interface Config {
    video?: VideoModuleConfig;
  }
}

declare module '../../src/adUnits' {
  interface AdUnitDefinition {
    video?: AdUnitVideoOptions
  }
}

/**
 * This module adds User Video support to prebid.js
 * @module modules/videoModule
 */
export function PbVideo(videoCore_, getConfig_, pbGlobal_, requestBids_, pbEvents_, videoEvents_, gamAdServerFactory_, videoImpressionVerifierFactory_, adQueueCoordinator_, bidTracker_) {
  const videoCore = videoCore_;
  const getConfig = getConfig_;
  const pbGlobal = pbGlobal_;
  const requestBids = requestBids_;
  const pbEvents = pbEvents_;
  const videoEvents = videoEvents_;
  const gamAdServerFactory = gamAdServerFactory_;
  const adQueueCoordinator = adQueueCoordinator_;
  const bidTracker = bidTracker_;
  let gamSubmodule;
  let mainContentDivId;
  let contentEnrichmentEnabled = true;
  let sizeBuckets: Size[] | null = null;
  const videoImpressionVerifierFactory = videoImpressionVerifierFactory_;
  let cachedImpressionVerifier;
  let uncachedImpressionVerifier;

  function getImpressionVerifier() {
    return getConfig('cache') ? cachedImpressionVerifier : uncachedImpressionVerifier;
  }

  function init() {
    cachedImpressionVerifier = videoImpressionVerifierFactory(true, bidTracker);
    uncachedImpressionVerifier = videoImpressionVerifierFactory(false, bidTracker);
    getConfig(videoKey, ({ video }) => {
      video.providers.forEach(provider => {
        const divId = provider.divId;
        videoCore.registerProvider(provider);
        adQueueCoordinator.registerProvider(divId);
        videoCore.initProvider(divId);
        videoCore.onEvents(videoEvents, (type, payload) => {
          pbEvents.emit(getExternalVideoEventName(type), getExternalVideoEventPayload(type, payload));
        }, divId);

        const adServerConfig = provider.adServer;
        if (!gamSubmodule && adServerConfig) {
          gamSubmodule = gamAdServerFactory();
        }
      });
      contentEnrichmentEnabled = video.contentEnrichmentEnabled !== false;
      mainContentDivId = contentEnrichmentEnabled ? video.mainContentDivId : null;
      sizeBuckets = normalizeSizeBuckets(video.sizeBuckets);
    });

    requestBids.before(beforeBidsRequested, 40);

    pbEvents.on(EVENTS.BID_ADJUSTMENT, function (bid) {
      getImpressionVerifier().trackBid(bid, auctionManager.index.getAdUnit(bid));
    });

    pbEvents.on(getExternalVideoEventName(AD_IMPRESSION), function (payload) {
      triggerVideoBidEvent(BID_IMPRESSION, payload);
    });

    pbEvents.on(getExternalVideoEventName(AD_ERROR), function (payload) {
      triggerVideoBidEvent(BID_ERROR, payload);
    });
  }

  type RenderBidOptions = {
    adXml?: string;
    winner?: BidderCode;
    [option: string]: unknown;
  };

  function renderBid(divId: string, bid: VideoBid, options: RenderBidOptions = {}) {
    const adUrl = bid.vastUrl;
    options.adXml = bid.vastXml;
    options.winner = bid.bidder;

    loadAd(adUrl, divId, options);
  }

  function getOrtbVideo(divId: string): DeepPartial<ORTBImp['video']> {
    return videoCore.getOrtbVideo(divId);
  }

  function getOrtbContent(divId: string): DeepPartial<NonNullable<ORTBRequest['site']>['content']> {
    return videoCore.getOrtbContent(divId);
  }

  return { init, renderBid, getOrtbVideo, getOrtbContent };

  function beforeBidsRequested(nextFn, bidderRequest) {
    logErrorForInvalidDivIds(bidderRequest);
    enrichAuction(bidderRequest);

    const bidsBackHandler = bidderRequest.bidsBackHandler;
    if (!bidsBackHandler || typeof bidsBackHandler !== 'function') {
      pbEvents.on(EVENTS.AUCTION_END, auctionEnd);
    }

    return nextFn.call(this, bidderRequest);
  }

  function logErrorForInvalidDivIds(bidderRequest) {
    const adUnits = bidderRequest.adUnits || pbGlobal.adUnits || [];
    adUnits.forEach(adUnit => {
      const video = adUnit.video;
      if (!video) {
        return;
      }
      if (!video.divId) {
        logError(`Missing Video player div ID for ad unit '${adUnit.code}'`);
      }
      if (!videoCore.hasProviderFor(video.divId)) {
        logError(`Video player div ID '${video.divId}' for ad unit '${adUnit.code}' does not match any registered player`);
      }
    });
  }

  function enrichAuction(bidderRequest) {
    if (mainContentDivId) {
      enrichOrtb2(mainContentDivId, bidderRequest);
    }

    const adUnits = bidderRequest.adUnits ?? (bidderRequest.adUnits = (pbGlobal.adUnits || []).slice());
    adUnits.forEach((adUnit, i) => {
      const divId = getDivId(adUnit);
      if (divId) {
        // enrich a copy: requestBids only copies the array, and publishers often reuse ad unit objects, so the sizes
        // written here would otherwise stick to the publisher's object and skip enrichment in later auctions
        adUnit = adUnits[i] = { ...adUnit, mediaTypes: { ...adUnit.mediaTypes } };
      }
      enrichAdUnit(adUnit, divId);
      if (contentEnrichmentEnabled && !mainContentDivId) {
        enrichOrtb2(divId, bidderRequest);
      }
    });
  }

  function getDivId(adUnit) {
    const videoConfig = adUnit.video;
    if (!adUnit.mediaTypes.video || !videoConfig) {
      return;
    }

    return videoConfig.divId;
  }

  function enrichAdUnit(adUnit, videoDivId) {
    const ortbVideo = getOrtbVideo(videoDivId);
    if (!ortbVideo) {
      return;
    }

    const video = Object.assign({}, ortbVideo, adUnit.mediaTypes.video);

    if (!video.context) {
      video.context = ortbVideo.placement === PLACEMENT.INSTREAM ? 'instream' : 'outstream';
    }

    if (!video.plcmt) {
      logWarn('Video.plcmt has not been set. Failure to set a value may result in loss of bids');
    }

    const width = ortbVideo.w;
    const height = ortbVideo.h;
    if (!video.playerSize && width && height) {
      const bucket = sizeBuckets && !hasPublisherSize(adUnit) ? getNearestSizeBucket([width, height], sizeBuckets) : null;
      if (bucket) {
        [video.w, video.h] = bucket;
        video.playerSize = bucket;
        adUnit.ortb2Imp = mergeDeep({}, adUnit.ortb2Imp, { video: { ext: { true_size: { w: width, h: height } } } });
      } else {
        video.playerSize = [width, height];
      }
    }

    adUnit.mediaTypes.video = video;
  }

  function hasPublisherSize(adUnit) {
    return [adUnit.mediaTypes.video, adUnit.ortb2Imp?.video].some(video => video?.w != null || video?.h != null);
  }

  function enrichOrtb2(divId, bidderRequest) {
    const ortbContent = getOrtbContent(divId);
    if (!ortbContent) {
      return;
    }
    bidderRequest.ortb2 = mergeDeep({}, bidderRequest.ortb2, { site: { content: ortbContent } });
  }

  function auctionEnd(auctionResult) {
    pbEvents.off(EVENTS.AUCTION_END, auctionEnd);
    return Promise.all(
      auctionResult.adUnits
        .filter(au => au.video)
        .map(renderWinningBid)
    );
  }

  function getAdServerConfig(adUnitVideoConfig) {
    const globalVideoConfig = getConfig(videoKey);
    const globalProviderConfig = globalVideoConfig.providers.find(provider => provider.divId === adUnitVideoConfig.divId) || {};
    if (!globalVideoConfig.adServer && !globalProviderConfig.adServer && !adUnitVideoConfig.adServer) {
      return;
    }
    return mergeDeep({}, globalVideoConfig.adServer, globalProviderConfig.adServer, adUnitVideoConfig.adServer);
  }

  async function renderWinningBid(adUnit) {
    const adUnitCode = adUnit.code;

    const videoConfig = adUnit.video;
    const divId = videoConfig.divId;

    const adServerConfig = getAdServerConfig(videoConfig);
    const winningBid = getWinningBid(adUnitCode);
    if (!winningBid) return;

    const options: any = { adUnitCode };

    async function prefetchVast() {
      const gamVastWrapper = await gamSubmodule.getVastXml(
        adUnit, adServerConfig.baseAdTagUrl, adServerConfig.params, winningBid
      );
      options.prefetchedVastXml = gamVastWrapper;
    }

    if (adServerConfig) {
      if (config.getConfig('cache.useLocal')) {
        await prefetchVast();
      } else {
        const adTagUrl = gamSubmodule.getAdTagUrl(
          adUnit, adServerConfig.baseAdTagUrl, adServerConfig.params
        );
        loadAd(adTagUrl, divId, options);
        return;
      }
    }

    renderBid(divId, winningBid, options);
  }

  function getWinningBid(adUnitCode) {
    const highestCpmBids = pbGlobal.getHighestCpmBids(adUnitCode);
    if (!highestCpmBids.length) {
      pbEvents.emit(getExternalVideoEventName(AUCTION_AD_LOAD_ABORT), getExternalVideoEventPayload(AUCTION_AD_LOAD_ABORT, { adUnitCode }));
      return;
    }
    return highestCpmBids.shift();
  }

  function loadAd(adTagUrl: string, divId: string, options: RenderBidOptions) {
    adQueueCoordinator.queueAd(adTagUrl, divId, options);
  }

  function triggerVideoBidEvent(eventName, adEventPayload) {
    const bid = getBid(adEventPayload);
    if (!bid) {
      return;
    }

    pbGlobal.markWinningBidAsUsed(bid);
    pbEvents.emit(getExternalVideoEventName(eventName), getExternalVideoEventPayload(eventName, { bid, adEvent: adEventPayload }));
  }

  function getBid(adPayload) {
    const { adId, adTagUrl, wrapperAdIds } = adPayload;
    const bidIdentifiers = getImpressionVerifier().getBidIdentifiers(adId, adTagUrl, wrapperAdIds);
    if (!bidIdentifiers) {
      return;
    }

    const { adUnitCode, requestId, auctionId } = bidIdentifiers;
    const bidAdId = bidIdentifiers.adId;
    const { bids } = pbGlobal.getBidResponsesForAdUnitCode(adUnitCode);
    return ((bids) || []).find(bid => bid.adId === bidAdId && bid.requestId === requestId && bid.auctionId === auctionId);
  }
}

declare module '../../src/prebidGlobal' {
  interface PrebidJS {
    videoModule: ReturnType<typeof PbVideo>
  }
}

function videoRenderHook(next, args) {
  if (args.bidResponse.mediaType === VIDEO) {
    const adUnit = auctionManager.index.getAdUnit(args.bidResponse);
    if (adUnit?.video) {
      getGlobal().videoModule.renderBid(adUnit.video.divId, args.bidResponse);
      next.bail();
      return;
    }
  }
  next(args);
}

function isRendererAllowedHook(next, type, bidder, mediaType, adUnit, bidResponse) {
  if (mediaType === VIDEO && adUnit.video) {
    if (bidResponse?.[type] != null) {
      logWarn(`Ignoring bidder-provided ${type}: rendering is managed by the video module (adUnit.video is set)`, { bidResponse, adUnit });
    }
    next.bail(false);
  } else {
    next(type, bidder, mediaType, adUnit, bidResponse);
  }
}

export function pbVideoFactory() {
  const videoCore = videoCoreFactory();
  const adQueueCoordinator = AdQueueCoordinator(videoCore, events);
  const pbGlobal = getGlobal();
  const pbVideo = PbVideo(videoCore, config.getConfig, pbGlobal, getHook('requestBids'), events, allVideoEvents, gamSubmoduleFactory, videoImpressionVerifierFactory, adQueueCoordinator, tracker());
  pbVideo.init();
  pbGlobal.videoModule = pbVideo;
  doRender.before(videoRenderHook);
  isRendererAllowed.before(isRendererAllowedHook);
  return pbVideo;
}

pbVideoFactory();
