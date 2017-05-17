describe('Piximedia adapter tests', function () {
  var expect = require('chai').expect;
  var urlParse = require('url-parse');

    // var querystringify = require('querystringify');

  var adapter = require('src/adapters/piximedia');
  var adLoader = require('src/adloader');
  var bidmanager = require('src/bidmanager');
  var utils = require('src/utils');
  var CONSTANTS = require('src/constants.json');

  var pbjs = window.pbjs = window.pbjs || {};
  let stubLoadScript;

  beforeEach(function () {
    stubLoadScript = sinon.stub(adLoader, 'loadScript');
  });

  afterEach(function () {
    stubLoadScript.restore();
  });

  describe('creation of prebid url', function () {
    if (typeof (pbjs._bidsReceived) === 'undefined') {
      pbjs._bidsReceived = [];
    }
    if (typeof (pbjs._bidsRequested) === 'undefined') {
      pbjs._bidsRequested = [];
    }
    if (typeof (pbjs._adsReceived) === 'undefined') {
      pbjs._adsReceived = [];
    }

    it('should call the Piximedia prebid URL once on valid calls', function () {
      var params = {
        bidderCode: 'piximedia',
        bidder: 'piximedia',
        bids: [
          {
            bidId: '4d3819cffc4d12',
            sizes: [[300, 250]],
            bidder: 'piximedia',
            params: { siteId: 'TEST', placementId: 'TEST', prebidUrl: '//resources.pm/tests/prebid/bids.js' },
            requestId: '59c318fd382219',
            placementCode: '/20164912/header-bid-tag-0'
          }
        ]
      };

      adapter().callBids(params);
      sinon.assert.calledOnce(stubLoadScript);
    });

    it('should not call the Piximedia prebid URL once on invalid calls', function () {
      var params = {
        bidderCode: 'piximedia',
        bidder: 'piximedia',
        bids: [
          {
            bidId: '4d3819cffc4d12',
            sizes: [[300, 250]],
            bidder: 'piximedia',
            params: { prebidUrl: '//resources.pm/tests/prebid/bids.js' }, // this is invalid: site and placement ID are missing
            requestId: '59c318fd382219',
            placementCode: '/20164912/header-bid-tag-0'
          }
        ]
      };

      adapter().callBids(params);
      sinon.assert.notCalled(stubLoadScript);
    });

    it('should call the correct Prebid URL when using the default URL', function () {
      var params = {
        bidderCode: 'piximedia',
        bidder: 'piximedia',
        bids: [
          {
            bidId: '4d3819cffc4d12',
            sizes: [[300, 250]],
            bidder: 'piximedia',
            params: { siteId: 'TEST', placementId: 'TEST' },
            requestId: '59c318fd382219',
            placementCode: '/20164912/header-bid-tag-0'
          }
        ]
      };

      adapter().callBids(params);
      var bidUrl = stubLoadScript.getCall(0).args[0];

      sinon.assert.calledWith(stubLoadScript, bidUrl);

      var parsedBidUrl = urlParse(bidUrl);

      expect(parsedBidUrl.hostname).to.equal('static.adserver.pm');
      expect(parsedBidUrl.query).to.equal('');
      expect(parsedBidUrl.pathname.replace(/cbid=[a-f0-9]+/, 'cbid=210af5668b1e23').replace(/rand=[0-9]+$/, 'rand=42')).to.equal('/prebid/site_id=TEST/placement_id=TEST/jsonp=pbjs.handlePiximediaCallback/sizes=300x250/cbid=210af5668b1e23/rand=42');
    });

    it('should call the correct Prebid URL when using the default URL with a deal and custom data', function () {
      var params = {
        bidderCode: 'piximedia',
        bidder: 'piximedia',
        bids: [
          {
            bidId: '4d3819cffc4d12',
            sizes: [[300, 250]],
            bidder: 'piximedia',
            params: { siteId: 'TEST', placementId: 'TEST', dealId: 1295, custom: 'bespoke', custom2: function() { return 'bespoke2'; }, custom3: null, custom4: function() {} },
            requestId: '59c318fd382219',
            placementCode: '/20164912/header-bid-tag-0'
          }
        ]
      };

      adapter().callBids(params);
      var bidUrl = stubLoadScript.getCall(0).args[0];

      sinon.assert.calledWith(stubLoadScript, bidUrl);

      var parsedBidUrl = urlParse(bidUrl);

      expect(parsedBidUrl.hostname).to.equal('static.adserver.pm');
      expect(parsedBidUrl.query).to.equal('');
      expect(parsedBidUrl.pathname.replace(/cbid=[a-f0-9]+/, 'cbid=210af5668b1e23').replace(/rand=[0-9]+$/, 'rand=42')).to.equal('/prebid/site_id=TEST/placement_id=TEST/l_id=1295/custom=bespoke/custom2=bespoke2/custom3=/custom4=/jsonp=pbjs.handlePiximediaCallback/sizes=300x250/cbid=210af5668b1e23/rand=42');
    });

    it('should call the correct Prebid URL when using the default URL and overridding sizes', function () {
      var params = {
        bidderCode: 'piximedia',
        bidder: 'piximedia',
        bids: [
          {
            bidId: '4d3819cffc4d12',
            sizes: [[300, 250]],
            bidder: 'piximedia',
            params: { siteId: 'TEST', placementId: 'TEST', sizes: [[300, 600], [728, 90]] },
            requestId: '59c318fd382219',
            placementCode: '/20164912/header-bid-tag-0'
          }
        ]
      };

      adapter().callBids(params);
      var bidUrl = stubLoadScript.getCall(0).args[0];

      sinon.assert.calledWith(stubLoadScript, bidUrl);

      var parsedBidUrl = urlParse(bidUrl);

      expect(parsedBidUrl.hostname).to.equal('static.adserver.pm');
      expect(parsedBidUrl.query).to.equal('');
      expect(parsedBidUrl.pathname.replace(/cbid=[a-f0-9]+/, 'cbid=210af5668b1e23').replace(/rand=[0-9]+$/, 'rand=42')).to.equal('/prebid/site_id=TEST/placement_id=TEST/jsonp=pbjs.handlePiximediaCallback/sizes=300x600%2C728x90/cbid=210af5668b1e23/rand=42');
    });

    it('should call the correct Prebid URL when supplying a custom URL', function () {
      var params = {
        bidderCode: 'piximedia',
        bidder: 'piximedia',
        bids: [
          {
            bidId: '4d3819cffc4d12',
            sizes: [[300, 250]],
            bidder: 'piximedia',
            params: { siteId: 'TEST', placementId: 'TEST', prebidUrl: '//resources.pm/tests/prebid/bids.js' },
            requestId: '59c318fd382219',
            placementCode: '/20164912/header-bid-tag-0'
          }
        ]
      };

      adapter().callBids(params);
      var bidUrl = stubLoadScript.getCall(0).args[0];

      sinon.assert.calledWith(stubLoadScript, bidUrl);

      var parsedBidUrl = urlParse(bidUrl);

      expect(parsedBidUrl.hostname).to.equal('resources.pm');
      expect(parsedBidUrl.query).to.equal('');
      expect(parsedBidUrl.pathname.replace(/cbid=[a-f0-9]+/, 'cbid=210af5668b1e23').replace(/rand=[0-9]+$/, 'rand=42')).to.equal('/tests/prebid/bids.js/site_id=TEST/placement_id=TEST/jsonp=pbjs.handlePiximediaCallback/sizes=300x250/cbid=210af5668b1e23/rand=42');
    });
  });

  describe('handling of the callback response', function () {
    if (typeof (pbjs._bidsReceived) === 'undefined') {
      pbjs._bidsReceived = [];
    }
    if (typeof (pbjs._bidsRequested) === 'undefined') {
      pbjs._bidsRequested = [];
    }
    if (typeof (pbjs._adsReceived) === 'undefined') {
      pbjs._adsReceived = [];
    }

    var params = {
      bidderCode: 'piximedia',
      bidder: 'piximedia',
      bids: [
        {
          bidId: '4d3819cffc4d12',
          sizes: [[300, 250]],
          bidder: 'piximedia',
          params: { siteId: 'TEST', placementId: 'TEST', prebidUrl: '//resources.pm/tests/prebid/bids.js' },
          requestId: '59c318fd382219',
          placementCode: '/20164912/header-bid-tag-0'
        }
      ]
    };

    it('Piximedia callback function should exist', function () {
      expect(pbjs.handlePiximediaCallback).to.exist.and.to.be.a('function');
    });

    it('bidmanager.addBidResponse should be called once with correct arguments', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      var stubGetUniqueIdentifierStr = sinon.spy(utils, 'getUniqueIdentifierStr');

      var response = {
        foundbypm: true,
        currency: 'EUR',
        cpm: 1.23,
        dealId: 9948,
        width: 300,
        height: 250,
        html: '<div>ad</div>'
      };

      adapter().callBids(params);

      var adUnits = [];
      var unit = {};
      unit.bids = [params];
      unit.code = '/20164912/header-bid-tag';
      unit.sizes = [[300, 250], [728, 90]];
      adUnits.push(unit);

      if (typeof (pbjs._bidsRequested) === 'undefined') {
        pbjs._bidsRequested = [params];
      } else {
        pbjs._bidsRequested.push(params);
      }
      pbjs.adUnits = adUnits;
      response.cbid = stubGetUniqueIdentifierStr.returnValues[0];

      pbjs.handlePiximediaCallback(response);

      sinon.assert.calledOnce(stubAddBidResponse);
      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('/20164912/header-bid-tag-0');
      expect(bidObject1.cpm).to.equal(1.23);
      expect(bidObject1.ad).to.equal('<div>ad</div>');
      expect(bidObject1.width).to.equal(300);
      expect(bidObject1.dealId).to.equal(9948);
      expect(bidObject1.height).to.equal(250);
      expect(bidObject1.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(bidObject1.bidderCode).to.equal('piximedia');

      stubAddBidResponse.restore();
      stubGetUniqueIdentifierStr.restore();
    });

    it('bidmanager.addBidResponse should be called once with correct arguments on partial response', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      var stubGetUniqueIdentifierStr = sinon.spy(utils, 'getUniqueIdentifierStr');

            // this time, we do not provide dealId
      var response = {
        foundbypm: true,
        cpm: 1.23,
        width: 300,
        height: 250,
        currency: 'EUR',
        html: '<div>ad</div>'
      };

      adapter().callBids(params);

      var adUnits = [];
      var unit = {};
      unit.bids = [params];
      unit.code = '/20164912/header-bid-tag';
      unit.sizes = [[300, 250], [728, 90]];
      adUnits.push(unit);

      if (typeof (pbjs._bidsRequested) === 'undefined') {
        pbjs._bidsRequested = [params];
      } else {
        pbjs._bidsRequested.push(params);
      }
      pbjs.adUnits = adUnits;
      response.cbid = stubGetUniqueIdentifierStr.returnValues[0];

      pbjs.handlePiximediaCallback(response);

      sinon.assert.calledOnce(stubAddBidResponse);
      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('/20164912/header-bid-tag-0');
      expect(bidObject1.cpm).to.equal(1.23);
      expect(bidObject1.ad).to.equal('<div>ad</div>');
      expect(bidObject1.width).to.equal(300);
      expect(bidObject1.height).to.equal(250);
      expect(bidObject1.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(bidObject1.bidderCode).to.equal('piximedia');

      stubAddBidResponse.restore();
      stubGetUniqueIdentifierStr.restore();
    });

    it('bidmanager.addBidResponse should be called once without any ads', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      var stubGetUniqueIdentifierStr = sinon.spy(utils, 'getUniqueIdentifierStr');

      var response = {
        foundbypm: false
      };

      adapter().callBids(params);

      var adUnits = [];
      var unit = {};
      unit.bids = [params];
      unit.code = '/20164912/header-bid-tag';
      unit.sizes = [[300, 250], [728, 90]];
      adUnits.push(unit);

      if (typeof (pbjs._bidsRequested) === 'undefined') {
        pbjs._bidsRequested = [params];
      } else {
        pbjs._bidsRequested.push(params);
      }
      pbjs.adUnits = adUnits;
      response.cbid = stubGetUniqueIdentifierStr.returnValues[0];

      pbjs.handlePiximediaCallback(response);

      sinon.assert.calledOnce(stubAddBidResponse);
      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('/20164912/header-bid-tag-0');
      expect(bidObject1.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(bidObject1.bidderCode).to.equal('piximedia');

      stubAddBidResponse.restore();
      stubGetUniqueIdentifierStr.restore();
    });

    it('bidmanager.addBidResponse should not be called on bogus cbid', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      var stubGetUniqueIdentifierStr = sinon.spy(utils, 'getUniqueIdentifierStr');

      var response = {
        foundbypm: false
      };

      adapter().callBids(params);

      var adUnits = [];
      var unit = {};
      unit.bids = [params];
      unit.code = '/20164912/header-bid-tag';
      unit.sizes = [[300, 250], [728, 90]];
      adUnits.push(unit);

      if (typeof (pbjs._bidsRequested) === 'undefined') {
        pbjs._bidsRequested = [params];
      } else {
        pbjs._bidsRequested.push(params);
      }
      pbjs.adUnits = adUnits;
      response.cbid = stubGetUniqueIdentifierStr.returnValues[0] + '_BOGUS';

      pbjs.handlePiximediaCallback(response);

      sinon.assert.notCalled(stubAddBidResponse);

      stubAddBidResponse.restore();
      stubGetUniqueIdentifierStr.restore();
    });

    it('bidmanager.addBidResponse should not be called on bogus response', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var response = null; // this is bogus: we expect an object

      adapter().callBids(params);

      var adUnits = [];
      var unit = {};
      unit.bids = [params];
      unit.code = '/20164912/header-bid-tag';
      unit.sizes = [[300, 250], [728, 90]];
      adUnits.push(unit);

      if (typeof (pbjs._bidsRequested) === 'undefined') {
        pbjs._bidsRequested = [params];
      } else {
        pbjs._bidsRequested.push(params);
      }
      pbjs.adUnits = adUnits;

      pbjs.handlePiximediaCallback(response);

      sinon.assert.notCalled(stubAddBidResponse);

      stubAddBidResponse.restore();
    });
  });
});
