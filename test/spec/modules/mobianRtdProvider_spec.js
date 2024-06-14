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

  it('should return low_risk when server responds with garm_no_risk', function () {
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
});
