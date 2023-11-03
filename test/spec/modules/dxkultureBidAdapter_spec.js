import {expect} from 'chai';
import {spec, SYNC_URL} from 'modules/dxkultureBidAdapter.js';
import {BANNER, VIDEO} from 'src/mediaTypes.js';

const getBannerRequest = () => {
  return {
    bidderCode: 'dxkulture',
    auctionId: 'ba87bfdf-493e-4a88-8e26-17b4cbc9adbd',
    bidderRequestId: 'bidderRequestId',
    bids: [
      {
        bidder: 'dxkulture',
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
    bidderCode: 'dxkulture',
    auctionId: 'e158486f-8c7f-472f-94ce-b0cbfbb50ab4',
    bidderRequestId: '34feaad34lkj2',
    bids: [{
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
        }
      },
      bidder: 'dxkulture',
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
      bidder: 'dxkulture',
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
                    auction_id: 514667951122925701,
                    bidder_id: 2,
                    bid_ad_type: 0
                  }
                }
              }
            }
          ],
          seat: 'dxkulture'
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

describe('dxkultureBidAdapter', function() {
  let videoBidRequest;

  const VIDEO_REQUEST = {
    'bidderCode': 'dxkulture',
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
      bidder: 'dxkulture',
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

  describe('isValidRequest', function() {
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
      bidderRequest.bids[0].mediaTypes = {}
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
      expect(bidRequest.url).equal('https://ads.kulture.media/pbjs?pid=publisherId&placementId=123456');
      expect(bidRequest.method).equal('POST');
    });
  });

  context('banner validation', function () {
    let bidderRequest;

    beforeEach(function() {
      bidderRequest = getBannerRequest();
    });

    it('returns true when banner sizes are defined', function () {
      const bid = {
        bidder: 'dxkulture',
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

      expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.be.true;
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
          bidder: 'dxkulture',
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
        bidder: 'dxkulture',
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

  describe('buildRequests', function () {
    let bidderBannerRequest;
    let bidRequestsWithMediaTypes;
    let mockBidderRequest;

    beforeEach(function() {
      bidderBannerRequest = getBannerRequest();

      mockBidderRequest = {refererInfo: {}};

      bidRequestsWithMediaTypes = [{
        bidder: 'dxkulture',
        params: {
          publisherId: 'km123',
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
        transactionId: 'test-transactionId-1',
        ortb2Imp: {
          ext: {
            ae: 2
          }
        }
      }, {
        bidder: 'dxkulture',
        params: {
          publisherId: 'km123',
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            placement: 1,
            plcmt: 1,
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
        let request = spec.buildRequests(bidderBannerRequest.bids, bidderBannerRequest)

        expect(request).to.exist.and.to.be.a('object');
        const payload = request.data;
        expect(payload.imp[0]).to.have.property('id', bidderBannerRequest.bids[0].bidId);
      });

      it('has gdpr data if applicable', function () {
        const req = Object.assign({}, getBannerRequest(), {
          gdprConsent: {
            consentString: 'consentString',
            gdprApplies: true,
          }
        });
        let request = spec.buildRequests(bidderBannerRequest.bids, req);

        const payload = request.data;
        expect(payload.user.ext).to.have.property('consent', req.gdprConsent.consentString);
        expect(payload.regs.ext).to.have.property('gdpr', 1);
      });
    });

    if (FEATURES.VIDEO) {
      context('video', function () {
        it('should create a POST request for every bid', function () {
          const requests = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
          expect(requests.method).to.equal('POST');
          expect(requests.url.trim()).to.equal(spec.ENDPOINT + '?pid=' + videoBidRequest.params.publisherId);
        });

        it('should attach request data', function () {
          const requests = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
          const data = requests.data;
          const [width, height] = videoBidRequest.sizes;
          const VERSION = '1.0.0';

          expect(data.imp[1].video.w).to.equal(width);
          expect(data.imp[1].video.h).to.equal(height);
          expect(data.imp[1].bidfloor).to.equal(videoBidRequest.params.bidfloor);
          expect(data.imp[1]['video']['placement']).to.equal(videoBidRequest.params.video['placement']);
          expect(data.imp[1]['video']['plcmt']).to.equal(videoBidRequest.params.video['plcmt']);
          expect(data.ext.prebidver).to.equal('$prebid.version$');
          expect(data.ext.adapterver).to.equal(spec.VERSION);
        });

        it('should set pubId to e2etest when bid.params.e2etest = true', function () {
          bidRequestsWithMediaTypes[0].params.e2etest = true;
          const requests = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
          expect(requests.method).to.equal('POST');
          expect(requests.url).to.equal(spec.ENDPOINT + '?pid=e2etest');
        });

        it('should attach End 2 End test data', function () {
          bidRequestsWithMediaTypes[1].params.e2etest = true;
          const requests = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
          const data = requests.data;
          expect(data.imp[1].bidfloor).to.equal(0);
          expect(data.imp[1].video.w).to.equal(640);
          expect(data.imp[1].video.h).to.equal(480);
        });
      });
    }
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

  describe('user sync', function () {
    it('handles no parameters', function () {
      let opts = spec.getUserSyncs({});
      expect(opts).to.be.an('array').that.is.empty;
    });
    it('returns non if sync is not allowed', function () {
      let opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false});

      expect(opts).to.be.an('array').that.is.empty;
    });

    describe('when gdpr applies', function () {
      let gdprConsent;
      let gdprPixelUrl;
      const consentString = 'gdpr-pixel-consent';
      const gdprApplies = '1';
      beforeEach(() => {
        gdprConsent = {
          consentString,
          gdprApplies: true
        };

        gdprPixelUrl = `${SYNC_URL}&gdpr=${gdprApplies}&gdpr_consent=${consentString}`;
      });

      it('when there is a response, it should have the gdpr query params', () => {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [],
          gdprConsent
        );

        expect(url).to.have.string(`gdpr_consent=${consentString}`);
        expect(url).to.have.string(`gdpr=${gdprApplies}`);
      });

      it('should not send signals if no consent object is available', function () {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [],
        );
        expect(url).to.not.have.string('gdpr_consent=');
        expect(url).to.not.have.string('gdpr=');
      });
    });

    describe('when ccpa applies', function () {
      let usPrivacyConsent;
      let uspPixelUrl;
      const privacyString = 'TEST';
      beforeEach(() => {
        usPrivacyConsent = 'TEST';
        uspPixelUrl = `${SYNC_URL}&us_privacy=${privacyString}`
      });
      it('should send the us privacy string, ', () => {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [],
          undefined,
          usPrivacyConsent
        );
        expect(url).to.have.string(`us_privacy=${privacyString}`);
      });

      it('should not send signals if no consent string is available', function () {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [],
        );
        expect(url).to.not.have.string('us_privacy=');
      });
    });
  });
});
