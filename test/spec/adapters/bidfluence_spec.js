describe('Bidfluence Adapter', () => {
    const expect = require('chai').expect;
    const adapter = require('src/adapters/bidfluence');
    const bidmanager = require('src/bidmanager');

    var REQUEST = {
        bidderCode: "bidfluence",
        sizes: [[300, 250]],
        placementCode: "div-1",
        bids: [{
            bidder: 'bidfluence',
            params: {
                pubId: "test",
                adunitId: "test"
            }
        }]
    };

    var RESPONSE = {
        ad: "ad-code",
        cpm: 0.9,
        width: 300,
        height: 250,
        placementCode: "div-1"
    };

    var NO_RESPONSE = {
        ad: "ad-code",
        cpm: 0,
        width: 300,
        height: 250,
        placementCode: "div-1"
    };

    it('Should exist and be a function', function () {
        expect($$PREBID_GLOBAL$$.bfPbjsCB).to.exist.and.to.be.a('function');
    });
      
    it('Shoud push a valid bid', () => {

        var stubAddBidResponse = sinon.stub(bidmanager, "addBidResponse");
        pbjs._bidsRequested.push(REQUEST);
        adapter();
        $$PREBID_GLOBAL$$.bfPbjsCB(RESPONSE);

        var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
        var bidObject1 = stubAddBidResponse.getCall(0).args[1];

        expect(bidPlacementCode1).to.equal("div-1");
        expect(bidObject1.getStatusCode()).to.equal(1);
        expect(bidObject1.bidderCode).to.equal('bidfluence');

        stubAddBidResponse.restore();
    });

    it('Shoud push an empty bid', () => {

        var stubAddBidResponse = sinon.stub(bidmanager, "addBidResponse");
        pbjs._bidsRequested.push(REQUEST);
        adapter();

        $$PREBID_GLOBAL$$.bfPbjsCB(NO_RESPONSE);

        var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
        var bidObject1 = stubAddBidResponse.getCall(0).args[1];

        expect(bidPlacementCode1).to.equal("div-1");
        expect(bidObject1.getStatusCode()).to.equal(2);
        expect(bidObject1.bidderCode).to.equal('bidfluence');

        stubAddBidResponse.restore();

    });
});
