describe('twenga adapter tests', function () {
  var urlParse = require('url-parse');
  var querystringify = require('querystringify');
  var adapter = require('src/adapters/twenga');
  var adLoader = require('src/adloader');
  var expect = require('chai').expect;
  var bidmanager = require('src/bidmanager');
  var CONSTANTS = require('src/constants.json');

  var DEFAULT_PARAMS = {
    bidderCode: 'twenga',
    bids: [{
      bidId: 'tw_abcd1234',
      sizes: [[300, 250], [300, 200]],
      bidder: 'twenga',
      params: {
        placementId: 'test',
        siteId: 1234,
        publisherId: 5678,
        currency: 'USD',
        bidFloor: 0.5,
        country: 'DE'
      },
      requestId: 'tw_efgh5678',
      placementCode: 'tw_42'
    }]
  };

  var BID_RESPONSE = {
    result: {
      cpm: 10000,
      width: 300,
      height: 250,
      ad: '//rtb.t.c4tw.net',
      creative_id: 'test'
    },
    callback_uid: 'tw_abcd1234'
  };

  it('sets url parameters', function () {
    var stubLoadScript = sinon.stub(adLoader, 'loadScript');

    adapter().callBids(DEFAULT_PARAMS);

    var bidUrl = stubLoadScript.getCall(0).args[0];
    var parsedBidUrl = urlParse(bidUrl);
    var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

    expect(parsedBidUrl.hostname).to.equal('rtb.t.c4tw.net');
    expect(parsedBidUrl.pathname).to.equal('/Bid');

    expect(parsedBidUrlQueryString).to.have.property('s').and.to.equal('h');
    expect(parsedBidUrlQueryString).to.have.property('callback').and.to.equal('$$PREBID_GLOBAL$$.handleTwCB');
    expect(parsedBidUrlQueryString).to.have.property('callback_uid').and.to.equal('tw_abcd1234');
    expect(parsedBidUrlQueryString).to.have.property('id').and.to.equal('test');

    stubLoadScript.restore();
  });

  var stringToFunction = function (s) {
    var scope = global;
    var scopeSplit = s.split('.');
    for (var i = 0; i < scopeSplit.length - 1; i++) {
      scope = scope[scopeSplit[i]];
      if (scope == undefined) return;
    }
    return scope[scopeSplit[scopeSplit.length - 1]];
  };

  it('creates an empty bid response if no bids', function() {
    var stubLoadScript = sinon.stub(adLoader, 'loadScript', function(url) {
      var bidUrl = stubLoadScript.getCall(0).args[0];
      var parsedBidUrl = urlParse(bidUrl);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

      var callback = stringToFunction(parsedBidUrlQueryString.callback);
      expect(callback).to.exist.and.to.be.a('function');
      callback(undefined);
    });
    var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

    adapter.createNew().callBids(DEFAULT_PARAMS);

    expect(stubAddBidResponse.getCall(0)).to.be.null;

    stubAddBidResponse.restore();
    stubLoadScript.restore();
  });

  it('creates a bid response if bid is returned', function() {
    var stubLoadScript = sinon.stub(adLoader, 'loadScript', function(url) {
      var bidUrl = stubLoadScript.getCall(0).args[0];
      var parsedBidUrl = urlParse(bidUrl);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

      $$PREBID_GLOBAL$$._bidsRequested
                .push({ bidderCode: DEFAULT_PARAMS.bidderCode,
                  bids: [{ bidId: parsedBidUrlQueryString.callback_uid,
                    placementCode: DEFAULT_PARAMS.bids[0].placementCode }]});

      var callback = stringToFunction(parsedBidUrlQueryString.callback);
      expect(callback).to.exist.and.to.be.a('function');
      callback(BID_RESPONSE);
    });
    var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

    adapter.createNew().callBids(DEFAULT_PARAMS);

    var bidResponseAd = stubAddBidResponse.getCall(0).args[1];

    expect(bidResponseAd).to.have.property('cpm').and.to.equal(BID_RESPONSE.result.cpm / 10000);
    expect(bidResponseAd).to.have.property('adUrl').and.to.equal(BID_RESPONSE.result.ad);
    expect(bidResponseAd).to.have.property('width').and.to.equal(BID_RESPONSE.result.width);
    expect(bidResponseAd).to.have.property('height').and.to.equal(BID_RESPONSE.result.height);

    stubAddBidResponse.restore();
    stubLoadScript.restore();
  });
});
