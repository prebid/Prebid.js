describe("Bids", function() {
    var assert = chai.assert,
    expect = chai.expect,
    should = chai.should();

    var rightSlotCode = '/19968336/header-bid-tag-0';
    var rightSlotSizes = [[300, 250], [300, 600]];

    var topSlotCode = '/19968336/header-bid-tag1';
    var topSlotSizes = [[728, 90], [970, 90]];
    

    beforeEach(function(){

        var adUnit1 = {
            code: rightSlotCode,
            sizes: rightSlotSizes,
            bids: [{
                        bidder: 'appnexus',
                        params: {
                           placementId: '2251610'
                        }
                    },
                    {
                        bidder: 'rubicon',
                        params: {
                           rp_account : '9707',
                           rp_site: '17955',
                           rp_zonesize : '50983-15',
                           rp_tracking : 'affiliate-1701207318',
                           rp_inventory : '{ deals : "mobv3_excl,atf,demo1849,csm1834,znexcl1,exunisite,exmars,extargt,ldacomp,ent19116,rn14858,ukent,g03070,qc12170,qc2690,qc2695,qc1988,asov1,qc12172,qc12169,qc27434,rn24858,ent29116,lngen,cntq,cntauto,anthea,smg_blklist,amnetctr,ntflxblk,amtblk,zentend,nortb,deschoeff,js,excltop," }',
                           rp_floor : '0.1'
                        }
                    },
                    {
                        bidder: 'openx',
                        params: {
                            unit: 537245128,
                            pageURL : 'http://drudgereport.com',
                            refererURL : 'http://drudgereport.com',
                            jstag_url : 'http://ox-d.intermarkets.net/w/1.0/jstag'
                        }
                    },
                    {
                        bidder: 'pubmatic',
                        params: {
                            publisherId: 39741,
                            adSlot: '39620189@300x250'
                        }
                    },
                    {
                        bidder: 'criteo',
                        params: {
                            nid: '2612',
                            cookiename: 'cto_topix',
                            varname : 'crtg_content'
                        }
                    },
                    {
                        bidder: 'casale',
                        params: {
                            slotId: 2,
                            casaleUrl: 'http://js.indexww.com/ht/elitedaily.js'
                        }
                    },
                    {
                        bidder: 'casale',
                        params: {
                            slotId: 3
                        }                          
                    },
                    {
                        bidder: 'yieldbot',
                        params: {
                            pub: 'id',
                            name: 'name'
                        }
                    }, 
                    {
                        bidder: 'amazon',
                        params: {
                            aId : 3080
                        }
                    }      
                ]
            }; //adUnit1 end

        var adUnit2 = {
            code: topSlotCode,
            sizes: topSlotSizes,
            bids: [{
                    bidder: 'appnexus',
                    params: {
                        placementId : '5215561'
                    }
                }]
            };

        var arr = [adUnit2, adUnit1];
        pbjs.addAdUnits([adUnit2, adUnit1]);

        var googletag = googletag || {};
        googletag.cmd = googletag.cmd || [];

        // pbjs.setTargetingForGPTAsync([topSlotCode, rightSlotCode]);
        pbjs.setTargetingForAdUnitsGPTAsync([topSlotCode, rightSlotCode]);

        googletag.cmd.push(function() {
            var rightSlot = googletag.defineSlot(rightSlotCode, rightSlotSizes, 'div-gpt-ad-1438287399331-0').addService(googletag.pubads());
            var topSlot = googletag.defineSlot(topSlotCode, topSlotSizes, 'div-gpt-ad-1438287399331-1').addService(googletag.pubads());

            googletag.pubads().enableSingleRequest();
            googletag.enableServices(); 
        });
    });

    describe('Functions', function() {

        it('check type of return value',function(){
            assert.typeOf(pbjs.allBidsAvailable(),'boolean');
        });
    });

    describe('Requests', function() {

        it('bidsBackHandler callBack', function() {

            pbjs.requestBids({
                timeout: 500,
                bidsBackHandler : function(a){       
                    assertTargeting();
                    assertArguments(a);
                }
            });

            var assertTargeting = function(){

                var top = pbjs.getAdserverTargetingForAdUnitCode(topSlotCode),
                right = pbjs.getAdserverTargetingForAdUnitCode(rightSlotCode),
                all = pbjs.getAdserverTargeting();

                console.log(top);

                assert.typeOf(top,'array');
                assert.typeOf(top[0],'object');
                assert.typeOf(top[0].hb_adid,'string');
                assert.typeOf(top[0].hb_bidder,'string');
                assert.typeOf(top[0].hb_pb,'string');
                assert.typeOf(top[0].hb_size,'string');


                console.log(right);

                assert.typeOf(right,'array');
                assert.typeOf(right[0],'object');
                assert.typeOf(right[0].hb_adid,'string');
                assert.typeOf(right[0].hb_bidder,'string');
                assert.typeOf(right[0].hb_pb,'string');
                assert.typeOf(right[0].hb_size,'string');

                console.log(all);
                assert.typeOf(all,'object');
                should.exist(all[rightSlotCode]);
                should.exist(all[topSlotCode]);

                assert.deepEqual(top,all[topSlotCode],'top slot targeting');
                assert.deepEqual(right,all[rightSlotCode],'right slot targeting');
            };

            var assertArguments = function(arg){
                assert.typeOf(arg,'object');
                should.exist(arg[rightSlotCode]);
                should.exist(arg[topSlotCode]);

                console.log(arg);
                var responses = pbjs.getBidResponses();
                console.log(responses);
                assert.typeOf(responses,'object');
                should.exist(responses[rightSlotCode]);
                should.exist(responses[topSlotCode]);
                assert.deepEqual(arg,responses,'reponse object');

                var topResponse = pbjs.getBidResponsesForAdUnitCode(topSlotCode);
                var rightResponse = pbjs.getBidResponsesForAdUnitCode(rightSlotCode);

                assert.deepEqual(topResponse,responses[topSlotCode],'top slot response');
                assert.deepEqual(rightResponse,responses[rightSlotCode],'right slot response');

            };

        });
    });
});
