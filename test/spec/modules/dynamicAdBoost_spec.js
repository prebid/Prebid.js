import { init } from 'modules/dynamicAdBoost.js';
import { loadExternalScript } from '../../../src/adloader.js';
import { expect } from 'chai';
import { config as sourceConfig } from 'src/config.js';

const configWithParams = {
  dynamicAdBoost: {
    keyId: 'dynamic',
    adUnits: ['gpt-123'],
    threshold: 1
  }
};

describe('dynamicAdBoost', function() {
  describe('init', function() {
    describe('initialize without expected params', function() {
      it('fails initalize when keyId is not present', function() {
        expect(init()).to.be.false;
      })
    })

    describe('initialize with expected params', function() {
      it('successfully initialize with load script', function() {
        sourceConfig.setConfig(configWithParams);
        setTimeout(function() {
          expect(loadExternalScript.called).to.be.true;
        }, 5000);
      })
    });
  });
})
