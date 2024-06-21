import {
  expect
} from 'chai';
import {
  spec
} from '../../../modules/audiencelogyBidAdapter';
import * as utils from '../../../src/utils.js';

describe('audiencelogy adapter', function() {
  let request;
  let bannerResponse, invalidResponse;

  beforeEach(function() {
    request = [{
      bidder: 'audiencelogy',
      mediaTypes: {
        banner: {
          sizes: [
            [160, 600]
          ]
        }
      },
      params: {
        placement_id: 584,
        user_id: '11211',
        nid: 1,
        width: 160,
        height: 600,
        domain: '',
        bid_floor: 0.5
      }
    }];
    bannerResponse = {
      'body': {
        'id': 'fffa1bd3-4081-4af4-8c88-ae4818cbb7c0',
        'seatbid': [{
          'bid': [{
            'id': '6c773235-bb84-44cb-afaf-2adaa8855393',
            'impid': '291c17291a08a7',
            'price': 0.47,
            'adid': '3418',
            'adm': "<a href=\"https://r.audiencelogy.com/adx-rtb-m/click?qs=H4sIAAAAAAAAAx2SiQ3EMAgEWzLmLwfz9F/CkbMiKwoBlllaPV5bHno3qATFyYU99kzzlYhbU1XzwM7UeV7ITI2XJl0k+KKHPNVEiA0AssEllsGj2KYn078C3MZnbsPsZ51Nk+hqPU0mI1S5OtxSUjoVBMhUAoGy60VTZsXLgHLiWyqoaYGHj+XYoQSwpOvqW2qEN7PbpbZKcaSuXHyZo0n2/LJzhF5GNAfn7R8GD7cd5RmsvBaXn4CcmTgLCfHQ2Ucu3G50lx7Wd21bn3yJfYV6JIMZ+nWdkzpTgSjG5Mr+Tr9XG+BKMbr1ZgXiecaLoeS5vXDPRa45JOmnbnFjPN7/8MG6JU0QE28wTSnI82BBrDG8o7ZFkcDwzHLkeBisBkUO+Ja9MCFNrXMf6Usk02kXQGRDAeb+8IXMK91be/IImhCXjNc4SgW9XZES1zPb7zapZy3KyGPShlevr72lGIQVp7R514MGAgZSVbjC5ubiqnOFLRPu24khD2gh+g5/TdXkSEEdXh8uMMFK6Gftu0n3iQfbIjNCUb1J3RpzIB1P4ir5v8PuUd7eadZyAThQxlHPDPMHzcc8NQADAAA=\" target=\"_blank\"><img src=\"https://cdn.audiencelogy.com/1_3418_1.png\" height=\"600\" width=\"160\"></img></a><img width=\"1px\" height=\"1px\" style=\"display:none;\" src=\"http://rtb.audiencelogy.com:9001/beacon?uid=4b2ff0b60ea86157135e1ab7eccf7e20&cc=1383&fccap=3&nid=1\"></img><script async src='https://i.audiencelogy.com/adx-rtb-m/view?qs=&price=${AUCTION_PRICE}&qsenc=H4sIAAAAAAAAAxWRyQ0AMQgDW+ImlMOV/kvY7BMh24OhxEM3IWFdql2Lp5fmXJ+INDcigKrhdRZqLsYLB7U9hOcU9giAJzIWL5FPKZHuwB4w9SCvW3qlvYgiFKsiAVfQuLrTBzE0X2RnxLE6/lAw15asWNEgnOBkBxccTc1+bls6dUxuMx0i+cO9dR39LUz6nB6TeSNUqk2ir5HTgldKzB5DCJFHMmg5V/K68xiuhSSVGTQ39ATVsxAoQBQm8QaFkVmE4Vp0ATWxW6PDgwzsDzHygnVhzKUdf1MDvbr0epw2eVo3nCdVvVl2lIa0igUY7cbjf6DknjuBcv4aTc6ByyAnATqWH/P71HklLr/z9j5lKvONuhFB+gGXujix4AEAAA=='></script><script async src='https://i.audiencelogy.com/adx-rtb-m/view?qs=&price=${AUCTION_PRICE}&qsenc=H4sIAAAAAAAAAxWRyQ0AMQgDW+ImlMOV/kvY7BMh24OhxEM3IWFdql2Lp5fmXJ+INDcigKrhdRZqLsYLB7U9hOcU9giAJzIWL5FPKZHuwB4w9SCvW3qlvYgiFKsiAVfQuLrTBzE0X2RnxLE6/lAw15asWNEgnOBkBxccTc1+bls6dUxuMx0i+cO9dR39LUz6nB6TeSNUqk2ir5HTgldKzB5DCJFHMmg5V/K68xiuhSSVGTQ39ATVsxAoQBQm8QaFkVmE4Vp0ATWxW6PDgwzsDzHygnVhzKUdf1MDvbr0epw2eVo3nCdVvVl2lIa0igUY7cbjf6DknjuBcv4aTc6ByyAnATqWH/P71HklLr/z9j5lKvONuhFB+gGXujix4AEAAA=='></script>",
            'adomain': ['audiencelogy.com'],
            'iurl': 'https://cdn.audiencelogy.com/1_3418_1.png',
            'cid': '1383/3418',
            'crid': '3418',
            'w': 160,
            'h': 600,
            'cat': ['IAB1']
          }],
          'seat': 'audiencelogy',
          'group': 0
        }],
        'cur': 'USD',
        'bidid': 'BIDDER_1256'
      }
    };
    invalidResponse = {
      'body': {
        'id': 'fffa1bd3-4081-4af4-8c88-ae4818cbb7c0',
        'seatbid': [{
          'bid': [{
            'id': '6c773235-bb84-44cb-afaf-2adaa8855393',
            'impid': '291c17291a08a7',
            'price': 0.47,
            'adid': '3418',
            'adm': 'invalid response',
            'adomain': ['audiencelogy.com'],
            'iurl': 'https://cdn.audiencelogy.com/1_3418_1.png',
            'cid': '1383/3418',
            'crid': '3418',
            'w': 160,
            'h': 600,
            'cat': ['IAB1']
          }],
          'seat': 'audiencelogy',
          'group': 0
        }],
        'cur': 'USD',
        'bidid': 'BIDDER_1256'
      }
    };
  });

  describe('validations', function() {
    it('isBidValid : placement_id, user_id and nid are passed', function() {
      let bid = {
          bidder: 'audiencelogy',
          params: {
            placement_id: 584,
            user_id: '11211',
            nid: 1
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(true);
    });
    it('isBidValid : placement_id, user_id and nid are not passed', function() {
      let bid = {
          bidder: 'audiencelogy',
          params: {
            width: 160,
            height: 600,
            domain: '',
            bid_floor: 0.5
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(false);
    });
    it('isBidValid : placement_id and nid are passed but user_id is not passed', function() {
      let bid = {
          bidder: 'audiencelogy',
          params: {
            placement_id: 584,
            nid: 1,
            width: 160,
            height: 600,
            domain: '',
            bid_floor: 0.5
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(false);
    });
    it('isBidValid : user_id and nid are passed but placement_id is not passed', function() {
      let bid = {
          bidder: 'audiencelogy',
          params: {
            user_id: '11211',
            nid: 1,
            width: 160,
            height: 600,
            domain: '',
            bid_floor: 0.5,
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(false);
    });
    it('isBidValid : user_id and placement_id are passed but nid is not passed', function() {
      let bid = {
          bidder: 'audiencelogy',
          params: {
            placement_id: 584,
            user_id: '11211',
            width: 160,
            height: 600,
            domain: '',
            bid_floor: 0.5,
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(false);
    });
  });
  describe('Validate Request', function() {
    it('Immutable bid request validate', function() {
      let _Request = utils.deepClone(request),
        bidRequest = spec.buildRequests(request);
      expect(request).to.deep.equal(_Request);
    });
    it('Validate bidder connection', function() {
      let _Request = spec.buildRequests(request);
      expect(_Request.url).to.equal('https://rtb.audiencelogy.com/prebid/1');
      expect(_Request.method).to.equal('POST');
      expect(_Request.options.contentType).to.equal('application/json');
    });
    it('Validate bid request : Impression', function() {
      let _Request = spec.buildRequests(request);
      let data = JSON.parse(_Request.data);
      expect(data[0].imp[0].id).to.equal(request[0].bidId);
      expect(data[0].placementId).to.equal(584);
    });
    it('Validate bid request : ad size', function() {
      let _Request = spec.buildRequests(request);
      let data = JSON.parse(_Request.data);
      expect(data[0].imp[0].banner).to.be.a('object');
      expect(data[0].imp[0].banner.w).to.equal(160);
      expect(data[0].imp[0].banner.h).to.equal(600);
    });
    it('Validate bid request : user object', function() {
      let _Request = spec.buildRequests(request);
      let data = JSON.parse(_Request.data);
      expect(data[0].user).to.be.a('object');
      expect(data[0].user.id).to.be.a('string');
    });
    it('Validate bid request : CCPA Check', function() {
      let bidRequest = {
        uspConsent: '1NYN'
      };
      let _Request = spec.buildRequests(request, bidRequest);
      let data = JSON.parse(_Request.data);
      expect(data[0].us_privacy).to.equal('1NYN');
    });
  });
  describe('Validate response ', function() {
    it('Validate bid response : valid bid response', function() {
      let bResponse = spec.interpretResponse(bannerResponse, request);
      expect(bResponse).to.be.an('array').with.length.above(0);
      expect(bResponse[0].requestId).to.equal(bannerResponse.body.seatbid[0].bid[0].impid);
      expect(bResponse[0].width).to.equal(bannerResponse.body.seatbid[0].bid[0].w);
      expect(bResponse[0].height).to.equal(bannerResponse.body.seatbid[0].bid[0].h);
      expect(bResponse[0].currency).to.equal('USD');
      expect(bResponse[0].netRevenue).to.equal(false);
      expect(bResponse[0].mediaType).to.equal('banner');
      expect(bResponse[0].meta.advertiserDomains).to.deep.equal(['audiencelogy.com']);
      expect(bResponse[0].ttl).to.equal(300);
      expect(bResponse[0].creativeId).to.equal(bannerResponse.body.seatbid[0].bid[0].crid);
      expect(bResponse[0].dealId).to.equal(bannerResponse.body.seatbid[0].bid[0].dealId);
    });
    it('Invalid bid response check ', function() {
      let bRequest = spec.buildRequests(request);
      let response = spec.interpretResponse(invalidResponse, bRequest);
      expect(response[0].ad).to.equal('invalid response');
    });
  });
  describe('GPP and coppa', function() {
    it('Request params check with GPP Consent', function() {
      let bidderReq = {
        gppConsent: {
          gppString: 'gpp-string-test',
          applicableSections: [5]
        }
      };
      let _Request = spec.buildRequests(request, bidderReq);
      let data = JSON.parse(_Request.data);
      expect(data[0].gpp).to.equal('gpp-string-test');
      expect(data[0].gpp_sid[0]).to.equal(5);
    });
    it('Request params check with GPP Consent read from ortb2', function() {
      let bidderReq = {
        ortb2: {
          regs: {
            gpp: 'gpp-test-string',
            gpp_sid: [5]
          }
        }
      };
      let _Request = spec.buildRequests(request, bidderReq);
      let data = JSON.parse(_Request.data);
      expect(data[0].gpp).to.equal('gpp-test-string');
      expect(data[0].gpp_sid[0]).to.equal(5);
    });
    it(' Bid request should have coppa flag if its true', () => {
      let bidderReq = {
        ortb2: {
          regs: {
            coppa: 1
          }
        }
      };
      let _Request = spec.buildRequests(request, bidderReq);
      let data = JSON.parse(_Request.data);
      expect(data[0].coppa).to.equal(1);
    });
  });
});
