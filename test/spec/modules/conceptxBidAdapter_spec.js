import { expect } from 'chai';
import { spec } from 'modules/conceptxBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('conceptxBidAdapter', function () {
  const ENDPOINT_URL = 'https://cxba-s2s.cncpt.dk/openrtb2/auction';
  const ENDPOINT_URL_CONSENT =
    ENDPOINT_URL + '?gdpr_applies=1&gdpr_consent=ihaveconsented';
  const adapter = newBidder(spec);

  const bidderRequests = [
    {
      bidId: '123',
      bidder: 'conceptx',
      adUnitCode: 'div-1',
      auctionId: 'auc-1',
      params: {
        site: 'cxba_example.com',
        adunit: 'some-id-3',
      },
      ortb2: {
        site: {
          page: 'https://example.com/article/1',
          domain: 'example.com',
        },
      },
      mediaTypes: {
        banner: {
          sizes: [[930, 180]],
        },
      },
    },
  ];

  const serverResponse = {
    body: {
      id: 'resp-1',
      cur: 'DKK',
      seatbid: [
        {
          seat: 'conceptx',
          bid: [
            {
              id: 'bid-1',
              impid: '123',
              price: 46,
              w: 930,
              h: 180,
              crid: 'FAKE-ID',
              adm: '<h1>DUMMY</h1>',
            },
          ],
        },
      ],
    },
  };

  const requestPayload = {
    data: JSON.stringify({
      id: 'auc-1',
      site: { id: 'cxba_example.com', domain: 'example.com', page: 'https://example.com/article/1' },
      imp: [
        {
          id: '123',
          ext: {
            prebid: {
              storedrequest: { id: 'some-id-3' },
            },
          },
        },
      ],
      ext: {
        prebid: {
          storedrequest: { id: 'cx_global' },
        },
      },
    }),
  };

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when bidId and params.adunit are present', function () {
      expect(spec.isBidRequestValid(bidderRequests[0])).to.equal(true);
    });

    it('should return false when params.adunit is missing', function () {
      expect(
        spec.isBidRequestValid({
          bidId: '123',
          bidder: 'conceptx',
          params: { site: 'example' },
        })
      ).to.equal(false);
    });

    it('should return false when bidId is missing', function () {
      expect(
        spec.isBidRequestValid({
          bidder: 'conceptx',
          params: { site: 'example', adunit: 'id-1' },
        })
      ).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should build OpenRTB request with stored requests', function () {
      const requests = spec.buildRequests(bidderRequests, {});
      expect(requests).to.have.lengthOf(1);
      expect(requests[0]).to.have.property('method', 'POST');
      expect(requests[0]).to.have.property('url', ENDPOINT_URL);
      expect(requests[0]).to.have.property('data');

      const payload = JSON.parse(requests[0].data);
      expect(payload).to.have.property('site');
      expect(payload.site).to.have.property('id', 'cxba_example.com');
      expect(payload.site).to.have.property('domain', 'example.com');
      expect(payload.site).to.have.property('page', 'https://example.com/article/1');
      expect(payload).to.have.property('imp');
      expect(payload.imp).to.have.lengthOf(1);
      expect(payload.imp[0].ext.prebid.storedrequest).to.deep.equal({
        id: 'some-id-3',
      });
      expect(payload.ext.prebid.storedrequest).to.deep.equal({
        id: 'cx_global',
      });
      expect(payload.imp[0].banner.format).to.deep.equal([{ w: 930, h: 180 }]);
    });

    it('should include withCredentials in options', function () {
      const requests = spec.buildRequests(bidderRequests, {});
      expect(requests[0].options).to.deep.include({ withCredentials: true });
    });

    it('should use params.site only for site.id, not for domain or page', function () {
      const bids = [
        {
          bidId: '456',
          bidder: 'conceptx',
          adUnitCode: 'div-2',
          auctionId: 'auc-2',
          params: {
            site: 'cxba_soundvenue.com',
            adunit: '5a18nh',
          },
          ortb2: {
            site: {
              page: 'https://soundvenue.com/musik/2025/article',
              domain: 'soundvenue.com',
            },
          },
          mediaTypes: { banner: { sizes: [[300, 250]] } },
        },
      ];
      const requests = spec.buildRequests(bids, {});
      const payload = JSON.parse(requests[0].data);

      expect(payload.site.id).to.equal('cxba_soundvenue.com');
      expect(payload.site.domain).to.equal('soundvenue.com');
      expect(payload.site.page).to.equal('https://soundvenue.com/musik/2025/article');
    });

    it('should fall back to refererInfo when ortb2.site is absent', function () {
      const bids = [
        {
          bidId: '789',
          bidder: 'conceptx',
          adUnitCode: 'div-3',
          auctionId: 'auc-3',
          params: {
            site: 'cxba_mysite.dk',
            adunit: 'abc123',
          },
          ortb2: {},
          mediaTypes: { banner: { sizes: [[728, 90]] } },
        },
      ];
      const bidderReq = {
        refererInfo: {
          page: 'https://mysite.dk/page',
          domain: 'mysite.dk',
        },
      };
      const requests = spec.buildRequests(bids, bidderReq);
      const payload = JSON.parse(requests[0].data);

      expect(payload.site.id).to.equal('cxba_mysite.dk');
      expect(payload.site.domain).to.equal('mysite.dk');
      expect(payload.site.page).to.equal('https://mysite.dk/page');
    });

    it('should use adUnitCode as site.id when params.site is absent', function () {
      const bids = [
        {
          bidId: '101',
          bidder: 'conceptx',
          adUnitCode: 'div-fallback',
          auctionId: 'auc-4',
          params: {
            adunit: 'xyz789',
          },
          ortb2: {
            site: {
              page: 'https://fallback.com/page',
              domain: 'fallback.com',
            },
          },
          mediaTypes: { banner: { sizes: [[300, 250]] } },
        },
      ];
      const requests = spec.buildRequests(bids, {});
      const payload = JSON.parse(requests[0].data);

      expect(payload.site.id).to.equal('fallback.com');
      expect(payload.site.domain).to.equal('fallback.com');
      expect(payload.site.page).to.equal('https://fallback.com/page');
    });
  });

  describe('user privacy', function () {
    it('should NOT add GDPR params to URL when gdprApplies is undefined', function () {
      const requests = spec.buildRequests(bidderRequests, {
        gdprConsent: { gdprApplies: undefined, consentString: 'iDoNotConsent' },
      });
      expect(requests[0].url).to.equal(ENDPOINT_URL);
    });

    it('should add gdpr_applies and gdpr_consent to URL when GDPR applies', function () {
      const requests = spec.buildRequests(bidderRequests, {
        gdprConsent: { gdprApplies: true, consentString: 'ihaveconsented' },
      });
      expect(requests[0].url).to.include('gdpr_applies=1');
      expect(requests[0].url).to.include('gdpr_consent=ihaveconsented');
    });
  });

  describe('interpretResponse', function () {
    it('should return valid bids from PBS seatbid format', function () {
      const interpreted = spec.interpretResponse(serverResponse, requestPayload);
      expect(interpreted).to.have.lengthOf(1);
      expect(interpreted[0].requestId).to.equal('123');
      expect(interpreted[0].cpm).to.equal(46);
      expect(interpreted[0].width).to.equal(930);
      expect(interpreted[0].height).to.equal(180);
      expect(interpreted[0].creativeId).to.equal('FAKE-ID');
      expect(interpreted[0].currency).to.equal('DKK');
      expect(interpreted[0].netRevenue).to.equal(true);
      expect(interpreted[0].ad).to.equal('<h1>DUMMY</h1>');
      expect(interpreted[0].ttl).to.equal(300);
    });

    it('should return empty array when no seatbid', function () {
      const emptyResponse = { body: { seatbid: [] } };
      expect(spec.interpretResponse(emptyResponse, {})).to.deep.equal([]);
    });

    it('should return empty array when seatbid is missing', function () {
      const noSeatbid = { body: {} };
      expect(spec.interpretResponse(noSeatbid, {})).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('should return empty array (sync handled by runPbsCookieSync)', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [], {}, '', {});
      expect(syncs).to.deep.equal([]);
    });
  });
});
