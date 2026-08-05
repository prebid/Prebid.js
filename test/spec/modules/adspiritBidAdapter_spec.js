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

    it('should return false when host exists but placementId is missing', function () {
      const invalidBid = {
        bidder: 'adspirit',
        params: {
          host: 'test.adspirit.de'
        }
      };

      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
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
  // getScriptUrl

  describe('Adspirit Bid Adapter', function () {
    describe('getScriptUrl', function () {
      it('should return the correct script URL', function () {
        expect(spec.getScriptUrl()).to.equal('/adasync.min.js');
      });
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
    if (FEATURES.NATIVE) {
      it('should correctly add and handle banner/native media types', function () {
        const nativeOrtbRequest = {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 100 } }
          ]
        };

        const bidRequest = [
          {
            bidId: 'validBannerNative',
            bidder: 'adspirit',
            params: { placementId: '99', host: 'test.adspirit.de' },
            adUnitCode: 'test-div',
            mediaTypes: {
              banner: { sizes: [[300, 250]] },
              native: {
                ortb: nativeOrtbRequest
              }
            },
            nativeOrtbRequest
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
            bidId: 'invalidNative',
            bidder: 'adspirit',
            params: { placementId: '101', host: 'test.adspirit.de' },
            adUnitCode: 'invalid-native-div',
            mediaTypes: {
              native: {
                ortb: {
                  assets: []
                }
              }
            }
          }
        ];

        const mockBidderRequest = {
          refererInfo: { topmostLocation: 'https://test.adspirit.com' }
        };
        const requests = spec.buildRequests(bidRequest, mockBidderRequest);
        const requestData = requests.map(request => JSON.parse(request.data));

        expect(requestData[0].imp[0]).to.have.property('banner');
        expect(requestData[0].imp[0].banner.format).to.deep.equal([
          { w: 300, h: 250 }
        ]);
        expect(requestData[0].imp[0]).to.have.property('native');
        expect(JSON.parse(requestData[0].imp[0].native.request)).to.deep.equal(
          nativeOrtbRequest
        );
        expect(requests[0].nativeOrtbRequest).to.equal(nativeOrtbRequest);

        expect(requestData[1].imp[0]).to.not.have.property('banner');
        expect(requestData[1].imp[0]).to.not.have.property('native');

        expect(requestData[2].imp[0]).to.not.have.property('native');
        expect(requests[2].nativeOrtbRequest).to.be.undefined;
      });

      it('should build an anonymized production-like native OpenRTB request', function () {
        const nativeOrtbRequest = {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 100 } },
            {
              id: 2,
              required: 1,
              img: {
                type: 3,
                wmin: 1200,
                hmin: 627,
                mimes: ['image/png', 'image/gif', 'image/jpeg']
              }
            },
            { id: 4, required: 1, data: { type: 2, len: 150 } },
            { id: 3, required: 0, data: { type: 12, len: 50 } },
            { id: 6, required: 0, data: { type: 1, len: 50 } },
            {
              id: 5,
              required: 0,
              img: {
                type: 1,
                wmin: 50,
                hmin: 50,
                mimes: ['image/png', 'image/gif', 'image/jpeg']
              }
            }
          ],
          eventtrackers: [
            { event: 1, methods: [1] },
            { event: 2, methods: [1] },
            { event: 3, methods: [1] }
          ]
        };

        const bidRequest = [{
          bidId: 'bid-test-001',
          bidder: 'adspirit',
          params: {
            placementId: '12345',
            host: 'ads.example.test',
            bidfloor: '0.75',
            siteId: 'site-test-001',
            publisherId: 'publisher-test-001',
            publisherName: 'Example Publisher'
          },
          adUnitCode: 'native-test-div',
          mediaTypes: {
            native: {
              ortb: nativeOrtbRequest
            }
          },
          nativeOrtbRequest,
          userData: [{
            name: 'example-segments',
            segment: [{ id: 'segment-test-001' }]
          }],
          userIdAsEids: [{
            source: 'example-id.test',
            uids: [{ id: 'anonymous-user-id', atype: 1 }]
          }]
        }];

        const bidderRequest = {
          auctionId: 'auction-test-001',
          refererInfo: {
            topmostLocation: 'https://publisher.example/native-test.html'
          },
          gdprConsent: {
            gdprApplies: false,
            consentString: ''
          },
          geo: {
            lat: 12.34,
            lon: 56.78,
            country: 'ZZ'
          }
        };

        const [request] = spec.buildRequests(bidRequest, bidderRequest);
        const payload = JSON.parse(request.data);
        const nativeRequest = JSON.parse(payload.imp[0].native.request);

        expect(request.method).to.equal('POST');
        expect(request.url).to.include('//ads.example.test/rtb/getbid.php');
        expect(request.url).to.include('&pid=12345');
        expect(request.url).to.include('&gdpr=0');
        expect(payload.id).to.equal('auction-test-001');
        expect(payload.imp[0].id).to.equal('bid-test-001');
        expect(payload.imp[0].bidfloor).to.equal(0.75);
        expect(payload.imp[0].ext.placementId).to.equal('12345');
        expect(nativeRequest).to.deep.equal({
          ver: '1.2',
          assets: nativeOrtbRequest.assets
        });
        expect(payload.site).to.deep.include({
          id: 'site-test-001',
          domain: 'publisher.example',
          page: 'https://publisher.example/native-test.html'
        });
        expect(payload.site.publisher).to.deep.equal({
          id: 'publisher-test-001',
          name: 'Example Publisher'
        });
        expect(payload.user.data).to.deep.equal(bidRequest[0].userData);
        expect(payload.user.ext.eids).to.deep.equal(bidRequest[0].userIdAsEids);
        expect(payload.device.geo).to.deep.equal({
          lat: 12.34,
          lon: 56.78,
          country: 'ZZ'
        });
        expect(
          payload.ext.adUnitCode.mediaTypes.native.ortb.eventtrackers
        ).to.deep.equal(nativeOrtbRequest.eventtrackers);
      });

      it('should default the native version to 1.2 when it is missing', function () {
        const nativeOrtbRequest = {
          assets: [
            { id: 1, required: 1, title: { len: 80 } }
          ]
        };

        const [request] = spec.buildRequests([{
          bidId: 'bid-native-default-version',
          bidder: 'adspirit',
          params: {
            placementId: '12346',
            host: 'ads.example.test'
          },
          adUnitCode: 'native-default-version',
          mediaTypes: {
            native: {
              ortb: nativeOrtbRequest
            }
          },
          nativeOrtbRequest
        }], {
          auctionId: 'auction-test-002',
          refererInfo: {
            topmostLocation: 'https://publisher.example/native-default.html'
          }
        });

        const payload = JSON.parse(request.data);
        expect(payload.imp[0].native.ver).to.equal('1.2');
        expect(JSON.parse(payload.imp[0].native.request)).to.deep.equal({
          ver: '1.2',
          assets: nativeOrtbRequest.assets
        });
      });
    }
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

    it('should keep a non-JSON adm string out of the native response path', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: 'seatbid-banner-001',
              price: 1.25,
              w: 300,
              h: 250,
              crid: 'creative-seatbid-001',
              exp: 120,
              adomain: ['advertiser.example'],
              adm: '<div>Non-native seatbid markup</div>'
            }]
          }],
          cur: 'USD'
        }
      };

      const result = spec.interpretResponse(serverResponse, {
        bidRequest: {
          bidId: 'seatbid-request-001',
          bidder: 'adspirit',
          params: {
            placementId: '12347',
            host: 'ads.example.test'
          }
        }
      });

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.include({
        requestId: 'seatbid-request-001',
        width: 300,
        height: 250,
        creativeId: 'creative-seatbid-001',
        currency: 'USD',
        ttl: 120
      });
      expect(result[0]).to.not.have.property('native');
    });

    if (FEATURES.NATIVE) {
      it('should correctly parse a valid native ad response, ensuring all assets are loaded dynamically with extra fields', function () {
        const nativeOrtbRequest = {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 100 } },
            { id: 4, required: 1, data: { type: 2, len: 150 } },
            { id: 3, required: 0, data: { type: 12, len: 50 } },
            {
              id: 2,
              required: 1,
              img: {
                type: 3,
                wmin: 1200,
                hmin: 627,
                mimes: ['image/png', 'image/gif', 'image/jpeg']
              }
            },
            {
              id: 5,
              required: 0,
              img: {
                type: 1,
                wmin: 50,
                hmin: 50,
                mimes: ['image/png', 'image/gif', 'image/jpeg']
              }
            },
            { id: 6, required: 0, data: { type: 1, len: 50 } }
          ]
        };

        const nativeResponse = {
          assets: [
            { id: 1, title: { text: 'Primary Title' } },
            { id: 4, data: { value: 'Main Description' } },
            { id: 4, data: { value: 'Extra Description' } },
            { id: 3, data: { value: 'Main CTA' } },
            { id: 3, data: { value: 'Additional CTA' } },
            {
              id: 2,
              img: {
                url: 'https://example.com/main-image.jpg',
                w: 100,
                h: 100
              }
            },
            {
              id: 2,
              img: {
                url: 'https://example.com/extra-image.jpg',
                w: 200,
                h: 200
              }
            },
            {
              id: 5,
              img: {
                url: 'https://example.com/icon-main.jpg',
                w: 50,
                h: 50
              }
            },
            {
              id: 5,
              img: {
                url: 'https://example.com/icon-extra.jpg',
                w: 60,
                h: 60
              }
            },
            { id: 6, data: { value: 'Main Sponsor' } },
            { id: 6, data: { value: 'Secondary Sponsor' } }
          ],
          link: { url: 'https://clickurl.com' },
          imptrackers: ['https://tracker.com/impression']
        };

        const serverResponse = {
          body: {
            seatbid: [{
              bid: [{
                impid: '123456',
                price: 1.5,
                w: 320,
                h: 50,
                crid: 'creative789',
                exp: 180,
                adomain: ['test.adspirit.de'],
                adm: JSON.stringify({ native: nativeResponse })
              }]
            }],
            cur: 'EUR'
          }
        };

        const validBidRequestMock = {
          bidRequest: {
            bidId: '987654',
            bidder: 'adspirit',
            params: {
              placementId: '57',
              host: 'test.adspirit.de'
            }
          },
          nativeOrtbRequest
        };

        const result = spec.interpretResponse(
          serverResponse,
          validBidRequestMock
        );
        expect(result).to.have.lengthOf(1);

        const bid = result[0];

        expect(bid.mediaType).to.equal('native');
        expect(bid.ttl).to.equal(180);
        expect(bid.native.title).to.equal('Primary Title');
        expect(bid.native.body).to.equal('Main Description');
        expect(bid.native.data_4_extra1).to.equal('Extra Description');

        expect(bid.native.cta).to.equal('Main CTA');
        expect(bid.native.data_3_extra1).to.equal('Additional CTA');

        expect(bid.native.sponsoredBy).to.equal('Main Sponsor');
        expect(bid.native.data_6_extra1).to.equal('Secondary Sponsor');
        expect(bid.native.image.url).to.equal(
          'https://example.com/main-image.jpg'
        );
        expect(bid.native.image_2_extra1).to.deep.equal({
          url: 'https://example.com/extra-image.jpg',
          width: 200,
          height: 200
        });

        expect(bid.native.icon.url).to.equal(
          'https://example.com/icon-main.jpg'
        );
        expect(bid.native.image_5_extra1).to.deep.equal({
          url: 'https://example.com/icon-extra.jpg',
          width: 60,
          height: 60
        });
        expect(bid.native.clickUrl).to.equal('https://clickurl.com');
        expect(bid.native.impressionTrackers).to.deep.equal([
          'https://tracker.com/impression'
        ]);
        expect(bid.native.ortb).to.deep.equal(nativeResponse);
      });

      it('should parse an anonymized production-like native response', function () {
        const nativeResponse = {
          ver: '1.2',
          assets: [
            {
              id: 1,
              title: {
                text: 'Example Native Product'
              }
            },
            {
              id: 2,
              img: {
                url: 'https://cdn.example.test/native/main-image.png',
                w: 1200,
                h: 627
              }
            },
            {
              id: 4,
              data: {
                value: 'An anonymized example description for a native advertisement.',
                label: ''
              }
            },
            {
              id: 3,
              data: {
                value: 'Learn more',
                label: ''
              }
            },
            {
              id: 6,
              data: {
                value: 'Example Sponsor',
                label: ''
              }
            }
          ],
          link: {
            url: 'https://click.example.test/native?campaign=campaign-test-001'
          },
          imptrackers: [
            'https://tracker.example.test/impression?creative=creative-test-001'
          ],
          eventtrackers: [
            {
              event: 2,
              method: 1,
              url: 'https://tracker.example.test/viewability?creative=creative-test-001'
            }
          ]
        };

        const serverResponse = {
          body: {
            id: 'auction-response-test-001',
            cur: 'EUR',
            seatbid: [{
              bid: [{
                id: 'bid-response-test-001',
                impid: 'bid-test-001',
                price: 0.42,
                adomain: ['advertiser.example'],
                adm: JSON.stringify({
                  native: nativeResponse
                }),
                adid: 'creative-test-001',
                nurl: 'https://tracker.example.test/win?bid=bid-response-test-001',
                cid: 'campaign-test-001',
                crid: 'creative-test-001',
                attr: [],
                ext: {
                  r: 7
                }
              }]
            }]
          }
        };

        const nativeOrtbRequest = {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 100 } },
            {
              id: 2,
              required: 1,
              img: {
                type: 3,
                wmin: 1200,
                hmin: 627,
                mimes: ['image/png', 'image/gif', 'image/jpeg']
              }
            },
            { id: 4, required: 1, data: { type: 2, len: 150 } },
            { id: 3, required: 0, data: { type: 12, len: 50 } },
            { id: 6, required: 0, data: { type: 1, len: 50 } }
          ]
        };

        const result = spec.interpretResponse(serverResponse, {
          bidRequest: {
            bidId: 'bid-test-001',
            bidder: 'adspirit',
            params: {
              placementId: '12345',
              host: 'ads.example.test'
            }
          },
          nativeOrtbRequest
        });

        expect(result).to.have.lengthOf(1);

        const bid = result[0];

        expect(bid).to.include({
          requestId: 'bid-test-001',
          cpm: 0.42,
          width: 1,
          height: 1,
          creativeId: 'creative-test-001',
          currency: 'EUR',
          netRevenue: true,
          ttl: 300,
          mediaType: 'native'
        });
        expect(bid.meta.advertiserDomains).to.deep.equal([
          'advertiser.example'
        ]);
        expect(bid.native.title).to.equal('Example Native Product');
        expect(bid.native.image).to.deep.equal({
          url: 'https://cdn.example.test/native/main-image.png',
          width: 1200,
          height: 627
        });
        expect(bid.native.body).to.equal(
          'An anonymized example description for a native advertisement.'
        );
        expect(bid.native.cta).to.equal('Learn more');
        expect(bid.native.sponsoredBy).to.equal('Example Sponsor');
        expect(bid.native.clickUrl).to.equal(
          'https://click.example.test/native?campaign=campaign-test-001'
        );
        expect(bid.native.impressionTrackers).to.deep.equal([
          'https://tracker.example.test/impression?creative=creative-test-001'
        ]);
        expect(bid.native.ortb.eventtrackers).to.deep.equal([
          {
            event: 2,
            method: 1,
            url: 'https://tracker.example.test/viewability?creative=creative-test-001'
          }
        ]);
        expect(bid.native.ortb).to.deep.equal(nativeResponse);
      });

      it('should skip a native response when native was not requested', function () {
        const result = spec.interpretResponse({
          body: {
            seatbid: [{
              bid: [{
                impid: 'unexpected-native-001',
                price: 1.1,
                adm: JSON.stringify({
                  native: {
                    assets: [
                      { id: 1, title: { text: 'Unexpected title' } }
                    ],
                    link: {
                      url: 'https://click.example/unexpected'
                    }
                  }
                })
              }]
            }]
          }
        }, {
          bidRequest: {
            bidId: 'request-without-native',
            bidder: 'adspirit',
            params: {
              placementId: '12348',
              host: 'ads.example.test'
            }
          }
        });

        expect(result).to.deep.equal([]);
      });

      it('should apply empty fallbacks to unmatched native assets', function () {
        const nativeResponse = {
          assets: [
            { id: 90, title: {} },
            { id: 90, title: { text: 'Second unmatched title' } },
            { id: 91, img: {} },
            { id: 92, data: {} }
          ]
        };

        const result = spec.interpretResponse({
          body: {
            seatbid: [{
              bid: [{
                impid: 'native-fallback-001',
                price: 0.9,
                adm: {
                  native: nativeResponse
                }
              }]
            }]
          }
        }, {
          bidRequest: {
            bidId: 'native-fallback-request',
            bidder: 'adspirit',
            params: {
              placementId: '12349',
              host: 'ads.example.test'
            }
          },
          nativeOrtbRequest: {}
        });

        expect(result).to.have.lengthOf(1);
        expect(result[0].native.clickUrl).to.equal('');
        expect(result[0].native.impressionTrackers).to.deep.equal([]);
        expect(result[0].native.data_90_extra0).to.equal('');
        expect(result[0].native.data_90_extra1).to.equal(
          'Second unmatched title'
        );
        expect(result[0].native.image_91_extra0).to.deep.equal({
          url: '',
          width: null,
          height: null
        });
        expect(result[0].native.data_92_extra0).to.equal('');
        expect(result[0].native.ortb).to.deep.equal(nativeResponse);
      });
    }
  });
});
