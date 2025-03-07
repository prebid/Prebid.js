import { ajax } from '../src/ajax.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, generateUUID } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { Renderer } from '../src/Renderer.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { getStorageManager } from '../src/storageManager.js';

/* General config */
const IS_LOCAL_MODE = false;
const BIDDER_CODE = 'goldbach';
const BIDDER_UID_KEY = 'goldbach_uid';
const GVLID = 580;
const URL = 'https://goldlayer-api.prod.gbads.net/openrtb/2.5/auction';
const URL_LOCAL = 'http://localhost:3000/openrtb/2.5/auction';
const URL_LOGGING = 'https://l.da-services.ch/pb';
const URL_COOKIESYNC = 'https://goldlayer-api.prod.gbads.net/cookiesync';
const METHOD = 'POST';
const DEFAULT_CURRENCY = 'USD';
const LOGGING_PERCENTAGE_REGULAR = 0.0001;
const LOGGING_PERCENTAGE_ERROR = 0.001;
const COOKIE_EXP = 1000 * 60 * 60 * 24 * 365;

/* Renderer settings */
const RENDERER_OPTIONS = {
  OUTSTREAM_GP: {
    MIN_HEIGHT: 300,
    MIN_WIDTH: 300,
    URL: 'https://goldplayer.prod.gbads.net/scripts/goldplayer.js'
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

/* Native mapping */
export const OPENRTB = {
  NATIVE: {
    IMAGE_TYPE: {
      ICON: 1,
      MAIN: 3,
    },
    ASSET_ID: {
      TITLE: 1,
      IMAGE: 2,
      ICON: 3,
      BODY: 4,
      CTA: 5,
      SPONSORED: 6,
    }
  }
};

/* Goldbach storage */
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const setUid = (uid) => {
  if (storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(BIDDER_UID_KEY, uid);
  } else if (storage.cookiesAreEnabled()) {
    const cookieExpiration = new Date(Date.now() + COOKIE_EXP).toISOString();
    storage.setCookie(BIDDER_UID_KEY, uid, cookieExpiration, 'None');
  }
};

const getUid = () => {
  if (storage.localStorageIsEnabled()) {
    return storage.getDataFromLocalStorage(BIDDER_UID_KEY);
  } else if (storage.cookiesAreEnabled()) {
    return storage.getCookie(BIDDER_UID_KEY);
  }
  return null;
};

const ensureUid = () => {
  const existingUid = getUid() || null;
  if (existingUid) return existingUid;
  const newUid = generateUUID();
  setUid(newUid);
  return newUid;
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
      const { playbackmethod } = bidRequest?.params?.video || {}
      const isMuted = typeof playbackmethod === 'number' ? [2, 6].includes(playbackmethod) : false;
      const isAutoplay = typeof playbackmethod === 'number' ? [1, 2].includes(playbackmethod) : false;

      bid.renderer.push(() => {
        if (doc.defaultView?.GoldPlayer) {
          const options = {
            vastUrl: bid.vastUrl,
            vastXML: bid.vastXml,
            autoplay: isAutoplay,
            muted: isMuted,
            controls: true,
            resizeMode: 'auto',
            styling: { progressbarColor: '#000' },
            videoHeight: Math.max(doc.defaultView?.innerWidth / 16 * 9, RENDERER_OPTIONS.OUTSTREAM_GP.MIN_HEIGHT),
            videoVerticalHeight: Math.max(doc.defaultView?.innerWidth / 9 * 16, RENDERER_OPTIONS.OUTSTREAM_GP.MIN_WIDTH),
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
  request(buildRequest, imps, bidderRequest, context) {
    const ortbRequest = buildRequest(imps, bidderRequest, context);
    const { bidRequests = [] } = context;
    const firstBidRequest = bidRequests?.[0];

    // Apply custom extensions to each impression
    bidRequests.forEach((bidRequest, index) => {
      const ortbImp = ortbRequest.imp[index];
      ortbImp.ext = ortbImp.ext || {};
      ortbImp.ext[BIDDER_CODE] = ortbImp.ext[BIDDER_CODE] || {};
      ortbImp.ext[BIDDER_CODE].targetings = bidRequest?.params?.customTargeting || {};
      ortbImp.ext[BIDDER_CODE].slotId = bidRequest?.params?.slotId || bidRequest?.adUnitCode;
    });

    // Apply custom extensions to the request
    if (bidRequests.length > 0) {
      ortbRequest.ext = ortbRequest.ext || {};
      ortbRequest.ext[BIDDER_CODE] = ortbRequest.ext[BIDDER_CODE] || {};
      ortbRequest.ext[BIDDER_CODE].uid = ensureUid();
      ortbRequest.ext[BIDDER_CODE].targetings = firstBidRequest?.params?.customTargeting || {};
      ortbRequest.ext[BIDDER_CODE].publisherId = firstBidRequest?.params?.publisherId;
      ortbRequest.ext[BIDDER_CODE].mockResponse = firstBidRequest?.params?.mockResponse || false;
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
    const {bidRequest} = context;

    // Setting required properties: cpm, currency
    bidResponse.currency = bidResponse.currency || deepAccess(bid, 'ext.origbidcur') || DEFAULT_CURRENCY;
    bidResponse.cpm = bidResponse.cpm || deepAccess(bid, 'price');

    // Setting required properties: meta
    bidResponse.meta = bidResponse.meta || {};
    bidResponse.meta.advertiserDomains = deepAccess(bid, 'adomain');
    bidResponse.meta.mediaType = deepAccess(bid, 'ext.prebid.type');
    bidResponse.meta.primaryCatId = deepAccess(bid, 'ext.prebid.video.primary_category');
    bidResponse.meta.secondaryCatIds = deepAccess(bid, 'ext.prebid.video.secondary_categories');

    // Setting extensions: outstream video renderer
    if (bidResponse.mediaType === VIDEO && bidRequest.mediaTypes.video.context === 'outstream' && (bidResponse.vastUrl || bidResponse.vastXml)) {
      bidResponse.renderer = getRendererForBid(bidRequest, bidResponse);
    }
    return bidResponse;
  }
});

/* Logging */
const sendLog = (data, percentage = 0.0001) => {
  if (Math.random() > percentage) return;
  const encodedData = `data=${window.btoa(JSON.stringify({...data, source: 'goldbach_pbjs', projectedAmount: (1 / percentage)}))}`;
  ajax(URL_LOGGING, null, encodedData, {
    withCredentials: false,
    method: METHOD,
    crossOrigin: true,
    contentType: 'application/x-www-form-urlencoded',
  });
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: function (bid) {
    return typeof bid.params.publisherId === 'string' && Array.isArray(bid.sizes);
  },
  buildRequests: function (bidRequests, bidderRequest) {
    const url = IS_LOCAL_MODE ? URL_LOCAL : URL;
    const data = converter.toORTB({ bidRequests, bidderRequest })
    return [{
      method: METHOD,
      url: url,
      data: data,
      bidderRequest: bidderRequest,
      options: {
        withCredentials: false,
        contentType: 'application/json',
      }
    }];
  },
  interpretResponse: function (ortbResponse, request) {
    const bids = converter.fromORTB({response: ortbResponse.body, request: request.data}).bids;
    return bids
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []
    const uid = ensureUid();
    if (hasPurpose1Consent(gdprConsent)) {
      let type = (syncOptions.pixelEnabled) ? 'image' : null ?? (syncOptions.iframeEnabled) ? 'iframe' : null
      if (type) {
        syncs.push({
          type: type,
          url: `https://ib.adnxs.com/getuid?${URL_COOKIESYNC}?uid=${uid}&xandrId=$UID`
        })
      }
    }
    return syncs
  },
  onTimeout: function(timeoutData) {
    const payload = {
      event: EVENTS.TIMEOUT,
      error: timeoutData,
    };
    sendLog(payload, LOGGING_PERCENTAGE_ERROR);
  },
  onBidWon: function(bid) {
    const payload = {
      event: EVENTS.BID_WON,
      adUnitCode: bid.adUnitCode,
      adId: bid.adId,
      mediaType: bid.mediaType,
      size: bid.size,
    };
    sendLog(payload, LOGGING_PERCENTAGE_REGULAR);
  },
  onSetTargeting: function(bid) {
    const payload = {
      event: EVENTS.TARGETING,
      adUnitCode: bid.adUnitCode,
      adId: bid.adId,
      mediaType: bid.mediaType,
      size: bid.size,
    };
    sendLog(payload, LOGGING_PERCENTAGE_REGULAR);
  },
  onBidderError: function({ error }) {
    const payload = {
      event: EVENTS.ERROR,
      error: error,
    };
    sendLog(payload, LOGGING_PERCENTAGE_ERROR);
  },
  onAdRenderSucceeded: function(bid) {
    const payload = {
      event: EVENTS.RENDER,
      adUnitCode: bid.adUnitCode,
      adId: bid.adId,
      mediaType: bid.mediaType,
      size: bid.size,
    };
    sendLog(payload, LOGGING_PERCENTAGE_REGULAR);
  },
}

registerBidder(spec);
