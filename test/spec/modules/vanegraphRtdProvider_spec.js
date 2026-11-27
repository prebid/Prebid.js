import { vanegraphSubmodule, pageUrl, setGptTargeting, consentMissing, GPT_KEYS } from 'modules/vanegraphRtdProvider.js';
import { server } from 'test/mocks/xhr.js';

const KEY = 'pk_test123';

function readyResponse() {
  return {
    status: 'ready',
    url: 'https://news.example.pl/article',
    ortb2: {
      site: {
        content: {
          cattax: 9,
          cat: ['22', '30'],
          data: [
            { name: 'vanegraph.com', ext: { segtax: 9 }, segment: [{ id: '22' }, { id: '30' }] },
            { name: 'vanegraph.com', segment: [{ id: 'vg-safety-none' }, { id: 'vg-intent-commercial_investigation' }] }
          ],
          language: 'pl'
        }
      }
    },
    targeting: { vg_cat: ['22', '30'], vg_safety: 'none', vg_intent: 'commercial_investigation' }
  };
}

// A stand-in for googletag.pubads() that keeps page-level key-values, as GPT does across single-page-app navigations.
function fakePubads() {
  const kv = {};
  return { kv, setTargeting: (k, v) => { kv[k] = v; }, clearTargeting: (k) => { delete kv[k]; } };
}
function runGptQueue(pubads) {
  window.googletag.pubads = () => pubads;
  window.googletag.cmd.splice(0).forEach((fn) => fn());
}

function bidConfig() {
  return { ortb2Fragments: { global: { site: { page: 'https://news.example.pl/article' } }, bidder: {} } };
}

describe('vanegraphRtdProvider', function () {
  describe('init', function () {
    it('requires a publishable key', function () {
      expect(vanegraphSubmodule.init({ params: { publishableKey: KEY } })).to.equal(true);
      expect(vanegraphSubmodule.init({ params: {} })).to.equal(false);
      expect(vanegraphSubmodule.init({ params: { publishableKey: 'ak_secret' } })).to.equal(false);
      expect(vanegraphSubmodule.init({})).to.equal(false);
    });

    it('is named vanegraph', function () {
      expect(vanegraphSubmodule.name).to.equal('vanegraph');
    });
  });

  describe('pageUrl', function () {
    it('drops the query string and fragment by default', function () {
      expect(pageUrl({ url: 'https://a.example.pl/x?token=secret&y=1#comments' })).to.equal('https://a.example.pl/x');
    });

    it('keeps only the query parameters the publisher lists', function () {
      expect(pageUrl({ url: 'https://a.example.pl/article?id=123&session=abc#top', keepParams: ['id'] })).to.equal('https://a.example.pl/article?id=123');
      expect(pageUrl({ url: 'https://a.example.pl/article?session=abc', keepParams: ['id'] })).to.equal('https://a.example.pl/article');
    });
  });

  describe('consentMissing', function () {
    it('is true only when GDPR applies without a consent string', function () {
      expect(consentMissing({ gdpr: { gdprApplies: true } })).to.equal(true);
      expect(consentMissing({ gdpr: { gdprApplies: true, consentString: 'CPabc' } })).to.equal(false);
      expect(consentMissing({ gdpr: { gdprApplies: false } })).to.equal(false);
      expect(consentMissing(undefined)).to.equal(false);
    });
  });

  describe('getBidRequestData', function () {
    let savedGoogletag;
    beforeEach(function () {
      savedGoogletag = window.googletag;
      window.googletag = { cmd: [] };
    });
    afterEach(function () {
      window.googletag = savedGoogletag;
    });

    it('asks the API for the page with the publishable key, without query or fragment', function () {
      const callback = sinon.spy();
      vanegraphSubmodule.getBidRequestData(bidConfig(), callback, { params: { publishableKey: KEY, url: 'https://news.example.pl/article?reset=tok123#top' } });
      const request = server.requests[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.equal(`https://api.vanegraph.com/v1/rtd?key=${KEY}&url=${encodeURIComponent('https://news.example.pl/article')}`);
      expect(request.withCredentials).to.not.equal(true);
    });

    it('makes no request when GDPR applies and there is no consent string', function () {
      const callback = sinon.spy();
      vanegraphSubmodule.getBidRequestData(bidConfig(), callback, { params: { publishableKey: KEY } }, { gdpr: { gdprApplies: true } });
      expect(server.requests.length).to.equal(0);
      expect(callback.calledOnce).to.equal(true);
    });

    it('clears its GAM key-values when consent is missing, so earlier labels do not carry over', function () {
      const pubads = fakePubads();
      pubads.setTargeting('vg_safety', 'none');
      pubads.setTargeting('pos', 'top');
      vanegraphSubmodule.getBidRequestData(bidConfig(), sinon.spy(), { params: { publishableKey: KEY } }, { gdpr: { gdprApplies: true } });
      runGptQueue(pubads);
      expect(pubads.kv).to.deep.equal({ pos: 'top' });
    });

    it('leaves the publisher\'s own categories in another taxonomy untouched', function () {
      const callback = sinon.spy();
      const reqBidsConfigObj = { ortb2Fragments: { global: { site: { content: { cattax: 6, cat: ['IAB2'] } } }, bidder: {} } };
      vanegraphSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: { publishableKey: KEY, setGptTargeting: false } });
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(readyResponse()));
      const content = reqBidsConfigObj.ortb2Fragments.global.site.content;
      expect(content.cattax).to.equal(6);
      expect(content.cat).to.deep.equal(['IAB2']);
      expect(content.data[0].ext.segtax).to.equal(9);
      expect(content.data[0].segment.map((s) => s.id)).to.deep.equal(['22', '30']);
    });

    it('merges labels into ortb2 and queues GAM key-values when the page is classified', function () {
      const callback = sinon.spy();
      const reqBidsConfigObj = bidConfig();
      vanegraphSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: { publishableKey: KEY } });
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(readyResponse()));

      expect(callback.calledOnce).to.equal(true);
      const site = reqBidsConfigObj.ortb2Fragments.global.site;
      expect(site.page).to.equal('https://news.example.pl/article');
      expect(site.content.cattax).to.equal(9);
      expect(site.content.cat).to.deep.equal(['22', '30']);
      expect(site.content.data[0].ext.segtax).to.equal(9);
      expect(window.googletag.cmd.length).to.equal(1);

      const pubads = fakePubads();
      runGptQueue(pubads);
      expect(pubads.kv).to.deep.equal({ vg_cat: ['22', '30'], vg_safety: 'none', vg_intent: 'commercial_investigation' });
    });

    it('does not leave the previous page\'s key-values when the next page is still pending (single-page apps)', function () {
      const pubads = fakePubads();
      pubads.setTargeting('pos', 'top'); // the publisher's own key stays
      const a = readyResponse();
      a.targeting.vg_seg = ['seg_ev_pl'];
      vanegraphSubmodule.getBidRequestData(bidConfig(), sinon.spy(), { params: { publishableKey: KEY } });
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(a));
      runGptQueue(pubads);
      expect(pubads.kv.vg_safety).to.equal('none');
      expect(pubads.kv.vg_seg).to.deep.equal(['seg_ev_pl']);

      const callback = sinon.spy();
      vanegraphSubmodule.getBidRequestData(bidConfig(), callback, { params: { publishableKey: KEY, url: 'https://news.example.pl/next' } });
      server.requests[1].respond(202, { 'Content-Type': 'application/json' }, JSON.stringify({ status: 'pending' }));
      runGptQueue(pubads);
      expect(callback.calledOnce).to.equal(true);
      expect(pubads.kv).to.deep.equal({ pos: 'top' });
    });

    it('drops the previous page\'s segments when the next page has none', function () {
      const pubads = fakePubads();
      const a = readyResponse();
      a.targeting.vg_seg = ['seg_ev_pl'];
      vanegraphSubmodule.getBidRequestData(bidConfig(), sinon.spy(), { params: { publishableKey: KEY } });
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(a));
      vanegraphSubmodule.getBidRequestData(bidConfig(), sinon.spy(), { params: { publishableKey: KEY } });
      server.requests[1].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(readyResponse()));
      runGptQueue(pubads);
      expect(pubads.kv).to.deep.equal({ vg_cat: ['22', '30'], vg_safety: 'none', vg_intent: 'commercial_investigation' });
    });

    it('clears its key-values when the request fails', function () {
      const pubads = fakePubads();
      pubads.setTargeting('vg_safety', 'none');
      vanegraphSubmodule.getBidRequestData(bidConfig(), sinon.spy(), { params: { publishableKey: KEY } });
      server.requests[0].respond(403, { 'Content-Type': 'application/json' }, '{"error":{"code":"domain_not_allowed"}}');
      runGptQueue(pubads);
      expect(Object.keys(pubads.kv).filter((k) => GPT_KEYS.includes(k))).to.deep.equal([]);
    });

    it('can leave GAM targeting alone', function () {
      const callback = sinon.spy();
      vanegraphSubmodule.getBidRequestData(bidConfig(), callback, { params: { publishableKey: KEY, setGptTargeting: false } });
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(readyResponse()));
      expect(callback.calledOnce).to.equal(true);
      expect(window.googletag.cmd.length).to.equal(0);
    });

    it('adds nothing while a new page is still being classified', function () {
      const callback = sinon.spy();
      const reqBidsConfigObj = bidConfig();
      vanegraphSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: { publishableKey: KEY } });
      server.requests[0].respond(202, { 'Content-Type': 'application/json' }, JSON.stringify({ status: 'pending' }));
      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global.site.content).to.equal(undefined);
      const pubads = fakePubads();
      pubads.setTargeting('vg_safety', 'none');
      runGptQueue(pubads);
      expect(pubads.kv).to.deep.equal({});
    });

    it('never blocks the auction on errors', function () {
      const callback = sinon.spy();
      vanegraphSubmodule.getBidRequestData(bidConfig(), callback, { params: { publishableKey: KEY } });
      server.requests[0].respond(403, { 'Content-Type': 'application/json' }, '{"error":{"code":"domain_not_allowed"}}');
      expect(callback.calledOnce).to.equal(true);

      const callback2 = sinon.spy();
      vanegraphSubmodule.getBidRequestData(bidConfig(), callback2, { params: { publishableKey: KEY } });
      server.requests[1].respond(200, { 'Content-Type': 'application/json' }, 'not json');
      expect(callback2.calledOnce).to.equal(true);
    });

    it('uses a custom endpoint when given', function () {
      vanegraphSubmodule.getBidRequestData(bidConfig(), sinon.spy(), { params: { publishableKey: KEY, endpoint: 'https://eu.api.vanegraph.com/v1/rtd' } });
      expect(server.requests[0].url.indexOf('https://eu.api.vanegraph.com/v1/rtd?key=')).to.equal(0);
    });
  });

  describe('setGptTargeting', function () {
    it('ignores empty targeting', function () {
      const saved = window.googletag;
      window.googletag = { cmd: [] };
      setGptTargeting(undefined);
      expect(window.googletag.cmd.length).to.equal(0);
      window.googletag = saved;
    });
  });
});
