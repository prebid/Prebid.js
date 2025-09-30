import { expect } from 'chai';
import { spec, ENDPOINT } from 'modules/empowerBidAdapter.js';
import { config } from 'src/config.js';
import { parseUrl } from 'src/utils.js';

describe('EmpowerAdapter', function() {
  let baseBidRequest;
  let bannerBidRequest;

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
      bidder: 'empower',
      params: {
        zone: '123456'
      },
      bidId: '2ffb201a808da7',
      bidderRequestId: '678e3fbad375ce',
      auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b',
    };

    bannerBidRequest = {
      ...baseBidRequest,
      mediaTypes: {
        banner: {
          sizes: [[970, 250], [300, 250]],
        }
      },
      sizes: [[640, 320], [300, 600]],
    };
    bannerServerResponse = {
      id: '678e3fbad375ce',
      cur: 'USD',
      seatbid: [
        {
          bid: [
            {
              id: '288f5e3e-f122-4928-b5df-434f5b664788',
              impid: '2ffb201a808da7',
              price: 0.12,
              cid: '12',
              crid: '123',
              adomain: ['empower.net'],
              adm: '<iframe src=\"http://localhost:8081/url/creative?id=4326&l=40f1d668-69a9-498e-b694-03fb14c1a1a2&b=e4d39f94-533d-4577-a579-585fd4c02b0a&w=640&h=160\" style=\"width:100%\" width=160 height=600></iframe>',
              burl: 'https://localhost:8081/url/b?d=b604923d-f420-4227-a8af-09b332b33c2d&c=USD&p=${AUCTION_PRICE}&bad=33d141da-dd49-45fc-b29d-1ed38a2168df&gc=0',
              nurl: 'https://localhost:8081/url/n?d=b604923d-f420-4227-a8af-09b332b33c2d&gc=0',
              w: 640,
              h: 360,
            }
          ]
        }
      ]
    };
    bannerServerRequest = {
      method: 'POST',
      url: 'https://bid.virgul.com/prebid',
      data: JSON.stringify({
        id: '678e3fbad375ce',
        imp: [
          {
            id: '2ffb201a808da7',
            bidfloor: 5,
            bidfloorcur: 'USD',
            tagid: '123456',
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
            id: '44bd6161-667e-4a68-8fa4-18b5ae2d8c89'
          },
          id: '1d973061-fe5d-4622-a071-d8a01d72ba7d',
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

  describe('Banner', function() {
    describe('spec.isBidRequestValid', function() {
      it('should return true when the required params are passed', function() {
        expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(true);
      });

      it('should return false when the "zone" param is missing', function() {
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
        expect(data.imp[0].bidfloor).to.equal(0);
        expect(data.imp[0].bidfloorcur).to.equal('EUR');
        expect(data.imp[0].tagid).to.equal('123456');
        expect(data.imp[0].ext.zone).to.equal(bannerBidRequest.params.zone);
        expect(data.site.page).to.equal(bidderRequest.refererInfo.page);
        expect(data.site.domain).to.equal(bidderRequest.refererInfo.domain);
        expect(data.device).to.deep.contain({
          ua: navigator.userAgent,
          language: navigator.language
        });
        expect(data.cur).to.deep.equal(['EUR']);
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
          advertiserDomains: ['empower.net'],
        });
      });
    });
  });
});
