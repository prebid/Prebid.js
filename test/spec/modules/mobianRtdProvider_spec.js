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
      expect(risk['mobianGarmRisk']).to.equal('none');
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
      expect(risk['mobianGarmRisk']).to.equal('low');
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
      expect(risk['mobianGarmRisk']).to.equal('medium');
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
      expect(risk['mobianGarmRisk']).to.equal('high');
      expect(bidReqConfig.ortb2Fragments.global.site.ext.data.mobian).to.deep.equal(risk);
    });
  });

  it('should return empty object and not modify bidReqConfig when server response is not of the expected shape', function () {
    const originalBidReqConfig = JSON.parse(JSON.stringify(bidReqConfig));
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success('unexpected output not even of the right type');
    });
    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.deep.equal({});
      // Check that bidReqConfig hasn't been modified
      expect(bidReqConfig).to.deep.equal(originalBidReqConfig);
    });
  });

  it('should handle response as string', function () {
    const responseString = JSON.stringify({
      garm_risk: 'none',
      garm_no_risk: true,
      sentiment_positive: true,
      emotion_joy: true
    });

    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success(responseString);
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.deep.equal({
        mobianGarmRisk: 'none',
        garmContentCategories: [],
        sentiment: 'positive',
        emotions: ['joy']
      });
    });
  });

  it('should handle response as object', function () {
    const responseObject = {
      garm_risk: 'low',
      garm_low_risk: true,
      garm_content_category_arms: true,
      sentiment_negative: true,
      emotion_anger: true
    };

    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success(responseObject);
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.deep.equal({
        mobianGarmRisk: 'low',
        garmContentCategories: ['arms'],
        sentiment: 'negative',
        emotions: ['anger']
      });
    });
  });

  it('should handle response with no garm_risk field', function () {
    const response = {
      garm_medium_risk: true,
      garm_content_category_crime: true,
      sentiment_neutral: true,
      emotion_surprise: true
    };

    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.success(response);
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.deep.equal({
        mobianGarmRisk: 'medium',
        garmContentCategories: ['crime'],
        sentiment: 'neutral',
        emotions: ['surprise']
      });
    });
  });

  it('should handle error response', function () {
    ajaxStub = sinon.stub(ajax, 'ajaxBuilder').returns(function(url, callbacks) {
      callbacks.error();
    });

    return mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, {}, {}).then((risk) => {
      expect(risk).to.deep.equal({});
    });
  });
});
