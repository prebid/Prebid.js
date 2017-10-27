import {expect} from 'chai';
import Adapter from '../../../modules/realvukitBidAdapter';
import bidmanager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';
import constants from '../../../src/constants.json';

describe('RealVu_Kit Adapter Test', () => {
  let adapter = new Adapter();
  let sandbox = sinon.sandbox.create();
  let bidmanagerStub;

  const REQUEST = {
    bidderCode: 'realvukit',
    code: 'ad_unit_1',
    sizes: [[300, 250]],
    requestId: '0d67ddab-1502-4897-a7bf-e8078e983405',
    bidderRequestId: '1b5e314fe79b1d',
    bids: [
      {
        bidder: 'realvukit',
        bidId: '1b5e314fe79b1d',
        sizes: [[300, 250]],
        bidderRequestId: '1b5e314fe79b1d',
        mediaType: undefined,
        params: {
          partner_id: '1Y',
          unit_id: '9339508',
        },
        placementCode: 'ad_unit_1',
        renderer: undefined,
        transactionId: '0d67ddab-1502-4897-a7bf-e8078e983405'
      }
    ],
    start: 1504628062271,
    statusMessage: 'bids available'
  };

  const RESPONSE_NOBID = {
    'ad_unit_1':
      {
        bids: {
          bidderCode: 'realvukit',
          statusMessage: 'Bid returned empty or error response',
          width: 300,
          height: 250,
          adId: '25b3f8e4e2f12b',
          bidId: '1b5e314fe79b1d',
          status: constants.STATUS.NO_BID
        }
      },
    p: '9339508',
    uid: 'ad_unit_1',
    bid_id: '1b5e314fe79b1d',
  };

  const RESPONSE_BID = {
    'ad_unit_1':
      {
        bids: {
          bidderCode: 'realvukit',
          statusMessage: 'Bid available',
          width: 300,
          height: 250,
          adId: '25b3f8e4e2f12b',
          bidId: '1b5e314fe79b1d',
          cpm: 0.02,
          ad: '<div></div>',
          adUrl: 'http:localhost/',
          dealId: 'N/A',
          status: constants.STATUS.GOOD
        }
      },
    p: '9339508',
    uid: 'ad_unit_1',
    bid_id: '1b5e314fe79b1d',
  };

  beforeEach(() => {
    adapter = new Adapter();
    sandbox.stub(bidmanager, 'addBidResponse');
    $$PREBID_GLOBAL$$._bidsRequested = [];
    $$PREBID_GLOBAL$$._bidsReceived = [];
    adapter.callBids(REQUEST);
    $$PREBID_GLOBAL$$._bidsRequested.push(REQUEST);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('callBids', () => {
    beforeEach(() => {
      sandbox.stub(adloader, 'loadScript');
      adapter.callBids(REQUEST);
    });

    it('should load script', () => {
      sinon.assert.calledOnce(adloader.loadScript);
      expect(adloader.loadScript.firstCall.args[0]).to.contain('p=9339508');
    });
  }); // end of describe callBids

  describe('realvukit handler verification', () => {
    it('should exist and be a function', () => {
      expect($$PREBID_GLOBAL$$.rvkit_handler).to.exist.and.to.be.a('function');
    });
  }); // end of describe realvukit handler verification

  describe('Bid available response', () => {
    beforeEach(() => {
      $$PREBID_GLOBAL$$.rvkit_handler([ RESPONSE_BID ]);
    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledOnce(bidmanager.addBidResponse);
    });

    it('should have proper placement', () => {
      expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('ad_unit_1');
    });

    it('should have defined bid object', () => {
      expect(bidmanager.addBidResponse.firstCall.args[1]).to.have.property('bidderCode', 'realvukit');
    });
  }); //  end of describe Bid available response

  describe('No bid response', () => {
    beforeEach(() => {
      $$PREBID_GLOBAL$$.rvkit_handler([ RESPONSE_NOBID ]);
    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledOnce(bidmanager.addBidResponse);
    });

    it('should have proper placement', () => {
      expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('ad_unit_1');
    });

    it('should have defined bid object', () => {
      expect(bidmanager.addBidResponse.firstCall.args[1]).to.have.property('statusMessage', 'Bid returned empty or error response');
      expect(bidmanager.addBidResponse.firstCall.args[1]).to.have.property('bidderCode', 'realvukit');
    });
  }); // end of describe no bid response
});
