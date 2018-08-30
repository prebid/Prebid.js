import { expect } from 'chai';
import { spec } from 'modules/giantsBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { deepClone } from 'src/utils';
import * as utils from 'src/utils';

const ENDPOINT = '//d.admp.io/hb/multi?url=';

describe('GiantsAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'giants',
      'params': {
        'zoneId': '584072408'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'zoneId': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'giants',
        'params': {
          'zoneId': '584072408'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('should parse out private sizes', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            zoneId: '584072408',
            privateSizes: [300, 250]
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].private_sizes).to.exist;
      expect(payload.tags[0].private_sizes).to.deep.equal([{width: 300, height: 250}]);
    });

    it('should add source and verison to the tag', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.sdk).to.exist;
      expect(payload.sdk).to.deep.equal({
        source: 'pbjs',
        version: '$prebid.version$'
      });
    });

    it('should populate the ad_types array on all requests', function () {
      ['banner', 'video', 'native'].forEach(type => {
        const bidRequest = Object.assign({}, bidRequests[0]);
        bidRequest.mediaTypes = {};
        bidRequest.mediaTypes[type] = {};

        const request = spec.buildRequests([bidRequest]);
        const payload = JSON.parse(request.data);

        expect(payload.tags[0].ad_types).to.deep.equal([type]);
      });
    });

    it('should populate the ad_types array on outstream requests', function () {
      const bidRequest = Object.assign({}, bidRequests[0]);
      bidRequest.mediaTypes = {};
      bidRequest.mediaTypes.video = {context: 'outstream'};

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].ad_types).to.deep.equal(['video']);
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT + utils.getTopWindowUrl());
      expect(request.method).to.equal('POST');
    });

    it('should attach valid video params to the tag', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            zoneId: '584072408',
            video: {
              id: 123,
              minduration: 100,
              foobar: 'invalid'
            }
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      expect(payload.tags[0].video).to.deep.equal({
        id: 123,
        minduration: 100
      });
    });

    it('sets minimum native asset params when not provided on adunit', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          mediaType: 'native',
          nativeParams: {
            image: {required: true},
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].native.layouts[0]).to.deep.equal({
        main_image: {required: true, sizes: [{}]},
      });
    });

    it('does not overwrite native ad unit params with mimimum params', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          mediaType: 'native',
          nativeParams: {
            image: {
              aspect_ratios: [{
                min_width: 100,
                ratio_width: 2,
                ratio_height: 3,
              }]
            }
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].native.layouts[0]).to.deep.equal({
        main_image: {
          required: true,
          aspect_ratios: [{
            min_width: 100,
            ratio_width: 2,
            ratio_height: 3,
          }]
        },
      });
    });

    it('should convert keyword params to proper form and attaches to request', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            zoneId: '584072408',
            keywords: {
              single: 'val',
              singleArr: ['val'],
              singleArrNum: [5],
              multiValMixed: ['value1', 2, 'value3'],
              singleValNum: 123,
              badValue: {'foo': 'bar'} // should be dropped
            }
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].keywords).to.deep.equal([{
        'key': 'single',
        'value': ['val']
      }, {
        'key': 'singleArr',
        'value': ['val']
      }, {
        'key': 'singleArrNum',
        'value': ['5']
      }, {
        'key': 'multiValMixed',
        'value': ['value1', '2', 'value3']
      }, {
        'key': 'singleValNum',
        'value': ['123']
      }]);
    });

    it('should add payment rules to the request', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            zoneId: '584072408',
            usePaymentRule: true
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].use_pmt_rule).to.equal(true);
    });
  })

  describe('interpretResponse', function () {
    let response = {
      'version': '3.0.0',
      'tags': [
        {
          'uuid': '3db3773286ee59',
          'creative_id': '584944065',
          'height': 600,
          'width': 300,
          'zoneId': '584072408',
          'adUrl': '//d.admp.io/pbc/v1/cache-banner/f7aca005-8171-4299-90bf-0750a864a61c',
          'cpm': 0.5
        }
      ]
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          'requestId': '3db3773286ee59',
          'cpm': 0.5,
          'creativeId': 29681110,
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 300,
          'width': 300,
          'height': 250,
          'ad': '<!-- Creative -->',
          'mediaType': 'banner'
        }
      ];
      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function () {
      let response = {
        'version': '0.0.1',
        'tags': [{
          'uuid': '84ab500420319d',
          'tag_id': 5976557,
          'auction_id': '297492697822162468',
          'nobid': true
        }]
      };
      let bidderRequest;

      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result.length).to.equal(0);
    });
  });
});
