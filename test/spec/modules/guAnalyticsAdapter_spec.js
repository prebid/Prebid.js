import analyticsAdapter from 'modules/guAnalyticsAdapter';
import {expect} from 'chai';
import adaptermanager from 'src/adaptermanager';
import * as ajax from 'src/ajax';
import CONSTANTS from 'src/constants.json';

const events = require('../../../src/events');

describe('Gu analytics adapter', () => {
  let sandbox;
  let timer;

  const REQUEST1 = {
    bidderCode: 'b1',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    bidderRequestId: '1a6fc81528d0f7',
    bids: [{
      bidder: 'b1',
      params: {},
      adUnitCode: 'slot-1',
      transactionId: 'de90df62-7fd0-4fbc-8787-92d133a7dc06',
      sizes: [[300, 250]],
      bidId: '208750227436c1',
      bidderRequestId: '1a6fc81528d0f7',
      auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f'
    }],
    auctionStart: 1509369418387,
    timeout: 3000,
    start: 1509369418389
  };

  const REQUEST2 = {
    bidderCode: 'b2',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    bidderRequestId: '1a6fc81528d0f6',
    bids: [{
      bidder: 'b2',
      params: {},
      adUnitCode: 'slot-1',
      transactionId: 'de90df62-7fd0-4fbc-8787-92d133a7dc06',
      sizes: [[300, 250]],
      bidId: '208750227436c2',
      bidderRequestId: '1a6fc81528d0f6',
      auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f'
    }],
    auctionStart: 1509369418387,
    timeout: 3000,
    start: 1509369418389
  };

  const RESPONSE = {
    bidderCode: 'b1',
    width: 300,
    height: 250,
    statusMessage: 'Bid available',
    adId: '208750227436c1',
    mediaType: 'banner',
    cpm: 0.015,
    ad: '<!-- tag goes here -->',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    responseTimestamp: 1509369418832,
    requestTimestamp: 1509369418389,
    bidder: 'adapter',
    adUnitCode: 'slot-1',
    timeToRespond: 443,
    size: '300x250'
  };

  before(() => {
    sandbox = sinon.sandbox.create();
    timer = sandbox.useFakeTimers(0);
  });

  after(() => {
    timer.restore();
    sandbox.restore();
    analyticsAdapter.disableAnalytics();
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
      code: 'gu',
      adapter: analyticsAdapter
    });

    adaptermanager.enableAnalytics({
      provider: 'gu',
      options: {
        host: 'localhost:9000',
        pv: 'pv1234567'
      }
    });

    expect(analyticsAdapter.context).to.have.property('host', 'localhost:9000');
    expect(analyticsAdapter.context).to.have.property('pv', 'pv1234567');
  });

  it('should handle auction init event', () => {
    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {
      auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
      config: {},
      timeout: 3000
    });
    const ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(1);
    expect(ev[0]).to.be.eql({ev: 'init', aid: '5018eb39-f900-4370-b71e-3bb5b48d324f'});
  });

  it('should handle bid request events', () => {
    events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST1);
    events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST2);
    const ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(3);
    expect(ev[1]).to.be.eql({ev: 'request', n: 'b1', sid: 'slot-1'});
    expect(ev[2]).to.be.eql({ev: 'request', n: 'b2', sid: 'slot-1'});
  });

  it('should handle bid response event', () => {
    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, RESPONSE);
    const ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(4);
    expect(ev[3]).to.be.eql({
      ev: 'response',
      n: 'b1',
      sid: 'slot-1',
      ttr: 443
    });
  });

  it('should handle bid timeout event', () => {
    timer.tick(444);
    events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, [{
      bidId: "208750227436c1",
      bidder: "b2",
      adUnitCode: "slot-1",
      auctionId: "5018eb39-f900-4370-b71e-3bb5b48d324f"
    }]);
    const ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(5);
    expect(ev[4]).to.be.eql({
      ev: 'timeout',
      n: 'b2',
      sid: 'slot-1',
      ttr: 444
    });
  });

  it('should handle auction end event', () => {
    timer.tick(3);
    const ajaxStub = sandbox.stub(ajax, 'ajax');
    events.emit(CONSTANTS.EVENTS.AUCTION_END, RESPONSE);
    let ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(0);
    expect(ajaxStub.called).to.be.equal(true);
    ev = JSON.parse(ajaxStub.secondCall.args[2]).hb_ev;
    expect(ev[5]).to.be.eql({ev: 'end', aid: '5018eb39-f900-4370-b71e-3bb5b48d324f', ttr: 447});
  });
});
