import {expect} from 'chai';
import Adapter from '../../../modules/realvukitBidAdapter';
import bidmanager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';
import constants from '../../../src/constants.json';

describe('RealVu_Kit Adapter Test', () => {
  let adapter = new Adapter();
  let sandbox;

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
          statusMessage: 'no bid returned or error',
          adId: '25b3f8e4e2f12b',
          bidId: '1b5e314fe79b1d'
        }
      }
  };

  beforeEach(() => {
    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
    $$PREBID_GLOBAL$$._bidsRequested = [];
    $$PREBID_GLOBAL$$._bidsReceived = [];
  });

  afterEach(() => {
    sandbox.restore();

  });

  describe('callBids', () => {
    beforeEach(() => {
      sandbox.stub(adloader, 'loadScript');
      adapter.callBids(REQUEST);
    });

    afterEach(() => {
      sandbox.restore();
    })

    it('should load script', () => {
      sinon.assert.calledOnce(adloader.loadScript);
      expect(adloader.loadScript.firstCall.args[0]).to.contain('p=9339508');
    });
  });

  describe('realvukitResponse', () => {
    it('should exist and be a function', () => {
      expect($$PREBID_GLOBAL$$.rvkit_handler).to.exist.and.to.be.a('function');
    });
  });

  describe('No bid response', () => {
    let firstBid;

    beforeEach(() => {
      sandbox.stub(bidmanager, 'addBidResponse');

      //$$PREBID_GLOBAL$$._bidsRequested.push(REQUEST);
      //adapter.callBids(REQUEST);

      $$PREBID_GLOBAL$$.rvkit_handler([ RESPONSE_NOBID ]);

    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledOnce(bidmanager.addBidResponse);
    });
  });


  describe('Test Bid Request', () => {
    let xhr;
    let requests;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
    });

    afterEach(() => xhr.restore());

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('requires parameters to make request', () => {
      adapter.callBids({});
      expect(requests).to.be.empty;
    });
  }); // endof Describe test bid request
});
