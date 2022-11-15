import {
  logWarn
} from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

let openxAdapter = Object.assign(adapter({ urlParam: '', analyticsType: 'endpoint' }));

openxAdapter.originEnableAnalytics = openxAdapter.enableAnalytics;

openxAdapter.enableAnalytics = function(adapterConfig = {options: {}}) {
  logWarn('OpenX Analytics has been deprecated, this adapter will be removed in Prebid 8');

  openxAdapter.track = prebidAnalyticsEventHandler;

  openxAdapter.originEnableAnalytics(adapterConfig);
};

adapterManager.registerAnalyticsAdapter({
  adapter: openxAdapter,
  code: 'openx'
});

export default openxAdapter;

function prebidAnalyticsEventHandler({eventType, args}) {
}
