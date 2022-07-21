import {expect} from 'chai'
import {spec} from 'modules/adtrueBidAdapter.js'
import {newBidder} from 'src/adapters/bidderFactory.js'
import * as utils from '../../../src/utils.js';
import {config} from 'src/config.js';

describe('AdTrueBidAdapter', function () {
  const adapter = newBidder(spec)
  let bidRequests;
  let bidResponses;
  let bidResponses2;
  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'adtrue',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        params: {
          publisherId: '1212',
          zoneId: '21423',
          reserve: 0
        },
        placementCode: 'adunit-code-1',
        sizes: [[300, 250]],
        bidId: '23acc48ad47af5',
        requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729',
        schain: {
          'ver': '1.0',
          'complete': 1,
          'nodes': [
            {
              'asi': 'indirectseller.com',
              'sid': '00001',
              'hp': 1
            },

            {
              'asi': 'indirectseller-2.com',
              'sid': '00002',
              'hp': 2
            }
          ]
        }
      }
    ];
    bidResponses = {
      body: {
        id: '1610681506302',
        seatbid: [
          {
            bid: [
              {
                id: '1',
                impid: '201fb513ca24e9',
                price: 2.880000114440918,
                burl: 'https://hb.adtrue.com/prebid/win-notify?impid=1610681506302&wp=${AUCTION_PRICE}',
                adm: '<a href=\'https://adtrue.com?ref=pbjs\' target=\'_blank\'><img src=\'http://cdn.adtrue.com/img/prebid_sample_300x250.jpg?v=1.2\' style=\' width: 300px; \' /></a>',
                adid: '1610681506302',
                adomain: [
                  'adtrue.com'
                ],
                cid: 'f6l0r6n',
                crid: 'abc77au4',
                attr: [],
                w: 300,
                h: 250
              }
            ],
            seat: 'adtrue',
            group: 0
          }
        ],
        bidid: '1610681506302',
        cur: 'USD',
        ext: {
          cookie_sync: [
            {
              type: 1,
              url: 'https://hb.adtrue.com/prebid/usersync?bidder=adtrue'
            }
          ]
        }
      }
    };
    bidResponses2 = {
      body: {
        id: '1610681506302',
        seatbid: [
          {
            bid: [
              {
                id: '1',
                impid: '201fb513ca24e9',
                price: 2.880000114440918,
                burl: 'https://hb.adtrue.com/prebid/win-notify?impid=1610681506302&wp=${AUCTION_PRICE}',
                adm: '<a href=\'https://adtrue.com?ref=pbjs\' target=\'_blank\'><img src=\'http://cdn.adtrue.com/img/prebid_sample_300x250.jpg?v=1.2\' style=\' width: 300px; \' /></a>',
                adid: '1610681506302',
                adomain: [
                  'adtrue.com'
                ],
                cid: 'f6l0r6n',
                crid: 'abc77au4',
                attr: [],
                w: 300,
                h: 250
              }
            ],
            seat: 'adtrue',
            group: 0
          }
        ],
        bidid: '1610681506302',
        cur: 'USD',
        ext: {
          cookie_sync: [
            {
              type: 2,
              url: 'https://hb.adtrue.com/prebid/usersync?bidder=adtrue&type=image'
            },
            {
              type: 1,
              url: 'https://hb.adtrue.com/prebid/usersync?bidder=appnexus'
            }
          ]
        }
      }
    };
  });

  describe('.code', function () {
    it('should return a bidder code of adtrue', function () {
      expect(spec.code).to.equal('adtrue')
    })
  })

  describe('inherited functions', function () {
    it('should exist and be a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })
  describe('implementation', function () {
    describe('Bid validations', function () {
      it('valid bid case', function () {
        let validBid = {
            bidder: 'adtrue',
            params: {
              zoneId: '21423',
              publisherId: '1212'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);
      });
      it('invalid bid case: publisherId not passed', function () {
        let validBid = {
            bidder: 'adtrue',
            params: {
              zoneId: '21423'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
      it('valid bid case: zoneId is not passed', function () {
        let validBid = {
            bidder: 'adtrue',
            params: {
              publisherId: '1212'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
      it('should return false if there are no params', () => {
        const bid = {
          'bidder': 'adtrue',
          'adUnitCode': 'adunit-code',
          'mediaTypes': {
            banner: {
              sizes: [[300, 250]]
            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
      it('should return false if there is no publisherId param', () => {
        const bid = {
          'bidder': 'adtrue',
          'adUnitCode': 'adunit-code',
          params: {
            zoneId: '21423',
          },
          'mediaTypes': {
            banner: {
              sizes: [[300, 250]]
            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
      it('should return false if there is no zoneId param', () => {
        const bid = {
          'bidder': 'adtrue',
          'adUnitCode': 'adunit-code',
          params: {
            publisherId: '1212',
          },
          'mediaTypes': {
            banner: {
              sizes: [[300, 250]]
            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
      it('should return true if the bid is valid', () => {
        const bid = {
          'bidder': 'adtrue',
          'adUnitCode': 'adunit-code',
          params: {
            zoneId: '21423',
            publisherId: '1212',
          },
          'mediaTypes': {
            banner: {
              sizes: [[300, 250]]
            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });
    describe('Request formation', function () {
      it('buildRequests function should not modify original bidRequests object', function () {
        let originalBidRequests = utils.deepClone(bidRequests);
        let request = spec.buildRequests(bidRequests, {
          auctionId: 'new-auction-id'
        });
        expect(bidRequests).to.deep.equal(originalBidRequests);
      });

      it('Endpoint/method checking', function () {
        let request = spec.buildRequests(bidRequests, {
          auctionId: 'new-auction-id'
        });
        expect(request.url).to.equal('https://hb.adtrue.com/prebid/auction');
        expect(request.method).to.equal('POST');
      });

      it('test flag not sent when adtrueTest=true is absent in page url', function () {
        let request = spec.buildRequests(bidRequests, {
          auctionId: 'new-auction-id'
        });
        let data = JSON.parse(request.data);
        expect(data.test).to.equal(undefined);
      });
      it('Request params check', function () {
        let request = spec.buildRequests(bidRequests, {
          auctionId: 'new-auction-id'
        });
        let data = JSON.parse(request.data);
        expect(data.at).to.equal(1); // auction  type
        expect(data.cur[0]).to.equal('USD'); // currency
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
        expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.source.tid).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(bidRequests[0].params.reserve); // reverse
        expect(data.imp[0].tagid).to.equal(bidRequests[0].params.zoneId); // zoneId
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.source.ext.schain).to.deep.equal(bidRequests[0].schain);
      });
      it('Request params check with GDPR Consent', function () {
        let bidRequest = {
          gdprConsent: {
            consentString: 'kjfdniwjnifwenrif3',
            gdprApplies: true
          }
        };
        let request = spec.buildRequests(bidRequests, bidRequest);
        let data = JSON.parse(request.data);
        expect(data.user.ext.consent).to.equal('kjfdniwjnifwenrif3');
        expect(data.at).to.equal(1); // auction type
        expect(data.cur[0]).to.equal('USD'); // currency
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
        expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.source.tid).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.reserve)); // reverse
        expect(data.imp[0].tagid).to.equal(bidRequests[0].params.zoneId); // zoneId
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.source.ext.schain).to.deep.equal(bidRequests[0].schain);
      });
      it('Request params check with USP/CCPA Consent', function () {
        let bidRequest = {
          uspConsent: '1NYN'
        };
        let request = spec.buildRequests(bidRequests, bidRequest);
        let data = JSON.parse(request.data);
        expect(data.regs.ext.us_privacy).to.equal('1NYN');// USP/CCPAs
        expect(data.at).to.equal(1); // auction type
        expect(data.cur[0]).to.equal('USD'); // currency
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
        expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.source.tid).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.reserve)); // reverse
        expect(data.imp[0].tagid).to.equal(bidRequests[0].params.zoneId); // zoneId
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.source.ext.schain).to.deep.equal(bidRequests[0].schain);
      });

      it('should NOT include coppa flag in bid request if coppa config is not present', () => {
        const request = spec.buildRequests(bidRequests, {});
        let data = JSON.parse(request.data);
        if (data.regs) {
          // in case GDPR is set then data.regs will exist
          expect(data.regs.coppa).to.equal(undefined);
        } else {
          expect(data.regs).to.equal(undefined);
        }
      });
      it('should include coppa flag in bid request if coppa is set to true', () => {
        let sandbox = sinon.sandbox.create();
        sandbox.stub(config, 'getConfig').callsFake(key => {
          const config = {
            'coppa': true
          };
          return config[key];
        });
        const request = spec.buildRequests(bidRequests, {});
        let data = JSON.parse(request.data);
        expect(data.regs.coppa).to.equal(1);
        sandbox.restore();
      });
      it('should NOT include coppa flag in bid request if coppa is set to false', () => {
        let sandbox = sinon.sandbox.create();
        sandbox.stub(config, 'getConfig').callsFake(key => {
          const config = {
            'coppa': false
          };
          return config[key];
        });
        const request = spec.buildRequests(bidRequests, {});
        let data = JSON.parse(request.data);
        if (data.regs) {
          // in case GDPR is set then data.regs will exist
          expect(data.regs.coppa).to.equal(undefined);
        } else {
          expect(data.regs).to.equal(undefined);
        }
        sandbox.restore();
      });
    });
  });
  describe('Response checking', function () {
    it('should check for valid response values', function () {
      let request = spec.buildRequests(bidRequests, {
        auctionId: 'new-auction-id'
      });
      let data = JSON.parse(request.data);
      let response = spec.interpretResponse(bidResponses, request);
      expect(response).to.be.an('array').with.length.above(0);
      expect(response[0].requestId).to.equal(bidResponses.body.seatbid[0].bid[0].impid);
      expect(response[0].width).to.equal(bidResponses.body.seatbid[0].bid[0].w);
      expect(response[0].height).to.equal(bidResponses.body.seatbid[0].bid[0].h);
      if (bidResponses.body.seatbid[0].bid[0].crid) {
        expect(response[0].creativeId).to.equal(bidResponses.body.seatbid[0].bid[0].crid);
      } else {
        expect(response[0].creativeId).to.equal(bidResponses.body.seatbid[0].bid[0].id);
      }
      expect(response[0].currency).to.equal('USD');
      expect(response[0].ttl).to.equal(300);
      expect(response[0].meta.clickUrl).to.equal('adtrue.com');
      expect(response[0].meta.advertiserDomains[0]).to.equal('adtrue.com');
      expect(response[0].ad).to.equal(bidResponses.body.seatbid[0].bid[0].adm);
      expect(response[0].partnerImpId).to.equal(bidResponses.body.seatbid[0].bid[0].id);
    });
  });
  describe('getUserSyncs', function () {
    let sandbox;
    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });
    afterEach(function () {
      sandbox.restore();
    });
    it('execute as per config', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, [bidResponses], undefined, undefined)).to.deep.equal([{
        type: 'iframe',
        url: 'https://hb.adtrue.com/prebid/usersync?bidder=adtrue&publisherId=1212&zoneId=21423&gdpr=0&gdpr_consent=&us_privacy=&coppa=0'
      }]);
    });
    // Multiple user sync output
    it('execute as per config', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, [bidResponses2], undefined, undefined)).to.deep.equal([
        {
          type: 'image',
          url: 'https://hb.adtrue.com/prebid/usersync?bidder=adtrue&type=image&publisherId=1212&zoneId=21423&gdpr=0&gdpr_consent=&us_privacy=&coppa=0'
        },
        {
          type: 'iframe',
          url: 'https://hb.adtrue.com/prebid/usersync?bidder=appnexus&publisherId=1212&zoneId=21423&gdpr=0&gdpr_consent=&us_privacy=&coppa=0'
        }
      ]);
    });
  });
});
