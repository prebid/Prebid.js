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

  function videoBid(params = { feed: 'pub-4417' }, overrides = {}) {
    return Object.assign({
      bidder: 'bidfabrik',
      adUnitCode: 'div-video',
      bidId: 'vid-1',
      transactionId: 'tx-video',
      params,
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[640, 480]],
          mimes: ['video/mp4'],
          protocols: [1, 2, 3, 4, 5, 6],
        }
      },
      ortb2Imp: {},
    }, overrides);
  }

  function nativeBid(params = { feed: 'pub-4417' }, overrides = {}) {
    return Object.assign({
      bidder: 'bidfabrik',
      adUnitCode: 'div-native',
      bidId: 'nat-1',
      transactionId: 'tx-native',
      params,
      mediaTypes: {
        native: {
          title: { required: true },
          image: { required: true, sizes: [[300, 250]] },
          clickUrl: { required: true },
        }
      },
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

  const bidderRequestWithConsent = Object.assign({}, bidderRequest, {
    gdprConsent: {
      gdprApplies: true,
      consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
    },
    uspConsent: '1YNN',
    gppConsent: {
      gppString: 'DBABMA~CPXxRfA',
      applicableSections: [7],
    },
  });

  describe('aliases', function () {
    it('exposes revbid and revantage aliases sharing the gvlid', function () {
      const aliasFor = (code) => spec.aliases.find((a) => a.code === code);
      expect(spec.aliases.map((a) => a.code)).to.have.members(['revbid', 'revantage']);
      expect(aliasFor('revbid').gvlid).to.equal(spec.gvlid);
      expect(aliasFor('revantage').gvlid).to.equal(spec.gvlid);
    });
  });

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

    it('passes gdpr consent into the ORTB body', function () {
      const req = spec.buildRequests([bannerBid()], bidderRequestWithConsent)[0];
      expect(req.data.regs.ext.gdpr).to.equal(1);
      expect(req.data.user.ext.consent).to.equal('BOtmiBKOtmiBKABABAENAFAAAAACeAAA');
    });

    it('passes usp consent into the ORTB body', function () {
      const req = spec.buildRequests([bannerBid()], bidderRequestWithConsent)[0];
      expect(req.data.regs.ext.us_privacy).to.equal('1YNN');
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

    it('parses a video bid (mtype 2)', function () {
      const request = spec.buildRequests([videoBid()], bidderRequest)[0];
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'v1',
              impid: request.data.imp[0].id,
              price: 2.50,
              adm: '<VAST version="2.0"></VAST>',
              mtype: 2,
              w: 640,
              h: 480,
            }],
          }],
        },
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.length(1);
      expect(bids[0].mediaType).to.equal('video');
      expect(bids[0].vastXml).to.equal('<VAST version="2.0"></VAST>');
    });

    it('parses a native bid (mtype 4)', function () {
      const request = spec.buildRequests([nativeBid()], bidderRequest)[0];
      const nativeAdm = JSON.stringify({
        native: {
          ver: '1.1',
          link: { url: 'https://click.example.com' },
          assets: [{ id: 1, title: { text: 'Test Title' } }],
        }
      });
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'n1',
              impid: request.data.imp[0].id,
              price: 1.00,
              adm: nativeAdm,
              mtype: 4,
            }],
          }],
        },
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.length(1);
      expect(bids[0].mediaType).to.equal('native');
    });

    it('handles multiple seatbids with multiple bids each', function () {
      const bids = [
        bannerBid({ feed: 'pub-4417' }, { bidId: 'b1', adUnitCode: 'div-a' }),
        bannerBid({ feed: 'pub-4417' }, { bidId: 'b2', adUnitCode: 'div-b' }),
      ];
      const request = spec.buildRequests(bids, bidderRequest)[0];
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [
            {
              seat: 'seat-1',
              bid: [{
                id: 'x1',
                impid: request.data.imp[0].id,
                price: 1.00,
                adm: '<div>ad1</div>',
                mtype: 1,
                w: 300, h: 250,
              }],
            },
            {
              seat: 'seat-2',
              bid: [{
                id: 'x2',
                impid: request.data.imp[1].id,
                price: 2.00,
                adm: '<div>ad2</div>',
                mtype: 1,
                w: 300, h: 250,
              }],
            },
          ],
        },
      };
      const result = spec.interpretResponse(response, request);
      expect(result).to.have.length(2);
      expect(result.map((b) => b.cpm).sort()).to.deep.equal([1.00, 2.00]);
    });

    it('returns a bid with price 0', function () {
      const request = spec.buildRequests([bannerBid()], bidderRequest)[0];
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'z1',
              impid: request.data.imp[0].id,
              price: 0,
              adm: '<div>house</div>',
              mtype: 1,
              w: 300, h: 250,
            }],
          }],
        },
      };
      const result = spec.interpretResponse(response, request);
      expect(result).to.have.length(1);
      expect(result[0].cpm).to.equal(0);
    });

    it('returns a bid with no adm', function () {
      const request = spec.buildRequests([bannerBid()], bidderRequest)[0];
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'z2',
              impid: request.data.imp[0].id,
              price: 1.00,
              mtype: 1,
              w: 300, h: 250,
            }],
          }],
        },
      };
      const result = spec.interpretResponse(response, request);
      expect(result).to.have.length(1);
      expect(result[0].cpm).to.equal(1.00);
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
      expect(syncs).to.have.length(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include('https://bid.bidfabrik.com/sync/iframe');
    });

    it('returns image syncs when enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses);
      expect(syncs).to.have.length(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.include('https://bid.bidfabrik.com/sync/pixel');
    });

    it('returns [] when syncing is disabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, responses)).to.deep.equal([]);
    });

    it('returns [] when no sync data is present', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [{ body: {} }])).to.deep.equal([]);
    });

    it('appends gdpr consent params to sync urls', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'GDPR_STR' };
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, responses, gdprConsent);
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=GDPR_STR');
    });

    it('appends gdpr=0 when gdprApplies is false', function () {
      const gdprConsent = { gdprApplies: false, consentString: 'GDPR_STR' };
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, responses, gdprConsent);
      expect(syncs[0].url).to.include('gdpr=0');
    });

    it('appends usp consent to sync urls', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, responses, null, '1YNN');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });

    it('appends gpp consent to sync urls', function () {
      const gppConsent = { gppString: 'GPP_STR', applicableSections: [7, 8] };
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, responses, null, null, gppConsent);
      expect(syncs[0].url).to.include('gpp=GPP_STR');
      expect(syncs[0].url).to.include('gpp_sid=7%2C8');
    });

    it('appends all consent params together', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'TC' };
      const gppConsent = { gppString: 'GPP', applicableSections: [7] };
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, responses, gdprConsent, '1YNN', gppConsent);
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=TC');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
      expect(syncs[0].url).to.include('gpp=GPP');
      expect(syncs[0].url).to.include('gpp_sid=7');
    });

    it('returns urls unchanged when no consent is provided', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, responses);
      expect(syncs[0].url).to.equal('https://bid.bidfabrik.com/sync/pixel');
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
