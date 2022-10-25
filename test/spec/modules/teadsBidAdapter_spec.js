import {expect} from 'chai';
import {spec, storage} from 'modules/teadsBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {getStorageManager} from 'src/storageManager';

const ENDPOINT = 'https://a.teads.tv/hb/bid-request';
const AD_SCRIPT = '<script type="text/javascript" class="teads" async="true" src="https://a.teads.tv/hb/getAdSettings"></script>"';

describe('teadsBidAdapter', () => {
  const adapter = newBidder(spec);
  let cookiesAreEnabledStub, getCookieStub;

  beforeEach(function () {
    cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
    getCookieStub = sinon.stub(storage, 'getCookie');
  });

  afterEach(function () {
    cookiesAreEnabledStub.restore();
    getCookieStub.restore();
  });

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

    it('should send bid request to ENDPOINT via POST', function() {
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
            'isServiceSpecific': true
          },
          'apiVersion': 2
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(12);
      expect(payload.gdpr_iab.apiVersion).to.equal(2);
    });

    it('should add referer info to payload', function () {
      const bidRequest = Object.assign({}, bidRequests[0])
      const bidderRequest = {
        refererInfo: {
          page: 'https://example.com/page.html',
          reachedTop: true,
          numIframes: 2
        }
      }
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.referrer).to.exist;
      expect(payload.referrer).to.deep.equal('https://example.com/page.html')
    });

    it('should add networkBandwidth info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderResquestDefault);
      const payload = JSON.parse(request.data);

      const bandwidth = window.navigator && window.navigator.connection && window.navigator.connection.downlink;

      expect(payload.networkBandwidth).to.exist;

      if (bandwidth) {
        expect(payload.networkBandwidth).to.deep.equal(bandwidth.toString());
      } else {
        expect(payload.networkBandwidth).to.deep.equal('');
      }
    });

    it('should add pageReferrer info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderResquestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.pageReferrer).to.exist;
      expect(payload.pageReferrer).to.deep.equal(document.referrer);
    });

    it('should add timeToFirstByte info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderResquestDefault);
      const payload = JSON.parse(request.data);
      const performance = window.performance || window.webkitPerformance || window.msPerformance || window.mozPerformance;

      const ttfbExpectedV2 = performance &&
        typeof performance.getEntriesByType === 'function' &&
        Object.prototype.toString.call(performance.getEntriesByType) === '[object Function]' &&
        performance.getEntriesByType('navigation')[0] &&
        performance.getEntriesByType('navigation')[0].responseStart &&
        performance.getEntriesByType('navigation')[0].requestStart &&
        performance.getEntriesByType('navigation')[0].responseStart > 0 &&
        performance.getEntriesByType('navigation')[0].requestStart > 0 &&
        Math.round(
          performance.getEntriesByType('navigation')[0].responseStart - performance.getEntriesByType('navigation')[0].requestStart
        );

      expect(payload.timeToFirstByte).to.exist;

      if (ttfbExpectedV2) {
        expect(payload.timeToFirstByte).to.deep.equal(ttfbExpectedV2.toString());
      } else {
        const ttfbWithTimingV1 = performance &&
            performance.timing.responseStart &&
            performance.timing.requestStart &&
            performance.timing.responseStart > 0 &&
            performance.timing.requestStart > 0 &&
            performance.timing.responseStart - performance.timing.requestStart;
        const ttfbExpectedV1 = ttfbWithTimingV1 ? ttfbWithTimingV1.toString() : '';

        expect(payload.timeToFirstByte).to.deep.equal(ttfbExpectedV1);
      }
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
            'isServiceSpecific': false,
          },
          'apiVersion': 2
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(11);
      expect(payload.gdpr_iab.apiVersion).to.equal(2);
    });

    it('should send GDPR TCF2 to endpoint with 12 status', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': true,
          'vendorData': {
            'isServiceSpecific': true
          },
          'apiVersion': 2
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(12);
      expect(payload.gdpr_iab.apiVersion).to.equal(2);
    });

    it('should send GDPR to endpoint with 22 status', function() {
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': undefined,
          'gdprApplies': undefined,
          'vendorData': undefined,
          'apiVersion': 2
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal('');
      expect(payload.gdpr_iab.status).to.equal(22);
      expect(payload.gdpr_iab.apiVersion).to.equal(2);
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
          },
          'apiVersion': 2
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(0);
      expect(payload.gdpr_iab.apiVersion).to.equal(2);
    });

    it('should send GDPR to endpoint with 0 status when gdprApplies = false (vendorData = undefined)', function() {
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': undefined,
          'gdprApplies': false,
          'vendorData': undefined,
          'apiVersion': 2
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal('');
      expect(payload.gdpr_iab.status).to.equal(0);
      expect(payload.gdpr_iab.apiVersion).to.equal(2);
    });

    it('should send GDPR to endpoint with 12 status when apiVersion = 0', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': true,
          'vendorData': {
            'isServiceSpecific': true
          },
          'apiVersion': 0
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(12);
      expect(payload.gdpr_iab.apiVersion).to.equal(0);
    });

    it('should use good mediaTypes video playerSizes', function() {
      const mediaTypesPlayerSize = {
        'mediaTypes': {
          'video': {
            'playerSize': [32, 34]
          }
        }
      };
      checkMediaTypesSizes(mediaTypesPlayerSize, '32x34');
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

    it('should add userAgentClientHints info to payload if available', function () {
      const bidRequest = Object.assign({}, bidRequests[0], {
        ortb2: {
          device: {
            sua: {
              source: 2,
              platform: {
                brand: 'macOS',
                version: [ '12', '4', '0' ]
              },
              browsers: [
                {
                  brand: 'Chromium',
                  version: [ '106', '0', '5249', '119' ]
                },
                {
                  brand: 'Google Chrome',
                  version: [ '106', '0', '5249', '119' ]
                },
                {
                  brand: 'Not;A=Brand',
                  version: [ '99', '0', '0', '0' ]
                }
              ],
              mobile: 0,
              model: '',
              bitness: '64',
              architecture: 'x86'
            }
          }
        }
      });

      const requestWithUserAgentClientHints = spec.buildRequests([bidRequest], bidderResquestDefault);
      const payload = JSON.parse(requestWithUserAgentClientHints.data);

      expect(payload.userAgentClientHints).to.exist;
      expect(payload.userAgentClientHints).to.deep.equal({
        source: 2,
        platform: {
          brand: 'macOS',
          version: [ '12', '4', '0' ]
        },
        browsers: [
          {
            brand: 'Chromium',
            version: [ '106', '0', '5249', '119' ]
          },
          {
            brand: 'Google Chrome',
            version: [ '106', '0', '5249', '119' ]
          },
          {
            brand: 'Not;A=Brand',
            version: [ '99', '0', '0', '0' ]
          }
        ],
        mobile: 0,
        model: '',
        bitness: '64',
        architecture: 'x86'
      }
      );

      const defaultRequest = spec.buildRequests(bidRequests, bidderResquestDefault);
      expect(JSON.parse(defaultRequest.data).userAgentClientHints).to.not.exist;
    });

    it('should use good mediaTypes video sizes', function() {
      const mediaTypesVideoSizes = {
        'mediaTypes': {
          'video': {
            'sizes': [12, 14]
          }
        }
      };
      checkMediaTypesSizes(mediaTypesVideoSizes, '12x14');
    });

    it('should use good mediaTypes banner sizes', function() {
      const mediaTypesBannerSize = {
        'mediaTypes': {
          'banner': {
            'sizes': [46, 48]
          }
        }
      };
      checkMediaTypesSizes(mediaTypesBannerSize, '46x48');
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
      checkMediaTypesSizes(hybridMediaTypes, ['46x48', '50x34', '45x45']);
    });

    describe('User IDs', function () {
      const baseBidRequest = {
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
      };

      const userIdModules = {
        unifiedId2: {uid2: {id: 'unifiedId2-id'}},
        liveRampId: {idl_env: 'liveRampId-id'},
        lotamePanoramaId: {lotamePanoramaId: 'lotamePanoramaId-id'},
        id5Id: {id5id: {uid: 'id5Id-id'}},
        criteoId: {criteoId: 'criteoId-id'},
        yahooConnectId: {connectId: 'yahooConnectId-id'},
        quantcastId: {quantcastId: 'quantcastId-id'},
        epsilonPublisherLinkId: {publinkId: 'epsilonPublisherLinkId-id'},
        publisherFirstPartyViewerId: {pubcid: 'publisherFirstPartyViewerId-id'},
        merkleId: {merkleId: {id: 'merkleId-id'}},
        kinessoId: {kpuid: 'kinessoId-id'}
      };

      describe('User Id Modules', function () {
        it(`should not add param to payload if user id system is not enabled`, function () {
          const bidRequest = {
            ...baseBidRequest,
            userId: {} // no property -> assumption that the system is disabled
          };

          const request = spec.buildRequests([bidRequest], bidderResquestDefault);
          const payload = JSON.parse(request.data);

          for (const userId in userIdModules) {
            expect(payload, userId).not.to.have.property(userId);
          }
        });

        it(`should not add param to payload if user id field is absent`, function () {
          const request = spec.buildRequests([baseBidRequest], bidderResquestDefault);
          const payload = JSON.parse(request.data);

          for (const userId in userIdModules) {
            expect(payload, userId).not.to.have.property(userId);
          }
        });

        it(`should not add param to payload if user id is enabled but there is no value`, function () {
          const bidRequest = {
            ...baseBidRequest,
            userId: {
              idl_env: '',
              pubcid: 'publisherFirstPartyViewerId-id'
            }
          };

          const request = spec.buildRequests([bidRequest], bidderResquestDefault);
          const payload = JSON.parse(request.data);

          expect(payload).not.to.have.property('liveRampId');
          expect(payload['publisherFirstPartyViewerId']).to.equal('publisherFirstPartyViewerId-id');
        });

        it(`should add userId param to payload for each enabled user id system`, function () {
          let userIdObject = {};
          for (const userId in userIdModules) {
            userIdObject = {
              ...userIdObject,
              ...userIdModules[userId]
            }
          }
          const bidRequest = {
            ...baseBidRequest,
            userId: userIdObject
          };

          const request = spec.buildRequests([bidRequest], bidderResquestDefault);
          const payload = JSON.parse(request.data);

          expect(payload['unifiedId2']).to.equal('unifiedId2-id');
          expect(payload['liveRampId']).to.equal('liveRampId-id');
          expect(payload['lotamePanoramaId']).to.equal('lotamePanoramaId-id');
          expect(payload['id5Id']).to.equal('id5Id-id');
          expect(payload['criteoId']).to.equal('criteoId-id');
          expect(payload['yahooConnectId']).to.equal('yahooConnectId-id');
          expect(payload['quantcastId']).to.equal('quantcastId-id');
          expect(payload['epsilonPublisherLinkId']).to.equal('epsilonPublisherLinkId-id');
          expect(payload['publisherFirstPartyViewerId']).to.equal('publisherFirstPartyViewerId-id');
          expect(payload['merkleId']).to.equal('merkleId-id');
          expect(payload['kinessoId']).to.equal('kinessoId-id');
        });
      })

      describe('First-party cookie Teads ID', function () {
        it('should not add firstPartyCookieTeadsId param to payload if cookies are not enabled' +
            ' and teads user id not available', function () {
          cookiesAreEnabledStub.returns(false);

          const bidRequest = {
            ...baseBidRequest,
            userId: {
              pubcid: 'publisherFirstPartyViewerId-id'
            }
          };

          const request = spec.buildRequests([bidRequest], bidderResquestDefault);
          const payload = JSON.parse(request.data);

          expect(payload).not.to.have.property('firstPartyCookieTeadsId');
        });

        it('should not add firstPartyCookieTeadsId param to payload if cookies are enabled ' +
            'but first-party cookie and teads user id are not available', function () {
          cookiesAreEnabledStub.returns(true);
          getCookieStub.withArgs('_tfpvi').returns(undefined);

          const bidRequest = {
            ...baseBidRequest,
            userId: {
              pubcid: 'publisherFirstPartyViewerId-id'
            }
          };

          const request = spec.buildRequests([bidRequest], bidderResquestDefault);
          const payload = JSON.parse(request.data);

          expect(payload).not.to.have.property('firstPartyCookieTeadsId');
        });

        it('should add firstPartyCookieTeadsId from cookie if it\'s available ' +
            'and teads user id is not', function () {
          cookiesAreEnabledStub.returns(true);
          getCookieStub.withArgs('_tfpvi').returns('my-teads-id');

          const bidRequest = {
            ...baseBidRequest,
            userId: {
              pubcid: 'publisherFirstPartyViewerId-id'
            }
          };

          const request = spec.buildRequests([bidRequest], bidderResquestDefault);

          const payload = JSON.parse(request.data);

          expect(payload.firstPartyCookieTeadsId).to.equal('my-teads-id');
        });

        it('should add firstPartyCookieTeadsId from user id module if it\'s available ' +
            'even if cookie is available too', function () {
          cookiesAreEnabledStub.returns(true);
          getCookieStub.withArgs('_tfpvi').returns('my-teads-id');

          const bidRequest = {
            ...baseBidRequest,
            userId: {
              pubcid: 'publisherFirstPartyViewerId-id',
              teadsId: 'teadsId-fake-id'
            }
          };

          const request = spec.buildRequests([bidRequest], bidderResquestDefault);

          const payload = JSON.parse(request.data);

          expect(payload.firstPartyCookieTeadsId).to.equal('teadsId-fake-id');
        });
      });
    });

    describe('Global Placement Id', function () {
      let bidRequests = [
        {
          'bidder': 'teads',
          'params': {
            'placementId': 10433394,
            'pageId': 1234
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
          'creativeId': 'er2ee',
          'deviceWidth': 1680
        },
        {
          'bidder': 'teads',
          'params': {
            'placementId': 10433395,
            'pageId': 1234
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '30b31c1838de1f',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
          'creativeId': 'er2ef',
          'deviceWidth': 1680
        }
      ];

      it('should add gpid if ortb2Imp.ext.gpid is present and is non empty', function () {
        const updatedBidRequests = bidRequests.map(function(bidRequest, index) {
          return {
            ...bidRequest,
            ortb2Imp: {
              ext: {
                gpid: '1111/home-left-' + index
              }
            }
          };
        }
        );
        const request = spec.buildRequests(updatedBidRequests, bidderResquestDefault);
        const payload = JSON.parse(request.data);

        expect(payload.data[0].gpid).to.equal('1111/home-left-0');
        expect(payload.data[1].gpid).to.equal('1111/home-left-1');
      });

      it('should not add gpid if ortb2Imp.ext.gpid is present but empty', function () {
        const updatedBidRequests = bidRequests.map(bidRequest => ({
          ...bidRequest,
          ortb2Imp: {
            ext: {
              gpid: ''
            }
          }
        }));

        const request = spec.buildRequests(updatedBidRequests, bidderResquestDefault);
        const payload = JSON.parse(request.data);

        return payload.data.forEach(bid => {
          expect(bid).not.to.have.property('gpid');
        });
      });

      it('should not add gpid if ortb2Imp.ext.gpid is not present', function () {
        const updatedBidRequests = bidRequests.map(bidRequest => ({
          ...bidRequest,
          ortb2Imp: {
            ext: {
            }
          }
        }));

        const request = spec.buildRequests(updatedBidRequests, bidderResquestDefault);
        const payload = JSON.parse(request.data);

        return payload.data.forEach(bid => {
          expect(bid).not.to.have.property('gpid');
        });
      });
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
    it('should get correct bid responses', function() {
      let bids = {
        'body': {
          'responses': [{
            'ad': AD_SCRIPT,
            'cpm': 0.5,
            'currency': 'USD',
            'height': 250,
            'bidId': '3ede2a3fa0db94',
            'ttl': 360,
            'width': 300,
            'creativeId': 'er2ee',
            'placementId': 34
          }, {
            'ad': AD_SCRIPT,
            'cpm': 0.5,
            'currency': 'USD',
            'height': 200,
            'bidId': '4fef3b4gb1ec15',
            'ttl': 360,
            'width': 350,
            'creativeId': 'fs3ff',
            'placementId': 34,
            'dealId': 'ABC_123'
          }]
        }
      };
      let expectedResponse = [
        {
          'cpm': 0.5,
          'width': 300,
          'height': 250,
          'currency': 'USD',
          'netRevenue': true,
          'meta': {
            advertiserDomains: []
          },
          'ttl': 360,
          'ad': AD_SCRIPT,
          'requestId': '3ede2a3fa0db94',
          'creativeId': 'er2ee',
          'placementId': 34
        }, {
          'cpm': 0.5,
          'width': 350,
          'height': 200,
          'currency': 'USD',
          'netRevenue': true,
          'meta': {
            advertiserDomains: []
          },
          'ttl': 360,
          'ad': AD_SCRIPT,
          'requestId': '4fef3b4gb1ec15',
          'creativeId': 'fs3ff',
          'placementId': 34,
          'dealId': 'ABC_123'
        }
      ]
      ;

      let result = spec.interpretResponse(bids);
      expect(result).to.eql(expectedResponse);
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
});
