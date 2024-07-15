/**
 * appnexus.js - AppNexus Prebid Analytics Adapter
 */

import adapter from "../libraries/analyticsAdapter/AnalyticsAdapter.js";
import adapterManager from "../src/adapterManager.js";
import {
  logEvent,
  sendBatch,
  setEndPoint,
} from "./NewsCorpPrebidAnalytics/analytics.js";

var newscorpAdapter = adapter({
  global: "NewsCorpPrebidAnalytics",
  handler: "on",
  analyticsType: "bundle",
});

newscorpAdapter.originEnableAnalytics = newscorpAdapter.enableAnalytics;
newscorpAdapter.enableAnalytics = (config) => {
  setEndPoint(config);
  newscorpAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: newscorpAdapter,
  code: "newscorpAdapter",
  gvlid: 709,
});

/**
 * Global function to handle events emitted from Prebid.js AnalyticsAdapter
 */
window.NewsCorpPrebidAnalytics = function (handler, eventType, data) {
  logEvent({ eventType, data });
  sendBatch();
};

export default newscorpAdapter;
