import {expect} from 'chai';
import {assert} from 'chai';
import Adapter from '../../../src/adapters/stickyadstv';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

describe('StickyAdsTV Adapter', function () {
    var adapter = void 0;
    var sandbox = void 0;
    var bidsRequestBuff = void 0;
    var bidderRequest = {
        bidderCode: 'stickyadstv',
        bids: [{
            bidId: 'bidId1',
            bidder: 'stickyadstv',
            placementCode: 'foo',
            sizes: [[300, 250]],
            params: {
                zoneId: '2003',
                format:"screen-roll"
            }
        }, {
            bidId: 'bidId2',
            bidder: 'stickyadstv',
            placementCode: 'bar',
            sizes: [[728, 90]],
            params: {
                zoneId: '5562003'
            }
        }, {
            bidId: 'bidId3',
            bidder: 'stickyadstv',
            placementCode: '',
            sizes: [[300, 600]],
            params: {
                zoneId: '123456'
            }
        }, {
            bidId: 'bidId4',
            bidder: 'stickyadstv',
            placementCode: 'coo',
            sizes: [[300, 600]],
            params: {
                wrong: "missing zoneId"
            }
        }]
    };

    beforeEach(function () {
        adapter = new Adapter();
        sandbox = sinon.sandbox.create();
        bidsRequestBuff = pbjs._bidsRequested;
        pbjs._bidsRequested = [];
    });

    afterEach(function () {
        sandbox.restore();
        pbjs._bidsRequested = bidsRequestBuff;
    });

    describe('callBids', function () {
        beforeEach(function () {
            sandbox.stub(adLoader, 'loadScript');
            adapter.callBids(bidderRequest);
        });

        it('should be called twice', function () {
            sinon.assert.calledTwice(adLoader.loadScript);
        });

        it('should have load screenroll and mustang script', function () {
            var url = void 0;
            
            url = adLoader.loadScript.firstCall.args[0];
            expect(url).to.equal("//cdn.stickyadstv.com/prime-time/screen-roll.min.js");

            url = adLoader.loadScript.secondCall.args[0];
            expect(url).to.equal("//cdn.stickyadstv.com/mustang/mustang.min.js");
        });
    });

    describe('getBid', function () {
        let bidResponse;
        let loadConfig;
        let getPricingCalled;

        beforeEach(function () {
            //Mock VastLoader for test purpose
            window.com = {
                stickyadstv : {
                    vast : {
                        VastLoader : function(){
                            this.getVast = function(){
                                return { 
                                    getPricing : function(){
                                        getPricingCalled = true;
                                        return {currency:"USD", price: 4.000} 
                                    }
                                };
                            };

                            this.load = function(config, listener){
                                loadConfig = config;
                                listener.onSuccess();
                            };
                        }
                    },
                    screenroll : {
                        getPlayerSize: function(){
                            return "123x456";
                        }
                    }
                }
            };

            adapter.getBid(bidderRequest.bids[0], function(bidObject){
                bidResponse = bidObject;
            });
        });

        afterEach(function() {
            delete window.com.stickyadstv.vast.VastLoader;
            delete window.com.stickyadstv.vast;
            delete window.com.stickyadstv.screenroll;
            delete window.com.stickyadstv;
        });

        it('should have returned a valid bidObject', function () {
            
            expect(bidResponse).to.have.property('cpm', 4.000);
            expect(bidResponse).to.have.property('ad', "<script type=\'text/javascript\'>var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();var vast =  topWindow.stickyadstv_cache[\"foo\"];var config = {  preloadedVast:vast};topWindow.com.stickyadstv.screenroll.start(config);</script>");
            expect(bidResponse).to.have.property('bidderCode', "stickyadstv");
            expect(bidResponse).to.have.property('currencyCode', "USD");
            expect(bidResponse).to.have.property('width', 300);
            expect(bidResponse).to.have.property('height', 250);
            expect(bidResponse.getStatusCode()).to.equal(1);
        });

        it('should have called load with proper config', function () {
            
            expect(loadConfig).to.have.property('playerSize', "123x456");
            expect(loadConfig).to.have.property('zoneId', "2003");

        });

        it('should have called getPricing', function () {
            
            expect(getPricingCalled).to.equal(true);

        });
    });

    describe('formatBidObject', function () {

        it('should create a valid bid object', function () {
            let result = adapter.formatBidObject("", true, {currency:"EUR",price:"1.2345"}, "<div>sample</div>", 200, 300);
            
            expect(result).to.have.property('cpm', '1.2345');
            expect(result).to.have.property('ad', "<div>sample</div>");
            expect(result).to.have.property('bidderCode', "stickyadstv");
            expect(result).to.have.property('currencyCode', "EUR");
            expect(result).to.have.property('width', 200);
            expect(result).to.have.property('height', 300);
            expect(result.getStatusCode()).to.equal(1);
        });

        it('should create a invalid bid object because price is not defined', function () {
            let result = adapter.formatBidObject("", true, null, "<div>sample</div>", 200, 300);
                        
            expect(result).to.have.property('bidderCode', "stickyadstv");
            expect(result.getStatusCode()).to.equal(2);
        });

        it('should create a invalid bid object', function () {
            let result = adapter.formatBidObject("", false, {currency:"EUR",price:"1.2345"}, "<div>sample</div>", 200, 300);
                        
            expect(result).to.have.property('bidderCode', "stickyadstv");
            expect(result.getStatusCode()).to.equal(2);
        });
    });

    describe('formatAdHTML', function () {

        it('should create an inBanner ad format', function () {
            let result = adapter.formatAdHTML({placementCode:"placementCodeValue", params:{}}, [200,300]);
            
            expect(result).to.equal('<div id="stickyadstv_prebid_target"></div><script type=\'text/javascript\'>var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();var vast =  topWindow.stickyadstv_cache["placementCodeValue"];var config = {  preloadedVast:vast,  autoPlay:true};var ad = new topWindow.com.stickyadstv.vpaid.Ad(document.getElementById("stickyadstv_prebid_target"),config);ad.initAd(200,300,"",0,"","");</script>');
        });

        it('should create an intext ad format', function () {
            let result = adapter.formatAdHTML({placementCode:"placementCodeValue", params:{format:"intext-roll", auto:"v2", smartPlay:"true"}}, [200,300]);
                        
            expect(result).to.equal('<script type=\'text/javascript\'>var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();var vast =  topWindow.stickyadstv_cache["placementCodeValue"];var config = {  preloadedVast:vast,auto:"v2",smartPlay:"true"};topWindow.com.stickyadstv.intextroll.start(config);</script>');
        });

        it('should create a screenroll ad format', function () {
            let result = adapter.formatAdHTML({placementCode:"placementCodeValue", params:{format:"screen-roll", smartPlay:"true"}}, [200,300]);
                        
            expect(result).to.equal('<script type=\'text/javascript\'>var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();var vast =  topWindow.stickyadstv_cache["placementCodeValue"];var config = {  preloadedVast:vast,smartPlay:"true"};topWindow.com.stickyadstv.screenroll.start(config);</script>');
        });
    });

    describe('getBiggerSize', function () {

        it('should returns the bigger size', function () {
            let result = adapter.getBiggerSize([[1,4000],[4000,1],[200,300],[0,0]]);
            
            expect(result[0]).to.equal(200);
            expect(result[1]).to.equal(300);
        });
    });

    describe('top most window', function () {

        it('should returns the top most window', function () {
            let result = adapter.getTopMostWindow();
            
            expect(result).to.equal(window.top); 
        });
    });

});