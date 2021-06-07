import { expect } from 'chai';
import sinon from 'sinon';
import { spec } from 'modules/concertBidAdapter.js';
import { getStorageManager } from '../../../src/storageManager.js'

describe('ConcertAdapter', function () {
  let bidRequests;
  let bidRequest;
  let bidResponse;

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'concert',
        params: {
          partnerId: 'foo',
          slotType: 'fizz'
        },
        adUnitCode: 'desktop_leaderboard_variable',
        bidId: 'foo',
        transactionId: '',
        sizes: [[1030, 590]]
      }
    ];

    bidRequest = {
      refererInfo: {
        referer: 'https://www.google.com'
      },
      uspConsent: '1YYY',
      gdprConsent: {}
    };

    bidResponse = {
      body: {
        bids: [
          {
            bidId: '16d2e73faea32d9',
            cpm: '6',
            width: '1030',
            height: '590',
            ad: '<script>...</script>',
            ttl: '360',
            creativeId: '123349|a7d62700-a4bf-11ea-829f-ad3b0b7a9383',
            netRevenue: false,
            currency: 'USD'
          }
        ]
      }
    }
  });

  describe('spec.isBidRequestValid', function() {
    it('should return when it recieved all the required params', function() {
      const bid = bidRequests[0];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when partner id is missing', function() {
      const bid = {
        bidder: 'concert',
        params: {}
      }

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('spec.buildRequests', function() {
    it('should build a payload object with the shape expected by server', function() {
      const request = spec.buildRequests(bidRequests, bidRequest);
      const payload = JSON.parse(request.data);
      expect(payload).to.have.property('meta');
      expect(payload).to.have.property('slots');

      const metaRequiredFields = ['prebidVersion', 'pageUrl', 'screen', 'debug', 'uid', 'optedOut', 'adapterVersion', 'uspConsent', 'gdprConsent'];
      const slotsRequiredFields = ['name', 'bidId', 'transactionId', 'sizes', 'partnerId', 'slotType'];

      metaRequiredFields.forEach(function(field) {
        expect(payload.meta).to.have.property(field);
      });
      slotsRequiredFields.forEach(function(field) {
        expect(payload.slots[0]).to.have.property(field);
      });
    });

    it('should not generate uid if the user has opted out', function() {
      const storage = getStorageManager();
      storage.setDataInLocalStorage('c_nap', 'true');
      const request = spec.buildRequests(bidRequests, bidRequest);
      const payload = JSON.parse(request.data);

      expect(payload.meta.uid).to.equal(false);
    });

    it('should generate uid if the user has not opted out', function() {
      const storage = getStorageManager();
      storage.removeDataFromLocalStorage('c_nap');
      const request = spec.buildRequests(bidRequests, bidRequest);
      const payload = JSON.parse(request.data);

      expect(payload.meta.uid).to.not.equal(false);
    });

    it('should grab uid from local storage if it exists', function() {
      const storage = getStorageManager();
      storage.setDataInLocalStorage('c_uid', 'foo');
      storage.removeDataFromLocalStorage('c_nap');
      const request = spec.buildRequests(bidRequests, bidRequest);
      const payload = JSON.parse(request.data);

      expect(payload.meta.uid).to.equal('foo');
    });
  });

  describe('spec.interpretResponse', function() {
    it('should return bids in the shape expected by prebid', function() {
      const bids = spec.interpretResponse(bidResponse, bidRequest);
      const requiredFields = ['requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId', 'netRevenue', 'currency'];

      requiredFields.forEach(function(field) {
        expect(bids[0]).to.have.property(field);
      });
    });

    it('should return empty bids if there is no response from server', function() {
      const bids = spec.interpretResponse({ body: null }, bidRequest);
      expect(bids).to.have.lengthOf(0);
    });

    it('should return empty bids if there are no bids from the server', function() {
      const bids = spec.interpretResponse({ body: {bids: []} }, bidRequest);
      expect(bids).to.have.lengthOf(0);
    });
  });

  describe('spec.getUserSyncs', function() {
    it('should not register syncs when iframe is not enabled', function() {
      const opts = {
        iframeEnabled: false
      }
      const sync = spec.getUserSyncs(opts, [], bidRequest.gdprConsent, bidRequest.uspConsent);
      expect(sync).to.have.lengthOf(0);
    });

    it('should not register syncs when the user has opted out', function() {
      const opts = {
        iframeEnabled: true
      };
      const storage = getStorageManager();
      storage.setDataInLocalStorage('c_nap', 'true');

      const sync = spec.getUserSyncs(opts, [], bidRequest.gdprConsent, bidRequest.uspConsent);
      expect(sync).to.have.lengthOf(0);
    });

    it('should set gdprApplies flag to 1 if the user is in area where GDPR applies', function() {
      const opts = {
        iframeEnabled: true
      };
      const storage = getStorageManager();
      storage.removeDataFromLocalStorage('c_nap');

      bidRequest.gdprConsent = {
        gdprApplies: true
      };

      const sync = spec.getUserSyncs(opts, [], bidRequest.gdprConsent, bidRequest.uspConsent);
      expect(sync[0].url).to.have.string('gdpr_applies=1');
    });

    it('should set gdprApplies flag to 1 if the user is in area where GDPR applies', function() {
      const opts = {
        iframeEnabled: true
      };
      const storage = getStorageManager();
      storage.removeDataFromLocalStorage('c_nap');

      bidRequest.gdprConsent = {
        gdprApplies: false
      };

      const sync = spec.getUserSyncs(opts, [], bidRequest.gdprConsent, bidRequest.uspConsent);
      expect(sync[0].url).to.have.string('gdpr_applies=0');
    });

    it('should set gdpr consent param with the user\'s choices on consent', function() {
      const opts = {
        iframeEnabled: true
      };
      const storage = getStorageManager();
      storage.removeDataFromLocalStorage('c_nap');

      bidRequest.gdprConsent = {
        gdprApplies: false,
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A=='
      };

      const sync = spec.getUserSyncs(opts, [], bidRequest.gdprConsent, bidRequest.uspConsent);
      expect(sync[0].url).to.have.string('gdpr_consent=BOJ/P2HOJ/P2HABABMAAAAAZ+A==');
    });

    it('should set ccpa consent param with the user\'s choices on consent', function() {
      const opts = {
        iframeEnabled: true
      };
      const storage = getStorageManager();
      storage.removeDataFromLocalStorage('c_nap');

      bidRequest.gdprConsent = {
        gdprApplies: false,
        uspConsent: '1YYY'
      };

      const sync = spec.getUserSyncs(opts, [], bidRequest.gdprConsent, bidRequest.uspConsent);
      expect(sync[0].url).to.have.string('usp_consent=1YY');
    });
  });
});
