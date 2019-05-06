/**
 * appnexus.js - AppNexus Prebid Analytics Adapter
 */

import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants';
import { auctionManager } from '../src/auctionManager';

var appnexusAdapterhead = adapter({
  global: 'AppNexusPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

function armJsTracker(bid) {
  if (bid.native) {
    let viewJsPayload = bid.native.javascriptTrackers;
    let cssSelector = 'css_selector=.pb-click[pbAdId=\'' + bid.adId + '\']';
    let newViewJsPayload = viewJsPayload.replace('%native_dom_id%', ';' + cssSelector);
    bid.native.javascriptTrackers = newViewJsPayload;
  }
}

var appnexusAdapter = Object.assign(appnexusAdapterhead, {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      console.info('appnexusAdapter.track - adId: ', args.adId);
      if (eventType === CONSTANTS.EVENTS.AUCTION_END) {
        // getting all appnexus' bids to put the adId in the javascriptTracjer's macro
        // (can't do it from the BidAdapter as the adId isn't defined when the bids are created)
        let bidsToArm = auctionManager.getBidsReceived().filter(bid => bid.bidderCode === 'appnexus');
        bidsToArm.forEach(function (bid) {
          armJsTracker(bid);
        })
      }
    }
  }
});

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
