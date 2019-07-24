/**
 * appnexus.js - AppNexus Prebid Analytics Adapter
 */

import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';

var appnexusAdapterHead = adapter({
  global: 'AppNexusPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

var appnexusAdapter = Object.assign(appnexusAdapterHead, {});

// save the base class function
appnexusAdapter.originEnableAnalytics = appnexusAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from
// the page
appnexusAdapter.enableAnalytics = function (config) {
  appnexusAdapter.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: appnexusAdapter,
  code: 'appnexus'
});

export default appnexusAdapter;
