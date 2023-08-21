import { subModuleObj } from 'modules/dynamicAdBoost.js';
import { loadExternalScript } from '../../../src/adloader.js';
import { expect } from 'chai';

const configWithParams = {
  keyId: 'dynamic',
  adUnits: ['gpt-123']
};

const configWithoutParams = {};

describe('dynamicAdBoost', function() {
  describe('init', function() {
    describe('initialize with expected params', function() {
      it('successfully initialize with load script', function() {
        expect(subModuleObj.init(configWithParams)).to.be.true;
        expect(loadExternalScript.called).to.be.true;
      })
    });

    describe('initialize without expected params', function() {
      it('fails initalize when keyId is not present', function() {
        expect(subModuleObj.init(configWithoutParams)).to.be.false;
      })
    })
  });
})
