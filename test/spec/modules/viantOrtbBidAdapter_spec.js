import {spec, converter} from 'modules/viantOrtbBidAdapter.js';
import {assert, expect} from 'chai';
import {deepClone} from '../../../src/utils';
import {buildWindowTree} from '../../helpers/refererDetectionHelper';
import {detectReferer} from '../../../src/refererDetection';

describe('viantOrtbBidAdapter', function () {
  function testBuildRequests(bidRequests, bidderRequestBase) {
    let clonedBidderRequest = deepClone(bidderRequestBase);
    clonedBidderRequest.bids = bidRequests;
    let requests = spec.buildRequests(bidRequests, clonedBidderRequest);
    return requests
  }

  describe('isBidRequestValid', function () {
    function makeBid() {
      return {
        'bidder': 'viant',
        'params': {
          'publisherId': '464',
          'placementId': 'some-PlacementId_1'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [728, 90]
            ]
          }
        },
        'adUnitCode': 'adunit-code',
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
    }

    describe('core', function () {
      it('should return true when required params found', function () {
        expect(spec.isBidRequestValid(makeBid())).to.equal(true);
      });

      it('should return false when publisherId not passed', function () {
        let bid = makeBid();
        delete bid.params.publisherId;
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return true if placementId is not passed ', function () {
        let bid = makeBid();
        delete bid.params.placementId;
        bid.ortb2Imp = {}
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return false if mediaTypes.banner is Not passed', function () {
        let bid = makeBid();
        delete bid.mediaTypes
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });

    describe('banner', function () {
      it('should return true if banner.pos is passed correctly', function () {
        let bid = makeBid();
        bid.mediaTypes.banner.pos = 1;
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });

    describe('video', function () {
      describe('and request config uses mediaTypes', () => {
        function makeBid() {
          return {
            'bidder': 'viant',
            'params': {
              'unit': '12345678',
              'delDomain': 'test-del-domain',
              'publisherId': '464',
              'placementId': 'some-PlacementId_2'
            },
            'mediaTypes': {
              'video': {
                'context': 'instream',
                'playerSize': [[640, 480]],
                'mimes': ['video/mp4'],
                'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
                'api': [1, 3],
                'skip': 1,
                'skipafter': 5,
                'minduration': 10,
                'maxduration': 30
              }
            },
            'adUnitCode': 'adunit-code',
            'bidId': '30b31c1838de1e',
            'bidderRequestId': '22edbae2733bf6',
            'auctionId': '1d1a030790a475',
            'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
          }
        }

        it('should return true when required params found', function () {
          expect(spec.isBidRequestValid(makeBid())).to.equal(true);
        });

        it('should return false when required params are not passed', function () {
          let videoBidWithMediaTypes = Object.assign({}, makeBid());
          videoBidWithMediaTypes.params = {};
          expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(false);
        });
      });
    });

    describe('native', function () {
      describe('and request config uses mediaTypes', () => {
        function makeBid() {
          return {
            'bidder': 'viant',
            'params': {
              'unit': '12345678',
              'delDomain': 'test-del-domain',
              'publisherId': '464',
              'placementId': 'some-PlacementId_2'
            },
            'mediaTypes': {
              'video': {
                'context': 'instream',
                'playerSize': [[640, 480]],
                'mimes': ['video/mp4'],
                'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
                'api': [1, 3],
                'skip': 1,
                'skipafter': 5,
                'minduration': 10,
                'maxduration': 30
              }
            },
            'adUnitCode': 'adunit-code',
            'bidId': '30b31c1838de1e',
            'bidderRequestId': '22edbae2733bf6',
            'auctionId': '1d1a030790a475',
            'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
          }
        }

        it('should return true when required params found', function () {
          expect(spec.isBidRequestValid(makeBid())).to.equal(true);
        });

        it('should return false when required params are not passed', function () {
          let nativeBidWithMediaTypes = Object.assign({}, makeBid());
          nativeBidWithMediaTypes.params = {};
          expect(spec.isBidRequestValid(nativeBidWithMediaTypes)).to.equal(false);
        });
      });
    });
  });

  describe('buildRequests-banner', function () {
    const baseBannerBidRequests = [{
      'bidder': 'viant',
      'params': {
        'publisherId': '464',
        'placementId': '1'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[728, 90]]
        }
      },
      'gdprConsent': {
        'consentString': 'consentString',
        'gdprApplies': true,
      },
      'uspConsent': '1YYY',
      'sizes': [[728, 90]],
      'transactionId': '1111474f-58b1-4368-b812-84f8c937a099',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'bidId': '243310435309b5',
      'bidderRequestId': '18084284054531',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'src': 'client',
      'bidRequestsCount': 1
    }];
    const basePMPDealsBidRequests = [{
      'bidder': 'viant',
      'params': {
        'publisherId': '464',
        'placementId': '1'
      },
      'ortb2Imp': {
        'pmp': {
          'private_auction': 0,
          'deals': [
            {
              'id': '1234567',
              'at': 3,
              'bidfloor': 25,
              'bidfloorcur': 'USD',
              'ext': {
                'must_bid': 1,
                'private_auction': 1
              }
            },
            {
              'id': '1234568',
              'at': 3,
              'bidfloor': 25,
              'bidfloorcur': 'USD',
              'ext': {
                'must_bid': 0
              }
            }
          ]
        },
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[728, 90]]
        }
      },
      'gdprConsent': {
        'consentString': 'consentString',
        'gdprApplies': true,
      },
      'uspConsent': '1YYY',
      'sizes': [[728, 90]],
      'transactionId': '1111474f-58b1-4368-b812-84f8c937a099',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'bidId': '243310435309b5',
      'bidderRequestId': '18084284054531',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'src': 'client',
      'bidRequestsCount': 1
    }];

    const testWindow = buildWindowTree(['https://www.example.com/test', 'https://www.example.com/other/page', 'https://www.example.com/third/page'], 'https://othersite.com/', 'https://example.com/canonical/page');
    const baseBidderRequestReferer = detectReferer(testWindow)();
    const baseBidderRequest = {
      'bidderCode': 'viant',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'bidderRequestId': '18084284054531',
      'auctionStart': 1540945362095,
      'timeout': 3000,
      'refererInfo': baseBidderRequestReferer,
      'start': 1540945362099,
      'doneCbCallCount': 0
    };

    it('test regs', function () {
      const gdprBaseBidderRequest = Object.assign({}, baseBidderRequest, {
        gdprConsent: {
          consentString: 'consentString',
          gdprApplies: true,
        },
        uspConsent: '1YYN'
      });
      const request = testBuildRequests(baseBannerBidRequests, gdprBaseBidderRequest)[0];
      expect(request.data.regs.ext).to.have.property('gdpr', 1);
      expect(request.data.regs.ext).to.have.property('us_privacy', '1YYN');
    });

    it('sends bid request to our endpoint that makes sense', function () {
      const request = testBuildRequests(baseBannerBidRequests, baseBidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.be.not.empty;
      expect(request.data).to.be.not.null;
    });
    it('sends bid requests to the correct endpoint', function () {
      const url = testBuildRequests(baseBannerBidRequests, baseBidderRequest)[0].url;
      expect(url).to.equal('https://bidders-us.adelphic.net/d/rtb/v25/prebid/bidder');
    });

    it('sends site', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest)[0].data;
      expect(requestBody.site).to.be.not.null;
    });

    it('includes the ad size in the bid request', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest)[0].data;
      expect(requestBody.imp[0].banner.format[0].w).to.equal(728);
      expect(requestBody.imp[0].banner.format[0].h).to.equal(90);
    });

    it('sets the banner pos correctly if sent', function () {
      let clonedBannerRequests = deepClone(baseBannerBidRequests);
      clonedBannerRequests[0].mediaTypes.banner.pos = 1;

      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest)[0].data;
      expect(requestBody.imp[0].banner.pos).to.equal(1);
    });
    it('includes the deals in the bid request', function () {
      const requestBody = testBuildRequests(basePMPDealsBidRequests, baseBidderRequest)[0].data;
      expect(requestBody.imp[0].pmp).to.be.not.null;
      expect(requestBody.imp[0].pmp).to.deep.equal({
        'private_auction': 0,
        'deals': [
          {
            'id': '1234567',
            'at': 3,
            'bidfloor': 25,
            'bidfloorcur': 'USD',
            'ext': {
              'must_bid': 1,
              'private_auction': 1
            }
          },
          {
            'id': '1234568',
            'at': 3,
            'bidfloor': 25,
            'bidfloorcur': 'USD',
            'ext': {
              'must_bid': 0
            }
          }
        ]
      });
    });
  });

  if (FEATURES.VIDEO) {
    describe('buildRequests-video', function () {
      function makeBid() {
        return {
          'bidder': 'viant',
          'params': {
            'unit': '12345678',
            'delDomain': 'test-del-domain',
            'publisherId': '464',
            'placementId': 'some-PlacementId_2'
          },
          'mediaTypes': {
            'video': {
              'context': 'instream',
              'playerSize': [[640, 480]],
              'mimes': ['video/mp4'],
              'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
              'api': [1, 3],
              'skip': 1,
              'skipafter': 5,
              'minduration': 10,
              'placement': 1,
              'maxduration': 31
            }
          },
          'adUnitCode': 'adunit-code',
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
          'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
        }
      }

      it('assert video and its fields is present in imp ', function () {
        let requests = spec.buildRequests([makeBid()], {referrerInfo: {}});
        let clonedRequests = deepClone(requests)
        assert.equal(clonedRequests[0].data.imp[0].video.mimes[0], 'video/mp4')
        assert.equal(clonedRequests[0].data.imp[0].video.maxduration, 31)
        assert.equal(clonedRequests[0].data.imp[0].video.placement, 1)
        assert.equal(clonedRequests[0].method, 'POST')
      });
    });
  }

  describe('interpretResponse', function () {
    const baseBannerBidRequests = [{
      'bidder': 'viant',
      'params': {
        'publisherId': '464',
        'placementId': '1'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[728, 90]]
        }
      },
      'sizes': [[728, 90]],
      'transactionId': '1111474f-58b1-4368-b812-84f8c937a099',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'bidId': '243310435309b5',
      'bidderRequestId': '18084284054531',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'src': 'client',
      'bidRequestsCount': 1
    }];

    const testWindow = buildWindowTree(['https://www.example.com/test', 'https://www.example.com/other/page', 'https://www.example.com/third/page'], 'https://othersite.com/', 'https://example.com/canonical/page');
    const baseBidderRequestReferer = detectReferer(testWindow)();
    const baseBidderRequest = {
      'bidderCode': 'viant',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'bidderRequestId': '18084284054531',
      'auctionStart': 1540945362095,
      'timeout': 3000,
      'refererInfo': baseBidderRequestReferer,
      'start': 1540945362099,
      'doneCbCallCount': 0
    };

    it('empty bid response test', function () {
      const request = testBuildRequests(baseBannerBidRequests, baseBidderRequest)[0];
      let bidResponse = {nbr: 0}; // Unknown error
      let bids = spec.interpretResponse({body: bidResponse}, request);
      expect(bids.length).to.equal(0);
    });

    it('bid response is a banner', function () {
      const request = testBuildRequests(baseBannerBidRequests, baseBidderRequest)[0];
      let bidResponse = {
        seatbid: [{
          bid: [{
            impid: '243310435309b5',
            price: 2,
            w: 728,
            h: 90,
            crid: 'test-creative-id',
            dealid: 'test-deal-id',
            adm: 'test-ad-markup',
          }]
        }],
        cur: 'USD'
      };
      let bids = spec.interpretResponse({body: bidResponse}, request);
      expect(bids.length).to.equal(1);
      let bid = bids[0];
      it('should return the proper mediaType', function () {
        it('should return a creativeId', function () {
          expect(bid.mediaType).to.equal('banner');
        });
      });
      it('should return a price', function () {
        expect(bid.cpm).to.equal(bidResponse.seatbid[0].bid[0].price);
      });

      it('should return a request id', function () {
        expect(bid.requestId).to.equal(bidResponse.seatbid[0].bid[0].impid);
      });

      it('should return width and height for the creative', function () {
        expect(bid.width).to.equal(bidResponse.seatbid[0].bid[0].w);
        expect(bid.height).to.equal(bidResponse.seatbid[0].bid[0].h);
      });
      it('should return a creativeId', function () {
        expect(bid.creativeId).to.equal(bidResponse.seatbid[0].bid[0].crid);
      });
      it('should return an ad', function () {
        expect(bid.ad).to.equal(bidResponse.seatbid[0].bid[0].adm);
      });

      it('should return a deal id if it exists', function () {
        expect(bid.dealId).to.equal(bidResponse.seatbid[0].bid[0].dealid);
      });

      it('should have a time-to-live of 5 minutes', function () {
        expect(bid.ttl).to.equal(300);
      });

      it('should always return net revenue', function () {
        expect(bid.netRevenue).to.equal(true);
      });
      it('should return a currency', function () {
        expect(bid.currency).to.equal(bidResponse.cur);
      });
    });
  });
  describe('interpretResponse-Video', function () {
    const baseVideoBidRequests = [{
      'bidder': 'viant',
      'params': {
        'publisherId': '464',
        'placementId': '1'
      },
      'mediaTypes': {
        'video': {
          'context': 'instream',
          'playerSize': [[640, 480]],
          'mimes': ['video/mp4'],
          'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
          'api': [1, 3],
          'skip': 1,
          'skipafter': 5,
          'minduration': 10,
          'maxduration': 31
        }
      },
      'sizes': [[640, 480]],
      'transactionId': '1111474f-58b1-4368-b812-84f8c937a099',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'bidId': '243310435309b5',
      'bidderRequestId': '18084284054531',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'src': 'client',
      'bidRequestsCount': 1
    }];

    const testWindow = buildWindowTree(['https://www.example.com/test', 'https://www.example.com/other/page', 'https://www.example.com/third/page'], 'https://othersite.com/', 'https://example.com/canonical/page');
    const baseBidderRequestReferer = detectReferer(testWindow)();
    const baseBidderRequest = {
      'bidderCode': 'viant',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'bidderRequestId': '18084284054531',
      'auctionStart': 1540945362095,
      'timeout': 3000,
      'refererInfo': baseBidderRequestReferer,
      'start': 1540945362099,
      'doneCbCallCount': 0
    };

    it('bid response is a video', function () {
      const request = testBuildRequests(baseVideoBidRequests, baseBidderRequest)[0];
      const VIDEO_BID_RESPONSE = {
        'id': 'bidderRequestId',
        'bidid': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
        'seatbid': [
          {
            'bid': [
              {
                'id': '1',
                'impid': '243310435309b5',
                'price': 1.09,
                'adid': '144762342',
                'nurl': 'http://0.0.0.0:8181/nurl',
                'adm': '<VAST version="4.2"></VAST>',
                'adomain': [
                  'https://dummydomain.com'
                ],
                'cid': 'cid',
                'crid': 'crid',
                'iurl': 'iurl',
                'cat': [],
                'h': 480,
                'w': 640
              }
            ]
          }
        ],
        'cur': 'USD'
      };
      let bids = spec.interpretResponse({body: VIDEO_BID_RESPONSE}, request);
      expect(bids.length).to.equal(1);
      let bid = bids[0];
      it('should return the proper mediaType', function () {
        expect(bid.mediaType).to.equal('video');
      });
      it('should return correct Ad Markup', function () {
        expect(bid.vastXml).to.equal('<VAST version="4.2"></VAST>');
      });
      it('should return correct Notification', function () {
        expect(bid.vastUrl).to.equal('http://0.0.0.0:8181/nurl');
      });
      it('should return correct Cpm', function () {
        expect(bid.cpm).to.equal(1.09);
      });
    });
  });
});
