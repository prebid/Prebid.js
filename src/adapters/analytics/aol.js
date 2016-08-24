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

const AUCTION_COMPLETED = CONSTANTS.EVENTS.AUCTION_COMPLETED;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
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

let adUnits = {};

let baseSchemaTemplate = template `${'protocol'}://${'host'}${('port') ? `:${'port'}` : ``}/hbevent/${'tagversion'}/${'network'}/${ ('subnetwork')?`${'subnetwork'}/`:``}${'placement'}/${'site'}/${'eventid'}/hbeventts=${'hbeventts'};cors=yes`;
let auctionSchemaTemplate = template `;pubadid=${'pubadid'};hbauctionid=${'hbauctionid'};hbwinner=${'hbwinner'};hbprice=${'hbprice'};${ ('hbcur') ? `hbcur=${'hbcur'};` : ``}pubapi=${'pubapi'}`;
let winSchemaTemplate = template `;hbauctioneventts=${'hbauctioneventts'};pubadid=${'pubadid'};hbauctionid=${'hbauctionid'};hbwinner=${'hbwinner'};pubcpm=${'pubcpm'}`;
let bidderSchemaTemplate = template `;hbbidder=${'hbbidder'};hbbid=${'hbbid'};hbstatus=${'hbstatus'};hbtime=${'hbtime'}`;

var _timedOutBidders = [];

export default utils.extend(adapter({
    url: '',
    analyticsType
  }), {

    enableAnalytics({
      options = {
        server: null // Internal use only. Use 'region' config option for AOL adapter.
      }
    }) {
      this.server = options.server;

      //first send all events fired before enableAnalytics called
      events.getEvents().forEach(event => {
        if (!event) {
          return;
        }

        const { eventType, args } = event;

        if (eventType === BID_TIMEOUT) {
          _timedOutBidders = args.bidderCode;
        } else {
          this.enqueue({ eventType, args });
        }
      });

      events.on(AUCTION_COMPLETED, args => this.enqueue({ eventType: AUCTION_COMPLETED, args }));
      events.on(BID_WON, args => this.enqueue({ eventType: BID_WON, args }));

      this.enableAnalytics = function _enable() {
        return utils.logMessage(`Analytics adapter for "${global}" already enabled, unnecessary call to \`enableAnalytics\`.`);
      };
    },

    //override AnalyticsAdapter functions by supplying custom methods
    track({ eventType, args }) {
      switch (eventType) {
        case AUCTION_COMPLETED:
          let bidsReceived = args.bidsReceived;
          let adUnitsConf = args.adUnits;

          for (let bid of bidsReceived) {
            const currentAdUnitCode = bid.adUnitCode;
            let adUnit = adUnits[currentAdUnitCode];
            if (!adUnit) {
              adUnit = {
                code: currentAdUnitCode,
                bids: [],
                winner: {
                  cpm: 0
                },
              };

              const filteredBids = bidsReceived.filter(
                bid => bid.bidderCode === AOL_BIDDER_CODE && bid.adUnitCode === currentAdUnitCode
              );
              const pubapiId = (filteredBids.length === 1) ? filteredBids[0].pubapiId : '';

              for (let adUnitConf of adUnitsConf) {
                if (adUnitConf.code === currentAdUnitCode) {
                  for (let adUnitBid of adUnitConf.bids) {
                    if (adUnitBid.bidder === AOL_BIDDER_CODE) {
                      adUnit.aolParams = adUnitBid.params;
                      adUnit.aolParams.pubapiId = pubapiId;
                    }
                  }
                }
              }
              adUnits[currentAdUnitCode] = adUnit;
            }
            adUnit.winner = (adUnit.winner.cpm < bid.cpm) ? bid : adUnit.winner;
            adUnit.bids.push(Object.assign(bid));
          }

          for (let code in adUnits) {
            if (adUnits.hasOwnProperty(code)) {
              let adUnit = adUnits[code];
              if (adUnit.aolParams && adUnit.winner.cpm) {
                let url = this.buildEndpoint(EVENTS.AUCTION, adUnit);
                this.reportEvent(url);
              }
            }
          }

          break;

        case BID_WON:
          let bidWon = args;

          for (let code in adUnits) {
            if (adUnits.hasOwnProperty(code)) {
              if (bidWon.adUnitCode === code) {
                let url = this.buildEndpoint(EVENTS.WIN, adUnits[code]);
                this.reportEvent(url);
              }
            }
          }

          break;
      }

    },

    reportEvent(url) {
      ajax(url, null, null, null, {isTrackingRequest: true});
    },

    getBaseSchema(eventId, adUnit) {
      let aolParams = adUnit.aolParams;
      return {
        protocol: (document.location.protocol === 'https:') ? 'https' : 'http',
        host: this.server || serverMap[aolParams.region] || serverMap.us,
        port: aolParams.port || '',
        tagversion: '3.0',
        network: aolParams.network || '',
        subnetwork: aolParams.subnetwork || '',
        placement: aolParams.placement,
        site: aolParams.pageid || 0,
        eventid: eventId,
        hbeventts: Math.floor(Date.now() / 1000) // Unix timestamp in seconds.
      };
    },

    getAuctionSchema(adUnit) {
      let aolParams = adUnit.aolParams;
      return {
        pubadid: adUnit.code,
        hbauctionid: generateAuctionId(aolParams.placement),
        hbwinner: adUnit.winner.bidder ? getBidderId(adUnit.winner.bidder) : 0,
        hbprice: adUnit.winner.cpm || 0,
        hbcur: '',
        pubapi: aolParams.pubapiId
      };
    },

    getWinSchema(adUnit) {
      let auctionParams = adUnit.auctionParams;
      return {
        pubadid: adUnit.code,
        hbauctioneventts: auctionParams.hbauctioneventts,
        hbauctionid: auctionParams.hbauctionid,
        hbwinner: getBidderId(adUnit.winner.bidder),
        pubcpm: adUnit.winner.cpm
      };
    },

    getBidderSchema(bid) {
      return {
        hbbidder: getBidderId(bid.bidder),
        hbbid: bid.cpm || 0,
        hbstatus: getStatusCode(bid),
        hbtime: bid.timeToRespond || ''
      };
    },

    buildEndpoint(event, adUnit) {
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
          for (let bid of adUnit.bids) {
            url = url + bidderSchemaTemplate(this.getBidderSchema(bid));
          }
          return url;

        case EVENTS.WIN:

          baseSchema = this.getBaseSchema(EVENTS.WIN, adUnit);
          let winSchema = this.getWinSchema(adUnit);
          url = baseSchemaTemplate(baseSchema) + winSchemaTemplate(winSchema);
          return url;

      }
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
  ).substr(0, 19); // Limit to 19 digits so it doesn't exceed the LONG type.
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
