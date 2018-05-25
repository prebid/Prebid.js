import analyticsAdapter, {ExpiringQueue} from 'modules/rivrAnalyticsAdapter';
import {expect} from 'chai';
import adaptermanager from 'src/adaptermanager';
import * as ajax from 'src/ajax';
import CONSTANTS from 'src/constants.json';

const events = require('../../../src/events');

describe('', () => {
  let sandbox;

  before(() => {
    sandbox = sinon.sandbox.create();
  });

  after(() => {
    sandbox.restore();
    analyticsAdapter.disableAnalytics();
  });

  describe('ExpiringQueue', () => {
    let timer;
    before(() => {
      timer = sandbox.useFakeTimers(0);
    });
    after(() => {
      timer.restore();
    });

    it('should notify after timeout period', (done) => {
      let queue = new ExpiringQueue(() => {
        let elements = queue.popAll();
        expect(elements).to.be.eql([1, 2, 3, 4]);
        elements = queue.popAll();
        expect(elements).to.have.lengthOf(0);
        expect(Date.now()).to.be.equal(200);
        done();
      }, () => {}, 100);

      queue.push(1);
      setTimeout(() => {
        queue.push([2, 3]);
        timer.tick(50);
      }, 50);
      setTimeout(() => {
        queue.push([4]);
        timer.tick(100);
      }, 100);
      timer.tick(50);
    });
  });

  const REQUEST = {
    bidderCode: 'adapter',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    bidderRequestId: '1a6fc81528d0f6',
    bids: [{
      bidder: 'adapter',
      params: {},
      adUnitCode: 'container-1',
      transactionId: 'de90df62-7fd0-4fbc-8787-92d133a7dc06',
      sizes: [[300, 250]],
      bidId: '208750227436c1',
      bidderRequestId: '1a6fc81528d0f6',
      auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f'
    }],
    auctionStart: 1509369418387,
    timeout: 3000,
    start: 1509369418389
  };

  const RESPONSE = {
    bidderCode: 'adapter',
    width: 300,
    height: 250,
    statusMessage: 'Bid available',
    getStatusCode: () => 1,
    adId: '208750227436c1',
    mediaType: 'banner',
    cpm: 0.015,
    creativeId: 999,
    ad: '<!-- tag goes here -->',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    responseTimestamp: 1509369418832,
    requestTimestamp: 1509369418389,
    bidder: 'adapter',
    adUnitCode: 'container-1',
    timeToRespond: 443,
    currency: 'EU',
    size: '300x250'
  };

  describe('Analytics adapter', () => {
    let ajaxStub;
    let timer;

    before(() => {
      ajaxStub = sandbox.stub(ajax, 'ajax');
      timer = sandbox.useFakeTimers(0);
    });

    beforeEach(() => {
      sandbox.stub(events, 'getEvents').callsFake(() => {
        return []
      });
    });

    afterEach(() => {
      events.getEvents.restore();
    });

    it('should be configurable', () => {
      adaptermanager.registerAnalyticsAdapter({
        code: 'rivr',
        adapter: analyticsAdapter
      });

      adaptermanager.enableAnalytics({
        provider: 'rivr',
        options: {
          pubId: 777,
        }
      });

      expect(analyticsAdapter.context).to.have.property('host', 'integrations.rivr.simplaex.net');
      expect(analyticsAdapter.context).to.have.property('pubId', 777);
    });

    it('should handle auction init event', () => {
      events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: 1, config: {}, timeout: 3000});
      const auctionId = analyticsAdapter.context.auctionObject.id;
      const auctionStart = analyticsAdapter.context.auctionTimeStart;
      expect(auctionId).to.be.eql(1);
    });

    it('should handle bid request event', () => {
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST);
      const sitePubcid = analyticsAdapter.context.auctionObject.site.publisher.id;
      const appPubcid = analyticsAdapter.context.auctionObject.app.publisher.id;
      expect(sitePubcid).to.be.eql(777);
      expect(sitePubcid).to.be.eql(appPubcid);
    });

    it('should handle bid response event', () => {
      events.emit(CONSTANTS.EVENTS.BID_RESPONSE, RESPONSE);
      const ev = analyticsAdapter.context.auctionObject.bidResponses;
      expect(ev).to.have.length(1);
      expect(ev[0]).to.be.eql({
        timestamp: 1509369418832,
        status: 1,
        'total_duration': 443,
        bidderId: null,
        'bidder_name': 'adapter',
        cur: 'EU',
        seatid: [
          {
            seat: null,
            bid: [
              {
                status: 1,
                'clear_price': 0.015,
                attr: [],
                crid: 999,
                cid: null,
                id: null,
                adid: '208750227436c1',
                adomain: [],
                iurl: null
              }
            ]
          }
        ]
      });
    });

    it('should handle auction end event', () => {
      timer.tick(447);
      events.emit(CONSTANTS.EVENTS.AUCTION_END, RESPONSE);
      const endTime = analyticsAdapter.context.auctionTimeEnd;
      expect(endTime).to.be.eql(447);
    });

    it('should handle winning bid', () => {
      events.emit(CONSTANTS.EVENTS.BID_WON, RESPONSE);
      const ev = analyticsAdapter.context.auctionObject.imp;
      expect(ev.length).to.be.eql(1);
      expect(ev[0]).to.be.eql({
        tagid: 'container-1',
        displaymanager: null,
        displaymanagerver: null,
        secure: null,
        bidfloor: null,
        banner: {
          w: 300,
          h: 250,
          pos: null,
          expandable: [],
          api: []
        }
      });
    });

    it('sends request after timeout', () => {
      let impressions = analyticsAdapter.context.auctionObject.imp;
      let responses = analyticsAdapter.context.auctionObject.bidResponses;

      expect(impressions.length).to.be.eql(1);
      expect(responses.length).to.be.eql(1);
      expect(ajaxStub.calledOnce).to.be.equal(false);

      timer.tick(4500);

      let impressionss = analyticsAdapter.context.auctionObject.imp;
      let responsess = analyticsAdapter.context.auctionObject.bidResponses;

      expect(ajaxStub.calledOnce).to.be.equal(true);
      expect(impressionss.length).to.be.eql(0);
      expect(responsess.length).to.be.eql(0);
    });
  });
});
