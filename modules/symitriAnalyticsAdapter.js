import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { logMessage } from '../src/utils.js';
import {ajax} from '../src/ajax.js';

const analyticsType = 'endpoint';
const url = 'https://ProdSymPrebidEventhub1.servicebus.windows.net/prebid-said-1/messages';

const { BID_WON } = EVENTS;

let initOptions;

let symitriAnalytics = Object.assign(adapter({url, analyticsType}), {
  track({ eventType, args }) {
    switch (eventType) {
      case BID_WON:
        logMessage('##### symitriAnalytics :: Event Triggered : ' + eventType);
        sendEvent(args);
        break;
      default:
        logMessage('##### symitriAnalytics :: Event Triggered : ' + eventType);
        break;
    }
  }
});

function sendEvent(payload) {
  try {
    if (initOptions.apiAuthToken) {
      const body = JSON.stringify(payload);
      logMessage('##### symitriAnalytics :: sendEvent ', payload);
      let cb = {
        success: () => {
          logMessage('##### symitriAnalytics :: Bid Reported Successfully');
        },
        error: (request, error) => {
          logMessage('##### symitriAnalytics :: Bid Report Failed' + error);
        }
      };

      ajax(url, cb, body, {
        method: 'POST',
        customHeaders: {'Content-Type': 'application/atom+xml;type=entry;charset=utf-8', 'Authorization': initOptions.apiAuthToken}
      });
    }
  } catch (err) { logMessage('##### symitriAnalytics :: error' + err) }
}

symitriAnalytics.originEnableAnalytics = symitriAnalytics.enableAnalytics;
symitriAnalytics.enableAnalytics = function (config) {
  initOptions = config.options;
  symitriAnalytics.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: symitriAnalytics,
  code: 'symitri'
});

export default symitriAnalytics;
