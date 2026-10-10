import { expect } from 'chai';
import { spec } from 'modules/pigeoonBidAdapter.js';
import { server } from 'test/mocks/xhr.js';

const ENDPOINT_URL = 'https://pbjs.pigeoon.com/bid';
const SYNC_URL = 'https://pbjs.pigeoon.com/sync';

function makeBidRequest(overrides = {}) {
  return Object.assign({
    bidder: 'pigeoon',
    bidId: 'bid-1',
    adUnitCode: 'div-banner-1',
    params: {
      networkId: 'net_ABC123',
      placementId: '12345678'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    }
  }, overrides);
}

function makeBidderRequest(bidRequests, ortb2) {
  return {
    bidderCode: 'pigeoon',
    bidderRequestId: 'bidder-request-1',
    auctionId: 'auction-1',
    timeout: 1000,
    refererInfo: {
      page: 'https://example.com/news/article'
    },
    ortb2: ortb2 || {
      site: {
        page: 'https://example.com/news/article',
        domain: 'example.com'
      }
    },
    bids: bidRequests
  };
}

describe('pigeoonBidAdapter', function () {
  describe('isBidRequestValid', function () {
    it('should return true when networkId and placementId are present', function () {
      expect(spec.isBidRequestValid(makeBidRequest())).to.equal(true);
    });

    it('should return false when networkId is missing', function () {
      const bid = makeBidRequest({ params: { placementId: '12345678' } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when placementId is missing', function () {
      const bid = makeBidRequest({ params: { networkId: 'net_ABC123' } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when params are missing', function () {
      const bid = makeBidRequest({ params: undefined });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should build a text/plain POST request to the endpoint', function () {
      const bids = [makeBidRequest()];
      const request = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.options.contentType).to.equal('text/plain');
      expect(request.data).to.be.an('object');
    });

    it('should set tagid from placementId as a string', function () {
      const bids = [makeBidRequest({ params: { networkId: 'net_ABC123', placementId: 12345678 } })];
      const request = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.data.imp[0].tagid).to.equal('12345678');
    });

    it('should set site.publisher.id from networkId for web inventory', function () {
      const bids = [makeBidRequest()];
      const request = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.data.site.publisher.id).to.equal('net_ABC123');
    });

    it('should set app.publisher.id and not create a site section for app inventory', function () {
      const bids = [makeBidRequest()];
      const request = spec.buildRequests(bids, makeBidderRequest(bids, { app: { bundle: 'com.example.app' } }));

      expect(request.data.app.publisher.id).to.equal('net_ABC123');
      expect(request.data.site).to.equal(undefined);
    });

    it('should keep first-party site data', function () {
      const bids = [makeBidRequest()];
      const request = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.data.site.page).to.equal('https://example.com/news/article');
      expect(request.data.site.domain).to.equal('example.com');
    });

    it('should build banner formats from ad unit sizes', function () {
      const bids = [makeBidRequest()];
      const request = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.data.imp[0].banner.format).to.deep.equal([
        { w: 300, h: 250 },
        { w: 728, h: 90 }
      ]);
    });

    it('should create one imp per bid request with the bid id as imp id', function () {
      const bids = [
        makeBidRequest({ bidId: 'bid-1' }),
        makeBidRequest({ bidId: 'bid-2', adUnitCode: 'div-banner-2', params: { networkId: 'net_ABC123', placementId: '87654321' } })
      ];
      const request = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.data.imp).to.have.length(2);
      expect(request.data.imp[0].id).to.equal('bid-1');
      expect(request.data.imp[1].id).to.equal('bid-2');
      expect(request.data.imp[1].tagid).to.equal('87654321');
    });

    it('should pass GPID and interstitial flag from ortb2Imp', function () {
      const bids = [makeBidRequest({
        ortb2Imp: {
          instl: 1,
          ext: { gpid: '/1234/example/slot' }
        }
      })];
      const request = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.data.imp[0].instl).to.equal(1);
      expect(request.data.imp[0].ext.gpid).to.equal('/1234/example/slot');
    });

    it('should pass user ids (eids) from first-party data', function () {
      const eids = [{ source: 'pubcid.org', uids: [{ id: 'shared-id-1', atype: 1 }] }];
      const bids = [makeBidRequest()];
      const ortb2 = {
        site: { page: 'https://example.com/news/article', domain: 'example.com' },
        user: { ext: { eids } }
      };
      const request = spec.buildRequests(bids, makeBidderRequest(bids, ortb2));

      expect(request.data.user.ext.eids).to.deep.equal(eids);
    });
  });

  describe('interpretResponse', function () {
    function buildRequest() {
      const bids = [makeBidRequest()];
      return spec.buildRequests(bids, makeBidderRequest(bids));
    }

    const renderUrl = 'https://pbjs.pigeoon.com/render?type=display&w=300&h=250&lineItemId=7454993267&placementId=12345678&bidId=11111111-1111-1111-1111-111111111111';

    function serverResponse(bidOverrides = {}) {
      return {
        body: {
          id: 'response-1',
          cur: 'TRY',
          seatbid: [{
            bid: [Object.assign({
              id: '11111111-1111-1111-1111-111111111111',
              impid: 'bid-1',
              price: 27.5,
              adid: '7454993267',
              nurl: 'https://pbjs.pigeoon.com/win?bidId=11111111-1111-1111-1111-111111111111',
              adm: renderUrl,
              w: 300,
              h: 250
            }, bidOverrides)]
          }]
        }
      };
    }

    it('should return a banner bid with adUrl and creativeId', function () {
      const bids = spec.interpretResponse(serverResponse(), buildRequest());

      expect(bids).to.have.length(1);
      expect(bids[0].requestId).to.equal('bid-1');
      expect(bids[0].cpm).to.equal(27.5);
      expect(bids[0].currency).to.equal('TRY');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(300);
      expect(bids[0].creativeId).to.equal('7454993267');
      expect(bids[0].adUrl).to.equal(renderUrl);
    });

    it('should prefer adid over crid for creativeId', function () {
      const bids = spec.interpretResponse(serverResponse({ crid: 'other-creative' }), buildRequest());

      expect(bids[0].creativeId).to.equal('7454993267');
    });

    it('should fall back to crid when adid is missing', function () {
      const bids = spec.interpretResponse(serverResponse({ adid: undefined, crid: 'creative-1' }), buildRequest());

      expect(bids[0].creativeId).to.equal('creative-1');
    });

    it('should not render markup or attach nurl as a tracking pixel', function () {
      const bids = spec.interpretResponse(serverResponse(), buildRequest());

      expect(bids[0].ad).to.equal(undefined);
    });

    it('should return an empty array for an empty response', function () {
      expect(spec.interpretResponse({ body: {} }, buildRequest())).to.deep.equal([]);
    });

    it('should return an empty array for a null response', function () {
      expect(spec.interpretResponse({ body: null }, buildRequest())).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('should return nothing when iframe syncs are disabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false }, [], null)).to.deep.equal([]);
    });

    it('should return the sync url without params when GDPR does not apply', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], { gdprApplies: false, consentString: 'abc' });

      expect(syncs).to.have.length(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal(SYNC_URL);
    });

    it('should return the sync url without params when there is no consent object', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], undefined);

      expect(syncs[0].url).to.equal(SYNC_URL);
    });

    it('should add encoded GDPR params when GDPR applies', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], { gdprApplies: true, consentString: 'a b+c' });

      expect(syncs[0].url).to.equal(`${SYNC_URL}?gdpr=1&gdpr_consent=a%20b%2Bc`);
    });
  });

  describe('bid events', function () {
    const renderUrl = 'https://pbjs.pigeoon.com/render?type=display&w=300&h=250&lineItemId=7454993267&placementId=12345678&bidId=11111111-1111-1111-1111-111111111111';

    const wonBid = {
      creativeId: '7454993267',
      adUrl: renderUrl,
      params: [{ networkId: 'net_ABC123', placementId: '12345678' }]
    };

    it('should not define onBidViewable (viewability is measured in the render page)', function () {
      expect(spec.onBidViewable).to.equal(undefined);
    });

    it('should send notifications as GET requests', function () {
      spec.onBidWon(wonBid);

      expect(server.requests).to.have.length(1);
      expect(server.requests[0].method).to.equal('GET');
    });

    it('onBidWon should notify prebidwon with bid details', function () {
      spec.onBidWon(wonBid);

      const url = server.requests[0].url;
      expect(url).to.contain('https://pbjs.pigeoon.com/prebidwon?');
      expect(url).to.contain('bidId=11111111-1111-1111-1111-111111111111');
      expect(url).to.contain('nid=net_ABC123');
      expect(url).to.contain('pid=12345678');
      expect(url).to.contain('li=7454993267');
    });

    it('should use the config that matches the rendered placement when the ad unit has several Pigeoon configs', function () {
      spec.onBidWon(Object.assign({}, wonBid, {
        params: [
          { networkId: 'net_FIRST', placementId: '11111111' },
          { networkId: 'net_SECOND', placementId: '12345678' }
        ]
      }));

      const url = server.requests[0].url;
      expect(url).to.contain('nid=net_SECOND');
      expect(url).to.contain('pid=12345678');
    });

    it('should not notify when no config matches the rendered placement', function () {
      spec.onBidWon(Object.assign({}, wonBid, {
        params: [{ networkId: 'net_ABC123', placementId: '99999999' }]
      }));

      expect(server.requests).to.have.length(0);
    });

    it('should not notify when the render url has no bid id', function () {
      spec.onBidWon(Object.assign({}, wonBid, { adUrl: 'https://pbjs.pigeoon.com/render' }));

      expect(server.requests).to.have.length(0);
    });

    it('onTimeout should report the placement remembered for the timed out bid', function () {
      const bids = [
        makeBidRequest({ bidId: 'bid-a', params: { networkId: 'net_ABC123', placementId: '11111111' } }),
        makeBidRequest({ bidId: 'bid-b', params: { networkId: 'net_ABC123', placementId: '22222222' } })
      ];
      spec.buildRequests(bids, makeBidderRequest(bids));

      spec.onTimeout([{
        bidder: 'pigeoon',
        bidId: 'bid-b',
        params: [
          { networkId: 'net_ABC123', placementId: '11111111' },
          { networkId: 'net_ABC123', placementId: '22222222' }
        ]
      }]);

      expect(server.requests).to.have.length(1);
      expect(server.requests[0].url).to.equal('https://pbjs.pigeoon.com/timeout?pid=22222222');
    });

    it('onTimeout should fall back to a single configured placement', function () {
      spec.onTimeout([{ bidder: 'pigeoon', bidId: 'unknown-bid', params: { networkId: 'net_ABC123', placementId: '87654321' } }]);

      expect(server.requests[0].url).to.equal('https://pbjs.pigeoon.com/timeout?pid=87654321');
    });

    it('onTimeout should not guess when several configs exist and the bid is unknown', function () {
      spec.onTimeout([{
        bidder: 'pigeoon',
        bidId: 'unknown-bid',
        params: [
          { networkId: 'net_ABC123', placementId: '11111111' },
          { networkId: 'net_ABC123', placementId: '22222222' }
        ]
      }]);

      expect(server.requests).to.have.length(0);
    });
  });
});
