import {expect} from 'chai';
import Adapter from 'modules/sovrnBidAdapter';
import bidmanager from 'src/bidmanager';
import adloader from 'src/adloader';
var utils = require('src/utils');

describe('sovrn adapter tests', function () {
  let adapter;
  const bidderRequest = {
    bidderCode: 'sovrn',
    bids: [
      {
        bidId: 'bidId1',
        bidder: 'sovrn',
        params: {
          tagid: '315045',
          bidfloor: 1.25
        },
        sizes: [[320, 50]],
        placementCode: 'div-gpt-ad-12345-1'
      },
      {
        bidId: 'bidId2',
        bidder: 'sovrn',
        params: {
          tagid: '315046'
        },
        sizes: [[320, 50]],
        placementCode: 'div-gpt-ad-12345-2'
      },
      {
        bidId: 'bidId3',
        bidder: 'sovrn',
        params: {
          tagid: '315047'
        },
        sizes: [[320, 50]],
        placementCode: 'div-gpt-ad-12345-2'
      },
    ]
  };

  beforeEach(() => adapter = new Adapter());

  describe('requestBids', function () {
    let stubLoadScript;

    beforeEach(() => {
      stubLoadScript = sinon.stub(adloader, 'loadScript');
    });

    afterEach(() => {
      stubLoadScript.restore();
    });

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('loads the request script', function () {
      adapter.callBids(bidderRequest);

      let sovrnScript = decodeURIComponent(stubLoadScript.getCall(0).args[0]);
      let firstExpectedImpObj = '{"id":"bidId1","banner":{"w":320,"h":50},"tagid":"315045","bidfloor":1.25}';
      let secondExpectedImpObj = '{"id":"bidId2","banner":{"w":320,"h":50},"tagid":"315046","bidfloor":""}';

      expect(sovrnScript).to.contain(firstExpectedImpObj);
      expect(sovrnScript).to.contain(secondExpectedImpObj);
    });
  });

  describe('sovrnResponse', function () {
    let stubAddBidResponse;
    let getRequestStub;
    let getRequestsStub;

    beforeEach(() => {
      stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      getRequestStub = sinon.stub(utils, 'getBidRequest');
      getRequestStub.withArgs(bidderRequest.bids[0].bidId).returns(bidderRequest.bids[0]);
      getRequestStub.withArgs(bidderRequest.bids[1].bidId).returns(bidderRequest.bids[1]);
      getRequestStub.withArgs(bidderRequest.bids[2].bidId).returns(bidderRequest.bids[2]);

      getRequestsStub = sinon.stub(utils, 'getBidderRequestAllAdUnits');
      getRequestsStub.returns(bidderRequest);
    });

    afterEach(() => {
      stubAddBidResponse.restore();
      getRequestStub.restore();
      getRequestsStub.restore();
    });

    it('should exist and be a function', function () {
      expect($$PREBID_GLOBAL$$.sovrnResponse).to.exist.and.to.be.a('function');
    });

    it('should add empty bid responses if no bids returned', function () {
      let response = {
        'id': '54321',
        'seatbid': []
      };

      $$PREBID_GLOBAL$$.sovrnResponse(response);

      let bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      let bidObject1 = stubAddBidResponse.getCall(0).args[1];
      let bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
      let bidObject2 = stubAddBidResponse.getCall(1).args[1];
      let bidPlacementCode3 = stubAddBidResponse.getCall(2).args[0];
      let bidObject3 = stubAddBidResponse.getCall(2).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-ad-12345-1');
      expect(bidObject1.getStatusCode()).to.equal(2);
      expect(bidObject1.bidderCode).to.equal('sovrn');

      expect(bidPlacementCode2).to.equal('div-gpt-ad-12345-2');
      expect(bidObject2.getStatusCode()).to.equal(2);
      expect(bidObject2.bidderCode).to.equal('sovrn');

      expect(bidPlacementCode3).to.equal('div-gpt-ad-12345-2');
      expect(bidObject3.getStatusCode()).to.equal(2);
      expect(bidObject3.bidderCode).to.equal('sovrn');

      stubAddBidResponse.calledThrice;
    });

    it('should add a bid response for bids returned and empty bid responses for the rest', function () {
      let response = {
        'id': '54321111',
        'seatbid': [ {
          'bid': [ {
            'id': '1111111',
            'impid': 'bidId2',
            'price': 0.09,
            'nurl': 'http://url',
            'adm': 'ad-code',
            'h': 250,
            'w': 300,
            'dealid': 'ADEAL123',
            'ext': { }
          } ]
        } ]
      };

      $$PREBID_GLOBAL$$.sovrnResponse(response);

      let bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      let bidObject1 = stubAddBidResponse.getCall(0).args[1];
      let bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
      let bidObject2 = stubAddBidResponse.getCall(1).args[1];
      let bidPlacementCode3 = stubAddBidResponse.getCall(2).args[0];
      let bidObject3 = stubAddBidResponse.getCall(2).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-ad-12345-2');
      expect(bidObject1.getStatusCode()).to.equal(1);
      expect(bidObject1.bidderCode).to.equal('sovrn');
      expect(bidObject1.creative_id).to.equal('1111111');
      expect(bidObject1.cpm).to.equal(0.09);
      expect(bidObject1.height).to.equal(250);
      expect(bidObject1.width).to.equal(300);
      expect(bidObject1.ad).to.equal('ad-code<img src="http://url">');
      expect(bidObject1.adId).to.equal('bidId2');
      expect(bidObject1.dealId).to.equal('ADEAL123');

      expect(bidPlacementCode2).to.equal('div-gpt-ad-12345-1');
      expect(bidObject2.getStatusCode()).to.equal(2);
      expect(bidObject2.bidderCode).to.equal('sovrn');

      expect(bidPlacementCode3).to.equal('div-gpt-ad-12345-2');
      expect(bidObject3.getStatusCode()).to.equal(2);
      expect(bidObject3.bidderCode).to.equal('sovrn');

      stubAddBidResponse.calledThrice;
    });
  });
});
