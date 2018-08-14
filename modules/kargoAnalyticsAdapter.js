import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';

var kargoAdapter = adapter({
  analyticsType: 'endpoint',
  url: 'https://krk.kargo.com/api/v1/event/prebid'
});

adaptermanager.registerAnalyticsAdapter({
  adapter: kargoAdapter,
  code: 'kargo'
});

export default kargoAdapter;
