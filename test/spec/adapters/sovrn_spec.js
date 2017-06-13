describe('sovrn adapter tests', function () {
  const expect = require('chai').expect;
  const adapter = require('src/adapters/sovrn');
  const bidmanager = require('src/bidmanager');

  describe('sovrnResponse', function () {
    it('should exist and be a function', function () {
      expect(pbjs.sovrnResponse).to.exist.and.to.be.a('function');
    });

    it('should add empty bid responses if no bids returned', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var bidderRequest = {
        bidderCode: 'sovrn',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'sovrn',
            params: {
              tagid: '315045'
            },
            sizes: [[320, 50]],
            placementCode: 'div-gpt-ad-12345-1'
          },
          {
            bidId: 'bidId2',
            bidder: 'sovrn',
            params: {
              tagid: '315046'
            },
            sizes: [[320, 50]],
            placementCode: 'div-gpt-ad-12345-2'
          },
          {
            bidId: 'bidId3',
            bidder: 'sovrn',
            params: {
              tagid: '315047'
            },
            sizes: [[320, 50]],
            placementCode: 'div-gpt-ad-12345-2'
          },
        ]
      };

      // no bids returned in the response.
      var response = {
        'id': '54321',
        'seatbid': []
      };

      pbjs._bidsRequested.push(bidderRequest);
      // adapter needs to be called, in order for the stub to register.
      adapter()

      pbjs.sovrnResponse(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];
      var bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
      var bidObject2 = stubAddBidResponse.getCall(1).args[1];
      var bidPlacementCode3 = stubAddBidResponse.getCall(2).args[0];
      var bidObject3 = stubAddBidResponse.getCall(2).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-ad-12345-1');
      expect(bidObject1.getStatusCode()).to.equal(2);
      expect(bidObject1.bidderCode).to.equal('sovrn');

      expect(bidPlacementCode2).to.equal('div-gpt-ad-12345-2');
      expect(bidObject2.getStatusCode()).to.equal(2);
      expect(bidObject2.bidderCode).to.equal('sovrn');

      expect(bidPlacementCode3).to.equal('div-gpt-ad-12345-2');
      expect(bidObject3.getStatusCode()).to.equal(2);
      expect(bidObject3.bidderCode).to.equal('sovrn');

      stubAddBidResponse.calledThrice;

      stubAddBidResponse.restore();
    });

    it('should add a bid response for bids returned and empty bid responses for the rest', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var bidderRequest = {
        bidderCode: 'sovrn',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'sovrn',
            params: {
              tagid: '315045'
            },
            sizes: [[320, 50]],
            placementCode: 'div-gpt-ad-12345-1'
          },
          {
            bidId: 'bidId2',
            bidder: 'sovrn',
            params: {
              tagid: '315046'
            },
            sizes: [[320, 50]],
            placementCode: 'div-gpt-ad-12345-2'
          },
          {
            bidId: 'bidId3',
            bidder: 'sovrn',
            params: {
              tagid: '315047'
            },
            sizes: [[320, 50]],
            placementCode: 'div-gpt-ad-12345-2'
          },
        ]
      };

      // Returning a single bid in the response.
      var response = {
        'id': '54321111',
        'seatbid': [ {
          'bid': [ {
            'id': '1111111',
            'impid': 'bidId2',
            'price': 0.09,
            'nurl': 'http://url',
            'adm': 'ad-code',
            'h': 250,
            'w': 300,
            'ext': { }
          } ]
        } ]
      };

      pbjs._bidsRequested.push(bidderRequest);
      // adapter needs to be called, in order for the stub to register.
      adapter()

      pbjs.sovrnResponse(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];
      var bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
      var bidObject2 = stubAddBidResponse.getCall(1).args[1];
      var bidPlacementCode3 = stubAddBidResponse.getCall(2).args[0];
      var bidObject3 = stubAddBidResponse.getCall(2).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-ad-12345-2');
      expect(bidObject1.getStatusCode()).to.equal(1);
      expect(bidObject1.bidderCode).to.equal('sovrn');
      expect(bidObject1.creative_id).to.equal('1111111');
      expect(bidObject1.cpm).to.equal(0.09);
      expect(bidObject1.height).to.equal(250);
      expect(bidObject1.width).to.equal(300);
      expect(bidObject1.ad).to.equal('ad-code<img src="http://url">');
      expect(bidObject1.adId).to.equal('bidId2');

      expect(bidPlacementCode2).to.equal('div-gpt-ad-12345-1');
      expect(bidObject2.getStatusCode()).to.equal(2);
      expect(bidObject2.bidderCode).to.equal('sovrn');

      expect(bidPlacementCode3).to.equal('div-gpt-ad-12345-2');
      expect(bidObject3.getStatusCode()).to.equal(2);
      expect(bidObject3.bidderCode).to.equal('sovrn');

      stubAddBidResponse.calledThrice;

      stubAddBidResponse.restore();
    });
  });
});
