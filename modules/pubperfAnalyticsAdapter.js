/**
 * Analytics Adapter for Pubperf
 */

import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import * as utils from '../src/utils.js';

const prebidVersion = '$prebid.version$';
const events = Object.keys(CONSTANTS.EVENTS).map(key => CONSTANTS.EVENTS[key]);

const handleEvent = function(payload) {
  try {
    // pass event payload into pubperf
    window['pubperf_pbjs'](
      payload
    );
  } catch (e) {
    utils.logError(e);
  }
};

var pubperfAdapter = Object.assign(adapter({
  analyticsType: 'bundle'
}), {
  track({ eventType, eventArgs }) {
    if (typeof eventArgs !== 'undefined' && events.indexOf(eventType) !== -1) {
      eventArgs = eventArgs ? JSON.parse(JSON.stringify(eventArgs)) : {};
      Object.assign(eventArgs, {
        'prebidVersion': prebidVersion
      });
      handleEvent({ event: eventType, args: eventArgs });
    }
  }
});

pubperfAdapter.originEnableAnalytics = pubperfAdapter.enableAnalytics;

pubperfAdapter.enableAnalytics = config => {
  if (!config || !config.provider || config.provider !== 'pubperf') {
    utils.logError('expected config.provider to equal pubperf');
    return;
  }
  if (!window['pubperf_pbjs']) {
    utils.logError(
      `Make sure that Pubperf tag from https://www.pubperf.com is included before the Prebid configuration.`
    );
    return;
  }
  pubperfAdapter.originEnableAnalytics(config);
}

adapterManager.registerAnalyticsAdapter({
  adapter: pubperfAdapter,
  code: 'pubperf'
});

export default pubperfAdapter;
