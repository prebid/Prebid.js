import {expect} from 'chai';
import {spec} from 'modules/madsenseBidAdapter.js';
import {BANNER, VIDEO} from 'src/mediaTypes.js';

const getBannerRequest = () => {
  return {
    bidderCode: 'madsense',
    auctionId: 'c4c13mm4-423e-3mma-c4c1-1b24cwc9adbd',
    bidderRequestId: 'bidderRequestId',
    bids: [
      {
        bidder: 'madsense',
        params: {
          company_id: 123456,
          bidfloor: 10,
        },
        auctionId: 'auctionId-56a2-4f71-9098-720a68f2f708',
        placementCode: 'div-gpt-dummy-placement-code',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
            ]
          }
        },
        bidId: '2e9f38ea93bb9e',
        bidderRequestId: 'bidderRequestId',
      }
    ],
    start: 1487883186070,
    auctionStart: 1487883186069,
    timeout: 3000
  }
};


const getVideoRequest = () => {
  return {
    bidderCode: 'madsense',
    auctionId: 'e158486f-8c7f-472f-94ce-b0cbfbb50ab4',
    bidderRequestId: '34feaad34lkj2',
    bids: [{
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
        }
      },
      bidder: 'madsense',
      sizes: [640, 480],
      bidId: '30b3efwfwe1e',
      adUnitCode: 'video1',
      params: {
        video: {
          playerWidth: 640,
          playerHeight: 480,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          sid: 134,
          rewarded: 1,
          placement: 1,
          plcmt: 1,
          hp: 1,
          inventoryid: 123
        },
        site: {
          id: 1,
          page: 'https://test.io',
          referrer: 'http://test.io'
        },
        company_id: '123567'
      }
    }, {
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
        }
      },
      bidder: 'madsense',
      sizes: [640, 480],
      bidId: '30b3efwfwe2e',
      adUnitCode: 'video1',
      params: {
        video: {
          playerWidth: 640,
          playerHeight: 480,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          sid: 134,
          rewarded: 1,
          placement: 1,
          plcmt: 1,
          hp: 1,
          inventoryid: 123
        },
        site: {
          id: 1,
          page: 'https://test.io',
          referrer: 'http://test.io'
        },
        company_id: '123456',
        bidfloor: 10,
      }
    }],
    auctionStart: 1521001292880,
    timeout: 5000,
    start: 1521001292884,
    doneCbCallCount: 0,
    refererInfo: {
      numIframes: 1,
      reachedTop: true,
      referer: 'test.io'
    }
  };
};

const getBidderResponse = () => {
  return {
    headers: null,
    body: {
      id: 'bid-response',
      seatbid: [
        {
          bid: [
            {
              id: '2e9f38ea93bb9e',
              impid: '2e9f38ea93bb9e',
              price: 0.18,
              adm: '<script>adm</script>',
              adid: '144762342',
              adomain: [
                'https://example.io'
              ],
              iurl: 'iurl',
              cid: '109',
              crid: 'creativeId',
              cat: [],
              w: 300,
              h: 250,
              ext: {
                prebid: {
                  type: 'banner'
                },
                bidder: {
                  appnexus: {
                    brand_id: 334553,
                    auction_id: 514667951122925701,
                    bidder_id: 2,
                    bid_ad_type: 0
                  }
                }
              }
            }
          ],
          seat: 'madsense'
        }
      ],
      ext: {
        usersync: {
          sovrn: {
            status: 'none',
            syncs: [
              {
                url: 'urlsovrn',
                type: 'iframe'
              }
            ]
          },
          appnexus: {
            status: 'none',
            syncs: [
              {
                url: 'urlappnexus',
                type: 'pixel'
              }
            ]
          }
        },
        responsetimemillis: {
          appnexus: 127
        }
      }
    }
  };
}




describe('madsenseBidAdapter', function() {
  let videoBidRequest;

  const VIDEO_REQUEST = {
    'bidderCode': 'madsense',
    'auctionId': 'e158486f-8c7f-472f-94ce-b0cbfbb50ab4',
    'bidderRequestId': '34feaad34lkj2',
    'bids': videoBidRequest,
    'auctionStart': 1520001292880,
    'timeout': 3000,
    'start': 1520001292884,
    'doneCbCallCount': 0,
    'refererInfo': {
      'numIframes': 1,
      'reachedTop': true,
      'referer': 'test.io'
    }
  };

  beforeEach(function () {
    videoBidRequest = {
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
        }
      },
      bidder: 'madsense',
      sizes: [640, 480],
      bidId: '30b3efwfwe1e',
      adUnitCode: 'video1',
      params: {
        video: {
          playerWidth: 640,
          playerHeight: 480,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          sid: 134,
          rewarded: 1,
          placement: 1,
          plcmt: 1,
          hp: 1,
          inventoryid: 123
        },
        site: {
          id: 1,
          page: 'https://test.io',
          referrer: 'http://test.io'
        },
        company_id: 'cid123',
        bidfloor: 0
      }
    };
  });

  describe('interpretResponse', function() {
    context('when mediaType is banner', function() {
      let bidRequest, bidderResponse;
      beforeEach(function() {
        const bidderRequest = getBannerRequest();
        bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
        bidderResponse = getBidderResponse();
      });

      it('handles empty response', function () {
        const EMPTY_RESP = Object.assign({}, bidderResponse, {'body': {}});
        const bids = spec.interpretResponse(EMPTY_RESP, bidRequest);

        expect(bids).to.be.empty;
      });

      it('have bids', function () {
        let bids = spec.interpretResponse(bidderResponse, bidRequest);
        expect(bids).to.be.an('array').that.is.not.empty;
        validateBidOnIndex(0);

        function validateBidOnIndex(index) {
          expect(bids[index]).to.have.property('currency', 'USD');
          expect(bids[index]).to.have.property('requestId', getBidderResponse().body.seatbid[0].bid[index].impid);
          expect(bids[index]).to.have.property('cpm', getBidderResponse().body.seatbid[0].bid[index].price);
          expect(bids[index]).to.have.property('width', getBidderResponse().body.seatbid[0].bid[index].w);
          expect(bids[index]).to.have.property('height', getBidderResponse().body.seatbid[0].bid[index].h);
          expect(bids[index]).to.have.property('ad', getBidderResponse().body.seatbid[0].bid[index].adm);
          expect(bids[index]).to.have.property('creativeId', getBidderResponse().body.seatbid[0].bid[index].crid);
          expect(bids[index].meta).to.have.property('advertiserDomains');
          expect(bids[index]).to.have.property('ttl', 300);
          expect(bids[index]).to.have.property('netRevenue', true);
        }
      });
    });

    context('when mediaType is video', function () {
      let bidRequest, bidderResponse;
      beforeEach(function() {
        const bidderRequest = getVideoRequest();
        bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
        bidderResponse = getBidderResponse();
      });

      it('handles empty response', function () {
        const EMPTY_RESP = Object.assign({}, bidderResponse, {'body': {}});
        const bids = spec.interpretResponse(EMPTY_RESP, bidRequest);

        expect(bids).to.be.empty;
      });

      it('should return no bids if the response "nurl" and "adm" are missing', function () {
        const SERVER_RESP = Object.assign({}, bidderResponse, {'body': {
          seatbid: [{
            bid: [{
              price: 6.01
            }]
          }]
        }});
        const bids = spec.interpretResponse(SERVER_RESP, bidRequest);
        expect(bids.length).to.equal(0);
      });

      it('should return no bids if the response "price" is missing', function () {
        const SERVER_RESP = Object.assign({}, bidderResponse, {'body': {
          seatbid: [{
            bid: [{
              adm: '<VAST></VAST>'
            }]
          }]
        }});
        const bids = spec.interpretResponse(SERVER_RESP, bidRequest);
        expect(bids.length).to.equal(0);
      });
    });
  });
});
