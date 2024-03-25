import { expect } from 'chai';
import { spec } from 'modules/BTBidAdapter.js';
import { BANNER } from '../../../src/mediaTypes.js';
// load modules that register ORTB processors
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagement.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';
import 'modules/enrichmentFpdModule.js';
import 'modules/gdprEnforcement.js';
import 'modules/gppControl_usnat.js';
import 'modules/schain.js';

describe('BT Bid Adapter', () => {
  const ENDPOINT_URL = 'https://pbs.btloader.com/openrtb2/auction';
  const validBidRequests = [
    {
      bidId: '2e9f38ea93bb9e',
      bidder: 'blockthrough',
      adUnitCode: 'adunit-code',
      mediaTypes: { [BANNER]: { sizes: [[300, 250]] } },
      params: {
        bidderA: {
          pubId: '11111',
        },
      },
      bidderRequestId: 'test-bidder-request-id',
    },
  ];
  const bidderRequest = {
    bidderCode: 'blockthrough',
    bidderRequestId: 'test-bidder-request-id',
    bids: validBidRequests,
  };

  describe('isBidRequestValid', function () {
    it('should validate bid request with valid params', () => {
      const validBid = {
        params: {
          pubmatic: {
            publisherId: 55555,
          },
        },
        sizes: [[300, 250]],
        bidId: '123',
        adUnitCode: 'leaderboard',
      };

      const isValid = spec.isBidRequestValid(validBid);

      expect(isValid).to.be.true;
    });

    it('should not validate bid request with invalid params', () => {
      const invalidBid = {
        params: {},
        sizes: [[300, 250]],
        bidId: '123',
        adUnitCode: 'leaderboard',
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.be.false;
    });
  });

  describe('buildRequests', () => {
    it('should build post request when ortb2 fields are present', () => {
      const impExtParams = {
        bidderA: {
          pubId: '11111',
        },
      };

      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT_URL);
      expect(requests[0].data).to.exist;
      expect(requests[0].data.ext.prebid.channel).to.deep.equal({
        name: 'pbjs',
        version: '$prebid.version$',
      });
      expect(requests[0].data.imp[0].ext).to.deep.equal(impExtParams);
    });
  });

  describe('interpretResponse', () => {
    it('should return empty array if serverResponse is not defined', () => {
      const bidRequest = spec.buildRequests(validBidRequests, bidderRequest);
      const bids = spec.interpretResponse(undefined, bidRequest);

      expect(bids.length).to.equal(0);
    });

    it('should return bids array when serverResponse is defined and seatbid array is not empty', () => {
      const bidResponse = {
        body: {
          id: 'bid-response',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  impid: '2e9f38ea93bb9e',
                  crid: 'creative-id',
                  cur: 'USD',
                  price: 2,
                  w: 300,
                  h: 250,
                  mtype: 1,
                  adomain: ['test.com'],
                },
              ],
              seat: 'test-seat',
            },
          ],
        },
      };

      const expectedBids = [
        {
          btBidderCode: 'test-seat',
          cpm: 2,
          creativeId: 'creative-id',
          creative_id: 'creative-id',
          currency: 'USD',
          height: 250,
          mediaType: 'banner',
          meta: {
            advertiserDomains: ['test.com'],
          },
          netRevenue: true,
          requestId: '2e9f38ea93bb9e',
          ttl: 60,
          width: 300,
        },
      ];

      const request = spec.buildRequests(validBidRequests, bidderRequest)[0];
      const bids = spec.interpretResponse(bidResponse, request);

      expect(bids).to.deep.equal(expectedBids);
    });
  });

  describe('getUserSyncs', () => {
    const SYNC_URL = 'https://cdn.btloader.com/user_sync.html';

    it('should return an empty array if no sync options are provided', () => {
      const syncs = spec.getUserSyncs({}, [], null, null, null);

      expect(syncs).to.deep.equal([]);
    });

    it('should return an empty array if no server responses are provided', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        null,
        null,
        null
      );

      expect(syncs).to.deep.equal([]);
    });

    it('should pass consent parameters and bidder codes in sync URL if they are provided', () => {
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'GDPRConsentString123',
      };
      const gppConsent = {
        gppString: 'GPPString123',
        applicableSections: ['sectionA'],
      };
      const us_privacy = '1YNY';
      const expectedSyncUrl = new URL(SYNC_URL);
      expectedSyncUrl.searchParams.set('bidders', 'pubmatic,ix');
      expectedSyncUrl.searchParams.set('gdpr', 1);
      expectedSyncUrl.searchParams.set(
        'gdpr_consent',
        gdprConsent.consentString
      );
      expectedSyncUrl.searchParams.set('gpp', gppConsent.gppString);
      expectedSyncUrl.searchParams.set('gpp_sid', 'sectionA');
      expectedSyncUrl.searchParams.set('us_privacy', us_privacy);
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [
          { body: { ext: { responsetimemillis: { pubmatic: 123 } } } },
          { body: { ext: { responsetimemillis: { pubmatic: 123, ix: 123 } } } },
        ],
        gdprConsent,
        us_privacy,
        gppConsent
      );

      expect(syncs).to.deep.equal([
        { type: 'iframe', url: expectedSyncUrl.href },
      ]);
    });
  });
});
