describe('smartadserver adapter tests', function () {
  var urlParse = require('url-parse');
  var querystringify = require('querystringify');
  var adapter = require('modules/smartadserverBidAdapter');
  var adLoader = require('src/adloader');
  var expect = require('chai').expect;
  var bidmanager = require('src/bidmanager');
  var CONSTANTS = require('src/constants.json');

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

  var DEFAULT_PARAMS_WO_OPTIONAL = {
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
    }
    ]
  };

  var BID_RESPONSE = {
    cpm: 0.42,
    ad: 'fake ad content',
    width: 300,
    height: 250
  };

  it('set url parameters', function () {
    var stubLoadScript = sinon.stub(adLoader, 'loadScript');

    adapter().callBids(DEFAULT_PARAMS);

    var smartCallback;
    for (var k in $$PREBID_GLOBAL$$) {
      if (k.lastIndexOf('sas_', 0) === 0) {
        smartCallback = k;
        break;
      }
    }

    var bidUrl = stubLoadScript.getCall(0).args[0];
    var parsedBidUrl = urlParse(bidUrl);
    var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

    expect(parsedBidUrl.hostname).to.equal('www.smartadserver.com');
    expect(parsedBidUrl.pathname).to.equal('/prebid');

    expect(parsedBidUrlQueryString).to.have.property('pbjscbk').and.to.equal('pbjs.' + smartCallback);
    expect(parsedBidUrlQueryString).to.have.property('siteid').and.to.equal('1234');
    expect(parsedBidUrlQueryString).to.have.property('pgid').and.to.equal('5678');
    expect(parsedBidUrlQueryString).to.have.property('fmtid').and.to.equal('90');
    expect(parsedBidUrlQueryString).to.have.property('tgt').and.to.equal('test=prebid');
    expect(parsedBidUrlQueryString).to.have.property('ccy').and.to.equal('EUR');
    expect(parsedBidUrlQueryString).to.have.property('bidfloor').and.to.equal('0.42');
    expect(parsedBidUrlQueryString).to.have.property('tag').and.to.equal('sas_42');
    expect(parsedBidUrlQueryString).to.have.property('sizes').and.to.equal('300x250,300x200');
    expect(parsedBidUrlQueryString).to.have.property('async').and.to.equal('1');

    stubLoadScript.restore();
  });

  it('test optional parameters default value', function () {
    var stubLoadScript = sinon.stub(adLoader, 'loadScript');

    adapter().callBids(DEFAULT_PARAMS_WO_OPTIONAL);

    var bidUrl = stubLoadScript.getCall(0).args[0];
    var parsedBidUrl = urlParse(bidUrl);
    var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

    expect(parsedBidUrlQueryString).to.have.property('tgt').and.to.equal('');
    expect(parsedBidUrlQueryString).to.have.property('ccy').and.to.equal('USD');

    stubLoadScript.restore();
  });

  it('creates an empty bid response if no bids', function() {
    var stubLoadScript = sinon.stub(adLoader, 'loadScript', function(url) {
      var bidUrl = stubLoadScript.getCall(0).args[0];
      var parsedBidUrl = urlParse(bidUrl);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

      pbjs[parsedBidUrlQueryString.pbjscbk.split('.')[1]](null);
    });
    var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

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
    var stubLoadScript = sinon.stub(adLoader, 'loadScript', function(url) {
      var bidUrl = stubLoadScript.getCall(0).args[0];
      var parsedBidUrl = urlParse(bidUrl);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

      pbjs[parsedBidUrlQueryString.pbjscbk.split('.')[1]](BID_RESPONSE);
    });
    var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

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
