import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

var kargoAdapter = adapter({
  analyticsType: 'endpoint',
  url: 'https://krk.kargo.com/api/v1/event/prebid'
});

adapterManager.registerAnalyticsAdapter({
  adapter: kargoAdapter,
  code: 'kargo'
});

export default kargoAdapter;
