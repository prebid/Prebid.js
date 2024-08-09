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

  it('should set key-value pairs when server responds with garm_risk', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success(JSON.stringify({
        garm_risk: 'low',
        sentiment_positive: true,
        emotion_joy: true
      }));
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((result) => {
      expect(result).to.deep.equal({
        risk: 'low',
        contentCategories: [],
        sentiment: 'positive',
        emotions: ['joy']
      });
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data).to.deep.include({
        mobianRisk: 'low',
        mobianContentCategories: [],
        mobianSentiment: 'positive',
        mobianEmotions: ['joy']
      });
    });
  });

  it('should handle response with GARM content categories, sentiment, and emotions', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success(JSON.stringify({
        garm_risk: 'medium',
        garm_content_category_arms: true,
        garm_content_category_crime: true,
        sentiment_negative: true,
        emotion_anger: true,
        emotion_fear: true
      }));
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((result) => {
      expect(result).to.deep.equal({
        risk: 'medium',
        contentCategories: ['arms', 'crime'],
        sentiment: 'negative',
        emotions: ['anger', 'fear']
      });
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data).to.deep.include({
        mobianRisk: 'medium',
        mobianContentCategories: ['arms', 'crime'],
        mobianSentiment: 'negative',
        mobianEmotions: ['anger', 'fear']
      });
    });
  });

  it('should return unknown risk when garm_risk is not present', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success(JSON.stringify({
        sentiment_neutral: true
      }));
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((result) => {
      expect(result).to.deep.equal({
        risk: 'unknown',
        contentCategories: [],
        sentiment: 'neutral',
        emotions: []
      });
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data).to.deep.include({
        mobianRisk: 'unknown',
        mobianContentCategories: [],
        mobianSentiment: 'neutral',
        mobianEmotions: []
      });
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
});
