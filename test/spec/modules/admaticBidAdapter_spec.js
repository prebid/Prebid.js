import {expect} from 'chai';
import {spec, storage} from 'modules/admaticBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {getStorageManager} from 'src/storageManager';

const ENDPOINT = 'https://layer.serve.admatic.com.tr/pb?bidder=admatic';

describe('admaticBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    let bid = {
      'bidder': 'admatic',
      'params': {
        'networkId': 10433394,
        'host': 'layer.serve.admatic.com.tr'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'creativeId': 'er2ee'
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;

      bid.params = {
        'networkId': 0,
        'host': 'layer.serve.admatic.com.tr'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('sends bid request to ENDPOINT via POST', function () {
      let validRequest = [ {
        'bidder': 'admatic',
        'params': {
          'networkId': 10433394,
          'host': 'layer.serve.admatic.com.tr'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250], [728, 90]]
          }
        },
        getFloor: inputParams => {
          if (inputParams.mediaType === BANNER && inputParams.size[0] === 300 && inputParams.size[1] === 250) {
            return {
              currency: 'USD',
              floor: 1.0
            };
          } else if (inputParams.mediaType === BANNER && inputParams.size[0] === 728 && inputParams.size[1] === 90) {
            return {
              currency: 'USD',
              floor: 2.0
            };
          } else {
            return {}
          }
        },
        'user': {
          'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36'
        },
        'blacklist': [],
        'site': {
          'page': 'http://localhost:8888/admatic.html',
          'ref': 'http://localhost:8888',
          'publisher': {
            'name': 'localhost',
            'publisherId': 12321312
          }
        },
        'imp': [
          {
            'size': [
              {
                'w': 300,
                'h': 250
              },
              {
                'w': 728,
                'h': 90
              }
            ],
            'id': '2205da7a81846b',
            'floors': {
              'banner': {
                '300x250': { 'currency': 'USD', 'floor': 1 },
                '728x90': { 'currency': 'USD', 'floor': 2 }
              }
            }
          }
        ],
        'ext': {
          'cur': 'USD',
          'bidder': 'admatic'
        }
      } ];
      let bidderRequest = {
        'bidder': 'admatic',
        'params': {
          'networkId': 10433394,
          'host': 'layer.serve.admatic.com.tr'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250], [728, 90]]
          }
        },
        getFloor: inputParams => {
          if (inputParams.mediaType === BANNER && inputParams.size[0] === 300 && inputParams.size[1] === 250) {
            return {
              currency: 'USD',
              floor: 1.0
            };
          } else if (inputParams.mediaType === BANNER && inputParams.size[0] === 728 && inputParams.size[1] === 90) {
            return {
              currency: 'USD',
              floor: 2.0
            };
          } else {
            return {}
          }
        },
        'user': {
          'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36'
        },
        'blacklist': [],
        'site': {
          'page': 'http://localhost:8888/admatic.html',
          'ref': 'http://localhost:8888',
          'publisher': {
            'name': 'localhost',
            'publisherId': 12321312
          }
        },
        'imp': [
          {
            'size': [
              {
                'w': 300,
                'h': 250
              },
              {
                'w': 728,
                'h': 90
              }
            ],
            'id': '2205da7a81846b',
            'floors': {
              'banner': {
                '300x250': { 'currency': 'USD', 'floor': 1 },
                '728x90': { 'currency': 'USD', 'floor': 2 }
              }
            }
          }
        ],
        'ext': {
          'cur': 'USD',
          'bidder': 'admatic'
        }
      };
      const request = spec.buildRequests(validRequest, bidderRequest);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should properly build a banner request with floors', function () {
      let bidRequests = [
        {
          'bidder': 'admatic',
          'params': {
            'networkId': 10433394,
            'host': 'layer.serve.admatic.com.tr'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 250], [728, 90]]
            }
          },
          getFloor: inputParams => {
            if (inputParams.mediaType === BANNER && inputParams.size[0] === 300 && inputParams.size[1] === 250) {
              return {
                currency: 'USD',
                floor: 1.0
              };
            } else if (inputParams.mediaType === BANNER && inputParams.size[0] === 728 && inputParams.size[1] === 90) {
              return {
                currency: 'USD',
                floor: 2.0
              };
            } else {
              return {}
            }
          }
        },
      ];
      let bidderRequest = {
        'bidder': 'admatic',
        'params': {
          'networkId': 10433394,
          'host': 'layer.serve.admatic.com.tr'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [728, 90]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'creativeId': 'er2ee',
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250], [728, 90]]
          }
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      request.data.imp[0].floors = {
        'banner': {
          '300x250': { 'currency': 'USD', 'floor': 1 },
          '728x90': { 'currency': 'USD', 'floor': 2 }
        }
      };
    });
  });

  describe('interpretResponse', function () {
    it('should get correct bid responses', function() {
      let bids = { body: {
        data: [
          {
            'id': 1,
            'creative_id': '374',
            'width': 300,
            'height': 250,
            'price': 0.01,
            'bidder': 'admatic',
            'adomain': ['admatic.com.tr'],
            'party_tag': '<div></div>'
          }
        ],
        'queryId': 'cdnbh24rlv0hhkpfpln0',
        'status': true
      }};

      let expectedResponse = [
        {
          requestId: 1,
          cpm: 0.01,
          width: 300,
          height: 250,
          currency: 'TRY',
          netRevenue: true,
          ad: '<div></div>',
          creativeId: '374',
          meta: {
            advertiserDomains: ['admatic.com.tr']
          },
          ttl: 360,
          bidder: 'admatic'
        }
      ];
      const request = {
        ext: {
          'cur': 'TRY',
          'type': 'admatic'
        }
      };
      let result = spec.interpretResponse(bids, {data: request});
      expect(result).to.eql(expectedResponse);
    });

    it('handles nobid responses', function () {
      let request = {
        ext: {
          'cur': 'TRY',
          'type': 'admatic'
        }
      };
      let bids = { body: {
        data: [],
        'queryId': 'cdnbh24rlv0hhkpfpln0',
        'status': true
      }};

      let result = spec.interpretResponse(bids, {data: request});
      expect(result.length).to.equal(0);
    });
  });
});
