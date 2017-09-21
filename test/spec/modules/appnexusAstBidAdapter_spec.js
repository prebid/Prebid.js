import { expect } from 'chai';
import { spec } from 'modules/appnexusAstBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const ENDPOINT = '//ib.adnxs.com/ut/v3/prebid';

describe('AppNexusAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'appnexusAst',
      'params': {
        'placementId': '10433394'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'member': '1234',
        'invCode': 'ABCD'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [
      {
        'bidder': 'appnexusAst',
        'params': {
          'placementId': '10433394'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('should add source and verison to the tag', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.sdk).to.exist;
      expect(payload.sdk).to.deep.equal({
        source: 'pbjs',
        version: '$prebid.version$'
      });
    });

    it('sends bid request to ENDPOINT via POST', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should attach valid video params to the tag', () => {
      bidRequests[0].params.video = {
        id: 123,
        minduration: 100,
        foobar: 'invalid'
      };

      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.tags[0].video).to.deep.equal({
        id: 123,
        minduration: 100
      });

      delete bidRequests[0].params.video;
    });

    it('should attach valid user params to the tag', () => {
      bidRequests[0].params.user = {
        external_uid: '123',
        foobar: 'invalid'
      };

      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.user).to.exist;
      expect(payload.user).to.deep.equal({
        external_uid: '123',
      });

      delete bidRequests[0].params.user;
    });

    it('should attache native params to the request', () => {
      bidRequests[0].mediaType = 'native';
      bidRequests[0].nativeParams = {
        title: {required: true},
        body: {required: true},
        image: {required: true, sizes: [{ width: 100, height: 100 }] },
        cta: {required: false},
        sponsoredBy: {required: true}
      };

      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].native.layouts[0]).to.deep.equal({
        title: {required: true},
        description: {required: true},
        main_image: {required: true, sizes: [{ width: 100, height: 100 }] },
        ctatext: {required: false},
        sponsored_by: {required: true}
      });

      delete bidRequests[0].mediaType;
      delete bidRequests[0].params.nativeParams;
    });

    it('should set required native asset params when not provided on adunit', () => {
      bidRequests[0].mediaType = 'native';
      bidRequests[0].nativeParams = {
        image: {required: true},
      };

      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].native.layouts[0]).to.deep.equal({
        main_image: {required: true, sizes: [{}] },
      });

      delete bidRequests[0].mediaType;
      delete bidRequests[0].params.nativeParams;
    });

    it('should convert keyword params to proper form and attaches to request', () => {
      bidRequests[0].params.keywords = {
        single: 'val',
        singleArr: ['val'],
        singleArrNum: [5],
        multiValMixed: ['value1', 2, 'value3'],
        singleValNum: 123,
        badValue: {'foo': 'bar'} // should be dropped
      };

      const request = spec.buildRequests(bidRequests);
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

      delete bidRequests[0].params.keywords;
    });
  })

  describe('interpretResponse', () => {
    let response = {
      'version': '3.0.0',
      'tags': [
        {
          'uuid': '3db3773286ee59',
          'tag_id': 10433394,
          'auction_id': '4534722592064951574',
          'nobid': false,
          'no_ad_url': 'http://lax1-ib.adnxs.com/no-ad',
          'timeout_ms': 10000,
          'ad_profile_id': 27079,
          'ads': [
            {
              'content_source': 'rtb',
              'ad_type': 'banner',
              'buyer_member_id': 958,
              'creative_id': 29681110,
              'media_type_id': 1,
              'media_subtype_id': 1,
              'cpm': 0.5,
              'cpm_publisher_currency': 0.5,
              'publisher_currency_code': '$',
              'client_initiated_ad_counting': true,
              'rtb': {
                'banner': {
                  'content': '<!-- Creative -->',
                  'width': 300,
                  'height': 250
                },
                'trackers': [
                  {
                    'impression_urls': [
                      'http://lax1-ib.adnxs.com/impression'
                    ],
                    'video_events': {}
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    it('should get correct bid response', () => {
      let expectedResponse = [
        {
          'requestId': '3db3773286ee59',
          'cpm': 0.5,
          'creative_id': 29681110,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<!-- Creative -->',
          'mediaType': 'banner'
        }
      ];

      let result = spec.interpretResponse(response);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', () => {
      let response = {
        'version': '0.0.1',
        'tags': [{
          'uuid': '84ab500420319d',
          'tag_id': 5976557,
          'auction_id': '297492697822162468',
          'nobid': true
        }]
      };

      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });

    it('handles non-banner media responses', () => {
      // debugger; // eslint-disable-line
      let response = {
        'tags': [{
          'uuid': '84ab500420319d',
          'ads': [{
            'ad_type': 'video',
            'cpm': 0.500000,
            'rtb': {
              'video': {
                'content': '<!-- Creative -->'
              }
            }
          }]
        }]
      };

      let result = spec.interpretResponse(response);
      expect(result[0]).to.have.property('vastUrl');
      expect(result[0]).to.have.property('descriptionUrl');
      expect(result[0]).to.have.property('mediaType', 'video');
    });

    it('handles native responses', () => {
      response.tags[0].ads[0].ad_type = 'native';
      response.tags[0].ads[0].rtb.native = {
        'title': 'Native Creative',
        'desc': 'Cool description great stuff',
        'ctatext': 'Do it',
        'sponsored': 'AppNexus',
        'icon': {
          'width': 0,
          'height': 0,
          'url': 'http://cdn.adnxs.com/icon.png'
        },
        'main_img': {
          'width': 2352,
          'height': 1516,
          'url': 'http://cdn.adnxs.com/img.png'
        },
        'link': {
          'url': 'https://www.appnexus.com',
          'fallback_url': '',
          'click_trackers': ['http://nym1-ib.adnxs.com/click']
        },
        'impression_trackers': ['http://example.com'],
      };

      let result = spec.interpretResponse(response);
      expect(result[0].native.title).to.equal('Native Creative');
      expect(result[0].native.body).to.equal('Cool description great stuff');
      expect(result[0].native.cta).to.equal('Do it');
      expect(result[0].native.image).to.equal('http://cdn.adnxs.com/img.png');

      response.tags[0].ads[0].ad_type = 'banner';
    });
  });
});
