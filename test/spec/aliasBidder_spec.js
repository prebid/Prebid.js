describe("Publisher API _ Alias Bidder", function() {
    var assert = chai.assert,
    should = chai.should(),
    expect = chai.expect;

    before(function(){

        var topSlotCode = '/19968336/header-bid-tag1';
        var topSlotSizes = [[728, 90], [970, 90]];
        var adUnit = {
            code: topSlotCode,
            sizes: topSlotSizes,
            bids: [{
                    bidder: 'appnexus',
                    params: {
                        placementId : '5215561'
                    }
                }]
        };

        pbjs.addAdUnits(adUnit);
    });

    after(function(){
        pbjs_testonly.clearAllAdUnits();
    });
   

    it('set Alias Bidder', function() {
   
        pbjs.setAliasBidder('appnexus','bRealTime1');

        var adUnits = pbjs_testonly.getAdUnits();
        var adUnit1 = adUnits[0];
        var bids1 = adUnit1.bids;
       
        assert.strictEqual(adUnit1.code,'/19968336/header-bid-tag1','adUnit1 code');
        assert.deepEqual(adUnit1.sizes,[[728, 90], [970, 90]],'adUnit1 sizes');
       

        assert.strictEqual(bids1[0].bidder,'appnexus','adUnit1 bids1 bidder');
        assert.strictEqual(bids1[0].params.placementId,'5215561','adUnit1 bids1 params.placementId');
        assert.strictEqual(bids1[1].bidder,'bRealTime1','adUnit1 bids1 bidder');
        assert.strictEqual(bids1[1].params.placementId,'5215561','adUnit1 bids1 params.placementId');
    });

    
});
