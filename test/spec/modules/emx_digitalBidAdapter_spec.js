import { expect } from 'chai';
import { spec } from 'modules/emx_digitalBidAdapter';
import * as utils from 'src/utils';
import { newBidder } from 'src/adapters/bidderFactory';

describe('emx_digital Adapter', function () {
  describe('callBids', function () {
    const adapter = newBidder(spec);
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    describe('banner request validity', function () {
      let bid = {
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };
      let badBid = {
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251'
        },
        'mediaTypes': {
          'banner': {
          }
        },
        'adUnitCode': 'adunit-code',
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };
      let noBid = {};
      let otherBid = {
        'bidder': 'emxdigital',
        'params': {
          'tagid': '25251'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };
      let noMediaSizeBid = {
        'bidder': 'emxdigital',
        'params': {
          'tagid': '25251'
        },
        'mediaTypes': {
          'banner': {}
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };

      it('should return true when required params found', function () {
        expect(spec.isBidRequestValid(bid)).to.equal(true);
        expect(spec.isBidRequestValid(badBid)).to.equal(false);
        expect(spec.isBidRequestValid(noBid)).to.equal(false);
        expect(spec.isBidRequestValid(otherBid)).to.equal(false);
        expect(spec.isBidRequestValid(noMediaSizeBid)).to.equal(false);
      });
    });

    describe('video request validity', function () {
      let bid = {
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251',
          'video': {}
        },
        'mediaTypes': {
          'video': {
            'context': 'instream',
            'playerSize': [640, 480]
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };
      let noInstreamBid = {
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251',
          'video': {
            'protocols': [1, 7]
          }
        },
        'mediaTypes': {
          'video': {
            'context': 'something_random'
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };

      let outstreamBid = {
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251',
          'video': {}
        },
        'mediaTypes': {
          'video': {
            'context': 'outstream',
            'playerSize': [640, 480]
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };

      it('should return true when required params found', function () {
        expect(spec.isBidRequestValid(bid)).to.equal(true);
        expect(spec.isBidRequestValid(noInstreamBid)).to.equal(false);
        expect(spec.isBidRequestValid(outstreamBid)).to.equal(true);
      });

      it('should contain tagid param', function () {
        expect(spec.isBidRequestValid({
          bidder: 'emx_digital',
          params: {},
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        })).to.equal(false);
        expect(spec.isBidRequestValid({
          bidder: 'emx_digital',
          params: {
            tagid: ''
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        })).to.equal(false);
        expect(spec.isBidRequestValid({
          bidder: 'emx_digital',
          params: {
            tagid: '123'
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        })).to.equal(true);
      });
    });
  });

  describe('buildRequests', function () {
    let bidderRequest = {
      'bidderCode': 'emx_digital',
      'auctionId': 'e19f1eff-8b27-42a6-888d-9674e5a6130c',
      'bidderRequestId': '22edbae3120bf6',
      'timeout': 1500,
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'referer': 'https://example.com/index.html?pbjs_debug=true'
      },
      'bids': [{
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250],
              [300, 600]
            ]
          }
        },
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'auctionId': 'e19f1eff-8b27-42a6-888d-9674e5a6130c',
        'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      }]
    };
    let request = spec.buildRequests(bidderRequest.bids, bidderRequest);

    it('sends bid request to ENDPOINT via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('contains the correct options', function () {
      expect(request.options.withCredentials).to.equal(true);
    });

    it('contains a properly formatted endpoint url', function () {
      const url = request.url.split('?');
      const queryParams = url[1].split('&');
      expect(queryParams[0]).to.match(new RegExp('^t=\d*', 'g'));
      expect(queryParams[1]).to.match(new RegExp('^ts=\d*', 'g'));
    });

    it('builds with bid floor', function () {
      const bidRequestWithBidFloor = utils.deepClone(bidderRequest.bids);
      bidRequestWithBidFloor[0].params.bidfloor = 1;
      const requestWithFloor = spec.buildRequests(bidRequestWithBidFloor, bidderRequest);
      const data = JSON.parse(requestWithFloor.data);
      expect(data.imp[0].bidfloor).to.equal(bidRequestWithBidFloor[0].params.bidfloor);
    });

    it('builds request properly', function () {
      const data = JSON.parse(request.data);
      expect(Array.isArray(data.imp)).to.equal(true);
      expect(data.id).to.equal(bidderRequest.auctionId);
      expect(data.imp.length).to.equal(1);
      expect(data.imp[0].id).to.equal('30b31c2501de1e');
      expect(data.imp[0].tid).to.equal('d7b773de-ceaa-484d-89ca-d9f51b8d61ec');
      expect(data.imp[0].tagid).to.equal('25251');
      expect(data.imp[0].secure).to.equal(0);
      expect(data.imp[0].vastXml).to.equal(undefined);
    });

    it('properly sends site information and protocol', function () {
      request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      request = JSON.parse(request.data);
      expect(request.site.domain).to.equal(utils.getTopWindowLocation().hostname);
      expect(decodeURIComponent(request.site.page)).to.equal(bidderRequest.refererInfo.referer);
      expect(request.site.ref).to.equal(window.top.document.referrer);
    });

    it('builds correctly formatted request banner object', function () {
      let bidRequestWithBanner = utils.deepClone(bidderRequest.bids);
      let request = spec.buildRequests(bidRequestWithBanner, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].video).to.equal(undefined);
      expect(data.imp[0].banner).to.exist.and.to.be.a('object');
      expect(data.imp[0].banner.w).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][0]);
      expect(data.imp[0].banner.h).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][1]);
      expect(data.imp[0].banner.format[0].w).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][0]);
      expect(data.imp[0].banner.format[0].h).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][1]);
      expect(data.imp[0].banner.format[1].w).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[1][0]);
      expect(data.imp[0].banner.format[1].h).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[1][1]);
    });

    it('builds correctly formatted request video object for instream', function () {
      let bidRequestWithVideo = utils.deepClone(bidderRequest.bids);
      bidRequestWithVideo[0].mediaTypes = {
        video: {
          context: 'instream',
          playerSize: [[640, 480]]
        },
      };
      bidRequestWithVideo[0].params.video = {};
      let request = spec.buildRequests(bidRequestWithVideo, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].video).to.exist.and.to.be.a('object');
      expect(data.imp[0].video.w).to.equal(bidRequestWithVideo[0].mediaTypes.video.playerSize[0][0]);
      expect(data.imp[0].video.h).to.equal(bidRequestWithVideo[0].mediaTypes.video.playerSize[0][1]);
    });

    it('builds correctly formatted request video object for outstream', function () {
      let bidRequestWithOutstreamVideo = utils.deepClone(bidderRequest.bids);
      bidRequestWithOutstreamVideo[0].mediaTypes = {
        video: {
          context: 'outstream',
          playerSize: [[640, 480]]
        },
      };
      bidRequestWithOutstreamVideo[0].params.video = {};
      let request = spec.buildRequests(bidRequestWithOutstreamVideo, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].video).to.exist.and.to.be.a('object');
      expect(data.imp[0].video.w).to.equal(bidRequestWithOutstreamVideo[0].mediaTypes.video.playerSize[0][0]);
      expect(data.imp[0].video.h).to.equal(bidRequestWithOutstreamVideo[0].mediaTypes.video.playerSize[0][1]);
    });

    it('shouldn\'t contain a user obj without GDPR information', function () {
      let request = spec.buildRequests(bidderRequest.bids, bidderRequest)
      request = JSON.parse(request.data)
      expect(request).to.not.have.property('user');
    });

    it('should have the right gdpr info when enabled', function () {
      let consentString = 'OIJSZsOAFsABAB8EMXZZZZZ+A==';
      bidderRequest.gdprConsent = {
        'consentString': consentString,
        'gdprApplies': true
      };
      let request = spec.buildRequests(bidderRequest.bids, bidderRequest);

      request = JSON.parse(request.data)
      expect(request.regs.ext).to.have.property('gdpr', 1);
      expect(request.user.ext).to.have.property('consent', consentString);
    });

    it('should\'t contain consent string if gdpr isn\'t applied', function () {
      bidderRequest.gdprConsent = {
        'gdprApplies': false
      };
      let request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      request = JSON.parse(request.data)
      expect(request.regs.ext).to.have.property('gdpr', 0);
      expect(request).to.not.have.property('user');
    });
  });

  describe('interpretResponse', function () {
    let bid = {
      'bidder': 'emx_digital',
      'params': {
        'tagid': '25251',
        'video': {}
      },
      'mediaTypes': {
        'video': {
          'context': 'instream',
          'playerSize': [640, 480]
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250],
        [300, 600]
      ],
      'bidId': '30b31c2501de1e',
      'bidderRequestId': '22edbae3120bf6',
      'auctionId': '1d1a01234a475'
    };

    const serverResponse = {
      'id': '12819a18-56e1-4256-b836-b69a10202668',
      'seatbid': [{
        'bid': [{
          'adid': '123456abcde',
          'adm': '<!-- Creative -->',
          'crid': '3434abab34',
          'h': 250,
          'id': '987654321cba',
          'price': 0.5,
          'ttl': 300,
          'w': 300
        }],
        'seat': '1356'
      }, {
        'bid': [{
          'adid': '123456abcdf',
          'adm': '<!-- Creative -->',
          'crid': '3434abab35',
          'h': 600,
          'id': '987654321cba',
          'price': 0.5,
          'ttl': 300,
          'w': 300
        }]
      }]
    };

    const expectedResponse = [{
      'requestId': '12819a18-56e1-4256-b836-b69a10202668',
      'cpm': 0.5,
      'width': 300,
      'height': 250,
      'creativeId': '3434abab34',
      'dealId': null,
      'currency': 'USD',
      'netRevneue': true,
      'mediaType': 'banner',
      'ad': '<!-- Creative -->',
      'ttl': 300
    }, {
      'requestId': '12819a18-56e1-4256-b836-b69a10202668',
      'cpm': 0.7,
      'width': 300,
      'height': 600,
      'creativeId': '3434abab35',
      'dealId': null,
      'currency': 'USD',
      'netRevneue': true,
      'mediaType': 'banner',
      'ad': '<!-- Creative -->',
      'ttl': 300
    }];

    it('should properly format bid response', function () {
      let result = spec.interpretResponse({
        body: serverResponse
      });
      expect(Object.keys(result[0]).length).to.equal(Object.keys(expectedResponse[0]).length);
      expect(Object.keys(result[0]).requestId).to.equal(Object.keys(expectedResponse[0]).requestId);
      expect(Object.keys(result[0]).bidderCode).to.equal(Object.keys(expectedResponse[0]).bidderCode);
      expect(Object.keys(result[0]).cpm).to.equal(Object.keys(expectedResponse[0]).cpm);
      expect(Object.keys(result[0]).creativeId).to.equal(Object.keys(expectedResponse[0]).creativeId);
      expect(Object.keys(result[0]).width).to.equal(Object.keys(expectedResponse[0]).width);
      expect(Object.keys(result[0]).height).to.equal(Object.keys(expectedResponse[0]).height);
      expect(Object.keys(result[0]).ttl).to.equal(Object.keys(expectedResponse[0]).ttl);
      expect(Object.keys(result[0]).adId).to.equal(Object.keys(expectedResponse[0]).adId);
      expect(Object.keys(result[0]).currency).to.equal(Object.keys(expectedResponse[0]).currency);
      expect(Object.keys(result[0]).netRevenue).to.equal(Object.keys(expectedResponse[0]).netRevenue);
      expect(Object.keys(result[0]).ad).to.equal(Object.keys(expectedResponse[0]).ad);
    });

    it('should return multiple bids', function () {
      let result = spec.interpretResponse({
        body: serverResponse
      });
      expect(Array.isArray(result.seatbid))

      const ad0 = result[0];
      const ad1 = result[1];
      expect(ad0.ad).to.equal(serverResponse.seatbid[0].bid[0].adm);
      expect(ad0.cpm).to.equal(serverResponse.seatbid[0].bid[0].price);
      expect(ad0.creativeId).to.equal(serverResponse.seatbid[0].bid[0].crid);
      expect(ad0.currency).to.equal('USD');
      expect(ad0.netRevenue).to.equal(true);
      expect(ad0.requestId).to.equal(serverResponse.seatbid[0].bid[0].id);
      expect(ad0.ttl).to.equal(300);

      expect(ad1.ad).to.equal(serverResponse.seatbid[1].bid[0].adm);
      expect(ad1.cpm).to.equal(serverResponse.seatbid[1].bid[0].price);
      expect(ad1.creativeId).to.equal(serverResponse.seatbid[1].bid[0].crid);
      expect(ad1.currency).to.equal('USD');
      expect(ad1.netRevenue).to.equal(true);
      expect(ad1.requestId).to.equal(serverResponse.seatbid[1].bid[0].id);
      expect(ad1.ttl).to.equal(300);
    });

    it('returns a banner bid for non-xml creatives', function () {
      let result = spec.interpretResponse({
        body: serverResponse
      }, { bidRequest: bid }
      );
      const ad0 = result[0];
      const ad1 = result[1];
      expect(ad0.mediaType).to.equal('banner');
      expect(ad0.ad.indexOf('<?xml version') === -1).to.equal(true);
      expect(ad0.vastXml).to.equal(undefined);
      expect(ad0.height).to.equal(serverResponse.seatbid[0].bid[0].h);
      expect(ad0.width).to.equal(serverResponse.seatbid[0].bid[0].w);

      expect(ad1.mediaType).to.equal('banner');
      expect(ad1.ad.indexOf('<?xml version') === -1).to.equal(true);
      expect(ad1.vastXml).to.equal(undefined);
      expect(ad1.width).to.equal(serverResponse.seatbid[1].bid[0].w);
      expect(ad1.height).to.equal(serverResponse.seatbid[1].bid[0].h);
    });

    it('returns a vastXml kvp for video creatives', function () {
      serverResponse.seatbid[0].bid[0].adm = '<?xml version=><VAST></VAST></xml>';
      serverResponse.seatbid[1].bid[0].adm = '<?xml version=><VAST></VAST></xml>';

      let result = spec.interpretResponse({
        body: serverResponse
      }, { bidRequest: bid }
      );
      const ad0 = result[0];
      const ad1 = result[1];
      expect(ad0.mediaType).to.equal('video');
      expect(ad0.ad.indexOf('<?xml version') > -1).to.equal(true);
      expect(ad0.vastXml).to.equal(serverResponse.seatbid[0].bid[0].adm);
      expect(ad0.ad).to.exist.and.to.be.a('string');
      expect(ad1.mediaType).to.equal('video');
      expect(ad1.ad.indexOf('<?xml version') > -1).to.equal(true);
      expect(ad1.vastXml).to.equal(serverResponse.seatbid[1].bid[0].adm);
      expect(ad1.ad).to.exist.and.to.be.a('string');
    });

    it('handles nobid responses', function () {
      let serverResponse = {
        'bids': []
      };

      let result = spec.interpretResponse({
        body: serverResponse
      });
      expect(result.length).to.equal(0);
    });

    it('should not throw an error when decoding an improperly encoded adm', function () {
      serverResponse.seatbid[0].bid[0].adm = '<script\\ src\\=\\\"https\\:\\/\\/nym1\\-ib\\.adnxs\\.com\\/ab\\?an_audit\\=0\\&referrer=https%3A%2F%2Fwww.emxdigital.com%3Ftest%3DhAiE3%VVl%26prebid%3D%25123%25\\&e\\=wqT_3QLPCfBDzwQAAAMA1gAFAQj2iaPtBRCdw\\-qeto72gkEYlNWN2smGoJhTKjYJzGJi83G9KkARzGJi83G9KkAZAAAAgD0KEkAhzGIJGwApESTIMQAAAGBmZu4_MMvWgAc4zApAzApIAlDo\\-YEUWNbsR2AAaIrFCnjOpQWAAQGKAQNVU0SSBQbwQJgB2AWgAVqoAQGwAQC4AQLAAQTIAQLQAQnYAQDgAQDwAQCKAjp1ZignYScsIDI4OTEwMSwgMTU3MTM0MTU1OCk7ARwscicsIDQxOTc1MDE2Nh4A9DQBkgLhAiE3VVlCWndpQmpwOEpFT2o1Z1JRWUFDRFc3RWN3QURnQVFBUkl6QXBReTlhQUIxZ0FZTHdFYUFCd0NuZ0FnQUZFaUFFQWtBRUFtQUVBb0FFQnFBRURzQUVBdVFGS1I2cF9jYjBxUU1FQlNrZXFmM0c5S2tESkFaR1JfRy1UVnRNXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFJQUNBSWdDcVlMWEJaQUNBWmdDQUtBQ0FLZ0NBTFVDQUFBQUFMMENBQUFBQU9BQ0FPZ0NBUGdDQUlBREFaZ0RBYWdEZ1k2ZkNib0RDVTVaVFRJNk5ESTRNdUFEOHhQNEE0NnV2Z3lJQkFDUUJBQ1lCQUd5QkFvSXFZTFhCUkNPcnI0TXdRUUFBQUFBQUFBQUFNa0VBQUFBBXgMQURSQgkJLEF3Q0ZBMkFRQThRUQ0SYEFBQVBnRUFJZ0Z1aUUumgKJASE2eElrelE2ZQGgMXV4SElBUW9BREU5Q3RlamNMMHFRRG9KVGxsTk1qbzBNamd5UVBNVFMRWAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYw0MAaXwi2VBQS7YAqwD4AK30UbqAlxodHRwczovL3d3dy5jZWxlYnV6ei5jb20vZy90YXlsb3Itc3dpZnQtZGVidXRzLXJlZC1oYWlyLWluLXN1Z2FybGFuZC12aWRlby8_YmlkZHJfZGVidWc9dHJ1ZfICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFkNVU1RPERY8TEVBRl9OQU1FEgDyAh4KGjYdAPQqAUFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMUoAMBqgMAwAOsAsgDANgDlCHgAwDoAwD4AwOABACSBAkvb3BlbnJ0YjKYBACiBA8xNDQuMTIxLjIzMy4yMzeoBIkWsgQMCAAQABgAIAAwADgAuAQAwAQAyASxgoIB0gQOMTM1NiNOWU0yOjQyODLaBAIIAeAEAPAE6PmBFPoEEgkAAAAAZqdHQBEAAAAgWpRewIgFAZgFAKAF____________AaoFFjQ5MTgxNTcxMzQxNTU2NTI2OTQ5ZTHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXW7gr6BQQIABAAkAYAmAYAuAYAwQYAAAAAAADwP8gGANAGwgTaBhYKEAAAAAAAAAAAAAAABQpQEAAYAOAGAfIGAggAgAcBiAcAoAcB\\&s\\=630dbbd55f593c7bfd9e7bccc4dbaa28203daaed\\&pp\\=\\$\\{EMX_MACRO\\}\\\"\\>\\<\\/script\\>';
      serverResponse.seatbid[1].bid[0].adm = '%3F%%3Demx%3C3prebid'

      assert.doesNotThrow(() => spec.interpretResponse({
        body: serverResponse
      }));
    });
  });

  describe('getUserSyncs', function () {
    let syncOptionsIframe = { iframeEnabled: true };
    let syncOptionsPixel = { pixelEnabled: true };
    it('Should push the correct sync type depending on the config', function () {
      let iframeSync = spec.getUserSyncs(syncOptionsIframe);
      expect(iframeSync.length).to.equal(1);
      expect(iframeSync[0].type).to.equal('iframe');
    });
  });
});
