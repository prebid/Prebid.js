describe("Publisher API", function() {
  var assert = chai.assert;

    it('has api of command queue', function() {
      assert.isObject(pbjs);
      assert.isFunction(pbjs.que.push);
    });

    it('has function',function(){
      assert.isFunction(pbjs.getAdserverTargeting);
      assert.isFunction(pbjs.getAdserverTargetingForAdUnitCode);
      assert.isFunction(pbjs.getBidResponses);
      assert.isFunction(pbjs.getBidResponsesForAdUnitCode);
      assert.isFunction(pbjs.setTargetingForGPTAsync);
      assert.isFunction(pbjs.allBidsAvailable);
      assert.isFunction(pbjs.renderAd);
      assert.isFunction(pbjs.removeAdUnit);
      assert.isFunction(pbjs.requestBids);      
      assert.isFunction(pbjs.addAdUnits);
      assert.isFunction(pbjs.addCallback);
      assert.isFunction(pbjs.removeCallback);   
      assert.isFunction(pbjs.setAliasBidder);
   });
});
