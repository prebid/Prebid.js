var assert = require('chai').assert;
var prebid = require('../../src/prebid');

describe('Publisher API', function () {
  // var assert = chai.assert;

  describe('api of command queue', function () {

    it('should have a global variable pbjs', function () {
      assert.isObject(pbjs);
    });

    it('should have a global variable pbjs.que as an array', function () {
      assert.isArray(pbjs.que);
    });

    it('should have pbjs.que.push function', function () {
      assert.isFunction(pbjs.que.push);
    });
  });

  describe('has function', function () {

    it('should have function pbjs.getAdserverTargeting', function () {
      assert.isFunction(pbjs.getAdserverTargeting);
    });

    it('should have function pbjs.getAdserverTargetingForAdUnitCode', function () {
      assert.isFunction(pbjs.getAdserverTargetingForAdUnitCode);
    });

    it('should have function pbjs.getBidResponses', function () {
      assert.isFunction(pbjs.getBidResponses);
    });

    it('should have function pbjs.getBidResponsesForAdUnitCode', function () {
      assert.isFunction(pbjs.getBidResponsesForAdUnitCode);
    });

    it('should have function pbjs.setTargetingForGPTAsync', function () {
      assert.isFunction(pbjs.setTargetingForGPTAsync);
    });

    it('should have function pbjs.allBidsAvailable', function () {
      assert.isFunction(pbjs.allBidsAvailable);
    });

    it('should have function pbjs.renderAd', function () {
      assert.isFunction(pbjs.renderAd);
    });

    it('should have function pbjs.removeAdUnit', function () {
      assert.isFunction(pbjs.removeAdUnit);
    });

    it('should have function pbjs.requestBids', function () {
      assert.isFunction(pbjs.requestBids);
    });

    it('should have function pbjs.addAdUnits', function () {
      assert.isFunction(pbjs.addAdUnits);
    });

    it('should have function pbjs.addCallback', function () {
      assert.isFunction(pbjs.addCallback);
    });

    it('should have function pbjs.removeCallback', function () {
      assert.isFunction(pbjs.removeCallback);
    });

    it('should have function pbjs.aliasBidder', function () {
      assert.isFunction(pbjs.aliasBidder);
    });

  });

});
