describe('Roxot adapter tests', function() {
  const expect = require('chai').expect;
  const adapter = require('src/adapters/roxot');
  const bidmanager = require('src/bidmanager');

  describe('roxotResponseHandler', function () {
    it('should exist and be a function', function () {
      expect(pbjs.roxotResponseHandler).to.exist.and.to.be.a('function');
    });

    it('should add empty bid responses if no bids returned', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var bidderRequest = {
        bidderCode: 'roxot',
        bids: [
          {
            bidId: 'id1',
            bidder: 'roxot',
            sizes: [[320, 50]],
            placementCode: 'div-gpt-ad-12345-1'
          },
          {
            bidId: 'id2',
            bidder: 'roxot',
            sizes: [[320, 50]],
            placementCode: 'div-gpt-ad-12345-2'
          },
        ]
      };

      // no bids returned in the response.
      var response = {
        'id': '123',
        'bids': []
      };

      pbjs._bidsRequested.push(bidderRequest);

      // adapter needs to be called, in order for the stub to register.
      adapter();

      pbjs.roxotResponseHandler(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];
      var bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
      var bidObject2 = stubAddBidResponse.getCall(1).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-ad-12345-1');
      expect(bidObject1.getStatusCode()).to.equal(2);
      expect(bidObject1.bidderCode).to.equal('roxot');

      expect(bidPlacementCode2).to.equal('div-gpt-ad-12345-2');
      expect(bidObject2.getStatusCode()).to.equal(2);
      expect(bidObject2.bidderCode).to.equal('roxot');

      stubAddBidResponse.restore();
    });

    it('should add a bid response for bids returned and empty bid responses for the rest', () => {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var bidderRequest = {
        bidderCode: 'roxot',
        bids: [
          {
            bidId: 'id1',
            bidder: 'roxot',
            sizes: [[320, 50]],
            placementCode: 'div-gpt-ad-12345-1'
          },
          {
            bidId: 'id2',
            bidder: 'roxot',
            sizes: [[320, 50]],
            placementCode: 'div-gpt-ad-12345-2'
          },
        ]
      };

      // Returning a single bid in the response.
      var response = {
        'id': '12345',
        'bids': [
          {
            'bidId': 'id1',
            'cpm': 0.09,
            'nurl': 'http://roxot.example.com',
            'adm': '<<creative>>',
            'h': 320,
            'w': 50
          }
        ]};

      pbjs._bidsRequested.push(bidderRequest);

      // adapter needs to be called, in order for the stub to register.
      adapter();

      pbjs.roxotResponseHandler(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];
      var bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
      var bidObject2 = stubAddBidResponse.getCall(1).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-ad-12345-1');
      expect(bidObject1.getStatusCode()).to.equal(1);
      expect(bidObject1.bidderCode).to.equal('roxot');
      expect(bidObject1.cpm).to.equal(0.09);
      expect(bidObject1.height).to.equal(320);
      expect(bidObject1.width).to.equal(50);
      expect(bidObject1.ad).to.equal('<<creative>><img src="http://roxot.example.com">');

      expect(bidPlacementCode2).to.equal('div-gpt-ad-12345-2');
      expect(bidObject2.getStatusCode()).to.equal(2);
      expect(bidObject2.bidderCode).to.equal('roxot');

      stubAddBidResponse.restore();
    });
  });
});
