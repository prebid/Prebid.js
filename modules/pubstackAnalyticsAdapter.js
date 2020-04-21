import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

const pubstackAdapter = adapter({
  global: 'pbstckR',
  handler: 'on',
  analyticsType: 'bundle'
});

adapterManager.registerAnalyticsAdapter({
  adapter: pubstackAdapter,
  code: 'pubstack',
});

export default pubstackAdapter;
