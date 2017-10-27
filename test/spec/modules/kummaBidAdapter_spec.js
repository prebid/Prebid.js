describe('kumma adapter tests', function () {
  var expect = require('chai').expect;
  var urlParse = require('url-parse');
  var querystringify = require('querystringify');
  var adapter = require('modules/kummaBidAdapter');
  var adLoader = require('src/adloader');
  var bidmanager = require('src/bidmanager');

  var stubLoadScript;

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

    it('bid request for single placement', function () {
      var params = {
        bids: [{
          placementCode: '/19968336/header-bid-tag-0',
          sizes: [[300, 250]],
          bidId: 'bid1111',
          bidder: 'kumma',
          params: { pubId: '37054', siteId: '123' }
        }]
      };

      adapter().callBids(params);

      var bidUrl = stubLoadScript.getCall(0).args[0];

      sinon.assert.calledOnce(stubLoadScript);

      var parsedBidUrl = urlParse(bidUrl);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);
      expect(parsedBidUrlQueryString).to.have.property('pub_id').and.to.equal('37054');
      expect(parsedBidUrlQueryString).to.have.property('site_id').and.to.equal('123');
      expect(parsedBidUrlQueryString).to.have.property('width').and.to.equal('300');
      expect(parsedBidUrlQueryString).to.have.property('height').and.to.equal('250');
    });
  });

  describe('handling bid response', function () {
    it('should return complete bid response', function() {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var params = {
        bids: [{
          placementCode: '/19968336/header-bid-tag-0',
          sizes: [[300, 250]],
          bidId: 'bid1111',
          bidder: 'kumma',
          params: { pubId: '37054', siteId: '123' }
        }]
      };

      var response = {
        cpm: 1,
        width: 300,
        height: 250,
        callback_uid: 'bid1111',
        tag: '<script>document.write("campaign banner");<\/script>'
      };

      adapter().callBids(params);

      var adUnits = [];
      var unit = {};
      unit.bids = params.bids;
      unit.code = '/123456/header-bid-tag-1';
      unit.sizes = [[300, 250]];
      adUnits.push(unit);

      if (typeof ($$PREBID_GLOBAL$$._bidsRequested) === 'undefined') {
        $$PREBID_GLOBAL$$._bidsRequested = [params];
      } else {
        $$PREBID_GLOBAL$$._bidsRequested.push(params);
      }

      $$PREBID_GLOBAL$$.adUnits = adUnits;

      $$PREBID_GLOBAL$$._doKummaCallback(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('/19968336/header-bid-tag-0');
      expect(bidObject1.bidderCode).to.equal('kumma');
      expect(bidObject1.cpm).to.equal(1);
      expect(bidObject1.width).to.equal(300);
      expect(bidObject1.height).to.equal(250);
      expect(bidObject1.ad).to.have.length.above(1);

      stubAddBidResponse.restore();
    });

    it('should return no bid response', function() {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var params = {
        bids: [{
          placementCode: '/19968336/header-bid-tag-0',
          sizes: [[300, 250]],
          bidId: 'bid1111',
          bidder: 'kumma',
          params: { pubId: '37054', siteId: '123' }
        }]
      };

      var response = {
        cpm: 0,
        width: 300,
        height: 250,
        callback_uid: 'bid1111',
        tag: '<script>document.write("default banner");<\/script>'
      };

      adapter().callBids(params);

      var adUnits = [];
      var unit = {};
      unit.bids = params.bids;
      unit.code = '/123456/header-bid-tag-1';
      unit.sizes = [[300, 250]];
      adUnits.push(unit);

      if (typeof ($$PREBID_GLOBAL$$._bidsRequested) === 'undefined') {
        $$PREBID_GLOBAL$$._bidsRequested = [params];
      } else {
        $$PREBID_GLOBAL$$._bidsRequested.push(params);
      }

      $$PREBID_GLOBAL$$.adUnits = adUnits;

      $$PREBID_GLOBAL$$._doKummaCallback(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('/19968336/header-bid-tag-0');
      expect(bidObject1.bidderCode).to.equal('kumma');

      stubAddBidResponse.restore();
    });
  });
});
