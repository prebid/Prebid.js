import { expect } from 'chai';
import { spec, resetInvibes, stubDomainOptions } from 'modules/invibesBidAdapter';

describe('invibesBidAdapter:', function () {
  const BIDDER_CODE = 'invibes';
  const PLACEMENT_ID = '12345';
  const ENDPOINT = '//bid.videostep.com/Bid/VideoAdContent';
  const SYNC_ENDPOINT = '//k.r66net.com/GetUserSync';

  let bidRequests = [
    {
      bidId: 'b1',
      bidder: BIDDER_CODE,
      bidderRequestId: 'r1',
      params: {
        placementId: PLACEMENT_ID
      },
      adUnitCode: 'test-div',
      auctionId: 'a1',
      sizes: [
        [300, 250],
        [400, 300],
        [125, 125]
      ],
      transactionId: 't1'
    }, {
      bidId: 'b2',
      bidder: BIDDER_CODE,
      bidderRequestId: 'r2',
      params: {
        placementId: 'abcde'
      },
      adUnitCode: 'test-div',
      auctionId: 'a2',
      sizes: [
        [300, 250],
        [400, 300]
      ],
      transactionId: 't2'
    }
  ];

  let StubbedPersistence = function(initialValue) {
    var value = initialValue;
    return {
      load: function () {
        let str = value || '';
        try {
          return JSON.parse(str);
        } catch (e) { }
      },
      save: function (obj) {
        value = JSON.stringify(obj);
      }
    }
  };

  beforeEach(function () {
    resetInvibes();
    document.cookie = '';
    this.cStub1 = sinon.stub(console, 'info');
  });

  afterEach(function () {
    this.cStub1.restore();
  });

  describe('isBidRequestValid:', function () {
    context('valid bid request:', function () {
      it('returns true when bidder params.placementId is set', function() {
        const validBid = {
          bidder: BIDDER_CODE,
          params: {
            placementId: PLACEMENT_ID
          }
        }

        expect(spec.isBidRequestValid(validBid)).to.be.true;
      })
    });

    context('invalid bid request:', function () {
      it('returns false when no params', function () {
        const invalidBid = {
          bidder: BIDDER_CODE
        }

        expect(spec.isBidRequestValid(invalidBid)).to.be.false;
      });

      it('returns false when placementId is not set', function() {
        const invalidBid = {
          bidder: BIDDER_CODE,
          params: {
            id: '5'
          }
        }

        expect(spec.isBidRequestValid(invalidBid)).to.be.false;
      });

      it('returns false when bid response was previously received', function() {
        const validBid = {
          bidder: BIDDER_CODE,
          params: {
            placementId: PLACEMENT_ID
          }
        }

        top.window.invibes.bidResponse = { prop: 'prop' };
        expect(spec.isBidRequestValid(validBid)).to.be.false;
      });
    });
  });

  describe('buildRequests', function () {
    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
    });

    it('sends cookies with the bid request', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.options.withCredentials).to.equal(true);
    });

    it('has location, html id, placement and width/height', function () {
      const request = spec.buildRequests(bidRequests, { auctionStart: Date.now() });
      const parsedData = request.data;
      expect(parsedData.location).to.exist;
      expect(parsedData.videoAdHtmlId).to.exist;
      expect(parsedData.vId).to.exist;
      expect(parsedData.width).to.exist;
      expect(parsedData.height).to.exist;
    });

    it('has capped ids if local storage variable is correctly formatted', function () {
      localStorage.ivvcap = '{"9731":[1,1768600800000]}';
      const request = spec.buildRequests(bidRequests, { auctionStart: Date.now() });
      expect(request.data.capCounts).to.equal('9731=1');
    });

    it('does not have capped ids if local storage variable is incorrectly formatted', function () {
      localStorage.ivvcap = ':[1,1574334216992]}';
      const request = spec.buildRequests(bidRequests, { auctionStart: Date.now() });
      expect(request.data.capCounts).to.equal('');
    });

    it('does not have capped ids if local storage variable is expired', function () {
      localStorage.ivvcap = '{"9731":[1,1574330064104]}';
      const request = spec.buildRequests(bidRequests, { auctionStart: Date.now() });
      expect(request.data.capCounts).to.equal('');
    });

    it('sends query string params from localstorage 1', function () {
      localStorage.ivbs = JSON.stringify({ bvci: 1 });
      const request = spec.buildRequests(bidRequests, { auctionStart: Date.now() });
      expect(request.data.bvci).to.equal(1);
    });

    it('sends query string params from localstorage 2', function () {
      localStorage.ivbs = JSON.stringify({ invibbvlog: true });
      const request = spec.buildRequests(bidRequests, { auctionStart: Date.now() });
      expect(request.data.invibbvlog).to.equal(true);
    });

    it('does not send query string params from localstorage if unknwon', function () {
      localStorage.ivbs = JSON.stringify({ someparam: true });
      const request = spec.buildRequests(bidRequests, { auctionStart: Date.now() });
      expect(request.data.someparam).to.be.undefined;
    });

    it('sends all Placement Ids', function () {
      const request = spec.buildRequests(bidRequests);
      expect(JSON.parse(request.data.bidParamsJson).placementIds).to.contain(bidRequests[0].params.placementId);
      expect(JSON.parse(request.data.bidParamsJson).placementIds).to.contain(bidRequests[1].params.placementId);
    });

    it('uses cookies', function () {
      global.document.cookie = 'ivNoCookie=1';
      let request = spec.buildRequests(bidRequests);
      expect(request.data.lId).to.be.undefined;
    });

    it('doesnt send the domain id if not graduated', function () {
      global.document.cookie = 'ivbsdid={"id":"dvdjkams6nkq","cr":1522929537626,"hc":1}';
      let request = spec.buildRequests(bidRequests);
      expect(request.data.lId).to.not.exist;
    });

    it('try to graduate but not enough count - doesnt send the domain id', function () {
      global.document.cookie = 'ivbsdid={"id":"dvdjkams6nkq","cr":1521818537626,"hc":0}';
	  let bidderRequest = { gdprConsent: { vendorData: { vendorConsents: { 436: true } } } };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.lId).to.not.exist;
    });

    it('try to graduate but not old enough - doesnt send the domain id', function () {
	  let bidderRequest = { gdprConsent: { vendorData: { vendorConsents: { 436: true } } } };
      global.document.cookie = 'ivbsdid={"id":"dvdjkams6nkq","cr":' + Date.now() + ',"hc":5}';
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.lId).to.not.exist;
    });

    it('graduate and send the domain id', function () {
	  let bidderRequest = { gdprConsent: { vendorData: { vendorConsents: { 436: true } } } };
	  stubDomainOptions(new StubbedPersistence('{"id":"dvdjkams6nkq","cr":1521818537626,"hc":7}'));
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.lId).to.exist;
    });

    it('send the domain id if already graduated', function () {
	  let bidderRequest = { gdprConsent: { vendorData: { vendorConsents: { 436: true } } } };
	  stubDomainOptions(new StubbedPersistence('{"id":"f8zoh044p9oi"}'));
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.lId).to.exist;
      expect(top.window.invibes.dom.tempId).to.exist;
    });

    it('send the domain id after replacing it with new format', function () {
	  let bidderRequest = { gdprConsent: { vendorData: { vendorConsents: { 436: true } } } };
	  stubDomainOptions(new StubbedPersistence('{"id":"f8zoh044p9oi.8537626"}'));
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.lId).to.exist;
      expect(top.window.invibes.dom.tempId).to.exist;
    });

    it('dont send the domain id if consent declined', function () {
      let bidderRequest = { gdprConsent: { vendorData: { vendorConsents: { 436: false } } } };
      stubDomainOptions(new StubbedPersistence('{"id":"f8zoh044p9oi.8537626"}'));
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.lId).to.not.exist;
      expect(top.window.invibes.dom.tempId).to.not.exist;
    });

    it('dont send the domain id if no consent', function () {
	  let bidderRequest = { };
	  stubDomainOptions(new StubbedPersistence('{"id":"f8zoh044p9oi.8537626"}'));
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.lId).to.not.exist;
      expect(top.window.invibes.dom.tempId).to.not.exist;
    });

    it('try to init id but was already loaded on page - does not increment the id again', function () {
	  let bidderRequest = { gdprConsent: { vendorData: { vendorConsents: { 436: true } } } };
      global.document.cookie = 'ivbsdid={"id":"dvdjkams6nkq","cr":1521818537626,"hc":0}';
      let request = spec.buildRequests(bidRequests, bidderRequest);
      request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.lId).to.not.exist;
      expect(top.window.invibes.dom.tempId).to.exist;
    });
  });

  describe('interpretResponse', function () {
    let response = {
      Ads: [{
        BidPrice: 0.5,
        VideoExposedId: 123
      }],
      BidModel: {
        BidVersion: 1,
        PlacementId: '12345',
        AuctionStartTime: Date.now(),
        CreativeHtml: '<!-- Creative -->'
      }
    };

    let expectedResponse = [{
      requestId: bidRequests[0].bidId,
      cpm: 0.5,
      width: 400,
      height: 300,
      creativeId: 123,
      currency: 'EUR',
      netRevenue: true,
      ttl: 300,
      ad: `<html>
        <head><script type='text/javascript'>inDapIF=true;</script></head>
          <body style='margin : 0; padding: 0;'>
          <!-- Creative -->
          </body>
        </html>`
    }];

    context('when the response is not valid', function () {
      it('handles response with no bids requested', function () {
        let emptyResult = spec.interpretResponse({ body: response });
        expect(emptyResult).to.be.empty;
      });

      it('handles empty response', function () {
        let emptyResult = spec.interpretResponse(null, { bidRequests });
        expect(emptyResult).to.be.empty;
      });

      it('handles response with bidding is not configured', function () {
        let emptyResult = spec.interpretResponse({ body: { Ads: [{ BidPrice: 1 }] } }, { bidRequests });
        expect(emptyResult).to.be.empty;
      });

      it('handles response with no ads are received', function () {
        let emptyResult = spec.interpretResponse({ body: { BidModel: { PlacementId: '12345' }, AdReason: 'No ads' } }, { bidRequests });
        expect(emptyResult).to.be.empty;
      });

      it('handles response with no ads are received - no ad reason', function () {
        let emptyResult = spec.interpretResponse({ body: { BidModel: { PlacementId: '12345' } } }, { bidRequests });
        expect(emptyResult).to.be.empty;
      });

      it('handles response when no placement Id matches', function () {
        let emptyResult = spec.interpretResponse({ body: { BidModel: { PlacementId: '123456' }, Ads: [{ BidPrice: 1 }] } }, { bidRequests });
        expect(emptyResult).to.be.empty;
      });

      it('handles response when placement Id is not present', function () {
        let emptyResult = spec.interpretResponse({ BidModel: { }, Ads: [{ BidPrice: 1 }] }, { bidRequests });
        expect(emptyResult).to.be.empty;
      });
    });

    context('when the response is valid', function () {
      it('responds with a valid bid', function () {
        top.window.invibes.setCookie('a', 'b', 370);
        top.window.invibes.setCookie('c', 'd', 0);
        let result = spec.interpretResponse({ body: response }, { bidRequests });
        expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      });

      it('responds with a valid bid and uses logger', function () {
        localStorage.InvibesDEBUG = true;
        let result = spec.interpretResponse({ body: response }, { bidRequests });
        expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      });

      it('does not make multiple bids', function () {
        localStorage.InvibesDEBUG = false;
        let result = spec.interpretResponse({ body: response }, { bidRequests });
        let secondResult = spec.interpretResponse({ body: response }, { bidRequests });
        expect(secondResult).to.be.empty;
      });
    });
  });

  describe('getUserSyncs', function () {
    it('returns an iframe if enabled', function () {
      let response = spec.getUserSyncs({iframeEnabled: true});
      expect(response.type).to.equal('iframe');
      expect(response.url).to.include(SYNC_ENDPOINT);
    });

    it('returns an iframe with params if enabled', function () {
      top.window.invibes.optIn = 1;
      global.document.cookie = 'ivvbks=17639.0,1,2';
      let response = spec.getUserSyncs({ iframeEnabled: true });
      expect(response.type).to.equal('iframe');
      expect(response.url).to.include(SYNC_ENDPOINT);
      expect(response.url).to.include('optIn');
      expect(response.url).to.include('ivvbks');
      expect(response.url).to.include('ivbsdid');
    });

    it('returns undefined if iframe not enabled ', function () {
      let response = spec.getUserSyncs({ iframeEnabled: false });
      expect(response).to.equal(undefined);
    });
  });
});
