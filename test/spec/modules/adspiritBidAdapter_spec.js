import { expect } from 'chai';
import { spec } from 'modules/adspiritBidAdapter.js';
import * as utils from 'src/utils.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from 'src/mediaTypes.js';
const { getWinDimensions } = utils;
const RTB_URL = '/rtb/getbid.php?rtbprovider=prebid';
const SCRIPT_URL = '/adasync.min.js';

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
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalInnerHeight });
      Object.defineProperty(document.documentElement, 'clientWidth', { writable: true, configurable: true, value: originalClientWidth });
      Object.defineProperty(document.documentElement, 'clientHeight', { writable: true, configurable: true, value: originalClientHeight });
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
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);
    });

    it('should correctly fall back to document dimensions if window dimensions are not available', function () {
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
      delete global.window.innerWidth;
      delete global.window.innerHeight;
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);
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
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
      const requestData = JSON.parse(request.data);
      expect(requestData.source).to.exist;
      expect(requestData.source.ext).to.exist;
      expect(requestData.source.ext.schain).to.deep.equal(bidRequest[0].schain);
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
                request: {
                  assets: [{ id: 1, required: 1, title: { len: 100 } }]
                }
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
                request: {
                  assets: []
                }
              }
            }
          }
        }
      ];

      const mockBidderRequest = { refererInfo: { topmostLocation: 'https://test.adspirit.com' } };
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const requestData = requests.map(req => JSON.parse(req.data));

      expect(requestData[0].imp[0]).to.have.property('banner');
      expect(requestData[0].imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);

      expect(requestData[0].imp[0]).to.have.property('native');
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
      expect(JSON.parse(requestData[2].imp[0].native.request).assets).to.deep.equal([
        { id: 1, required: 1, title: { len: 100 } },
        { id: 2, required: 1, img: { type: 3, wmin: 1200, hmin: 627, mimes: ['image/png', 'image/gif', 'image/jpeg'] } },
        { id: 4, required: 1, data: { type: 2, len: 150 } },
        { id: 3, required: 0, data: { type: 12, len: 50 } },
        { id: 6, required: 0, data: { type: 1, len: 50 } },
        { id: 5, required: 0, img: { type: 1, wmin: 50, hmin: 50, mimes: ['image/png', 'image/gif', 'image/jpeg'] } }
      ]);
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
        }
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
      expect(bid.native['image_2_extra1']).to.deep.equal({
        url: 'https://example.com/extra-image.jpg',
        width: 200,
        height: 200
      });

      expect(bid.native.icon.url).to.equal('https://example.com/icon-main.jpg');
      expect(bid.native['image_5_extra1']).to.deep.equal({
        url: 'https://example.com/icon-extra.jpg',
        width: 60,
        height: 60
      });
      expect(bid.native.impressionTrackers).to.deep.equal(['https://tracker.com/impression']);
    });
  });
});
