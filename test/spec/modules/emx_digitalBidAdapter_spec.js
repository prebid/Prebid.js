import { expect } from 'chai';
import { spec } from 'modules/emx_digitalBidAdapter';
import * as utils from 'src/utils';
import { newBidder } from 'src/adapters/bidderFactory';

describe('emx_digital Adapter', function () {
  const adapter = newBidder(spec);

  describe('required function', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'emx_digital',
      'params': {
        'tagid': '25251'
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
    });

    it('should contain tagid param', function () {
      expect(spec.isBidRequestValid({
        params: {}
      })).to.equal(false);
      expect(spec.isBidRequestValid({
        params: {
          tagid: ''
        }
      })).to.equal(false);
      expect(spec.isBidRequestValid({
        params: {
          tagid: '123'
        }
      })).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
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
      'bidderRequestId': '22edbae3120bf6',
      'auctionId': 'e19f1eff-8b27-42a6-888d-9674e5a6130c',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec'
    }, {
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
      'bidderRequestId': '22edbae3120bf6',
      'auctionId': 'e19f1eff-8b27-42a6-888d-9674e5a6130c',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec'
    }];
    let bidderRequest = {
      'bidderCode': 'emx_digital',
      'auctionId': 'e19f1eff-8b27-42a6-888d-9674e5a6130c',
      'bidderRequestId': '22edbae3120bf6',
      'timeout': 1500,
    };
    bidderRequest.bids = bidRequests

    let request = spec.buildRequests(bidRequests, bidderRequest);

    it('sends bid request to ENDPOINT via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('contains the correct options', function () {
      expect(request.options.withCredentials).to.equal(true);
    });

    it('sends contains a properly formatted endpoint url', function () {
      const url = request.url.split('?');
      const queryParams = url[1].split('&');
      expect(queryParams[0]).to.match(new RegExp('^t=\d*', 'g'));
      expect(queryParams[1]).to.match(new RegExp('^ts=\d*', 'g'));
    });

    it('builds request properly', function () {
      const data = JSON.parse(request.data);

      expect(Array.isArray(data.imp)).to.equal(true);
      expect(data.id).to.equal(bidderRequest.auctionId);
      expect(data.imp.length).to.equal(2);
      expect(data.imp[0].id).to.equal('30b31c2501de1e');
      expect(data.imp[0].tid).to.equal('d7b773de-ceaa-484d-89ca-d9f51b8d61ec');
      expect(data.imp[0].tagid).to.equal('25251');
      expect(data.imp[0].secure).to.equal(0);
    });

    it('builds with bid floor', function() {
      const bidRequestWithBidFloor = utils.deepClone(bidRequests);
      bidRequestWithBidFloor[0].params.bidfloor = 1;
      const requestWithFloor = spec.buildRequests(bidRequestWithBidFloor, bidderRequest);
      const data = JSON.parse(requestWithFloor.data);
      expect(data.imp[0].bidfloor).to.equal(bidRequestWithBidFloor[0].params.bidfloor);
    })

    it('properly sends site information and protocol', function () {
      let mock = sinon.stub(utils, 'getTopWindowLocation').callsFake(() => {
        return {
          protocol: 'https:',
          host: 'example.com',
          href: 'https://example.com/index.html'
        };
      });

      let request;

      request = spec.buildRequests(bidRequests, bidderRequest);
      request = JSON.parse(request.data);
      expect(request.site.domain).to.equal('example.com');
      expect(request.site.page).to.equal('https://example.com/index.html');
      expect(request.imp[0].secure).to.equal(1);

      mock.restore();
    })

    it('builds correctly formatted request banner object', function () {
      let request;

      let bidRequestWithBanner = utils.deepClone(bidRequests);

      request = spec.buildRequests(bidRequestWithBanner, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].banner.w).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][0]);
      expect(data.imp[0].banner.h).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][1]);
      expect(data.imp[0].banner.format[0].w).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][0]);
      expect(data.imp[0].banner.format[0].h).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][1]);
      expect(data.imp[0].banner.format[1].w).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[1][0]);
      expect(data.imp[0].banner.format[1].h).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[1][1]);
    })

    it('shouldn\'t contain a user obj without GDPR information', function () {
      let request = spec.buildRequests(bidRequests, bidderRequest)
      request = JSON.parse(request.data)
      expect(request).to.not.have.property('user');
    });

    it('should have the right gdpr info when enabled', function () {
      let consentString = 'OIJSZsOAFsABAB8EMXZZZZZ+A==';
      let bidderRequest = {
        'bidderCode': 'emx_digital',
        'auctionId': 'e19f1eff-8b27-42a6-888d-9674e5a6130c',
        'bidderRequestId': '22edbae3120bf6',
        'timeout': 1500,
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': true
        }
      };
      bidderRequest.bids = bidRequests
      let request = spec.buildRequests(bidRequests, bidderRequest);

      request = JSON.parse(request.data)
      expect(request.regs.ext).to.have.property('gdpr', 1);
      expect(request.user.ext).to.have.property('consent', 'OIJSZsOAFsABAB8EMXZZZZZ+A==');
    });

    it('should\'t contain consent string if gdpr isn\'t applied', function () {
      let bidderRequest = {
        'bidderCode': 'emx_digital',
        'auctionId': 'e19f1eff-8b27-42a6-888d-9674e5a6130c',
        'bidderRequestId': '22edbae3120bf6',
        'timeout': 1500,
        'gdprConsent': {
          'gdprApplies': false
        }
      };
      bidderRequest.bids = bidRequests
      let request = spec.buildRequests(bidRequests, bidderRequest);

      request = JSON.parse(request.data)
      expect(request.regs.ext).to.have.property('gdpr', 0);
      expect(request).to.not.have.property('user');
    });
  });

  describe('interpretResponse', function () {
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
      expect(ad0.height).to.equal(serverResponse.seatbid[0].bid[0].h);
      expect(ad0.mediaType).to.equal('banner');
      expect(ad0.netRevenue).to.equal(true);
      expect(ad0.requestId).to.equal(serverResponse.seatbid[0].bid[0].id);
      expect(ad0.ttl).to.equal(300);
      expect(ad0.width).to.equal(serverResponse.seatbid[0].bid[0].w);

      expect(ad1.ad).to.equal(serverResponse.seatbid[1].bid[0].adm);
      expect(ad1.cpm).to.equal(serverResponse.seatbid[1].bid[0].price);
      expect(ad1.creativeId).to.equal(serverResponse.seatbid[1].bid[0].crid);
      expect(ad1.currency).to.equal('USD');
      expect(ad1.height).to.equal(serverResponse.seatbid[1].bid[0].h);
      expect(ad1.mediaType).to.equal('banner');
      expect(ad1.netRevenue).to.equal(true);
      expect(ad1.requestId).to.equal(serverResponse.seatbid[1].bid[0].id);
      expect(ad1.ttl).to.equal(300);
      expect(ad1.width).to.equal(serverResponse.seatbid[1].bid[0].w);
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
  });
});
