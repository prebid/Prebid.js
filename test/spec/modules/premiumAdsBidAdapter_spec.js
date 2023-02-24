import {expect} from 'chai'
import {spec} from 'modules/premiumadsBidAdapter.js'
import {newBidder} from 'src/adapters/bidderFactory.js'
import * as utils from '../../../src/utils.js';
import {config} from 'src/config.js';

describe('PremiumAdsBidAdapter', function () {
  const adapter = newBidder(spec)
  let bidRequests;
  let bidResponses;
  let bidResponses2;
  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'premiumads',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        params: {
          adUnitId: 1123568438,
          floor: 0
        },
        placementCode: 'adunit-code-1',
        sizes: [[300, 250]],
        bidId: 'f5b067ee-66c5-4b5a-99bc-29f5d757251f',
        requestId: 'c8423cb2-b35e-11ed-afa1-0242ac120002',
        bidderRequestId: 'cbf80fbf-30cf-4760-bfae-b44a778feff8',
        transactionId: 'a91b2f52-db75-463b-8238-4fe80dc1ad2e',
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
        id: 'f39a3a05-7a39-444b-be2f-9d9b91cc81f3',
        seatbid: [
          {
            bid: [
              {
                id: '1',
                impid: '53bd7010-e6c7-4321-ba10-befe83de5d78',
                price: 0.5976,
                burl: 'https://bid.premiumads.net/prebid/win-notify?impid=f39a3a05-7a39-444b-be2f-9d9b91cc81f3&wp=${AUCTION_PRICE}',
                adm: '<a href=\'https://premiumads.net/publishers/?ref=prebid\' target=\'_blank\'><img src=\'https://cdn.premiumads.net/images/psa/300x250.png\' style=\' width: 300px; \' /></a>',
                adid: 'f39a3a05-7a39-444b-be2f-9d9b91cc81f3',
                adomain: [
                  'premiumads.net'
                ],
                cid: '63ba9d1a-6efa-4190-854e-3c0d2b66a70f',
                crid: '4e17de4a-ff84-4251-bde4-ae196de9d92e',
                attr: [],
                w: 300,
                h: 250
              }
            ],
            seat: 'premiumads',
            group: 0
          }
        ],
        bidid: 'f5b067ee-66c5-4b5a-99bc-29f5d757251f',
        cur: 'USD',
        customdata: '[{"type":1,"url":"https://bid.premiumads.net/prebid/usersync?bidder=premiumads"}]'
      }
    };
    bidResponses2 = {
      body: {
        id: '3ee50f4b-2676-4b83-8b8d-c4cbc4efde18',
        seatbid: [
          {
            bid: [
              {
                id: '1',
                impid: '3ee50f4b-2676-4b83-8b8d-c4cbc4efde18',
                price: 2.125,
                burl: 'https://bid.premiumads.net/prebid/win-notify?impid=3ee50f4b-2676-4b83-8b8d-c4cbc4efde18&wp=${AUCTION_PRICE}',
                adm: '<a href=\'https://premiumads.net/publishers/?ref=prebid\' target=\'_blank\'><img src=\'https://cdn.premiumads.net/images/psa/300x250.png\' style=\' width: 300px; \' /></a>',
                adid: '20f18a44-9507-4b60-b824-00b4a01e1925',
                adomain: [
                  'premiumads.net'
                ],
                cid: 'e8bf9365-4b43-4d81-877a-c733bb7b028f',
                crid: '7ab62b07-976a-4f34-98fe-57f35e4fdb07',
                attr: [],
                w: 300,
                h: 250
              }
            ],
            seat: 'premiumads',
            group: 0
          }
        ],
        bidid: 'f5b067ee-66c5-4b5a-99bc-29f5d757251f',
        cur: 'USD',
        customdata: '[{"type":1,"url":"https://bid.premiumads.net/prebid/usersync?bidder=premiumads"},{"type":1,"url":"https://bid.premiumads.net/prebid/usersync?bidder=appnexus"}]'
      }
    };
  });

  describe('.code', function () {
    it('should return a bidder code of premiumads', function () {
      expect(spec.code).to.equal('premiumads')
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
            bidder: 'premiumads',
            params: {
              adUnitId: 1123568438,
              floor: 0.1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);
      });
      it('invalid bid case: adUnitId is not passed', function () {
        let validBid = {
            bidder: 'premiumads',
            params: {
              adUnitId: '',
              floor: 0
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
      it('should return false if there are no params', () => {
        const bid = {
          'bidder': 'premiumads',
          'adUnitCode': 'adunit-code',
          'mediaTypes': {
            banner: {
              sizes: [[300, 250]]
            }
          },
          'bidId': '60271527-5096-4c92-a92f-5291c20e8aca',
          'bidderRequestId': '311809bd-e6d3-45ba-b313-69ba318d0e33',
          'auctionId': 'd4067b1b-50b5-4925-89c1-61115cdf2ac9',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
      it('should return false if there is no adUnitId param', () => {
        const bid = {
          'bidder': 'premiumads',
          'adUnitCode': 'adunit-code',
          params: {
            floor: 1,
          },
          'mediaTypes': {
            banner: {
              sizes: [[300, 250]]
            }
          },
          'bidId': '60271527-5096-4c92-a92f-5291c20e8aca',
          'bidderRequestId': '311809bd-e6d3-45ba-b313-69ba318d0e33',
          'auctionId': 'd4067b1b-50b5-4925-89c1-61115cdf2ac9',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
      it('should return true if the bid is valid', () => {
        const bid = {
          'bidder': 'premiumads',
          'adUnitCode': 'adunit-code',
          params: {
            adUnitId: 882658,
          },
          'mediaTypes': {
            banner: {
              sizes: [[300, 250]]
            }
          },
          'bidId': '60271527-5096-4c92-a92f-5291c20e8aca',
          'bidderRequestId': '311809bd-e6d3-45ba-b313-69ba318d0e33',
          'auctionId': 'd4067b1b-50b5-4925-89c1-61115cdf2ac9',
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
        expect(request.url).to.equal('https://bid.premiumads.net/prebid/auction');
        expect(request.method).to.equal('POST');
      });

      it('test flag not sent when premiumadsTest=true is absent in page url', function () {
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
        expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.source.tid).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(bidRequests[0].params.floor); // floor
        expect(data.imp[0].tagid).to.equal(bidRequests[0].params.adUnitId); // adUnitId
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.source.ext.schain).to.deep.equal(bidRequests[0].schain);
      });
      it('Request params check with GDPR Consent', function () {
        let bidRequest = {
          gdprConsent: {
            consentString: '23sfsdfdsf',
            gdprApplies: true
          }
        };
        let request = spec.buildRequests(bidRequests, bidRequest);
        let data = JSON.parse(request.data);
        expect(data.user.ext.consent).to.equal('23sfsdfdsf');
        expect(data.at).to.equal(1); // auction type
        expect(data.cur[0]).to.equal('USD'); // currency
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.source.tid).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.floor)); // reverse
        expect(data.imp[0].tagid).to.equal(bidRequests[0].params.adUnitId); // adUnitId
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
        expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.source.tid).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.floor)); // reverse
        expect(data.imp[0].tagid).to.equal(bidRequests[0].params.adUnitId); // adUnitId
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
      expect(response[0].meta.clickUrl).to.equal('premiumads.net');
      expect(response[0].meta.advertiserDomains[0]).to.equal('premiumads.net');
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
        url: 'https://bid.premiumads.net/prebid/usersync?bidder=premiumads&adUnitId=1123568438&gdpr=0&gdpr_consent=&us_privacy=&coppa=0'
      }]);
    });
    // Multiple user sync output
    it('execute as per config', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, [bidResponses2], undefined, undefined)).to.deep.equal([
        {
          type: 'iframe',
          url: 'https://bid.premiumads.net/prebid/usersync?bidder=premiumads&adUnitId=1123568438&gdpr=0&gdpr_consent=&us_privacy=&coppa=0'
        },
        {
          type: 'iframe',
          url: 'https://bid.premiumads.net/prebid/usersync?bidder=appnexus&adUnitId=1123568438&gdpr=0&gdpr_consent=&us_privacy=&coppa=0'
        }
      ]);
    });
  });
});
