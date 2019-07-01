import {
  digiTrustIdSubmodule,
  surfaceTestHook
} from 'modules/digiTrustIdSystem';

let assert = require('chai').assert;
let expect = require('chai').expect;

var testHook = null;

describe('DigiTrust Id System', function () {
  it('Should create the test hook', function () {
    return new Promise(function (resolve, reject) {
      testHook = surfaceTestHook();
      assert.isNotNull(testHook, 'The test hook failed to surface');
      var conf = {
        init: {
          member: 'unit_test',
          site: 'foo'
        },
        callback: function (result) {
          expect(window.DigiTrust).to.exist;
          expect(result).to.exist;
          expect(window.DigiTrust.isMock).to.be.true;
          resolve();
        }
      };
      testHook.initDigitrustFacade(conf);
      window.DigiTrust.getUser(conf);
    });
  });

  it('Should report as client', function () {
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
        resolve();
      }
    };
    testHook.initDigitrustFacade(conf);
    expect(window.DigiTrust).to.exist;
    expect(window.DigiTrust.isClient).to.be.true;
  });
})
