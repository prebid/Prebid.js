describe('centro adapter tests', function () {
    var expect = require('chai').expect;
    var assert = require('chai').assert;
    var urlParse = require('url-parse');
    var querystringify = require('querystringify');

    var adapter = require('src/adapters/centro');
    var bidmanager = require('src/bidmanager');
    var adLoader = require('src/adloader');
    var utils = require('src/utils');

    window.pbjs = window.pbjs || {};
    if (typeof(pbjs)==="undefined"){
        var pbjs = window.pbjs;
    }

    let stubLoadScript;
    beforeEach(function () {
        stubLoadScript = sinon.stub(adLoader, 'loadScript');
    });

    afterEach(function () {
        stubLoadScript.restore();
    });

    var logErrorSpy;
    beforeEach(function () {
        logErrorSpy = sinon.spy(utils, 'logError');
    });

    afterEach(function () {
        logErrorSpy.restore();
    });

    describe('creation of bid url', function () {

        if (typeof(pbjs._bidsRequested)==="undefined"){
            pbjs._bidsRequested = [];
        }

        it('should fix parameter name', function () {

            var params = {
                bidderCode: 'centro',
                bids: [
                    {
                        bidder: 'centro',
                        sizes: [[300, 250]],
                        params: {
                            unit: 28136,
                            page_url: 'http://test_url.ru'
                        },
                        placementCode: 'div-gpt-ad-12345-1'
                    },
                    {
                        bidder: 'centro',
                        sizes: [[728, 90]],
                        params: {
                            unit: 28137
                        },
                        placementCode: 'div-gpt-ad-12345-2'
                    },
                    {
                        bidder: 'centro',
                        sizes: [[728, 90]],
                        params: {},
                        placementCode: 'div-gpt-ad-12345-3'
                    }
                ]
            };

            adapter().callBids(params);
            var bidUrl1 = stubLoadScript.getCall(0).args[0];
            var bidUrl2 = stubLoadScript.getCall(1).args[0];

            sinon.assert.calledWith(logErrorSpy, 'Bid has no unit', 'centro');
            sinon.assert.calledWith(stubLoadScript, bidUrl1);

            var parsedBidUrl = urlParse(bidUrl1);
            var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);
            var generatedCallback = 'window["adCentroHandler_28136300x250div-gpt-ad-12345-1"]';

            expect(parsedBidUrl.hostname).to.equal('staging.brand-server.com');
            expect(parsedBidUrl.pathname).to.equal('/hb');

            expect(parsedBidUrlQueryString).to.have.property('s').and.to.equal('28136');
            expect(parsedBidUrlQueryString).to.have.property('url').and.to.equal('http://test_url.ru');
            expect(parsedBidUrlQueryString).to.have.property('sz').and.to.equal('300x250');
            expect(parsedBidUrlQueryString).to.have.property('callback').and.to.equal(generatedCallback);

            sinon.assert.calledWith(stubLoadScript, bidUrl2);

            parsedBidUrl = urlParse(bidUrl2);
            parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);
            generatedCallback = 'window["adCentroHandler_28137728x90div-gpt-ad-12345-2"]';

            expect(parsedBidUrl.hostname).to.equal('t.brand-server.com');
            expect(parsedBidUrl.pathname).to.equal('/hb');

            expect(parsedBidUrlQueryString).to.have.property('s').and.to.equal('28137');
            expect(parsedBidUrlQueryString).to.have.property('url').and.to.equal(location.href);
            expect(parsedBidUrlQueryString).to.have.property('sz').and.to.equal('728x90');
            expect(parsedBidUrlQueryString).to.have.property('callback').and.to.equal(generatedCallback);
        });

    });

    describe('handling of the callback response', function () {
        if (typeof(pbjs._bidsReceived)==="undefined"){
            pbjs._bidsReceived = [];
        }
        if (typeof(pbjs._bidsRequested)==="undefined"){
            pbjs._bidsRequested = [];
        }
        if (typeof(pbjs._adsReceived)==="undefined"){
            pbjs._adsReceived = [];
        }

        var params = {
            bidderCode: 'centro',
            bids: [
                {
                    bidder: 'centro',
                    sizes: [[300, 250]],
                    params: {
                        unit: 28136
                    },
                    placementCode: '/19968336/header-bid-tag-0'
                },
                {
                    bidder: 'centro',
                    sizes: [[728, 90]],
                    params: {
                        unit: 111111
                    },
                    placementCode: '/19968336/header-bid-tag-1'
                },
                {
                    bidder: 'centro',
                    sizes: [[728, 90]],
                    params: {
                        unit: 222222
                    },
                    placementCode: '/19968336/header-bid-tag-2'
                },
                {
                    bidder: 'centro',
                    sizes: [[728, 90]],
                    params: {
                        unit: 333333
                    },
                    placementCode: '/19968336/header-bid-tag-3'
                }
            ]
        };

        it('callback function should exist', function () {

            adapter().callBids(params);

            expect(window['adCentroHandler_28136300x250%2F19968336%2Fheader-bid-tag-0'])
                .to.exist.and.to.be.a('function');
            expect(window['adCentroHandler_111111728x90%2F19968336%2Fheader-bid-tag-1'])
                .to.exist.and.to.be.a('function');
        });

        it('bidmanager.addBidResponse should be called with correct arguments', function () {

            var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

            adapter().callBids(params);

            var adUnits = new Array();
            var unit = new Object();
            unit.bids = params.bids;
            unit.code = '/19968336/header-bid-tag';
            unit.sizes=[[300,250],[728,90]];
            adUnits.push(unit);

            if (typeof(pbjs._bidsRequested)==="undefined"){
                pbjs._bidsRequested = [params];
            }
            else{
                pbjs._bidsRequested.push(params);
            }

            pbjs.adUnits = adUnits;

            var response = {"adTag":"<div>test content</div>","statusMessage":"Bid available","height":250,"_comment":"","value":0.2,"width":300,"sectionID":28136};
            var response2 = {"adTag":"","statusMessage":"No bid.","height":0,"value":0,"width":0,"sectionID":111111};
            var response3 = {"adTag":"","height":0,"value":0,"width":0,"sectionID":222222};
            var response4 = '';

            window['adCentroHandler_28136300x250%2F19968336%2Fheader-bid-tag-0'](response);
            window['adCentroHandler_111111728x90%2F19968336%2Fheader-bid-tag-1'](response2);
            window['adCentroHandler_222222728x90%2F19968336%2Fheader-bid-tag-2'](response3);
            window['adCentroHandler_333333728x90%2F19968336%2Fheader-bid-tag-3'](response4);

            var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
            var bidObject1 = stubAddBidResponse.getCall(0).args[1];
            var bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
            var bidObject2 = stubAddBidResponse.getCall(1).args[1];
            var bidPlacementCode3 = stubAddBidResponse.getCall(2).args[0];
            var bidObject3 = stubAddBidResponse.getCall(2).args[1];
            var bidPlacementCode4 = stubAddBidResponse.getCall(3).args[0];
            var bidObject4 = stubAddBidResponse.getCall(3).args[1];

            expect(logErrorSpy.getCall(0).args[0]).to.equal('Requested unit is 111111. No bid.');
            expect(logErrorSpy.getCall(1).args[0]).to.equal('Requested unit is 222222. Bid has missmatch format.');
            expect(logErrorSpy.getCall(2).args[0]).to.equal('Requested unit is 333333. Response has no bid.');

            expect(bidPlacementCode1).to.equal('/19968336/header-bid-tag-0');
            expect(bidObject1.cpm).to.equal(0.2);
            expect(bidObject1.ad).to.equal('<div>test content</div>');
            expect(bidObject1.width).to.equal(300);
            expect(bidObject1.height).to.equal(250);
            expect(bidObject1.getStatusCode()).to.equal(1);
            expect(bidObject1.bidderCode).to.equal('centro');

            expect(bidPlacementCode2).to.equal('/19968336/header-bid-tag-1');
            expect(bidObject2.getStatusCode()).to.equal(2);
            expect(bidPlacementCode3).to.equal('/19968336/header-bid-tag-2');
            expect(bidObject3.getStatusCode()).to.equal(2);
            expect(bidPlacementCode4).to.equal('/19968336/header-bid-tag-3');
            expect(bidObject4.getStatusCode()).to.equal(2);

            stubAddBidResponse.restore();
        });
    });
});
