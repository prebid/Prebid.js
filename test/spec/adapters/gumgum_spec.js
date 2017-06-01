import {expect} from 'chai';
import Adapter from '../../../src/adapters/gumgum';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';
import * as utils from '../../../src/utils';
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
    'pvid': 'PVID'
  };
  const bidderResponse = {
    'ad': {
      'id': 1,
      'width': 728,
      'height': 90,
      'markup': '<div>some fancy ad</div>',
      'ii': true,
      'du': 'http://example.com/',
      'price': TEST.CPM,
      'impurl': 'http://example.com/'
    },
    'pag': pageParams
  };

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

  describe('DigiTrust params', () => {
    beforeEach(() => {
      sandbox.stub(adLoader, 'loadScript');
    });

    it('should send digiTrust params', () => {
      window.DigiTrust = {
        getUser: function() {}
      };
      sandbox.stub(window.DigiTrust, 'getUser', () =>
        ({
          success: true,
          identity: {
            privacy: {optout: false},
            id: 'testId'
          }
        })
      );

      adapter.callBids(bidderRequest);
      expect(adLoader.loadScript.firstCall.args[0]).to.include('&dt=testId');
      delete window.DigiTrust;
    });

    it('should not send DigiTrust params when DigiTrust is not loaded', () => {
      adapter.callBids(bidderRequest);
      expect(adLoader.loadScript.firstCall.args[0]).to.not.include('&dt');
    });

    it('should not send DigiTrust params due to opt out', () => {
      window.DigiTrust = {
        getUser: function() {}
      };
      sandbox.stub(window.DigiTrust, 'getUser', () =>
        ({
          success: true,
          identity: {
            privacy: {optout: true},
            id: 'testId'
          }
        })
      );

      adapter.callBids(bidderRequest);
      expect(adLoader.loadScript.firstCall.args[0]).to.not.include('&dt');
      delete window.DigiTrust;
    });

    it('should not send DigiTrust params on failure', () => {
      window.DigiTrust = {
        getUser: function() {}
      };
      sandbox.stub(window.DigiTrust, 'getUser', () =>
        ({
          success: false,
          identity: {
            privacy: {optout: false},
            id: 'testId'
          }
        })
      );

      adapter.callBids(bidderRequest);
      expect(adLoader.loadScript.firstCall.args[0]).to.not.include('&dt');
      delete window.DigiTrust;
    });
  });

  describe('callBids', () => {
    beforeEach(() => {
      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(bidderRequest);
    });

    it('calls the endpoint once per valid bid', () => {
      sinon.assert.callCount(adLoader.loadScript, 4);
    });

    it('includes required browser data', () => {
      const endpointRequest = expect(adLoader.loadScript.firstCall.args[0]);
      endpointRequest.to.include('vw');
      endpointRequest.to.include('vh');
      endpointRequest.to.include('sw');
      endpointRequest.to.include('sh');
    });

    it('includes the global bid timeout', () => {
      const endpointRequest = expect(adLoader.loadScript.firstCall.args[0]);
      endpointRequest.to.include(`tmax=${$$PREBID_GLOBAL$$.cbTimeout}`);
    });

    it('includes the publisher identity', () => {
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
    it('exists and is function', () => {
      expect(pbjs.handleGumGumCB['InScreenBidId']).to.exist.and.to.be.a('function');
    });
  });

  describe('respond with a successful bid', () => {
    let successfulBid;

    beforeEach(() => {
      successfulBid = mockBidResponse(bidderResponse);
    });

    it('adds one bid', () => {
      sinon.assert.calledOnce(bidManager.addBidResponse);
    });

    it('passes the correct placement code as the first param', () => {
      const [ placementCode ] = bidManager.addBidResponse.firstCall.args;
      expect(placementCode).to.eql(TEST.PLACEMENT);
    });

    it('has a GOOD status code', () => {
      const STATUS_CODE = successfulBid.getStatusCode();
      expect(STATUS_CODE).to.eql(STATUS.GOOD);
    });

    it('uses the CPM returned by the server', () => {
      expect(successfulBid).to.have.property('cpm', TEST.CPM);
    });

    it('has an ad', () => {
      expect(successfulBid).to.have.property('ad');
    });

    it('has the size specified by the server', () => {
      expect(successfulBid).to.have.property('width', 728);
      expect(successfulBid).to.have.property('height', 90);
    });
  });

  describe('respond with an empty bid', () => {
    let noBid;

    beforeEach(() => {
      noBid = mockBidResponse(undefined);
    });

    it('adds one bid', () => {
      sinon.assert.calledOnce(bidManager.addBidResponse);
    });

    it('has a NO_BID status code', () => {
      expect(noBid.getStatusCode()).to.eql(STATUS.NO_BID);
    });

    it('passes the correct placement code as the first parameter', () => {
      const [ placementCode ] = bidManager.addBidResponse.firstCall.args;
      expect(placementCode).to.eql(TEST.PLACEMENT);
    });

    it('adds the bidder code to the bid object', () => {
      expect(noBid).to.have.property('bidderCode', TEST.BIDDER_CODE);
    });
  });

  describe('refresh throttle', () => {
    beforeEach(() => {
      mockBidResponse(bidderResponse);
    });

    afterEach(() => {
      if (utils.logWarn.restore) {
        utils.logWarn.restore();
      }
    });

    it('warns about the throttle limit', function() {
      sinon.spy(utils, 'logWarn');
      // call all the binds again
      adapter.callBids(bidderRequest);
      // the timeout for in-screen should stop one bid request
      const warning = expect(utils.logWarn.args[0][0]);
      warning.to.include(TEST.PLACEMENT);
      warning.to.include('inScreen');
    });
  });
});
