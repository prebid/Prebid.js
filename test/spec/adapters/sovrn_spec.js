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
        "id": "54321",
        "seatbid": []
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

  //describe('Sovrn bid response has same ID as request', () => {
  //
  //  let xhr;
  //  let requests;
  //  let server;
  //
  //  beforeEach(() => {
  //    server = sinon.fakeServer.create();
  //    sinon.stub(bidmanager, 'addBidResponse');
  //    xhr = sinon.useFakeXMLHttpRequest();
  //    requests = [];
  //    xhr.onCreate = xhr => requests.push(xhr);
  //  });
  //
  //  afterEach(() => {
  //    xhr.restore();
  //    server.restore();
  //    bidmanager.addBidResponse.restore();
  //  });
  //
  //  it('should create a bidResponse with same ID as bidRequest', (done) => {
  //
  //    server.respondWith(`window.pbjs.sovrnResponse({
  //      "id" : "2738918e3c54fa7",
  //      "seatbid" : [ {
  //        "bid" : [ {
  //          "id" : "a_315045_5b5792b27d0e42ccbe7801644753250e",
  //          "impid" : "256ccac965746f",
  //          "price" : 0.01,
  //          "nurl" : "http://vap1sjc1.lijit.com/www/delivery/lg.php?bannerid=124612&campaignid=3313&zoneid=315045&cb=90062211&tid=a_315045_5b5792b27d0e42ccbe7801644753250e",
  //          "adm" : "%3Ca%20href%3D%22http%3A%2F%2Fvapden1.lijit.com%2Fwww%2Fdelivery%2Fck.php%3Foaparams%3D2__bannerid%3D124612__campaignid%3D3313__zoneid%3D315045__cb%3Dc06f6e8e__tid%3Da_315045_5b5792b27d0e42ccbe7801644753250e__maxdest%3D%22%3E%0A%3Cimg%20src%3D%22http%3A%2F%2Fap.lijit.com%2Fwww%2Fimages%2Fsovrn-house-banner2-1.gif%22%20border%3D%220%22%20width%3D%22300%22%20height%3D%22250%22%3E%0A%3C%2Fa%3E",
  //          "h" : 250,
  //          "w" : 300,
  //          "ext" : { }
  //        }, {
  //          "id" : "a_381972_c8749f371a674f9f9763e7e03c90b2bd",
  //          "impid" : "266a58c0351705c",
  //          "price" : 15.0,
  //          "nurl" : "http://vap1sjc1.lijit.com/www/delivery/lg.php?bannerid=135907&campaignid=3325&zoneid=381972&cb=21077374&tid=a_381972_c8749f371a674f9f9763e7e03c90b2bd",
  //          "adm" : "%3Cimg%20src%3D%22http%3A%2F%2Fplacehold.it%2F300x600%22%3E",
  //          "h" : 600,
  //          "w" : 300,
  //          "ext" : { }
  //        } ]
  //      } ]
  //    })`);
  //
  //    $$PREBID_GLOBAL$$.requestBids({
  //      bidsBackHandler: () => {},
  //      timeout: 2000,
  //      adUnits: sovrnAdUnits
  //    });
  //
  //    server.respond();
  //
  //    sinon.assert.calledTwice(bidmanager.addBidResponse);
  //
  //    const response = bidmanager.addBidResponse.firstCall.args[1];
  //    expect(response).to.have.property('statusMessage', 'Bid available');
  //    expect(response).to.have.property('cpm', 0.5);
  //
  //    done();
  //  });
  //});

  /**
   *  TESTING
   */
  describe('request function', () => {

    let xhr;
    let requests;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
    });

    afterEach(() => xhr.restore());

    it('exists and is a function', () => {
      expect($$PREBID_GLOBAL$$.requestBids).to.exist.and.to.be.a('function');
    });

    it('sends bid request to ENDPOINT via GET', () => {
      $$PREBID_GLOBAL$$.requestBids({
        bidsBackHandler: () => {},
        timeout: 2000,
        adUnits: sovrnAdUnits
      });
      //expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
    });

  });

  describe('response handler', () => {

    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      sinon.stub(bidmanager, 'addBidResponse');
    });

    afterEach(() => {
      server.restore();
      bidmanager.addBidResponse.restore();
    });

    it('registers bids', () => {
      server.respondWith('test');

      $$PREBID_GLOBAL$$.requestBids({
        bidsBackHandler: () => {},
        timeout: 2000,
        adUnits: sovrnAdUnits
      });
      server.respond();
      sinon.assert.calledTwice(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
    });

    it('handles blank bids', () => {
      server.respondWith('test');

      $$PREBID_GLOBAL$$.requestBids({
        bidsBackHandler: () => {},
        timeout: 2000,
        adUnits: sovrnAdUnits
      });
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage',
        'Bid returned empty or error response');
    });

    it('handles nobid responses', () => {
      server.respondWith('test');

      $$PREBID_GLOBAL$$.requestBids({
        bidsBackHandler: () => {},
        timeout: 2000,
        adUnits: sovrnAdUnits
      });
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property(
        'statusMessage',
        'Bid returned empty or error response'
      );
    });
  });
  /**
   * END TESTING
   */
});

