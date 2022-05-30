import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

const pubstackAnalytics = adapter({
  global: 'PubstackAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

adapterManager.registerAnalyticsAdapter({
  adapter: pubstackAnalytics,
  code: 'pubstack',
});

export default pubstackAnalytics;
