import analyticsAdapter from 'modules/guAnalyticsAdapter';
import {expect} from 'chai';
import adaptermanager from 'src/adaptermanager';
import * as ajax from 'src/ajax';
import CONSTANTS from 'src/constants.json';

const events = require('../../../src/events');

describe('Gu analytics adapter', () => {
  let sandbox;
  let ajaxStub;
  let timer;

  const BIDWONEXAMPLE = {
    ad: '<span>some html</span>',
    adId: '24a5288f9d6d6b',
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    adUrl: undefined,
    adserverTargeting: {hb_bidder: 'improvedigital', hb_adid: '24a5288f9d6d6b', hb_pb: '1.40', hb_size: '600x290', hb_deal: 268515},
    auctionId: 'bc1becdf-bbe5-4280-9427-8cc66d196e15',
    bidder: 'improvedigital',
    bidderCode: 'improvedigital',
    cpm: 1.4520580823232898,
    creativeId: '422031',
    currency: 'USD',
    dealId: 268515,
    height: 290,
    mediaType: 'banner',
    netRevenue: false,
    pbAg: '1.45',
    pbCg: '',
    pbDg: '1.45',
    pbHg: '1.45',
    pbLg: '1.00',
    pbMg: '1.40',
    requestId: '24a5288f9d6d6b',
    requestTimestamp: 1529069097708,
    responseTimestamp: 1529069097937,
    size: '600x290',
    source: 'client',
    status: 'rendered',
    statusMessage: 'Bid available',
    timeToRespond: 229,
    ttl: 300,
    width: 600
  };

  const BIDONE = {
    bidder: 'b1',
    params: {},
    adUnitCode: 'slot-1',
    transactionId: 'de90df62-7fd0-4fbc-8787-92d133a7dc06',
    sizes: [[300, 250]],
    bidId: '208750227436c1',
    bidderRequestId: '1a6fc81528d0f7',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f'
  };

  const REQUEST1 = {
    bidderCode: 'b1',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    bidderRequestId: '1a6fc81528d0f7',
    bids: [ BIDONE ],
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
    start: 1509369418391
  };

  const RESPONSE = {
    requestId: '208750227436c1',
    bidderCode: 'b1',
    width: 300,
    height: 250,
    statusMessage: 'Bid available',
    adId: '208750227436c1',
    creativeId: '123',
    mediaType: 'banner',
    cpm: 0.015,
    pbCg: '0.01',
    currency: 'USD',
    netRevenue: true,
    ad: '<!-- tag goes here -->',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    responseTimestamp: 1509369418832,
    requestTimestamp: 1509369418389,
    bidder: 'adapter',
    adUnitCode: 'slot-1',
    timeToRespond: 443,
    size: '300x250',
    dealId: 'd12345'
  };

  before(() => {
    sandbox = sinon.sandbox.create();
    ajaxStub = sandbox.stub(ajax, 'ajax');
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
    ajaxStub.reset();
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
        ajaxUrl: '//localhost:9000',
        pv: 'pv1234567'
      }
    });

    expect(analyticsAdapter.context).to.have.property('ajaxUrl', '//localhost:9000');
    expect(analyticsAdapter.context).to.have.property('pv', 'pv1234567');
  });

  it('should handle auction init event', () => {
    timer.tick(7);
    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {
      auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
      config: {},
      timeout: 3000
    });
    const ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(1);
    expect(ev[0]).to.be.eql({ev: 'init', aid: '5018eb39-f900-4370-b71e-3bb5b48d324f', st: 7});
  });

  it('should handle bid request events', () => {
    events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST1);
    events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST2);
    const ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(3);
    expect(ev[1]).to.be.eql({ev: 'request', n: 'b1', sid: 'slot-1', bid: '208750227436c1', st: 1509369418389});
    expect(ev[2]).to.be.eql({ev: 'request', n: 'b2', sid: 'slot-1', bid: '208750227436c2', st: 1509369418391});
  });

  it('should handle bid response event', () => {
    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, RESPONSE);
    const ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(4);
    expect(ev[3]).to.be.eql({
      ev: 'response',
      n: 'b1',
      sid: 'slot-1',
      bid: '208750227436c1',
      cpm: 0.015,
      pb: '0.01',
      cry: 'USD',
      net: true,
      did: '208750227436c1',
      cid: '123',
      sz: '300x250',
      lid: 'd12345',
      ttr: 443
    });
  });

  it('should handle auction end event', () => {
    timer.tick(447);
    events.emit(CONSTANTS.EVENTS.AUCTION_END, RESPONSE);
    let ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(0);
    expect(ajaxStub.called).to.be.equal(true);
    ev = JSON.parse(ajaxStub.firstCall.args[2]).hb_ev;
    expect(ev[4]).to.be.eql({ev: 'end', aid: '5018eb39-f900-4370-b71e-3bb5b48d324f', ttr: 447});
  });

  it('should handle bid won event', () => {
    events.emit(CONSTANTS.EVENTS.BID_WON, BIDWONEXAMPLE);
    let ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(0); // The queue has been flushed.
    ev = JSON.parse(ajaxStub.firstCall.args[2]).hb_ev;
    expect(ev[0]).to.be.eql({ev: 'bidwon', aid: 'bc1becdf-bbe5-4280-9427-8cc66d196e15', bid: '24a5288f9d6d6b'});
  });

  it('should not send orphan auction events', () => {
    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, RESPONSE);
    timer.tick(4500);
    const ev = analyticsAdapter.context.queue.peekAll();
    expect(ev).to.have.length(1);
  });

  it('should have a version number', () => {
    events.emit(CONSTANTS.EVENTS.BID_WON, BIDWONEXAMPLE);
    const payload = JSON.parse(ajaxStub.firstCall.args[2]);
    expect(payload.v).to.be.eql(1);
  });
});
