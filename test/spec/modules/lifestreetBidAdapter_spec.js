import { expect } from 'chai';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { spec } from 'modules/lifestreetBidAdapter.js';

describe('lifestreetBidAdapter', function() {
  let bidRequests;
  let videoBidRequests;
  let bidResponses;
  let videoBidResponses;
  beforeEach(function() {
    bidRequests = [
      {
        bidder: 'lifestreet',
        params: {
          slot: 'slot166704',
          adkey: '78c',
          ad_size: '160x600'
        },
        mediaTypes: {
          banner: {
            sizes: [
              [160, 600],
              [300, 600]
            ]
          }
        },
        sizes: [
          [160, 600],
          [300, 600]
        ]
      }
    ];

    bidResponses = {
      body: {
        cpm: 0.1,
        netRevenue: true,
        content_type: 'display_flash',
        width: 160,
        currency: 'USD',
        ttl: 86400,
        content: '<iframe src=\'https://ads.lfstmedia.com/displayAd?__ads=ip37346-u0T8r2uJ8245jv6i2QE8Qu&adt=5748927953915945176&seq=2&plc=K73sUSWIH9WwpIQiGybtg8lYdYFld5NvswMmfGBMz6U&__df=true&clickUrl=https%3A%2F%2Fads.lfstmedia.com%2Fclick%2Fcmp15299%2F5748927953915945176%2F2%3F__ads%3Dip37346-u0T8r2uJ8245jv6i2QE8Qu%26adkey%3D6bd%26slot%3Dslot166704%26__stamp%3D1583331395140%26ad%3Dcrv197050%26_cx%3D%24%24CX%24%24%26_cy%3D%24%24CY%24%24%26_celt%3D%24%24ELT-ID%24%24%26redirectURL%3D\' width=\'160\' height=\'600\' frameBorder=\'0\' scrolling=\'no\' framespacing=\'0\' marginheight=\'0\' marginwidth=\'0\'><!--test--><\/iframe>\n',
        creativeId: 7985076,
        height: 600,
        status: 1
      }
    };
    videoBidRequests = [
      {
        bidder: 'lifestreet',
        params: {
          slot: 'slot1227631',
          adkey: 'a98',
          ad_size: '640x480'
        },
        mediaTypes: {
          video: {
            sizes: [
              [640, 480],
            ]
          }
        }
      }
    ]

    videoBidResponses = {
      body: {
        cpm: 0.1,
        netRevenue: true,
        content_type: 'vast_3_0',
        width: 640,
        currency: 'USD',
        ttl: 86400,
        content: '<iframe src="https://ads.lfstmedia.com/displayAd?__ads=ip38770-u0T8r2uJ8245jv6i2QE8Qu&adt=7734389071973843496&seq=2&plc=QEw02HSSpFZCrGaMUP5rN01QQtwPM5iEI5EQzt1nV4E&__df=true&clickUrl=https%3A%2F%2Fads.lfstmedia.com%2Fclick%2Fcmp20228%2F7734389071973843496%2F2%3F__ads%3Dip38770-u0T8r2uJ8245jv6i2QE8Qu%26adkey%3Dcdc%26slot%3Dslot1227631%26__stamp%3D1583766419183%26ad%3Dcrv225652%26_cx%3D%24%24CX%24%24%26_cy%3D%24%24CY%24%24%26_celt%3D%24%24ELT-ID%24%24%26redirectURL%3D" width="640" height="480" frameBorder="0" scrolling="no" framespacing="0" marginheight="0" marginwidth="0"><!--test--><\/iframe>\n',
        creativeId: 108323592,
        height: 480,
        status: 1
      }
    };
  });
  describe('implementation', function() {
    describe('Bid validations', function() {
      it('valid bid case', function() {
        const validBid = {
          bidder: 'lifestreet',
          params: {
            slot: 'slot166704',
            adkey: '78c',
            ad_size: '160x600'
          }
        };
        expect(spec.isBidRequestValid(validBid)).to.equal(true);
      });

      it('invalid bid case', function() {
        expect(spec.isBidRequestValid()).to.equal(false);
      });

      it('invalid bid case: slot not passed', function() {
        var validBid = {
          bidder: 'lifestreet',
          params: {
            adkey: '78c',
            ad_size: '160x600'
          }
        };
        expect(spec.isBidRequestValid(validBid)).to.equal(false);
      });

      it('invalid bid case: adkey not passed', function() {
        const validBid = {
          bidder: 'lifestreet',
          params: {
            slot: 'slot166704',
            ad_size: '160x600'
          }
        };
        expect(spec.isBidRequestValid(validBid)).to.equal(false);
      });

      it('invalid bid case: ad_size is not passed', function() {
        const validBid = {
          bidder: 'lifestreet',
          params: {
            slot: 'slot166704',
            adkey: '78c'
          }
        };
        expect(spec.isBidRequestValid(validBid)).to.equal(false);
      });
    });

    describe('buildRequests spec method', function () {
      it('method exists and is a function', function () {
        expect(spec.buildRequests).to.exist.and.to.be.a('function');
      });

      it('should not return request when no bids are present', function () {
        const [request] = spec.buildRequests([]);
        expect(request).to.be.undefined;
      });

      it('should return an url and request method ', function () {
        const [request] = spec.buildRequests(bidRequests);
        expect(request.method).to.equal('GET');
        expect(request.url).to.be.a('string');
      });

      it('should return an url that contains all required fields', function () {
        const [request] = spec.buildRequests(bidRequests);
        expect(request.url).to.have.string('adkey');
        expect(request.url).to.have.string('slot');
        expect(request.url).to.have.string('ad_size');
      });

      it('should add GDPR consent information to the request', function () {
        let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
        let bidderRequest = {
          bidderCode: 'lifestreet',
          auctionId: '1d1a030790a875',
          bidderRequestId: '22edbae2744bf6',
          timeout: 3000,
          gdprConsent: {
            consentString: consentString,
            gdprApplies: true
          }
        };
        bidderRequest.bids = bidRequests;

        const [request] = spec.buildRequests(bidRequests, bidderRequest);
        expect(request.url).to.have.string('__gdpr=1');
        expect(request.url).to.have.string(`__consent=${consentString}`);
      });

      it('should add US privacy string to request', function() {
        let consentString = '1YA-';
        let bidderRequest = {
          bidderCode: 'lifestreet',
          auctionId: '1d1a030790a875',
          bidderRequestId: '22edbae2744bf6',
          timeout: 3000,
          uspConsent: consentString
        };
        bidderRequest.bids = bidRequests;

        const [request] = spec.buildRequests(bidRequests, bidderRequest);
        expect(request.url).to.have.string(`__us_privacy=${consentString}`);
      });
    });

    describe('server response', function() {
      it('should return valid proper values', function() {
        const request = spec.buildRequests(bidRequests);
        const response = spec.interpretResponse(bidResponses, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].cpm).to.equal(bidResponses.body.cpm);
        expect(response[0].width).to.equal(bidResponses.body.width);
        expect(response[0].height).to.equal(bidResponses.body.height);
        expect(response[0].creativeId).to.equal(bidResponses.body.creativeId);
        expect(response[0].currency).to.equal('USD');
        expect(response[0].netRevenue).to.equal(true);
        expect(response[0].ttl).to.equal(bidResponses.body.ttl);
      });

      it('should return proper mediaType for BANNER', function() {
        const request = spec.buildRequests(bidRequests);
        const [response] = spec.interpretResponse(bidResponses, request);
        expect(response.mediaType).to.equal(BANNER);
      });

      it('should return proper mediaType for VIDEO', function() {
        const request = spec.buildRequests(videoBidRequests);
        const [response] = spec.interpretResponse(videoBidResponses, request);
        expect(response.mediaType).to.equal(VIDEO);
      });

      it('should return a VAST XML for VIDEO', function() {
        const request = spec.buildRequests(videoBidRequests);
        const [response] = spec.interpretResponse(videoBidResponses, request);
        expect(response.vastXml).to.be.a('string');
        expect(response.vastXml).to.have.string('iframe');
      });

      it('should return an ad content for BANNER', function() {
        const request = spec.buildRequests(bidRequests);
        const [response] = spec.interpretResponse(bidResponses, request);
        expect(response.ad).to.be.a('string');
        expect(response.ad).to.have.string('iframe');
      });
    });
  });
});
