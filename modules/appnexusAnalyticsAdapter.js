/**
 * appnexus.js - AppNexus Prebid Analytics Adapter
 */

import adapter from 'src/AnalyticsAdapter';
import { analyticsRegistry } from 'src/analyticsAdapterRegistry';

const appnexusAdapterFactory = adapter({
  global: 'AppNexusPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

analyticsRegistry.registerAnalyticsAdapterFactory({
  factory: appnexusAdapterFactory,
  code: 'appnexus'
});

export default appnexusAdapterFactory;
