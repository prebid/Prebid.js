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
    it('should include adUnit.code if zoneMap is not given', () => {
      const mavenArgs = {
        'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
        'timestamp': 1592938047397,
        'auctionEnd': 1592938048399,
        'auctionStatus': 'completed',
        'adUnits': [
          {
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'member': 8186,
                  'invCode': 'theintellectualist_ATF_WIDE_DT',
                  'keywords': {
                    'cm': 'salish',
                    'channel': 'web',
                    'lang': 'en',
                    'path': '/theintellectualist/',
                    'terms': [
                      'Current',
                      'Events',
                      'Culture',
                      'Science'
                    ],
                    'referrer': '',
                    'loggedin': '0',
                    'pd': 'mavenroundtable.io',
                    'mc': 'theintellectualist',
                    'cv': 'politics',
                    'pod': 'undefined',
                    'pagetype': 'homepage',
                    'au1': 'mavenroundtable.io',
                    'au2': 'mavenroundtable.io/theintellectualist'
                  },
                  'reserve': 0.1
                }
              },
              {
                'bidder': 'sortable',
                'params': {
                  'siteId': 'mavenroundtable.io',
                  'tagId': 'theintellectualist_ATF_WIDE_DT',
                  'floor': 0.1
                }
              },
              {
                'bidder': 'rubicon',
                'params': {
                  'accountId': 10348,
                  'siteId': 246510,
                  'zoneId': 1218204,
                  'sizes': [
                    2,
                    57
                  ],
                  'inventory': {
                    'cm': 'salish',
                    'channel': 'web',
                    'lang': 'en',
                    'path': '/theintellectualist/',
                    'terms': [
                      'Current',
                      'Events',
                      'Culture',
                      'Science'
                    ],
                    'referrer': '',
                    'loggedin': '0',
                    'pd': 'mavenroundtable.io',
                    'mc': 'theintellectualist',
                    'cv': 'politics',
                    'pod': 'undefined',
                    'pagetype': 'homepage',
                    'currentChannelKey': 'theintellectualist',
                    'currentRoomKey': '',
                    'currentConversationId': ''
                  },
                  'keywords': [
                    'Current',
                    'Events',
                    'Culture',
                    'Science'
                  ],
                  'floor': 0.1
                }
              },
              {
                'bidder': 'ix',
                'params': {
                  'siteId': '372767',
                  'id': '02',
                  'size': [
                    970,
                    250
                  ]
                }
              },
              {
                'bidder': 'onedisplay',
                'params': {
                  'id': 'gpt-slot-channel-banner-top',
                  'network': '11402.1',
                  'placement': '4790217',
                  'bidFloor': '0.1'
                }
              },
              {
                'bidder': 'openx',
                'params': {
                  'id': 'gpt-slot-channel-banner-top',
                  'delDomain': 'the-maven-d.openx.net',
                  'unit': '539899482',
                  'customFloor': 0.1
                }
              },
              {
                'bidder': 'sovrn',
                'params': {
                  'id': 'gpt-slot-channel-banner-top',
                  'tagid': 558069,
                  'bidfloor': '0.1'
                }
              },
              {
                'bidder': 'synacormedia',
                'params': {
                  'placementId': '83040',
                  'seatId': 'maven',
                  'bidfloor': 0.1
                }
              }
            ],
            'code': 'gpt-slot-channel-banner-top',
            'sizes': [
              [
                970,
                250
              ],
              [
                970,
                90
              ],
              [
                728,
                90
              ],
              [
                1,
                1
              ]
            ],
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'smallerSizes': [
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ]
              }
            },
            'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766'
          }
        ],
        'adUnitCodes': [
          'gpt-slot-channel-banner-top'
        ],
        'bidderRequests': [
          {
            'bidderCode': 'sovrn',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'bidderRequestId': '1ae9ee7061e77a',
            'bids': [
              {
                'bidder': 'sovrn',
                'params': {
                  'id': 'gpt-slot-channel-banner-top',
                  'tagid': 558069,
                  'bidfloor': '0.1'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        970,
                        250
                      ],
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ],
                    'smallerSizes': [
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ]
                  }
                },
                'adUnitCode': 'gpt-slot-channel-banner-top',
                'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766',
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'bidId': '26c635a0fc63dd',
                'bidderRequestId': '1ae9ee7061e77a',
                'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592938047397,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'https://mavenroundtable.io/theintellectualist/?debugAds=1',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'https://mavenroundtable.io/theintellectualist/?debugAds=1'
              ],
              'canonicalUrl': 'https://mavenroundtable.io/theintellectualist/'
            },
            'start': 1592938047399
          },
          {
            'bidderCode': 'ix',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'bidderRequestId': '34f53091b5daae',
            'bids': [
              {
                'bidder': 'ix',
                'params': {
                  'siteId': '372767',
                  'id': '02',
                  'size': [
                    970,
                    250
                  ]
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        970,
                        250
                      ],
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ],
                    'smallerSizes': [
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ]
                  }
                },
                'adUnitCode': 'gpt-slot-channel-banner-top',
                'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766',
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'bidId': '4df5b4ff8d61ac',
                'bidderRequestId': '34f53091b5daae',
                'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592938047397,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'https://mavenroundtable.io/theintellectualist/?debugAds=1',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'https://mavenroundtable.io/theintellectualist/?debugAds=1'
              ],
              'canonicalUrl': 'https://mavenroundtable.io/theintellectualist/'
            },
            'start': 1592938047402
          },
          {
            'bidderCode': 'appnexus',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'bidderRequestId': '5048c8b29090bf',
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'member': 8186,
                  'invCode': 'theintellectualist_ATF_WIDE_DT',
                  'keywords': {
                    'cm': 'salish',
                    'channel': 'web',
                    'lang': 'en',
                    'path': '/theintellectualist/',
                    'terms': [
                      'Current',
                      'Events',
                      'Culture',
                      'Science'
                    ],
                    'referrer': '',
                    'loggedin': '0',
                    'pd': 'mavenroundtable.io',
                    'mc': 'theintellectualist',
                    'cv': 'politics',
                    'pod': 'undefined',
                    'pagetype': 'homepage',
                    'au1': 'mavenroundtable.io',
                    'au2': 'mavenroundtable.io/theintellectualist'
                  },
                  'reserve': 0.1
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        970,
                        250
                      ],
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ],
                    'smallerSizes': [
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ]
                  }
                },
                'adUnitCode': 'gpt-slot-channel-banner-top',
                'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766',
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'bidId': '6deb33e0ac92e6',
                'bidderRequestId': '5048c8b29090bf',
                'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592938047397,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'https://mavenroundtable.io/theintellectualist/?debugAds=1',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'https://mavenroundtable.io/theintellectualist/?debugAds=1'
              ],
              'canonicalUrl': 'https://mavenroundtable.io/theintellectualist/'
            },
            'start': 1592938047404
          },
          {
            'bidderCode': 'rubicon',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'bidderRequestId': '72b17afe250efd',
            'bids': [
              {
                'bidder': 'rubicon',
                'params': {
                  'accountId': 10348,
                  'siteId': 246510,
                  'zoneId': 1218204,
                  'sizes': [
                    2,
                    57
                  ],
                  'inventory': {
                    'cm': 'salish',
                    'channel': 'web',
                    'lang': 'en',
                    'path': '/theintellectualist/',
                    'terms': [
                      'Current',
                      'Events',
                      'Culture',
                      'Science'
                    ],
                    'referrer': '',
                    'loggedin': '0',
                    'pd': 'mavenroundtable.io',
                    'mc': 'theintellectualist',
                    'cv': 'politics',
                    'pod': 'undefined',
                    'pagetype': 'homepage',
                    'currentChannelKey': 'theintellectualist',
                    'currentRoomKey': '',
                    'currentConversationId': ''
                  },
                  'keywords': [
                    'Current',
                    'Events',
                    'Culture',
                    'Science'
                  ],
                  'floor': 0.1
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        970,
                        250
                      ],
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ],
                    'smallerSizes': [
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ]
                  }
                },
                'adUnitCode': 'gpt-slot-channel-banner-top',
                'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766',
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'bidId': '8fabbb21e3eb25',
                'bidderRequestId': '72b17afe250efd',
                'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0,
                'startTime': 1592938047408
              }
            ],
            'auctionStart': 1592938047397,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'https://mavenroundtable.io/theintellectualist/?debugAds=1',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'https://mavenroundtable.io/theintellectualist/?debugAds=1'
              ],
              'canonicalUrl': 'https://mavenroundtable.io/theintellectualist/'
            },
            'start': 1592938047408
          },
          {
            'bidderCode': 'sortable',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'bidderRequestId': '9869668ae743b7',
            'bids': [
              {
                'bidder': 'sortable',
                'params': {
                  'siteId': 'mavenroundtable.io',
                  'tagId': 'theintellectualist_ATF_WIDE_DT',
                  'floor': 0.1
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        970,
                        250
                      ],
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ],
                    'smallerSizes': [
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ]
                  }
                },
                'adUnitCode': 'gpt-slot-channel-banner-top',
                'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766',
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'bidId': '101ca28cc11ed08',
                'bidderRequestId': '9869668ae743b7',
                'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592938047397,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'https://mavenroundtable.io/theintellectualist/?debugAds=1',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'https://mavenroundtable.io/theintellectualist/?debugAds=1'
              ],
              'canonicalUrl': 'https://mavenroundtable.io/theintellectualist/'
            },
            'start': 1592938047410
          },
          {
            'bidderCode': 'onedisplay',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'bidderRequestId': '1153b6d19304f1c',
            'bids': [
              {
                'bidder': 'onedisplay',
                'params': {
                  'id': 'gpt-slot-channel-banner-top',
                  'network': '11402.1',
                  'placement': '4790217',
                  'bidFloor': '0.1',
                  'region': 'us'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        970,
                        250
                      ],
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ],
                    'smallerSizes': [
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ]
                  }
                },
                'adUnitCode': 'gpt-slot-channel-banner-top',
                'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766',
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'bidId': '12fa97c36b07734',
                'bidderRequestId': '1153b6d19304f1c',
                'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592938047397,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'https://mavenroundtable.io/theintellectualist/?debugAds=1',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'https://mavenroundtable.io/theintellectualist/?debugAds=1'
              ],
              'canonicalUrl': 'https://mavenroundtable.io/theintellectualist/'
            },
            'start': 1592938047411
          },
          {
            'bidderCode': 'openx',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'bidderRequestId': '13d7576afcec595',
            'bids': [
              {
                'bidder': 'openx',
                'params': {
                  'id': 'gpt-slot-channel-banner-top',
                  'delDomain': 'the-maven-d.openx.net',
                  'unit': '539899482',
                  'customFloor': 0.1
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        970,
                        250
                      ],
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ],
                    'smallerSizes': [
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ]
                  }
                },
                'adUnitCode': 'gpt-slot-channel-banner-top',
                'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766',
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'bidId': '14e98697888c519',
                'bidderRequestId': '13d7576afcec595',
                'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592938047397,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'https://mavenroundtable.io/theintellectualist/?debugAds=1',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'https://mavenroundtable.io/theintellectualist/?debugAds=1'
              ],
              'canonicalUrl': 'https://mavenroundtable.io/theintellectualist/'
            },
            'start': 1592938047413
          },
          {
            'bidderCode': 'synacormedia',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'bidderRequestId': '15bb34bd0bcabe5',
            'bids': [
              {
                'bidder': 'synacormedia',
                'params': {
                  'placementId': '83040',
                  'seatId': 'maven',
                  'bidfloor': 0.1
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [
                        970,
                        250
                      ],
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ],
                    'smallerSizes': [
                      [
                        970,
                        90
                      ],
                      [
                        728,
                        90
                      ],
                      [
                        1,
                        1
                      ]
                    ]
                  }
                },
                'adUnitCode': 'gpt-slot-channel-banner-top',
                'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766',
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'bidId': '161ae75e90aabac',
                'bidderRequestId': '15bb34bd0bcabe5',
                'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1592938047397,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'https://mavenroundtable.io/theintellectualist/?debugAds=1',
              'reachedTop': true,
              'numIframes': 0,
              'stack': [
                'https://mavenroundtable.io/theintellectualist/?debugAds=1'
              ],
              'canonicalUrl': 'https://mavenroundtable.io/theintellectualist/'
            },
            'start': 1592938047415
          }
        ],
        'noBids': [
          {
            'bidder': 'openx',
            'params': {
              'id': 'gpt-slot-channel-banner-top',
              'delDomain': 'the-maven-d.openx.net',
              'unit': '539899482',
              'customFloor': 0.1
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'smallerSizes': [
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ]
              }
            },
            'adUnitCode': 'gpt-slot-channel-banner-top',
            'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766',
            'sizes': [
              [
                970,
                250
              ],
              [
                970,
                90
              ],
              [
                728,
                90
              ],
              [
                1,
                1
              ]
            ],
            'bidId': '14e98697888c519',
            'bidderRequestId': '13d7576afcec595',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          },
          {
            'bidder': 'rubicon',
            'params': {
              'accountId': 10348,
              'siteId': 246510,
              'zoneId': 1218204,
              'sizes': [
                2,
                57
              ],
              'inventory': {
                'cm': 'salish',
                'channel': 'web',
                'lang': 'en',
                'path': '/theintellectualist/',
                'terms': [
                  'Current',
                  'Events',
                  'Culture',
                  'Science'
                ],
                'referrer': '',
                'loggedin': '0',
                'pd': 'mavenroundtable.io',
                'mc': 'theintellectualist',
                'cv': 'politics',
                'pod': 'undefined',
                'pagetype': 'homepage',
                'currentChannelKey': 'theintellectualist',
                'currentRoomKey': '',
                'currentConversationId': ''
              },
              'keywords': [
                'Current',
                'Events',
                'Culture',
                'Science'
              ],
              'floor': 0.1
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    970,
                    250
                  ],
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ],
                'smallerSizes': [
                  [
                    970,
                    90
                  ],
                  [
                    728,
                    90
                  ],
                  [
                    1,
                    1
                  ]
                ]
              }
            },
            'adUnitCode': 'gpt-slot-channel-banner-top',
            'transactionId': '0bf13482-1a89-4ad4-abab-1793048ed766',
            'sizes': [
              [
                970,
                250
              ],
              [
                970,
                90
              ],
              [
                728,
                90
              ],
              [
                1,
                1
              ]
            ],
            'bidId': '8fabbb21e3eb25',
            'bidderRequestId': '72b17afe250efd',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0,
            'startTime': 1592938047408
          }
        ],
        'bidsReceived': [
          {
            'bidderCode': 'sovrn',
            'width': 970,
            'height': 250,
            'statusMessage': 'Bid available',
            'adId': '20d6c5a89158201',
            'requestId': '26c635a0fc63dd',
            'mediaType': 'banner',
            'source': 'client',
            'cpm': 0.29779398900000004,
            'creativeId': '2kvkkyia',
            'dealId': null,
            'currency': 'USD',
            'netRevenue': true,
            'ad': "<img src=\"https://usw-ca2.adsrvr.org/bid/feedback/federatedmedia?iid=dc6c260b-4c01-4e2d-824e-b6eed24641af&crid=2kvkkyia&wp=0.367646&aid=1&wpc=USD&sfe=1129ce3f&puid=&tdid=71cf544f-ab8d-4baf-a2d2-35d4bdaf7a44&pid=4zo99kk&ag=4ranvqk&adv=dppw33q&sig=1z51usgLuaQkeXC3DMS_N_augjA5GSKNKMmhD8afPWbU.&bp=0.4191174769001722960317980306&cf=1390599&fq=0&td_s=mavenroundtable.io&rcats=&mcat=&mste=mavenroundtable.io&mfld=4&mssi=None&mfsi=m6nx7ip3b3&uhow=59&agsa=&rgco=United%20States&rgre=California&rgme=807&rgci=San%20Francisco&rgz=94134&svbttd=1&dt=PC&osf=OSX&os=Other&br=Chrome&rlangs=en&mlang=&svpid=261511&did=&rcxt=Other&lat=37.718300&lon=-122.410301&tmpc=17.85&daid=&vp=0&osi=&osv=&mk=Apple&mdl=Chrome%20-%20OS%20X&c=OAFQAQ..&dur=CiYKDWNoYXJnZS1hbGwtMTgiFQju__________8BEghpYXhkMDAyYwpkCgd6czhmbnExEI9tIhMI0_GRbBIMZGFzdDk3NW1zdHJ5IhUI78efdRIOZGEwNDAyMjB0ZWRhY3giFAjEofB2Eg1sZHMxMTJwcmVjaXNlIhQI5aPwdhINbGRzMTEycHJlY2lzZQowCgxjaGFyZ2UtYWxsLTEiIAj___________8BEhN0dGRfZGF0YV9leGNsdXNpb25zCjgKHmNoYXJnZS1hbGxHcmFwZXNob3RCcmFuZFNhZmV0eSIWCPb__________wESCWdyYXBlc2hvdBCPbQ..&crrelr=&ipl=558069&pcm=1&vc=2&said=14d52004-bf8a-43ce-bb1c-6f8ffaeb1f22&ict=Unknown&auct=1&us_privacy=1---Missing&im=1\" width=\"1\" height=\"1\" style=\"display: none;\"/><noscript>\r\n\r\n<a href=\"http://insight.adsrvr.org/track/clk?imp=dc6c260b-4c01-4e2d-824e-b6eed24641af&ag=4ranvqk&sfe=1129ce3f&sig=33x-bLScLPSyDUh25dLcXjUVOirW9k5p0lwJwBuX0jI.&crid=2kvkkyia&cf=1390599&fq=0&td_s=mavenroundtable.io&rcats=&mcat=&mste=mavenroundtable.io&mfld=4&mssi=None&mfsi=m6nx7ip3b3&sv=federatedmedia&uhow=59&agsa=&wp=0.367646&rgco=United%20States&rgre=California&rgme=807&rgci=San%20Francisco&rgz=94134&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=261511&rlangs=en&mlang=&did=&rcxt=Other&tmpc=17.85&vrtd=&osi=&osv=&daid=&dnr=0&vpb=&c=OAFQAQ..&dur=CiYKDWNoYXJnZS1hbGwtMTgiFQju__________8BEghpYXhkMDAyYwpkCgd6czhmbnExEI9tIhMI0_GRbBIMZGFzdDk3NW1zdHJ5IhUI78efdRIOZGEwNDAyMjB0ZWRhY3giFAjEofB2Eg1sZHMxMTJwcmVjaXNlIhQI5aPwdhINbGRzMTEycHJlY2lzZQowCgxjaGFyZ2UtYWxsLTEiIAj___________8BEhN0dGRfZGF0YV9leGNsdXNpb25zCjgKHmNoYXJnZS1hbGxHcmFwZXNob3RCcmFuZFNhZmV0eSIWCPb__________wESCWdyYXBlc2hvdBCPbQ..&crrelr=&npt=&svscid=558069&mk=Apple&mdl=Chrome%20-%20OS%20X&ipl=558069&pcm=1&ict=Unknown&said=14d52004-bf8a-43ce-bb1c-6f8ffaeb1f22&auct=1&us_privacy=1---Missing&r=https://servedby.flashtalking.com/click/8/112891;4695669;0;209;0/?ft_width=970&ft_height=250&url=27955917\" target=\"_blank\">\r\n\r\n<img border=\"0\" src=\"https://servedby.flashtalking.com/imp/8/112891;4695669;205;gif;TheTradeDesk;CRDCU000000XXXXXXXXXXXHighxCLVxPredXXXXXCOUSADWXENWWWXOAJUEGEVENH5970X250/?\"></a>\r\n\r\n</noscript>\r\n\r\n<script language=\"Javascript1.1\" type=\"text/javascript\">\r\n\r\nvar ftClick = \"http://insight.adsrvr.org/track/clk?imp=dc6c260b-4c01-4e2d-824e-b6eed24641af&ag=4ranvqk&sfe=1129ce3f&sig=33x-bLScLPSyDUh25dLcXjUVOirW9k5p0lwJwBuX0jI.&crid=2kvkkyia&cf=1390599&fq=0&td_s=mavenroundtable.io&rcats=&mcat=&mste=mavenroundtable.io&mfld=4&mssi=None&mfsi=m6nx7ip3b3&sv=federatedmedia&uhow=59&agsa=&wp=0.367646&rgco=United%20States&rgre=California&rgme=807&rgci=San%20Francisco&rgz=94134&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=261511&rlangs=en&mlang=&did=&rcxt=Other&tmpc=17.85&vrtd=&osi=&osv=&daid=&dnr=0&vpb=&c=OAFQAQ..&dur=CiYKDWNoYXJnZS1hbGwtMTgiFQju__________8BEghpYXhkMDAyYwpkCgd6czhmbnExEI9tIhMI0_GRbBIMZGFzdDk3NW1zdHJ5IhUI78efdRIOZGEwNDAyMjB0ZWRhY3giFAjEofB2Eg1sZHMxMTJwcmVjaXNlIhQI5aPwdhINbGRzMTEycHJlY2lzZQowCgxjaGFyZ2UtYWxsLTEiIAj___________8BEhN0dGRfZGF0YV9leGNsdXNpb25zCjgKHmNoYXJnZS1hbGxHcmFwZXNob3RCcmFuZFNhZmV0eSIWCPb__________wESCWdyYXBlc2hvdBCPbQ..&crrelr=&npt=&svscid=558069&mk=Apple&mdl=Chrome%20-%20OS%20X&ipl=558069&pcm=1&ict=Unknown&said=14d52004-bf8a-43ce-bb1c-6f8ffaeb1f22&auct=1&us_privacy=1---Missing&r=\";\r\n\r\nvar ftLat = \"37.7182998657227\";\r\n\r\nvar ftLong = \"-122.410301208496\";\r\n\r\nvar ftLatLong = \"&ft_lat=\"+encodeURIComponent(ftLat)+\"&ft_long=\"+encodeURIComponent(ftLong);\r\n\r\nvar ftExpTrack_4695669 = \"\";\r\n\r\nvar ftX = \"\";\r\n\r\nvar ftY = \"\";\r\n\r\nvar ftZ = \"\";\r\n\r\nvar ftOBA = 1;\r\n\r\nvar ftContent = \"\";\r\n\r\nvar ftCustom = \"\";\r\n\r\nvar ft970x250_OOBclickTrack = \"\";\r\n\r\nvar ftRandom = Math.random()*1000000;\r\n\r\nvar ftBuildTag1 = \"<scr\";\r\n\r\nvar ftBuildTag2 = \"</\";\r\n\r\nvar ftClick_4695669 = ftClick;\r\n\r\nif(typeof(ft_referrer)==\"undefined\"){var ft_referrer=(function(){var r=\"\";if(window==top){r=window.location.href;}else{try{r=window.parent.location.href;}catch(e){}r=(r)?r:document.referrer;}while(encodeURIComponent(r).length>1000){r=r.substring(0,r.length-1);}return r;}());}\r\n\r\nvar ftDomain = (window==top)?\"\":(function(){var d=document.referrer,h=(d)?d.match(\"(?::q/q/)+([qw-]+(q.[qw-]+)+)(q/)?\".replace(/q/g,decodeURIComponent(\"%\"+\"5C\")))[1]:\"\";return (h&&h!=location.host)?\"&ft_ifb=1&ft_domain=\"+encodeURIComponent(h):\"\";}());\r\n\r\nvar ftTag = ftBuildTag1 + 'ipt language=\"javascript1.1\" type=\"text/javascript\" ';\r\n\r\nftTag += 'src=\"https://servedby.flashtalking.com/imp/8/112891;4695669;201;js;TheTradeDesk;CRDCU000000XXXXXXXXXXXHighxCLVxPredXXXXXCOUSADWXENWWWXOAJUEGEVENH5970X250/?ftx='+ftX+'&fty='+ftY+'&ftadz='+ftZ+'&ftscw='+ftContent+'&ft_custom='+ftCustom+'&ftOBA='+ftOBA+ftDomain+'&ft_agentEnv='+(window.mraid||window.ormma?'1':'0')+ftLatLong+'&ft_referrer='+encodeURIComponent(ft_referrer)+'&cachebuster='+ftRandom+'\" id=\"ftscript_970x250\" name=\"ftscript_970x250\"';\r\n\r\nftTag += '>' + ftBuildTag2 + 'script>';\r\n\r\ndocument.write(ftTag);\r\n\r\n</script>\r\n\r\n\r\n\r\n\r\n\r\n<script type='text/javascript'>\nurl='https://vap1sfo1.lijit.com/res/sovrn.containertag.new.min.js?cid=3&zid=558069&v=4&tid=a_558069_58a99ee1316848fa877de2929990f59c&loc=https://mavenroundtable.io/theintellectualist/?debugAds=1&gdpr_flag=',\nscr=document.createElement('script');\nscr.id='ct-a_558069_58a99ee1316848fa877de2929990f59c',\nscr.src=url,scr.type='application/javascript',scr.async=!1;\nvar s0=document.getElementsByTagName('script')[0];\ns0.parentNode.insertBefore(scr,s0);\n</script><img src=\"https://vap1sfo1.lijit.com/rtb/impression?bannerid=107518&campaignid=1802&rtb_tid=14d52004-bf8a-43ce-bb1c-6f8ffaeb1f22&rpid=27&seatid=2979&zoneid=558069&cb=66153823&tid=a_558069_58a99ee1316848fa877de2929990f59c\">",
            'ttl': 60,
            'originalCpm': 0.29779398900000004,
            'originalCurrency': 'USD',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'responseTimestamp': 1592938047626,
            'requestTimestamp': 1592938047399,
            'bidder': 'sovrn',
            'adUnitCode': 'gpt-slot-channel-banner-top',
            'timeToRespond': 227,
            'pbLg': '0.00',
            'pbMg': '0.20',
            'pbHg': '0.29',
            'pbAg': '0.25',
            'pbDg': '0.29',
            'pbCg': '0.29',
            'size': '970x250',
            'adserverTargeting': {
              'hb_bidder': 'sovrn',
              'hb_adid': '20d6c5a89158201',
              'hb_pb': '0.29',
              'hb_size': '970x250',
              'hb_source': 'client',
              'hb_format': 'banner'
            }
          },
          {
            'bidderCode': 'ix',
            'width': 970,
            'height': 250,
            'statusMessage': 'Bid available',
            'adId': '211f7989d74f948',
            'requestId': '4df5b4ff8d61ac',
            'mediaType': 'banner',
            'source': 'client',
            'cpm': 0.76,
            'netRevenue': true,
            'currency': 'USD',
            'creativeId': '11884121',
            'ad': "<iframe src=\"https://a059.casalemedia.com/ifnotify?c=B55659&r=C601D002&t=5EF24E3F&u=Vm9yVGxNQW9JcU1BQUE4cFU2RUFBQUJo&m=72644578df81b4a0260c89d33712ea15&wp=60&aid=CB2CBFC01DE2B68D&tid=101CA&s=5B01F&cp=0.96&n=mavenroundtable.io&pr=xx&sid=a515-a536-cbbe&epr=34f53091b5daae\" width=\"0\" height=\"0\" frameborder=\"0\" scrolling=\"no\" style=\"display:none;\" marginheight=\"0\" marginwidth=\"0\"></iframe><iframe id='cf575747' name='cf575747' src='https://ads.us.criteo.com/delivery/r/afr.php?did=5ef24e3ff68fefaa5c660b10007bdf00&z=XvJOPwAAAAAfq17vkuKVg7YL15McHk_ky54IAg&u=%7CoaRfR1ymJd%2Fp5gMcZNJzFpCI7UybunjF1JRZLK0gQFk%3D%7C&c1=YJ4X_nXZn4OeUUNMkYA5OQhHMeZ5tRG1YSzI2SvkwhEXFThTHdOdnT9ivyj7NFCdpHE7Gv9rZpfVjGi-a6h05diABqYlLKye-8vrFFpaPnnhfkrEFqAY_bUNjn0va1smyZax_b0s7iv1_MjetfW1GVWacPJTiG7L3Qawz1-N4jkmE0nUQRIdJxSRFVtx7XYf8K9h_dSq-5DOUqOpvsdoj0wN0xLN0PT-GIEXy1sFFS4M61QbpvVZ2ihb_USWjCPyH1BuFA7ERo5vHuJxSLUQxFNFIX9W4FALchDocg_RJclCZAbMGlWoKIHPo5YWpfV9nqy5XSbazdeEA9ZJYJ65dhi-P_kw7FRMaYaJjowCwNLNhX1s-97KEOjsVNKe8wY26F8kzQ9VRitrP6oBNLYkgi97KgSXPyReEt3UxwGFhqh-DGBjo2Wrfznt1EpsnH4NO7iy6B14w7Q' framespacing='0' frameborder='no' scrolling='no' width='970' height='250'></iframe>",
            'ttl': 300,
            'meta': {
              'networkId': 155,
              'brandId': 50453,
              'brandName': '1000Bulbs.com'
            },
            'originalCpm': 0.76,
            'originalCurrency': 'USD',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'responseTimestamp': 1592938047707,
            'requestTimestamp': 1592938047402,
            'bidder': 'ix',
            'adUnitCode': 'gpt-slot-channel-banner-top',
            'timeToRespond': 305,
            'pbLg': '0.50',
            'pbMg': '0.70',
            'pbHg': '0.76',
            'pbAg': '0.75',
            'pbDg': '0.76',
            'pbCg': '0.76',
            'size': '970x250',
            'adserverTargeting': {
              'hb_bidder': 'ix',
              'hb_adid': '211f7989d74f948',
              'hb_pb': '0.76',
              'hb_size': '970x250',
              'hb_source': 'client',
              'hb_format': 'banner'
            }
          },
          {
            'bidderCode': 'sortable',
            'width': 728,
            'height': 90,
            'statusMessage': 'Bid available',
            'adId': '2240558913d3991',
            'requestId': '101ca28cc11ed08',
            'mediaType': 'banner',
            'source': 'client',
            'cpm': 0.192247,
            'creativeId': '1833449',
            'dealId': null,
            'currency': 'USD',
            'netRevenue': true,
            'ttl': 60,
            'ad': "<!DOCTYPE html><img src=\"https://exch.quantserve.com/pixel/p-6p2Gg_m8anDhH.gif?us_privacy=1NNN&media=ad&p=0.229686&r=607959&rand=28985&labels=_qc.imp,_imp.adserver.rtb,_imp.qccampaign.798447,_imp.flight.788218,_imp.lineitem.702801&rtbip=192.184.70.29&rtbdata2=EBcaF01ldGhvZF9NZW5fVGVzdF9RMl8yMDIwIO_dMCjR8iow6fNvOhpodHRwczovL21hdmVucm91bmR0YWJsZS5pb1ooLUM3QlJQdDl4VXJnZThOTXJucU5UUFFvbHhqZ0tNVVlxQ2c0eVJ0U3XG4GdBgAH7ps7aB6ABAagBjZzIBLoBDHFjYmV6MXI3cHg1acABtoIOyAHd0IaUri7aARBjdGxjZHRoa2Y1cWFpPT095QFewkE86AFkmAL6jTCwAgi6AgTAuEYdwAICyAIA0ALO4Yb7-J_3zKkB4AIA6AIA-AIAigMEMTA2NZIDCHNvcnRhYmxlmAMAqAMAsgMEYiE5ANgDueIB4gMPcC02cDJHZ19tOGFuRGhI6gMFCNgFEFryAwU5NDEzNPgDAIAEAYoEDXF1YW50Y2FzdC1xYzE\" style=\"display: none;\" border=\"0\" height=\"1\" width=\"1\" alt=\"Quantcast\"/>\n<div style=\"height: 90px; width: 728px; display: table-cell; vertical-align: middle;\">\n  <div style=\"width: 728px; margin-left: auto; margin-right: auto;\">\n  \n    <div id=\"qc-ad-size\" class=\"qc-ad-728x90\">\n      <link href=\"https://content.quantcount.com/adchoices/v2/css/728x90.css\" rel=\"stylesheet\" type=\"text/css\"/>\n      <!--[if lte IE 8]>\n      <link href=\"https://content.quantcount.com/adchoices/v2/css/ie.css\" rel=\"stylesheet\" type=\"text/css\"/>\n      <![endif]-->\n      <!--[if lte IE 6]>\n      <link href=\"https://content.quantcount.com/adchoices/v2/css/ie6.css\" rel=\"stylesheet\" type=\"text/css\"/>\n      <![endif]-->\n      <div class=\"quantcast-ad-div\">\n        <ins class='dcmads' style='display:inline-block;width:728px;height:90px'\n    data-dcm-placement='N1162611.151350QUANTCAST/B24063886.272405242'\n    data-dcm-rendering-mode='iframe'\n    data-dcm-https-only\n    data-dcm-resettable-device-id=''\n    data-dcm-app-id=''\n    data-dcm-click-tracker='http://exch.quantserve.com/r?us_privacy=1NNN&a=p-6p2Gg_m8anDhH&labels=_qc.clk,_click.adserver.rtb,_click.rand.28985&rtbip=192.184.70.29&rtbdata2=EBcaF01ldGhvZF9NZW5fVGVzdF9RMl8yMDIwIO_dMCjR8iow6fNvOhpodHRwczovL21hdmVucm91bmR0YWJsZS5pb1ooLUM3QlJQdDl4VXJnZThOTXJucU5UUFFvbHhqZ0tNVVlxQ2c0eVJ0U3XG4GdBgAH7ps7aB6ABAagBjZzIBLoBDHFjYmV6MXI3cHg1acABtoIOyAHd0IaUri7aARBjdGxjZHRoa2Y1cWFpPT095QFewkE86AFkmAL6jTCwAgi6AgTAuEYdwAICyAIA0ALO4Yb7-J_3zKkB4AIA6AIA-AIAigMEMTA2NZIDCHNvcnRhYmxlmAMAqAMAsgMEYiE5ANgDueIB4gMPcC02cDJHZ19tOGFuRGhI6gMFCNgFEFryAwU5NDEzNPgDAIAEAYoEDXF1YW50Y2FzdC1xYzE&redirecturl2='>\n  <script src='https://fw.adsafeprotected.com/rjss/www.googletagservices.com/420331/45379085/dcm/dcmads.js?adsafe_preview=&adsafe_pb=https%3A%2F%2Fassets.quantcount.com%2Fpsa%2Fus%2F728x90.js%3Faid%3DbPlmB2v5Yg9puHsFZrA3WVMYWrA=%26accid%3Dp-6p2Gg_m8anDhH%26cid%3D1833449'></script>\n</ins>\n      </div>\n      <a class=\"qc-adchoices-link top-right \" href=\"https://pixel.quantcount.com/r?a=p-9fYuixa7g_Hm2;rand=28985;labels=_click.creative.iab,_qc.iab.clk.p-6p2Gg_m8anDhH.702801.1833449;redirecturl2=http://www.quantcast.com/adchoices\" target=\"_blank\">\n        <div class=\"qc-adchoices top-right \">\n          <span class=\"qc-adchoices-text\">AdChoices</span>\n          <img class=\"qc-adchoices-icon\" width=12 height=12 src=\"https://content.quantcount.com/adchoices/img/adc.png\"/>\n        </div>\n      </a>\n      <div class=\"border-div\"></div>\n    </div>\n\n  <img src=\"https://pixel.quantcount.com/pixel/p-9fYuixa7g_Hm2.gif?labels=_imp.creative.iab,_qc.iab.imp.p-6p2Gg_m8anDhH.702801.1833449\" style=\"display: none;\" border=\"0\" height=\"1\" width=\"1\" alt=\"Quantcast\"/>\n  <script src=\"https://z.moatads.com/quantcastv2691176990399/moatad.js#moatClientLevel1=p-6p2Gg_m8anDhH&moatClientLevel2=798447&moatClientLevel3=702801&moatClientLevel4=1833449&uid=bPlmB2v5Yg9puHsFZrA3WVMYWrA=\" type=\"text/javascript\"></script>\n  </div>\n</div>\n<script>window.deployads_ssc_vparams={s:'mavenroundtable.io',d:'D',a:'ctlcdthkf5vpg',i:0,b:'101ca28cc11ed08ba728x90',t:'theintellectualist_ATF_WIDE_DT',yO:0.0,tD:0.0,w:728,h:90}</script><script src=\"//assets.deployads.com/ssc/vw/116.js\"></script><div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"https://c.deployads.com/a/1/ctlcdthkf5vpg/101ca28cc11ed08/QANT/2743/t/eyJ1IjoiaHR0cHM6Ly91cy13ZXN0LW5vdGlmeS1ydGIucXVhbnRzZXJ2ZS5jb206ODQ0My9zb3J0YWJsZV9ub3RpZnk_d2luUHJpY2U9MC4yMjk2ODYmcnRiZGF0YTI9RUJjdzZmTnZpZ01FTVRBMk5aSURDSE52Y25SaFlteGwmbm90aWZpY2F0aW9uVHlwZT13aW4mbGFiZWxzPV9xYy5ub3RpZmljYXRpb24iLCJjIjoiUUFOVCJ9/n\"></div>",
            'originalCpm': 0.192247,
            'originalCurrency': 'USD',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'responseTimestamp': 1592938047721,
            'requestTimestamp': 1592938047410,
            'bidder': 'sortable',
            'adUnitCode': 'gpt-slot-channel-banner-top',
            'timeToRespond': 311,
            'pbLg': '0.00',
            'pbMg': '0.10',
            'pbHg': '0.19',
            'pbAg': '0.15',
            'pbDg': '0.19',
            'pbCg': '0.19',
            'size': '728x90',
            'adserverTargeting': {
              'hb_bidder': 'sortable',
              'hb_adid': '2240558913d3991',
              'hb_pb': '0.19',
              'hb_size': '728x90',
              'hb_source': 'client',
              'hb_format': 'banner'
            }
          },
          {
            'bidderCode': 'onedisplay',
            'width': 970,
            'height': 250,
            'statusMessage': 'Bid available',
            'adId': '235997080d764e9',
            'requestId': '12fa97c36b07734',
            'mediaType': 'banner',
            'source': 'client',
            'ad': "<script type='text/javascript'>document.write('<img src=\"https://adserver-us.adtech.advertising.com/pubapi/3.0/11402.1/4790217/0/0/ADTECH;v=2;cmd=win;adid=-1;pubseq=32105739833055780;pubitime=1592938047;bnid=0;pubadn=9019.1;pubws=371832;gdpr=0;cors=yes;alias=19bc7266fd929ff;misc=1592938047412;bidfloor=0.1;\" width=\"1\" height=\"1\" style=\"display:none;\">');\ndocument.write(\"<iframe id=\\u002711408bd4\\u0027 name=\\u002711408bd4\\u0027 src=\\u0027https://ads.us.criteo.com/delivery/r/afr.php?did=5ef24e3f25b596cce5962ca6963cc900&z=1.38&u=%7CoaRfR1ymJd%2Fp5gMcZNJzFpCI7UybunjF1JRZLK0gQFk%3D%7C&c1=Doe_QvmWfcFYMlb0LlMzRYRN8u_neDUxQW3crHyalz9LYy_cWU0VLBBIdKuIsK0kdRq0yq-GhpOu4ipL64Du6rmLQqcdS5Hs3O1O2myAK3DwljnSYqaK7RNFGrtuth3xwl_1UR_ndPMsmY05yv064pW09BMpZbv8PJagM1TBnU16sxT1Ly2Xh0I5fmrax7z2P_d8dAOuYbn6OIC6wkx19cJjR7TWzxhu8AqxQ4THT13MF_HAKe8wxTEhm1Yyyhluj3HiLsG0k9t1w2aY2QWSIcKjChe4Hhds46xo_iZp6AWj4FIBO5rJbU8pdiGBtpvfscXfod4Ew5d6E2_xXETeSaz3-Tvqpfv39jXHz4ZJ0-ecJmWkpLErRXDwGWAMD7OAIqQ3ZeVez8RK1IeXu18PCwkUj_Q9t2KtsK4V1_uwdwuN0YA8YrOknx80fSfYXLr4V70slaJObdChaBYBSerVFf0s1hXOs4BK\\u0027 framespacing=\\u00270\\u0027 frameborder=\\u0027no\\u0027 scrolling=\\u0027no\\u0027 width=\\u0027970\\u0027 height=\\u0027250\\u0027></iframe>\");</script>",
            'cpm': 1.17,
            'creativeId': '8600397',
            'pubapiId': '32105739833055780',
            'currency': 'USD',
            'netRevenue': true,
            'ttl': 60,
            'originalCpm': 1.17,
            'originalCurrency': 'USD',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'responseTimestamp': 1592938047769,
            'requestTimestamp': 1592938047411,
            'bidder': 'onedisplay',
            'adUnitCode': 'gpt-slot-channel-banner-top',
            'timeToRespond': 358,
            'pbLg': '1.00',
            'pbMg': '1.10',
            'pbHg': '1.17',
            'pbAg': '1.15',
            'pbDg': '1.17',
            'pbCg': '1.17',
            'size': '970x250',
            'adserverTargeting': {
              'hb_bidder': 'onedisplay',
              'hb_adid': '235997080d764e9',
              'hb_pb': '1.17',
              'hb_size': '970x250',
              'hb_source': 'client',
              'hb_format': 'banner'
            }
          },
          {
            'bidderCode': 'appnexus',
            'width': 970,
            'height': 250,
            'statusMessage': 'Bid available',
            'adId': '24bce2bd4a40614',
            'requestId': '6deb33e0ac92e6',
            'mediaType': 'banner',
            'source': 'client',
            'cpm': 2.604162,
            'creativeId': 227036790,
            'currency': 'USD',
            'netRevenue': true,
            'ttl': 300,
            'adUnitCode': 'gpt-slot-channel-banner-top',
            'appnexus': {
              'buyerMemberId': 10284
            },
            'ad': "<!-- Creative 227036790 served by Member 10284 via AppNexus --><html><body style=\"margin-left: 0%; margin-right: 0%; margin-top: 0%; margin-bottom: 0%\"><script type=\"text/javascript\">(function(){\nvar host = \"https://aax-us-pdx.amazon-adsystem.com\"; host = (host.charAt(0)==\"$\") ?  \"https://aax-us-east.amazon-adsystem.com\" : host;\ndocument.write('<iframe src=\"' + host + '/e/an/imp?aaxbi=IlR6SC6F5Ogq8FmzPKu7sOkAAAFy4oGopQYAAASwAfaN_JA&aaxsp=2.99329&aaxct=https%3A%2F%2Flax1-ib.adnxs.com%2Fclick%3F_IwLB0LyB0Ajzz8LU9UEQAAAAGBmZgxAI88_C1PVBED8jAsHQvIHQIxKQwZbfEVIM7xC7px580dBTvJeAAAAAGn2vQD6HwAALCgAALwAAAB2TogNe0kVAAAAAABVU0QAVVNEAMoD-gASpAAAAAABAQUCAAAAALYATiGfEwAAAAA.%2Fbcr%3DAAAAAAAA8D8%3D%2Fbn%3D88656%2Fclickenc%3D&aaxsz=970x250&aaxcc=EB45B82DE8560C3C37F6AAA1BD24DDC8&aaxci=gtobPyBUmwuIrCpoMi6v80Vax8u5.LHyA58WwzkJQyk5EpDutWK7FPPU9KGYIeiwZWdR2ZN2kbesEG4bUS4zuWZHvCcyfpt8WhuP3X-atjkBptUv8fALjf7fGRb6EXmOIorJqKIEUeGGUBLK2lNqge7BoykqiUzDAv3D2LqdxyisX1SKBN0YSTjjwx2pu8h20-.45Mxe31p7Lev7b0QXihZCjngVbX.8NzPlbi3kVHDvgBCRoV7.rhin3f5D5d9-Jr0T.ru1k2H.5p8PCBxvbvsX-FKCWJguRuAxFUeC4vOpvdkXWEfo3jbyb58oYRKVu6OZB2PDUvYM39hk57B57Rj84erpDkFX42KZvzGW4Zgfez2VFvPPzl2L50VKGm6RujJpOrOiM.BoP5Sq14DCRAP9vxuSkG6am6sKplKEgWEmpa2NUsiadUWDckP8pSQ-zgpbg-wOPB1VuR4SynXctOqIwICSHdHlX-F9gJdc3iGI-K.u6niQlJOboxuQBnjVRHrzEKCwn14xTySz1R33tQshrZ.zRvgDF3zprDu405sl7zbroYPnm7YzdtbTwet1&aaxcp=0&cb=1117771015\" ' + \n'width=\"970\" height=\"250\" frameborder=\"0\" marginwidth=\"0\" marginheight=\"0\" scrolling=\"no\"></iframe>');\n})();</script></body></html><iframe src=\"https://acdn.adnxs.com/dmp/async_usersync.html?gdpr=0&seller_id=8186&pub_id=1106776\" width=\"1\" height=\"1\" frameborder=\"0\" scrolling=\"no\" marginheight=\"0\" marginwidth=\"0\" topmargin=\"0\" leftmargin=\"0\" style=\"position:absolute;overflow:hidden;clip:rect(0 0 0 0);height:1px;width:1px;margin:-1px;padding:0;border:0;\"></iframe><script>try {!function(){function e(e,t){return\"function\"==typeof __an_obj_extend_thunk?__an_obj_extend_thunk(e,t):e}function t(e,t){\"function\"==typeof __an_err_thunk&&__an_err_thunk(e,t)}function n(e,t){if(\"function\"==typeof __an_redirect_thunk)__an_redirect_thunk(e);else{var n=navigator.connection;navigator.__an_connection&&(n=navigator.__an_connection),window==window.top&&n&&n.downlinkMax<=.115&&\"function\"==typeof HTMLIFrameElement&&HTMLIFrameElement.prototype.hasOwnProperty(\"srcdoc\")?(window.__an_resize=function(e,t,n){var r=e.frameElement;r&&\"__an_if\"==r.getAttribute(\"name\")&&(t&&(r.style.width=t+\"px\"),n&&(r.style.height=n+\"px\"))},document.write('<iframe name=\"__an_if\" style=\"width:0;height:0\" srcdoc=\"<script type=\\'text/javascript\\' src=\\''+e+\"&\"+t.bdfif+\"=1'></sc\"),document.write('ript>\" frameborder=\"0\" scrolling=\"no\" marginheight=0 marginwidth=0 topmargin=\"0\" leftmargin=\"0\" allowtransparency=\"true\"></iframe>')):document.write('<script language=\"javascript\" src=\"'+e+'\"></scr'+'ipt>')}};var r=function(e){this.rdParams=e};r.prototype={constructor:r,walkAncestors:function(e){try{if(!window.location.ancestorOrigins)return;for(var t=0,n=window.location.ancestorOrigins.length;n>t;t++)e.call(null,window.location.ancestorOrigins[t],t)}catch(r){\"undefined\"!=typeof console}return[]},walkUpWindows:function(e){var t,n=[];do try{t=t?t.parent:window,e.call(null,t,n)}catch(r){return\"undefined\"!=typeof console,n.push({referrer:null,location:null,isTop:!1}),n}while(t!=window.top);return n},getPubUrlStack:function(e){var n,r=[],o=null,i=null,a=null,c=null,d=null,s=null,u=null;for(n=e.length-1;n>=0;n--){try{a=e[n].location}catch(l){\"undefined\"!=typeof console,t(l,\"AnRDModule::getPubUrlStack:: location\")}if(a)i=encodeURIComponent(a),r.push(i),u||(u=i);else if(0!==n){c=e[n-1];try{d=c.referrer,s=c.ancestor}catch(l){\"undefined\"!=typeof console,t(l,\"AnRDModule::getPubUrlStack:: prevFrame\")}d?(i=encodeURIComponent(d),r.push(i),u||(u=i)):s?(i=encodeURIComponent(s),r.push(i),u||(u=i)):r.push(o)}else r.push(o)}return{stack:r,detectUrl:u}},getLevels:function(){var e=this.walkUpWindows(function(e,n){try{n.push({referrer:e.document.referrer||null,location:e.location.href||null,isTop:e==window.top})}catch(r){n.push({referrer:null,location:null,isTop:e==window.top}),\"undefined\"!=typeof console,t(r,\"AnRDModule::getLevels\")}});return this.walkAncestors(function(t,n){e[n].ancestor=t}),e},getRefererInfo:function(){var e=\"\";try{var n=this.getLevels(),r=n.length-1,o=null!==n[r].location||r>0&&null!==n[r-1].referrer,i=this.getPubUrlStack(n);e=this.rdParams.rdRef+\"=\"+i.detectUrl+\"&\"+this.rdParams.rdTop+\"=\"+o+\"&\"+this.rdParams.rdIfs+\"=\"+r+\"&\"+this.rdParams.rdStk+\"=\"+i.stack+\"&\"+this.rdParams.rdQs}catch(a){e=\"\",\"undefined\"!=typeof console,t(a,\"AnRDModule::getRefererInfo\")}return e}};var o=function(n){var o=\"\";try{n=e(n,0);var i=e(new r(n),1);return i.getRefererInfo()}catch(a){o=\"\",\"undefined\"!=typeof console,t(a,\"AnRDModule::executeRD\")}return o};;var c=\"https://lax1-ib.adnxs.com/rd_log?an_audit=0&referrer=https%3A%2F%2Fmavenroundtable.io%2Ftheintellectualist%2F%3Fast_debug%3D1%26debugAds%3D1&e=wqT_3QLPDPBMTwYAAAMA1gAFAQjBnMn3BRCMlY2ysIvfokgYs_iK8s6z3vlHKjYJ_IwLB0LyB0ARI88_C1PVBEAZAAAAYGZmDEAhI88_C1PVBEAp_IwJJAAxARu4j8LlPzDp7PcFOPo_QKxQSLwBUPacoWxY-5JVYABokshueNC0BYABAYoBA1VTRJIFBvBtmAHKB6AB-gGoAQGwAQC4AQHAAQXIAQLQAQDYAQDgAQDwAQD6AR50aGVpbnRlbGxlY3R1YWxpc3RfQVRGX1dJREVfRFTYAt1y4AKa5z7qAkVodHRwczovL21hdmVucm91bmR0YWJsZS5pby90aGU6RQA0Lz9hc3RfZGVidWc9MSYFCDxBZHM9MfICLgoESE9TVBImEVD0GgVhYXgtdXMtcGR4LmFtYXpvbi1hZHN5c3RlbS5jb23yAjkKBkFBWF9CSRIvSWxSNlNDNkY1T2dxOEZtelBLdTdzT2tBQUFGeTRvR29wUVlBQUFTd0FmYU5fSkHyAssECgZBQVhfQ0kSwARndG9iUHlCVW13dUlyQ3BvTWk2djgwVmF4OHU1LkxIeUE1OFd3emtKUXlrNUVwRHV0V0s3RlBQVTlLR1lJZWl3WldkUjJaTjJrYmVzRUc0YlVTNHp1V1pIdkNjeWZwdDhXaHVQM1gtYXRqa0JwdFV2OGZBTGpmN2ZHUmI2RVhtT0lvckpxS0lFVWVHR1VCTEsybE5xZ2U3Qm95a3FpVXpEQXYzRDJMcWR4eWlzWDFTS0JOMFlTVGpqd3gycHU4aDIwLS40NU14ZTMxcDdMZXY3YjBRWGloWkNqbmdWYlguOE56UGxiaTNrVkhEdmdCQ1JvVjcucmhpbjNmNUQ1ZDktSnIwVC5ydTFrMkguNXA4UENCeHZidnNYLUZLQ1dKZ3VSdUF4RlVlQzR2T3B2ZGtYV0VmbzNqYnliNThvWVJLVnU2T1pCMlBEVXZZTTM5aGs1N0I1N1JqODRlcnBEa0ZYNDJLWnZ6R1c0WmdmZXoyVkZ2UFB6bDJMNTBWS0dtNlJ1akpwT3JPaU0uQm9QNVNxMTREQ1JBUDl2eHVTa0c2YW02c0twbEtFZ1dFbXBhMk5Vc2lhZFVXRGNrUDhwU1EtemdwYmctd09QQjFWdVI0U3luWGN0T3FJd0lDU0hkSGxYLUY5Z0pkYzNpR0ktSy51Nm5pUWxKT2JveHVRQm5qVlJIcnpFS0N3bjE0eFR5U3oxUjMzdFFzaHJaLnpSdmdERjN6cHJEdTQwNXNsN3picm9ZUG5tN1l6ZHRiVHdldDGAAwCIAwGQAwCYAxegAwGqAwDAA6wCyAMA2AP-55QB4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDDk4LjMzLjU3LjIyMqgE3s1VsgQQCAAQARjKByD6ASgAMAA4ArgEAMAEAMgEANoEAggB4AQB8AT2nKFsiAUBmAUAoAXppvL6jruXzR_ABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB6gUnCgV0ZXJtcxIeQ3VycmVudCxFdmVudHMsQ3VsdHVyZSxTY2llbmNl6gUcCgRwYXRoEhQvdGhlaW50ZWxsZWN0dWFsaXN0L-oFGAoCcGQSEm1hdmVucm91bmR0YWJsZS5pb-oFGQoDYXUxEhJtYXZlbnJvdW5kdGFibGUuaW_qBQ4KB2NoYW5uZWwSA3dlYuoFDAoIcmVmZXJyZXISAOoFLAoDYXUyEiVtYXZlbnJvdW5kdGFibGUuaW8vdGhlaW50ZWxsZWN0dWFsaXN06gUYCgJtYxISdGhlaW50ZWxsZWN0dWFsaXN06gUMCgJjbRIGc2FsaXNo6gUNCghsb2dnZWRpbhIBMOoFDgoCY3YSCHBvbGl0aWNz6gUQCgNwb2QSCXVuZGVmaW5lZOoFCgoEbGFuZxICZW7qBRQKCHBhZ2V0eXBlEghob21lcGFnZfAFqa8w-gUECAAQAJAGAJgGALgGAMEGAAAAAAAA8D_aBhYKEAAAAAAAAAAAAAAAAAAAAAAQABgA4AYB8gYCCACABwGIBwCgBwG6BwsIABAAGAA40h5AAcgH0LQF0gcNCQAAAAAAAAAAEAAYANoHBggAEAAYAA..&s=16175d68ccb997bea07e0ab6382e3925df38f327\";c+=\"&\"+o({rdRef:\"bdref\",rdTop:\"bdtop\",rdIfs:\"bdifs\",rdStk:\"bstk\",rdQs:\"\"}),n(c,{bdfif:\"bdfif\"})}();} catch (e) { }</script><div name=\"anxv\" lnttag=\"v;tv=view7-1hs;st=0;d=970x250;vc=iab;vid_ccr=1;tag_id=12449385;cb=https%3A%2F%2Flax1-ib.adnxs.com%2Fvevent%3Fan_audit%3D0%26referrer%3Dhttps%253A%252F%252Fmavenroundtable.io%252Ftheintellectualist%252F%253Fast_debug%253D1%2526debugAds%253D1%26e%3DwqT_3QKABfBMgAIAAAMA1gAFAQjBnMn3BRCMlY2ysIvfokgYs_iK8s6z3vlHKjYJ_IwLB0LyB0ARI88_C1PVBEAZAAAAYGZmDEAhI88_C1PVBEAp_IwJJAAxARu4j8LlPzDp7PcFOPo_QKxQSLwBUPacoWxY-5JVYABokshueNC0BYABAYoBA1VTRJIFBvBtmAHKB6AB-gGoAQGwAQC4AQHAAQXIAQLQAQDYAQDgAQDwAQD6AR50aGVpbnRlbGxlY3R1YWxpc3RfQVRGX1dJREVfRFTYAt1y4AKa5z7qAkVodHRwczovL21hdmVucm91bmR0YWJsZS5pby90aGU6RQA0Lz9hc3RfZGVidWc9MSYFCPQXAUFkcz0xgAMAiAMBkAMAmAMXoAMBqgM-GhM1MjA3NzA1Mjc0NTEyNzg4MTA4KgUxMDI4NDogRUI0NUI4MkRFODU2MEMzQzM3RjZBQUExQkQyNEREQzjAA6wCyAMA2AP-55QB4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDDk4LjMzLjU3LjIyMqgE3s1VsgQQCAAQARjKByD6ASgAMAA4ArgEAMAEAMgEANoEAggB4AQB8AT2nKFsiAUBmAUAoAXppvL6jruXzR_ABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWprzD6BQQIABAAkAYAmAYAuAYAwQYAAAAAAADwP9oGFgoQAAAAAAAJEgUBYBAAGADgBgHyBgIIAIAHAYgHAKAHAboHCwgFGjQ40h5AAcgH0LQF0gcNCQUxPAAAABAAGADaBwYIABAAGAA.%26s%3D89972081f897fd0be1032cb08f3b4044e48f2f49;ts=1592938049;cet=0;cecb=\" width=\"0\" height=\"0\" style=\"display: block; margin: 0; padding: 0; height: 0; width: 0;\"><script type=\"text/javascript\" async=\"true\" src=\"https://cdn.adnxs.com/v/s/187/trk.js\"></script></div><div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"https://lax1-ib.adnxs.com/it?an_audit=0&referrer=https%253A%252F%252Fmavenroundtable.io%252Ftheintellectualist%252F%253Fast_debug%253D1%2526debugAds%253D1&e=wqT_3QKABfBMgAIAAAMA1gAFAQjBnMn3BRCMlY2ysIvfokgYs_iK8s6z3vlHKjYJ_IwLB0LyB0ARI88_C1PVBEAZAAAAYGZmDEAhI88_C1PVBEAp_IwJJAAxARu4j8LlPzDp7PcFOPo_QKxQSLwBUPacoWxY-5JVYABokshueNC0BYABAYoBA1VTRJIFBvBtmAHKB6AB-gGoAQGwAQC4AQHAAQXIAQLQAQDYAQDgAQDwAQD6AR50aGVpbnRlbGxlY3R1YWxpc3RfQVRGX1dJREVfRFTYAt1y4AKa5z7qAkVodHRwczovL21hdmVucm91bmR0YWJsZS5pby90aGU6RQA0Lz9hc3RfZGVidWc9MSYFCPQXAUFkcz0xgAMAiAMBkAMAmAMXoAMBqgM-GhM1MjA3NzA1Mjc0NTEyNzg4MTA4KgUxMDI4NDogRUI0NUI4MkRFODU2MEMzQzM3RjZBQUExQkQyNEREQzjAA6wCyAMA2AP-55QB4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDDk4LjMzLjU3LjIyMqgE3s1VsgQQCAAQARjKByD6ASgAMAA4ArgEAMAEAMgEANoEAggB4AQB8AT2nKFsiAUBmAUAoAXppvL6jruXzR_ABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWprzD6BQQIABAAkAYAmAYAuAYAwQYAAAAAAADwP9oGFgoQAAAAAAAJEgUBYBAAGADgBgHyBgIIAIAHAYgHAKAHAboHCwgFGjQ40h5AAcgH0LQF0gcNCQUxPAAAABAAGADaBwYIABAAGAA.&s=89972081f897fd0be1032cb08f3b4044e48f2f49\"></div>",
            'originalCpm': 2.604162,
            'originalCurrency': 'USD',
            'auctionId': 'd01409e4-580d-4107-8d92-3c5dec19b41a',
            'responseTimestamp': 1592938047787,
            'requestTimestamp': 1592938047404,
            'bidder': 'appnexus',
            'timeToRespond': 383,
            'pbLg': '2.50',
            'pbMg': '2.60',
            'pbHg': '2.60',
            'pbAg': '2.60',
            'pbDg': '2.60',
            'pbCg': '2.60',
            'size': '970x250',
            'adserverTargeting': {
              'hb_bidder': 'appnexus',
              'hb_adid': '24bce2bd4a40614',
              'hb_pb': '2.60',
              'hb_size': '970x250',
              'hb_source': 'client',
              'hb_format': 'banner'
            }
          }
        ],
        'winningBids': [],
        'timeout': 1000
      }
      const adapterConfig = {
        options: {
        },
      }
      const actual = summarizeAuctionEnd(mavenArgs, adapterConfig)
      const expected = {
        auc: 'd01409e4-580d-4107-8d92-3c5dec19b41a',
        cpms: [ 2.604162 ],
        codes: [ 'gpt-slot-channel-banner-top' ],
      }
      assert.deepEqual(actual, expected)
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
