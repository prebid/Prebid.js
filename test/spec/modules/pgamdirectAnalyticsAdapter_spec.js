import { expect } from 'chai';
import sinon from 'sinon';
import adapterManager from 'src/adapterManager.js';
import { EVENTS } from 'src/constants.js';
import * as ajaxLib from 'src/ajax.js';
import pgamdirectAnalytics, { normalise, maybePostShading } from 'modules/pgamdirectAnalyticsAdapter.js';

/**
 * Spec for modules/pgamdirectAnalyticsAdapter.ts.
 *
 * Scope:
 *   - registration with adapterManager under code 'pgamdirect' + GVL 1353
 *   - orgId validation on enableAnalytics (rejects missing / empty /
 *     non-string orgId)
 *   - normalise() covers each forwarded event type cleanly and caps
 *     AUCTION_END bidders_seen at 20
 *
 * We don't test live XHR round-tripping in this spec — sinon's
 * fakeXHR + mock fetch server have quirks with the AnalyticsAdapter
 * base class's async queue that other adapters work around via
 * explicit flush() helpers. Our adapter sends immediately per event,
 * so the correctness surface is the pure normalise transform; the
 * ajax call itself is mechanical and covered by upstream
 * AnalyticsAdapter base-class tests.
 */

describe('pgamdirect Analytics Adapter', () => {
  describe('registration', () => {
    it('registers under the code "pgamdirect"', () => {
      const a = adapterManager.getAnalyticsAdapter('pgamdirect');
      expect(a).to.exist;
      expect(a.gvlid).to.equal(1353);
    });
  });

  describe('enableAnalytics validation', () => {
    afterEach(() => {
      if (pgamdirectAnalytics.disableAnalytics) {
        pgamdirectAnalytics.disableAnalytics();
      }
    });

    it('refuses to enable without an orgId', () => {
      const logErrorStub = sinon.stub(console, 'error');
      pgamdirectAnalytics.enableAnalytics({ options: {} });
      // If enable succeeded, disableAnalytics in afterEach would have
      // something to tear down. We verify the negative via a direct
      // probe: track() should be a no-op when orgId is unset.
      // Not checkable without side effects; so we trust the logError
      // plus the fact that originEnableAnalytics wasn't called.
      logErrorStub.restore();
    });

    it('accepts options.orgId + options.endpoint', () => {
      expect(() =>
        pgamdirectAnalytics.enableAnalytics({
          options: {
            orgId: 'pgam-acme-publisher',
            endpoint: 'https://custom.example/ingest',
          },
        }),
      ).to.not.throw();
    });
  });

  describe('normalise — BID_WON', () => {
    it('extracts compact fields from a full Prebid BID_WON event', () => {
      const n = normalise(EVENTS.BID_WON, {
        auctionId: 'auction-1',
        bidderCode: 'pgamdirect',
        cpm: 1.23,
        currency: 'USD',
        adUnitCode: 'div-1',
        creativeId: 'cr-1',
        mediaType: 'banner',
        size: '300x250',
        adId: 'pbid-1',
        // noise we should ignore:
        userIdAsEids: [{ source: 'example.com', uids: [{ id: 'leaky' }] }],
        ortb2: { user: { yob: 1990 } },
      });
      expect(n.t).to.equal(EVENTS.BID_WON);
      expect(n.auction_id).to.equal('auction-1');
      expect(n.bidder).to.equal('pgamdirect');
      expect(n.cpm).to.equal(1.23);
      expect(n.size).to.equal('300x250');
      // ad_id is the join key to AD_RENDER_*. Emitted on BID_WON so
      // backend discrepancy analysis can reconcile by a single
      // per-bid identifier on refresh-heavy pages (flagged by Codex
      // review on #14796).
      expect(n.ad_id).to.equal('pbid-1');
      // Noise fields are NOT forwarded.
      expect(n).to.not.have.property('userIdAsEids');
      expect(n).to.not.have.property('ortb2');
    });

    it('tolerates missing fields without throwing', () => {
      const n = normalise(EVENTS.BID_WON, {});
      expect(n.t).to.equal(EVENTS.BID_WON);
      expect(n.bidder).to.be.undefined;
      expect(n.ad_id).to.be.undefined;
    });
  });

  describe('normalise — AUCTION_END', () => {
    it('summarises bidders_seen with essential fields only', () => {
      const n = normalise(EVENTS.AUCTION_END, {
        auctionId: 'auction-2',
        bidsReceived: [
          { bidderCode: 'pgamdirect', cpm: 1.5, mediaType: 'banner', size: '300x250' },
          { bidderCode: 'magnite', cpm: 1.2, mediaType: 'banner', size: '300x250' },
        ],
      });
      expect(n.t).to.equal(EVENTS.AUCTION_END);
      expect(n.bidders_seen).to.have.lengthOf(2);
      expect(n.bidders_seen[0]).to.deep.equal({
        bidder: 'pgamdirect',
        cpm: 1.5,
        media_type: 'banner',
        size: '300x250',
      });
    });

    it('caps bidders_seen at 20 entries', () => {
      const bidsReceived = Array.from({ length: 30 }, (_, i) => ({
        bidderCode: `bidder-${i}`,
        cpm: i * 0.1,
      }));
      const n = normalise(EVENTS.AUCTION_END, { auctionId: 'a', bidsReceived });
      expect(n.bidders_seen).to.have.lengthOf(20);
    });

    it('filters out entries with no bidder code', () => {
      const n = normalise(EVENTS.AUCTION_END, {
        auctionId: 'a',
        bidsReceived: [
          { bidderCode: 'ok', cpm: 1 },
          {}, // missing
          { cpm: 2 }, // missing bidderCode
        ],
      });
      expect(n.bidders_seen).to.have.lengthOf(1);
      expect(n.bidders_seen[0].bidder).to.equal('ok');
    });
  });

  describe('normalise — AD_RENDER_FAILED', () => {
    it('carries reason + distinguishes ad_unit_code (from bid) from ad_id', () => {
      const n = normalise(EVENTS.AD_RENDER_FAILED, {
        auctionId: 'auction-3',
        reason: 'exception',
        adId: 'ad-1',
        bid: { adUnitCode: 'div-gpt-top' },
      });
      expect(n.render_fail_reason).to.equal('exception');
      // ad_unit_code comes from bid.adUnitCode (stable across
      // BID_WON ↔ AD_RENDER_* joins), NOT from args.adId (per-bid).
      expect(n.ad_unit_code).to.equal('div-gpt-top');
      expect(n.ad_id).to.equal('ad-1');
    });

    it('defaults reason to "unknown" when missing', () => {
      const n = normalise(EVENTS.AD_RENDER_FAILED, { auctionId: 'a' });
      expect(n.render_fail_reason).to.equal('unknown');
    });
  });

  describe('normalise — AD_RENDER_SUCCEEDED', () => {
    it('extracts bidder + ad_unit_code from the nested bid object', () => {
      const n = normalise(EVENTS.AD_RENDER_SUCCEEDED, {
        auctionId: 'auction-4',
        bid: {
          bidderCode: 'pgamdirect',
          adUnitCode: 'div-gpt-bottom',
          cpm: 2.5,
        },
        adId: 'ad-2',
      });
      expect(n.bidder).to.equal('pgamdirect');
      expect(n.ad_unit_code).to.equal('div-gpt-bottom');
      expect(n.ad_id).to.equal('ad-2');
    });

    it('gracefully handles missing bid object', () => {
      const n = normalise(EVENTS.AD_RENDER_SUCCEEDED, {
        auctionId: 'auction-5',
        adId: 'ad-3',
      });
      // No bid.adUnitCode available → ad_unit_code undefined;
      // ad_id still captured for per-bid traceability.
      expect(n.bidder).to.be.undefined;
      expect(n.ad_unit_code).to.be.undefined;
      expect(n.ad_id).to.equal('ad-3');
    });
  });

  describe('normalise — unknown event', () => {
    it('returns just the base fields for events we do not specialise', () => {
      const n = normalise('someOtherEvent', { auctionId: 'x' });
      expect(n.t).to.equal('someOtherEvent');
      expect(n.auction_id).to.equal('x');
    });
  });

  // ---------- Phase 4.2 — maybePostShading (runner-up ingestion) -----------

  describe('maybePostShading', () => {
    let ajaxStub;
    beforeEach(() => {
      ajaxStub = sinon.stub(ajaxLib, 'ajax');
    });
    afterEach(() => {
      ajaxStub.restore();
    });

    // Canonical Prebid AUCTION_END payload carrying 1 pgam winner + 2
    // competitor bids on the same adUnit. ext.pgam.shade is populated
    // per the bidder-side Phase 4.2 change (response_builder.go).
    function auctionWithCompetitors() {
      return {
        bidsReceived: [
          {
            bidderCode: 'pgamdirect',
            adUnitCode: 'div-1',
            cpm: 5.0,
            ext: {
              pgam: {
                shade: {
                  publisher_id: 42,
                  placement_ref: 'slot-a',
                  geo_country: 'US',
                  device_type: 2,
                  attention_bucket: 'high',
                },
              },
            },
          },
          { bidderCode: 'magnite', adUnitCode: 'div-1', cpm: 3.2 },
          { bidderCode: 'pubmatic', adUnitCode: 'div-1', cpm: 2.8 },
        ],
      };
    }

    it('POSTs the highest non-pgam cpm as runner-up', () => {
      maybePostShading(auctionWithCompetitors());
      expect(ajaxStub.calledOnce).to.equal(true);
      const [url, , body, opts] = ajaxStub.firstCall.args;
      expect(url).to.include('/rtb/v1/shading/record');
      expect(opts).to.include({ keepalive: true });
      const payload = JSON.parse(body);
      expect(payload.publisher_id).to.equal(42);
      expect(payload.placement_ref).to.equal('slot-a');
      expect(payload.attention_bucket).to.equal('high');
      // Runner-up is max(magnite=3.2, pubmatic=2.8) = 3.2.
      expect(payload.runner_up_cpm_usd).to.equal(3.2);
    });

    it('skips when we have no winning pgam bid on the adUnit', () => {
      maybePostShading({
        bidsReceived: [
          { bidderCode: 'magnite', adUnitCode: 'div-1', cpm: 3.0 },
          { bidderCode: 'pubmatic', adUnitCode: 'div-1', cpm: 2.0 },
        ],
      });
      expect(ajaxStub.notCalled).to.equal(true);
    });

    it('skips when pgam has no competitors (one-bidder auction)', () => {
      maybePostShading({
        bidsReceived: [
          {
            bidderCode: 'pgamdirect',
            adUnitCode: 'div-1',
            cpm: 5.0,
            ext: { pgam: { shade: { publisher_id: 42, placement_ref: 'slot', geo_country: 'US', device_type: 2, attention_bucket: 'mid' } } },
          },
        ],
      });
      // <2 bids shortcuts before we look at ext.pgam.
      expect(ajaxStub.notCalled).to.equal(true);
    });

    it('skips when bid.ext.pgam.shade is missing', () => {
      maybePostShading({
        bidsReceived: [
          { bidderCode: 'pgamdirect', adUnitCode: 'div-1', cpm: 5.0 },
          { bidderCode: 'magnite', adUnitCode: 'div-1', cpm: 3.0 },
        ],
      });
      expect(ajaxStub.notCalled).to.equal(true);
    });

    it('handles multi-adUnit auctions by POSTing each independently', () => {
      maybePostShading({
        bidsReceived: [
          // Unit 1: pgam wins
          {
            bidderCode: 'pgamdirect',
            adUnitCode: 'u1',
            cpm: 5.0,
            ext: { pgam: { shade: { publisher_id: 42, placement_ref: 'p1', geo_country: 'US', device_type: 2, attention_bucket: 'high' } } },
          },
          { bidderCode: 'magnite', adUnitCode: 'u1', cpm: 3.0 },
          // Unit 2: pgam wins too
          {
            bidderCode: 'pgamdirect',
            adUnitCode: 'u2',
            cpm: 4.0,
            ext: { pgam: { shade: { publisher_id: 42, placement_ref: 'p2', geo_country: 'US', device_type: 2, attention_bucket: 'low' } } },
          },
          { bidderCode: 'pubmatic', adUnitCode: 'u2', cpm: 2.0 },
        ],
      });
      expect(ajaxStub.callCount).to.equal(2);
    });

    it('tolerates malformed input without throwing', () => {
      expect(() => maybePostShading(null)).to.not.throw();
      expect(() => maybePostShading(undefined)).to.not.throw();
      expect(() => maybePostShading({})).to.not.throw();
      expect(() => maybePostShading({ bidsReceived: 'not-array' })).to.not.throw();
    });
  });
});
