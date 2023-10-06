import {expect} from 'chai';
import { deepClone, mergeDeep } from 'src/utils';
import {spec as adapter} from 'modules/sparteoBidAdapter';

const CURRENCY = 'EUR';
const TTL = 60;
const HTTP_METHOD = 'POST';
const REQUEST_URL = 'https://bid.sparteo.com/auction';

const VALID_BID_BANNER = {
  bidder: 'sparteo',
  bidId: '1a2b3c4d',
  adUnitCode: 'id-1234',
  params: {
    networkId: '1234567a-eb1b-1fae-1d23-e1fbaef234cf'
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
      'id': '1a2b3c4d',
      'banner': {
        'format': [{
          'h': 1,
          'w': 1
        }],
        'topframe': 0
      }
    }],
    'site': {
      'publisher': {
        'ext': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf'
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
        'pbadslot': 'video'
      }
    }],
    'site': {
      'publisher': {
        'ext': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf'
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
      'id': '1a2b3c4d',
      'banner': {
        'format': [{
          'h': 1,
          'w': 1
        }],
        'topframe': 0
      }
    }, {
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
        'pbadslot': 'video'
      }
    }],
    'site': {
      'publisher': {
        'ext': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf'
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
        let wrongBid = deepClone(VALID_BID_BANNER);
        delete wrongBid.params.networkId;

        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the banner size is missing', function () {
        let wrongBid = deepClone(VALID_BID_BANNER);

        wrongBid.mediaTypes.banner.sizes = '123456';
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);

        delete wrongBid.mediaTypes.banner.sizes;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video player size paramater is missing', function () {
        let wrongBid = deepClone(VALID_BID_VIDEO);

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
        let endpoint = 'https://bid-test.sparteo.com/auction';

        let bids = mergeDeep(deepClone([VALID_BID_BANNER, VALID_BID_VIDEO]), {
          params: {
            endpoint: endpoint
          }
        });

        let requests = mergeDeep(deepClone(VALID_REQUEST));

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
                'type': 'video'
              }
            },
            'adm': 'tag',
            'crid': 'crid',
            'w': 640,
            'h': 480,
            'nurl': 'https://t.bidder.sparteo.com/img'
          });
        }

        let formattedReponse = [
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
            ad: 'script<div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"https://t.bidder.sparteo.com/img\"></div>'
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
            vastUrl: 'https://t.bidder.sparteo.com/img',
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
    });
  });

  describe('onBidWon', function() {
    describe('Check methods succeed', function () {
      it('should not throw error', function() {
        let bids = [
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
});
