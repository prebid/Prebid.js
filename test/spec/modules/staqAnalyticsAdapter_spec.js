import analyticsAdapter, {ExpiringQueue, getUmtSource, storage} from 'modules/staqAnalyticsAdapter';
import {expect} from 'chai';
import adapterManager from 'src/adapterManager';
import CONSTANTS from 'src/constants.json';

const events = require('../../../src/events');

const DIRECT = {
  source: '(direct)',
  medium: '(direct)',
  campaign: '(direct)'
};
const REFERRER = {
  source: 'lander.com',
  medium: '(referral)',
  campaign: '(referral)',
  content: '/lander.html'
};
const GOOGLE_ORGANIC = {
  source: 'google',
  medium: '(organic)',
  campaign: '(organic)'
};
const CAMPAIGN = {
  source: 'adkernel',
  medium: 'email',
  campaign: 'new_campaign',
  c1: '1',
  c2: '2',
  c3: '3',
  c4: '4',
  c5: '5'

};
describe('', function () {
  let sandbox;

  before(function () {
    sandbox = sinon.sandbox.create();
  });

  after(function () {
    sandbox.restore();
    analyticsAdapter.disableAnalytics();
  });

  describe('UTM source parser', function () {
    let stubSetItem;
    let stubGetItem;

    before(function () {
      stubSetItem = sandbox.stub(storage, 'setItem');
      stubGetItem = sandbox.stub(storage, 'getItem');
    });

    afterEach(function () {
      sandbox.reset();
    });

    it('should parse first direct visit as (direct)', function () {
      stubGetItem.withArgs('adk_dpt_analytics').returns(undefined);
      stubSetItem.returns(undefined);
      let source = getUmtSource('http://example.com');
      expect(source).to.be.eql(DIRECT);
    });

    it('should parse visit from google as organic', function () {
      stubGetItem.withArgs('adk_dpt_analytics').returns(undefined);
      stubSetItem.returns(undefined);
      let source = getUmtSource('http://example.com', 'https://www.google.com/search?q=pikachu');
      expect(source).to.be.eql(GOOGLE_ORGANIC);
    });

    it('should parse referral visit', function () {
      stubGetItem.withArgs('adk_dpt_analytics').returns(undefined);
      stubSetItem.returns(undefined);
      let source = getUmtSource('http://example.com', 'http://lander.com/lander.html');
      expect(source).to.be.eql(REFERRER);
    });

    it('should parse referral visit from same domain as direct', function () {
      stubGetItem.withArgs('adk_dpt_analytics').returns(undefined);
      stubSetItem.returns(undefined);
      let source = getUmtSource('http://lander.com/news.html', 'http://lander.com/lander.html');
      expect(source).to.be.eql(DIRECT);
    });

    it('should parse campaign visit', function () {
      stubGetItem.withArgs('adk_dpt_analytics').returns(undefined);
      stubSetItem.returns(undefined);
      let source = getUmtSource('http://lander.com/index.html?utm_campaign=new_campaign&utm_source=adkernel&utm_medium=email&utm_c1=1&utm_c2=2&utm_c3=3&utm_c4=4&utm_c5=5');
      expect(source).to.be.eql(CAMPAIGN);
    });
  });

  describe('ExpiringQueue', function () {
    let timer;
    before(function () {
      timer = sandbox.useFakeTimers(0);
    });
    after(function () {
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
      }, 100);

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
    bidderCode: 'AppNexus',
    bidderName: 'AppNexus',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    bidderRequestId: '1a6fc81528d0f6',
    bids: [{
      bidder: 'AppNexus',
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
    bidderCode: 'AppNexus',
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
    bidder: 'AppNexus',
    adUnitCode: 'container-1',
    timeToRespond: 443,
    size: '300x250'
  };

  const bidTimeoutArgsV1 = [{
    bidId: '2baa51527bd015',
    bidderCode: 'AppNexus',
    adUnitCode: 'container-1',
    auctionId: '66529d4c-8998-47c2-ab3e-5b953490b98f'
  },
  {
    bidId: '6fe3b4c2c23092',
    bidderCode: 'AppNexus',
    adUnitCode: 'container-2',
    auctionId: '66529d4c-8998-47c2-ab3e-5b953490b98f'
  }];

  describe('Analytics adapter', function () {
    let ajaxStub;
    let timer;

    before(function () {
      ajaxStub = sandbox.stub(analyticsAdapter, 'ajaxCall');
      timer = sandbox.useFakeTimers(0);
    });

    beforeEach(function () {
      sandbox.stub(events, 'getEvents').callsFake(() => {
        return []
      });
    });

    afterEach(function () {
      events.getEvents.restore();
    });

    it('should be configurable', function () {
      adapterManager.registerAnalyticsAdapter({
        code: 'staq',
        adapter: analyticsAdapter
      });

      adapterManager.enableAnalytics({
        provider: 'staq',
        options: {
          connId: 777,
          queueTimeout: 1000,
          url: 'http://localhost/prebid'
        }
      });

      expect(analyticsAdapter.context).to.have.property('connectionId', 777);
    });

    it('should handle auction init event', function () {
      events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {config: {}, timeout: 3000});
      const ev = analyticsAdapter.context.queue.peekAll();
      expect(ev).to.have.length(1);
      expect(ev[0]).to.be.eql({event: 'auctionInit', auctionId: undefined});
    });

    it('should handle bid request event', function () {
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST);
      const ev = analyticsAdapter.context.queue.peekAll();
      expect(ev).to.have.length(2);
      expect(ev[1]).to.be.eql({
        adUnitCode: 'container-1',
        auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
        event: 'bidRequested',
        adapter: 'AppNexus',
        bidderName: 'AppNexus'
      });
    });

    it('should handle bid response event', function () {
      events.emit(CONSTANTS.EVENTS.BID_RESPONSE, RESPONSE);
      const ev = analyticsAdapter.context.queue.peekAll();
      expect(ev).to.have.length(3);
      expect(ev[2]).to.be.eql({
        adId: '208750227436c1',
        event: 'bidResponse',
        adapter: 'AppNexus',
        bidderName: 'AppNexus',
        auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
        adUnitCode: 'container-1',
        cpm: 0.015,
        timeToRespond: 0.443,
        height: 250,
        width: 300,
        bidWon: false,
      });
    });

    it('should handle timeouts properly', function() {
      events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, bidTimeoutArgsV1);

      const ev = analyticsAdapter.context.queue.peekAll();
      expect(ev).to.have.length(5); // remember, we added 2 timeout events
      expect(ev[3]).to.be.eql({
        adapter: 'AppNexus',
        auctionId: '66529d4c-8998-47c2-ab3e-5b953490b98f',
        bidderName: 'AppNexus',
        event: 'adapterTimedOut'
      })
    });

    it('should handle winning bid', function () {
      events.emit(CONSTANTS.EVENTS.BID_WON, RESPONSE);
      const ev = analyticsAdapter.context.queue.peekAll();
      expect(ev).to.have.length(6);
      expect(ev[5]).to.be.eql({
        auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
        adId: '208750227436c1',
        event: 'bidWon',
        adapter: 'AppNexus',
        bidderName: 'AppNexus',
        adUnitCode: 'container-1',
        cpm: 0.015,
        height: 250,
        width: 300,
        bidWon: true,
      });
    });

    it('should handle auction end event', function () {
      timer.tick(447);
      events.emit(CONSTANTS.EVENTS.AUCTION_END, RESPONSE);
      let ev = analyticsAdapter.context.queue.peekAll();
      expect(ev).to.have.length(0);
      expect(ajaxStub.calledOnce).to.be.equal(true);
      let firstCallArgs0 = ajaxStub.firstCall.args[0];
      ev = JSON.parse(firstCallArgs0);
      // console.log('AUCTION END EVENT SHAPE ' + JSON.stringify(ev));
      const ev6 = ev[6];
      expect(ev6.connId).to.be.eql(777);
      expect(ev6.auctionId).to.be.eql('5018eb39-f900-4370-b71e-3bb5b48d324f');
      expect(ev6.event).to.be.eql('auctionEnd');
    });
  });
});
