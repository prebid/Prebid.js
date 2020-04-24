import { expect } from 'chai';

import { spec } from 'modules/pubgeniusBidAdapter';
import { deepClone } from 'src/utils';
import { config } from 'src/config';

const {
  code,
  supportedMediaTypes,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
} = spec;

describe('pubGENIUS adapter', () => {
  describe('code', () => {
    it('should be pubgenius', () => {
      expect(code).to.equal('pubgenius');
    });
  });

  describe('supportedMediaTypes', () => {
    it('should contain only banner', () => {
      expect(supportedMediaTypes).to.deep.equal(['banner']);
    });
  });

  describe('isBidRequestValid', () => {
    const validBid = Object.freeze({
      mediaTypes: {
        banner: {
          sizes: [[300, 600], [300, 250]],
        },
      },
      params: {
        adUnitId: 1112,
      },
    });

    it('should return true with numeric adUnitId ', () => {
      expect(isBidRequestValid(validBid)).to.be.true;
    });

    it('should return true with string adUnitId ', () => {
      const bid = deepClone(validBid);
      bid.params.adUnitId = '1112';

      expect(isBidRequestValid(bid)).to.be.true;
    });

    it('should return false without adUnitId', () => {
      const bid = deepClone(validBid);
      delete bid.params.adUnitId;

      expect(isBidRequestValid(bid)).to.be.false;
    });

    it('should return false with adUnitId of invalid type', () => {
      const bid = deepClone(validBid);
      bid.params.adUnitId = [1112];

      expect(isBidRequestValid(bid)).to.be.false;
    });

    it('should return false with empty sizes', () => {
      const bid = deepClone(validBid);
      bid.mediaTypes.banner.sizes = [];

      expect(isBidRequestValid(bid)).to.be.false;
    });

    it('should return false with invalid size', () => {
      const bid = deepClone(validBid);
      bid.mediaTypes.banner.sizes = [[300, 600, 250]];

      expect(isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', () => {
    const bidRequest = {
      adUnitCode: 'test-div',
      auctionId: 'fake-auction-id',
      bidId: 'fakebidid',
      bidder: 'pubgenius',
      bidderRequestId: 'fakebidderrequestid',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0,
      mediaTypes: {
        banner: {
          sizes: [[300, 600], [300, 250]],
        },
      },
      params: {
        adUnitId: 1112,
      },
      transactionId: 'fake-transaction-id',
    };
    const bidderRequest = {
      auctionId: 'fake-auction-id',
      bidderCode: 'pubgenius',
      bidderRequestId: 'fakebidderrequestid',
      refererInfo: {},
    };
    const expectedRequest = {
      method: 'POST',
      url: 'https://blackpearl-test.api.pubgenius.io/api/v1/auction',
      options: { contentType: 'application/json' },
      data: {
        id: 'fake-auction-id',
        imp: [
          {
            id: 'fakebidid',
            banner: {
              format: [{ w: 300, h: 600 }, { w: 300, h: 250 }],
              topframe: 0,
            },
            tagid: '1112',
          },
        ],
        tmax: 1200,
        ext: {
          pbadapter: {
            version: '1.0.0',
          },
        },
      },
    };
    const origBidderTimeout = config.getConfig('bidderTimeout');
    const origPageUrl = config.getConfig('pageUrl');
    const origCoppa = config.getConfig('coppa');

    after(() => {
      config.setConfig({
        bidderTimeout: origBidderTimeout,
        pageUrl: origPageUrl,
        coppa: origCoppa,
      });
    });

    beforeEach(() => {
      config.setConfig({
        bidderTimeout: 1200,
        pageUrl: undefined,
        coppa: undefined,
      });
    });

    it('should build basic requests correctly', () => {
      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should take bid floor in bidder params', () => {
      const bidRequestWithBidFloor = deepClone(bidRequest);
      bidRequestWithBidFloor.params.bidFloor = 0.5;
      const expectedWithBidFloor = deepClone(expectedRequest);
      expectedWithBidFloor.data.imp[0].bidfloor = 0.5;

      expect(buildRequests([bidRequestWithBidFloor], bidderRequest)).to.deep.equal(expectedWithBidFloor);
    });

    it('should take position in bidder params', () => {
      const bidRequestWithPosition = deepClone(bidRequest);
      bidRequestWithPosition.params.position = 3;
      const expectedWithPosition = deepClone(expectedRequest);
      expectedWithPosition.data.imp[0].banner.pos = 3;

      expect(buildRequests([bidRequestWithPosition], bidderRequest)).to.deep.equal(expectedWithPosition);
    });

    it('should take pageUrl in config over referer in refererInfo', () => {
      config.setConfig({ pageUrl: 'http://pageurl.org' });
      const bidderRequestWithReferer = deepClone(bidderRequest);
      bidderRequestWithReferer.refererInfo.referer = 'http://referer.org';
      const expectedWithSitePage = deepClone(expectedRequest);
      expectedWithSitePage.data.site = { page: encodeURIComponent('http://pageurl.org') };

      expect(buildRequests([bidRequest], bidderRequestWithReferer)).to.deep.equal(expectedWithSitePage);
    });

    it('should take gdprConsent when GDPR does not apply', () => {
      const bidderRequestWithGdpr = deepClone(bidderRequest);
      bidderRequestWithGdpr.gdprConsent = {
        gdprApplies: false,
        consentString: 'fakeconsent',
      };
      const expectedWithGdpr = deepClone(expectedRequest);
      expectedWithGdpr.data.regs = {
        ext: { gdpr: 0 },
      };

      expect(buildRequests([bidRequest], bidderRequestWithGdpr)).to.deep.equal(expectedWithGdpr);
    });

    it('should take gdprConsent when GDPR applies', () => {
      const bidderRequestWithGdpr = deepClone(bidderRequest);
      bidderRequestWithGdpr.gdprConsent = {
        gdprApplies: true,
        consentString: 'fakeconsent',
      };
      const expectedWithGdpr = deepClone(expectedRequest);
      expectedWithGdpr.data.regs = {
        ext: { gdpr: 1 },
      };
      expectedWithGdpr.data.user = {
        ext: { consent: 'fakeconsent' },
      };

      expect(buildRequests([bidRequest], bidderRequestWithGdpr)).to.deep.equal(expectedWithGdpr);
    });

    it('should take uspConsent', () => {
      const bidderRequestWithUsp = deepClone(bidderRequest);
      bidderRequestWithUsp.uspConsent = '1---';
      const expectedWithUsp = deepClone(expectedRequest);
      expectedWithUsp.data.regs = {
        ext: { us_privacy: '1---' },
      };

      expect(buildRequests([bidRequest], bidderRequestWithUsp)).to.deep.equal(expectedWithUsp);
    });

    it('should take schain', () => {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'indirectseller.com',
            sid: '0001',
            hp: 1
          }
        ]
      };
      const bidderRequestWithSchain = deepClone(bidderRequest);
      bidderRequestWithSchain.schain = deepClone(schain);
      const expectedWithSchain = deepClone(expectedRequest);
      expectedWithSchain.data.source = {
        ext: { schain: deepClone(schain) },
      };

      expect(buildRequests([bidRequest], bidderRequestWithSchain)).to.deep.equal(expectedWithSchain);
    });

    it('should take coppa', () => {
      config.setConfig({ coppa: true });
      const expectedWithCoppa = deepClone(expectedRequest);
      expectedWithCoppa.data.regs = { coppa: 1 };

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedWithCoppa);
    });
  });

  describe('interpretResponse', () => {
    const serverResponse = {
      body: {
        seatbid: [
          {
            seat: 'pubgenius',
            bid: [
              {
                impid: 'fakebidid',
                price: 0.3,
                w: 300,
                h: 250,
                adm: 'fake_creative',
                exp: 60,
                crid: 'fakecreativeid',
              },
            ],
          },
        ],
      },
    };
    const expectedBidResponse = {
      requestId: 'fakebidid',
      cpm: 0.3,
      currency: 'USD',
      width: 300,
      height: 250,
      ad: 'fake_creative',
      ttl: 60,
      creativeId: 'fakecreativeid',
      netRevenue: true,
    };

    it('should interpret response correctly', () => {
      expect(interpretResponse(serverResponse)).to.deep.equal([expectedBidResponse]);
    });

    it('should interpret response with adomain', () => {
      const serverResponseWithAdomain = deepClone(serverResponse);
      serverResponseWithAdomain.body.seatbid[0].bid[0].adomain = ['fakeaddomain'];
      const expectedWithAdDomains = deepClone(expectedBidResponse);
      expectedWithAdDomains.meta = {
        advertiserDomains: ['fakeaddomain'],
      };

      expect(interpretResponse(serverResponseWithAdomain)).to.deep.equal([expectedWithAdDomains]);
    });

    it('should interpret no bids', () => {
      expect(interpretResponse({ body: {} })).to.deep.equal([]);
    });
  });
});
