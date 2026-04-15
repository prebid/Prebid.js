import { logMessage, deepAccess } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager, { coppaDataHandler, gdprDataHandler, gppDataHandler, uspDataHandler } from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { sendBeacon } from '../src/ajax.js';

const DEFAULT_BID_WON_TIMEOUT = 1500; // 1.5 second for initial batch
const DEFAULT_CID = 5126;
const API_BASE_URL = 'https://b6.im-apps.net/bid';

const cache = {
  auctions: {}
};

/**
 * Get CID from adapter options
 * @param {Object} options - Adapter options
 * @returns {string} CID or default value
 */
function getCid(options) {
  return (options && options.cid) || DEFAULT_CID;
}

/**
 * Get wait timeout from adapter options
 * @param {Object} options - Adapter options
 * @returns {number} Timeout in ms or default value
 */
function getWaitTimeout(options) {
  const waitTimeout = options && options.waitTimeout;
  return (typeof waitTimeout === 'number' && waitTimeout >= 0)
    ? waitTimeout
    : DEFAULT_BID_WON_TIMEOUT;
}

/**
 * Build API URL with CID from options
 * @param {string} endpoint - Endpoint path
 * @returns {string} Full API URL
 */
function buildApiUrlWithOptions(options, endpoint, auctionId) {
  const cid = getCid(options);
  return `${API_BASE_URL}/${cid}/${endpoint}/${auctionId}`;
}

/**
 * Send data to API endpoint using sendBeacon
 * @param {string} url - API endpoint URL
 * @param {Object} payload - Data to send
 */
function sendToApi(url, payload) {
  const data = JSON.stringify(payload);
  const blob = new Blob([data], { type: 'application/json' });
  sendBeacon(url, blob);
}

/**
 * Clear timer if exists
 * @param {number|null} timer - Timer ID
 * @returns {null}
 */
function clearTimer(timer) {
  if (timer) {
    clearTimeout(timer);
  }
}

/**
 * Get consent data from bidder requests
 * @returns {Object} Consent data object
 */
function getConsentData() {
  const gdprConsent = gdprDataHandler.getConsentData() || {};
  const uspConsent = uspDataHandler.getConsentData();
  const gppConsent = gppDataHandler.getConsentData() || {};
  return {
    gdpr: gdprConsent.gdprApplies ? 1 : 0,
    usp: uspConsent,
    coppa: Number(coppaDataHandler.getCoppa()),
    ...(gppConsent.applicableSections && gppConsent.gppString && {
      gpp: gppConsent.applicableSections.toString(),
      gppStr: gppConsent.gppString
    })
  };
}

/**
 * Extract meta fields from bid won arguments
 * @param {Object} meta - Meta object
 * @returns {Object} Extracted meta fields
 */
function extractMetaFields(meta) {
  return {
    domains: meta.advertiserDomains || [],
    catId: meta.primaryCatId || '',
    catIds: meta.secondaryCatIds || [],
    aid: meta.advertiserId || '',
    advertiser: meta.advertiserName || '',
    bid: meta.brandId || '',
    brand: meta.brandName || '',
  };
}

// IM Analytics Adapter implementation
const imAnalyticsAdapter = Object.assign(
  adapter({ analyticsType: 'endpoint' }),
  {
    /**
     * Track Prebid.js events
     * @param {Object} params - Event parameters
     * @param {string} params.eventType - Type of event
     * @param {Object} params.args - Event arguments
     */
    track({ eventType, args }) {
      switch (eventType) {
        case EVENTS.AUCTION_INIT:
          logMessage('IM Analytics: AUCTION_INIT', args);
          this.handleAuctionInit(args);
          break;

        case EVENTS.BID_WON:
          logMessage('IM Analytics: BID_WON', args);
          this.handleWonBidsData(args);
          break;

        case EVENTS.AUCTION_END:
          logMessage('IM Analytics: AUCTION_END', args);
          this.handleAuctionEnd(args.auctionId);
          break;
      }
    },

    /**
     * Handle auction end event - schedule won bids send
     * @param {string} auctionId - Auction ID
     */
    handleAuctionEnd(auctionId) {
      const auction = cache.auctions[auctionId];
      if (auction) {
        clearTimer(auction.wonBidsTimer);
        auction.wonBidsTimer = setTimeout(() => {
          this.sendWonBidsData(auctionId);
        }, getWaitTimeout(this.options));
      }
    },

    /**
     * Handle auction init event
     * @param {Object} args - Auction arguments
     */
    handleAuctionInit(args) {
      const consentData = getConsentData();
      const imUid = deepAccess(args.bidderRequests, '0.bids.0.userId.imuid') ?? '';
      cache.auctions[args.auctionId] = {
        imUid,
        consentData,
        wonSent: false,
        wonBids: [],
        wonBidsTimer: null,
        auctionInitTimestamp: args.timestamp
      };
      this.handleAucInitData(args, imUid, consentData);
    },
    /**
     * Handle auction init data - send immediately for PV tracking
     * @param {Object} args - Auction arguments
     * @param {string} uid - IM-UID value
     * @param {Object} consent - Consent data
     */
    handleAucInitData(args, uid, consent) {
      const payload = {
        url: window.location.href,
        ref: document.referrer || '',
        ...this.transformAucInitData(args),
        uid,
        consent
      };

      sendToApi(buildApiUrlWithOptions(this.options, 'pv', args.auctionId), payload);
    },

    /**
     * Transform auction data for auction init event
     * @param {Object} auctionArgs - Auction arguments
     * @returns {Object} Transformed auction data
     */
    transformAucInitData(auctionArgs) {
      return {
        ts: auctionArgs.timestamp,
        adUnit: (auctionArgs.adUnits || []).length
      };
    },

    /**
     * Handle won bids data - batch first, then individual
     * @param {Object} bidWonArgs - Bid won arguments
     */
    handleWonBidsData(bidWonArgs) {
      const auctionId = bidWonArgs.auctionId;
      const auction = cache.auctions[auctionId];

      if (!auction) return;

      this.cacheWonBid(auctionId, bidWonArgs);

      // If initial batch has been sent, send immediately
      if (auction.wonSent) {
        this.sendWonBidsData(auctionId);
      }
    },

    /**
     * Cache won bid for batch send
     * @param {string} auctionId - Auction ID
     * @param {Object} bidWonArgs - Bid won arguments
     */
    cacheWonBid(auctionId, bidWonArgs) {
      const auction = cache.auctions[auctionId];
      if (auction) {
        // Deduplicate based on requestId
        if (auction.wonBids.some(bid => bid.requestId === bidWonArgs.requestId)) {
          return;
        }
        auction.wonBids.push(this.transformWonBidsData(bidWonArgs));
      }
    },

    /**
     * Transform bid won data for payload
     * @param {Object} bidWonArgs - Bid won arguments
     * @returns {Object} Transformed bid won data
     */
    transformWonBidsData(bidWonArgs) {
      const meta = bidWonArgs.meta || {};

      return {
        requestId: bidWonArgs.requestId,
        bidderCode: bidWonArgs.bidderCode,
        ...extractMetaFields(meta)
      };
    },

    /**
     * Send accumulated won bids data to API - batch send after 1500ms
     * @param {string} auctionId - Auction ID to send data for
     */
    sendWonBidsData(auctionId) {
      const auction = cache.auctions[auctionId];
      if (!auction) {
        return;
      }

      auction.wonSent = true;
      auction.wonBidsTimer = null;

      if (auction.wonBids.length === 0) {
        delete cache.auctions[auctionId];
        return;
      }

      const consent = auction.consentData;
      const ts = auction.auctionInitTimestamp || Date.now();
      const bids = auction.wonBids;
      const uid = auction.imUid;
      delete cache.auctions[auctionId];
      sendToApi(buildApiUrlWithOptions(this.options, 'won', auctionId), {
        bids,
        ts,
        uid,
        consent,
      });
    }
  }
);

const originalEnableAnalytics = imAnalyticsAdapter.enableAnalytics;
imAnalyticsAdapter.enableAnalytics = function(config) {
  this.options = (config && config.options) || {};
  logMessage('IM Analytics: enableAnalytics called with cid:', this.options.cid);
  originalEnableAnalytics.call(this, config);
};

const originalDisableAnalytics = imAnalyticsAdapter.disableAnalytics;
imAnalyticsAdapter.disableAnalytics = function() {
  Object.values(cache.auctions).forEach(auction => clearTimer(auction.wonBidsTimer));
  cache.auctions = {};
  originalDisableAnalytics.call(this);
};

adapterManager.registerAnalyticsAdapter({
  adapter: imAnalyticsAdapter,
  code: 'imAnalytics'
});

export default imAnalyticsAdapter;
