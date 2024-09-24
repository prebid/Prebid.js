import { expect } from 'chai';
import sinon from 'sinon';
import { mobianBrandSafetySubmodule, MOBIAN_URL } from 'modules/mobianRtdProvider.js';
import * as ajax from 'src/ajax.js';

describe('Mobian RTD Submodule', function () {
  let ajaxStub;
  let bidReqConfig;

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
  });

  afterEach(function () {
    ajaxStub.restore();
  });

  it('should set key-value pairs when server responds with valid data', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success(JSON.stringify({
        meta: {
          url: 'https://example.com',
          has_results: true
        },
        results: {
          mobianRisk: 'low',
          mobianSentiment: 'positive',
          mobianContentCategories: [],
          mobianEmotions: ['joy'],
          mobianThemes: [],
          mobianTones: [],
          mobianGenres: []
        }
      }));
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((result) => {
      expect(result).to.deep.equal({
        risk: 'low',
        contentCategories: [],
        sentiment: 'positive',
        emotions: ['joy'],
        themes: [],
        tones: [],
        genres: []
      });
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data).to.deep.include({
        mobianRisk: 'low',
        mobianContentCategories: [],
        mobianSentiment: 'positive',
        mobianEmotions: ['joy'],
        mobianThemes: [],
        mobianTones: [],
        mobianGenres: []
      });
    });
  });

  it('should handle response with content categories and multiple emotions', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success(JSON.stringify({
        meta: {
          url: 'https://example.com',
          has_results: true
        },
        results: {
          mobianRisk: 'medium',
          mobianSentiment: 'negative',
          mobianContentCategories: ['arms', 'crime'],
          mobianEmotions: ['anger', 'fear'],
          mobianThemes: ['conflict', 'international relations'],
          mobianTones: ['factual', 'serious'],
          mobianGenres: ['news', 'political_analysis']
        }
      }));
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((result) => {
      expect(result).to.deep.equal({
        risk: 'medium',
        contentCategories: ['arms', 'crime'],
        sentiment: 'negative',
        emotions: ['anger', 'fear'],
        themes: ['conflict', 'international relations'],
        tones: ['factual', 'serious'],
        genres: ['news', 'political_analysis']
      });
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data).to.deep.include({
        mobianRisk: 'medium',
        mobianContentCategories: ['arms', 'crime'],
        mobianSentiment: 'negative',
        mobianEmotions: ['anger', 'fear'],
        mobianThemes: ['conflict', 'international relations'],
        mobianTones: ['factual', 'serious'],
        mobianGenres: ['news', 'political_analysis']
      });
    });
  });

  it('should return empty object when server responds with has_results: false', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success(JSON.stringify({
        meta: {
          url: 'https://example.com',
          has_results: false
        },
        results: {}
      }));
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((result) => {
      expect(result).to.deep.equal({});
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data).to.not.have.any.keys(
        'mobianRisk', 'mobianContentCategories', 'mobianSentiment', 'mobianEmotions', 'mobianThemes', 'mobianTones', 'mobianGenres'
      );
    });
  });

  it('should return empty object when server response is not valid JSON', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success('unexpected output not even of the right type');
    });
    const originalConfig = JSON.parse(JSON.stringify(bidReqConfig));
    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((result) => {
      expect(result).to.deep.equal({});
      // Check that bidReqConfig hasn't been modified
      expect(bidReqConfig).to.deep.equal(originalConfig);
    });
  });

  it('should handle error response', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.error();
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((result) => {
      expect(result).to.deep.equal({});
    });
  });

  it('should use default values when fields are missing in the response', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success(JSON.stringify({
        meta: {
          url: 'https://example.com',
          has_results: true
        },
        results: {
          mobianRisk: 'high'
          // Missing other fields
        }
      }));
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((result) => {
      expect(result).to.deep.equal({
        risk: 'high',
        contentCategories: [],
        sentiment: 'unknown',
        emotions: [],
        themes: [],
        tones: [],
        genres: [],
      });
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data).to.deep.include({
        mobianRisk: 'high',
        mobianContentCategories: [],
        mobianSentiment: 'unknown',
        mobianEmotions: [],
        mobianThemes: [],
        mobianTones: [],
        mobianGenres: []
      });
    });
  });
});
