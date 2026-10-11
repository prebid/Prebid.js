import { expect } from 'chai';
import { spec } from 'modules/adspiritBidAdapter.js';
import { getWinDimensions, resetWinDimensions } from 'src/utils.js';

describe('Adspirit Bidder Spec', function () {
  describe('gvlid', function () {
    it('should declare Adspirit and Twiago GVL IDs', function () {
      expect(spec.gvlid).to.equal(6);
      expect(spec.aliases).to.deep.equal([{ code: 'twiago', gvlid: 242 }]);
    });
  });

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
        adspiritConId: 'adspirit12345',
        bidder: 'adspirit',
        params: {
          placementId: '57',
          host: 'test.adspirit.de',
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
      expect(bid.ad).to.include('<script>window.inDapIF=true;</script>');
      expect(bid.ad).to.include('var id="adspirit12345";');
      expect(bid.ad).to.include('\\u003cdiv>Banner Ad Content\\u003c/div>');
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

  // Additional branch and regression coverage for the current adapter.
  // Keep the fixtures local: there is no network traffic or dependency on live bidders.
  describe('additional regression coverage', function () {
    const makeBid = (options = {}) => {
      const { params = {}, mediaTypes, ...other } = options;
      return {
        bidId: 'bid-test-001',
        bidder: 'adspirit',
        adUnitCode: 'unit-test-div',
        params: {
          placementId: '99',
          host: 'ads.example.test',
          ...params
        },
        mediaTypes: mediaTypes === undefined
          ? { banner: { sizes: [[300, 250]] } }
          : mediaTypes,
        ...other
      };
    };

    const makeAuction = (options = {}) => ({
      auctionId: 'auction-test-001',
      refererInfo: { topmostLocation: 'https://publisher.example/page?a=1' },
      ...options
    });

    const makeBannerRequest = (params = {}) => ({
      bidRequest: {
        bidId: 'banner-request-001',
        bidder: 'adspirit',
        adspiritConId: 'adspirit12345',
        params: {
          placementId: '99',
          host: 'ads.example.test',
          ...params
        }
      }
    });

    const makeBannerResponse = (body = {}) => ({
      body: {
        cpm: 1.5,
        w: 300,
        h: 250,
        adm: '<div>Example</div>',
        ...body
      }
    });

    describe('metadata and validation', function () {
      it('declares both supported media types', function () {
        expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'native']);
      });

      it('accepts Twiago with placementId and no explicit host', function () {
        expect(spec.isBidRequestValid({
          bidder: 'twiago',
          params: { placementId: '9128' }
        })).to.be.true;
      });

      it('rejects AdSpirit without a host, even if placementId exists', function () {
        expect(spec.isBidRequestValid({
          bidder: 'adspirit',
          params: { placementId: '99' }
        })).to.be.false;
      });

      it('rejects Twiago without a placementId', function () {
        expect(spec.isBidRequestValid({
          bidder: 'twiago',
          params: {}
        })).to.be.false;
      });

      it('rejects an unsupported bidder even if its params are filled', function () {
        expect(spec.isBidRequestValid({
          bidder: 'other',
          params: { placementId: '99', host: 'ads.example.test' }
        })).to.be.false;
      });

      it('generates a bidder-prefixed connection ID', function () {
        const id = spec.genAdConId({ bidder: 'twiago' });
        expect(id).to.match(/^twiago\d{1,6}$/);
        const numericPart = Number(id.slice('twiago'.length));
        expect(numericPart).to.be.at.least(0);
        expect(numericPart).to.be.at.most(100000);
      });
    });

    describe('buildRequests details', function () {
      it('returns no POST requests when there are no bids', function () {
        expect(spec.buildRequests([], makeAuction())).to.deep.equal([]);
      });

      it('creates the full banner POST payload and retains the connection ID', function () {
        const bid = makeBid();
        const [request] = spec.buildRequests([bid], makeAuction());
        const payload = JSON.parse(request.data);
        const dimensions = getWinDimensions();

        expect(request.method).to.equal('POST');
        expect(request.headers).to.deep.equal({ 'Content-Type': 'application/json' });
        expect(request.bidRequest).to.equal(bid);
        expect(request.nativeOrtbRequest).to.be.undefined;
        expect(bid.adspiritConId).to.match(/^adspirit\d+$/);
        expect(request.url).to.include(`&async=${bid.adspiritConId}`);
        expect(request.url).to.include('//ads.example.test/rtb/getbid.php?rtbprovider=prebid');
        expect(request.url).to.include('&pid=99');
        expect(request.url).to.include('&ref=' + encodeURIComponent('https://publisher.example/page?a=1'));
        expect(request.url).to.include(`&scx=${dimensions.screen?.width || 0}`);
        expect(request.url).to.include(`&scy=${dimensions.screen?.height || 0}`);
        expect(request.url).to.match(/&t=\d+$/);

        expect(payload.id).to.equal('auction-test-001');
        expect(payload.at).to.equal(1);
        expect(payload.cur).to.deep.equal(['EUR']);
        expect(payload.imp).to.have.lengthOf(1);
        expect(payload.imp[0]).to.deep.include({
          id: 'bid-test-001',
          bidfloor: 0,
          bidfloorcur: 'EUR',
          secure: 1
        });
        expect(payload.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
        expect(payload.imp[0].ext.placementId).to.equal('99');
        expect(payload.imp[0]).to.not.have.property('native');
        expect(payload.site.domain).to.equal('publisher.example');
        expect(payload.site.page).to.equal('https://publisher.example/page?a=1');
        expect(payload.ext.oat).to.equal(1);
        expect(payload.ext.adUnitCode.code).to.equal('unit-test-div');
        expect(payload.ext.adUnitCode.mediaTypes).to.deep.equal(bid.mediaTypes);
        expect(payload.ext.prebidVersion).to.equal(payload.ext.adUnitCode.prebidVersion);
      });

      it('constructs multiple independent requests with their own placement IDs', function () {
        const bids = [
          makeBid({ bidId: 'bid-one', params: { placementId: '101' } }),
          makeBid({ bidId: 'bid-two', params: { placementId: '102' } })
        ];
        const requests = spec.buildRequests(bids, makeAuction());
        expect(requests).to.have.lengthOf(2);
        expect(requests[0].url).to.include('&pid=101');
        expect(requests[1].url).to.include('&pid=102');
        expect(JSON.parse(requests[0].data).imp[0].id).to.equal('bid-one');
        expect(JSON.parse(requests[1].data).imp[0].id).to.equal('bid-two');
        expect(requests[0].bidRequest).to.equal(bids[0]);
        expect(requests[1].bidRequest).to.equal(bids[1]);
      });

      it('sends Twiago bids to the fixed Twiago host without requiring params.host', function () {
        const bid = makeBid({
          bidder: 'twiago',
          params: { placementId: '9128', host: undefined }
        });
        const [request] = spec.buildRequests([bid], makeAuction());
        expect(request.url).to.include('//a.twiago.com/rtb/getbid.php?rtbprovider=prebid');
        expect(request.url).to.include('&pid=9128');
        expect(bid.adspiritConId).to.match(/^twiago\d+$/);
      });

      it('serializes all banner sizes and leaves native absent', function () {
        const bid = makeBid({ mediaTypes: { banner: { sizes: [[300, 250], [728, 90], [320, 50]] } } });
        const payload = JSON.parse(spec.buildRequests([bid], makeAuction())[0].data);
        expect(payload.imp[0].banner.format).to.deep.equal([
          { w: 300, h: 250 },
          { w: 728, h: 90 },
          { w: 320, h: 50 }
        ]);
        expect(payload.imp[0]).to.not.have.property('native');
      });

      it('omits banner when the sizes array is empty', function () {
        const bid = makeBid({ mediaTypes: { banner: { sizes: [] } } });
        const payload = JSON.parse(spec.buildRequests([bid], makeAuction())[0].data);
        expect(payload.imp[0]).to.not.have.property('banner');
      });

      it('omits URL GDPR flags when no consent object exists but sets OpenRTB defaults', function () {
        const [request] = spec.buildRequests([makeBid()], makeAuction());
        const payload = JSON.parse(request.data);
        expect(request.url).to.not.include('&gdpr=');
        expect(request.url).to.not.include('&gdpr_consent=');
        expect(payload.regs.ext).to.deep.equal({ gdpr: 0, gdpr_consent: '' });
        expect(payload.user.ext.consent).to.equal('');
      });

      it('percent-encodes a supplied consent string in the URL and repeats it in ORTB', function () {
        const consentString = 'test+/= &';
        const [request] = spec.buildRequests([makeBid()], makeAuction({
          gdprConsent: { gdprApplies: true, consentString }
        }));
        const payload = JSON.parse(request.data);
        expect(request.url).to.include('&gdpr=1&gdpr_consent=' + encodeURIComponent(consentString));
        expect(payload.regs.ext.gdpr).to.equal(1);
        expect(payload.regs.ext.gdpr_consent).to.equal(consentString);
        expect(payload.user.ext.consent).to.equal(consentString);
      });

      it('uses GDPR=0 and an empty string when a consent object has missing fields', function () {
        const [request] = spec.buildRequests([makeBid()], makeAuction({ gdprConsent: {} }));
        const payload = JSON.parse(request.data);
        expect(request.url).to.include('&gdpr=0&gdpr_consent=');
        expect(payload.regs.ext).to.deep.equal({ gdpr: 0, gdpr_consent: '' });
      });

      it('uses empty publisher/user/geo defaults and excludes missing schain', function () {
        const payload = JSON.parse(spec.buildRequests([makeBid()], makeAuction())[0].data);
        expect(payload.site.id).to.equal('');
        expect(payload.site.publisher).to.deep.equal({ id: '', name: '' });
        expect(payload.user.data).to.deep.equal([]);
        expect(payload.user.ext.eids).to.deep.equal([]);
        expect(payload.device.geo).to.deep.equal({ lat: 0, lon: 0, country: '' });
        expect(payload.device.ua).to.equal(navigator.userAgent);
        expect(payload.device.language).to.equal((navigator.language || '').split('-')[0]);
        expect(payload).to.not.have.property('source');
      });

      it('includes publisher fields, user data, EIDs and explicit geo coordinates', function () {
        const bid = makeBid({
          params: { siteId: 'site-1', publisherId: 'pub-1', publisherName: 'Publisher 1' },
          userData: [{ name: 'audience', segment: [{ id: 'segment-1' }] }],
          userIdAsEids: [{ source: 'example.test', uids: [{ id: 'user-1' }] }]
        });
        const payload = JSON.parse(spec.buildRequests([bid], makeAuction({
          geo: { lat: 52.5, lon: 13.4, country: 'DE' }
        }))[0].data);
        expect(payload.site.id).to.equal('site-1');
        expect(payload.site.publisher).to.deep.equal({ id: 'pub-1', name: 'Publisher 1' });
        expect(payload.user.data).to.deep.equal(bid.userData);
        expect(payload.user.ext.eids).to.deep.equal(bid.userIdAsEids);
        expect(payload.device.geo).to.deep.equal({ lat: 52.5, lon: 13.4, country: 'DE' });
      });

      if (FEATURES.NATIVE) {
        it('builds native-only bids from the normalized Prebid nativeOrtbRequest', function () {
          const nativeOrtbRequest = {
            ver: '1.2',
            assets: [
              { id: 1, required: 1, title: { len: 100 } },
              { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 250 } }
            ]
          };
          const bid = makeBid({
            mediaTypes: { native: { ortb: nativeOrtbRequest } },
            nativeOrtbRequest
          });
          const [request] = spec.buildRequests([bid], makeAuction());
          const payload = JSON.parse(request.data);
          expect(payload.imp[0]).to.not.have.property('banner');
          expect(payload.imp[0].native.ver).to.equal('1.2');
          expect(JSON.parse(payload.imp[0].native.request)).to.deep.equal(nativeOrtbRequest);
          expect(request.nativeOrtbRequest).to.equal(nativeOrtbRequest);
        });

        it('does not request native if Prebid did not supply nativeOrtbRequest', function () {
          const bid = makeBid({
            mediaTypes: { native: { ortb: { assets: [{ id: 1, title: { len: 50 } }] } } }
          });
          const [request] = spec.buildRequests([bid], makeAuction());
          const payload = JSON.parse(request.data);
          expect(payload.imp[0]).to.not.have.property('native');
          expect(request.nativeOrtbRequest).to.be.undefined;
          // Incomplete native must not be constructed directly from mediaTypes.native.
          expect(payload.ext.adUnitCode.mediaTypes.native).to.deep.equal(bid.mediaTypes.native);
        });

        it('retains the native request configuration without mutating input assets or trackers', function () {
          const nativeOrtbRequest = {
            ver: '1.2',
            assets: [{ id: 1, title: { len: 50 } }],
            eventtrackers: [{ event: 2, methods: [1] }]
          };
          const bid = makeBid({
            mediaTypes: { native: { ortb: nativeOrtbRequest } },
            nativeOrtbRequest
          });
          const [request] = spec.buildRequests([bid], makeAuction());
          const payload = JSON.parse(request.data);
          expect(request.nativeOrtbRequest).to.equal(nativeOrtbRequest);
          expect(payload.ext.adUnitCode.mediaTypes.native.ortb.eventtrackers).to.deep.equal(
            nativeOrtbRequest.eventtrackers
          );
          expect(nativeOrtbRequest.assets).to.deep.equal([{ id: 1, title: { len: 50 } }]);
        });
      }
    });

    describe('interpretResponse edge cases', function () {
      it('handles an empty seatbid list without producing bids', function () {
        const result = spec.interpretResponse({ body: { seatbid: [] } }, makeBannerRequest());
        expect(result).to.deep.equal([]);
      });

      it('flattens bids from multiple seats and keeps response-specific metadata', function () {
        const result = spec.interpretResponse({
          body: {
            cur: 'USD',
            seatbid: [
              { bid: [{ impid: 'imp-1', price: 0.7, crid: 'creative-1', adomain: ['brand.example'] }] },
              { bid: [{ impid: 'imp-2', price: 1.3, exp: 45 }] }
            ]
          }
        }, makeBannerRequest());
        expect(result).to.have.lengthOf(2);
        expect(result[0]).to.deep.include({
          requestId: 'banner-request-001',
          cpm: 0.7, creativeId: 'creative-1', currency: 'USD', ttl: 300
        });
        expect(result[0].meta.advertiserDomains).to.deep.equal(['brand.example']);
        expect(result[1]).to.deep.include({ cpm: 1.3, creativeId: 'imp-2', ttl: 45 });
        expect(result[1].meta.advertiserDomains).to.deep.equal([]);
      });

      it('retains non-native seatbid markup as a non-native bid, without interpreting JSON', function () {
        const result = spec.interpretResponse({
          body: { seatbid: [{ bid: [{
            impid: 'imp-1', price: 1, adm: '  <div>Banner</div>'
          }] }] }
        }, makeBannerRequest());
        expect(result).to.have.lengthOf(1);
        expect(result[0]).to.not.have.property('native');
        expect(result[0]).to.not.have.property('mediaType');
      });

      it('maps a traditional banner response with optional advertiser domains', function () {
        const result = spec.interpretResponse(makeBannerResponse({ adomain: ['advertiser.example'] }), makeBannerRequest());
        expect(result).to.have.lengthOf(1);
        expect(result[0].meta.advertiserDomains).to.deep.equal(['advertiser.example']);
        expect(result[0].creativeId).to.equal('99');
        expect(result[0].mediaType).to.equal('banner');
      });

      it('uses the connection ID produced by buildRequests in the banner renderer', function () {
        const bid = makeBid();
        const [request] = spec.buildRequests([bid], makeAuction());
        const [result] = spec.interpretResponse(makeBannerResponse(), request);
        expect(result.ad).to.include('var id=' + JSON.stringify(bid.adspiritConId) + ';');
        expect(request.bidRequest.adspiritConId).to.equal(bid.adspiritConId);
      });

      it('returns no traditional banner bid when CPM is zero', function () {
        expect(spec.interpretResponse(makeBannerResponse({ cpm: 0 }), makeBannerRequest())).to.deep.equal([]);
      });

      it('defaults iframe breakout to true and uses the correct host, id and renderer', function () {
        const [bid] = spec.interpretResponse(makeBannerResponse(), makeBannerRequest());
        expect(bid.ad).to.include('<script>window.inDapIF=true;</script>');
        expect(bid.ad).to.include('<script src="//ads.example.test/adasync.min.js"></script>');
        expect(bid.ad).to.include('var id="adspirit12345";');
        expect(bid.ad).to.include('var scriptUrl="//ads.example.test/adasync.min.js";');
        expect(bid.ad).to.include('renderer.write(id,markup);');
        expect(bid.ad).to.include('var container=asm.inswrapper');
        expect(bid.ad).to.include('asm.doc.addEventListener("DOMContentLoaded",start,{once:true})');
      });

      [false, 'false', 0, '0'].forEach(value => {
        it('disables iframe breakout for allowIframeBreakout=' + JSON.stringify(value), function () {
          const [bid] = spec.interpretResponse(makeBannerResponse(), makeBannerRequest({ allowIframeBreakout: value }));
          expect(bid.ad).to.include('<script>window.inDapIF=false;</script>');
        });
      });

      [true, 'true', 1, '1'].forEach(value => {
        it('allows iframe breakout for allowIframeBreakout=' + JSON.stringify(value), function () {
          const [bid] = spec.interpretResponse(makeBannerResponse(), makeBannerRequest({ allowIframeBreakout: value }));
          expect(bid.ad).to.include('<script>window.inDapIF=true;</script>');
        });
      });

      it('escapes < characters in the banner markup before embedding it into a script', function () {
        const hostileMarkup = '</script><script>alert("x")</script><div>Safe</div>';
        const [bid] = spec.interpretResponse(makeBannerResponse({ adm: hostileMarkup }), makeBannerRequest());
        expect(bid.ad).to.include('\\u003c/script>');
        expect(bid.ad).to.include('\\u003cscript>');
        expect(bid.ad).to.include('\\u003cdiv>Safe\\u003c/div>');
        expect(bid.ad).to.not.include(hostileMarkup);
        expect(bid.ad).to.include('var markup=');
      });

      it('keeps a Twiago renderer on the Twiago host', function () {
        const request = makeBannerRequest();
        request.bidRequest.bidder = 'twiago';
        delete request.bidRequest.params.host;
        const [bid] = spec.interpretResponse(makeBannerResponse(), request);
        expect(bid.ad).to.include('<script src="//a.twiago.com/adasync.min.js"></script>');
        expect(bid.ad).to.include('var scriptUrl="//a.twiago.com/adasync.min.js";');
      });

      if (FEATURES.NATIVE) {
        it('accepts a native ADM object directly and keeps all OpenRTB event trackers', function () {
          const ortb = {
            assets: [{ id: 1, title: { text: 'Native title' } }],
            link: { url: 'https://click.example.test/' },
            imptrackers: ['https://track.example.test/impression'],
            eventtrackers: [{ event: 2, method: 1, url: 'https://track.example.test/view' }]
          };
          const result = spec.interpretResponse({
            body: { seatbid: [{ bid: [{ price: 2.1, impid: 'imp-1', adm: { native: ortb } }] }] }
          }, {
            ...makeBannerRequest(),
            nativeOrtbRequest: { assets: [{ id: 1, title: { len: 40 } }] }
          });
          expect(result).to.have.lengthOf(1);
          expect(result[0].mediaType).to.equal('native');
          expect(result[0].native.title).to.equal('Native title');
          expect(result[0].native.clickUrl).to.equal('https://click.example.test/');
          expect(result[0].native.impressionTrackers).to.deep.equal(['https://track.example.test/impression']);
          expect(result[0].native.ortb.eventtrackers).to.deep.equal(ortb.eventtrackers);
        });

        it('normalizes a JSON native ADM string with leading whitespace', function () {
          const ortb = { assets: [{ id: 1, title: { text: 'Whitespace title' } }] };
          const result = spec.interpretResponse({
            body: { seatbid: [{ bid: [{ price: 1, impid: 'imp-1', adm: '  ' + JSON.stringify({ native: ortb }) }] }] }
          }, {
            ...makeBannerRequest(),
            nativeOrtbRequest: { assets: [{ id: 1, title: { len: 40 } }] }
          });
          expect(result[0].native.title).to.equal('Whitespace title');
          expect(result[0].native.ortb).to.deep.equal(ortb);
        });

        it('does not treat a native ADM without assets as a usable native bid', function () {
          const result = spec.interpretResponse({
            body: { seatbid: [{ bid: [{ price: 1, impid: 'imp-1', adm: { native: { link: { url: 'https://click.example' } } } }] }] }
          }, {
            ...makeBannerRequest(),
            nativeOrtbRequest: { assets: [{ id: 1, title: { len: 40 } }] }
          });
          expect(result).to.have.lengthOf(1);
          expect(result[0]).to.not.have.property('native');
        });

        it('uses defaults when native imptrackers is not an array and link is absent', function () {
          const ortb = {
            assets: [],
            imptrackers: 'https://track.example.test/wrong-format'
          };
          const result = spec.interpretResponse({
            body: { seatbid: [{ bid: [{ price: 1, impid: 'imp-1', adm: { native: ortb } }] }] }
          }, { ...makeBannerRequest(), nativeOrtbRequest: { assets: [] } });
          expect(result).to.have.lengthOf(1);
          expect(result[0].native.clickUrl).to.equal('');
          expect(result[0].native.impressionTrackers).to.deep.equal([]);
          expect(result[0].native.ortb).to.equal(ortb);
        });

        it('uses empty fallbacks for matched title, data and image properties', function () {
          const ortb = { assets: [
            { id: 1, title: {} },
            { id: 2, img: {} },
            { id: 3, data: {} }
          ] };
          const result = spec.interpretResponse({
            body: { seatbid: [{ bid: [{ price: 1, impid: 'imp-1', adm: { native: ortb } }] }] }
          }, {
            ...makeBannerRequest(),
            nativeOrtbRequest: { assets: [
              { id: 1, title: { len: 50 } },
              { id: 2, img: { type: 1 } },
              { id: 3, data: { type: 12 } }
            ] }
          });
          expect(result[0].native.title).to.equal('');
          expect(result[0].native.icon).to.deep.equal({ url: '', width: null, height: null });
          expect(result[0].native.cta).to.equal('');
        });

        it('stores unknown and duplicate native asset types in extra fields', function () {
          const ortb = { assets: [
            { id: 1, title: { text: 'Main title' } },
            { id: 2, title: { text: 'Second title' } },
            { id: 3, data: { value: 'Custom type' } },
            { id: 4, img: { url: 'https://cdn.example/img.png', w: 80, h: 60 } },
            { id: 4, img: { url: 'https://cdn.example/extra.png' } }
          ] };
          const result = spec.interpretResponse({
            body: { seatbid: [{ bid: [{ price: 1, impid: 'imp-1', adm: { native: ortb } }] }] }
          }, {
            ...makeBannerRequest(),
            nativeOrtbRequest: { assets: [
              { id: 1, title: { len: 50 } },
              { id: 2, title: { len: 30 } },
              { id: 3, data: { type: 99 } },
              { id: 4, img: { type: 3 } }
            ] }
          });
          const native = result[0].native;
          expect(native.title).to.equal('Main title');
          expect(native.data_2_extra0).to.equal('Second title');
          expect(native.data_3_extra0).to.equal('Custom type');
          expect(native.image).to.deep.equal({
            url: 'https://cdn.example/img.png', width: 80, height: 60
          });
          expect(native.image_4_extra1).to.deep.equal({
            url: 'https://cdn.example/extra.png', width: null, height: null
          });
        });

        it('skips unexpected native bids but continues processing other seats', function () {
          const result = spec.interpretResponse({
            body: { seatbid: [{ bid: [
              { price: 1, impid: 'native-imp', adm: { native: { assets: [{ id: 1, title: { text: 'Ignored' } }] } } },
              { price: 2, impid: 'other-imp', adm: '<div>Regular markup</div>' }
            ] }] }
          }, makeBannerRequest());
          expect(result).to.have.lengthOf(1);
          expect(result[0].cpm).to.equal(2);
          expect(result[0].creativeId).to.equal('other-imp');
          expect(result[0]).to.not.have.property('native');
        });
      }
    });
  });

});
