import adapter from 'src/AnalyticsAdapter';
import adapterManager from 'src/adapterManager';
import { auctionManager } from 'src/auctionManager'; 

const analyticsType = 'endpoint';
/**
 * Global access to auctionManager.findBidByAdId(adId);
 * @param adId
 * @returns {*|Object}
 */
$$PREBID_GLOBAL$$.findBidByAdId = function(adId) {
  return auctionManager.findBidByAdId(adId);
};

let freestarAnalytics = Object.assign(adapter({ analyticsType }),
  {
    // Override AnalyticsAdapter functions by supplying custom methods
    track({ eventType, args }) {
      if (window.freestar.msg && window.freestar.msg.que) {
        window.freestar.msg.que.push({ eventType, args });
      }
    }
  });

// save the base class function
freestarAnalytics.originEnableAnalytics = freestarAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
freestarAnalytics.enableAnalytics = function (config) {
  freestarAnalytics.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: freestarAnalytics,
  code: 'freestar'
});

export default freestarAnalytics;
