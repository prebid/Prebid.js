import { expect } from 'chai';
import sinon from 'sinon';
import { spec } from 'modules/holidBidAdapter.js';
import * as utils from 'src/utils.js';
import 'modules/priceFloors.js';

const clone = utils.deepClone;
function fixture() {
  return {
    bidder: 'holid',
    adUnitCode: 'rail',
    bidId: 'bid-id',
    params: { adUnitID: '12345' },
    sizes: [[300, 250]],
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    ortb2: {
      site: { publisher: { id: 'publisher' } },
      user: { ext: { data: { segment: 'cooking' } } },
      ext: { prebid: { aliases: { test: 'adform' } } },
      source: { tid: 'transaction', ext: { schain: { ver: '1.0', complete: 1, nodes: [] } } }
    },
    ortb2Imp: { ext: { gpid: '/publisher/rail', data: { pbadslot: 'rail' } }, pmp: { deals: [{ id: 'pmp-input' }] } }
  };
}
function build(bid = fixture(), request = {}) {
  return spec.buildRequests([bid], { bidderRequestId: 'request-id', timeout: 1000, ...request })[0];
}
function payload(bid, request) { return JSON.parse(build(bid, request).data); }
function serverBid(overrides = {}) {
  return { id: 'server-bid', impid: 'bid-id', price: 2, adm: '<div>ad</div>', crid: 'creative', w: 300, h: 250, ...overrides };
}
function interpret(bids, request = build(), currency = 'USD') {
  return spec.interpretResponse({ body: { cur: currency, seatbid: [{ seat: 'adform', bid: bids }] } }, request);
}
const syncResponses = [{ body: { ext: { responsetimemillis: { adform: 10, rubicon: 20 } } } }];
function syncParams(gdpr, usp, gpp) {
  return new URL(spec.getUserSyncs({ iframeEnabled: true }, syncResponses, gdpr, usp, gpp)[0].url).searchParams;
}

describe('Holid adapter', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());
  describe('validation', () => {
    ['12345', 12345].forEach(id => it(`accepts stored ID ${typeof id}`, () => {
      expect(spec.isBidRequestValid({ params: { adUnitID: id } })).to.equal(true);
    }));
    [undefined, null, '', '  ', 0, -1, {}, []].forEach(id => it(`rejects invalid ID ${JSON.stringify(id)}`, () => {
      expect(spec.isBidRequestValid({ params: { adUnitID: id } })).to.equal(false);
    }));
    it('handles missing bid/params', () => {
      expect(spec.isBidRequestValid()).to.equal(false);
      expect(spec.isBidRequestValid({})).to.equal(false);
    });
  });
  describe('requests', () => {
    it('retains endpoint, POST and stored request IDs at both levels', () => {
      const request = build(); const data = JSON.parse(request.data);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://helloworld.holid.io/openrtb2/auction');
      expect(data.id).to.equal('request-id');
      expect(data.imp[0].id).to.equal('bid-id');
      expect(data.ext.prebid.storedrequest.id).to.equal('12345');
      expect(data.imp[0].ext.prebid.storedrequest.id).to.equal('12345');
    });
    it('keeps distinct stored requests separate', () => {
      const a = fixture(); const b = fixture(); b.bidId = 'other'; b.params.adUnitID = '67890';
      const requests = spec.buildRequests([a, b], { bidderRequestId: 'id' }).map(r => JSON.parse(r.data));
      expect(requests).to.have.length(2);
      expect(requests.map(r => r.ext.prebid.storedrequest.id)).to.deep.equal(['12345', '67890']);
    });
    it('preserves GPID, slot data, PMP, source fields, schain and aliases', () => {
      const bid = fixture(); const data = payload(bid);
      expect(data.imp[0].ext.gpid).to.equal('/publisher/rail');
      expect(data.imp[0].ext.data).to.deep.equal(bid.ortb2Imp.ext.data);
      expect(data.imp[0].pmp).to.deep.equal(bid.ortb2Imp.pmp);
      expect(data.source).to.deep.equal(bid.ortb2.source);
      expect(data.ext.prebid.aliases).to.deep.equal(bid.ortb2.ext.prebid.aliases);
    });
    it('does not mutate input or share nested output references', () => {
      const bid = fixture(); const original = clone(bid);
      const request = build(bid, { gdprConsent: { gdprApplies: true, consentString: 'consent' } });
      request.ortbRequest.imp[0].ext.data.pbadslot = 'changed';
      request.ortbRequest.ext.prebid.aliases.test = 'changed';
      expect(bid).to.deep.equal(original);
    });
    it('uses bidderRequest.ortb2 when per-bid ortb2 is absent', () => {
      const bid = fixture(); delete bid.ortb2;
      const br = { ortb2: { site: { domain: 'example.com' }, regs: { gpp: 'ORTB-GPP', gpp_sid: [7] } } };
      const original = clone(br); const data = payload(bid, br);
      expect(data.site.domain).to.equal('example.com'); expect(data.regs.gpp).to.equal('ORTB-GPP');
      expect(br).to.deep.equal(original);
    });
    it('prefers filtered per-bid FPD over request-level data', () => {
      expect(payload(fixture(), { ortb2: { site: { domain: 'must-not-leak.example' } } }).site.domain).to.equal(undefined);
    });
    it('preserves COPPA, DSA and blocking fields', () => {
      const bid = fixture(); bid.ortb2.regs = { coppa: 1, ext: { dsa: { dsarequired: 1 } } };
      bid.ortb2.bcat = ['IAB7']; bid.ortb2.badv = ['blocked.example'];
      expect(payload(bid).regs).to.deep.equal(bid.ortb2.regs);
      expect(payload(bid).badv).to.deep.equal(['blocked.example']);
    });
    it('uses mediaTypes sizes, with fallback to legacy sizes', () => {
      expect(payload().imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      const bid = fixture(); delete bid.mediaTypes.banner.sizes;
      expect(payload(bid).imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
    });
    it('preserves explicit ortb2Imp banner format', () => {
      const bid = fixture(); bid.ortb2Imp.banner = { format: [{ w: 336, h: 280 }], pos: 1 };
      expect(payload(bid).imp[0].banner.format).to.deep.equal([{ w: 336, h: 280 }]);
    });
    it('sets modern and legacy GDPR consistently and carries EIDs', () => {
      const bid = fixture(); bid.ortb2.regs = { gdpr: 0, ext: { gdpr: 0 } };
      bid.userIdAsEids = [{ source: 'id.example', uids: [{ id: 'test', atype: 1 }] }];
      const data = payload(bid, { gdprConsent: { gdprApplies: true, consentString: 'TCF' }, usPrivacy: '1YNN' });
      expect(data.regs.gdpr).to.equal(1); expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('TCF'); expect(data.user.ext.eids).to.deep.equal(bid.userIdAsEids);
      expect(data.regs.ext.us_privacy).to.equal('1YNN');
    });
    it('does not translate unknown GDPR to gdpr=0', () => {
      const data = payload(fixture(), { gdprConsent: {} });
      expect(data.regs?.gdpr).to.equal(undefined); expect(data.regs?.ext?.gdpr).to.equal(undefined);
    });
    it('carries explicit GDPR false', () => {
      expect(payload(fixture(), { gdprConsent: { gdprApplies: false } }).regs.gdpr).to.equal(0);
    });
    it('maps gppConsent to ORTB 2.6 fields and preserves other regs', () => {
      const bid = fixture(); bid.ortb2.regs = { coppa: 1 };
      const data = payload(bid, { gppConsent: { gppString: 'GPP', applicableSections: [7, 8] } });
      expect(data.regs).to.include({ coppa: 1, gpp: 'GPP' });
      expect(data.regs.gpp_sid).to.deep.equal([7, 8]); expect(data.regs.ext?.gpp).to.equal(undefined);
    });
    it('respects the auction timeout and caps per-bid override', () => {
      expect(payload().tmax).to.equal(1000);
      const bid = fixture(); bid.params.tmax = 2000; expect(payload(bid).tmax).to.equal(1000);
      bid.params.tmax = 650; expect(payload(bid).tmax).to.equal(650);
      expect(payload(bid, { timeout: undefined }).tmax).to.equal(650);
    });
    it('omits invalid timeout and inherited stale tmax', () => {
      const bid = fixture(); bid.params.tmax = -1; bid.ortb2.tmax = 9000;
      expect(payload(bid, { timeout: undefined }).tmax).to.equal(undefined);
    });
    it('uses getFloor and currency via Price Floors', () => {
      const bid = fixture(); bid.params.floor = 0.1;
      bid.getFloor = sandbox.stub().returns({ floor: 1.25, currency: 'USD' });
      const data = payload(bid);
      expect(bid.getFloor.called).to.equal(true);
      expect(data.imp[0].bidfloor).to.equal(1.25); expect(data.imp[0].bidfloorcur).to.equal('USD');
    });
    it('supports legacy floor and explicit currency fallback', () => {
      const bid = fixture(); bid.params.floor = 0.5; bid.params.floorCurrency = 'EUR';
      expect(payload(bid).imp[0]).to.include({ bidfloor: 0.5, bidfloorcur: 'EUR' });
      delete bid.params.floorCurrency;
      expect(payload(bid).imp[0].bidfloorcur).to.equal('USD');
    });
    it('preserves an explicit impression floor over legacy params', () => {
      const bid = fixture(); bid.params.floor = 0.5; bid.ortb2Imp.bidfloor = 0.8; bid.ortb2Imp.bidfloorcur = 'EUR';
      expect(payload(bid).imp[0]).to.include({ bidfloor: 0.8, bidfloorcur: 'EUR' });
    });
    it('does not send invalid legacy floor', () => {
      const bid = fixture(); bid.params.floor = -1; expect(payload(bid).imp[0].bidfloor).to.equal(undefined);
    });
    it('accepts a zero legacy floor', () => {
      const bid = fixture(); bid.params.floor = 0; expect(payload(bid).imp[0].bidfloor).to.equal(0);
    });
  });
  describe('responses and wins', () => {
    it('maps banner, price, IDs, currency, deal and TTL', () => {
      const bid = interpret([serverBid({ dealid: 'deal-out', exp: 25 })], build(), 'EUR')[0];
      expect(bid).to.include({
        requestId: 'bid-id',
        cpm: 2,
        ad: '<div>ad</div>',
        width: 300,
        height: 250,
        creativeId: 'creative',
        currency: 'EUR',
        dealId: 'deal-out',
        ttl: 25,
        netRevenue: true,
        mediaType: 'banner'
      });
    });
    it('defaults missing TTL and currency', () => {
      const bid = interpret([serverBid()], build(), null)[0];
      expect(bid.ttl).to.equal(300); expect(bid.currency).to.equal('USD');
    });
    it('keeps highest bid and its own win URL regardless of response order', () => {
      const pixel = sandbox.stub(utils, 'triggerPixel');
      for (const prices of [[5, 1], [1, 5]]) {
        const bids = prices.map(price => serverBid({ price, ext: { prebid: { events: { win: `https://example.invalid/${price}` } } } }));
        const winner = interpret(bids)[0]; expect(winner.cpm).to.equal(5);
        spec.onBidWon(winner); spec.onBidWon(winner);
      }
      expect(pixel.callCount).to.equal(2);
      expect(pixel.alwaysCalledWith('https://example.invalid/5')).to.equal(true);
    });
    it('does not notify loser when winner has no win URL', () => {
      const pixel = sandbox.stub(utils, 'triggerPixel');
      const winner = interpret([serverBid({ price: 5 }), serverBid({ price: 1, ext: { prebid: { events: { win: 'https://example.invalid/loser' } } } })])[0];
      spec.onBidWon(winner); expect(pixel.called).to.equal(false);
    });
    it('does not mix URLs between overlapping auctions', () => {
      const pixel = sandbox.stub(utils, 'triggerPixel');
      const make = url => interpret([serverBid({ ext: { prebid: { events: { win: url } } } })])[0];
      const first = make('https://example.invalid/first'); const second = make('https://example.invalid/second');
      spec.onBidWon(first); spec.onBidWon(second);
      expect(pixel.args.map(args => args[0])).to.deep.equal(['https://example.invalid/first', 'https://example.invalid/second']);
    });
    it('preserves metadata, normalizes adomain, does not mutate the response', () => {
      const input = serverBid({ adomain: [' https://WWW.Example.COM ', null, ''], ext: { prebid: { meta: { networkId: 42 } }, dsa: { behalf: 'advertiser' } } });
      const before = clone(input); const result = interpret([input])[0];
      expect(result.meta.advertiserDomains).to.deep.equal(['example.com']);
      expect(result.meta.networkId).to.equal(42); expect(result.meta.dsa).to.deep.equal(input.ext.dsa);
      expect(input).to.deep.equal(before);
    });
    it('handles nurl-only creatives through standard converter', () => {
      expect(interpret([serverBid({ adm: undefined, nurl: 'https://example.invalid/ad' })])[0].adUrl).to.equal('https://example.invalid/ad');
    });
    it('ignores bids for other impressions', () => {
      expect(interpret([serverBid({ impid: 'unknown' })])).to.deep.equal([]);
    });
    [{ price: -1 }, { price: NaN }, { price: 0 }, { adm: '' }, { w: 0 }, { exp: -1 }, { exp: 0 }].forEach(overrides => {
      it(`rejects unusable bid ${JSON.stringify(overrides)}`, () => expect(interpret([serverBid(overrides)])).to.deep.equal([]));
    });
    it('accepts empty/no-bid and malformed seats without throwing', () => {
      for (const body of [null, {}, { seatbid: null }, { seatbid: [] }, { seatbid: [null, {}, { bid: [null] }] }]) {
        expect(spec.interpretResponse({ body }, build())).to.deep.equal([]);
      }
      expect(spec.interpretResponse({ body: { seatbid: [] } }, {})).to.deep.equal([]);
    });
  });
  describe('syncs', () => {
    it('returns no tracking pixel when syncs are disabled', () => {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, syncResponses)).to.deep.equal([]);
    });
    it('does not advertise an HTML page as image fallback', () => {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, syncResponses)).to.deep.equal([]);
    });
    it('carries GDPR, both USP bridge names and GPP', () => {
      const params = syncParams({ gdprApplies: true, consentString: 'a+b&c' }, '1YNN', { gppString: 'GPP~test', applicableSections: [7, 8] });
      expect(params.get('gdpr')).to.equal('1'); expect(params.get('gdpr_consent')).to.equal('a+b&c');
      expect(params.get('us_privacy')).to.equal('1YNN'); expect(params.get('usp_consent')).to.equal('1YNN');
      expect(params.get('gpp')).to.equal('GPP~test'); expect(JSON.parse(params.get('gpp_sid'))).to.deep.equal([7, 8]);
    });
    it('does not claim gdpr=0 without a known applicability', () => {
      expect(syncParams().has('gdpr')).to.equal(false);
      expect(syncParams({}).has('gdpr')).to.equal(false);
      expect(syncParams({ gdprApplies: false }).get('gdpr')).to.equal('0');
    });
    it('deduplicates bidders and uses seat fallback', () => {
      const response = { body: { ext: { responsetimemillis: { adform: 1 } }, seatbid: [{ seat: 'adform' }, { seat: 'rubicon' }, null] } };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, response);
      expect(syncs).to.have.length(1); expect(syncs[0].type).to.equal('iframe');
      expect(JSON.parse(new URL(syncs[0].url).searchParams.get('bidders'))).to.deep.equal(['adform', 'rubicon']);
    });
    it('handles missing/no-bid responses', () => {
      for (const response of [undefined, [], [null], [{}], [{ body: { seatbid: {} } }]]) {
        expect(spec.getUserSyncs({ iframeEnabled: true }, response)).to.deep.equal([]);
      }
    });
  });
});
