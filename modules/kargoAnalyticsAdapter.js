import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';

var kargoAdapter = adapter({
  analyticsType: 'endpoint',
  url: 'https://krk.kargo.com/api/v1/event/prebid'
});

adapterManager.registerAnalyticsAdapter({
  adapter: kargoAdapter,
  code: 'kargo'
});

export default kargoAdapter;
