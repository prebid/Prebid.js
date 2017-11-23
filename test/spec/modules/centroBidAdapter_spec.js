describe('centro adapter tests', function () {
  var expect = require('chai').expect;
  var assert = require('chai').assert;
  var urlParse = require('url-parse');
  var querystringify = require('querystringify');

  var adapter = require('modules/centroBidAdapter');
  var bidmanager = require('src/bidmanager');
  var adLoader = require('src/adloader');
  var utils = require('src/utils');

  let stubLoadScript;
  beforeEach(function () {
    stubLoadScript = sinon.stub(adLoader, 'loadScript');
  });

  afterEach(function () {
    stubLoadScript.restore();
  });

  var logErrorSpy;
  beforeEach(function () {
    logErrorSpy = sinon.spy(utils, 'logError');
  });

  afterEach(function () {
    logErrorSpy.restore();
  });

  describe('creation of bid url', function () {
    if (typeof ($$PREBID_GLOBAL$$._bidsRequested) === 'undefined') {
      $$PREBID_GLOBAL$$._bidsRequested = [];
    }

    it('should fix parameter name', function () {
      var params = {
        bidderCode: 'centro',
        bids: [
          {
            bidder: 'centro',
            sizes: [[300, 250]],
            params: {
              unit: 28136,
              page_url: 'http://test_url.ru'
            },
            bidId: '1234',
            placementCode: 'div-gpt-ad-12345-1'
          },
          {
            bidder: 'centro',
            sizes: [[728, 90]],
            params: {
              unit: 28137
            },
            bidId: '5678',
            placementCode: 'div-gpt-ad-12345-2'
          },
          {
            bidder: 'centro',
            sizes: [[728, 90]],
            params: {},
            bidId: '9101112',
            placementCode: 'div-gpt-ad-12345-3'
          }
        ]
      };

      adapter().callBids(params);
      var bidUrl1 = stubLoadScript.getCall(0).args[0];
      var bidUrl2 = stubLoadScript.getCall(1).args[0];

      sinon.assert.calledWith(logErrorSpy, 'Bid has no unit', 'centro');
      sinon.assert.calledWith(stubLoadScript, bidUrl1);

      var parsedBidUrl = urlParse(bidUrl1);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);
      var generatedCallback = 'window["adCentroHandler_28136300x2501234"]';

      expect(parsedBidUrl.hostname).to.equal('staging.brand-server.com');
      expect(parsedBidUrl.pathname).to.equal('/hb');

      expect(parsedBidUrlQueryString).to.have.property('s').and.to.equal('28136');
      expect(parsedBidUrlQueryString).to.have.property('url').and.to.equal('http://test_url.ru');
      expect(parsedBidUrlQueryString).to.have.property('sz').and.to.equal('300x250');
      expect(parsedBidUrlQueryString).to.have.property('callback').and.to.equal(generatedCallback);

      sinon.assert.calledWith(stubLoadScript, bidUrl2);

      parsedBidUrl = urlParse(bidUrl2);
      parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);
      generatedCallback = 'window["adCentroHandler_28137728x905678"]';

      expect(parsedBidUrl.hostname).to.equal('t.brand-server.com');
      expect(parsedBidUrl.pathname).to.equal('/hb');

      expect(parsedBidUrlQueryString).to.have.property('s').and.to.equal('28137');
      expect(parsedBidUrlQueryString).to.have.property('url').and.to.equal(location.href);
      expect(parsedBidUrlQueryString).to.have.property('sz').and.to.equal('728x90');
      expect(parsedBidUrlQueryString).to.have.property('callback').and.to.equal(generatedCallback);
    });
  });

  describe('handling of the callback response', function () {
    if (typeof ($$PREBID_GLOBAL$$._bidsReceived) === 'undefined') {
      $$PREBID_GLOBAL$$._bidsReceived = [];
    }
    if (typeof ($$PREBID_GLOBAL$$._bidsRequested) === 'undefined') {
      $$PREBID_GLOBAL$$._bidsRequested = [];
    }
    if (typeof ($$PREBID_GLOBAL$$._adsReceived) === 'undefined') {
      $$PREBID_GLOBAL$$._adsReceived = [];
    }

    var params = {
      bidderCode: 'centro',
      bids: [
        {
          bidder: 'centro',
          sizes: [[300, 250]],
          params: {
            unit: 28136
          },
          bidId: '12345',
          placementCode: '/19968336/header-bid-tag-0'
        },
        {
          bidder: 'centro',
          sizes: [[728, 90]],
          params: {
            unit: 111111
          },
          bidId: '12346',
          placementCode: '/19968336/header-bid-tag-1'
        },
        {
          bidder: 'centro',
          sizes: [[728, 90]],
          params: {
            unit: 222222
          },
          bidId: '12347',
          placementCode: '/19968336/header-bid-tag-2'
        },
        {
          bidder: 'centro',
          sizes: [[728, 90]],
          params: {
            unit: 333333
          },
          bidId: '12348',
          placementCode: '/19968336/header-bid-tag-3'
        }
      ]
    };

    it('callback function should exist', function () {
      adapter().callBids(params);

      expect(window['adCentroHandler_28136300x25012345'])
        .to.exist.and.to.be.a('function');
      expect(window['adCentroHandler_111111728x9012346'])
        .to.exist.and.to.be.a('function');
    });

    it('bidmanager.addBidResponse should be called with correct arguments', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      adapter().callBids(params);

      var adUnits = new Array();
      var unit = new Object();
      unit.bids = params.bids;
      unit.code = '/19968336/header-bid-tag';
      unit.sizes = [[300, 250], [728, 90]];
      adUnits.push(unit);

      if (typeof ($$PREBID_GLOBAL$$._bidsRequested) === 'undefined') {
        $$PREBID_GLOBAL$$._bidsRequested = [params];
      } else {
        $$PREBID_GLOBAL$$._bidsRequested.push(params);
      }

      $$PREBID_GLOBAL$$.adUnits = adUnits;

      var response = {'adTag': '<div>test content</div>', 'statusMessage': 'Bid available', 'height': 250, '_comment': '', 'value': 0.2, 'width': 300, 'sectionID': 28136};
      var response2 = {'adTag': '', 'statusMessage': 'No bid', 'height': 0, 'value': 0, 'width': 0, 'sectionID': 111111};
      var response3 = {'adTag': '', 'height': 0, 'value': 0, 'width': 0, 'sectionID': 222222};
      var response4 = '';

      window['adCentroHandler_28136300x25012345'](response);
      window['adCentroHandler_111111728x9012346'](response2);
      window['adCentroHandler_222222728x9012347'](response3);
      window['adCentroHandler_333333728x9012348'](response4);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];
      var bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
      var bidObject2 = stubAddBidResponse.getCall(1).args[1];
      var bidPlacementCode3 = stubAddBidResponse.getCall(2).args[0];
      var bidObject3 = stubAddBidResponse.getCall(2).args[1];
      var bidPlacementCode4 = stubAddBidResponse.getCall(3).args[0];
      var bidObject4 = stubAddBidResponse.getCall(3).args[1];

      expect(logErrorSpy.getCall(0).args[0]).to.equal('Requested unit is 222222. Bid has missmatch format.');
      expect(logErrorSpy.getCall(1).args[0]).to.equal('Requested unit is 333333. Response has no bid.');

      expect(bidPlacementCode1).to.equal('/19968336/header-bid-tag-0');
      expect(bidObject1.cpm).to.equal(0.2);
      expect(bidObject1.ad).to.equal('<div>test content</div>');
      expect(bidObject1.width).to.equal(300);
      expect(bidObject1.height).to.equal(250);
      expect(bidObject1.getStatusCode()).to.equal(1);
      expect(bidObject1.bidderCode).to.equal('centro');

      expect(bidPlacementCode2).to.equal('/19968336/header-bid-tag-1');
      expect(bidObject2.getStatusCode()).to.equal(2);
      expect(bidPlacementCode3).to.equal('/19968336/header-bid-tag-2');
      expect(bidObject3.getStatusCode()).to.equal(2);
      expect(bidPlacementCode4).to.equal('/19968336/header-bid-tag-3');
      expect(bidObject4.getStatusCode()).to.equal(2);

      stubAddBidResponse.restore();
    });
  });
});
