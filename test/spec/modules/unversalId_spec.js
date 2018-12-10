import {
  requestBidHook,
  getCookie,
  setCookie,
  setConfig,
  isPubcidEnabled,
  getExpInterval,
  initPubcid } from 'modules/pubCommonId';
import { getAdUnits } from 'test/fixtures/fixtures';
import * as utils from 'src/utils';
import * as auctionModule from 'src/auction';
import { registerBidder } from 'src/adapters/bidderFactory';

var assert = require('chai').assert;
var expect = require('chai').expect;

const PUB_COMMON_ID_COOKIE_NAME = '_pubcid';
const TIMEOUT = 2000;

describe('Universal ID', function () {

  afterEach(function () {
  });

  describe('Configuration', function () {
    // if config is empty, universalId should not initialize
    it('empty config', function () {

    });

    // when config is set, associated submodule properties should be updated to match
    describe('set config values', function() {

    });
  });
});
