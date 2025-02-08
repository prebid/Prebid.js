import { expect } from 'chai';
import sinon from 'sinon';
import * as ajax from 'src/ajax.js';
import * as gptUtils from 'libraries/gptUtils/gptUtils.js';
import {
  CONTEXT_KEYS,
  AP_VALUES,
  CATEGORIES,
  EMOTIONS,
  GENRES,
  RISK,
  SENTIMENT,
  THEMES,
  TONES,
  extendBidRequestConfig,
  fetchContextData,
  getConfig,
  getContextData,
  makeContextDataToKeyValuesReducer,
  makeDataFromResponse,
  setTargeting,
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
    [THEMES]: [],
    [TONES]: [],
  }

  const mockKeyValues = {
    'mobian_ap_a1': ['2313', '12'],
    'mobian_ap_p0': ['1231231', '212'],
    'mobian_ap_p1': ['231', '419'],
    'mobian_emotions': ['affection'],
    'mobian_risk': 'low',
    'mobian_sentiment': 'positive',
  }

  const mockConfig = {
    prefix: 'mobian',
    publisherTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, THEMES, TONES, GENRES],
    advertiserTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, THEMES, TONES, GENRES],
  }

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
    it('should return fetched context data', async function () {
      ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
        callbacks.success(mockResponse);
      });

      const contextData = await fetchContextData();
      expect(contextData).to.deep.equal(mockResponse);
    });
  });

  describe('makeDataFromResponse', function () {
    it('should format context data response', async function () {
      const data = makeDataFromResponse(mockResponse);
      expect(data).to.deep.equal(mockContextData);
    });
  });

  describe('getContextData', function () {
    it('should return formatted context data', async function () {
      ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
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
        publisherTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, THEMES, TONES, GENRES],
      };
      setTargeting(parsedConfig, mockContextData);

      expect(setKeyValueSpy.callCount).to.equal(6);
      expect(setKeyValueSpy.calledWith('mobian_ap_a1', ['2313', '12'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_ap_p0', ['1231231', '212'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_ap_p1', ['231', '419'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_emotions', ['affection'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_risk', 'low')).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_sentiment', 'positive')).to.equal(true);

      expect(setKeyValueSpy.calledWith('mobian_ap_a0')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_themes')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_tones')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_genres')).to.equal(false);
    });

    it('should not set key-value pairs if context data is empty', function () {
      const parsedConfig = {
        prefix: 'mobian',
        publisherTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, THEMES, TONES, GENRES],
      };
      setTargeting(parsedConfig, {});

      expect(setKeyValueSpy.callCount).to.equal(0);
    });

    it('should only set key-value pairs for the keys specified in config', function () {
      const parsedConfig = {
        prefix: 'mobian',
        publisherTargeting: [EMOTIONS, RISK],
      };

      setTargeting(parsedConfig, mockContextData);

      expect(setKeyValueSpy.callCount).to.equal(2);
      expect(setKeyValueSpy.calledWith('mobian_emotions', ['affection'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_risk', 'low')).to.equal(true);

      expect(setKeyValueSpy.calledWith('mobian_ap_a0')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_ap_a1')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_ap_p0')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_ap_p1')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_themes')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_tones')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_genres')).to.equal(false);
    });
  });

  describe('extendBidRequestConfig', function () {
    it('should extend bid request config with context data', function () {
      const extendedConfig = extendBidRequestConfig(bidReqConfig, mockContextData, mockConfig);
      expect(extendedConfig.ortb2Fragments.global.site.ext.data).to.deep.equal(mockKeyValues);
    });

    it('should not override existing data', function () {
      bidReqConfig.ortb2Fragments.global.site.ext.data = {
        existing: 'data'
      };

      const extendedConfig = extendBidRequestConfig(bidReqConfig, mockContextData, mockConfig);
      expect(extendedConfig.ortb2Fragments.global.site.ext.data).to.deep.equal({
        existing: 'data',
        ...mockKeyValues
      });
    });

    it('should create data object if missing', function () {
      delete bidReqConfig.ortb2Fragments.global.site.ext.data;
      const extendedConfig = extendBidRequestConfig(bidReqConfig, mockContextData, mockConfig);
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

    it('should set all tarteging values if value is true', function () {
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
      const keyValues = Object.entries(mockContextData).reduce(makeContextDataToKeyValuesReducer(config), []);
      const keyValuesObject = Object.fromEntries(keyValues);
      expect(keyValuesObject).to.deep.equal(mockKeyValues);
    });
  });
});
