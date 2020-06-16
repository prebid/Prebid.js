import { createSendOptionsFromBatch, summarizeAuctionEnd } from '../../../modules/mavenDistributionAnalyticsAdapter.js';

var assert = require('assert');

describe('MavenDistributionAnalyticsAdapter', function () {
  describe('summarizeAuctionEnd', function () {
    it('should summarize', () => {
      const args = {
        'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
        'timestamp': 1592017351705,
        'auctionEnd': 1592017352034,
        'auctionStatus': 'completed',
        'adUnits': [
          {
            'code': 'ad-42a6e2ce42724767a2288295baa68f98',
            'adUnitPath': '/88059007/www.si.com/homepage',
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    728,
                    90
                  ]
                ]
              }
            },
            'bids': [
              {
                'bidder': 'ix',
                'params': {
                  'siteId': '414960',
                  'id': 'www.si.com_fixed_bottom_0_dt',
                  'size': [
                    728,
                    90
                  ]
                }
              },
              {
                'bidder': 'rubicon',
                'params': {
                  'accountId': '10348',
                  'floor': 0.1,
                  'siteId': '283708',
                  'zoneId': '1419652',
                  'inventory': {
                    'au1': [
                      'sportsillustrated.192.168.1.9.xip.io'
                    ],
                    'pod': [
                      '13'
                    ]
                  }
                }
              },
              {
                'bidder': 'appnexus',
                'params': {
                  'allowSmallerSizes': true,
                  'reserve': 0.1,
                  'invCode': 'www.si.com_fixed_bottom_0_dt',
                  'member': '8186',
                  'keywords': {
                    'cm': 'tempest',
                    'adzone': 'fixed_bottom',
                    'index': 0,
                    'adzoneindex': 'fixed_bottom_0',
                    'siteadzoneindex': 'www.si.com_fixed_bottom_0',
                    'path': '/',
                    'pagetype': 'homepage',
                    'cv': 'sports',
                    'au1': 'sportsillustrated.192.168.1.9.xip.io',
                    'pod': 13
                  }
                }
              },
              {
                'bidder': 'pubmatic',
                'params': {
                  'adSlot': 'www.si.com_fixed_bottom_0_dt@728x90',
                  'kadfloor': '0.10',
                  'pmzoneid': 'www.si.com',
                  'publisherId': '156229',
                  'dctr': 'au1=sportsillustrated.192.168.1.9.xip.io|pod=13|au1=sportsillustrated.192.168.1.9.xip.io|pod=13|au1=sportsillustrated.192.168.1.9.xip.io|pod=13|au1=sportsillustrated.192.168.1.9.xip.io|pod=13'
                }
              },
              {
                'bidder': 'sovrn',
                'params': {
                  'bidfloor': '0.10',
                  'tagid': '644735'
                }
              },
              {
                'bidder': 'sortable',
                'params': {
                  'floor': 0.1,
                  'siteId': 'www.si.com',
                  'tagId': 'fixed_bottom'
                }
              },
              {
                'bidder': '33across',
                'params': {
                  'siteId': 'b1EXDC3VKr6yoEaKkGJozW',
                  'productId': 'siab'
                }
              }
            ],
            'sizes': [
              [
                728,
                90
              ]
            ],
            'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8'
          }
        ],
        'adUnitCodes': [
          'ad-42a6e2ce42724767a2288295baa68f98'
        ],
        'bidderRequests': [
          {
            'bidderCode': 'ix',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'bidderRequestId': '439661490c5b7a68',
            'bids': [
              {
                'bidder': 'ix',
                'params': {
                  'siteId': '414960',
                  'id': 'www.si.com_fixed_bottom_0_dt',
                  'size': [
                    728,
                    90
                  ]
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        728,
                        90
                      ]
                    ]
                  }
                },
                'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
                'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
                'sizes': [
                  [
                    728,
                    90
                  ]
                ],
                'bidId': '4467d6e5a16adcd',
                'bidderRequestId': '439661490c5b7a68',
                'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
                'src': 'client',
                'bidRequestsCount': 3,
                'bidderRequestsCount': 3,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592017351705,
            'timeout': 27000,
            'refererInfo': {
              'referer': 'http://sportsillustrated.192.168.1.9.xip.io:9000/',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'http://sportsillustrated.192.168.1.9.xip.io:9000/'
              ],
              'canonicalUrl': 'https://www.si.com/'
            },
            'start': 1592017351708
          },
          {
            'bidderCode': 'rubicon',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'bidderRequestId': '4559774772c7f83',
            'bids': [
              {
                'bidder': 'rubicon',
                'params': {
                  'accountId': 10348,
                  'floor': 0.1,
                  'siteId': 283708,
                  'zoneId': 1419652,
                  'inventory': {
                    'au1': [
                      'sportsillustrated.192.168.1.9.xip.io'
                    ],
                    'pod': [
                      '13'
                    ]
                  }
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        728,
                        90
                      ]
                    ]
                  }
                },
                'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
                'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
                'sizes': [
                  [
                    728,
                    90
                  ]
                ],
                'bidId': '46e15874aa78708',
                'bidderRequestId': '4559774772c7f83',
                'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
                'src': 'client',
                'bidRequestsCount': 3,
                'bidderRequestsCount': 3,
                'bidderWinsCount': 0,
                'startTime': 1592017351709
              }
            ],
            'auctionStart': 1592017351705,
            'timeout': 27000,
            'refererInfo': {
              'referer': 'http://sportsillustrated.192.168.1.9.xip.io:9000/',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'http://sportsillustrated.192.168.1.9.xip.io:9000/'
              ],
              'canonicalUrl': 'https://www.si.com/'
            },
            'start': 1592017351709
          },
          {
            'bidderCode': 'appnexus',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'bidderRequestId': '47501ed0d7e43e1',
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'allowSmallerSizes': true,
                  'reserve': 0.1,
                  'invCode': 'www.si.com_fixed_bottom_0_dt',
                  'member': '8186',
                  'keywords': {
                    'cm': 'tempest',
                    'adzone': 'fixed_bottom',
                    'index': 0,
                    'adzoneindex': 'fixed_bottom_0',
                    'siteadzoneindex': 'www.si.com_fixed_bottom_0',
                    'path': '/',
                    'pagetype': 'homepage',
                    'cv': 'sports',
                    'au1': 'sportsillustrated.192.168.1.9.xip.io',
                    'pod': 13
                  }
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        728,
                        90
                      ]
                    ]
                  }
                },
                'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
                'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
                'sizes': [
                  [
                    728,
                    90
                  ]
                ],
                'bidId': '48fb5e592b951c58',
                'bidderRequestId': '47501ed0d7e43e1',
                'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
                'src': 'client',
                'bidRequestsCount': 3,
                'bidderRequestsCount': 3,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592017351705,
            'timeout': 27000,
            'refererInfo': {
              'referer': 'http://sportsillustrated.192.168.1.9.xip.io:9000/',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'http://sportsillustrated.192.168.1.9.xip.io:9000/'
              ],
              'canonicalUrl': 'https://www.si.com/'
            },
            'start': 1592017351711
          },
          {
            'bidderCode': 'pubmatic',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'bidderRequestId': '493dcc5df87dc62',
            'bids': [
              {
                'bidder': 'pubmatic',
                'params': {
                  'adSlot': 'www.si.com_fixed_bottom_0_dt@728x90',
                  'kadfloor': '0.10',
                  'pmzoneid': 'www.si.com',
                  'publisherId': '156229',
                  'dctr': 'au1=sportsillustrated.192.168.1.9.xip.io|pod=13|au1=sportsillustrated.192.168.1.9.xip.io|pod=13|au1=sportsillustrated.192.168.1.9.xip.io|pod=13|au1=sportsillustrated.192.168.1.9.xip.io|pod=13'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        728,
                        90
                      ]
                    ]
                  }
                },
                'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
                'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
                'sizes': [
                  [
                    728,
                    90
                  ]
                ],
                'bidId': '509d5df6b893fec8',
                'bidderRequestId': '493dcc5df87dc62',
                'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
                'src': 'client',
                'bidRequestsCount': 3,
                'bidderRequestsCount': 3,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592017351705,
            'timeout': 27000,
            'refererInfo': {
              'referer': 'http://sportsillustrated.192.168.1.9.xip.io:9000/',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'http://sportsillustrated.192.168.1.9.xip.io:9000/'
              ],
              'canonicalUrl': 'https://www.si.com/'
            },
            'start': 1592017351713
          },
          {
            'bidderCode': 'sovrn',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'bidderRequestId': '515f49911de95af8',
            'bids': [
              {
                'bidder': 'sovrn',
                'params': {
                  'bidfloor': '0.10',
                  'tagid': '644735'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        728,
                        90
                      ]
                    ]
                  }
                },
                'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
                'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
                'sizes': [
                  [
                    728,
                    90
                  ]
                ],
                'bidId': '521c419177add6c',
                'bidderRequestId': '515f49911de95af8',
                'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
                'src': 'client',
                'bidRequestsCount': 3,
                'bidderRequestsCount': 3,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592017351705,
            'timeout': 27000,
            'refererInfo': {
              'referer': 'http://sportsillustrated.192.168.1.9.xip.io:9000/',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'http://sportsillustrated.192.168.1.9.xip.io:9000/'
              ],
              'canonicalUrl': 'https://www.si.com/'
            },
            'start': 1592017351714
          },
          {
            'bidderCode': 'sortable',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'bidderRequestId': '532f224df645cff',
            'bids': [
              {
                'bidder': 'sortable',
                'params': {
                  'floor': 0.1,
                  'siteId': 'www.si.com',
                  'tagId': 'fixed_bottom'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        728,
                        90
                      ]
                    ]
                  }
                },
                'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
                'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
                'sizes': [
                  [
                    728,
                    90
                  ]
                ],
                'bidId': '54da9bcd0e6e58f8',
                'bidderRequestId': '532f224df645cff',
                'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
                'src': 'client',
                'bidRequestsCount': 3,
                'bidderRequestsCount': 3,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592017351705,
            'timeout': 27000,
            'refererInfo': {
              'referer': 'http://sportsillustrated.192.168.1.9.xip.io:9000/',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'http://sportsillustrated.192.168.1.9.xip.io:9000/'
              ],
              'canonicalUrl': 'https://www.si.com/'
            },
            'start': 1592017351715
          },
          {
            'bidderCode': '33across',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'bidderRequestId': '55ad30c776f479c8',
            'bids': [
              {
                'bidder': '33across',
                'params': {
                  'siteId': 'b1EXDC3VKr6yoEaKkGJozW',
                  'productId': 'siab'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        728,
                        90
                      ]
                    ]
                  }
                },
                'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
                'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
                'sizes': [
                  [
                    728,
                    90
                  ]
                ],
                'bidId': '565b58c654c298c',
                'bidderRequestId': '55ad30c776f479c8',
                'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
                'src': 'client',
                'bidRequestsCount': 3,
                'bidderRequestsCount': 3,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592017351705,
            'timeout': 27000,
            'refererInfo': {
              'referer': 'http://sportsillustrated.192.168.1.9.xip.io:9000/',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'http://sportsillustrated.192.168.1.9.xip.io:9000/'
              ],
              'canonicalUrl': 'https://www.si.com/'
            },
            'start': 1592017351716
          }
        ],
        'noBids': [
          {
            'bidder': 'sovrn',
            'params': {
              'bidfloor': '0.10',
              'tagid': '644735'
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    728,
                    90
                  ]
                ]
              }
            },
            'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
            'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
            'sizes': [
              [
                728,
                90
              ]
            ],
            'bidId': '521c419177add6c',
            'bidderRequestId': '515f49911de95af8',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'src': 'client',
            'bidRequestsCount': 3,
            'bidderRequestsCount': 3,
            'bidderWinsCount': 0
          },
          {
            'bidder': 'sortable',
            'params': {
              'floor': 0.1,
              'siteId': 'www.si.com',
              'tagId': 'fixed_bottom'
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    728,
                    90
                  ]
                ]
              }
            },
            'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
            'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
            'sizes': [
              [
                728,
                90
              ]
            ],
            'bidId': '54da9bcd0e6e58f8',
            'bidderRequestId': '532f224df645cff',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'src': 'client',
            'bidRequestsCount': 3,
            'bidderRequestsCount': 3,
            'bidderWinsCount': 0
          },
          {
            'bidder': 'pubmatic',
            'params': {
              'adSlot': 'www.si.com_fixed_bottom_0_dt@728x90',
              'kadfloor': '0.10',
              'pmzoneid': 'www.si.com',
              'publisherId': '156229',
              'dctr': 'au1=sportsillustrated.192.168.1.9.xip.io|pod=13|au1=sportsillustrated.192.168.1.9.xip.io|pod=13|au1=sportsillustrated.192.168.1.9.xip.io|pod=13|au1=sportsillustrated.192.168.1.9.xip.io|pod=13'
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    728,
                    90
                  ]
                ]
              }
            },
            'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
            'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
            'sizes': [
              [
                728,
                90
              ]
            ],
            'bidId': '509d5df6b893fec8',
            'bidderRequestId': '493dcc5df87dc62',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'src': 'client',
            'bidRequestsCount': 3,
            'bidderRequestsCount': 3,
            'bidderWinsCount': 0
          },
          {
            'bidder': 'appnexus',
            'params': {
              'allowSmallerSizes': true,
              'reserve': 0.1,
              'invCode': 'www.si.com_fixed_bottom_0_dt',
              'member': '8186',
              'keywords': {
                'cm': 'tempest',
                'adzone': 'fixed_bottom',
                'index': 0,
                'adzoneindex': 'fixed_bottom_0',
                'siteadzoneindex': 'www.si.com_fixed_bottom_0',
                'path': '/',
                'pagetype': 'homepage',
                'cv': 'sports',
                'au1': 'sportsillustrated.192.168.1.9.xip.io',
                'pod': 13
              }
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    728,
                    90
                  ]
                ]
              }
            },
            'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
            'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
            'sizes': [
              [
                728,
                90
              ]
            ],
            'bidId': '48fb5e592b951c58',
            'bidderRequestId': '47501ed0d7e43e1',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'src': 'client',
            'bidRequestsCount': 3,
            'bidderRequestsCount': 3,
            'bidderWinsCount': 0
          },
          {
            'bidder': '33across',
            'params': {
              'siteId': 'b1EXDC3VKr6yoEaKkGJozW',
              'productId': 'siab'
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    728,
                    90
                  ]
                ]
              }
            },
            'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
            'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
            'sizes': [
              [
                728,
                90
              ]
            ],
            'bidId': '565b58c654c298c',
            'bidderRequestId': '55ad30c776f479c8',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'src': 'client',
            'bidRequestsCount': 3,
            'bidderRequestsCount': 3,
            'bidderWinsCount': 0
          },
          {
            'bidder': 'ix',
            'params': {
              'siteId': '414960',
              'id': 'www.si.com_fixed_bottom_0_dt',
              'size': [
                728,
                90
              ]
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    728,
                    90
                  ]
                ]
              }
            },
            'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
            'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
            'sizes': [
              [
                728,
                90
              ]
            ],
            'bidId': '4467d6e5a16adcd',
            'bidderRequestId': '439661490c5b7a68',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'src': 'client',
            'bidRequestsCount': 3,
            'bidderRequestsCount': 3,
            'bidderWinsCount': 0
          },
          {
            'bidder': 'rubicon',
            'params': {
              'accountId': 10348,
              'floor': 0.1,
              'siteId': 283708,
              'zoneId': 1419652,
              'inventory': {
                'au1': [
                  'sportsillustrated.192.168.1.9.xip.io'
                ],
                'pod': [
                  '13'
                ]
              }
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    728,
                    90
                  ]
                ]
              }
            },
            'adUnitCode': 'ad-42a6e2ce42724767a2288295baa68f98',
            'transactionId': '5119eb8c-48ef-467a-8ede-eb5862cf70b8',
            'sizes': [
              [
                728,
                90
              ]
            ],
            'bidId': '46e15874aa78708',
            'bidderRequestId': '4559774772c7f83',
            'auctionId': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
            'src': 'client',
            'bidRequestsCount': 3,
            'bidderRequestsCount': 3,
            'bidderWinsCount': 0,
            'startTime': 1592017351709
          }
        ],
        'bidsReceived': [],
        'winningBids': [],
        'timeout': 27000
      }
      const adapterConfig = {
        'provider': 'mavenDistributionAnalyticsAdapter',
        'options': {
          'contentItemId': 'tm-fake',
          'countryCode': 'US',
          'mavenChannel': 'www.si.com',
          'pod': '11',
          'productionDomain': 'www.si.com',
          'screenSize': 'B',
          'sampling': 1,
          'zoneMap': {
            'ad-42a6e2ce42724767a2288295baa68f98': {
              'zone': 'fixed_bottom',
              'index': 0
            }
          }
        }
      }
      const actualSummary = summarizeAuctionEnd(args, adapterConfig)
      const expectedSummary = {
        'auc': 'e0a2febe-dc05-4999-87ed-4c40022b6796',
        cpms: [0],
        zoneIndexes: [0],
        zoneNames: ['fixed_bottom'],
      }
      assert.deepEqual(actualSummary, expectedSummary)
    })
  });
  describe('createSendOptionsFromBatch', () => {
    it('should create batch json', () => {
      const actual = createSendOptionsFromBatch({
        auc: 'aaa',
        cpms: [0.04],
        zoneIndexes: [3],
        zoneNames: ['sidebar']
      })
      const expected = {batch: '{"auc":"aaa","cpms":[0.04],"zoneIndexes":[3],"zoneNames":["sidebar"]}'}
      assert.deepEqual(actual, expected)
    })
  })
});
