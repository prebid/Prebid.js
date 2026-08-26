import { expect } from 'chai';
import { spec } from 'modules/rtbhouseBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { mergeDeep } from '../../../src/utils.js';
import { NATIVE } from '../../../src/mediaTypes.js';
import { toLegacyResponse } from '../../../src/native.js';
import 'modules/priceFloors.js';
import 'modules/currency.js';

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
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': 'bidderrequest-auction-id',
        'refererInfo': {
          'page': 'https://example.com',
          'domain': 'example.com',
          'numIframes': 0,
          'reachedTop': true,
          'referer': 'https://example.com',
          'stack': ['https://example.com']
        },
        // request-level FPD (schain etc.) is read from bidderRequest.ortb2 by the converter
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
    });

    it('should not build channel param into request.site if no value is passed', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].params.channel = undefined;
      const builtTestRequest = spec.buildRequests(bidRequest, bidderRequest).data;
      expect(JSON.parse(builtTestRequest).site.channel).to.be.undefined;
    });

    it('should cap the request.site.channel length to 50', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].params.channel = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent scelerisque ipsum eu purus lobortis iaculis.';
      const builtTestRequest = spec.buildRequests(bidRequest, bidderRequest).data;
      expect(JSON.parse(builtTestRequest).site.channel.length).to.equal(50);
    });

    it('should set site.publisher.id from params.publisherId', () => {
      const request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);
      expect(request.site.publisher.id).to.equal('PREBID_TEST');
    });

    it('should set site.name fallback when not provided by FPD', () => {
      const request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);
      expect(request.site.name).to.be.a('string').and.not.empty;
    });

    it('should keep site as the only client section when FPD provides app', () => {
      const localBidderRequest = mergeDeep({}, bidderRequest, {
        ortb2: { app: { bundle: 'com.example.app' } }
      });
      const request = JSON.parse(spec.buildRequests(bidRequests, localBidderRequest).data);
      expect(request.app).to.be.undefined;
      expect(request.site.publisher.id).to.equal('PREBID_TEST');
    });

    it('should keep site as the only client section when FPD provides dooh', () => {
      const localBidderRequest = mergeDeep({}, bidderRequest, {
        ortb2: { dooh: { id: 'dooh-id' } }
      });
      const request = JSON.parse(spec.buildRequests(bidRequests, localBidderRequest).data);
      expect(request.dooh).to.be.undefined;
      expect(request.site.publisher.id).to.equal('PREBID_TEST');
    });

    it('should build valid OpenRTB banner object', () => {
      const request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);
      const imp = request.imp[0];
      expect(imp.banner.w).to.equal(300);
      expect(imp.banner.h).to.equal(250);
      expect(imp.banner.format).to.deep.equal([{
        w: 300,
        h: 250
      }, {
        w: 300,
        h: 600
      }]);
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      expect(request.url).to.equal('https://prebid-eu.creativecdn.com/bidder/prebid/bids');
      expect(request.method).to.equal('POST');
    });

    it('should hardcode cur to USD', () => {
      const request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);
      expect(request.cur).to.deep.equal(['USD']);
    });

    it('should set imp.secure to 1', () => {
      const request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);
      expect(request.imp[0].secure).to.equal(1);
    });

    it('should forward tmax from bidderRequest.timeout', () => {
      const localBidderRequest = { ...bidderRequest, timeout: 1000 };
      const request = JSON.parse(spec.buildRequests(bidRequests, localBidderRequest).data);
      expect(request.tmax).to.equal(1000);
    });

    it('should not populate GDPR for non-EEA users', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data).to.not.have.nested.property('regs.ext.gdpr');
      expect(data).to.not.have.nested.property('user.ext.consent');
    });

    it('should populate GDPR and consent string if available for EEA users', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const localBidderRequest = mergeDeep({}, bidderRequest, {
        ortb2: {
          regs: { ext: { gdpr: 1 } },
          user: { ext: { consent: 'BOJ8RZsOJ8RZsABAB8AAAAAZ-A' } }
        }
      });
      const request = spec.buildRequests(bidRequest, localBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('BOJ8RZsOJ8RZsABAB8AAAAAZ-A');
    });

    it('should populate GPP consent from ortb2.regs.gpp', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const localBidderRequest = mergeDeep({}, bidderRequest, {
        ortb2: {
          regs: {
            gpp: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
            gpp_sid: [7]
          }
        }
      });
      const request = spec.buildRequests(bidRequest, localBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.regs.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(data.regs.gpp_sid).to.deep.equal([7]);
    });

    it('should forward us_privacy from ortb2.regs.ext.us_privacy', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const localBidderRequest = mergeDeep({}, bidderRequest, {
        ortb2: { regs: { ext: { us_privacy: '1YNN' } } }
      });
      const request = spec.buildRequests(bidRequest, localBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.regs.ext.us_privacy).to.equal('1YNN');
    });

    it('should forward coppa from ortb2.regs.coppa', function () {
      const bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const localBidderRequest = mergeDeep({}, bidderRequest, {
        ortb2: { regs: { coppa: 1 } }
      });
      const request = spec.buildRequests(bidRequest, localBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.regs.coppa).to.equal(1);
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
      expect(data.source.tid).to.be.a('string');
    });

    it('should include bidfloor from floor module if available', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].getFloor = () => ({ floor: 1.22, currency: 'USD' });
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].bidfloor).to.equal(1.22);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should use bidfloor from floor module if both floor module and bid floor available', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].getFloor = () => ({ floor: 1.22, currency: 'USD' });
      bidRequest[0].params.bidfloor = 0.01;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].bidfloor).to.equal(1.22);
    });

    it('should include bidfloor from params if floor module not available', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].params.bidfloor = 0.01;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].bidfloor).to.equal(0.01);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should include schain at source.ext.schain in request', () => {
      const bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.source.ext.schain).to.deep.equal({
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
      // legacy top-level ext.schain location is no longer used
      expect(data.ext && data.ext.schain).to.be.undefined;
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

    it('should include imp.tagid equal to adUnitCode', () => {
      const bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].tagid).to.equal('adunit-code');
    });

    it('should not include imp[].ext.ae set at impression level when provided', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].ortb2Imp.ext.ae = 1;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].ext.ae).to.be.undefined;
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
      expect(data.site).to.nested.include({ 'ext.data': 'some site data' });
      expect(data.device).to.nested.include({ 'ext.data': 'some device data' });
      expect(data.user).to.nested.include({ 'ext.data': 'some user data' });
    });

    it('should forward eids from ortb2.user.ext.eids', function () {
      const eids = [{ source: 'example.com', uids: [{ id: 'user-123', atype: 1 }] }];
      const localBidderRequest = mergeDeep({}, bidderRequest, {
        ortb2: { user: { ext: { eids } } }
      });
      const request = spec.buildRequests(bidRequests, localBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.user.ext.eids).to.deep.equal(eids);
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

    if (FEATURES.NATIVE) {
      describe('native imp', () => {
        function basicRequest(extension) {
          return Object.assign({
            bidder: 'rtbhouse',
            adUnitCode: 'adunit-code',
            bidId: '1',
            bidderRequestId: '22edbae2733bf6',
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

        it('should send a stringified ORTB native request', () => {
          const nativeOrtbRequest = {
            ver: '1.2',
            assets: [{
              id: 1,
              required: 1,
              title: { len: 100 }
            }]
          };
          const imp = buildImp(basicRequest({
            mediaTypes: { native: { title: { required: true, len: 100 } } },
            nativeOrtbRequest
          }));
          expect(imp.native.request).to.be.a('string');
          expect(JSON.parse(imp.native.request)).to.deep.equal(nativeOrtbRequest);
          expect(imp.native.ver).to.equal('1.2');
        });

        it('should not contain banner in a native-only imp', () => {
          const imp = buildImp(basicRequest({
            mediaTypes: { native: { title: { required: true } } },
            nativeOrtbRequest: {
              ver: '1.2',
              assets: [{ id: 1, required: 1, title: { len: 25 } }]
            }
          }));
          expect(imp.banner).to.be.undefined;
          expect(imp.native).to.not.be.undefined;
        });
      });
    }
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
      const result = spec.interpretResponse({ body: response }, { bidderRequest });
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function () {
      const response = '';
      let bidderRequest;
      const result = spec.interpretResponse({ body: response }, { bidderRequest });
      expect(result.length).to.equal(0);
    });

    it('should skip bids with no/zero price', function () {
      const zeroPriceResponse = [{ impid: 'x', price: 0, adm: '<!-- -->' }];
      const result = spec.interpretResponse({ body: zeroPriceResponse }, {});
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
        const result = spec.interpretResponse({ body: response }, { bidderRequest });

        expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
        expect(result[0]).to.have.nested.property('meta.dsa');
        expect(result[0]).to.have.nested.property('ext.dsa');
        expect(result[0].meta.dsa).to.deep.equal(expectedResponse[0].meta.dsa);
        expect(result[0].ext.dsa).to.deep.equal(expectedResponse[0].meta.dsa);
      });
    });

    describe('native', () => {
      const nativeOrtbRequest = {
        ver: '1.2',
        assets: [{
          id: 0,
          required: 1,
          title: { len: 100 }
        }, {
          id: 1,
          required: 1,
          img: { type: 3, w: 300, h: 150 }
        }, {
          id: 2,
          required: 0,
          data: { type: 1 }
        }]
      };
      const nativeOrtbResponse = {
        ver: '1.2',
        link: {
          url: 'https://example.com'
        },
        imptrackers: [
          'https://example.com/imptracker'
        ],
        assets: [{
          id: 0,
          title: { text: 'Title text' }
        }, {
          id: 2,
          data: { value: 'RTB House' }
        }, {
          id: 1,
          img: { url: 'https://example.com/image.jpg', w: 300, h: 150 }
        }]
      };

      function responseWith(adm) {
        return [{
          'id': 'id',
          'impid': 'impid',
          'price': 1,
          'adid': 'adid',
          'adm': typeof adm === 'string' ? adm : JSON.stringify(adm),
          'adomain': ['rtbhouse.com'],
          'cid': 'cid',
          'w': 1,
          'h': 1
        }];
      }

      it('should pass the ORTB native response through for the core native module', () => {
        // the endpoint wraps the response in `native` (OpenRTB Native 1.1 convention)
        const bids = spec.interpretResponse({ body: responseWith({ native: nativeOrtbResponse }) }, {});
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
        expect(bids[0].meta.advertiserDomains).to.deep.equal(['rtbhouse.com']);
        expect(bids[0].native).to.deep.equal({ ortb: nativeOrtbResponse });
      });

      it('should accept a root-level (1.2) native response', () => {
        const bids = spec.interpretResponse({ body: responseWith(nativeOrtbResponse) }, {});
        expect(bids[0].native).to.deep.equal({ ortb: nativeOrtbResponse });
      });

      it('should resolve sequential asset ids against the request', () => {
        const bids = spec.interpretResponse({ body: responseWith({ native: nativeOrtbResponse }) }, {});
        // what core does with bid.native.ortb in setNativeResponseProperties()
        const legacy = toLegacyResponse(bids[0].native.ortb, nativeOrtbRequest);
        expect(legacy.title).to.equal('Title text');
        expect(legacy.image).to.deep.equal({
          url: 'https://example.com/image.jpg',
          width: 300,
          height: 150
        });
        expect(legacy.icon).to.be.undefined;
        expect(legacy.sponsoredBy).to.equal('RTB House');
        expect(legacy.clickUrl).to.equal('https://example.com');
        expect(legacy.impressionTrackers).to.deep.equal(['https://example.com/imptracker']);
      });

      it('should map a real endpoint response with a sequential id 0 (captured live)', () => {
        const liveRequest = {
          ver: '1.2',
          assets: [
            { id: 0, required: 1, title: { len: 40 } },
            { id: 1, required: 1, img: { type: 3, wmin: 1200, hmin: 600, w: 1200, h: 600 } },
            { id: 2, required: 0, data: { type: 2, len: 150 } }
          ]
        };
        const liveResponse = {
          ver: '1.2',
          assets: [
            { id: 0, title: { text: 'Title text' } },
            { id: 2, data: { value: 'Content' } },
            { id: 1, img: { url: 'https://example.com/image.jpg', w: 1200, h: 600 } }
          ],
          link: { url: 'https://example.com/link' },
          imptrackers: ['https://example.com/imptracker'],
          eventtrackers: [{ event: 1, method: 1, url: 'https://tracker.com/track' }]
        };

        const bids = spec.interpretResponse({ body: responseWith({ native: liveResponse }) }, {});
        expect(bids[0].native).to.deep.equal({ ortb: liveResponse });

        const legacy = toLegacyResponse(bids[0].native.ortb, liveRequest);
        expect(legacy.title).to.equal('Title text');
        expect(legacy.image).to.deep.equal({
          url: 'https://example.com/image.jpg',
          width: 1200,
          height: 600
        });
        expect(legacy.icon).to.be.undefined; // img type 3 is the MAIN image, not an icon
        expect(legacy.body).to.equal('Content');
        expect(legacy.clickUrl).to.equal('https://example.com/link');
        // both tracker styles arrive; core takes imptrackers plus matching eventtrackers
        expect(legacy.impressionTrackers).to.include('https://example.com/imptracker');
      });

      it('should replace the AUCTION_PRICE macro in the native response', () => {
        const adm = JSON.stringify({
          native: mergeDeep({}, nativeOrtbResponse, {
            link: { url: 'https://example.com/click?price=${AUCTION_PRICE}' }
          })
        });
        const bids = spec.interpretResponse({ body: responseWith(adm) }, {});
        expect(bids[0].native.ortb.link.url).to.equal('https://example.com/click?price=1');
      });

      it('should drop a bid whose native adm is not parseable', () => {
        const bids = spec.interpretResponse({ body: responseWith('{"native": ') }, {});
        expect(bids).to.deep.equal([]);
      });

      it('should drop a native bid with no assets', () => {
        const bids = spec.interpretResponse({ body: responseWith({ native: { link: { url: 'https://example.com' } } }) }, {});
        expect(bids).to.deep.equal([]);
      });
    });
  });
});
