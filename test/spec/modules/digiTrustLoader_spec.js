import {
  digitrustIdModule } from 'modules/digiTrustIdLoader';
import * as utils from 'src/utils';
import { config } from 'src/config';
import { getGlobal } from 'src/prebidGlobal';

var assert = require('chai').assert;
var expect = require('chai').expect;

describe('DigiTrust ID Loader', function () {
  before(function () {
    digitrustIdModule['_testInit']();
  });

  afterEach(function () {
    $$PREBID_GLOBAL$$.requestBids.removeAll();
  });

  describe('ConfigFlagSet', function () {
    it('Test config for digitrust flag prior to init is undefined', function () {
      let val = config.getConfig('digitrustId');

      expect(val).to.be.undefined;
    });

    it('Test config for digitrust flag true after init', function () {
      digitrustIdModule['_testHook'].exposeLoader();

      let val = config.getConfig('digitrustId');
      expect(val).to.be.true;
    });
  });

  describe('DigiTrust bootstrapped', function () {
    it('Init creates minimal DigiTrust object', function () {
      let pbjs = getGlobal();
      var dtTestHook = digitrustIdModule['_testHook'];
      expect(window.DigiTrust).to.be.undefined;

      dtTestHook.exposeLoader();
      dtTestHook.initMockDigitrust();

      expect(window.DigiTrust).to.exist;
      expect(window.DigiTrust.isClient).to.be.true;
    });
  });
});
