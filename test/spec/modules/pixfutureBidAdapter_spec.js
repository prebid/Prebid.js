import { expect } from 'chai'; // may prefer 'assert' in place of 'expect'
import { spec } from 'modules/pixfutureBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as bidderFactory from 'src/adapters/bidderFactory.js';
import { auctionManager } from 'src/auctionManager.js';
import { deepClone } from 'src/utils.js';
import { config } from 'src/config.js';

describe('PixFutureAdapter', function () {
  it('<description of unit or feature being tested>', function () {
    const adapter = newBidder(spec);
    describe('inherited functions', function () {
      it('exists and is a function', function () {
        expect(adapter.callBids).to.exist.and.to.be.a('function');
      });
    });

    // Test of isBidRequestValid method

    describe('isBidRequestValid', function () {
      let bid = {
        'bidder': 'pixfuture',
        'pageUrl': 'https://adinify.com/prebidjs/?pbjs_debug=true',
        'bidId': '236e806f760f0c',
        'auctionId': 'aa7f5d76-806b-4e0d-b795-cd6bd84ddc63',
        'transactionId': '0fdf67c0-7b48-4fef-9716-cc64d948e95d',
        'adUnitCode': '26335x300x250x14x_ADSLOT88',
        'sizes': [[300, 250], [300, 600]],
        'params': {
          'pix_id': '777'
        }
      };
      it('should return true when required params found (bid)', function () {
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return true when required params found (bid.param=true)', function () {
        delete bid.params;
        bid.params = {
          'pix_id': '777'
        };
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return false when required params are not passed', function () {
        let bid = Object.assign({}, bid);
        delete bid.params;
        bid.params = {
          'pix_id': 0
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });

    // Test of buildRequest method

    describe('Test of buildRequest method', function () {
      let validBidRequests = [{
        'labelAny': ['display'],
        'bidder': 'pixfuture',
        'params': {
          'pix_id': '777'
        },
        'userId': {
          'criteoId': 'P9iqSF9MSDVlZ2ZwdTVGanp5U2l0MWt1cnZya25TdEs4VlY4ZjNTeHQ4czlJUkZES0NFRXBZblJNcTNYYjU4MWxYS2VWalM5dnd5RUhRYm0lMkJuQUFNVm1iclRvSVJTYzBuNkcxZUtTa2duRyUyQnU4S3clM0Q',
          'id5id': {
            'uid': 'ID5-ZHMOcvSShIBZiIth_yYh9odjNFxVEmMQ_i5TArPfWw!ID5*dtrjfV5mPLasyya5TW2IE9oVzQZwx7xRPGyAYS4hcWkAAOoxoFef4bIoREpQys8x',
            'ext': {
              'linkType': 2
            }
          },
          'pubcid': 'e09ab6a3-ae74-4f01-b2e8-81b141d6dc61',
          'sharedid': {
            'id': '01EXPPGZ9C8NKG1MTXVHV98505',
            'third': '01EXPPGZ9C8NKG1MTXVHV98505'
          }
        },
        'userIdAsEids': [{
          'source': 'criteo.com',
          'uids': [{
            'id': 'P9iqSF9MSDVlZ2ZwdTVGanp5U2l0MWt1cnZya25TdEs4VlY4ZjNTeHQ4czlJUkZES0NFRXBZblJNcTNYYjU4MWxYS2VWalM5dnd5RUhRYm0lMkJuQUFNVm1iclRvSVJTYzBuNkcxZUtTa2duRyUyQnU4S3clM0Q',
            'atype': 1
          }]
        }, {
          'source': 'id5-sync.com',
          'uids': [{
            'id': 'ID5-ZHMOcvSShIBZiIth_yYh9odjNFxVEmMQ_i5TArPfWw!ID5*dtrjfV5mPLasyya5TW2IE9oVzQZwx7xRPGyAYS4hcWkAAOoxoFef4bIoREpQys8x',
            'atype': 1,
            'ext': {
              'linkType': 2
            }
          }]
        }, {
          'source': 'pubcid.org',
          'uids': [{
            'id': 'e09ab6a3-ae74-4f01-b2e8-81b141d6dc61',
            'atype': 1
          }]
        }, {
          'source': 'sharedid.org',
          'uids': [{
            'id': '01EXPPGZ9C8NKG1MTXVHV98505',
            'atype': 1,
            'ext': {
              'third': '01EXPPGZ9C8NKG1MTXVHV98505'
            }
          }]
        }],
        'crumbs': {
          'pubcid': 'e09ab6a3-ae74-4f01-b2e8-81b141d6dc61'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250]
            ]
          }
        },
        'adUnitCode': '26335x300x250x14x_ADSLOT88',
        'transactionId': '09310832-cd12-478c-86dd-fbd819dff9d3',
        'sizes': [
          [300, 250]
        ],
        'bidId': '279272f27dfb3e',
        'bidderRequestId': '10a0de227377a3',
        'auctionId': '4cd5684b-ae2a-4d1f-84be-5f1ee66d9ff3',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0,
        'schain': {
          'ver': '1.0',
          'complete': 1,
          'nodes': [{
            'asi': 'pixfuture.com',
            'sid': '14',
            'hp': 1
          }]
        }
      }];

      let bidderRequests =
                    {
                      'bidderCode': 'pixfuture',
                      'auctionId': '4cd5684b-ae2a-4d1f-84be-5f1ee66d9ff3',
                      'bidderRequestId': '10a0de227377a3',
                      'bids': [{
                        'labelAny': ['display'],
                        'bidder': 'pixfuture',
                        'params': {
                          'pix_id': '777'
                        },
                        'userId': {
                          'criteoId': 'P9iqSF9MSDVlZ2ZwdTVGanp5U2l0MWt1cnZya25TdEs4VlY4ZjNTeHQ4czlJUkZES0NFRXBZblJNcTNYYjU4MWxYS2VWalM5dnd5RUhRYm0lMkJuQUFNVm1iclRvSVJTYzBuNkcxZUtTa2duRyUyQnU4S3clM0Q',
                          'id5id': {
                            'uid': 'ID5-ZHMOcvSShIBZiIth_yYh9odjNFxVEmMQ_i5TArPfWw!ID5*dtrjfV5mPLasyya5TW2IE9oVzQZwx7xRPGyAYS4hcWkAAOoxoFef4bIoREpQys8x',
                            'ext': {
                              'linkType': 2
                            }
                          },
                          'pubcid': 'e09ab6a3-ae74-4f01-b2e8-81b141d6dc61',
                          'sharedid': {
                            'id': '01EXPPGZ9C8NKG1MTXVHV98505',
                            'third': '01EXPPGZ9C8NKG1MTXVHV98505'
                          }
                        },
                        'userIdAsEids': [{
                          'source': 'criteo.com',
                          'uids': [{
                            'id': 'P9iqSF9MSDVlZ2ZwdTVGanp5U2l0MWt1cnZya25TdEs4VlY4ZjNTeHQ4czlJUkZES0NFRXBZblJNcTNYYjU4MWxYS2VWalM5dnd5RUhRYm0lMkJuQUFNVm1iclRvSVJTYzBuNkcxZUtTa2duRyUyQnU4S3clM0Q',
                            'atype': 1
                          }]
                        }, {
                          'source': 'id5-sync.com',
                          'uids': [{
                            'id': 'ID5-ZHMOcvSShIBZiIth_yYh9odjNFxVEmMQ_i5TArPfWw!ID5*dtrjfV5mPLasyya5TW2IE9oVzQZwx7xRPGyAYS4hcWkAAOoxoFef4bIoREpQys8x',
                            'atype': 1,
                            'ext': {
                              'linkType': 2
                            }
                          }]
                        }, {
                          'source': 'pubcid.org',
                          'uids': [{
                            'id': 'e09ab6a3-ae74-4f01-b2e8-81b141d6dc61',
                            'atype': 1
                          }]
                        }, {
                          'source': 'sharedid.org',
                          'uids': [{
                            'id': '01EXPPGZ9C8NKG1MTXVHV98505',
                            'atype': 1,
                            'ext': {
                              'third': '01EXPPGZ9C8NKG1MTXVHV98505'
                            }
                          }]
                        }],
                        'crumbs': {
                          'pubcid': 'e09ab6a3-ae74-4f01-b2e8-81b141d6dc61'
                        },
                        'mediaTypes': {
                          'banner': {
                            'sizes': [
                              [300, 250]
                            ]
                          }
                        },
                        'adUnitCode': '26335x300x250x14x_ADSLOT88',
                        'transactionId': '09310832-cd12-478c-86dd-fbd819dff9d3',
                        'sizes': [
                          [300, 250]
                        ],
                        'bidId': '279272f27dfb3e',
                        'bidderRequestId': '10a0de227377a3',
                        'auctionId': '4cd5684b-ae2a-4d1f-84be-5f1ee66d9ff3',
                        'src': 'client',
                        'bidRequestsCount': 1,
                        'bidderRequestsCount': 1,
                        'bidderWinsCount': 0,
                        'schain': {
                          'ver': '1.0',
                          'complete': 1,
                          'nodes': [{
                            'asi': 'pixfuture.com',
                            'sid': '14',
                            'hp': 1
                          }]
                        }
                      }],
                      'auctionStart': 1620934247115,
                      'timeout': 3000,
                      'refererInfo': {
                        'referer': 'https://adinify.com/prebidjs/?pbjs_debug=true',
                        'reachedTop': true,
                        'isAmp': false,
                        'numIframes': 0,
                        'stack': ['https://adinify.com/prebidjs/?pbjs_debug=true'],
                        'canonicalUrl': null
                      },
                      'start': 1620934247117
                    };

      // let bidderRequest = Object.assign({}, bidderRequests);
      const request = spec.buildRequests(validBidRequests, bidderRequests);
      // console.log(JSON.stringify(request));
      let bidRequest = Object.assign({}, request[0]);

      expect(bidRequest.data).to.exist;
      expect(bidRequest.data.sizes).to.deep.equal([[300, 250]]);
      expect(bidRequest.data.params).to.deep.equal({'pix_id': '777'});
      expect(bidRequest.data.adUnitCode).to.deep.equal('26335x300x250x14x_ADSLOT88');
    });
  });
  // Add other `describe` or `it` blocks as necessary
});
