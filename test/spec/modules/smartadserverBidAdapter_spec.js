import {expect} from 'chai';
import querystringify from 'querystringify';
import urlParse from 'url-parse';
import adapter from '../../../modules/smartadserverBidAdapter';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';
import CONSTANTS from '../../../src/constants.json';

describe('smartadserver adapter tests', function () {
  var DEFAULT_PARAMS = {
    bidderCode: 'smartadserver',
    bids: [{
      bidId: 'abcd1234',
      sizes: [[300, 250], [300, 200]],
      bidder: 'smartadserver',
      params: {
        domain: 'http://www.smartadserver.com',
        siteId: '1234',
        pageId: '5678',
        formatId: '90',
        target: 'test=prebid',
        currency: 'EUR',
        bidfloor: 0.420
      },
      requestId: 'efgh5678',
      placementCode: 'sas_42'
    }
    ]
  };

  var DEFAULT_PARAMS = {
    bidderCode: 'smartadserver',
    bids: [{
      bidId: 'abcd1234',
      sizes: [[300, 250], [300, 200]],
      bidder: 'smartadserver',
      params: {
        networkId: 10,
        domain: 'http://www.smartadserver.com',
        siteId: '1234',
        pageId: '5678',
        formatId: '90',
        target: 'test=prebid',
        currency: 'EUR'
      },
      requestId: 'efgh5678',
      placementCode: 'sas_42'
    }]
  };

  var BID_RESPONSE = {
    cpm: 0.42,
    ad: 'fake ad content',
    width: 300,
    height: 250
  };

  it('test Smart script url', function () {
    var stubLoadScript = sinon.stub(adLoader, 'loadScript');

    var params = {
      bidderCode: 'smartadserver',
      bids: [{
        bidId: 'abcd1234',
        sizes: [[300, 250], [300, 200]],
        bidder: 'smartadserver',
        params: {
          domain: 'http://www.smartadserver.com',
          siteId: '1234',
          pageId: '5678',
          formatId: '90'
        },
        requestId: 'efgh5678',
        placementCode: 'sas_42'
      }]
    };

    adapter().callBids(params);

    var bidUrl = stubLoadScript.getCall(0).args[0];
    expect(bidUrl).to.equal('//ced.sascdn.com/tag/0/sas-prebid.js');

    stubLoadScript.restore();
  });

  it('creates an empty bid response if no bids', function() {
    pbjs.sas = {
      callBid: function(params, bidIndex, callbackId) {
        pbjs[callbackId](null);
      }
    };
    var stubLoadScript = sinon.stub(adLoader, 'loadScript', function(url, callback) {
      callback();
    });
    var stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse');

    adapter().callBids(DEFAULT_PARAMS);

    var bidResponsePlacementCode = stubAddBidResponse.getCall(0).args[0];
    var bidResponseAd = stubAddBidResponse.getCall(0).args[1];

    expect(bidResponsePlacementCode).to.equal(DEFAULT_PARAMS.bids[0].placementCode);
    expect(bidResponseAd.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
    expect(bidResponseAd).to.have.property('bidderCode').and.to.equal('smartadserver');

    stubLoadScript.restore();
    stubAddBidResponse.restore();
  });

  it('creates a bid response if bid is returned', function() {
    pbjs.sas = {
      callBid: function(params, bidIndex, callbackId) {
        pbjs[callbackId](BID_RESPONSE);
      }
    };
    var stubLoadScript = sinon.stub(adLoader, 'loadScript', function(url, callback) {
      callback();
    });
    var stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse');

    adapter().callBids(DEFAULT_PARAMS);

    var bidResponsePlacementCode = stubAddBidResponse.getCall(0).args[0];
    var bidResponseAd = stubAddBidResponse.getCall(0).args[1];

    expect(bidResponsePlacementCode).to.equal(DEFAULT_PARAMS.bids[0].placementCode);
    expect(bidResponseAd.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
    expect(bidResponseAd).to.have.property('bidderCode').and.to.equal('smartadserver');
    expect(bidResponseAd).to.have.property('cpm').and.to.equal(BID_RESPONSE.cpm);
    expect(bidResponseAd).to.have.property('ad').and.to.equal(BID_RESPONSE.ad);
    expect(bidResponseAd).to.have.property('width').and.to.equal(BID_RESPONSE.width);
    expect(bidResponseAd).to.have.property('height').and.to.equal(BID_RESPONSE.height);

    stubLoadScript.restore();
    stubAddBidResponse.restore();
  });
});
