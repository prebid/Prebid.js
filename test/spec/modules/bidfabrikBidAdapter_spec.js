import { expect } from 'chai';
import { spec } from 'modules/bidfabrikBidAdapter.js';
import * as utils from 'src/utils.js';

describe('BidFabrik bid adapter', function () {
  function bannerBid(params = { feed: 'pub-4417' }, overrides = {}) {
    return Object.assign({
      bidder: 'bidfabrik',
      adUnitCode: 'div-1',
      bidId: '2a1b2c3d',
      transactionId: 'tx-1',
      params,
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      ortb2Imp: {},
    }, overrides);
  }

  const bidderRequest = {
    bidderCode: 'bidfabrik',
    auctionId: 'auction-1',
    bidderRequestId: 'br-1',
    timeout: 1000,
    refererInfo: { page: 'https://publisher.example/page', domain: 'publisher.example' },
  };

  describe('isBidRequestValid', function () {
    it('accepts a bid with a feed', function () {
      expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
    });

    it('accepts a bid with feed and host', function () {
      expect(spec.isBidRequestValid(bannerBid({ feed: 'pub-1', host: 'us.bidfabrik.com' }))).to.equal(true);
    });

    it('rejects a bid with no params', function () {
      expect(spec.isBidRequestValid({ bidder: 'bidfabrik' })).to.equal(false);
    });

    it('rejects a missing or empty feed', function () {
      expect(spec.isBidRequestValid(bannerBid({}))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ feed: '   ' }))).to.equal(false);
    });

    it('rejects a non-string host', function () {
      expect(spec.isBidRequestValid(bannerBid({ feed: 'pub-1', host: 123 }))).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('posts JSON to the default host with the feed query param', function () {
      const reqs = spec.buildRequests([bannerBid()], bidderRequest);
      expect(reqs).to.have.length(1);
      const req = reqs[0];
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal('https://bid.bidfabrik.com/bid?feed=pub-4417');
      expect(req.options.contentType).to.equal('text/plain');
      expect(req.options.withCredentials).to.equal(false);
    });

    it('honours the host override and url-encodes the feed', function () {
      const reqs = spec.buildRequests(
        [bannerBid({ feed: 'pub a/b', host: 'us.bidfabrik.com' })],
        bidderRequest
      );
      expect(reqs[0].url).to.equal('https://us.bidfabrik.com/bid?feed=pub%20a%2Fb');
    });

    it('mirrors the feed into the ORTB body ext', function () {
      const reqs = spec.buildRequests([bannerBid()], bidderRequest);
      expect(reqs[0].data.ext.bidfabrik.feed).to.equal('pub-4417');
    });

    it('splits requests per (host, feed) group', function () {
      const reqs = spec.buildRequests([
        bannerBid({ feed: 'a' }, { bidId: 'b1' }),
        bannerBid({ feed: 'b' }, { bidId: 'b2' }),
        bannerBid({ feed: 'a' }, { bidId: 'b3' }),
      ], bidderRequest);
      expect(reqs).to.have.length(2);
      const feeds = reqs.map((r) => r.url).sort();
      expect(feeds).to.deep.equal([
        'https://bid.bidfabrik.com/bid?feed=a',
        'https://bid.bidfabrik.com/bid?feed=b',
      ]);
    });
  });

  describe('interpretResponse', function () {
    it('returns [] for an empty body', function () {
      const request = spec.buildRequests([bannerBid()], bidderRequest)[0];
      expect(spec.interpretResponse({ body: '' }, request)).to.deep.equal([]);
    });

    it('parses an OpenRTB seatbid into prebid bids', function () {
      const request = spec.buildRequests([bannerBid()], bidderRequest)[0];
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            seat: 'bidfabrik',
            bid: [{
              id: 'x1',
              impid: request.data.imp[0].id,
              price: 1.23,
              adm: '<div>ad</div>',
              crid: 'creative-9',
              mtype: 1,
              w: 300,
              h: 250,
              nurl: 'https://bid.bidfabrik.com/win?p=${AUCTION_PRICE}',
            }],
          }],
        },
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.length(1);
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].creativeId).to.equal('creative-9');
      expect(bids[0].nurl).to.equal('https://bid.bidfabrik.com/win?p=${AUCTION_PRICE}');
    });
  });

  describe('getUserSyncs', function () {
    const responses = [{
      body: {
        ext: {
          usersync: [
            { type: 'iframe', url: 'https://bid.bidfabrik.com/sync/iframe' },
            { type: 'image', url: 'https://bid.bidfabrik.com/sync/pixel' },
          ]
        }
      },
    }];

    it('returns iframe syncs when enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, responses);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: 'https://bid.bidfabrik.com/sync/iframe' }]);
    });

    it('returns image syncs when enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses);
      expect(syncs).to.deep.equal([{ type: 'image', url: 'https://bid.bidfabrik.com/sync/pixel' }]);
    });

    it('returns [] when syncing is disabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, responses)).to.deep.equal([]);
    });

    it('returns [] when no sync data is present', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [{ body: {} }])).to.deep.equal([]);
    });
  });

  describe('onBidWon', function () {
    let triggerStub;
    beforeEach(function () { triggerStub = sinon.stub(utils, 'triggerPixel'); });
    afterEach(function () { triggerStub.restore(); });

    it('fires the nurl with the auction price substituted', function () {
      spec.onBidWon({ nurl: 'https://bid.bidfabrik.com/win?p=${AUCTION_PRICE}', cpm: 1.5, originalCpm: 1.5 });
      expect(triggerStub.calledOnce).to.equal(true);
      expect(triggerStub.firstCall.args[0]).to.equal('https://bid.bidfabrik.com/win?p=1.5');
    });

    it('does nothing without an nurl', function () {
      spec.onBidWon({ cpm: 1.5 });
      expect(triggerStub.called).to.equal(false);
    });
  });
});
