import {expect} from 'chai';
import Adapter from 'modules/admediaBidAdapter';
import bidManager from 'src/bidmanager';
import adLoader from 'src/adloader';
import { userSync } from 'src/userSync.js';

var CONSTANTS = require('src/constants.json');

describe('AdMedia', () => {
  let bidsRequestedOriginal;
  let adapter;
  let sandbox;

  const request_single_adunit = {
    bidderCode: 'admedia',
    requestId: 'af56e125-cb39-41b4-a670-9d519e12a6e8',
    bidderRequestId: '17b1517e0150b18',
    bids: [{
      bidder: 'admedia',
      params: {
        aid: '1234'
      },
      placementCode: 'div-gpt-ad-1',
      transactionId: '361e3012-b101-4c33-8e66-c70391db080a',
      sizes: [
        [300, 250],
        [300, 600]
      ],
      bidId: '22370f7a5e4575',
      bidderRequestId: '17b1517e0150b18',
      requestId: 'af56e125-cb39-41b4-a670-9d519e12a6e8'
    }],
    auctionStart: 1512680230838,
    timeout: 3000,
    start: 1512680230842
  };

  const request_two_adunits = {
    bidderCode: 'admedia',
    requestId: '732342a0-1816-4958-8a83-11a177dc2f66',
    bidderRequestId: '1053cf6ee4e7378',
    bids: [{
      bidder: 'admedia',
      params: {
        aid: '1234'
      },
      placementCode: 'div-gpt-ad-1',
      transactionId: '2dd5d47e-ff53-48ee-9cf1-fb794f1a278e',
      sizes: [
        [300, 250],
        [300, 600]
      ],
      bidId: '2f73504e56178c8',
      bidderRequestId: '1053cf6ee4e7378',
      requestId: '732342a0-1816-4958-8a83-11a177dc2f66'
    }, {
      bidder: 'admedia',
      params: {
        aid: '1234'
      },
      placementCode: 'div-gpt-ad-2',
      transactionId: 'b96c6e98-0fef-4bf1-a723-74231cf51506',
      sizes: [
        [728, 90]
      ],
      bidId: '3a98b3bbc46a228',
      bidderRequestId: '1053cf6ee4e7378',
      requestId: '732342a0-1816-4958-8a83-11a177dc2f66'
    }],
    auctionStart: 1512680736775,
    timeout: 3000,
    start: 1512680736780
  };

  beforeEach(() => {
    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('CallBids Input validation', () => {
    beforeEach(() => {
      adapter = new Adapter();
    });

    afterEach(() => {
    });

    it('Valid bid-request with single adunit', () => {
      let bidderRequest;

      sandbox.stub(adapter, 'callBids');
      adapter.callBids(request_single_adunit);

      bidderRequest = adapter.callBids.getCall(0).args[0];

      expect(bidderRequest).to.have.property('bids')
        .that.is.an('array')
        .with.lengthOf(1);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .to.have.property('bidder', 'admedia');

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('sizes')
        .that.is.an('array')
        .with.lengthOf(2)
        .that.deep.equals(request_single_adunit.bids[0].sizes);
    });

    it('Valid bid-request with multiple adunits', () => {
      let bidderRequest;

      sandbox.stub(adapter, 'callBids');
      adapter.callBids(request_two_adunits);

      bidderRequest = adapter.callBids.getCall(0).args[0];

      expect(bidderRequest).to.have.property('bids')
        .that.is.an('array')
        .with.lengthOf(2);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .to.have.property('bidder', 'admedia');

      expect(bidderRequest).to.have.deep.property('bids[1]')
        .to.have.property('bidder', 'admedia');

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('sizes')
        .that.is.an('array')
        .with.lengthOf(2)
        .that.deep.equals(request_two_adunits.bids[0].sizes);

      expect(bidderRequest).to.have.deep.property('bids[1]')
        .with.property('sizes')
        .that.is.an('array')
        .with.lengthOf(1)
        .that.deep.equals(request_two_adunits.bids[1].sizes);
    });
  });

  describe('Bid requsest Validation', () => {
    beforeEach(() => {
      adapter = new Adapter();
    });

    afterEach(() => {
    });

    it('should have one bid request for single adunit', () => {
      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(request_single_adunit);
      sinon.assert.calledOnce(adLoader.loadScript);
    });

    it('should have two bid requests for two adunits', () => {
      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(request_two_adunits);
      sinon.assert.calledTwice(adLoader.loadScript);
    });

    it('should contain valid query string params', () => {
      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(request_single_adunit);
      expect(adLoader.loadScript.firstCall.args[0]).to.include('//b.admedia.com/banner/prebid/bidder/');
      expect(adLoader.loadScript.firstCall.args[0]).to.include('aid=1234');
      expect(adLoader.loadScript.firstCall.args[0]).to.include('&size=300x250');
      expect(adLoader.loadScript.firstCall.args[0]).to.include('&promo_sizes=300x600');
      expect(adLoader.loadScript.firstCall.args[0]).to.include('siteDomain');
      expect(adLoader.loadScript.firstCall.args[0]).to.include('sitePage');
      expect(adLoader.loadScript.firstCall.args[0]).to.include('callbackId');
    });
  });

  describe('Bid Response Validation', () => {
    let bidObject;
    let placementCode;

    beforeEach(() => {
      adapter = new Adapter();
      sandbox.stub(bidManager, 'addBidResponse');

      bidsRequestedOriginal = $$PREBID_GLOBAL$$._bidsRequested;
      $$PREBID_GLOBAL$$._bidsRequested = [];

      $$PREBID_GLOBAL$$._bidsRequested.push(request_single_adunit);

      let bidderReponse = {
        'cpm': 0.92,
        'ad': 'Banner Ad',
        'width': '300',
        'height': '250',
        'callback_id': '22370f7a5e4575'
      };

      $$PREBID_GLOBAL$$.admediaHandler(bidderReponse);

      placementCode = bidManager.addBidResponse.firstCall.args[0];
      bidObject = bidManager.addBidResponse.firstCall.args[1];
    });

    afterEach(() => {
      $$PREBID_GLOBAL$$._bidsRequested = bidsRequestedOriginal;
    });

    it('should add a bid object for each response', () => {
      sinon.assert.calledOnce(bidManager.addBidResponse);
    });

    it('should pass the correct placement code as first param', () => {
      expect(placementCode).to.eql('div-gpt-ad-1');
    });

    it('should have a good statusCode', () => {
      expect(bidObject.getStatusCode()).to.eql(CONSTANTS.STATUS.GOOD);
    });

    it('should add the CPM to the bid object', () => {
      expect(bidObject).to.have.property('cpm', 0.92);
    });

    it('should include the ad to the bid object', () => {
      expect(bidObject).to.have.property('ad');
    });

    it('should include the size to the bid object', () => {
      expect(bidObject).to.have.property('width', '300');
      expect(bidObject).to.have.property('height', '250');
    });

    it('should include bidder code admedia', () => {
      expect(bidObject).to.have.property('bidderCode', 'admedia');
    });
  });

  describe('usersyncs', () => {
    beforeEach(() => {
      adapter = new Adapter();
      adapter.callBids(request_single_adunit);
      sandbox.stub(userSync, 'triggerUserSyncs');
    });

    afterEach(() => {
    });

    it('should call usersync after default 3000 seconds', () => {
      window.setTimeout(function() {
        sinon.assert.calledOnce(userSync.triggerUserSyncs);
      }, 3000);
    });
  });
});
