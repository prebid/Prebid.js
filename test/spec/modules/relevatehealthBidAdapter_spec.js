import {
  expect
} from 'chai';
import {
  spec
} from '../../../modules/relevatehealthBidAdapter.js';
import * as utils from '../../../src/utils.js';

describe('relevatehealth adapter', function() {
  let request;
  let bannerResponse, invalidResponse;

  beforeEach(function() {
    request = [{
      bidder: 'relevatehealth',
      mediaTypes: {
        banner: {
          sizes: [
            [160, 600]
          ]
        }
      },
      params: {
        placement_id: 110011,
        user_id: '11211',
        width: 160,
        height: 600,
        domain: '',
        bid_floor: 0.5
      }
    }];
    bannerResponse = {
      'body': {
        'id': 'a48b79e7-7104-4213-99f3-55f3234f2e54',
        'seatbid': [{
          'bid': [{
            'id': '3d7dd6dc-7665-4cdc-96a4-5ea192df32b8',
            'impid': '285b9c53b2c662',
            'price': 20.68,
            'adid': '3389',
            'adm': "<a href=\"https://r.relevate.health/adx-rtb-m/servlet/WebF_AdManager.AdLinkManager?qs=H4sIAAAAAAAAAx2S2Q1FIQhEW2ITsBwW6b+Ex32J8cMAM2fQGDvalAl1atTnsOaZRLWjokdsKrG8J5i7Mg+1S1tAZ3gH1/SxuACgSLd3Gjid77Ei77uXH1rrFUZLH3KYaopzyPCpQAkqigyfg3QecCaeG/fN4FXT92A6coszhUuer1QfYNJjXmkFStJ6TngOTdsVKUi20+yyxolDMEb6ZIlP6N6OOJ3v1dxHdKtUvmlg+XI1kQAuTDqIrPzNk7RxQKyw8HIZI7560o1LVCM3yDt5czy5YlfdOAy3VewlaEVVXgRA3HOR1c+7HKG0cQC+OBJxuo8P8nJsYqK9Ipk6UY9uagagmJQ+bm6YtX4CSdPs8cdcu7buus/rHiOthp2JRqJQtjQk6xZxe0r4Bg8WnGwGM8m7G8Abs0j5/mly31F0vpshYybsigk3IGU/vpDtT/2mAdV2KjI0l1VnC3+lcF7cyc5FNjXjN+Uop7UFupaj6OlIcVG+Fq16ybcr1l1HZGEUerx9SteCLRV/4Kg53fQE08jpvSu0qa8Dr+K8qz1QTrg+c3+2m5wLHjJhYjGkRpSKtjkIgXXIru6Q+/qDBMMVI/0BzbAHIiADAAA=\" target=\"_blank\"><img src=\"https://cdn.relevate.health/2_310042_1.png\" height=\"600\" width=\"160\"></img></a><img width=\"1px\" height=\"1px\" style=\"display:none;\" src=\"http://rtb.relevate.health:9001/beacon?uid=7a89e67afcc50dd00df1f36b1e113f9e&cc=410014&fccap=3&nid=2\"></img><script async src='https://i.relevate.health/adx-rtb-m/servlet/WebF_AdManager.ImpTracker?qs=&price=${AUCTION_PRICE}%26id%3D110011%2C12517%2C410014%2C310042%2C210009%2C6%2C2%2C12518%2C2%2C12518%2C1%26cb%3D1717164048%26ap%3D1.88000%26mf%3D0.06000%26ai%3D%2C-1%2C-1%2C-1%26ag%3D%5Badx_guid%5D%2Cb52c3caf-261b-45b1-8f6a-12507b95c335%2C123456%2Cb52c3caf-261b-45b1-8f6a-12507b95c335%2C12518_%26as%3D-1%2C-1%26mm%3D-1%2C-1%26ua%3DUnKnown%26ref%3D'></script><script async src='https://i.relevate.health/adx-rtb-m/servlet/WebF_AdManager.ImpCounter?qs=&price=${AUCTION_PRICE}%26id%3D110011%2C12517%2C410014%2C310042%2C210009%2C6%2C2%2C12518%2C2%2C12518%2C1%26cb%3D1717164048%26ap%3D1.88000%26mf%3D0.06000%26ai%3D%2C-1%2C-1%2C-1%26ag%3D%5Badx_guid%5D%2Cb52c3caf-261b-45b1-8f6a-12507b95c335%2C123456%2Cb52c3caf-261b-45b1-8f6a-12507b95c335%2C12518_%26as%3D-1%2C-1%26mm%3D-1%2C-1%26ua%3DUnKnown%26ref%3D'></script>",
            'adomain': ['google.com'],
            'iurl': 'https://rtb.relevate.health/prebid/relevate',
            'cid': '1431/3389',
            'crid': '3389',
            'w': 160,
            'h': 600,
            'cat': ['IAB1-15']
          }],
          'seat': '00001',
          'group': 0
        }],
        'cur': 'USD',
        'bidid': 'BIDDER_1276'
      }
    };
    invalidResponse = {
      'body': {
        'id': 'a48b79e7-7104-4213-99f3-55f3234f2e54',
        'seatbid': [{
          'bid': [{
            'id': '3d7dd6dc-7665-4cdc-96a4-5ea192df32b8',
            'impid': '285b9c53b2c662',
            'price': 20.68,
            'adid': '3389',
            'adm': 'invalid response',
            'adomain': ['google.com'],
            'iurl': 'https://rtb.relevate.health/prebid/relevate',
            'cid': '1431/3389',
            'crid': '3389',
            'w': 160,
            'h': 600,
            'cat': ['IAB1-15']
          }],
          'seat': '00001',
          'group': 0
        }],
        'cur': 'USD',
        'bidid': 'BIDDER_1276'
      }
    };
  });

  describe('validations', function() {
    it('isBidValid : placement_id and user_id are passed', function() {
      let bid = {
          bidder: 'relevatehealth',
          params: {
            placement_id: 110011,
            user_id: '11211'
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(true);
    });
    it('isBidValid : placement_id and user_id are not passed', function() {
      let bid = {
          bidder: 'relevatehealth',
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
    it('isBidValid : placement_id is passed but user_id is not passed', function() {
      let bid = {
          bidder: 'relevatehealth',
          params: {
            placement_id: 110011,
            width: 160,
            height: 600,
            domain: '',
            bid_floor: 0.5
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(false);
    });
    it('isBidValid : user_id is passed but placement_id is not passed', function() {
      let bid = {
          bidder: 'relevatehealth',
          params: {
            width: 160,
            height: 600,
            domain: '',
            bid_floor: 0.5,
            user_id: '11211'
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
      expect(_Request.url).to.equal('https://rtb.relevate.health/prebid/relevate');
      expect(_Request.method).to.equal('POST');
      expect(_Request.options.contentType).to.equal('application/json');
    });
    it('Validate bid request : Impression', function() {
      let _Request = spec.buildRequests(request);
      let data = JSON.parse(_Request.data);
      expect(data[0].imp[0].id).to.equal(request[0].bidId);
      expect(data[0].placementId).to.equal(110011);
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
      expect(bResponse[0].meta.advertiserDomains).to.deep.equal(['google.com']);
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
