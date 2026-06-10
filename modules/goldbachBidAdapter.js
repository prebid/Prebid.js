import { ajax } from '../src/ajax.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { Renderer } from '../src/Renderer.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';

/* General config */
const IS_LOCAL_MODE = false;
const BIDDER_CODE = 'goldbach';
const GVLID = 580;
const URL = 'https://goldlayer-api.prod.gbads.net/openrtb/2.5/auction';
const URL_LOCAL = 'http://localhost:3000/openrtb/2.5/auction';
const URL_METRICS = 'https://goldlayer-api.prod.gbads.net/metrics';
const URL_METRICS_LOCAL = 'http://localhost:3000/metrics';
const METHOD = 'POST';
const DEFAULT_CURRENCY = 'USD';
const METRICS_SAMPLE_RATE_REGULAR = 0.001;
const METRICS_SAMPLE_RATE_ERROR = 0.001;

/* Renderer settings */
const RENDERER_OPTIONS = {
  OUTSTREAM_GP: {
    URL: 'https://goldplayer.prod.gbadtech.io/scripts/goldplayer.js'
  }
};

/* Event types */
const EVENTS = {
  BID_WON: 'bid_won',
  TARGETING: 'targeting_set',
  RENDER: 'creative_render',
  TIMEOUT: 'timeout',
  ERROR: 'error'
};

export const dep = {
  ajax
};

/* Custom extensions */
const getRendererForBid = (bidRequest, bidResponse) => {
  if (!bidRequest.renderer) {
    const config = { documentResolver: (_, sourceDocument, renderDocument) => renderDocument ?? sourceDocument };
    const renderer = Renderer.install({
      id: bidRequest.bidId,
      url: RENDERER_OPTIONS.OUTSTREAM_GP.URL,
      adUnitCode: bidRequest.adUnitCode,
      config
    });

    renderer.setRender((bid, doc) => {
      const videoParams = bidRequest?.mediaTypes?.video || {};
      const playerSize = videoParams.playerSize;
      const playerSizeTuple = Array.isArray(playerSize?.[0]) ? playerSize[0] : playerSize;
      const playbackmethod = videoParams.playbackmethod;
      const isMuted = typeof playbackmethod === 'number' ? [2, 6].includes(playbackmethod) : false;
      const isAutoplay = typeof playbackmethod === 'number' ? [1, 2].includes(playbackmethod) : false;

      bid.renderer.push(() => {
        if (doc.defaultView?.GoldPlayer) {
          const container = doc.getElementById(bid.adUnitCode);
          const options = {
            vastUrl: bid.vastUrl,
            vastXML: bid.vastXml,
            autoplay: isAutoplay,
            muted: isMuted,
            controls: true,
            resizeMode: 'auto',
            styling: { progressbarColor: '#000' },
            publisherProvidedWidth: playerSizeTuple?.[0],
            publisherProvidedHeight: playerSizeTuple?.[1],
            divContainerElement: container,
          };
          const GP = doc.defaultView.GoldPlayer;
          const player = new GP(options);
          player.play();
        }
      });
    });
    return renderer;
  }
  return undefined;
};

/* Converter config, applying custom extensions */
const converter = ortbConverter({
  context: { netRevenue: true, ttl: 3600 },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    // Apply custom extensions to the imp
    imp.ext = imp.ext || {};
    imp.ext[BIDDER_CODE] = imp.ext[BIDDER_CODE] || {};
    imp.ext[BIDDER_CODE].targetings = bidRequest?.params?.customTargeting || {};
    imp.ext[BIDDER_CODE].slotId = bidRequest?.params?.slotId || bidRequest?.adUnitCode;

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const ortbRequest = buildRequest(imps, bidderRequest, context);
    const { bidRequests = [] } = context;
    const firstBidRequest = bidRequests?.[0];

    // Apply custom extensions to the request. User identity comes from goldlayer-api's
    // own first-party cookie on bid requests (withCredentials: true), not from a
    // client-minted UID — so no `ext.goldbach.uid` here.
    if (bidRequests.length > 0) {
      ortbRequest.ext = ortbRequest.ext || {};
      ortbRequest.ext[BIDDER_CODE] = ortbRequest.ext[BIDDER_CODE] || {};
      ortbRequest.ext[BIDDER_CODE].publisherId = firstBidRequest?.params?.publisherId;
      ortbRequest.ext[BIDDER_CODE].mockResponse = firstBidRequest?.params?.mockResponse || false;
      ortbRequest.ext[BIDDER_CODE].auctionStartTime = Date.now();
    }

    // Apply gdpr consent data
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
    // Setting context: media type
    context.mediaType = deepAccess(bid, 'ext.prebid.type');
    const bidResponse = buildBidResponse(bid, context);
    const { bidRequest } = context;

    // Setting required properties: cpm, currency
    bidResponse.currency = bidResponse.currency || deepAccess(bid, 'ext.origbidcur') || DEFAULT_CURRENCY;
    bidResponse.cpm = bidResponse.cpm || deepAccess(bid, 'price');

    // Setting required properties: meta
    bidResponse.meta = bidResponse.meta || {};
    bidResponse.meta.advertiserDomains = deepAccess(bid, 'adomain');
    bidResponse.meta.mediaType = deepAccess(bid, 'ext.prebid.type');
    bidResponse.meta.primaryCatId = deepAccess(bid, 'ext.prebid.video.primary_category');
    bidResponse.meta.secondaryCatIds = deepAccess(bid, 'ext.prebid.video.secondary_categories');

    // Setting extensions: goldbach
    bidResponse.ext = bidResponse.ext || {};
    bidResponse.ext[BIDDER_CODE] = bidResponse.ext[BIDDER_CODE] || {};
    bidResponse.ext[BIDDER_CODE].publisherId = deepAccess(bid, 'ext.goldbach.publisherId') || bidRequest?.params?.publisherId;

    // Setting extensions: outstream video renderer
    if (bidResponse.mediaType === VIDEO && bidRequest.mediaTypes.video.context === 'outstream' && (bidResponse.vastUrl || bidResponse.vastXml)) {
      bidResponse.renderer = getRendererForBid(bidRequest, bidResponse);
    }
    return bidResponse;
  }
});

/* Metrics */
const sendMetrics = (data, sampleRate = 0.0001) => {
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
      crossOrigin: true,
      contentType: 'text/plain',
      keepalive: true,
    });
  } catch (error) {
    // Silent catch
  }
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: function (bid) {
    return typeof bid.params?.publisherId === 'string' && bid.params?.publisherId.length > 0;
  },
  buildRequests: function (bidRequests, bidderRequest) {
    const url = IS_LOCAL_MODE ? URL_LOCAL : URL;
    const data = converter.toORTB({ bidRequests, bidderRequest });
    return {
      method: METHOD,
      url: url,
      data: data,
      options: {
        withCredentials: true,
        contentType: 'text/plain',
      }
    };
  },
  interpretResponse: function (ortbResponse, request) {
    const bids = converter.fromORTB({ response: ortbResponse.body, request: request.data }).bids;
    return bids;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];
    if (!hasPurpose1Consent(gdprConsent)) return syncs;

    const serverSyncs = deepAccess(serverResponses, '0.body.ext.goldbach.syncs');
    if (!Array.isArray(serverSyncs)) return syncs;

    const gdprApplies = gdprConsent?.gdprApplies ? 1 : 0;
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
  onTimeout: function(timeoutData) {
    const payload = {
      event: EVENTS.TIMEOUT,
      data: {
        publisherId: timeoutData?.[0]?.params?.[0]?.publisherId,
        timeoutData: timeoutData,
      }
    };
    sendMetrics(payload, METRICS_SAMPLE_RATE_ERROR);
  },
  onBidWon: function(bid) {
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
  onSetTargeting: function(bid) {
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
  onBidderError: function({ error, bidderRequest }) {
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
  onAdRenderSucceeded: function(bid) {
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
