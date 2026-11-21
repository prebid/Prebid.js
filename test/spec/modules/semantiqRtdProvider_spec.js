import { convertSemantiqKeywordToOrtb, getOrtbKeywords, semantiqRtdSubmodule, storage } from '../../../modules/semantiqRtdProvider.ts';
import { expect } from 'chai';
import { server } from '../../mocks/xhr.js';
import * as utils from '../../../src/utils.js';

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('semantiqRtdProvider', () => {
  let clock;
  let getDataFromSessionStorage;
  let getWindowLocationStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    getDataFromSessionStorage = sinon.stub(storage, 'getDataFromSessionStorage').returns(null);
    getWindowLocationStub = sinon.stub(utils, 'getWindowLocation').returns(new URL('https://example.com/article'));
  });

  afterEach(() => {
    clock.restore();
    getDataFromSessionStorage.restore();
    getWindowLocationStub.restore();
  });

  describe('init', () => {
    it('returns true on initialization', () => {
      const initResult = semantiqRtdSubmodule.init({});
      expect(initResult).to.be.true;
    });
  });

  describe('pageImpression event', () => {
    it('dispatches an event on initialization', () => {
      getWindowLocationStub.returns(new URL('https://example.com/article'));

      semantiqRtdSubmodule.init({ params: { companyId: 5 } });

      const body = JSON.parse(server.requests[0].requestBody);

      expect(server.requests[0].url).to.be.equal('https://api.adnz.co/api/ws-clickstream-collector/submit');
      expect(server.requests[0].method).to.be.equal('POST');

      expect(body.company_id).to.be.equal(5);
      expect(body.event_id).not.to.be.empty;
      expect(body.event_timestamp).not.to.be.empty;
      expect(body.event_type).to.be.equal('pageImpression');
      expect(body.page_impression_id).not.to.be.empty;
      expect(body.source).to.be.equal('semantiqPrebidModule');
      expect(body.page_url).to.be.equal('https://example.com/article');
    });

    it('uses the correct company ID', () => {
      semantiqRtdSubmodule.init({ params: { companyId: 555 } });
      semantiqRtdSubmodule.init({ params: { companyId: [111, 222, 333] } });

      const body1 = JSON.parse(server.requests[0].requestBody);
      const body2 = JSON.parse(server.requests[1].requestBody);

      expect(body1.company_id).to.be.equal(555);
      expect(body2.company_id).to.be.equal(111);
    });

    it('uses cached page impression ID if present', () => {
      window.audienzz = { collectorPageImpressionId: 'cached-guid' };
      semantiqRtdSubmodule.init({ params: { companyId: 5 } });

      const body = JSON.parse(server.requests[0].requestBody);

      expect(body.page_impression_id).to.be.equal('cached-guid');
    });
  });

  describe('convertSemantiqKeywordToOrtb', () => {
    it('converts SemantIQ keywords properly', () => {
      expect(convertSemantiqKeywordToOrtb('foo', 'bar')).to.be.equal('foo=bar');
      expect(convertSemantiqKeywordToOrtb('foo', ['bar', 'baz'])).to.be.equal('foo=bar,foo=baz');
    });

    it('returns an empty string if keyword value is empty', () => {
      expect(convertSemantiqKeywordToOrtb('foo', '')).to.be.equal('');
      expect(convertSemantiqKeywordToOrtb('foo', [])).to.be.equal('');
    });
  });

  describe('getOrtbKeywords', () => {
    it('returns an empty string if no keywords are provided', () => {
      expect(getOrtbKeywords({})).to.be.equal('');
    });

    it('converts keywords to ORTB format', () => {
      expect(getOrtbKeywords({ foo: 'bar', fizz: ['buzz', 'quz'] })).to.be.equal('foo=bar,fizz=buzz,fizz=quz');
    });

    it('ignores keywords with no value', () => {
      expect(getOrtbKeywords({ foo: 'bar', fizz: ['buzz', 'quz'], baz: '', xyz: [], quz: undefined, buzz: null })).to.be.equal('foo=bar,fizz=buzz,fizz=quz');
    });
  });

  describe('getBidRequestData', () => {
    it('requests data with correct parameters', async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
      };

      semantiqRtdSubmodule.getBidRequestData(
        reqBidsConfigObj,
        () => undefined,
        { params: {} },
        {}
      );

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({})
      );

      const requestUrl = new URL(server.requests[0].url);

      expect(requestUrl.host).to.be.equal('api.adnz.co');
      expect(requestUrl.searchParams.get('url')).to.be.equal('https://example.com/article');
      expect(requestUrl.searchParams.get('tenantIds')).to.be.equal('1');
    });

    it('allows to specify company ID as a parameter', async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
      };

      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(
        reqBidsConfigObj,
        () => {
          onDoneSpy();
          resolve();
        },
        { params: { companyId: 13 } },
        {}
      ));

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({})
      );

      await promise;

      const requestUrl = new URL(server.requests[0].url);

      expect(requestUrl.searchParams.get('tenantIds')).to.be.equal('13');
    });

    it('allows to specify multiple company IDs as a parameter', async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
      };

      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(
        reqBidsConfigObj,
        () => {
          onDoneSpy();
          resolve();
        },
        { params: { companyId: [13, 23] } },
        {}
      ));

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({})
      );

      await promise;

      const requestUrl = new URL(server.requests[0].url);

      expect(requestUrl.searchParams.get('tenantIds')).to.be.equal('13,23');
    });

    it('drops a falsy company id from a list that also has a real id', async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
      };

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(
        reqBidsConfigObj,
        resolve,
        { params: { companyId: [0, 5] } },
        {}
      ));

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({})
      );

      await promise;

      const requestUrl = new URL(server.requests[0].url);

      expect(requestUrl.searchParams.get('tenantIds')).to.be.equal('5');
    });

    it('falls back when every company id is falsy', async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
      };

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(
        reqBidsConfigObj,
        resolve,
        { params: { companyId: 0 } },
        {}
      ));

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({})
      );

      await promise;

      const requestUrl = new URL(server.requests[0].url);

      expect(requestUrl.searchParams.get('tenantIds')).to.be.equal('1');
    });

    it('gets keywords from the cache if the data is present in the storage', async () => {
      getDataFromSessionStorage.returns(JSON.stringify({ url: 'https://example.com/article', keywords: { sentiment: 'negative', ctx_segment: ['C001', 'C002'] } }));

      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {
          global: {},
        }
      };

      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(
        reqBidsConfigObj,
        () => {
          onDoneSpy();
          resolve();
        },
        { params: {} },
        {}
      ));

      await promise;

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(server.requests).to.have.lengthOf(0);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({ site: { keywords: 'sentiment=negative,ctx_segment=C001,ctx_segment=C002' } });
    });

    it('requests keywords from the server if the URL of the page is different from the cached one', async () => {
      getDataFromSessionStorage.returns(JSON.stringify({ url: 'https://example.com/article', keywords: { cached: 'true' } }));
      getWindowLocationStub.returns(new URL('https://example.com/another-article'));

      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {
          global: {},
        }
      };

      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(
        reqBidsConfigObj,
        () => {
          onDoneSpy();
          resolve();
        },
        { params: {} },
        {}
      ));

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ server: 'true' })
      );

      await promise;

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({ site: { keywords: 'server=true' } });
    });

    it('requests keywords from the server if the cached data is missing in the storage', async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {
          global: {},
        },
      };

      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(
        reqBidsConfigObj,
        () => {
          onDoneSpy();
          resolve();
        },
        { params: {} },
        {}
      ));

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ sentiment: 'negative', ctx_segment: ['C001', 'C002'] })
      );

      await promise;

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({ site: { keywords: 'sentiment=negative,ctx_segment=C001,ctx_segment=C002' } });
    });

    it('merges ORTB site keywords if they are present', async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {
          global: {
            site: {
              keywords: 'iab_category=politics',
            }
          },
        },
      };

      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(
        reqBidsConfigObj,
        () => {
          onDoneSpy();
          resolve();
        },
        { params: {} },
        {}
      ));

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ sentiment: 'negative', ctx_segment: ['C001', 'C002'] })
      );

      await promise;

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({ site: { keywords: 'iab_category=politics,sentiment=negative,ctx_segment=C001,ctx_segment=C002' } });
    });

    it("won't modify ortb2 if no ad units are provided", async () => {
      const reqBidsConfigObj = {
        adUnits: [],
        ortb2Fragments: {
          global: {}
        }
      };

      const onDoneSpy = sinon.spy();

      semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, { params: {} }, {});
      await flushPromises();

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(server.requests).to.have.lengthOf(0);
      expect(reqBidsConfigObj).to.deep.equal({
        adUnits: [],
        ortb2Fragments: {
          global: {}
        }
      });
    });

    it("won't modify ortb2 if response is broken", async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {}
      };
      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => {
        semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, () => {
          onDoneSpy();
          resolve();
        }, { params: {} }, {});
      });

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        '{'
      );

      await promise;

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(reqBidsConfigObj).to.deep.equal({
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {}
      });
    });

    it("won't modify ortb2 if response status is not 200", async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {}
      };
      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => {
        semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, () => {
          onDoneSpy();
          resolve();
        }, { params: {} }, {});
      });

      server.requests[0].respond(
        204,
        { 'Content-Type': 'application/json' },
      );

      await promise;

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(reqBidsConfigObj).to.deep.equal({
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {}
      });
    });

    it("won't modify ortb2 if an error occurs during the request", async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {}
      };
      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => {
        semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, () => {
          onDoneSpy();
          resolve();
        }, { params: {} }, {});
      });

      server.requests[0].respond(
        500,
        { 'Content-Type': 'application/json' },
        '{}'
      );

      await promise;

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(reqBidsConfigObj).to.deep.equal({
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {},
      });
    });

    it("won't modify ortb2 if response time hits timeout", async () => {
      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {
          global: {}
        },
      };
      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        onDoneSpy();
        resolve();
      }, { params: { timeout: 500 } }, {}));

      clock.tick(510);

      await promise;

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ sentiment: 'negative' })
      );
      await flushPromises();

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(reqBidsConfigObj).to.deep.equal({
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {
          global: {}
        },
      });
    });

    it('logs an error thrown while writing ortb2 and still calls onDone once', async () => {
      const error = new Error('merge failed');
      const mergeDeepStub = sinon.stub(utils, 'mergeDeep').throws(error);
      const logErrorStub = sinon.stub(utils, 'logError');
      const onDoneSpy = sinon.spy();

      try {
        const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData({
          adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
          ortb2Fragments: { global: {} },
        }, () => {
          onDoneSpy();
          resolve();
        }, { params: {} }, {}));

        server.requests[0].respond(
          200,
          { 'Content-Type': 'application/json' },
          JSON.stringify({ sentiment: 'negative' })
        );

        await promise;

        expect(onDoneSpy.calledOnce).to.be.true;
        expect(logErrorStub.calledOnceWith(sinon.match.string, error)).to.be.true;
      } finally {
        mergeDeepStub.restore();
        logErrorStub.restore();
      }
    });

    it('does not log a failed keyword request twice', async () => {
      const logErrorStub = sinon.stub(utils, 'logError');

      try {
        const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData({
          adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
          ortb2Fragments: { global: {} },
        }, resolve, { params: {} }, {}));

        server.requests[0].respond(204, { 'Content-Type': 'application/json' });

        await promise;

        expect(logErrorStub.calledOnceWith(sinon.match.string, 'Invalid response status')).to.be.true;
      } finally {
        logErrorStub.restore();
      }
    });

    describe('IAB categories', () => {
      const IAB_KEYWORDS = {
        iab_category_id: ['386', '387'],
        iab2_category_id: ['123'],
        sentiment: 'positive',
        ctx_segment: ['C001'],
      };

      const getGlobalOrtb = async (keywords, global = {}) => {
        const reqBidsConfigObj = {
          adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
          ortb2Fragments: { global },
        };

        const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, resolve, { params: {} }, {}));

        server.requests[0].respond(
          200,
          { 'Content-Type': 'application/json' },
          JSON.stringify(keywords)
        );

        await promise;

        return reqBidsConfigObj.ortb2Fragments.global;
      };

      it('writes both taxonomies to site.content.data', async () => {
        const global = await getGlobalOrtb(IAB_KEYWORDS);

        expect(global.site).to.deep.equal({
          keywords: 'iab_category_id=386,iab_category_id=387,iab2_category_id=123,sentiment=positive,ctx_segment=C001',
          content: {
            data: [
              { name: 'semantiq', ext: { segtax: 6 }, segment: [{ id: '123' }] },
              { name: 'semantiq', ext: { segtax: 7 }, segment: [{ id: '386' }, { id: '387' }] },
            ],
          },
        });
      });

      it('handles a page-keywords response with single category ids', async () => {
        const global = await getGlobalOrtb({
          sentiment: 'negative',
          iab_category_id: '386',
          iab_category: 'politics',
          ctx_segment: [],
          adnz_news_type: [],
          iab2_category: 'news and politics',
          iab2_category_id: '379',
        });

        expect(global.site).to.deep.equal({
          keywords: 'sentiment=negative,iab_category_id=386,iab_category=politics,iab2_category=news and politics,iab2_category_id=379',
          content: {
            data: [
              { name: 'semantiq', ext: { segtax: 6 }, segment: [{ id: '379' }] },
              { name: 'semantiq', ext: { segtax: 7 }, segment: [{ id: '386' }] },
            ],
          },
        });
      });

      it('skips a taxonomy without ids and drops blank and duplicate ids', async () => {
        const global = await getGlobalOrtb({ iab_category_id: ['386', ' ', '', '386', ' 387 '], iab2_category_id: [] });

        expect(global.site.content.data).to.deep.equal([
          { name: 'semantiq', ext: { segtax: 7 }, segment: [{ id: '386' }, { id: '387' }] },
        ]);
      });

      it('accepts a single category id as a string and skips a null one', async () => {
        const global = await getGlobalOrtb({ iab_category_id: '386', iab2_category_id: null });

        expect(global.site.content.data).to.deep.equal([
          { name: 'semantiq', ext: { segtax: 7 }, segment: [{ id: '386' }] },
        ]);
      });

      it('does not write site.content.data without IAB fields', async () => {
        const global = await getGlobalOrtb({ sentiment: 'positive', ctx_segment: ['C001'] });

        expect(global).to.deep.equal({ site: { keywords: 'sentiment=positive,ctx_segment=C001' } });
      });

      it('keeps existing site.content.data and keywords', async () => {
        const publisherData = { name: 'publisher', segment: [{ id: 'news' }] };
        const global = await getGlobalOrtb(IAB_KEYWORDS, {
          site: { keywords: 'section=news', content: { data: [publisherData] } },
        });

        expect(global.site.keywords).to.equal('section=news,iab_category_id=386,iab_category_id=387,iab2_category_id=123,sentiment=positive,ctx_segment=C001');
        expect(global.site.content.data).to.deep.equal([
          publisherData,
          { name: 'semantiq', ext: { segtax: 6 }, segment: [{ id: '123' }] },
          { name: 'semantiq', ext: { segtax: 7 }, segment: [{ id: '386' }, { id: '387' }] },
        ]);
      });

      it('does not write site.cat or site.cattax without site.cattax', async () => {
        const global = await getGlobalOrtb(IAB_KEYWORDS);

        expect(global.site).not.to.have.any.keys('cat', 'cattax');
      });

      it('leaves publisher categories without site.cattax alone', async () => {
        const global = await getGlobalOrtb(IAB_KEYWORDS, {
          site: { cat: ['IAB1'], pagecat: ['IAB1-1'] },
        });

        expect(global.site.cat).to.deep.equal(['IAB1']);
        expect(global.site.pagecat).to.deep.equal(['IAB1-1']);
        expect(global.site).not.to.have.property('cattax');
      });

      [
        { cattax: 6, cat: ['123'] },
        { cattax: 7, cat: ['386', '387'] },
      ].forEach(({ cattax, cat }) => {
        it(`writes site.cat in the publisher's site.cattax ${cattax}`, async () => {
          const global = await getGlobalOrtb(IAB_KEYWORDS, { site: { cattax } });

          expect(global.site.cat).to.deep.equal(cat);
          expect(global.site.cattax).to.equal(cattax);
        });
      });

      it('appends to the publisher site.cat in the same taxonomy', async () => {
        const global = await getGlobalOrtb(IAB_KEYWORDS, {
          site: { cat: ['1', '386'], cattax: 7 },
        });

        expect(global.site.cat).to.deep.equal(['1', '386', '387']);
        expect(global.site.cattax).to.equal(7);
      });

      it('leaves site.cat alone when site.cattax is another taxonomy', async () => {
        const global = await getGlobalOrtb(IAB_KEYWORDS, {
          site: { cat: ['IAB1'], cattax: 1 },
        });

        expect(global.site.cat).to.deep.equal(['IAB1']);
        expect(global.site.cattax).to.equal(1);
      });

      it('does not write site.cat when the taxonomy has no ids', async () => {
        const global = await getGlobalOrtb({ iab_category_id: ['386'] }, { site: { cattax: 6 } });

        expect(global.site).not.to.have.property('cat');
      });
    });
  });
});
