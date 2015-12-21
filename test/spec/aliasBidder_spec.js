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
   
    describe('set Alias Bidder', function () {

        it('should have both of target bidder and alias bidder', function() {
       
            pbjs.aliasBidder('appnexus','bRealTime1');

        });
    });

    
});
