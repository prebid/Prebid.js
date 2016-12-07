import { expect } from 'chai';
import adLoader from '../../../src/adloader';
import bidManager from '../../../src/bidmanager';
import Adapter from '../../../src/adapters/widespace';


const ENDPOINT = '//engine.widespace.com/map/engine/hb/dynamic';

  const TEST = {
    BIDDER_CODE: 'widespace',
    CPM: 2.0,
    PLACEMENT: 'placementId',
    SID: 'f666bfaf-69cf-4ed9-9262-08247bb274e4',
    CUR: 'EUR'
  };

  const BID_REQUEST = {
    "bidderCode": TEST.BIDDER_CODE,
    "requestId": "e155185b-3eac-4f3c-8182-cdb57a69df3c",
    "bidderRequestId": "38993e482321e7",
    "bids": [
      {
        "bidder": TEST.BIDDER_CODE,
        "params": {
          "sid": TEST.SID,
          "cur": TEST.CUR
        },
        "placementCode": TEST.PLACEMENT,
        "sizes": [
          [320, 320],
          [320, 250]
        ],
        "bidId": "45c7f5afb996c1",
        "bidderRequestId": "7101db09af0db3",
        "requestId": "e155185b-3eac-4f3c-8182-cdb57a69df3d"
      }
    ],
    "start": 1479664180396,
    "timeout": 5000
  };


  const BID_RESPONSE = [{
  	"status": "ok",
  	"reqId": "140590112507",
  	"adId": 13963,
  	"width": 320,
  	"height": 320,
  	"cpm": 2.0,
  	"currency": "EUR",
  	"code": "<p>This is a banner</p>",
  	"callbackUid": "45c7f5afb996c1",
  	"callback": "pbjs.widespaceHandleCB"
  }];


describe('WidespaceAdapter', () => {

  let adapter;
  let sandbox;

  beforeEach(() => {
    pbjs._bidsRequested = [];
    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });


  describe('callBids', () => {
    beforeEach(() => {
      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(BID_REQUEST);
    });


    it('should exists and be a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('should call the endpoint once per valid bid', () => {
      sinon.assert.callCount(adLoader.loadScript, 1);
    });

    it('should include required request parameters', () => {
      const endpointRequest = expect(adLoader.loadScript.firstCall.args[0]);
      endpointRequest.to.include('sid');
      endpointRequest.to.include('hb.callbackUid');
      endpointRequest.to.include('hb.callback');
      endpointRequest.to.include('hb.sizes');
      endpointRequest.to.include('hb.name');
    });
  });

  describe('widespaceHandleCB', () => {
    it('should exist and be a function', () => {
      expect(pbjs.widespaceHandleCB).to.exist.and.to.be.a('function');
    });
  });


  describe('respond with a successful bid', () => {
    let successfulBid1,
        placementCode;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');
      sandbox.stub(adLoader, 'loadScript');

      adapter.callBids(BID_REQUEST);
      pbjs._bidsRequested.push(BID_REQUEST);
      pbjs.widespaceHandleCB(BID_RESPONSE);

      console.log(bidManager.addBidResponse.firstCall.args[0]);

      successfulBid1 = bidManager.addBidResponse.firstCall.args[1];
    });

    it('should add one bid', () => {
      sinon.assert.calledOnce(bidManager.addBidResponse);
    });

    it('should use the CPM returned by the server', () => {
      console.log('successfulBid1', successfulBid1);
      console.log('successfulBid1 CPM :::', successfulBid1.cpm);
      expect(successfulBid1).to.have.property('cpm', TEST.CPM);
    });


  });

});
