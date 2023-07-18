import { logInfo, logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';

const ZETA_GVL_ID = 833;
const ADAPTER_CODE = 'zeta_global_ssp';
const BASE_URL = 'https://ssp.disqus.com/prebid/event';
const LOG_PREFIX = 'ZetaGlobalSsp-Analytics: ';

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

/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

function adRenderSucceededHandler(args) {
  let eventType = CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED
  logInfo(LOG_PREFIX + 'handle ' + eventType + ' event');

  sendEvent(eventType, args);
}

function auctionEndHandler(args) {
  let eventType = CONSTANTS.EVENTS.AUCTION_END;
  logInfo(LOG_PREFIX + 'handle ' + eventType + ' event');

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
