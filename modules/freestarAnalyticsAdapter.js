import { ajax } from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adapterManager from 'src/adapterManager';
import { auctionManager } from 'src/auctionManager';

const utils = require('src/utils');

const analyticsType = 'endpoint';

/**
 * Global access to auctionManager.findBidByAdId(adId);
 * @param adId
 * @returns {*|Object}
 */
pbjs.findBidByAdId = function(adId) {
  const bid = auctionManager.findBidByAdId(adId);
  return bid;
}

let freestarAnalytics = Object.assign(adapter({ analyticsType }),
  {
    // Override AnalyticsAdapter functions by supplying custom methods
    track({ eventType, args }) {
      if (freestar.msg && freestar.msg.que) {
        //console.log('push message:'+eventType+' to queue: '+JSON.stringify(args));
        freestar.msg.que.push({ eventType, args });
      }
    }
  });

// save the base class function
freestarAnalytics.originEnableAnalytics = freestarAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
freestarAnalytics.enableAnalytics = function (config) {
  freestarAnalytics.originEnableAnalytics(config);  // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: freestarAnalytics,
  code: 'freestar'
});

export default freestarAnalytics;
