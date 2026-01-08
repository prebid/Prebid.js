import { expect } from 'chai';
import { spec, ENDPOINT } from 'modules/readpeakBidAdapter.js';
import { config } from 'src/config.js';
import { parseUrl } from 'src/utils.js';

describe('ReadPeakAdapter', function() {
  let baseBidRequest;
  let bannerBidRequest;
  let nativeBidRequest;
  let nativeServerResponse;
  let nativeServerRequest;
  let bannerServerResponse;
  let bannerServerRequest;
  let bidderRequest;

  beforeEach(function() {
    bidderRequest = {
      refererInfo: {
        page: 'https://publisher.com/home',
        domain: 'publisher.com'
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

    nativeBidRequest = {
      ...baseBidRequest,
      nativeParams: {
        title: { required: true, len: 200 },
        image: { wmin: 100 },
        sponsoredBy: {},
        body: { required: false },
        cta: { required: false }
      },
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
    bannerBidRequest = {
      ...baseBidRequest,
      mediaTypes: {
        banner: {
          sizes: [[640, 320], [300, 600]],
        }
      },
      sizes: [[640, 320], [300, 600]],
    }
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
    nativeServerRequest = {
      method: 'POST',
      url: 'http://localhost:60080/header/prebid',
      data: JSON.stringify({
        id: '178e34bad3658f',
        imp: [
          {
            id: '2ffb201a808da7',
            native: {
              request:
                '{\"assets\":[{\"id\":1,\"required\":1,\"title\":{\"len\":70}},{\"id\":2,\"required\":1,\"img\":{\"type\":3,\"wmin\":150,\"hmin\":150}},{\"id\":4,\"required\":1,\"data\":{\"type\":2,\"len\":120}}]}',
              ver: '1.1'
            },
            bidfloor: 5,
            bidfloorcur: 'USD',
            tagId: 'test-tag-1'
          }
        ],
        site: {
          publisher: {
            id: '11bc5dd5-7421-4dd8-c926-40fa653bec76'
          },
          id: '11bc5dd5-7421-4dd8-c926-40fa653bec77',
          ref: '',
          page: 'http://localhost',
          domain: 'localhost'
        },
        app: null,
        device: {
          ua:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/61.0.3163.100 Safari/537.36',
          language: 'en-US'
        },
        isPrebid: true
      })
    };
    bannerServerRequest = {
      method: 'POST',
      url: 'http://localhost:60080/header/prebid',
      data: JSON.stringify({
        id: '178e34bad3658f',
        imp: [
          {
            id: '2ffb201a808da7',
            bidfloor: 5,
            bidfloorcur: 'USD',
            tagId: 'test-tag-1',
            banner: {
              w: 640,
              h: 360,
              format: [
                { w: 640, h: 360 },
                { w: 320, h: 320 },
              ]
            }
          }
        ],
        site: {
          publisher: {
            id: '11bc5dd5-7421-4dd8-c926-40fa653bec76'
          },
          id: '11bc5dd5-7421-4dd8-c926-40fa653bec77',
          ref: '',
          page: 'http://localhost',
          domain: 'localhost'
        },
        app: null,
        device: {
          ua:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/61.0.3163.100 Safari/537.36',
          language: 'en-US'
        },
        isPrebid: true
      })
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
        config.setConfig({
          currency: {
            adServerCurrency: 'EUR'
          }
        });

        const request = spec.buildRequests([nativeBidRequest], bidderRequest);

        const data = JSON.parse(request.data);

        expect(data.source.ext.prebid).to.equal('$prebid.version$');
        expect(data.id).to.equal(nativeBidRequest.bidderRequestId);
        expect(data.imp[0].bidfloor).to.equal(nativeBidRequest.params.bidfloor);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
        expect(data.imp[0].tagId).to.equal('test-tag-1');
        expect(data.site.publisher.id).to.equal(nativeBidRequest.params.publisherId);
        expect(data.site.id).to.equal(nativeBidRequest.params.siteId);
        expect(data.site.page).to.equal(bidderRequest.refererInfo.page);
        expect(data.site.domain).to.equal(bidderRequest.refererInfo.domain);
        expect(data.device).to.deep.contain({
          ua: navigator.userAgent,
          language: navigator.language
        });
        expect(data.cur).to.deep.equal(['EUR']);
        expect(data.user).to.be.undefined;
        expect(data.regs).to.be.undefined;
      });

      it('should get bid floor from module', function() {
        const floorModuleData = {
          currency: 'USD',
          floor: 3.2,
        }
        nativeBidRequest.getFloor = function () {
          return floorModuleData
        }
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);

        const data = JSON.parse(request.data);

        expect(data.source.ext.prebid).to.equal('$prebid.version$');
        expect(data.id).to.equal(nativeBidRequest.bidderRequestId);
        expect(data.imp[0].bidfloor).to.equal(floorModuleData.floor);
        expect(data.imp[0].bidfloorcur).to.equal(floorModuleData.currency);
      });

      it('should send gdpr data when gdpr does not apply', function() {
        const gdprData = {
          gdprConsent: {
            gdprApplies: false,
            consentString: undefined,
          }
        }
        const request = spec.buildRequests([nativeBidRequest], {...bidderRequest, ...gdprData});

        const data = JSON.parse(request.data);

        expect(data.user).to.deep.equal({
          ext: {
            consent: ''
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: false
          }
        });
      });

      it('should send gdpr data when gdpr applies', function() {
        const tcString = 'sometcstring';
        const gdprData = {
          gdprConsent: {
            gdprApplies: true,
            consentString: tcString
          }
        }
        const request = spec.buildRequests([nativeBidRequest], {...bidderRequest, ...gdprData});

        const data = JSON.parse(request.data);

        expect(data.user).to.deep.equal({
          ext: {
            consent: tcString
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: true
          }
        });
      });
    });

    describe('spec.interpretResponse', function() {
      it('should return no bids if the response is not valid', function() {
        const bidResponse = spec.interpretResponse({ body: null }, nativeServerRequest);
        expect(bidResponse.length).to.equal(0);
      });

      it('should return a valid bid response', function() {
        const bidResponse = spec.interpretResponse(
          { body: nativeServerResponse },
          nativeServerRequest
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
        })
        expect(bidResponse.native.title).to.equal('Title');
        expect(bidResponse.native.body).to.equal('Description');
        expect(bidResponse.native.image).to.deep.equal({
          url: 'http://url.to/image',
          width: 750,
          height: 500
        });
        expect(bidResponse.native.clickUrl).to.equal(
          'http://url.to/target'
        );
        expect(bidResponse.native.impressionTrackers).to.contain(
          'http://url.to/pixeltracker'
        );
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
        config.setConfig({
          currency: {
            adServerCurrency: 'EUR'
          }
        });

        const request = spec.buildRequests([bannerBidRequest], bidderRequest);

        const data = JSON.parse(request.data);

        expect(data.source.ext.prebid).to.equal('$prebid.version$');
        expect(data.id).to.equal(bannerBidRequest.bidderRequestId);
        expect(data.imp[0].bidfloor).to.equal(bannerBidRequest.params.bidfloor);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
        expect(data.imp[0].tagId).to.equal('test-tag-1');
        expect(data.site.publisher.id).to.equal(bannerBidRequest.params.publisherId);
        expect(data.site.id).to.equal(bannerBidRequest.params.siteId);
        expect(data.site.page).to.equal(bidderRequest.refererInfo.page);
        expect(data.site.domain).to.equal(bidderRequest.refererInfo.domain);
        expect(data.device).to.deep.contain({
          ua: navigator.userAgent,
          language: navigator.language
        });
        expect(data.cur).to.deep.equal(['EUR']);
        expect(data.user).to.be.undefined;
        expect(data.regs).to.be.undefined;
      });

      it('should get bid floor from module', function() {
        const floorModuleData = {
          currency: 'USD',
          floor: 3.2,
        }
        bannerBidRequest.getFloor = function () {
          return floorModuleData
        }
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);

        const data = JSON.parse(request.data);

        expect(data.source.ext.prebid).to.equal('$prebid.version$');
        expect(data.id).to.equal(bannerBidRequest.bidderRequestId);
        expect(data.imp[0].bidfloor).to.equal(floorModuleData.floor);
        expect(data.imp[0].bidfloorcur).to.equal(floorModuleData.currency);
      });

      it('should send gdpr data when gdpr does not apply', function() {
        const gdprData = {
          gdprConsent: {
            gdprApplies: false,
            consentString: undefined,
          }
        }
        const request = spec.buildRequests([bannerBidRequest], {...bidderRequest, ...gdprData});

        const data = JSON.parse(request.data);

        expect(data.user).to.deep.equal({
          ext: {
            consent: ''
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: false
          }
        });
      });

      it('should send gdpr data when gdpr applies', function() {
        const tcString = 'sometcstring';
        const gdprData = {
          gdprConsent: {
            gdprApplies: true,
            consentString: tcString
          }
        }
        const request = spec.buildRequests([bannerBidRequest], {...bidderRequest, ...gdprData});

        const data = JSON.parse(request.data);

        expect(data.user).to.deep.equal({
          ext: {
            consent: tcString
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: true
          }
        });
      });
    });

    describe('spec.interpretResponse', function() {
      it('should return no bids if the response is not valid', function() {
        const bidResponse = spec.interpretResponse({ body: null }, bannerServerRequest);
        expect(bidResponse.length).to.equal(0);
      });

      it('should return a valid bid response', function() {
        const bidResponse = spec.interpretResponse(
          { body: bannerServerResponse },
          bannerServerRequest
        )[0];
        expect(bidResponse).to.contain({
          requestId: bannerBidRequest.bidId,
          cpm: bannerServerResponse.seatbid[0].bid[0].price,
          creativeId: bannerServerResponse.seatbid[0].bid[0].crid,
          ttl: 300,
          netRevenue: true,
          mediaType: 'banner',
          currency: bannerServerResponse.cur,
          ad: bannerServerResponse.seatbid[0].bid[0].adm,
          width: bannerServerResponse.seatbid[0].bid[0].w,
          height: bannerServerResponse.seatbid[0].bid[0].h,
          burl: bannerServerResponse.seatbid[0].bid[0].burl,
        });
        expect(bidResponse.meta).to.deep.equal({
          advertiserDomains: ['readpeak.com'],
        });
      });
    });
  });
});
