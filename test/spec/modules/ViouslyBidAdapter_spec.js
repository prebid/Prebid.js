import {expect} from 'chai';

import { deepClone, mergeDeep } from 'src/utils';
import { createEidsArray } from 'modules/userId/eids.js';

import {spec as adapter} from 'modules/viouslyBidAdapter';

import sinon from 'sinon';
import { config } from 'src/config.js';

const CURRENCY = 'EUR';
const TTL = 60;
const HTTP_METHOD = 'POST';
const REQUEST_URL = 'https://bidder.viously.com/bid';

const VALID_BID_VIDEO = {
  bidder: 'viously',
  bidId: '5e6f7g8h',
  adUnitCode: 'id-5678',
  params: {
    pid: '123e4567-e89b-12d3-a456-426614174001'
  },
  mediaTypes: {
    video: {
      playerSize: [640, 360],
      context: 'instream',
      playbackmethod: [1, 2, 3, 4]
    }
  }
};

const VALID_REQUEST_VIDEO = {
  method: HTTP_METHOD,
  url: REQUEST_URL,
  data: {
    pid: '123e4567-e89b-12d3-a456-426614174001',
    currency_code: CURRENCY,
    placements: [
      {
        id: 'id-5678',
        bid_id: '5e6f7g8h',
        video_params: {
          context: 'instream',
          playbackmethod: [1, 2, 3, 4],
          size: ['640x360']
        }
      }
    ]
  }
};

const VALID_GDPR = {
  gdprApplies: true,
  apiVersion: 2,
  consentString: 'abcdefgh',
  addtlConsent: '1~12345678',
  vendorData: {
    purpose: {
      consents: {
        1: true
      }
    }
  }
};
const US_PRIVACY = '1YNN';

describe('ViouslyAdapter', function () {
  describe('isBidRequestValid', function () {
    describe('Check method return', function () {
      it('should return true', function () {
        expect(adapter.isBidRequestValid(VALID_BID_VIDEO)).to.equal(true);
      });

      it('should return false because the pid is missing', function () {
        let wrongBid = deepClone(VALID_BID_VIDEO);
        delete wrongBid.params.pid;

        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video context parameter is missing', function () {
        let wrongBid = deepClone(VALID_BID_VIDEO);

        delete wrongBid.mediaTypes.video.context;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    describe('Check method return', function () {
      it('should return the right formatted video requests', function() {
        expect(adapter.buildRequests([VALID_BID_VIDEO])).to.deep.equal(VALID_REQUEST_VIDEO);
      });

      it('should return the right formatted request with the referer info', function() {
        let bidderRequest = {
          refererInfo: {
            page: 'https://www.example.com/test'
          }
        };

        let requests = mergeDeep(deepClone(VALID_REQUEST_VIDEO), {
          data: {
            domain: 'www.example.com',
            page_domain: 'https://www.example.com/test'
          }
        });

        expect(adapter.buildRequests([VALID_BID_VIDEO], bidderRequest)).to.deep.equal(requests);
      });

      it('should return the right formatted request with the referer info from config', function() {
        /** Mock the config.getConfig method */
        sinon.stub(config, 'getConfig')
          .withArgs('pageUrl')
          .returns('https://www.example.com/page');

        let requests = mergeDeep(deepClone(VALID_REQUEST_VIDEO), {
          data: {
            domain: 'www.example.com',
            page_domain: 'https://www.example.com/page'
          }
        });

        expect(adapter.buildRequests([VALID_BID_VIDEO])).to.deep.equal(requests);

        config.getConfig.restore();
      });

      it('should return the right formatted request with GDPR Consent info', function() {
        let bidderRequest = {
          gdprConsent: VALID_GDPR
        };

        let requests = mergeDeep(deepClone(VALID_REQUEST_VIDEO), {
          data: {
            gdpr: true,
            gdpr_consent: 'abcdefgh',
            addtl_consent: '1~12345678'
          }
        });

        expect(adapter.buildRequests([VALID_BID_VIDEO], bidderRequest)).to.deep.equal(requests);
      });

      it('should return the right formatted request with US Privacy info', function() {
        let bidderRequest = {
          uspConsent: US_PRIVACY
        };

        let requests = mergeDeep(deepClone(VALID_REQUEST_VIDEO), {
          data: {
            us_privacy: US_PRIVACY
          }
        });

        expect(adapter.buildRequests([VALID_BID_VIDEO], bidderRequest)).to.deep.equal(requests);
      });

      // TODO: Supply chain
      it('should return the right formatted request with Supply Chain info', function() {
        let schain = {
          'ver': '1.0',
          'complete': 1,
          'nodes': [
            {
              'asi': 'test1.com',
              'sid': '00001',
              'hp': 1
            },
            {
              'asi': 'test2-2.com',
              'sid': '00002',
              'hp': 2
            }
          ]
        };

        let bid = mergeDeep(deepClone(VALID_BID_VIDEO), {
          schain: schain
        });

        let requests = mergeDeep(deepClone(VALID_REQUEST_VIDEO), {
          data: {
            schain: schain
          }
        });

        expect(adapter.buildRequests([bid])).to.deep.equal(requests);
      });

      it('should return the right formatted request with User Ids info', function() {
        let userIds = {
          idl_env: '1234-5678-9012-3456', // Liveramp
          netId: 'testnetid123', // NetId
          IDP: 'userIDP000', // IDP
          fabrickId: 'fabrickId9000', // FabrickId
          uid2: { id: 'testuid2' } // UID 2.0
        };

        let bid = mergeDeep(deepClone(VALID_BID_VIDEO), {
          userIds: userIds
        }, {
          userIdAsEids: createEidsArray(userIds)
        });

        let requests = mergeDeep(deepClone(VALID_REQUEST_VIDEO), {
          data: {
            users_uid: createEidsArray(userIds)
          }
        });

        expect(adapter.buildRequests([bid])).to.deep.equal(requests);
      });

      it('should return the right formatted request with endpint test', function() {
        let endpoint = 'https://bid-test.viously.com/prebid';

        let bid = mergeDeep(deepClone(VALID_BID_VIDEO), {
          params: {
            endpoint: endpoint
          }
        });

        let requests = mergeDeep(deepClone(VALID_REQUEST_VIDEO));

        requests.url = endpoint;

        expect(adapter.buildRequests([bid])).to.deep.equal(requests);
      });

      // TODO: Floor
    });
  });

  describe('interpretResponse', function() {
    describe('Check method return', function () {
      it('should return the right formatted response', function() {
        let response = {
          body: {
            ads: [
              {
                bid: false,
                id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-0',
                bid_id: '1234'
              },
              {
                bid: true,
                creative_id: '2468',
                id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-1',
                bid_id: '5678',
                cpm: 8,
                ad: 'vast xml',
                ad_url: 'http://www.example.com/vast',
                type: 'video',
                size: '640x480',
                nurl: [
                  'win.domain.com'
                ]
              },
              {
                bid: true,
                creative_id: '1469',
                id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-3',
                bid_id: '2570',
                cpm: 4,
                ad: 'vast xml',
                type: 'video',
                size: '640x480',
              }
            ]
          }
        };
        let requests = {
          data: {
            placements: [
              {
                id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-0',
                bid_id: '1234'
              },
              {
                id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-1',
                bid_id: '5678'
              },
              {
                id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-3',
                bid_id: '2570'
              }
            ]
          }
        };

        let formattedReponse = [
          {
            requestId: '5678',
            id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-1',
            cpm: 8,
            width: '640',
            height: '480',
            creativeId: '2468',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'video',
            meta: {},
            vastUrl: 'http://www.example.com/vast',
            nurl: [
              'win.domain.com'
            ]
          },
          {
            requestId: '2570',
            id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-3',
            cpm: 4,
            width: '640',
            height: '480',
            creativeId: '1469',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'video',
            meta: {},
            vastXml: 'vast xml',
            nurl: []
          }
        ];

        expect(adapter.interpretResponse(response, requests)).to.deep.equal(formattedReponse);
      });
    });
  });

  describe('onBidWon', function() {
    describe('Check methods succeed', function () {
      it('should not throw error', function() {
        let bids = [
          {
            requestId: '5678',
            id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-1',
            cpm: 8,
            width: '640',
            height: '480',
            creativeId: '2468',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'video',
            meta: {},
            vastUrl: 'http://www.example.com/vast',
            nurl: [
              'win.domain.com'
            ]
          },
          {
            requestId: '2570',
            id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-3',
            cpm: 4,
            width: '640',
            height: '480',
            creativeId: '1469',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'video',
            meta: {},
            vastXml: 'vast xml',
            nurl: []
          }
        ];

        bids.forEach(function(bid) {
          expect(adapter.onBidWon.bind(adapter, bid)).to.not.throw();
        });
      });
    });
  });
});
