// Copyright 2016 AOL Platforms.

import { expect } from 'chai';
import events from '../../../../../src/events';
import CONSTANTS from '../../../../../src/constants.json';
import {
  DEFAULT_REQUEST_TIMESTAMP,
  DEFAULT_REQUEST_ID,
  DEFAULT_TIMEOUT,
  DEFAULT_AD_UNIT_CODE,
  DEFAULT_AD_UNIT,
  BID_CONFIGS,
  BID_SETS,
  BIDS,
} from '../../../../fixtures/fixturesAnalytics';

const utils = require('../../../../../src/utils');
const aolAnalytics = require('../../../../../src/adapters/analytics/aol').default;

const AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const ANALYTICS_EVENTS = {
  AUCTION: 1,
  WIN: 2
};

describe('AOL analytics adapter', () => {

  afterEach(() => {
    aolAnalytics.adUnits = {};
  });

  function createAdUnit(adUnitConfig) {
    return Object.assign({}, DEFAULT_AD_UNIT, adUnitConfig);
  }

  function createRequestedBids(adUnits) {
    return utils.getBidderCodes(adUnits).map(bidderCode => {
      const bidderRequestId = utils.getUniqueIdentifierStr();
      return {
        bidder: bidderCode,
        bidderCode: bidderCode,
        bidderRequestId: bidderRequestId,
        requestId: DEFAULT_REQUEST_ID,
        start: DEFAULT_REQUEST_TIMESTAMP,
        timeout: DEFAULT_TIMEOUT,
        bids: adUnits.map(adUnit => adUnit.bids
            .filter(bid => bid.bidder === bidderCode)
            .map(bid => Object.assign({}, bid, {
              placementCode: adUnit.code,
              bidId: utils.getUniqueIdentifierStr(),
              bidderRequestId: bidderRequestId,
              requestId: DEFAULT_REQUEST_ID,
              sizes: adUnit.sizes
            }))
          )
          .reduce(utils.flatten, [])
      };
    });
  }

  function getDefaultReceivedBid(status) {
    switch (status) {
      case 1:
        return BIDS.VALID;
      case 2:
        return BIDS.EMPTY;
      case 3:
        return BIDS.TIMED_OUT;
      default:
        return BIDS.VALID;
    }
  }

  function createReceivedBid(bidResponse) {
    const status = bidResponse.status || 1;
    const DEFAULT_RECEIVED_BID = getDefaultReceivedBid(status);
    return Object.assign({}, DEFAULT_RECEIVED_BID, bidResponse);
  }

  aolAnalytics.enableAnalytics({});

  describe('enableAnalytics', () => {
    afterEach(() => {
      if (utils.logMessage.restore) {
        utils.logMessage.restore();
      }
    });

    it('should just log a message on subsequest calls', () => {
      sinon.spy(utils, 'logMessage');
      aolAnalytics.enableAnalytics({});
      expect(utils.logMessage.called).to.be.true;
    });
  });

  describe('track()', () => {
    afterEach(() => {
      if (aolAnalytics.reportAuctionEvent.restore) {
        aolAnalytics.reportAuctionEvent.restore();
      }
      if (aolAnalytics.reportWinEvent.restore) {
        aolAnalytics.reportWinEvent.restore();
      }
    });

    it('should call reportAuctionEvent() when AUCTION_END event is fired', () => {
      sinon.stub(aolAnalytics, 'reportAuctionEvent');
      events.emit(AUCTION_END);
      expect(aolAnalytics.reportAuctionEvent.calledOnce).to.be.true;
    });

    it('should call reportWinEvent() when BID_WON event is fired', () => {
      sinon.stub(aolAnalytics, 'reportWinEvent');
      events.emit(BID_WON, BIDS.VALID);
      expect(aolAnalytics.reportWinEvent.calledOnce).to.be.true;
    });
  });

  describe('reportAuctionEvent()', () => {
    beforeEach(() => {
      sinon.stub(aolAnalytics, 'reportEvent');
    });

    afterEach(() => {
      if (aolAnalytics.reportEvent.restore) {
        aolAnalytics.reportEvent.restore();
      }
    });

    describe('for one ad unit', () => {
      it('should report auction with a valid bid', () => {
        let adUnitsConfig = [DEFAULT_AD_UNIT];
        let bidsRequested = [BID_SETS.AOL];
        let bidsReceived = [BIDS.VALID];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledOnce).to.be.true;
        expect(aolAnalytics.reportEvent.calledWith(1)).to.be.true;
        let bids = aolAnalytics.reportEvent.getCall(0).args[1].bids;
        expect(bids).to.include(BIDS.VALID);
        expect(bids[0].getStatusCode()).to.equal(1);
      });

      it('should report auction with empty bid', () => {
        let adUnitsConfig = [DEFAULT_AD_UNIT];
        let bidsRequested = [BID_SETS.AOL];
        let bidsReceived = [BIDS.EMPTY];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledOnce).to.be.true;
        expect(aolAnalytics.reportEvent.calledWith(1)).to.be.true;
        let bids = aolAnalytics.reportEvent.getCall(0).args[1].bids;
        expect(bids).to.include(BIDS.EMPTY);
        expect(bids[0].getStatusCode()).to.equal(2);
      });

      it('should report auction with timed out bid', () => {
        let adUnitsConfig = [DEFAULT_AD_UNIT];
        let bidsRequested = [BID_SETS.AOL];
        let bidsReceived = [];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledOnce).to.be.true;
        expect(aolAnalytics.reportEvent.calledWith(1)).to.be.true;
        let bids = aolAnalytics.reportEvent.getCall(0).args[1].bids;
        expect(bids).to.have.lengthOf(1);
        let timedOutBid = bids[0];
        expect(timedOutBid).to.have.property('bidder', 'aol');
        expect(timedOutBid).to.have.property('adUnitCode', DEFAULT_AD_UNIT_CODE);
        expect(timedOutBid).to.have.property('cpm', 0);
        expect(timedOutBid.getStatusCode()).to.equal(3);
        expect(timedOutBid.timeToRespond).to.be.at.least(1);
      });

      it('should report auction with 2 valid bids', () => {
        let adUnitsConfig = [createAdUnit({
          bids: [BID_CONFIGS.AOL1, BID_CONFIGS.APPNEXUS1]
        })];
        let bidsRequested = createRequestedBids(adUnitsConfig);
        let bidsReceived = [
          BIDS.VALID,
          createReceivedBid({
            bidder: 'appnexus',
            bidderCode: 'appnexus',
            adUnitCode: DEFAULT_AD_UNIT_CODE,
            getStatusCode: () => 1,
            adId: '222bb26f9e8be'
          })
        ];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledOnce).to.be.true;
        expect(aolAnalytics.reportEvent.calledWith(1)).to.be.true;
        let bids = aolAnalytics.reportEvent.getCall(0).args[1].bids;
        expect(bids).to.have.lengthOf(2);
        expect(bids[0]).to.have.property('bidder', 'aol');
        expect(bids[1]).to.have.property('bidder', 'appnexus');
        bids.forEach(timedOutBid => {
          expect(timedOutBid.getStatusCode()).to.equal(1);
        });
      });

      it('should report auction with 2 timed out bids', () => {
        let adUnitsConfig = [createAdUnit({
          bids: [BID_CONFIGS.AOL1, BID_CONFIGS.APPNEXUS1]
        })];
        let bidsRequested = createRequestedBids(adUnitsConfig);
        let bidsReceived = [];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledOnce).to.be.true;
        expect(aolAnalytics.reportEvent.calledWith(1)).to.be.true;
        let bids = aolAnalytics.reportEvent.getCall(0).args[1].bids;
        expect(bids).to.have.lengthOf(2);
        expect(bids[0]).to.have.property('bidder', 'aol');
        expect(bids[1]).to.have.property('bidder', 'appnexus');
        bids.forEach(timedOutBid => {
          expect(timedOutBid).to.have.property('adUnitCode', DEFAULT_AD_UNIT_CODE);
          expect(timedOutBid).to.have.property('cpm', 0);
          expect(timedOutBid.getStatusCode()).to.equal(3);
          expect(timedOutBid.timeToRespond).to.be.at.least(1);
        });
      });

      it('should report auction with 2 valid bids and 1 pending', () => {
        let adUnitsConfig = [createAdUnit({
          bids: [BID_CONFIGS.AOL1, BID_CONFIGS.APPNEXUS1, BID_CONFIGS.PULSEPOINT1]
        })];
        let bidsRequested = createRequestedBids(adUnitsConfig);
        let bidsReceived = [
          BIDS.VALID,
          createReceivedBid({
            bidder: 'appnexus',
            bidderCode: 'appnexus',
            adUnitCode: DEFAULT_AD_UNIT_CODE,
            getStatusCode: () => 1,
            adId: '222bb26f9e8be',
            cpm: 0.08,
            pbLg: '0.00',
            pbMg: '0.08',
            pbHg: '0.10',
            pbAg: '0.08',
            adserverTargeting: {
              hb_bidder: 'appnexus',
              hb_adid: '222bb26f9e8be',
              hb_pb: '8.00',
              hb_size: '300x250'
            }
          })
        ];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledOnce).to.be.true;
        expect(aolAnalytics.reportEvent.calledWith(1)).to.be.true;
        let bids = aolAnalytics.reportEvent.getCall(0).args[1].bids;
        expect(bids).to.have.lengthOf(3);
        expect(bids[0]).to.have.property('bidder', 'aol');
        expect(bids[0].getStatusCode()).to.equal(1);
        expect(bids[1]).to.have.property('bidder', 'appnexus');
        expect(bids[1].getStatusCode()).to.equal(1);
        expect(bids[2]).to.have.property('bidder', 'pulsepoint');
        expect(bids[2].getStatusCode()).to.equal(3);
        bids.forEach(bid => {
          expect(bid).to.have.property('adUnitCode', DEFAULT_AD_UNIT_CODE);
          expect(bid.timeToRespond).to.be.at.least(1);
        });
      });

      it('should report auction with 2 empty bids and 1 pending', () => {
        let adUnitsConfig = [createAdUnit({
          bids: [
            BID_CONFIGS.AOL1,
            BID_CONFIGS.APPNEXUS1,
            BID_CONFIGS.PULSEPOINT1
          ]
        })];
        let bidsRequested = createRequestedBids(adUnitsConfig);
        let bidsReceived = [
          BIDS.EMPTY,
          createReceivedBid({
            status: 2,
            bidder: 'appnexus',
            bidderCode: 'appnexus',
            adUnitCode: DEFAULT_AD_UNIT_CODE,
            getStatusCode: () => 2,
            adId: '222bb26f9e8be'
          })
        ];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledOnce).to.be.true;
        expect(aolAnalytics.reportEvent.calledWith(1)).to.be.true;
        let bids = aolAnalytics.reportEvent.getCall(0).args[1].bids;
        expect(bids).to.have.lengthOf(3);
        expect(bids[0]).to.have.property('bidder', 'aol');
        expect(bids[0].getStatusCode()).to.equal(2);
        expect(bids[1]).to.have.property('bidder', 'appnexus');
        expect(bids[1].getStatusCode()).to.equal(2);
        expect(bids[2]).to.have.property('bidder', 'pulsepoint');
        expect(bids[2].getStatusCode()).to.equal(3);
        bids.forEach(bid => {
          expect(bid).to.have.property('adUnitCode', DEFAULT_AD_UNIT_CODE);
          expect(bid.timeToRespond).to.be.at.least(1);
        });
      });
    });

    describe('for 2 ad units', () => {
      it('should report auction with 2 valid bids for each ad unit', () => {
        let adUnitsConfig = [
          createAdUnit({
            code: 'header-bid-tag-0',
            bids: [BID_CONFIGS.AOL1, BID_CONFIGS.APPNEXUS1]
          }),
          createAdUnit({
            code: 'header-bid-tag-1',
            bids: [BID_CONFIGS.AOL2, BID_CONFIGS.PULSEPOINT1]
          })
        ];
        let bidsRequested = createRequestedBids(adUnitsConfig);
        let bidsReceived = [
          createReceivedBid({
            bidder: 'aol',
            bidderCode: 'aol',
            adUnitCode: 'header-bid-tag-0'
          }),
          createReceivedBid({
            bidder: 'aol',
            bidderCode: 'aol',
            adUnitCode: 'header-bid-tag-1'
          }),
          createReceivedBid({
            bidder: 'appnexus',
            bidderCode: 'appnexus',
            adUnitCode: 'header-bid-tag-0'
          }),
          createReceivedBid({
            bidder: 'pulsepoint',
            bidderCode: 'pulsepoint',
            adUnitCode: 'header-bid-tag-1'
          })
        ];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledTwice).to.be.true;
        let call1 = aolAnalytics.reportEvent.getCall(0);
        let bids1 = call1.args[1].bids;
        expect(call1.calledWith(1)).to.be.true;
        expect(call1.args[1]).have.property('aolParams', BID_CONFIGS.AOL1.params);
        expect(bids1).to.have.lengthOf(2);
        expect(bids1[0]).to.have.property('bidder', 'aol');
        expect(bids1[1]).to.have.property('bidder', 'appnexus');
        bids1.forEach(bid => {
          expect(bid).to.have.property('adUnitCode', 'header-bid-tag-0');
          expect(bid.getStatusCode()).to.equal(1);
          expect(bid.timeToRespond).to.be.at.least(1);
        });
        let call2 = aolAnalytics.reportEvent.getCall(1);
        let bids2 = call2.args[1].bids;
        expect(call2.calledWith(1)).to.be.true;
        expect(call2.args[1]).have.property('aolParams', BID_CONFIGS.AOL2.params);
        expect(bids2).to.have.lengthOf(2);
        expect(bids2[0]).to.have.property('bidder', 'aol');
        expect(bids2[1]).to.have.property('bidder', 'pulsepoint');
        bids2.forEach(bid => {
          expect(bid).to.have.property('adUnitCode', 'header-bid-tag-1');
          expect(bid.getStatusCode()).to.equal(1);
          expect(bid.timeToRespond).to.be.at.least(1);
        });
      });
    });

    describe('with multiple bids for the same bidder', () => {
      it('should report auction with 2 valid bids from the same bidder', () => {
        let adUnitsConfig = [
          createAdUnit({
            bids: [
              BID_CONFIGS.AOL1,
              BID_CONFIGS.APPNEXUS1,
              BID_CONFIGS.APPNEXUS2
            ]
          })
        ];
        let bidsRequested = createRequestedBids(adUnitsConfig);
        let bidsReceived = [
          createReceivedBid({
            bidder: 'aol',
            bidderCode: 'aol'
          }),
          createReceivedBid({
            bidder: 'appnexus',
            bidderCode: 'appnexus'
          }),
          createReceivedBid({
            bidder: 'appnexus',
            bidderCode: 'appnexus'
          })
        ];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledOnce).to.be.true;
        expect(aolAnalytics.reportEvent.calledWith(1)).to.be.true;
        let args = aolAnalytics.reportEvent.getCall(0).args;
        let bids = args[1].bids;
        expect(args[1]).have.property('aolParams', BID_CONFIGS.AOL1.params);
        expect(bids).to.have.lengthOf(3);
        expect(bids[0]).to.have.property('bidder', 'aol');
        expect(bids[1]).to.have.property('bidder', 'appnexus');
        expect(bids[2]).to.have.property('bidder', 'appnexus');
        bids.forEach(bid => {
          expect(bid).to.have.property('adUnitCode', DEFAULT_AD_UNIT_CODE);
          expect(bid.getStatusCode()).to.equal(1);
          expect(bid.timeToRespond).to.be.at.least(1);
        });
      });

      it('should report auction with 1 valid bid and 1 empty bid from the same bidder', () => {
        let adUnitsConfig = [
          createAdUnit({
            bids: [
              BID_CONFIGS.AOL1,
              BID_CONFIGS.APPNEXUS1,
              BID_CONFIGS.APPNEXUS2
            ]
          })
        ];
        let bidsRequested = createRequestedBids(adUnitsConfig);
        let bidsReceived = [
          createReceivedBid({
            bidder: 'aol',
            bidderCode: 'aol'
          }),
          createReceivedBid({
            bidder: 'appnexus',
            bidderCode: 'appnexus'
          }),
          createReceivedBid({
            status: 2,
            bidder: 'appnexus',
            bidderCode: 'appnexus'
          })
        ];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledOnce).to.be.true;
        expect(aolAnalytics.reportEvent.calledWith(1)).to.be.true;
        let call = aolAnalytics.reportEvent.getCall(0);
        let bids = call.args[1].bids;
        expect(call.args[1]).have.property('aolParams', BID_CONFIGS.AOL1.params);
        expect(bids).to.have.lengthOf(3);
        expect(bids[0]).to.have.property('bidder', 'aol');
        expect(bids[0].getStatusCode()).to.equal(1);
        expect(bids[1]).to.have.property('bidder', 'appnexus');
        expect(bids[1].getStatusCode()).to.equal(1);
        expect(bids[2]).to.have.property('bidder', 'appnexus');
        expect(bids[2].getStatusCode()).to.equal(2);
        bids.forEach(bid => {
          expect(bid).to.have.property('adUnitCode', DEFAULT_AD_UNIT_CODE);
          expect(bid.timeToRespond).to.be.at.least(1);
        });
      });

      it('should report auction with valid, empty and pending bids from the same bidder', () => {
        let adUnitsConfig = [
          createAdUnit({
            bids: [
              BID_CONFIGS.AOL1,
              BID_CONFIGS.APPNEXUS1,
              BID_CONFIGS.APPNEXUS2,
              BID_CONFIGS.APPNEXUS3
            ]
          })
        ];
        let bidsRequested = createRequestedBids(adUnitsConfig);
        let bidsReceived = [
          createReceivedBid({
            bidder: 'aol',
            bidderCode: 'aol'
          }),
          createReceivedBid({
            bidder: 'appnexus',
            bidderCode: 'appnexus'
          }),
          createReceivedBid({
            status: 2,
            bidder: 'appnexus',
            bidderCode: 'appnexus'
          })
        ];

        aolAnalytics.reportAuctionEvent({ adUnitsConfig, bidsRequested, bidsReceived });

        expect(aolAnalytics.reportEvent.calledOnce).to.be.true;
        expect(aolAnalytics.reportEvent.calledWith(1)).to.be.true;
        let call = aolAnalytics.reportEvent.getCall(0);
        let bids = call.args[1].bids;
        expect(call.args[1]).have.property('aolParams', BID_CONFIGS.AOL1.params);
        expect(bids).to.have.lengthOf(4);
        expect(bids[0]).to.have.property('bidder', 'aol');
        expect(bids[0].getStatusCode()).to.equal(1);
        expect(bids[1]).to.have.property('bidder', 'appnexus');
        expect(bids[1].getStatusCode()).to.equal(1);
        expect(bids[2]).to.have.property('bidder', 'appnexus');
        expect(bids[2].getStatusCode()).to.equal(2);
        expect(bids[3]).to.have.property('bidder', 'appnexus');
        expect(bids[3].getStatusCode()).to.equal(3);
        bids.forEach(bid => {
          expect(bid).to.have.property('adUnitCode', DEFAULT_AD_UNIT_CODE);
          expect(bid.timeToRespond).to.be.at.least(1);
        });
      });
    });
  });

  describe('buildEventUrl()', () => {
    describe('for AUCTION event', () => {
      it('should build the default hbevent endpoint', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain('hb-us.adtech.advertising.com/hbevent/3.0/');
      });

      it('should build hbevent endpoint based on region config', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: {
            placement: 3675026,
            network: '9599.1',
            pageid: 12345,
            region: 'eu'
          },
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain('hb-eu.adtech.advertising.com/hbevent/3.0/');
      });

      it('should build hbevent endpoint based on the server option', () => {
        aolAnalytics.server = 'hb-as.adtech.advertising.com';
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid
        });
        aolAnalytics.server = null;
        expect(url).to.contain('hb-as.adtech.advertising.com/hbevent/3.0/');
      });

      it('should build url with required params - placement & network', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: {
            placement: 1234567,
            network: '9599.1'
          },
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain('/hbevent/3.0/9599.1/1234567/');
      });

      it('should build url with pageId of 0 if param is missing', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: {
            placement: 1234567,
            network: '9599.1'
          },
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain('/hbevent/3.0/9599.1/1234567/0/');
      });

      it('should build url with pageId optional param', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: {
            placement: 1234567,
            network: '9599.1',
            pageId: 12345
          },
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain('/hbevent/3.0/9599.1/1234567/12345/');
      });

      it('should build url with AUCTION event id', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain('/1/hbeventts=');
      });

      it('should build url with current timestamp in seconds', () => {
        let now = Date.now() / 1000 - 1;
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid
        });
        expect(url).to.match(/hbeventts=\d+;/);
        let timestamp = url.match(/hbeventts=(\d+);/)[1];
        expect(timestamp).to.be.within(now, now + 5);
      });

      it('should build url with ad unit code set as pubadid parameter', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          code: DEFAULT_AD_UNIT,
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain(`;pubadid=${DEFAULT_AD_UNIT};`);
      });

      it('should build url with hbauctionid parameter having at most 19 digits', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid
        });
        expect(url).to.match(/;hbauctionid=(\d+);/);
        let auctionId = url.match(/;hbauctionid=(\d+);/)[1];
        expect(auctionId).to.have.length.at.most(19);
      });

      it('should build url with hbwinner parameter', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain(';hbwinner=1;'); // AOL
      });

      it('should build url with hbprice parameter', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain(';hbprice=0.1;');
      });

      it('should build url without hbcur parameter if not set', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid
        });
        expect(url).to.not.contain(';cur=');
      });

      it('should build url with hbcur parameter if set', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: Object.assign({}, BID_CONFIGS.AOL1.params, { currencyCode: 'USD' }),
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain(';hbcur=USD;');
      });

      it('should build url without pubapi parameter if not set', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid
        });
        expect(url).to.not.contain(';pubapi=');
      });

      it('should build url with pubapi parameter if set', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
          aolParams: Object.assign({}, BID_CONFIGS.AOL1.params, { pubapiId: 456 }),
          bids: [bid],
          winner: bid
        });
        expect(url).to.contain(';pubapi=456;');
      });

      describe('should include bidders', () => {
        it('should build url with one bidder', () => {
          let bid = BIDS.VALID;
          let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
            aolParams: BID_CONFIGS.AOL1.params,
            bids: [bid],
            winner: bid
          });
          expect(url).to.contain(';hbbidder=1;');
          expect(url).to.contain(';hbbid=0.1;');
          expect(url).to.contain(';hbstatus=0;');
          expect(url).to.contain(`;hbtime=${bid.timeToRespond}`);
        });

        it('should build url with multiple bidders', () => {
          let bid1 = BIDS.VALID;
          let bid2 = createReceivedBid({
            bidder: 'appnexus',
            bidderCode: 'appnexus',
            cpm: 0.08
          });
          let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
            aolParams: BID_CONFIGS.AOL1.params,
            bids: [bid1, bid2],
            winner: bid1
          });
          expect(url).to.contain(';hbbidder=1;');
          expect(url).to.contain(';hbbid=0.1;');
          expect(url).to.contain(';hbstatus=0;');
          expect(url).to.contain(`;hbtime=${bid1.timeToRespond}`);
          expect(url).to.contain(';hbbidder=3;');
          expect(url).to.contain(';hbbid=0.08;');
          expect(url).to.contain(';hbstatus=0;');
          expect(url).to.contain(`;hbtime=${bid2.timeToRespond}`);
        });

        it('should build url with hbstatus of 1 for invalid bids', () => {
          let bid = BIDS.EMPTY;
          let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
            aolParams: BID_CONFIGS.AOL1.params,
            bids: [bid],
            winner: bid
          });
          expect(url).to.contain(';hbbidder=1;');
          expect(url).to.contain(';hbbid=0;');
          expect(url).to.contain(';hbstatus=1;');
          expect(url).to.contain(`;hbtime=${bid.timeToRespond}`);
        });

        it('should build url with hbstatus of 3 for timed out bids', () => {
          let bid = BIDS.TIMED_OUT;
          let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
            aolParams: BID_CONFIGS.AOL1.params,
            bids: [bid],
            winner: bid
          });
          expect(url).to.contain(';hbbidder=1;');
          expect(url).to.contain(';hbbid=0;');
          expect(url).to.contain(';hbstatus=3;');
          expect(url).to.contain(`;hbtime=${bid.timeToRespond}`);
        });

        it('should build url with valid and timed out bids', () => {
          let bid1 = BIDS.VALID;
          let bid2 = createReceivedBid({
            status: 3,
            bidder: 'appnexus',
            bidderCode: 'appnexus',
            cpm: 0.08
          });
          let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.AUCTION, {
            aolParams: BID_CONFIGS.AOL1.params,
            bids: [bid1, bid2],
            winner: bid1
          });
          expect(url).to.contain(';hbbidder=1;');
          expect(url).to.contain(';hbbid=0.1;');
          expect(url).to.contain(';hbstatus=0;');
          expect(url).to.contain(`;hbtime=${bid1.timeToRespond}`);
          expect(url).to.contain(';hbbidder=3;');
          expect(url).to.contain(';hbbid=0.08;');
          expect(url).to.contain(';hbstatus=3;');
          expect(url).to.contain(`;hbtime=${bid2.timeToRespond}`);
        });
      });
    });

    describe('for WIN event', () => {
      it('should build the default hbevent endpoint', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain('hb-us.adtech.advertising.com/hbevent/3.0/');
      });

      it('should build hbevent endpoint based on region config', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: {
            placement: 3675026,
            network: '9599.1',
            pageid: 12345,
            region: 'eu'
          },
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain('hb-eu.adtech.advertising.com/hbevent/3.0/');
      });

      it('should build hbevent endpoint based on the server option', () => {
        aolAnalytics.server = 'hb-as.adtech.advertising.com';
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        aolAnalytics.server = null;
        expect(url).to.contain('hb-as.adtech.advertising.com/hbevent/3.0/');
      });

      it('should build url with required params - placement & network', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: {
            placement: 1234567,
            network: '9599.1'
          },
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain('/hbevent/3.0/9599.1/1234567/');
      });

      it('should build url with pageId of 0 if param is missing', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: {
            placement: 1234567,
            network: '9599.1'
          },
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain('/hbevent/3.0/9599.1/1234567/0/');
      });

      it('should build url with pageId optional param', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: {
            placement: 1234567,
            network: '9599.1',
            pageId: 12345
          },
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain('/hbevent/3.0/9599.1/1234567/12345/');
      });

      it('should build url with WIN event id', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain('/2/hbeventts=');
      });

      it('should build url with current timestamp in seconds', () => {
        let now = Date.now() / 1000 - 1;
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.match(/hbeventts=\d+;/);
        let timestamp = url.match(/hbeventts=(\d+);/)[1];
        expect(timestamp).to.be.within(now, now + 5);
      });

      it('should build url with ad unit code set as pubadid parameter', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          code: DEFAULT_AD_UNIT,
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain(`;pubadid=${DEFAULT_AD_UNIT};`);
      });

      it('should build url with hbauctionid parameter from auction', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain(';hbauctionid=123456789;');
      });

      it('should build url with hbauctioneventts parameter from auction', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain(';hbauctioneventts=4567890;');
      });

      it('should build url with hbwinner parameter', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain(';hbwinner=1;'); // AOL
      });

      it('should build url with pubcpm parameter', () => {
        let bid = BIDS.VALID;
        let url = aolAnalytics.buildEventUrl(ANALYTICS_EVENTS.WIN, {
          aolParams: BID_CONFIGS.AOL1.params,
          bids: [bid],
          winner: bid,
          auctionParams: {
            hbauctioneventts: 4567890,
            hbauctionid: '123456789'
          }
        });
        expect(url).to.contain(`;pubcpm=${bid.cpm}`);
      });
    });
  });
});
