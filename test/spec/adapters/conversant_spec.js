var expect = require('chai').expect;
var Adapter = require('src/adapters/conversant');
var bidManager = require('src/bidmanager');

describe('Conversant adapter tests', function () {
  var addBidResponseSpy;
  var adapter;

  var bidderRequest = {
    bidderCode: 'conversant',
    bids: [
      {
        bidId: 'bidId1',
        bidder: 'conversant',
        placementCode: 'div1',
        sizes: [[300, 600]],
        params: {
          site_id: '87293',
          position: 1,
          tag_id: 'tagid-1',
          secure: false
        }
      }, {
        bidId: 'bidId2',
        bidder: 'conversant',
        placementCode: 'div2',
        sizes: [[300, 600]],
        params: {
          site_id: '87293',
          secure: false
        }
      }, {
        bidId: 'bidId3',
        bidder: 'conversant',
        placementCode: 'div3',
        sizes: [[300, 600], [160, 600]],
        params: {
          site_id: '87293',
          position: 1,
          tag_id: '',
          secure: false
        }
      }, {
        bidId: 'bidId4',
        bidder: 'conversant',
        placementCode: 'div4',
        mediaType: 'video',
        sizes: [[480, 480]],
        params: {
          site_id: '89192',
          pos: 1,
          tagid: 'tagid-4',
          secure: false
        }
      }
    ]
  };

  it('The Conversant response should exist and be a function', function () {
    expect($$PREBID_GLOBAL$$.conversantResponse).to.exist.and.to.be.a('function');
  });

  describe('Should submit bid responses correctly', function () {
    beforeEach(function () {
      addBidResponseSpy = sinon.stub(bidManager, 'addBidResponse');
      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
      adapter = new Adapter();
    });

    afterEach(function () {
      addBidResponseSpy.restore();
    });

    it('Should correctly submit valid and empty bids to the bid manager', function () {
      var bidResponse = {
        id: 123,
        seatbid: [{
          bid: [{
            id: 1111111,
            impid: 'bidId1',
            price: 0
          }, {
            id: 2345,
            impid: 'bidId2',
            price: 0.22,
            nurl: '',
            adm: 'adm2',
            h: 300,
            w: 600
          }]
        }]
      };

      $$PREBID_GLOBAL$$.conversantResponse(bidResponse);

      // in this case, the valid bid (div2) is submitted before the empty bids (div1, div3)
      var firstBid = addBidResponseSpy.getCall(0).args[1];
      var secondBid = addBidResponseSpy.getCall(1).args[1];
      var thirdBid = addBidResponseSpy.getCall(2).args[1];
      var placementCode1 = addBidResponseSpy.getCall(0).args[0];
      var placementCode2 = addBidResponseSpy.getCall(1).args[0];
      var placementCode3 = addBidResponseSpy.getCall(2).args[0];

      expect(firstBid.getStatusCode()).to.equal(1);
      expect(firstBid.bidderCode).to.equal('conversant');
      expect(firstBid.cpm).to.equal(0.22);
      expect(firstBid.ad).to.equal('adm2' + '<img src="" />');
      expect(placementCode1).to.equal('div2');

      expect(secondBid.getStatusCode()).to.equal(2);
      expect(secondBid.bidderCode).to.equal('conversant');
      expect(placementCode2).to.equal('div1');

      expect(thirdBid.getStatusCode()).to.equal(2);
      expect(thirdBid.bidderCode).to.equal('conversant');
      expect(placementCode3).to.equal('div3');

      expect(addBidResponseSpy.getCalls().length).to.equal(4);
    });

    it('Should submit bids with statuses of 2 to the bid manager for empty bid responses', function () {
      $$PREBID_GLOBAL$$.conversantResponse({id: 1, seatbid: []});

      var placementCode1 = addBidResponseSpy.getCall(0).args[0];
      var firstBid = addBidResponseSpy.getCall(0).args[1];
      var placementCode2 = addBidResponseSpy.getCall(1).args[0];
      var secondBid = addBidResponseSpy.getCall(1).args[1];
      var placementCode3 = addBidResponseSpy.getCall(2).args[0];
      var thirdBid = addBidResponseSpy.getCall(2).args[1];

      expect(placementCode1).to.equal('div1');
      expect(firstBid.getStatusCode()).to.equal(2);
      expect(firstBid.bidderCode).to.equal('conversant');

      expect(placementCode2).to.equal('div2');
      expect(secondBid.getStatusCode()).to.equal(2);
      expect(secondBid.bidderCode).to.equal('conversant');

      expect(placementCode3).to.equal('div3');
      expect(thirdBid.getStatusCode()).to.equal(2);
      expect(thirdBid.bidderCode).to.equal('conversant');

      expect(addBidResponseSpy.getCalls().length).to.equal(4);
    });

    it('Should submit valid bids to the bid manager', function () {
      var bidResponse = {
        id: 123,
        seatbid: [{
          bid: [{
            id: 1111111,
            impid: 'bidId1',
            price: 0.11,
            nurl: '',
            adm: 'adm',
            h: 250,
            w: 300,
            ext: {}
          }, {
            id: 2345,
            impid: 'bidId2',
            price: 0.22,
            nurl: '',
            adm: 'adm2',
            h: 300,
            w: 600
          }, {
            id: 33333,
            impid: 'bidId3',
            price: 0.33,
            nurl: '',
            adm: 'adm3',
            h: 160,
            w: 600
          }]
        }]
      };

      $$PREBID_GLOBAL$$.conversantResponse(bidResponse);

      var firstBid = addBidResponseSpy.getCall(0).args[1];
      var secondBid = addBidResponseSpy.getCall(1).args[1];
      var thirdBid = addBidResponseSpy.getCall(2).args[1];
      var placementCode1 = addBidResponseSpy.getCall(0).args[0];
      var placementCode2 = addBidResponseSpy.getCall(1).args[0];
      var placementCode3 = addBidResponseSpy.getCall(2).args[0];

      expect(firstBid.getStatusCode()).to.equal(1);
      expect(firstBid.bidderCode).to.equal('conversant');
      expect(firstBid.cpm).to.equal(0.11);
      expect(firstBid.ad).to.equal('adm' + '<img src="" />');
      expect(placementCode1).to.equal('div1');

      expect(secondBid.getStatusCode()).to.equal(1);
      expect(secondBid.bidderCode).to.equal('conversant');
      expect(secondBid.cpm).to.equal(0.22);
      expect(secondBid.ad).to.equal('adm2' + '<img src="" />');
      expect(placementCode2).to.equal('div2');

      expect(thirdBid.getStatusCode()).to.equal(1);
      expect(thirdBid.bidderCode).to.equal('conversant');
      expect(thirdBid.cpm).to.equal(0.33);
      expect(thirdBid.ad).to.equal('adm3' + '<img src="" />');
      expect(placementCode3).to.equal('div3');

      expect(addBidResponseSpy.getCalls().length).to.equal(4);
    });

    it('Should submit video bid responses correctly.', function () {
      var bidResponse = {
        id: 123,
        seatbid: [{
          bid: [{
            id: 1111111,
            impid: 'bidId4',
            price: 0.11,
            nurl: 'imp_tracker',
            adm: 'vasturl'
          }]
        }]
      };

      $$PREBID_GLOBAL$$.conversantResponse(bidResponse);

      var videoBid = addBidResponseSpy.getCall(0).args[1];
      var placementCode = addBidResponseSpy.getCall(0).args[0];

      expect(videoBid.getStatusCode()).to.equal(1);
      expect(videoBid.bidderCode).to.equal('conversant');
      expect(videoBid.cpm).to.equal(0.11);
      expect(videoBid.vastUrl).to.equal('vasturl');
      expect(placementCode).to.equal('div4');
    })
  });

  describe('Should submit the correct headers in the xhr', function () {
    var server,
      adapter;

    var bidResponse = {
      id: 123,
      seatbid: [{
        bid: [{
          id: 1111,
          impid: 'bidId1',
          price: 0.11,
          nurl: '',
          adm: 'adm',
          h: 250,
          w: 300,
          ext: {}
        }, {
          id: 2222,
          impid: 'bidId2',
          price: 0.22,
          nurl: '',
          adm: 'adm2',
          h: 300,
          w: 600
        }, {
          id: 3333,
          impid: 'bidId3',
          price: 0.33,
          nurl: '',
          adm: 'adm3',
          h: 160,
          w: 600
        }]
      }]
    };

    beforeEach(function () {
      server = sinon.fakeServer.create();
      adapter = new Adapter();
    });

    afterEach(function () {
      server.restore();
    });

    beforeEach(function () {
      var resp = [200, {'Content-type': 'text/javascript'}, '$$PREBID_GLOBAL$$.conversantResponse(\'' + JSON.stringify(bidResponse) + '\')'];
      server.respondWith('POST', new RegExp('media.msg.dotomi.com/s2s/header'), resp);
    });

    it('Should contain valid request header properties', function () {
      adapter.callBids(bidderRequest);
      server.respond();

      var request = server.requests[0];
      expect(request.requestBody).to.not.be.empty;
    });
  });
  describe('Should create valid bid requests.', function () {
    var server,
      adapter;

    var bidResponse = {
      id: 123,
      seatbid: [{
        bid: [{
          id: 1111,
          impid: 'bidId1',
          price: 0.11,
          nurl: '',
          adm: 'adm',
          h: 250,
          w: 300,
          ext: {}
        }, {
          id: 2222,
          impid: 'bidId2',
          price: 0.22,
          nurl: '',
          adm: 'adm2',
          h: 300,
          w: 600
        }, {
          id: 3333,
          impid: 'bidId3',
          price: 0.33,
          nurl: '',
          adm: 'adm3',
          h: 160,
          w: 600
        }]
      }]
    };

    beforeEach(function () {
      server = sinon.fakeServer.create();
      adapter = new Adapter();
    });

    afterEach(function () {
      server.restore();
    });

    beforeEach(function () {
      var resp = [200, {'Content-type': 'text/javascript'}, '$$PREBID_GLOBAL$$.conversantResponse(\'' + JSON.stringify(bidResponse) + '\')'];
      server.respondWith('POST', new RegExp('media.msg.dotomi.com/s2s/header'), resp);
    });

    it('Should create valid bid requests.', function () {
      adapter.callBids(bidderRequest);
      server.respond();
      var request = JSON.parse(server.requests[0].requestBody);
      expect(request.imp[0].banner.format[0].w).to.equal(300);
      expect(request.imp[0].banner.format[0].h).to.equal(600);
      expect(request.imp[0].tagid).to.equal('tagid-1');
      expect(request.imp[0].banner.pos).to.equal(1);
      expect(request.imp[0].secure).to.equal(0);
      expect(request.site.id).to.equal('89192');
    });

    it('Should not pass empty or missing optional parameters on requests.', function () {
      adapter.callBids(bidderRequest);
      server.respond();

      var request = JSON.parse(server.requests[0].requestBody);
      expect(request.imp[1].tagid).to.equal(undefined);
      expect(request.imp[2].tagid).to.equal(undefined);
      expect(request.imp[1].pos).to.equal(undefined);
    });

    it('Should create the format objects correctly.', function () {
      adapter.callBids(bidderRequest);
      server.respond();

      var request = JSON.parse(server.requests[0].requestBody);
      expect(request.imp[2].banner.format.length).to.equal(2);
      expect(request.imp[2].banner.format[0].w).to.equal(300);
      expect(request.imp[2].banner.format[1].w).to.equal(160);
    });
  });
});
