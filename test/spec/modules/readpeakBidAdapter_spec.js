import { expect } from 'chai';
import { spec, ENDPOINT } from 'modules/readpeakBidAdapter.js';
import { config } from 'src/config.js';
import { parseUrl } from 'src/utils.js';

describe('ReadPeakAdapter', function() {
  let bidRequest;
  let serverResponse;
  let serverRequest;
  let bidderRequest;

  beforeEach(function() {
    bidderRequest = {
      refererInfo: {
        referer: 'https://publisher.com/home'
      }
    };

    bidRequest = {
      bidder: 'readpeak',
      nativeParams: {
        title: { required: true, len: 200 },
        image: { wmin: 100 },
        sponsoredBy: {},
        body: { required: false },
        cta: { required: false }
      },
      params: {
        bidfloor: 5.0,
        publisherId: '11bc5dd5-7421-4dd8-c926-40fa653bec76',
        siteId: '11bc5dd5-7421-4dd8-c926-40fa653bec77',
        tagId: 'test-tag-1'
      },
      bidId: '2ffb201a808da7',
      bidderRequestId: '178e34bad3658f',
      auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
    };
    serverResponse = {
      id: bidRequest.bidderRequestId,
      cur: 'USD',
      seatbid: [
        {
          bid: [
            {
              id: 'bidRequest.bidId',
              impid: bidRequest.bidId,
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
    serverRequest = {
      method: 'POST',
      url: 'http://localhost:60080/header/prebid',
      data: JSON.stringify({
        id: '178e34bad3658f',
        imp: [
          {
            id: '2ffb201a808da7',
            native: {
              request:
                '{"assets":[{"id":1,"required":1,"title":{"len":200}},{"id":2,"required":0,"data":{"type":1,"len":50}},{"id":3,"required":0,"img":{"type":3,"wmin":100,"hmin":150}}]}',
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
  });

  describe('spec.isBidRequestValid', function() {
    it('should return true when the required params are passed', function() {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when the native params are missing', function() {
      bidRequest.nativeParams = undefined;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the "publisherId" param is missing', function() {
      bidRequest.params = {
        bidfloor: 5.0
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when no bid params are passed', function() {
      bidRequest.params = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when a bid request is not passed', function() {
      expect(spec.isBidRequestValid()).to.equal(false);
      expect(spec.isBidRequestValid({})).to.equal(false);
    });
  });

  describe('spec.buildRequests', function() {
    it('should create a POST request for every bid', function() {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
    });

    it('should attach request data', function() {
      config.setConfig({
        currency: {
          adServerCurrency: 'EUR'
        }
      });

      const request = spec.buildRequests([bidRequest], bidderRequest);

      const data = JSON.parse(request.data);

      expect(data.source.ext.prebid).to.equal('$prebid.version$');
      expect(data.id).to.equal(bidRequest.bidderRequestId);
      expect(data.imp[0].bidfloor).to.equal(bidRequest.params.bidfloor);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
      expect(data.imp[0].tagId).to.equal('test-tag-1');
      expect(data.site.publisher.id).to.equal(bidRequest.params.publisherId);
      expect(data.site.id).to.equal(bidRequest.params.siteId);
      expect(data.site.page).to.equal(bidderRequest.refererInfo.referer);
      expect(data.site.domain).to.equal(parseUrl(bidderRequest.refererInfo.referer).hostname);
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
      bidRequest.getFloor = function () {
        return floorModuleData
      }
      const request = spec.buildRequests([bidRequest], bidderRequest);

      const data = JSON.parse(request.data);

      expect(data.source.ext.prebid).to.equal('$prebid.version$');
      expect(data.id).to.equal(bidRequest.bidderRequestId);
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
      const request = spec.buildRequests([bidRequest], {...bidderRequest, ...gdprData});

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
      const request = spec.buildRequests([bidRequest], {...bidderRequest, ...gdprData});

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
      const bidResponse = spec.interpretResponse({ body: null }, serverRequest);
      expect(bidResponse.length).to.equal(0);
    });

    it('should return a valid bid response', function() {
      const bidResponse = spec.interpretResponse(
        { body: serverResponse },
        serverRequest
      )[0];
      expect(bidResponse).to.contain({
        requestId: bidRequest.bidId,
        cpm: serverResponse.seatbid[0].bid[0].price,
        creativeId: serverResponse.seatbid[0].bid[0].crid,
        ttl: 300,
        netRevenue: true,
        mediaType: 'native',
        currency: serverResponse.cur
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
        'http%3A%2F%2Furl.to%2Ftarget'
      );
      expect(bidResponse.native.impressionTrackers).to.contain(
        'http://url.to/pixeltracker'
      );
    });
  });
});
