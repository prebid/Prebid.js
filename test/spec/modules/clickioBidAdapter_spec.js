import { expect } from 'chai';
import { spec } from 'modules/clickioBidAdapter.js';

describe('clickioBidAdapter', function () {
  const DEFAULT_BANNER_BID_REQUESTS = [
    {
      adUnitCode: 'div-banner-id',
      bidId: 'bid-123',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [728, 90],
          ],
        },
      },
      bidder: 'clickio',
      params: {},
      requestId: 'request-123',
    }
  ];

  const DEFAULT_BANNER_BIDDER_REQUEST = {
    bidderCode: 'clickio',
    bids: DEFAULT_BANNER_BID_REQUESTS,
  };

  const SAMPLE_RESPONSE = {
    body: {
      id: '12h712u7-k22g-8124-ab7a-h268s22dy271',
      seatbid: [
        {
          bid: [
            {
              id: '1bh7jku7-ko2g-8654-ab72-h268abcde271',
              impid: 'bid-123',
              price: 1.5,
              adm: '<div>Test Ad</div>',
              adomain: ['example.com'],
              cid: '1242512',
              crid: '535231',
              w: 300,
              h: 250,
              mtype: 1,
            },
          ],
          seat: '4212',
        },
      ],
      cur: 'USD',
    },
  };

  describe('isBidRequestValid', () => {
    it('should return true for any valid bid request', () => {
      const bidRequest = {
        params: {},
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });
  });

  describe('buildRequests', () => {
    it('should build a valid request object', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      );

      expect(request).to.be.an('array');
      expect(request).to.have.lengthOf(1);
      expect(request[0].method).to.equal('POST');
      expect(request[0].url).to.equal('https://o.clickiocdn.com/bids');
      expect(request[0].data).to.be.an('object');
    });

    it('should include imp with ext.params from bidRequest', () => {
      const bidRequestsWithParams = [
        {
          ...DEFAULT_BANNER_BID_REQUESTS[0],
          params: {
            said: '123',
            someParam: 'value'
          }
        }
      ];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequestsWithParams };
      const request = spec.buildRequests(bidRequestsWithParams, bidderRequest)[0];

      expect(request.data.imp).to.be.an('array');
      expect(request.data.imp[0].ext.params).to.deep.equal({
        said: '123',
        someParam: 'value'
      });
    });
  });

  describe('interpretResponse', () => {
    it('should return valid bids from ORTB response', () => {
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      const bids = spec.interpretResponse(SAMPLE_RESPONSE, request);

      expect(bids).to.be.an('array');
      expect(bids).to.have.lengthOf(1);

      const bid = bids[0];
      expect(bid.requestId).to.exist;
      expect(bid.cpm).to.equal(1.5);
      expect(bid.currency).to.equal('USD');
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.ad).to.contain('<div>Test Ad</div>');
      expect(bid.creativeId).to.equal('535231');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(30);
    });

    it('should return empty array if no bids in response', () => {
      const emptyResponse = {
        body: {
          id: '12h712u7-k22g-8124-ab7a-h268s22dy271',
          seatbid: [],
          cur: 'USD',
        },
      };
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      const bids = spec.interpretResponse(emptyResponse, request);

      expect(bids).to.be.an('array');
      expect(bids).to.be.empty;
    });
  });

  describe('getUserSyncs', () => {
    it('should return iframe user sync', () => {
      const syncOptions = { iframeEnabled: true };
      const syncs = spec.getUserSyncs(syncOptions);

      expect(syncs).to.be.an('array');
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include('https://o.clickiocdn.com/cookie_sync_html');
    });

    it('should include GDPR parameters when gdprConsent is provided', () => {
      const syncOptions = { iframeEnabled: true };
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'test-consent-string'
      };
      const syncs = spec.getUserSyncs(syncOptions, null, gdprConsent);

      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=test-consent-string');
    });

    it('should include USP consent when uspConsent is provided', () => {
      const syncOptions = { iframeEnabled: true };
      const uspConsent = '1YNN';
      const syncs = spec.getUserSyncs(syncOptions, null, null, uspConsent);

      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });

    it('should include GPP parameters when gppConsent is provided', () => {
      const syncOptions = { iframeEnabled: true };
      const gppConsent = {
        gppString: 'DBACNYA~CPXxRfAPXxR',
        applicableSections: [7, 8]
      };
      const syncs = spec.getUserSyncs(syncOptions, null, null, null, gppConsent);

      expect(syncs[0].url).to.include('gpp=DBACNYA~CPXxRfAPXxR');
      expect(syncs[0].url).to.include('gpp_sid=7');
      expect(syncs[0].url).to.include('gpp_sid=8');
    });
  });
});
