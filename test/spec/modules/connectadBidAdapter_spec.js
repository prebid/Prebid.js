import {expect} from 'chai';
import {spec} from 'modules/connectadBidAdapter.js';
import { config } from 'src/config.js';
import {newBidder} from 'src/adapters/bidderFactory.js';

describe('ConnectAd Adapter', function () {
  let bidRequests;
  let bidderRequest;
  let bidRequestsUserIds;

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'conntectad',
        params: {
          siteId: 123456,
          networkId: 123456,
          bidfloor: 0.50
        },
        adUnitCode: '/19968336/header-bid-tag-1',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          }
        },
        bidId: '2f95c00074b931',
        auctionId: 'e76cbb58-f3e1-4ad9-9f4c-718c1919d0df',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: 'e76cbb58-f3e1-4ad9-9f4c-718c1919d0df'
      }
    ];

    bidRequestsUserIds = [{
      bidder: 'conntectad',
      params: {
        siteId: 123456,
        networkId: 123456
      },
      adUnitCode: '/19968336/header-bid-tag-1',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]],
        }
      },
      bidId: '2f95c00074b931',
      auctionId: 'e76cbb58-f3e1-4ad9-9f4c-718c1919d0df',
      bidderRequestId: '1c56ad30b9b8ca8',
      transactionId: 'e76cbb58-f3e1-4ad9-9f4c-718c1919d0df',
      userId: {
        tdid: '123456'
      }
    }];

    bidderRequest = {
      timeout: 3000,
      gdprConsent: {
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {}
      }
    }
  });

  describe('inherited functions', function () {
    it('should exists and is a function', function () {
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('implementation', function () {
    describe('for requests', function () {
      it('should accept bid', function () {
        let validBid = {
          bidder: 'connectad',
          params: {
            siteId: 123456,
            networkId: 123456
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]]
            }
          }
        };
        const isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);
      });

      it('should reject if missing sizes', function () {
        let invalidBid = {
          bidder: 'connectad',
          params: {
            siteId: 123456,
          }
        };
        const isValid = spec.isBidRequestValid(invalidBid);
        expect(isValid).to.equal(false);
      });

      it('should return true when optional bidFloor params found for an ad', function () {
        let validBid = {
          bidder: 'connectad',
          params: {
            siteId: 123456,
            networkId: 123456,
            bidfloor: 0.20
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]]
            }
          }
        };
        const isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true)
      });

      it('should reject if missing siteId/networkId', function () {
        let invalidBid = {
          bidder: 'connectad',
          params: {},
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]],
            }
          }
        };
        const isValid = spec.isBidRequestValid(invalidBid);
        expect(isValid).to.equal(false);
      });

      it('should reject if missing networkId', function () {
        let invalidBid = {
          bidder: 'connectad',
          params: {
            siteId: 123456
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]],
            }
          }
        };
        const isValid = spec.isBidRequestValid(invalidBid);
        expect(isValid).to.equal(false);
      });

      it('should contain SiteId and NetworkId', function () {
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.placements[0].siteId).to.equal(123456);
        expect(requestparse.placements[0].networkId).to.equal(123456);
      });

      it('should process floors module if available', function() {
        const floorInfo = {
          currency: 'USD',
          floor: 5.20
        };
        bidRequests[0].getFloor = () => floorInfo;
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.placements[0].bidfloor).to.equal(5.20);
      });

      it('should be bidfloor if no floormodule is available', function() {
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.placements[0].bidfloor).to.equal(0.50);
      });

      it('should have 0 bidfloor value', function() {
        const request = spec.buildRequests(bidRequestsUserIds, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.placements[0].bidfloor).to.equal(0);
      });

      it('should contain gdpr info', function () {
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);

        expect(requestparse.user.ext.gdpr).to.equal(1);
        expect(requestparse.user.ext.consent).to.equal('consentDataString');
      });

      it('should build a request if Consent but no gdprApplies', function () {
        let bidderRequest = {
          timeout: 3000,
          gdprConsent: {
            gdprApplies: false,
            consentString: 'consentDataString',
          },
        }
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);

        expect(requestparse.placements[0].adTypes).to.be.an('array');
        expect(requestparse.placements[0].siteId).to.equal(123456);
        expect(requestparse.user.ext.consent).to.equal('consentDataString');
      });

      it('should build a request if gdprConsent empty', function () {
        let bidderRequest = {
          timeout: 3000,
          gdprConsent: {}
        }
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);

        expect(requestparse.placements[0].adTypes).to.be.an('array');
        expect(requestparse.placements[0].siteId).to.equal(123456);
      });

      it('should have CCPA Consent if defined', function () {
        const uspConsent = '1YYN'
        bidderRequest.uspConsent = uspConsent
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);

        expect(requestparse.user.ext.us_privacy).to.equal(uspConsent);
      });

      it('should not have CCPA Consent if not defined', function () {
        bidderRequest.uspConsent = undefined
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.user.ext.us_privacy).to.be.undefined;
      });

      it('should not include schain when not provided', function () {
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.source).to.not.exist;
      });

      it('should submit coppa if set in config', function () {
        sinon.stub(config, 'getConfig')
          .withArgs('coppa')
          .returns(true);
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.user.coppa).to.equal(1);
        config.getConfig.restore();
      });

      it('should send all UserData data', function () {
        const request = spec.buildRequests(bidRequestsUserIds, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.user.ext.eids).to.be.an('array');
        expect(requestparse.user.ext.eids[0].uids[0].id).to.equal('123456');
      });

      it('should add referer info', function () {
        const bidRequest = Object.assign({}, bidRequests[0])
        const bidderRequ = {
          refererInfo: {
            referer: 'https://connectad.io/page.html',
            reachedTop: true,
            numIframes: 2,
            stack: [
              'https://connectad.io/page.html',
              'https://connectad.io/iframe1.html',
              'https://connectad.io/iframe2.html'
            ]
          }
        }
        const request = spec.buildRequests([bidRequest], bidderRequ);
        const requestparse = JSON.parse(request.data);

        expect(requestparse.referrer_info).to.exist;
      });

      it('should populate schain', function () {
        const bidRequest = Object.assign({}, bidRequests[0], {
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                'asi': 'reseller1.com',
                'sid': 'absc1',
                'hp': 1
              }
            ]
          }
        });

        const request = spec.buildRequests([bidRequest], bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.source.ext.schain).to.deep.equal({
          ver: '1.0',
          complete: 1,
          nodes: [
            {
              'asi': 'reseller1.com',
              'sid': 'absc1',
              'hp': 1
            }
          ]
        });
      });
    });

    describe('bid responses', function () {
      it('should return complete bid response', function () {
        let serverResponse = {
          body: {
            decisions: {
              '2f95c00074b931': {
                adId: '0',
                contents: [
                  {
                    body: '<<<---- Creative --->>>'
                  }
                ],
                height: '250',
                width: '300',
                pricing: {
                  clearPrice: 11.899999999999999
                }
              }
            }
          }
        };
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(1);
        expect(bids[0].cpm).to.equal(11.899999999999999);
        expect(bids[0].width).to.equal('300');
        expect(bids[0].height).to.equal('250');
        expect(bids[0].ad).to.have.length.above(1);
      });

      it('should return empty bid response', function () {
        let serverResponse = {
          body: {
            decisions: []
          }
        };
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);
        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on incorrect size', function () {
        let serverResponse = {
          body: {
            decisions: {
              '2f95c00074b931': {
                adId: '0',
                contents: [
                  {
                    body: '<<<---- Creative --->>>'
                  }
                ],
                height: '160',
                width: '600',
                pricing: {
                  clearPrice: 0
                }
              }
            }
          }
        };
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);
        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on 0 cpm', function () {
        let serverResponse = {
          body: {
            decisions: {
              '2f95c00074b931': {
                adId: '0',
                contents: [
                  {
                    body: '<<<---- Creative --->>>'
                  }
                ],
                height: '300',
                width: '250',
                pricing: {
                  clearPrice: 0
                }
              }
            }
          }
        };
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);
        expect(bids).to.be.lengthOf(0);
      });

      it('should process a deal id', function () {
        let serverResponse = {
          body: {
            decisions: {
              '2f95c00074b931': {
                adId: '0',
                dealid: 'ABC90210',
                contents: [
                  {
                    body: '<<<---- Creative --->>>'
                  }
                ],
                height: '300',
                width: '250',
                pricing: {
                  clearPrice: 11.899999999999999
                }
              }
            }
          }
        };
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);
        expect(bids).to.be.lengthOf(1);
        expect(bids[0].dealid).to.equal('ABC90210');
      });
    });
  });

  describe('getUserSyncs', () => {
    let testParams = [
      {
        name: 'iframe/no gdpr or ccpa',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, null],
        expect: {
          type: 'iframe',
          pixels: ['https://cdn.connectad.io/connectmyusers.php?']
        }
      },
      {
        name: 'iframe/gdpr',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, {gdprApplies: true, consentString: '234234'}],
        expect: {
          type: 'iframe',
          pixels: ['https://cdn.connectad.io/connectmyusers.php?gdpr=1&gdpr_consent=234234&']
        }
      },
      {
        name: 'iframe/ccpa',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, null, 'YN12'],
        expect: {
          type: 'iframe',
          pixels: ['https://cdn.connectad.io/connectmyusers.php?us_privacy=YN12&']
        }
      },
      {
        name: 'iframe/ccpa & gdpr',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, {gdprApplies: true, consentString: '234234'}, 'YN12'],
        expect: {
          type: 'iframe',
          pixels: ['https://cdn.connectad.io/connectmyusers.php?gdpr=1&gdpr_consent=234234&us_privacy=YN12&']
        }
      }
    ];

    for (let i = 0; i < testParams.length; i++) {
      let currParams = testParams[i];
      it(currParams.name, function () {
        const result = spec.getUserSyncs.apply(this, currParams.arguments);
        expect(result).to.have.lengthOf(currParams.expect.pixels.length);
        for (let ix = 0; ix < currParams.expect.pixels.length; ix++) {
          expect(result[ix].url).to.equal(currParams.expect.pixels[ix]);
          expect(result[ix].type).to.equal(currParams.expect.type);
        }
      });
    }
  });
});
