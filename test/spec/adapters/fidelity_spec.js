describe('fidelity adapter tests', function() {
  const expect = require('chai').expect;
  const adapter = require('src/adapters/fidelity');
  const adLoader = require('src/adloader');
  const bidmanager = require('src/bidmanager');
  const STATUS = require('src/constants').STATUS;
  var urlParse = require('url-parse');
  var querystringify = require('querystringify');

  describe('creation of bid url', function () {
    it('should be called', function () {
      var stubLoadScript;
      stubLoadScript = sinon.stub(adLoader, 'loadScript');

      var bidderRequest = {
        bidderCode: 'fidelity',
        bids: [
          {
            bidId: 'bidId-123456-1',
            bidder: 'fidelity',
            params: {
              zoneid: '37'
            },
            placementCode: 'div-gpt-ad-123456-1'
          },
        ]
      };

      adapter().callBids(bidderRequest);
      sinon.assert.called(stubLoadScript);

      stubLoadScript.restore();
    });

    it('should populate required parameters', function () {
      var stubLoadScript;
      stubLoadScript = sinon.stub(adLoader, 'loadScript');

      var bidderRequest = {
        bidderCode: 'fidelity',
        bids: [
          {
            bidId: 'bidId-123456-1',
            bidder: 'fidelity',
            params: {
              zoneid: '37',
            },
            placementCode: 'div-gpt-ad-123456-1'
          },
        ]
      };

      adapter().callBids(bidderRequest);

      stubLoadScript.restore();
    });

    it('should populate required and optional parameters', function () {
      var stubLoadScript;
      stubLoadScript = sinon.stub(adLoader, 'loadScript');

      var bidderRequest = {
        bidderCode: 'fidelity',
        bids: [
          {
            bidId: 'bidId-123456-1',
            bidder: 'fidelity',
            params: {
              zoneid: '37',
              server: 't.fidelity-media.com',
              loc: 'http://locurl',
              click: 'http://clickurl',
              subid: '000'
            },
            placementCode: 'div-gpt-ad-123456-1'
          },
        ]
      };

      adapter().callBids(bidderRequest);

      var requestURI = stubLoadScript.getCall(0).args[0];
      var parsedBidUrl = urlParse(requestURI);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

      expect(parsedBidUrl.hostname).to.equal('t.fidelity-media.com');

      expect(parsedBidUrlQueryString).to.have.property('zoneid').and.to.equal('37');
      expect(parsedBidUrlQueryString).to.have.property('impid').and.to.equal('bidId-123456-1');
      expect(parsedBidUrlQueryString).to.have.property('callback').and.to.equal('window.$$PREBID_GLOBAL$$.fidelityResponse');
      expect(parsedBidUrlQueryString).to.have.property('loc').and.to.equal('http://locurl');
      expect(parsedBidUrlQueryString).to.have.property('ct0').and.to.equal('http://clickurl');
      expect(parsedBidUrlQueryString).to.have.property('subid').and.to.equal('000');

      stubLoadScript.restore();
    });
  });

  describe('fidelityResponse', function () {
    it('should exist and be a function', function () {
      expect(pbjs.fidelityResponse).to.exist.and.to.be.a('function');
    });

    it('should add empty bid response if no bids returned', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var bidderRequest = {
        bidderCode: 'fidelity',
        bids: [
          {
            bidId: 'bidId-123456-1',
            bidder: 'fidelity',
            params: {
              zoneid: '37'
            },
            placementCode: 'div-gpt-ad-123456-1'
          },
        ]
      };

      // no bids returned in the response.
      var response = {
        'id': '543210',
        'seatbid': []
      };

      pbjs._bidsRequested.push(bidderRequest);
      // adapter needs to be called, in order for the stub to register.
      adapter()

      pbjs.fidelityResponse(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-ad-123456-1');
      expect(bidObject1.getStatusCode()).to.equal(2);
      expect(bidObject1.bidderCode).to.equal('fidelity');

      stubAddBidResponse.restore();
    });

    it('should add a bid response for bid returned', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var bidderRequest = {
        bidderCode: 'fidelity',
        bids: [
          {
            bidId: 'bidId-123456-1',
            bidder: 'fidelity',
            params: {
              zoneid: '37'
            },
            placementCode: 'div-gpt-ad-123456-1'
          },
        ]
      };

      // Returning a single bid in the response.
      var response = {
        'id': '543210',
        'seatbid': [ {
          'bid': [ {
            'id': '1111111',
            'impid': 'bidId-123456-1',
            'price': 0.09,
            'adm': '<<creative>>',
            'height': 90,
            'width': 728
          } ]
        } ]
      };

      pbjs._bidsRequested.push(bidderRequest);
      // adapter needs to be called, in order for the stub to register.
      adapter()

      pbjs.fidelityResponse(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-ad-123456-1');
      expect(bidObject1.getStatusCode()).to.equal(1);
      expect(bidObject1.bidderCode).to.equal('fidelity');
      expect(bidObject1.cpm).to.equal(0.09);
      expect(bidObject1.height).to.equal(90);
      expect(bidObject1.width).to.equal(728);
      expect(bidObject1.ad).to.equal('<<creative>>');

      stubAddBidResponse.restore();
    });
  });
});
