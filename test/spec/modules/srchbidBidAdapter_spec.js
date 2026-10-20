import { expect } from 'chai';
import { spec, createSpec } from '../../../modules/srchbidBidAdapter.js';
import { server } from 'test/mocks/xhr.js';

const clone = value => JSON.parse(JSON.stringify(value));
const bidRequest = () => ({
  bidder: 'srchbid',
  bidId: 'bid-1',
  params: { zone: 'example-zone' },
  mediaTypes: { banner: { sizes: [[300, 250], [728, 90]], pos: 1 } },
  ortb2Imp: { ext: { tid: 'publisher-transaction' }, banner: { battr: [1] } }
});
const bidderRequest = () => ({
  timeout: 850,
  refererInfo: { page: 'https://publisher.example/article' },
  ortb2: { source: { tid: 'auction-transaction', ext: { schain: { complete: 1, nodes: [] } } } }
});
const lifecycleURL = event => `https://bid.searchplan.co/display-lifecycle/${event}/fixture.${'a'.repeat(43)}`;
const bidResponse = () => ({
  id: 'bid-1',
  cur: 'USD',
  seatbid: [{
    bid: [{
      impid: 'bid-1',
      price: 0.25,
      crid: 'creative-1',
      w: 300,
      h: 250,
      adm: '<div>Srchbid test banner</div>',
      adomain: ['advertiser.example'],
      ext: { bidtags_lifecycle: { win: lifecycleURL('win'), render: lifecycleURL('render') } }
    }]
  }]
});
const request = () => spec.buildRequests([bidRequest()], bidderRequest())[0];

describe('srchbidBidAdapter', function () {
  it('registers the public banner bidder', function () {
    expect(spec.code).to.equal('srchbid');
    expect(spec.supportedMediaTypes).to.deep.equal(['banner']);
  });
  describe('validation', function () {
    [200000, '200000', 'zone-123', 's_123'].forEach(zone => {
      it(`accepts zone ${zone}`, function () {
        const bid = bidRequest(); bid.params.zone = zone;
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });
    [null, undefined, '', 'a', 0, -1, 1.5, {}, 'zone?x=1', 'a'.repeat(65)].forEach((zone, i) => {
      it(`rejects invalid zone case ${i}`, function () {
        const bid = bidRequest(); bid.params.zone = zone;
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });
    it('rejects absent bids, params, ID and unsupported inventory', function () {
      [null, {}, { ...bidRequest(), bidId: undefined }, { ...bidRequest(), params: undefined },
        { ...bidRequest(), mediaTypes: { video: {} } },
        { ...bidRequest(), mediaTypes: { banner: { sizes: [[0, 250], ['300', 250], [5000, 1]] } } }
      ].forEach(bid => expect(spec.isBidRequestValid(bid)).to.equal(false));
    });
  });
  describe('requests', function () {
    it('builds separate requests with matching IDs and USD net auction context', function () {
      const first = bidRequest(); const second = { ...bidRequest(), bidId: 'bid-2' };
      const bids = [first, second]; const context = bidderRequest();
      const before = clone({ bids, context });
      const requests = spec.buildRequests(bids, context);
      expect(requests).to.have.length(2);
      const body = JSON.parse(requests[0].data);
      expect(requests[0].url).to.equal('https://prebid.searchplan.co/prebid/bid?zid=example-zone');
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].options).to.deep.equal({ contentType: 'text/plain', withCredentials: false });
      expect(body).to.include({ id: 'bid-1', at: 1, tmax: 850 });
      expect(body.cur).to.deep.equal(['USD']);
      expect(body.imp[0]).to.include({ id: 'bid-1', secure: 1 });
      expect(body.imp[0].banner).to.deep.equal({ format: [{ w: 300, h: 250 }, { w: 728, h: 90 }], battr: [1], pos: 1 });
      expect(body.imp[0].ext.tid).to.equal('publisher-transaction');
      expect(body.source).to.deep.equal(context.ortb2.source);
      expect(body.site).to.deep.equal({ page: 'https://publisher.example/article', domain: 'publisher.example' });
      expect(JSON.parse(requests[1].data).id).to.equal('bid-2');
      expect({ bids, context }).to.deep.equal(before);
    });
    it('prefers the bid scoped OpenRTB context and strips non-banner impressions', function () {
      const bid = bidRequest();
      bid.ortb2 = { site: { page: 'http://scoped.example/path', publisher: { id: 'p' } }, regs: { coppa: 1 }, user: { ext: { eids: [] } } };
      bid.ortb2Imp.video = {}; bid.ortb2Imp.native = {}; bid.ortb2Imp.audio = {};
      const body = JSON.parse(spec.buildRequests([bid], bidderRequest())[0].data);
      expect(body.site.domain).to.equal('scoped.example');
      expect(body.site.publisher).to.deep.equal({ id: 'p' });
      expect(body.imp[0].secure).to.equal(0);
      expect(body.imp[0]).not.to.have.any.keys('video', 'native', 'audio');
      expect(body.regs.coppa).to.equal(1);
      expect(body.user.ext.eids).to.deep.equal([]);
    });
    it('passes privacy signals without modifying existing OpenRTB data', function () {
      const context = bidderRequest();
      context.ortb2.regs = { coppa: 0, ext: { other: 1 } };
      context.ortb2.user = { ext: { eids: [] } };
      context.gdprConsent = { gdprApplies: true, consentString: 'consent-fixture' };
      context.uspConsent = '1YNN';
      context.gppConsent = { gppString: 'gpp-fixture', applicableSections: [7] };
      const body = JSON.parse(spec.buildRequests([bidRequest()], context)[0].data);
      expect(body.regs).to.deep.equal({ coppa: 0, ext: { other: 1, gdpr: 1, us_privacy: '1YNN' }, gpp: 'gpp-fixture', gpp_sid: [7] });
      expect(body.user.ext).to.deep.equal({ eids: [], consent: 'consent-fixture' });
      const plain = JSON.parse(request().data);
      expect(plain).not.to.have.any.keys('regs', 'user');
    });
    it('preserves explicit GDPR false and empty consent without inventing GPP sections', function () {
      const context = bidderRequest(); context.gdprConsent = { gdprApplies: false, consentString: '' };
      context.gppConsent = { gppString: 'gpp-fixture' };
      const body = JSON.parse(spec.buildRequests([bidRequest()], context)[0].data);
      expect(body.regs.ext.gdpr).to.equal(0); expect(body.user.ext.consent).to.equal('');
      expect(body.regs.gpp_sid).to.deep.equal([]);
    });
    it('uses USD floors including explicit zero', function () {
      [0, 0.5].forEach(floor => {
        const bid = bidRequest(); bid.getFloor = sinon.stub().returns({ currency: 'USD', floor });
        const body = JSON.parse(spec.buildRequests([bid], bidderRequest())[0].data);
        expect(body.imp[0]).to.include({ bidfloor: floor, bidfloorcur: 'USD' });
        expect(bid.getFloor.calledWithExactly({ currency: 'USD', mediaType: 'banner', size: '*' })).to.equal(true);
      });
    });
    it('keeps an existing OpenRTB floor when no valid module floor is returned', function () {
      [{ currency: 'EUR', floor: 3 }, { currency: 'USD', floor: -1 }, undefined].forEach(floor => {
        const bid = bidRequest(); bid.ortb2Imp.bidfloor = 0.1; bid.ortb2Imp.bidfloorcur = 'USD';
        bid.getFloor = () => floor;
        expect(JSON.parse(spec.buildRequests([bid], bidderRequest())[0].data).imp[0].bidfloor).to.equal(0.1);
      });
    });
    it('fails closed on floor errors', function () {
      const bid = bidRequest(); bid.getFloor = () => { throw new Error('floor error'); };
      expect(spec.buildRequests([bid], bidderRequest())).to.deep.equal([]);
    });
    it('rejects missing or invalid web context and apps', function () {
      [undefined, 'invalid', 'data:text/plain,hi'].forEach(page => {
        expect(spec.buildRequests([bidRequest()], { refererInfo: { page } })).to.deep.equal([]);
      });
      const context = bidderRequest(); context.ortb2.app = { id: 'app' };
      expect(spec.buildRequests([bidRequest()], context)).to.deep.equal([]);
      expect(spec.buildRequests([bidRequest()])).to.deep.equal([]);
      expect(spec.buildRequests(null)).to.deep.equal([]);
      expect(spec.buildRequests([{}], bidderRequest())).to.deep.equal([]);
    });
    it('bounds timeout and uses a default', function () {
      [[undefined, 1000], [5000, 2000], [-1, 1]].forEach(([timeout, expected]) => {
        expect(JSON.parse(spec.buildRequests([bidRequest()], { ...bidderRequest(), timeout })[0].data).tmax).to.equal(expected);
      });
    });
  });
  describe('responses and lifecycle', function () {
    it('returns the creative untouched, publisher net CPM and validated callbacks', function () {
      const [bid] = spec.interpretResponse({ body: bidResponse() }, request());
      expect(bid).to.include({ requestId: 'bid-1', cpm: 0.25, currency: 'USD', creativeId: 'creative-1', width: 300, height: 250, netRevenue: true, ttl: 60, mediaType: 'banner', ad: '<div>Srchbid test banner</div>' });
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.example']);
      expect(bid.srchbidLifecycle).to.deep.equal({ win: lifecycleURL('win'), render: lifecycleURL('render') });
    });
    it('rejects malformed requests and responses', function () {
      [{ data: '{' }, { data: 'null' }, { data: '{}' }].forEach(req => expect(spec.interpretResponse({ body: bidResponse() }, req)).to.deep.equal([]));
      [null, {}, { ...bidResponse(), id: 'wrong' }, { ...bidResponse(), cur: 'EUR' }, { ...bidResponse(), seatbid: {} }, { ...bidResponse(), seatbid: [null, {}, { bid: {} }] }].forEach(body => {
        expect(spec.interpretResponse({ body }, request())).to.deep.equal([]);
      });
    });
    [null, { impid: 'wrong' }, { price: 0 }, { price: -1 }, { price: '1' }, { price: NaN }, { adm: ' ' }, { crid: '' }, { w: 999 }, { adomain: [] }, { adomain: ['https://bad.example'] }, { adomain: undefined }].forEach((change, i) => {
      it(`rejects invalid bid case ${i}`, function () {
        const body = bidResponse(); body.seatbid[0].bid[0] = change === null ? null : { ...body.seatbid[0].bid[0], ...change };
        expect(spec.interpretResponse({ body }, request())).to.deep.equal([]);
      });
    });
    it('keeps a valid bid beside a malformed bid', function () {
      const body = bidResponse(); body.seatbid[0].bid.unshift(null);
      expect(spec.interpretResponse({ body }, request())).to.have.length(1);
    });
    it('does not contact anything during request or response processing', function () {
      const notify = sinon.spy(); const adapter = createSpec(notify);
      adapter.interpretResponse({ body: bidResponse() }, adapter.buildRequests([bidRequest()], bidderRequest())[0]);
      expect(notify.called).to.equal(false);
    });
    it('disables diagnostics per request while keeping a usable bid', function () {
      const notify = sinon.spy(); const adapter = createSpec(notify);
      const input = bidRequest(); input.params.lifecycleSignals = false;
      const req = adapter.buildRequests([input], bidderRequest())[0];
      expect(JSON.parse(req.data).ext.bidtags_lifecycle).to.equal(0);
      const [bid] = adapter.interpretResponse({ body: bidResponse() }, req);
      expect(bid.cpm).to.equal(0.25);
      adapter.onBidWon(bid); adapter.onAdRenderSucceeded(bid);
      expect(notify.called).to.equal(false);
    });
    it('notifies once per event, tolerates failures, and keeps instances independent', function () {
      const notify = sinon.stub().throws(new Error('offline'));
      const one = createSpec(notify); const otherNotify = sinon.spy(); const two = createSpec(otherNotify);
      const [bid] = one.interpretResponse({ body: bidResponse() }, request());
      expect(() => { one.onBidWon(bid); one.onBidWon(bid); one.onAdRenderSucceeded(bid); }).not.to.throw();
      expect(notify.callCount).to.equal(2);
      two.onBidWon(bid); expect(otherNotify.calledOnceWithExactly(lifecycleURL('win'))).to.equal(true);
      one.onBidWon(null); one.onAdRenderSucceeded({});
      expect(notify.callCount).to.equal(2);
    });
    it('restricts callbacks to signed lifecycle paths on the fixed HTTPS host', function () {
      const unsafe = ['https://evil.example/a', lifecycleURL('render'), lifecycleURL('win') + '?extra=1', lifecycleURL('win') + '#x', lifecycleURL('win').replace('https:', 'http:'), lifecycleURL('win').replace('https://', 'https://user:pass@'), 'bad-url'];
      unsafe.forEach(url => {
        const notify = sinon.spy(); const adapter = createSpec(notify); const body = bidResponse();
        body.seatbid[0].bid[0].ext.bidtags_lifecycle.win = url;
        const [bid] = adapter.interpretResponse({ body }, request());
        adapter.onBidWon(bid); expect(notify.called).to.equal(false);
      });
    });
    it('accepts bids without diagnostics and never invokes nurl or burl', function () {
      const notify = sinon.spy(); const adapter = createSpec(notify); const body = bidResponse();
      delete body.seatbid[0].bid[0].ext;
      body.seatbid[0].bid[0].nurl = 'https://advertiser.example/win';
      body.seatbid[0].bid[0].burl = 'https://advertiser.example/bill';
      const [bid] = adapter.interpretResponse({ body }, request());
      adapter.onBidWon(bid); adapter.onAdRenderSucceeded(bid);
      expect(notify.called).to.equal(false);
    });
    it('uses Prebid ajax without credentials and with keepalive', function () {
      const [bid] = spec.interpretResponse({ body: bidResponse() }, request());
      spec.onBidWon(bid);
      spec.onAdRenderSucceeded(bid);
      const calls = server.requests.filter(req => req.url.startsWith('https://bid.searchplan.co/display-lifecycle/'));
      expect(calls).to.have.length(2);
      expect(calls[0].url).to.equal(lifecycleURL('win'));
      expect(calls[1].url).to.equal(lifecycleURL('render'));
      calls.forEach(req => {
        expect(req.method).to.equal('GET');
        expect(req.withCredentials).to.equal(false);
        expect(req.fetch.request.keepalive).to.equal(true);
      });
      calls[0].respond(200, {}, '');
      calls[1].error();
    });
  });
});
