var assert = require('chai').assert;
var prebid = require('../../src/prebid');

describe('Publisher API', function () {
  // var assert = chai.assert;

  describe('api of command queue', function () {
    it('should have a global variable $$PREBID_GLOBAL$$', function () {
      assert.isObject($$PREBID_GLOBAL$$);
    });

    it('should have a global variable $$PREBID_GLOBAL$$.cmd as an array', function () {
      assert.isArray($$PREBID_GLOBAL$$.cmd);
    });

    it('should have $$PREBID_GLOBAL$$.cmd.push function', function () {
      assert.isFunction($$PREBID_GLOBAL$$.cmd.push);
    });

    it('should have a global variable $$PREBID_GLOBAL$$.que as an array', function () {
      assert.isArray($$PREBID_GLOBAL$$.que);
    });

    it('should have $$PREBID_GLOBAL$$.que.push function', function () {
      assert.isFunction($$PREBID_GLOBAL$$.que.push);
    });
  });

  describe('has function', function () {
    it('should have function $$PREBID_GLOBAL$$.getAdserverTargeting', function () {
      assert.isFunction($$PREBID_GLOBAL$$.getAdserverTargeting);
    });

    it('should have function $$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCode', function () {
      assert.isFunction($$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCode);
    });

    it('should have function $$PREBID_GLOBAL$$.getBidResponses', function () {
      assert.isFunction($$PREBID_GLOBAL$$.getBidResponses);
    });

    it('should have function $$PREBID_GLOBAL$$.getBidResponses', function () {
      assert.isFunction($$PREBID_GLOBAL$$.getNoBids);
    });

    it('should have function $$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode', function () {
      assert.isFunction($$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode);
    });

    it('should have function $$PREBID_GLOBAL$$.setTargetingForGPTAsync', function () {
      assert.isFunction($$PREBID_GLOBAL$$.setTargetingForGPTAsync);
    });

    it('should have function $$PREBID_GLOBAL$$.renderAd', function () {
      assert.isFunction($$PREBID_GLOBAL$$.renderAd);
    });

    it('should have function $$PREBID_GLOBAL$$.removeAdUnit', function () {
      assert.isFunction($$PREBID_GLOBAL$$.removeAdUnit);
    });

    it('should have function $$PREBID_GLOBAL$$.requestBids', function () {
      assert.isFunction($$PREBID_GLOBAL$$.requestBids);
    });

    it('should have function $$PREBID_GLOBAL$$.addAdUnits', function () {
      assert.isFunction($$PREBID_GLOBAL$$.addAdUnits);
    });

    it('should have function $$PREBID_GLOBAL$$.aliasBidder', function () {
      assert.isFunction($$PREBID_GLOBAL$$.aliasBidder);
    });

    it('should have function $$PREBID_GLOBAL$$.getAllWinningBids', function () {
      assert.isFunction($$PREBID_GLOBAL$$.getAllWinningBids);
    });
  });
});
