import { resetUserSync, spec, hasValidSupplyChainParams } from 'modules/luponmediaBidAdapter.js';
const ENDPOINT_URL = 'https://rtb.adxpremium.services/openrtb2/auction';

describe('luponmediaBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'luponmedia',
      'params': {
        'siteId': 12345,
        'keyId': '4o2c4'
      },
      'adUnitCode': 'test-div',
      'sizes': [[300, 250]],
      'bidId': 'g1987234bjkads',
      'bidderRequestId': '290348ksdhkas89324',
      'auctionId': '20384rlek235',
    };

    it('should return true when required params are found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'siteId': 12345
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'luponmedia',
        'params': {
          'siteId': 303522,
          'keyId': '4o2c4'
        },
        'crumbs': {
          'pubcid': '8d8b16cb-1383-4a0f-b4bb-0be28464d974'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                300,
                250
              ]
            ]
          }
        },
        'adUnitCode': 'div-gpt-ad-1533155193780-2',
        'transactionId': '585d96a5-bd93-4a89-b8ea-0f546f3aaa82',
        'sizes': [
          [
            300,
            250
          ]
        ],
        'bidId': '268a30af10dd6f',
        'bidderRequestId': '140411b5010a2a',
        'auctionId': '7376c117-b7aa-49f5-a661-488543deeefd',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0,
        'schain': {
          'ver': '1.0',
          'complete': 1,
          'nodes': [
            {
              'asi': 'novi.ba',
              'sid': '199424',
              'hp': 1
            }
          ]
        }
      }
    ];

    let bidderRequest = {
      'bidderCode': 'luponmedia',
      'auctionId': '7376c117-b7aa-49f5-a661-488543deeefd',
      'bidderRequestId': '140411b5010a2a',
      'bids': [
        {
          'bidder': 'luponmedia',
          'params': {
            'siteId': 303522,
            'keyId': '4o2c4'
          },
          'crumbs': {
            'pubcid': '8d8b16cb-1383-4a0f-b4bb-0be28464d974'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [
                [
                  300,
                  250
                ]
              ]
            }
          },
          'adUnitCode': 'div-gpt-ad-1533155193780-2',
          'transactionId': '585d96a5-bd93-4a89-b8ea-0f546f3aaa82',
          'sizes': [
            [
              300,
              250
            ]
          ],
          'bidId': '268a30af10dd6f',
          'bidderRequestId': '140411b5010a2a',
          'auctionId': '7376c117-b7aa-49f5-a661-488543deeefd',
          'src': 'client',
          'bidRequestsCount': 1,
          'bidderRequestsCount': 1,
          'bidderWinsCount': 0,
          'schain': {
            'ver': '1.0',
            'complete': 1,
            'nodes': [
              {
                'asi': 'novi.ba',
                'sid': '199424',
                'hp': 1
              }
            ]
          }
        }
      ],
      'auctionStart': 1587413920820,
      'timeout': 2000,
      'refererInfo': {
        'referer': 'https://novi.ba/clanak/176067/fast-car-beginner-s-guide-to-tuning-turbo-engines',
        'reachedTop': true,
        'numIframes': 0,
        'stack': [
          'https://novi.ba/clanak/176067/fast-car-beginner-s-guide-to-tuning-turbo-engines'
        ]
      },
      'start': 1587413920835
    };

    it('sends bid request to ENDPOINT via POST', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      let dynRes = JSON.parse(requests.data);
      expect(requests.url).to.equal(ENDPOINT_URL);
      expect(requests.method).to.equal('POST');
      expect(requests.data).to.equal('{"id":"585d96a5-bd93-4a89-b8ea-0f546f3aaa82","test":0,"source":{"tid":"585d96a5-bd93-4a89-b8ea-0f546f3aaa82","ext":{"schain":{"ver":"1.0","complete":1,"nodes":[{"asi":"novi.ba","sid":"199424","hp":1}]}}},"tmax":1500,"imp":[{"id":"268a30af10dd6f","secure":1,"ext":{"luponmedia":{"siteId":303522,"keyId":"4o2c4"}},"banner":{"format":[{"w":300,"h":250}]}}],"ext":{"prebid":{"targeting":{"includewinners":true,"includebidderkeys":false}}},"user":{"id":"' + dynRes.user.id + '","buyeruid":"8d8b16cb-1383-4a0f-b4bb-0be28464d974"},"site":{"page":"https://novi.ba/clanak/176067/fast-car-beginner-s-guide-to-tuning-turbo-engines"}}');
    });
  });

  describe('interpretResponse', function () {
    it('should get correct banner bid response', function () {
      let response = {
        'id': '4776d680-15a2-45c3-bad5-db6bebd94a06',
        'seatbid': [
          {
            'bid': [
              {
                'id': '2a122246ef72ea',
                'impid': '2a122246ef72ea',
                'price': 0.43,
                'adm': '<a href="https://novi.ba" target="_blank" style="position:absolute; width:300px; height:250px; z-index:5;"> </a><iframe src="https://lupon.media/vijestiba/300x250new/index.html" height="250" width="300" scrolling="no" frameborder="0"></iframe>',
                'adid': '56380110',
                'cid': '44724710',
                'crid': '443801010',
                'w': 300,
                'h': 250,
                'ext': {
                  'prebid': {
                    'targeting': {
                      'hb_bidder': 'luponmedia',
                      'hb_pb': '0.40',
                      'hb_size': '300x250'
                    },
                    'type': 'banner'
                  }
                }
              }
            ],
            'seat': 'luponmedia'
          }
        ],
        'cur': 'USD',
        'ext': {
          'responsetimemillis': {
            'luponmedia': 233
          },
          'tmaxrequest': 1500,
          'usersyncs': {
            'status': 'ok',
            'bidder_status': []
          }
        }
      };

      let expectedResponse = [
        {
          'requestId': '2a122246ef72ea',
          'cpm': '0.43',
          'width': 300,
          'height': 250,
          'creativeId': '443801010',
          'currency': 'USD',
          'dealId': '23425',
          'netRevenue': false,
          'ttl': 300,
          'referrer': '',
          'ad': '<a href="https://novi.ba" target="_blank" style="position:absolute; width:300px; height:250px; z-index:5;"> </a><iframe src="https://lupon.media/vijestiba/300x250new/index.html" height="250" width="300" scrolling="no" frameborder="0"></iframe>'
        }
      ];

      let bidderRequest = {
        'data': '{"site":{"page":"https://novi.ba/clanak/176067/fast-car-beginner-s-guide-to-tuning-turbo-engines"}}'
      };

      let result = spec.interpretResponse({ body: response }, bidderRequest);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function () {
      let noBidResponse = [];

      let noBidBidderRequest = {
        'data': '{"site":{"page":""}}'
      }
      let noBidResult = spec.interpretResponse({ body: noBidResponse }, noBidBidderRequest);
      expect(noBidResult.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    const bidResponse1 = {
      'body': {
        'ext': {
          'responsetimemillis': {
            'luponmedia': 233
          },
          'tmaxrequest': 1500,
          'usersyncs': {
            'status': 'ok',
            'bidder_status': [
              {
                'bidder': 'luponmedia',
                'no_cookie': true,
                'usersync': {
                  'url': 'https://adxpremium.services/api/usersync',
                  'type': 'redirect'
                }
              },
              {
                'bidder': 'luponmedia',
                'no_cookie': true,
                'usersync': {
                  'url': 'https://adxpremium.services/api/iframeusersync',
                  'type': 'iframe'
                }
              }
            ]
          }
        }
      }
    };

    const bidResponse2 = {
      'body': {
        'ext': {
          'responsetimemillis': {
            'luponmedia': 233
          },
          'tmaxrequest': 1500,
          'usersyncs': {
            'status': 'no_cookie',
            'bidder_status': []
          }
        }
      }
    };

    it('should use a sync url from first response (pixel and iframe)', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, [bidResponse1, bidResponse2]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://adxpremium.services/api/usersync'
        },
        {
          type: 'iframe',
          url: 'https://adxpremium.services/api/iframeusersync'
        }
      ]);
    });

    it('handle empty response (e.g. timeout)', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, []);
      expect(syncs).to.deep.equal([]);
    });

    it('returns empty syncs when not pixel enabled and not iframe enabled', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: false, iframeEnabled: false }, [bidResponse1]);
      expect(syncs).to.deep.equal([]);
    });

    it('returns pixel syncs when pixel enabled and not iframe enabled', function() {
      resetUserSync();

      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: false }, [bidResponse1]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://adxpremium.services/api/usersync'
        }
      ]);
    });

    it('returns iframe syncs when not pixel enabled and iframe enabled', function() {
      resetUserSync();

      const syncs = spec.getUserSyncs({ pixelEnabled: false, iframeEnabled: true }, [bidResponse1]);
      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'https://adxpremium.services/api/iframeusersync'
        }
      ]);
    });
  });

  describe('hasValidSupplyChainParams', function () {
    it('returns true if schain is valid', function () {
      const schain = {
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'asi': 'novi.ba',
            'sid': '199424',
            'hp': 1
          }
        ]
      };

      const checkSchain = hasValidSupplyChainParams(schain);
      expect(checkSchain).to.equal(true);
    });

    it('returns false if schain is invalid', function () {
      const schain = {
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'invalid': 'novi.ba'
          }
        ]
      };

      const checkSchain = hasValidSupplyChainParams(schain);
      expect(checkSchain).to.equal(false);
    });
  });
});
