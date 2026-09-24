import { expect } from 'chai';
import { spec } from 'modules/advergicBidAdapter.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { config } from 'src/config.js';
import { BANNER } from 'src/mediaTypes.js';

const BASE_BID = {
  bidder: 'advergic',
  adUnitCode: 'advergic-test-div',
  bidId: 'bid-001',
  bidderRequestId: 'bidder-001',
  auctionId: 'auction-001',
  transactionId: 'transaction-001',
  params: {
    accountId: 'account-123',
    publisherId: 'publisher-456',
    endpointId: 'endpoint-789',
    position: 1,
    custom: { foo: 'bar' }
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [728, 90]],
      pos: 3
    }
  },
  sizes: [[300, 250], [728, 90]]
};

const BASE_BIDDER_REQUEST = {
  bidderCode: 'advergic',
  bidderRequestId: 'bidder-request-001',
  auctionId: 'auction-001',
  timeout: 2000,
  refererInfo: {
    page: 'https://example.com/page',
    ref: 'https://referrer.example/',
    domain: 'example.com'
  },
  ortb2: {
    site: {
      domain: 'example.com',
      page: 'https://example.com/page',
      publisher: { id: 'ortb-publisher' }
    },
    user: {
      ext: {
        data: { segment: ['one', 'two'] }
      }
    },
    device: {
      language: 'en'
    },
    source: {
      tid: 'source-tid',
      ext: {
        foo: 'source-ext'
      }
    },
    regs: {
      coppa: 0,
      ext: {
        custom_reg: 1
      }
    }
  }
};

function clone(value) {
  return utils.deepClone(value);
}

function buildRequest(bid = BASE_BID, bidderRequest = BASE_BIDDER_REQUEST) {
  const request = spec.buildRequests([bid], {
    ...clone(bidderRequest),
    bids: [bid]
  });
  return request;
}

describe('Advergic adapter', () => {
  afterEach(() => {
    config.resetConfig();
  });

  describe('Bid validations', () => {
    it('should return true for a valid banner bid', () => {
      expect(spec.isBidRequestValid(clone(BASE_BID))).to.equal(true);
    });

    it('should return false when params are missing', () => {
      const bid = clone(BASE_BID);
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when accountId is missing', () => {
      const bid = clone(BASE_BID);
      delete bid.params.accountId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when accountId is not a string', () => {
      const bid = clone(BASE_BID);
      bid.params.accountId = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when banner mediaType is missing', () => {
      const bid = clone(BASE_BID);
      delete bid.mediaTypes.banner;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false for non-banner-only requests', () => {
      const bid = clone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream' } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('Adapter configuration', () => {
    it('should use the advergic bidder code', () => {
      expect(spec.code).to.equal('advergic');
    });

    it('should support banner media', () => {
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER]);
    });
  });

  describe('Request formation', () => {
    it('should build a POST request to the existing Advergic endpoint', () => {
      const request = buildRequest();

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://pbs.avads.live/rtb/bid');
      expect(request.options).to.deep.equal({
        contentType: 'application/json',
        withCredentials: true
      });
      expect(request.data).to.be.an('object');
    });

    it('should preserve existing Advergic impression fields', () => {
      const request = buildRequest();
      const imp = request.data.imp[0];

      expect(imp.id).to.equal('bid-001');
      expect(imp.tagid).to.equal('endpoint-789');
      expect(imp.accountId).to.be.undefined;
      expect(imp.ext.accountId).to.equal('account-123');
      expect(imp.ext.advergic.adUnitCode).to.equal('advergic-test-div');
      expect(imp.ext.advergic.transactionId).to.equal('transaction-001');
      expect(imp.ext.advergic.publisherId).to.equal('publisher-456');
      expect(imp.ext.advergic.custom).to.deep.equal({ foo: 'bar' });
      expect(imp.banner.format).to.deep.equal([
        { w: 300, h: 250 },
        { w: 728, h: 90 }
      ]);
      expect(imp.banner.w).to.equal(300);
      expect(imp.banner.h).to.equal(250);
      expect(imp.banner.pos).to.equal(3);
    });

    it('should use adUnitCode as tagid when endpointId is not supplied', () => {
      const bid = clone(BASE_BID);
      delete bid.params.endpointId;
      const request = buildRequest(bid);
      expect(request.data.imp[0].tagid).to.equal('advergic-test-div');
    });

    it('should preserve impression-level ORTB2 data and extensions', () => {
      const bid = clone(BASE_BID);
      bid.ortb2Imp = {
        id: 'original-imp-id',
        metric: [{ type: 'viewability', value: 0.8 }],
        ext: {
          tid: 'imp-tid',
          gpid: '/123/example',
          custom: { value: 42 },
          advergic: { existing: true }
        }
      };

      const request = buildRequest(bid);
      const imp = request.data.imp[0];

      expect(imp.metric).to.deep.equal([{ type: 'viewability', value: 0.8 }]);
      expect(imp.id).to.equal('bid-001');
      expect(imp.ext.tid).to.equal('imp-tid');
      expect(imp.ext.gpid).to.equal('/123/example');
      expect(imp.ext.custom).to.deep.equal({ value: 42 });
      expect(imp.ext.advergic.existing).to.equal(true);
      expect(imp.ext.advergic.transactionId).to.equal('transaction-001');
    });

    it('should preserve site, user, device, source and regs ORTB2 data', () => {
      const request = buildRequest();

      expect(request.data.site.publisher.id).to.equal('publisher-456');
      expect(request.data.site.domain).to.equal('example.com');
      expect(request.data.site.page).to.equal('https://example.com/page');
      expect(request.data.site.ref).to.equal('https://referrer.example/');
      expect(request.data.site.ext.metadata).to.be.an('object');

      expect(request.data.user.ext.data).to.deep.equal({ segment: ['one', 'two'] });
      expect(request.data.device.language).to.equal('en');
      expect(request.data.source.tid).to.equal('source-tid');
      expect(request.data.source.ext.foo).to.equal('source-ext');
      expect(request.data.regs.coppa).to.equal(0);
      expect(request.data.regs.ext.custom_reg).to.equal(1);
    });

    it('should prefer Prebid refererInfo while retaining ORTB2 site fallbacks', () => {
      const bidderRequest = clone(BASE_BIDDER_REQUEST);
      bidderRequest.refererInfo = {
        page: 'https://preferred.example/article',
        ref: 'https://preferred.example/ref',
        domain: 'preferred.example'
      };
      bidderRequest.ortb2.site = {
        domain: 'fallback.example',
        page: 'https://fallback.example/article',
        ref: 'https://fallback.example/ref'
      };

      const request = buildRequest(BASE_BID, bidderRequest);

      expect(request.data.site.domain).to.equal('preferred.example');
      expect(request.data.site.page).to.equal('https://preferred.example/article');
      expect(request.data.site.ref).to.equal('https://preferred.example/ref');
    });

    it('should preserve an explicit ORTB2 device dnt value', () => {
      const bidderRequest = clone(BASE_BIDDER_REQUEST);
      bidderRequest.ortb2.device.dnt = 0;
      const request = buildRequest(BASE_BID, bidderRequest);
      expect(request.data.device.dnt).to.equal(0);
    });

    it('should include a floor from getFloor()', () => {
      const bid = clone(BASE_BID);
      bid.getFloor = ({ currency, mediaType, size }) => {
        expect(currency).to.equal('USD');
        expect(mediaType).to.equal('*');
        expect(size).to.equal('*');
        return { floor: 1.25, currency: 'USD' };
      };

      const request = buildRequest(bid);
      expect(request.data.imp[0].bidfloor).to.equal(1.25);
      expect(request.data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should not add invalid floor data', () => {
      const bid = clone(BASE_BID);
      bid.getFloor = () => ({ floor: 'not-a-number', currency: 'USD' });
      const request = buildRequest(bid);
      expect(request.data.imp[0]).to.not.have.property('bidfloor');
      expect(request.data.imp[0]).to.not.have.property('bidfloorcur');
    });

    it('should forward GDPR consent', () => {
      const bidderRequest = clone(BASE_BIDDER_REQUEST);
      bidderRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'CONSENT-STRING',
        addtlConsent: '1~vendor'
      };

      const request = buildRequest(BASE_BID, bidderRequest);
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal('CONSENT-STRING');
      expect(request.data.user.ext.ConsentedProvidersSettings).to.deep.equal({
        consented_providers: '1~vendor'
      });
    });

    it('should forward USP consent', () => {
      const bidderRequest = clone(BASE_BIDDER_REQUEST);
      bidderRequest.uspConsent = '1YNN';
      const request = buildRequest(BASE_BID, bidderRequest);
      expect(request.data.regs.ext.us_privacy).to.equal('1YNN');
    });

    it('should forward GPP consent', () => {
      const bidderRequest = clone(BASE_BIDDER_REQUEST);
      bidderRequest.gppConsent = {
        gppString: 'DBABMA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAAAAAAAAAAA~1YNN',
        applicableSections: [2, 6]
      };

      const request = buildRequest(BASE_BID, bidderRequest);
      expect(request.data.regs.ext.gpp).to.equal(bidderRequest.gppConsent.gppString);
      expect(request.data.regs.ext.gpp_sid).to.deep.equal([2, 6]);
    });

    it('should forward schain when available', () => {
      const bid = clone(BASE_BID);
      bid.schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'example.com', sid: 'seller-1', hp: 1 }]
      };
      const request = buildRequest(bid);
      expect(request.data.source.ext.schain).to.deep.equal(bid.schain);
    });

    it('should forward userIdAsEids when available', () => {
      const bid = clone(BASE_BID);
      bid.userIdAsEids = [{
        source: 'example-id',
        uids: [{ id: 'user-123' }]
      }];
      const request = buildRequest(bid);
      expect(request.data.user.ext.eids).to.deep.equal(bid.userIdAsEids);
    });

    it('should send multiple impressions in a single OpenRTB request', () => {
      const bid2 = clone(BASE_BID);
      bid2.bidId = 'bid-002';
      bid2.adUnitCode = 'advergic-test-div-2';
      bid2.transactionId = 'transaction-002';

      const bidderRequest = clone(BASE_BIDDER_REQUEST);
      bidderRequest.bids = [BASE_BID, bid2];

      const request = spec.buildRequests([BASE_BID, bid2], bidderRequest);
      expect(request.data.imp).to.have.length(2);
      expect(request.data.imp[0].id).to.equal('bid-001');
      expect(request.data.imp[1].id).to.equal('bid-002');
    });
  });

  describe('Response interpretation', () => {
    const request = buildRequest();

    it('should return no bids for an empty response', () => {
      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: null }, request)).to.deep.equal([]);
    });

    it('should return no bids for a response without seatbid', () => {
      expect(spec.interpretResponse({ body: { cur: 'USD' } }, request)).to.deep.equal([]);
    });

    it('should return no bids when seatbid entries do not contain a bid array', () => {
      const response = { body: { cur: 'USD', seatbid: [{}] } };
      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });

    it('should parse a valid banner bid', () => {
      const response = {
        body: {
          cur: 'USD',
          seatbid: [{
            seat: 'advergic-seat',
            bid: [{
              id: 'server-bid-1',
              impid: 'bid-001',
              price: 2.5,
              w: 300,
              h: 250,
              crid: 'creative-1',
              cid: 'campaign-1',
              dealid: 'deal-1',
              adm: '<div>Ad</div>',
              burl: 'https://pbs.avads.live/track?price=${AUCTION_PRICE}',
              adomain: ['advertiser.example'],
              cat: ['IAB12', 'IAB12-1'],
              ext: {
                advertiser_name: 'Advertiser',
                brand: 'Brand'
              }
            }]
          }]
        }
      };

      const [bid] = spec.interpretResponse(response, request);

      expect(bid.requestId).to.equal('bid-001');
      expect(bid.cpm).to.equal(2.5);
      expect(bid.currency).to.equal('USD');
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('creative-1');
      expect(bid.bidId).to.equal('server-bid-1');
      expect(bid.campaignId).to.equal('campaign-1');
      expect(bid.impId).to.equal('bid-001');
      expect(bid.dealId).to.equal('deal-1');
      expect(bid.ttl).to.equal(300);
      expect(bid.netRevenue).to.equal(true);
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.ad).to.equal('<div>Ad</div>');
      expect(bid.burl).to.contain('${AUCTION_PRICE}');
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.example']);
      expect(bid.meta.networkName).to.equal('advergic-seat');
      expect(bid.meta.advertiserName).to.equal('Advertiser');
      expect(bid.meta.brandName).to.equal('Brand');
      expect(bid.meta.primaryCatId).to.equal('IAB12');
      expect(bid.meta.secondaryCatIds).to.deep.equal(['IAB12-1']);
    });

    it('should expose DSA transparency data when returned', () => {
      const response = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'server-bid-2',
              impid: 'bid-001',
              price: 1,
              w: 300,
              h: 250,
              adm: '<div>Ad</div>',
              ext: {
                dsa: {
                  behalf: 'Advertiser',
                  paid: 'Advertiser',
                  adrender: 1
                }
              }
            }]
          }]
        }
      };

      const [bid] = spec.interpretResponse(response, request);
      expect(bid.meta.dsa).to.deep.equal(response.body.seatbid[0].bid[0].ext.dsa);
    });

    it('should ignore zero-price bids', () => {
      const response = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'server-bid-3',
              impid: 'bid-001',
              price: 0,
              w: 300,
              h: 250,
              adm: '<div>Ad</div>'
            }]
          }]
        }
      };

      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });

    it('should ignore bids without ad markup', () => {
      const response = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'server-bid-4',
              impid: 'bid-001',
              price: 1,
              w: 300,
              h: 250
            }]
          }]
        }
      };

      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });

    it('should parse multiple bids', () => {
      const response = {
        body: {
          cur: 'EUR',
          seatbid: [{
            seat: 'seat-a',
            bid: [
              { id: 'b1', impid: 'bid-001', price: 1.1, w: 300, h: 250, adm: '<a>A</a>' },
              { id: 'b2', impid: 'bid-001', price: 1.2, w: 728, h: 90, adm: '<a>B</a>' }
            ]
          }]
        }
      };

      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.length(2);
      expect(bids[0].currency).to.equal('EUR');
      expect(bids[1].width).to.equal(728);
    });
  });

  describe('User sync', () => {
    it('should return a server-provided iframe sync when enabled', () => {
      const serverResponses = [{
        body: {
          ext: {
            sync: {
              iframe: ['https://sync.example/iframe']
            }
          }
        }
      }];

      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, serverResponses);
      expect(syncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://sync.example/iframe'
      }]);
    });

    it('should return a server-provided image sync when enabled', () => {
      const serverResponses = [{
        body: {
          ext: {
            sync: {
              image: ['https://sync.example/pixel']
            }
          }
        }
      }];

      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, serverResponses);
      expect(syncs).to.deep.equal([{
        type: 'image',
        url: 'https://sync.example/pixel'
      }]);
    });

    it('should append privacy parameters to server-provided sync URLs', () => {
      const serverResponses = [{
        body: {
          ext: {
            sync: {
              iframe: ['https://sync.example/iframe']
            }
          }
        }
      }];

      const [sync] = spec.getUserSyncs(
        { iframeEnabled: true, pixelEnabled: false },
        serverResponses,
        { gdprApplies: true, consentString: 'CONSENT' },
        '1YNN',
        { gppString: 'GPP', applicableSections: [2, 6] }
      );

      expect(sync.url).to.equal(
        'https://sync.example/iframe&gdpr=1&gdpr_consent=CONSENT&us_privacy=1YNN&gpp=GPP&gpp_sid=2%2C6'
      );
    });

    it('should use the iframe fallback endpoint when no server sync is available', () => {
      const [sync] = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, []);
      expect(sync).to.deep.equal({
        type: 'iframe',
        url: 'https://pbs.avads.live/id/setuid?bidder=advergic&f=i'
      });
    });

    it('should use the image fallback endpoint when iframe sync is disabled', () => {
      const [sync] = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, []);
      expect(sync).to.deep.equal({
        type: 'image',
        url: 'https://pbs.avads.live/id/setuid?bidder=advergic&f=b'
      });
    });

    it('should return no sync when both sync types are disabled', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, []);
      expect(syncs).to.deep.equal([]);
    });
  });

  describe('Event callbacks', () => {
    beforeEach(() => {
      server.requests.length = 0;
    });

    it('should send win analytics to the existing endpoint', () => {
      spec.onBidWon({
        requestId: 'bid-001',
        auctionId: 'auction-001',
        adId: 'ad-001',
        bidId: 'server-bid-1',
        impId: 'bid-001',
        campaignId: 'campaign-1',
        cpm: 2,
        currency: 'USD',
        creativeId: 'creative-1',
        adUnitCode: 'advergic-test-div',
        mediaType: BANNER,
        width: 300,
        height: 250,
        timeToRespond: 20
      });

      const winRequests = server.requests.filter(
        (req) => req.url === 'https://pbs.avads.live/rtb/win'
      );

      expect(winRequests).to.have.length(1);
      expect(winRequests[0].method).to.equal('POST');

      const body = JSON.parse(winRequests[0].fetch.requestBody);
      expect(body).to.include({
        requestId: 'bid-001',
        bidId: 'server-bid-1',
        campaignId: 'campaign-1'
      });
    });

    it('should fire burl separately from optional analytics tracking', () => {
      const imageUrls = [];
      const imageStub = sinon.stub(window, 'Image').callsFake(function() {
        const image = {};
        Object.defineProperty(image, 'src', {
          configurable: true,
          get() {
            return imageUrls[imageUrls.length - 1];
          },
          set(url) {
            imageUrls.push(url);
          }
        });
        return image;
      });

      try {
        spec.onBidWon({
          requestId: 'bid-001',
          auctionId: 'auction-001',
          adId: 'ad-001',
          cpm: 2,
          currency: 'USD',
          creativeId: 'creative-1',
          width: 300,
          height: 250,
          burl: 'https://tracking.example/win?price=${AUCTION_PRICE}'
        });

        expect(imageUrls).to.deep.equal([
          'https://tracking.example/win?price=2'
        ]);

        const winRequests = server.requests.filter(
          (req) => req.url === 'https://pbs.avads.live/rtb/win'
        );
        expect(winRequests).to.have.length(1);
      } finally {
        imageStub.restore();
      }
    });

    it('should disable optional event tracking without disabling burl', () => {
      const imageUrls = [];
      const imageStub = sinon.stub(window, 'Image').callsFake(function() {
        const image = {};
        Object.defineProperty(image, 'src', {
          configurable: true,
          get() {
            return imageUrls[imageUrls.length - 1];
          },
          set(url) {
            imageUrls.push(url);
          }
        });
        return image;
      });

      try {
        config.setConfig({
          advergic: {
            disableEventTracking: true
          }
        });

        spec.onBidWon({
          requestId: 'bid-001',
          cpm: 2,
          currency: 'USD',
          creativeId: 'creative-1',
          burl: 'https://tracking.example/win?price=${AUCTION_PRICE}'
        });

        const winRequests = server.requests.filter(
          (req) => req.url === 'https://pbs.avads.live/rtb/win'
        );

        expect(winRequests).to.have.length(0);
        expect(imageUrls).to.deep.equal([
          'https://tracking.example/win?price=2'
        ]);
      } finally {
        imageStub.restore();
      }
    });

    it('should send timeout analytics to the existing endpoint', () => {
      spec.onTimeout([{
        bidId: 'bid-001',
        auctionId: 'auction-001',
        adUnitCode: 'advergic-test-div',
        timeout: 2000,
        params: { accountId: 'account-123' }
      }]);

      const timeoutRequests = server.requests.filter(
        (req) => req.url === 'https://pbs.avads.live/rtb/timeout'
      );

      expect(timeoutRequests).to.have.length(1);
      expect(timeoutRequests[0].method).to.equal('POST');

      const body = JSON.parse(timeoutRequests[0].fetch.requestBody);
      expect(body).to.deep.equal([{
        bidId: 'bid-001',
        auctionId: 'auction-001',
        adUnitCode: 'advergic-test-div',
        timeout: 2000,
        params: { accountId: 'account-123' }
      }]);
    });

    it('should send bidder error analytics to the existing endpoint', () => {
      spec.onBidderError({
        error: new Error('request failed'),
        bidderRequest: {
          auctionId: 'auction-001',
          bidderRequestId: 'bidder-request-001'
        }
      });

      const errorRequests = server.requests.filter(
        (req) => req.url === 'https://pbs.avads.live/rtb/error'
      );

      expect(errorRequests).to.have.length(1);
      expect(errorRequests[0].method).to.equal('POST');

      const body = JSON.parse(errorRequests[0].fetch.requestBody);
      expect(body).to.deep.include({
        error: 'request failed',
        auctionId: 'auction-001',
        bidderRequestId: 'bidder-request-001'
      });
    });

    it('should disable timeout and error analytics together', () => {
      config.setConfig({
        advergic: {
          disableEventTracking: true
        }
      });

      spec.onTimeout([{ bidId: 'bid-001' }]);
      spec.onBidderError({
        error: new Error('failed'),
        bidderRequest: { auctionId: 'auction-001' }
      });

      expect(server.requests.filter(
        (req) => [
          'https://pbs.avads.live/rtb/timeout',
          'https://pbs.avads.live/rtb/error'
        ].includes(req.url)
      )).to.have.length(0);
    });
  });
});
