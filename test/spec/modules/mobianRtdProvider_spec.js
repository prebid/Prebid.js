import { expect } from 'chai';
import sinon from 'sinon';
import 'src/ajax.js';
import * as gptUtils from 'libraries/gptUtils/gptUtils.js';
import * as mobianProvider from 'modules/mobianRtdProvider.js';
import {
  CONTEXT_KEYS,
  AP_VALUES,
  CATEGORIES,
  EMOTIONS,
  GENRES,
  MAX_CACHE_SIZE,
  RISK,
  SENTIMENT,
  TQ,
  TG,
  THEMES,
  TONES,
  TRAFFIC_QUALITY_KEYS,
  extendBidRequestConfig,
  fetchContextData,
  getConfig,
  getContextData,
  makeMemoizedFetch,
  makeContextDataToKeyValuesReducer,
  makeDataFromResponse,
  mobianBrandSafetySubmodule,
  setTargeting,
  dep,
} from 'modules/mobianRtdProvider.js';

describe('Mobian RTD Submodule', function () {
  let ajaxStub;
  let bidReqConfig;
  let setKeyValueSpy;

  const mockResponse = JSON.stringify({
    meta: {
      url: 'https://example.com',
      has_results: true
    },
    results: {
      ap: { a0: [], a1: [2313, 12], p0: [1231231, 212], p1: [231, 419] },
      mobianContentCategories: [],
      mobianEmotions: ['affection'],
      mobianGenres: [],
      mobianRisk: 'low',
      mobianSentiment: 'positive',
      mobian_tq: 1,
      mobian_tg: 3,
      mobianThemes: [],
      mobianTones: [],
    }
  });

  const mockContextData = {
    [AP_VALUES]: { a0: [], a1: [2313, 12], p0: [1231231, 212], p1: [231, 419] },
    [CATEGORIES]: [],
    [EMOTIONS]: ['affection'],
    [GENRES]: [],
    [RISK]: 'low',
    [SENTIMENT]: 'positive',
    [TG]: 3,
    [THEMES]: [],
    [TONES]: [],
  };

  const mockTrafficQualityData = {
    [TQ]: 1,
  };

  const targetingKeys = [...CONTEXT_KEYS, ...TRAFFIC_QUALITY_KEYS];

  const mockCombinedData = {
    ...mockContextData,
    ...mockTrafficQualityData,
  };

  const mockContextKeyValues = {
    'mobian_ap_a1': ['2313', '12'],
    'mobian_ap_p0': ['1231231', '212'],
    'mobian_ap_p1': ['231', '419'],
    'mobian_emotions': ['affection'],
    'mobian_risk': 'low',
    'mobian_sentiment': 'positive',
    'mobian_tg': 3,
  };

  const mockKeyValues = {
    ...mockContextKeyValues,
    'mobian_tq': 1,
  };

  const mockConfig = {
    prefix: 'mobian',
    publisherTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, TQ, TG, THEMES, TONES, GENRES],
    advertiserTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, TQ, TG, THEMES, TONES, GENRES],
  };

  beforeEach(function () {
    bidReqConfig = {
      ortb2Fragments: {
        global: {
          site: {
            ext: {
              data: {}
            }
          }
        }
      }
    };

    setKeyValueSpy = sinon.spy(gptUtils, 'setKeyValue');
  });

  afterEach(function () {
    ajaxStub.restore();
    setKeyValueSpy.restore();
  });

  describe('fetchContextData', function () {
    it('should request context data using the full page URL', async function () {
      const originalHref = window.location.href;
      let requestedUrl;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function(url, callbacks) {
        requestedUrl = url;
        callbacks.success(mockResponse);
      });

      try {
        history.pushState({}, '', '/context-page?ignored=true#ignored');
        const contextData = await fetchContextData();
        const pageUrl = encodeURIComponent(window.location.href);
        expect(contextData).to.deep.equal(mockResponse);
        expect(requestedUrl).to.equal(`https://prebid.outcomes.net/api/prebid/v1/assessment/async?url=${pageUrl}`);
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });
  });

  describe('fetchTrafficQualityData', function () {
    it('should request traffic quality using the full page URL', async function () {
      const originalHref = window.location.href;
      const mockIvtResponse = JSON.stringify({ results: { mobian_tq: 1 } });
      let requestedUrl;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function(url, callbacks) {
        requestedUrl = url;
        callbacks.success(mockIvtResponse);
      });

      try {
        history.pushState({}, '', '/traffic-quality-page?ignored=true#ignored');
        const trafficQualityData = await mobianProvider.fetchTrafficQualityData();
        const pageUrl = encodeURIComponent(window.location.href);
        expect(trafficQualityData).to.equal(mockIvtResponse);
        expect(requestedUrl).to.equal(`https://quality.outcomes.net/api/prebid/v1/ivt?url=${pageUrl}`);
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });
  });

  describe('makeDataFromResponse', function () {
    it('should format context data response', async function () {
      const data = makeDataFromResponse(mockResponse);
      expect(data).to.deep.equal(mockContextData);
    });

    it('should ignore traffic quality returned by the contextual endpoint', function () {
      const data = makeDataFromResponse(mockResponse);
      expect(data).not.to.have.property(TQ);
    });
  });

  describe('makeTrafficQualityDataFromResponse', function () {
    [
      { response: JSON.stringify({ results: { mobian_tq: 1 } }), description: 'JSON text' },
      { response: { results: { mobian_tq: 1 } }, description: 'an object' },
    ].forEach(({ response, description }) => {
      it(`should format traffic quality data from ${description}`, function () {
        const data = mobianProvider.makeTrafficQualityDataFromResponse(response);
        expect(data).to.deep.equal(mockTrafficQualityData);
      });
    });

    [
      { response: {}, description: 'a response without results' },
      { response: { results: {} }, description: 'a response with empty results' },
      { response: JSON.stringify({ results: {} }), description: 'JSON text with empty results' },
    ].forEach(({ response, description }) => {
      it(`should return no targeting data for ${description}`, function () {
        const data = mobianProvider.makeTrafficQualityDataFromResponse(response);
        expect(data).to.deep.equal({});
      });
    });
  });

  describe('getContextData', function () {
    it('should return formatted context data', async function () {
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function(url, callbacks) {
        callbacks.success(mockResponse);
      });

      const data = await getContextData();
      expect(data).to.deep.equal(mockContextData);
    });
  });

  describe('setTargeting', function () {
    it('should set targeting key-value pairs as per config', function () {
      const parsedConfig = {
        prefix: 'mobian',
        publisherTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, TQ, TG, THEMES, TONES, GENRES],
      };
      setTargeting(parsedConfig, mockCombinedData);

      expect(setKeyValueSpy.callCount).to.equal(8);
      expect(setKeyValueSpy.calledWith('mobian_ap_a1', ['2313', '12'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_ap_p0', ['1231231', '212'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_ap_p1', ['231', '419'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_emotions', ['affection'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_risk', 'low')).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_sentiment', 'positive')).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_tq', 1)).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_tg', 3)).to.equal(true);

      expect(setKeyValueSpy.calledWith('mobian_ap_a0')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_themes')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_tones')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_genres')).to.equal(false);
    });

    it('should not set key-value pairs if context data is empty', function () {
      const parsedConfig = {
        prefix: 'mobian',
        publisherTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, TQ, TG, THEMES, TONES, GENRES],
      };
      setTargeting(parsedConfig, {});

      expect(setKeyValueSpy.callCount).to.equal(0);
    });

    it('should only set key-value pairs for the keys specified in config', function () {
      const parsedConfig = {
        prefix: 'mobian',
        publisherTargeting: [EMOTIONS, RISK, TQ],
      };

      setTargeting(parsedConfig, mockCombinedData);

      expect(setKeyValueSpy.callCount).to.equal(3);
      expect(setKeyValueSpy.calledWith('mobian_emotions', ['affection'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_risk', 'low')).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_tq', 1)).to.equal(true);

      expect(setKeyValueSpy.calledWith('mobian_ap_a0')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_ap_a1')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_ap_p0')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_ap_p1')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_themes')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_tones')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_genres')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_tg')).to.equal(false);
    });
  });

  describe('extendBidRequestConfig', function () {
    it('should extend bid request config with context data', function () {
      const extendedConfig = extendBidRequestConfig(bidReqConfig, mockCombinedData, mockConfig);
      expect(extendedConfig.ortb2Fragments.global.site.ext.data).to.deep.equal(mockKeyValues);
    });

    it('should not override existing data', function () {
      bidReqConfig.ortb2Fragments.global.site.ext.data = {
        existing: 'data'
      };

      const extendedConfig = extendBidRequestConfig(bidReqConfig, mockCombinedData, mockConfig);
      expect(extendedConfig.ortb2Fragments.global.site.ext.data).to.deep.equal({
        existing: 'data',
        ...mockKeyValues
      });
    });

    it('should create data object if missing', function () {
      delete bidReqConfig.ortb2Fragments.global.site.ext.data;
      const extendedConfig = extendBidRequestConfig(bidReqConfig, mockCombinedData, mockConfig);
      expect(extendedConfig.ortb2Fragments.global.site.ext.data).to.deep.equal(mockKeyValues);
    });
  });

  describe('getConfig', function () {
    it('should return config with correct keys', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          prefix: 'mobiantest',
          publisherTargeting: [AP_VALUES],
          advertiserTargeting: [EMOTIONS],
        }
      });
      expect(config).to.deep.equal({
        prefix: 'mobiantest',
        publisherTargeting: [AP_VALUES],
        advertiserTargeting: [EMOTIONS],
      });
    });

    it('should set default values for configs not set', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          publisherTargeting: [AP_VALUES],
        }
      });
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: [AP_VALUES],
        advertiserTargeting: [],
      });
    });

    it('should set default values if not provided', function () {
      const config = getConfig({});
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: [],
        advertiserTargeting: [],
      });
    });

    it('should set default values if no config is provided', function () {
      const config = getConfig();
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: [],
        advertiserTargeting: [],
      });
    });

    it('should exclude traffic quality from boolean targeting when it is not included', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          publisherTargeting: true,
          advertiserTargeting: true,
        }
      });
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: CONTEXT_KEYS,
        advertiserTargeting: CONTEXT_KEYS,
      });
    });

    it('should add traffic quality to boolean targeting when it is included', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          includeTrafficQuality: true,
          publisherTargeting: true,
          advertiserTargeting: true,
        }
      });
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: targetingKeys,
        advertiserTargeting: targetingKeys,
      });
    });

    it('should return independent targeting arrays for boolean targeting', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          includeTrafficQuality: true,
          publisherTargeting: true,
          advertiserTargeting: true,
        }
      });

      expect(config.publisherTargeting).not.to.equal(config.advertiserTargeting);
      config.advertiserTargeting.pop();
      expect(config.publisherTargeting).to.deep.equal(targetingKeys);
      const nextConfig = getConfig({ params: { publisherTargeting: true, includeTrafficQuality: true } });
      expect(nextConfig.publisherTargeting).to.deep.equal(targetingKeys);
    });

    it('should ignore includeTrafficQuality for explicit targeting arrays', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          includeTrafficQuality: true,
          publisherTargeting: [RISK],
          advertiserTargeting: [TQ],
        }
      });
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: [RISK],
        advertiserTargeting: [TQ],
      });
    });

    it('should retain explicitly targeted traffic quality when includeTrafficQuality is missing', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          publisherTargeting: [TQ],
          advertiserTargeting: false,
        }
      });
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: [TQ],
        advertiserTargeting: [],
      });
    });
  });

  describe('makeContextDataToKeyValuesReducer', function () {
    it('should format context data to key-value pairs', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          prefix: 'mobian',
          publisherTargeting: true,
          advertiserTargeting: true,
        }
      });
      const keyValues = Object.entries(mockCombinedData).reduce(makeContextDataToKeyValuesReducer(config), []);
      const keyValuesObject = Object.fromEntries(keyValues);
      expect(keyValuesObject).to.deep.equal(mockKeyValues);
    });

    it('should add scalar tq and tg values when called directly with those entries', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          prefix: 'mobian',
          publisherTargeting: true,
          advertiserTargeting: true,
        }
      });
      const reducer = makeContextDataToKeyValuesReducer(config);

      const keyValues = [
        [TQ, 1],
        [TG, 3],
        [TG, null],
      ].reduce(reducer, []);

      expect(keyValues).to.deep.equal([
        ['mobian_tq', 1],
        ['mobian_tg', 3],
      ]);
    });
  });

  describe('getTargetingData', function () {
    let getContextDataStub;
    let getTrafficQualityDataStub;

    beforeEach(function () {
      getContextDataStub = sinon.stub(dep, 'getContextData');
      getTrafficQualityDataStub = sinon.stub(dep, 'getTrafficQualityData');
    });

    afterEach(function () {
      getContextDataStub.restore();
      getTrafficQualityDataStub.restore();
    });

    [
      {
        description: 'request nothing when there are no targeting keys',
        targetingKeys: [],
        expectedContextCalls: 0,
        expectedTrafficQualityCalls: 0,
        expectedData: {},
      },
      {
        description: 'request only IVT when traffic quality is the only targeting key',
        targetingKeys: [TQ],
        expectedContextCalls: 0,
        expectedTrafficQualityCalls: 1,
        expectedData: mockTrafficQualityData,
      },
      {
        description: 'request only context when there are no traffic quality targeting keys',
        targetingKeys: [RISK],
        expectedContextCalls: 1,
        expectedTrafficQualityCalls: 0,
        expectedData: mockContextData,
      },
      {
        description: 'request both sources when both kinds of targeting key are present',
        targetingKeys: [RISK, TQ],
        expectedContextCalls: 1,
        expectedTrafficQualityCalls: 1,
        expectedData: mockCombinedData,
      },
    ].forEach((testCase) => {
      it(`should ${testCase.description}`, async function () {
        getContextDataStub.resolves(mockContextData);
        getTrafficQualityDataStub.resolves(mockTrafficQualityData);

        const data = await mobianProvider.getTargetingData(testCase.targetingKeys);

        expect(getContextDataStub.callCount).to.equal(testCase.expectedContextCalls);
        expect(getTrafficQualityDataStub.callCount).to.equal(testCase.expectedTrafficQualityCalls);
        expect(data).to.deep.equal(testCase.expectedData);
      });
    });

    it('should start both requests in parallel and wait for both to settle', async function () {
      let resolveContext;
      let resolveTrafficQuality;
      let settled = false;
      getContextDataStub.returns(new Promise((resolve) => {
        resolveContext = resolve;
      }));
      getTrafficQualityDataStub.returns(new Promise((resolve) => {
        resolveTrafficQuality = resolve;
      }));

      const pending = mobianProvider.getTargetingData([RISK, TQ]);
      pending.then(() => {
        settled = true;
      });

      expect(getContextDataStub.calledOnce).to.equal(true);
      expect(getTrafficQualityDataStub.calledOnce).to.equal(true);

      resolveTrafficQuality(mockTrafficQualityData);
      await Promise.resolve();
      expect(settled).to.equal(false);

      resolveContext(mockContextData);
      expect(await pending).to.deep.equal(mockCombinedData);
      expect(settled).to.equal(true);
    });

    [
      {
        description: 'use all data when both requests succeed',
        contextResult: mockContextData,
        trafficQualityResult: mockTrafficQualityData,
        expectedData: mockCombinedData,
      },
      {
        description: 'use only traffic quality when context fails',
        contextError: new Error('context failure'),
        trafficQualityResult: mockTrafficQualityData,
        expectedData: mockTrafficQualityData,
      },
      {
        description: 'use only context when IVT fails',
        contextResult: mockContextData,
        trafficQualityError: new Error('IVT failure'),
        expectedData: mockContextData,
      },
      {
        description: 'return no data when both requests fail',
        contextError: new Error('context failure'),
        trafficQualityError: new Error('IVT failure'),
        expectedData: {},
      },
    ].forEach((testCase) => {
      it(`should ${testCase.description}`, async function () {
        if (testCase.contextError) {
          getContextDataStub.rejects(testCase.contextError);
        } else {
          getContextDataStub.resolves(testCase.contextResult);
        }
        if (testCase.trafficQualityError) {
          getTrafficQualityDataStub.rejects(testCase.trafficQualityError);
        } else {
          getTrafficQualityDataStub.resolves(testCase.trafficQualityResult);
        }

        const data = await mobianProvider.getTargetingData([RISK, TQ]);

        expect(data).to.deep.equal(testCase.expectedData);
      });
    });
  });

  describe('RTD lifecycle', function () {
    let getContextDataStub;
    let getTrafficQualityDataStub;

    beforeEach(function () {
      getContextDataStub = sinon.stub(dep, 'getContextData');
      getTrafficQualityDataStub = sinon.stub(dep, 'getTrafficQualityData');
    });

    afterEach(function () {
      getContextDataStub.restore();
      getTrafficQualityDataStub.restore();
    });

    it('should make no requests when publisher and advertiser targeting are disabled', async function () {
      const rawConfig = {
        params: {
          includeTrafficQuality: true,
          publisherTargeting: false,
          advertiserTargeting: false,
        }
      };
      const callback = sinon.spy();

      mobianBrandSafetySubmodule.init(rawConfig);
      mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, callback, rawConfig);
      await Promise.resolve();

      expect(getContextDataStub.called).to.equal(false);
      expect(getTrafficQualityDataStub.called).to.equal(false);
      expect(setKeyValueSpy.called).to.equal(false);
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data).to.deep.equal({});
      expect(callback.calledOnce).to.equal(true);
    });

    it('should apply no data and always invoke the bid request callback when both requests fail', async function () {
      const rawConfig = {
        params: {
          publisherTargeting: [RISK, TQ],
          advertiserTargeting: [RISK, TQ],
        }
      };
      getContextDataStub.rejects(new Error('context failure'));
      getTrafficQualityDataStub.rejects(new Error('IVT failure'));

      mobianBrandSafetySubmodule.init(rawConfig);
      await new Promise((resolve) => {
        mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, resolve, rawConfig);
      });
      await Promise.resolve();

      expect(setKeyValueSpy.called).to.equal(false);
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data).to.deep.equal({});
    });
  });

  describe('makeMemoizedTrafficQualityFetch', function () {
    it('should retry after a failed IVT request', async function () {
      let fetchCount = 0;
      const mockIvtResponse = JSON.stringify({ results: { mobian_tq: 1 } });
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        if (fetchCount === 1) {
          callbacks.error(new Error('IVT failure'));
        } else {
          callbacks.success(mockIvtResponse);
        }
      });
      const memoizedFetch = mobianProvider.makeMemoizedTrafficQualityFetch();

      expect(await memoizedFetch()).to.deep.equal({});
      expect(await memoizedFetch()).to.deep.equal(mockTrafficQualityData);
      expect(fetchCount).to.equal(2);
    });

    it('should retry after an invalid IVT JSON response', async function () {
      let fetchCount = 0;
      const mockIvtResponse = JSON.stringify({ results: { mobian_tq: 1 } });
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        callbacks.success(fetchCount === 1 ? '{invalid' : mockIvtResponse);
      });
      const memoizedFetch = mobianProvider.makeMemoizedTrafficQualityFetch();

      expect(await memoizedFetch()).to.deep.equal({});
      expect(await memoizedFetch()).to.deep.equal(mockTrafficQualityData);
      expect(fetchCount).to.equal(2);
    });
  });

  describe('makeMemoizedFetch cache eviction', function () {
    it('should cache context data by the full page URL', async function () {
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        callbacks.success(mockResponse);
      });

      const memoizedFetch = makeMemoizedFetch();
      const originalHref = window.location.href;

      try {
        history.pushState({}, '', '/cache-page?version=1#first');
        await memoizedFetch();
        await memoizedFetch();
        expect(fetchCount).to.equal(1, 'the same full URL should use the cached response');

        history.pushState({}, '', '/cache-page?version=2#first');
        await memoizedFetch();
        expect(fetchCount).to.equal(2, 'a different query string should trigger a fetch');

        history.pushState({}, '', '/cache-page?version=2#second');
        await memoizedFetch();
        expect(fetchCount).to.equal(3, 'a different fragment should trigger a fetch');
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });

    it('should evict the oldest entry when cache exceeds maxSize', async function () {
      const maxSize = 2;
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        callbacks.success(mockResponse);
      });

      const memoizedFetch = makeMemoizedFetch(maxSize);

      await memoizedFetch();
      expect(fetchCount).to.equal(1);

      await memoizedFetch();
      expect(fetchCount).to.equal(1);

      const originalHref = window.location.href;
      try {
        history.pushState({}, '', '/page2');
        await memoizedFetch();
        expect(fetchCount).to.equal(2, 'new URL /page2 should trigger a fetch');

        history.pushState({}, '', '/page3');
        await memoizedFetch();
        expect(fetchCount).to.equal(3, 'new URL /page3 should trigger a fetch and evict the original URL');

        history.pushState({}, '', '/page2');
        await memoizedFetch();
        expect(fetchCount).to.equal(3, '/page2 should still be cached');

        history.pushState({}, '', originalHref);
        await memoizedFetch();
        expect(fetchCount).to.equal(4, 'original URL was evicted and requires a new fetch');
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });

    it('should fall back to MAX_CACHE_SIZE when given an invalid maxSize', async function () {
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        callbacks.success(mockResponse);
      });

      const memoizedFetch = makeMemoizedFetch(NaN);
      const originalHref = window.location.href;

      try {
        for (let i = 0; i < MAX_CACHE_SIZE; i++) {
          history.pushState({}, '', `/invalid-size-${i}`);
          await memoizedFetch();
        }
        expect(fetchCount).to.equal(MAX_CACHE_SIZE, 'should fetch once per unique URL');

        history.pushState({}, '', '/invalid-size-5');
        await memoizedFetch();
        expect(fetchCount).to.equal(MAX_CACHE_SIZE, 'revisiting a cached URL should not fetch again');

        history.pushState({}, '', '/invalid-size-overflow');
        await memoizedFetch();
        expect(fetchCount).to.equal(MAX_CACHE_SIZE + 1, 'new URL beyond limit should fetch and evict oldest (URL 0)');

        history.pushState({}, '', '/invalid-size-0');
        await memoizedFetch();
        expect(fetchCount).to.equal(MAX_CACHE_SIZE + 2, 'URL 0 was evicted and requires a new fetch');

        history.pushState({}, '', '/invalid-size-5');
        await memoizedFetch();
        expect(fetchCount).to.equal(MAX_CACHE_SIZE + 2, 'URL 5 should still be cached');
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });

    it('should floor fractional maxSize to an integer', async function () {
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        callbacks.success(mockResponse);
      });

      const memoizedFetch = makeMemoizedFetch(1.9);
      const originalHref = window.location.href;

      try {
        await memoizedFetch();
        expect(fetchCount).to.equal(1);

        history.pushState({}, '', '/fractional-page2');
        await memoizedFetch();
        expect(fetchCount).to.equal(2);

        history.pushState({}, '', originalHref);
        await memoizedFetch();
        expect(fetchCount).to.equal(3);
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });

    it('should share a single in-flight request for concurrent calls to the same URL', async function () {
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        setTimeout(() => callbacks.success(mockResponse), 10);
      });

      const memoizedFetch = makeMemoizedFetch();
      const [result1, result2, result3] = await Promise.all([
        memoizedFetch(),
        memoizedFetch(),
        memoizedFetch(),
      ]);

      expect(fetchCount).to.equal(1);
      expect(result1).to.deep.equal(mockContextData);
      expect(result2).to.deep.equal(mockContextData);
      expect(result3).to.deep.equal(mockContextData);
    });

    it('should delete failed cache entries so subsequent calls refetch after an error', async function () {
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        callbacks.error(new Error('network error'));
      });

      const memoizedFetch = makeMemoizedFetch();

      const firstResult = await memoizedFetch();
      expect(fetchCount).to.equal(1);
      expect(firstResult).to.deep.equal({});

      const secondResult = await memoizedFetch();
      expect(fetchCount).to.equal(2, 'cache entry was cleared on error so a new fetch should occur');
      expect(secondResult).to.deep.equal({});
    });

    it('should share a failing in-flight request across concurrent callers and allow a new fetch afterward', async function () {
      let fetchCount = 0;
      let shouldError = true;

      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        if (shouldError) {
          setTimeout(() => callbacks.error(new Error('server error')), 10);
        } else {
          setTimeout(() => callbacks.success(mockResponse), 10);
        }
      });

      const memoizedFetch = makeMemoizedFetch();

      const [result1, result2, result3] = await Promise.all([
        memoizedFetch(),
        memoizedFetch(),
        memoizedFetch(),
      ]);

      expect(fetchCount).to.equal(1, 'concurrent callers should share a single in-flight request');
      expect(result1).to.deep.equal({});
      expect(result2).to.deep.equal({});
      expect(result3).to.deep.equal({});

      shouldError = false;
      const value = await memoizedFetch();

      expect(fetchCount).to.equal(2, 'cache entry was cleared on error so a new fetch should occur');
      expect(value).to.deep.equal(mockContextData);
    });
  });

  describe('request cache integration', function () {
    it('should share context and IVT requests between init and getBidRequestData and only key context by URL', async function () {
      const originalHref = window.location.href;
      const requestedUrls = [];
      const mockIvtResponse = JSON.stringify({ results: { mobian_tq: 1 } });
      const rawConfig = {
        params: {
          includeTrafficQuality: true,
          publisherTargeting: true,
          advertiserTargeting: true,
        }
      };
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        requestedUrls.push(url);
        if (url.startsWith('https://quality.outcomes.net/')) {
          callbacks.success(mockIvtResponse);
        } else {
          callbacks.success(mockResponse);
        }
      });

      try {
        history.pushState({}, '', '/mobian-cache-integration');
        mobianBrandSafetySubmodule.init(rawConfig);
        await new Promise((resolve) => {
          mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, resolve, rawConfig);
        });

        expect(requestedUrls.filter((url) => url.startsWith('https://prebid.outcomes.net/')).length).to.equal(1);
        expect(requestedUrls.filter((url) => url.startsWith('https://quality.outcomes.net/')).length).to.equal(1);

        history.pushState({}, '', '/mobian-cache-integration-next');
        await new Promise((resolve) => {
          mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, resolve, rawConfig);
        });

        expect(requestedUrls.filter((url) => url.startsWith('https://prebid.outcomes.net/')).length).to.equal(2);
        expect(requestedUrls.filter((url) => url.startsWith('https://quality.outcomes.net/')).length).to.equal(1);
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });
  });
});
