import { expect } from 'chai';
import { spec } from '../../../modules/adstirBidAdapter.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';

describe('AdstirAdapter', function () {
  describe('isBidRequestValid', function () {
    it('should return true if appId is non-empty string and adSpaceNo is integer', function () {
      const bid = {
        params: {
          appId: 'MEDIA-XXXXXX',
          adSpaceNo: 6,
        }
      }
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return false if appId is non-empty string, but adSpaceNo is not integer', function () {
      const bid = {
        params: {
          appId: 'MEDIA-XXXXXX',
          adSpaceNo: 'a',
        }
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false if appId is non-empty string, but adSpaceNo is null', function () {
      const bid = {
        params: {
          appId: 'MEDIA-XXXXXX',
          adSpaceNo: null,
        }
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false if appId is non-empty string, but adSpaceNo is undefined', function () {
      const bid = {
        params: {
          appId: 'MEDIA-XXXXXX'
        }
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false if adSpaceNo is integer, but appId is empty string', function () {
      const bid = {
        params: {
          appId: '',
          adSpaceNo: 6,
        }
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false if adSpaceNo is integer, but appId is not string', function () {
      const bid = {
        params: {
          appId: 123,
          adSpaceNo: 6,
        }
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false if adSpaceNo is integer, but appId is null', function () {
      const bid = {
        params: {
          appId: null,
          adSpaceNo: 6,
        }
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false if adSpaceNo is integer, but appId is undefined', function () {
      const bid = {
        params: {
          adSpaceNo: 6,
        }
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false if params is empty', function () {
      const bid = {
        params: {}
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const validBidRequests = [
      {
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidder: 'adstir',
        bidId: 'bidid1111',
        params: {
          appId: 'MEDIA-XXXXXX',
          adSpaceNo: 1,
        },
        transactionId: 'transactionid-1111',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [336, 280],
            ],
          }
        },
        sizes: [
          [300, 250],
          [336, 280],
        ],
      },
      {
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidder: 'adstir',
        bidId: 'bidid2222',
        params: {
          appId: 'MEDIA-XXXXXX',
          adSpaceNo: 2,
        },
        transactionId: 'transactionid-2222',
        mediaTypes: {
          banner: {
            sizes: [
              [320, 50],
              [320, 100],
            ],
          }
        },
        sizes: [
          [320, 50],
          [320, 100],
        ],
      },
    ];

    const bidderRequest = {
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      refererInfo: {
        page: 'https://ad-stir.com/contact',
        topmostLocation: 'https://ad-stir.com/contact',
        reachedTop: true,
        ref: 'https://test.example/q=adstir',
        isAmp: false,
        numIframes: 0,
        stack: [
          'https://ad-stir.com/contact',
        ],
      },
    };

    it('one entry in validBidRequests corresponds to one server request object.', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      expect(requests.length).to.equal(validBidRequests.length);
      requests.forEach(function (r, i) {
        expect(r.method).to.equal('POST');
        expect(r.url).to.equal('https://ad.ad-stir.com/prebid');
        const d = JSON.parse(r.data);
        expect(d.auctionId).to.equal('b06c5141-fe8f-4cdf-9d7d-54415490a917');

        const v = validBidRequests[i];
        expect(d.appId).to.equal(v.params.appId);
        expect(d.adSpaceNo).to.equal(v.params.adSpaceNo);
        expect(d.bidId).to.equal(v.bidId);
        expect(d.transactionId).to.equal(v.transactionId);
        expect(d.mediaTypes).to.deep.equal(v.mediaTypes);
        expect(d.sizes).to.deep.equal(v.sizes);
        expect(d.ref.page).to.equal(bidderRequest.refererInfo.page);
        expect(d.ref.tloc).to.equal(bidderRequest.refererInfo.topmostLocation);
        expect(d.ref.referrer).to.equal(bidderRequest.refererInfo.ref);
        expect(d.sua).to.equal(null);
        expect(d.user).to.equal(null);
        expect(d.gdpr).to.equal(false);
        expect(d.usp).to.equal(false);
        expect(d.schain).to.equal(null);
        expect(d.eids).to.deep.equal([]);
      });
    });

    it('ref.page, ref.tloc and ref.referrer correspond to refererInfo', function () {
      const [ request ] = spec.buildRequests([validBidRequests[0]], {
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        refererInfo: {
          page: null,
          topmostLocation: 'https://adserver.example/iframe1.html',
          reachedTop: false,
          ref: null,
          isAmp: false,
          numIframes: 2,
          stack: [
            null,
            'https://adserver.example/iframe1.html',
            'https://adserver.example/iframe2.html'
          ],
        },
      });

      const { ref } = JSON.parse(request.data);
      expect(ref.page).to.equal(null);
      expect(ref.tloc).to.equal('https://adserver.example/iframe1.html');
      expect(ref.referrer).to.equal(null);
    });

    it('when config.pageUrl is not set, ref.topurl equals to refererInfo.reachedTop', function () {
      let bidderRequestClone = utils.deepClone(bidderRequest);
      [true, false].forEach(function (reachedTop) {
        bidderRequestClone.refererInfo.reachedTop = reachedTop;
        const requests = spec.buildRequests(validBidRequests, bidderRequestClone);
        const d = JSON.parse(requests[0].data);
        expect(d.ref.topurl).to.equal(reachedTop);
      });
    });

    describe('when config.pageUrl is set, ref.topurl is always false', function () {
      before(function () {
        config.setConfig({ pageUrl: 'https://ad-stir.com/register' });
      });
      after(function () {
        config.resetConfig();
      });

      it('ref.topurl should be false', function () {
        let bidderRequestClone = utils.deepClone(bidderRequest);
        [true, false].forEach(function (reachedTop) {
          bidderRequestClone.refererInfo.reachedTop = reachedTop;
          const requests = spec.buildRequests(validBidRequests, bidderRequestClone);
          const d = JSON.parse(requests[0].data);
          expect(d.ref.topurl).to.equal(false);
        });
      });
    });

    it('gdprConsent.gdprApplies is sent', function () {
      let bidderRequestClone = utils.deepClone(bidderRequest);
      [true, false].forEach(function (gdprApplies) {
        bidderRequestClone.gdprConsent = { gdprApplies };
        const requests = spec.buildRequests(validBidRequests, bidderRequestClone);
        const d = JSON.parse(requests[0].data);
        expect(d.gdpr).to.equal(gdprApplies);
      });
    });

    it('includes in the request parameters whether CCPA applies', function () {
      let bidderRequestClone = utils.deepClone(bidderRequest);
      const cases = [
        { uspConsent: '1---', expected: false },
        { uspConsent: '1YYY', expected: true },
        { uspConsent: '1YNN', expected: true },
        { uspConsent: '1NYN', expected: true },
        { uspConsent: '1-Y-', expected: true },
      ];
      cases.forEach(function ({ uspConsent, expected }) {
        bidderRequestClone.uspConsent = uspConsent;
        const requests = spec.buildRequests(validBidRequests, bidderRequestClone);
        const d = JSON.parse(requests[0].data);
        expect(d.usp).to.equal(expected);
      });
    });

    it('should add schain if available', function() {
      const schain = {
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'asi': 'exchange1.example',
            'sid': '1234!abcd',
            'hp': 1,
            'rid': 'bid-request-1',
            'name': 'publisher, Inc.',
            'domain': 'publisher.example'
          },
          {
            'asi': 'exchange2.example',
            'sid': 'abcd',
            'hp': 1,
            'rid': 'bid-request-2',
            'name': 'intermediary',
            'domain': 'intermediary.example'
          }
        ]
      };
      const serializedSchain = '1.0,1!exchange1.example,1234%21abcd,1,bid-request-1,publisher%2C%20Inc.,publisher.example!exchange2.example,abcd,1,bid-request-2,intermediary,intermediary.example';

      const [ request ] = spec.buildRequests([utils.mergeDeep(utils.deepClone(validBidRequests[0]), { schain })], bidderRequest);
      const d = JSON.parse(request.data);
      expect(d.schain).to.deep.equal(serializedSchain);
    });

    it('should add schain even if some nodes params are blank', function() {
      const schain = {
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'asi': 'exchange1.example',
            'sid': '1234!abcd',
            'hp': 1,
          },
          {
          },
          {
            'asi': 'exchange2.example',
            'sid': 'abcd',
            'hp': 1,
          },
        ]
      };
      const serializedSchain = '1.0,1!exchange1.example,1234%21abcd,1,,,!,,,,,!exchange2.example,abcd,1,,,';

      const [ request ] = spec.buildRequests([utils.mergeDeep(utils.deepClone(validBidRequests[0]), { schain })], bidderRequest);
      const d = JSON.parse(request.data);
      expect(d.schain).to.deep.equal(serializedSchain);
    });

    it('should add UA client hints to payload if available', function () {
      const sua = {
        browsers: [
          {
            brand: 'Not?A_Brand',
            version: [
              '8',
              '0',
              '0',
              '0'
            ]
          },
          {
            version: [
              '108',
              '0',
              '5359',
              '40'
            ]
          },
          {
            brand: 'Google Chrome',
            version: [
              '108',
              '0',
              '5359',
              '40'
            ]
          }
        ],
        platform: {
          brand: 'Android',
          version: [
            '11'
          ]
        },
        mobile: 1,
        architecture: '',
        bitness: '64',
        model: 'Pixel 5',
        source: 2
      }

      const validBidRequestsClone = utils.deepClone(validBidRequests);
      validBidRequestsClone[0] = utils.mergeDeep(validBidRequestsClone[0], {
        ortb2: {
          device: { sua },
        }
      });

      const requests = spec.buildRequests(validBidRequestsClone, bidderRequest);
      requests.forEach(function (r) {
        const d = JSON.parse(r.data);
        expect(d.sua).to.deep.equal(sua);
      });
    });
  });

  describe('interpretResponse', function () {
    it('return empty array when no content', function () {
      const bids = spec.interpretResponse({ body: '' });
      expect(bids).to.deep.equal([]);
    });
    it('return empty array when seatbid empty', function () {
      const bids = spec.interpretResponse({ body: { seatbid: [] } });
      expect(bids).to.deep.equal([]);
    });
    it('return valid bids when serverResponse is valid', function () {
      const serverResponse = {
        'body': {
          'seatbid': [
            {
              'bid': {
                'ad': '<div>test response</div>',
                'cpm': 5250,
                'creativeId': '5_1234ABCD',
                'currency': 'JPY',
                'height': 250,
                'meta': {
                  'advertiserDomains': [
                    'adv.example'
                  ],
                  'mediaType': 'banner',
                  'networkId': 5
                },
                'netRevenue': true,
                'requestId': '22a9457aed98a4',
                'transactionId': 'f18c078e-4d2a-4ecb-a886-2a0c52187213',
                'ttl': 60,
                'width': 300,
              }
            }
          ]
        },
        'headers': {}
      };
      const bids = spec.interpretResponse(serverResponse);
      expect(bids[0]).to.deep.equal(serverResponse.body.seatbid[0].bid);
    });
  });
});
