import { expect } from 'chai';
import { spec } from '../../../modules/relayBidAdapter.js';
import { BANNER, VIDEO, NATIVE } from '../../../src/mediaTypes.js';
import { getUniqueIdentifierStr } from '../../../src/utils.js';

const bidder = 'relay'
const endpoint = 'https://e.relay.bid/p/openrtb2';

describe('RelayBidAdapter', function () {
  const bids = [
    {
      bidId: getUniqueIdentifierStr(),
      bidder,
      mediaTypes: { [BANNER]: { sizes: [[300, 250]] } },
      params: {
        accountId: 15000,
      },
      ortb2Imp: {
        ext: {
          relay: {
            bidders: {
              bidderA: {
                theId: 'abc123'
              },
              bidderB: {
                theId: 'xyz789'
              }
            }
          }
        }
      }
    },
    {
      bidId: getUniqueIdentifierStr(),
      bidder,
      mediaTypes: { [BANNER]: { sizes: [[300, 250]] } },
      params: {
        accountId: 30000,
      },
      ortb2Imp: {
        ext: {
          relay: {
            bidders: {
              bidderA: {
                theId: 'def456'
              },
              bidderB: {
                theId: 'uvw101112'
              }
            }
          }
        }
      }
    }
  ];

  const invalidBid = {
    bidId: getUniqueIdentifierStr(),
    bidder: bidder,
    mediaTypes: {
      [BANNER]: {
        sizes: [[300, 250]]
      }
    },
    params: {}
  }

  const bidderRequest = {};

  describe('isBidRequestValid', function () {
    it('Valid bids have a params.accountId.', function () {
      expect(spec.isBidRequestValid(bids[0])).to.be.true;
    });
    it('Invalid bids do not have a params.accountId.', function () {
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    const requests = spec.buildRequests(bids, bidderRequest);
    const firstRequest = requests[0];
    const secondRequest = requests[1];

    it('Creates two requests', function () {
      expect(firstRequest).to.exist;
      expect(firstRequest.data).to.exist;
      expect(firstRequest.method).to.exist;
      expect(firstRequest.method).to.equal('POST');
      expect(firstRequest.url).to.exist;
      expect(firstRequest.url).to.equal(`${endpoint}?a=15000&pb=1&pbv=v8.1.0`);

      expect(secondRequest).to.exist;
      expect(secondRequest.data).to.exist;
      expect(secondRequest.method).to.exist;
      expect(secondRequest.method).to.equal('POST');
      expect(secondRequest.url).to.exist;
      expect(secondRequest.url).to.equal(`${endpoint}?a=30000&pb=1&pbv=v8.1.0`);
    });

    it('Does not generate requests when there are no bids', function () {
      const request = spec.buildRequests([], bidderRequest);
      expect(request).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserSyncs', function () {
    it('Uses Prebid consent values if incoming sync URLs lack consent.', function () {
      const syncOpts = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      const test_gdpr_applies = true;
      const test_gdpr_consent_str = 'TEST_GDPR_CONSENT_STRING';
      const responses = [{
        body: {
          ext: {
            user_syncs: [
              { type: 'image', url: 'https://image-example.com' },
              { type: 'iframe', url: 'https://iframe-example.com' }
            ]
          }
        }
      }];

      const sync_urls = spec.getUserSyncs(syncOpts, responses, { gdprApplies: test_gdpr_applies, consentString: test_gdpr_consent_str });
      expect(sync_urls).to.be.an('array');
      expect(sync_urls[0].url).to.equal('https://image-example.com/?gdpr=1&gdpr_consent=TEST_GDPR_CONSENT_STRING');
      expect(sync_urls[1].url).to.equal('https://iframe-example.com/?gdpr=1&gdpr_consent=TEST_GDPR_CONSENT_STRING');
    });
  });
});
