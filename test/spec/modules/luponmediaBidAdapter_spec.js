import { resetUserSync, spec, hasValidSupplyChainParams } from 'modules/luponmediaBidAdapter.js';

describe('luponmediaBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'luponmedia',
      'params': {
        'keyId': 'uid@eu_test_300_600'
      },
      'adUnitCode': 'test-div',
      'sizes': [[300, 250]],
      'bidId': 'g1987234bjkads',
      'bidderRequestId': '290348ksdhkas89324',
      'auctionId': '20384rlek235',
    };

    it('should return true when required param is found and it is valid', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true with required and without optional param', function () {
      bid.params = {
        'keyId': 'uid_test_300_600'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when keyId is not in the required format', function () {
      bid.params = {
        'keyId': 12345
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        'bidder': 'luponmedia',
        'params': {
          'keyId': 'uid_test_300_600',
          'placement_id': 'test-div'
        },
        'ortb2Imp': {
          'ext': {
            'tid': 'df103a09-d255-48cc-b372-faf80adedb6d'
          }
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                300,
                600
              ]
            ]
          }
        },
        'adUnitCode': 'test-div',
        'transactionId': 'df103a09-d255-48cc-b372-faf80adedb6d',
        'adUnitId': '13c08b91-a866-4308-b240-ea671d3b1902',
        'sizes': [
          [
            300,
            600
          ]
        ],
        'bidId': '3913ea5825f4d6',
        'bidderRequestId': '2edea9c2757aff',
        'auctionId': '00e01a66-1f95-4197-8d4f-8e07c512104b',
        'src': 'client',
        'auctionsCount': 1,
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0,
        'deferBilling': false,
        'ortb2': {
          'source': {
            'tid': '00e01a66-1f95-4197-8d4f-8e07c512104b'
          },
          'device': {
            'w': 3008,
            'h': 1692,
            'dnt': 1,
            'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'language': 'sr',
            'ext': {
              'vpw': 1522,
              'vph': 714
            },
            'sua': {
              'source': 1,
              'mobile': 0
            }
          }
        }
      }
    ];

    const bidderRequest = {
      'bidderCode': 'luponmedia',
      'auctionId': '00e01a66-1f95-4197-8d4f-8e07c512104b',
      'bidderRequestId': '2edea9c2757aff',
      'bids': [
        {
          'bidder': 'luponmedia',
          'params': {
            'keyId': 'uid_test_300_600',
            'placement_id': 'test-div'
          },
          'ortb2Imp': {
            'ext': {
              'tid': 'df103a09-d255-48cc-b372-faf80adedb6d'
            }
          },
          'mediaTypes': {
            'banner': {
              'sizes': [
                [
                  300,
                  600
                ]
              ]
            }
          },
          'adUnitCode': 'test-div',
          'transactionId': 'df103a09-d255-48cc-b372-faf80adedb6d',
          'adUnitId': '13c08b91-a866-4308-b240-ea671d3b1902',
          'sizes': [
            [
              300,
              600
            ]
          ],
          'bidId': '3913ea5825f4d6',
          'bidderRequestId': '2edea9c2757aff',
          'auctionId': '00e01a66-1f95-4197-8d4f-8e07c512104b',
          'src': 'client',
          'auctionsCount': 1,
          'bidRequestsCount': 1,
          'bidderRequestsCount': 1,
          'bidderWinsCount': 0,
          'deferBilling': false,
          'ortb2': {
            'source': {
              'tid': '00e01a66-1f95-4197-8d4f-8e07c512104b'
            },
            'device': {
              'w': 3008,
              'h': 1692,
              'dnt': 1,
              'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
              'language': 'sr',
              'ext': {
                'vpw': 1522,
                'vph': 714
              },
              'sua': {
                'source': 1,
                'platform': {
                  'brand': 'macOS'
                },
                'mobile': 0
              }
            }
          }
        }
      ],
      'auctionStart': 1741002030343,
      'timeout': 1000,
    }

    it('sends bid request to default endpoint', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const data = JSON.parse(requests.data);

      expect(requests.url).to.equal('https://rtb.adxpremium.services/openrtb2/auction');
      expect(requests.method).to.equal('POST');
      expect(data.imp[0].ext.luponmedia.placement_id).to.equal('test-div');
      expect(data.imp[0].ext.luponmedia.keyId).to.equal('uid_test_300_600');
    });

    it('sends bid request to endpoint specified in keyId', function () {
      bidRequests[0].params.keyId = 'uid@eu_test_300_600';
      bidderRequest.bids[0].params.keyId = 'uid@eu_test_300_600';

      const requests = spec.buildRequests(bidRequests, bidderRequest);

      expect(requests.url).to.equal('https://eu.adxpremium.services/openrtb2/auction');
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

    it('returns pixel syncs when pixel enabled and not iframe enabled', function () {
      resetUserSync();

      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: false }, [bidResponse1]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://adxpremium.services/api/usersync'
        }
      ]);
    });

    it('returns iframe syncs when not pixel enabled and iframe enabled', function () {
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
