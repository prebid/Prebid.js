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
            ext: {}
          }
        }
      }
    };
  });

  afterEach(function () {
    ajaxStub.restore();
  });

  it('should return no_risk when server responds with garm_no_risk', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success({
        garm_no_risk: true,
        garm_low_risk: false,
        garm_medium_risk: false,
        garm_high_risk: false
      });
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.have.property('mobianGarmRisk');
      expect(risk['mobianGarmRisk']).to.equal('no_risk');
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data.mobian).to.deep.equal(risk);
    });
  });

  it('should return low_risk when server responds with garm_low_risk', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success({
        garm_no_risk: false,
        garm_low_risk: true,
        garm_medium_risk: false,
        garm_high_risk: false
      });
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.have.property('mobianGarmRisk');
      expect(risk['mobianGarmRisk']).to.equal('low_risk');
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data.mobian).to.deep.equal(risk);
    });
  });

  it('should return medium_risk when server responds with garm_medium_risk', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success({
        garm_no_risk: false,
        garm_low_risk: false,
        garm_medium_risk: true,
        garm_high_risk: false
      });
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.have.property('mobianGarmRisk');
      expect(risk['mobianGarmRisk']).to.equal('medium_risk');
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data.mobian).to.deep.equal(risk);
    });
  });

  it('should return high_risk when server responds with garm_high_risk', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success({
        garm_no_risk: false,
        garm_low_risk: false,
        garm_medium_risk: false,
        garm_high_risk: true
      });
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.have.property('mobianGarmRisk');
      expect(risk['mobianGarmRisk']).to.equal('high_risk');
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data.mobian).to.deep.equal(risk);
    });
  });

  it('should return unknown when server response is not of the expected shape', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success('unexpected output not even of the right type');
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.have.property('mobianGarmRisk');
      expect(risk['mobianGarmRisk']).to.equal('unknown');
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data.mobian).to.deep.equal(risk);
    });
  });

  // New tests for GARM content categories, sentiment, and emotions
  it('should return correct GARM content categories', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success({
        garm_content_category_adult: false,
        garm_content_category_arms: true,
        garm_content_category_crime: true,
        garm_content_category_death_injury: false,
      });
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.have.property('garmContentCategories');
      expect(risk['garmContentCategories']).to.deep.equal(['arms', 'crime']);
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data.mobian).to.deep.equal(risk);
    });
  });

  it('should return correct sentiment', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success({
        sentiment_positive: false,
        sentiment_negative: true,
        sentiment_neutral: false,
      });
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.have.property('sentiment');
      expect(risk['sentiment']).to.equal('negative');
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data.mobian).to.deep.equal(risk);
    });
  });

  it('should return correct emotions', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success({
        emotion_love: false,
        emotion_joy: true,
        emotion_anger: false,
        emotion_surprise: true,
        emotion_sadness: false,
        emotion_fear: true,
      });
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.have.property('emotions');
      expect(risk['emotions']).to.deep.equal(['joy', 'surprise', 'fear']);
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data.mobian).to.deep.equal(risk);
    });
  });

  it('should handle all new properties correctly', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success({
        garm_no_risk: false,
        garm_low_risk: true,
        garm_medium_risk: false,
        garm_high_risk: false,
        garm_content_category_adult: false,
        garm_content_category_arms: true,
        garm_content_category_crime: false,
        sentiment_positive: false,
        sentiment_negative: false,
        sentiment_neutral: true,
        emotion_love: false,
        emotion_joy: true,
        emotion_anger: false,
        emotion_surprise: false,
      });
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.have.property('mobianGarmRisk');
      expect(risk['mobianGarmRisk']).to.equal('low_risk');
      expect(risk).to.have.property('garmContentCategories');
      expect(risk['garmContentCategories']).to.deep.equal(['arms']);
      expect(risk).to.have.property('sentiment');
      expect(risk['sentiment']).to.equal('neutral');
      expect(risk).to.have.property('emotions');
      expect(risk['emotions']).to.deep.equal(['joy']);
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data.mobian).to.deep.equal(risk);
    });
  });
});
