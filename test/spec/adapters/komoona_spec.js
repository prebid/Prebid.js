describe("komoona adapter", function() {
    var expect = require('chai').expect;
    var adapter = require('src/adapters/komoona');
    var adLoader = require('src/adloader');
    var bidmanager = require('src/bidmanager');
    var STATUS = require('src/constants').STATUS;
    var startStub;
    var bids = {
        "bidderCode": "komoona",
        "requestId": "1f43cc36a6a7e",
        "bidderRequestId": "25392d757fad47",
        "bids": [
            {
                "bidder": "komoona",
                "params": {
                    "hbid": "abcd",
                    "placementId": "efgh"
                },
                "placementCode": "div-gpt-ad-1438287399331-0",
                "sizes": [
                    [300, 250]
                ],
                "bidId": "30e5e911c00703",
                "bidderRequestId": "25392d757fad47",
                "requestId": "1f43cc36a6a7e"
            }, {
                "bidder": "komoona",
                "params": {
                    "hbid": "efgh",
                    "placementId": "ijkl"
                },
                "placementCode": "div-gpt-ad-1438287399331-1",
                "sizes": [
                    [728, 90]
                ],
                "bidId": "48a0df61fac3ba",
                "bidderRequestId": "25392d757fad47",
                "requestId": "1f43cc36a6a7e"
            }
        ],
        "start": 1466493146527
    };

    beforeEach(function() {
        // we don't want to really load the script.
        sinon.stub(adLoader, 'loadScript', function(url, cb) {
            cb();
        });
        //but let's create the global function it returns so we can stub it.
        window.KmnKB = function() {};
        window.KmnKB.start = function() {};
        startStub = sinon.stub(window.KmnKB, 'start');
    });

    afterEach(function() {
        adLoader.loadScript.restore();
        window.KmnKB.start.restore();
    });

    it("sets kmncb config object correctly", function() {
        adapter().callBids(bids);

        var startConfig = startStub.getCall(0).args[0];
        expect(startConfig).to.not.be.undefined;
        expect(startConfig).to.have.property('hdbdid');
        expect(startConfig.hdbdid).to.equal('abcd');
        expect(startConfig).to.have.property('kb_callback');
        expect(startConfig.kb_callback).to.be.a.funtion;
        expect(startConfig).to.have.property('ts_as');
        expect(startConfig).to.have.property('hb_placements');
        expect(startConfig.hb_placements).to.have.all.members(['efgh', 'ijkl'])
        expect(startConfig).to.have.property('encode_bid');
        expect(startConfig.encode_bid).to.equal.undefined;
        expect(startConfig).to.have.property('hb_placement_bidids');
        expect(startConfig.hb_placement_bidids).to.deep.equal({efgh: '30e5e911c00703', ijkl: '48a0df61fac3ba'})
    });

    it("registers arriving bids in bidManager", function() {
        sinon.stub(bidmanager, 'addBidResponse');
        var bid_response = {
            "cpm": 2.62,
            "height": "250",
            "width": "300",
            "placementid": "efgh",
            "creative": "blahblah",
            "bidid": "30e5e911c00703"
        };

        pbjs._bidsRequested.push(bids);
        adapter().callBids(bids);

        var startConfig = startStub.getCall(0).args[0];

        //now let's call our callbak
        startConfig.kb_callback(bid_response);

        var placementCode = bidmanager.addBidResponse.getCall(0).args[0];
        expect(placementCode).to.not.be.undefined;
        expect(placementCode).to.equal('div-gpt-ad-1438287399331-0');
        var actualBidSent = bidmanager.addBidResponse.getCall(0).args[1];
        expect(actualBidSent).to.not.be.undefined;
        expect(actualBidSent).to.have.property('getStatusCode');
        expect(actualBidSent.getStatusCode()).to.equal(STATUS.GOOD);
        expect(actualBidSent).to.have.property('bidderCode', 'komoona');
        expect(actualBidSent).to.have.property('ad', 'blahblah');
        expect(actualBidSent).to.have.property('cpm', 2.62);
        expect(actualBidSent).to.have.property('width', 300);
        expect(actualBidSent).to.have.property('height', 250);
        expect(actualBidSent).to.have.property('adId', '30e5e911c00703');
        bidmanager.addBidResponse.restore();
    });

    it("registers 'no-bid' bid if no ad is sent", function() {
        sinon.stub(bidmanager, 'addBidResponse');
        var bid_response = {
            "placementid": "efgh",
            "bidid": "30e5e911c00703"
        };

        pbjs._bidsRequested.push(bids);
        adapter().callBids(bids);

        var startConfig = startStub.getCall(0).args[0];

        //now let's call our callbak
        startConfig.kb_callback(bid_response);

        var placementCode = bidmanager.addBidResponse.getCall(0).args[0];
        expect(placementCode).to.not.be.undefined;
        expect(placementCode).to.equal('div-gpt-ad-1438287399331-0');
        var actualBidSent = bidmanager.addBidResponse.getCall(0).args[1];
        expect(actualBidSent).to.not.be.undefined;
        expect(actualBidSent).to.have.property('getStatusCode');
        expect(actualBidSent.getStatusCode()).to.equal(STATUS.NO_BID);
        expect(actualBidSent).to.have.property('bidderCode', 'komoona');
        expect(actualBidSent).to.have.property('adId', '30e5e911c00703');
        bidmanager.addBidResponse.restore();
    })

    it("makes sure all is well with empty configuration", function() {
        sinon.stub(bidmanager, 'addBidResponse');

        var bid_response = {};

        adapter().callBids(bid_response);

        //start should never be called
        expect(startStub.getCall(0)).to.be.null;

        bidmanager.addBidResponse.restore();
    });
});
