import { expect } from 'chai';
import { spec } from 'modules/alloxBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

const ENDPOINT = 'https://alxd.addlv.smt.docomo.ne.jp/1.0/w/xdp/web.json';

const TRACKER_TYPE = {
  IMP: 1,
  LOSE_NOTICE_WHEN_ALLOX_WIN: 101,
  LOSE_NOTICE_WHEN_ALLOX_LOSE: 102
};

describe('alloxBidAdapter', function () {
  const adapter = newBidder(spec);

  const mockOrtbResponses = {
    banner: {
      id: 'BID-1-ZIMP-4b309eae-504a-4252-a8a8-4c8ceee9791a',
      seatbid: [
        {
          bid: [
            {
              id: '32a69c6ba388f110487f9d1e63f77b22d86e916b',
              impid: '279d6048370632',
              price: 1,
              adid: '529833ce55314b19e8796116',
              nurl: 'https://alxl-s.allox-s.allox.d2c.ne.jp/xdp/v1/notify/win',
              lurl: 'https://alxl-s.allox-s.allox.d2c.ne.jp/xdp/v1/notify/lose?wprice=${ALLOX:AUCTION_PRICE}&wcur=${ALLOX:AUCTION_CURRENCY}',
              adm: '<div class="allox"></div>',
              adomain: ['d2c.ne.jp'],
              crid: '529833ce55314b19e8796116_1385706446',
              w: 300,
              h: 250,
              ext: {
                trackers: [
                  {
                    type: 1,
                    url: 'https://alxm-s.addlv.smt.docomo.ne.jp/529833ce55314b19e8796116/imp',
                    method: 'GET'
                  },
                  {
                    type: 1,
                    url: 'https://alxm-s.addlv.smt.docomo.ne.jp/prebid/imp',
                    method: 'GET'
                  },
                  {
                    type: 101,
                    url: 'http://alxm-s.addlv.smt.docomo.ne.jp/529833ce55314b19e8796116/lose_101',
                    method: 'GET'
                  },
                  {
                    type: 102,
                    url: 'https://alxl-s.allox-s.allox.d2c.ne.jp/xdp/v1/notify/lose_102?wprice=${ALLOX:AUCTION_PRICE}&wcur=${ALLOX:AUCTION_CURRENCY}',
                    method: 'GET'
                  }
                ]
              }
            }
          ]
        }
      ],
      cur: 'JPY'
    },
    nobid: {
      id: 'BID-2-ZIMP-4b309eae-504a-4252-a8a8-4c8ceee9791a',
      seatbid: [],
      cur: '',
      ext: {
        trackers: [
          {
            type: 102,
            url: 'https://alxl-s.allox-s.allox.d2c.ne.jp/v1/log/trace/lose_102_NoAd?wprice=${ALLOX:AUCTION_PRICE}&wcur=${ALLOX:AUCTION_CURRENCY}',
            method: 'GET'
          }
        ]
      }
    }
  };

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      bidder: 'allox',
      params: {
        placementId: '123456',
        nidanId: '636e6a0e0207e4a0f1f0d86b5bb57f3539b43ee224b84cc938d1f5659ff0360337bb694f20cc7094',
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {};
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let mockBidRequests = [
      {
        bidder: 'allox',
        params: {
          placementId: 'banner',
          nidanId: '636e6a0e0207e4a0f1f0d86b5bb57f3539b43ee224b84cc938d1f5659ff0360337bb694f20cc7094',
          daisyId: '11dsy1dAAferVBRo',
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        bidId: '2cd616eeefbe04',
        bidderRequestId: '164dfa54d9c956',
        auctionId: 'aba03555-4802-4c45-9f15-05ffa8594cff',
      }
    ];

    it('sends bid request to ENDPOINT via POST', function () {
      const mockBidderRequest = { refererInfo: {} };
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      const regexp = `web_[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}-${mockBidRequests[0].bidId}`;
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].data).to.have.all.keys(['n', 'd', 'p', 't', 'bw', 'impid']);
      expect(requests[0].data).to.have.property('t').that.match(new RegExp(regexp));
      expect(requests[0].data).to.have.property('p', mockBidRequests[0].params.placementId)
    });
  });

  describe('interpretResponse', function () {
    const mockBidRequests = [
      {
        bidder: 'allox',
        params: {
          placementId: 'banner',
          nidanId: '636e6a0e0207e4a0f1f0d86b5bb57f3539b43ee224b84cc938d1f5659ff0360337bb694f20cc7094',
          daisyId: '11dsy1dAAferVBRo',
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        bidId: '279d6048370632',
        bidderRequestId: '11acba431de115',
        auctionId: 'aba03555-4802-4c45-9f15-05ffa8594cff',
      }
    ];
    const mockBidderRequest = { refererInfo: {} };

    it('should get correct banner bid response', function () {
      const expectedResponse = [
        {
          requestId: '279d6048370632',
          cpm: 1,
          currency: 'JPY',
          width: 300,
          height: 250,
          meta: {
            advertiserDomains: [
              'd2c.ne.jp'
            ]
          },
          ad: '<div class="allox"></div>',
          mediaType: 'banner',
          creativeId: '529833ce55314b19e8796116_1385706446',
          creative_id: '529833ce55314b19e8796116_1385706446',
          seatBidId: '32a69c6ba388f110487f9d1e63f77b22d86e916b',
          lurl: 'https://alxl-s.allox-s.allox.d2c.ne.jp/xdp/v1/notify/lose?wprice=${ALLOX:AUCTION_PRICE}&wcur=${ALLOX:AUCTION_CURRENCY}',
          trackers: mockOrtbResponses.banner.seatbid[0].bid[0].ext.trackers,
          netRevenue: true,
          ttl: 30
        }
      ];

      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      const result = spec.interpretResponse({ body: mockOrtbResponses.banner }, requests[0]);
      const bid = mockOrtbResponses.banner.seatbid[0].bid[0];

      expect(result).to.have.lengthOf(1);

      expectedResponse[0].ad += utils.createTrackPixelHtml(bid.nurl) + bid.ext.trackers
        .filter(tracker => tracker.type === TRACKER_TYPE.IMP)
        .reduce((pre, cur) => `${pre}${utils.createTrackPixelHtml(cur.url)}`, '');

      expect(result).to.deep.have.same.members(expectedResponse);
    });

    it('handles nobid responses', function () {
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      const result = spec.interpretResponse({ body: mockOrtbResponses.nobid }, requests[0]);
      expect(result.length).to.equal(0);
    });
  });
});
