import {expect} from 'chai';
import {spec} from 'modules/dxtechBidAdapter.js';

const getBannerRequest = () => {
  return {
    bidderCode: 'dxtech',
    auctionId: 'ba87bfdf-493e-4a88-8e26-17b4cbc9adbd',
    bidderRequestId: 'bidderRequestId',
    bids: [
      {
        bidder: 'dxtech',
        params: {
          placementId: 123456,
          publisherId: 'publisherId',
          bidfloor: 10,
        },
        auctionId: 'auctionId-56a2-4f71-9098-720a68f2f708',
        placementCode: 'div-gpt-dummy-placement-code',
        mediaTypes: {
          banner: {
            sizes: [
              [ 300, 250 ],
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
    bidderCode: 'dxtech',
    auctionId: 'e158486f-8c7f-472f-94ce-b0cbfbb50ab4',
    bidderRequestId: '34feaad34lkj2',
    bids: [{
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
        }
      },
      bidder: 'dxtech',
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
          page: 'https://test.com',
          referrer: 'http://test.com'
        },
        publisherId: 'km123',
        bidfloor: 10,
      }
    }, {
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
        }
      },
      bidder: 'dxtech',
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
          page: 'https://test.com',
          referrer: 'http://test.com'
        },
        publisherId: 'km123',
        bidfloor: 10,
      }
    }],
    auctionStart: 1520001292880,
    timeout: 5000,
    start: 1520001292884,
    doneCbCallCount: 0,
    refererInfo: {
      numIframes: 1,
      reachedTop: true,
      referer: 'test.com'
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
                'https://dummydomain.com'
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
                    auction_id: '514667951122925701',
                    bidder_id: 2,
                    bid_ad_type: 0
                  }
                }
              }
            }
          ],
          seat: 'dxtech'
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

describe('dxtechBidAdapter', function() {
  let videoBidRequest;

  beforeEach(function () {
    videoBidRequest = {
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
        }
      },
      bidder: 'dxtech',
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
          page: 'https://test.com',
          referrer: 'http://test.com'
        },
        publisherId: 'km123',
        bidfloor: 0
      }
    };
  });

  describe('isBidRequestValid', function() {
    let bidderRequest;

    beforeEach(function() {
      bidderRequest = getBannerRequest();
    });

    it('should accept request if placementId and publisherId are passed', function () {
      expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.be.true;
    });

    it('reject requests without params', function () {
      bidderRequest.bids[0].params = {};
      expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.be.false;
    });

    it('returns false when banner mediaType does not exist', function () {
      bidderRequest.bids[0].mediaTypes = {};
      expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.be.false;
    });
  });

  describe('buildRequests', function() {
    let bidderRequest;

    beforeEach(function() {
      bidderRequest = getBannerRequest();
    });

    it('should return expected request object', function() {
      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(bidRequest.url).equal('https://ads.dxtech.ai/pbjs?publisher_id=publisherId&placement_id=123456');
      expect(bidRequest.method).equal('POST');
    });
  });

  context('banner validation', function () {
    it('returns true when banner sizes are defined', function () {
      const bid = {
        bidder: 'dxtech',
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
          bidder: 'dxtech',
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
      this.bid = {
        bidder: 'dxtech',
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

    it('returns false when video playerSize is invalid', function () {
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
      ];

      invalidMimes.forEach((mimes) => {
        this.bid.mediaTypes.video.mimes = mimes;
        expect(spec.isBidRequestValid(this.bid)).to.be.false;
      });
    });

    it('returns false when video protocols is invalid', function () {
      const invalidProtocols = [
        undefined,
        'test',
        1,
        []
      ];

      invalidProtocols.forEach((protocols) => {
        this.bid.mediaTypes.video.protocols = protocols;
        expect(spec.isBidRequestValid(this.bid)).to.be.false;
      });
    });
  });

  describe('buildRequests with media types', function () {
    let bidRequestsWithMediaTypes;
    let mockBidderRequest;

    beforeEach(function() {
      mockBidderRequest = {refererInfo: {}};

      bidRequestsWithMediaTypes = [{
        bidder: 'dxtech',
        params: {
          publisherId: 'km123',
          placementId: 'placement123'
        },
        adUnitCode: '/adunit-code/test-path',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        bidId: 'test-bid-id-1',
        bidderRequestId: 'test-bid-request-1',
        auctionId: 'test-auction-1',
        transactionId: 'test-transactionId-1'
      }, {
        bidder: 'dxtech',
        params: {
          publisherId: 'km123',
          placementId: 'placement456'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            context: 'instream',
            mimes: ['video/mp4'],
            protocols: [2, 5]
          }
        },
        bidId: 'test-bid-id-2',
        bidderRequestId: 'test-bid-request-2',
        auctionId: 'test-auction-2',
        transactionId: 'test-transactionId-2'
      }];
    });

    context('when mediaType is banner', function () {
      it('creates request data', function () {
        const bannerRequest = getBannerRequest();
        const request = spec.buildRequests(bannerRequest.bids, bannerRequest);

        expect(request).to.exist.and.to.be.a('object');
        const payload = request.data;
        expect(payload.imp[0]).to.have.property('id', bannerRequest.bids[0].bidId);
      });

      it('has gdpr data if applicable', function () {
        const bannerRequest = getBannerRequest();
        const req = Object.assign({}, bannerRequest, {
          gdprConsent: {
            consentString: 'consentString',
            gdprApplies: true,
          }
        });
        const request = spec.buildRequests(bannerRequest.bids, req);

        const payload = request.data;
        expect(payload.user.ext).to.have.property('consent', req.gdprConsent.consentString);
        expect(payload.regs.ext).to.have.property('gdpr', 1);
      });
    });

    context('video requests', function () {
      it('should create a POST request', function () {
        const requests = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        expect(requests.method).to.equal('POST');
        expect(requests.url).to.include('publisher_id=km123');
      });

      it('should attach request data', function () {
        const requests = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        const data = requests.data;

        expect(data.ext.prebidver).to.equal('$prebid.version$');
        expect(data.ext.adapterver).to.equal(spec.VERSION);
      });

      it('should set pubId to e2etest when bid.params.e2etest = true', function () {
        bidRequestsWithMediaTypes[0].params.e2etest = true;
        const requests = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        expect(requests.method).to.equal('POST');
        expect(requests.url).to.equal(spec.ENDPOINT + '?publisher_id=e2etest');
      });
    });
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
        const bids = spec.interpretResponse(bidderResponse, bidRequest);
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

  describe('getUserSyncs', function () {
    let bidderResponse;

    beforeEach(function() {
      bidderResponse = getBidderResponse();
    });

    it('handles no parameters', function () {
      const opts = spec.getUserSyncs({});
      expect(opts).to.be.an('array').that.is.empty;
    });

    it('returns none if sync is not allowed', function () {
      const opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false});
      expect(opts).to.be.an('array').that.is.empty;
    });

    it('iframe sync enabled should return results', function () {
      const opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: false}, [bidderResponse]);

      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('iframe');
      expect(opts[0].url).to.equal(bidderResponse.body.ext.usersync['sovrn'].syncs[0].url);
    });

    it('pixel sync enabled should return results', function () {
      const opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [bidderResponse]);

      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('image');
      expect(opts[0].url).to.equal(bidderResponse.body.ext.usersync['appnexus'].syncs[0].url);
    });

    it('all sync enabled should prioritize iframe', function () {
      const opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [bidderResponse]);

      expect(opts.length).to.equal(1);
    });
  });
});
