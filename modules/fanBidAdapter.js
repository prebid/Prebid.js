import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, isNumber, logInfo, logWarn, logError, triggerPixel } from '../src/utils.js';
import { getBidFloor } from '../libraries/currencyUtils/floor.js';
import { getStorageManager } from '../src/storageManager.js';
import { Renderer } from '../src/Renderer.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';

const BIDDER_CODE = 'freedomadnetwork';
const BIDDER_VERSION = '0.2.0';
const NETWORK_ENDPOINTS = {
  'fan': 'https://srv.freedomadnetwork.com/ortb',
  'armanet': 'https://srv.armanet.us/ortb',
  'test': 'http://localhost:8001/ortb',
};

const DEFAULT_ENDPOINT = NETWORK_ENDPOINTS['fan'];
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;

export const storage = getStorageManager({bidderCode: BIDDER_CODE});

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    // Add custom fields to impression
    if (bidRequest.params.placementId) {
      imp.tagid = bidRequest.params.placementId;
    }

    // There is no default floor. bidfloor is set only
    // if the priceFloors module is activated and returns a valid floor.
    const floor = getBidFloor(bidRequest);
    if (isNumber(floor)) {
      imp.bidfloor = floor;
    }

    // Add floor currency
    if (bidRequest.params.bidFloorCur) {
      imp.bidfloorcur = bidRequest.params.bidFloorCur || DEFAULT_CURRENCY;
    }

    // Add custom extensions
    deepSetValue(imp, 'ext.prebid.storedrequest.id', bidRequest.params.placementId);
    deepSetValue(imp, 'ext.bidder', {
      network: bidRequest.params.network || 'fan',
      placementId: bidRequest.params.placementId
    });

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    // First price auction
    request.at = 1;
    request.cur = [DEFAULT_CURRENCY];

    // Add source information
    deepSetValue(request, 'source.tid', bidderRequest.auctionId);

    // Add custom extensions
    deepSetValue(request, 'ext.prebid.channel', BIDDER_CODE);
    deepSetValue(request, 'ext.prebid.version', BIDDER_VERSION);

    // Add user extensions
    const firstBid = imps[0];
    request.user = request.user || {};
    request.user.ext = request.user.ext || {};

    if (firstBid.userIdAsEids) {
      request.user.ext.eids = firstBid.userIdAsEids;
    }

    if (window.geck) {
      request.user.ext.adi = window.geck;
    }

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    const { bidRequest } = context;
    const bidResponse = buildBidResponse(bid, context);

    // Add custom bid response fields
    bidResponse.meta = bidResponse.meta || {};
    bidResponse.meta.networkName = BIDDER_CODE;
    bidResponse.meta.advertiserDomains = bid.adomain || [];

    if (bid.ext && bid.ext.libertas) {
      bidResponse.meta.libertas = bid.ext.libertas;
    }

    // Add tracking URLs
    if (bid.nurl) {
      bidResponse.nurl = bid.nurl;
    }

    // Handle different ad formats
    if (bidResponse.mediaType === BANNER) {
      bidResponse.ad = bid.adm;
      bidResponse.width = bid.w;
      bidResponse.height = bid.h;
    } else if (bidResponse.mediaType === VIDEO) {
      bidResponse.vastXml = bid.adm;
      bidResponse.width = bid.w;
      bidResponse.height = bid.h;
    }

    // Add renderer if needed for outstream video
    if (bidResponse.mediaType === VIDEO && bid.ext.libertas.ovp) {
      bidResponse.width = bid.w;
      bidResponse.height = bid.h;
      bidResponse.renderer = createRenderer(bidRequest, bid.ext.libertas.vp);
    }

    return bidResponse;
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(bid) {
    // Validate minimum required parameters
    if (!bid.params) {
      logError(`${BIDDER_CODE}: bid.params is required`);

      return false;
    }

    // Validate placement ID
    if (!bid.params.placementId) {
      logError(`${BIDDER_CODE}: placementId is required`);

      return false;
    }

    // Validate network parameter
    if (bid.params.network && !NETWORK_ENDPOINTS[bid.params.network]) {
      logError(`${BIDDER_CODE}: Invalid network: ${bid.params.network}`);

      return false;
    }

    // Validate media types
    if (!bid.mediaTypes || (!bid.mediaTypes.banner && !bid.mediaTypes.video)) {
      logError(`${BIDDER_CODE}: Only banner and video mediaTypes are supported`);

      return false;
    }

    // Validate video parameters if video mediaType is present
    if (bid.mediaTypes.video) {
      const video = bid.mediaTypes.video;
      if (!video.mimes || !Array.isArray(video.mimes) || video.mimes.length === 0) {
        logError(`${BIDDER_CODE}: video.mimes is required for video ads`);

        return false;
      }

      if (!video.playerSize || !Array.isArray(video.playerSize)) {
        logError(`${BIDDER_CODE}: video.playerSize is required for video ads`);

        return false;
      }
    }

    return true;
  },

  /**
   * Make server requests from the list of BidRequests
   */
  buildRequests(validBidRequests, bidderRequest) {
    const requestsByNetwork = validBidRequests.reduce((acc, bid) => {
      const network = bid.params.network || 'fan';
      if (!acc[network]) {
        acc[network] = [];
      }
      acc[network].push(bid);

      return acc;
    }, {});

    return Object.entries(requestsByNetwork).map(([network, bids]) => {
      const data = converter.toORTB({
        bidRequests: bids,
        bidderRequest,
        context: { network }
      });

      return {
        method: 'POST',
        url: NETWORK_ENDPOINTS[network] || DEFAULT_ENDPOINT,
        data,
        options: {
          contentType: 'text/plain',
          withCredentials: false
        },
        bids
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids
   */
  interpretResponse(serverResponse, bidRequest) {
    if (!serverResponse.body) {
      return [];
    }

    const response = converter.fromORTB({
      response: serverResponse.body,
      request: bidRequest.data,
    });

    return response.bids || [];
  },

  /**
   * Handle bidder errors
   */
  onBidderError: function(error) {
    logError(`${BIDDER_CODE} bidder error`, error);
  },

  /**
   * Register user sync pixels
   */
  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return [];
    }

    const syncs = [];
    const seenUrls = new Set();

    serverResponses.forEach(response => {
      const userSync = deepAccess(response.body, 'ext.sync');
      if (!userSync) {
        return;
      }

      if (syncOptions.iframeEnabled && userSync.iframe) {
        userSync.iframe.forEach(sync => {
          const url = buildSyncUrl(sync.url, gdprConsent, uspConsent, gppConsent);
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            syncs.push({
              type: 'iframe',
              url
            });
          }
        });
      }

      if (syncOptions.pixelEnabled && userSync.image) {
        userSync.image.forEach(sync => {
          const url = buildSyncUrl(sync.url, gdprConsent, uspConsent, gppConsent);
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            syncs.push({
              type: 'image',
              url
            });
          }
        });
      }
    });

    return syncs;
  },

  /**
   * Handle bid won event
   */
  onBidWon(bid) {
    logInfo(`${BIDDER_CODE}: Bid won`, bid);

    if (bid.nurl) {
      triggerPixel(bid.nurl);
    }

    if (bid.meta.libertas.pxl && bid.meta.libertas.pxl.length > 0) {
      for (var i = 0; i < bid.meta.libertas.pxl.length; i++) {
        if (Number(bid.meta.libertas.pxl[i].type) === 0) {
          triggerPixel(bid.meta.libertas.pxl[i].url);
        }
      }
    }
  },
};

/**
 * Build sync URL with privacy parameters
 */
function buildSyncUrl(baseUrl, gdprConsent, uspConsent, gppConsent) {
  try {
    const url = new URL(baseUrl);

    if (gdprConsent) {
      url.searchParams.set('gdpr', gdprConsent.gdprApplies ? '1' : '0');
      if (gdprConsent.consentString) {
        url.searchParams.set('gdpr_consent', gdprConsent.consentString);
      }
    }

    if (uspConsent) {
      url.searchParams.set('us_privacy', uspConsent);
    }

    if (gppConsent?.gppString) {
      url.searchParams.set('gpp', gppConsent.gppString);
      if (gppConsent.applicableSections?.length) {
        url.searchParams.set('gpp_sid', gppConsent.applicableSections.join(','));
      }
    }

    return url.toString();
  } catch (e) {
    logWarn(`${BIDDER_CODE}: Invalid sync URL: ${baseUrl}`);

    return baseUrl;
  }
}

/**
 * Create renderer for outstream video
 */
function createRenderer(bid, videoPlayerUrl) {
  const renderer = Renderer.install({
    url: videoPlayerUrl,
    loaded: false,
    adUnitCode: bid.adUnitCode,
  });

  try {
    renderer.setRender(function (bidResponse) {
      const divId = document.getElementById(bid.adUnitCode) ? bid.adUnitCode : getGptSlotInfoForAdUnitCode(bid.adUnitCode).divId;
      const adUnit = document.getElementById(divId);

      if (!window.createOutstreamPlayer) {
        logWarn('Renderer error: outstream player is not available');

        return;
      }

      window.createOutstreamPlayer(adUnit, bidResponse.vastXml, bid.width, bid.height);
    });
  } catch (error) {
    logWarn('Renderer error: setRender() failed', error);
  }

  return renderer;
}

registerBidder(spec);
