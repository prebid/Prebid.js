import {
  buildApiUrl,
  cleanUrl,
  getBidRequestData,
  getMantisKeysSegmentData,
  mantisDataModule,
  processMantisData,
  setOrtb2FromResponse,
} from 'modules/mantisRtdProvider.js';
import { server } from 'test/mocks/xhr.js';
import * as refererDetection from 'src/refererDetection.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ENDPOINT = 'https://mantis.example.com';

const makeConfig = (overrides = {}) => ({
  name: 'mantis',
  waitForIt: true,
  params: { endpoint: ENDPOINT, ...overrides },
});

const makeReqBidsConfigObj = (globalOverrides = {}) => ({
  ortb2Fragments: {
    global: { site: {}, user: {}, ...globalOverrides },
  },
});

const sampleApiResponse = {
  sentiment: 'positive',
  emotion: {
    joy: { level: 'high' },
    unknown: { level: 'low' },
  },
  ratings: [
    { customer: 'customerA', rating: 'safe' },
    { customer: 'customerB', rating: 'N/A' },
  ],
  categories: {
    mantis: [
      { score: 0.9, label: 'sports' },
      { score: 0.4, label: 'politics' }, // below threshold — excluded
    ],
    iab: [
      { score: 0.8, id: 'IAB1-1' },
      { score: 0.3, id: 'IAB2-2' }, // below threshold — excluded
    ],
  },
};

// ---------------------------------------------------------------------------
// cleanUrl
// ---------------------------------------------------------------------------

describe('mantisRtdProvider: cleanUrl', function () {
  it('returns host + pathname only, stripping query string and fragment', function () {
    expect(cleanUrl('https://example.com/path/page?foo=bar#section')).to.equal('example.com/path/page');
  });

  it('includes port when present', function () {
    expect(cleanUrl('https://example.com:8080/path')).to.equal('example.com:8080/path');
  });

  it('returns empty string for invalid URLs', function () {
    expect(cleanUrl('not-a-url')).to.equal('');
  });

  it('handles trailing slash', function () {
    expect(cleanUrl('https://example.com/')).to.equal('example.com/');
  });
});

// ---------------------------------------------------------------------------
// buildApiUrl
// ---------------------------------------------------------------------------

describe('mantisRtdProvider: buildApiUrl', function () {
  let refererStub;

  beforeEach(function () {
    refererStub = sinon.stub(refererDetection, 'getRefererInfo');
    refererStub.returns({ page: 'https://www.example.com/news/story?id=123' });
  });

  afterEach(function () {
    refererStub.restore();
  });

  it('builds a URL with required query params', function () {
    const url = buildApiUrl(ENDPOINT);
    expect(url).to.include(ENDPOINT);
    expect(url).to.include('cacheType=public');
    expect(url).to.include('filter=fullRatings,input,findings,sentiment,emotion,categories');
    expect(url).to.include('url=');
  });

  it('prepends endpoint before query string', function () {
    const url = buildApiUrl(ENDPOINT);
    expect(url.startsWith(ENDPOINT + '?')).to.equal(true);
  });

  it('returns empty string when the page URL from getRefererInfo is not a valid URL', function () {
    refererStub.returns({ page: 'not-a-valid-url' });
    expect(buildApiUrl(ENDPOINT)).to.equal('');
  });
});

// ---------------------------------------------------------------------------
// processMantisData
// ---------------------------------------------------------------------------

describe('mantisRtdProvider: processMantisData', function () {
  it('returns expected standard keys', function () {
    const result = processMantisData(sampleApiResponse);
    expect(result).to.have.property('standard');
    expect(result.standard).to.have.all.keys('mantis', 'mantis_context', 'iab_context');
  });

  it('includes sentiment in mantis string', function () {
    const result = processMantisData(sampleApiResponse);
    expect(result.standard.mantis).to.include('sentiment-positive');
  });

  it('includes known emotion with level in mantis string', function () {
    const result = processMantisData(sampleApiResponse);
    expect(result.standard.mantis).to.include('joy-high');
  });

  it('maps unknown emotion key to emotions-unknown token', function () {
    const result = processMantisData(sampleApiResponse);
    expect(result.standard.mantis).to.include('emotions-unknown');
  });

  it('includes valid ratings and skips N/A ones', function () {
    const result = processMantisData(sampleApiResponse);
    expect(result.standard.mantis).to.include('customerA-safe');
    expect(result.standard.mantis).to.not.include('customerB');
  });

  it('always appends prebid-rtdmodule source token', function () {
    const result = processMantisData(sampleApiResponse);
    expect(result.standard.mantis).to.include('prebid-rtdmodule');
  });

  it('filters mantis categories below 0.6 score threshold', function () {
    const result = processMantisData(sampleApiResponse);
    expect(result.standard.mantis_context).to.include('sports');
    expect(result.standard.mantis_context).to.not.include('politics');
  });

  it('filters iab categories below 0.6 score threshold', function () {
    const result = processMantisData(sampleApiResponse);
    expect(result.standard.iab_context).to.include('IAB1-1');
    expect(result.standard.iab_context).to.not.include('IAB2-2');
  });

  it('falls back to "unknown" for mantis_context when no categories pass threshold', function () {
    const result = processMantisData({ categories: { mantis: [{ score: 0.1, label: 'news' }] } });
    expect(result.standard.mantis_context).to.equal('unknown');
  });

  it('falls back to "unknown" for iab_context when no categories pass threshold', function () {
    const result = processMantisData({ categories: { iab: [{ score: 0.1, id: 'IAB1' }] } });
    expect(result.standard.iab_context).to.equal('unknown');
  });

  it('falls back to "emotions-unknown" when emotion is empty', function () {
    const result = processMantisData({ sentiment: 'neutral', ratings: [], emotion: {} });
    expect(result.standard.mantis).to.include('emotions-unknown');
  });

  it('falls back to "sentiment-unknown" when sentiment is missing', function () {
    const result = processMantisData({});
    expect(result.standard.mantis).to.include('sentiment-unknown');
  });

  it('falls back to "unknown" ratings when all ratings are N/A', function () {
    const result = processMantisData({ ratings: [{ customer: 'x', rating: 'N/A' }] });
    expect(result.standard.mantis).to.include('unknown');
    expect(result.standard.mantis).to.not.include('x-');
  });

  it('handles missing input gracefully (default empty object)', function () {
    const result = processMantisData();
    expect(result).to.have.property('standard');
    expect(result.standard.mantis).to.be.a('string').and.not.be.empty;
  });
});

// ---------------------------------------------------------------------------
// getMantisKeysSegmentData
// ---------------------------------------------------------------------------

describe('mantisRtdProvider: getMantisKeysSegmentData', function () {
  it('returns empty array for null input', function () {
    expect(getMantisKeysSegmentData(null)).to.deep.equal([]);
  });

  it('returns empty array for undefined input', function () {
    expect(getMantisKeysSegmentData(undefined)).to.deep.equal([]);
  });

  it('returns empty array when standard is missing', function () {
    expect(getMantisKeysSegmentData({})).to.deep.equal([]);
  });

  it('returns one segment group per targeting key (mantis, mantis_context, iab_context)', function () {
    const segments = getMantisKeysSegmentData(processMantisData(sampleApiResponse));
    expect(segments).to.have.length(3);
    expect(segments.map(s => s.name)).to.deep.equal(['mantis', 'mantis_context', 'iab_context']);
  });

  it('each segment group has the correct shape', function () {
    const segments = getMantisKeysSegmentData(processMantisData(sampleApiResponse));
    segments.forEach(group => {
      expect(group).to.have.property('name').that.is.a('string');
      expect(group).to.have.property('segment').that.is.an('array');
      group.segment.forEach(seg => {
        expect(seg).to.have.property('id').that.is.a('string');
      });
    });
  });

  it('deduplicates segment ids within each group', function () {
    const processed = {
      standard: { mantis: 'a,b,a,c', mantis_context: 'x', iab_context: 'y' },
    };
    const segments = getMantisKeysSegmentData(processed);
    const ids = segments.find(s => s.name === 'mantis').segment.map(s => s.id);
    expect(ids).to.deep.equal(['a', 'b', 'c']);
  });

  it('trims whitespace from segment id values', function () {
    const processed = {
      standard: { mantis: ' token1 , token2 ', mantis_context: 'x', iab_context: 'y' },
    };
    const segments = getMantisKeysSegmentData(processed);
    expect(segments.find(s => s.name === 'mantis').segment.map(s => s.id)).to.deep.equal(['token1', 'token2']);
  });
});

// ---------------------------------------------------------------------------
// setOrtb2FromResponse
// ---------------------------------------------------------------------------

describe('mantisRtdProvider: setOrtb2FromResponse', function () {
  it('returns false for null ortb2StructuredData', function () {
    expect(setOrtb2FromResponse(makeReqBidsConfigObj(), null)).to.equal(false);
  });

  it('returns false for non-object ortb2StructuredData', function () {
    expect(setOrtb2FromResponse(makeReqBidsConfigObj(), 'string')).to.equal(false);
  });

  it('returns false when ortb2Fragments.global is undefined', function () {
    expect(setOrtb2FromResponse({ ortb2Fragments: {} }, { site: {} })).to.equal(false);
  });

  it('merges site data into ortb2Fragments.global', function () {
    const req = makeReqBidsConfigObj();
    const segments = [{ name: 'mantis', segment: [{ id: 'token' }] }];
    setOrtb2FromResponse(req, { site: { content: { data: segments } } });
    expect(req.ortb2Fragments.global.site.content.data).to.deep.equal(segments);
  });

  it('merges user data into ortb2Fragments.global', function () {
    const req = makeReqBidsConfigObj();
    const segments = [{ name: 'mantis', segment: [{ id: 'token' }] }];
    setOrtb2FromResponse(req, { user: { data: segments } });
    expect(req.ortb2Fragments.global.user.data).to.deep.equal(segments);
  });

  it('returns true when data is successfully merged', function () {
    expect(setOrtb2FromResponse(makeReqBidsConfigObj(), { site: {}, user: {} })).to.equal(true);
  });
});

// ---------------------------------------------------------------------------
// mantisDataModule (init)
// ---------------------------------------------------------------------------

describe('mantisRtdProvider: mantisDataModule.init', function () {
  it('registers with name "mantis"', function () {
    expect(mantisDataModule.name).to.equal('mantis');
  });

  it('returns false when params is missing', function () {
    expect(mantisDataModule.init({ name: 'mantis' })).to.equal(false);
  });

  it('returns false when params is not an object', function () {
    expect(mantisDataModule.init({ name: 'mantis', params: 'bad' })).to.equal(false);
  });

  it('returns false when endpoint is missing', function () {
    expect(mantisDataModule.init({ name: 'mantis', params: {} })).to.equal(false);
  });

  it('returns true with valid config', function () {
    expect(mantisDataModule.init(makeConfig())).to.equal(true);
  });
});

// ---------------------------------------------------------------------------
// getBidRequestData
// ---------------------------------------------------------------------------

describe('mantisRtdProvider: getBidRequestData', function () {
  let clock;

  beforeEach(function () {
    clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    clock.restore();
  });

  it('calls onDone immediately and makes no request when endpoint is missing', function () {
    const onDone = sinon.spy();
    getBidRequestData(makeReqBidsConfigObj(), onDone, { name: 'mantis', params: {} }, {}, 1000);
    expect(onDone.calledOnce).to.equal(true);
    expect(server.requests).to.have.length(0);
  });

  it('calls onDone immediately and makes no request when endpoint is empty', function () {
    const onDone = sinon.spy();
    getBidRequestData(makeReqBidsConfigObj(), onDone, { name: 'mantis', params: { endpoint: '' } }, {}, 1000);
    expect(onDone.calledOnce).to.equal(true);
    expect(server.requests).to.have.length(0);
  });

  it('calls onDone immediately when the page URL is invalid and buildApiUrl returns empty string', function () {
    const refererStub = sinon.stub(refererDetection, 'getRefererInfo').returns({ page: 'not-a-valid-url' });
    const onDone = sinon.spy();
    getBidRequestData(makeReqBidsConfigObj(), onDone, makeConfig(), {}, 1000);
    expect(onDone.calledOnce).to.equal(true);
    expect(server.requests).to.have.length(0);
    refererStub.restore();
  });

  it('makes a GET request to the correct URL', function () {
    getBidRequestData(makeReqBidsConfigObj(), sinon.spy(), makeConfig(), {}, 1000);
    expect(server.requests).to.have.length(1);
    expect(server.requests[0].url).to.include(ENDPOINT);
    expect(server.requests[0].url).to.include('cacheType=public');
    expect(server.requests[0].method).to.equal('GET');
  });

  it('calls onDone after auctionDelay timeout when ajax does not respond', function () {
    const onDone = sinon.spy();
    getBidRequestData(makeReqBidsConfigObj(), onDone, makeConfig(), {}, 500);
    expect(onDone.called).to.equal(false);
    clock.tick(500);
    expect(onDone.calledOnce).to.equal(true);
  });

  it('falls back to 0ms timeout when auctionDelay is 0', function () {
    const onDone = sinon.spy();
    getBidRequestData(makeReqBidsConfigObj(), onDone, makeConfig(), {}, 0);
    clock.tick(1);
    expect(onDone.calledOnce).to.equal(true);
  });

  it('processes API response and populates ortb2Fragments site and user data', function () {
    const req = makeReqBidsConfigObj();
    const onDone = sinon.spy();
    getBidRequestData(req, onDone, makeConfig(), {}, 1000);
    server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(sampleApiResponse));
    expect(onDone.calledOnce).to.equal(true);
    expect(req.ortb2Fragments.global.site.content.data).to.be.an('array').with.length(3);
    expect(req.ortb2Fragments.global.user.data).to.be.an('array').with.length(3);
  });

  it('calls onDone on invalid JSON response', function () {
    const onDone = sinon.spy();
    getBidRequestData(makeReqBidsConfigObj(), onDone, makeConfig(), {}, 1000);
    server.requests[0].respond(200, { 'Content-Type': 'application/json' }, 'not-json{{');
    expect(onDone.calledOnce).to.equal(true);
  });

  it('calls onDone on ajax error response', function () {
    const onDone = sinon.spy();
    getBidRequestData(makeReqBidsConfigObj(), onDone, makeConfig(), {}, 1000);
    server.requests[0].respond(500, {}, '');
    expect(onDone.calledOnce).to.equal(true);
  });

  it('discards late response that arrives after timeout', function () {
    const req = makeReqBidsConfigObj();
    const onDone = sinon.spy();
    getBidRequestData(req, onDone, makeConfig(), {}, 300);
    clock.tick(300);
    expect(onDone.calledOnce).to.equal(true);
    server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(sampleApiResponse));
    // still only called once
    expect(onDone.calledOnce).to.equal(true);
  });

  it('calls onDone when API returns data that produces no segments above threshold', function () {
    const onDone = sinon.spy();
    getBidRequestData(makeReqBidsConfigObj(), onDone, makeConfig(), {}, 1000);
    server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({}));
    expect(onDone.calledOnce).to.equal(true);
  });
});
