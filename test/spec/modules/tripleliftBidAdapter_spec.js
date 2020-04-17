import { expect } from 'chai';
import { tripleliftAdapterSpec } from 'modules/tripleliftBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';
import { config } from 'src/config.js';
import prebid from '../../../package.json';

const ENDPOINT = 'https://tlx.3lift.com/header/auction?';
const GDPR_CONSENT_STR = 'BOONm0NOONm0NABABAENAa-AAAARh7______b9_3__7_9uz_Kv_K7Vf7nnG072lPVA9LTOQ6gEaY';

describe('triplelift adapter', function () {
  const adapter = newBidder(tripleliftAdapterSpec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      bidder: 'triplelift',
      params: {
        inventoryCode: '12345',
        floor: 1.0,
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true for valid bid request', function () {
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        inventoryCode: 'another_inv_code',
        floor: 0.05
      };
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        floor: 1.0
      };
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests;
    let bidderRequest;
    const schain = {
      validation: 'strict',
      config: {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'indirectseller.com',
            sid: '00001',
            hp: 1,
          }
        ]
      }
    };

    this.beforeEach(() => {
      bidRequests = [
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: '12345',
            floor: 1.0,
          },
          adUnitCode: 'adunit-code',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        }
      ];

      bidderRequest = {
        bidderCode: 'triplelift',
        auctionId: 'a7ebcd1d-66ff-4b5c-a82c-6a21a6ee5a18',
        bidderRequestId: '5c55612f99bc11',
        bids: [
          {
            imp_id: 0,
            cpm: 1.062,
            width: 300,
            height: 250,
            ad: 'ad-markup',
            iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg'
          }
        ],
        refererInfo: {
          referer: 'https://examplereferer.com'
        },
        gdprConsent: {
          consentString: GDPR_CONSENT_STR,
          gdprApplies: true
        },
      };
    });

    it('exists and is an object', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request).to.exist.and.to.be.a('object');
    });

    it('should only parse sizes that are of the proper length and format', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].banner.format).to.have.length(2);
      expect(request.data.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
    });

    it('should be a post request and populate the payload', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.imp[0].tagid).to.equal('12345');
      expect(payload.imp[0].floor).to.equal(1.0);
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
    });

    it('should add tdid to the payload if included', function () {
      const id = '6bca7f6b-a98a-46c0-be05-6020f7604598';
      bidRequests[0].userId.tdid = id;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({ext: {eids: [{source: 'adserver.org', uids: [{id, ext: {rtiPartner: 'TDID'}}]}]}});
    });

    it('should add idl_env to the payload if included', function () {
      const id = 'XY6104gr0njcH9UDIR7ysFFJcm2XNpqeJTYslleJ_cMlsFOfZI';
      bidRequests[0].userId.idl_env = id;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({ext: {eids: [{source: 'liveramp.com', uids: [{id, ext: {rtiPartner: 'idl'}}]}]}});
    });

    it('should add criteoId to the payload if included', function () {
      const id = '53e30ea700424f7bbdd793b02abc5d7';
      bidRequests[0].userId.criteoId = id;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({ext: {eids: [{source: 'criteo.com', uids: [{id, ext: {rtiPartner: 'criteoId'}}]}]}});
    });

    it('should add tdid, idl_env and criteoId to the payload if both are included', function () {
      const tdidId = '6bca7f6b-a98a-46c0-be05-6020f7604598';
      const idlEnvId = 'XY6104gr0njcH9UDIR7ysFFJcm2XNpqeJTYslleJ_cMlsFOfZI';
      const criteoId = '53e30ea700424f7bbdd793b02abc5d7';
      bidRequests[0].userId.tdid = tdidId;
      bidRequests[0].userId.idl_env = idlEnvId;
      bidRequests[0].userId.criteoId = criteoId;

      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({
        ext: {
          eids: [
            {
              source: 'adserver.org',
              uids: [
                {
                  id: tdidId,
                  ext: { rtiPartner: 'TDID' }
                }
              ],
            },
            {
              source: 'liveramp.com',
              uids: [
                {
                  id: idlEnvId,
                  ext: { rtiPartner: 'idl' }
                }
              ]
            },
            {
              source: 'criteo.com',
              uids: [
                {
                  id: criteoId,
                  ext: { rtiPartner: 'criteoId' }
                }
              ]
            }
          ]
        }
      });
    });

    it('should add user ids from multiple bid requests', function () {
      const tdidId = '6bca7f6b-a98a-46c0-be05-6020f7604598';
      const idlEnvId = 'XY6104gr0njcH9UDIR7ysFFJcm2XNpqeJTYslleJ_cMlsFOfZI';
      const criteoId = '53e30ea700424f7bbdd793b02abc5d7';

      const bidRequestsMultiple = [
        { ...bidRequests[0], userId: { tdid: tdidId } },
        { ...bidRequests[0], userId: { idl_env: idlEnvId } },
        { ...bidRequests[0], userId: { criteoId: criteoId } }
      ];

      const request = tripleliftAdapterSpec.buildRequests(bidRequestsMultiple, bidderRequest);
      const payload = request.data;

      expect(payload.user).to.deep.equal({
        ext: {
          eids: [
            {
              source: 'adserver.org',
              uids: [
                {
                  id: tdidId,
                  ext: { rtiPartner: 'TDID' }
                }
              ],
            },
            {
              source: 'liveramp.com',
              uids: [
                {
                  id: idlEnvId,
                  ext: { rtiPartner: 'idl' }
                }
              ]
            },
            {
              source: 'criteo.com',
              uids: [
                {
                  id: criteoId,
                  ext: { rtiPartner: 'criteoId' }
                }
              ]
            }
          ]
        }
      });
    });

    it('should return a query string for TL call', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const url = request.url;
      expect(url).to.exist;
      expect(url).to.be.a('string');
      expect(url).to.match(/(?:tlx.3lift.com\/header\/auction)/)
      expect(url).to.match(/(?:lib=prebid)/)
      expect(url).to.match(new RegExp('(?:' + prebid.version + ')'))
      expect(url).to.match(/(?:referrer)/);
    });
    it('should return us_privacy param when CCPA info is available', function() {
      bidderRequest.uspConsent = '1YYY';
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const url = request.url;
      expect(url).to.match(/(\?|&)us_privacy=1YYY/);
    });
    it('should return coppa param when COPPA config is set to true', function() {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      config.getConfig.restore();
      const url = request.url;
      expect(url).to.match(/(\?|&)coppa=true/);
    });
    it('should not return coppa param when COPPA config is set to false', function() {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(false);
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      config.getConfig.restore();
      const url = request.url;
      expect(url).not.to.match(/(\?|&)coppa=/);
    });
    it('should return schain when present', function() {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const { data: payload } = request;
      expect(payload.ext.schain).to.deep.equal(schain);
    });
    it('should not create root level ext when schain is not present', function() {
      bidRequests[0].schain = undefined;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const { data: payload } = request;
      expect(payload.ext).to.deep.equal(undefined);
    });
  });

  describe('interpretResponse', function () {
    let response = {
      body: {
        bids: [
          {
            imp_id: 0,
            cpm: 1.062,
            width: 300,
            height: 250,
            ad: 'ad-markup',
            iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg'
          }
        ]
      }
    };
    let bidderRequest = {
      bidderCode: 'triplelift',
      auctionId: 'a7ebcd1d-66ff-4b5c-a82c-6a21a6ee5a18',
      bidderRequestId: '5c55612f99bc11',
      bids: [
        {
          imp_id: 0,
          cpm: 1.062,
          width: 300,
          height: 250,
          ad: 'ad-markup',
          iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg'
        }
      ],
      refererInfo: {
        referer: 'https://examplereferer.com'
      },
      gdprConsent: {
        consentString: GDPR_CONSENT_STR,
        gdprApplies: true
      }
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          requestId: '3db3773286ee59',
          cpm: 1.062,
          width: 300,
          height: 250,
          netRevenue: true,
          ad: 'ad-markup',
          creativeId: 29681110,
          dealId: '',
          currency: 'USD',
          ttl: 33,
        }
      ];
      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});
      expect(result).to.have.length(1);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('should return multiple responses to support SRA', function () {
      let response = {
        body: {
          bids: [
            {
              imp_id: 0,
              cpm: 1.062,
              width: 300,
              height: 250,
              ad: 'ad-markup',
              iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg'
            },
            {
              imp_id: 0,
              cpm: 1.9,
              width: 300,
              height: 600,
              ad: 'ad-markup-2',
              iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg'
            }
          ]
        }
      };
      let bidderRequest = {
        bidderCode: 'triplelift',
        auctionId: 'a7ebcd1d-66ff-4b5c-a82c-6a21a6ee5a18',
        bidderRequestId: '5c55612f99bc11',
        bids: [
          {
            imp_id: 0,
            cpm: 1.062,
            width: 300,
            height: 600,
            ad: 'ad-markup',
            iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg'
          },
          {
            imp_id: 0,
            cpm: 1.9,
            width: 300,
            height: 250,
            ad: 'ad-markup-2',
            iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg'
          }
        ],
        refererInfo: {
          referer: 'https://examplereferer.com'
        },
        gdprConsent: {
          consentString: GDPR_CONSENT_STR,
          gdprApplies: true
        }
      };
      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});
      expect(result).to.have.length(2);
    });
  });

  describe('getUserSyncs', function() {
    let expectedIframeSyncUrl = 'https://eb2.3lift.com/sync?gdpr=true&cmp_cs=' + GDPR_CONSENT_STR + '&';
    let expectedImageSyncUrl = 'https://eb2.3lift.com/sync?px=1&src=prebid&gdpr=true&cmp_cs=' + GDPR_CONSENT_STR + '&';

    it('returns undefined when syncing is not enabled', function() {
      expect(tripleliftAdapterSpec.getUserSyncs({})).to.equal(undefined);
      expect(tripleliftAdapterSpec.getUserSyncs()).to.equal(undefined);
    });

    it('returns iframe user sync pixel when iframe syncing is enabled', function() {
      let syncOptions = {
        iframeEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal(expectedIframeSyncUrl);
    });

    it('returns image user sync pixel when iframe syncing is disabled', function() {
      let syncOptions = {
        pixelEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions);
      expect(result[0].type).to.equal('image')
      expect(result[0].url).to.equal(expectedImageSyncUrl);
    });

    it('returns iframe user sync pixel when both options are enabled', function() {
      let syncOptions = {
        pixelEnabled: true,
        iframeEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal(expectedIframeSyncUrl);
    });
    it('sends us_privacy param when info is available', function() {
      let syncOptions = {
        iframeEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions, null, null, '1YYY');
      expect(result[0].url).to.match(/(\?|&)us_privacy=1YYY/);
    });
  });
});
