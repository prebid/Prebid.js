import { expect } from 'chai';
import { spec } from 'modules/cpmstarBidAdapter.js';
import { deepClone } from 'src/utils.js';

describe('Cpmstar Bid Adapter', function () {
  describe('isBidRequestValid', function () {
    it('should return true since the bid is valid',
      function () {
        var bid = { params: { placementId: 123456 } };
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      })

    it('should return false since the bid is invalid', function () {
      var bid = { params: { placementId: '' } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    })

    it('should return a valid player size', function() {
      var bid = { mediaTypes: {
        video: {
          playerSize: [[960, 540]]
        }
      }}
      expect(spec.getPlayerSize(bid)[0]).to.equal(960);
      expect(spec.getPlayerSize(bid)[1]).to.equal(540);
    })

    it('should return a default player size', function() {
      var bid = { mediaTypes: {
        video: {
          playerSize: null
        }
      }}
      expect(spec.getPlayerSize(bid)[0]).to.equal(640);
      expect(spec.getPlayerSize(bid)[1]).to.equal(440);
    })
  });

  describe('buildRequests', function () {
    const valid_bid_requests = [{
      'bidder': 'cpmstar',
      'params': {
        'placementId': '57'
      },
      'sizes': [[300, 250]],
      'bidId': 'bidId'
    }];

    const bidderRequest = {
      refererInfo: {
        referer: 'referer',
        reachedTop: false,
      }

    };

    it('should produce a valid production request', function () {
      var requests = spec.buildRequests(valid_bid_requests, bidderRequest);
      expect(requests[0]).to.have.property('method');
      expect(requests[0]).to.have.property('url');
      expect(requests[0]).to.have.property('bidRequest');
      expect(requests[0].url).to.include('https://server.cpmstar.com/view.aspx');
    });
    it('should produce a valid staging request', function () {
      var stgReq = deepClone(valid_bid_requests);
      stgReq[0].params.endpoint = 'staging';
      var requests = spec.buildRequests(stgReq, bidderRequest);
      expect(requests[0]).to.have.property('method');
      expect(requests[0]).to.have.property('url');
      expect(requests[0]).to.have.property('bidRequest');
      expect(requests[0].url).to.include('https://staging.server.cpmstar.com/view.aspx');
    });
    it('should produce a valid dev request', function () {
      var devReq = deepClone(valid_bid_requests);
      devReq[0].params.endpoint = 'dev';
      var requests = spec.buildRequests(devReq, bidderRequest);
      expect(requests[0]).to.have.property('method');
      expect(requests[0]).to.have.property('url');
      expect(requests[0]).to.have.property('bidRequest');
      expect(requests[0].url).to.include('https://dev.server.cpmstar.com/view.aspx');
    });
  })

  describe('interpretResponse', function () {
    const request = {
      bidRequest: {
        mediaType: 'BANNER'
      }
    };
    const serverResponse = {
      body: [{
        creatives: [{
          cpm: 1,
          width: 0,
          height: 0,
          currency: 'USD',
          netRevenue: true,
          ttl: 1,
          creativeid: '1234',
          requestid: '11123',
          code: 'no idea',
          media: 'banner',
        }
        ],
      }]
    };

    it('should return a valid bidresponse array', function () {
      var r = spec.interpretResponse(serverResponse, request)
      var c = serverResponse.body[0].creatives[0];
      expect(r[0].length).to.not.equal(0);
      expect(r[0].requestId).equal(c.requestid);
      expect(r[0].creativeId).equal(c.creativeid);
      expect(r[0].cpm).equal(c.cpm);
      expect(r[0].width).equal(c.width);
      expect(r[0].height).equal(c.height);
      expect(r[0].currency).equal(c.currency);
      expect(r[0].netRevenue).equal(c.netRevenue);
      expect(r[0].ttl).equal(c.ttl);
      expect(r[0].ad).equal(c.code);
    });

    it('should return a valid bidresponse array from a non-array-body', function () {
      var r = spec.interpretResponse({ body: serverResponse.body[0] }, request)
      var c = serverResponse.body[0].creatives[0];
      expect(r[0].length).to.not.equal(0);
      expect(r[0].requestId).equal(c.requestid);
      expect(r[0].creativeId).equal(c.creativeid);
      expect(r[0].cpm).equal(c.cpm);
      expect(r[0].width).equal(c.width);
      expect(r[0].height).equal(c.height);
      expect(r[0].currency).equal(c.currency);
      expect(r[0].netRevenue).equal(c.netRevenue);
      expect(r[0].ttl).equal(c.ttl);
      expect(r[0].ad).equal(c.code);
    });

    it('should return undefined due to an invalid cpm value', function () {
      var badServer = deepClone(serverResponse);
      badServer.body[0].creatives[0].cpm = 0;
      var c = spec.interpretResponse(badServer, request);
      expect(c).to.be.undefined;
    });

    it('should return undefined due to a bad response', function () {
      var badServer = deepClone(serverResponse);
      badServer.body[0].creatives[0].code = null;
      var c = spec.interpretResponse(badServer, request);
      expect(c).to.be.undefined;
    });

    it('should return a valid response with a dealId', function () {
      var dealServer = deepClone(serverResponse);
      dealServer.body[0].creatives[0].dealId = 'deal';
      expect(spec.interpretResponse(dealServer, request)[0].dealId).to.equal('deal');
    });
  });
});
