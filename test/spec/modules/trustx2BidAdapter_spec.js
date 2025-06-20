import {expect} from 'chai';
import {spec} from 'modules/trustx2BidAdapter.js';
import {BANNER, VIDEO} from 'src/mediaTypes.js';
import sinon from 'sinon';
import {config} from 'src/config.js';

const getBannerRequest = () => {
  return {
    bidderCode: 'trustx2',
    auctionId: 'ca09c8cd-3824-4322-9dfe-d5b62b51c81c',
    bidderRequestId: 'trustx-request-1',
    bids: [
      {
        bidder: 'trustx2',
        params: {
          placement_id: '987654',
          publisher_id: 'trustx-pub-1',
          bidfloor: 5.25,
        },
        auctionId: 'auction-id-45fe-9823-123456789abc',
        placementCode: 'div-gpt-ad-trustx-test',
        mediaTypes: {
          banner: {
            sizes: [
              [ 300, 250 ],
            ]
          }
        },
        bidId: 'trustx-bid-12345',
        bidderRequestId: 'trustx-request-1',
      }
    ],
    start: 1615982436070,
    auctionStart: 1615982436069,
    timeout: 2000
  }
};

const getVideoRequest = () => {
  return {
    bidderCode: 'trustx2',
    auctionId: 'd2b62784-f134-4896-a87e-a233c3371413',
    bidderRequestId: 'trustx-video-request-1',
    bids: [{
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
        }
      },
      bidder: 'trustx2',
      sizes: [640, 480],
      bidId: 'trustx-video-bid-1',
      adUnitCode: 'video-placement-1',
      params: {
        video: {
          playerWidth: 640,
          playerHeight: 480,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          sid: 789,
          rewarded: 0,
          placement: 1,
          plcmt: 1,
          hp: 1,
          inventoryid: 456
        },
        site: {
          id: 1234,
          page: 'https://trustx-test.com',
          referrer: 'http://trustx-referrer.com'
        },
        publisher_id: 'trustx-publisher-id',
        bidfloor: 7.25,
      }
    }, {
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
        }
      },
      bidder: 'trustx2',
      sizes: [640, 480],
      bidId: 'trustx-video-bid-2',
      adUnitCode: 'video-placement-2',
      params: {
        video: {
          playerWidth: 640,
          playerHeight: 480,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          sid: 790,
          rewarded: 0,
          placement: 1,
          plcmt: 1,
          hp: 1,
          inventoryid: 457
        },
        site: {
          id: 1235,
          page: 'https://trustx-test2.com',
          referrer: 'http://trustx-referrer2.com'
        },
        publisher_id: 'trustx-publisher-id',
        bidfloor: 8.50,
      }
    }],
    auctionStart: 1615982456880,
    timeout: 3500,
    start: 1615982456884,
    doneCbCallCount: 0,
    refererInfo: {
      numIframes: 1,
      reachedTop: true,
      referer: 'trustx-test.com'
    }
  };
};

const getBidderResponse = () => {
  return {
    headers: null,
    body: {
      id: 'trustx-response-id-1',
      seatbid: [
        {
          bid: [
            {
              id: 'trustx-bid-12345',
              impid: 'trustx-bid-12345',
              price: 3.22,
              adm: '<script>trustx-creative-content</script>',
              adid: '987654321',
              adomain: [
                'https://trustx-advertiser.com'
              ],
              iurl: 'https://trustx-campaign.com/creative.jpg',
              cid: '12345',
              crid: 'trustx-creative-234',
              cat: [],
              w: 300,
              h: 250,
              ext: {
                prebid: {
                  type: 'banner'
                },
                bidder: {
                  trustx: {
                    brand_id: 123456,
                    auction_id: 987654321098765,
                    bidder_id: 5,
                    bid_ad_type: 0
                  }
                }
              }
            }
          ],
          seat: 'trustx2'
        }
      ],
      ext: {
        usersync: {
          sync1: {
            status: 'none',
            syncs: [
              {
                url: 'https://sync1.trustx.org/sync',
                type: 'iframe'
              }
            ]
          },
          sync2: {
            status: 'none',
            syncs: [
              {
                url: 'https://sync2.trustx.org/sync',
                type: 'pixel'
              }
            ]
          }
        },
        responsetimemillis: {
          trustx: 95
        }
      }
    }
  };
}

describe('trustx2BidAdapter', function() {
  let videoBidRequest;

  const VIDEO_REQUEST = {
    'bidderCode': 'trustx2',
    'auctionId': 'd2b62784-f134-4896-a87e-a233c3371413',
    'bidderRequestId': 'trustx-video-request-1',
    'bids': videoBidRequest,
    'auctionStart': 1615982456880,
    'timeout': 3000,
    'start': 1615982456884,
    'doneCbCallCount': 0,
    'refererInfo': {
      'numIframes': 1,
      'reachedTop': true,
      'referer': 'trustx-test.com'
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
      bidder: 'trustx2',
      sizes: [640, 480],
      bidId: 'trustx-video-bid-1',
      adUnitCode: 'video-placement-1',
      params: {
        video: {
          playerWidth: 640,
          playerHeight: 480,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          sid: 789,
          rewarded: 0,
          placement: 1,
          plcmt: 1,
          hp: 1,
          inventoryid: 456
        },
        site: {
          id: 1234,
          page: 'https://trustx-test.com',
          referrer: 'http://trustx-referrer.com'
        },
        publisher_id: 'trustx-publisher-id',
        bidfloor: 0
      }
    };
  });

  describe('isValidRequest', function() {
    let bidderRequest;

    beforeEach(function() {
      bidderRequest = getBannerRequest();
    });

    it('should accept request if placement_id and publisher_id are passed', function () {
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
      expect(bidRequest.url).equal('https://ads.trustx.org/pbhb?publisher_id=trustx-pub-1&placement_id=987654');
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
        bidder: 'trustx2',
        mediaTypes: {
          banner: {
            sizes: [[250, 300]]
          }
        },
        params: {
          placement_id: 'trustx-placement-1',
          publisher_id: 'trustx-pub-1',
        }
      };

      expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.be.true;
    });

    it('returns false when banner sizes are invalid', function () {
      const invalidSizes = [
        undefined,
        '3:2',
        456,
        'invalid'
      ];

      invalidSizes.forEach((sizes) => {
        const bid = {
          bidder: 'trustx2',
          mediaTypes: {
            banner: {
              sizes
            }
          },
          params: {
            placement_id: 'trustx-placement-1',
            publisher_id: 'trustx-pub-1',
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
        bidder: 'trustx2',
        mediaTypes: {
          video: {
            playerSize: [[300, 250]],
            context: 'instream',
            mimes: ['video/mp4', 'video/webm'],
            protocols: [2, 3]
          }
        },
        params: {
          placement_id: 'trustx-placement-1',
          publisher_id: 'trustx-pub-1',
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
        '1:1',
        456,
        'invalid'
      ];

      invalidSizes.forEach((playerSize) => {
        this.bid.mediaTypes.video.playerSize = playerSize;
        expect(spec.isBidRequestValid(this.bid)).to.be.false;
      });
    });

    it('returns false when video mimes is invalid', function () {
      const invalidMimes = [
        undefined,
        'invalid',
        1,
        []
      ]

      invalidMimes.forEach((mimes) => {
        this.bid.mediaTypes.video.mimes = mimes;
        expect(spec.isBidRequestValid(this.bid)).to.be.false;
      })
    });

    it('returns false when video protocols is invalid', function () {
      const invalidProtocols = [
        undefined,
        'invalid',
        1,
        []
      ]

      invalidProtocols.forEach((protocols) => {
        this.bid.mediaTypes.video.protocols = protocols;
        expect(spec.isBidRequestValid(this.bid)).to.be.false;
      })
    });

    it('should accept outstream context', function () {
      this.bid.mediaTypes.video.context = 'outstream';
      expect(spec.isBidRequestValid(this.bid)).to.be.true;
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
        bidder: 'trustx2',
        params: {
          publisher_id: 'trustx-publisher-id',
        },
        adUnitCode: '/adunit-test/trustx-path',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        bidId: 'trustx-test-bid-1',
        bidderRequestId: 'trustx-test-request-1',
        auctionId: 'trustx-test-auction-1',
        transactionId: 'trustx-test-transaction-1',
        ortb2Imp: {
          ext: {
            ae: 3
          }
        }
      }, {
        bidder: 'trustx2',
        params: {
          publisher_id: 'trustx-publisher-id',
        },
        adUnitCode: 'trustx-adunit',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            placement: 1,
            plcmt: 1,
          }
        },
        bidId: 'trustx-test-bid-2',
        bidderRequestId: 'trustx-test-request-2',
        auctionId: 'trustx-test-auction-2',
        transactionId: 'trustx-test-transaction-2'
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
            consentString: 'TRUSTX_GDPR_CONSENT_STRING',
            gdprApplies: true,
          }
        });
        let request = spec.buildRequests(bidderBannerRequest.bids, req);

        const payload = request.data;
        expect(payload.user.ext).to.have.property('consent', req.gdprConsent.consentString);
        expect(payload.regs.ext).to.have.property('gdpr', 1);
      });

      it('should determine media type from mtype field for banner', function () {
        const customBidderResponse = Object.assign({}, getBidderResponse());
        customBidderResponse.body = Object.assign({}, getBidderResponse().body);
        
        if (customBidderResponse.body.seatbid && 
            customBidderResponse.body.seatbid[0] &&
            customBidderResponse.body.seatbid[0].bid &&
            customBidderResponse.body.seatbid[0].bid[0]) {
          // Add mtype to the bid
          customBidderResponse.body.seatbid[0].bid[0].mtype = 1; // Banner type
        }

        const bidRequest = spec.buildRequests(bidderBannerRequest.bids, bidderBannerRequest);
        const bids = spec.interpretResponse(customBidderResponse, bidRequest);
        expect(bids[0].mediaType).to.equal('banner');
      });
    });

    if (FEATURES.VIDEO) {
      context('video', function () {
        it('should create a POST request for every bid', function () {
          const requests = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
          expect(requests.method).to.equal('POST');
          expect(requests.url.trim()).to.equal(spec.ENDPOINT + '?publisher_id=' + videoBidRequest.params.publisher_id);
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
          expect(requests.url).to.equal(spec.ENDPOINT + '?publisher_id=test');
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

    context('privacy regulations', function() {
      it('should include GDPR consent data in request', function() {
        const gdprConsent = {
          consentString: 'TRUSTX_GDPR_CONSENT_STRING',
          gdprApplies: true
        };
        
        const bidderRequestWithGdpr = Object.assign({}, mockBidderRequest, { gdprConsent });
        const requests = spec.buildRequests(bidRequestsWithMediaTypes, bidderRequestWithGdpr);
        const data = requests.data;
        
        expect(data.user.ext).to.have.property('consent', 'TRUSTX_GDPR_CONSENT_STRING');
        expect(data.regs.ext).to.have.property('gdpr', 1);
      });
      
      it('should handle GDPR applies=false correctly', function() {
        const gdprConsent = {
          consentString: 'TRUSTX_GDPR_CONSENT_STRING',
          gdprApplies: false
        };
        
        const bidderRequestWithGdpr = Object.assign({}, mockBidderRequest, { gdprConsent });
        const requests = spec.buildRequests(bidRequestsWithMediaTypes, bidderRequestWithGdpr);
        const data = requests.data;
        
        expect(data.user.ext).to.have.property('consent', 'TRUSTX_GDPR_CONSENT_STRING');
        expect(data.regs.ext).to.have.property('gdpr', 0);
      });
      
      it('should include USP consent data in request', function() {
        const uspConsent = '1YNN';
        const bidderRequestWithUsp = Object.assign({}, mockBidderRequest, { uspConsent });
        const requests = spec.buildRequests(bidRequestsWithMediaTypes, bidderRequestWithUsp);
        const data = requests.data;
        
        expect(data.regs.ext).to.have.property('us_privacy', '1YNN');
      });
      
      it('should include GPP consent data from gppConsent in request', function() {
        const gppConsent = {
          gppString: 'GPP_CONSENT_STRING',
          applicableSections: [1, 2, 3]
        };
        
        const bidderRequestWithGpp = Object.assign({}, mockBidderRequest, { gppConsent });
        const requests = spec.buildRequests(bidRequestsWithMediaTypes, bidderRequestWithGpp);
        const data = requests.data;
        
        expect(data.regs).to.have.property('gpp', 'GPP_CONSENT_STRING');
        expect(data.regs.gpp_sid).to.deep.equal([1, 2, 3]);
      });
      
      it('should include GPP consent data from ortb2 in request', function() {
        const ortb2 = {
          regs: {
            gpp: 'GPP_STRING_FROM_ORTB2',
            gpp_sid: [1, 2]
          }
        };
        
        const bidderRequestWithOrtb2Gpp = Object.assign({}, mockBidderRequest, { ortb2 });
        const requests = spec.buildRequests(bidRequestsWithMediaTypes, bidderRequestWithOrtb2Gpp);
        const data = requests.data;
        
        expect(data.regs).to.have.property('gpp', 'GPP_STRING_FROM_ORTB2');
        expect(data.regs.gpp_sid).to.deep.equal([1, 2]);
      });
      
      it('should prioritize gppConsent over ortb2 for GPP consent data', function() {
        const gppConsent = {
          gppString: 'GPP_CONSENT_STRING',
          applicableSections: [1, 2, 3]
        };
        
        const ortb2 = {
          regs: {
            gpp: 'GPP_STRING_FROM_ORTB2',
            gpp_sid: [1, 2]
          }
        };
        
        const bidderRequestWithBothGpp = Object.assign({}, mockBidderRequest, { gppConsent, ortb2 });
        const requests = spec.buildRequests(bidRequestsWithMediaTypes, bidderRequestWithBothGpp);
        const data = requests.data;
        
        expect(data.regs).to.have.property('gpp', 'GPP_CONSENT_STRING');
        expect(data.regs.gpp_sid).to.deep.equal([1, 2, 3]);
      });

      it('should include COPPA flag in request when set to true', function() {
        // Mock the config.getConfig function to return true for coppa
        sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
        
        const requests = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        const data = requests.data;
        
        expect(data.regs).to.have.property('coppa', 1);
        
        // Restore the stub
        config.getConfig.restore();
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

      it('should determine media type from mtype field for banner', function () {
        const customBidderResponse = Object.assign({}, getBidderResponse());
        customBidderResponse.body = Object.assign({}, getBidderResponse().body);
        
        if (customBidderResponse.body.seatbid && 
            customBidderResponse.body.seatbid[0] &&
            customBidderResponse.body.seatbid[0].bid &&
            customBidderResponse.body.seatbid[0].bid[0]) {
          // Add mtype to the bid
          customBidderResponse.body.seatbid[0].bid[0].mtype = 1; // Banner type
        }

        const bids = spec.interpretResponse(customBidderResponse, bidRequest);
        expect(bids[0].mediaType).to.equal('banner');
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
              price: 8.01
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

      it('should determine media type from mtype field for video', function () {
        const SERVER_RESP = Object.assign({}, bidderResponse, {
          'body': {
            seatbid: [{
              bid: [{
                id: 'trustx-video-bid-1',
                impid: 'trustx-video-bid-1',
                price: 10.00,
                adm: '<VAST version="4.1"></VAST>',
                adid: '987654321',
                adomain: ['trustx-advertiser.com'],
                iurl: 'https://trustx-campaign.com/creative.jpg',
                cid: '12345',
                crid: 'trustx-creative-234',
                w: 1920,
                h: 1080,
                mtype: 2, // Video type
                ext: {
                  prebid: {
                    type: 'video'
                  }
                }
              }]
            }]
          }
        });
        
        const bids = spec.interpretResponse(SERVER_RESP, bidRequest);
        expect(bids[0].mediaType).to.equal('video');
      });
    });
  });

  describe('getUserSyncs', function () {
    let bidRequest, bidderResponse;
    beforeEach(function() {
      const bidderRequest = getVideoRequest();
      bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      bidderResponse = getBidderResponse();
    });

    it('handles no parameters', function () {
      let opts = spec.getUserSyncs({});
      expect(opts).to.be.an('array').that.is.empty;
    });
    it('returns non if sync is not allowed', function () {
      let opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false});

      expect(opts).to.be.an('array').that.is.empty;
    });

    it('iframe sync enabled should return results', function () {
      let opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: false}, [bidderResponse]);

      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('iframe');
      expect(opts[0].url).to.equal(bidderResponse.body.ext.usersync['sync1'].syncs[0].url);
    });

    it('pixel sync enabled should return results', function () {
      let opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [bidderResponse]);

      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('image');
      expect(opts[0].url).to.equal(bidderResponse.body.ext.usersync['sync2'].syncs[0].url);
    });

    it('all sync enabled should prioritize iframe', function () {
      let opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [bidderResponse]);

      expect(opts.length).to.equal(1);
    });
  });
});
