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
      'refererInfo': {
        'page': 'https://www.admatic.com.tr',
        'domain': 'https://www.admatic.com.tr',
      },
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
      'ortb2Imp': { 'ext': { 'instl': 1 } },
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
        'refererInfo': {
          'page': 'https://www.admatic.com.tr',
          'domain': 'https://www.admatic.com.tr',
        },
        'bidder': 'admatic',
        'params': {
          'networkId': 10433394,
          'host': 'layer.serve.admatic.com.tr'
        },
        'ortb2Imp': { 'ext': { 'instl': 1 } },
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
          },
          {
            'size': [
              {
                'w': 1,
                'h': 1
              }
            ],
            'type': 'native',
            'mediatype': {
              'title': {
                'required': true,
                'len': 120
              },
              'image': {
                'required': true
              },
              'icon': {
                'required': false,
                'sizes': [
                  640,
                  480
                ]
              },
              'sponsoredBy': {
                'required': false
              },
              'body': {
                'required': false
              },
              'clickUrl': {
                'required': false
              },
              'displayUrl': {
                'required': false
              }
            },
            'ext': {
              'instl': 0,
              'gpid': 'native-INS_b1b1269f-9570-fe3c-9bf4-f187827ec94a',
              'data': {
                'pbadslot': 'native-INS_b1b1269f-9570-fe3c-9bf4-f187827ec94a'
              }
            },
            'id': '16e0c8982318f91'
          }
        ],
        'ext': {
          'cur': 'USD',
          'bidder': 'admatic'
        }
      } ];
      let bidderRequest = {
        'refererInfo': {
          'page': 'https://www.admatic.com.tr',
          'domain': 'https://www.admatic.com.tr',
        },
        'bidder': 'admatic',
        'params': {
          'networkId': 10433394,
          'host': 'layer.serve.admatic.com.tr'
        },
        'ortb2Imp': { 'ext': { 'instl': 1 } },
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
          },
          {
            'size': [
              {
                'w': 1,
                'h': 1
              }
            ],
            'type': 'native',
            'mediatype': {
              'title': {
                'required': true,
                'len': 120
              },
              'image': {
                'required': true
              },
              'icon': {
                'required': false,
                'sizes': [
                  640,
                  480
                ]
              },
              'sponsoredBy': {
                'required': false
              },
              'body': {
                'required': false
              },
              'clickUrl': {
                'required': false
              },
              'displayUrl': {
                'required': false
              }
            },
            'ext': {
              'instl': 0,
              'gpid': 'native-INS_b1b1269f-9570-fe3c-9bf4-f187827ec94a',
              'data': {
                'pbadslot': 'native-INS_b1b1269f-9570-fe3c-9bf4-f187827ec94a'
              }
            },
            'id': '16e0c8982318f91'
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
          'ortb2Imp': { 'ext': { 'instl': 1 } },
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
        'refererInfo': {
          'page': 'https://www.admatic.com.tr',
          'domain': 'https://www.admatic.com.tr',
        },
        'bidder': 'admatic',
        'params': {
          'networkId': 10433394,
          'host': 'layer.serve.admatic.com.tr'
        },
        'ortb2Imp': { 'ext': { 'instl': 1 } },
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
            'mime_type': 'iframe',
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
            'mime_type': 'iframe',
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
            'mime_type': 'iframe',
            'bidder': 'admatic',
            'adomain': ['admatic.com.tr'],
            'party_tag': 'https://www.admatic.com.tr',
            'iurl': 'https://www.admatic.com.tr'
          },
          {
            'id': 4,
            'creative_id': '3742',
            'width': 1,
            'height': 1,
            'price': 0.01,
            'type': 'native',
            'mime_type': 'iframe',
            'bidder': 'admatic',
            'adomain': ['admatic.com.tr'],
            'party_tag': '{"native":{"ver":"1.1","assets":[{"id":1,"title":{"text":"title"}},{"id":4,"data":{"value":"body"}},{"id":5,"data":{"value":"sponsored"}},{"id":2,"img":{"url":"https://www.admatic.com.tr","w":1200,"h":628}},{"id":3,"img":{"url":"https://www.admatic.com.tr","w":640,"h":480}}],"link":{"url":"https://www.admatic.com.tr"},"imptrackers":["https://www.admatic.com.tr"]}}',
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
            model: 'iframe',
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
            model: 'iframe',
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
            model: 'iframe',
            advertiserDomains: ['admatic.com.tr']
          },
          ttl: 60,
          bidder: 'admatic'
        },
        {
          requestId: 4,
          cpm: 0.01,
          width: 1,
          height: 1,
          currency: 'TRY',
          mediaType: 'native',
          netRevenue: true,
          native: {
            'clickUrl': 'https://www.admatic.com.tr',
            'impressionTrackers': ['https://www.admatic.com.tr'],
            'title': 'title',
            'body': 'body',
            'sponsoredBy': 'sponsored',
            'image': {
              'url': 'https://www.admatic.com.tr',
              'width': 1200,
              'height': 628
            },
            'icon': {
              'url': 'https://www.admatic.com.tr',
              'width': 640,
              'height': 480
            }
          },
          creativeId: '3742',
          meta: {
            model: 'iframe',
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
