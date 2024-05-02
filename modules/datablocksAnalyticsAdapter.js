/**
 * Analytics Adapter for Datablocks
 */

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

var datablocksAdapter = adapter({
  global: 'datablocksAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

adapterManager.registerAnalyticsAdapter({
  adapter: datablocksAdapter,
  code: 'datablocks'
});

export default datablocksAdapter;
