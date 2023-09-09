import {logInfo, logError, deepClone} from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';

const ZETA_GVL_ID = 833;
const ADAPTER_CODE = 'zeta_global_ssp';
const BASE_URL = 'https://ssp.disqus.com/prebid/event';
const LOG_PREFIX = 'ZetaGlobalSsp-Analytics: ';

const cache = {
  auctions: {}
};

/// /////////// VARIABLES ////////////////////////////////////

let publisherId; // int

/// /////////// HELPER FUNCTIONS /////////////////////////////

function sendEvent(eventType, event) {
  ajax(
    BASE_URL + '/' + eventType,
    null,
    JSON.stringify(event)
  );
}

function getZetaParams(event) {
  if (event.adUnits) {
    for (const i in event.adUnits) {
      const unit = event.adUnits[i];
      if (unit.bids) {
        for (const j in unit.bids) {
          const bid = unit.bids[j];
          if (bid.bidder === ADAPTER_CODE && bid.params) {
            return bid.params;
          }
        }
      }
    }
  }
  return null;
}

/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

function adRenderSucceededHandler(originalArgs) {
  const args = deepClone(originalArgs);
  let eventType = CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED
  logInfo(LOG_PREFIX + 'handle ' + eventType + ' event');

  if (args.bid) {
    // cleanup object
    delete args.bid.metrics;
    delete args.bid.ad;

    // set zetaParams from cache
    if (args.bid.auctionId) {
      const zetaParams = cache.auctions[args.bid.auctionId];
      if (zetaParams) {
        args.bid.params = [ zetaParams ];
      }
    }
  }

  sendEvent(eventType, args);
}

function auctionEndHandler(originalArgs) {
  const args = deepClone(originalArgs);
  let eventType = CONSTANTS.EVENTS.AUCTION_END;
  logInfo(LOG_PREFIX + 'handle ' + eventType + ' event');

  // cleanup object
  delete args.metrics;
  if (args.bidderRequests) {
    args.bidderRequests.forEach(requests => {
      delete requests.metrics;
      if (requests.bids) {
        requests.bids.forEach(bid => {
          delete bid.metrics;
        })
      }
    })
  }

  // save zetaParams to cache
  const zetaParams = getZetaParams(args);
  if (zetaParams && args.auctionId) {
    cache.auctions[args.auctionId] = zetaParams;
  }

  sendEvent(eventType, args);
}

/// /////////// ADAPTER DEFINITION ///////////////////////////

let baseAdapter = adapter({ analyticsType: 'endpoint' });
let zetaAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(config = {}) {
    let error = false;

    if (typeof config.options === 'object') {
      if (config.options.sid) {
        publisherId = Number(config.options.sid);
      }
    } else {
      logError(LOG_PREFIX + 'Config not found');
      error = true;
    }

    if (!publisherId) {
      logError(LOG_PREFIX + 'Missing sid (publisher id)');
      error = true;
    }

    if (error) {
      logError(LOG_PREFIX + 'Analytics is disabled due to error(s)');
    } else {
      baseAdapter.enableAnalytics.call(this, config);
    }
  },

  disableAnalytics() {
    publisherId = undefined;
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({ eventType, args }) {
    switch (eventType) {
      case CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED:
        adRenderSucceededHandler(args);
        break;
      case CONSTANTS.EVENTS.AUCTION_END:
        auctionEndHandler(args);
        break;
    }
  }
});

/// /////////// ADAPTER REGISTRATION /////////////////////////

adapterManager.registerAnalyticsAdapter({
  adapter: zetaAdapter,
  code: ADAPTER_CODE,
  gvlid: ZETA_GVL_ID
});

export default zetaAdapter;
