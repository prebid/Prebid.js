import { expect } from 'chai';
import { spec } from 'modules/invibesBidAdapter';

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

  beforeEach(function () {
    top.window.invibes = null;
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
    });
  });

  describe('buildRequests', () => {
    it('sends bid request to ENDPOINT via GET', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
    });

    it('sends cookies with the bid request', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.options.withCredentials).to.equal(true);
    });

    it('has location, html id, placement and width/height', () => {
      const request = spec.buildRequests(bidRequests, { auctionStart: Date.now() });
      const parsedData = request.data;
      expect(parsedData.location).to.exist;
      expect(parsedData.videoAdHtmlId).to.exist;
      expect(parsedData.vId).to.exist;
      expect(parsedData.width).to.exist;
      expect(parsedData.height).to.exist;
    });

    it('sends all Placement Ids', () => {
      const request = spec.buildRequests(bidRequests);
      expect(JSON.parse(request.data.bidParamsJson).placementIds).to.contain(bidRequests[0].params.placementId);
      expect(JSON.parse(request.data.bidParamsJson).placementIds).to.contain(bidRequests[1].params.placementId);
    });

    it.skip('uses cookies', () => {
      global.document.cookie = 'ivNoCookie=1';
      let request = spec.buildRequests(bidRequests);
      expect(request.data.lId).to.be.undefined;
    });

    it('does not overwrite the domain id', () => {
      top.window.invibes = window.invibes || {};
      top.window.invibes.dom = {};
      let request = spec.buildRequests(bidRequests);
    });

    it('doesnt send the domain id if not graduated', () => {
      global.document.cookie = 'ivbsdid={"id":"p4vauj.4ekt9w","hc":3,"temp":1}';
      let request = spec.buildRequests(bidRequests);
      expect(request.data.lId).to.not.exist;
    });

    it('graduate and send the domain id', () => {
      global.document.cookie = 'ivbsdid={"id":"p4rrk7.ax2i2s","hc":4,"temp":1}';
      let request = spec.buildRequests(bidRequests);
      expect(request.data.lId).to.exist;
    });

    it('send the domain id if already graduated', () => {
      global.document.cookie = 'ivbsdid={"id":"p4rrk7.ax2i2s"}';
      let request = spec.buildRequests(bidRequests);
      expect(request.data.lId).to.exist;
    });
  })

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
      it('handles response with no bids requested', () => {
        let emptyResult = spec.interpretResponse({ body: response });
        expect(emptyResult).to.be.empty;
      });

      it('handles empty response', () => {
        let emptyResult = spec.interpretResponse(null, { bidRequests });
        expect(emptyResult).to.be.empty;
      });

      it('handles response with bidding is not configured', () => {
        let emptyResult = spec.interpretResponse({ body: { Ads: [{ BidPrice: 1 }] } }, { bidRequests });
        expect(emptyResult).to.be.empty;
      });

      it('handles response with no ads are received', () => {
        let emptyResult = spec.interpretResponse({ body: { BidModel: { PlacementId: '12345' }, AdReason: 'No ads' } }, { bidRequests });
        expect(emptyResult).to.be.empty;
      });

      it('handles response with no ads are received - no ad reason', () => {
        let emptyResult = spec.interpretResponse({ body: { BidModel: { PlacementId: '12345' } } }, { bidRequests });
        expect(emptyResult).to.be.empty;
      });

      it('handles response when no placement Id matches', () => {
        let emptyResult = spec.interpretResponse({ body: { BidModel: { PlacementId: '123456' }, Ads: [{ BidPrice: 1 }] } }, { bidRequests });
        expect(emptyResult).to.be.empty;
      });

      it('handles response when placement Id is not present', () => {
        let emptyResult = spec.interpretResponse({ BidModel: { }, Ads: [{ BidPrice: 1 }] }, { bidRequests });
        expect(emptyResult).to.be.empty;
      });
    });

    context('when the response is valid', function () {
      it('responds with a valid bid', () => {
        let result = spec.interpretResponse({ body: response }, { bidRequests });
        expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      });

      it('responds with a valid bid and uses logger', () => {
        localStorage.InvibesDEBUG = true;
        let result = spec.interpretResponse({ body: response }, { bidRequests });
        expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      });

      it('does not make multiple bids', () => {
        localStorage.InvibesDEBUG = false;
        let result = spec.interpretResponse({ body: response }, { bidRequests });
        let secondResult = spec.interpretResponse({ body: response }, { bidRequests });
        expect(secondResult).to.be.empty;
      });
    });
  });

  describe('getUserSyncs', function () {
    it('returns an iframe if enabled', () => {
      let response = spec.getUserSyncs({iframeEnabled: true});
      expect(response.type).to.equal('iframe');
      expect(response.url).to.equal(SYNC_ENDPOINT);
    });

    it('returns undefined if iframe not enabled ', () => {
      let response = spec.getUserSyncs({ iframeEnabled: false });
      expect(response).to.equal(undefined);
    });
  });
});
