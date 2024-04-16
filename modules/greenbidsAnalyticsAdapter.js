import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import {deepClone, generateUUID, logError, logInfo, logWarn, getParameterByName} from '../src/utils.js';

const analyticsType = 'endpoint';

export const ANALYTICS_VERSION = '2.2.1';

const ANALYTICS_SERVER = 'https://a.greenbids.ai';

const {
  AUCTION_INIT,
  AUCTION_END,
  BID_TIMEOUT,
  BILLABLE_EVENT,
} = EVENTS;

export const BIDDER_STATUS = {
  BID: 'bid',
  NO_BID: 'noBid',
  TIMEOUT: 'timeout'
};

const analyticsOptions = {};

export const isSampled = function(greenbidsId, samplingRate, exploratorySamplingSplit) {
  const isSamplingForced = getParameterByName('greenbids_force_sampling');
  if (isSamplingForced) {
    logInfo('Greenbids Analytics: sampling flag detected, forcing analytics');
    return true;
  }
  if (samplingRate < 0 || samplingRate > 1) {
    logWarn('Sampling rate must be between 0 and 1');
    return true;
  }
  const exploratorySamplingRate = samplingRate * exploratorySamplingSplit;
  const throttledSamplingRate = samplingRate * (1.0 - exploratorySamplingSplit);
  const hashInt = parseInt(greenbidsId.slice(-4), 16);
  const isPrimarySampled = hashInt < exploratorySamplingRate * (0xFFFF + 1);
  if (isPrimarySampled) return true;
  const isExtraSampled = hashInt >= (1 - throttledSamplingRate) * (0xFFFF + 1);
  return isExtraSampled;
}

export const greenbidsAnalyticsAdapter = Object.assign(adapter({ANALYTICS_SERVER, analyticsType}), {

  cachedAuctions: {},
  exploratorySamplingSplit: 0.9,

  initConfig(config) {
    analyticsOptions.options = deepClone(config.options);
    /**
     * Required option: pbuid
     * @type {boolean}
     */
    if (typeof analyticsOptions.options.pbuid !== 'string' || analyticsOptions.options.pbuid.length < 1) {
      logError('"options.pbuid" is required.');
      return false;
    }

    /**
     *  Deprecate use of integerated 'sampling' config
     *  replace by greenbidsSampling
     */
    if (typeof analyticsOptions.options.sampling === 'number') {
      logWarn('"options.sampling" is deprecated, please use "greenbidsSampling" instead.');
      analyticsOptions.options.greenbidsSampling = analyticsOptions.options.sampling;
    }

    /**
     *  Discourage unsampled analytics
     */
    if (typeof analyticsOptions.options.greenbidsSampling !== 'number' || analyticsOptions.options.greenbidsSampling >= 1) {
      logWarn('"options.greenbidsSampling" is not set or >=1, using this analytics module unsampled is discouraged.');
      analyticsOptions.options.greenbidsSampling = 1;
    }

    /**
     *  Add optional debug parameter to override exploratorySamplingSplit
     */
    if (typeof analyticsOptions.options.exploratorySamplingSplit === 'number') {
      logInfo('Greenbids Analytics: Overriding "exploratorySamplingSplit".');
      this.exploratorySamplingSplit = analyticsOptions.options.exploratorySamplingSplit;
    }

    analyticsOptions.pbuid = config.options.pbuid
    analyticsOptions.server = ANALYTICS_SERVER;

    return true;
  },
  sendEventMessage(endPoint, data) {
    logInfo(`AJAX: ${endPoint}: ` + JSON.stringify(data));

    ajax(`${analyticsOptions.server}${endPoint}`, null, JSON.stringify(data), {
      contentType: 'application/json'
    });
  },
  createCommonMessage(auctionId) {
    const cachedAuction = this.getCachedAuction(auctionId);
    return {
      version: ANALYTICS_VERSION,
      auctionId: auctionId,
      referrer: window.location.href,
      sampling: analyticsOptions.options.greenbidsSampling,
      prebid: '$prebid.version$',
      greenbidsId: cachedAuction.greenbidsId,
      pbuid: analyticsOptions.pbuid,
      billingId: cachedAuction.billingId,
      adUnits: [],
    };
  },
  serializeBidResponse(bid, status) {
    return {
      bidder: bid.bidder,
      isTimeout: (status === BIDDER_STATUS.TIMEOUT),
      hasBid: (status === BIDDER_STATUS.BID),
    };
  },
  addBidResponseToMessage(message, bid, status) {
    const adUnitCode = bid.adUnitCode.toLowerCase();
    const adUnitIndex = message.adUnits.findIndex((adUnit) => {
      return adUnit.code === adUnitCode;
    });
    if (adUnitIndex === -1) {
      logError('Trying to add to non registered adunit');
      return;
    }
    const bidderIndex = message.adUnits[adUnitIndex].bidders.findIndex((bidder) => {
      return bidder.bidder === bid.bidder;
    });
    if (bidderIndex === -1) {
      message.adUnits[adUnitIndex].bidders.push(this.serializeBidResponse(bid, status));
    } else {
      if (status === BIDDER_STATUS.BID) {
        message.adUnits[adUnitIndex].bidders[bidderIndex].hasBid = true;
      } else if (status === BIDDER_STATUS.TIMEOUT) {
        message.adUnits[adUnitIndex].bidders[bidderIndex].isTimeout = true;
      }
    }
  },
  createBidMessage(auctionEndArgs) {
    const {auctionId, timestamp, auctionEnd, adUnits, bidsReceived, noBids} = auctionEndArgs;
    const cachedAuction = this.getCachedAuction(auctionId);
    const message = this.createCommonMessage(auctionId);
    const timeoutBids = cachedAuction.timeoutBids || [];

    message.auctionElapsed = (auctionEnd - timestamp);

    adUnits.forEach((adUnit) => {
      const adUnitCode = adUnit.code?.toLowerCase() || 'unknown_adunit_code';
      message.adUnits.push({
        code: adUnitCode,
        mediaTypes: {
          ...(adUnit.mediaTypes?.banner !== undefined) && {banner: adUnit.mediaTypes.banner},
          ...(adUnit.mediaTypes?.video !== undefined) && {video: adUnit.mediaTypes.video},
          ...(adUnit.mediaTypes?.native !== undefined) && {native: adUnit.mediaTypes.native}
        },
        ortb2Imp: adUnit.ortb2Imp || {},
        bidders: [],
      });
    });

    // We enrich noBid then bids, then timeouts, because in case of a timeout, one response from a bidder
    // Can be in the 3 arrays, and we want that case reflected in the call
    noBids.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.NO_BID));

    bidsReceived.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.BID));

    timeoutBids.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.TIMEOUT));

    return message;
  },
  getCachedAuction(auctionId) {
    this.cachedAuctions[auctionId] = this.cachedAuctions[auctionId] || {
      timeoutBids: [],
      greenbidsId: null,
      billingId: null,
      isSampled: true,
    };
    return this.cachedAuctions[auctionId];
  },
  handleAuctionInit(auctionInitArgs) {
    const cachedAuction = this.getCachedAuction(auctionInitArgs.auctionId);
    try {
      cachedAuction.greenbidsId = auctionInitArgs.adUnits[0].ortb2Imp.ext.greenbids.greenbidsId;
    } catch (e) {
      logInfo("Couldn't find Greenbids RTD info, assuming analytics only");
      cachedAuction.greenbidsId = generateUUID();
    }
    cachedAuction.isSampled = isSampled(cachedAuction.greenbidsId, analyticsOptions.options.greenbidsSampling, this.exploratorySamplingSplit);
  },
  handleAuctionEnd(auctionEndArgs) {
    const cachedAuction = this.getCachedAuction(auctionEndArgs.auctionId);
    this.sendEventMessage('/',
      this.createBidMessage(auctionEndArgs, cachedAuction)
    );
  },
  handleBidTimeout(timeoutBids) {
    timeoutBids.forEach((bid) => {
      const cachedAuction = this.getCachedAuction(bid.auctionId);
      cachedAuction.timeoutBids.push(bid);
    });
  },
  handleBillable(billableArgs) {
    const cachedAuction = this.getCachedAuction(billableArgs.auctionId);
    /* Filter Greenbids Billable Events only */
    if (billableArgs.vendor === 'greenbidsRtdProvider') {
      cachedAuction.billingId = billableArgs.billingId || 'unknown_billing_id';
    }
  },
  track({eventType, args}) {
    try {
      if (eventType === AUCTION_INIT) {
        this.handleAuctionInit(args);
      }

      if (this.getCachedAuction(args?.auctionId)?.isSampled ?? true) {
        switch (eventType) {
          case BID_TIMEOUT:
            this.handleBidTimeout(args);
            break;
          case AUCTION_END:
            this.handleAuctionEnd(args);
            break;
          case BILLABLE_EVENT:
            this.handleBillable(args);
            break;
        }
      }
    } catch (e) {
      logWarn('There was an error handling event ' + eventType);
    }
  },
  getAnalyticsOptions() {
    return analyticsOptions;
  },
});

greenbidsAnalyticsAdapter.originEnableAnalytics = greenbidsAnalyticsAdapter.enableAnalytics;

greenbidsAnalyticsAdapter.enableAnalytics = function(config) {
  this.initConfig(config);
  if (typeof config.options.sampling === 'number') {
    // Set sampling to 1 to prevent prebid analytics integrated sampling to happen
    config.options.sampling = 1;
  }
  logInfo('loading greenbids analytics');
  greenbidsAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: greenbidsAnalyticsAdapter,
  code: 'greenbids'
});

export default greenbidsAnalyticsAdapter;
