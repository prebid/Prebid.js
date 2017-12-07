import {expect} from 'chai';
import AntsAdapter from '../../../modules/antsBidAdapter';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

describe('Ants Adapter', () => {
  let adapter;

  beforeEach(() => adapter = new AntsAdapter());

  const AD_REQUEST = {
    bidderCode: 'ants',
    bids: [
      {
        bidder: 'ants',
        params: {
          zoneId: '583906268'
        },
        placementCode: 'ants_583906268',
        sizes: [[300, 250]],
        bidId: 'ants_1234',
        requestId: 'ants_5678'
      }
    ]
  };

  const AD_RESPONSE = {
    callback_uid: 'ants_1234',
    result: {
      width: 300,
      height: 250,
      creative_id: 583985728,
      cpm: 0.05,
      ad: '<creative></creative>'
    }
  };

  const DELIVERY_URL = 'd.ants.vn/hb/583906268.json'
  let stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse');

  describe('callBids', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    describe('bid request', () => {
      const adLoaderStub = sinon.stub(adLoader, 'loadScript');
      describe('Delivery api', () => {
        it('requires parameters to be made', () => {
          adapter.callBids({});
          expect(adLoaderStub.getCall(0)).to.be.null;
        });

        it('should hit the Delivery api endpoint', () => {
          adapter.callBids(AD_REQUEST);
          expect(adLoaderStub.getCall(0).args[0]).to.contain(DELIVERY_URL);
        });
      });
    });

    describe('bid response without bided', () => {
      before(() => {
        adapter.callBids(AD_REQUEST)
      });
      $$PREBID_GLOBAL$$.antsResponse({callback_uid: 'ants_1234', result: {}});
      let bid = stubAddBidResponse.getCall(0).args[1];

      it('should not bit with creative', () => {
        expect(bid.cpm).to.undefined
        expect(bid.height).to.equal(0)
        expect(bid.width).to.equal(0)
        expect(bid.ad).to.undefined
      });
    });

    describe('bid response with bided', () => {
      before(() => {
        adapter.callBids(AD_REQUEST)
      });
      $$PREBID_GLOBAL$$.antsResponse(AD_RESPONSE);
      let bid = stubAddBidResponse.getCall(1).args[1];

      it('should bid with creative', () => {
        expect(bid.cpm).to.equal(0.05);
        expect(bid.height).to.equal(250);
        expect(bid.width).to.equal(300);
        expect(bid.ad).to.equal('<creative></creative>');
      });
    });

    describe('no bid response', () => {
      before(() => {
        adapter.callBids(AD_REQUEST)
      });
      $$PREBID_GLOBAL$$.antsResponse({});

      it('should not bit with creative', () => {
        expect(stubAddBidResponse.calledOnce).to.be.false;
      });
    });
  });
});
