import {expect} from 'chai';
import {spec, storage} from 'modules/admaticBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {getStorageManager} from 'src/storageManager';

const ENDPOINT = 'https://layer.serve.admatic.com.tr/pb';

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
      'mediaType': 'banner',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'creativeId': 'er2ee',
      'ortb2': { 'badv': ['admatic.com.tr'] }
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function() {
      let bid2 = {};
      bid2.params = {
        'someIncorrectParam': 0
      };
      expect(spec.isBidRequestValid(bid2)).to.equal(false);
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
        'ortb2': { 'badv': ['admatic.com.tr'] },
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
            'mediatype': {},
            'type': 'banner',
            'id': '2205da7a81846b',
            'floors': {
              'banner': {
                '300x250': { 'currency': 'USD', 'floor': 1 },
                '728x90': { 'currency': 'USD', 'floor': 2 }
              }
            }
          },
          {
            'size': [
              {
                'w': 338,
                'h': 280
              }
            ],
            'type': 'video',
            'mediatype': {
              'context': 'instream',
              'mimes': [
                'video/mp4'
              ],
              'maxduration': 240,
              'api': [
                1,
                2
              ],
              'playerSize': [
                [
                  338,
                  280
                ]
              ],
              'protocols': [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8
              ],
              'skip': 1,
              'playbackmethod': [
                2
              ],
              'linearity': 1,
              'placement': 2
            },
            'id': '45e86fc7ce7fc93'
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
        'ortb2': { 'badv': ['admatic.com.tr'] },
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
            'mediatype': {},
            'type': 'banner',
            'floors': {
              'banner': {
                '300x250': { 'currency': 'USD', 'floor': 1 },
                '728x90': { 'currency': 'USD', 'floor': 2 }
              }
            }
          },
          {
            'size': [
              {
                'w': 338,
                'h': 280
              }
            ],
            'type': 'video',
            'mediatype': {
              'context': 'instream',
              'mimes': [
                'video/mp4'
              ],
              'maxduration': 240,
              'api': [
                1,
                2
              ],
              'playerSize': [
                [
                  338,
                  280
                ]
              ],
              'protocols': [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8
              ],
              'skip': 1,
              'playbackmethod': [
                2
              ],
              'linearity': 1,
              'placement': 2
            },
            'id': '45e86fc7ce7fc93'
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
          'ortb2': { 'badv': ['admatic.com.tr'] },
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
        'ortb2': { 'badv': ['admatic.com.tr'] },
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
            'type': 'banner',
            'bidder': 'admatic',
            'adomain': ['admatic.com.tr'],
            'party_tag': '<div></div>',
            'iurl': 'https://www.admatic.com.tr'
          },
          {
            'id': 2,
            'creative_id': '3741',
            'width': 300,
            'height': 250,
            'price': 0.01,
            'type': 'video',
            'bidder': 'admatic',
            'adomain': ['admatic.com.tr'],
            'party_tag': '<VAST></VAST>',
            'iurl': 'https://www.admatic.com.tr'
          },
          {
            'id': 3,
            'creative_id': '3741',
            'width': 300,
            'height': 250,
            'price': 0.01,
            'type': 'video',
            'bidder': 'admatic',
            'adomain': ['admatic.com.tr'],
            'party_tag': 'https://www.admatic.com.tr',
            'iurl': 'https://www.admatic.com.tr'
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
          mediaType: 'banner',
          netRevenue: true,
          ad: '<div></div>',
          creativeId: '374',
          meta: {
            advertiserDomains: ['admatic.com.tr']
          },
          ttl: 60,
          bidder: 'admatic'
        },
        {
          requestId: 2,
          cpm: 0.01,
          width: 300,
          height: 250,
          currency: 'TRY',
          mediaType: 'video',
          netRevenue: true,
          vastImpUrl: 'https://www.admatic.com.tr',
          vastXml: '<VAST></VAST>',
          creativeId: '3741',
          meta: {
            advertiserDomains: ['admatic.com.tr']
          },
          ttl: 60,
          bidder: 'admatic'
        },
        {
          requestId: 3,
          cpm: 0.01,
          width: 300,
          height: 250,
          currency: 'TRY',
          mediaType: 'video',
          netRevenue: true,
          vastImpUrl: 'https://www.admatic.com.tr',
          vastXml: 'https://www.admatic.com.tr',
          creativeId: '3741',
          meta: {
            advertiserDomains: ['admatic.com.tr']
          },
          ttl: 60,
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
