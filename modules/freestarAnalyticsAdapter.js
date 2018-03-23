import { ajax } from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';

const utils = require('src/utils');

const analyticsType = 'endpoint';

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

adaptermanager.registerAnalyticsAdapter({
  adapter: freestarAnalytics,
  code: 'freestar'
});

export default freestarAnalytics;