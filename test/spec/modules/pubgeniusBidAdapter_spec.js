import { expect } from 'chai';

import { spec } from 'modules/pubgeniusBidAdapter.js';
import { deepClone, parseQueryStringParameters } from 'src/utils.js';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';

const {
  code,
  supportedMediaTypes,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onTimeout,
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
    let bid = null;

    beforeEach(() => {
      bid = {
        mediaTypes: {
          banner: {
            sizes: [[300, 600], [300, 250]],
          },
        },
        params: {
          adUnitId: 1112,
        },
      };
    });

    it('should return true with numeric adUnitId ', () => {
      expect(isBidRequestValid(bid)).to.be.true;
    });

    it('should return true with string adUnitId ', () => {
      bid.params.adUnitId = '1112';

      expect(isBidRequestValid(bid)).to.be.true;
    });

    it('should return false without adUnitId', () => {
      delete bid.params.adUnitId;

      expect(isBidRequestValid(bid)).to.be.false;
    });

    it('should return false with adUnitId of invalid type', () => {
      bid.params.adUnitId = [1112];

      expect(isBidRequestValid(bid)).to.be.false;
    });

    it('should return false with empty sizes', () => {
      bid.mediaTypes.banner.sizes = [];

      expect(isBidRequestValid(bid)).to.be.false;
    });

    it('should return false with invalid size', () => {
      bid.mediaTypes.banner.sizes = [[300, 600, 250]];

      expect(isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', () => {
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

    let bidRequest = null;
    let bidderRequest = null;
    let expectedRequest = null;

    beforeEach(() => {
      bidRequest = {
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

      bidderRequest = {
        auctionId: 'fake-auction-id',
        bidderCode: 'pubgenius',
        bidderRequestId: 'fakebidderrequestid',
        refererInfo: {},
      };

      expectedRequest = {
        method: 'POST',
        url: 'https://ortb.adpearl.io/prebid/auction',
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

      config.setConfig({
        bidderTimeout: 1200,
        pageUrl: undefined,
        coppa: undefined,
      });
    });

    it('should build basic requests correctly', () => {
      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should build requests with multiple ad units', () => {
      const bidRequest1 = deepClone(bidRequest);
      bidRequest1.adUnitCode = 'test-div-1';
      bidRequest1.bidId = 'fakebidid1';
      bidRequest1.mediaTypes.banner.sizes = [[728, 90]];
      bidRequest1.params.adUnitId = '1111';

      expectedRequest.data.imp.push({
        id: 'fakebidid1',
        banner: {
          format: [{ w: 728, h: 90 }],
          topframe: 0,
        },
        tagid: '1111',
      });

      expect(buildRequests([bidRequest, bidRequest1], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should take bid floor in bidder params', () => {
      bidRequest.params.bidFloor = 0.5;
      expectedRequest.data.imp[0].bidfloor = 0.5;

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should take position in bidder params', () => {
      bidRequest.params.position = 3;
      expectedRequest.data.imp[0].banner.pos = 3;

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should take pageUrl in config over referer in refererInfo', () => {
      config.setConfig({ pageUrl: 'http://pageurl.org' });
      bidderRequest.refererInfo.referer = 'http://referer.org';
      expectedRequest.data.site = { page: 'http://pageurl.org' };

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should use canonical URL over referer in refererInfo', () => {
      bidderRequest.refererInfo.canonicalUrl = 'http://pageurl.org';
      bidderRequest.refererInfo.referer = 'http://referer.org';
      expectedRequest.data.site = { page: 'http://pageurl.org' };

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should take gdprConsent when GDPR does not apply', () => {
      bidderRequest.gdprConsent = {
        gdprApplies: false,
        consentString: 'fakeconsent',
      };
      expectedRequest.data.regs = {
        ext: { gdpr: 0 },
      };

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should take gdprConsent when GDPR applies', () => {
      bidderRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'fakeconsent',
      };
      expectedRequest.data.regs = {
        ext: { gdpr: 1 },
      };
      expectedRequest.data.user = {
        ext: { consent: 'fakeconsent' },
      };

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should take uspConsent', () => {
      bidderRequest.uspConsent = '1---';
      expectedRequest.data.regs = {
        ext: { us_privacy: '1---' },
      };

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
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
      bidRequest.schain = deepClone(schain);
      expectedRequest.data.source = {
        ext: { schain: deepClone(schain) },
      };

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should take coppa', () => {
      config.setConfig({ coppa: true });
      expectedRequest.data.regs = { coppa: 1 };

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should take user IDs', () => {
      const eid = {
        source: 'adserver.org',
        uids: [
          {
            id: 'fake-user-id',
            atype: 1,
            ext: { rtiPartner: 'TDID' },
          },
        ],
      };
      bidRequest.userIdAsEids = [deepClone(eid)];
      expectedRequest.data.user = {
        ext: {
          eids: [deepClone(eid)],
        },
      };

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should not take unsupported user IDs', () => {
      bidRequest.userIdAsEids = [
        {
          source: 'pubcid.org',
          uids: [
            {
              id: 'fake-user-id',
              atype: 1,
            },
          ],
        },
      ];

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });

    it('should not take empty user IDs', () => {
      bidRequest.userIdAsEids = [];

      expect(buildRequests([bidRequest], bidderRequest)).to.deep.equal(expectedRequest);
    });
  });

  describe('interpretResponse', () => {
    let serverResponse = null;
    let expectedBidResponse = null;

    beforeEach(() => {
      serverResponse = {
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
      expectedBidResponse = {
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
    });

    it('should interpret response correctly', () => {
      expect(interpretResponse(serverResponse)).to.deep.equal([expectedBidResponse]);
    });

    it('should interpret response with adomain', () => {
      serverResponse.body.seatbid[0].bid[0].adomain = ['fakeaddomain'];
      expectedBidResponse.meta = {
        advertiserDomains: ['fakeaddomain'],
      };

      expect(interpretResponse(serverResponse)).to.deep.equal([expectedBidResponse]);
    });

    it('should interpret no bids', () => {
      expect(interpretResponse({ body: {} })).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', () => {
    let syncOptions = null;
    let expectedSync = null;

    beforeEach(() => {
      syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true,
      };
      expectedSync = {
        type: 'iframe',
        url: 'https://ortb.adpearl.io/usersync/pixels.html?',
      };
    });

    it('should return iframe pixels', () => {
      expect(getUserSyncs(syncOptions)).to.deep.equal([expectedSync]);
    });

    it('should return empty when iframe is not enabled', () => {
      syncOptions.iframeEnabled = false;

      expect(getUserSyncs(syncOptions)).to.deep.equal([]);
    });

    it('should return sync when GDPR applies', () => {
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'fake-gdpr-consent',
      };
      expectedSync.url = expectedSync.url + parseQueryStringParameters({
        gdpr: 1,
        consent: 'fake-gdpr-consent',
      });

      expect(getUserSyncs(syncOptions, [], gdprConsent)).to.deep.equal([expectedSync]);
    });

    it('should return sync when GDPR does not apply', () => {
      const gdprConsent = {
        gdprApplies: false,
      };
      expectedSync.url = expectedSync.url + parseQueryStringParameters({ gdpr: 0 });

      expect(getUserSyncs(syncOptions, [], gdprConsent)).to.deep.equal([expectedSync]);
    });

    it('should return sync with US privacy', () => {
      expectedSync.url = expectedSync.url + parseQueryStringParameters({ us_privacy: '1---' });

      expect(getUserSyncs(syncOptions, [], undefined, '1---')).to.deep.equal([expectedSync]);
    });
  });

  describe('onTimeout', () => {
    it('should send timeout data', () => {
      const timeoutData = {
        bidder: 'pubgenius',
        bidId: 'fakebidid',
        params: {
          adUnitId: 1234,
        },
        adUnitCode: 'fake-ad-unit-code',
        timeout: 3000,
        auctionId: 'fake-auction-id',
      };
      onTimeout(timeoutData);

      expect(server.requests[0].method).to.equal('POST');
      expect(server.requests[0].url).to.equal('https://ortb.adpearl.io/prebid/events?type=timeout');
      expect(JSON.parse(server.requests[0].requestBody)).to.deep.equal(timeoutData);
    });
  });
});
