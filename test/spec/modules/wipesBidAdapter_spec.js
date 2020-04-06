import {expect} from 'chai';
import {spec} from 'modules/wipesBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';

const ENDPOINT_URL = 'https://adn-srv.reckoner-api.com/v1/prebid';

describe('wipesBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'wipes',
      'params': {
        asid: 'dWyPondh2EGB_bNlrVjzIXRZO9F0k1dpo0I8ZvQ'
      },
      'adUnitCode': 'adunit-code',
      'bidId': '51ef8751f9aead',
      'bidderRequestId': '15246a574e859f',
      'auctionId': 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when asid not passed correctly', function () {
      bid.params.asid = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'wipes',
        'params': {
          asid: 'dWyPondh2EGB_bNlrVjzIXRZO9F0k1dpo0I8ZvQ'
        },
        'adUnitCode': 'adunit-code',
        'bidId': '51ef8751f9aead',
        'bidderRequestId': '15246a574e859f',
        'auctionId': 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      },
      {
        'bidder': 'wipes',
        'params': {
          asid: 'dWyPondh2EGB_bNlrVjzIXRZO9F0k1dpo0I8ZvQ'
        },
        'adUnitCode': 'adunit-code2',
        'bidId': '51ef8751f9aead',
        'bidderRequestId': '15246a574e859f',
        'auctionId': 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      }
    ];

    let bidderRequest = {
      refererInfo: {
        numIframes: 0,
        reachedTop: true,
        referer: 'http://example.com',
        stack: ['http://example.com']
      }
    };

    const request = spec.buildRequests(bidRequests, bidderRequest);

    it('sends bid request to our endpoint via GET', function () {
      expect(request[0].method).to.equal('GET');
      expect(request[1].method).to.equal('GET');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT_URL);
      expect(request[1].url).to.equal(ENDPOINT_URL);
    });

    it('adUnitCode should be sent as uc parameters on any requests', function () {
      expect(request[0].data.asid).to.equal('dWyPondh2EGB_bNlrVjzIXRZO9F0k1dpo0I8ZvQ');
      expect(request[1].data.asid).to.equal('dWyPondh2EGB_bNlrVjzIXRZO9F0k1dpo0I8ZvQ');
    });
  });

  describe('interpretResponse', function () {
    let bidRequestVideo = [
      {
        'method': 'GET',
        'url': ENDPOINT_URL,
        'data': {
          'asid': 'dWyPondh2EGB_bNlrVjzIXRZO9F0k1dpo0I8ZvQ',
        }
      }
    ];

    let serverResponseVideo = {
      body: {
        'uuid': 'a42947f8-f8fd-4cf7-bb72-31a87ab1f6ff',
        'ad_tag': '<!-- adtag -->',
        'height': 160,
        'width': 300,
        'cpm': 850,
        'status_message': '',
        'currency': 'JPY',
        'video_creative_id': 600004
      }
    };

    it('should get the correct bid response for video', function () {
      let expectedResponse = [{
        'requestId': '23beaa6af6cdde',
        'cpm': 850,
        'width': 300,
        'height': 160,
        'creativeId': '600004',
        'dealId': undefined,
        'currency': 'JPY',
        'netRevenue': true,
        'ttl': 3000,
        'referrer': '',
        'mediaType': 'banner',
        'ad': '<!-- adtag -->'
      }];
      let result = spec.interpretResponse(serverResponseVideo, bidRequestVideo[0]);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
      expect(result[0].mediaType).to.equal(expectedResponse[0].mediaType);
    });

    it('handles empty bid response', function () {
      let response = {
        body: {
          'uid': 'a42947f8-f8fd-4cf7-bb72-31a87ab1f6ff',
          'height': 0,
          'crid': '',
          'statusMessage': '',
          'width': 0,
          'cpm': 0
        }
      };
      let result = spec.interpretResponse(response, bidRequestVideo[0]);
      expect(result.length).to.equal(0);
    });
  });
});
