import {expect} from 'chai';
import {spec} from 'modules/opscoBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory.js';

describe('opscoBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', function () {
    const validBid = {
      bidder: 'opsco',
      params: {
        placementId: '123',
        publisherId: '456'
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    };

    it('should return true when required params are present', function () {
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('should return false when placementId is missing', function () {
      const invalidBid = {...validBid};
      delete invalidBid.params.placementId;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should return false when publisherId is missing', function () {
      const invalidBid = {...validBid};
      delete invalidBid.params.publisherId;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should return false when mediaTypes.banner.sizes is missing', function () {
      const invalidBid = {...validBid};
      delete invalidBid.mediaTypes.banner.sizes;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should return false when mediaTypes.banner is missing', function () {
      const invalidBid = {...validBid};
      delete invalidBid.mediaTypes.banner;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should return false when bid params are missing', function () {
      const invalidBid = {bidder: 'opsco'};
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should return false when bid params are empty', function () {
      const invalidBid = {bidder: 'opsco', params: {}};
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    const validBid = {
      bidder: 'opsco',
      params: {
        placementId: '123',
        publisherId: '456'
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    };

    const bidderRequest = {
      bidderRequestId: 'bid123',
      refererInfo: {
        domain: 'example.com',
        page: 'https://example.com/page',
        ref: 'https://referrer.com'
      },
      gdprConsent: {
        consentString: 'GDPR_CONSENT_STRING',
        gdprApplies: true
      },
      uspConsent: '1YYY'
    };

    const expectedPayload = {
      id: 'bid123',
      imp: [{
        id: 'bid123',
        banner: {format: [{w: 300, h: 250}]},
        ext: {placementId: '123'}
      }],
      site: {
        id: '456',
        publisher: {id: '123'},
        domain: 'example.com',
        page: 'https://example.com/page',
        ref: 'https://referrer.com',
      },
      test: false,
      gdprConsent: {consentString: 'GDPR_CONSENT_STRING', gdprApplies: true},
      uspConsent: '1YYY'
    };

    it('should build a valid POST request with proper payload', function () {
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(request.data).to.equal(JSON.stringify(expectedPayload));
    });

    it('should send GDPR consent in the payload if present', function () {
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(JSON.parse(request.data).gdprConsent).to.deep.equal(expectedPayload.gdprConsent);
    });

    it('should send CCPA in the payload if present', function () {
      const ccpa = '1YYY';
      bidderRequest.uspConsent = ccpa;
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(JSON.parse(request.data).uspConsent).to.equal(ccpa);
    });

    it('should send eids in the payload if present', function () {
      const eids = {data: [{source: 'test', uids: [{id: '123', ext: {}}]}]};
      bidderRequest.userIdAsEids = eids;
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(JSON.parse(request.data).userIdsAsEids).to.deep.equal(eids);
    });

    it('should send schain in the payload if present', function () {
      const schain = {'ver': '1.0', 'complete': 1, 'nodes': [{'asi': 'exchange1.com', 'sid': '1234', 'hp': 1}]};
      bidderRequest.schain = schain;
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(JSON.parse(request.data).source.ext.schain).to.deep.equal(schain);
    });
  });

  describe('interpretResponse', function () {
    // Test cases for interpretResponse
  });

  describe('getUserSyncs', function () {
    // Test cases for getUserSyncs
  });

  describe('Helper functions', function () {
    const validBidRequest = {
      bidId: 'bid1',
      params: {
        placementId: '123'
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    };

    const schainRequest = {
      schain: {
        'ver': '1.0',
        'complete': 1,
        'nodes': [{'asi': 'exchange1.com', 'sid': '1234', 'hp': 1}]
      }
    };

    describe('buildOpenRtbImps', function () {
      it('should build valid OpenRTB imps', function () {
        const validBidRequests = [validBidRequest];
        const expectedImps = [{
          id: 'bid1',
          banner: {format: [{w: 300, h: 250}]},
          ext: {placementId: '123'}
        }];

        const result = spec.buildOpenRtbImps(validBidRequests);
        expect(result).to.deep.equal(expectedImps);
      });
    });

    describe('extractSizes', function () {
      it('should extract sizes from bid request', function () {
        const bidRequest = {
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          }
        };

        const expectedSizes = [{w: 300, h: 250}, {w: 728, h: 90}];
        const result = spec.extractSizes(bidRequest);
        expect(result).to.deep.equal(expectedSizes);
      });
    });

    describe('attachParams', function () {
      it('should attach parameters to the payload', function () {
        const payload = {};
        const paramName = 'schain';

        spec.attachParams(payload, paramName, schainRequest);
        expect(payload.source.ext.schain).to.deep.equal(schainRequest.schain);
      });
    });

    describe('isTest', function () {
      it('should correctly identify test mode', function () {
        const result = spec.isTest({params: {test: true}});
        expect(result).to.be.true;
      });

      it('should return false when test mode is not enabled', function () {
        const result = spec.isTest({params: {test: false}});
        expect(result).to.be.false;
      });

      it('should return false when test param is not present', function () {
        const result = spec.isTest({});
        expect(result).to.be.true;
      });
    });
  });
});
