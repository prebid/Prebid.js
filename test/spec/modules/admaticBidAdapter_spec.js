import { expect } from 'chai';
import { spec } from 'modules/admaticBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';

const ENDPOINT = 'https://layer.serve.admatic.com.tr/pb';

describe('admaticBidAdapter', () => {
  const adapter = newBidder(spec);
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
      },
      'native': {
      },
      'video': {
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
      } else if (inputParams.mediaType === VIDEO) {
        return {
          currency: 'USD',
          floor: 1.0
        };
      } else if (inputParams.mediaType === NATIVE) {
        return {
          currency: 'USD',
          floor: 1.0
        };
      } else {
        return {}
      }
    },
    'schain': {
      'ver': '1.0',
      'complete': 1,
      'nodes': [
        {
          'asi': 'pixad.com.tr',
          'sid': 'px-pub-3000856707',
          'hp': 1
        }
      ]
    },
    'at': 1,
    'tmax': 1000,
    'user': {
      'ext': {
        'eids': [
          {
            'source': 'id5-sync.com',
            'uids': [
              {
                'id': '0',
                'atype': 1,
                'ext': {
                  'linkType': 0,
                  'pba': 'wMh3sAXcnhDq7CfSa6ji1g=='
                }
              }
            ]
          },
          {
            'source': 'pubcid.org',
            'uids': [
              {
                'id': '5a49273f-a424-454b-b478-169c3551aa72',
                'atype': 1
              }
            ]
          }
        ]
      }
    },
    'ortb': {
      'badv': [],
      'bcat': [],
      'site': {
        'page': 'http://localhost:8888/admatic.html',
        'ref': 'http://localhost:8888',
        'publisher': {
          'name': 'localhost'
        }
      },
      'device': {
        'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      }
    },
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
        'id': 1,
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
        'floors': {
          'video': {
            '338x280': { 'currency': 'USD', 'floor': 1 }
          }
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
        'floors': {
          'native': {
            '*': { 'currency': 'USD', 'floor': 1 }
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
      },
      'native': {
      },
      'video': {
        'playerSize': [
          336,
          280
        ]
      }
    },
    'userId': {
      'id5id': {
        'uid': '0',
        'ext': {
          'linkType': 0,
          'pba': 'wMh3sAXcnhDq7CfSa6ji1g=='
        }
      },
      'pubcid': '5a49273f-a424-454b-b478-169c3551aa72'
    },
    'userIdAsEids': [
      {
        'source': 'id5-sync.com',
        'uids': [
          {
            'id': '0',
            'atype': 1,
            'ext': {
              'linkType': 0,
              'pba': 'wMh3sAXcnhDq7CfSa6ji1g=='
            }
          }
        ]
      },
      {
        'source': 'pubcid.org',
        'uids': [
          {
            'id': '5a49273f-a424-454b-b478-169c3551aa72',
            'atype': 1
          }
        ]
      }
    ],
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
      } else if (inputParams.mediaType === VIDEO) {
        return {
          currency: 'USD',
          floor: 1.0
        };
      } else if (inputParams.mediaType === NATIVE) {
        return {
          currency: 'USD',
          floor: 1.0
        };
      } else {
        return {}
      }
    },
    'schain': {
      'ver': '1.0',
      'complete': 1,
      'nodes': [
        {
          'asi': 'pixad.com.tr',
          'sid': 'px-pub-3000856707',
          'hp': 1
        }
      ]
    },
    'at': 1,
    'tmax': 1000,
    'user': {
      'ext': {
        'eids': [
          {
            'source': 'id5-sync.com',
            'uids': [
              {
                'id': '0',
                'atype': 1,
                'ext': {
                  'linkType': 0,
                  'pba': 'wMh3sAXcnhDq7CfSa6ji1g=='
                }
              }
            ]
          },
          {
            'source': 'pubcid.org',
            'uids': [
              {
                'id': '5a49273f-a424-454b-b478-169c3551aa72',
                'atype': 1
              }
            ]
          }
        ]
      }
    },
    'ortb': {
      'source': {},
      'site': {
        'domain': 'localhost:8888',
        'publisher': {
          'domain': 'localhost:8888'
        },
        'page': 'http://localhost:8888/',
        'name': 'http://localhost:8888'
      },
      'badv': [],
      'bcat': [],
      'device': {
        'w': 896,
        'h': 979,
        'dnt': 0,
        'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'language': 'tr',
        'sua': {
          'source': 1,
          'platform': {
            'brand': 'macOS'
          },
          'browsers': [
            {
              'brand': 'Google Chrome',
              'version': [
                '119'
              ]
            },
            {
              'brand': 'Chromium',
              'version': [
                '119'
              ]
            },
            {
              'brand': 'Not?A_Brand',
              'version': [
                '24'
              ]
            }
          ],
          'mobile': 0
        }
      }
    },
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
        'id': 1,
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
        'floors': {
          'video': {
            '338x280': { 'currency': 'USD', 'floor': 1 }
          }
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
        'floors': {
          'native': {
            '*': { 'currency': 'USD', 'floor': 1 }
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
      const request = spec.buildRequests(validRequest, bidderRequest);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should not populate GDPR if for non-EEA users', function () {
      let bidRequest = Object.assign([], validRequest);
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A=='
          }
        })
      );
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.regs.ext.consent).to.equal('BOJ8RZsOJ8RZsABAB8AAAAAZ-A');
    });

    it('should populate GDPR and empty consent string if available for EEA users without consent string but with consent', function () {
      let bidRequest = Object.assign([], validRequest);
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          gdprConsent: {
            gdprApplies: true
          }
        })
      );
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.regs.ext.consent).to.equal('');
    });

    it('should properly build a request when coppa flag is true', function () {
      let bidRequest = Object.assign([], validRequest);
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          coppa: true
        })
      );
      expect(request.data.regs.ext.coppa).to.not.be.undefined;
      expect(request.data.regs.ext.coppa).to.equal(1);
    });

    it('should properly build a request with gpp consent field', function () {
      let bidRequest = Object.assign([], validRequest);
      const ortb2 = {
        regs: {
          gpp: 'gpp_consent_string',
          gpp_sid: [0, 1, 2]
        }
      };
      const request = spec.buildRequests(bidRequest, { ...bidderRequest, ortb2 });
      expect(request.data.regs.ext.gpp).to.equal('gpp_consent_string');
      expect(request.data.regs.ext.gpp_sid).to.deep.equal([0, 1, 2]);
    });

    it('should properly build a request with ccpa consent field', function () {
      let bidRequest = Object.assign([], validRequest);
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          uspConsent: '1---'
        })
      );
      expect(request.data.regs.ext.uspIab).to.not.be.null;
      expect(request.data.regs.ext.uspIab).to.equal('1---');
    });

    it('should properly forward eids', function () {
      const bidRequests = [
        {
          bidder: 'admatic',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          userIdAsEids: [
            {
              source: 'admatic.com.tr',
              uids: [{
                id: 'abc',
                atype: 1
              }]
            }
          ],
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.user.ext.eids).to.deep.equal([
        {
          source: 'admatic.com.tr',
          uids: [{
            id: 'abc',
            atype: 1
          }]
        }
      ]);
    });

    it('should properly build a banner request with floors', function () {
      const request = spec.buildRequests(validRequest, bidderRequest);
      request.data.imp[0].floors = {
        'banner': {
          '300x250': { 'currency': 'USD', 'floor': 1 },
          '728x90': { 'currency': 'USD', 'floor': 2 }
        }
      };
    });

    it('should properly build a video request with several player sizes with floors', function () {
      const bidRequests = [
        {
          'bidder': 'admatic',
          'adUnitCode': 'bid-123',
          'transactionId': 'transaction-123',
          'mediaTypes': {
            'video': {
              'playerSize': [[300, 250], [728, 90]]
            }
          },
          'ortb2Imp': { 'ext': { 'instl': 1 } },
          'ortb2': { 'badv': ['admatic.com.tr'] },
          'params': {
            'networkId': 10433394,
            'host': 'layer.serve.admatic.com.tr'
          },
          getFloor: inputParams => {
            if (inputParams.mediaType === VIDEO && inputParams.size[0] === 300 && inputParams.size[1] === 250) {
              return {
                currency: 'USD',
                floor: 1.0
              };
            } else if (inputParams.mediaType === VIDEO && inputParams.size[0] === 728 && inputParams.size[1] === 90) {
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
      const bidderRequest = {
        'refererInfo': {
          'page': 'https://www.admatic.com.tr',
          'domain': 'https://www.admatic.com.tr',
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
    });

    it('should properly build a native request with floors', function () {
      const bidRequests = [
        {
          'bidder': 'admatic',
          'adUnitCode': 'bid-123',
          'transactionId': 'transaction-123',
          'mediaTypes': {
            'native': {
            }
          },
          'ortb2Imp': { 'ext': { 'instl': 1 } },
          'ortb2': { 'badv': ['admatic.com.tr'] },
          'params': {
            'networkId': 10433394,
            'host': 'layer.serve.admatic.com.tr'
          },
          getFloor: inputParams => {
            if (inputParams.mediaType === NATIVE) {
              return {
                currency: 'USD',
                floor: 1.0
              };
            } else {
              return {}
            }
          }
        },
      ];
      const bidderRequest = {
        'refererInfo': {
          'page': 'https://www.admatic.com.tr',
          'domain': 'https://www.admatic.com.tr',
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
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
            'mime_type': {
              'name': 'backfill',
              'force': false
            },
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
            'mime_type': {
              'name': 'backfill',
              'force': false
            },
            'bidder': 'admatic',
            'adomain': ['admatic.com.tr'],
            'party_tag': '<VAST></VAST>',
            'iurl': 'https://www.admatic.com.tr'
          },
          {
            'id': 3,
            'creative_id': '3742',
            'width': 1,
            'height': 1,
            'price': 0.01,
            'type': 'native',
            'mime_type': {
              'name': 'backfill',
              'force': false
            },
            'bidder': 'admatic',
            'adomain': ['admatic.com.tr'],
            'party_tag': '{"native":{"ver":"1.1","assets":[{"id":1,"title":{"text":"title"}},{"id":4,"data":{"value":"body"}},{"id":5,"data":{"value":"sponsored"}},{"id":6,"data":{"value":"cta"}},{"id":2,"img":{"url":"https://www.admatic.com.tr","w":1200,"h":628}},{"id":3,"img":{"url":"https://www.admatic.com.tr","w":640,"h":480}}],"link":{"url":"https://www.admatic.com.tr"},"imptrackers":["https://www.admatic.com.tr"]}}',
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
            model: {
              'name': 'backfill',
              'force': false
            },
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
          vastXml: '<VAST></VAST>',
          creativeId: '3741',
          meta: {
            model: {
              'name': 'backfill',
              'force': false
            },
            advertiserDomains: ['admatic.com.tr']
          },
          ttl: 60,
          bidder: 'admatic'
        },
        {
          requestId: 3,
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
            'cta': 'cta',
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
            model: {
              'name': 'backfill',
              'force': false
            },
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
        },
        imp: [
          {
            'size': [
              {
                'w': 320,
                'h': 100
              }
            ],
            'type': 'banner',
            'mediatype': {},
            'ext': {
              'instl': 0,
              'gpid': 'desktop-standard',
              'pxid': [
                '1111111111'
              ],
              'pxtype': 'pixad',
              'ortbstatus': true,
              'viewability': 100,
              'data': {
                'pbadslot': 'desktop-standard'
              },
              'ae': 1
            },
            'id': 1,
            'floors': {
              'banner': {
                '320x100': {
                  'floor': 0.1,
                  'currency': 'TRY'
                }
              }
            }
          },
          {
            'size': [
              {
                'w': 320,
                'h': 100
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
                  320,
                  100
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
              'skip': 0,
              'playbackmethod': [
                2
              ],
              'linearity': 1,
              'placement': 2,
              'plcmt': 4
            },
            'ext': {
              'gpid': 'outstream-desktop-standard',
              'pxtype': 'pixad',
              'pxid': [
                '1111111111'
              ],
              'ortbstatus': true,
              'viewability': 100,
              'data': {
                'pbadslot': 'outstream-desktop-standard'
              },
              'ae': 1
            },
            'id': 2,
            'floors': {
              'video': {
                '320x100': {
                  'floor': 0.1,
                  'currency': 'TRY'
                }
              }
            }
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
              'sendTargetingKeys': false,
              'ortb': {
                'ver': '1.1',
                'context': 2,
                'plcmttype': 1,
                'privacy': 1,
                'assets': [
                  {
                    'id': 1,
                    'required': 1,
                    'title': {
                      'len': 120
                    }
                  },
                  {
                    'id': 2,
                    'required': 1,
                    'img': {
                      'type': 3,
                      'w': 640,
                      'h': 480
                    }
                  },
                  {
                    'id': 3,
                    'required': 0,
                    'img': {
                      'type': 1,
                      'w': 640,
                      'h': 480
                    }
                  },
                  {
                    'id': 4,
                    'required': 0,
                    'data': {
                      'type': 2
                    }
                  },
                  {
                    'id': 5,
                    'required': 0,
                    'data': {
                      'type': 1
                    }
                  },
                  {
                    'id': 6,
                    'required': 0,
                    'data': {
                      'type': 11
                    }
                  }
                ],
                'eventtrackers': [
                  {
                    'event': 1,
                    'methods': [
                      1,
                      2
                    ]
                  }
                ]
              }
            },
            'ext': {
              'gpid': 'native-desktop-standard',
              'pxtype': 'pixad',
              'pxid': [
                '1111111111'
              ],
              'ortbstatus': true,
              'viewability': 100,
              'data': {
                'pbadslot': 'native-desktop-standard'
              },
              'ae': 1
            },
            'id': 3,
            'floors': {
              'native': {
                '*': {
                  'floor': 0.1,
                  'currency': 'TRY'
                }
              }
            }
          }
        ]
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
