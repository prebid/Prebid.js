import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { createEidsArray } from './userId/eids.js';

const DEV_MODE = window.location.search.match(/bbpbs_debug=true/);

// Blue Billywig Constants
const BB_CONSTANTS = {
  BIDDER_CODE: 'bluebillywig',
  AUCTION_URL: '$$URL_STARTpbs.bluebillywig.com/openrtb2/auction?pub=$$PUBLICATION',
  SYNC_URL: '$$URL_STARTpbs.bluebillywig.com/static/cookie-sync.html?pub=$$PUBLICATION',
  RENDERER_URL: 'https://$$PUBLICATION.bbvms.com/r/$$RENDERER.js',
  DEFAULT_TIMEOUT: 5000,
  DEFAULT_TTL: 300,
  DEFAULT_WIDTH: 768,
  DEFAULT_HEIGHT: 432,
  DEFAULT_NET_REVENUE: true
};

// Aliasing
const getConfig = config.getConfig;

// Helper Functions
export const BB_HELPERS = {
  addSiteAppDevice: function(request, pageUrl) {
    if (!request) return;

    if (typeof getConfig('app') === 'object') request.app = getConfig('app');
    else if (pageUrl) request.site = { page: pageUrl };

    if (typeof getConfig('device') === 'object') request.device = getConfig('device');
    if (!request.device) request.device = {};
    if (!request.device.w) request.device.w = window.innerWidth;
    if (!request.device.h) request.device.h = window.innerHeight;
  },
  addSchain: function(request, validBidRequests) {
    if (!request) return;

    const schain = utils.deepAccess(validBidRequests, '0.schain');
    if (schain) request.source.ext = { schain: schain };
  },
  addCurrency: function(request) {
    if (!request) return;

    const adServerCur = getConfig('currency.adServerCurrency');
    if (adServerCur && typeof adServerCur === 'string') request.cur = [adServerCur];
    else if (Array.isArray(adServerCur) && adServerCur.length) request.cur = [adServerCur[0]];
  },
  addUserIds: function(request, validBidRequests) {
    if (!request) return;

    const bidUserId = utils.deepAccess(validBidRequests, '0.userId');
    const eids = createEidsArray(bidUserId);

    if (eids.length) {
      utils.deepSetValue(request, 'user.ext.eids', eids);
    }
  },
  addDigiTrust: function(request, bidRequests) {
    const digiTrust = BB_HELPERS.getDigiTrustParams(bidRequests && bidRequests[0]);
    if (digiTrust) utils.deepSetValue(request, 'user.ext.digitrust', digiTrust);
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
  getDigiTrustParams: function(bidRequest) {
    const digiTrustId = BB_HELPERS.getDigiTrustId(bidRequest);

    if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) return null;
    return {
      id: digiTrustId.id,
      keyv: digiTrustId.keyv
    }
  },
  getDigiTrustId: function(bidRequest) {
    const bidRequestDigiTrust = utils.deepAccess(bidRequest, 'userId.digitrustid.data');
    if (bidRequestDigiTrust) return bidRequestDigiTrust;

    const digiTrustUser = getConfig('digiTrustId');
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || null;
  },
  transformRTBToPrebidProps: function(bid, serverResponse) {
    bid.cpm = bid.price; delete bid.price;
    bid.bidId = bid.impid;
    bid.requestId = bid.impid; delete bid.impid;
    bid.width = bid.w || BB_CONSTANTS.DEFAULT_WIDTH;
    bid.height = bid.h || BB_CONSTANTS.DEFAULT_HEIGHT;
    if (bid.adm) {
      bid.ad = bid.adm;
      bid.vastXml = bid.adm;
      delete bid.adm;
    }
    if (bid.nurl && !bid.adm) { // ad markup is on win notice url, and adm is ommited according to OpenRTB 2.5
      bid.vastUrl = bid.nurl;
      delete bid.nurl;
    }
    bid.netRevenue = BB_CONSTANTS.DEFAULT_NET_REVENUE;
    bid.creativeId = bid.crid; delete bid.crid;
    bid.currency = serverResponse.cur;
    bid.ttl = BB_CONSTANTS.DEFAULT_TTL;
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
      utils.logWarn(`${BB_CONSTANTS.BIDDER_CODE}: No vastXml or vastUrl on bid, bailing...`);
      return;
    }

    const rendererId = BB_RENDERER.getRendererId(bid.publicationName, bid.rendererCode);

    const ele = document.getElementById(bid.adUnitCode); // NB convention

    let renderer;

    for (let rendererIndex = 0; rendererIndex < window.bluebillywig.renderers.length; rendererIndex++) {
      if (window.bluebillywig.renderers[rendererIndex]._id === rendererId) {
        renderer = window.bluebillywig.renderers[rendererIndex];
        break;
      }
    }

    if (renderer) renderer.bootstrap(config, ele);
    else utils.logWarn(`${BB_CONSTANTS.BIDDER_CODE}: Couldn't find a renderer with ${rendererId}`);
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
      utils.logWarn(`${BB_CONSTANTS.BIDDER_CODE}: Error tying to setRender on renderer`, err);
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
      utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: no params set on bid. Rejecting bid: `, bid);
      return false;
    }

    if (!bid.params.hasOwnProperty('publicationName') || typeof bid.params.publicationName !== 'string') {
      utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: no publicationName specified in bid params, or it's not a string. Rejecting bid: `, bid);
      return false;
    } else if (!publicationNameRegex.test(bid.params.publicationName)) {
      utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: publicationName must be in format 'publication' or 'publication.environment'. Rejecting bid: `, bid);
      return false;
    }

    if ((!bid.params.hasOwnProperty('rendererCode') || typeof bid.params.rendererCode !== 'string')) {
      utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: no rendererCode was specified in bid params. Rejecting bid: `, bid);
      return false;
    } else if (!rendererRegex.test(bid.params.rendererCode)) {
      utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: rendererCode must be alphanumeric, including underscores. Rejecting bid: `, bid);
      return false;
    }

    if (!bid.params.accountId) {
      utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: no accountId specified in bid params. Rejecting bid: `, bid);
      return false;
    }

    if (bid.params.hasOwnProperty('connections')) {
      if (!Array.isArray(bid.params.connections)) {
        utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: connections is not of type array. Rejecting bid: `, bid);
        return false;
      } else {
        for (let connectionIndex = 0; connectionIndex < bid.params.connections.length; connectionIndex++) {
          const connection = bid.params.connections[connectionIndex];
          if (!bid.params.hasOwnProperty(connection)) {
            utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: connection specified in params.connections, but not configured in params. Rejecting bid: `, bid);
            return false;
          }
        }
      }
    } else {
      utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: no connections specified in bid. Rejecting bid: `, bid);
      return false;
    }

    if (bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(VIDEO)) {
      if (!bid.mediaTypes[VIDEO].hasOwnProperty('context')) {
        utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: no context specified in bid. Rejecting bid: `, bid);
        return false;
      }

      if (bid.mediaTypes[VIDEO].context !== 'outstream') {
        utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: video.context is invalid, must be "outstream". Rejecting bid: `, bid);
        return false;
      }
    } else {
      utils.logError(`${BB_CONSTANTS.BIDDER_CODE}: mediaTypes or mediaTypes.video is not specified. Rejecting bid: `, bid);
      return false;
    }

    return true;
  },
  buildRequests(validBidRequests, bidderRequest) {
    const imps = [];

    for (let validBidRequestIndex = 0; validBidRequestIndex < validBidRequests.length; validBidRequestIndex++) {
      const validBidRequest = validBidRequests[validBidRequestIndex];
      const _this = this;

      const ext = validBidRequest.params.connections.reduce(function(extBuilder, connection) {
        extBuilder[connection] = validBidRequest.params[connection];

        if (_this.syncStore.bidders.indexOf(connection) === -1) _this.syncStore.bidders.push(connection);

        return extBuilder;
      }, {});

      imps.push({ id: validBidRequest.bidId, ext, secure: window.location.protocol === 'https' ? 1 : 0, video: utils.deepAccess(validBidRequest, 'mediaTypes.video') });
    }

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
      utils.deepSetValue(request, 'regs.ext.gdpr', gdprApplies);
      utils.deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    }

    if (bidderRequest.uspConsent) {
      utils.deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      this.syncStore.uspConsent = bidderRequest.uspConsent;
    }

    if (getConfig('coppa') == true) utils.deepSetValue(request, 'regs.coppa', 1);

    // Enrich the request with any external data we may have
    BB_HELPERS.addSiteAppDevice(request, bidderRequest.refererInfo && bidderRequest.refererInfo.referer);
    BB_HELPERS.addSchain(request, validBidRequests);
    BB_HELPERS.addCurrency(request);
    BB_HELPERS.addUserIds(request, validBidRequests);
    BB_HELPERS.addDigiTrust(request, validBidRequests);

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

    for (let seatbidIndex = 0; seatbidIndex < serverResponse.seatbid.length; seatbidIndex++) {
      const seatbid = serverResponse.seatbid[seatbidIndex];
      if (!seatbid.bid || !Array.isArray(seatbid.bid)) continue;
      for (let bidIndex = 0; bidIndex < seatbid.bid.length; bidIndex++) {
        const bid = seatbid.bid[bidIndex];
        BB_HELPERS.transformRTBToPrebidProps(bid, serverResponse);

        let bidParams;
        for (let bidderRequestBidsIndex = 0; bidderRequestBidsIndex < request.bidderRequest.bids.length; bidderRequestBidsIndex++) {
          if (request.bidderRequest.bids[bidderRequestBidsIndex].bidId === bid.bidId) {
            bidParams = request.bidderRequest.bids[bidderRequestBidsIndex].params;
          }
        }

        if (bidParams) {
          bid.publicationName = bidParams.publicationName;
          bid.rendererCode = bidParams.rendererCode;
          bid.accountId = bidParams.accountId;
        }

        const rendererUrl = BB_HELPERS.getRendererUrl(bid.publicationName, bid.rendererCode);

        bid.renderer = BB_RENDERER.newRenderer(rendererUrl, bid.adUnitCode);

        bids.push(bid);
      }
    }

    return bids;
  },
  getUserSyncs(syncOptions, serverResponses, gdpr) {
    if (!serverResponses || !serverResponses.length) return [];
    if (!syncOptions.iframeEnabled) return [];

    const queryString = [];
    let accountId;
    let publication;

    const serverResponse = serverResponses[0];
    if (!serverResponse.body || !serverResponse.body.seatbid) return [];

    for (let seatbidIndex = 0; seatbidIndex < serverResponse.body.seatbid.length; seatbidIndex++) {
      const seatbid = serverResponse.body.seatbid[seatbidIndex];
      for (let bidIndex = 0; bidIndex < seatbid.bid.length; bidIndex++) {
        const bid = seatbid.bid[bidIndex];
        accountId = bid.accountId || null;
        publication = bid.publicationName || null;

        if (publication && accountId) break;
      }
      if (publication && accountId) break;
    }

    if (!publication || !accountId) return [];

    if (gdpr.gdprApplies) queryString.push(`gdpr=${gdpr.gdprApplies ? 1 : 0}`);
    if (gdpr.gdprApplies && gdpr.consentString) queryString.push(`gdpr_consent=${gdpr.consentString}`);

    if (this.syncStore.uspConsent) queryString.push(`usp_consent=${this.syncStore.uspConsent}`);

    queryString.push(`accountId=${accountId}`);
    queryString.push(`bidders=${btoa(JSON.stringify(this.syncStore.bidders))}`);
    queryString.push(`cb=${Date.now()}-${Math.random().toString().replace('.', '')}`);

    if (DEV_MODE) queryString.push('bbpbs_debug=true');

    // NB syncUrl by default starts with ?pub=$$PUBLICATION
    const syncUrl = `${BB_HELPERS.getSyncUrl(publication)}&${queryString.join('&')}`;

    return [{
      type: 'iframe',
      url: syncUrl
    }];
  }
};

registerBidder(spec);
