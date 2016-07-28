// Copyright 2016 AOL Platforms.

/**
 * AOL Analytics
 */

import { ajax } from 'src/ajax';
import CONSTANTS from 'src/constants.json';
import adapter from 'AnalyticsAdapter';

const events = require('src/events');
const utils = require('../../utils');

const AUCTION_COMPLETED = CONSTANTS.EVENTS.AUCTION_COMPLETED;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
const AOL_BIDDER_CODE = 'aol';
const analyticsType = 'endpoint';

const EVENTS = {
  AUCTION: 1,
  WIN: 2
};

let adUnits = {};

let baseSchemaTemplate = template `${'protocol'}://${'host'}${('port') ? `:${'port'}` : ``}/hbevent/${'tagversion'}/${'network'}/${ ('subnetwork')?`${'subnetwork'}/`:``}${'placement'}/${'site'}/${'eventid'}/hbeventts=${'hbeventts'}`;
let auctionSchemaTemplate = template `;pubadid=${'pubadid'};hbauctionid=${'hbauctionid'};hbwinner=${'hbwinner'};hbprice=${'hbprice'};${ ('hbcur') ? `hbcur=${'hbcur'};` : ``}pubapi=${'pubapi'}`;
let winSchemaTemplate = template `;hbauctioneventts=${'hbauctioneventts'};pubadid=${'pubadid'};hbauctionid=${'hbauctionid'};hbwinner=${'hbwinner'};pubcpm=${'pubcpm'}`;
let bidderSchemaTemplate = template `;hbbidder=${'hbbidder'};hbbid=${'hbbid'};hbstatus=${'hbstatus'};hbtime=${'hbtime'}`;

export default utils.extend(adapter({
    url: '',
    analyticsType
  }), {

    enableAnalytics() {
      //first send all events fired before enableAnalytics called
      events.getEvents().forEach(event => {
        if (!event) {
          return;
        }

        const { eventType, args } = event;

        if (eventType === BID_TIMEOUT) {
          _timedOutBidders = args.bidderCode;
        } else {
          _enqueue.call(this, { eventType, args });
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
          let bidsReceived = args.bidResponses;
          let adUnitsConf = args.adUnits;

          for (let bid of bidsReceived) {
            let adUnit = adUnits[bid.adUnitCode];
            if (!adUnit) {
              adUnit = {
                bids: [],
                winner: {
                  cpm: 0
                },
              };
              for (let adUnitConf of adUnitsConf) {
                if (adUnitConf.code === bid.adUnitCode) {
                  for (let adUnitBid of adUnitConf.bids) {
                    if (AOL_BIDDER_CODE === adUnitBid.bidder) {
                      adUnit.aolParams = adUnitBid.params;
                    }
                  }
                }
              }
              adUnits[bid.adUnitCode] = adUnit;
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
      ajax(url);
    },

    getBaseSchema(eventId, adUnit) {
      let aolParams = adUnit.aolParams;
      return {
        protocol: (document.location.protocol === 'https:') ? 'https' : 'http',
        host: aolParams.server || 'adserver.adtechus.com',
        port: aolParams.port || '',
        tagversion: '3.0',
        network: aolParams.network || '',
        subnetwork: aolParams.subnetwork || '',
        placement: aolParams.placement ,
        site: aolParams.site || '',
        eventid: eventId,
        hbeventts: Date.now()
      };
    },

    getAuctionSchema(adUnit) {
      let aolParams = adUnit.aolParams;
      return {
        pubadid: '', // Is this the ad unit code?
        hbauctionid: generateAuctionId(aolParams.placement),
        hbwinner: adUnit.winner.bidderCode || '',
        hbprice: adUnit.winner.cpm || '',
        hbcur: '',
        pubapi: ''
      }
    },

    getWinSchema(adUnit) {
      let auctionParams = adUnit.auctionParams;
      return {
        hbauctioneventts: auctionParams.hbauctioneventts,
        pubadid: '', // Is this the ad unit code?
        hbauctionid: auctionParams.hbauctionid,
        hbwinner: adUnit.winner.bidderCode || '',
        pubcpm: adUnit.winner.cpm
      }
    },

    getBidderSchema(bid) {
      return {
        hbbidder: bid.bidderCode || '',
        hbbid: bid.cpm || '',
        hbstatus: (bid.getStatusCode) ? bid.getStatusCode() : '',
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
  return (function(...values) {
    let dict = values[values.length - 1] || {};
    let result = [strings[0]];
    keys.forEach(function(key, i) {
      let value = Number.isInteger(key) ? values[key] : dict[key];
      result.push(value, strings[i + 1]);
    });
    return result.join('');
  });
}

function generateAuctionId(placementId) {
  return new Date().getTime().toString().substr(-7) +
    placementId +
    Math.floor(Math.random() * 100000);
}
