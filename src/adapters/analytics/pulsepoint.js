/**
 * pulsepoint.js - Analytics Adapter for PulsePoint
 */

import adapter from 'AnalyticsAdapter';

export default adapter({
  global: 'PulsePointPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});
