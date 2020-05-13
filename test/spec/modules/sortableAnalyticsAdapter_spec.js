import {expect} from 'chai';
import sortableAnalyticsAdapter, {TIMEOUT_FOR_REGISTRY, DEFAULT_PBID_TIMEOUT} from 'modules/sortableAnalyticsAdapter.js';
import events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import * as prebidGlobal from 'src/prebidGlobal.js';
import {server} from 'test/mocks/xhr.js';

describe('Sortable Analytics Adapter', function() {
  let sandbox;
  let clock;

  const initialConfig = {
    provider: 'sortable',
    options: {
      siteId: 'testkey'
    }
  };

  const TEST_DATA = {
    AUCTION_INIT: {
      auctionId: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
      timeout: 3000
    },
    BID_REQUESTED: {
      refererInfo: {
        referer: 'test.com',
        reachedTop: true,
        numIframes: 1
      },
      bidderCode: 'sortable',
      auctionId: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
      bids: [{
        bidder: 'sortable',
        params: {
          tagId: 'medrec_1'
        },
        adUnitCode: '300x250',
        transactionId: 'aa02b498-8a99-418e-bc59-6b6fd45f32de',
        sizes: [
          [300, 250]
        ],
        bidId: '26721042674416',
        bidderRequestId: '10141593b1d84a',
        auctionId: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
        bidRequestsCount: 1
      }, {
        bidder: 'sortable',
        params: {
          tagId: 'lead_1'
        },
        adUnitCode: '728x90',
        transactionId: 'b7e9e957-af4f-4c47-8ca7-41f01cb4f105',
        sizes: [
          [728, 90]
        ],
        bidId: '50fa575b41e596',
        bidderRequestId: '37a8760be6db23',
        auctionId: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
        bidRequestsCount: 1
      }],
      start: 1553529405788
    },
    BID_ADJUSTMENT_1: {
      bidderCode: 'sortable',
      adId: '88221d316425f7',
      mediaType: 'banner',
      cpm: 0.70,
      dealId: null,
      currency: 'USD',
      netRevenue: true,
      ttl: 60,
      auctionId: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
      responseTimestamp: 1553534161763,
      bidder: 'sortable',
      adUnitCode: '300x250',
      timeToRespond: 331,
      width: '300',
      height: '250'
    },
    AUCTION_END: {
      auctionId: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e'
    },
    BID_ADJUSTMENT_2: {
      bidderCode: 'sortable',
      adId: '88221d316425f8',
      mediaType: 'banner',
      cpm: 0.50,
      dealId: null,
      currency: 'USD',
      netRevenue: true,
      ttl: 60,
      auctionId: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
      responseTimestamp: 1553534161770,
      bidder: 'sortable',
      adUnitCode: '728x90',
      timeToRespond: 338,
      width: '728',
      height: '90'
    },
    BID_WON_1: {
      bidderCode: 'sortable',
      adId: '88221d316425f7',
      mediaType: 'banner',
      cpm: 0.70,
      dealId: null,
      currency: 'USD',
      netRevenue: true,
      ttl: 60,
      auctionId: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
      responseTimestamp: 1553534161763,
      bidder: 'sortable',
      adUnitCode: '300x250',
      timeToRespond: 331
    },
    BID_WON_2: {
      bidderCode: 'sortable',
      adId: '88221d316425f8',
      mediaType: 'banner',
      cpm: 0.50,
      dealId: null,
      currency: 'USD',
      netRevenue: true,
      ttl: 60,
      auctionId: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
      responseTimestamp: 1553534161770,
      bidder: 'sortable',
      adUnitCode: '728x90',
      timeToRespond: 338
    },
    BID_TIMEOUT: [{
      auctionId: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
      adUnitCode: '300x250',
      bidder: 'sortable'
    }]
  };

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers();
    sandbox.stub(events, 'getEvents').returns([]);
    sandbox.stub(prebidGlobal, 'getGlobal').returns({
      version: '1.0',
      bidderSettings: {
        'sortable': {
          bidCpmAdjustment: function (number) {
            return number * 0.95;
          }
        }
      }
    });

    sortableAnalyticsAdapter.enableAnalytics(initialConfig);
  });

  afterEach(function() {
    sandbox.restore();
    clock.restore();
    sortableAnalyticsAdapter.disableAnalytics();
  });

  describe('initialize adapter', function() {
    const settings = sortableAnalyticsAdapter.getOptions();

    it('should init settings correctly and apply defaults', function() {
      expect(settings).to.include({
        'disableSessionTracking': false,
        'key': initialConfig.options.siteId,
        'protocol': 'https',
        'url': `https://pa.deployads.com/pae/${initialConfig.options.siteId}`,
        'timeoutForPbid': DEFAULT_PBID_TIMEOUT
      });
    });
    it('should assign a pageview ID', function() {
      expect(settings).to.have.own.property('pageviewId');
    });
  });

  describe('events tracking', function() {
    beforeEach(function() {
      server.requests = [];
    });
    it('should send the PBID event', function() {
      events.emit(CONSTANTS.EVENTS.AUCTION_INIT, TEST_DATA.AUCTION_INIT);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, TEST_DATA.BID_REQUESTED);
      events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, TEST_DATA.BID_ADJUSTMENT_1);
      events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, TEST_DATA.BID_ADJUSTMENT_2);
      events.emit(CONSTANTS.EVENTS.AUCTION_END, TEST_DATA.AUCTION_END);
      events.emit(CONSTANTS.EVENTS.BID_WON, TEST_DATA.BID_WON_1);
      events.emit(CONSTANTS.EVENTS.BID_WON, TEST_DATA.BID_WON_2);

      clock.tick(DEFAULT_PBID_TIMEOUT);

      expect(server.requests.length).to.equal(1);
      let result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.have.own.property('pbid');
      expect(result.pbid).to.deep.include({
        ai: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
        ac: ['300x250', '728x90'],
        adi: ['88221d316425f7', '88221d316425f8'],
        bs: 'sortable',
        bid: ['26721042674416', '50fa575b41e596'],
        bif: 0.95,
        brc: 1,
        brid: ['10141593b1d84a', '37a8760be6db23'],
        rs: ['300x250', '728x90'],
        btcp: [0.70, 0.50],
        btcc: 'USD',
        btin: true,
        btsrc: 'sortable',
        c: [0.70, 0.50],
        cc: 'USD',
        did: null,
        inr: true,
        it: true,
        iw: true,
        ito: false,
        mt: 'banner',
        rtp: true,
        nif: 1,
        pbv: '1.0',
        siz: ['300x250', '728x90'],
        st: 1553529405788,
        tgid: ['medrec_1', 'lead_1'],
        to: 3000,
        trid: ['aa02b498-8a99-418e-bc59-6b6fd45f32de', 'b7e9e957-af4f-4c47-8ca7-41f01cb4f105'],
        ttl: 60,
        ttr: [331, 338],
        u: 'test.com',
        _count: 2
      });
    });

    it('should track a late bidWon event', function() {
      events.emit(CONSTANTS.EVENTS.AUCTION_INIT, TEST_DATA.AUCTION_INIT);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, TEST_DATA.BID_REQUESTED);
      events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, TEST_DATA.BID_ADJUSTMENT_1);
      events.emit(CONSTANTS.EVENTS.AUCTION_END, TEST_DATA.AUCTION_END);

      clock.tick(DEFAULT_PBID_TIMEOUT);

      events.emit(CONSTANTS.EVENTS.BID_WON, TEST_DATA.BID_WON_1);

      clock.tick(TIMEOUT_FOR_REGISTRY);

      expect(server.requests.length).to.equal(2);
      const pbid_req = JSON.parse(server.requests[0].requestBody);
      expect(pbid_req).to.have.own.property('pbid');
      const pbwon_req = JSON.parse(server.requests[1].requestBody);
      expect(pbwon_req).to.have.own.property('pbrw');
      expect(pbwon_req.pbrw).to.deep.equal({
        ac: '300x250',
        ai: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
        bif: 0.95,
        bs: 'sortable',
        s: initialConfig.options.siteId,
        cc: 'USD',
        c: 0.70,
        inr: true,
        _count: 1,
        _type: 'pbrw'
      });
    });

    it('should track late bidder timeouts', function() {
      events.emit(CONSTANTS.EVENTS.AUCTION_INIT, TEST_DATA.AUCTION_INIT);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, TEST_DATA.BID_REQUESTED);
      events.emit(CONSTANTS.EVENTS.AUCTION_END, TEST_DATA.AUCTION_END);
      clock.tick(DEFAULT_PBID_TIMEOUT);
      events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, TEST_DATA.BID_TIMEOUT);

      clock.tick(TIMEOUT_FOR_REGISTRY);

      expect(server.requests.length).to.equal(2);
      const pbid_req = JSON.parse(server.requests[0].requestBody);
      expect(pbid_req).to.have.own.property('pbid');
      const pbto_req = JSON.parse(server.requests[1].requestBody);
      expect(pbto_req).to.have.own.property('pbto');
      expect(pbto_req.pbto).to.deep.equal({
        ai: 'fb8d579a-5c3f-4705-ab94-3cff39005d9e',
        s: initialConfig.options.siteId,
        ac: '300x250',
        bs: 'sortable',
        _type: 'pbto',
        _count: 1
      });
    });

    it('should track errors', function() {
      events.emit(CONSTANTS.EVENTS.AUCTION_INIT, TEST_DATA.AUCTION_INIT);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, {});

      clock.tick(TIMEOUT_FOR_REGISTRY);

      expect(server.requests.length).to.equal(1);
      const err_req = JSON.parse(server.requests[0].requestBody);
      expect(err_req).to.have.own.property('pber');
      expect(err_req.pber).to.include({
        args: '{}',
        s: initialConfig.options.siteId,
        _count: 1,
        ti: 'bidRequested',
        _type: 'pber'
      });
      expect(err_req.pber.msg).to.be.a('string');
    });
  });
});
