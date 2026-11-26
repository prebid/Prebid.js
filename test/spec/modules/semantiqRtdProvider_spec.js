import { convertSemantiqKeywordToOrtb, getOrtbKeywords, reset, semantiqRtdSubmodule, storage } from '../../../modules/semantiqRtdProvider.ts';
import { expect } from 'chai';
import { server } from '../../mocks/xhr.js';
import * as utils from '../../../src/utils.js';
import { registerActivityControl } from '../../../src/activities/rules.js';
import { ACTIVITY_REPORT_ANALYTICS } from '../../../src/activities/activities.js';

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('semantiqRtdProvider', () => {
  let clock;
  let getDataFromSessionStorage;
  let setDataInSessionStorage;
  let getWindowLocationStub;
  let runBackgroundTaskStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    getDataFromSessionStorage = sinon.stub(storage, 'getDataFromSessionStorage').returns(null);
    setDataInSessionStorage = sinon.stub(storage, 'setDataInSessionStorage');
    getWindowLocationStub = sinon.stub(utils, 'getWindowLocation').returns(new URL('https://example.com/article'));
    runBackgroundTaskStub = sinon.stub(utils, 'runBackgroundTask');
    reset();
  });

  afterEach(() => {
    clock.restore();
    getDataFromSessionStorage.restore();
    setDataInSessionStorage.restore();
    getWindowLocationStub.restore();
    runBackgroundTaskStub.restore();
  });

  describe('init', () => {
    it('returns true on initialization', () => {
      const initResult = semantiqRtdSubmodule.init({});
      expect(initResult).to.be.true;
    });
  });

  describe('pageImpression event', () => {
    const COLLECTOR_URL = 'https://api.adnz.co/api/ws-clickstream-collector/submit';
    const SPA_PARAMS = { companyId: 5, trackSpaPages: true };

    const startAuction = (params = { companyId: 5 }, adUnits = [{ bids: [{ bidder: 'appnexus' }] }]) => semantiqRtdSubmodule.getBidRequestData(
      { adUnits, ortb2Fragments: { global: {} } },
      () => undefined,
      { params },
      {}
    );
    const getCollectorRequests = () => server.requests.filter((request) => request.url === COLLECTOR_URL);
    const getEvents = () => getCollectorRequests().map((request) => JSON.parse(request.requestBody));

    beforeEach(() => {
      runBackgroundTaskStub.callsFake((task) => task());
    });

    it('does not dispatch an event on initialization', () => {
      semantiqRtdSubmodule.init({ params: { companyId: 5 } });

      expect(getEvents()).to.have.lengthOf(0);
    });

    it('dispatches an event on the first auction', () => {
      startAuction();

      const [request] = getCollectorRequests();
      const body = JSON.parse(request.requestBody);

      expect(request.method).to.be.equal('POST');
      expect(request.requestHeaders['Content-Type']).to.match(/^text\/plain/);

      expect(body.company_id).to.be.equal(5);
      expect(body.event_id).not.to.be.empty;
      expect(body.event_timestamp).not.to.be.empty;
      expect(body.event_type).to.be.equal('pageImpression');
      expect(body.page_impression_id).not.to.be.empty;
      expect(body.source).to.be.equal('semantiqPrebidModule');
      expect(body.page_url).to.be.equal('https://example.com/article');
    });

    it('dispatches the event as a background task', () => {
      runBackgroundTaskStub.resetBehavior();

      startAuction();

      expect(runBackgroundTaskStub.calledOnce).to.be.true;
      expect(getEvents()).to.have.lengthOf(0);

      runBackgroundTaskStub.firstCall.args[0]();

      expect(getEvents()).to.have.lengthOf(1);
    });

    it('dispatches an event when the auction has no ad units', () => {
      startAuction({ companyId: 5 }, []);

      expect(getEvents()).to.have.lengthOf(1);
    });

    it('uses the first company ID', () => {
      startAuction({ companyId: [111, 222, 333] });

      expect(getEvents()[0].company_id).to.be.equal(111);
    });

    it('does not dispatch an event again for the same page', () => {
      startAuction();
      startAuction();

      expect(getEvents()).to.have.lengthOf(1);
    });

    [
      'https://example.com/article#comments',
      'https://example.com/article?utm_source=newsletter',
    ].forEach((url) => {
      it(`does not count ${url} as a new page`, () => {
        startAuction(SPA_PARAMS);
        getWindowLocationStub.returns(new URL(url));
        startAuction(SPA_PARAMS);

        expect(getEvents()).to.have.lengthOf(1);
      });
    });

    it('dispatches one event per page load by default', () => {
      startAuction();
      getWindowLocationStub.returns(new URL('https://example.com/another-article'));
      startAuction();

      expect(getEvents()).to.have.lengthOf(1);
    });

    it('dispatches an event with a new page impression ID when the page changes and trackSpaPages is set', () => {
      startAuction(SPA_PARAMS);
      getWindowLocationStub.returns(new URL('https://example.com/another-article?utm_source=newsletter'));
      startAuction(SPA_PARAMS);

      const [first, second] = getEvents();

      expect(second.page_url).to.be.equal('https://example.com/another-article');
      expect(second.page_impression_id).not.to.be.equal(first.page_impression_id);
    });

    it('does not dispatch an event when reporting is not allowed', () => {
      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', (params) =>
        params.componentName === 'semantiq' ? { allow: false } : undefined);

      try {
        startAuction();

        expect(getEvents()).to.have.lengthOf(0);
      } finally {
        unregister();
      }
    });

    it('dispatches an event once reporting becomes allowed on the same page', () => {
      const rule = sinon.stub().returns({ allow: false });
      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', rule);

      try {
        startAuction();
        rule.returns(undefined);
        startAuction();
        startAuction();

        expect(getEvents()).to.have.lengthOf(1);
      } finally {
        unregister();
      }
    });

    it('dispatches the single event for the page where reporting becomes allowed', () => {
      const rule = sinon.stub().returns({ allow: false });
      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', rule);

      try {
        startAuction();
        getWindowLocationStub.returns(new URL('https://example.com/another-article'));
        rule.returns(undefined);
        startAuction();
        startAuction();

        const events = getEvents();

        expect(events).to.have.lengthOf(1);
        expect(events[0].page_url).to.be.equal('https://example.com/another-article');
      } finally {
        unregister();
      }
    });

    it('counts a page as new again after a page where reporting was not allowed', () => {
      const rule = sinon.stub().returns(undefined);
      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', rule);

      try {
        startAuction(SPA_PARAMS);
        getWindowLocationStub.returns(new URL('https://example.com/another-article'));
        rule.returns({ allow: false });
        startAuction(SPA_PARAMS);
        getWindowLocationStub.returns(new URL('https://example.com/article'));
        rule.returns(undefined);
        startAuction(SPA_PARAMS);

        expect(getEvents().map((event) => event.page_url)).to.deep.equal([
          'https://example.com/article',
          'https://example.com/article',
        ]);
      } finally {
        unregister();
      }
    });

    it('does not dispatch a queued event when reporting is no longer allowed', () => {
      runBackgroundTaskStub.resetBehavior();
      startAuction();

      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', () => ({ allow: false }));

      try {
        runBackgroundTaskStub.firstCall.args[0]();

        expect(getEvents()).to.have.lengthOf(0);
      } finally {
        unregister();
      }
    });

    it('dispatches the event on a later auction after a queued event was skipped for consent', () => {
      runBackgroundTaskStub.resetBehavior();
      startAuction();

      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', () => ({ allow: false }));

      try {
        runBackgroundTaskStub.firstCall.args[0]();
      } finally {
        unregister();
      }

      runBackgroundTaskStub.callsFake((task) => task());
      startAuction();

      expect(getEvents()).to.have.lengthOf(1);
    });

    it('does not release a later visit to the same page when an earlier queued event is skipped', () => {
      runBackgroundTaskStub.resetBehavior();
      startAuction(SPA_PARAMS);
      getWindowLocationStub.returns(new URL('https://example.com/another-article'));
      startAuction(SPA_PARAMS);
      getWindowLocationStub.returns(new URL('https://example.com/article'));
      startAuction(SPA_PARAMS);

      const [firstVisit, otherPage, secondVisit] = runBackgroundTaskStub.getCalls().map((call) => call.args[0]);
      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', () => ({ allow: false }));

      try {
        firstVisit();
      } finally {
        unregister();
      }

      otherPage();
      secondVisit();
      runBackgroundTaskStub.callsFake((task) => task());
      startAuction(SPA_PARAMS);

      expect(getEvents().map((event) => event.page_url)).to.deep.equal([
        'https://example.com/another-article',
        'https://example.com/article',
      ]);
    });

    it('logs a failed event instead of rejecting', async () => {
      const logWarnStub = sinon.stub(utils, 'logWarn');

      try {
        startAuction();
        getCollectorRequests()[0].error();
        await flushPromises();

        expect(logWarnStub.calledWith(sinon.match.string, 'Failed to send the page impression')).to.be.true;
      } finally {
        logWarnStub.restore();
      }
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

    it('requests keywords for the page without its query and fragment', () => {
      getWindowLocationStub.returns(new URL('https://example.com/article?utm_source=newsletter#comments'));

      semantiqRtdSubmodule.getBidRequestData({ adUnits: [{ bids: [{ bidder: 'appnexus' }] }] }, () => undefined, { params: {} }, {});

      expect(new URL(server.requests[0].url).searchParams.get('url')).to.be.equal('https://example.com/article');
    });

    it('gets keywords from the cache when only the query changes', async () => {
      getDataFromSessionStorage.returns(JSON.stringify({ url: 'https://example.com/article', keywords: { sentiment: 'negative' } }));
      getWindowLocationStub.returns(new URL('https://example.com/article?utm_source=newsletter'));

      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: { global: {} },
      };

      await new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, resolve, { params: {} }, {}));

      expect(server.requests).to.have.lengthOf(0);
      expect(reqBidsConfigObj.ortb2Fragments.global.site.keywords).to.be.equal('sentiment=negative');
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

    it('requests keywords from the server if the cached keywords are empty', async () => {
      getDataFromSessionStorage.returns(JSON.stringify({ url: 'https://example.com/article', keywords: { ctx_segment: [], adnz_news_type: [] } }));

      const reqBidsConfigObj = {
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {
          global: {},
        }
      };

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, resolve, { params: {} }, {}));

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ server: 'true' })
      );

      await promise;

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
      expect(setDataInSessionStorage.calledOnceWith('adnz_semantiq', JSON.stringify({
        url: 'https://example.com/article',
        keywords: { sentiment: 'negative', ctx_segment: ['C001', 'C002'] },
      }))).to.be.true;
    });

    [
      { ctx_segment: [], adnz_news_type: [] },
      { sentiment: null, iab_category_id: null, iab_category: '', ctx_segment: [] },
      { ctx_segment: [''], sentiment: ' ' },
      {},
    ].forEach((keywords) => {
      it(`does not cache an empty response: ${JSON.stringify(keywords)}`, async () => {
        const reqBidsConfigObj = {
          adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
          ortb2Fragments: {
            global: {},
          },
        };

        const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, resolve, { params: {} }, {}));

        server.requests[0].respond(
          200,
          { 'Content-Type': 'application/json' },
          JSON.stringify(keywords)
        );

        await promise;

        expect(setDataInSessionStorage.called).to.be.false;
      });
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
