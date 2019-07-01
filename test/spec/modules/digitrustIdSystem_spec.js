
import {
  requestBidHook,
  getCookie,
  setCookie,
  setConfig,
  isPubcidEnabled,
  getExpInterval,
  initPubcid,
  setStorageItem,
  getStorageItem,
  removeStorageItem,
  getPubcidConfig } from 'modules/pubCommonId';
import {
  digiTrustIdSubmodule,
  surfaceTestHook
} from 'modules/digitrustIdSystem';

import { getAdUnits } from 'test/fixtures/fixtures';
import * as auctionModule from 'src/auction';
import { registerBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

let assert = require('chai').assert;
let expect = require('chai').expect;

const ID_NAME = '_pubcid';
const EXP = '_exp';
const TIMEOUT = 2000;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89a-f][0-9a-f]{3}-[0-9a-f]{12}$/;

function cleanUp() {
  window.document.cookie = ID_NAME + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  localStorage.removeItem(ID_NAME);
  localStorage.removeItem(ID_NAME + EXP);
}

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
