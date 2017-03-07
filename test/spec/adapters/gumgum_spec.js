import {expect} from 'chai';
import Adapter from '../../../src/adapters/gumgum';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';
import { STATUS } from '../../../src/constants';

describe('gumgum adapter', () => {
  'use strict';

  let adapter;
  let sandbox;

  const TEST = {
    PUBLISHER_IDENTITY: 'ggumtest',
    BIDDER_CODE: 'gumgum',
    PLACEMENT: 'placementId',
    CPM: 2
  };
  const bidderRequest = {
    bidderCode: TEST.BIDDER_CODE,
    bids: [{ // in-screen
      bidId: 'InScreenBidId',
      bidder: TEST.BIDDER_CODE,
      placementCode: TEST.PLACEMENT,
      sizes: [ [728, 90] ],
      params: {
        inScreen: TEST.PUBLISHER_IDENTITY
      }
    }, { // in-image
      bidId: 'InImageBidId',
      bidder: TEST.BIDDER_CODE,
      placementCode: TEST.PLACEMENT,
      sizes: [ [728, 90] ],
      params: {
        inImage: TEST.PUBLISHER_IDENTITY
      }
    }, { // native
      bidId: 'NativeBidId',
      bidder: TEST.BIDDER_CODE,
      placementCode: TEST.PLACEMENT,
      sizes: [ [728, 90] ],
      params: {
        native: 10
      }
    }, { // slot
      bidId: 'InSlotBidId',
      bidder: TEST.BIDDER_CODE,
      placementCode: TEST.PLACEMENT,
      sizes: [ [728, 90] ],
      params: {
        inSlot: 10
      }
    }, { // no identity
      bidId: 'NoIdentityBidId',
      bidder: TEST.BIDDER_CODE,
      placementCode: TEST.PLACEMENT,
      sizes: [ [728, 90] ]
    }]
  };
  const pageParams = {
    "pvid": "PVID"
  };
  const bidderResponse = {
    "ad": {
      "id": 1,
      "width": 728,
      "height": 90,
      "markup": "<div>some fancy ad</div>",
      "ii": true,
      "du": "http://example.com/",
      "price": TEST.CPM,
      "impurl": "http://example.com/"
    },
    "pag": pageParams
  };
  const emptyResponse = {
    "ad": {},
    "pag": pageParams
  }

  function mockBidResponse(response) {
    sandbox.stub(bidManager, 'addBidResponse');
    sandbox.stub(adLoader, 'loadScript');
    adapter.callBids(bidderRequest);
    pbjs.handleGumGumCB['InScreenBidId'](response);
    return bidManager.addBidResponse.firstCall.args[1];
  }

  beforeEach(() => {
    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('callBids', () => {

    beforeEach(() => {
      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(bidderRequest);
    });

    it('should call the endpoint once per valid bid', () => {
      sinon.assert.callCount(adLoader.loadScript, 4);
    });

    it('should include required browser data', () => {
      const endpointRequest = expect(adLoader.loadScript.firstCall.args[0]);
      endpointRequest.to.include('vw');
      endpointRequest.to.include('vh');
      endpointRequest.to.include('sw');
      endpointRequest.to.include('sh');
    });

    it('should include the global bid timeout', () => {
      const endpointRequest = expect(adLoader.loadScript.firstCall.args[0]);
      endpointRequest.to.include(`tmax=${$$PREBID_GLOBAL$$.cbTimeout}`);
    });

    it('should include the publisher identity', () => {
      const endpointRequest = expect(adLoader.loadScript.firstCall.args[0]);
      endpointRequest.to.include('t=' + TEST.PUBLISHER_IDENTITY);
    });

    it('first call should be in-screen', () => {
      expect(adLoader.loadScript.firstCall.args[0]).to.include('pi=2');
    });

    it('second call should be in-image', () => {
      expect(adLoader.loadScript.secondCall.args[0]).to.include('pi=1');
    });

    it('third call should be native', () => {
      expect(adLoader.loadScript.thirdCall.args[0]).to.include('pi=5');
    });

    it('last call should be slot', () => {
      expect(adLoader.loadScript.lastCall.args[0]).to.include('pi=3');
    });

  });

  describe('handleGumGumCB[...]', () => {
    it('should exist and be a function', () => {
      expect(pbjs.handleGumGumCB['InScreenBidId']).to.exist.and.to.be.a('function');
    });
  });

  describe('respond with a successful bid', () => {

    let successfulBid;

    beforeEach(() => {
      successfulBid = mockBidResponse(bidderResponse);
    });

    it('should add one bid', () => {
      sinon.assert.calledOnce(bidManager.addBidResponse);
    });

    it('should pass the correct placement code as the first param', () => {
      const [ placementCode ] = bidManager.addBidResponse.firstCall.args;
      expect(placementCode).to.eql(TEST.PLACEMENT);
    });

    it('should have a GOOD status code', () => {
      const STATUS_CODE = successfulBid.getStatusCode();
      expect(STATUS_CODE).to.eql(STATUS.GOOD);
    });

    it('should use the CPM returned by the server', () => {
      expect(successfulBid).to.have.property('cpm', TEST.CPM);
    });

    it('should have an ad', () => {
      expect(successfulBid).to.have.property('ad');
    });

    it('should have the size specified by the server', () => {
      expect(successfulBid).to.have.property('width', 728);
      expect(successfulBid).to.have.property('height', 90);
    });

  });

  describe('respond with an empty bid', () => {

    let noBid;

    beforeEach(() => {
      noBid = mockBidResponse(emptyResponse);
    });

    it('should add one bid', () => {
      sinon.assert.calledOnce(bidManager.addBidResponse);
    });

    it('should have a NO_BID status code', () => {
      expect(noBid.getStatusCode()).to.eql(STATUS.NO_BID);
    });

    it('should pass the correct placement code as the first parameter', () => {
      const [ placementCode ] = bidManager.addBidResponse.firstCall.args;
      expect(placementCode).to.eql(TEST.PLACEMENT);
    });

    it('should add the bidder code to the bid object', () => {
      expect(noBid).to.have.property('bidderCode', TEST.BIDDER_CODE);
    });

  });

});
