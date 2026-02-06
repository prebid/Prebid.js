import {expect} from 'chai';
import { deepClone, mergeDeep } from 'src/utils';
import {spec as adapter} from 'modules/sparteoBidAdapter';

const CURRENCY = 'EUR';
const TTL = 60;
const HTTP_METHOD = 'POST';
const REQUEST_URL = 'https://bid.sparteo.com/auction';
const USER_SYNC_URL_IFRAME = 'https://sync.sparteo.com/sync/iframe.html?from=prebidjs';

const VALID_BID_BANNER = {
  bidder: 'sparteo',
  bidId: '1a2b3c4d',
  adUnitCode: 'id-1234',
  params: {
    networkId: '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
    formats: ['corner']
  },
  mediaTypes: {
    banner: {
      sizes: [
        [1, 1]
      ]
    }
  }
};

const VALID_BID_VIDEO = {
  bidder: 'sparteo',
  bidId: '5e6f7g8h',
  adUnitCode: 'id-5678',
  params: {
    networkId: '1234567a-eb1b-1fae-1d23-e1fbaef234cf'
  },
  mediaTypes: {
    video: {
      playerSize: [640, 360],
      protocols: [1, 2, 3, 4, 5, 6, 7, 8],
      api: [1, 2],
      mimes: ['video/mp4'],
      skip: 1,
      startdelay: 0,
      placement: 1,
      linearity: 1,
      minduration: 5,
      maxduration: 30,
      context: 'instream'
    }
  },
  ortb2Imp: {
    ext: {
      pbadslot: 'video'
    }
  }
};

const VALID_REQUEST_BANNER = {
  method: HTTP_METHOD,
  url: REQUEST_URL,
  data: {
    'imp': [{
      'secure': 1,
      'id': '1a2b3c4d',
      'banner': {
        'format': [{
          'h': 1,
          'w': 1
        }],
        'topframe': 0
      },
      'ext': {
        'sparteo': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'adUnitCode': 'id-1234',
            'formats': ['corner']
          }
        }
      }
    }],
    'site': {
      'publisher': {
        'ext': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'pbjsVersion': '$prebid.version$'
          }
        }
      }
    },
    'test': 0
  }
};

const VALID_REQUEST_VIDEO = {
  method: HTTP_METHOD,
  url: REQUEST_URL,
  data: {
    'imp': [{
      'secure': 1,
      'id': '5e6f7g8h',
      'video': {
        'w': 640,
        'h': 360,
        'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
        'api': [1, 2],
        'mimes': ['video/mp4'],
        'skip': 1,
        'startdelay': 0,
        'placement': 1,
        'linearity': 1,
        'minduration': 5,
        'maxduration': 30,
      },
      'ext': {
        'pbadslot': 'video',
        'sparteo': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'adUnitCode': 'id-5678'
          }
        }
      }
    }],
    'site': {
      'publisher': {
        'ext': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'pbjsVersion': '$prebid.version$'
          }
        }
      }
    },
    'test': 0
  }
};

const VALID_REQUEST = {
  method: HTTP_METHOD,
  url: REQUEST_URL,
  data: {
    'imp': [{
      'secure': 1,
      'id': '1a2b3c4d',
      'banner': {
        'format': [{
          'h': 1,
          'w': 1
        }],
        'topframe': 0
      },
      'ext': {
        'sparteo': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'adUnitCode': 'id-1234',
            'formats': ['corner']
          }
        }
      }
    }, {
      'secure': 1,
      'id': '5e6f7g8h',
      'video': {
        'w': 640,
        'h': 360,
        'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
        'api': [1, 2],
        'mimes': ['video/mp4'],
        'skip': 1,
        'startdelay': 0,
        'placement': 1,
        'linearity': 1,
        'minduration': 5,
        'maxduration': 30,
      },
      'ext': {
        'pbadslot': 'video',
        'sparteo': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'adUnitCode': 'id-5678'
          }
        }
      }
    }],
    'site': {
      'publisher': {
        'ext': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'pbjsVersion': '$prebid.version$'
          }
        }
      }
    },
    'test': 0
  }
};

const BIDDER_REQUEST = {
  bids: [VALID_BID_BANNER, VALID_BID_VIDEO]
}

const BIDDER_REQUEST_BANNER = {
  bids: [VALID_BID_BANNER]
}

const BIDDER_REQUEST_VIDEO = {
  bids: [VALID_BID_VIDEO]
}

describe('SparteoAdapter', function () {
  describe('isBidRequestValid', function () {
    describe('Check method return', function () {
      it('should return true', function () {
        expect(adapter.isBidRequestValid(VALID_BID_BANNER)).to.equal(true);
        expect(adapter.isBidRequestValid(VALID_BID_VIDEO)).to.equal(true);
      });

      it('should return false because the networkId is missing', function () {
        const wrongBid = deepClone(VALID_BID_BANNER);
        delete wrongBid.params.networkId;

        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the banner size is missing', function () {
        const wrongBid = deepClone(VALID_BID_BANNER);

        wrongBid.mediaTypes.banner.sizes = '123456';
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);

        delete wrongBid.mediaTypes.banner.sizes;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video player size paramater is missing', function () {
        const wrongBid = deepClone(VALID_BID_VIDEO);

        wrongBid.mediaTypes.video.playerSize = '123456';
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);

        delete wrongBid.mediaTypes.video.playerSize;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    describe('Check method return', function () {
      if (FEATURES.VIDEO) {
        it('should return the right formatted requests', function() {
          const request = adapter.buildRequests([VALID_BID_BANNER, VALID_BID_VIDEO], BIDDER_REQUEST);
          delete request.data.id;

          expect(request).to.deep.equal(VALID_REQUEST);
        });
      }

      it('should return the right formatted banner requests', function() {
        const request = adapter.buildRequests([VALID_BID_BANNER], BIDDER_REQUEST_BANNER);
        delete request.data.id;

        expect(request).to.deep.equal(VALID_REQUEST_BANNER);
      });

      if (FEATURES.VIDEO) {
        it('should return the right formatted video requests', function() {
          const request = adapter.buildRequests([VALID_BID_VIDEO], BIDDER_REQUEST_VIDEO);
          delete request.data.id;

          expect(request).to.deep.equal(VALID_REQUEST_VIDEO);
        });
      }

      it('should return the right formatted request with endpoint test', function() {
        const endpoint = 'https://bid-test.sparteo.com/auction';

        const bids = mergeDeep(deepClone([VALID_BID_BANNER, VALID_BID_VIDEO]), {
          params: {
            endpoint: endpoint
          }
        });

        const requests = mergeDeep(deepClone(VALID_REQUEST));

        const request = adapter.buildRequests(bids, BIDDER_REQUEST);
        requests.url = endpoint;
        delete request.data.id;

        expect(requests).to.deep.equal(requests);
      });
    });
  });

  describe('interpretResponse', function() {
    describe('Check method return', function () {
      it('should return the right formatted response', function() {
        const response = {
          body: {
            'id': '63f4d300-6896-4bdc-8561-0932f73148b1',
            'cur': 'EUR',
            'seatbid': [
              {
                'seat': 'sparteo',
                'group': 0,
                'bid': [
                  {
                    'id': 'cdbb6982-a269-40c7-84e5-04797f11d87a',
                    'impid': '1a2b3c4d',
                    'price': 4.5,
                    'ext': {
                      'prebid': {
                        'type': 'banner'
                      }
                    },
                    'adm': 'script',
                    'crid': 'crid',
                    'w': 1,
                    'h': 1,
                    'nurl': 'https://t.bidder.sparteo.com/img'
                  }
                ]
              }
            ]
          }
        };

        if (FEATURES.VIDEO) {
          response.body.seatbid[0].bid.push({
            'id': 'cdbb6982-a269-40c7-84e5-04797f11d87b',
            'impid': '5e6f7g8h',
            'price': 5,
            'ext': {
              'prebid': {
                'type': 'video',
                'cache': {
                  'vastXml': {
                    'url': 'https://pbs.tet.com/cache?uuid=1234'
                  }
                }
              }
            },
            'adm': 'tag',
            'crid': 'crid',
            'w': 640,
            'h': 480,
            'nurl': 'https://t.bidder.sparteo.com/img'
          });
        }

        const formattedReponse = [
          {
            requestId: '1a2b3c4d',
            seatBidId: 'cdbb6982-a269-40c7-84e5-04797f11d87a',
            cpm: 4.5,
            width: 1,
            height: 1,
            creativeId: 'crid',
            creative_id: 'crid',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'banner',
            meta: {},
            ad: '<div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"https://t.bidder.sparteo.com/img\"></div>script'
          }
        ];

        if (FEATURES.VIDEO) {
          formattedReponse.push({
            requestId: '5e6f7g8h',
            seatBidId: 'cdbb6982-a269-40c7-84e5-04797f11d87b',
            cpm: 5,
            width: 640,
            height: 480,
            playerWidth: 640,
            playerHeight: 360,
            creativeId: 'crid',
            creative_id: 'crid',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'video',
            meta: {},
            nurl: 'https://t.bidder.sparteo.com/img',
            vastUrl: 'https://pbs.tet.com/cache?uuid=1234',
            vastXml: 'tag'
          });
        }

        if (FEATURES.VIDEO) {
          const request = adapter.buildRequests([VALID_BID_BANNER, VALID_BID_VIDEO], BIDDER_REQUEST);
          expect(adapter.interpretResponse(response, request)).to.deep.equal(formattedReponse);
        } else {
          const request = adapter.buildRequests([VALID_BID_BANNER], BIDDER_REQUEST_BANNER);
          expect(adapter.interpretResponse(response, request)).to.deep.equal(formattedReponse);
        }
      });

      if (FEATURES.VIDEO) {
        it('should interprete renderer config', function () {
          let response = {
            body: {
              'id': '63f4d300-6896-4bdc-8561-0932f73148b1',
              'cur': 'EUR',
              'seatbid': [
                {
                  'seat': 'sparteo',
                  'group': 0,
                  'bid': [
                    {
                      'id': 'cdbb6982-a269-40c7-84e5-04797f11d87b',
                      'impid': '5e6f7g8h',
                      'price': 5,
                      'ext': {
                        'prebid': {
                          'type': 'video',
                          'cache': {
                            'vastXml': {
                              'url': 'https://pbs.tet.com/cache?uuid=1234'
                            }
                          },
                          'renderer': {
                            'url': 'testVideoPlayer.js',
                            'options': {
                              'disableTopBar': true,
                              'showBigPlayButton': false,
                              'showProgressBar': 'bar',
                              'showVolume': false,
                              'showMute': true,
                              'allowFullscreen': true
                            }
                          }
                        }
                      },
                      'adm': 'tag',
                      'crid': 'crid',
                      'w': 640,
                      'h': 480,
                      'nurl': 'https://t.bidder.sparteo.com/img'
                    }
                  ]
                }
              ]
            }
          };

          const request = adapter.buildRequests([VALID_BID_BANNER, VALID_BID_VIDEO], BIDDER_REQUEST);
          let formattedReponse = adapter.interpretResponse(response, request);

          expect(formattedReponse[0].renderer.url).to.equal(response.body.seatbid[0].bid[0].ext.prebid.renderer.url);
          expect(formattedReponse[0].renderer.config).to.deep.equal(response.body.seatbid[0].bid[0].ext.prebid.renderer);
        });
      }
    });
  });

  describe('onBidWon', function() {
    describe('Check methods succeed', function () {
      it('should not throw error', function() {
        const bids = [
          {
            requestId: '1a2b3c4d',
            seatBidId: 'cdbb6982-a269-40c7-84e5-04797f11d87a',
            cpm: 4.5,
            width: 1,
            height: 1,
            creativeId: 'crid',
            creative_id: 'crid',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'banner',
            meta: {},
            ad: 'script<div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"https://t.bidder.sparteo.com/img\"></div>',
            nurl: [
              'win.domain.com'
            ]
          },
          {
            requestId: '2570',
            seatBidId: 'cdbb6982-a269-40c7-84e5-04797f11d87b',
            id: 'id-5678',
            cpm: 5,
            width: 640,
            height: 480,
            creativeId: 'crid',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'video',
            meta: {},
            vastXml: 'vast xml',
            nurl: [
              'win.domain2.com'
            ]
          }
        ];

        bids.forEach(function(bid) {
          expect(adapter.onBidWon.bind(adapter, bid)).to.not.throw();
        });
      });
    });
  });

  describe('getUserSyncs', function() {
    describe('Check methods succeed', function () {
      it('should return the sync url', function() {
        const syncOptions = {
          'iframeEnabled': true,
          'pixelEnabled': false
        };
        const gdprConsent = {
          gdprApplies: 1,
          consentString: 'tcfv2'
        };
        const uspConsent = {
          consentString: '1Y---'
        };

        const syncUrls = [{
          type: 'iframe',
          url: USER_SYNC_URL_IFRAME + '&gdpr=1&gdpr_consent=tcfv2&usp_consent=1Y---'
        }];

        expect(adapter.getUserSyncs(syncOptions, null, gdprConsent, uspConsent)).to.deep.equal(syncUrls);
      });
    });
  });
});
