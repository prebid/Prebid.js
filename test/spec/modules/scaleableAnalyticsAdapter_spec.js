import analyticsAdapter, {
  log,
  locals,
  DEFAULT_ENDPOINT,
  DEFAULT_AUCTION_END_DELAY
} from 'modules/scaleableAnalyticsAdapter.js';

import * as events from 'src/events.js';
import * as ajaxLib from 'src/ajax.js';
import { EVENTS } from 'src/constants.js';
import {
  gdprDataHandler,
  gppDataHandler,
  uspDataHandler,
  coppaDataHandler
} from 'src/adapterManager.js';
import { expect } from 'chai';

const SITE_ID = 'test-site-123';
const ENDPOINT = 'https://ingest.example.test/auction';
// Base class debounces queue flush by 100ms; tick past both that and our AUCTION_END delay.
const TICK_FOR_FLUSH = DEFAULT_AUCTION_END_DELAY + 250;

function makeAuctionInitArgs(auctionId = 'auction-1') {
  return {
    auctionId,
    timestamp: 1700000000000,
    adUnits: [
      {
        code: '/123/header-bid-tag-0',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        sizes: [[300, 250]],
        ortb2Imp: { ext: { gpid: '/123/header-bid-tag-0#div-0' } }
      }
    ]
  };
}

function makeBidRequestedArgs(auctionId = 'auction-1') {
  return {
    auctionId,
    bids: [
      {
        bidder: 'bidderA',
        bidderCode: 'bidderA',
        bidId: 'bid-a-1',
        adUnitCode: '/123/header-bid-tag-0',
        src: 'client',
        userIdAsEids: [
          { source: 'liveramp.com', uids: [{ id: 'LR_ID_VALUE' }] },
          { source: 'id5-sync.com', uids: [{ id: 'ID5_VALUE' }] }
        ]
      },
      {
        bidder: 'bidderB',
        bidderCode: 'bidderB',
        bidId: 'bid-b-1',
        adUnitCode: '/123/header-bid-tag-0',
        src: 'client'
      }
    ]
  };
}

function makeBidResponse(bidId = 'bid-a-1', auctionId = 'auction-1') {
  return {
    auctionId,
    requestId: bidId,
    bidder: 'bidderA',
    cpm: 1.23,
    currency: 'USD',
    originalCpm: 1.23,
    originalCurrency: 'USD',
    timeToRespond: 145,
    width: 300,
    height: 250,
    size: '300x250',
    mediaType: 'banner',
    adId: 'ad-a-1',
    creativeId: 'creative-a-1',
    floorData: { floorValue: 0.5, floorCurrency: 'USD', location: 'setConfig' },
    meta: { advertiserDomains: ['example.com'], networkId: 42 }
  };
}

function lastBeaconPayload() {
  const call = navigator.sendBeacon.lastCall;
  return call ? JSON.parse(call.args[1]) : null;
}

describe('scaleableAnalyticsAdapter:', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox({ useFakeTimers: true });
    sandbox.stub(events, 'getEvents').returns([]);
    sandbox.spy(log, 'info');
    sandbox.spy(log, 'warn');
    sandbox.spy(log, 'error');
    sandbox.stub(navigator, 'sendBeacon').returns(true);
  });

  afterEach(function () {
    analyticsAdapter.disableAnalytics();
    sandbox.restore();
  });

  describe('enableAnalytics:', function () {
    it('logs an error and does not enable when siteId is missing', function () {
      analyticsAdapter.enableAnalytics({ options: { endpoint: ENDPOINT } });
      expect(log.error.calledWithMatch(/No siteId provided/)).to.equal(true);
      expect(locals.siteId).to.equal(null);
    });

    it('falls back to DEFAULT_ENDPOINT when endpoint is invalid', function () {
      analyticsAdapter.enableAnalytics({
        options: { siteId: SITE_ID, endpoint: 'not-a-url' }
      });
      expect(locals.endpoint).to.equal(DEFAULT_ENDPOINT);
    });

    it('accepts a valid http(s) endpoint override', function () {
      analyticsAdapter.enableAnalytics({ options: { siteId: SITE_ID, endpoint: ENDPOINT } });
      expect(locals.endpoint).to.equal(ENDPOINT);
    });

    it('applies a custom auctionEndDelay', function () {
      analyticsAdapter.enableAnalytics({
        options: { siteId: SITE_ID, endpoint: ENDPOINT, auctionEndDelay: 500 }
      });
      expect(locals.auctionEndDelay).to.equal(500);
    });
  });

  describe('event handling:', function () {
    beforeEach(function () {
      analyticsAdapter.enableAnalytics({
        options: { siteId: SITE_ID, endpoint: ENDPOINT }
      });
    });

    it('emits a single sendBeacon per auction at AUCTION_END + delay', function () {
      const auctionId = 'auction-1';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_RESPONSE, makeBidResponse('bid-a-1', auctionId));
      events.emit(EVENTS.BID_WON, { auctionId, requestId: 'bid-a-1' });
      events.emit(EVENTS.AUCTION_END, { auctionId });

      sandbox.clock.tick(TICK_FOR_FLUSH);

      expect(navigator.sendBeacon.callCount).to.equal(1);
      const [url, body] = navigator.sendBeacon.firstCall.args;
      expect(url).to.equal(ENDPOINT);
      const payload = JSON.parse(body);
      expect(payload.auctionId).to.equal(auctionId);
      expect(payload.siteId).to.equal(SITE_ID);
      expect(payload.adUnits).to.have.lengthOf(1);
      expect(payload.adUnits[0].bids.find(b => b.requestId === 'bid-a-1').status).to.equal('won');
    });

    it('marks pending bidders as noBid when BIDDER_DONE fires without a response', function () {
      const auctionId = 'auction-2';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BIDDER_DONE, { auctionId, bids: [{ bidId: 'bid-b-1' }] });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const payload = lastBeaconPayload();
      const bidB = payload.adUnits[0].bids.find(b => b.requestId === 'bid-b-1');
      expect(bidB.status).to.equal('noBid');
    });

    it('captures BID_TIMEOUT as status timeout', function () {
      const auctionId = 'auction-3';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_TIMEOUT, [{ auctionId, bidId: 'bid-a-1' }]);
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const bidA = lastBeaconPayload().adUnits[0].bids.find(b => b.requestId === 'bid-a-1');
      expect(bidA.status).to.equal('timeout');
    });

    it('captures AD_RENDER_FAILED into the matching bid record', function () {
      const auctionId = 'auction-4';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_RESPONSE, makeBidResponse('bid-a-1', auctionId));
      events.emit(EVENTS.BID_WON, { auctionId, requestId: 'bid-a-1' });
      events.emit(EVENTS.AD_RENDER_FAILED, {
        bid: { auctionId, requestId: 'bid-a-1' },
        reason: 'creativeError',
        message: 'no creative payload'
      });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const bidA = lastBeaconPayload().adUnits[0].bids.find(b => b.requestId === 'bid-a-1');
      expect(bidA.render).to.deep.equal({
        status: 'failed',
        reason: 'creativeError',
        message: 'no creative payload'
      });
    });

    it('strips EID values but keeps source names', function () {
      const auctionId = 'auction-5';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const payload = lastBeaconPayload();
      const bidA = payload.adUnits[0].bids.find(b => b.requestId === 'bid-a-1');
      expect(bidA.eidsPresent).to.deep.equal(['liveramp.com', 'id5-sync.com']);
      const raw = JSON.stringify(payload);
      expect(raw).to.not.include('LR_ID_VALUE');
      expect(raw).to.not.include('ID5_VALUE');
    });

    it('flushes in-flight auctions via sendBeacon on pagehide', function () {
      const auctionId = 'auction-6';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_RESPONSE, makeBidResponse('bid-a-1', auctionId));
      events.emit(EVENTS.AUCTION_END, { auctionId });

      // Tick past the base-class debounce (100ms) so AUCTION_END is processed and the
      // auction is in the in-flight cache, but NOT past the auctionEndDelay timer so it
      // hasn't been flushed yet.
      sandbox.clock.tick(200);
      window.dispatchEvent(new Event('pagehide'));

      expect(navigator.sendBeacon.callCount).to.equal(1);
      const [url, body] = navigator.sendBeacon.firstCall.args;
      expect(url).to.equal(ENDPOINT);
      expect(JSON.parse(body).auctionId).to.equal(auctionId);
    });

    it('captures NO_BID as status noBid', function () {
      const auctionId = 'auction-nobid';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.NO_BID, { auctionId, bidId: 'bid-a-1' });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const bidA = lastBeaconPayload().adUnits[0].bids.find(b => b.requestId === 'bid-a-1');
      expect(bidA.status).to.equal('noBid');
    });

    it('captures BID_REJECTED as status rejected and keeps the response fields', function () {
      const auctionId = 'auction-rejected';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_REJECTED, { ...makeBidResponse('bid-a-1', auctionId), rejectionReason: 'Bid price below floor' });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const bidA = lastBeaconPayload().adUnits[0].bids.find(b => b.requestId === 'bid-a-1');
      expect(bidA.status).to.equal('rejected');
      expect(bidA.cpm).to.equal(1.23);
      expect(bidA.rejectionReason).to.equal('Bid price below floor');
    });

    it('marks the winning bid viewable on BID_VIEWABLE (non-GAM)', function () {
      const auctionId = 'auction-viewable';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_RESPONSE, makeBidResponse('bid-a-1', auctionId));
      events.emit(EVENTS.BID_WON, { auctionId, requestId: 'bid-a-1' });
      events.emit(EVENTS.BID_VIEWABLE, { auctionId, requestId: 'bid-a-1' });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const bidA = lastBeaconPayload().adUnits[0].bids.find(b => b.requestId === 'bid-a-1');
      expect(bidA.render.viewable).to.equal(true);
    });

    it('records BIDDER_ERROR at the auction level with a formatted message', function () {
      const auctionId = 'auction-err';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BIDDER_ERROR, {
        bidderRequest: { auctionId, bidderCode: 'bidderA' },
        error: { status: 500, statusText: 'Server Error' }
      });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const payload = lastBeaconPayload();
      expect(payload.bidderErrors).to.deep.equal([{ bidder: 'bidderA', error: 'Server Error (HTTP 500)' }]);
    });

    it('captures AD_RENDER_SUCCEEDED into the matching bid record', function () {
      const auctionId = 'auction-render-ok';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_RESPONSE, makeBidResponse('bid-a-1', auctionId));
      events.emit(EVENTS.BID_WON, { auctionId, requestId: 'bid-a-1' });
      events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid: { auctionId, requestId: 'bid-a-1' } });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const bidA = lastBeaconPayload().adUnits[0].bids.find(b => b.requestId === 'bid-a-1');
      expect(bidA.render.status).to.equal('success');
    });

    it('skips AUCTION_INIT with missing fields and logs a warning', function () {
      events.emit(EVENTS.AUCTION_INIT, { adUnits: [] }); // no auctionId
      expect(log.warn.calledWithMatch(/AUCTION_INIT missing fields/)).to.equal(true);
      expect(Object.keys(locals.auctions)).to.have.lengthOf(0);
    });

    it('captures ortb2 siteContext into metadata', function () {
      const auctionId = 'auction-ctx';
      const init = makeAuctionInitArgs(auctionId);
      init.bidderRequests = [{ ortb2: { site: { ext: { data: { sectionId: 'sports' } } } } }];
      events.emit(EVENTS.AUCTION_INIT, init);
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      expect(lastBeaconPayload().metadata.siteContext).to.deep.equal({ sectionId: 'sports' });
    });

    it('captures video vastUrl and prunes native to URL-shaped fields', function () {
      const auctionId = 'auction-media';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_RESPONSE, {
        ...makeBidResponse('bid-a-1', auctionId), mediaType: 'video', vastUrl: 'https://v.example/vast.xml'
      });
      events.emit(EVENTS.BID_RESPONSE, {
        ...makeBidResponse('bid-b-1', auctionId),
        bidder: 'bidderB',
        mediaType: 'native',
        native: { title: 'Hi', clickUrl: 'https://c.example', image: { url: 'https://i.example/x.png' }, privacyLink: 'drop-me' }
      });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const bids = lastBeaconPayload().adUnits[0].bids;
      const bidA = bids.find(b => b.requestId === 'bid-a-1');
      const bidB = bids.find(b => b.requestId === 'bid-b-1');
      expect(bidA.vastUrl).to.equal('https://v.example/vast.xml');
      expect(bidB.native).to.deep.equal({ title: 'Hi', clickUrl: 'https://c.example', imageUrl: 'https://i.example/x.png' });
    });

    it('extracts network latency from bid.metrics', function () {
      const auctionId = 'auction-metrics';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_RESPONSE, {
        ...makeBidResponse('bid-a-1', auctionId),
        metrics: { getMetrics: () => ({ 'adapter.client.net': 120 }) }
      });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const bidA = lastBeaconPayload().adUnits[0].bids.find(b => b.requestId === 'bid-a-1');
      expect(bidA.networkLatencyMs).to.equal(120);
    });

    it('keeps only hb_* adserver targeting on the winning bid', function () {
      const auctionId = 'auction-targeting';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_RESPONSE, makeBidResponse('bid-a-1', auctionId));
      events.emit(EVENTS.BID_WON, {
        auctionId,
        requestId: 'bid-a-1',
        adserverTargeting: { hb_bidder: 'bidderA', hb_pb: '1.20', custom_key: 'should-drop' }
      });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const bidA = lastBeaconPayload().adUnits[0].bids.find(b => b.requestId === 'bid-a-1');
      expect(bidA.adserverTargeting).to.deep.equal({ hb_bidder: 'bidderA', hb_pb: '1.20' });
    });

    it('formats a range of BIDDER_ERROR shapes', function () {
      const auctionId = 'auction-errs';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BIDDER_ERROR, { bidderRequest: { auctionId, bidderCode: 'a' }, error: { timedOut: true } });
      events.emit(EVENTS.BIDDER_ERROR, { bidderRequest: { auctionId, bidderCode: 'b' }, error: { status: 0 } });
      events.emit(EVENTS.BIDDER_ERROR, { bidderRequest: { auctionId, bidderCode: 'c' }, error: 'boom' });
      events.emit(EVENTS.BIDDER_ERROR, { bidderRequest: { auctionId, bidderCode: 'd' }, error: {} });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      expect(lastBeaconPayload().bidderErrors).to.deep.equal([
        { bidder: 'a', error: 'timeout' },
        { bidder: 'b', error: 'network error' },
        { bidder: 'c', error: 'boom' },
        { bidder: 'd', error: 'unknown' }
      ]);
    });

    it('falls back to ajax when sendBeacon refuses the payload', function () {
      navigator.sendBeacon.returns(false);
      const ajaxStub = sandbox.stub(ajaxLib, 'ajax');
      const auctionId = 'auction-fallback';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      expect(ajaxStub.calledOnce).to.equal(true);
      const [url, , body, opts] = ajaxStub.firstCall.args;
      expect(url).to.equal(ENDPOINT);
      expect(JSON.parse(body).auctionId).to.equal(auctionId);
      expect(opts).to.include({ method: 'POST', contentType: 'application/json', withCredentials: false });
    });

    it('warns and drops the auction when sendBeacon refuses on unload', function () {
      navigator.sendBeacon.returns(false);
      const auctionId = 'auction-unload-fail';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(200);
      window.dispatchEvent(new Event('pagehide'));

      expect(log.warn.calledWithMatch(/sendBeacon refused/)).to.equal(true);
    });
  });

  describe('consent collection:', function () {
    beforeEach(function () {
      sandbox.stub(gdprDataHandler, 'getConsentData').returns({ gdprApplies: true, consentString: 'TCF_STRING' });
      sandbox.stub(gppDataHandler, 'getConsentData').returns({ gppString: 'GPP_STRING', applicableSections: [7] });
      sandbox.stub(uspDataHandler, 'getConsentData').returns('1YNN');
      sandbox.stub(coppaDataHandler, 'getCoppa').returns(true);
      analyticsAdapter.enableAnalytics({ options: { siteId: SITE_ID, endpoint: ENDPOINT } });
    });

    it('forwards GDPR, GPP, USP and COPPA signals in metadata.consent', function () {
      const auctionId = 'auction-consent';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const consent = lastBeaconPayload().metadata.consent;
      expect(consent.gdprApplies).to.equal(true);
      expect(consent.tcfConsentString).to.equal('TCF_STRING');
      expect(consent.gppString).to.equal('GPP_STRING');
      expect(consent.gppSid).to.deep.equal([7]);
      expect(consent.usPrivacy).to.equal('1YNN');
      expect(consent.coppa).to.equal(true);
    });
  });

  describe('GAM slot enrichment:', function () {
    let gamHandlers;
    let prevGoogletag;

    beforeEach(function () {
      gamHandlers = {};
      prevGoogletag = window.googletag;
      const pubads = {
        addEventListener: (type, cb) => { gamHandlers[type] = cb; },
        removeEventListener: (type) => { delete gamHandlers[type]; }
      };
      // cmd.push executes immediately so subscribe/unsubscribe run synchronously in tests.
      window.googletag = { cmd: { push: (fn) => fn() }, pubads: () => pubads };
      analyticsAdapter.enableAnalytics({ options: { siteId: SITE_ID, endpoint: ENDPOINT } });
    });

    afterEach(function () {
      window.googletag = prevGoogletag;
    });

    function fireSlotRenderEnded(extra = {}) {
      gamHandlers.slotRenderEnded(Object.assign({
        slot: { getAdUnitPath: () => '/123/header-bid-tag-0', getSlotElementId: () => 'div-0' },
        lineItemId: 1234567,
        advertiserId: 9876543,
        creativeId: 1112223,
        isEmpty: false,
        size: [300, 250]
      }, extra));
    }

    it('preserves GAM render IDs when AD_RENDER_SUCCEEDED fires after slotRenderEnded', function () {
      const auctionId = 'auction-gam-1';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      events.emit(EVENTS.BID_RESPONSE, makeBidResponse('bid-a-1', auctionId));
      events.emit(EVENTS.BID_WON, { auctionId, requestId: 'bid-a-1' });
      // GAM renders the Prebid creative first, then Prebid's render-success callback fires.
      fireSlotRenderEnded();
      gamHandlers.impressionViewable({
        slot: { getAdUnitPath: () => '/123/header-bid-tag-0', getSlotElementId: () => 'div-0' }
      });
      events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid: { auctionId, requestId: 'bid-a-1' } });
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const bidA = lastBeaconPayload().adUnits[0].bids.find(b => b.requestId === 'bid-a-1');
      expect(bidA.render.status).to.equal('success');
      expect(bidA.render.lineItemId).to.equal(1234567);
      expect(bidA.render.advertiserId).to.equal(9876543);
      expect(bidA.render.creativeId).to.equal(1112223);
      expect(bidA.render.renderedSize).to.equal('300x250');
      expect(bidA.render.viewable).to.equal(true);
    });

    it('routes GAM render to adUnit.gamRender when no Prebid bid won the slot', function () {
      const auctionId = 'auction-gam-2';
      events.emit(EVENTS.AUCTION_INIT, makeAuctionInitArgs(auctionId));
      events.emit(EVENTS.BID_REQUESTED, makeBidRequestedArgs(auctionId));
      fireSlotRenderEnded();
      events.emit(EVENTS.AUCTION_END, { auctionId });
      sandbox.clock.tick(TICK_FOR_FLUSH);

      const adUnit = lastBeaconPayload().adUnits[0];
      expect(adUnit.gamRender.lineItemId).to.equal(1234567);
      expect(adUnit.gamRender.renderedSize).to.equal('300x250');
      expect(adUnit.bids.every(b => !b.render)).to.equal(true);
    });
  });
});
