describe("Publisher API _ Bids", function() {
    var assert = chai.assert,
    expect = chai.expect,
    should = chai.should();

    var rightSlotCode = '/19968336/header-bid-tag-0';
    var rightDivCode = 'div-gpt-ad-1438287399331-0';
    var rightSlotSizes = [[300, 250], [300, 600]];

    var topSlotCode = '/19968336/header-bid-tag1';
    var topDivCode = 'div-gpt-ad-1438287399331-1';
    var topSlotSizes = [[728, 90], [970, 90]];
    

    before(function(){

        var adUnit1 = {
            code: rightDivCode,
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
            code: topDivCode,
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

    });

    after(function(){
        pbjs_testonly.clearAllAdUnits();
    });

    it('Functions', function() {

       
    });

    // describe('Request and callback', function() {

    //     it('bidsBackHandler callBack', function() {

    //         pbjs.requestBids({
    //             timeout: 500,
    //             bidsBackHandler : function(a){       
    //                 assertTargeting();
    //                 assertArguments(a);
    //             }
    //         });

    //         var assertTargeting = function(){

    //             var top = pbjs.getAdserverTargetingForAdUnitCode(topDivCode),
    //             right = pbjs.getAdserverTargetingForAdUnitCode(rightDivCode),
    //             all = pbjs.getAdserverTargeting();

    //             console.log('top = ' + top);
    //             if(top!==undefined){
    //                 assert.typeOf(top,'object');
    //                 assert.typeOf(top.hb_adid,'string');
    //                 assert.typeOf(top.hb_bidder,'string');
    //                 assert.typeOf(top.hb_pb,'string');
    //                 assert.typeOf(top.hb_size,'string');
    //             }


    //             console.log('right=' + right);

    //             if(right!==undefined){
    //                 assert.typeOf(right,'object');
    //                 assert.typeOf(right.hb_adid,'string');
    //                 assert.typeOf(right.hb_bidder,'string');
    //                 assert.typeOf(right.hb_pb,'string');
    //                 assert.typeOf(right.hb_size,'string');
    //             }

    //             console.log('all = ' + all);
    //             assert.typeOf(all,'object');
    //             should.exist(all[rightDivCode]);
    //             should.exist(all[topDivCode]);

    //             assert.deepEqual(top,all[topDivCode],'top slot targeting');
    //             assert.deepEqual(right,all[rightDivCode],'right slot targeting');
    //         };

    //         var assertArguments = function(arg){
    //             assert.typeOf(arg,'object');
    //             should.exist(arg[rightDivCode]);
    //             should.exist(arg[topDivCode]);

    //             console.log(arg);
    //             var responses = pbjs.getBidResponses();
    //             console.log(responses);
    //             assert.typeOf(responses,'object');
    //             should.exist(responses[rightDivCode]);
    //             should.exist(responses[topDivCode]);
    //             assert.deepEqual(arg,responses,'reponse object');

    //             var topResponse = pbjs.getBidResponsesForAdUnitCode(topDivCode);
    //             var rightResponse = pbjs.getBidResponsesForAdUnitCode(rightDivCode);

    //             assert.deepEqual(topResponse,responses[topDivCode],'top slot response');
    //             assert.deepEqual(rightResponse,responses[rightDivCode],'right slot response');

    //         };
    //     });
    // });
});
