import {expect} from 'chai';
import {spec} from 'modules/snigelBidAdapter.js';
import {config} from 'src/config.js';
import {isValid} from 'src/adapters/bidderFactory.js';
import {registerActivityControl} from 'src/activities/rules.js';
import {ACTIVITY_ACCESS_DEVICE} from 'src/activities/activities.js';

const BASE_BID_REQUEST = {
  adUnitCode: 'top_leaderboard',
  bidId: 'bid_test',
  sizes: [
    [970, 90],
    [728, 90],
  ],
  bidder: 'snigel',
  params: {},
  requestId: 'req_test',
  transactionId: 'trans_test',
};
const makeBidRequest = function (overrides) {
  return {...BASE_BID_REQUEST, ...overrides};
};

const BASE_BIDDER_REQUEST = {
  auctionId: 'test',
  bidderRequestId: 'test',
  refererInfo: {
    page: 'https://localhost',
    canonicalUrl: 'https://localhost',
  },
};
const makeBidderRequest = function (overrides) {
  return {...BASE_BIDDER_REQUEST, ...overrides};
};

const DUMMY_USP_CONSENT = '1YYN';
const DUMMY_GDPR_CONSENT_STRING =
  'BOSSotLOSSotLAPABAENBc-AAAAgR7_______9______9uz_Gv_v_f__33e8__9v_l_7_-___u_-33d4-_1vX99yfm1-7ftr3tp_86ues2_XqK_9oIiA';

describe('snigelBidAdapter', function () {
  describe('isBidRequestValid', function () {
    it('should return false if no placement provided', function () {
      expect(spec.isBidRequestValid(BASE_BID_REQUEST)).to.equal(false);
    });

    it('should return true if placement provided', function () {
      const bidRequest = makeBidRequest({params: {placement: 'top_leaderboard'}});
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    afterEach(function () {
      config.resetConfig();
    });

    it('should build a single request for every impression and its placement', function () {
      const bidderRequest = Object.assign({}, BASE_BIDDER_REQUEST);
      const bidRequests = [
        makeBidRequest({bidId: 'a', adUnitCode: 'au_a', params: {placement: 'top_leaderboard'}}),
        makeBidRequest({bidId: 'b', adUnitCode: 'au_b', params: {placement: 'bottom_leaderboard'}}),
      ];

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request).to.be.an('object');
      expect(request).to.have.property('url').and.to.equal('https://adserv.snigelweb.com/bp/v1/prebid');
      expect(request).to.have.property('method').and.to.equal('POST');

      expect(request).to.have.property('data');
      const data = JSON.parse(request.data);
      expect(data).to.have.property('id').and.to.equal('test');
      expect(data).to.have.property('cur').and.to.deep.equal(['USD']);
      expect(data).to.have.property('test').and.to.equal(false);
      expect(data).to.have.property('page').and.to.equal('https://localhost');
      expect(data).to.have.property('placements');
      expect(data.placements.length).to.equal(2);
      expect(data.placements[0].id).to.equal('au_a');
      expect(data.placements[0].name).to.equal('top_leaderboard');
      expect(data.placements[1].id).to.equal('au_b');
      expect(data.placements[1].name).to.equal('bottom_leaderboard');
    });

    it('should forward GDPR flag and GDPR consent string if enabled', function () {
      const bidderRequest = makeBidderRequest({
        gdprConsent: {
          gdprApplies: true,
          consentString: DUMMY_GDPR_CONSENT_STRING,
        },
      });

      const request = spec.buildRequests([], bidderRequest);
      expect(request).to.have.property('data');
      const data = JSON.parse(request.data);
      expect(data).to.have.property('gdprApplies').and.to.equal(true);
      expect(data).to.have.property('gdprConsentString').and.to.equal(DUMMY_GDPR_CONSENT_STRING);
    });

    it('should forward GDPR flag and no GDPR consent string if disabled', function () {
      const bidderRequest = makeBidderRequest({
        gdprConsent: {
          gdprApplies: false,
          consentString: DUMMY_GDPR_CONSENT_STRING,
        },
      });

      const request = spec.buildRequests([], bidderRequest);
      expect(request).to.have.property('data');
      const data = JSON.parse(request.data);
      expect(data).to.have.property('gdprApplies').and.to.equal(false);
      expect(data).to.not.have.property('gdprConsentString');
    });

    it('should forward USP consent if set', function () {
      const bidderRequest = makeBidderRequest({
        uspConsent: DUMMY_USP_CONSENT,
      });

      const request = spec.buildRequests([], bidderRequest);
      expect(request).to.have.property('data');
      const data = JSON.parse(request.data);
      expect(data).to.have.property('uspConsent').and.to.equal(DUMMY_USP_CONSENT);
    });

    it('should forward whether or not COPPA applies', function () {
      config.setConfig({
        'coppa': true,
      });

      const request = spec.buildRequests([], BASE_BIDDER_REQUEST);
      expect(request).to.have.property('data');
      const data = JSON.parse(request.data);
      expect(data).to.have.property('coppa').and.to.equal(true);
    });

    it('should forward refresh information', function () {
      const bidderRequest = Object.assign({}, BASE_BIDDER_REQUEST);
      const topLeaderboard = makeBidRequest({adUnitCode: 'top_leaderboard'});
      const bottomLeaderboard = makeBidRequest({adUnitCode: 'bottom_leaderboard'});
      const sidebar = makeBidRequest({adUnitCode: 'sidebar'});

      // first auction, no refresh
      let request = spec.buildRequests([topLeaderboard, bottomLeaderboard], bidderRequest);
      expect(request).to.have.property('data');
      let data = JSON.parse(request.data);
      expect(data).to.have.property('placements');
      expect(data.placements.length).to.equal(2);
      expect(data.placements[0].id).to.equal('top_leaderboard');
      expect(data.placements[0].refresh).to.be.undefined;
      expect(data.placements[1].id).to.equal('bottom_leaderboard');
      expect(data.placements[1].refresh).to.be.undefined;

      // second auction for top leaderboard, was refreshed
      request = spec.buildRequests([topLeaderboard, sidebar], bidderRequest);
      expect(request).to.have.property('data');
      data = JSON.parse(request.data);
      expect(data).to.have.property('placements');
      expect(data.placements.length).to.equal(2);
      expect(data.placements[0].id).to.equal('top_leaderboard');
      expect(data.placements[0].refresh).to.not.be.undefined;
      expect(data.placements[0].refresh.count).to.equal(1);
      expect(data.placements[0].refresh.time).to.be.greaterThanOrEqual(0);
      expect(data.placements[1].id).to.equal('sidebar');
      expect(data.placements[1].refresh).to.be.undefined;

      // third auction, all units refreshed at some point
      request = spec.buildRequests([topLeaderboard, bottomLeaderboard, sidebar], bidderRequest);
      expect(request).to.have.property('data');
      data = JSON.parse(request.data);
      expect(data).to.have.property('placements');
      expect(data.placements.length).to.equal(3);
      expect(data.placements[0].id).to.equal('top_leaderboard');
      expect(data.placements[0].refresh).to.not.be.undefined;
      expect(data.placements[0].refresh.count).to.equal(2);
      expect(data.placements[0].refresh.time).to.be.greaterThanOrEqual(0);
      expect(data.placements[1].id).to.equal('bottom_leaderboard');
      expect(data.placements[1].refresh).to.not.be.undefined;
      expect(data.placements[1].refresh.count).to.equal(1);
      expect(data.placements[1].refresh.time).to.be.greaterThanOrEqual(0);
      expect(data.placements[2].id).to.equal('sidebar');
      expect(data.placements[2].refresh).to.not.be.undefined;
      expect(data.placements[2].refresh.count).to.equal(1);
      expect(data.placements[2].refresh.time).to.be.greaterThanOrEqual(0);
    });
  });

  describe('interpretResponse', function () {
    it('should not return any bids if the request failed', function () {
      expect(spec.interpretResponse({}, {})).to.be.empty;
      expect(spec.interpretResponse({body: 'Some error message'}, {})).to.be.empty;
    });

    it('should not return any bids if the request did not return any bids either', function () {
      expect(spec.interpretResponse({body: {bids: []}})).to.be.empty;
    });

    it('should return valid bids with additional meta information', function () {
      const serverResponse = {
        body: {
          id: BASE_BIDDER_REQUEST.bidderRequestId,
          cur: 'USD',
          bids: [
            {
              id: BASE_BID_REQUEST.adUnitCode,
              price: 0.0575,
              ad: '<html><body><h1>Test Ad</h1></body></html>',
              width: 728,
              height: 90,
              crid: 'test',
              meta: {
                advertiserDomains: ['addomain.com'],
              },
            },
          ],
        },
      };

      const bids = spec.interpretResponse(serverResponse, {bidderRequest: {bids: [BASE_BID_REQUEST]}});
      expect(bids.length).to.equal(1);
      const bid = bids[0];
      expect(isValid(BASE_BID_REQUEST.adUnitCode, bid)).to.be.true;
      expect(bid).to.have.property('meta');
      expect(bid.meta).to.have.property('advertiserDomains');
      expect(bid.meta.advertiserDomains).to.be.an('array');
      expect(bid.meta.advertiserDomains.length).to.equal(1);
      expect(bid.meta.advertiserDomains[0]).to.equal('addomain.com');
    });
  });

  describe('getUserSyncs', function () {
    it('should not return any user syncs if sync url does not exist in response', function () {
      const response = {
        body: {
          id: BASE_BIDDER_REQUEST.bidderRequestId,
          cur: 'USD',
          bids: [],
        },
      };
      const syncOptions = {
        iframeEnabled: true,
      };
      const gdprConsent = {
        gdprApplies: false,
      };

      const syncs = spec.getUserSyncs(syncOptions, [response], gdprConsent);
      expect(syncs).to.be.undefined;
    });

    it('should not return any user syncs if publisher disabled iframe-based sync', function () {
      const response = {
        body: {
          id: BASE_BIDDER_REQUEST.bidderRequestId,
          cur: 'USD',
          syncUrl: 'https://somesyncurl',
          bids: [],
        },
      };
      const syncOptions = {
        iframeEnabled: false,
      };
      const gdprConsent = {
        gdprApplies: false,
      };

      const syncs = spec.getUserSyncs(syncOptions, [response], gdprConsent);
      expect(syncs).to.be.undefined;
    });

    it('should not return any user syncs if GDPR applies and the user did not consent to purpose one', function () {
      const response = {
        body: {
          id: BASE_BIDDER_REQUEST.bidderRequestId,
          cur: 'USD',
          syncUrl: 'https://somesyncurl',
          bids: [],
        },
      };
      const syncOptions = {
        iframeEnabled: true,
      };
      const gdprConsent = {
        gdprApplies: true,
        vendorData: {
          purpose: {
            consents: {1: false},
          },
        },
      };

      const syncs = spec.getUserSyncs(syncOptions, [response], gdprConsent);
      expect(syncs).to.be.undefined;
    });

    it("should return an iframe specific to the publisher's property if all conditions are met", function () {
      const response = {
        body: {
          id: BASE_BIDDER_REQUEST.bidderRequestId,
          cur: 'USD',
          syncUrl: 'https://somesyncurl',
          bids: [],
        },
      };
      const syncOptions = {
        iframeEnabled: true,
      };
      const gdprConsent = {
        gdprApplies: false,
      };

      const syncs = spec.getUserSyncs(syncOptions, [response], gdprConsent);
      expect(syncs).to.be.an('array').and.of.length(1);
      const sync = syncs[0];
      expect(sync).to.have.property('type');
      expect(sync.type).to.equal('iframe');
      expect(sync).to.have.property('url');
      expect(sync.url).to.equal('https://somesyncurl?gdpr=0&gdpr_consent=');
    });

    it('should pass GDPR applicability and consent string as query parameters', function () {
      const response = {
        body: {
          id: BASE_BIDDER_REQUEST.bidderRequestId,
          cur: 'USD',
          syncUrl: 'https://somesyncurl',
          bids: [],
        },
      };
      const syncOptions = {
        iframeEnabled: true,
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: DUMMY_GDPR_CONSENT_STRING,
        vendorData: {
          purpose: {
            consents: {1: true},
          },
        },
      };

      const syncs = spec.getUserSyncs(syncOptions, [response], gdprConsent);
      expect(syncs).to.be.an('array').and.of.length(1);
      const sync = syncs[0];
      expect(sync).to.have.property('type');
      expect(sync.type).to.equal('iframe');
      expect(sync).to.have.property('url');
      expect(sync.url).to.equal(`https://somesyncurl?gdpr=1&gdpr_consent=${DUMMY_GDPR_CONSENT_STRING}`);
    });

    it('should omit session ID if no device access', function() {
      const bidderRequest = makeBidderRequest();
      const unregisterRule = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'denyAccess', () => {
        return {allow: false, reason: 'no consent'};
      });

      try {
        const request = spec.buildRequests([], bidderRequest);
        expect(request).to.have.property('data');
        const data = JSON.parse(request.data);
        expect(data.sessionId).to.be.undefined;
      } finally {
        unregisterRule();
      }
    });

    it('should determine full GDPR consent correctly', function () {
      const baseBidderRequest = makeBidderRequest({
        gdprConsent: {
          gdprApplies: true,
          vendorData: {
            purpose: {
              consents: {1: true, 2: true, 3: true, 4: true, 5: true},
            },
            vendor: {
              consents: {[spec.gvlid]: true},
            }
          },
        }
      });
      let request = spec.buildRequests([], baseBidderRequest);
      expect(request).to.have.property('data');
      let data = JSON.parse(request.data);
      expect(data.gdprConsent).to.be.true;

      let bidderRequest = {...baseBidderRequest, ...{gdprConsent: {vendorData: {purpose: {consents: {1: false}}}}}};
      request = spec.buildRequests([], bidderRequest);
      expect(request).to.have.property('data');
      data = JSON.parse(request.data);
      expect(data.gdprConsent).to.be.false;

      bidderRequest = {...baseBidderRequest, ...{gdprConsent: {vendorData: {vendor: {consents: {[spec.gvlid]: false}}}}}};
      request = spec.buildRequests([], bidderRequest);
      expect(request).to.have.property('data');
      data = JSON.parse(request.data);
      expect(data.gdprConsent).to.be.false;
    });

    it('should increment auction counter upon every request', function() {
      const bidderRequest = makeBidderRequest({});

      let request = spec.buildRequests([], bidderRequest);
      expect(request).to.have.property('data');
      let data = JSON.parse(request.data);
      const previousCounter = data.counter;

      request = spec.buildRequests([], bidderRequest);
      expect(request).to.have.property('data');
      data = JSON.parse(request.data);
      expect(data.counter).to.equal(previousCounter + 1);
    });
  });
});
