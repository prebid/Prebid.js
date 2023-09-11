import {
  logError,
  logInfo,
  logMessage
} from '../src/utils.js';

import CONSTANTS from '../src/constants.json';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { config } from '../src/config.js'

/** Prebid Event Handlers */

const ADAPTER_CODE = 'automatadAnalytics'
const trialCountMilsMapping = [1500, 3000, 5000, 10000];

var isLoggingEnabled; var queuePointer = 0; var retryCount = 0; var timer = null; var __atmtdAnalyticsQueue = [];

const prettyLog = (level, text, isGroup = false, cb = () => {}) => {
  if (self.isLoggingEnabled === undefined) {
    if (window.localStorage.getItem('__aggLoggingEnabled')) {
      self.isLoggingEnabled = true
    } else {
      const queryParams = new URLSearchParams(new URL(window.location.href).search)
      self.isLoggingEnabled = queryParams.has('aggLoggingEnabled')
    }
  }

  if (self.isLoggingEnabled) {
    if (isGroup) {
      logInfo(`ATD Analytics Adapter: ${level.toUpperCase()}: ${text} --- Group Start ---`)
      try {
        cb();
      } catch (error) {
        logError(`ATD Analytics Adapter: ERROR: ${'Error during cb function in prettyLog'}`)
      }
      logInfo(`ATD Analytics Adapter: ${level.toUpperCase()}: ${text} --- Group End ---`)
    } else {
      logInfo(`ATD Analytics Adapter: ${level.toUpperCase()}: ${text}`)
    }
  }
}

const processEvents = () => {
  if (self.retryCount === trialCountMilsMapping.length) {
    self.prettyLog('error', `Aggregator still hasn't loaded. Processing que stopped`, trialCountMilsMapping, self.retryCount)
    return;
  }

  self.prettyLog('status', `Que has been inactive for a while. Adapter starting to process que now... Trial Count = ${self.retryCount + 1}`)

  let shouldTryAgain = false

  while (self.queuePointer < self.__atmtdAnalyticsQueue.length) {
    const eventType = self.__atmtdAnalyticsQueue[self.queuePointer][0]
    const args = self.__atmtdAnalyticsQueue[self.queuePointer][1]

    try {
      switch (eventType) {
        case CONSTANTS.EVENTS.AUCTION_INIT:
          if (window.atmtdAnalytics && window.atmtdAnalytics.auctionInitHandler) {
            window.atmtdAnalytics.auctionInitHandler(args);
          } else {
            shouldTryAgain = true
          }
          break;
        case CONSTANTS.EVENTS.BID_REQUESTED:
          if (window.atmtdAnalytics && window.atmtdAnalytics.bidRequestedHandler) {
            window.atmtdAnalytics.bidRequestedHandler(args);
          }
          break;
        case CONSTANTS.EVENTS.BID_RESPONSE:
          if (window.atmtdAnalytics && window.atmtdAnalytics.bidResponseHandler) {
            window.atmtdAnalytics.bidResponseHandler(args);
          }
          break;
        case CONSTANTS.EVENTS.BID_REJECTED:
          if (window.atmtdAnalytics && window.atmtdAnalytics.bidRejectedHandler) {
            window.atmtdAnalytics.bidRejectedHandler(args);
          }
          break;
        case CONSTANTS.EVENTS.BIDDER_DONE:
          if (window.atmtdAnalytics && window.atmtdAnalytics.bidderDoneHandler) {
            window.atmtdAnalytics.bidderDoneHandler(args);
          }
          break;
        case CONSTANTS.EVENTS.BID_WON:
          if (window.atmtdAnalytics && window.atmtdAnalytics.bidWonHandler) {
            window.atmtdAnalytics.bidWonHandler(args);
          }
          break;
        case CONSTANTS.EVENTS.NO_BID:
          if (window.atmtdAnalytics && window.atmtdAnalytics.noBidHandler) {
            window.atmtdAnalytics.noBidHandler(args);
          }
          break;
        case CONSTANTS.EVENTS.BID_TIMEOUT:
          if (window.atmtdAnalytics && window.atmtdAnalytics.bidderTimeoutHandler) {
            window.atmtdAnalytics.bidderTimeoutHandler(args);
          }
          break;
        case CONSTANTS.EVENTS.AUCTION_DEBUG:
          if (window.atmtdAnalytics && window.atmtdAnalytics.auctionDebugHandler) {
            window.atmtdAnalytics.auctionDebugHandler(args);
          }
          break;
        case 'slotRenderEnded':
          if (window.atmtdAnalytics && window.atmtdAnalytics.slotRenderEndedGPTHandler) {
            window.atmtdAnalytics.slotRenderEndedGPTHandler(args);
          } else {
            shouldTryAgain = true
          }
          break;
        case 'impressionViewable':
          if (window.atmtdAnalytics && window.atmtdAnalytics.impressionViewableHandler) {
            window.atmtdAnalytics.impressionViewableHandler(args);
          } else {
            shouldTryAgain = true
          }
          break;
      }

      if (shouldTryAgain) break;
    } catch (error) {
      self.prettyLog('error', `Unhandled Error while processing ${eventType} of ${self.queuePointer}th index in the que. Will not be retrying this raw event ...`, true, () => {
        logError(`The error is `, error)
      })
    }

    self.queuePointer = self.queuePointer + 1
  }

  if (shouldTryAgain) {
    if (trialCountMilsMapping[self.retryCount]) self.prettyLog('warn', `Adapter failed to process event as aggregator has not loaded. Retrying in ${trialCountMilsMapping[self.retryCount]}ms ...`);
    setTimeout(self.processEvents, trialCountMilsMapping[self.retryCount])
    self.retryCount = self.retryCount + 1
  }
}

const addGPTHandlers = () => {
  const googletag = window.googletag || {}
  googletag.cmd = googletag.cmd || []
  googletag.cmd.push(() => {
    googletag.pubads().addEventListener('slotRenderEnded', (event) => {
      if (window.atmtdAnalytics && window.atmtdAnalytics.slotRenderEndedGPTHandler) {
        if (window.__atmtdAggregatorFirstAuctionInitialized === true) {
          window.atmtdAnalytics.slotRenderEndedGPTHandler(event)
          return;
        }
      }
      self.__atmtdAnalyticsQueue.push(['slotRenderEnded', event])
      self.prettyLog(`warn`, `Aggregator not initialised at auctionInit, exiting slotRenderEnded handler and pushing to que instead`)
    })

    googletag.pubads().addEventListener('impressionViewable', (event) => {
      if (window.atmtdAnalytics && window.atmtdAnalytics.impressionViewableHandler) {
        if (window.__atmtdAggregatorFirstAuctionInitialized === true) {
          window.atmtdAnalytics.impressionViewableHandler(event)
          return;
        }
      }
      self.__atmtdAnalyticsQueue.push(['impressionViewable', event])
      self.prettyLog(`warn`, `Aggregator not initialised at auctionInit, exiting impressionViewable handler and pushing to que instead`)
    })
  })
}

const initializeQueue = () => {
  self.__atmtdAnalyticsQueue.push = (args) => {
    Array.prototype.push.apply(self.__atmtdAnalyticsQueue, [args]);
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (args[0] === CONSTANTS.EVENTS.AUCTION_INIT) {
      const timeout = parseInt(config.getConfig('bidderTimeout')) + 1500
      timer = setTimeout(() => {
        self.processEvents()
      }, timeout);
    } else {
      timer = setTimeout(() => {
        self.processEvents()
      }, 1500);
    }
  };
}

// ANALYTICS ADAPTER

let baseAdapter = adapter({analyticsType: 'bundle'});
let atmtdAdapter = Object.assign({}, baseAdapter, {

  disableAnalytics() {
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({eventType, args}) {
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        if (window.atmtdAnalytics && window.atmtdAnalytics.auctionInitHandler) {
          self.prettyLog('status', 'Aggregator loaded, initialising auction through handlers');
          window.atmtdAnalytics.auctionInitHandler(args);
        } else {
          self.prettyLog('warn', 'Aggregator not loaded, initialising auction through que ...');
          self.__atmtdAnalyticsQueue.push([eventType, args])
        }
        break;
      case CONSTANTS.EVENTS.BID_REQUESTED:
        if (window.atmtdAnalytics && window.atmtdAnalytics.bidRequestedHandler) {
          window.atmtdAnalytics.bidRequestedHandler(args);
        } else {
          self.prettyLog('warn', `Aggregator not loaded, pushing ${eventType} to que instead ...`);
          self.__atmtdAnalyticsQueue.push([eventType, args])
        }
        break;
      case CONSTANTS.EVENTS.BID_REJECTED:
        if (window.atmtdAnalytics && window.atmtdAnalytics.bidRejectedHandler) {
          window.atmtdAnalytics.bidRejectedHandler(args);
        } else {
          self.prettyLog('warn', `Aggregator not loaded, pushing ${eventType} to que instead ...`);
          self.__atmtdAnalyticsQueue.push([eventType, args])
        }
        break;
      case CONSTANTS.EVENTS.BID_RESPONSE:
        if (window.atmtdAnalytics && window.atmtdAnalytics.bidResponseHandler) {
          window.atmtdAnalytics.bidResponseHandler(args);
        } else {
          self.prettyLog('warn', `Aggregator not loaded, pushing ${eventType} to que instead ...`);
          self.__atmtdAnalyticsQueue.push([eventType, args])
        }
        break;
      case CONSTANTS.EVENTS.BIDDER_DONE:
        if (window.atmtdAnalytics && window.atmtdAnalytics.bidderDoneHandler) {
          window.atmtdAnalytics.bidderDoneHandler(args);
        } else {
          self.prettyLog('warn', `Aggregator not loaded, pushing ${eventType} to que instead ...`);
          self.__atmtdAnalyticsQueue.push([eventType, args])
        }
        break;
      case CONSTANTS.EVENTS.BID_WON:
        if (window.atmtdAnalytics && window.atmtdAnalytics.bidWonHandler) {
          window.atmtdAnalytics.bidWonHandler(args);
        } else {
          self.prettyLog('warn', `Aggregator not loaded, pushing ${eventType} to que instead ...`);
          self.__atmtdAnalyticsQueue.push([eventType, args])
        }
        break;
      case CONSTANTS.EVENTS.NO_BID:
        if (window.atmtdAnalytics && window.atmtdAnalytics.noBidHandler) {
          window.atmtdAnalytics.noBidHandler(args);
        } else {
          self.prettyLog('warn', `Aggregator not loaded, pushing ${eventType} to que instead ...`);
          self.__atmtdAnalyticsQueue.push([eventType, args])
        }
        break;
      case CONSTANTS.EVENTS.AUCTION_DEBUG:
        if (window.atmtdAnalytics && window.atmtdAnalytics.auctionDebugHandler) {
          window.atmtdAnalytics.auctionDebugHandler(args);
        } else {
          self.prettyLog('warn', `Aggregator not loaded, pushing ${eventType} to que instead ...`);
          self.__atmtdAnalyticsQueue.push([eventType, args])
        }
        break;
      case CONSTANTS.EVENTS.BID_TIMEOUT:
        if (window.atmtdAnalytics && window.atmtdAnalytics.bidderTimeoutHandler) {
          window.atmtdAnalytics.bidderTimeoutHandler(args);
        } else {
          self.prettyLog('warn', `Aggregator not loaded, pushing ${eventType} to que instead ...`);
          self.__atmtdAnalyticsQueue.push([eventType, args])
        }
        break;
    }
  }
});

atmtdAdapter.originEnableAnalytics = atmtdAdapter.enableAnalytics

atmtdAdapter.enableAnalytics = function (configuration) {
  if ((configuration === undefined && typeof configuration !== 'object') || configuration.options === undefined) {
    logError('A valid configuration must be passed to the Atmtd Analytics Adapter.');
    return;
  }

  const conf = configuration.options

  if (conf === undefined || typeof conf !== 'object' || conf.siteID === undefined || conf.publisherID === undefined) {
    logError('A valid publisher ID and siteID must be passed to the Atmtd Analytics Adapter.');
    return;
  }

  self.initializeQueue()
  self.addGPTHandlers()

  window.__atmtdSDKConfig = {
    publisherID: conf.publisherID,
    siteID: conf.siteID,
    collectDebugMessages: conf.logDebug ? conf.logDebug : false
  }

  logMessage(`Automatad Analytics Adapter enabled with sdk config`, window.__atmtdSDKConfig)

  // eslint-disable-next-line
  atmtdAdapter.originEnableAnalytics(configuration)
};

/// /////////// ADAPTER REGISTRATION //////////////

adapterManager.registerAnalyticsAdapter({
  adapter: atmtdAdapter,
  code: ADAPTER_CODE
});

export var self = {
  __atmtdAnalyticsQueue,
  processEvents,
  initializeQueue,
  addGPTHandlers,
  prettyLog,
  queuePointer,
  retryCount,
  isLoggingEnabled
}

export default atmtdAdapter;
