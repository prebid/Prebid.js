import {config} from '../../src/config.js';
import * as events from '../../src/events.js';
import {logError, logWarn, mergeDeep} from '../../src/utils.js';
import {getGlobal} from '../../src/prebidGlobal.js';
import {EVENTS} from '../../src/constants.js';
import {
    AD_ERROR,
    AD_IMPRESSION,
    additionalEvents,
    AUCTION_AD_LOAD_ABORT,
    BID_ERROR,
    BID_IMPRESSION,
    videoEvents
} from '../../libraries/video/constants/events.js'
import {PLACEMENT} from '../../libraries/video/constants/ortb.js';
import {videoKey} from '../../libraries/video/constants/constants.js'
import {videoCoreFactory} from './coreVideo.js';
import {gamSubmoduleFactory} from './gamAdServerSubmodule.js';
import {videoImpressionVerifierFactory} from './videoImpressionVerifier.js';
import {AdQueueCoordinator} from './adQueue.js';
import {getExternalVideoEventName, getExternalVideoEventPayload} from '../../libraries/video/shared/helpers.js'
import {VIDEO} from '../../src/mediaTypes.js';
import {auctionManager} from '../../src/auctionManager.js';
import {doRender} from '../../src/adRendering.js';
import {getHook} from '../../src/hook.js';
import {type VideoBid} from '../../src/bidfactory.js';
import type {BidderCode} from "../../src/types/common.d.ts";
import type {ORTBImp, ORTBRequest} from "../../src/types/ortb/request.d.ts";
import type {DeepPartial} from "../../src/types/objects.d.ts";
import type {AdServerVendor} from "../../libraries/video/constants/vendorCodes.ts";
import type {VideoEvent} from "../../libraries/video/constants/events.ts";

const allVideoEvents = Object.keys(videoEvents).map(eventKey => videoEvents[eventKey]);

events.addEvents(allVideoEvents.concat(additionalEvents).map(getExternalVideoEventName) as any);

declare module '../../src/events' {
    interface EventNames {
        video: VideoEvent
    }
}

interface AdServerConfig {
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

declare module '../../src/adUnits' {
    interface AdUnitDefinition {
        video?: AdUnitVideoOptions
    }
}

/**
 * This module adds User Video support to prebid.js
 * @module modules/videoModule
 */
export function PbVideo(videoCore_, getConfig_, pbGlobal_, requestBids_, pbEvents_, videoEvents_, gamAdServerFactory_, videoImpressionVerifierFactory_, adQueueCoordinator_) {
  const videoCore = videoCore_;
  const getConfig = getConfig_;
  const pbGlobal = pbGlobal_;
  const requestBids = requestBids_;
  const pbEvents = pbEvents_;
  const videoEvents = videoEvents_;
  const gamAdServerFactory = gamAdServerFactory_;
  const adQueueCoordinator = adQueueCoordinator_;
  let gamSubmodule;
  let mainContentDivId;
  let contentEnrichmentEnabled = true;
  const videoImpressionVerifierFactory = videoImpressionVerifierFactory_;
  let videoImpressionVerifier;

  function init() {
    const cache = getConfig('cache');
    videoImpressionVerifier = videoImpressionVerifierFactory(!!cache);
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
    });

    requestBids.before(beforeBidsRequested, 40);

    pbEvents.on(EVENTS.BID_ADJUSTMENT, function (bid) {
      videoImpressionVerifier.trackBid(bid);
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

  function getOrtbContent(divId: string): DeepPartial<ORTBRequest['site']['content']> {
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

    const adUnits = bidderRequest.adUnits || pbGlobal.adUnits || [];
    adUnits.forEach(adUnit => {
      const divId = getDivId(adUnit);
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
      video.playerSize = [width, height];
    }

    adUnit.mediaTypes.video = video;
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
    )
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
      pbEvents.emit(getExternalVideoEventName(AUCTION_AD_LOAD_ABORT), getExternalVideoEventPayload(AUCTION_AD_LOAD_ABORT, {adUnitCode}));
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
    const bidIdentifiers = videoImpressionVerifier.getBidIdentifiers(adId, adTagUrl, wrapperAdIds);
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

export function pbVideoFactory() {
  const videoCore = videoCoreFactory();
  const adQueueCoordinator = AdQueueCoordinator(videoCore, events);
  const pbGlobal = getGlobal();
  const pbVideo = PbVideo(videoCore, config.getConfig, pbGlobal, getHook('requestBids'), events, allVideoEvents, gamSubmoduleFactory, videoImpressionVerifierFactory, adQueueCoordinator);
  pbVideo.init();
  pbGlobal.videoModule = pbVideo;
  doRender.before(videoRenderHook);
  return pbVideo;
}

pbVideoFactory();
