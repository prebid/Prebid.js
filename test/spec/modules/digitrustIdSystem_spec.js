import {
  digiTrustIdSubmodule,
  surfaceTestHook
} from 'modules/digiTrustIdSystem.js';

let assert = require('chai').assert;
let expect = require('chai').expect;
var testHook = null;

/**
* A mock implementation of IAB Consent Provider
*/
function mockCmp(command, version, callback, parameter) {
  var resultVal;
  if (command == 'ping') {
    resultVal = {
      gdprAppliesGlobally: mockCmp.stubSettings.isGlobal
    };
    callback(resultVal);
  } else if (command == 'getVendorConsents') {
    let cbResult = {
      vendorConsents: []
    }
    cbResult.vendorConsents[version] = mockCmp.stubSettings.consents;
    callback(cbResult);
  }
}

mockCmp.stubSettings = {
  isGlobal: false,
  consents: true
};

function setupCmpMock(isGlobal, consents) {
  window.__cmp = mockCmp;
  mockCmp.stubSettings.isGlobal = isGlobal;
  mockCmp.stubSettings.consents = consents;
}

describe('DigiTrust Id System', function () {
  it('Should create the test hook', function (done) {
    testHook = surfaceTestHook();
    assert.isNotNull(testHook, 'The test hook failed to surface');
    var conf = {
      init: {
        member: 'unit_test',
        site: 'foo'
      },
      callback: function (result) {
      }
    };
    testHook.initDigitrustFacade(conf);
    window.DigiTrust.getUser(conf);
    expect(window.DigiTrust).to.exist;
    expect(window.DigiTrust.isMock).to.be.true;
    done();
  });

  it('Should report as client', function (done) {
    delete window.DigiTrust;
    testHook = surfaceTestHook();

    var conf = {
      init: {
        member: 'unit_test',
        site: 'foo'
      },
      callback: function (result) {
        expect(window.DigiTrust).to.exist;
        expect(result).to.exist;
        expect(window.DigiTrust.isMock).to.be.true;
      }
    };
    testHook.initDigitrustFacade(conf);
    expect(window.DigiTrust).to.exist;
    expect(window.DigiTrust.isClient).to.be.true;
    done();
  });

  it('Should allow consent when given', function (done) {
    testHook = surfaceTestHook();
    setupCmpMock(true, true);
    var handler = function(result) {
      expect(result).to.be.true;
      done();
    }

    testHook.gdpr.hasConsent(null, handler);
  });

  it('Should consent if does not apply', function (done) {
    testHook = surfaceTestHook();
    setupCmpMock(false, true);
    var handler = function (result) {
      expect(result).to.be.true;
      done();
    }

    testHook.gdpr.hasConsent(null, handler);
  });

  it('Should not allow consent when not given', function (done) {
    testHook = surfaceTestHook();
    setupCmpMock(true, false);
    var handler = function (result) {
      expect(result).to.be.false;
      done();
    }

    testHook.gdpr.hasConsent(null, handler);
  });
  it('Should deny consent if timeout', function (done) {
    window.__cmp = function () { };
    var handler = function (result) {
      expect(result).to.be.false;
      done();
    }

    testHook.gdpr.hasConsent({ consentTimeout: 1 }, handler);
  });
  it('Should pass consent test if cmp not present', function (done) {
    delete window.__cmp
    testHook = surfaceTestHook();
    var handler = function (result) {
      expect(result).to.be.true;
      done();
    }

    testHook.gdpr.hasConsent(null, handler);
  });
});
