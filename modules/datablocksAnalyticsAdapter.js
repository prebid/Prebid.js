/**
 * Analytics Adapter for Datablocks
 */

import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';

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
