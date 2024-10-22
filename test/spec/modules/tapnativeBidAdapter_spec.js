import { expect } from 'chai';
import { spec } from '../../../modules/tapnativeBidAdapter.js';
import * as utils from '../../../src/utils.js';

describe('tapnative adapter', function () {
  let bannerRequest, nativeRequest;
  let bannerResponse, nativeResponse, invalidBannerResponse, invalidNativeResponse;

  beforeEach(function () {
    bannerRequest = [
      {
        bidder: 'tapnative',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        params: {
          placement_id: 111520,
          bid_floor: 0.5
        }
      }
    ];
    nativeRequest = [
      {
        bidder: 'tapnative',
        mediaTypes: {
          native: {
            title: { required: true, len: 100 },
            image: { required: true, sizes: [300, 250] },
            sponsored: { required: false },
            clickUrl: { required: true },
            desc: { required: true },
            icon: { required: false, sizes: [50, 50] },
            cta: { required: false }
          }
        },
        params: {
          placement_id: 111519,
          bid_floor: 1
        }
      }
    ];
    bannerResponse = {
      'body': {
        'id': '006ac3b3-67f0-43bf-a33a-388b2f869fef',
        'seatbid': [{
          'bid': [{
            'id': '049d07ed-c07e-4890-9f19-5cf41406a42d',
            'impid': '286e606ac84a09',
            'price': 0.11,
            'adid': '368853',
            'adm': "<a href=\"https://r.tapnative.com/adx-rtb-d/servlet/WebF_AdManager.AdLinkManager?qs=H4sIAAAAAAAAAxWUyRXAIAhEW2JVKAdZ+i8h5JCXuOH4ZwyWj1LlcaPrlC7ZESfZfHB702ZU7q3e79PvoSVSieGlC9Q9JyPCX1HhBZ8kwcOUjKbZ7+wrEkNH3XT7S+857vcODtxtJlS4tFpvPXx6m7luUcLR9ooTU1DF9N48K+9ehTDvBemBNAs8EZeFAfP59twnGYayWirQoV4YqA1L1dneSY5fEz6Gu2P5yKSbZCclmB70pCnxO68OTWReuauHQyDm5h0d2j10gU2FnLGQArTDZxxMMOodxmqjt3qqW5BhDMc7pH2MWzEXxXQfTJm4roAiWplnK+5UDCKJp4sJiTR45ECvX5mJ91ytPbFB9Vuq7Q1LCrgbo+V2g6f64sRd/hD79wloSFddYPYIMYmSp9TrpIuXh4kZuc56LK7PABdmx9CCO1z0xB1dSiR6DUMxedFlN0Xdp3hng29warPBNICYfP+VSIfqXjqSOe5RQrvv4D7hiGsSEWC/lTdelnvsaV4Jev3SOn6EtDdNdSMVKSrIOWG5cxdOzaZHKduFlXGjQev9qbRls7aY092oMPORq5qaeNYIKJWTGW/Obx7gmsSY5bLb4ZpGketfNeIedGhFkTnCVvgjwrL598d/Bjagz+s+3nzeNHdVi5WhMpaLr7MYm0BgI55cXK+exnljYMuxt96StZL9uHMI4GEsumj4hyAsKuFVpz23mj3kcpCjAbBt8w3R62eM6x2uvHetiuAtcdusOCg9GNnb5bJOhoquAfQUaJHMdJGd0KIVnDVVEuaroaklUGVhq+xdbQDhvfLr3Lq14nU1cMuD1/srwaRccmoY8gGc9u0bYAQAAA==\" target=\"_blank\"><img src=\"https://cdn.tapnative.com/1_368853_1.png\" height=\"250\" width=\"300\"></img></a><img width=\"1px\" height=\"1px\" style=\"display:none;\" src=\"https://rtb-east.tapnative.com:9001/beacon?uid=b2f492b77992aa7ea67960f7af5b0fff&cc=468133&fccap=5&nid=1\"></img><script async src='https://i.tapnative.com/adx-rtb-d/servlet/WebF_AdManager.ImpTracker?price=${AUCTION_PRICE}&ids=111520,16703,468133,368853,211356,11,2,16704,1&cb=1728399490&ap=5.00000&vd=223.233.85.189,14,8&nm=0.00&GUIDs=[adx_guid],049d07ed-c07e-4890-9f19-5cf41406a42d,049d07ed-c07e-4890-9f19-5cf41406a42d,,-1_&info=2,-1,IN&adx_custom=&adx_custom_ex=~~~-1~~~0&cat=-1&ref='></script>",
            'adomain': ['google.com'],
            'iurl': 'https://cdn.tapnative.com/1_368853_1.png',
            'cid': '468133/368853',
            'crid': '368853',
            'w': 300,
            'h': 250,
            'cat': ['IAB7-19']
          }],
          'seat': 'tapnative',
          'group': 0
        }],
        'cur': 'USD',
        'bidid': 'BIDDER_-1'
      }
    };
    nativeResponse = {
      'body': {
        'id': '453ade66-9113-4944-a674-5bbdcb9808ac',
        'seatbid': [{
          'bid': [{
            'id': '652c9a4c-66ea-4579-998b-cefe7b4cfecd',
            'impid': '2c3875bdbb1893',
            'price': 1.1,
            'adid': '368852',
            'adm': '{\"native\":{\"ver\":\"1.1\",\"assets\": [{\"id\":1,\"required\":1,\"title\":{\"text\":\"Integrative Approaches: Merging Traditional and Alternative \"}},{\"id\":2,\"required\":1,\"img\":{\"url\":\"https://cdn.tapnative.com/1_368852_0.png\",\"w\":500,\"h\":300,\"type\":\"3\"}},{\"id\":3,\"required\":0,\"data\":{\"value\":\"Diabetes In Control. A free weekly diabetes newsletter for Medical Professionals.\"}},{\"id\":4,\"required\":1,\"data\":{\"value\":\"Integrative Approaches: Merging Traditional and Alternative \"}},{\"id\":6,\"required\":1,\"data\":{\"value\":\"URL\"}}],\"link\":{\"url\":\"https://r.tapnative.com/adx-rtb-d/servlet/WebF_AdManager.AdLinkManager?qs=H4sIAAAAAAAAAx2U2QHDIAxDVwKDr3F84P1HqNLPtMSRpSeG9RiPXH+5a474KzO/47YX7UoP50m61fLujlNjb76/8ZiblkimHq5nL/ZRedp3031x1tnk55LjSNN6h9/Zq+qmaLLuWTl74m1ZJKnb+m2OtQm/3L4sb933pM92qMOgjJ41MYmPXKnndRVKs+9bfSEumoZIFpTXuXbCP+WXuzl725E3O+9odi5OJrnBzhwjx9+UnFN3nTNt1/HY5aeljKtvZYpoJHNXr8BWa8ysKQY7ZmNA3DHK2qRwY7+zLu+xm9z5eheJ4Pv2usSptvO3p7JHrnXn0T5yVWdccp9Yz7hhoz2iu2zqsXsGFZ9hh14J6yU4TkJ0BgnOY8tY3tS+n2qsw7xZfKuanSNbAo+9nkJ83i20+FwhfbJeDVOllXsdxmDWauYcSRgS9+yG5qHwUDjAxxA0iZnOjlsnI+y09+ATeTEwbAVGgp0Qu/ceP0kjUvpu1Ty7O9MoegfrmLPxdjUh3mJL+XhARby+Ax8iBckf6BQdn9W+DMlvmlzYLuLlIy7YociFOIvXvEiYYCMboVk8BLHbnw3Zmr5us3xbjtXL67L96F15acJXkM5BOmTaUbBkYGdCI+Et8XmlpbuE3xVQwmxryc2y4wP3ByuuP8GogPZz8OpPaBv8diWWUTrC2nnLhdNUrJRTKc9FepDvwHTDwfbbMCTSb4LhUIFkyFrw/i7GtkPi6NCCai6N47TgNsTnzZWRoVtOSLq7FsLiF29y0Gj0GHVPVYG3QOPS7Swc3UuiFAQZJx3YvpHA2geUgVBASMEL4vcDi2Dw3NPtBSC4EQEvH/uMILu6WyUwraywTeVpoqoHTqOoD84FzReKoWemJy6jyuiBieGlQIe6wY2elTaMOwEUFF5NagzPj6nauc0+aXzQN3Q72hxFAgtfORK60RRAHYZLYymIzSJcXLgRFsqrb1UoD+5Atq7TWojaLTfOyUvH9EeJvZEOilQAXrf/ALoI8ZhABQAA\"},\"imptrackers\":[\"https://i.tapnative.com/adx-rtb-d/servlet/WebF_AdManager.ImpCounter?price=${AUCTION_PRICE}&ids=111519,16703,468132,368852,211356,233,13,16704,1&cb=1728409547&ap=5.00000&vd=223.233.85.189,14,8&nm=0.00&GUIDs=[adx_guid],652c9a4c-66ea-4579-998b-cefe7b4cfecd,652c9a4c-66ea-4579-998b-cefe7b4cfecd,999999,-1_&info=2,-1,IN&adx_custom=&adx_custom_ex=~~~-1~~~0&cat=-1&ref=https%3A%2F%2Fqa-jboss.audiencelogy.com%2Ftn_native_prod.html\",\"https://i.tapnative.com/adx-rtb-d/servlet/WebF_AdManager.ImpTracker?price=${AUCTION_PRICE}&ids=111519,16703,468132,368852,211356,233,13,16704,1&cb=1728409547&ap=5.00000&vd=223.233.85.189,14,8&nm=0.00&GUIDs=[adx_guid],652c9a4c-66ea-4579-998b-cefe7b4cfecd,652c9a4c-66ea-4579-998b-cefe7b4cfecd,999999,-1_&info=2,-1,IN&adx_custom=&adx_custom_ex=~~~-1~~~0&cat=-1&ref=\",\"https://rtb-east.tapnative.com:9001/beacon?uid=44636f6605b06ec6d4389d6efb7e5054&cc=468132&fccap=5&nid=1\"]}}',
            'adomain': ['www.diabetesincontrol.com'],
            'iurl': 'https://cdn.tapnative.com/1_368852_0.png',
            'cid': '468132/368852',
            'crid': '368852',
            'cat': ['IAB7']
          }],
          'seat': 'tapnative',
          'group': 0
        }],
        'cur': 'USD',
        'bidid': 'BIDDER_-1'
      }
    };
    invalidBannerResponse = {
      'body': {
        'id': '006ac3b3-67f0-43bf-a33a-388b2f869fef',
        'seatbid': [{
          'bid': [{
            'id': '049d07ed-c07e-4890-9f19-5cf41406a42d',
            'impid': '286e606ac84a09',
            'price': 0.11,
            'adid': '368853',
            'adm': 'invalid response',
            'adomain': ['google.com'],
            'iurl': 'https://cdn.tapnative.com/1_368853_1.png',
            'cid': '468133/368853',
            'crid': '368853',
            'w': 300,
            'h': 250,
            'cat': ['IAB7-19']
          }],
          'seat': 'tapnative',
          'group': 0
        }],
        'cur': 'USD',
        'bidid': 'BIDDER_-1'
      }
    };
    invalidNativeResponse = {
      'body': {
        'id': '453ade66-9113-4944-a674-5bbdcb9808ac',
        'seatbid': [{
          'bid': [{
            'id': '652c9a4c-66ea-4579-998b-cefe7b4cfecd',
            'impid': '2c3875bdbb1893',
            'price': 1.1,
            'adid': '368852',
            'adm': 'invalid response',
            'adomain': ['www.diabetesincontrol.com'],
            'iurl': 'https://cdn.tapnative.com/1_368852_0.png',
            'cid': '468132/368852',
            'crid': '368852',
            'cat': ['IAB7']
          }],
          'seat': 'tapnative',
          'group': 0
        }],
        'cur': 'USD',
        'bidid': 'BIDDER_-1'
      }
    };
  });

  describe('validations', function () {
    it('isBidValid : placement_id is passed', function () {
      let bid = {
          bidder: 'tapnative',
          params: {
            placement_id: 111520
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(true);
    });
    it('isBidValid : placement_id is not passed', function () {
      let bid = {
          bidder: 'tapnative',
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
  describe('Validate Banner Request', function () {
    it('Immutable bid request validate', function () {
      let _Request = utils.deepClone(bannerRequest),
        bidRequest = spec.buildRequests(bannerRequest);
      expect(bannerRequest).to.deep.equal(_Request);
    });
    it('Validate bidder connection', function () {
      let _Request = spec.buildRequests(bannerRequest);
      expect(_Request.url).to.equal('https://rtb-east.tapnative.com/hb');
      expect(_Request.method).to.equal('POST');
      expect(_Request.options.contentType).to.equal('application/json');
    });
    it('Validate bid request : Impression', function () {
      let _Request = spec.buildRequests(bannerRequest);
      let data = JSON.parse(_Request.data);
      // expect(data.at).to.equal(1); // auction type
      expect(data[0].imp[0].id).to.equal(bannerRequest[0].bidId);
      expect(data[0].placementId).to.equal(111520);
    });
    it('Validate bid request : ad size', function () {
      let _Request = spec.buildRequests(bannerRequest);
      let data = JSON.parse(_Request.data);
      expect(data[0].imp[0].banner).to.be.a('object');
      expect(data[0].imp[0].banner.w).to.equal(300);
      expect(data[0].imp[0].banner.h).to.equal(250);
    });
    it('Validate bid request : user object', function () {
      let _Request = spec.buildRequests(bannerRequest);
      let data = JSON.parse(_Request.data);
      expect(data[0].user).to.be.a('object');
      expect(data[0].user.id).to.be.a('string');
    });
    it('Validate bid request : CCPA Check', function () {
      let bidRequest = {
        uspConsent: '1NYN'
      };
      let _Request = spec.buildRequests(bannerRequest, bidRequest);
      let data = JSON.parse(_Request.data);
      expect(data[0].regs.ext.us_privacy).to.equal('1NYN');
      //   let _bidRequest = {};
      //   let _Request1 = spec.buildRequests(request, _bidRequest);
      //   let data1 = JSON.parse(_Request1.data);
      //   expect(data1.regs).to.equal(undefined);
    });
  });
  describe('Validate banner response ', function () {
    it('Validate bid response : valid bid response', function () {
      let _Request = spec.buildRequests(bannerRequest);
      let bResponse = spec.interpretResponse(bannerResponse, _Request);
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
      let bRequest = spec.buildRequests(bannerRequest);
      let response = spec.interpretResponse(invalidBannerResponse, bRequest);
      expect(response[0].ad).to.equal('invalid response');
    });
  });
  describe('Validate Native Request', function () {
    it('Immutable bid request validate', function () {
      let _Request = utils.deepClone(nativeRequest),
        bidRequest = spec.buildRequests(nativeRequest);
      expect(nativeRequest).to.deep.equal(_Request);
    });
    it('Validate bidder connection', function () {
      let _Request = spec.buildRequests(nativeRequest);
      expect(_Request.url).to.equal('https://rtb-east.tapnative.com/hb');
      expect(_Request.method).to.equal('POST');
      expect(_Request.options.contentType).to.equal('application/json');
    });
    it('Validate bid request : Impression', function () {
      let _Request = spec.buildRequests(nativeRequest);
      let data = JSON.parse(_Request.data);
      // expect(data.at).to.equal(1); // auction type
      expect(data[0].imp[0].id).to.equal(nativeRequest[0].bidId);
      expect(data[0].placementId).to.equal(111519);
    });
    it('Validate bid request : user object', function () {
      let _Request = spec.buildRequests(nativeRequest);
      let data = JSON.parse(_Request.data);
      expect(data[0].user).to.be.a('object');
      expect(data[0].user.id).to.be.a('string');
    });
    it('Validate bid request : CCPA Check', function () {
      let bidRequest = {
        uspConsent: '1NYN'
      };
      let _Request = spec.buildRequests(nativeRequest, bidRequest);
      let data = JSON.parse(_Request.data);
      expect(data[0].regs.ext.us_privacy).to.equal('1NYN');
      //   let _bidRequest = {};
      //   let _Request1 = spec.buildRequests(request, _bidRequest);
      //   let data1 = JSON.parse(_Request1.data);
      //   expect(data1.regs).to.equal(undefined);
    });
  });
  describe('Validate native response ', function () {
    it('Validate bid response : valid bid response', function () {
      let _Request = spec.buildRequests(nativeRequest);
      let bResponse = spec.interpretResponse(nativeResponse, _Request);
      expect(bResponse).to.be.an('array').with.length.above(0);
      expect(bResponse[0].requestId).to.equal(nativeResponse.body.seatbid[0].bid[0].impid);
      // expect(bResponse[0].width).to.equal(bannerResponse.body.seatbid[0].bid[0].w);
      // expect(bResponse[0].height).to.equal(bannerResponse.body.seatbid[0].bid[0].h);
      expect(bResponse[0].currency).to.equal('USD');
      expect(bResponse[0].netRevenue).to.equal(false);
      expect(bResponse[0].mediaType).to.equal('native');
      expect(bResponse[0].native.clickUrl).to.be.a('string').and.not.be.empty;
      expect(bResponse[0].native.impressionTrackers).to.be.an('array').with.length.above(0);
      expect(bResponse[0].native.title).to.be.a('string').and.not.be.empty;
      expect(bResponse[0].native.image.url).to.be.a('string').and.not.be.empty;
      expect(bResponse[0].meta.advertiserDomains).to.deep.equal(['www.diabetesincontrol.com']);
      expect(bResponse[0].ttl).to.equal(300);
      expect(bResponse[0].creativeId).to.equal(nativeResponse.body.seatbid[0].bid[0].crid);
      expect(bResponse[0].dealId).to.equal(nativeResponse.body.seatbid[0].bid[0].dealId);
    });
  });
  describe('GPP and coppa', function () {
    it('Request params check with GPP Consent', function () {
      let bidderReq = { gppConsent: { gppString: 'gpp-string-test', applicableSections: [5] } };
      let _Request = spec.buildRequests(bannerRequest, bidderReq);
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
      let _Request = spec.buildRequests(bannerRequest, bidderReq);
      let data = JSON.parse(_Request.data);
      expect(data[0].regs.gpp).to.equal('gpp-test-string');
      expect(data[0].regs.gpp_sid[0]).to.equal(5);
    });
    it(' Bid request should have coppa flag if its true', () => {
      let bidderReq = { ortb2: { regs: { coppa: 1 } } };
      let _Request = spec.buildRequests(bannerRequest, bidderReq);
      let data = JSON.parse(_Request.data);
      expect(data[0].regs.coppa).to.equal(1);
    });
  });
});
