import {expect} from 'chai';
import {spec} from 'modules/kulturemediaBidAdapter.js';

const BANNER_REQUEST = {
  'bidderCode': 'kulturemedia',
  'auctionId': 'auctionId-56a2-4f71-9098-720a68f2f708',
  'bidderRequestId': 'requestId',
  'bidRequest': [{
    'bidder': 'kulturemedia',
    'params': {
      'placementId': 123456,
    },
    'placementCode': 'div-gpt-dummy-placement-code',
    'mediaTypes': {'banner': {'sizes': [[300, 250]]}},
    'bidId': 'bidId1',
    'bidderRequestId': 'bidderRequestId',
    'auctionId': 'auctionId-56a2-4f71-9098-720a68f2f708'
  },
  {
    'bidder': 'kulturemedia',
    'params': {
      'placementId': 123456,
    },
    'placementCode': 'div-gpt-dummy-placement-code',
    'mediaTypes': {'banner': {'sizes': [[300, 250]]}},
    'bidId': 'bidId2',
    'bidderRequestId': 'bidderRequestId',
    'auctionId': 'auctionId-56a2-4f71-9098-720a68f2f708'
  }],
  'start': 1487883186070,
  'auctionStart': 1487883186069,
  'timeout': 3000
};

const RESPONSE = {
  'headers': null,
  'body': {
    'id': 'responseId',
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
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 334553,
                  'auction_id': 514667951122925701,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          },
          {
            'id': 'bidId2',
            'impid': 'bidId2',
            'price': 0.1,
            'adm': '<script>adm2</script>',
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
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 386046,
                  'auction_id': 517067951122925501,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          }
        ],
        'seat': 'kulturemedia'
      }
    ],
    'ext': {
      'usersync': {
        'sovrn': {
          'status': 'none',
          'syncs': [
            {
              'url': 'urlsovrn',
              'type': 'iframe'
            }
          ]
        },
        'appnexus': {
          'status': 'none',
          'syncs': [
            {
              'url': 'urlappnexus',
              'type': 'pixel'
            }
          ]
        }
      },
      'responsetimemillis': {
        'appnexus': 127
      }
    }
  }
};

const DEFAULT_NETWORK_ID = 1;

describe('kulturemediaBidAdapter:', function () {
  let videoBidRequest;

  const VIDEO_REQUEST = {
    'bidderCode': 'kulturemedia',
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
      'referer': 'test.com'
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
      bidder: 'kulturemedia',
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
          hp: 1,
          inventoryid: 123
        },
        site: {
          id: 1,
          page: 'https://test.com',
          referrer: 'http://test.com'
        },
        publisherId: 'km123'
      }
    };
  });

  describe('isBidRequestValid', function () {
    context('basic validation', function () {
      beforeEach(function () {
        // Basic Valid BidRequest
        this.bid = {
          bidder: 'kulturemedia',
          mediaTypes: {
            banner: {
              sizes: [[250, 300]]
            }
          },
          params: {
            placementId: 'placementId',
            publisherId: 'publisherId',
          }
        };
      });

      it('should accept request if placementId and publisherId are passed', function () {
        expect(spec.isBidRequestValid(this.bid)).to.be.true;
      });

      it('reject requests without params', function () {
        this.bid.params = {};
        expect(spec.isBidRequestValid(this.bid)).to.be.false;
      });

      it('returns false when banner mediaType does not exist', function () {
        this.bid.mediaTypes = {}
        expect(spec.isBidRequestValid(this.bid)).to.be.false;
      });
    });

    context('banner validation', function () {
      it('returns true when banner sizes are defined', function () {
        const bid = {
          bidder: 'kulturemedia',
          mediaTypes: {
            banner: {
              sizes: [[250, 300]]
            }
          },
          params: {
            placementId: 'placementId',
            publisherId: 'publisherId',
          }
        };

        expect(spec.isBidRequestValid(bid)).to.be.true;
      });

      it('returns false when banner sizes are invalid', function () {
        const invalidSizes = [
          undefined,
          '2:1',
          123,
          'test'
        ];

        invalidSizes.forEach((sizes) => {
          const bid = {
            bidder: 'kulturemedia',
            mediaTypes: {
              banner: {
                sizes
              }
            },
            params: {
              placementId: 'placementId',
              publisherId: 'publisherId',
            }
          };

          expect(spec.isBidRequestValid(bid)).to.be.false;
        });
      });
    });

    context('video validation', function () {
      beforeEach(function () {
        // Basic Valid BidRequest
        this.bid = {
          bidder: 'kulturemedia',
          mediaTypes: {
            video: {
              playerSize: [[300, 50]],
              context: 'instream',
              mimes: ['foo', 'bar'],
              protocols: [1, 2]
            }
          },
          params: {
            placementId: 'placementId',
            publisherId: 'publisherId',
          }
        };
      });

      it('should return true (skip validations) when e2etest = true', function () {
        this.bid.params = {
          e2etest: true
        };
        expect(spec.isBidRequestValid(this.bid)).to.equal(true);
      });

      it('returns false when video context is not defined', function () {
        delete this.bid.mediaTypes.video.context;

        expect(spec.isBidRequestValid(this.bid)).to.be.false;
      });

      it('returns false when video playserSize is invalid', function () {
        const invalidSizes = [
          undefined,
          '2:1',
          123,
          'test'
        ];

        invalidSizes.forEach((playerSize) => {
          this.bid.mediaTypes.video.playerSize = playerSize;
          expect(spec.isBidRequestValid(this.bid)).to.be.false;
        });
      });

      it('returns false when video mimes is invalid', function () {
        const invalidMimes = [
          undefined,
          'test',
          1,
          []
        ]

        invalidMimes.forEach((mimes) => {
          this.bid.mediaTypes.video.mimes = mimes;
          expect(spec.isBidRequestValid(this.bid)).to.be.false;
        })
      });

      it('returns false when video protocols is invalid', function () {
        const invalidMimes = [
          undefined,
          'test',
          1,
          []
        ]

        invalidMimes.forEach((protocols) => {
          this.bid.mediaTypes.video.protocols = protocols;
          expect(spec.isBidRequestValid(this.bid)).to.be.false;
        })
      });
    });
  });

  describe('buildRequests', function () {
    context('when mediaType is banner', function () {
      it('creates request data', function () {
        let request = spec.buildRequests(BANNER_REQUEST.bidRequest, BANNER_REQUEST);

        expect(request).to.exist.and.to.be.a('object');
        const payload = JSON.parse(request.data);
        expect(payload.imp[0]).to.have.property('id', BANNER_REQUEST.bidRequest[0].bidId);
        expect(payload.imp[1]).to.have.property('id', BANNER_REQUEST.bidRequest[1].bidId);
      });

      it('has gdpr data if applicable', function () {
        const req = Object.assign({}, BANNER_REQUEST, {
          gdprConsent: {
            consentString: 'consentString',
            gdprApplies: true,
          }
        });
        let request = spec.buildRequests(BANNER_REQUEST.bidRequest, req);

        const payload = JSON.parse(request.data);
        expect(payload.user.ext).to.have.property('consent', req.gdprConsent.consentString);
        expect(payload.regs.ext).to.have.property('gdpr', 1);
      });

      it('should properly forward eids parameters', function () {
        const req = Object.assign({}, BANNER_REQUEST);
        req.bidRequest[0].userIdAsEids = [
          {
            source: 'dummy.com',
            uids: [
              {
                id: 'd6d0a86c-20c6-4410-a47b-5cba383a698a',
                atype: 1
              }
            ]
          }];
        let request = spec.buildRequests(req.bidRequest, req);

        const payload = JSON.parse(request.data);
        expect(payload.user.ext.eids[0].source).to.equal('dummy.com');
        expect(payload.user.ext.eids[0].uids[0].id).to.equal('d6d0a86c-20c6-4410-a47b-5cba383a698a');
        expect(payload.user.ext.eids[0].uids[0].atype).to.equal(1);
      });
    });

    context('when mediaType is video', function () {
      it('should create a POST request for every bid', function () {
        const requests = spec.buildRequests([videoBidRequest], VIDEO_REQUEST);
        expect(requests.method).to.equal('POST');
        expect(requests.url.trim()).to.equal(spec.ENDPOINT + '?pid=' + videoBidRequest.params.publisherId + '&nId=' + DEFAULT_NETWORK_ID);
      });

      it('should attach request data', function () {
        const requests = spec.buildRequests([videoBidRequest], VIDEO_REQUEST);
        const data = JSON.parse(requests.data);
        const [width, height] = videoBidRequest.sizes;
        const VERSION = '1.0.0';
        expect(data.imp[0].video.w).to.equal(width);
        expect(data.imp[0].video.h).to.equal(height);
        expect(data.imp[0].bidfloor).to.equal(videoBidRequest.params.bidfloor);
        expect(data.ext.prebidver).to.equal('$prebid.version$');
        expect(data.ext.adapterver).to.equal(spec.VERSION);
      });

      it('should set pubId to e2etest when bid.params.e2etest = true', function () {
        videoBidRequest.params.e2etest = true;
        const requests = spec.buildRequests([videoBidRequest], VIDEO_REQUEST);
        expect(requests.method).to.equal('POST');
        expect(requests.url).to.equal(spec.ENDPOINT + '?pid=e2etest&nId=' + DEFAULT_NETWORK_ID);
      });

      it('should attach End 2 End test data', function () {
        videoBidRequest.params.e2etest = true;
        const requests = spec.buildRequests([videoBidRequest], VIDEO_REQUEST);
        const data = JSON.parse(requests.data);
        expect(data.imp[0].bidfloor).to.not.exist;
        expect(data.imp[0].video.w).to.equal(640);
        expect(data.imp[0].video.h).to.equal(480);
      });
    });
  });

  describe('interpretResponse', function () {
    context('when mediaType is banner', function () {
      it('have bids', function () {
        let bids = spec.interpretResponse(RESPONSE, BANNER_REQUEST);
        expect(bids).to.be.an('array').that.is.not.empty;
        validateBidOnIndex(0);
        validateBidOnIndex(1);

        function validateBidOnIndex(index) {
          expect(bids[index]).to.have.property('currency', 'USD');
          expect(bids[index]).to.have.property('requestId', RESPONSE.body.seatbid[0].bid[index].impid);
          expect(bids[index]).to.have.property('cpm', RESPONSE.body.seatbid[0].bid[index].price);
          expect(bids[index]).to.have.property('width', RESPONSE.body.seatbid[0].bid[index].w);
          expect(bids[index]).to.have.property('height', RESPONSE.body.seatbid[0].bid[index].h);
          expect(bids[index]).to.have.property('ad', RESPONSE.body.seatbid[0].bid[index].adm);
          expect(bids[index]).to.have.property('creativeId', RESPONSE.body.seatbid[0].bid[index].crid);
          expect(bids[index].meta).to.have.property('advertiserDomains', RESPONSE.body.seatbid[0].bid[index].adomain);
          expect(bids[index]).to.have.property('ttl', 300);
          expect(bids[index]).to.have.property('netRevenue', true);
        }
      });

      it('handles empty response', function () {
        const EMPTY_RESP = Object.assign({}, RESPONSE, {'body': {}});
        const bids = spec.interpretResponse(EMPTY_RESP, BANNER_REQUEST);

        expect(bids).to.be.empty;
      });
    });

    context('when mediaType is video', function () {
      it('should return no bids if the response is not valid', function () {
        const bidResponse = spec.interpretResponse({
          body: null
        }, {
          videoBidRequest
        });
        expect(bidResponse.length).to.equal(0);
      });

      it('should return no bids if the response "nurl" and "adm" are missing', function () {
        const serverResponse = {
          seatbid: [{
            bid: [{
              price: 6.01
            }]
          }]
        };
        const bidResponse = spec.interpretResponse({
          body: serverResponse
        }, {
          videoBidRequest
        });
        expect(bidResponse.length).to.equal(0);
      });

      it('should return no bids if the response "price" is missing', function () {
        const serverResponse = {
          seatbid: [{
            bid: [{
              adm: '<VAST></VAST>'
            }]
          }]
        };
        const bidResponse = spec.interpretResponse({
          body: serverResponse
        }, {
          videoBidRequest
        });
        expect(bidResponse.length).to.equal(0);
      });

      it('should return a valid video bid response with just "adm"', function () {
        const serverResponse = {
          id: '123',
          seatbid: [{
            bid: [{
              id: 1,
              adid: 123,
              impid: 456,
              crid: 2,
              price: 6.01,
              adm: '<VAST></VAST>',
              adomain: [
                'kulturemedia.com'
              ],
              w: 640,
              h: 480,
              ext: {
                prebid: {
                  type: 'video'
                },
              }
            }]
          }],
          cur: 'USD'
        };
        const bidResponse = spec.interpretResponse({
          body: serverResponse
        }, {
          videoBidRequest
        });
        let o = {
          requestId: serverResponse.seatbid[0].bid[0].impid,
          ad: '<VAST></VAST>',
          bidderCode: spec.code,
          cpm: serverResponse.seatbid[0].bid[0].price,
          creativeId: serverResponse.seatbid[0].bid[0].crid,
          vastXml: serverResponse.seatbid[0].bid[0].adm,
          width: 640,
          height: 480,
          mediaType: 'video',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          meta: {
            advertiserDomains: ['kulturemedia.com']
          }
        };
        expect(bidResponse[0]).to.deep.equal(o);
      });

      it('should default ttl to 300', function () {
        const serverResponse = {
          seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}],
          cur: 'USD'
        };
        const bidResponse = spec.interpretResponse({body: serverResponse}, {videoBidRequest});
        expect(bidResponse[0].ttl).to.equal(300);
      });
      it('should not allow ttl above 3601, default to 300', function () {
        videoBidRequest.params.video.ttl = 3601;
        const serverResponse = {
          seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}],
          cur: 'USD'
        };
        const bidResponse = spec.interpretResponse({body: serverResponse}, {videoBidRequest});
        expect(bidResponse[0].ttl).to.equal(300);
      });
      it('should not allow ttl below 1, default to 300', function () {
        videoBidRequest.params.video.ttl = 0;
        const serverResponse = {
          seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}],
          cur: 'USD'
        };
        const bidResponse = spec.interpretResponse({body: serverResponse}, {videoBidRequest});
        expect(bidResponse[0].ttl).to.equal(300);
      });
    });
  });

  describe('getUserSyncs', function () {
    it('handles no parameters', function () {
      let opts = spec.getUserSyncs({});
      expect(opts).to.be.an('array').that.is.empty;
    });
    it('returns non if sync is not allowed', function () {
      let opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false});

      expect(opts).to.be.an('array').that.is.empty;
    });

    it('iframe sync enabled should return results', function () {
      let opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: false}, [RESPONSE]);

      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('iframe');
      expect(opts[0].url).to.equal(RESPONSE.body.ext.usersync['sovrn'].syncs[0].url);
    });

    it('pixel sync enabled should return results', function () {
      let opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [RESPONSE]);

      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('image');
      expect(opts[0].url).to.equal(RESPONSE.body.ext.usersync['appnexus'].syncs[0].url);
    });

    it('all sync enabled should return all results', function () {
      let opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [RESPONSE]);

      expect(opts.length).to.equal(2);
    });
  });
})
;
