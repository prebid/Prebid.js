import { expect } from 'chai';
import { OPENRTB, spec } from 'modules/rtbhouseBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('RTBHouseAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
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
      let bid2 = Object.assign({}, bid);
      delete bid2.mediaTypes;
      bid2.sizes = [[300, 250], [300, 600]];
      expect(spec.isBidRequestValid(bid2)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'someIncorrectParam': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'rtbhouse',
        'params': {
          'publisherId': 'PREBID_TEST',
          'region': 'prebid-eu',
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
      }
    ];
    const bidderRequest = {
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'referer': 'http://example.com',
        'stack': ['http://example.com']
      }
    };

    it('should build test param into the request', () => {
      let builtTestRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(JSON.parse(builtTestRequest).test).to.equal(1);
    });

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
      let bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      expect(request.url).to.equal('https://prebid-eu.creativecdn.com/bidder/prebid/bids');
      expect(request.method).to.equal('POST');
    });

    it('should not populate GDPR if for non-EEA users', function () {
      let bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      let data = JSON.parse(request.data);
      expect(data).to.not.have.property('regs');
      expect(data).to.not.have.property('user');
    });

    it('should populate GDPR and consent string if available for EEA users', function () {
      let bidRequest = Object.assign([], bidRequests);
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
      let data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('BOJ8RZsOJ8RZsABAB8AAAAAZ-A');
    });

    it('should populate GDPR and empty consent string if available for EEA users without consent string but with consent', function () {
      let bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(
        bidRequest,
        Object.assign({}, bidderRequest, {
          gdprConsent: {
            gdprApplies: true
          }
        })
      );
      let data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('');
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
      expect(data.source.tid).to.equal('example-transaction-id');
    });

    it('should include bidfloor in request if available', () => {
      const bidRequest = Object.assign([], bidRequests);
      bidRequest[0].params.bidfloor = 0.01;
      const request = spec.buildRequests(bidRequest, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].bidfloor).to.equal(0.01)
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
    let response = [{
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

    it('should get correct bid response', function () {
      let expectedResponse = [
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
          'netRevenue': true
        }
      ];
      let bidderRequest;
      let result = spec.interpretResponse({body: response}, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function () {
      let response = '';
      let bidderRequest;
      let result = spec.interpretResponse({body: response}, {bidderRequest});
      expect(result.length).to.equal(0);
    });

    describe('native', () => {
      const adm = {
        native: {
          ver: 1.1,
          link: {
            url: 'http://example.com'
          },
          imptrackers: [
            'http://example.com/imptracker'
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
              url: 'http://example.com/image.jpg',
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
        expect(bids[0].native).to.deep.equal({
          title: 'Title text',
          clickUrl: encodeURIComponent('http://example.com'),
          impressionTrackers: ['http://example.com/imptracker'],
          image: {
            url: encodeURIComponent('http://example.com/image.jpg'),
            width: 150,
            height: 50
          },
          body: 'Body text'
        });
      });
    });
  });
});
