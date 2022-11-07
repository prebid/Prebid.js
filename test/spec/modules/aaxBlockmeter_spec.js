import {aaxBlockmeterRtdModule} from '../../../modules/aaxBlockmeterRtdProvider.js';
import * as sinon from 'sinon';
import {assert} from 'chai';

let sandbox;
let getTargetingDataSpy;

const config = {
  dataProviders: [{
    'name': 'aaxBlockmeter',
    'params': {
      'pub': 'publisher_id',
    }
  }]
};

describe('aaxBlockmeter realtime module', function () {
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    window.aax = window.aax || {};
    window.aax.getTargetingData = getTargetingDataSpy = sandbox.spy();
  });

  afterEach(function () {
    sandbox.restore();
    window.aax = {};
  });

  it('init should return false when config is empty', function () {
    assert.equal(aaxBlockmeterRtdModule.init({}), false);
  });

  it('init should return false when config.params id is empty', function () {
    assert.equal(aaxBlockmeterRtdModule.init({params: {}}), false);
  });

  it('init should return true when config.params.pub is not string', function () {
    assert.equal(aaxBlockmeterRtdModule.init({params: {pub: 12345}}), false);
  });

  it('init should return true when config.params.pub id is passed and is string typed', function () {
    assert.equal(aaxBlockmeterRtdModule.init(config.dataProviders[0]), true);
  });

  describe('getTargetingData should work correctly', function () {
    it('should return ad unit codes when ad units are present', function () {
      const codes = ['code1', 'code2'];
      assert.deepEqual(aaxBlockmeterRtdModule.getTargetingData(codes), {
        code1: {'atk': 'code1'},
        code2: {'atk': 'code2'},
      });
    });

    it('should call aax.getTargetingData if loaded', function () {
      aaxBlockmeterRtdModule.getTargetingData([], config.dataProviders[0], null);
    });
  });
});
