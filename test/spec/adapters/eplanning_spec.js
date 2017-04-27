describe("eplanning adapter tests", function () {
	var urlParse = require("url-parse");
	var querystringify = require("querystringify");
	var adapter = require("src/adapters/eplanning");
	var adLoader = require("src/adloader");
	var expect = require("chai").expect;
	var bidmanager = require("src/bidmanager");
	var CONSTANTS = require('src/constants.json');

	var DEFAULT_PARAMS = {
		bidderCode: "eplanning",
		bids: [{
			code: 'div-gpt-ad-1460505748561-0',
			sizes: [[300, 250], [300, 200]],
			bidder: "eplanning",
			params: {
				ci: "18f66"
			}
		}]
	};

	var RESPONSE_AD = {
		bids: [{
			placementCode: "div-gpt-ad-1460505748561-0",
			ad: {
				ad: "<p>test ad</p>",
				cpm: 1,
				width: 300,
				height: 250
			}
		}]
	};

	var RESPONSE_EMPTY = {
		bids: [{
			placementCode: "div-gpt-ad-1460505748561-0"
		}]
	};

	it("load library", function () {
		var stubLoadScript = sinon.stub(adLoader, "loadScript");

		adapter().callBids(DEFAULT_PARAMS);

		var libUrl = stubLoadScript.getCall(0).args[0];
		var parsedLibUrl = urlParse(libUrl);
		var parsedLibUrlQueryString = querystringify.parse(parsedLibUrl.query);

		expect(parsedLibUrl.hostname).to.equal("aklc.img.e-planning.net");
		expect(parsedLibUrl.pathname).to.equal("/layers/hbpb.js");

		stubLoadScript.restore();
	});

	it("callback function should exist", function() {
		expect(pbjs.processEPlanningResponse).to.exist.and.to.be.a('function');
	});

	it("creates a bid response if bid exists", function() {
		var stubAddBidResponse = sinon.stub(bidmanager, "addBidResponse");

		adapter().callBids(DEFAULT_PARAMS);
		pbjs.processEPlanningResponse(RESPONSE_AD);

		var bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
		var bidObject = stubAddBidResponse.getCall(0).args[1];

		expect(bidPlacementCode).to.equal('div-gpt-ad-1460505748561-0');
		expect(bidObject.cpm).to.equal(1);
		expect(bidObject.ad).to.equal('<p>test ad</p>');
		expect(bidObject.width).to.equal(300);
		expect(bidObject.height).to.equal(250);
		expect(bidObject.getStatusCode()).to.equal(1);
		expect(bidObject.bidderCode).to.equal('eplanning');

		stubAddBidResponse.restore();
	});

	it("creates an empty bid response if there is no bid", function() {
		var stubAddBidResponse = sinon.stub(bidmanager, "addBidResponse");

		adapter().callBids(DEFAULT_PARAMS);
		pbjs.processEPlanningResponse(RESPONSE_EMPTY);

		var bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
		var bidObject = stubAddBidResponse.getCall(0).args[1];

		expect(bidPlacementCode).to.equal('div-gpt-ad-1460505748561-0');
		expect(bidObject.getStatusCode()).to.equal(2);
		expect(bidObject.bidderCode).to.equal('eplanning');

		stubAddBidResponse.restore();
	});

});
