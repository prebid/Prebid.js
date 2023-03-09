import {deepAccess, deepClone, deepSetValue, logError, logWarn} from '../src/utils.js';
import {find} from '../src/polyfill.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {Renderer} from '../src/Renderer.js';
import {createEidsArray} from './userId/eids.js';

const DEV_MODE = window.location.search.match(/bbpbs_debug=true/);

// Blue Billywig  Constants
const BB_CONSTANTS = {
  BIDDER_CODE: 'bluebillywig',
  AUCTION_URL: '$$URL_STARTpbs.bluebillywig.com/openrtb2/auction?pub=$$PUBLICATION',
  SYNC_URL: '$$URL_STARTpbs.bluebillywig.com/static/cookie-sync.html?pub=$$PUBLICATION',
  RENDERER_URL: 'https://$$PUBLICATION.bbvms.com/r/$$RENDERER.js',
  DEFAULT_TIMEOUT: 5000,
  DEFAULT_TTL: 300,
  DEFAULT_WIDTH: 768,
  DEFAULT_HEIGHT: 432,
  DEFAULT_NET_REVENUE: true,
  VIDEO_PARAMS: ['mimes', 'minduration', 'maxduration', 'protocols', 'w', 'h', 'startdelay', 'placement', 'linearity', 'skip', 'skipmin',
    'skipafter', 'sequence', 'battr', 'maxextended', 'minbitrate', 'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend', 'delivery', 'pos', 'companionad',
    'api', 'companiontype', 'ext']
};

// Aliasing
const getConfig = config.getConfig;

// Helper Functions
const BB_HELPERS = {
  addSiteAppDevice: function(request, pageUrl) {
    if (typeof getConfig('app') === 'object') request.app = getConfig('app');
    else {
      request.site = {};
      if (typeof getConfig('site') === 'object') request.site = getConfig('site');
      if (pageUrl) request.site.page = pageUrl;
    }

    if (typeof getConfig('device') === 'object') request.device = getConfig('device');
    if (!request.device) request.device = {};
    if (!request.device.w) request.device.w = window.innerWidth;
    if (!request.device.h) request.device.h = window.innerHeight;
  },
  addSchain: function(request, validBidRequests) {
    const schain = deepAccess(validBidRequests, '0.schain');
    if (schain) request.source.ext = { schain: schain };
  },
  addCurrency: function(request) {
    const adServerCur = getConfig('currency.adServerCurrency');
    if (adServerCur && typeof adServerCur === 'string') request.cur = [adServerCur];
    else if (Array.isArray(adServerCur) && adServerCur.length) request.cur = [adServerCur[0]];
  },
  addUserIds: function(request, validBidRequests) {
    const bidUserId = deepAccess(validBidRequests, '0.userId');
    const eids = createEidsArray(bidUserId);

    if (eids.length) {
      deepSetValue(request, 'user.ext.eids', eids);
    }
  },
  substituteUrl: function (url, publication, renderer) {
    return url.replace('$$URL_START', (DEV_MODE) ? 'https://dev.' : 'https://').replace('$$PUBLICATION', publication).replace('$$RENDERER', renderer);
  },
  getAuctionUrl: function(publication) {
    return BB_HELPERS.substituteUrl(BB_CONSTANTS.AUCTION_URL, publication);
  },
  getSyncUrl: function(publication) {
    return BB_HELPERS.substituteUrl(BB_CONSTANTS.SYNC_URL, publication);
  },
  getRendererUrl: function(publication, renderer) {
    return BB_HELPERS.substituteUrl(BB_CONSTANTS.RENDERER_URL, publication, renderer);
  },
  transformVideoParams: function(videoParams, videoParamsExt) {
    videoParams = deepClone(videoParams);

    let playerSize = videoParams.playerSize || [BB_CONSTANTS.DEFAULT_WIDTH, BB_CONSTANTS.DEFAULT_HEIGHT];
    if (Array.isArray(playerSize[0])) playerSize = playerSize[0];

    videoParams.w = playerSize[0];
    videoParams.h = playerSize[1];
    videoParams.placement = 3;

    if (videoParamsExt) videoParams = Object.assign(videoParams, videoParamsExt);

    const videoParamsProperties = Object.keys(videoParams);

    videoParamsProperties.forEach(property => {
      if (BB_CONSTANTS.VIDEO_PARAMS.indexOf(property) === -1) delete videoParams[property];
    });

    return videoParams;
  },
  transformRTBToPrebidProps: function(bid, serverResponse) {
    const bidObject = {
      cpm: bid.price,
      currency: serverResponse.cur,
      netRevenue: BB_CONSTANTS.DEFAULT_NET_REVENUE,
      bidId: bid.impid,
      requestId: bid.impid,
      creativeId: bid.crid,
      mediaType: VIDEO,
      width: bid.w || BB_CONSTANTS.DEFAULT_WIDTH,
      height: bid.h || BB_CONSTANTS.DEFAULT_HEIGHT,
      ttl: BB_CONSTANTS.DEFAULT_TTL
    };

    const extPrebidTargeting = deepAccess(bid, 'ext.prebid.targeting');
    const extPrebidCache = deepAccess(bid, 'ext.prebid.cache');

    if (extPrebidCache && typeof extPrebidCache.vastXml === 'object' && extPrebidCache.vastXml.cacheId && extPrebidCache.vastXml.url) {
      bidObject.videoCacheKey = extPrebidCache.vastXml.cacheId;
      bidObject.vastUrl = extPrebidCache.vastXml.url;
    } else if (extPrebidTargeting && extPrebidTargeting.hb_uuid && extPrebidTargeting.hb_cache_host && extPrebidTargeting.hb_cache_path) {
      bidObject.videoCacheKey = extPrebidTargeting.hb_uuid;
      bidObject.vastUrl = `https://${extPrebidTargeting.hb_cache_host}${extPrebidTargeting.hb_cache_path}?uuid=${extPrebidTargeting.hb_uuid}`;
    }
    if (bid.adm) {
      bidObject.ad = bid.adm;
      bidObject.vastXml = bid.adm;
    }
    if (!bidObject.vastUrl && bid.nurl && !bid.adm) { // ad markup is on win notice url, and adm is ommited according to OpenRTB 2.5
      bidObject.vastUrl = bid.nurl;
    }
    bidObject.meta = bid.meta || {};
    if (bid.adomain) { bidObject.meta.advertiserDomains = bid.adomain; }
    return bidObject;
  },
};

// Renderer Functions
const BB_RENDERER = {
  bootstrapPlayer: function(bid) {
    const config = {
      code: bid.adUnitCode,
    };

    if (bid.vastXml) config.vastXml = bid.vastXml;
    else if (bid.vastUrl) config.vastUrl = bid.vastUrl;

    if (!bid.vastXml && !bid.vastUrl) {
      logWarn(`${BB_CONSTANTS.BIDDER_CODE}: No vastXml or vastUrl on bid, bailing...`);
      return;
    }

    if (!(window.bluebillywig && window.bluebillywig.renderers)) {
      logWarn(`${BB_CONSTANTS.BIDDER_CODE}: renderer code failed to initialize...`);
      return;
    }

    const rendererId = BB_RENDERER.getRendererId(bid.publicationName, bid.rendererCode);
    const ele = document.getElementById(bid.adUnitCode); // NB convention
    const renderer = find(window.bluebillywig.renderers, r => r._id === rendererId);

    if (renderer) renderer.bootstrap(config, ele, bid.rendererSettings || {});
    else logWarn(`${BB_CONSTANTS.BIDDER_CODE}: Couldn't find a renderer with ${rendererId}`);
  },
  newRenderer: function(rendererUrl, adUnitCode) {
    const renderer = Renderer.install({
      url: rendererUrl,
      loaded: false,
      adUnitCode
    });

    try {
      renderer.setRender(BB_RENDERER.outstreamRender);
    } catch (err) {
      logWarn(`${BB_CONSTANTS.BIDDER_CODE}: Error tying to setRender on renderer`, err);
    }

    return renderer;
  },
  outstreamRender: function(bid) {
    bid.renderer.push(function() { BB_RENDERER.bootstrapPlayer(bid) });
  },
  getRendererId: function(pub, renderer) {
    return `${pub}-${renderer}`; // NB convention!
  }
};

// Spec Functions
// These functions are used to construct the core spec for the adapter
export const spec = {
  code: BB_CONSTANTS.BIDDER_CODE,
  supportedMediaTypes: [VIDEO],
  syncStore: { bidders: [], },
  isBidRequestValid(bid) {
    const publicationNameRegex = /^\w+\.?\w+$/;
    const rendererRegex = /^[\w+_]+$/;

    if (!bid.params) {
      logError(`${BB_CONSTANTS.BIDDER_CODE}: no params set on bid. Rejecting bid: `, bid);
      return false;
    }

    if (!bid.params.hasOwnProperty('publicationName') || typeof bid.params.publicationName !== 'string') {
      logError(`${BB_CONSTANTS.BIDDER_CODE}: no publicationName specified in bid params, or it's not a string. Rejecting bid: `, bid);
      return false;
    } else if (!publicationNameRegex.test(bid.params.publicationName)) {
      logError(`${BB_CONSTANTS.BIDDER_CODE}: publicationName must be in format 'publication' or 'publication.environment'. Rejecting bid: `, bid);
      return false;
    }

    if ((!bid.params.hasOwnProperty('rendererCode') || typeof bid.params.rendererCode !== 'string')) {
      logError(`${BB_CONSTANTS.BIDDER_CODE}: no rendererCode was specified in bid params. Rejecting bid: `, bid);
      return false;
    } else if (!rendererRegex.test(bid.params.rendererCode)) {
      logError(`${BB_CONSTANTS.BIDDER_CODE}: rendererCode must be alphanumeric, including underscores. Rejecting bid: `, bid);
      return false;
    }

    if (!bid.params.accountId) {
      logError(`${BB_CONSTANTS.BIDDER_CODE}: no accountId specified in bid params. Rejecting bid: `, bid);
      return false;
    }

    if (bid.params.hasOwnProperty('connections')) {
      if (!Array.isArray(bid.params.connections)) {
        logError(`${BB_CONSTANTS.BIDDER_CODE}: connections is not of type array. Rejecting bid: `, bid);
        return false;
      } else {
        for (let i = 0; i < bid.params.connections.length; i++) {
          if (!bid.params.hasOwnProperty(bid.params.connections[i])) {
            logError(`${BB_CONSTANTS.BIDDER_CODE}: connection specified in params.connections, but not configured in params. Rejecting bid: `, bid);
            return false;
          }
        }
      }
    } else {
      logError(`${BB_CONSTANTS.BIDDER_CODE}: no connections specified in bid. Rejecting bid: `, bid);
      return false;
    }

    if (bid.params.hasOwnProperty('video') && (bid.params.video === null || typeof bid.params.video !== 'object')) {
      logError(`${BB_CONSTANTS.BIDDER_CODE}: params.video must be of type object. Rejecting bid: `, bid);
      return false;
    }

    if (bid.params.hasOwnProperty('rendererSettings') && (bid.params.rendererSettings === null || typeof bid.params.rendererSettings !== 'object')) {
      logError(`${BB_CONSTANTS.BIDDER_CODE}: params.rendererSettings must be of type object. Rejecting bid: `, bid);
      return false;
    }

    if (bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(VIDEO)) {
      if (!bid.mediaTypes[VIDEO].hasOwnProperty('context')) {
        logError(`${BB_CONSTANTS.BIDDER_CODE}: no context specified in bid. Rejecting bid: `, bid);
        return false;
      }

      if (bid.mediaTypes[VIDEO].context !== 'outstream') {
        logError(`${BB_CONSTANTS.BIDDER_CODE}: video.context is invalid, must be "outstream". Rejecting bid: `, bid);
        return false;
      }
    } else {
      logError(`${BB_CONSTANTS.BIDDER_CODE}: mediaTypes or mediaTypes.video is not specified. Rejecting bid: `, bid);
      return false;
    }

    return true;
  },
  buildRequests(validBidRequests, bidderRequest) {
    const imps = [];

    validBidRequests.forEach(validBidRequest => {
      if (!this.syncStore.publicationName) this.syncStore.publicationName = validBidRequest.params.publicationName;
      if (!this.syncStore.accountId) this.syncStore.accountId = validBidRequest.params.accountId;

      const ext = validBidRequest.params.connections.reduce((extBuilder, connection) => {
        extBuilder[connection] = validBidRequest.params[connection];

        if (this.syncStore.bidders.indexOf(connection) === -1) this.syncStore.bidders.push(connection);

        return extBuilder;
      }, {});

      const videoParams = BB_HELPERS.transformVideoParams(deepAccess(validBidRequest, 'mediaTypes.video'), deepAccess(validBidRequest, 'params.video'));
      imps.push({ id: validBidRequest.bidId, ext, secure: window.location.protocol === 'https' ? 1 : 0, video: videoParams });
    });

    const request = {
      id: bidderRequest.auctionId,
      source: {tid: bidderRequest.auctionId},
      tmax: BB_CONSTANTS.DEFAULT_TIMEOUT,
      imp: imps,
      test: DEV_MODE ? 1 : 0,
      ext: {
        prebid: {
          targeting: { includewinners: true, includebidderkeys: false }
        }
      }
    };

    // handle privacy settings for GDPR/CCPA/COPPA
    if (bidderRequest.gdprConsent) {
      let gdprApplies = 0;
      if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') gdprApplies = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      deepSetValue(request, 'regs.ext.gdpr', gdprApplies);
      deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    }

    if (bidderRequest.uspConsent) {
      deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      this.syncStore.uspConsent = bidderRequest.uspConsent;
    }

    if (getConfig('coppa') == true) deepSetValue(request, 'regs.coppa', 1);

    // Enrich the request with any external data we may have
    BB_HELPERS.addSiteAppDevice(request, bidderRequest.refererInfo && bidderRequest.refererInfo.page);
    BB_HELPERS.addSchain(request, validBidRequests);
    BB_HELPERS.addCurrency(request);
    BB_HELPERS.addUserIds(request, validBidRequests);

    return {
      method: 'POST',
      url: BB_HELPERS.getAuctionUrl(validBidRequests[0].params.publicationName),
      data: JSON.stringify(request),
      bidderRequest: bidderRequest
    };
  },
  interpretResponse(serverResponse, request) {
    serverResponse = serverResponse.body || {};

    if (!serverResponse.hasOwnProperty('seatbid') || !Array.isArray(serverResponse.seatbid)) {
      return [];
    }

    const bids = [];

    serverResponse.seatbid.forEach(seatbid => {
      if (!seatbid.bid || !Array.isArray(seatbid.bid)) return;
      seatbid.bid.forEach(bid => {
        bid = BB_HELPERS.transformRTBToPrebidProps(bid, serverResponse);

        const bidParams = find(request.bidderRequest.bids, bidderRequestBid => bidderRequestBid.bidId === bid.bidId).params;
        bid.publicationName = bidParams.publicationName;
        bid.rendererCode = bidParams.rendererCode;
        bid.accountId = bidParams.accountId;
        bid.rendererSettings = bidParams.rendererSettings;

        const rendererUrl = BB_HELPERS.getRendererUrl(bid.publicationName, bid.rendererCode);
        bid.renderer = BB_RENDERER.newRenderer(rendererUrl, bid.adUnitCode);

        bids.push(bid);
      });
    });

    return bids;
  },
  getUserSyncs(syncOptions, serverResponses, gdpr) {
    if (!syncOptions.iframeEnabled) return [];

    const queryString = [];

    if (gdpr.gdprApplies) queryString.push(`gdpr=${gdpr.gdprApplies ? 1 : 0}`);
    if (gdpr.gdprApplies && gdpr.consentString) queryString.push(`gdpr_consent=${gdpr.consentString}`);

    if (this.syncStore.uspConsent) queryString.push(`usp_consent=${this.syncStore.uspConsent}`);

    queryString.push(`accountId=${this.syncStore.accountId}`);
    queryString.push(`bidders=${btoa(JSON.stringify(this.syncStore.bidders))}`);
    queryString.push(`cb=${Date.now()}-${Math.random().toString().replace('.', '')}`);

    if (DEV_MODE) queryString.push('bbpbs_debug=true');

    // NB syncUrl by default starts with ?pub=$$PUBLICATION
    const syncUrl = `${BB_HELPERS.getSyncUrl(this.syncStore.publicationName)}&${queryString.join('&')}`;

    return [{
      type: 'iframe',
      url: syncUrl
    }];
  }
};

registerBidder(spec);
