import { expect } from 'chai';
import { spec } from 'modules/pangleBidAdapter.js';

const REQUEST = [{
  adUnitCode: 'adUnitCode1',
  bidId: 'bidId1',
  auctionId: 'auctionId-56a2-4f71-9098-720a68f2f708',
  ortb2Imp: {
    ext: {
      tid: 'cccc1234',
    }
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ]
    }
  },
  bidder: 'pangle',
  params: {
    placementid: 999,
    appid: 111,
  },
},
{
  adUnitCode: 'adUnitCode2',
  bidId: 'bidId2',
  auctionId: 'auctionId-56a2-4f71-9098-720a68f2f708',
  ortb2Imp: {
    ext: {
      tid: 'cccc1234',
    }
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ]
    }
  },
  bidder: 'pangle',
  params: {
    placementid: 999,
    appid: 111,
  },
}];

const DEFAULT_OPTIONS = {
  userId: {
    britepoolid: 'pangle-britepool',
    criteoId: 'pangle-criteo',
    digitrustid: { data: { id: 'pangle-digitrust' } },
    id5id: { uid: 'pangle-id5' },
    idl_env: 'pangle-idl-env',
    lipb: { lipbid: 'pangle-liveintent' },
    netId: 'pangle-netid',
    parrableId: { eid: 'pangle-parrable' },
    pubcid: 'pangle-pubcid',
    tdid: 'pangle-ttd',
  }
};

const RESPONSE = {
  'headers': null,
  'body': {
    'id': 'requestId',
    'seatbid': [
      {
        'bid': [
          {
            'id': 'bidId1',
            'impid': 'bidId1',
            'price': 0.18,
            'adm': '<script>adm</script>',
            'adid': '144762342',
            'adomain': [
              'https://dummydomain.com'
            ],
            'iurl': 'iurl',
            'cid': '109',
            'crid': 'creativeId',
            'cat': [],
            'w': 300,
            'h': 250,
            'mtype': 1,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'pangle': {
                  'brand_id': 334553,
                  'auction_id': 514667951122925701,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          }
        ],
        'seat': 'seat'
      }
    ]
  }
};

describe('pangle bid adapter', function () {
  describe('isBidRequestValid', function () {
    it('should accept request if placementid and appid is passed', function () {
      let bid = {
        bidder: 'pangle',
        params: {
          token: 'xxx',
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('reject requests without params', function () {
      let bid = {
        bidder: 'pangle',
        params: {}
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('creates request data', function () {
      let request1 = spec.buildRequests(REQUEST, DEFAULT_OPTIONS)[0];
      expect(request1).to.exist.and.to.be.a('object');
      const payload1 = request1.data;
      expect(payload1.imp[0]).to.have.property('id', REQUEST[0].bidId);

      let request2 = spec.buildRequests(REQUEST, DEFAULT_OPTIONS)[1];
      expect(request2).to.exist.and.to.be.a('object');
      const payload2 = request2.data;
      expect(payload2.imp[0]).to.have.property('id', REQUEST[1].bidId);
    });
  });

  describe('interpretResponse', function () {
    it('has bids', function () {
      let request = spec.buildRequests(REQUEST, DEFAULT_OPTIONS)[0];
      let bids = spec.interpretResponse(RESPONSE, request);
      expect(bids).to.be.an('array').that.is.not.empty;
      validateBidOnIndex(0);

      function validateBidOnIndex(index) {
        expect(bids[index]).to.have.property('currency', 'USD');
        expect(bids[index]).to.have.property('requestId', RESPONSE.body.seatbid[0].bid[index].id);
        expect(bids[index]).to.have.property('cpm', RESPONSE.body.seatbid[0].bid[index].price);
        expect(bids[index]).to.have.property('width', RESPONSE.body.seatbid[0].bid[index].w);
        expect(bids[index]).to.have.property('height', RESPONSE.body.seatbid[0].bid[index].h);
        expect(bids[index]).to.have.property('ad', RESPONSE.body.seatbid[0].bid[index].adm);
        expect(bids[index]).to.have.property('creativeId', RESPONSE.body.seatbid[0].bid[index].crid);
        expect(bids[index]).to.have.property('ttl', 30);
        expect(bids[index]).to.have.property('netRevenue', true);
      }
    });

    it('handles empty response', function () {
      let request = spec.buildRequests(REQUEST, DEFAULT_OPTIONS)[0];
      const EMPTY_RESP = Object.assign({}, RESPONSE, { 'body': {} });
      const bids = spec.interpretResponse(EMPTY_RESP, request);
      expect(bids).to.be.empty;
    });
  });

  describe('parseUserAgent', function () {
    let desktop, mobile, tablet;
    beforeEach(function () {
      desktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';
      mobile = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
      tablet = 'Apple iPad: Mozilla/5.0 (iPad; CPU OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/605.1.15';
    });

    it('should return correct device type: tablet', function () {
      let deviceType = spec.getDeviceType(tablet);
      expect(deviceType).to.equal(5);
    });

    it('should return correct device type: mobile', function () {
      let deviceType = spec.getDeviceType(mobile);
      expect(deviceType).to.equal(4);
    });

    it('should return correct device type: desktop', function () {
      let deviceType = spec.getDeviceType(desktop);
      expect(deviceType).to.equal(2);
    });
  });
});

describe('Pangle Adapter with video', function() {
  const videoBidRequest = [
    {
      bidId: '2820132fe18114',
      mediaTypes: { video: { context: 'outstream', playerSize: [[300, 250]] } },
      params: { token: 'test-token' }
    }
  ];
  const bidderRequest = {
    refererInfo: {
      referer: 'https://example.com'
    }
  };
  const serverResponse = {
    'headers': null,
    'body': {
      'id': '233f1693-68d1-470a-ad85-c156c3faaf6f',
      'seatbid': [
        {
          'bid': [
            {
              'id': '2820132fe18114',
              'impid': '2820132fe18114',
              'price': 0.03294,
              'nurl': 'https://api16-event-sg2.pangle.io/api/ad/union/openrtb/win/?req_id=233f1693-68d1-470a-ad85-c156c3faaf6fu1450&ttdsp_adx_index=256&rit=980589944&extra=oqveoB%2Bg4%2ByNz9L8wwu%2Fy%2FwKxQsGaKsJHuB4NMK77uqZ9%2FJKpnsVZculJX8%2FxrRBAtaktU1DRN%2Fy6TKAqibCbj%2FM3%2BZ6biAKQG%2BCyt4eIV0KVvri9jCCnaajbkN7YNJWJJw2lW6cJ6Va3SuJG9H7a%2FAJd2PMbhK7fXWhoW72TwgOcKHKBgjM6sNDISBKbWlZyY3L1PhKSX%2FM8LOvL6qahsb%2FDpEObIx24vhQLNWp28XY1L4UqeibuRjam3eCvN7nXoQq74KkJ45QQsTgvV4j6I6EbLOdjOi%2FURhWMDjUD1VCMpqUT%2B6L8ZROgrX9Tp53eJ3bFOczmSTOmDSazKMHa%2B3uZZ7JHcSx32eoY4hfYc99NOJmYBKXNKCmoXyJvS3PCM3PlAz97hKrDMGnVv1wAQ7QGDCbittF0vZwtsRAvvx2mWINNIB3%2FUB2PjhxFsoDA%2BWE2urVZwEdyu%2FJrCznJsMwenXjcbMD5jmUF5vDkkLS%2B7TMDIEawJPJKZ62pK35enrwGxCs6ePXi21rJJkA0bF8tgAdl4mU1illBIVO4kCL%2ByRASskHPjgg%2FcdFe9HP%2Fi8byjAprH%2BhRerN%2FRKFxC3xv8b75x2pb1g7dY%2FTj9IjT0evsBSPVwFNqtKmPId35IcY%2FSXiqPHh%2FrAHZzr5BPsTT19P49SlNMR9UZYTzViX1iJpcCL1UFjuDdrdff%2BhHCviXxo%2FkRmufEF3umHZwxbdDOPAghuZ0DtRCY6S1rnb%2FK9BbpsVKSndOtgfCwMHFwiPmdw1XjEXGc1eOWXY6qfSp90PIfL6WS7Neh3ba2qMv6WxG3HSOBYvrcCqVTsNxk4UdVm3qb1J0CMVByweTMo45usSkCTdvX3JuEB7tVA6%2BrEk57b3XJd5Phf2AN8hon%2F7lmcXE41kwMQuXq89ViwQmW0G247UFWOQx4t1cmBqFiP6qNA%2F%2BunkZDno1pmAsGnTv7Mz9xtpOaIqKl8BKrVQSTopZ9WcUVzdBUutF19mn1f43BvyA9gIEhcDJHOj&win_price=${AUCTION_PRICE}&auction_mwb=${AUCTION_BID_TO_WIN}&use_pb=1',
              'lurl': 'https://api16-event-sg2.pangle.io/api/ad/union/openrtb/loss/?req_id=233f1693-68d1-470a-ad85-c156c3faaf6fu1450&ttdsp_adx_index=256&rit=980589944&extra=oqveoB%2Bg4%2ByNz9L8wwu%2Fy%2FwKxQsGaKsJHuB4NMK77uqZ9%2FJKpnsVZculJX8%2FxrRBAtaktU1DRN%2Fy6TKAqibCbj%2FM3%2BZ6biAKQG%2BCyt4eIV0KVvri9jCCnaajbkN7YNJWJJw2lW6cJ6Va3SuJG9H7a%2FAJd2PMbhK7fXWhoW72TwgOcKHKBgjM6sNDISBKbWlZyY3L1PhKSX%2FM8LOvL6qahsb%2FDpEObIx24vhQLNWp28XY1L4UqeibuRjam3eCvN7nXoQq74KkJ45QQsTgvV4j6I6EbLOdjOi%2FURhWMDjUD1VCMpqUT%2B6L8ZROgrX9Tp53eJ3bFOczmSTOmDSazKMHa%2B3uZZ7JHcSx32eoY4hfYc99NOJmYBKXNKCmoXyJvS3PCM3PlAz97hKrDMGnVv1wAQ7QGDCbittF0vZwtsRAvvx2mWINNIB3%2FUB2PjhxFsoDA%2BWE2urVZwEdyu%2FJrCznJsMwenXjcbMD5jmUF5vDkkLS%2B7TMDIEawJPJKZ62pK35enrwGxCs6ePXi21rJJkA0bF8tgAdl4mU1illBIVO4kCL%2ByRASskHPjgg%2FcdFe9HP%2Fi8byjAprH%2BhRerN%2FRKFxC3xv8b75x2pb1g7dY%2FTj9IjT0evsBSPVwFNqtKmPId35IcY%2FSXiqPHh%2FrAHZzr5BPsTT19P49SlNMR9UZYTzViX1iJpcCL1UFjuDdrdff%2BhHCviXxo%2FkRmufEF3umHZwxbdDOPAghuZ0DtRCY6S1rnb%2FK9BbpsVKSndOtgfCwMHFwiPmdw1XjEXGc1eOWXY6qfSp90PIfL6WS7Neh3ba2qMv6WxG3HSOBYvrcCqVTsNxk4UdVm3qb1J0CMVByweTMo45usSkCTdvX3JuEB7tVA6%2BrEk57b3XJd5Phf2AN8hon%2F7lmcXE41kwMQuXq89ViwQmW0G247UFWOQx4t1cmBqFiP6qNA%2F%2BunkZDno1pmAsGnTv7Mz9xtpOaIqKl8BKrVQSTopZ9WcUVzdBUutF19mn1f43BvyA9gIEhcDJHOj&reason=${AUCTION_LOSS}&ad_slot_type=8&auction_mwb=${AUCTION_PRICE}&use_pb=1',
              'adm': '<VAST version="2.0"></VAST>',
              'adid': '1780626232977441',
              'adomain': [
                'swi.esxcmnb.com'
              ],
              'iurl': 'https://p16-ttam-va.ibyteimg.com/origin/ad-site-i18n-sg/202310245d0d598b3ff5993c4f129a8b',
              'cid': '1780626232977441',
              'crid': '1780626232977441',
              'attr': [
                4
              ],
              'w': 640,
              'h': 640,
              'mtype': 1,
              'ext': {
                'pangle': {
                  'adtype': 8
                },
                'event_notification_token': {
                  'payload': '980589944:8:1450:7492'
                }
              }
            }
          ],
          'seat': 'pangle'
        }
      ]
    }
  };

  describe('Video: buildRequests', function() {
    it('should create a POST request for video bid', function() {
      const requests = spec.buildRequests(videoBidRequest, bidderRequest);
      expect(requests[0].method).to.equal('POST');
    });

    it('should have a valid URL and payload for an out-stream video bid', function () {
      const requests = spec.buildRequests(videoBidRequest, bidderRequest);
      expect(requests[0].url).to.equal('https://pangle.pangleglobal.com/api/ad/union/web_js/common/get_ads');
      expect(requests[0].data).to.exist;
    });
  });

  describe('interpretResponse: Video', function () {
    it('should get correct bid response', function () {
      const request = spec.buildRequests(videoBidRequest, bidderRequest)[0];
      const interpretedResponse = spec.interpretResponse(serverResponse, request);
      expect(interpretedResponse).to.be.an('array');
      const bid = interpretedResponse[0];
      expect(bid).to.exist;
      expect(bid.requestId).to.exist;
      expect(bid.cpm).to.be.above(0);
      expect(bid.ttl).to.exist;
      expect(bid.creativeId).to.exist;
      if (bid.renderer) {
        expect(bid.renderer.render).to.exist;
      }
    });
  });
});

describe('pangle multi-format ads', function () {
  const bidderRequest = {
    refererInfo: {
      referer: 'https://example.com'
    }
  };
  const multiRequest = [
    {
      bidId: '2820132fe18114',
      mediaTypes: { banner: { sizes: [[300, 250]] }, video: { context: 'outstream', playerSize: [[300, 250]] } },
      params: { token: 'test-token' }
    }
  ];
  const videoResponse = {
    'headers': null,
    'body': {
      'id': '233f1693-68d1-470a-ad85-c156c3faaf6f',
      'seatbid': [
        {
          'bid': [
            {
              'id': '2820132fe18114',
              'impid': '2820132fe18114',
              'price': 0.03294,
              'nurl': 'https://api16-event-sg2.pangle.io/api/ad/union/openrtb/win/?req_id=233f1693-68d1-470a-ad85-c156c3faaf6fu1450&ttdsp_adx_index=256&rit=980589944&extra=oqveoB%2Bg4%2ByNz9L8wwu%2Fy%2FwKxQsGaKsJHuB4NMK77uqZ9%2FJKpnsVZculJX8%2FxrRBAtaktU1DRN%2Fy6TKAqibCbj%2FM3%2BZ6biAKQG%2BCyt4eIV0KVvri9jCCnaajbkN7YNJWJJw2lW6cJ6Va3SuJG9H7a%2FAJd2PMbhK7fXWhoW72TwgOcKHKBgjM6sNDISBKbWlZyY3L1PhKSX%2FM8LOvL6qahsb%2FDpEObIx24vhQLNWp28XY1L4UqeibuRjam3eCvN7nXoQq74KkJ45QQsTgvV4j6I6EbLOdjOi%2FURhWMDjUD1VCMpqUT%2B6L8ZROgrX9Tp53eJ3bFOczmSTOmDSazKMHa%2B3uZZ7JHcSx32eoY4hfYc99NOJmYBKXNKCmoXyJvS3PCM3PlAz97hKrDMGnVv1wAQ7QGDCbittF0vZwtsRAvvx2mWINNIB3%2FUB2PjhxFsoDA%2BWE2urVZwEdyu%2FJrCznJsMwenXjcbMD5jmUF5vDkkLS%2B7TMDIEawJPJKZ62pK35enrwGxCs6ePXi21rJJkA0bF8tgAdl4mU1illBIVO4kCL%2ByRASskHPjgg%2FcdFe9HP%2Fi8byjAprH%2BhRerN%2FRKFxC3xv8b75x2pb1g7dY%2FTj9IjT0evsBSPVwFNqtKmPId35IcY%2FSXiqPHh%2FrAHZzr5BPsTT19P49SlNMR9UZYTzViX1iJpcCL1UFjuDdrdff%2BhHCviXxo%2FkRmufEF3umHZwxbdDOPAghuZ0DtRCY6S1rnb%2FK9BbpsVKSndOtgfCwMHFwiPmdw1XjEXGc1eOWXY6qfSp90PIfL6WS7Neh3ba2qMv6WxG3HSOBYvrcCqVTsNxk4UdVm3qb1J0CMVByweTMo45usSkCTdvX3JuEB7tVA6%2BrEk57b3XJd5Phf2AN8hon%2F7lmcXE41kwMQuXq89ViwQmW0G247UFWOQx4t1cmBqFiP6qNA%2F%2BunkZDno1pmAsGnTv7Mz9xtpOaIqKl8BKrVQSTopZ9WcUVzdBUutF19mn1f43BvyA9gIEhcDJHOj&win_price=${AUCTION_PRICE}&auction_mwb=${AUCTION_BID_TO_WIN}&use_pb=1',
              'lurl': 'https://api16-event-sg2.pangle.io/api/ad/union/openrtb/loss/?req_id=233f1693-68d1-470a-ad85-c156c3faaf6fu1450&ttdsp_adx_index=256&rit=980589944&extra=oqveoB%2Bg4%2ByNz9L8wwu%2Fy%2FwKxQsGaKsJHuB4NMK77uqZ9%2FJKpnsVZculJX8%2FxrRBAtaktU1DRN%2Fy6TKAqibCbj%2FM3%2BZ6biAKQG%2BCyt4eIV0KVvri9jCCnaajbkN7YNJWJJw2lW6cJ6Va3SuJG9H7a%2FAJd2PMbhK7fXWhoW72TwgOcKHKBgjM6sNDISBKbWlZyY3L1PhKSX%2FM8LOvL6qahsb%2FDpEObIx24vhQLNWp28XY1L4UqeibuRjam3eCvN7nXoQq74KkJ45QQsTgvV4j6I6EbLOdjOi%2FURhWMDjUD1VCMpqUT%2B6L8ZROgrX9Tp53eJ3bFOczmSTOmDSazKMHa%2B3uZZ7JHcSx32eoY4hfYc99NOJmYBKXNKCmoXyJvS3PCM3PlAz97hKrDMGnVv1wAQ7QGDCbittF0vZwtsRAvvx2mWINNIB3%2FUB2PjhxFsoDA%2BWE2urVZwEdyu%2FJrCznJsMwenXjcbMD5jmUF5vDkkLS%2B7TMDIEawJPJKZ62pK35enrwGxCs6ePXi21rJJkA0bF8tgAdl4mU1illBIVO4kCL%2ByRASskHPjgg%2FcdFe9HP%2Fi8byjAprH%2BhRerN%2FRKFxC3xv8b75x2pb1g7dY%2FTj9IjT0evsBSPVwFNqtKmPId35IcY%2FSXiqPHh%2FrAHZzr5BPsTT19P49SlNMR9UZYTzViX1iJpcCL1UFjuDdrdff%2BhHCviXxo%2FkRmufEF3umHZwxbdDOPAghuZ0DtRCY6S1rnb%2FK9BbpsVKSndOtgfCwMHFwiPmdw1XjEXGc1eOWXY6qfSp90PIfL6WS7Neh3ba2qMv6WxG3HSOBYvrcCqVTsNxk4UdVm3qb1J0CMVByweTMo45usSkCTdvX3JuEB7tVA6%2BrEk57b3XJd5Phf2AN8hon%2F7lmcXE41kwMQuXq89ViwQmW0G247UFWOQx4t1cmBqFiP6qNA%2F%2BunkZDno1pmAsGnTv7Mz9xtpOaIqKl8BKrVQSTopZ9WcUVzdBUutF19mn1f43BvyA9gIEhcDJHOj&reason=${AUCTION_LOSS}&ad_slot_type=8&auction_mwb=${AUCTION_PRICE}&use_pb=1',
              'adm': '<VAST version="2.0"></VAST>',
              'adid': '1780626232977441',
              'adomain': [
                'swi.esxcmnb.com'
              ],
              'iurl': 'https://p16-ttam-va.ibyteimg.com/origin/ad-site-i18n-sg/202310245d0d598b3ff5993c4f129a8b',
              'cid': '1780626232977441',
              'crid': '1780626232977441',
              'attr': [
                4
              ],
              'w': 640,
              'h': 640,
              'mtype': 2,
              'ext': {
                'pangle': {
                  'adtype': 8
                },
                'event_notification_token': {
                  'payload': '980589944:8:1450:7492'
                }
              }
            }
          ],
          'seat': 'pangle'
        }
      ]
    }
  };
  const bannerResponse = {
    'headers': null,
    'body': {
      'id': '233f1693-68d1-470a-ad85-c156c3faaf6f',
      'seatbid': [
        {
          'bid': [
            {
              'id': '2820132fe18114',
              'impid': '2820132fe18114',
              'price': 0.03294,
              'nurl': 'https://api16-event-sg2.pangle.io/api/ad/union/openrtb/win/?req_id=233f1693-68d1-470a-ad85-c156c3faaf6fu1450&ttdsp_adx_index=256&rit=980589944&extra=oqveoB%2Bg4%2ByNz9L8wwu%2Fy%2FwKxQsGaKsJHuB4NMK77uqZ9%2FJKpnsVZculJX8%2FxrRBAtaktU1DRN%2Fy6TKAqibCbj%2FM3%2BZ6biAKQG%2BCyt4eIV0KVvri9jCCnaajbkN7YNJWJJw2lW6cJ6Va3SuJG9H7a%2FAJd2PMbhK7fXWhoW72TwgOcKHKBgjM6sNDISBKbWlZyY3L1PhKSX%2FM8LOvL6qahsb%2FDpEObIx24vhQLNWp28XY1L4UqeibuRjam3eCvN7nXoQq74KkJ45QQsTgvV4j6I6EbLOdjOi%2FURhWMDjUD1VCMpqUT%2B6L8ZROgrX9Tp53eJ3bFOczmSTOmDSazKMHa%2B3uZZ7JHcSx32eoY4hfYc99NOJmYBKXNKCmoXyJvS3PCM3PlAz97hKrDMGnVv1wAQ7QGDCbittF0vZwtsRAvvx2mWINNIB3%2FUB2PjhxFsoDA%2BWE2urVZwEdyu%2FJrCznJsMwenXjcbMD5jmUF5vDkkLS%2B7TMDIEawJPJKZ62pK35enrwGxCs6ePXi21rJJkA0bF8tgAdl4mU1illBIVO4kCL%2ByRASskHPjgg%2FcdFe9HP%2Fi8byjAprH%2BhRerN%2FRKFxC3xv8b75x2pb1g7dY%2FTj9IjT0evsBSPVwFNqtKmPId35IcY%2FSXiqPHh%2FrAHZzr5BPsTT19P49SlNMR9UZYTzViX1iJpcCL1UFjuDdrdff%2BhHCviXxo%2FkRmufEF3umHZwxbdDOPAghuZ0DtRCY6S1rnb%2FK9BbpsVKSndOtgfCwMHFwiPmdw1XjEXGc1eOWXY6qfSp90PIfL6WS7Neh3ba2qMv6WxG3HSOBYvrcCqVTsNxk4UdVm3qb1J0CMVByweTMo45usSkCTdvX3JuEB7tVA6%2BrEk57b3XJd5Phf2AN8hon%2F7lmcXE41kwMQuXq89ViwQmW0G247UFWOQx4t1cmBqFiP6qNA%2F%2BunkZDno1pmAsGnTv7Mz9xtpOaIqKl8BKrVQSTopZ9WcUVzdBUutF19mn1f43BvyA9gIEhcDJHOj&win_price=${AUCTION_PRICE}&auction_mwb=${AUCTION_BID_TO_WIN}&use_pb=1',
              'lurl': 'https://api16-event-sg2.pangle.io/api/ad/union/openrtb/loss/?req_id=233f1693-68d1-470a-ad85-c156c3faaf6fu1450&ttdsp_adx_index=256&rit=980589944&extra=oqveoB%2Bg4%2ByNz9L8wwu%2Fy%2FwKxQsGaKsJHuB4NMK77uqZ9%2FJKpnsVZculJX8%2FxrRBAtaktU1DRN%2Fy6TKAqibCbj%2FM3%2BZ6biAKQG%2BCyt4eIV0KVvri9jCCnaajbkN7YNJWJJw2lW6cJ6Va3SuJG9H7a%2FAJd2PMbhK7fXWhoW72TwgOcKHKBgjM6sNDISBKbWlZyY3L1PhKSX%2FM8LOvL6qahsb%2FDpEObIx24vhQLNWp28XY1L4UqeibuRjam3eCvN7nXoQq74KkJ45QQsTgvV4j6I6EbLOdjOi%2FURhWMDjUD1VCMpqUT%2B6L8ZROgrX9Tp53eJ3bFOczmSTOmDSazKMHa%2B3uZZ7JHcSx32eoY4hfYc99NOJmYBKXNKCmoXyJvS3PCM3PlAz97hKrDMGnVv1wAQ7QGDCbittF0vZwtsRAvvx2mWINNIB3%2FUB2PjhxFsoDA%2BWE2urVZwEdyu%2FJrCznJsMwenXjcbMD5jmUF5vDkkLS%2B7TMDIEawJPJKZ62pK35enrwGxCs6ePXi21rJJkA0bF8tgAdl4mU1illBIVO4kCL%2ByRASskHPjgg%2FcdFe9HP%2Fi8byjAprH%2BhRerN%2FRKFxC3xv8b75x2pb1g7dY%2FTj9IjT0evsBSPVwFNqtKmPId35IcY%2FSXiqPHh%2FrAHZzr5BPsTT19P49SlNMR9UZYTzViX1iJpcCL1UFjuDdrdff%2BhHCviXxo%2FkRmufEF3umHZwxbdDOPAghuZ0DtRCY6S1rnb%2FK9BbpsVKSndOtgfCwMHFwiPmdw1XjEXGc1eOWXY6qfSp90PIfL6WS7Neh3ba2qMv6WxG3HSOBYvrcCqVTsNxk4UdVm3qb1J0CMVByweTMo45usSkCTdvX3JuEB7tVA6%2BrEk57b3XJd5Phf2AN8hon%2F7lmcXE41kwMQuXq89ViwQmW0G247UFWOQx4t1cmBqFiP6qNA%2F%2BunkZDno1pmAsGnTv7Mz9xtpOaIqKl8BKrVQSTopZ9WcUVzdBUutF19mn1f43BvyA9gIEhcDJHOj&reason=${AUCTION_LOSS}&ad_slot_type=8&auction_mwb=${AUCTION_PRICE}&use_pb=1',
              'adm': '<img src="" />',
              'adid': '1780626232977441',
              'adomain': [
                'swi.esxcmnb.com'
              ],
              'iurl': 'https://p16-ttam-va.ibyteimg.com/origin/ad-site-i18n-sg/202310245d0d598b3ff5993c4f129a8b',
              'cid': '1780626232977441',
              'crid': '1780626232977441',
              'attr': [
                4
              ],
              'w': 640,
              'h': 640,
              'mtype': 1,
              'ext': {
                'pangle': {
                  'adtype': 8
                },
                'event_notification_token': {
                  'payload': '980589944:8:1450:7492'
                }
              }
            }
          ],
          'seat': 'pangle'
        }
      ]
    }
  };
  it('should set mediaType to banner', function() {
    const request = spec.buildRequests(multiRequest, bidderRequest)[0];
    const interpretedResponse = spec.interpretResponse(bannerResponse, request);
    const bid = interpretedResponse[0];
    expect(bid.mediaType).to.equal('banner');
  })
  it('should set mediaType to video', function() {
    const request = spec.buildRequests(multiRequest, bidderRequest)[0];
    const interpretedResponse = spec.interpretResponse(videoResponse, request);
    const bid = interpretedResponse[0];
    expect(bid.mediaType).to.equal('video');
  })
});
