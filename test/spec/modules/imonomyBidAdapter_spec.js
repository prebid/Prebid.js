import Adapter from '../../../modules/imonomyBidAdapter';
import bidManager from '../../../src/bidmanager';
import {expect} from 'chai';
import adLoader from '../../../src/adloader';

var CONSTANTS = require('../../../src/constants');

describe('imonomy adapter test', () => {
  var utils = require('src/utils');
  let adapter;
  let stubAddBidResponse;
  let sandbox;

  let validBid = {
    bidderCode: 'imonomy',
    bids: [
      {
        bidder: 'imonomy',
        placementCode: 'foo',
        bidId: 'foo',
        sizes: [[300, 250]],
        params: {
          publisher_id: '14567721164',
        }
      }
    ]
  };

  let validResponse = {
    ads: [
      {
        impression_id: 'foo',
        cpm: 1.12,
        creative: '<iframe src="fakeIframeSrc" height="250" width="350"</iframe>'
      }
    ]
  };

  let validResponseUM = {
    um_list: [{type: 'iframe', Url: '#' }, {type: 'redirect', Url: '#' }, {type: 'js', Url: '#' }],
    ads: [
      {
        impression_id: 'foo',
        cpm: 1.12,
        creative: '<iframe src="fakeIframeSrc" height="250" width="350"</iframe>'
      }
    ]
  };

  beforeEach(() => {
    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    stubAddBidResponse.restore();
    sandbox.restore();
  });

  describe('dealing with diffrent situations', () => {
    let server;
    var stubGetUniqueIdentifierStr = sinon.spy(utils, 'getUniqueIdentifierStr');
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
      stubAddBidResponse.restore();
      sandbox.restore();
      stubGetUniqueIdentifierStr.restore();
    });

    it('no bid if cdb handler responds with no bid empty string response', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
        expect(bid).to.satisfy(bid => { return bid.getStatusCode() == CONSTANTS.STATUS.NO_BID });
        done();
      });

      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(validBid);
      var callbackName = '_hb_' + stubGetUniqueIdentifierStr.returnValues[0]
      $$PREBID_GLOBAL$$[callbackName]({})
    });

    it('adds bid for valid request', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
        expect(bid).to.satisfy(bid => { return bid.getStatusCode() == CONSTANTS.STATUS.GOOD });
        done();
      });

      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(validBid);
      var callbackName = '_hb_' + stubGetUniqueIdentifierStr.returnValues[0]
      $$PREBID_GLOBAL$$[callbackName](validResponse)
    });

    it('adds bid for valid request with UM', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
        expect(bid).to.satisfy(bid => { return bid.getStatusCode() == CONSTANTS.STATUS.GOOD });
        done();
      });

      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(validBid);
      var callbackName = '_hb_' + stubGetUniqueIdentifierStr.returnValues[0]
      $$PREBID_GLOBAL$$[callbackName](validResponseUM)
    });
  });
});
