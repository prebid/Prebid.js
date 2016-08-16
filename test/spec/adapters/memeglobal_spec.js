describe('memeglobal adapter tests', function () {
  const expect = require('chai').expect;
  const adapter = require('src/adapters/memeglobal');
  const bidmanager = require('src/bidmanager');
  const adLoader = require('src/adloader');

  var spyLoadScript;
      beforeEach(function () {
          spyLoadScript = sinon.spy(adLoader, 'loadScript');
      });

      afterEach(function () {
          spyLoadScript.restore();
      });

  describe('memeglobalResponse', function () {

    it('should exist and be a function', function () {
      expect(pbjs.mgres).to.exist.and.to.be.a('function');
    });

    it('should add empty bid responses if no bids returned', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var bidderRequest = {
        bidderCode: 'memeglobal',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'memeglobal',
            params: {
              tagid: '007'
            },
            sizes: [[300, 250]],
            placementCode: "test-1"
          }
        ]
      };

      // no bids returned in the response.
      var response = {
        "id": "54321",
        "seatbid": []
      };

      pbjs._bidsRequested.push(bidderRequest);

      // adapter needs to be called, in order for the stub to register.
      adapter()

      pbjs.mgres(response);

      var bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
      expect(bidPlacementCode).to.equal('test-1');

      var bidObject1 = stubAddBidResponse.getCall(0).args[1];
      expect(bidObject1.getStatusCode()).to.equal(2);
      expect(bidObject1.bidderCode).to.equal('memeglobal');

      stubAddBidResponse.calledThrice;
      stubAddBidResponse.restore();
    });

    it('should be called only once', function () {

        var params = {
            bidderCode: 'memeglobal',
            bidder: 'memeglobal',
            bids: [
                    {
              bidId: '3c9408cdbf2f68',
                  sizes: [[300, 250]],
                      bidder: 'jcm',
                      params: { siteId: '3608', adSizes:'300x250' },
                      requestId: '10b327aa396609',
                      placementCode: 'header-bid-tag-0'
                     }

            ]
        };

        adapter().callBids(params);

        sinon.assert.calledOnce(spyLoadScript);

    });

    it('should add a bid response for bids returned and empty bid responses for the rest', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      var bidderRequest = {
        bidderCode: 'memeglobal',
        bids: [
          {
            bidId: 'bidId2',
            bidder: 'memeglobal',
            params: {
              tagid: '315045'
            },
            sizes: [[320, 50]],
            placementCode: 'test-2'
          }
        ]
      };

      // Returning a single bid in the response.
      var response = {
        "id": "54321111",
        "seatbid": [ {
          "bid" : [ {
            "id" : "1111111",
            "impid" : "bidId2",
            "price" : 0.09,
            "nurl" : "http://url",
            "adm" : "ad-code",
            "h" : 250,
            "w" : 300,
            "ext" : { }
          } ]
        } ]
      };


      pbjs._bidsRequested.push(bidderRequest);

      // adapter needs to be called, in order for the stub to register.
      adapter()

      pbjs.mgres(response);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      //debugger;
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('test-2');
      expect(bidObject1.getStatusCode()).to.equal(1);
      expect(bidObject1.bidderCode).to.equal('memeglobal');
      expect(bidObject1.creative_id).to.equal('1111111');
      expect(bidObject1.cpm).to.equal(0.09);
      expect(bidObject1.height).to.equal(250);
      expect(bidObject1.width).to.equal(300);
      expect(bidObject1.ad).to.equal('ad-code<img src="http://url">');

      stubAddBidResponse.calledThrice;

      stubAddBidResponse.restore();
    });
  });
});

