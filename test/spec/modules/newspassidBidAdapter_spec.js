import { spec } from 'modules/newspassidBidAdapter.js';
import { config } from 'src/config.js';
import { deepClone } from 'src/utils.js';
import { resolveNewpassidPublisherId } from '../../../modules/newspassidBidAdapter.js';

describe('newspassidBidAdapter', function () {
  const TEST_PUBLISHER_ID = '123456';
  const TEST_PLACEMENT_ID = 'test-group1';

  const validBidRequest = {
    bidder: 'newspassid',
    params: {
      publisherId: TEST_PUBLISHER_ID,
      placementId: TEST_PLACEMENT_ID
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    adUnitCode: 'test-div',
    transactionId: '123456',
    bidId: '789',
    bidderRequestId: 'abc',
    auctionId: 'xyz'
  };

  const validBidderRequest = {
    bidderCode: 'newspassid',
    auctionId: 'xyz',
    bidderRequestId: 'abc',
    bids: [validBidRequest],
    gdprConsent: {
      gdprApplies: true,
      consentString: 'consent123'
    },
    refererInfo: {
      page: 'http://example.com'
    }
  };

  const serverResponse = {
    body: {
      seatbid: [{
        bid: [{
          impid: '789',
          price: 2.5,
          w: 300,
          h: 250,
          crid: 'creative123',
          adm: '<div>ad</div>',
          adomain: ['advertiser.com']
        }]
      }],
      cur: 'USD'
    }
  };

  describe('gvlid', function() {
    it('should expose gvlid', function() {
      expect(spec.gvlid).to.equal(1317);
    });
  });

  describe('resolveNewpassidPublisherId', function() {
    afterEach(() => {
      config.resetConfig();
    });

    it('should return null if no bidrequest object or no global publisherId set', function() {
      expect(resolveNewpassidPublisherId()).to.equal(null);
    });

    it('should return global publisherId if no bidrequest object and global publisherId set', function() {
      config.setConfig({
        newspassid: {
          publisherId: TEST_PUBLISHER_ID
        }
      });
      expect(resolveNewpassidPublisherId()).to.equal(TEST_PUBLISHER_ID);
    });
  });

  describe('isBidRequestValid', function() {
    it('should return true when required params are present', function() {
      expect(spec.isBidRequestValid(validBidRequest)).to.be.true;
    });

    it('should return false when publisherId is missing', function() {
      const bid = deepClone(validBidRequest);
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when placementId is missing', function() {
      const bid = deepClone(validBidRequest);
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function() {
    it('should create request data', function() {
      const requests = spec.buildRequests([validBidRequest], validBidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal('https://npid.amspbs.com/v0/bid/request');
      expect(requests[0].options.withCredentials).to.be.true;
    });

    it('should include bidder params in ortb2 request', function() {
      const requests = spec.buildRequests([validBidRequest], validBidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].ext.newspassid.publisher).to.equal(TEST_PUBLISHER_ID);
      expect(data.imp[0].ext.newspassid.placementId).to.equal(TEST_PLACEMENT_ID);
    });

    it('should use global publisherId when not set in bid params', function() {
      const validBidRequestWithoutPublisherId = {
        ...validBidRequest,
        params: {
          placementId: TEST_PLACEMENT_ID
        },
      };
      config.setConfig({
        newspassid: {
          publisherId: TEST_PUBLISHER_ID
        }
      });
      const requests = spec.buildRequests([validBidRequestWithoutPublisherId], validBidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].ext.newspassid.publisher).to.equal(TEST_PUBLISHER_ID);
      expect(data.imp[0].ext.newspassid.placementId).to.equal(TEST_PLACEMENT_ID);
    });

    it('should use publisherId from bidRequest first over global publisherId', function() {
      config.setConfig({
        newspassid: {
          publisherId: TEST_PUBLISHER_ID
        }
      });
      const validBidRequestWithDifferentPublisherId = {
        ...validBidRequest,
        params: {
          publisherId: 'publisherId123'
        }
      };
      const requests = spec.buildRequests([validBidRequestWithDifferentPublisherId], validBidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].ext.newspassid.publisher).to.equal('publisherId123');
    });

    it('should handle multiple bid requests', function() {
      const secondBidRequest = deepClone(validBidRequest);
      secondBidRequest.bidId = '790';
      const requests = spec.buildRequests([validBidRequest, secondBidRequest], validBidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp).to.have.lengthOf(2);
    });
  });

  describe('interpretResponse', function() {
    it('should return empty array if no valid bids', function() {
      const invalidResponse = {body: {}};
      const bids = spec.interpretResponse(invalidResponse);
      expect(bids).to.be.empty;
    });

    it('should return empty array if no seatbid', function() {
      const noSeatbidResponse = {body: {cur: 'USD'}};
      const bids = spec.interpretResponse(noSeatbidResponse);
      expect(bids).to.be.empty;
    });

    it('should interpret valid server response', function() {
      const bids = spec.interpretResponse(serverResponse);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.deep.equal({
        requestId: '789',
        cpm: 2.5,
        width: 300,
        height: 250,
        creativeId: 'creative123',
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        ad: '<div>ad</div>',
        meta: {
          advertiserDomains: ['advertiser.com']
        }
      });
    });
  });

  describe('getUserSyncs', function() {
    afterEach(() => {
      config.resetConfig();
    });

    it('should expect correct host', function() {
      const syncs = spec.getUserSyncs({iframeEnabled: true}, [], {}, '', {});
      const url = new URL(syncs[0].url);
      expect(url.host).to.equal('npid.amspbs.com');
    });

    it('should expect correct pathname', function() {
      const syncs = spec.getUserSyncs({iframeEnabled: true}, [], {}, '', {});
      const url = new URL(syncs[0].url);
      expect(url.pathname).to.equal('/v0/user/sync');
    });

    it('should return empty array when iframe sync option is disabled', function() {
      const syncs = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false});
      expect(syncs).to.be.empty;
    });

    it('should use iframe sync when iframe enabled', function() {
      const syncs = spec.getUserSyncs({iframeEnabled: true});
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://npid.amspbs.com/v0/user/sync?gdpr=0&gdpr_consent=&gpp=&gpp_sid=&us_privacy=');
    });

    it('should include GDPR params if purpose 1 is true', function() {
      const consentString = 'CQO03QAQO03QAPoABABGBiEIAIAAAIAAAACQKSwAQKSgpLABApKAAAAA.QKSwAQKSgAAA.IAAA'; // purpose 1 true
      const gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        vendorData: {
          purpose: {
            consents: {
              1: true
            }
          }
        }
      };
      const syncs = spec.getUserSyncs({iframeEnabled: true}, [], gdprConsent);
      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('gdpr')).to.equal('1');
      expect(url.searchParams.get('gdpr_consent')).to.equal(encodeURIComponent(consentString));
    });

    it('should disable user sync when purpose 1 is false', function() {
      const consentString = 'CQO03QAQO03QAPoABABGBiEIAHAAAHAAAACQKSwAQKSgpLABApKAAAAA.QKSwAQKSgAAA.IAAA'; // purpose 1 false
      const gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        vendorData: {
          purpose: {
            consents: {
              1: false
            }
          }
        }
      };
      const syncs = spec.getUserSyncs({iframeEnabled: true}, [], gdprConsent);
      expect(syncs).to.be.empty;
    });

    it('should include correct us_privacy param', function() {
      const uspConsent = '1YNN';
      const syncs = spec.getUserSyncs({iframeEnabled: true}, [], {}, uspConsent, {});
      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('gdpr')).to.equal('0');
      expect(url.searchParams.get('gdpr_consent')).to.equal('');
      expect(url.searchParams.get('gpp')).to.equal('');
      expect(url.searchParams.get('gpp_sid')).to.equal('');
      expect(url.searchParams.get('us_privacy')).to.equal(uspConsent);
    });

    it('should include correct GPP params', function() {
      const gppConsentString = 'DBABMA~1YNN';
      const gppSections = '2,6';
      const gppConsent = {
        gppApplies: true,
        gppString: gppConsentString,
        applicableSections: gppSections
      };
      const syncs = spec.getUserSyncs({iframeEnabled: true}, [], {}, '', gppConsent);
      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('gdpr')).to.equal('0');
      expect(url.searchParams.get('gdpr_consent')).to.equal('');
      expect(url.searchParams.get('gpp')).to.equal(encodeURIComponent(gppConsentString));
      expect(url.searchParams.get('gpp_sid')).to.equal(encodeURIComponent(gppSections));
      expect(url.searchParams.get('us_privacy')).to.equal('');
    });

    it('should include publisher param when publisherId is set in config', function() {
      config.setConfig({
        newspassid: {
          publisherId: TEST_PUBLISHER_ID
        }
      });
      const syncs = spec.getUserSyncs({iframeEnabled: true});
      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('gdpr')).to.equal('0');
      expect(url.searchParams.get('gdpr_consent')).to.equal('');
      expect(url.searchParams.get('gpp')).to.equal('');
      expect(url.searchParams.get('gpp_sid')).to.equal('');
      expect(url.searchParams.get('us_privacy')).to.equal('');
      expect(url.searchParams.get('publisher')).to.equal(encodeURIComponent(TEST_PUBLISHER_ID));
    });

    it('should have zero user syncs if coppa is true', function() {
      config.setConfig({coppa: true});
      const syncs = spec.getUserSyncs({iframeEnabled: true});
      expect(syncs).to.be.empty;
    });

    it('should include all params when all are present', function() {
      const consentString = 'CQO03QAQO03QAPoABABGBiEIAIAAAIAAAACQKSwAQKSgpLABApKAAAAA.QKSwAQKSgAAA.IAAA'; // purpose 1 true
      const gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        vendorData: {
          purpose: {
            consents: {
              1: true
            }
          }
        }
      };
      const uspConsent = '1YNN';
      const gppConsentString = 'DBABMA~1YNN';
      const gppSections = '2,6';
      const gppConsent = {
        gppApplies: true,
        gppString: gppConsentString,
        applicableSections: gppSections
      };
      config.setConfig({
        newspassid: {
          publisherId: TEST_PUBLISHER_ID
        }
      });
      const syncs = spec.getUserSyncs({iframeEnabled: true}, [], gdprConsent, uspConsent, gppConsent);
      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('gdpr')).to.equal('1');
      expect(url.searchParams.get('gdpr_consent')).to.equal(encodeURIComponent(consentString));
      expect(url.searchParams.get('gpp')).to.equal(encodeURIComponent(gppConsentString));
      expect(url.searchParams.get('gpp_sid')).to.equal(encodeURIComponent(gppSections));
      expect(url.searchParams.get('us_privacy')).to.equal(encodeURIComponent(uspConsent));
      expect(url.searchParams.get('publisher')).to.equal(encodeURIComponent(TEST_PUBLISHER_ID));
    });
  });
});
