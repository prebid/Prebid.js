describe("AdUnits", function() {
  var assert = chai.assert;

    describe('addAdUnits', function() {

        it('1. adUnits test', function() {
            var adUnits = [{
                code: "/1996833/slot-1",
                sizes: [[300, 250], [728, 90]],
                bids: [
                    {
                        bidder: "openx",
                        params: {
                            pgid: "2342353",
                            unit: "234234",
                            jstag_url: "http://"
                        }
                    },{
                        bidder: "appnexus",
                        params: {
                            placementId: "234235"
                        }
                    }
                ]
                },{
                code: "/1996833/slot-2",
                sizes: [[468, 60]],
                bids: [
                    {
                        bidder: "rubicon",
                        params: {
                            rp_account: "4934",
                            rp_site: "13945",
                            rp_zonesize: "23948-15"
                        }
                    },{
                        bidder: "appnexus",
                        params: {
                            placementId: "827326"
                        }
                    }
                ]
            }];

            pbjs.addAdUnits(adUnits);

            var adUnits = pbjs_testonly.getAdUnits();
            var adUnit1 = adUnits[0];
            var bids1 = adUnit1.bids;
            var adUnit2 = adUnits[1];
            var bids2 = adUnit2.bids;

            assert.strictEqual(adUnit1.code,'/1996833/slot-1','adUnit1 code');
            assert.deepEqual(adUnit1.sizes,[[300, 250], [728, 90]],'adUnit1 sizes');
            assert.strictEqual(bids1[0].bidder,'openx','adUnit1 bids1 bidder');
            assert.strictEqual(bids1[0].params.pgid,'2342353','adUnit1 bids1 params.pgid');
            assert.strictEqual(bids1[0].params.unit,'234234','adUnit1 bids1 params.unit');
            assert.strictEqual(bids1[0].params.jstag_url,'http://','adUnit1 bids1 params.jstag_url');

            assert.strictEqual(bids1[1].bidder,'appnexus','adUnit1 bids2 bidder');
            assert.strictEqual(bids1[1].params.placementId,'234235','adUnit1 bids2 params.placementId');

            assert.strictEqual(adUnit2.code,'/1996833/slot-2','adUnit2 code');
            assert.deepEqual(adUnit2.sizes,[[468, 60]],'adUnit2 sizes');
            assert.strictEqual(bids2[0].bidder,'rubicon','adUnit2 bids1 bidder');
            assert.strictEqual(bids2[0].params.rp_account,'4934','adUnit2 bids1 params.rp_account');
            assert.strictEqual(bids2[0].params.rp_zonesize,'23948-15','adUnit2 bids1 params.rp_zonesize');
            assert.strictEqual(bids2[0].params.rp_site,'13945','adUnit2 bids1 params.rp_site');


            assert.strictEqual(bids2[1].bidder,'appnexus','adUnit2 bids2 bidder');
            assert.strictEqual(bids2[1].params.placementId,'827326','adUnit2 bids2 params.placementId');

        });
    });
});
