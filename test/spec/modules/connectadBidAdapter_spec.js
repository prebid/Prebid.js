import {expect} from 'chai';
import {spec} from 'modules/connectadBidAdapter.js';
import { config } from 'src/config.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import assert from 'assert';

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
        transactionId: 'e76cbb58-f3e1-4ad9-9f4c-718c1919d0df',
        ortb2Imp: {
          ext: {
            tid: '601bda1a-01a9-4de9-b8f3-649d3bdd0d8f',
            gpid: '/12345/homepage-leftnav'
          }
        },
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
      userIdAsEids: [
        {
          'source': 'pubcid.org',
          'uids': [
            {
              'atype': 1,
              'id': '123456'
            }
          ]
        }
      ]
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

  afterEach(function () {
    config.resetConfig();
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
        let localbidderRequest = {
          timeout: 3000,
          gdprConsent: {
            gdprApplies: false,
            consentString: 'consentDataString',
          },
        }
        const request = spec.buildRequests(bidRequests, localbidderRequest);
        const requestparse = JSON.parse(request.data);

        expect(requestparse.placements[0].siteId).to.equal(123456);
        expect(requestparse.user.ext.consent).to.equal('consentDataString');
      });

      it('should build a request if gdprConsent empty', function () {
        let localbidderRequest = {
          timeout: 3000,
          gdprConsent: {}
        }
        const request = spec.buildRequests(bidRequests, localbidderRequest);
        const requestparse = JSON.parse(request.data);

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
        expect(requestparse).to.not.have.property('source.ext.schain');
      });

      it('should submit coppa if set in config', function () {
        sinon.stub(config, 'getConfig')
          .withArgs('coppa')
          .returns(true);
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.regs.coppa).to.equal(1);
        config.getConfig.restore();
      });

      it('should not set coppa when coppa is not provided or is set to false', function () {
        sinon.stub(config, 'getConfig')
          .withArgs('coppa')
          .returns(false);
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);
        assert.equal(requestparse.regs.coppa, undefined);
        config.getConfig.restore();
      });

      it('should send all UserData data', function () {
        const request = spec.buildRequests(bidRequestsUserIds, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.user.ext.eids).to.be.an('array');
        expect(requestparse.user.ext.eids[0].uids[0].id).to.equal('123456');
      });

      it('should include DSA signals', function () {
        const dsa = {
          dsarequired: 3,
          pubrender: 0,
          datatopub: 2,
          transparency: [
            {
              domain: 'domain1.com',
              dsaparams: [1]
            },
            {
              domain: 'domain2.com',
              dsaparams: [1, 2]
            }
          ]
        };

        let bidRequest = {
		      ortb2: {
            regs: {
              ext: {
                dsa
              }
            }
          }
        };
        let request = spec.buildRequests(bidRequests, bidRequest);
        let data = JSON.parse(request.data);
        assert.deepEqual(data.regs.ext.dsa, dsa);
      });

      it('should pass auction level tid', function() {
        const bidRequest = Object.assign([], bidRequests);

        const localBidderRequest = {
          ...bidderRequest,
          ortb2: {
            source: {
              tid: '9XSL9B79XM'
            }
          }
        }

        const request = spec.buildRequests(bidRequest, localBidderRequest);
        const data = JSON.parse(request.data);
        expect(data.source?.tid).to.equal('9XSL9B79XM')
      });

      it('should pass gpid', function() {
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.placements[0].gpid).to.equal('/12345/homepage-leftnav');
      });

      it('should pass impression level tid', function() {
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);
        expect(requestparse.placements[0].tid).to.equal('601bda1a-01a9-4de9-b8f3-649d3bdd0d8f');
      });

      it('should pass first party data', function() {
        const bidRequest = Object.assign([], bidRequests);

        const localBidderRequest = {
          ...bidderRequest,
          ortb2: {
            bcat: ['IAB1', 'IAB2-1'],
            badv: ['xyz.com', 'zyx.com'],
            site: { ext: { data: 'some site data' } },
            device: { ext: { data: 'some device data' } },
            user: { ext: { data: 'some user data' } },
            regs: { ext: { data: 'some regs data' } }
          }
        };

        const request = spec.buildRequests(bidRequest, localBidderRequest);
        const data = JSON.parse(request.data);
        expect(data.bcat).to.deep.equal(localBidderRequest.ortb2.bcat);
        expect(data.badv).to.deep.equal(localBidderRequest.ortb2.badv);
        expect(data.site).to.nested.include({'ext.data': 'some site data'});
        expect(data.device).to.nested.include({'ext.data': 'some device data'});
        expect(data.user).to.nested.include({'ext.data': 'some user data'});
        expect(data.regs).to.nested.include({'ext.data': 'some regs data'});
      });

      it('should accept tmax from global config if not set by requestBids method', function() {
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const requestparse = JSON.parse(request.data);

        expect(requestparse.tmax).to.deep.equal(3000);
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

    describe('GPP Implementation', function() {
      it('should check with GPP Consent', function () {
        let bidRequest = {
          gppConsent: {
            'gppString': 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN',
            'fullGppData': {
              'sectionId': 3,
              'gppVersion': 1,
              'sectionList': [
                5,
                7
              ],
              'applicableSections': [
                5
              ],
              'gppString': 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN',
              'pingData': {
                'cmpStatus': 'loaded',
                'gppVersion': '1.0',
                'cmpDisplayStatus': 'visible',
                'supportedAPIs': [
                  'tcfca',
                  'usnat',
                  'usca',
                  'usva',
                  'usco',
                  'usut',
                  'usct'
                ],
                'cmpId': 31
              },
              'eventName': 'sectionChange'
            },
            'applicableSections': [
              5
            ],
            'apiVersion': 1
          }
        };
        let request = spec.buildRequests(bidRequests, bidRequest);
        let data = JSON.parse(request.data);
        expect(data.regs.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN');
        expect(data.regs.gpp_sid[0]).to.equal(5);
      });

      it('should check without GPP Consent', function () {
        let bidRequest = {};
        let request = spec.buildRequests(bidRequests, bidRequest);
        let data = JSON.parse(request.data);
        expect(data.regs.gpp).to.equal(undefined);
      });

      it('should check with GPP Consent read from OpenRTB2', function () {
        let bidRequest = {
          ortb2: {
            regs: {
              'gpp': 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN',
              'gpp_sid': [
                5
              ]
            }
          }
        };
        let request = spec.buildRequests(bidRequests, bidRequest);
        let data = JSON.parse(request.data);
        expect(data.regs.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN');
        expect(data.regs.gpp_sid[0]).to.equal(5);
      });
    });

    describe('bid responses', function () {
      it('should return complete bid response with adomain', function () {
        const ADOMAINS = ['connectad.io'];

        let serverResponse = {
          body: {
            decisions: {
              '2f95c00074b931': {
                adId: '0',
                adomain: ['connectad.io'],
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
        expect(bids[0].meta.advertiserDomains).to.deep.equal(ADOMAINS);
      });

      it('should process meta response object', function () {
        const ADOMAINS = ['connectad.io'];
        const dsa = {
          behalf: 'Advertiser',
          paid: 'Advertiser',
          transparency: [{
            domain: 'dsp1domain.com',
            dsaparams: [1, 2]
          }],
          adrender: 1
        };

        let serverResponse = {
          body: {
            decisions: {
              '2f95c00074b931': {
                adId: '0',
                adomain: ['connectad.io'],
                contents: [
                  {
                    body: '<<<---- Creative --->>>'
                  }
                ],
                height: '250',
                width: '300',
                dsa: dsa,
                category: 'IAB123',
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
        expect(bids[0].meta.advertiserDomains).to.deep.equal(ADOMAINS);
        expect(bids[0].meta.dsa).to.equal(dsa);
        expect(bids[0].meta.primaryCatId).to.equal('IAB123');
      });

      it('should return complete bid response with empty adomain', function () {
        const ADOMAINS = [];

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
        expect(bids[0].meta.advertiserDomains).to.deep.equal(ADOMAINS);
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

  describe('GPP Sync', function() {
    it('should concatenate gppString and applicableSections values in the returned image url', () => {
      const gppConsent = { gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN', applicableSections: [5] };
      const result = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, undefined, undefined, undefined, gppConsent);
      expect(result).to.deep.equal([{
        type: 'image',
        url: `https://sync.connectad.io/ImageSyncer?gpp=DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN&gpp_sid=5&`
      }]);
    });

    it('should concatenate gppString and applicableSections values in the returned iFrame url', () => {
      const gppConsent = { gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN', applicableSections: [5, 6] };
      const result = spec.getUserSyncs({iframeEnabled: true}, undefined, undefined, undefined, gppConsent);
      expect(result).to.deep.equal([{
        type: 'iframe',
        url: `https://sync.connectad.io/iFrameSyncer?gpp=DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN&gpp_sid=5%2C6&`
      }]);
    });

    it('should return url without Gpp consent if gppConsent is undefined', () => {
      const result = spec.getUserSyncs({iframeEnabled: true}, undefined, undefined, undefined, undefined);
      expect(result).to.deep.equal([{
        type: 'iframe',
        url: `https://sync.connectad.io/iFrameSyncer?`
      }]);
    });

    it('should return iFrame url without Gpp consent if gppConsent.gppString is undefined', () => {
      const gppConsent = { applicableSections: ['5'] };
      const result = spec.getUserSyncs({iframeEnabled: true}, undefined, undefined, undefined, gppConsent);
      expect(result).to.deep.equal([{
        type: 'iframe',
        url: `https://sync.connectad.io/iFrameSyncer?`
      }]);
    });
  });

  describe('getUserSyncs', () => {
    let testParams = [
      {
        name: 'iframe/no gdpr or ccpa',
        arguments: [{ iframeEnabled: true, pixelEnabled: false }, {}, null],
        expect: {
          type: 'iframe',
          pixels: ['https://sync.connectad.io/iFrameSyncer?']
        }
      },
      {
        name: 'iframe/gdpr',
        arguments: [{ iframeEnabled: true, pixelEnabled: false }, {}, {gdprApplies: true, consentString: '234234'}],
        expect: {
          type: 'iframe',
          pixels: ['https://sync.connectad.io/iFrameSyncer?gdpr=1&gdpr_consent=234234&']
        }
      },
      {
        name: 'iframe/ccpa',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, null, 'YN12'],
        expect: {
          type: 'iframe',
          pixels: ['https://sync.connectad.io/iFrameSyncer?us_privacy=YN12&']
        }
      },
      {
        name: 'iframe/ccpa & gdpr',
        arguments: [{ iframeEnabled: true, pixelEnabled: false }, {}, {gdprApplies: true, consentString: '234234'}, 'YN12'],
        expect: {
          type: 'iframe',
          pixels: ['https://sync.connectad.io/iFrameSyncer?gdpr=1&gdpr_consent=234234&us_privacy=YN12&']
        }
      },
      {
        name: 'image/ccpa & gdpr',
        arguments: [{ iframeEnabled: false, pixelEnabled: true }, {}, {gdprApplies: true, consentString: '234234'}, 'YN12'],
        expect: {
          type: 'image',
          pixels: ['https://sync.connectad.io/ImageSyncer?gdpr=1&gdpr_consent=234234&us_privacy=YN12&']
        }
      },
      {
        name: 'image/gdpr',
        arguments: [{ iframeEnabled: false, pixelEnabled: true }, {}, {gdprApplies: true, consentString: '234234'}],
        expect: {
          type: 'image',
          pixels: ['https://sync.connectad.io/ImageSyncer?gdpr=1&gdpr_consent=234234&']
        }
      },
      {
        name: 'should prioritize iframe over image for user sync',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, null],
        expect: {
          type: 'iframe',
          pixels: ['https://sync.connectad.io/iFrameSyncer?']
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
