/**
* marsmedia.js - Mars Media Analytics Adapter
*/
import adapter from 'AnalyticsAdapter';
import { ajax } from 'src/ajax';
const analyticsType = 'endpoint';
var MARS_ANALYTICS_URL = '//prebid-js-2015622974.us-east-1.elb.amazonaws.com/prebidjs/api/analytics.php';
var MARS_BIDDER_CODE = 'marsmedia';
var events = {};

let marsmediaAnalytics = Object.assign(adapter(
  {
    MARS_ANALYTICS_URL,
    analyticsType
  }
  ),
  {
    // Override AnalyticsAdapter functions by supplying custom methods
    track({eventType, args}) {
      if (typeof args !== 'undefined' && args.bidderCode === MARS_BIDDER_CODE) {
        events[eventType] = args;
      }

      if (eventType === 'auctionEnd') {
        setTimeout(function() {
          sendAnalytics();
        }, 3000);
      }
    }
  }
);

function sendAnalytics() {
  ajax(
    MARS_ANALYTICS_URL,
    {
      success: function(res) {},
      error: function() {}
    },
    JSON.stringify({ act: 'prebid_analytics', params: events, 'pbjs': pbjs.getBidResponses() }),
    {
      method: 'POST'
    }
  );
}

export default marsmediaAnalytics;
