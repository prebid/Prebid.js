import { expect } from 'chai';
import { spec, ENDPOINT } from 'modules/readpeakBidAdapter.js';
import { toOrtbNativeRequest } from 'src/native.js';
import * as utils from 'src/utils.js';

describe('ReadPeakAdapter', function() {
  let baseBidRequest;
  let bannerBidRequest;
  let nativeBidRequest;
  let nativeServerResponse;
  let bannerServerResponse;
  let bidderRequest;

  beforeEach(function() {
    bidderRequest = {
      bidderRequestId: '178e34bad3658f',
      refererInfo: {
        page: 'https://publisher.com/home',
        domain: 'publisher.com'
      },
      ortb2: {
        site: {
          page: 'https://publisher.com/home',
          domain: 'publisher.com'
        },
        device: {
          ua: navigator.userAgent,
          language: navigator.language,
        }
      }
    };

    baseBidRequest = {
      bidder: 'readpeak',
      params: {
        bidfloor: 5.0,
        publisherId: '11bc5dd5-7421-4dd8-c926-40fa653bec76',
        siteId: '11bc5dd5-7421-4dd8-c926-40fa653bec77',
        tagId: 'test-tag-1'
      },
      bidId: '2ffb201a808da7',
      bidderRequestId: '178e34bad3658f',
      auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b',
    };

    const nativeParams = {
      title: { required: true, len: 200 },
      image: { wmin: 100 },
      sponsoredBy: {},
      body: { required: false },
      cta: { required: false }
    };

    nativeBidRequest = {
      ...baseBidRequest,
      nativeParams,
      nativeOrtbRequest: toOrtbNativeRequest(nativeParams),
      mediaTypes: { native: nativeParams },
    };
    bannerBidRequest = {
      ...baseBidRequest,
      mediaTypes: {
        banner: {
          sizes: [[640, 320], [300, 600]],
        }
      },
      sizes: [[640, 320], [300, 600]],
    };
    nativeServerResponse = {
      id: baseBidRequest.bidderRequestId,
      cur: 'USD',
      seatbid: [
        {
          bid: [
            {
              id: 'baseBidRequest.bidId',
              impid: baseBidRequest.bidId,
              price: 0.12,
              cid: '12',
              crid: '123',
              adomain: ['readpeak.com'],
              adm: {
                assets: [
                  {
                    id: 1,
                    title: {
                      text: 'Title'
                    }
                  },
                  {
                    id: 3,
                    data: {
                      type: 1,
                      value: 'Brand Name'
                    }
                  },
                  {
                    id: 4,
                    data: {
                      type: 2,
                      value: 'Description'
                    }
                  },
                  {
                    id: 2,
                    img: {
                      type: 3,
                      url: 'http://url.to/image',
                      w: 750,
                      h: 500
                    }
                  }
                ],
                link: {
                  url: 'http://url.to/target'
                },
                imptrackers: ['http://url.to/pixeltracker']
              }
            }
          ]
        }
      ]
    };
    bannerServerResponse = {
      id: baseBidRequest.bidderRequestId,
      cur: 'USD',
      seatbid: [
        {
          bid: [
            {
              id: 'baseBidRequest.bidId',
              impid: baseBidRequest.bidId,
              price: 0.12,
              cid: '12',
              crid: '123',
              mtype: 1,
              adomain: ['readpeak.com'],
              adm: '<iframe src=\"http://localhost:8081/url/creative?id=4326&l=f707685dfbbcdbe3&bad=0-0-95O0O0OdO640360&b=e4d39f94-533d-4577-a579-585fd4c02b0a&w=640&h=360&gc=0\" style=\"border: 0; display: block\" width=640 height=360></iframe>',
              burl: 'https://localhost:8081/url/b?d=0O95O4326I528Ie4d39f94-533d-4577-a579-585fd4c02b0aI0I352e303232363639333139393939393939&c=USD&p=${AUCTION_PRICE}&bad=0-0-95O0O0OdO640360&gc=0',
              nurl: 'https://localhost:8081/url/n?d=0O95O4326I528Ie4d39f94-533d-4577-a579-585fd4c02b0aI0I352e303232363639333139393939393939&gc=0',
              w: 640,
              h: 360,
            }
          ]
        }
      ]
    };
  });

  describe('Native', function() {
    describe('spec.isBidRequestValid', function() {
      it('should return true when the required params are passed', function() {
        expect(spec.isBidRequestValid(nativeBidRequest)).to.equal(true);
      });

      it('should return false when the "publisherId" param is missing', function() {
        nativeBidRequest.params = {
          bidfloor: 5.0
        };
        expect(spec.isBidRequestValid(nativeBidRequest)).to.equal(false);
      });

      it('should return false when no bid params are passed', function() {
        nativeBidRequest.params = {};
        expect(spec.isBidRequestValid(nativeBidRequest)).to.equal(false);
      });

      it('should return false when a bid request is not passed', function() {
        expect(spec.isBidRequestValid()).to.equal(false);
        expect(spec.isBidRequestValid({})).to.equal(false);
      });
    });

    describe('spec.buildRequests', function() {
      it('should create a POST request for every bid', function() {
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENDPOINT);
      });

      it('should attach request data', function() {
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);

        const data = request.data;

        expect(data.source.ext.prebid).to.equal('$prebid.version$');
        // request.id is generated by the ortbConverter when no ortb2.id is supplied.
        expect(data.id).to.be.a('string').that.is.not.empty;
        expect(data.imp[0].bidfloor).to.equal(nativeBidRequest.params.bidfloor);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
        expect(data.imp[0].tagid).to.equal('test-tag-1');
        expect(data.site.publisher.id).to.equal(nativeBidRequest.params.publisherId);
        expect(data.site.id).to.equal(nativeBidRequest.params.siteId);
        expect(data.site.page).to.equal(bidderRequest.ortb2.site.page);
        expect(data.site.domain).to.equal(bidderRequest.ortb2.site.domain);
        expect(data.device).to.deep.contain({
          ua: navigator.userAgent,
          language: navigator.language
        });
        expect(data.user).to.be.undefined;
        expect(data.regs).to.be.undefined;
      });

      it('should honour a publisher-supplied ortb2.id', function() {
        const requestWithId = {
          ...bidderRequest,
          ortb2: {
            ...bidderRequest.ortb2,
            id: 'publisher-supplied-id'
          }
        };
        const request = spec.buildRequests([nativeBidRequest], requestWithId);

        expect(request.data.id).to.equal('publisher-supplied-id');
      });

      it('should send an app object instead of site when params.app is set', function() {
        const appBidRequest = {
          ...nativeBidRequest,
          params: {
            ...nativeBidRequest.params,
            app: {
              bundle: 'com.readpeak.app',
              storeUrl: 'https://store.example/app',
              domain: 'readpeak.app'
            }
          }
        };
        const request = spec.buildRequests([appBidRequest], bidderRequest);

        const data = request.data;

        expect(data.site).to.be.undefined;
        expect(data.app).to.deep.equal({
          publisher: { id: appBidRequest.params.publisherId },
          id: appBidRequest.params.siteId,
          bundle: 'com.readpeak.app',
          storeurl: 'https://store.example/app',
          domain: 'readpeak.app'
        });
      });

      it('should send an app object instead of site when ortb2.app is set without params.app', function() {
        const request = spec.buildRequests([nativeBidRequest], {
          ...bidderRequest,
          ortb2: {
            ...bidderRequest.ortb2,
            site: undefined,
            app: {
              bundle: 'com.readpeak.app',
              storeurl: 'https://store.example/app',
              domain: 'readpeak.app'
            }
          }
        });

        const data = request.data;

        expect(data.site).to.be.undefined;
        expect(data.app.publisher.id).to.equal(nativeBidRequest.params.publisherId);
        expect(data.app.id).to.equal(nativeBidRequest.params.siteId);
        expect(data.app.bundle).to.equal('com.readpeak.app');
        expect(data.app.storeurl).to.equal('https://store.example/app');
        expect(data.app.domain).to.equal('readpeak.app');
      });

      it('should fall back to publisherId for app.id when siteId is not set', function() {
        const appBidRequest = {
          ...nativeBidRequest,
          params: {
            ...nativeBidRequest.params,
            siteId: undefined,
            app: {
              bundle: 'com.readpeak.app'
            }
          }
        };
        const request = spec.buildRequests([appBidRequest], bidderRequest);

        const data = request.data;

        expect(data.site).to.be.undefined;
        expect(data.app.publisher.id).to.equal(appBidRequest.params.publisherId);
        expect(data.app.id).to.equal(appBidRequest.params.publisherId);
      });

      it('should fall back to publisherId for site.id when siteId is not set', function() {
        const siteBidRequest = {
          ...nativeBidRequest,
          params: {
            ...nativeBidRequest.params,
            siteId: undefined
          }
        };
        const request = spec.buildRequests([siteBidRequest], bidderRequest);

        const data = request.data;

        expect(data.site.publisher.id).to.equal(siteBidRequest.params.publisherId);
        expect(data.site.id).to.equal(siteBidRequest.params.publisherId);
      });

      it('should fall back to 0 when params.bidfloor is not set and no floor processor ran', function() {
        delete nativeBidRequest.params.bidfloor;
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);

        const data = request.data;

        expect(data.imp[0].bidfloor).to.equal(0);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('should not overwrite floor set by processor (via ortb2Imp)', function() {
        nativeBidRequest.ortb2Imp = {
          bidfloor: 3.2,
          bidfloorcur: 'USD',
        };
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);

        const data = request.data;

        expect(data.imp[0].bidfloor).to.equal(3.2);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('should send gdpr data when gdpr does not apply', function() {
        const request = spec.buildRequests([nativeBidRequest], {
          ...bidderRequest,
          ortb2: {
            ...bidderRequest.ortb2,
            user: { ext: { consent: '' } },
            regs: { ext: { gdpr: 0 } }
          }
        });

        const data = request.data;

        expect(data.user).to.deep.equal({
          ext: {
            consent: ''
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: 0
          }
        });
      });

      it('should send gdpr data when gdpr applies', function() {
        const tcString = 'sometcstring';
        const request = spec.buildRequests([nativeBidRequest], {
          ...bidderRequest,
          ortb2: {
            ...bidderRequest.ortb2,
            user: { ext: { consent: tcString } },
            regs: { ext: { gdpr: 1 } }
          }
        });

        const data = request.data;

        expect(data.user).to.deep.equal({
          ext: {
            consent: tcString
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: 1
          }
        });
      });
    });

    describe('spec.interpretResponse', function() {
      it('should return no bids if the response is not valid', function() {
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);
        const bidResponse = spec.interpretResponse({ body: null }, request);
        expect(bidResponse.length).to.equal(0);
      });

      it('should return a valid bid response', function() {
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);
        const bidResponse = spec.interpretResponse(
          { body: nativeServerResponse },
          request
        )[0];
        expect(bidResponse).to.contain({
          requestId: nativeBidRequest.bidId,
          cpm: nativeServerResponse.seatbid[0].bid[0].price,
          creativeId: nativeServerResponse.seatbid[0].bid[0].crid,
          ttl: 300,
          netRevenue: true,
          mediaType: 'native',
          currency: nativeServerResponse.cur
        });

        expect(bidResponse.meta).to.deep.equal({
          advertiserDomains: ['readpeak.com'],
        });

        if (FEATURES.NATIVE) {
          // ortbConverter returns native in ORTB format
          const ortbNative = bidResponse.native.ortb;
          expect(ortbNative.assets).to.be.an('array');
          expect(ortbNative.assets.find(a => a.title)).to.deep.include({
            title: { text: 'Title' }
          });
          expect(ortbNative.link.url).to.equal('http://url.to/target');
          expect(ortbNative.imptrackers).to.contain('http://url.to/pixeltracker');
        }
      });
    });
  });

  describe('Banner', function() {
    describe('spec.isBidRequestValid', function() {
      it('should return true when the required params are passed', function() {
        expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(true);
      });

      it('should return false when the "publisherId" param is missing', function() {
        bannerBidRequest.params = {
          bidfloor: 5.0
        };
        expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(false);
      });

      it('should return false when no bid params are passed', function() {
        bannerBidRequest.params = {};
        expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(false);
      });
    });

    describe('spec.buildRequests', function() {
      it('should create a POST request for every bid', function() {
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENDPOINT);
      });

      it('should attach request data', function() {
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);

        const data = request.data;

        expect(data.source.ext.prebid).to.equal('$prebid.version$');
        // request.id is generated by the ortbConverter when no ortb2.id is supplied.
        expect(data.id).to.be.a('string').that.is.not.empty;
        expect(data.imp[0].bidfloor).to.equal(bannerBidRequest.params.bidfloor);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
        expect(data.imp[0].tagid).to.equal('test-tag-1');
        expect(data.site.publisher.id).to.equal(bannerBidRequest.params.publisherId);
        expect(data.site.id).to.equal(bannerBidRequest.params.siteId);
        expect(data.site.page).to.equal(bidderRequest.ortb2.site.page);
        expect(data.site.domain).to.equal(bidderRequest.ortb2.site.domain);
        expect(data.device).to.deep.contain({
          ua: navigator.userAgent,
          language: navigator.language
        });
        expect(data.user).to.be.undefined;
        expect(data.regs).to.be.undefined;
      });

      it('should fall back to 0 when params.bidfloor is not set and no floor processor ran', function() {
        delete bannerBidRequest.params.bidfloor;
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);

        const data = request.data;

        expect(data.imp[0].bidfloor).to.equal(0);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('should not overwrite floor set by processor (via ortb2Imp)', function() {
        bannerBidRequest.ortb2Imp = {
          bidfloor: 3.2,
          bidfloorcur: 'USD',
        };
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);

        const data = request.data;

        expect(data.imp[0].bidfloor).to.equal(3.2);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('should fall back to publisherId for site.id when siteId is not set', function() {
        const siteBidRequest = {
          ...bannerBidRequest,
          params: {
            ...bannerBidRequest.params,
            siteId: undefined
          }
        };
        const request = spec.buildRequests([siteBidRequest], bidderRequest);

        const data = request.data;

        expect(data.site.publisher.id).to.equal(siteBidRequest.params.publisherId);
        expect(data.site.id).to.equal(siteBidRequest.params.publisherId);
      });

      it('should send an app object instead of site when params.app is set', function() {
        const appBidRequest = {
          ...bannerBidRequest,
          params: {
            ...bannerBidRequest.params,
            app: {
              bundle: 'com.readpeak.app',
              storeUrl: 'https://store.example/app',
              domain: 'readpeak.app'
            }
          }
        };
        const request = spec.buildRequests([appBidRequest], bidderRequest);

        const data = request.data;

        expect(data.site).to.be.undefined;
        expect(data.app).to.deep.equal({
          publisher: { id: appBidRequest.params.publisherId },
          id: appBidRequest.params.siteId,
          bundle: 'com.readpeak.app',
          storeurl: 'https://store.example/app',
          domain: 'readpeak.app'
        });
      });

      it('should fall back to publisherId for app.id when siteId is not set', function() {
        const appBidRequest = {
          ...bannerBidRequest,
          params: {
            ...bannerBidRequest.params,
            siteId: undefined,
            app: {
              bundle: 'com.readpeak.app'
            }
          }
        };
        const request = spec.buildRequests([appBidRequest], bidderRequest);

        const data = request.data;

        expect(data.site).to.be.undefined;
        expect(data.app.publisher.id).to.equal(appBidRequest.params.publisherId);
        expect(data.app.id).to.equal(appBidRequest.params.publisherId);
      });

      it('should send gdpr data when gdpr does not apply', function() {
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ortb2: {
            ...bidderRequest.ortb2,
            user: { ext: { consent: '' } },
            regs: { ext: { gdpr: 0 } }
          }
        });

        const data = request.data;

        expect(data.user).to.deep.equal({
          ext: {
            consent: ''
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: 0
          }
        });
      });

      it('should send gdpr data when gdpr applies', function() {
        const tcString = 'sometcstring';
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ortb2: {
            ...bidderRequest.ortb2,
            user: { ext: { consent: tcString } },
            regs: { ext: { gdpr: 1 } }
          }
        });

        const data = request.data;

        expect(data.user).to.deep.equal({
          ext: {
            consent: tcString
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: 1
          }
        });
      });
    });

    describe('spec.interpretResponse', function() {
      it('should return no bids if the response is not valid', function() {
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);
        const bidResponse = spec.interpretResponse({ body: null }, request);
        expect(bidResponse.length).to.equal(0);
      });

      it('should return a valid bid response', function() {
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);
        const bidResponse = spec.interpretResponse(
          { body: bannerServerResponse },
          request
        )[0];
        expect(bidResponse).to.contain({
          requestId: bannerBidRequest.bidId,
          cpm: bannerServerResponse.seatbid[0].bid[0].price,
          creativeId: bannerServerResponse.seatbid[0].bid[0].crid,
          ttl: 300,
          netRevenue: true,
          mediaType: 'banner',
          currency: bannerServerResponse.cur,
          width: bannerServerResponse.seatbid[0].bid[0].w,
          height: bannerServerResponse.seatbid[0].bid[0].h,
          burl: bannerServerResponse.seatbid[0].bid[0].burl,
        });
        // ortbConverter prepends nurl tracking pixel to ad markup
        expect(bidResponse.ad).to.contain(bannerServerResponse.seatbid[0].bid[0].adm);
        expect(bidResponse.meta).to.deep.equal({
          advertiserDomains: ['readpeak.com'],
        });
      });
    });
  });

  if (FEATURES.NATIVE) {
    describe('Multi-format', function() {
      function mixedBidRequest() {
        return {
          ...nativeBidRequest,
          mediaTypes: {
            ...nativeBidRequest.mediaTypes,
            banner: bannerBidRequest.mediaTypes.banner,
          },
          sizes: bannerBidRequest.sizes,
        };
      }

      it('should parse banner responses as banner when the request imp also supports native', function() {
        const bidRequest = mixedBidRequest();
        const request = spec.buildRequests([bidRequest], bidderRequest);
        const response = {
          ...bannerServerResponse,
          seatbid: [{
            bid: [{
              ...bannerServerResponse.seatbid[0].bid[0],
              impid: bidRequest.bidId,
              mtype: 1,
            }],
          }],
        };

        expect(request.data.imp[0].banner).to.exist;
        expect(request.data.imp[0].native).to.exist;

        const bidResponse = spec.interpretResponse({ body: response }, request)[0];

        expect(bidResponse.mediaType).to.equal('banner');
        expect(bidResponse.ad).to.contain(bannerServerResponse.seatbid[0].bid[0].adm);
      });

      it('should parse native responses as native when native adm is returned for a mixed imp', function() {
        const bidRequest = mixedBidRequest();
        const request = spec.buildRequests([bidRequest], bidderRequest);
        const response = {
          ...nativeServerResponse,
          seatbid: [{
            bid: [{
              ...nativeServerResponse.seatbid[0].bid[0],
              impid: bidRequest.bidId,
              adm: JSON.stringify(nativeServerResponse.seatbid[0].bid[0].adm),
              mtype: 4,
            }],
          }],
        };

        const bidResponse = spec.interpretResponse({ body: response }, request)[0];

        expect(bidResponse.mediaType).to.equal('native');
        expect(bidResponse.native.ortb.assets.find(a => a.title)).to.deep.include({
          title: { text: 'Title' }
        });
      });
    });
  }

  describe('spec.onBidBillable', function() {
    let triggerPixelStub;

    beforeEach(function() {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function() {
      triggerPixelStub.restore();
    });

    it('should trigger the billing pixel with the auction price replaced', function() {
      const bid = {
        burl: 'https://readpeak.com/billing?price=${AUCTION_PRICE}',
        originalCpm: 1.23,
        cpm: 1.5
      };
      spec.onBidBillable(bid);
      expect(triggerPixelStub.calledOnce).to.equal(true);
      expect(triggerPixelStub.firstCall.args[0]).to.equal('https://readpeak.com/billing?price=1.23');
    });

    it('should fall back to cpm when originalCpm is not set', function() {
      const bid = {
        burl: 'https://readpeak.com/billing?price=${AUCTION_PRICE}',
        cpm: 2.5
      };
      spec.onBidBillable(bid);
      expect(triggerPixelStub.calledOnce).to.equal(true);
      expect(triggerPixelStub.firstCall.args[0]).to.equal('https://readpeak.com/billing?price=2.5');
    });

    it('should not trigger a pixel when burl is missing', function() {
      spec.onBidBillable({});
      expect(triggerPixelStub.called).to.equal(false);
    });

    it('should not trigger a pixel when burl is not a string', function() {
      spec.onBidBillable({ burl: 12345 });
      expect(triggerPixelStub.called).to.equal(false);
    });
  });

  if (FEATURES.NATIVE) {
    describe('Native media type fallback', function() {
      it('should treat a response without mtype as native for a native-only imp', function() {
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);
        const response = {
          ...nativeServerResponse,
          seatbid: [{
            bid: [{
              ...nativeServerResponse.seatbid[0].bid[0],
              impid: nativeBidRequest.bidId,
              // non-native adm and no mtype forces the context.imp.native fallback branch
              adm: JSON.stringify({ foo: 'bar' }),
              mtype: undefined
            }]
          }]
        };

        expect(request.data.imp[0].native).to.exist;
        expect(request.data.imp[0].banner).to.not.exist;

        // the fallback resolves the mediaType to native; the adm has no assets so the bid is skipped
        const bidResponses = spec.interpretResponse({ body: response }, request);
        expect(bidResponses).to.be.an('array').that.is.empty;
      });
    });
  }

  if (FEATURES.NATIVE) {
    describe('Native production path (nativeOrtbRequest)', function() {
      let prodNativeBidRequest;
      let prodNativeOrtbRequest;
      let prodNativeServerResponse;

      beforeEach(function() {
        // Simulate what decorateAdUnitsWithNativeParams does in production
        const nativeParams = {
          title: { required: true, len: 200 },
          image: { wmin: 100 },
          sponsoredBy: {},
          body: { required: false },
          cta: { required: false }
        };
        prodNativeOrtbRequest = toOrtbNativeRequest(nativeParams);

        prodNativeBidRequest = {
          ...baseBidRequest,
          nativeParams,
          nativeOrtbRequest: prodNativeOrtbRequest,
          mediaTypes: {
            native: {
              title: { required: true, len: 200 },
              image: { wmin: 100 },
              sponsoredBy: {},
              body: { required: false },
              cta: { required: false }
            },
          }
        };

        // Response keyed off the ortbConverter-assigned IDs (0-based)
        prodNativeServerResponse = {
          id: baseBidRequest.bidderRequestId,
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  id: 'bid-1',
                  impid: baseBidRequest.bidId,
                  price: 0.12,
                  cid: '12',
                  crid: '123',
                  adomain: ['readpeak.com'],
                  mtype: 4,
                  adm: JSON.stringify({
                    assets: [
                      { id: 0, title: { text: 'Title' } },
                      { id: 1, img: { type: 3, url: 'http://url.to/image', w: 750, h: 500 } },
                      { id: 2, data: { type: 1, value: 'Brand Name' } },
                      { id: 3, data: { type: 2, value: 'Description' } },
                      { id: 4, data: { type: 12, value: 'Click here' } }
                    ],
                    link: { url: 'http://url.to/target' },
                    imptrackers: ['http://url.to/pixeltracker']
                  })
                }
              ]
            }
          ]
        };
      });

      it('should use nativeOrtbRequest from the core pipeline (fillNativeImp) instead of adapter fallback', function() {
        const request = spec.buildRequests([prodNativeBidRequest], bidderRequest);
        const imp = request.data.imp[0];

        expect(imp.native).to.exist;
        // fillNativeImp serializes nativeOrtbRequest into imp.native.request
        const nativeRequest = JSON.parse(imp.native.request);
        expect(nativeRequest.ver).to.equal('1.2');
        expect(nativeRequest.assets).to.be.an('array').with.lengthOf(5);

        // Verify 0-based IDs from toOrtbNativeRequest
        expect(nativeRequest.assets[0]).to.deep.include({ id: 0, required: 1 });
        expect(nativeRequest.assets[0].title).to.deep.equal({ len: 200 });

        expect(nativeRequest.assets[1]).to.deep.include({ id: 1, required: 0 });
        expect(nativeRequest.assets[1].img).to.deep.include({ type: 3 });

        expect(nativeRequest.assets[2]).to.deep.include({ id: 2, required: 0 });
        expect(nativeRequest.assets[2].data).to.deep.equal({ type: 1 });

        expect(nativeRequest.assets[3]).to.deep.include({ id: 3, required: 0 });
        expect(nativeRequest.assets[3].data).to.deep.equal({ type: 2 });

        expect(nativeRequest.assets[4]).to.deep.include({ id: 4, required: 0 });
        expect(nativeRequest.assets[4].data).to.deep.equal({ type: 12 });
      });

      it('should correctly interpret a native response keyed to production asset IDs', function() {
        const request = spec.buildRequests([prodNativeBidRequest], bidderRequest);
        const bidResponse = spec.interpretResponse(
          { body: prodNativeServerResponse },
          request
        )[0];

        expect(bidResponse.mediaType).to.equal('native');
        expect(bidResponse.requestId).to.equal(baseBidRequest.bidId);
        expect(bidResponse.cpm).to.equal(0.12);

        const ortbNative = bidResponse.native.ortb;
        expect(ortbNative.assets).to.be.an('array').with.lengthOf(5);
        expect(ortbNative.assets[0]).to.deep.equal({ id: 0, title: { text: 'Title' } });
        expect(ortbNative.assets[1]).to.deep.include({ id: 1 });
        expect(ortbNative.assets[1].img).to.deep.include({ url: 'http://url.to/image' });
        expect(ortbNative.assets[2]).to.deep.equal({ id: 2, data: { type: 1, value: 'Brand Name' } });
        expect(ortbNative.assets[3]).to.deep.equal({ id: 3, data: { type: 2, value: 'Description' } });
        expect(ortbNative.assets[4]).to.deep.equal({ id: 4, data: { type: 12, value: 'Click here' } });
        expect(ortbNative.link.url).to.equal('http://url.to/target');
        expect(ortbNative.imptrackers).to.contain('http://url.to/pixeltracker');
      });

      it('should use 0-based asset IDs from core fillNativeImp', function() {
        const request = spec.buildRequests([prodNativeBidRequest], bidderRequest);
        const nativeRequest = JSON.parse(request.data.imp[0].native.request);

        // Core toOrtbNativeRequest assigns 0-based IDs
        const ids = nativeRequest.assets.map(a => a.id);
        expect(ids).to.deep.equal([0, 1, 2, 3, 4]);
      });
    });
  }

  describe('device.devicetype fallback', function() {
    it('should populate devicetype when not set by the publisher', function() {
      const request = spec.buildRequests([nativeBidRequest], bidderRequest);
      const data = request.data;

      expect(data.device.devicetype).to.be.a('number');
      expect([2, 4, 5]).to.include(data.device.devicetype);
    });

    it('should preserve publisher-provided devicetype and not overwrite it', function() {
      const request = spec.buildRequests([nativeBidRequest], {
        ...bidderRequest,
        ortb2: {
          ...bidderRequest.ortb2,
          device: {
            ...bidderRequest.ortb2.device,
            devicetype: 3, // connectedtv - not a value the fallback would ever produce
          }
        }
      });
      const data = request.data;

      expect(data.device.devicetype).to.equal(3);
    });

    it('should detect Connected TV user agents as devicetype 3', function() {
      const ctvUserAgents = [
        'Mozilla/5.0 (Linux; Tizen 5.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/2.2 Chrome/63.0.3239.84 TV Safari/537.36',
        'Roku/DVP-10.5 (10.5.0.0090)',
        'Mozilla/5.0 (Linux; Android 9; SHIELD Android TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Mobile Safari/537.36 SmartTV',
        'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.34 Safari/537.36 HbbTV/1.4.1',
      ];

      const originalUserAgent = navigator.userAgent;
      ctvUserAgents.forEach(ua => {
        Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);
        expect(request.data.device.devicetype).to.equal(3, `Expected CTV (3) for UA: ${ua}`);
      });
      Object.defineProperty(navigator, 'userAgent', { value: originalUserAgent, configurable: true });
    });
  });
});
