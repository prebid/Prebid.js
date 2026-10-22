import { GenericAnalytics } from '../../../modules/genericAnalyticsAdapter.js';
import { bidRequested, bidResponse, bidTimeout, bidWon, eidsSources, noBid, PRESET_NAME, stripEids } from '../../../modules/genericAnalyticsSkinnyEvents.js';
import * as events from 'src/events.js';
import { EVENTS } from 'src/constants.js';

describe('Generic analytics skinny events', () => {
  describe('preset', () => {
    let adapter, sandbox, clock, handler;
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(events, 'getEvents').returns([]);
      clock = sandbox.useFakeTimers();
      handler = sinon.stub();
      adapter = new GenericAnalytics();
    });

    afterEach(() => {
      adapter.disableAnalytics();
      sandbox.restore();
      clock.runAll();
      clock.restore();
    });

    it('is registered with the generic analytics adapter', () => {
      adapter.enableAnalytics({
        options: {
          handler,
          preset: PRESET_NAME
        }
      });
      expect(adapter.enabled).to.be.true;
    });

    it('formats events', () => {
      adapter.enableAnalytics({
        options: {
          handler,
          preset: PRESET_NAME
        }
      });
      events.emit(EVENTS.NO_BID, { auctionId: 'a1', bidder: 'b1', extra: 'data' });
      sinon.assert.calledWith(handler, [sinon.match({ eventType: EVENTS.NO_BID, auctionId: 'a1', bidder: 'b1' })]);
      expect(handler.args[0][0][0]).to.not.have.property('extra');
    });
  });

  describe('noBid', () => {
    it('keeps only the relevant fields', () => {
      expect(noBid({
        auctionId: 'auction',
        adUnitCode: 'adUnit',
        bidder: 'bidder',
        src: 'client',
        bidId: 'bid',
        bidderRequestId: 'bidderRequest',
        ortb2: { site: { domain: 'example.com' } },
        ortb2Imp: { ext: {} },
        analyticsLabels: { label: 'value' }
      })).to.eql({
        eventType: EVENTS.NO_BID,
        auctionId: 'auction',
        bidId: 'bid',
        bidderRequestId: 'bidderRequest',
        adUnitCode: 'adUnit',
        bidder: 'bidder',
        source: 'client',
        analyticsLabels: { label: 'value' }
      });
    });
  });

  describe('bid events', () => {
    const SKINNY_BID = {
      auctionId: 'auction',
      adUnitCode: 'adUnit',
      transactionId: 'tid',
      requestId: 'request',
      adId: 'ad',
      bidder: 'bidder',
      bidderCode: 'bidderCode',
      cpm: 1.5,
      currency: 'USD',
      originalCpm: 2,
      originalCurrency: 'EUR',
      mediaType: 'banner',
      width: 300,
      height: 250,
      size: '300x250',
      dealId: 'deal',
      meta: { advertiserDomains: ['example.com'] },
      adserverTargeting: { hb_pb: '1.50' },
      floorData: { floorValue: 1, floorCurrency: 'USD' },
      requestTimestamp: 1000,
      responseTimestamp: 1200,
      timeToRespond: 200,
      ttl: 300,
      source: 'client',
      analyticsLabels: { label: 'value' }
    };
    let bid;
    beforeEach(() => {
      bid = {
        ...SKINNY_BID,
        status: 'rendered',
        ad: '<div>creative</div>',
        renderer: {},
        metrics: {},
        getSize() {},
        getStatusCode() {}
      };
    });

    it('bidResponse keeps only the relevant fields', () => {
      expect(bidResponse(bid)).to.eql({
        eventType: EVENTS.BID_RESPONSE,
        ...SKINNY_BID
      });
    });

    it('bidWon keeps only the relevant fields, including status', () => {
      expect(bidWon(bid)).to.eql({
        eventType: EVENTS.BID_WON,
        ...SKINNY_BID,
        status: 'rendered'
      });
    });
  });

  describe('request events', () => {
    const ORTB2 = {
      site: { domain: 'example.com' },
      user: {
        eids: [{ source: 'a.com', uids: [{ id: '1' }] }],
        ext: {
          eids: [{ source: 'b.com', uids: [{ id: '2' }] }, { source: 'a.com', uids: [{ id: '3' }] }],
          other: 'value'
        }
      }
    };
    const ORTB2_WITHOUT_EIDS = {
      site: { domain: 'example.com' },
      user: { ext: { other: 'value' } }
    };

    function makeBidRequest(overrides = {}) {
      return {
        bidId: 'bid',
        bidderRequestId: 'bidderRequest',
        auctionId: 'auction',
        adUnitCode: 'adUnit',
        transactionId: 'tid',
        bidder: 'bidder',
        src: 'client',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        sizes: [[300, 250]],
        auctionsCount: 1,
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
        ortb2Imp: { ext: { gpid: '/slot' } },
        ortb2: ORTB2,
        params: { placement: 123 },
        userIdAsEids: ORTB2.user.ext.eids,
        metrics: {},
        ...overrides
      };
    }

    function skinnyBidRequest(overrides = {}) {
      return {
        bidId: 'bid',
        bidderRequestId: 'bidderRequest',
        auctionId: 'auction',
        adUnitCode: 'adUnit',
        transactionId: 'tid',
        bidder: 'bidder',
        source: 'client',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        sizes: [[300, 250]],
        auctionsCount: 1,
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
        ortb2Imp: { ext: { gpid: '/slot' } },
        ...overrides
      };
    }

    describe('eidsSources', () => {
      it('collects unique sources from user.eids and user.ext.eids', () => {
        expect(eidsSources(ORTB2)).to.eql(['a.com', 'b.com']);
      });

      [undefined, {}, { user: {} }].forEach(ortb2 => {
        it(`returns an empty list for ${JSON.stringify(ortb2)}`, () => {
          expect(eidsSources(ortb2)).to.eql([]);
        });
      });
    });

    describe('stripEids', () => {
      it('removes EIDs without modifying the original', () => {
        const original = JSON.parse(JSON.stringify(ORTB2));
        expect(stripEids(original)).to.eql(ORTB2_WITHOUT_EIDS);
        expect(original).to.eql(ORTB2);
      });

      it('returns the same object when there are no EIDs', () => {
        const ortb2 = { site: { domain: 'example.com' } };
        expect(stripEids(ortb2)).to.equal(ortb2);
      });

      it('handles EIDs only in user.eids', () => {
        expect(stripEids({ user: { eids: [{ source: 'a.com' }] } })).to.eql({ user: {} });
      });
    });

    describe('bidRequested', () => {
      it('keeps only the relevant fields, with ortb2 once and without EIDs', () => {
        expect(bidRequested({
          auctionId: 'auction',
          bidderRequestId: 'bidderRequest',
          bidderCode: 'bidder',
          auctionStart: 1000,
          start: 1010,
          timeout: 3000,
          ortb2: ORTB2,
          refererInfo: { page: 'https://example.com' },
          gdprConsent: { consentString: 'consent' },
          metrics: {},
          bids: [makeBidRequest(), makeBidRequest({ bidId: 'bid2' })],
          analyticsLabels: { label: 'value' }
        })).to.eql({
          eventType: EVENTS.BID_REQUESTED,
          auctionId: 'auction',
          bidderRequestId: 'bidderRequest',
          bidderCode: 'bidder',
          auctionStart: 1000,
          start: 1010,
          timeout: 3000,
          ortb2: ORTB2_WITHOUT_EIDS,
          eidsSources: ['a.com', 'b.com'],
          bids: [skinnyBidRequest(), skinnyBidRequest({ bidId: 'bid2' })],
          analyticsLabels: { label: 'value' }
        });
      });

      it('does not choke on missing bids', () => {
        expect(bidRequested({ auctionId: 'auction' }).bids).to.eql([]);
      });
    });

    describe('bidTimeout', () => {
      it('groups bids by bidder request, with ortb2 once and without EIDs', () => {
        expect(bidTimeout([makeBidRequest(), makeBidRequest({ bidId: 'bid2' })])).to.eql({
          eventType: EVENTS.BID_TIMEOUT,
          bidderRequests: [{
            auctionId: 'auction',
            bidderRequestId: 'bidderRequest',
            bidderCode: 'bidder',
            ortb2: ORTB2_WITHOUT_EIDS,
            eidsSources: ['a.com', 'b.com'],
            bids: [skinnyBidRequest(), skinnyBidRequest({ bidId: 'bid2' })]
          }],
          analyticsLabels: undefined
        });
      });

      it('keeps ortb2 on each bidder request and ortb2Imp on each bid, whether or not they differ', () => {
        const ortb2Imp = { ext: { gpid: '/other' } };
        const ortb2 = { site: { domain: 'other.com' } };
        const result = bidTimeout([
          makeBidRequest(),
          makeBidRequest({ bidId: 'bid2', bidderRequestId: 'bidderRequest2', bidder: 'bidder2', ortb2, ortb2Imp })
        ]);
        expect(result.bidderRequests).to.eql([{
          auctionId: 'auction',
          bidderRequestId: 'bidderRequest',
          bidderCode: 'bidder',
          ortb2: ORTB2_WITHOUT_EIDS,
          eidsSources: ['a.com', 'b.com'],
          bids: [skinnyBidRequest()]
        }, {
          auctionId: 'auction',
          bidderRequestId: 'bidderRequest2',
          bidderCode: 'bidder2',
          ortb2,
          eidsSources: [],
          bids: [skinnyBidRequest({ bidId: 'bid2', bidderRequestId: 'bidderRequest2', bidder: 'bidder2', ortb2Imp })]
        }]);
      });

      it('accepts args spread into an object together with analytics labels', () => {
        const result = bidTimeout({ analyticsLabels: { label: 'value' }, 0: makeBidRequest(), 1: makeBidRequest({ bidId: 'bid2' }) });
        expect(result.analyticsLabels).to.eql({ label: 'value' });
        expect(result.bidderRequests[0].bids.map(bid => bid.bidId)).to.eql(['bid', 'bid2']);
      });

      it('does not choke on no bids', () => {
        expect(bidTimeout([])).to.eql({
          eventType: EVENTS.BID_TIMEOUT,
          bidderRequests: [],
          analyticsLabels: undefined
        });
      });
    });
  });
});
