import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { spec, ENDPOINT_URL } from 'modules/greenbidsBidAdapter.js';
import { getScreenOrientation } from 'src/utils.js';
import {getDevicePixelRatio} from '../../../libraries/devicePixelRatio/devicePixelRatio.js';
const AD_SCRIPT = '<script type="text/javascript" class="greenbids" async="true" src="https://greenbids.ai/settings"></script>"';

describe('greenbidsBidAdapter', () => {
  const bidderRequestDefault = {
    'auctionId': '1d1a030790a475',
    'bidderRequestId': '22edbae2733bf6',
    'timeout': 3000
  };

  const bidRequests = [
    {
      'bidder': 'greenbids',
      'params': {
        'placementId': 4242
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

  function checkMediaTypesSizes(mediaTypes, expectedSizes) {
    const bidRequestWithBannerSizes = Object.assign(bidRequests[0], mediaTypes);
    const requestWithBannerSizes = spec.buildRequests([bidRequestWithBannerSizes], bidderRequestDefault);
    const payloadWithBannerSizes = JSON.parse(requestWithBannerSizes.data);

    return payloadWithBannerSizes.data.forEach(bid => {
      if (Array.isArray(expectedSizes)) {
        expect(JSON.stringify(bid.sizes)).to.equal(JSON.stringify(expectedSizes));
      } else {
        expect(bid.sizes[0]).to.equal(expectedSizes);
      }
    });
  }

  const adapter = newBidder(spec);
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'greenbids',
      'params': {
        'placementId': 4242
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'creativeId': 'er2ee',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not found', function () {
      const bidNonGbCompatible = {
        'bidder': 'greenbids',
      };
      expect(spec.isBidRequestValid(bidNonGbCompatible)).to.equal(false);
    });

    it('should return false when the placement is not a number', function () {
      const bidNonGbCompatible = {
        'bidder': 'greenbids',
        'params': {
          'placementId': 'toto'
        },
      };
      expect(spec.isBidRequestValid(bidNonGbCompatible)).to.equal(false);
    });
  })
  describe('buildRequests', function () {
    it('should send bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);

      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.method).to.equal('POST');
    });

    it('should not send auctionId in bid request ', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.data[0].auctionId).to.not.exist
    });

    it('should send US Privacy to endpoint', function () {
      const usPrivacy = 'OHHHFCP1'
      const bidderRequest = {
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

    it('should send GPP values to endpoint when available and valid', function () {
      const consentString = 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN';
      const applicableSectionIds = [7, 8];
      const bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gppConsent': {
          'gppString': consentString,
          'applicableSections': applicableSectionIds
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gpp).to.exist;
      expect(payload.gpp.consentString).to.equal(consentString);
      expect(payload.gpp.applicableSectionIds).to.have.members(applicableSectionIds);
    });

    it('should send default GPP values to endpoint when available but invalid', function () {
      const bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gppConsent': {
          'gppString': undefined,
          'applicableSections': ['a']
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gpp).to.exist;
      expect(payload.gpp.consentString).to.equal('');
      expect(payload.gpp.applicableSectionIds).to.have.members([]);
    });

    it('should not set the GPP object in the request sent to the endpoint when not present', function () {
      const bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gpp).to.not.exist;
    });

    it('should send GDPR to endpoint', function () {
      const consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      const bidderRequest = {
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

    const originalConnection = window.navigator.connection;
    const mockConnection = { downlink: 10 };

    const setNavigatorConnection = (connection) => {
      Object.defineProperty(window.navigator, 'connection', {
        value: connection,
        configurable: true,
      });
    };

    try {
      setNavigatorConnection(mockConnection);

      const requestWithConnection = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payloadWithConnection = JSON.parse(requestWithConnection.data);

      expect(payloadWithConnection.networkBandwidth).to.exist;
      expect(payloadWithConnection.networkBandwidth).to.deep.equal(mockConnection.downlink.toString());

      setNavigatorConnection(undefined);

      const requestWithoutConnection = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payloadWithoutConnection = JSON.parse(requestWithoutConnection.data);

      expect(payloadWithoutConnection.networkBandwidth).to.exist;
      expect(payloadWithoutConnection.networkBandwidth).to.deep.equal('');
    } finally {
      setNavigatorConnection(originalConnection);
    }

    it('should add pageReferrer info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.pageReferrer).to.exist;
      expect(payload.pageReferrer).to.deep.equal(document.referrer);
    });

    it('should add width info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);
      const deviceWidth = screen.width

      expect(payload.deviceWidth).to.exist;
      expect(payload.deviceWidth).to.deep.equal(deviceWidth);
    });

    it('should add height info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);
      const deviceHeight = screen.height

      expect(payload.deviceHeight).to.exist;
      expect(payload.deviceHeight).to.deep.equal(deviceHeight);
    });

    it('should add pixelRatio info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);
      const pixelRatio = getDevicePixelRatio()

      expect(payload.devicePixelRatio).to.exist;
      expect(payload.devicePixelRatio).to.deep.equal(pixelRatio);
    });

    it('should add screenOrientation info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);
      const orientation = getScreenOrientation(window.top);

      if (orientation) {
        expect(payload.screenOrientation).to.exist;
        expect(payload.screenOrientation).to.deep.equal(orientation);
      } else {
        expect(payload.screenOrientation).to.not.exist;
      }
    });

    it('should add historyLength info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.historyLength).to.exist;
      expect(payload.historyLength).to.deep.equal(window.top.history.length);
    });

    it('should add viewportHeight info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.viewportHeight).to.exist;
      expect(payload.viewportHeight).to.deep.equal(window.top.visualViewport.height);
    });

    it('should add viewportWidth info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.viewportWidth).to.exist;
      expect(payload.viewportWidth).to.deep.equal(window.top.visualViewport.width);
    });

    it('should add viewportHeight info to payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.viewportHeight).to.exist;
      expect(payload.viewportHeight).to.deep.equal(window.top.visualViewport.height);
    });

    it('should add ortb2 device data to payload', function () {
      const ortb2DeviceBidderRequest = {
        ...bidderRequestDefault,
        ...{
          ortb2: {
            device: {
              w: 980,
              h: 1720,
              dnt: 0,
              ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1',
              language: 'en',
              devicetype: 1,
              make: 'Apple',
              model: 'iPhone 12 Pro Max',
              os: 'iOS',
              osv: '17.4',
              ext: { fiftyonedegrees_deviceId: '17595-133085-133468-18092' },
            },
          },
        },
      };
      const request = spec.buildRequests(bidRequests, ortb2DeviceBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.device).to.deep.equal(ortb2DeviceBidderRequest.ortb2.device);
    });
  });

  describe('pageTitle', function () {
    it('should add pageTitle info to payload based on document title', function () {
      const testText = 'This is a title';
      sandbox.stub(window.top.document, 'title').value(testText);

      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.pageTitle).to.exist;
      expect(payload.pageTitle).to.deep.equal(testText);
    });

    it('should add pageTitle info to payload based on open-graph title', function () {
      const testText = 'This is a title from open-graph';
      sandbox.stub(window.top.document, 'title').value('');
      sandbox.stub(window.top.document, 'querySelector').withArgs('meta[property="og:title"]').returns({ content: testText });

      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.pageTitle).to.exist;
      expect(payload.pageTitle).to.deep.equal(testText);
    });

    it('should add pageTitle info to payload sliced on 300 first characters', function () {
      const testText = Array(500).join('a');
      sandbox.stub(window.top.document, 'title').value(testText);

      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.pageTitle).to.exist;
      expect(payload.pageTitle).to.have.length(300);
    });

    it('should add pageTitle info to payload when fallbacking from window.top', function () {
      const testText = 'This is a fallback title';
      sandbox.stub(window.top.document, 'querySelector').throws();
      sandbox.stub(document, 'title').value(testText);

      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.pageTitle).to.exist;
      expect(payload.pageTitle).to.deep.equal(testText);
    });
  });

  describe('pageDescription', function () {
    it('should add pageDescription info to payload based on open-graph description', function () {
      const testText = 'This is a description';
      sandbox.stub(window.top.document, 'querySelector').withArgs('meta[name="description"]').returns({ content: testText });

      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.pageDescription).to.exist;
      expect(payload.pageDescription).to.deep.equal(testText);
    });

    it('should add pageDescription info to payload based on open-graph description', function () {
      const testText = 'This is a description from open-graph';
      sandbox.stub(window.top.document, 'querySelector').withArgs('meta[property="og:description"]').returns({ content: testText });

      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.pageDescription).to.exist;
      expect(payload.pageDescription).to.deep.equal(testText);
    });

    it('should add pageDescription info to payload sliced on 300 first characters', function () {
      const testText = Array(500).join('a');
      sandbox.stub(window.top.document, 'querySelector').withArgs('meta[name="description"]').returns({ content: testText });

      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.pageDescription).to.exist;
      expect(payload.pageDescription).to.have.length(300);
    });

    it('should add pageDescription info to payload when fallbacking from window.top', function () {
      const testText = 'This is a fallback description';
      sandbox.stub(window.top.document, 'querySelector').throws();
      sandbox.stub(document, 'querySelector').withArgs('meta[name="description"]').returns({ content: testText });

      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      expect(payload.pageDescription).to.exist;
      expect(payload.pageDescription).to.deep.equal(testText);
    });

    it('should add timeToFirstByte info to payload for Navigation Timing V2', function () {
      // Mock `performance` object with Navigation Timing V2 data
      const mockPerformance = {
        getEntriesByType: () => [
          { requestStart: 100, responseStart: 150 },
        ],
      };

      // Override the global performance object
      const originalPerformance = window.performance;
      window.performance = mockPerformance;

      // Execute the code
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      // Calculate expected TTFB for V2
      const ttfbExpected = Math.round(
        mockPerformance.getEntriesByType('navigation')[0].responseStart -
        mockPerformance.getEntriesByType('navigation')[0].requestStart
      ).toString();

      // Assertions
      expect(payload.timeToFirstByte).to.exist;
      expect(payload.timeToFirstByte).to.deep.equal(ttfbExpected);

      // Restore the original performance object
      window.performance = originalPerformance;
    });

    it('should add timeToFirstByte info to payload for Navigation Timing V1', function () {
      // Mock `performance` object with Navigation Timing V1 data
      const mockPerformance = {
        timing: {
          requestStart: 100,
          responseStart: 150,
        },
        getEntriesByType: () => [],
      };

      // Override the global performance object
      const originalPerformance = window.performance;
      window.performance = mockPerformance;

      // Execute the code
      const request = spec.buildRequests(bidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      // Calculate expected TTFB for V1
      const ttfbExpected = (
        mockPerformance.timing.responseStart - mockPerformance.timing.requestStart
      ).toString();

      // Assertions
      expect(payload.timeToFirstByte).to.exist;
      expect(payload.timeToFirstByte).to.deep.equal(ttfbExpected);

      // Restore the original performance object
      window.performance = originalPerformance;
    });

    it('should send GDPR to endpoint with 11 status', function () {
      const consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      const bidderRequest = {
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

    it('should send GDPR TCF2 to endpoint with 12 status', function () {
      const consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      const bidderRequest = {
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

    it('should send GDPR to endpoint with 22 status', function () {
      const bidderRequest = {
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

    it('should send GDPR to endpoint with 0 status', function () {
      const consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      const bidderRequest = {
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

    it('should send GDPR to endpoint with 0 status when gdprApplies = false (vendorData = undefined)', function () {
      const bidderRequest = {
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

    it('should send GDPR to endpoint with 12 status when apiVersion = 0', function () {
      const consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      const bidderRequest = {
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

    it('should add schain info to payload if available', function () {
      const bidRequest = Object.assign({}, bidRequests[0], {
        ortb2: {
          source: {
            ext: {
              schain: {
                ver: '1.0',
                complete: 1,
                nodes: [{
                  asi: 'example.com',
                  sid: '00001',
                  hp: 1
                }]
              }
            }
          }
        }
      });

      const request = spec.buildRequests([bidRequest], bidderRequestDefault);
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
      const sua = {
        source: 2,
        platform: {
          brand: 'macOS',
          version: ['12', '4', '0']
        },
        browsers: [
          {
            brand: 'Chromium',
            version: ['106', '0', '5249', '119']
          },
          {
            brand: 'Google Chrome',
            version: ['106', '0', '5249', '119']
          },
          {
            brand: 'Not;A=Brand',
            version: ['99', '0', '0', '0']
          }
        ],
        mobile: 0,
        model: '',
        bitness: '64',
        architecture: 'x86'
      }

      const bidRequest = Object.assign({}, bidRequests[0], {
        ortb2: {
          device: {
            sua: sua
          }
        }
      });

      const requestWithUserAgentClientHints = spec.buildRequests([bidRequest], bidderRequestDefault);
      const payload = JSON.parse(requestWithUserAgentClientHints.data);

      expect(payload.userAgentClientHints).to.exist;
      expect(payload.userAgentClientHints).to.deep.equal(sua);

      const defaultRequest = spec.buildRequests(bidRequests, bidderRequestDefault);
      expect(JSON.parse(defaultRequest.data).userAgentClientHints).to.not.exist;
    });

    it('should use good mediaTypes banner sizes', function () {
      const mediaTypesBannerSize = {
        'mediaTypes': {
          'banner': {
            'sizes': [300, 250]
          }
        }
      };
      checkMediaTypesSizes(mediaTypesBannerSize, '300x250');
    });
  });

  describe('Global Placement Id', function () {
    const bidRequests = [
      {
        'bidder': 'greenbids',
        'params': {
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
        'bidder': 'greenbids',
        'params': {
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
      const updatedBidRequests = bidRequests.map(function (bidRequest, index) {
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
      const request = spec.buildRequests(updatedBidRequests, bidderRequestDefault);
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

      const request = spec.buildRequests(updatedBidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      payload.data.forEach(bid => {
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

      const request = spec.buildRequests(updatedBidRequests, bidderRequestDefault);
      const payload = JSON.parse(request.data);

      payload.data.forEach(bid => {
        expect(bid).not.to.have.property('gpid');
      });
    });

    it('should add dsa info to payload if available', function () {
      const bidRequestWithDsa = Object.assign({}, bidderRequestDefault, {
        ortb2: {
          regs: {
            ext: {
              dsa: {
                dsarequired: '1',
                pubrender: '2',
                datatopub: '3',
                transparency: [{
                  domain: 'test.com',
                  dsaparams: [1, 2, 3]
                }]
              }
            }
          }
        }
      });

      const requestWithDsa = spec.buildRequests(bidRequests, bidRequestWithDsa);
      const payload = JSON.parse(requestWithDsa.data);

      expect(payload.dsa).to.exist;
      expect(payload.dsa).to.deep.equal(
        {
          dsarequired: '1',
          pubrender: '2',
          datatopub: '3',
          transparency: [{
            domain: 'test.com',
            dsaparams: [1, 2, 3]
          }]
        }
      );

      const defaultRequest = spec.buildRequests(bidRequests, bidderRequestDefault);
      expect(JSON.parse(defaultRequest.data).dsa).to.not.exist;
    });
  });

  describe('interpretResponse', function () {
    it('should get correct bid responses', function () {
      const bids = {
        'body': {
          'responses': [{
            'ad': AD_SCRIPT,
            'cpm': 0.5,
            'currency': 'USD',
            'height': 250,
            'size': '200x100',
            'bidId': '3ede2a3fa0db94',
            'ttl': 360,
            'width': 300,
            'creativeId': 'er2ee',
            'placementId': 4242
          }, {
            'ad': AD_SCRIPT,
            'cpm': 0.5,
            'currency': 'USD',
            'height': 200,
            'size': '300x150',
            'bidId': '4fef3b4gb1ec15',
            'ttl': 360,
            'width': 350,
            'creativeId': 'fs3ff',
            'placementId': 4242,
            'dealId': 'ABC_123',
            'ext': {
              'dsa': {
                'behalf': 'some-behalf',
                'paid': 'some-paid',
                'transparency': [{
                  'domain': 'test.com',
                  'dsaparams': [1, 2, 3]
                }],
                'adrender': 1
              }
            }
          }]
        }
      };
      const expectedResponse = [
        {
          'cpm': 0.5,
          'width': 300,
          'height': 250,
          'size': '200x100',
          'currency': 'USD',
          'netRevenue': true,
          'meta': {
            advertiserDomains: []
          },
          'ttl': 360,
          'ad': AD_SCRIPT,
          'requestId': '3ede2a3fa0db94',
          'creativeId': 'er2ee',
          'placementId': 4242
        }, {
          'cpm': 0.5,
          'width': 350,
          'height': 200,
          'size': '300x150',
          'currency': 'USD',
          'netRevenue': true,
          'meta': {
            advertiserDomains: [],
            dsa: {
              behalf: 'some-behalf',
              paid: 'some-paid',
              transparency: [{
                domain: 'test.com',
                dsaparams: [1, 2, 3]
              }],
              adrender: 1
            }
          },
          'ttl': 360,
          'ad': AD_SCRIPT,
          'requestId': '4fef3b4gb1ec15',
          'creativeId': 'fs3ff',
          'placementId': 4242,
          'dealId': 'ABC_123'
        }
      ]
        ;

      const result = spec.interpretResponse(bids);
      expect(result).to.eql(expectedResponse);
    });

    it('handles nobid responses', function () {
      const bids = {
        'body': {
          'responses': []
        }
      };

      const result = spec.interpretResponse(bids);
      expect(result.length).to.equal(0);
    });
  });
});
