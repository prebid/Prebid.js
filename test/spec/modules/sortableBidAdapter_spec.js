import { expect } from 'chai';
import { spec } from 'modules/sortableBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

const ENDPOINT = `https://c.deployads.com/openrtb2/auction?src=$$REPO_AND_VERSION$$&host=${utils.getTopWindowLocation().host}`;

describe('sortableBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    function makeBid() {
      return {
        'bidder': 'sortable',
        'params': {
          'tagId': '403370',
          'siteId': 'example.com',
          'keywords': {
            'key1': 'val1',
            'key2': 'val2'
          },
          'floorSizeMap': {
            '728x90': 0.15,
            '300x250': 1.20
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250]
        ],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
    }

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(makeBid())).to.equal(true);
    });

    it('should return false when tagId not passed correctly', function () {
      let bid = makeBid();
      delete bid.params.tagId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when sizes not passed correctly', function () {
      let bid = makeBid();
      delete bid.sizes;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when sizes are wrong length', function () {
      let bid = makeBid();
      bid.sizes = [[300]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      let bid = makeBid();
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when the floorSizeMap is invalid', function () {
      let bid = makeBid();
      bid.params.floorSizeMap = {
        'sixforty by foureighty': 1234
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params.floorSizeMap = {
        '728x90': 'three'
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params.floorSizeMap = 'a';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when the floorSizeMap is missing or empty', function () {
      let bid = makeBid();
      bid.params.floorSizeMap = {};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      delete bid.params.floorSizeMap;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return false when the keywords are invalid', function () {
      let bid = makeBid();
      bid.params.keywords = {
        'badval': 1234
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params.keywords = 'a';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when the keywords are missing or empty', function () {
      let bid = makeBid();
      bid.params.keywords = {};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      delete bid.params.keywords;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      'bidder': 'sortable',
      'params': {
        'tagId': '403370',
        'siteId': 'example.com',
        'floor': 0.21,
        'keywords': {
          'key1': 'val1',
          'key2': 'val2'
        },
        'floorSizeMap': {
          '728x90': 0.15,
          '300x250': 1.20
        }
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];

    const request = spec.buildRequests(bidRequests);
    const requestBody = JSON.parse(request.data);

    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      expect(request.url).to.equal(ENDPOINT);
    });

    it('sends screen dimensions', function () {
      expect(requestBody.site.device.w).to.equal(screen.width);
      expect(requestBody.site.device.h).to.equal(screen.height);
    });

    it('includes the ad size in the bid request', function () {
      expect(requestBody.imp[0].banner.format[0].w).to.equal(300);
      expect(requestBody.imp[0].banner.format[0].h).to.equal(250);
    });

    it('includes the params in the bid request', function () {
      expect(requestBody.imp[0].ext.keywords).to.deep.equal(
        {'key1': 'val1',
          'key2': 'val2'}
      );
      expect(requestBody.site.publisher.id).to.equal('example.com');
      expect(requestBody.imp[0].tagid).to.equal('403370');
      expect(requestBody.imp[0].bidfloor).to.equal(0.21);
    });

    it('should have the floor size map set', function () {
      expect(requestBody.imp[0].ext.floorSizeMap).to.deep.equal({
        '728x90': 0.15,
        '300x250': 1.20
      });
    });
  });

  describe('interpretResponse', function () {
    function makeResponse() {
      return {
        body: {
          'id': '5e5c23a5ba71e78',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '6vmb3isptf',
                  'crid': 'sortablescreative',
                  'impid': '322add653672f68',
                  'price': 1.22,
                  'adm': '<!-- creative -->',
                  'attr': [5],
                  'h': 90,
                  'nurl': 'https://nurl',
                  'w': 728
                }
              ],
              'seat': 'MOCK'
            }
          ],
          'bidid': '5e5c23a5ba71e78'
        }
      };
    }

    const expectedBid = {
      'requestId': '322add653672f68',
      'cpm': 1.22,
      'width': 728,
      'height': 90,
      'creativeId': 'sortablescreative',
      'dealId': null,
      'currency': 'USD',
      'netRevenue': true,
      'mediaType': 'banner',
      'ttl': 60,
      'ad': '<!-- creative --><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="https://nurl"></div>'
    };

    it('should get the correct bid response', function () {
      let result = spec.interpretResponse(makeResponse());
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(expectedBid);
    });

    it('should handle a missing crid', function () {
      let noCridResponse = makeResponse();
      delete noCridResponse.body.seatbid[0].bid[0].crid;
      const fallbackCrid = noCridResponse.body.seatbid[0].bid[0].id;
      let noCridResult = Object.assign({}, expectedBid, {'creativeId': fallbackCrid});
      let result = spec.interpretResponse(noCridResponse);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(noCridResult);
    });

    it('should handle a missing nurl', function () {
      let noNurlResponse = makeResponse();
      delete noNurlResponse.body.seatbid[0].bid[0].nurl;
      let noNurlResult = Object.assign({}, expectedBid);
      noNurlResult.ad = '<!-- creative -->';
      let result = spec.interpretResponse(noNurlResponse);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(noNurlResult);
    });

    it('should handle a missing adm', function () {
      let noAdmResponse = makeResponse();
      delete noAdmResponse.body.seatbid[0].bid[0].adm;
      let noAdmResult = Object.assign({}, expectedBid);
      delete noAdmResult.ad;
      noAdmResult.adUrl = 'https://nurl';
      let result = spec.interpretResponse(noAdmResponse);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(noAdmResult);
    });

    it('handles empty bid response', function () {
      let response = {
        body: {
          'id': '5e5c23a5ba71e78',
          'seatbid': []
        }
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });
});
