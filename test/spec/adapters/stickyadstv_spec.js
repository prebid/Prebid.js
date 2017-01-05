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
				zoneId: '2003'
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

		it('should have load the mustang script', function () {
			var url = void 0;
			url = adLoader.loadScript.firstCall.args[0];
			expect(url).to.equal("//cdn.stickyadstv.com/mustang/mustang.min.js");
		});
	});

	describe('getbids', function () {
		beforeEach(function () {
			adapter.getbids();
		});

		it('should be called twice', function () {
			sinon.assert.calledTwice(adLoader.loadScript);
		});
	});

	describe('Bid response', function () {
		var vzBidRequest = void 0;
		var bidderReponse = {
			"vzhPlacementId": "VZ-HB-123",
			"bid": "0fac1b8a-6ba0-4641-bd57-2899b1bedeae_0",
			"adWidth": "300",
			"adHeight": "250",
			"cpm": "1.00000000000000",
			"ad": "<div></div>",
			"slotBidId": "bidId1",
			"nurl": "<img></img>",
			"statusText": "vertoz:success"
		};

		beforeEach(function () {
			pbjs._bidsRequested.push(bidderRequest);
		});

		describe('success', function () {
			var firstBidReg = void 0;
			var adSpaceId = void 0;

			beforeEach(function () {
				sandbox.stub(_bidmanager2['default'], 'addBidResponse');
				pbjs.vzResponse(bidderReponse);
				firstBidReg = bidManager.addBidResponse.firstCall.args[1];
				adSpaceId = bidManager.addBidResponse.firstCall.args[0];
			});

			it('cpm to have property 1.000000', function () {
				(0, _chai.expect)(firstBidReg).to.have.property('cpm', 1.00);
			});
			it('adSpaceId should exist and be equal to placementCode', function () {
				(0, _chai.expect)(adSpaceId).to.equal("foo");
			});
			it('should have property ad', function () {
				(0, _chai.expect)(firstBidReg).to.have.property('ad');
			});
			it('should include the size to the bid object', function () {
				(0, _chai.expect)(firstBidReg).to.have.property('width', '300');
				(0, _chai.expect)(firstBidReg).to.have.property('height', '250');
			});
		});

		describe('failure', function () {
			var secondBidReg = void 0;
			var adSpaceId = void 0;
			var bidderResponse = {
				"vzhPlacementId": "VZ-HB-456",
				"slotBidId": "bidId2",
				"statusText": "vertoz:NO_BIDS"
			};

			beforeEach(function () {
				sandbox.stub(bidManager, 'addBidResponse');
				pbjs.vzResponse(bidderResponse);
				secondBidReg = bidManager.addBidResponse.firstCall.args[1];
				adSpaceId = bidManager.addBidResponse.firstCall.args[0];
			});

			it('should not have cpm property', function () {
				(0, _chai.expect)(secondBidReg.cpm).to.be.undefined;
			});
			it('adSpaceId should exist and be equal to placementCode', function () {
				(0, _chai.expect)(adSpaceId).to.equal("bar");
			});
			it('should not have ad property', function () {
				(0, _chai.expect)(secondBidReg.ad).to.be.undefined;
			});
		});
	});
});