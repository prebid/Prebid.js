/* COPYRIGHT SCALEABLE LLC 2019 */

import { ajax } from '../src/ajax.js';
import CONSTANTS from '../src/constants.json';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { logMessage } from '../src/utils.js';

// Object.entries polyfill
const entries = Object.entries || function(obj) {
  const ownProps = Object.keys(obj);
  let i = ownProps.length;
  let resArray = new Array(i); // preallocate the Array
  while (i--) { resArray[i] = [ownProps[i], obj[ownProps[i]]]; }

  return resArray;
};

const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
const AUCTION_INIT = CONSTANTS.EVENTS.AUCTION_INIT;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;

const URL = 'https://auction.scaleable.ai/';
const ANALYTICS_TYPE = 'endpoint';

let auctionData = {};

let scaleableAnalytics = Object.assign({},
  adapter({
    URL,
    ANALYTICS_TYPE
  }),
  {
    // Override AnalyticsAdapter functions by supplying custom methods
    track({ eventType, args }) {
      switch (eventType) {
        case AUCTION_INIT:
          onAuctionInit(args);
          break;
        case AUCTION_END:
          onAuctionEnd(args);
          break;
        case BID_WON:
          onBidWon(args);
          break;
        case BID_TIMEOUT:
          onBidTimeout(args);
          break;
        default:
          break;
      }
    }
  }
);

scaleableAnalytics.config = {};
scaleableAnalytics.originEnableAnalytics = scaleableAnalytics.enableAnalytics;
scaleableAnalytics.enableAnalytics = config => {
  scaleableAnalytics.config = config;

  scaleableAnalytics.originEnableAnalytics(config);

  scaleableAnalytics.enableAnalytics = function _enable() {
    return logMessage(`Analytics adapter for "${global}" already enabled, unnecessary call to \`enableAnalytics\`.`);
  };
}

scaleableAnalytics.getAuctionData = () => {
  return auctionData;
};

const sendDataToServer = data => ajax(URL, () => {}, JSON.stringify(data));

// Track auction initiated
const onAuctionInit = args => {
  const config = scaleableAnalytics.config || {options: {}};

  let adunitObj = {};
  let adunits = [];

  // Loop through adunit codes first
  args.adUnitCodes.forEach((code) => {
    adunitObj[code] = [{
      bidder: 'scaleable_adunit_request'
    }]
  });

  // Loop through bidder requests and bids
  args.bidderRequests.forEach((bidderObj) => {
    bidderObj.bids.forEach((bidObj) => {
      adunitObj[bidObj.adUnitCode].push({
        bidder: bidObj.bidder,
        params: bidObj.params
      })
    });
  });

  entries(adunitObj).forEach(([adunitCode, bidRequests]) => {
    adunits.push({
      code: adunitCode,
      bidRequests: bidRequests
    });
  });

  const data = {
    event: 'request',
    site: config.options.site,
    adunits: adunits
  }

  sendDataToServer(data);
}

// Handle all events besides requests and wins
const onAuctionEnd = args => {
  const config = scaleableAnalytics.config || {options: {}};

  let adunitObj = {};
  let adunits = [];

  // Add Bids Received
  args.bidsReceived.forEach((bidObj) => {
    if (!adunitObj[bidObj.adUnitCode]) { adunitObj[bidObj.adUnitCode] = []; }

    adunitObj[bidObj.adUnitCode].push({
      bidder: bidObj.bidderCode || bidObj.bidder,
      cpm: bidObj.cpm,
      currency: bidObj.currency,
      dealId: bidObj.dealId,
      type: bidObj.mediaType,
      ttr: bidObj.timeToRespond,
      size: bidObj.size
    });
  });

  // Add in other data (timeouts) as we push to adunits
  entries(adunitObj).forEach(([adunitCode, bidsReceived]) => {
    const bidData = bidsReceived.concat(auctionData[adunitCode] || []);
    adunits.push({
      code: adunitCode,
      bidData: bidData
    });

    delete auctionData[adunitCode];
  });

  // Add in any missed auction data
  entries(auctionData).forEach(([adunitCode, bidData]) => {
    adunits.push({
      code: adunitCode,
      bidData: bidData
    })
  });

  const data = {
    event: 'bids',
    site: config.options.site,
    adunits: adunits
  }

  if (adunits.length) { sendDataToServer(data); }

  // Reset auctionData
  auctionData = {}
}

// Bid Win Events occur after auction end
const onBidWon = args => {
  const config = scaleableAnalytics.config || {options: {}};

  const data = {
    event: 'win',
    site: config.options.site,
    adunit: args.adUnitCode,
    code: args.bidderCode,
    cpm: args.cpm,
    ttr: args.timeToRespond,
    params: args.params
  };

  sendDataToServer(data);
}

const onBidTimeout = args => {
  args.forEach(currObj => {
    if (!auctionData[currObj.adUnitCode]) {
      auctionData[currObj.adUnitCode] = []
    }

    auctionData[currObj.adUnitCode].push({
      timeouts: 1,
      bidder: currObj.bidder
    });
  });
}

adapterManager.registerAnalyticsAdapter({
  adapter: scaleableAnalytics,
  code: 'scaleable'
})

export default scaleableAnalytics;
