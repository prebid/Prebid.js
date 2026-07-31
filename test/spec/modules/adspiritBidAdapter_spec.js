import { expect } from 'chai';
import { spec } from 'modules/adspiritBidAdapter.js';
import { getWinDimensions, resetWinDimensions } from 'src/utils.js';

describe('Adspirit Bidder Spec', function () {
  // isBidRequestValid ---case
  describe('isBidRequestValid', function () {
    it('should return true if the bid request is valid', function () {
      const validBid = { bidder: 'adspirit', params: { placementId: '99', host: 'test.adspirit.de' } };
      const result = spec.isBidRequestValid(validBid);
      expect(result).to.be.true;
    });

    it('should return false if the bid request is invalid', function () {
      const invalidBid = { bidder: 'adspirit', params: {} };
      const result = spec.isBidRequestValid(invalidBid);
      expect(result).to.be.false;
    });
  });

  // getBidderHost Case
  describe('getBidderHost', function () {
    it('should return host for adspirit bidder', function () {
      const bid = { bidder: 'adspirit', params: { host: 'test.adspirit.de' } };
      const result = spec.getBidderHost(bid);
      expect(result).to.equal('test.adspirit.de');
    });

    it('should return host for twiago bidder', function () {
      const bid = { bidder: 'twiago' };
      const result = spec.getBidderHost(bid);
      expect(result).to.equal('a.twiago.com');
    });
    it('should return null for unsupported bidder', function () {
      const bid = { bidder: 'unsupportedBidder', params: {} };
      const result = spec.getBidderHost(bid);
      expect(result).to.be.null;
    });
  });

  // genAdConId Case
  describe('genAdConId', function () {
    it('should generate a unique ad connection ID for adspirit bidder', function () {
      const bid = { bidder: 'adspirit' };
      const result1 = spec.genAdConId(bid);
      const result2 = spec.genAdConId(bid);
      expect(result1).to.be.a('string');
      expect(result1).to.include('adspirit');
      expect(result1).to.not.equal(result2);
    });

    it('should generate a unique ad connection ID for twiago bidder', function () {
      const bid = { bidder: 'twiago' };
      const result = spec.genAdConId(bid);
      expect(result).to.be.a('string');
      expect(result).to.include('twiago');
    });

    it('should generate different IDs on subsequent calls', function () {
      const bid = { bidder: 'adspirit' };
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(spec.genAdConId(bid));
      }
      expect(ids.size).to.be.greaterThan(1);
    });
  });

  // getScriptUrl
  describe('getScriptUrl', function () {
    it('should return the correct script URL', function () {
      expect(spec.getScriptUrl()).to.equal('/adasync.min.js');
    });
  });

  // Edge case tests
  describe('Edge Cases', function () {
    it('should handle missing screen dimensions gracefully', function () {
      const originalScreen = window.screen;
      Object.defineProperty(window, 'screen', {
        writable: true,
        configurable: true,
        value: undefined
      });

      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];

      expect(request.url).to.include('&scx=0');
      expect(request.url).to.include('&scy=0');

      Object.defineProperty(window, 'screen', {
        writable: true,
        configurable: true,
        value: originalScreen
      });
    });

    it('should handle navigator.language with region code', function () {
      const originalLanguage = navigator.language;
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'en-US'
      });

      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);

      expect(requestData.device.language).to.equal('en');

      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: originalLanguage
      });
    });

    it('should handle navigator.language without region code', function () {
      const originalLanguage = navigator.language;
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'de'
      });

      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);

      expect(requestData.device.language).to.equal('de');

      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: originalLanguage
      });
    });

    it('should handle empty navigator.language', function () {
      const originalLanguage = navigator.language;
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: ''
      });

      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);

      expect(requestData.device.language).to.equal('');

      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: originalLanguage
      });
    });

    it('should not include gdpr parameters when gdprConsent is missing', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' }
      };

      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];

      expect(request.url).to.not.include('&gdpr=');
      expect(request.url).to.not.include('&gdpr_consent=');
    });

    it('should handle gdprConsent with gdprApplies false', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' },
        gdprConsent: {
          gdprApplies: false,
          consentString: ''
        }
      };

      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);

      expect(request.url).to.include('&gdpr=0');
      expect(requestData.regs.ext.gdpr).to.equal(0);
    });
  });

  // Test cases for buildRequests
  describe('Adspirit Bidder Spec', function () {
    let originalInnerWidth;
    let originalInnerHeight;
    let originalClientWidth;
    let originalClientHeight;

    beforeEach(() => {
      originalInnerWidth = window.innerWidth;
      originalInnerHeight = window.innerHeight;
      originalClientWidth = document.documentElement.clientWidth;
      originalClientHeight = document.documentElement.clientHeight;

      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
      Object.defineProperty(document.documentElement, 'clientWidth', { writable: true, configurable: true, value: 800 });
      Object.defineProperty(document.documentElement, 'clientHeight', { writable: true, configurable: true, value: 600 });
      resetWinDimensions();
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalInnerHeight });
      Object.defineProperty(document.documentElement, 'clientWidth', { writable: true, configurable: true, value: originalClientWidth });
      Object.defineProperty(document.documentElement, 'clientHeight', { writable: true, configurable: true, value: originalClientHeight });
      resetWinDimensions();
    });

    it('should correctly capture window and document dimensions in payload', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];
      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const expectedDimensions = getWinDimensions();
      const [request] = spec.buildRequests(bidRequest, mockBidderRequest);
      const requestData = JSON.parse(request.data);

      expect(request.url).to.include(`&wcx=${expectedDimensions.innerWidth}`);
      expect(request.url).to.include(`&wcy=${expectedDimensions.innerHeight}`);
      expect(requestData.device.w).to.equal(expectedDimensions.innerWidth);
      expect(requestData.device.h).to.equal(expectedDimensions.innerHeight);
    });

    it('should correctly pass through window dimensions when properties are unavailable', function () {
      delete global.window.innerWidth;
      delete global.window.innerHeight;
      resetWinDimensions();
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];
      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const expectedDimensions = getWinDimensions();
      const [request] = spec.buildRequests(bidRequest, mockBidderRequest);
      const requestData = JSON.parse(request.data);

      expect(request.url).to.include(`&wcx=${expectedDimensions.innerWidth}`);
      expect(request.url).to.include(`&wcy=${expectedDimensions.innerHeight}`);
      expect(requestData.device.w).to.equal(expectedDimensions.innerWidth);
      expect(requestData.device.h).to.equal(expectedDimensions.innerHeight);
    });
    it('should correctly add GDPR consent parameters to the request', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' },
        gdprConsent: {
          gdprApplies: true,
          consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA'
        }
      };

      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      expect(request.url).to.include('&gdpr=1');
      expect(request.url).to.include('&gdpr_consent=BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA');
      const requestData = JSON.parse(request.data);
      expect(requestData.regs.ext.gdpr).to.equal(1);
      expect(requestData.regs.ext.gdpr_consent).to.equal(mockBidderRequest.gdprConsent.consentString);
    });

    it('should correctly include schain in the OpenRTB request if provided', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          },
          ortb2: {
            source: {
              ext: {
                schain: {
                  ver: '1.0',
                  complete: 1,
                  nodes: [
                    {
                      asi: 'publisher.com',
                      sid: '1234',
                      hp: 1
                    }
                  ]
                }
              }
            }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);
      expect(requestData.source).to.exist;
      expect(requestData.source.ext).to.exist;
      expect(requestData.source.ext.schain).to.deep.equal(bidRequest[0].ortb2.source.ext.schain);
    });
    it('should correctly handle bidfloor values (valid, missing, and non-numeric)', function () {
      const bidRequest = [
        {
          bidId: 'validBidfloor',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de', bidfloor: '1.23' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        },
        {
          bidId: 'missingBidfloor',
          bidder: 'adspirit',
          params: { placementId: '100', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        },
        {
          bidId: 'invalidBidfloor',
          bidder: 'adspirit',
          params: { placementId: '101', host: 'test.adspirit.de', bidfloor: 'abc' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const requestData = requests.map(req => JSON.parse(req.data));
      expect(requestData[0].imp[0].bidfloor).to.equal(1.23);
      expect(requestData[1].imp[0].bidfloor).to.equal(0);
      expect(requestData[2].imp[0].bidfloor || 0).to.equal(0);
    });
    it('should correctly add  and handle banner/native media types', function () {
      const bidRequest = [
        {
          bidId: 'validBannerNative',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'test-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] },
            native: {
              ortb: {
                assets: [{ id: 1, required: 1, title: { len: 100 } }]
              }
            }
          }
        },
        {
          bidId: 'noBanner',
          bidder: 'adspirit',
          params: { placementId: '100', host: 'test.adspirit.de' },
          adUnitCode: 'no-banner-div',
          mediaTypes: {
            banner: {}
          }
        },
        {
          bidId: 'emptyNative',
          bidder: 'adspirit',
          params: { placementId: '101', host: 'test.adspirit.de' },
          adUnitCode: 'empty-native-div',
          mediaTypes: {
            native: {
              ortb: {
                assets: []
              }
            }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = requests.map(req => JSON.parse(req.data));

      expect(requestData[0].imp[0]).to.have.property('banner');
      expect(requestData[0].imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);

      expect(requestData[0].imp[0]).to.have.property('native');
      expect(request.url).to.include('&native=1');
      expect(JSON.parse(requestData[0].imp[0].native.request).assets).to.deep.equal([
        { id: 1, required: 1, title: { len: 100 } },
        { id: 2, required: 1, img: { type: 3, wmin: 1200, hmin: 627, mimes: ['image/png', 'image/gif', 'image/jpeg'] } },
        { id: 4, required: 1, data: { type: 2, len: 150 } },
        { id: 3, required: 0, data: { type: 12, len: 50 } },
        { id: 6, required: 0, data: { type: 1, len: 50 } },
        { id: 5, required: 0, img: { type: 1, wmin: 50, hmin: 50, mimes: ['image/png', 'image/gif', 'image/jpeg'] } }
      ]);

      expect(requestData[1].imp[0]).to.not.have.property('banner');

      expect(requestData[2].imp[0]).to.have.property('native');
      expect(requests[2].url).to.include('&native=1');
      expect(JSON.parse(requestData[2].imp[0].native.request).assets).to.deep.equal([
        { id: 1, required: 1, title: { len: 100 } },
        { id: 2, required: 1, img: { type: 3, wmin: 1200, hmin: 627, mimes: ['image/png', 'image/gif', 'image/jpeg'] } },
        { id: 4, required: 1, data: { type: 2, len: 150 } },
        { id: 3, required: 0, data: { type: 12, len: 50 } },
        { id: 6, required: 0, data: { type: 1, len: 50 } },
        { id: 5, required: 0, img: { type: 1, wmin: 50, hmin: 50, mimes: ['image/png', 'image/gif', 'image/jpeg'] } }
      ]);
    });

    it('should correctly handle native ORTB request at mediaTypes.native.request.ortb', function () {
      const bidRequest = [
        {
          bidId: 'nativeRequestPath',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'test-div',
          mediaTypes: {
            native: {
              request: {
                ortb: {
                  assets: [{ id: 123, required: 1, title: { len: 50 } }]
                }
              }
            }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const requestData = JSON.parse(requests[0].data);

      expect(JSON.parse(requestData.imp[0].native.request).assets).to.deep.equal([
        { id: 123, required: 1, title: { len: 50 } }
      ]);
      expect(bidRequest[0].mediaTypes.native.request.ortb.assets[0].id).to.equal(123);
      expect(bidRequest[0].mediaTypes.native.ortb.assets[0].id).to.equal(123);
    });

    it('should correctly handle custom native asset IDs and map them in response', function () {
      const bidRequest = [
        {
          bidId: 'customAssets',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'custom-native',
          mediaTypes: {
            native: {
              ortb: {
                assets: [
                  { id: 10, required: 1, title: { len: 100 } },
                  { id: 20, required: 1, img: { type: 3, w: 1200, h: 627 } }
                ]
              }
            }
          },
          nativeOrtbRequest: {
            assets: [
              { id: 10, required: 1, title: { len: 100 } },
              { id: 20, required: 1, img: { type: 3, w: 1200, h: 627 } }
            ]
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];

      expect(request.nativeOrtbRequest).to.exist;

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: 'customAssets',
              price: 1.0,
              adm: JSON.stringify({
                native: {
                  assets: [
                    { id: 10, title: { text: 'Custom Title' } },
                    { id: 20, img: { url: 'https://example.com/custom.jpg', w: 1200, h: 627 } }
                  ],
                  link: { url: 'https://custom-click.com' }
                }
              })
            }]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, request);
      expect(result[0].native.title).to.equal('Custom Title');
      expect(result[0].native.image.url).to.equal('https://example.com/custom.jpg');
      expect(result[0].native.clickUrl).to.equal('https://custom-click.com');
      expect(result[0].native.ortb).to.exist;
      expect(result[0].native.ortb.assets).to.be.an('array');
      expect(result[0].native.ortb.link.url).to.equal('https://custom-click.com');
    });

    it('should include eids in OpenRTB request when userIdAsEids is present', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          },
          userIdAsEids: [
            {
              source: 'pubcid.org',
              uids: [{ id: 'test-pubcid-123', atype: 1 }]
            },
            {
              source: 'id5-sync.com',
              uids: [{ id: 'id5-test-456', atype: 1 }]
            }
          ]
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);

      expect(requestData.user.ext.eids).to.deep.equal(bidRequest[0].userIdAsEids);
      expect(requestData.user.ext.eids).to.have.lengthOf(2);
      expect(requestData.user.ext.eids[0].source).to.equal('pubcid.org');
      expect(requestData.user.ext.eids[1].source).to.equal('id5-sync.com');
    });

    it('should include userData in OpenRTB request when present', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          },
          userData: [
            { name: 'segment1', value: 'value1' },
            { name: 'segment2', value: 'value2' }
          ]
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);

      expect(requestData.user.data).to.deep.equal(bidRequest[0].userData);
      expect(requestData.user.data).to.have.lengthOf(2);
    });

    it('should include auctionId in OpenRTB request', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' },
        auctionId: 'test-auction-id-12345'
      };

      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);

      expect(requestData.id).to.equal('test-auction-id-12345');
    });

    it('should include geo data in OpenRTB request when present', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' },
        geo: {
          lat: 52.5200,
          lon: 13.4050,
          country: 'DE'
        }
      };

      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);

      expect(requestData.device.geo.lat).to.equal(52.5200);
      expect(requestData.device.geo.lon).to.equal(13.4050);
      expect(requestData.device.geo.country).to.equal('DE');
    });

    it('should include site parameters in OpenRTB request when provided', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: {
            placementId: '99',
            host: 'test.adspirit.de',
            siteId: 'site-123',
            publisherId: 'pub-456',
            publisherName: 'Test Publisher'
          },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);

      expect(requestData.site.id).to.equal('site-123');
      expect(requestData.site.publisher.id).to.equal('pub-456');
      expect(requestData.site.publisher.name).to.equal('Test Publisher');
    });

    it('should include prebidVersion in OpenRTB request ext', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);

      expect(requestData.ext.prebidVersion).to.be.a('string');
      expect(requestData.ext.adUnitCode.prebidVersion).to.be.a('string');
    });
  });

  // getEids function
  describe('getEids', function () {
    it('should return userIdAsEids when present', function () {
      const bidRequest = {
        userIdAsEids: [
          {
            source: 'pubcid.org',
            uids: [{ id: 'test-pubcid', atype: 1 }]
          }
        ]
      };
      const result = spec.getEids(bidRequest);
      expect(result).to.deep.equal(bidRequest.userIdAsEids);
    });

    it('should return an empty array when userIdAsEids is missing', function () {
      const bidRequest = {};
      const result = spec.getEids(bidRequest);
      expect(result).to.deep.equal([]);
    });
  });
  // interpretResponse
  describe('interpretResponse', function () {
    const validBidRequestMock = {
      bidRequest: {
        bidId: '123456',
        bidder: 'adspirit',
        params: {
          placementId: '57',
          adomain: ['test.adspirit.de']
        }
      }
    };

    it('should return an empty array when serverResponse is missing', function () {
      const result = spec.interpretResponse(null, validBidRequestMock);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return an empty array when serverResponse.body is missing', function () {
      const result = spec.interpretResponse({}, validBidRequestMock);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should correctly parse a valid banner ad response', function () {
      const serverResponse = {
        body: {
          cpm: 2.0,
          w: 728,
          h: 90,
          adm: '<div>Banner Ad Content</div>',
          adomain: ['siva.adspirit.de']
        }
      };

      const result = spec.interpretResponse(serverResponse, validBidRequestMock);
      expect(result.length).to.equal(1);
      const bid = result[0];
      expect(bid).to.include({
        requestId: '123456',
        cpm: 2.0,
        width: 728,
        height: 90,
        currency: 'EUR',
        netRevenue: true,
        ttl: 300
      });

      expect(bid).to.have.property('mediaType', 'banner');
      expect(bid.ad).to.include('<script>window.inDapIF=false</script>');
      expect(bid.ad).to.include('<div>Banner Ad Content</div>');
    });

    it('should return empty array if banner ad response has missing CPM', function () {
      const serverResponse = {
        body: {
          w: 728,
          h: 90,
          adm: '<div>Ad Content</div>'
        }
      };
      const result = spec.interpretResponse(serverResponse, validBidRequestMock);
      expect(result.length).to.equal(0);
    });

    it('should correctly handle default values for width, height, creativeId, currency, and advertiserDomains', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: '123456',
              price: 1.8,
              crid: undefined,
              w: undefined,
              h: undefined,
              adomain: undefined
            }]
          }],
          cur: undefined
        }
      };

      const validBidRequestMock = {
        bidRequest: {
          bidId: '987654',
          params: { placementId: '57' }
        }
      };

      const result = spec.interpretResponse(serverResponse, validBidRequestMock);
      expect(result.length).to.equal(1);

      const bid = result[0];

      expect(bid.width).to.equal(1);
      expect(bid.height).to.equal(1);

      expect(bid.creativeId).to.equal('123456');
      expect(bid.currency).to.equal('EUR');
      expect(bid.meta.advertiserDomains).to.deep.equal([]);
    });

    it('should correctly parse a valid native ad response, ensuring all assets are loaded dynamically with extra fields', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: '123456',
              price: 1.5,
              w: 320,
              h: 50,
              crid: 'creative789',
              adomain: ['test.adspirit.de'],
              adm: JSON.stringify({
                native: {
                  assets: [
                    { id: 1, title: { text: 'Primary Title' } },
                    { id: 4, data: { value: 'Main Description' } },
                    { id: 4, data: { value: 'Extra Description' } },
                    { id: 3, data: { value: 'Main CTA' } },
                    { id: 3, data: { value: 'Additional CTA' } },
                    { id: 2, img: { url: 'https://example.com/main-image.jpg', w: 100, h: 100 } },
                    { id: 2, img: { url: 'https://example.com/extra-image.jpg', w: 200, h: 200 } },
                    { id: 5, img: { url: 'https://example.com/icon-main.jpg', w: 50, h: 50 } },
                    { id: 5, img: { url: 'https://example.com/icon-extra.jpg', w: 60, h: 60 } },
                    { id: 6, data: { value: 'Main Sponsor' } },
                    { id: 6, data: { value: 'Secondary Sponsor' } }
                  ],
                  link: { url: 'https://clickurl.com' },
                  imptrackers: ['https://tracker.com/impression']
                }
              })
            }]
          }],
          cur: 'EUR'
        }
      };

      const validBidRequestMock = {
        bidRequest: {
          bidId: '987654',
          params: { placementId: '57' }
        },
        nativeAssets: [
          { id: 1, required: 1, title: { len: 100 } },
          { id: 2, required: 1, img: { type: 3 } },
          { id: 4, required: 1, data: { type: 2 } },
          { id: 3, required: 0, data: { type: 12 } },
          { id: 6, required: 0, data: { type: 1 } },
          { id: 5, required: 0, img: { type: 1 } }
        ]
      };

      const result = spec.interpretResponse(serverResponse, validBidRequestMock);
      expect(result.length).to.equal(1);

      const bid = result[0];

      expect(bid.native.title).to.equal('Primary Title');
      expect(bid.native.body).to.equal('Main Description');
      expect(bid.native['data_4_extra1']).to.equal('Extra Description');

      expect(bid.native.cta).to.equal('Main CTA');
      expect(bid.native['data_3_extra1']).to.equal('Additional CTA');

      expect(bid.native.sponsoredBy).to.equal('Main Sponsor');
      expect(bid.native['data_6_extra1']).to.equal('Secondary Sponsor');
      expect(bid.native.image.url).to.equal('https://example.com/main-image.jpg');
      expect(bid.native.image.width).to.equal(100);
      expect(bid.native.image.height).to.equal(100);
      expect(bid.native['image_2_extra1']).to.deep.equal({
        url: 'https://example.com/extra-image.jpg',
        width: 200,
        height: 200
      });

      expect(bid.native.icon.url).to.equal('https://example.com/icon-main.jpg');
      expect(bid.native.icon.width).to.equal(50);
      expect(bid.native.icon.height).to.equal(50);
      expect(bid.native['image_5_extra1']).to.deep.equal({
        url: 'https://example.com/icon-extra.jpg',
        width: 60,
        height: 60
      });
      expect(bid.native.impressionTrackers).to.deep.equal(['https://tracker.com/impression']);
    });

    it('should skip native bid when nativeOrtbRequest is missing', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: '123456',
              price: 1.5,
              adm: JSON.stringify({
                native: {
                  assets: [
                    { id: 1, title: { text: 'Test Title' } }
                  ],
                  link: { url: 'https://example.com' }
                }
              })
            }]
          }]
        }
      };

      const validBidRequestMock = {
        bidRequest: {
          bidId: '123456',
          params: { placementId: '57' }
        },
        nativeOrtbRequest: null
      };

      const result = spec.interpretResponse(serverResponse, validBidRequestMock);
      expect(result.length).to.equal(0);
    });

    it('should parse adm when it is a JSON string', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: '123456',
              price: 1.5,
              w: 300,
              h: 250,
              adm: '{"native":{"assets":[{"id":1,"title":{"text":"Parsed Title"}}],"link":{"url":"https://parsed.com"}}}',
              crid: 'creative123'
            }]
          }]
        }
      };

      const validBidRequestMock = {
        bidRequest: {
          bidId: '123456',
          params: { placementId: '57' }
        },
        nativeOrtbRequest: {
          assets: [{ id: 1, required: 1, title: { len: 100 } }]
        }
      };

      const result = spec.interpretResponse(serverResponse, validBidRequestMock);
      expect(result.length).to.equal(1);
      expect(result[0].native.title).to.equal('Parsed Title');
      expect(result[0].native.clickUrl).to.equal('https://parsed.com');
    });

    it('should use custom ver value from native response', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: '123456',
              price: 1.5,
              adm: JSON.stringify({
                native: {
                  ver: '1.1',
                  assets: [
                    { id: 1, title: { text: 'Test Title' } }
                  ],
                  link: { url: 'https://example.com' }
                }
              })
            }]
          }]
        }
      };

      const validBidRequestMock = {
        bidRequest: {
          bidId: '123456',
          params: { placementId: '57' }
        },
        nativeOrtbRequest: {
          ver: '1.1',
          assets: [{ id: 1, required: 1, title: { len: 100 } }]
        }
      };

      const result = spec.interpretResponse(serverResponse, validBidRequestMock);
      expect(result.length).to.equal(1);
      expect(result[0].native.ortb.ver).to.equal('1.1');
    });

    it('should use exp value from bid response for TTL', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: '123456',
              price: 1.8,
              w: 728,
              h: 90,
              exp: 600,
              crid: 'creative456'
            }]
          }]
        }
      };

      const validBidRequestMock = {
        bidRequest: {
          bidId: '123456',
          params: { placementId: '57' }
        }
      };

      const result = spec.interpretResponse(serverResponse, validBidRequestMock);
      expect(result.length).to.equal(1);
      expect(result[0].ttl).to.equal(600);
    });

    it('should default TTL to 300 when exp is not provided', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: '123456',
              price: 1.8,
              w: 728,
              h: 90,
              crid: 'creative456'
            }]
          }]
        }
      };

      const validBidRequestMock = {
        bidRequest: {
          bidId: '123456',
          params: { placementId: '57' }
        }
      };

      const result = spec.interpretResponse(serverResponse, validBidRequestMock);
      expect(result.length).to.equal(1);
      expect(result[0].ttl).to.equal(300);
    });

    it('should handle invalid JSON in adm string gracefully', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: '123456',
              price: 1.5,
              w: 300,
              h: 250,
              adm: 'invalid json string',
              crid: 'creative123'
            }]
          }]
        }
      };

      const validBidRequestMock = {
        bidRequest: {
          bidId: '123456',
          params: { placementId: '57' }
        }
      };

      const result = spec.interpretResponse(serverResponse, validBidRequestMock);
      expect(result.length).to.equal(1);
    });
  });

  // Integration tests
  describe('Integration Tests', function () {
    it('should handle multiple validBidRequests in a single call', function () {
      const bidRequests = [
        {
          bidId: 'bid1',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div-1',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        },
        {
          bidId: 'bid2',
          bidder: 'adspirit',
          params: { placementId: '100', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div-2',
          mediaTypes: {
            banner: { sizes: [[728, 90]] }
          }
        },
        {
          bidId: 'bid3',
          bidder: 'adspirit',
          params: { placementId: '101', host: 'test.adspirit.de' },
          adUnitCode: 'native-div',
          mediaTypes: {
            native: {
              ortb: {
                assets: [{ id: 1, required: 1, title: { len: 100 } }]
              }
            }
          },
          nativeOrtbRequest: {
            assets: [{ id: 1, required: 1, title: { len: 100 } }]
          }
        }
      ];

      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' },
        auctionId: 'test-auction-123'
      };

      const requests = spec.buildRequests(bidRequests, mockBidderRequest);

      expect(requests).to.have.lengthOf(3);
      expect(requests[0].bidRequest.bidId).to.equal('bid1');
      expect(requests[1].bidRequest.bidId).to.equal('bid2');
      expect(requests[2].bidRequest.bidId).to.equal('bid3');

      const requestData1 = JSON.parse(requests[0].data);
      const requestData2 = JSON.parse(requests[1].data);
      const requestData3 = JSON.parse(requests[2].data);

      expect(requestData1.imp[0].ext.placementId).to.equal('99');
      expect(requestData2.imp[0].ext.placementId).to.equal('100');
      expect(requestData3.imp[0].ext.placementId).to.equal('101');

      expect(requestData1.id).to.equal('test-auction-123');
      expect(requestData2.id).to.equal('test-auction-123');
      expect(requestData3.id).to.equal('test-auction-123');
    });

    it('should work correctly with twiago alias for buildRequests', function () {
      const bidRequest = [
        {
          bidId: 'twiago-bid-1',
          bidder: 'twiago',
          params: { placementId: '99' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' }
      };

      const requests = spec.buildRequests(bidRequest, mockBidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].url).to.include('//a.twiago.com/rtb/getbid.php');
      expect(requests[0].url).to.include('pid=99');
    });

    it('should work correctly with twiago alias for interpretResponse', function () {
      const serverResponse = {
        body: {
          cpm: 2.5,
          w: 300,
          h: 250,
          adm: '<div>Twiago Ad</div>',
          adomain: ['twiago.com']
        }
      };

      const validBidRequestMock = {
        bidRequest: {
          bidId: 'twiago-bid-1',
          bidder: 'twiago',
          params: { placementId: '99' },
          adspiritConId: 'twiago12345'
        }
      };

      const result = spec.interpretResponse(serverResponse, validBidRequestMock);

      expect(result.length).to.equal(1);
      expect(result[0].requestId).to.equal('twiago-bid-1');
      expect(result[0].cpm).to.equal(2.5);
      expect(result[0].ad).to.include('<ins id="twiago12345"></ins>');
      expect(result[0].ad).to.include('<div>Twiago Ad</div>');
    });

    it('should correctly set adspiritConId on bidRequest in buildRequests', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          }
        }
      ];

      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' }
      };

      const requests = spec.buildRequests(bidRequest, mockBidderRequest);

      expect(bidRequest[0].adspiritConId).to.be.a('string');
      expect(bidRequest[0].adspiritConId).to.include('adspirit');
      expect(requests[0].url).to.include(`&async=${bidRequest[0].adspiritConId}`);
    });

    it('should handle mixed banner and native bids in single request', function () {
      const bidRequests = [
        {
          bidId: 'banner-bid',
          bidder: 'adspirit',
          params: { placementId: '99', host: 'test.adspirit.de' },
          adUnitCode: 'banner-div',
          mediaTypes: {
            banner: { sizes: [[300, 250], [728, 90]] }
          }
        },
        {
          bidId: 'native-bid',
          bidder: 'adspirit',
          params: { placementId: '100', host: 'test.adspirit.de' },
          adUnitCode: 'native-div',
          mediaTypes: {
            native: {
              ortb: {
                assets: [
                  { id: 1, required: 1, title: { len: 100 } },
                  { id: 2, required: 1, img: { type: 3, w: 1200, h: 627 } }
                ]
              }
            }
          },
          nativeOrtbRequest: {
            assets: [
              { id: 1, required: 1, title: { len: 100 } },
              { id: 2, required: 1, img: { type: 3, w: 1200, h: 627 } }
            ]
          }
        }
      ];

      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' }
      };

      const requests = spec.buildRequests(bidRequests, mockBidderRequest);

      expect(requests).to.have.lengthOf(2);

      const bannerRequestData = JSON.parse(requests[0].data);
      const nativeRequestData = JSON.parse(requests[1].data);

      expect(bannerRequestData.imp[0].banner).to.exist;
      expect(bannerRequestData.imp[0].banner.format).to.have.lengthOf(2);
      expect(bannerRequestData.imp[0].banner.format[0]).to.deep.equal({ w: 300, h: 250 });
      expect(bannerRequestData.imp[0].banner.format[1]).to.deep.equal({ w: 728, h: 90 });

      expect(nativeRequestData.imp[0].native).to.exist;
      expect(JSON.parse(nativeRequestData.imp[0].native.request).assets).to.have.lengthOf(2);
    });
  });
});
