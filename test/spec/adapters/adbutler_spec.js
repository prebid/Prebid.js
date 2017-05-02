describe('adbutler adapter tests', function () {

    var expect = require('chai').expect;
    var adapter = require('src/adapters/adbutler');
    var adLoader = require('src/adloader');
    var bidmanager = require('src/bidmanager');

    window.pbjs = window.pbjs || {};
    if (typeof(pbjs)==="undefined"){
        var pbjs = window.pbjs;
    }
    
    describe('creation of bid url', function () {

        var stubLoadScript;

        beforeEach(function () {
            stubLoadScript = sinon.stub(adLoader, 'loadScript');
        });

        afterEach(function () {
            stubLoadScript.restore();
        });

        if (typeof(pbjs._bidsReceived) === "undefined") {
            pbjs._bidsReceived = [];
        }
        if (typeof(pbjs._bidsRequested) === "undefined") {
            pbjs._bidsRequested = [];
        }
        if (typeof(pbjs._adsReceived) === "undefined") {
            pbjs._adsReceived = [];
        }

        it('should be called', function () {

            var params = {
                bidderCode: 'adbutler',
                bids: [
                    {
                        bidId: '3c9408cdbf2f68',
                        sizes: [[300, 250]],
                        bidder: 'adbutler',
                        params: {
                            accountID: '167283',
                            zoneID: '210093'
                        },
                        requestId: '10b327aa396609',
                        placementCode: '/123456/header-bid-tag-1'
                    }

                ]
            };

            adapter().callBids(params);

            sinon.assert.called(stubLoadScript);

        });
        
        it('should populate the keyword',function(){
            var params = {
                bidderCode: 'adbutler',
                bids: [
                    {
                        bidId: '3c9408cdbf2f68',
                        sizes: [[300, 250]],
                        bidder: 'adbutler',
                        params: {
                            accountID: '167283',
                            zoneID: '210093',
                            keyword: 'fish'
                        },
                        requestId: '10b327aa396609',
                        placementCode: '/123456/header-bid-tag-1'
                    }

                ]
            };

            adapter().callBids(params);
            
            var requestURI = stubLoadScript.getCall(0).args[0];
            
            expect(requestURI).to.have.string(';kw=fish;');
        });

        it('should use custom domain string',function(){
            var params = {
                bidderCode: 'adbutler',
                bids: [
                    {
                        bidId: '3c9408cdbf2f68',
                        sizes: [[300, 250]],
                        bidder: 'adbutler',
                        params: {
                            accountID: '107878',
                            zoneID: '86133',
                            domain: 'servedbyadbutler.com.dan.test'
                        },
                        requestId: '10b327aa396609',
                        placementCode: '/123456/header-bid-tag-1'
                    }
                ]
            };

            adapter().callBids(params);

            var requestURI = stubLoadScript.getCall(0).args[0];

            expect(requestURI).to.have.string('.dan.test');
        });
    });
    describe('bid responses',function(){
        
        it('should return complete bid response',function(){
            var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
            
            var params = {
                bidderCode: 'adbutler',
                bidder: 'adbutler',
                bids: [
                    {
                        bidId: '3c94018cdbf2f68-1',
                        sizes: [[300, 250]],
                        bidder: 'adbutler',
                        params: {
                            accountID: '167283',
                            zoneID: '210093',
                        },
                        requestId: '10b327aa396609',
                        placementCode: '/123456/header-bid-tag-1'
                    }

                ]
            };

            var response = {
                status: "SUCCESS",
                account_id: 167283,
                zone_id: 210093,
                cpm: 1.5,
                width: 300,
                height: 250,
                place: 0
            };

            adapter().callBids(params);

            var adUnits = new Array();
            var unit = new Object();
            unit.bids = params.bids;
            unit.code = '/123456/header-bid-tag-1';
            unit.sizes=[[300,250]];
            adUnits.push(unit);

            if (typeof(pbjs._bidsRequested)==="undefined"){
                pbjs._bidsRequested = [params];
            }
            else{
                pbjs._bidsRequested.push(params);
            }

            pbjs.adUnits = adUnits;
            
            
            pbjs.adbutlerCB(response);
            
            var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
            var bidObject1 = stubAddBidResponse.getCall(0).args[1];

            expect(bidPlacementCode1).to.equal('/123456/header-bid-tag-1');
            expect(bidObject1.getStatusCode()).to.equal(1);
            expect(bidObject1.bidderCode).to.equal('adbutler');
            expect(bidObject1.cpm).to.equal(1.5);
            expect(bidObject1.width).to.equal(300);
            expect(bidObject1.height).to.equal(250);

            stubAddBidResponse.restore();
        });
        
        it('should return empty bid response', function(){

            var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
            var params = {
                bidderCode: 'adbutler',
                bids: [
                    {
                        bidId: '3c9408cdbf2f68-2',
                        sizes: [[300, 250]],
                        bidder: 'adbutler',
                        params: {
                            accountID: '167283',
                            zoneID: '210085',
                        },
                        requestId: '10b327aa396609',
                        placementCode: '/123456/header-bid-tag-1'
                    }

                ]
            };
            
            var response = {
                status: "NO_ELIGIBLE_ADS",
                zone_id: 210085,
                width: 728,
                height: 90,
                place: 0
            };

            adapter().callBids(params);

            var adUnits = new Array();
            var unit = new Object();
            unit.bids = params.bids;
            unit.code = '/123456/header-bid-tag-1';
            unit.sizes=[[300,250]];
            adUnits.push(unit);

            if (typeof(pbjs._bidsRequested)==="undefined"){
                pbjs._bidsRequested = [params];
            }
            else{
                pbjs._bidsRequested.push(params);
            }

            pbjs.adUnits = adUnits;
            
            pbjs.adbutlerCB(response);

            var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
            var bidObject1 = stubAddBidResponse.getCall(0).args[1];

            expect(bidPlacementCode1).to.equal('/123456/header-bid-tag-1');
            expect(bidObject1.getStatusCode()).to.equal(2);
            expect(bidObject1.bidderCode).to.equal('adbutler');

            stubAddBidResponse.restore();
        });
        
        it('should return empty bid response on incorrect size',function(){

            var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
            var params = {
                bidderCode: 'adbutler',
                bids: [
                    {
                        bidId: '3c9408cdbf2f68-3',
                        sizes: [[300, 250]],
                        bidder: 'adbutler',
                        params: {
                            accountID: '167283',
                            zoneID: '210085',
                        },
                        requestId: '10b327aa396609',
                        placementCode: '/123456/header-bid-tag-1'
                    }

                ]
            };
            
            var response = {
                status: "SUCCESS",
                account_id: 167283,
                zone_id: 210085,
                cpm: 1.5,
                width: 728,
                height: 90,
                place: 0
            };
            
            adapter().callBids(params);

            var adUnits = new Array();
            var unit = new Object();
            unit.bids = params.bids;
            unit.code = '/123456/header-bid-tag-1';
            unit.sizes=[[300,250]];
            adUnits.push(unit);

            if (typeof(pbjs._bidsRequested)==="undefined"){
                pbjs._bidsRequested = [params];
            }
            else{
                pbjs._bidsRequested.push(params);
            }

            pbjs.adUnits = adUnits;
            
            pbjs.adbutlerCB(response);

            var bidObject1 = stubAddBidResponse.getCall(0).args[1];
            expect(bidObject1.getStatusCode()).to.equal(2);

            stubAddBidResponse.restore();
        });

        it('should return empty bid response with CPM too low',function(){

            var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
            var params = {
                bidderCode: 'adbutler',
                bids: [
                    {
                        bidId: '3c9408cdbf2f68-4',
                        sizes: [[300, 250]],
                        bidder: 'adbutler',
                        params: {
                            accountID: '167283',
                            zoneID: '210093',
                            minCPM: '5.00'
                        },
                        requestId: '10b327aa396609',
                        placementCode: '/123456/header-bid-tag-1'
                    }

                ]
            };

            var response = {
                status: "SUCCESS",
                account_id: 167283,
                zone_id: 210093,
                cpm: 1.5,
                width: 300,
                height: 250,
                place: 0
            };

            adapter().callBids(params);

            var adUnits = new Array();
            var unit = new Object();
            unit.bids = params.bids;
            unit.code = '/123456/header-bid-tag-1';
            unit.sizes=[[300,250]];
            adUnits.push(unit);

            if (typeof(pbjs._bidsRequested)==="undefined"){
                pbjs._bidsRequested = [params];
            }
            else{
                pbjs._bidsRequested.push(params);
            }

            pbjs.adUnits = adUnits;
            
            pbjs.adbutlerCB(response);

            var bidObject1 = stubAddBidResponse.getCall(0).args[1];
            expect(bidObject1.getStatusCode()).to.equal(2);

            stubAddBidResponse.restore();
        });
        
        it('should return empty bid response with CPM too high',function(){

            var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
            
            var params = {
                bidderCode: 'adbutler',
                bids: [
                    {
                        bidId: '3c9408cdbf2f68-5',
                        sizes: [[300, 250]],
                        bidder: 'adbutler',
                        params: {
                            accountID: '167283',
                            zoneID: '210093',
                            maxCPM: '1.00'
                        },
                        requestId: '10b327aa396609',
                        placementCode: '/123456/header-bid-tag-1'
                    }

                ]
            };

            var response = {
                status: "SUCCESS",
                account_id: 167283,
                zone_id: 210093,
                cpm: 1.5,
                width: 300,
                height: 250,
                place: 0
            };

            adapter().callBids(params);

            var adUnits = new Array();
            var unit = new Object();
            unit.bids = params.bids;
            unit.code = '/123456/header-bid-tag-1';
            unit.sizes=[[300,250]];
            adUnits.push(unit);

            if (typeof(pbjs._bidsRequested)==="undefined"){
                pbjs._bidsRequested = [params];
            }
            else{
                pbjs._bidsRequested.push(params);
            }

            pbjs.adUnits = adUnits;
            
            pbjs.adbutlerCB(response);

            var bidObject1 = stubAddBidResponse.getCall(0).args[1];
            expect(bidObject1.getStatusCode()).to.equal(2);
            
            stubAddBidResponse.restore();
        });

    });
    
    describe('ad code',function(){
        
        it('should be populated',function(){

            var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
            
            var params = {
                bidderCode: 'adbutler',
                bids: [
                    {
                        bidId: '3c9408cdbf2f68-6',
                        sizes: [[300, 250]],
                        bidder: 'adbutler',
                        params: {
                            accountID: '167283',
                            zoneID: '210093'
                        },
                        requestId: '10b327aa396609',
                        placementCode: '/123456/header-bid-tag-1'
                    }

                ]
            };

            var response = {
                status: "SUCCESS",
                account_id: 167283,
                zone_id: 210093,
                cpm: 1.5,
                width: 300,
                height: 250,
                place: 0,
                ad_code: '<img src="http://image.source.com/img" alt="" title="" border="0" width="300" height="250">'
            };
            
            adapter().callBids(params);

            var adUnits = new Array();
            var unit = new Object();
            unit.bids = params.bids;
            unit.code = '/123456/header-bid-tag-1';
            unit.sizes=[[300,250]];
            adUnits.push(unit);

            if (typeof(pbjs._bidsRequested)==="undefined"){
                pbjs._bidsRequested = [params];
            }
            else{
                pbjs._bidsRequested.push(params);
            }

            pbjs.adUnits = adUnits;
            
            pbjs.adbutlerCB(response);

            var bidObject1 = stubAddBidResponse.getCall(0).args[1];
            expect(bidObject1.getStatusCode()).to.equal(1);
            expect(bidObject1.ad).to.have.length.above(1);
            
            stubAddBidResponse.restore();
        });
        
        it('should contain tracking pixels',function(){

            var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
            
            var params = {
                bidderCode: 'adbutler',
                bids: [
                    {
                        bidId: '3c9408cdbf2f68-7',
                        sizes: [[300, 250]],
                        bidder: 'adbutler',
                        params: {
                            accountID: '167283',
                            zoneID: '210093'
                        },
                        requestId: '10b327aa396609',
                        placementCode: '/123456/header-bid-tag-1'
                    }

                ]
            };

            var response = {
                status: "SUCCESS",
                account_id: 167283,
                zone_id: 210093,
                cpm: 1.5,
                width: 300,
                height: 250,
                place: 0,
                ad_code: '<img src="http://image.source.com/img" alt="" title="" border="0" width="300" height="250">',
                tracking_pixels: [
                    "http://tracking.pixel.com/params=info"
                ]
            };

            adapter().callBids(params);

            var adUnits = new Array();
            var unit = new Object();
            unit.bids = params.bids;
            unit.code = '/123456/header-bid-tag-1';
            unit.sizes=[[300,250]];
            adUnits.push(unit);

            if (typeof(pbjs._bidsRequested)==="undefined"){
                pbjs._bidsRequested = [params];
            }
            else{
                pbjs._bidsRequested.push(params);
            }

            pbjs.adUnits = adUnits;
            
            pbjs.adbutlerCB(response);

            var bidObject1 = stubAddBidResponse.getCall(0).args[1];
            expect(bidObject1.getStatusCode()).to.equal(1);
            expect(bidObject1.ad).to.have.string('http://tracking.pixel.com/params=info');

            stubAddBidResponse.restore();
        });
        
    });
});