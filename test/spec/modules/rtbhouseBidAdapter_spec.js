import { expect } from 'chai';
import { spec } from 'modules/rtbhouseBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { mergeDeep } from '../../../src/utils.js';
import { OPENRTB } from '../../../libraries/precisoUtils/bidNativeUtils.js';

describe('RTBHouseAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'rtbhouse',
      'params': {
        'publisherId': 'PREBID_TEST',
        'region': 'prebid-eu'
      },
      'adUnitCode': 'adunit-code',
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250], [300, 600]],
        }
      },
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('Checking backward compatibility. should return true', function () {
      const bid2 = Object.assign({}, bid);
      delete bid2.mediaTypes;
      bid2.sizes = [[300, 250], [300, 600]];
      expect(spec.isBidRequestValid(bid2)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {
        'someIncorrectParam': 0
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests;
    let bidderRequest;

    beforeEach(() => {
      bidderRequest = {
        'auctionId': 'bidderrequest-auction-id',
        'refererInfo': {
          'numIframes': 0,
          'reachedTop': true,
          'referer': 'https://example.com',
          'stack': ['https://example.com']
        }
      };
      bidRequests = [
        {
          'bidder': 'rtbhouse',
          'params': {
            'publisherId': 'PREBID_TEST',
            'region': 'prebid-eu',
            'channel': 'Partner_Site - news',
            'test': 1
          },
          'adUnitCode': 'adunit-code',
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 250], [300, 600]],
            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
          'transactionId': 'example-transaction-id',
          'ortb2Imp': {
            'ext': {
              'tid': 'ortb2Imp-transaction-id-1',
              'gpid': 'example-gpid'
            }
          },
          'ortb2': {
            'source': {
              'ext': {
                'schain': {
                  'ver': '1.0',
                  'complete': 1,
                  'nodes': [
                    {
                      'asi': 'directseller.com',
                      'sid': '00001',
                      'rid': 'BidRequest1',
                      'hp': 1
                    }
                  ]
                }
              }
            }
          }
        }
      ];
    });

    afterEach(function () {
      config.resetConfig();
    });

    it('should build test param into the request', () => {
      const builtTestRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(JSON.parse(builtTestRequest).test).to.equal(1);
    });

    it('should build channel param into request.site', () => {
      const builtTestRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(JSON.parse(builtTestRequest).site.channel).to.equal('Partner_Site - news');
    })

    it('should not build channel param into request.site if no value is passed', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].params.channel = undefined;
      const builtTestRequest = spec.buildRequests(bidRequest, bidderRequest).data;
      expect(JSON.parse(builtTestRequest).site.channel).to.be.undefined
    })

    it('should cap the request.site.channel length to 50', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].params.channel = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent scelerisque ipsum eu purus lobortis iaculis.';
      const builtTestRequest = spec.buildRequests(bidRequest, bidderRequest).data;
      expect(JSON.parse(builtTestRequest).site.channel.length).to.equal(50)
    })

    it('should build valid OpenRTB banner object', () => {
      const request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);
      const imp = request.imp[0];
      expect(imp.banner).to.deep.equal({
        w: 300,
        h: 250,
        format: [{
          w: 300,
          h: 250
        }, {
          w: 300,
          h: 600
        }]
      })
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      expect(request.url).to.equal('https://prebid-eu.creativecdn.com/bidder/prebid/bids');
      expect(request.method).to.equal('POST');
    });

    it('should not populate GDPR if for non-EEA users', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data).to.not.have.property('regs');
      expect(data).to.not.have.property('user');
    });

    it('should populate GDPR and consent string if available for EEA users', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A=='
          }
        })
      );
      const data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('BOJ8RZsOJ8RZsABAB8AAAAAZ-A');
    });

    it('should populate GDPR and empty consent string if available for EEA users without consent string but with consent', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          gdprConsent: {
            gdprApplies: true
          }
        })
      );
      const data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('');
    });

    it('should populate GPP consent string when gppConsent.gppString is provided', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          gppConsent: {
            gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
            applicableSections: [7]
          }
        })
      );
      const data = JSON.parse(request.data);
      expect(data.regs.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(data.regs.gpp_sid).to.deep.equal([7]);
    });

    it('should populate GPP consent with multiple applicable sections', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          gppConsent: {
            gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
            applicableSections: [2, 6, 7]
          }
        })
      );
      const data = JSON.parse(request.data);
      expect(data.regs.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(data.regs.gpp_sid).to.deep.equal([2, 6, 7]);
    });

    it('should fallback to ortb2.regs.gpp when gppConsent.gppString is not provided', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const localBidderRequest = {
        ...bidderRequest,
        ortb2: {
          regs: {
            gpp: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
            gpp_sid: [8, 10]
          }
        }
      };
      const request = spec.buildRequests(bidRequest, localBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.regs.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(data.regs.gpp_sid).to.deep.equal([8, 10]);
    });

    it('should prioritize gppConsent.gppString over ortb2.regs.gpp', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const localBidderRequest = {
        ...bidderRequest,
        gppConsent: {
          gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
          applicableSections: [7]
        },
        ortb2: {
          regs: {
            gpp: 'DIFFERENT_GPP_STRING',
            gpp_sid: [8, 10]
          }
        }
      };
      const request = spec.buildRequests(bidRequest, localBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.regs.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(data.regs.gpp_sid).to.deep.equal([7]);
    });

    it('should not populate GPP consent when neither gppConsent nor ortb2.regs.gpp is provided', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data).to.not.have.nested.property('regs.gpp');
      expect(data).to.not.have.nested.property('regs.gpp_sid');
    });

    it('should not populate GPP when gppConsent exists but gppString is missing', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          gppConsent: {
            applicableSections: [7]
          }
        })
      );
      const data = JSON.parse(request.data);
      expect(data).to.not.have.nested.property('regs.gpp');
      expect(data).to.not.have.nested.property('regs.gpp_sid');
    });

    it('should handle both GDPR and GPP consent together', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A=='
          },
          gppConsent: {
            gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
            applicableSections: [7]
          }
        })
      );
      const data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('BOJ8RZsOJ8RZsABAB8AAAAAZ-A');
      expect(data.regs.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(data.regs.gpp_sid).to.deep.equal([7]);
    });

    it('should include banner imp in request', () => {
      const bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].banner).to.not.be.empty;
    });

    it('should include source.tid in request', () => {
      const bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.source.tid).to.equal('bidderrequest-auction-id');
    });

    it('should include bidfloor from floor module if avaiable', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].getFloor = () => ({floor: 1.22});
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].bidfloor).to.equal(1.22)
    });

    it('should use bidfloor from floor module if both floor module and bid floor avaiable', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].getFloor = () => ({floor: 1.22});
      bidRequest[0].params.bidfloor = 0.01;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].bidfloor).to.equal(1.22)
    });

    it('should include bidfloor in request if available', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].params.bidfloor = 0.01;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].bidfloor).to.equal(0.01)
    });

    it('should include schain in request', () => {
      const bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.ext.schain).to.deep.equal({
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'asi': 'directseller.com',
            'sid': '00001',
            'rid': 'BidRequest1',
            'hp': 1
          }
        ]
      });
    });

    it('should include source.tid in request', () => {
      const bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.source).to.have.deep.property('tid');
    });

    it('should include impression level transaction id when provided', () => {
      const bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].ext.tid).to.equal('ortb2Imp-transaction-id-1');
    });

    it('should include impression level GPID when provided', () => {
      const bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].ext.gpid).to.equal('example-gpid');
    });

    it('should not include imp[].ext.ae set at impression level when provided', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].ortb2Imp.ext.ae = 1;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].ext.ae).to.be.undefined;
    });

    it('should not include invalid schain', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].ortb2 = bidRequest[0].ortb2 || {};
      bidRequest[0].ortb2.source = bidRequest[0].ortb2.source || {};
      bidRequest[0].ortb2.source.ext = bidRequest[0].ortb2.source.ext || {};
      bidRequest[0].ortb2.source.ext.schain = {
        'nodes': [{
          'unknown_key': 1
        }]
      };
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.source).to.not.have.property('ext');
    });

    it('should include first party data', function () {
      const bidRequest = Object.assign([], bidRequests);
      const localBidderRequest = {
        ...bidderRequest,
        ortb2: {
          bcat: ['IAB1', 'IAB2-1'],
          badv: ['domain1.com', 'domain2.com'],
          site: { ext: { data: 'some site data' } },
          device: { ext: { data: 'some device data' } },
          user: { ext: { data: 'some user data' } }
        }
      };

      const request = spec.buildRequests(bidRequest, localBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.bcat).to.deep.equal(localBidderRequest.ortb2.bcat);
      expect(data.badv).to.deep.equal(localBidderRequest.ortb2.badv);
      expect(data.site).to.nested.include({'ext.data': 'some site data'});
      expect(data.device).to.nested.include({'ext.data': 'some device data'});
      expect(data.user).to.nested.include({'ext.data': 'some user data'});
    });

    context('DSA', () => {
      const validDSAObject = {
        'dsarequired': 3,
        'pubrender': 0,
        'datatopub': 2,
        'transparency': [
          {
            'domain': 'platform1domain.com',
            'dsaparams': [1]
          },
          {
            'domain': 'SSP2domain.com',
            'dsaparams': [1, 2]
          }
        ]
      };
      const invalidDSAObjects = [
        -1,
        0,
        '',
        'x',
        true,
        [],
        [1],
        {},
        {
          'dsarequired': -1
        },
        {
          'pubrender': -1
        },
        {
          'datatopub': -1
        },
        {
          'dsarequired': 4
        },
        {
          'pubrender': 3
        },
        {
          'datatopub': 3
        },
        {
          'dsarequired': '1'
        },
        {
          'pubrender': '1'
        },
        {
          'datatopub': '1'
        },
        {
          'transparency': '1'
        },
        {
          'transparency': 2
        },
        {
          'transparency': [
            1, 2
          ]
        },
        {
          'transparency': [
            {
              domain: '',
              dsaparams: []
            }
          ]
        },
        {
          'transparency': [
            {
              domain: 'x',
              dsaparams: null
            }
          ]
        },
        {
          'transparency': [
            {
              domain: 'x',
              dsaparams: [1, '2']
            }
          ]
        },
      ];
      let bidRequest;

      beforeEach(() => {
        bidRequest = Object.assign([], bidRequests);
      });

      it('should add dsa information to the request via bidderRequest.ortb2.regs.ext.dsa', function () {
        const localBidderRequest = {
          ...bidderRequest,
          ortb2: {
            regs: {
              ext: {
                dsa: validDSAObject
              }
            }
          }
        };

        const request = spec.buildRequests(bidRequest, localBidderRequest);
        const data = JSON.parse(request.data);

        expect(data).to.have.nested.property('regs.ext.dsa');
        expect(data.regs.ext.dsa.dsarequired).to.equal(3);
        expect(data.regs.ext.dsa.pubrender).to.equal(0);
        expect(data.regs.ext.dsa.datatopub).to.equal(2);
        expect(data.regs.ext.dsa.transparency).to.deep.equal([
          {
            'domain': 'platform1domain.com',
            'dsaparams': [1]
          },
          {
            'domain': 'SSP2domain.com',
            'dsaparams': [1, 2]
          }
        ]);
      });

      invalidDSAObjects.forEach((invalidDSA, index) => {
        it(`should not add dsa information to the request via bidderRequest.ortb2.regs.ext.dsa; test# ${index}`, function () {
          const localBidderRequest = {
            ...bidderRequest,
            ortb2: {
              regs: {
                ext: {
                  dsa: invalidDSA
                }
              }
            }
          };

          const request = spec.buildRequests(bidRequest, localBidderRequest);
          const data = JSON.parse(request.data);

          expect(data).to.not.have.nested.property('regs.ext.dsa');
        });
      });
    });

    describe('native imp', () => {
      function basicRequest(extension) {
        return Object.assign({
          bidder: 'bidder',
          adUnitCode: 'adunit-code',
          bidId: '1',
          params: {
            publisherId: 'PREBID_TEST',
            region: 'prebid-eu',
            test: 1
          }
        }, extension);
      }

      function buildImp(request) {
        const resultRequest = spec.buildRequests([request], bidderRequest);
        return JSON.parse(resultRequest.data).imp[0];
      }

      it('should extract native params when single mediaType', () => {
        const imp = buildImp(basicRequest({
          mediaType: 'native',
          nativeParams: {
            title: {
              required: true,
              len: 100
            }
          }
        }));
        expect(imp.native.request.assets[0]).to.deep.equal({
          id: OPENRTB.NATIVE.ASSET_ID.TITLE,
          required: 1,
          title: {
            len: 100
          }
        })
      });

      it('should extract native params when many mediaTypes', () => {
        const imp = buildImp(basicRequest({
          mediaTypes: {
            native: {
              title: {
                len: 100
              }
            }
          }
        }));
        expect(imp.native.request.assets[0]).to.deep.equal({
          id: OPENRTB.NATIVE.ASSET_ID.TITLE,
          required: 0,
          title: {
            len: 100
          }
        })
      });

      it('should not contain banner in imp', () => {
        const imp = buildImp(basicRequest({
          mediaTypes: {
            native: {
              title: {
                required: true
              }
            }
          }
        }));
        expect(imp.banner).to.be.undefined;
      });

      describe('image sizes', () => {
        it('should parse single image size', () => {
          const imp = buildImp(basicRequest({
            mediaTypes: {
              native: {
                image: {
                  sizes: [300, 250]
                }
              }
            }
          }));
          expect(imp.native.request.assets[0]).to.deep.equal({
            id: OPENRTB.NATIVE.ASSET_ID.IMAGE,
            required: 0,
            img: {
              w: 300,
              h: 250,
              type: OPENRTB.NATIVE.IMAGE_TYPE.MAIN,
            }
          })
        });

        it('should parse multiple image sizes', () => {
          const imp = buildImp(basicRequest({
            mediaTypes: {
              native: {
                image: {
                  sizes: [[300, 250], [100, 100]]
                }
              }
            }
          }));
          expect(imp.native.request.assets[0]).to.deep.equal({
            id: OPENRTB.NATIVE.ASSET_ID.IMAGE,
            required: 0,
            img: {
              w: 300,
              h: 250,
              type: OPENRTB.NATIVE.IMAGE_TYPE.MAIN,
            }
          })
        })
      });

      it('should parse aspect ratios with min_width', () => {
        const imp = buildImp(basicRequest({
          mediaTypes: {
            native: {
              icon: {
                aspect_ratios: [{
                  min_width: 300,
                  ratio_width: 2,
                  ratio_height: 3,
                }]
              }
            }
          }
        }));
        expect(imp.native.request.assets[0]).to.deep.equal({
          id: OPENRTB.NATIVE.ASSET_ID.ICON,
          required: 0,
          img: {
            type: OPENRTB.NATIVE.IMAGE_TYPE.ICON,
            wmin: 300,
            hmin: 450,
          }
        })
      });

      it('should parse aspect ratios without min_width', () => {
        const imp = buildImp(basicRequest({
          mediaTypes: {
            native: {
              icon: {
                aspect_ratios: [{
                  ratio_width: 2,
                  ratio_height: 3,
                }]
              }
            }
          }
        }));
        expect(imp.native.request.assets[0]).to.deep.equal({
          id: OPENRTB.NATIVE.ASSET_ID.ICON,
          required: 0,
          img: {
            type: OPENRTB.NATIVE.IMAGE_TYPE.ICON,
            wmin: 100,
            hmin: 150,
          }
        })
      });

      it('should handle all native assets', () => {
        const imp = buildImp(basicRequest({
          mediaTypes: {
            native: {
              title: {},
              image: {},
              icon: {},
              sponsoredBy: {},
              body: {},
              cta: {},
            }
          }
        }));
        expect(imp.native.request.assets.length).to.equal(6);
        imp.native.request.assets.forEach(asset => {
          expect(asset.id).to.be.at.least(1)
        })
      });
    });
  });

  describe('interpretResponse', function () {
    let response;
    beforeEach(() => {
      response = [{
        'id': 'bidder_imp_identifier',
        'impid': '552b8922e28f27',
        'price': 0.5,
        'adid': 'Ad_Identifier',
        'adm': '<!-- test creative -->',
        'adomain': ['rtbhouse.com'],
        'cid': 'Ad_Identifier',
        'w': 300,
        'h': 250
      }];
    });

    it('should get correct bid response', function () {
      const expectedResponse = [
        {
          'requestId': '552b8922e28f27',
          'cpm': 0.5,
          'creativeId': 29681110,
          'width': 300,
          'height': 250,
          'ad': '<!-- test creative -->',
          'mediaType': 'banner',
          'currency': 'USD',
          'ttl': 300,
          'meta': { advertiserDomains: ['rtbhouse.com'] },
          'netRevenue': true
        }
      ];
      let bidderRequest;
      const result = spec.interpretResponse({body: response}, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function () {
      const response = '';
      let bidderRequest;
      const result = spec.interpretResponse({body: response}, {bidderRequest});
      expect(result.length).to.equal(0);
    });

    context('when the response contains DSA object', function () {
      it('should get correct bid response', function () {
        const dsa = {
          'dsa': {
            'behalf': 'Advertiser',
            'paid': 'Advertiser',
            'transparency': [{
              'domain': 'dsp1domain.com',
              'dsaparams': [1, 2]
            }],
            'adrender': 1
          }
        };
        mergeDeep(response[0], { ext: dsa });

        const expectedResponse = [
          {
            'requestId': '552b8922e28f27',
            'cpm': 0.5,
            'creativeId': 29681110,
            'width': 300,
            'height': 250,
            'ad': '<!-- test creative -->',
            'mediaType': 'banner',
            'currency': 'USD',
            'ttl': 300,
            'meta': {
              'advertiserDomains': ['rtbhouse.com'],
              ...dsa
            },
            'netRevenue': true,
            ext: { ...dsa }
          }
        ];
        let bidderRequest;
        const result = spec.interpretResponse({body: response}, {bidderRequest});

        expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
        expect(result[0]).to.have.nested.property('meta.dsa');
        expect(result[0]).to.have.nested.property('ext.dsa');
        expect(result[0].meta.dsa).to.deep.equal(expectedResponse[0].meta.dsa);
        expect(result[0].ext.dsa).to.deep.equal(expectedResponse[0].meta.dsa);
      });
    });

    describe('native', () => {
      const adm = {
        native: {
          ver: 1.1,
          link: {
            url: 'https://example.com'
          },
          imptrackers: [
            'https://example.com/imptracker'
          ],
          assets: [{
            id: OPENRTB.NATIVE.ASSET_ID.TITLE,
            required: 1,
            title: {
              text: 'Title text'
            }
          }, {
            id: OPENRTB.NATIVE.ASSET_ID.IMAGE,
            required: 1,
            img: {
              url: 'https://example.com/image.jpg',
              w: 150,
              h: 50
            }
          }, {
            id: OPENRTB.NATIVE.ASSET_ID.BODY,
            required: 0,
            data: {
              value: 'Body text'
            }
          }],
        }
      };
      const response = [{
        'id': 'id',
        'impid': 'impid',
        'price': 1,
        'adid': 'adid',
        'adm': JSON.stringify(adm),
        'adomain': ['rtbhouse.com'],
        'cid': 'cid',
        'w': 1,
        'h': 1
      }];

      it('should contain native assets in valid format', () => {
        const bids = spec.interpretResponse({body: response}, {});
        expect(bids[0].meta.advertiserDomains).to.deep.equal(['rtbhouse.com']);
        expect(bids[0].native).to.deep.equal({
          title: 'Title text',
          clickUrl: encodeURI('https://example.com'),
          impressionTrackers: ['https://example.com/imptracker'],
          image: {
            url: encodeURI('https://example.com/image.jpg'),
            width: 150,
            height: 50
          },
          body: 'Body text'
        });
      });
    });
  });
});
