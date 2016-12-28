import { ajax } from 'src/ajax';

/**
 * example2.js - analytics adapter for Example2 Analytics Endpoint example
 */

import adapter from 'AnalyticsAdapter';
const utils = require('../../utils');

const url = 'https://httpbin.org/post';
const analyticsType = 'endpoint';
// var placementCodeSet = {};
const STR_BIDDER_CODE = "sharethrough";
// const STR_BEACON_HOST = document.location.protocol + "//b.sharethrough.com/butler?";
const STR_VERSION = "0.1.0";

export default utils.extend(adapter(
  {
    url,
    analyticsType
  }
),
  {
  STR_BEACON_HOST: document.location.protocol + "//b.sharethrough.com/butler?",
  placementCodeSet: {},
  // Override AnalyticsAdapter functions by supplying custom methods
  track({ eventType, args }) {
    if(eventType === 'bidRequested' && args.bidderCode === 'sharethrough') {
      var bids = args.bids;
      var keys = Object.keys(bids);
      for(var i = 0; i < keys.length; i++) {
        this.placementCodeSet[bids[keys[i]].placementCode] = args.bids[keys[i]];
      }
    }

    if(eventType == 'bidWon') {
      this.bidWon(args)
    }
  },

  bidWon(args) {
    const curBidderCode = args.bidderCode;

    if(curBidderCode !== STR_BIDDER_CODE && (args.adUnitCode in this.placementCodeSet)) {
      let strBid = this.placementCodeSet[args.adUnitCode];
      this.fireLoseBeacon(curBidderCode, args.cpm, strBid.adserverRequestId, "headerBidLose");
    }
  },

  fireLoseBeacon(winningBidderCode, winningCPM, arid, type) {
    let loseBeaconUrl = this.STR_BEACON_HOST;
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, "winnerBidderCode", winningBidderCode);
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, "winnerCpm", winningCPM);
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, "arid", arid);
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, "type", type);
    loseBeaconUrl = this.appendEnvFields(loseBeaconUrl);

    this.fireBeacon(loseBeaconUrl);
  },
  appendEnvFields(url) {
    url = utils.tryAppendQueryString(url, 'hbVersion', '$prebid.version$');
    url = utils.tryAppendQueryString(url, 'strVersion', STR_VERSION);
    url = utils.tryAppendQueryString(url, 'hbSource', 'prebid');

    return url;
  },
  fireBeacon(theUrl) {
    const img = new Image();
    img.src = theUrl;
  }
});
