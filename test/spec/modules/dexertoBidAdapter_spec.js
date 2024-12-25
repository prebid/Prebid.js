import { expect } from 'chai';
import { spec } from '../../../modules/dexertoBidAdapter';
import * as utils from '../../../src/utils.js';

describe('dexerto adapter', function () {
  let request;
  let bannerResponse, invalidResponse;

  beforeEach(function () {
    request = [
      {
        bidder: 'dexerto',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        params: {
          placement_id: 110003,
          width: 300,
          height: 250,
          domain: '',
          bid_floor: 0.5
        }
      }
    ];
    bannerResponse = {
      'body': {
        'id': 'a48b79e7-7104-4213-99f3-55f3234f2e54',
        'seatbid': [{
          'bid': [{
            'id': '3d7dd6dc-7665-4cdc-96a4-5ea192df32b8',
            'impid': '285b9c53b2c662',
            'price': 0.5,
            'adid': '3424',
            'adm': "<link rel=\"stylesheet\" href=\"https://distribution.dexerto.media/scripts/adx_carousel_styles.css\"> <div class=\"carousel-container\" style=\"width: 300px;height: 250px;\" > <div class=\"carousel\"><div class=\"carousel-item\"><a href=\"https://r.audiencelogy.com/adx-rtb-m/click?qs=H4sIAAAAAAAAAw2S2Q3AMAhDV+IKkHHCtf8IoR9VFFHbvFrqEqRIHQpwzqKps6+pEOe6MoZEOzNR1LlDWO3VN5+jHiXjFrqnXzTMzT2XC3gktSAjpD4cJSeG6tkRrTHrqEIIvBI+/eyIlb17NSCmGAdgNbHU3mnCe5xZbigPB9Ge++phF+xzeoL7XNug4cZR6bI54vo1KJ50Z4tz3c+5T8eFVVRE+/A8p35ktpueAFEjeHqg4FntHfnrfRwfAMLj2TyQVZngijIKR5/arFEdp3fT6NlDjbdUg/azJFkBZZ0brJndJ6HOuluttPSwNnad92QcObkVecEQJsyJzhE0tk5VJTaXxndn49ILNDcfuG29DkE85PnkMXJkzYva5BonltuUn80wcW8WMOmiZF8L0lFE8De6Yai52K0imHJ/mOEqWYTfM0W8kMcX8OxWhBN5dCFk3mQCXyKrLjYoATbPVml6WUVIBc+57fNw67J8dJeGtXW4sbXIsPLeDuwg0SHLO363Fn1RxBbrwbdVCzGyFrYCkA9VMuDRwAIAAA==\" target=\"_blank\"><img src=\"https://cdn.audiencelogy.com/1_3424_1.jpg\" height=\"250\" width=\"300\"></img></a><img width=\"1px\" height=\"1px\" style=\"display:none;\" src=\"https://rtb.audiencelogy.com:9001/beacon?uid=e185bc680ccf1d7f1671178afc8fdf6a&cc=1387&fccap=3&nid=1\"></img><script async src='https://i.audiencelogy.com/adx-rtb-m/view?qs=&price=100.5&qsenc=H4sIAAAAAAAAAx2R2QFEIQgDWwK5ywGU/kt47P6aOCaRvKcaKd69xf5aysEiBjnPfaOAKXrkxUEyepZPslNdqh+YTw++l3k5SQPrWIEYW66KV4SnVfOMyUE/cMM9AFXhrAuCsdrAzOqQHucVoggGQuKegfuyYnz4AvEBWcpxBDurA0qosiTR3EZ4G1vQrh4j2ejHewuZlu3B1ehiHSrhYqsQAFDmgOF+0wcFqSpVh/VcT2+L/zbWDt77dhYaO+w64yQkfWlN8KALJiHwlie/J7Xb1VvwlZ7dZpa0BWxvW71ud1seFbnGqZs/WgefEfGaubKLND4VK5lF3eatjbHcUtmAubaok0sL2pT7NVcUXydTu/RLAMJ0EfsAFf9u3OABAAA='></script><script async src='https://i.audiencelogy.com/adx-rtb-m/view?qs=&price=100.5&qsenc=H4sIAAAAAAAAAx2R2QFEIQgDWwK5ywGU/kt47P6aOCaRvKcaKd69xf5aysEiBjnPfaOAKXrkxUEyepZPslNdqh+YTw++l3k5SQPrWIEYW66KV4SnVfOMyUE/cMM9AFXhrAuCsdrAzOqQHucVoggGQuKegfuyYnz4AvEBWcpxBDurA0qosiTR3EZ4G1vQrh4j2ejHewuZlu3B1ehiHSrhYqsQAFDmgOF+0wcFqSpVh/VcT2+L/zbWDt77dhYaO+w64yQkfWlN8KALJiHwlie/J7Xb1VvwlZ7dZpa0BWxvW71ud1seFbnGqZs/WgefEfGaubKLND4VK5lF3eatjbHcUtmAubaok0sL2pT7NVcUXydTu/RLAMJ0EfsAFf9u3OABAAA='></script></div><div class=\"carousel-item\"><a href=\"https://r.audiencelogy.com/adx-rtb-m/click?qs=H4sIAAAAAAAAAxVSiQkEMQhsSeNfjrrafwnnEcgDI/OFZraUnmZ9BZDLNCo5Aayi3PV9FYSYc4d/2tqMn5svCd+yDMB89JXr+9BfCPeXqPNh3uYQkCXBVNSli+kxw4vF23JzlA97rI8/pY6oRyp8skvq0cTzDTuctutNvDzOYzuojL7qbzkqYJBtLEkxUnUCZ6Sn4O2rr82s2pnQ22WyWgQR5jUvvAlx1Rh3Vtx8u8gOtuc/Db8TwEKUJ7MbdYP2g9k5sOTdiFE9HImohzNyUTswq6KAzpkF+CxfhKNuKVqVIXLQ0qh77tJkWPfzIDuBbw3CjF2J1QjXth0g6CKFGUV4rcwAVwjgnCfkq43L+1+kje6pS/Ertsae8r1J1i46WvyY295JEv9AiL/UL2xAPuePLp89o+X49iK6GF/B3sT1GvztJA114siiAOEnQ15FVPGNzGf2zoG9jgEkjSiERqkcn1fo9380pE/GlBUJWr8L/BPzmxJ44mWT75Rmvwhc9YW9YiRrj1nke5GdJ0t//iI1XMACAAA=\" target=\"_blank\"><img src=\"https://cdn.audiencelogy.com/1_3423_1.png\" height=\"250\" width=\"300\"></img></a><img width=\"1px\" height=\"1px\" style=\"display:none;\" src=\"https://rtb.audiencelogy.com:9001/beacon?uid=e185bc680ccf1d7f1671178afc8fdf6a&cc=1386&fccap=3&nid=1\"></img><script async src='https://i.audiencelogy.com/adx-rtb-m/view?qs=&price=100.5&qsenc=H4sIAAAAAAAAAx2RyQ1EMQjFWmIPlMPafwnzNbcckGy/BNQAvtrEcH3DRs0w0q2tfMjNNX7yXlQdnK3HU107FDem9G503KF5S9AmMKWRSisX9rTRCkjYLKMHH53KK6VXZwwUFkiq9Q4vdtq46DNJDSgmgOM4HobTrd1oXucUOpvFeEN26vLxsD9Va4VDdHN+bIvfXSRVvgvHo9ayW3HqK9mO2Gq2EItOSSMvMCNgT4J/i/Wm49ynoGiqxgLnitIgT8P3Op431B585OGd3MCTHLniPq+S17Oa19/OEHQNHxg623QaviddfQWwypa9/U01XYGp5Zig91XtfQMZ5FyuV2joZ9jPPgOuSxDg8qbjM1Gf7+fgK/P3UX9vL2RB4AEAAA=='></script><script async src='https://i.audiencelogy.com/adx-rtb-m/view?qs=&price=100.5&qsenc=H4sIAAAAAAAAAx2RyQ1EMQjFWmIPlMPafwnzNbcckGy/BNQAvtrEcH3DRs0w0q2tfMjNNX7yXlQdnK3HU107FDem9G503KF5S9AmMKWRSisX9rTRCkjYLKMHH53KK6VXZwwUFkiq9Q4vdtq46DNJDSgmgOM4HobTrd1oXucUOpvFeEN26vLxsD9Va4VDdHN+bIvfXSRVvgvHo9ayW3HqK9mO2Gq2EItOSSMvMCNgT4J/i/Wm49ynoGiqxgLnitIgT8P3Op431B585OGd3MCTHLniPq+S17Oa19/OEHQNHxg623QaviddfQWwypa9/U01XYGp5Zig91XtfQMZ5FyuV2joZ9jPPgOuSxDg8qbjM1Gf7+fgK/P3UX9vL2RB4AEAAA=='></script></div></div><div class=\"carousel-indicators\"><span class=\"dot active\" data-slide=\"0\"></span><span class=\"dot\" data-slide=\"1\"></span></div></div><script src=\"https://distribution.dexerto.media/scripts/adx_carousel_script.js\"></script>",
            'adomain': ['google.com'],
            'iurl': 'https://cdn.audiencelogy.com/1_3424_1.jpg',
            'cid': '410011',
            'crid': '410011',
            'w': 300,
            'h': 250,
            'cat': ['IAB1-15']
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
        'id': 'a48b79e7-7104-4213-99f3-55f3234f2e54',
        'seatbid': [{
          'bid': [{
            'id': '3d7dd6dc-7665-4cdc-96a4-5ea192df32b8',
            'impid': '285b9c53b2c662',
            'price': 0.5,
            'adid': '3424',
            'adm': 'invalid response',
            'adomain': ['google.com'],
            'iurl': 'https://cdn.audiencelogy.com/1_3424_1.jpg',
            'cid': '410011',
            'crid': '410011',
            'w': 300,
            'h': 250,
            'cat': ['IAB1-15']
          }],
          'seat': 'audiencelogy',
          'group': 0
        }],
        'cur': 'USD',
        'bidid': 'BIDDER_1256'
      }
    };
  });

  describe('validations', function () {
    it('isBidValid : placement_id is passed', function () {
      let bid = {
          bidder: 'dexerto',
          params: {
            placement_id: 110003
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(true);
    });
    it('isBidValid : placement_id is not passed', function () {
      let bid = {
          bidder: 'dexerto',
          params: {
            width: 300,
            height: 250,
            domain: '',
            bid_floor: 0.5
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(false);
    });
  });
  describe('Validate Request', function () {
    it('Immutable bid request validate', function () {
      let _Request = utils.deepClone(request),
        bidRequest = spec.buildRequests(request);
      expect(request).to.deep.equal(_Request);
    });
    it('Validate bidder connection', function () {
      let _Request = spec.buildRequests(request);
      expect(_Request.url).to.equal('https://rtb.dexerto.media/hb/dexerto');
      expect(_Request.method).to.equal('POST');
      expect(_Request.options.contentType).to.equal('application/json');
    });
    it('Validate bid request : Impression', function () {
      let _Request = spec.buildRequests(request);
      let data = JSON.parse(_Request.data);
      // expect(data.at).to.equal(1); // auction type
      expect(data[0].imp[0].id).to.equal(request[0].bidId);
      expect(data[0].placementId).to.equal(110003);
    });
    it('Validate bid request : ad size', function () {
      let _Request = spec.buildRequests(request);
      let data = JSON.parse(_Request.data);
      expect(data[0].imp[0].banner).to.be.a('object');
      expect(data[0].imp[0].banner.w).to.equal(300);
      expect(data[0].imp[0].banner.h).to.equal(250);
    });
    it('Validate bid request : user object', function () {
      let _Request = spec.buildRequests(request);
      let data = JSON.parse(_Request.data);
      expect(data[0].user).to.be.a('object');
      expect(data[0].user.id).to.be.a('string');
    });
    it('Validate bid request : CCPA Check', function () {
      let bidRequest = {
        uspConsent: '1NYN'
      };
      let _Request = spec.buildRequests(request, bidRequest);
      let data = JSON.parse(_Request.data);
      expect(data[0].regs.ext.us_privacy).to.equal('1NYN');
      //   let _bidRequest = {};
      //   let _Request1 = spec.buildRequests(request, _bidRequest);
      //   let data1 = JSON.parse(_Request1.data);
      //   expect(data1.regs).to.equal(undefined);
    });
  });
  describe('Validate response ', function () {
    it('Validate bid response : valid bid response', function () {
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
    it('Invalid bid response check ', function () {
      let bRequest = spec.buildRequests(request);
      let response = spec.interpretResponse(invalidResponse, bRequest);
      expect(response[0].ad).to.equal('invalid response');
    });
  });
  describe('GPP and coppa', function () {
    it('Request params check with GPP Consent', function () {
      let bidderReq = { gppConsent: { gppString: 'gpp-string-test', applicableSections: [5] } };
      let _Request = spec.buildRequests(request, bidderReq);
      let data = JSON.parse(_Request.data);
      expect(data[0].regs.gpp).to.equal('gpp-string-test');
      expect(data[0].regs.gpp_sid[0]).to.equal(5);
    });
    it('Request params check with GPP Consent read from ortb2', function () {
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
      expect(data[0].regs.gpp).to.equal('gpp-test-string');
      expect(data[0].regs.gpp_sid[0]).to.equal(5);
    });
    it(' Bid request should have coppa flag if its true', () => {
      let bidderReq = { ortb2: { regs: { coppa: 1 } } };
      let _Request = spec.buildRequests(request, bidderReq);
      let data = JSON.parse(_Request.data);
      expect(data[0].regs.coppa).to.equal(1);
    });
  });
});
