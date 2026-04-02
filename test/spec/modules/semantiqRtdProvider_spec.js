import { convertSemantiqKeywordToOrtb, getOrtbKeywords, semantiqRtdSubmodule, storage } from '../../../modules/semantiqRtdProvider.js';
import { expect } from 'chai';
import { server } from '../../mocks/xhr.js';
import * as utils from '../../../src/utils.js';

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

    it("won't modify ortb2 if if no ad units are provided", async () => {
      const reqBidsConfigObj = {
        adUnits: [],
        ortb2Fragments: {}
      };

      const onDoneSpy = sinon.spy();

      semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, { params: {} }, {});

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(reqBidsConfigObj).to.deep.equal({
        adUnits: [],
        ortb2Fragments: {}
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
        ortb2Fragments: {},
      };
      const onDoneSpy = sinon.spy();

      const promise = new Promise((resolve) => semantiqRtdSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        onDoneSpy();
        resolve();
      }, { params: { timeout: 500 } }, {}));

      clock.tick(510);

      await promise;

      expect(onDoneSpy.calledOnce).to.be.true;
      expect(reqBidsConfigObj).to.deep.equal({
        adUnits: [{ bids: [{ bidder: 'appnexus' }] }],
        ortb2Fragments: {},
      });
    });
  });
});
