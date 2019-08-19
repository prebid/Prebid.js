/* COPYRIGHT SCALEABLE LLC 2019 */

import { ajax } from '../src/ajax';
import CONSTANTS from '../src/constants.json';
import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import * as utils from '../src/utils';

const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
const AUCTION_INIT = CONSTANTS.EVENTS.AUCTION_INIT;
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
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
        case BID_RESPONSE:
          onBidResponse(args);
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
    return utils.logMessage(`Analytics adapter for "${global}" already enabled, unnecessary call to \`enableAnalytics\`.`);
  };
}

scaleableAnalytics.getAuctionData = () => {
  return auctionData;
};

const sendDataToServer = data => ajax(URL, () => {}, JSON.stringify(data));

// Track auction initiated
const onAuctionInit = args => {
  const config = scaleableAnalytics.config || {options: {}};

  for (let idx = args.adUnitCodes.length; idx--;) {
    const data = {
      event: 'request',
      site: config.options.site,
      adunit: args.adUnitCodes[idx]
    };

    sendDataToServer(data);
  }
}

// Handle all events besides requests and wins
const onAuctionEnd = args => {
  for (let adunit in auctionData) {
    sendDataToServer(auctionData[adunit]);
  }
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
    ttr: args.timeToRespond
  };

  sendDataToServer(data);
}

const onBidResponse = args => {
  const config = scaleableAnalytics.config || {options: {}};

  if (!auctionData[args.adUnitCode]) {
    auctionData[args.adUnitCode] = {
      event: 'bids',
      bids: [],
      adunit: args.adUnitCode,
      site: config.options.site
    };
  }

  const currBidData = {
    code: args.bidderCode,
    cpm: args.cpm,
    ttr: args.timeToRespond
  };

  auctionData[args.adUnitCode].bids.push(currBidData);
}

const onBidTimeout = args => {
  const config = scaleableAnalytics.config || {options: {}};

  for (let i = args.length; i--;) {
    let currObj = args[i];

    if (!auctionData[currObj.adUnitCode]) {
      auctionData[currObj.adUnitCode] = {
        event: 'bids',
        bids: [],
        timeouts: [],
        adunit: currObj.adUnitCode,
        site: config.options.site
      };
    }

    auctionData[currObj.adUnitCode].timeouts.push(currObj.bidder);
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: scaleableAnalytics,
  code: 'scaleable'
})

export default scaleableAnalytics;
