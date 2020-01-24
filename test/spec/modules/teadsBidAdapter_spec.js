import {expect} from 'chai';
import {spec} from 'modules/teadsBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

const ENDPOINT = '//a.teads.tv/hb/bid-request';
const AD_SCRIPT = '<script type="text/javascript" class="teads" async="true" src="http://a.teads.tv/hb/getAdSettings"></script>"';

describe('teadsBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    let bid = {
      'bidder': 'teads',
      'params': {
        'placementId': 10433394,
        'pageId': 1234
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'creativeId': 'er2ee'
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when pageId is not valid (letters)', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': 1234,
        'pageId': 'ABCD'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when placementId is not valid (letters)', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': 'FCP',
        'pageId': 1234
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when placementId < 0 or pageId < 0', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': -1,
        'pageId': -1
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;

      bid.params = {
        'placementId': 0
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    let bidRequests = [
      {
        'bidder': 'teads',
        'params': {
          'placementId': 10433394,
          'pageId': 1234
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'creativeId': 'er2ee',
        'deviceWidth': 1680
      }
    ];

    let bidderResquestDefault = {
      'auctionId': '1d1a030790a475',
      'bidderRequestId': '22edbae2733bf6',
      'timeout': 3000
    };

    it('sends bid request to ENDPOINT via POST', function() {
      const request = spec.buildRequests(bidRequests, bidderResquestDefault);

      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should send US Privacy to endpoint', function() {
      let usPrivacy = 'OHHHFCP1'
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'uspConsent': usPrivacy
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.us_privacy).to.exist;
      expect(payload.us_privacy).to.equal(usPrivacy);
    });

    it('should send GDPR to endpoint', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': true,
          'vendorData': {
            'hasGlobalConsent': false
          }
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(12);
    });

    it('should add referer info to payload', function () {
      const bidRequest = Object.assign({}, bidRequests[0])
      const bidderRequest = {
        refererInfo: {
          referer: 'http://example.com/page.html',
          reachedTop: true,
          numIframes: 2
        }
      }
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.referrer).to.exist;
      expect(payload.referrer).to.deep.equal('http://example.com/page.html')
    });

    it('should send GDPR to endpoint with 11 status', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': true,
          'vendorData': {
            'hasGlobalScope': true
          }
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(11);
    });

    it('should send GDPR to endpoint with 22 status', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': undefined,
          'gdprApplies': undefined,
          'vendorData': undefined
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal('');
      expect(payload.gdpr_iab.status).to.equal(22);
    });

    it('should send GDPR to endpoint with 0 status', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': false,
          'vendorData': {
            'hasGlobalScope': false
          }
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(0);
    });

    it('should use good mediaTypes video playerSizes', function() {
      const mediaTypesPlayerSize = {
        'mediaTypes': {
          'video': {
            'playerSize': [32, 34]
          }
        }
      };
      checkMediaTypesSizes(mediaTypesPlayerSize, '32x34')
    });

    it('should add schain info to payload if available', function () {
      const bidRequest = Object.assign({}, bidRequests[0], {
        schain: {
          ver: '1.0',
          complete: 1,
          nodes: [{
            asi: 'example.com',
            sid: '00001',
            hp: 1
          }]
        }
      });

      const request = spec.buildRequests([bidRequest], bidderResquestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.schain).to.exist;
      expect(payload.schain).to.deep.equal({
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'example.com',
          sid: '00001',
          hp: 1
        }]
      });
    });

    it('should use good mediaTypes video sizes', function() {
      const mediaTypesVideoSizes = {
        'mediaTypes': {
          'video': {
            'sizes': [12, 14]
          }
        }
      };
      checkMediaTypesSizes(mediaTypesVideoSizes, '12x14')
    });

    it('should use good mediaTypes banner sizes', function() {
      const mediaTypesBannerSize = {
        'mediaTypes': {
          'banner': {
            'sizes': [46, 48]
          }
        }
      };
      checkMediaTypesSizes(mediaTypesBannerSize, '46x48')
    });

    it('should use good mediaTypes for both video and banner sizes', function() {
      const hybridMediaTypes = {
        'mediaTypes': {
          'banner': {
            'sizes': [46, 48]
          },
          'video': {
            'sizes': [[50, 34], [45, 45]]
          }
        }
      };
      checkMediaTypesSizes(hybridMediaTypes, ['46x48', '50x34', '45x45'])
    });

    function checkMediaTypesSizes(mediaTypes, expectedSizes) {
      const bidRequestWithBannerSizes = Object.assign(bidRequests[0], mediaTypes);
      const requestWithBannerSizes = spec.buildRequests([bidRequestWithBannerSizes], bidderResquestDefault);
      const payloadWithBannerSizes = JSON.parse(requestWithBannerSizes.data);

      return payloadWithBannerSizes.data.forEach(bid => {
        if (Array.isArray(expectedSizes)) {
          expect(JSON.stringify(bid.sizes)).to.equal(JSON.stringify(expectedSizes));
        } else {
          expect(bid.sizes[0]).to.equal(expectedSizes);
        }
      });
    }
  });

  describe('interpretResponse', function() {
    let bids = {
      'body': {
        'responses': [{
          'ad': AD_SCRIPT,
          'cpm': 0.5,
          'currency': 'USD',
          'height': 250,
          'netRevenue': true,
          'bidId': '3ede2a3fa0db94',
          'ttl': 360,
          'width': 300,
          'creativeId': 'er2ee',
          'placementId': 34
        }]
      }
    };

    it('should get correct bid response', function() {
      let expectedResponse = {
        'cpm': 0.5,
        'width': 300,
        'height': 250,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 360,
        'ad': AD_SCRIPT,
        'requestId': '3ede2a3fa0db94',
        'creativeId': 'er2ee',
        'placementId': 34
      };

      let result = spec.interpretResponse(bids);
      expect(result[0]).to.deep.equal(expectedResponse);
    });

    it('handles nobid responses', function() {
      let bids = {
        'body': {
          'responses': []
        }
      };

      let result = spec.interpretResponse(bids);
      expect(result.length).to.equal(0);
    });
  });

  it('should call userSync with good params', function() {
    let bids = [{
      'body': {
        'responses': [{
          'ad': '<script>',
          'cpm': 0.5,
          'currency': 'USD',
          'height': 250,
          'netRevenue': true,
          'bidId': '3ede2a3fa0db94',
          'ttl': 360,
          'width': 300,
          'creativeId': 'er2ee',
          'placementId': 34
        }]
      }
    }];
    let syncOptions = { 'iframeEnabled': true };
    let consentString = 'JRJ8FCP29RPZDeBNsERRDCSAAZ+A==';
    let gdprConsent = {
      'consentString': consentString,
      'gdprApplies': true,
      'vendorData': {
        'hasGlobalConsent': false
      }
    };
    let hb_version = '$prebid.version$'
    let finalUrl = `//sync.teads.tv/iframe?hb_provider=prebid&hb_version=${hb_version}&gdprIab={"status":12,"consent":"${consentString}"}&placementId=34&`;
    const userSync = spec.getUserSyncs(syncOptions, bids, gdprConsent);

    expect(userSync[0].type).to.equal('iframe');
    expect(decodeURIComponent(userSync[0].url)).to.equal(finalUrl);
  });

  it('should call userSync without placementId param', function() {
    let bids = [{
      'body': {
        'responses': [{
          'ad': '<script>',
          'cpm': 0.5,
          'currency': 'USD',
          'height': 250,
          'netRevenue': true,
          'bidId': '3ede2a3fa0db94',
          'ttl': 360,
          'width': 300,
          'creativeId': 'er2ee'
        }]
      }
    }];
    let syncOptions = { 'iframeEnabled': true };
    let consentString = 'JRJ8FCP29RPZDeBNsERRDCSAAZ+A==';
    let gdprConsent = {
      'consentString': consentString,
      'gdprApplies': true,
      'vendorData': {
        'hasGlobalConsent': false
      }
    };
    let hb_version = '$prebid.version$'
    let finalUrl = `//sync.teads.tv/iframe?hb_provider=prebid&hb_version=${hb_version}&gdprIab={"status":12,"consent":"${consentString}"}&`;
    const userSync = spec.getUserSyncs(syncOptions, bids, gdprConsent);

    expect(userSync[0].type).to.equal('iframe');
    expect(decodeURIComponent(userSync[0].url)).to.equal(finalUrl);
  });
});
