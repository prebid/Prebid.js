import {expect} from 'chai';
import {spec} from 'modules/opscoBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory.js';

describe('opscoBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', function () {
    const validBid = {
      bidder: 'opsco',
      params: {
        placementId: '123',
        publisherId: '456'
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    };

    it('should return true when required params are present', function () {
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('should return false when placementId is missing', function () {
      const invalidBid = {...validBid};
      delete invalidBid.params.placementId;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should return false when publisherId is missing', function () {
      const invalidBid = {...validBid};
      delete invalidBid.params.publisherId;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should return false when mediaTypes.banner.sizes is missing', function () {
      const invalidBid = {...validBid};
      delete invalidBid.mediaTypes.banner.sizes;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should return false when mediaTypes.banner is missing', function () {
      const invalidBid = {...validBid};
      delete invalidBid.mediaTypes.banner;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should return false when bid params are missing', function () {
      const invalidBid = {bidder: 'opsco'};
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should return false when bid params are empty', function () {
      const invalidBid = {bidder: 'opsco', params: {}};
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let validBid, bidderRequest;

    beforeEach(function () {
      validBid = {
        bidder: 'opsco',
        params: {
          placementId: '123',
          publisherId: '456'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };

      bidderRequest = {
        bidderRequestId: 'bid123',
        refererInfo: {
          domain: 'example.com',
          page: 'https://example.com/page',
          ref: 'https://referrer.com'
        },
        gdprConsent: {
          consentString: 'GDPR_CONSENT_STRING',
          gdprApplies: true
        },
      };
    });

    it('should return true when banner sizes are defined', function () {
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('should return false when banner sizes are invalid', function () {
      const invalidSizes = [
        '2:1',
        undefined,
        123,
        'undefined'
      ];

      invalidSizes.forEach((sizes) => {
        validBid.mediaTypes.banner.sizes = sizes;
        expect(spec.isBidRequestValid(validBid)).to.be.false;
      });
    });

    it('should send GDPR consent in the payload if present', function () {
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(JSON.parse(request.data).user.ext.consent).to.deep.equal('GDPR_CONSENT_STRING');
    });

    it('should send CCPA in the payload if present', function () {
      const ccpa = '1YYY';
      bidderRequest.uspConsent = ccpa;
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(JSON.parse(request.data).regs.ext.us_privacy).to.equal(ccpa);
    });

    it('should send eids in the payload if present', function () {
      const eids = {data: [{source: 'test', uids: [{id: '123', ext: {}}]}]};
      validBid.userIdAsEids = eids;
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(JSON.parse(request.data).user.ext.eids).to.deep.equal(eids);
    });

    it('should send schain in the payload if present', function () {
      const schain = {'ver': '1.0', 'complete': 1, 'nodes': [{'asi': 'exchange1.com', 'sid': '1234', 'hp': 1}]};
      validBid.schain = schain;
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(JSON.parse(request.data).source.ext.schain).to.deep.equal(schain);
    });

    it('should correctly identify test mode', function () {
      validBid.params.test = true;
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(JSON.parse(request.data).test).to.equal(1);
    });
  });

  describe('interpretResponse', function () {
    const validResponse = {
      body: {
        seatbid: [
          {
            bid: [
              {
                impid: 'bid1',
                price: 1.5,
                w: 300,
                h: 250,
                crid: 'creative1',
                currency: 'USD',
                netRevenue: true,
                ttl: 300,
                adm: '<div>Ad content</div>',
                mtype: 1
              },
              {
                impid: 'bid2',
                price: 2.0,
                w: 728,
                h: 90,
                crid: 'creative2',
                currency: 'USD',
                netRevenue: true,
                ttl: 300,
                adm: '<div>Ad content</div>',
                mtype: 1
              }
            ]
          }
        ]
      }
    };

    const emptyResponse = {
      body: {
        seatbid: []
      }
    };

    it('should return an array of bid objects with valid response', function () {
      const interpretedBids = spec.interpretResponse(validResponse);
      const expectedBids = validResponse.body.seatbid[0].bid;
      expect(interpretedBids).to.have.lengthOf(expectedBids.length);
      expectedBids.forEach((expectedBid, index) => {
        expect(interpretedBids[index]).to.have.property('requestId', expectedBid.impid);
        expect(interpretedBids[index]).to.have.property('cpm', expectedBid.price);
        expect(interpretedBids[index]).to.have.property('width', expectedBid.w);
        expect(interpretedBids[index]).to.have.property('height', expectedBid.h);
        expect(interpretedBids[index]).to.have.property('creativeId', expectedBid.crid);
        expect(interpretedBids[index]).to.have.property('currency', expectedBid.currency);
        expect(interpretedBids[index]).to.have.property('netRevenue', expectedBid.netRevenue);
        expect(interpretedBids[index]).to.have.property('ttl', expectedBid.ttl);
        expect(interpretedBids[index]).to.have.property('ad', expectedBid.adm);
        expect(interpretedBids[index]).to.have.property('mediaType', expectedBid.mtype);
      });
    });

    it('should return an empty array with empty response', function () {
      const interpretedBids = spec.interpretResponse(emptyResponse);
      expect(interpretedBids).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserSyncs', function () {
    const RESPONSE = {
      body: {
        ext: {
          usersync: {
            sovrn: {
              syncs: [{type: 'iframe', url: 'https://sovrn.com/iframe_sync'}]
            },
            appnexus: {
              syncs: [{type: 'image', url: 'https://appnexus.com/image_sync'}]
            }
          }
        }
      }
    };

    it('should return empty array if no options are provided', function () {
      const opts = spec.getUserSyncs({});
      expect(opts).to.be.an('array').that.is.empty;
    });

    it('should return empty array if neither iframe nor pixel is enabled', function () {
      const opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false});
      expect(opts).to.be.an('array').that.is.empty;
    });

    it('should return syncs only for iframe sync type', function () {
      const opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: false}, [RESPONSE]);
      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('iframe');
      expect(opts[0].url).to.equal(RESPONSE.body.ext.usersync.sovrn.syncs[0].url);
    });

    it('should return syncs only for pixel sync types', function () {
      const opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [RESPONSE]);
      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('image');
      expect(opts[0].url).to.equal(RESPONSE.body.ext.usersync.appnexus.syncs[0].url);
    });

    it('should return syncs when both iframe and pixel are enabled', function () {
      const opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [RESPONSE]);
      expect(opts.length).to.equal(2);
    });
  });
});
