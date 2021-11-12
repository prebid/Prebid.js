import {expect} from 'chai';
import * as utils from 'src/utils';
import {spec as adapter} from 'modules/bricksBidAdapter';
import { BANNER, VIDEO } from '../../../src/mediaTypes';
import { createEidsArray } from 'modules/userId/eids.js';

const CURRENCY = 'EUR';
const TTL = 60;
const HTTP_METHOD = 'POST';
const REQUEST_URL = 'https://dev-bidadapter.viously.io/catch';
const USER_SYNC_URL = 'https://sync.bricks-co.com/sync';

const VALID_BID_BANNER = {
  bidder: 'bricks',
  bidId: '1a2b3c4d',
  params: {
    account: 'myaccount',
    id: 'id-1234',
  },
  mediaTypes: {
    banner: {
      sizes: [300, 50],
      pos: 1
    }
  }
};

const VALID_BID_VIDEO = {
  bidder: 'bricks',
  bidId: '5e6f7g8h',
  params: {
    account: 'otheraccount',
    id: 'id-5678',
  },
  mediaTypes: {
    video: {
      playerSize: [640, 360],
      protocols: [1, 2, 3, 4, 5, 6, 7, 8],
      api: [1, 2],
      mimes: ['video/mp4'],
      skip: 1,
      startdelay: 1,
      placement: 1,
      linearity: 1,
      minduration: 5,
      maxduration: 30,
      context: 'instream'
    }
  }
};

const VALID_REQUEST_BANNER = {
  method: HTTP_METHOD,
  url: REQUEST_URL,
  data: {
    account: 'myaccount',
    currency_code: CURRENCY,
    placements: [
      {
        id: 'id-1234',
        bid_id: '1a2b3c4d',
        sizes: ['300x50'],
        type: BANNER,
        position: 1
      }
    ]
  }
};

const VALID_REQUEST_VIDEO = {
  method: HTTP_METHOD,
  url: REQUEST_URL,
  data: {
    account: 'otheraccount',
    currency_code: CURRENCY,
    placements: [
      {
        id: 'id-5678',
        bid_id: '5e6f7g8h',
        sizes: ['640x360'],
        type: VIDEO,
        video_params: {
          protocols: [1, 2, 3, 4, 5, 6, 7, 8],
          api: [1, 2],
          mimes: ['video/mp4'],
          skip: 1,
          startdelay: 1,
          placement: 1,
          linearity: 1,
          minduration: 5,
          maxduration: 30,
          outstream: false
        }
      }
    ]
  }
};

describe('BricksAdapter', function () {
  describe('isBidRequestValid', function () {
    describe('Check method return', function () {
      it('should return true', function () {
        expect(adapter.isBidRequestValid(VALID_BID_BANNER)).to.equal(true);
        expect(adapter.isBidRequestValid(VALID_BID_VIDEO)).to.equal(true);
      });

      it('should return false because the account is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_BANNER);
        delete wrongBid.params.account;

        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the id is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_BANNER);
        delete wrongBid.params.id;

        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the banner size is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_BANNER);

        wrongBid.mediaTypes.banner.sizes = '123456';
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);

        delete wrongBid.mediaTypes.banner.sizes;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the banner pos paramater is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_BANNER);
        delete wrongBid.mediaTypes.banner.pos;

        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video player size paramater is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        wrongBid.mediaTypes.video.playerSize = '123456';
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);

        delete wrongBid.mediaTypes.video.playerSize;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video protocols parameter is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        wrongBid.mediaTypes.video.protocols = [9];
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);

        delete wrongBid.mediaTypes.video.protocols;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video api parameter is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        wrongBid.mediaTypes.video.api = [3];
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);

        delete wrongBid.mediaTypes.video.api;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video mimes parameter are missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        delete wrongBid.mediaTypes.video.mimes;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video skip parameter is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        delete wrongBid.mediaTypes.video.skip;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video startdelay parameter is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        delete wrongBid.mediaTypes.video.startdelay;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video placement parameter is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        delete wrongBid.mediaTypes.video.placement;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video linearity parameter is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        delete wrongBid.mediaTypes.video.linearity;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video minduration parameter is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        delete wrongBid.mediaTypes.video.minduration;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video maxduration parameter is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        delete wrongBid.mediaTypes.video.maxduration;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video context parameter is missing', function () {
        let wrongBid = utils.deepClone(VALID_BID_VIDEO);

        delete wrongBid.mediaTypes.video.context;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    describe('Check method return', function () {
      it('should return the right formatted banner requests', function() {
        expect(adapter.buildRequests([VALID_BID_BANNER])).to.deep.equal(VALID_REQUEST_BANNER);
      });

      it('should return the right formatted video requests', function() {
        expect(adapter.buildRequests([VALID_BID_VIDEO])).to.deep.equal(VALID_REQUEST_VIDEO);
      });

      it('should return the right formatted request with the referer info', function() {
        let bidderRequest = {
          refererInfo: {
            referer: 'https://www.example.com/test'
          }
        };

        let requests = utils.mergeDeep(utils.deepClone(VALID_REQUEST_BANNER), {
          data: {
            domain: 'www.example.com',
            page_domain: 'https://www.example.com/test'
          }
        });

        expect(adapter.buildRequests([VALID_BID_BANNER], bidderRequest)).to.deep.equal(requests);
      });

      it('should return the right formatted request with GDPR Consent info', function() {
        let bidderRequest = {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'abcdfefgh',
            addtlConsent: '1~12345678'
          }
        };

        let requests = utils.mergeDeep(utils.deepClone(VALID_REQUEST_VIDEO), {
          data: {
            gdpr: true,
            gdpr_consent: 'abcdfefgh',
            addtl_consent: '1~12345678'
          }
        });

        expect(adapter.buildRequests([VALID_BID_VIDEO], bidderRequest)).to.deep.equal(requests);
      });

      it('should return the right formatted request with US Privacy info', function() {
        let bidderRequest = {
          uspConsent: '1YNN'
        };

        let requests = utils.mergeDeep(utils.deepClone(VALID_REQUEST_BANNER), {
          data: {
            us_privacy: '1YNN'
          }
        });

        expect(adapter.buildRequests([VALID_BID_BANNER], bidderRequest)).to.deep.equal(requests);
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

        let bid = utils.mergeDeep(utils.deepClone(VALID_BID_VIDEO), {
          schain: schain
        });

        let requests = utils.mergeDeep(utils.deepClone(VALID_REQUEST_VIDEO), {
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

        let bid = utils.mergeDeep(utils.deepClone(VALID_BID_BANNER), {
          userIds: userIds
        }, {
          userIdAsEids: createEidsArray(userIds)
        });

        let requests = utils.mergeDeep(utils.deepClone(VALID_REQUEST_BANNER), {
          data: {
            users_uid: createEidsArray(userIds)
          }
        });

        expect(adapter.buildRequests([bid])).to.deep.equal(requests);
      });

      it('should return the right formatted request with blocklist info', function() {
        let blocklist = [
          'addomain.com',
          'addomain2.com'
        ];

        let bid = utils.mergeDeep(utils.deepClone(VALID_BID_VIDEO), {
          params: {
            blocklist: blocklist
          }
        });

        let requests = utils.mergeDeep(utils.deepClone(VALID_REQUEST_VIDEO), {
          data: {
            blocklist: blocklist
          }
        });

        expect(adapter.buildRequests([bid])).to.deep.equal(requests);
      });

      // TODO: Floor
    });
  });

  describe('interpretResponse', function() {
    describe('Check method return', function () {
      it('should return the right formatted response', function() {
        let response = {
          ads: [
            {
              bid: false,
              id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-0'
            },
            {
              bid: true,
              creative_id: '2468',
              id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-1',
              cpm: 8,
              ad: 'vast xml',
              ad_url: 'http://www.example.com/vast',
              type: 'video',
              size: '640x480',
              adomain: 'ads.com'
            },
            {
              bid: true,
              creative_id: '1357',
              id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-2',
              cpm: 1.5,
              ad: 'vast xml',
              type: 'banner',
              size: '300x50',
              adomain: 'ads2.com'
            },
            {
              bid: true,
              creative_id: '1469',
              id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-3',
              cpm: 4,
              ad: 'vast xml',
              type: 'video',
              size: '640x480',
              adomain: 'ads3.com'
            }
          ]
        };
        let requests = {
          data: [
            {
              id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-0',
              bid_id: '1234'
            },
            {
              id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-1',
              bid_id: '5678'
            },
            {
              id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-2',
              bid_id: '9101112'
            },
            {
              id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-3',
              bid_id: '2570'
            }
          ]};

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
            meta: {
              advertiserDomains: ['ads.com']
            },
            vastUrl: 'http://www.example.com/vast'
          },
          {
            requestId: '9101112',
            id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-2',
            cpm: 1.5,
            width: '300',
            height: '50',
            creativeId: '1357',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'banner',
            meta: {
              advertiserDomains: ['ads2.com']
            },
            ad: 'vast xml'
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
            meta: {
              advertiserDomains: ['ads3.com']
            },
            vastXml: 'vast xml'
          }
        ];

        expect(adapter.interpretResponse(response, requests)).to.deep.equal(formattedReponse);
      });
    });
  });

  describe('interpretResponse', function() {
    describe('Check method return', function () {
      let syncOptions = {
        iframeEnabled: false
      };

      let serverResponse = {
        body: {
          bid: true,
          creative_id: '2468',
          id: 'id-0157324f-bee4-5390-a14c-47a7da3eb73c-1',
          cpm: 8,
          ad: 'vast xml',
          ad_url: 'http://www.example.com/vast',
          type: 'video',
          size: '640x480',
          adomain: 'ads.com'
        }
      };

      let userSync = {
        type: 'iframe',
        url: USER_SYNC_URL
      }

      it('should return an empty array', function () {
        expect(adapter.getUserSyncs({}, [])).to.be.empty;
        expect(adapter.getUserSyncs(syncOptions, [serverResponse])).to.be.empty;
      });

      it('should return the user sync url object', function() {
        syncOptions.iframeEnabled = true;
        expect(adapter.getUserSyncs(syncOptions, [serverResponse])).to.deep.equal(userSync);
      });
    });
  });
});
