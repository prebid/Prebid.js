describe('sovrn adapter tests', function () {
  const expect = require('chai').expect;
  const adapter = require('src/adapters/sovrn');
  const bidmanager = require('src/bidmanager');

  const sovrnAdUnits = [
    {
      code: 'div-gpt-ad-12345-1',
      sizes: [[320, 50]],
      bids: [
        {
          bidder: 'sovrn',
          params: {
            tagid: '315045'
          }
        }
      ]
    },
    {
      code: 'div-gpt-ad-12345-2',
      sizes: [[320, 50]],
      bids: [
        {
          bidder: 'sovrn',
          params: {
            tagid: '315046'
          }
        }
      ]
    }
  ];

  var bidderRequest = {
    bidderCode: 'sovrn',
    requestId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    bidderRequestId: '7101db09af0db2',
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
      }
    ],
    start: 1469479810130,
    timeout: 3000
  };

  // Returning a single bid in the response.
  var singleResponse = {
    'id': '54321111',
    'seatbid': [
      {
        'bid': [
          {
            'id': '1111111',
            'impid': 'bidId2',
            'price': 0.09,
            'nurl': 'http://url',
            'adm': 'ad-code',
            'h': 250,
            'w': 300,
            'ext': {}
          }
        ]
      }
    ]
  };

  describe('sovrnResponse', function () {

    it('should exist and be a function', function () {
      expect(pbjs.sovrnResponse).to.exist.and.to.be.a('function');
    });

    it('should add empty bid responses if no bids returned', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      // no bids returned in the response.
      var response = {
        "id": "54321",
        "seatbid": []
      };

      pbjs._bidsRequested.push(bidderRequest);
      // adapter needs to be called, in order for the stub to register.
      adapter();

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

      // adapter needs to be called, in order for the stub to register.
      adapter()

      pbjs.sovrnResponse(singleResponse);

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

  describe('request function', () => {

    let xhr;
    let requests;
    let sovrnAdapter;

    beforeEach(() => {
      this.xhr = sinon.useFakeXMLHttpRequest();
      requests = this.requests = [];

      this.xhr.onCreate = request => {
        requests.push(request);
      };

      pbjs.adUnitsBackup = pbjs.adUnits;
      pbjs.adUnits = sovrnAdUnits;

      // adapter needs to be called, in order for the stub to register.
      sovrnAdapter = adapter();
    });

    afterEach(() => this.xhr.restore());

    pbjs.adUnits = pbjs.adUnitsBackup;

    it('exists and is a function', () => {
      expect(adapter().callBids).to.exist.and.to.be.a('function');
    });

    it('sends bid request to ENDPOINT via GET', () => {
      sovrnAdapter.callBids(bidderRequest);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
    });

  });

  describe('response handler', () => {

    let server;
    let sovrnAdapter;
    let stubAddBidResponse;

    beforeEach(() => {
      stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      server = sinon.fakeServer.create();
      sovrnAdapter = adapter();
      pbjs._bidsRequested.push(bidderRequest);
    });

    afterEach(() => {
      server.restore();
      bidmanager.addBidResponse.restore();
      sovrn = undefined;
    });

    it('registers bids', () => {
      server.respondWith('test');

      sovrnAdapter.callBids(bidderRequest);
      server.respond();
      sinon.assert.calledTwice(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
      pbjs.adUnits = pbjs.adUnitsBackup;
    });
  });
});
