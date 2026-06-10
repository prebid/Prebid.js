import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

const hubvisorAnalytics = adapter({
  global: 'hubvisorAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

adapterManager.registerAnalyticsAdapter({
  adapter: hubvisorAnalytics,
  code: 'hubvisor'
});

export default hubvisorAnalytics;
