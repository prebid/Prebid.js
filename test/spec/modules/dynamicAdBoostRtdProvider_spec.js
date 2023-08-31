import { subModuleObj as rtdProvider } from 'modules/dynamicAdBoostRtdProvider.js';
import { loadExternalScript } from '../../../src/adloader.js';
import { expect } from 'chai';

const configWithParams = {
  params: {
    keyId: 'dynamic',
    adUnits: ['gpt-123'],
    threshold: 1
  }
};

const configWithoutRequiredParams = {
  params: {
    keyId: ''
  }
};

describe('dynamicAdBoost', function() {
  describe('init', function() {
    describe('initialize without expected params', function() {
      it('fails initalize when keyId is not present', function() {
        expect(rtdProvider.init(configWithoutRequiredParams)).to.be.false;
      })
    })

    describe('initialize with expected params', function() {
      it('successfully initialize with load script', function() {
        expect(rtdProvider.init(configWithParams)).to.be.true;
        setTimeout(function() {
          expect(loadExternalScript.called).to.be.true;
        }, 5000);
      })
    });
  });
})
