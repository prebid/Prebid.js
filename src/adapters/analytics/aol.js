// Copyright 2016 AOL Platforms.

/**
 * AOL Analytics
 */

import { ajax } from 'src/ajax';
import CONSTANTS from 'src/constants.json';
import adapter from 'AnalyticsAdapter';
import BIDDERS_IDS_MAP from './aolPartnersIds.json';

const events = require('src/events');
const utils = require('../../utils');

const AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const AOL_BIDDER_CODE = 'aol';
const analyticsType = 'endpoint';

const serverMap = {
  us: 'hb-us.adtech.advertising.com',
  eu: 'hb-eu.adtech.advertising.com',
  as: 'hb-as.adtech.advertising.com'
};

const EVENTS = {
  AUCTION: 1,
  WIN: 2
};

let baseSchemaTemplate = template`${'protocol'}://${'host'}/hbevent/${'tagversion'}/${'network'}/${'placement'}/${'site'}/${'eventid'}/hbeventts=${'hbeventts'};cors=yes`;
let auctionSchemaTemplate = template`;pubadid=${'pubadid'};hbauctionid=${'hbauctionid'};hbwinner=${'hbwinner'};hbprice=${'hbprice'}${'hbcur'}${'pubapi'};hbwinbidid=${'hbwinbidid'}`;
let winSchemaTemplate = template`;hbauctioneventts=${'hbauctioneventts'};pubadid=${'pubadid'};hbauctionid=${'hbauctionid'};hbwinner=${'hbwinner'};pubcpm=${'pubcpm'}${'hbdealid'};hbbidid=${'hbbidid'}`;
let bidderSchemaTemplate = template`;hbbidder=${'hbbidder'};hbbid=${'hbbid'};hbstatus=${'hbstatus'};hbtime=${'hbtime'}${'hbdealid'};hbbidid=${'hbbidid'}`;

export default utils.extend(adapter({
  url: '',
  analyticsType
}), {

  enableAnalytics({
    options = {
      server: null // Internal use only. Use 'region' config option for AOL adapter.
    }
  }) {
    this.server = options ? options.server : null;
    this.adUnits = {};

    //first send all events fired before enableAnalytics called
    events.getEvents().forEach(event => {
      if (!event) {
        return;
      }
      this.enqueue(event);
    });

    events.on(AUCTION_END, args => this.enqueue({ eventType: AUCTION_END, args }));
    events.on(BID_WON, args => this.enqueue({ eventType: BID_WON, args }));

    this.enableAnalytics = function _enable() {
      return utils.logMessage(
        `AOL analytics adapter already enabled, unnecessary call to 'enableAnalytics()'.`
      );
    };
  },

  //override AnalyticsAdapter functions by supplying custom methods
  track({ eventType, args }) {
    switch (eventType) {
      case AUCTION_END:
        this.reportAuctionEvent({
          adUnitsConfig: $$PREBID_GLOBAL$$.adUnits,
          bidsReceived: $$PREBID_GLOBAL$$._bidsReceived,
          bidsRequested: $$PREBID_GLOBAL$$._bidsRequested
        });
        break;

      case BID_WON:
        this.reportWinEvent({ winningBid: args });
        break;
    }
  },

  reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived }) {
    let bidsReceivedPerBidderPerAdUnit = bidsReceived
      .reduce((bidsReceivedPerBidderPerAdUnit, bid) => {
        let bidsPerBidder = bidsReceivedPerBidderPerAdUnit[bid.bidder] || {};
        let bidsPerBidderPerAdUnit = bidsPerBidder[bid.adUnitCode] || [];
        bidsPerBidderPerAdUnit.push(bid);
        bidsPerBidder[bid.adUnitCode] = bidsPerBidderPerAdUnit;
        bidsReceivedPerBidderPerAdUnit[bid.bidder] = bidsPerBidder;
        return bidsReceivedPerBidderPerAdUnit;
      }, {});

    let bidsToReport = bidsRequested
      .map(bidderRequest => bidderRequest.bids
        .map(bid => {
          let receivedBidsForBidder = bidsReceivedPerBidderPerAdUnit[bid.bidder] || {};
          let receivedBidsForBidderForAdUnit = receivedBidsForBidder[bid.placementCode] || [];
          // check received bids, or mark bid as timed out if no more received bids
          if (receivedBidsForBidderForAdUnit.length > 0) {
            return receivedBidsForBidderForAdUnit.shift(); // remove to count timed out bids
          } else {
            return {
              adUnitCode: bid.placementCode,
              bidder: bid.bidder,
              cpm: 0,
              getStatusCode: () => 3, // ERROR_TIMEOUT
              timeToRespond: new Date().getTime() - bidderRequest.start
            };
          }
        })
      )
      .reduce(utils.flatten, []);

    let adUnits = {};

    bidsToReport.forEach(bid => {
      const currentAdUnitCode = bid.adUnitCode;
      let adUnit = adUnits[currentAdUnitCode];
      if (!adUnit) {
        adUnit = initAdUnit(currentAdUnitCode);
        adUnit = addAolParams(adUnit, adUnitsConfig, bidsReceived);
        adUnits[currentAdUnitCode] = adUnit;
      }
      let clonedBid = Object.assign({}, bid);
      clonedBid.aolAnalyticsBidId = adUnit.bids.length + 1;
      adUnit.winner = (adUnit.winner.cpm < clonedBid.cpm) ? clonedBid : adUnit.winner;
      adUnit.bids.push(clonedBid);
    });

    for (let code in adUnits) {
      if (adUnits.hasOwnProperty(code)) {
        // Add to this.adUnits to make it available in the reportWinEvent() later.
        let adUnit = this.adUnits[code] = adUnits[code];
        if (adUnit.aolParams) {
          this.reportEvent(EVENTS.AUCTION, adUnit);
        }
      }
    }
  },

  reportWinEvent({ winningBid }) {
    let adUnits = this.adUnits;
    for (let code in adUnits) {
      if (adUnits.hasOwnProperty(code) && winningBid.adUnitCode === code) {
        this.reportEvent(EVENTS.WIN, adUnits[code]);
      }
    }
  },

  reportEvent(event, adUnit) {
    let url = this.buildEventUrl(event, adUnit);
    ajax(url, null, null, { withCredentials: true });
  },

  getBaseSchema(eventId, adUnit) {
    let aolParams = adUnit.aolParams;
    return {
      protocol: (document.location.protocol === 'https:') ? 'https' : 'http',
      host: this.server || serverMap[aolParams.region] || serverMap.us,
      tagversion: '3.0',
      network: aolParams.network || '',
      placement: aolParams.placement,
      site: aolParams.pageId || 0,
      eventid: eventId,
      hbeventts: Math.floor(Date.now() / 1000) // Unix timestamp in seconds.
    };
  },

  getAuctionSchema(adUnit) {
    let aolParams = adUnit.aolParams;
    return {
      pubadid: this.generateAdId(adUnit),
      hbauctionid: generateAuctionId(aolParams.placement),
      hbwinner: adUnit.winner.bidder ? getBidderId(adUnit.winner.bidder) : 0,
      hbprice: adUnit.winner.cpm || 0,
      hbcur: aolParams.currencyCode ? `;hbcur=${aolParams.currencyCode}` : '',
      pubapi: aolParams.pubapiId ? `;pubapi=${aolParams.pubapiId}` : '',
      hbwinbidid: adUnit.winner.aolAnalyticsBidId
    };
  },

  getWinSchema(adUnit) {
    let auctionParams = adUnit.auctionParams;
    return {
      pubadid: this.generateAdId(adUnit),
      hbauctioneventts: auctionParams.hbauctioneventts,
      hbauctionid: auctionParams.hbauctionid,
      hbwinner: getBidderId(adUnit.winner.bidder),
      pubcpm: adUnit.winner.cpm,
      hbdealid: adUnit.winner.dealId ? `;hbdealid=${encodeURIComponent(adUnit.winner.dealId)}` : '',
      hbbidid: adUnit.winner.aolAnalyticsBidId
    };
  },

  getBidderSchema(bid) {
    return {
      hbbidder: getBidderId(bid.bidder),
      hbbid: bid.cpm || 0,
      hbstatus: getStatusCode(bid),
      hbtime: bid.timeToRespond || '',
      hbdealid: bid.dealId ? `;hbdealid=${encodeURIComponent(bid.dealId)}` : '',
      hbbidid: bid.aolAnalyticsBidId
    };
  },

  buildEventUrl(event, adUnit) {
    let baseSchema, url;

    switch (event) {

      case EVENTS.AUCTION:

        baseSchema = this.getBaseSchema(EVENTS.AUCTION, adUnit);
        let auctionSchema = this.getAuctionSchema(adUnit);
        adUnit.auctionParams = {
          hbauctioneventts: baseSchema.hbeventts,
          hbauctionid: auctionSchema.hbauctionid
        };
        url = baseSchemaTemplate(baseSchema) + auctionSchemaTemplate(auctionSchema);
        adUnit.bids.forEach(bid => {
          url = url + bidderSchemaTemplate(this.getBidderSchema(bid));
        });
        return url;

      case EVENTS.WIN:

        baseSchema = this.getBaseSchema(EVENTS.WIN, adUnit);
        let winSchema = this.getWinSchema(adUnit);
        url = baseSchemaTemplate(baseSchema) + winSchemaTemplate(winSchema);
        return url;

    }
  },

  generateAdId(adUnit) {
    if (adUnit.aolParams && adUnit.aolParams.adIdExtension ) {
      return adUnit.code + '-' + adUnit.aolParams.adIdExtension;
    }

    return adUnit.code;
  }
});

function template(strings, ...keys) {
  return function(...values) {
    let dict = values[values.length - 1] || {};
    let result = [strings[0]];
    keys.forEach(function(key, i) {
      let value = Number.isInteger(key) ? values[key] : dict[key];
      result.push(value, strings[i + 1]);
    });
    return result.join('');
  };
}

function generateAuctionId(placementId) {
  return (
    // 7 digits from the current time (milliseconds within an hour).
    new Date().getTime().toString().substr(-7) +
    // Full placement id, 7 digits at the time of development.
    placementId +
    // Random number, 5 digits at the time of development.
    Math.floor(Math.random() * 100000)
  ).substr(0, 18); // Limit to 18 digits so it doesn't exceed the LONG type.
}

function getBidderId(bidderCode) {
  return BIDDERS_IDS_MAP[bidderCode] || -1;
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function getStatusCode(bid) {
  if (!isNumber(bid.cpm)) {
    return 2; // VALID_OBF_BID
  }

  var prebidStatus = (bid.getStatusCode) ? bid.getStatusCode() : null;
  switch (prebidStatus) {
    case null:
      return -1; // INVALID
    case 0:
      return -1; // INVALID
    case 1:
      return 0; // VALID_BID
    case 2:
      return 1; // VALID_NO_BID
    case 3:
      return 3; // ERROR_TIMEOUT
    default:
      return -1; // INVALID
  }
}

function initAdUnit(adUnitCode) {
  return {
    code: adUnitCode,
    bids: [],
    winner: {
      cpm: 0
    }
  };
}

function addAolParams(adUnit, adUnitsConf, bidsReceived) {
  const filteredBids = bidsReceived.filter(
    bid => bid.bidderCode === AOL_BIDDER_CODE && bid.adUnitCode === adUnit.code
  );
  const onlyOneBid = filteredBids.length === 1;
  const pubapiId = (onlyOneBid) ? filteredBids[0].pubapiId : '';
  const currencyCode = (onlyOneBid) ? filteredBids[0].currencyCode : '';

  adUnitsConf.forEach(adUnitConf => {
    if (adUnitConf.code === adUnit.code) {
      adUnitConf.bids.forEach(adUnitBid => {
        if (adUnitBid.bidder === AOL_BIDDER_CODE) {
          adUnit.aolParams = adUnitBid.params;
          adUnit.aolParams.pubapiId = pubapiId;
          adUnit.aolParams.currencyCode = currencyCode;
        }
      });
    }
  });
  return adUnit;
}
