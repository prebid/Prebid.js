describe('PubWise Sim bid adapter tests', function(){
  const expect = require('chai').expect;
  const adapter = require('src/adapters/pubwiseSim');
  const bidmanager = require('src/bidmanager');

  describe('pubwiseSimResponseHandler', function () {

    it('should exist and be a function', function () {
      adapter();
      expect(pbjs.pubwiseSimResponseHandler).to.exist.and.to.be.a('function');
    });

    it('should add empty bid responses if no bids returned', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var bidderRequest = {
        bidderCode: 'pubwiseSim',
        bids: [
          {
            bidId: 'testId1',
            bidder: 'pubwiseSim',
            params: {
              site_id: 'test-test-test-test',
              height: '728',
              width: '90',
              cpm: 20,
              delay: 0,
            },
            sizes: [[160, 600]],
            placementCode: 'div-gpt-test-1'
          },
          {
            bidId: 'testId2',
            bidder: 'pubwiseSim',
            params: {
              site_id: 'test-test-test-test',
              height: '728',
              width: '90',
              cpm: 20,
              delay: 0,
            },
            sizes: [[160, 600]],
            placementCode: 'div-gpt-test-2'
          },
        ]
      };


      // return no bids
      var response = {
        "id": "123456",
        "bids": []
      };

      pbjs._bidsRequested.push(bidderRequest);

      // get the stub registered
      adapter();

      pbjs.pubwiseSimResponseHandler(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];
      var bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
      var bidObject2 = stubAddBidResponse.getCall(1).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-test-1');
      expect(bidObject1.getStatusCode()).to.equal(2);
      expect(bidObject1.bidderCode).to.equal('pubwiseSim');

      expect(bidPlacementCode2).to.equal('div-gpt-test-2');
      expect(bidObject2.getStatusCode()).to.equal(2);
      expect(bidObject2.bidderCode).to.equal('pubwiseSim');

      stubAddBidResponse.restore();
    });

    it('should add a bid response for bids returned and empty bid responses for the rest', () => {

      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var bidderRequest = {
        bidderCode: 'pubwiseSim',
        bids: [
          {
            bidId: 'testId1',
            bidder: 'pubwiseSim',
            params: {
              site_id: 'test-test-test-test',
              height: '728',
              width: '90',
              cpm: 20,
              delay: 0,
            },
            sizes: [[728, 90]],
            placementCode: 'div-gpt-test-1'
          },
          {
            bidId: 'testId2',
            bidder: 'pubwiseSim',
            params: {
              site_id: 'test-test-test-test',
              height: '728',
              width: '90',
              cpm: 20,
              delay: 0,
            },
            sizes: [[160, 600]],
            placementCode: 'div-gpt-test-2'
          },
        ]
      };

      // return just one bid
      var response = {
        "id": "123456",
        "bids": [
          {
            "bidId" : "testId1",
            "cpm" : 20,
            "adm" : "<<adm creative placehold>>",
            "h" : 320,
            "w" : 50
          }
        ]};

      pbjs._bidsRequested.push(bidderRequest);

      // get the stub registered
      adapter();

      pbjs.pubwiseSimResponseHandler(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];
      var bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
      var bidObject2 = stubAddBidResponse.getCall(1).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-test-1');
      expect(bidObject1.getStatusCode()).to.equal(1);
      expect(bidObject1.bidderCode).to.equal('pubwiseSim');
      expect(bidObject1.cpm).to.equal(20);
      expect(bidObject1.height).to.equal(320);
      expect(bidObject1.width).to.equal(50);
      expect(bidObject1.ad).to.equal('<<adm creative placehold>>');

      expect(bidPlacementCode2).to.equal('div-gpt-test-2');
      expect(bidObject2.getStatusCode()).to.equal(2);
      expect(bidObject2.bidderCode).to.equal('pubwiseSim');

      stubAddBidResponse.restore();
    });
  });
});