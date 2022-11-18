import {BidRequest} from '../../../libraries/ortb2.5StrictTranslator/spec.js';

// sample requests taken from ORTB 2.5 spec: https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf
const SAMPLE_REQUESTS = [
  {
    'id': '80ce30c53c16e6ede735f123ef6e32361bfc7b22',
    'at': 1,
    'cur': ['USD'],
    'imp': [
      {
        'id': '1',
        'bidfloor': 0.03,
        'banner': {
          'h': 250, 'w': 300, 'pos': 0
        }
      }
    ],
    'site': {
      'id': '102855',
      'cat': ['IAB3-1'],
      'domain': 'www.foobar.com',
      'page': 'http://www.foobar.com/1234.html ',
      'publisher': {
        'id': '8953',
        'name': 'foobar.com',
        'cat': ['IAB3-1'],
        'domain': 'foobar.com'
      }
    },
    'device': {
      'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2',
      'ip': '123.145.167.10'
    },
    'user': {
      'id': '55816b39711f9b5acf3b90e313ed29e51665623f'
    }
  },
  {
    'id': '123456789316e6ede735f123ef6e32361bfc7b22',
    'at': 2,
    'cur': ['USD'],
    'imp': [
      {
        'id': '1',
        'bidfloor': 0.03,
        'iframebuster': ['vendor1.com', 'vendor2.com'],
        'banner': {
          'h': 250,
          'w': 300,
          'pos': 0,
          'battr': [13],
          'expdir': [2, 4]
        }
      }
    ],
    'site': {
      'id': '102855',
      'cat': ['IAB3-1'],
      'domain': 'www.foobar.com',
      'page': 'http://www.foobar.com/1234.html',
      'publisher': {
        'id': '8953',
        'name': 'foobar.com',
        'cat': ['IAB3-1'],
        'domain': 'foobar.com'
      }
    },
    'device': {
      'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2',
      'ip': '123.145.167.10'
    },
    'user': {
      'id': '55816b39711f9b5acf3b90e313ed29e51665623f',
      'buyeruid': '545678765467876567898765678987654',
      'data': [
        {
          'id': '6',
          'name': 'Data Provider 1',
          'segment': [
            {
              'id': '12341318394918', 'name': 'auto intenders'
            },
            {
              'id': '1234131839491234', 'name': 'auto enthusiasts'
            },
            {
              'id': '23423424',
              'name': 'data-provider1-age',
              'value': '30-40'
            }
          ]
        }
      ]
    }
  },
  {
    'id': 'IxexyLDIIk',
    'at': 2,
    'bcat': ['IAB25', 'IAB7-39', 'IAB8-18', 'IAB8-5', 'IAB9-9'],
    'badv': ['apple.com', 'go-text.me', 'heywire.com'],
    'imp': [
      {
        'id': '1',
        'bidfloor': 0.5,
        'instl': 0,
        'tagid': 'agltb3B1Yi1pbmNyDQsSBFNpdGUY7fD0FAw',
        'banner': {
          'w': 728,
          'h': 90,
          'pos': 1,
          'btype': [4],
          'battr': [14],
          'api': [3]
        }
      }
    ],
    'app': {
      'id': 'agltb3B1Yi1pbmNyDAsSA0FwcBiJkfIUDA',
      'name': 'Yahoo Weather',
      'cat': ['IAB15', 'IAB15-10'],
      'ver': '1.0.2',
      'bundle': '12345',
      'storeurl': 'https://itunes.apple.com/id628677149',
      'publisher': {
        'id': 'agltb3B1Yi1pbmNyDAsSA0FwcBiJkfTUCV',
        'name': 'yahoo',
        'domain': 'www.yahoo.com'
      }
    },
    'device': {
      'dnt': 0,
      'ua': 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3',
      'ip': '123.145.167.189',
      'ifa': 'AA000DFE74168477C70D291f574D344790E0BB11',
      'carrier': 'VERIZON',
      'language': 'en',
      'make': 'Apple',
      'model': 'iPhone',
      'os': 'iOS',
      'osv': '6.1',
      'js': 1,
      'connectiontype': 3,
      'devicetype': 1,
      'geo': {
        'lat': 35.012345,
        'lon': -115.12345,
        'country': 'USA',
        'metro': '803',
        'region': 'CA',
        'city': 'Los Angeles',
        'zip': '90049'
      }
    },
    'user': {
      'id': 'ffffffd5135596709273b3a1a07e466ea2bf4fff',
      'yob': 1984,
      'gender': 'M'
    }
  },
  {
    'id': '1234567893',
    'at': 2,
    'tmax': 120,
    'imp': [
      {
        'id': '1',
        'bidfloor': 0.03,
        'video': {
          'w': 640,
          'h': 480,
          'pos': 1,
          'startdelay': 0,
          'minduration': 5,
          'maxduration': 30,
          'maxextended': 30,
          'minbitrate': 300,
          'maxbitrate': 1500,
          'api': [1, 2],
          'protocols': [2, 3],
          'mimes': [
            'video/x-flv',
            'video/mp4',
            'application/x-shockwave-flash',
            'application/javascript'
          ],
          'linearity': 1,
          'boxingallowed': 1,
          'playbackmethod': [1, 3],
          'delivery': [2],
          'battr': [13, 14],
          'companionad': [
            {
              'id': '1234567893-1',
              'w': 300,
              'h': 250,
              'pos': 1,
              'battr': [13, 14],
              'expdir': [2, 4]
            },
            {
              'id': '1234567893-2',
              'w': 728,
              'h': 90,
              'pos': 1,
              'battr': [13, 14]
            }
          ],
          'companiontype': [1, 2]
        }
      }
    ],
    'site': {
      'id': '1345135123',
      'name': 'Site ABCD',
      'domain': 'siteabcd.com',
      'cat': ['IAB2-1', 'IAB2-2'],
      'page': 'http://siteabcd.com/page.htm',
      'ref': 'http://referringsite.com/referringpage.htm',
      'privacypolicy': 1,
      'publisher': {
        'id': 'pub12345', 'name': 'Publisher A'
      },
      'content': {
        'id': '1234567',
        'series': 'All About Cars',
        'season': '2',
        'episode': 23,
        'title': 'Car Show',
        'cat': ['IAB2-2'],
        'keywords': 'keyword-a,keyword-b,keyword-c'
      }
    },
    'device': {
      'ip': '64.124.253.1',
      'ua': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.2.16) Gecko/20110319 Firefox/3.6.16',
      'os': 'OS X',
      'flashver': '10.1',
      'js': 1
    },
    'user': {
      'id': '456789876567897654678987656789',
      'buyeruid': '545678765467876567898765678987654',
      'data': [
        {
          'id': '6',
          'name': 'Data Provider 1',
          'segment': [
            {
              'id': '12341318394918', 'name': 'auto intenders'
            },
            {
              'id': '1234131839491234', 'name': 'auto enthusiasts'
            }
          ]
        }
      ]
    }
  },
  {
    'id': '80ce30c53c16e6ede735f123ef6e32361bfc7b22',
    'at': 1,
    'cur': ['USD'],
    'imp': [
      {
        'id': '1',
        'bidfloor': 0.03,
        'banner': {
          'h': 250, 'w': 300, 'pos': 0
        },
        'pmp': {
          'private_auction': 1,
          'deals': [
            {
              'id': 'AB-Agency1-0001',
              'at': 1,
              'bidfloor': 2.5,
              'wseat': ['Agency1']
            },
            {
              'id': 'XY-Agency2-0001',
              'at': 2,
              'bidfloor': 2,
              'wseat': ['Agency2']
            }
          ]
        }
      }
    ],
    'site': {
      'id': '102855',
      'domain': 'www.foobar.com',
      'cat': ['IAB3-1'],
      'page': 'http://www.foobar.com/1234.html',
      'publisher': {
        'id': '8953',
        'name': 'foobar.com',
        'cat': ['IAB3-1'],
        'domain': 'foobar.com'
      }
    },
    'device': {
      'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2',
      'ip': '123.145.167.10'
    },
    'user': {
      'id': '55816b39711f9b5acf3b90e313ed29e51665623f'
    }
  },
];

if (FEATURES.NATIVE) {
  SAMPLE_REQUESTS.push({
    'id': '80ce30c53c16e6ede735f123ef6e32361bfc7b22',
    'at': 1,
    'cur': ['USD'],
    'imp': [
      {
        'id': '1',
        'bidfloor': 0.03,
        'native': {
          'request': '{"native":{"ver":"1.0","assets":[ ... ]}}',
          'ver': '1.0',
          'api': [3],
          'battr': [13, 14]
        }
      }
    ],
    'site': {
      'id': '102855',
      'cat': ['IAB3-1'],
      'domain': 'www.foobar.com',
      'page': 'http://www.foobar.com/1234.html ',
      'publisher': {
        'id': '8953',
        'name': 'foobar.com',
        'cat': ['IAB3-1'],
        'domain': 'foobar.com'
      }
    },
    'device': {
      'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2',
      'ip': '123.145.167.10'
    },
    'user': {
      'id': '55816b39711f9b5acf3b90e313ed29e51665623f'
    }
  });
}

describe('BidRequest spec', () => {
  SAMPLE_REQUESTS.forEach((req, i) => {
    it(`accepts sample #${i}`, () => {
      const onError = sinon.stub();
      BidRequest(null, null, null, req, onError);
      sinon.assert.notCalled(onError);
    });
  });
});
