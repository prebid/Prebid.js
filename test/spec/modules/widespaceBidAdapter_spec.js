import { expect } from 'chai';
import adLoader from '../../../src/adloader';
import bidManager from '../../../src/bidmanager';
import Adapter from '../../../modules/widespaceBidAdapter';

const ENDPOINT = '//engine.widespace.com/map/engine/hb/dynamic';

const TEST = {
  BIDDER_CODE: 'widespace',
  CPM: 2.0,
  PLACEMENT_CODE: 'aPlacementCode',
  SID: 'f666bfaf-69cf-4ed9-9262-08247bb274e4',
  CUR: 'EUR'
};

const BID_REQUEST = {
  'bidderCode': TEST.BIDDER_CODE,
  'requestId': 'e155185b-3eac-4f3c-8182-cdb57a69df3c',
  'bidderRequestId': '38993e482321e7',
  'bids': [
    {
      'bidder': TEST.BIDDER_CODE,
      'params': {
        'sid': TEST.SID,
        'cur': TEST.CUR
      },
      'placementCode': TEST.PLACEMENT_CODE,
      'sizes': [
          [320, 320],
          [320, 250]
      ],
      'bidId': '45c7f5afb996c1',
      'bidderRequestId': '7101db09af0db3',
      'requestId': 'e155185b-3eac-4f3c-8182-cdb57a69df3d'
    }
  ],
  'start': 1479664180396,
  'timeout': 5000
};

const BID_RESPONSE = [{
  	'status': 'ok',
  	'reqId': '140590112507',
  	'adId': 13963,
  	'width': 320,
  	'height': 320,
  	'cpm': 2.0,
  	'currency': 'EUR',
  	'code': '<p>This is a banner</p>',
  	'callbackUid': '45c7f5afb996c1',
  	'callback': 'pbjs.widespaceHandleCB'
}];

const BID_NOAD_RESPONSE = [{
  'status': 'noad',
  'reqId': '143509454349',
  'adId': 22,
  'width': 1,
  'height': 1,
  'cpm': 0.0,
  'currency': 'EUR',
  'code': '',
  'callbackUid': '45c7f5afb996c1',
  'callback': 'pbjs.widespaceHandleCB'
}]

describe('WidespaceAdapter', () => {
  let adapter;
  let sandbox;

  beforeEach(() => {
    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('callBids', () => {
    it('should exists and be a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    describe('with valid request parameters', () => {
      beforeEach(() => {
        sandbox.stub(adLoader, 'loadScript');
        adapter.callBids(BID_REQUEST);
      });

      it('should call the endpoint once per valid bid', () => {
        sinon.assert.callCount(adLoader.loadScript, 1);
      });

      it('should include required request parameters', () => {
        const endpointRequest = expect(adLoader.loadScript.firstCall.args[0]);
        endpointRequest.to.include('sid');
        endpointRequest.to.include('hb');
        endpointRequest.to.include('hb.ver');
        endpointRequest.to.include('hb.callbackUid');
        endpointRequest.to.include('hb.callback');
        endpointRequest.to.include('hb.sizes');
        endpointRequest.to.include('hb.name');
      });
    });

    describe('with unvalid request parameters', () => {
      beforeEach(() => {
        sandbox.stub(adLoader, 'loadScript');
      });

      it('should not call the endpoint with if there is no request parameters', () => {
        adapter.callBids({});
        sinon.assert.callCount(adLoader.loadScript, 0);
      });
    });
  });

  describe('widespaceHandleCB', () => {
    it('should exist and be a function', () => {
      expect($$PREBID_GLOBAL$$.widespaceHandleCB).to.exist.and.to.be.a('function');
    });
  });

  describe('respond with a successful bid', () => {
    let successfulBid,
      placementCode;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');
      sandbox.stub(adLoader, 'loadScript');

      adapter.callBids(BID_REQUEST);
      $$PREBID_GLOBAL$$._bidsRequested.push(BID_REQUEST);
      $$PREBID_GLOBAL$$.widespaceHandleCB(BID_RESPONSE);

      successfulBid = bidManager.addBidResponse.firstCall.args[1];
      placementCode = bidManager.addBidResponse.firstCall.args[0];
    });

    it('should add one bid', () => {
      sinon.assert.calledOnce(bidManager.addBidResponse);
    });

    it('should use the CPM returned by the server', () => {
      expect(successfulBid).to.have.property('cpm', TEST.CPM);
    });

    it('should have an OK statusCode', () => {
      expect(successfulBid.getStatusCode()).to.eql(1);
    });

    it('should have a valid size', () => {
      const bidSize = [successfulBid.width, successfulBid.height]
      expect(bidSize).to.eql(BID_REQUEST.bids[0].sizes[0]);
    });

    it('should recive right placementCode', () => {
      expect(placementCode).to.eql(TEST.PLACEMENT_CODE);
    });
  });

  describe('respond with a no-ad', () => {
    let noadBid;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');
      sandbox.stub(adLoader, 'loadScript');

      adapter.callBids(BID_REQUEST);
      $$PREBID_GLOBAL$$._bidsRequested.push(BID_REQUEST);
      $$PREBID_GLOBAL$$.widespaceHandleCB(BID_NOAD_RESPONSE);

      noadBid = bidManager.addBidResponse.firstCall.args[1];
    });

    it('should have an error statusCode', () => {
      expect(noadBid.getStatusCode()).to.eql(2);
    });
  });
});
