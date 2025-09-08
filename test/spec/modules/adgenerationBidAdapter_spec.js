import {expect} from 'chai';
import {spec} from 'modules/adgenerationBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {NATIVE} from 'src/mediaTypes.js';
import prebid from 'package.json';
import { setConfig as setCurrencyConfig } from '../../../modules/currency.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';

describe('AdgenerationAdapter', function () {
  const adapter = newBidder(spec);
  const ADGENE_PREBID_VERSION = '1.6.5';
  const ENDPOINT_STG = 'https://api-test.scaleout.jp/adgen/prebid';
  const ENDPOINT_RELEASE = 'https://d.socdm.com/adgen/prebid';

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'adg',
      'params': {
        id: '58278', // banner
      }
    };
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {};
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const suaSample = {
      source: 2,
      platform: {
        brand: 'macOS'
      },
      browsers: [
        {
          brand: 'Chromium',
          version: ['112']
        },
        {
          brand: 'Google Chrome',
          version: ['112']
        },
        {
          brand: 'Not:A-Brand',
          version: ['99']
        }
      ],
      mobile: 0
    };
    const schainSmaple = {ver: '1.0', complete: 1, nodes: [{asi: 'indirectseller.com', sid: '00001', hp: 1}]};
    const bidRequests = [
      { // banner
        bidder: 'adg',
        params: {
          id: '58278',
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [
              [
                300,
                250
              ]
            ]
          }
        },
        bidId: '2f6ac468a9c15e',
        bidderRequestId: '14a9f773e30243',
        auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a'
      },
      { // native
        bidder: 'adg',
        params: {
          id: '58278',
        },
        mediaTypes: {
          native: {
            image: {
              required: true
            },
            title: {
              required: true,
              len: 80
            },
            sponsoredBy: {
              required: true
            },
            clickUrl: {
              required: true
            },
            body: {
              required: true
            },
            icon: {
              required: true
            }
          },
        },
        adUnitCode: 'adunit-code',
        sizes: [[1, 1]],
        bidId: '2f6ac468a9c15e',
        bidderRequestId: '14a9f773e30243',
        auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a'
      },
      { // bannerWithAdgextCriteoId
        bidder: 'adg',
        params: {
          id: '58278', // banner
        },
        adUnitCode: 'adunit-code',
        sizes: [[320, 100]],
        bidId: '2f6ac468a9c15e',
        bidderRequestId: '14a9f773e30243',
        auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a',
        userId: {
          criteoId: 'criteo-id-test-1234567890'
        }
      },
      { // bannerWithAdgextIds
        bidder: 'adg',
        params: {
          id: '58278', // banner
        },
        adUnitCode: 'adunit-code',
        sizes: [[320, 100]],
        bidId: '2f6ac468a9c15e',
        bidderRequestId: '14a9f773e30243',
        auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a',
        userId: {
          id5id: {
            ext: {
              linkType: 2
            },
            uid: 'id5-id-test-1234567890'
          },
          imuid: 'i.KrAH6ZAZTJOnH5S4N2sogA',
          uid2: {id: 'AgAAAAVacu1uAxgAxH+HJ8+nWlS2H4uVqr6i+HBDCNREHD8WKsio/x7D8xXFuq1cJycUU86yXfTH9Xe/4C8KkH+7UCiU7uQxhyD7Qxnv251pEs6K8oK+BPLYR+8BLY/sJKesa/koKwx1FHgUzIBum582tSy2Oo+7C6wYUaaV4QcLr/4LPA='},
        },
        ortb2Imp: {ext: {gpid: '/1111/homepage#300x250'}},
        ortb2: {
          site: {
            domain: 'localhost:9999',
            publisher: {'domain': 'localhost:9999'},
            page: 'http://localhost:9999/integrationExamples/gpt/hello_world.html',
            ref: 'http://localhost:9999/integrationExamples/gpt/hello_world.html'
          },
          device: {
            w: 570,
            h: 969,
            dnt: 0,
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML,like Gecko)Chrome / 112.0.0.0Safari / 537.36',
            language: 'ja',
            sua: suaSample
          }
        },
      }
    ];
    const bidderRequest = {
      refererInfo: {
        page: 'https://example.com'
      }
    };

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      // check banner request
      for (const req of request) {
        const url = new URL(req.url);
        expect(url.origin + url.pathname).to.equal(ENDPOINT_RELEASE);
      }
    });

    it('sends bid request to debug ENDPOINT via POST', function () {
      // change the first bidRequest to debug mode
      const copyBidRequests = JSON.parse(JSON.stringify(bidRequests));
      for (const copyBid of copyBidRequests) {
        copyBid.params.debug = true
      }
      // check banner request
      const request = spec.buildRequests(copyBidRequests, bidderRequest);
      for (const req of request) {
        const url = new URL(req.url);
        expect(url.origin + url.pathname).to.equal(ENDPOINT_STG);
      }
    });

    it('should attache params to the banner request', function () {
      const expectedMediaTypes = {
        banner: {
          sizes: [
            [
              300,
              250
            ]
          ]
        }
      }
      const expectedBanner = {
        topframe: 0,
        format: [
          {
            w: 300,
            h: 250
          }
        ]
      }
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      // check banner request
      const url = new URL(request.url);
      expect(url.searchParams.get('posall')).equal('SSPLOC');
      expect(url.searchParams.get('id')).equal('58278');
      expect(url.searchParams.get('sdktype')).equal('0');
      expect(request.method).to.equal('POST');

      // check request data
      expect(request.data.currency).to.equal('JPY');
      expect(request.data.pbver).to.equal(prebid.version);
      expect(request.data.sdkname).to.equal('prebidjs');
      expect(request.data.adapterver).to.equal(ADGENE_PREBID_VERSION);
      expect(request.data.imark).to.equal(1);
      expect(request.data.ortb.imp[0].id).to.equal('2f6ac468a9c15e');
      expect(request.data.ortb.imp[0].ext.params.id).to.equal('58278');
      expect(request.data.ortb.imp[0].ext.mediaTypes).to.deep.equal(expectedMediaTypes);
      expect(request.data.ortb.imp[0].banner).to.deep.equal(expectedBanner);
    });

    it('should attache params to the native request', function () {
      const expectedMediaTypes = {
        native: {
          image: {
            required: true
          },
          title: {
            required: true,
            len: 80
          },
          sponsoredBy: {
            required: true
          },
          clickUrl: {
            required: true
          },
          body: {
            required: true
          },
          icon: {
            required: true
          }
        }
      }
      const request = spec.buildRequests(bidRequests, bidderRequest)[1];
      // check native request
      const url = new URL(request.url);
      expect(url.searchParams.get('posall')).equal('SSPLOC');
      expect(url.searchParams.get('id')).equal('58278');
      expect(url.searchParams.get('sdktype')).equal('0');
      expect(request.method).to.equal('POST');

      // check request data
      expect(request.data.currency).to.equal('JPY');
      expect(request.data.pbver).to.equal(prebid.version);
      expect(request.data.sdkname).to.equal('prebidjs');
      expect(request.data.adapterver).to.equal(ADGENE_PREBID_VERSION);
      expect(request.data.ortb.imp[0].id).to.equal('2f6ac468a9c15e');
      expect(request.data.ortb.imp[0].ext.params.id).to.equal('58278');
      expect(request.data.ortb.imp[0].ext.mediaTypes).to.deep.equal(expectedMediaTypes);
    });

    it('should attache params to the bannerWithAdgextCriteoId request', function () {
      const criteoParams = {
        user: {
          ext: {
            eids: [
              {
                source: 'criteo.com',
                uids: [
                  {
                    id: 'xxxxxxx',
                    atype: 1
                  }
                ]
              },
            ]
          }
        }
      }
      const request = spec.buildRequests(bidRequests, {...bidderRequest, ortb2: criteoParams})[0];
      expect(request.data.ortb.user).to.deep.equal(criteoParams.user);
    });

    it('should attache params to the bannerWithAdgextIds request', function () {
      const idparams = {
        user: {
          ext: {
            eids: [
              {
                source: 'id5-sync.com',
                uids: [
                  {
                    id: 'ID5*RCKp3flI7Jutz2TKfExBb6T2kY8KC6xJ5FAXIVuKo2_SDBBFN9x3KQf-FMHXA3Sv',
                    atype: 1,
                    ext: {
                      linkType: 1,
                      pba: 'L+L6bQ6WoA2INCSS31vtiawRuBYQQ5H6OioCAXUNkl8=',
                      abTestingControlGroup: false
                    }
                  }
                ]
              },
              {
                source: 'intimatemerger.com',
                uids: [
                  {
                    id: 'h.c2bef39c502aef97',
                    atype: 1
                  }
                ]
              },
              {
                source: 'ppid.intimatemerger.com',
                uids: [
                  {
                    id: 'f11490d3c7903e7455ac4af887280a3f',
                    atype: 1
                  }
                ]
              },
            ]
          }
        },
        device: {
          sua: suaSample
        },
        source: {
          ext: {
            schain: schainSmaple
          }
        },
      }
      const request = spec.buildRequests(bidRequests, {...bidderRequest, ortb2: idparams})[3];
      expect(request.data.ortb.user).to.deep.equal(idparams.user);

      // gpid
      expect(request.data.ortb.imp[0].ext.gpid).to.equal('/1111/homepage#300x250');
      // sua
      expect(request.data.ortb.device.sua).to.deep.equal(suaSample);
      // schain
      expect(request.data.ortb.source.ext.schain).to.deep.equal(schainSmaple);
    });

    it('allows setConfig to set bidder currency for JPY', function () {
      setCurrencyConfig({ adServerCurrency: 'JPY' });
      return addFPDToBidderRequest(bidderRequest).then(res => {
        const bidRequest = spec.buildRequests(bidRequests, res)[0];
        expect(bidRequest.data.currency).to.equal('JPY');
        setCurrencyConfig({});
      });
    });

    it('allows setConfig to set bidder currency for USD', function () {
      setCurrencyConfig({ adServerCurrency: 'USD' });
      return addFPDToBidderRequest(bidderRequest).then(res => {
        const bidRequest = spec.buildRequests(bidRequests, res)[0];
        expect(bidRequest.data.currency).to.equal('USD');
        setCurrencyConfig({});
      });
    });
  });

  describe('interpretResponse', function () {
    const bidRequests = {
      banner: {
        bidderRequest: {
          ortb2: {ext: {prebid: {adServerCurrency: 'JPY'}}}
        },
        method: 'POST',
        url: 'https://api-test.scaleout.jp/adgen/prebid?id=15415&posall=SSPLOC&sdktype=0',
        data: {
          currency: 'JPY',
          pbver: prebid.version,
          sdkname: 'prebidjs',
          adapterver: ADGENE_PREBID_VERSION,
          ortb: {
            imp: [
              {
                ext: {
                  gpid: '/1111/homepage-leftnav',
                  data: {
                    pbadslot: '/1111/homepage-leftnav'
                  },
                  params: {
                    id: '15415',
                    debug: true
                  },
                  mediaTypes: {
                    banner: {
                      sizes: [
                        [
                          1,
                          1
                        ],
                        [
                          320,
                          180
                        ],
                        [
                          320,
                          100
                        ],
                        [
                          320,
                          50
                        ],
                        [
                          300,
                          250
                        ],
                        [
                          970,
                          250
                        ]
                      ]
                    }
                  }
                },
                id: '2f6ac468a9c15e',
                banner: {
                  topframe: 1,
                  format: [
                    {
                      'w': 1,
                      'h': 1
                    },
                    {
                      'w': 320,
                      'h': 180
                    },
                    {
                      'w': 320,
                      'h': 100
                    },
                    {
                      'w': 320,
                      'h': 50
                    },
                    {
                      'w': 300,
                      'h': 250
                    },
                    {
                      'w': 970,
                      'h': 250
                    }
                  ]
                }
              }
            ],
            source: {},
            '': {
              ext: {
                'data': {
                  'CxSegments': [
                    'xxxxxxx',
                  ]
                },
                eids: [
                  {
                    'source': 'criteo.com',
                    'uids': [
                      {
                        'id': 'xxxxxxxx',
                        'atype': 1
                      }
                    ]
                  },
                  {
                    'source': 'id5-sync.com',
                    'uids': [
                      {
                        'id': 'xxxxxx',
                        'atype': 1,
                        'ext': {
                          'linkType': 1,
                          'pba': 'xxxxxx',
                          'abTestingControlGroup': false
                        }
                      }
                    ]
                  },
                  {
                    'source': 'intimatemerger.com',
                    'uids': [
                      {
                        'id': 'xxxx',
                        'atype': 1
                      }
                    ]
                  },
                  {
                    'source': 'ppid.intimatemerger.com',
                    'uids': [
                      {
                        'id': 'xxxxxxx',
                        'atype': 1
                      }
                    ]
                  }
                ]
              }
            },
            'site': {
              'domain': 'example.com',
              'publisher': {
                'domain': 'example.com'
              },
              'page': 'https://example.com/post/html/fi/test2.html?pbjs_debug=true'
            },
            'device': {
              'w': 1792,
              'h': 1120,
              'dnt': 0,
              'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
              'language': 'ja',
              'ext': {
                'vpw': 616,
                'vph': 974
              },
              'sua': {
                'source': 1,
                'platform': {
                  'brand': 'macOS'
                },
                'browsers': [
                  {
                    'brand': 'Google Chrome',
                    'version': [
                      '129'
                    ]
                  },
                  {
                    'brand': 'Not=A?Brand',
                    'version': [
                      '8'
                    ]
                  },
                  {
                    'brand': 'Chromium',
                    'version': [
                      '129'
                    ]
                  }
                ],
                'mobile': 0
              }
            },
            'id': 'f149e3b5-46af-414c-a93a-4bbca5503112',
            'test': 0,
            'tmax': 3000
          },
          'imark': 1
        },
        'options': {
          'withCredentials': true,
          'crossOrigin': true
        }
      },
      native: {
        method: 'POST',
        url: 'https://api-test.scaleout.jp/adgen/prebid?id=10697&posall=SSPLOC&sdktype=0',
        data: {
          'currency': 'JPY',
          'pbver': prebid.version,
          'sdkname': 'prebidjs',
          'adapterver': ADGENE_PREBID_VERSION,
          'ortb': {
            'imp': [
              {
                'ext': {
                  'gpid': '/1111/homepage-leftnav',
                  'data': {
                    'pbadslot': '/1111/homepage-leftnav'
                  },
                  'params': {
                    'id': '10697',
                    'debug': true
                  },
                  'mediaTypes': {
                    'native': {
                      'image': {
                        'required': true
                      },
                      'title': {
                        'required': true,
                        'len': 80
                      },
                      'sponsoredBy': {
                        'required': true
                      },
                      'clickUrl': {
                        'required': true
                      },
                      'body': {
                        'required': true
                      },
                      'icon': {
                        'required': true
                      },
                      'privacyLink': {
                        'required': true,
                        'sendId': false
                      }
                    }
                  }
                },
                'id': '2f6ac468a9c15e',
                'native': {
                  'request': '{\'ver\':\'1.2\',\'assets\':[{\'id\':0,\'required\':1,\'img\':{\'type\':3}},{\'id\':1,\'required\':1,\'title\':{\'len\':80}},{\'id\':2,\'required\':1,\'data\':{\'type\':1}},{\'id\':3,\'required\':1,\'data\':{\'type\':2}},{\'id\':4,\'required\':1,\'img\':{\'type\':1}}],\'privacy\':1}',
                  'ver': '1.2'
                }
              }
            ],
            'source': {},
            'user': {
              'ext': {
                'data': {
                  'CxSegments': [
                    'xxxxxxxx',
                    'xxxxxxxy',
                  ]
                },
                'eids': [
                  {
                    'source': 'criteo.com',
                    'uids': [
                      {
                        'id': 'xxxxxx',
                        'atype': 1
                      }
                    ]
                  },
                  {
                    'source': 'id5-sync.com',
                    'uids': [
                      {
                        'id': 'xxxxxx',
                        'atype': 1,
                        'ext': {
                          'linkType': 1,
                          'pba': 'xxxxxx',
                          'abTestingControlGroup': false
                        }
                      }
                    ]
                  },
                  {
                    'source': 'intimatemerger.com',
                    'uids': [
                      {
                        'id': 'xxxxxx',
                        'atype': 1
                      }
                    ]
                  },
                  {
                    'source': 'ppid.intimatemerger.com',
                    'uids': [
                      {
                        'id': 'xxxxxx',
                        'atype': 1
                      }
                    ]
                  }
                ]
              }
            },
            'site': {
              'domain': 'example.com',
              'publisher': {
                'domain': 'example.com'
              },
              'page': 'https://example.com/post/html/test3.html?pbjs_debug=true'
            },
            'device': {
              'w': 1792,
              'h': 1120,
              'dnt': 0,
              'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
              'language': 'ja',
              'ext': {
                'vpw': 616,
                'vph': 974
              },
              'sua': {
                'source': 1,
                'platform': {
                  'brand': 'macOS'
                },
                'browsers': [
                  {
                    'brand': 'Google Chrome',
                    'version': [
                      '129'
                    ]
                  },
                  {
                    'brand': 'Not=A?Brand',
                    'version': [
                      '8'
                    ]
                  },
                  {
                    'brand': 'Chromium',
                    'version': [
                      '129'
                    ]
                  }
                ],
                'mobile': 0
              }
            },
            'id': '8fa21cb7-d874-41e9-a735-9edf560b306c',
            'test': 0,
            'tmax': 20000
          }
        },
        options: {
          withCredentials: true,
          crossOrigin: true
        }
      },
      upperBillboard: {
        method: 'POST',
        url: 'https://api-test.scaleout.jp/adgen/prebid?id=15410&posall=SSPLOC&sdktype=0',
        data: {
          'currency': 'USD',
          'pbver': prebid.version,
          'sdkname': 'prebidjs',
          'adapterver': ADGENE_PREBID_VERSION,
          'ortb': {
            'imp': [
              {
                'ext': {
                  'params': {
                    'id': '15410',
                    'debug': true,
                    'marginTop': '50'
                  },
                  'mediaTypes': {
                    'banner': {
                      'sizes': [
                        [
                          1,
                          1
                        ],
                        [
                          320,
                          180
                        ],
                        [
                          320,
                          100
                        ],
                        [
                          320,
                          50
                        ],
                        [
                          300,
                          250
                        ],
                        [
                          970,
                          250
                        ]
                      ]
                    }
                  }
                },
                'id': '2f6ac468a9c15e',
                'banner': {
                  'topframe': 1,
                  'format': [
                    {
                      'w': 1,
                      'h': 1
                    },
                    {
                      'w': 320,
                      'h': 180
                    },
                    {
                      'w': 320,
                      'h': 100
                    },
                    {
                      'w': 320,
                      'h': 50
                    },
                    {
                      'w': 300,
                      'h': 250
                    },
                    {
                      'w': 970,
                      'h': 250
                    }
                  ]
                }
              }
            ],
            'source': {},
            'user': {
              'ext': {
                'data': {
                  'CxSegments': [
                    'xxxxxxxx',
                    'xxxxxxxy',
                  ]
                },
                'eids': [
                  {
                    'source': 'criteo.com',
                    'uids': [
                      {
                        'id': 'xxxxxx',
                        'atype': 1
                      }
                    ]
                  },
                  {
                    'source': 'id5-sync.com',
                    'uids': [
                      {
                        'id': 'xxxxxx',
                        'atype': 1,
                        'ext': {
                          'linkType': 1,
                          'pba': 'xxxxxx',
                          'abTestingControlGroup': false
                        }
                      }
                    ]
                  },
                  {
                    'source': 'intimatemerger.com',
                    'uids': [
                      {
                        'id': 'xxxxxx',
                        'atype': 1
                      }
                    ]
                  },
                  {
                    'source': 'ppid.intimatemerger.com',
                    'uids': [
                      {
                        'id': 'xxxxxx',
                        'atype': 1
                      }
                    ]
                  }
                ]
              }
            },
            'site': {
              'domain': 'example.com',
              'publisher': {
                'domain': 'example.com'
              },
              'page': 'https://example.com/post/html/fi/test1.html?pbjs_debug=true'
            },
            'device': {
              'w': 1792,
              'h': 1120,
              'dnt': 0,
              'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
              'language': 'ja',
              'ext': {
                'vpw': 616,
                'vph': 974
              },
              'sua': {
                'source': 1,
                'platform': {
                  'brand': 'macOS'
                },
                'browsers': [
                  {
                    'brand': 'Google Chrome',
                    'version': [
                      '129'
                    ]
                  },
                  {
                    'brand': 'Not=A?Brand',
                    'version': [
                      '8'
                    ]
                  },
                  {
                    'brand': 'Chromium',
                    'version': [
                      '129'
                    ]
                  }
                ],
                'mobile': 0
              }
            },
            'id': '24cb6de9-68ee-49df-8a90-27259215e059',
            'test': 0,
            'tmax': 3000
          },
          'imark': 1
        },
      }
    };

    const serverResponse = {
      noAd: {
        results: [],
      },
      normal: {
        banner: {
          displaytype: '1',
          location_params: null,
          results: [
            {
              ad: '<div></div>',
              beacon: '<img src="http://example.com" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
              cpm: 36.0008,
              ids: {},
              w: 320,
              h: 100,
              locationid: '58279',
              rotation: '0',
              scheduleid: '512603',
              sdktype: '0',
              creativeid: '1k2kv35vsa5r',
              dealid: 'fd5sa5fa7f',
              ttl: 1000,
              adomain: ['advertiserdomain.com']
            },
          ],
        },
        native: {
          displaytype: '1',
          location_params: null,
          locationid: '58279',
          results: [
            {
              ad: '<div></div>',
              beacon: '<img src="http://example.com" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
              cpm: 36.0008,
              ids: {},
              adomain: ['advertiserdomain.com'],
              scheduleid: '512603',
              creativeid: '1k2kv35vsa5r',
              dealid: 'fd5sa5fa7f',
              ttl: 1000,
              native: {
                assets: [
                  {
                    data: {
                      label: 'accompanying_text',
                      value: 'AD'
                    },
                    id: 501
                  },
                  {
                    data: {
                      label: 'optout_url',
                      value: 'https://example.com/optout/#'
                    },
                    id: 502
                  },
                  {
                    data: {
                      ext: {
                        black_back: 'https://example.com/icon_adg_optout_26x26_white.png',
                      },
                      label: 'information_icon_url',
                      value: 'https://example.com/icon_adg_optout_26x26_gray.png',
                      id: 503
                    }
                  },
                  {
                    id: 1,
                    required: 1,
                    title: {text: 'Title'}
                  },
                  {
                    id: 2,
                    img: {
                      h: 250,
                      url: 'https://example.com/adg-sample-ad/img/300x250.png',
                      w: 300
                    },
                    required: 1
                  },
                  {
                    id: 3,
                    img: {
                      h: 300,
                      url: 'https://example.com/300x300.png',
                      w: 300
                    },
                    required: 1
                  },
                  {
                    data: {value: 'Description'},
                    id: 5,
                    required: 0
                  },
                  {
                    data: {value: 'CTA'},
                    id: 6,
                    required: 0
                  },
                  {
                    data: {value: 'Sponsored'},
                    id: 4,
                    required: 0
                  }
                ],
                imptrackers: ['https://example.com/1x1.gif'],
                link: {
                  clicktrackers: [
                    'https://example.com/1x1_clicktracker_access.gif'
                  ],
                  url: 'https://example.com'
                },
              },
            }
          ],
          rotation: '0',
        },
        upperBillboard: {
          'displaytype': '1',
          'h': 180,
          'ids': {
            'anid': '',
            'diid': '',
            'idfa': '',
            'soc': 'yyyyyyyy'
          },
          'location_params': {
            'option': {
              'ad_type': 'upper_billboard'
            }
          },
          'locationid': '143038',
          'results': [
            {
              'ad': '<div></div>',
              'beacon': '<img src="http://example.com" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
              'beaconurl': 'http://example.com',
              'cpm': 80,
              'creative_params': {},
              'creativeid': 'ScaleOut_2146187',
              'dealid': '2134-132864_newformat_test',
              'h': 180,
              'landing_url': 'https://example.com/',
              'rparams': {},
              'scheduleid': '1233323',
              'trackers': {
                'imp': [
                  'https://example.com'
                ],
                'viewable_imp': [
                  'https://example.com'
                ],
                'viewable_measured': [
                  'https://example.com'
                ]
              },
              'ttl': 1000,
              'vastxml': '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><VAST version="3.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd"></VAST>',
              'vcpm': 0,
              'w': 320,
              'weight': 1
            }
          ],
          'rotation': '0',
        }
      },
    }
    serverResponse.emptyAdomain = {};
    serverResponse.emptyAdomain.banner = JSON.parse(JSON.stringify(serverResponse.normal.banner));
    serverResponse.emptyAdomain.banner.results[0].adomain = [];
    serverResponse.emptyAdomain.native = JSON.parse(JSON.stringify(serverResponse.normal.native));
    serverResponse.emptyAdomain.native.results[0].adomain = [];

    serverResponse.noAdomain = {};
    serverResponse.noAdomain.banner = JSON.parse(JSON.stringify(serverResponse.normal.banner));
    delete serverResponse.noAdomain.banner.results[0].adomain;
    serverResponse.noAdomain.native = JSON.parse(JSON.stringify(serverResponse.normal.native));
    delete serverResponse.noAdomain.native.results[0].adomain;

    const bidResponses = {
      normal: {
        banner: {
          requestId: '2f6ac468a9c15e',
          cpm: 36.0008,
          width: 320,
          height: 100,
          creativeId: '1k2kv35vsa5r',
          dealId: 'fd5sa5fa7f',
          currency: 'JPY',
          netRevenue: true,
          ttl: 1000,
          ad: '<div></div>',
          adomain: ['advertiserdomain.com']
        },
        native: {
          requestId: '2f6ac468a9c15e',
          cpm: 36.0008,
          width: 1,
          height: 1,
          creativeId: '1k2kv35vsa5r',
          dealId: 'fd5sa5fa7f',
          currency: 'JPY',
          netRevenue: true,
          ttl: 1000,
          adomain: ['advertiserdomain.com'],
          ad: '<div></div>',
          native: {
            title: 'Title',
            image: {
              url: 'https://example.com/adg-sample-ad/img/300x250.png',
              height: 250,
              width: 300
            },
            icon: {
              url: 'https://example.com/300x300.png',
              height: 300,
              width: 300
            },
            sponsoredBy: 'Sponsored',
            body: 'Description',
            cta: 'CTA',
            privacyLink: 'https://example.com/optout/#',
            clickUrl: 'https://example.com',
            clickTrackers: ['https://example.com/1x1_clicktracker_access.gif'],
            impressionTrackers: ['https://example.com/1x1.gif']
          },
          mediaType: NATIVE
        },
        upperBillboard: {
          requestId: '2f6ac468a9c15e',
          cpm: 80,
          width: 320,
          height: 180,
          creativeId: 'ScaleOut_2146187',
          dealId: '2134-132864_newformat_test',
          currency: 'USD',
          netRevenue: true,
          ttl: 1000,
          ad: `<script type="text/javascript" src="https://i.socdm.com/sdk/js/adg-browser-m.js"></script><script type="text/javascript">window.ADGBrowserM.init({vastXml: '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><VAST version="3.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd"></VAST>', marginTop: '50'});</script><img src="http://example.com" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>`,
          adomain: ['advertiserdomain.com']
        },
      }
    };

    it('no bid responses', function () {
      const result = spec.interpretResponse({body: serverResponse.noAd}, bidRequests.banner);
      expect(result.length).to.equal(0);
    });

    it('handles ADGBrowserM responses', function () {
      setCurrencyConfig({ adServerCurrency: 'USD' });
      const bidderRequest = {
        refererInfo: {
          page: 'https://example.com'
        }
      };
      return addFPDToBidderRequest(bidderRequest).then(res => {
        const sr = {body: serverResponse.normal.upperBillboard};
        const br = { bidderRequest: res, ...bidRequests.upperBillboard };

        const result = spec.interpretResponse(sr, br)[0];
        expect(result.requestId).to.equal(bidResponses.normal.upperBillboard.requestId);
        expect(result.width).to.equal(bidResponses.normal.upperBillboard.width);
        expect(result.height).to.equal(bidResponses.normal.upperBillboard.height);
        expect(result.creativeId).to.equal(bidResponses.normal.upperBillboard.creativeId);
        expect(result.dealId).to.equal(bidResponses.normal.upperBillboard.dealId);
        expect(result.currency).to.equal(bidResponses.normal.upperBillboard.currency);
        expect(result.netRevenue).to.equal(bidResponses.normal.upperBillboard.netRevenue);
        expect(result.ttl).to.equal(bidResponses.normal.upperBillboard.ttl);
        expect(result.ad).to.equal(bidResponses.normal.upperBillboard.ad);
        setCurrencyConfig({});
      });
    });

    it('handles banner responses for empty adomain', function () {
      const result = spec.interpretResponse({body: serverResponse.emptyAdomain.banner}, bidRequests.banner)[0];
      expect(result.requestId).to.equal(bidResponses.normal.banner.requestId);
      expect(result.width).to.equal(bidResponses.normal.banner.width);
      expect(result.height).to.equal(bidResponses.normal.banner.height);
      expect(result.creativeId).to.equal(bidResponses.normal.banner.creativeId);
      expect(result.dealId).to.equal(bidResponses.normal.banner.dealId);
      expect(result.currency).to.equal(bidResponses.normal.banner.currency);
      expect(result.netRevenue).to.equal(bidResponses.normal.banner.netRevenue);
      expect(result.ttl).to.equal(bidResponses.normal.banner.ttl);
      expect(result.ad).to.equal(bidResponses.normal.banner.ad);
      // no adomian
      expect(result).to.not.have.any.keys('meta');
      expect(result).to.not.have.any.keys('advertiserDomains');
    });

    it('handles native responses for empty adomain', function () {
      const result = spec.interpretResponse({body: serverResponse.emptyAdomain.native}, bidRequests.native)[0];
      expect(result.requestId).to.equal(bidResponses.normal.native.requestId);
      expect(result.width).to.equal(bidResponses.normal.native.width);
      expect(result.height).to.equal(bidResponses.normal.native.height);
      expect(result.creativeId).to.equal(bidResponses.normal.native.creativeId);
      expect(result.dealId).to.equal(bidResponses.normal.native.dealId);
      expect(result.currency).to.equal(bidResponses.normal.native.currency);
      expect(result.netRevenue).to.equal(bidResponses.normal.native.netRevenue);
      expect(result.ttl).to.equal(bidResponses.normal.native.ttl);
      expect(result.native.title).to.equal(bidResponses.normal.native.native.title);
      expect(result.native.image.url).to.equal(bidResponses.normal.native.native.image.url);
      expect(result.native.image.height).to.equal(bidResponses.normal.native.native.image.height);
      expect(result.native.image.width).to.equal(bidResponses.normal.native.native.image.width);
      expect(result.native.icon.url).to.equal(bidResponses.normal.native.native.icon.url);
      expect(result.native.icon.width).to.equal(bidResponses.normal.native.native.icon.width);
      expect(result.native.icon.height).to.equal(bidResponses.normal.native.native.icon.height);
      expect(result.native.sponsoredBy).to.equal(bidResponses.normal.native.native.sponsoredBy);
      expect(result.native.body).to.equal(bidResponses.normal.native.native.body);
      expect(result.native.cta).to.equal(bidResponses.normal.native.native.cta);
      expect(decodeURIComponent(result.native.privacyLink)).to.equal(bidResponses.normal.native.native.privacyLink);
      expect(result.native.clickUrl).to.equal(bidResponses.normal.native.native.clickUrl);
      expect(result.native.impressionTrackers[0]).to.equal(bidResponses.normal.native.native.impressionTrackers[0]);
      expect(result.native.clickTrackers[0]).to.equal(bidResponses.normal.native.native.clickTrackers[0]);
      expect(result.mediaType).to.equal(bidResponses.normal.native.mediaType);
      // no adomain
      expect(result).to.not.have.any.keys('meta');
      expect(result).to.not.have.any.keys('advertiserDomains');
    });

    it('handles banner responses for no adomain', function () {
      const result = spec.interpretResponse({body: serverResponse.noAdomain.banner}, bidRequests.banner)[0];
      expect(result.requestId).to.equal(bidResponses.normal.banner.requestId);
      expect(result.width).to.equal(bidResponses.normal.banner.width);
      expect(result.height).to.equal(bidResponses.normal.banner.height);
      expect(result.creativeId).to.equal(bidResponses.normal.banner.creativeId);
      expect(result.dealId).to.equal(bidResponses.normal.banner.dealId);
      expect(result.currency).to.equal(bidResponses.normal.banner.currency);
      expect(result.netRevenue).to.equal(bidResponses.normal.banner.netRevenue);
      expect(result.ttl).to.equal(bidResponses.normal.banner.ttl);
      expect(result.ad).to.equal(bidResponses.normal.banner.ad);
      // no adomain
      expect(result).to.not.have.any.keys('meta');
      expect(result).to.not.have.any.keys('advertiserDomains');
    });

    it('handles native responses for no adomain', function () {
      const result = spec.interpretResponse({body: serverResponse.noAdomain.native}, bidRequests.native)[0];
      expect(result.requestId).to.equal(bidResponses.normal.native.requestId);
      expect(result.width).to.equal(bidResponses.normal.native.width);
      expect(result.height).to.equal(bidResponses.normal.native.height);
      expect(result.creativeId).to.equal(bidResponses.normal.native.creativeId);
      expect(result.dealId).to.equal(bidResponses.normal.native.dealId);
      expect(result.currency).to.equal(bidResponses.normal.native.currency);
      expect(result.netRevenue).to.equal(bidResponses.normal.native.netRevenue);
      expect(result.ttl).to.equal(bidResponses.normal.native.ttl);
      expect(result.native.title).to.equal(bidResponses.normal.native.native.title);
      expect(result.native.image.url).to.equal(bidResponses.normal.native.native.image.url);
      expect(result.native.image.height).to.equal(bidResponses.normal.native.native.image.height);
      expect(result.native.image.width).to.equal(bidResponses.normal.native.native.image.width);
      expect(result.native.icon.url).to.equal(bidResponses.normal.native.native.icon.url);
      expect(result.native.icon.width).to.equal(bidResponses.normal.native.native.icon.width);
      expect(result.native.icon.height).to.equal(bidResponses.normal.native.native.icon.height);
      expect(result.native.sponsoredBy).to.equal(bidResponses.normal.native.native.sponsoredBy);
      expect(result.native.body).to.equal(bidResponses.normal.native.native.body);
      expect(result.native.cta).to.equal(bidResponses.normal.native.native.cta);
      expect(decodeURIComponent(result.native.privacyLink)).to.equal(bidResponses.normal.native.native.privacyLink);
      expect(result.native.clickUrl).to.equal(bidResponses.normal.native.native.clickUrl);
      expect(result.native.impressionTrackers[0]).to.equal(bidResponses.normal.native.native.impressionTrackers[0]);
      expect(result.native.clickTrackers[0]).to.equal(bidResponses.normal.native.native.clickTrackers[0]);
      expect(result.mediaType).to.equal(bidResponses.normal.native.mediaType);
      // no adomain
      expect(result).to.not.have.any.keys('meta');
      expect(result).to.not.have.any.keys('advertiserDomains');
    });

    describe('currency handling', function () {
      const bidRequest = {
        method: 'POST',
        url: 'https://d.socdm.com/adgen/prebid',
        data: {
          currency: 'USD',
          pbver: prebid.version,
          sdkname: 'prebidjs',
          adapterver: ADGENE_PREBID_VERSION,
          ortb: {
            imp: [{
              id: 'test-imp-id',
              ext: {
                params: { id: '58278' },
                mediaTypes: { banner: { sizes: [[300, 250]] } }
              }
            }]
          }
        }
      };

      it('uses currency from data when available', function () {
        const serverResponse = {
          body: {
            results: [{
              cpm: 100,
              w: 300,
              h: 250,
              creativeid: 'test-creative-id',
              dealid: 'test-deal-id',
              ad: '<div>Test Ad</div>'
            }]
          }
        };

        const result = spec.interpretResponse(serverResponse, bidRequest)[0];
        expect(result.currency).to.equal('USD');
        expect(result.cpm).to.equal(100);
      });

      it('defaults to JPY when no currency information available', function () {
        const requestWithoutCurrency = {
          method: 'POST',
          url: 'https://d.socdm.com/adgen/prebid',
          data: {
            pbver: prebid.version,
            sdkname: 'prebidjs',
            adapterver: ADGENE_PREBID_VERSION,
            ortb: {
              imp: [{
                id: 'test-imp-id',
                ext: {
                  params: { id: '58278' },
                  mediaTypes: { banner: { sizes: [[300, 250]] } }
                }
              }]
            }
          }
        };

        const serverResponse = {
          body: {
            results: [{
              cpm: 300,
              w: 300,
              h: 250,
              creativeid: 'test-creative-id',
              dealid: 'test-deal-id',
              ad: '<div>Test Ad</div>'
            }]
          }
        };

        const result = spec.interpretResponse(serverResponse, requestWithoutCurrency)[0];
        expect(result.currency).to.equal('JPY');
      });

      it('handles currency correctly with getCurrencyType function logic', function () {
        // Test the current implementation which uses bidRequests?.data?.currency || 'JPY'
        const bidRequestWithJPY = {
          method: 'POST',
          url: 'https://d.socdm.com/adgen/prebid',
          data: {
            currency: 'JPY',
            pbver: prebid.version,
            sdkname: 'prebidjs',
            adapterver: ADGENE_PREBID_VERSION,
            ortb: {
              imp: [{
                id: 'test-imp-id',
                ext: {
                  params: { id: '58278' },
                  mediaTypes: { banner: { sizes: [[300, 250]] } }
                }
              }]
            }
          }
        };

        const serverResponse = {
          body: {
            results: [{
              cpm: 150,
              w: 300,
              h: 250,
              creativeid: 'test-creative-id',
              dealid: 'test-deal-id',
              ad: '<div>Test Ad</div>'
            }]
          }
        };

        const result = spec.interpretResponse(serverResponse, bidRequestWithJPY)[0];
        expect(result.currency).to.equal('JPY');
      });
    });
  });
});
