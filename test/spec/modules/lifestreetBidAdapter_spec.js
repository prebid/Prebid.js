import { expect } from 'chai';
import { spec } from 'modules/lifestreetBidAdapter.js';

describe('lifestreetBidAdapter', function() {
  let bidRequests;
  let videoBidRequests;
  let bidResponses;
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

    describe('Response checking', function() {
      it('should check for valid response values', function() {
        const request = spec.buildRequests(bidRequests);
        const response = spec.interpretResponse(bidResponses, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].cpm).to.equal((bidResponses.cpm));
        expect(response[0].width).to.equal(bidResponses.width);
        expect(response[0].height).to.equal(bidResponses.height);
        expect(response[0].creativeId).to.equal(bidResponses.creativeId);
        expect(response[0].currency).to.equal('USD');
        expect(response[0].netRevenue).to.equal(true);
        expect(response[0].ttl).to.equal(bidResponses.ttl);
        expect(response[0].ad).to.be.a('string');
      });
    });
  });
});
