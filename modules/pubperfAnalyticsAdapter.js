/**
 * Analytics Adapter for Pubperf
 */

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { logError } from '../src/utils.js';

var pubperfAdapter = adapter({
  global: 'pubperf_pbjs',
  analyticsType: 'bundle',
  handler: 'on'
});

pubperfAdapter.originEnableAnalytics = pubperfAdapter.enableAnalytics;

pubperfAdapter.enableAnalytics = config => {
  if (!config || !config.provider || config.provider !== 'pubperf') {
    logError('expected config.provider to equal pubperf');
    return;
  }
  if (!window['pubperf_pbjs']) {
    logError(
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
