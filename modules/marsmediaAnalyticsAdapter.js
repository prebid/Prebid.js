import {ajax} from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

/****
 * Mars Media Analytics
 * Contact: prebid@m-m-g.com‏
 * Developer: Chen Saadia
 */

const MARS_BIDDER_CODE = 'marsmedia';
const analyticsType = 'endpoint';
const MARS_VERSION = '1.0.1';
const MARS_ANALYTICS_URL = 'https://prebid_stats.mars.media/prebidjs/api/analytics.php';
var events = {};

var marsmediaAnalyticsAdapter = Object.assign(adapter(
  {
    MARS_ANALYTICS_URL,
    analyticsType
  }),
{
  track({eventType, args}) {
    if (typeof args !== 'undefined' && args.bidderCode === MARS_BIDDER_CODE) {
      events[eventType] = args;
    }

    if (eventType === 'auctionEnd') {
      setTimeout(function() {
        ajax(
          MARS_ANALYTICS_URL,
          {
            success: function() {},
            error: function() {}
          },
          JSON.stringify({act: 'prebid_analytics', params: events, 'pbjs': $$PREBID_GLOBAL$$.getBidResponses(), ver: MARS_VERSION}),
          {
            method: 'POST'
          }
        );
      }, 3000);
    }
  }
}
);

adapterManager.registerAnalyticsAdapter({
  adapter: marsmediaAnalyticsAdapter,
  code: 'marsmedia'
});

export default marsmediaAnalyticsAdapter;
