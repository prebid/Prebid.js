describe('jcm adapter tests', function () {
  var expect = require('chai').expect;
  var urlParse = require('url-parse');

  // FYI: querystringify will perform encoding/decoding
  var querystringify = require('querystringify');

  var adapter = require('modules/jcmBidAdapter');
  var adLoader = require('src/adloader');
  var bidmanager = require('src/bidmanager');

  let stubLoadScript;

  beforeEach(function () {
    stubLoadScript = sinon.stub(adLoader, 'loadScript');
  });

  afterEach(function () {
    stubLoadScript.restore();
  });

  describe('creation of bid url', function () {
    if (typeof ($$PREBID_GLOBAL$$._bidsReceived) === 'undefined') {
      $$PREBID_GLOBAL$$._bidsReceived = [];
    }
    if (typeof ($$PREBID_GLOBAL$$._bidsRequested) === 'undefined') {
      $$PREBID_GLOBAL$$._bidsRequested = [];
    }
    if (typeof ($$PREBID_GLOBAL$$._adsReceived) === 'undefined') {
      $$PREBID_GLOBAL$$._adsReceived = [];
    }

    it('should be called only once', function () {
      var params = {
        bidderCode: 'jcm',
        bidder: 'jcm',
        bids: [
          {
		          bidId: '3c9408cdbf2f68',
     		          sizes: [[300, 250], [300, 300]],
            bidder: 'jcm',
            params: { siteId: '3608', adSizes: '300x250' },
            requestId: '10b327aa396609',
            placementCode: '/19968336/header-bid-tag-0'
          }

        ]
      };

      adapter().callBids(params);

      sinon.assert.calledOnce(stubLoadScript);
    });

    it('should fix parameter name', function () {
      var params = {
        bidderCode: 'jcm',
        bidder: 'jcm',
        bids: [
          {
            bidId: '3c9408cdbf2f68',
            sizes: [[300, 250]],
            bidder: 'jcm',
            params: { siteId: '3608', adSizes: '300x250' },
            requestId: '10b327aa396609',
            placementCode: '/19968336/header-bid-tag-0'
          }

        ]
      };

      adapter().callBids(params);
      var bidUrl = stubLoadScript.getCall(0).args[0];

      sinon.assert.calledWith(stubLoadScript, bidUrl);

      var parsedBidUrl = urlParse(bidUrl);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

      expect(parsedBidUrl.hostname).to.equal('media.adfrontiers.com');
      expect(parsedBidUrl.pathname).to.equal('/pq');

      expect(parsedBidUrlQueryString).to.have.property('t').and.to.equal('hb');
      expect(parsedBidUrlQueryString).to.have.property('bids');

      var bidObjArr = JSON.parse(parsedBidUrlQueryString.bids);
      expect(bidObjArr).to.have.property('bids');
      var bidObj = bidObjArr.bids[0];

      expect(bidObj).to.have.property('adSizes').and.to.equal('300x250');
      expect(bidObj).to.have.property('siteId').and.to.equal('3608');
      expect(bidObj).to.have.property('callbackId').and.to.equal('3c9408cdbf2f68');
    });
  });

  describe('placement by size', function () {
    if (typeof ($$PREBID_GLOBAL$$._bidsReceived) === 'undefined') {
      $$PREBID_GLOBAL$$._bidsReceived = [];
    }
    if (typeof ($$PREBID_GLOBAL$$._bidsRequested) === 'undefined') {
      $$PREBID_GLOBAL$$._bidsRequested = [];
    }
    if (typeof ($$PREBID_GLOBAL$$._adsReceived) === 'undefined') {
      $$PREBID_GLOBAL$$._adsReceived = [];
    }

    it('should be called with specific parameters for two bids', function () {
      var params = {
        bidderCode: 'jcm',
        bidder: 'jcm',
        bids: [
          {
            bidId: '3c9408cdbf2f68',
            sizes: [[300, 250]],
            bidder: 'jcm',
            params: { siteId: '3608', adSizes: '300x250' },
            requestId: '10b327aa396609',
            placementCode: '/19968336/header-bid-tag-0'
          },
          {
            bidId: '3c9408cdbf2f69',
            sizes: [[728, 90]],
            bidder: 'jcm',
            params: { siteId: '3608', adSizes: '728x90' },
            requestId: '10b327aa396610',
            placementCode: '/19968336/header-bid-tag-1'
          }

        ]
      };

      adapter().callBids(params);
      var bidUrl = stubLoadScript.getCall(0).args[0];

      sinon.assert.calledWith(stubLoadScript, bidUrl);

      var parsedBidUrl = urlParse(bidUrl);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

      expect(parsedBidUrl.hostname).to.equal('media.adfrontiers.com');
      expect(parsedBidUrl.pathname).to.equal('/pq');

      expect(parsedBidUrlQueryString).to.have.property('t').and.to.equal('hb');
      expect(parsedBidUrlQueryString).to.have.property('bids');

      var bidObjArr = JSON.parse(parsedBidUrlQueryString.bids);
      expect(bidObjArr).to.have.property('bids');
      var bidObj1 = bidObjArr.bids[0];

      expect(bidObj1).to.have.property('adSizes').and.to.equal('300x250');
      expect(bidObj1).to.have.property('siteId').and.to.equal('3608');
      expect(bidObj1).to.have.property('callbackId').and.to.equal('3c9408cdbf2f68');

      var bidObj2 = bidObjArr.bids[1];

      expect(bidObj2).to.have.property('adSizes').and.to.equal('728x90');
      expect(bidObj2).to.have.property('siteId').and.to.equal('3608');
      expect(bidObj2).to.have.property('callbackId').and.to.equal('3c9408cdbf2f69');
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
      bidderCode: 'jcm',
      bidder: 'jcm',
      bidderRequestId: '2068db3c904101',
      bids: [
        {
          bidId: '3c9408cdbf2f68',
          sizes: [[300, 250]],
          bidder: 'jcm',
          params: { siteId: '3608', adSizes: '300x250' },
          requestId: '10b327aa396609',
          placementCode: '/19968336/header-bid-tag-0'
        },
        {
          bidId: '3c9408cdbf2f69',
          sizes: [[728, 90]],
          bidder: 'jcm',
          params: { siteId: '3608', adSizes: '728x90' },
          requestId: '10b327aa396610',
          placementCode: '/19968336/header-bid-tag-1'
        }

      ]
    };

    var response = '{"bids":[{"width":300,"cpm":3,"ad":"%3Cimg+src%3D%22http%3A%2F%2Fmedia.adfrontiers.com%2Fimgs%2Fpartnership_300x250.png%22%3E","callbackId":"3c9408cdbf2f68","height":250},{"width":728,"cpm":0,"ad":"%3Cimg+src%3D%22http%3A%2F%2Fmedia.adfrontiers.com%2Fimgs%2Fpartnership_728x90.png%22%3E","callbackId":"3c9408cdbf2f69","height":90}]}';

    it('callback function should exist', function () {
      expect($$PREBID_GLOBAL$$.processJCMResponse).to.exist.and.to.be.a('function');
    });

    it('bidmanager.addBidResponse should be called twice with correct arguments', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      adapter().callBids(params);

      var adUnits = new Array();
      var unit = new Object();
      unit.bids = [params];
      unit.code = '/19968336/header-bid-tag';
      unit.sizes = [[300, 250], [728, 90]];
      adUnits.push(unit);

      if (typeof ($$PREBID_GLOBAL$$._bidsRequested) === 'undefined') {
        $$PREBID_GLOBAL$$._bidsRequested = [params];
      } else {
        $$PREBID_GLOBAL$$._bidsRequested.push(params);
      }
      $$PREBID_GLOBAL$$.adUnits = adUnits;
      $$PREBID_GLOBAL$$.processJCMResponse(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];
      var bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
      var bidObject2 = stubAddBidResponse.getCall(1).args[1];

      expect(bidPlacementCode1).to.equal('/19968336/header-bid-tag-0');
      expect(bidObject1.cpm).to.equal(3);
      expect(bidObject1.ad).to.equal('<img src="http://media.adfrontiers.com/imgs/partnership_300x250.png">');
      expect(bidObject1.width).to.equal(300);
      expect(bidObject1.height).to.equal(250);
      expect(bidObject1.getStatusCode()).to.equal(1);
      expect(bidObject1.bidderCode).to.equal('jcm');

      expect(bidPlacementCode2).to.equal('/19968336/header-bid-tag-1');
      expect(bidObject2.getStatusCode()).to.equal(2);

      sinon.assert.calledTwice(stubAddBidResponse);
      stubAddBidResponse.restore();
    });
  });
});
