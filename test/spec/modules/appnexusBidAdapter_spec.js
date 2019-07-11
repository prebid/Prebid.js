import { expect } from 'chai';
import { spec } from 'modules/appnexusBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import * as bidderFactory from 'src/adapters/bidderFactory';
import { deepClone } from 'src/utils';
import { config } from 'src/config';

const ENDPOINT = '//ib.adnxs.com/ut/v3/prebid';

describe('AppNexusAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'appnexus',
      'params': {
        'placementId': '10433394'
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

    it('should return true when required params found', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'member': '1234',
        'invCode': 'ABCD'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'appnexus',
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

    it('should parse out private sizes', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '10433394',
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
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should attach valid video params to the tag', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '10433394',
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

    it('should add video property when adUnit includes a renderer', function () {
      const videoData = {
        mediaTypes: {
          video: {
            context: 'outstream',
            mimes: ['video/mp4']
          }
        },
        params: {
          placementId: '10433394',
          video: {
            skippable: true,
            playback_method: ['auto_play_sound_off']
          }
        }
      };

      let bidRequest1 = deepClone(bidRequests[0]);
      bidRequest1 = Object.assign({}, bidRequest1, videoData, {
        renderer: {
          url: 'http://test.renderer.url',
          render: function () {}
        }
      });

      let bidRequest2 = deepClone(bidRequests[0]);
      bidRequest2.adUnitCode = 'adUnit_code_2';
      bidRequest2 = Object.assign({}, bidRequest2, videoData);

      const request = spec.buildRequests([bidRequest1, bidRequest2]);
      const payload = JSON.parse(request.data);
      expect(payload.tags[0].video).to.deep.equal({
        skippable: true,
        playback_method: ['auto_play_sound_off'],
        custom_renderer_present: true
      });
      expect(payload.tags[1].video).to.deep.equal({
        skippable: true,
        playback_method: ['auto_play_sound_off']
      });
    });

    it('should attach valid user params to the tag', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '10433394',
            user: {
              externalUid: '123',
              foobar: 'invalid'
            }
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.user).to.exist;
      expect(payload.user).to.deep.equal({
        externalUid: '123',
      });
    });

    it('should duplicate adpod placements into batches and set correct maxduration', function() {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: { placementId: '14542875' }
        },
        {
          mediaTypes: {
            video: {
              context: 'adpod',
              playerSize: [640, 480],
              adPodDurationSec: 300,
              durationRangeSec: [15, 30],
            }
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload1 = JSON.parse(request[0].data);
      const payload2 = JSON.parse(request[1].data);

      // 300 / 15 = 20 total
      expect(payload1.tags.length).to.equal(15);
      expect(payload2.tags.length).to.equal(5);

      expect(payload1.tags[0]).to.deep.equal(payload1.tags[1]);
      expect(payload1.tags[0].video.maxduration).to.equal(30);

      expect(payload2.tags[0]).to.deep.equal(payload1.tags[1]);
      expect(payload2.tags[0].video.maxduration).to.equal(30);
    });

    it('should round down adpod placements when numbers are uneven', function() {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: { placementId: '14542875' }
        },
        {
          mediaTypes: {
            video: {
              context: 'adpod',
              playerSize: [640, 480],
              adPodDurationSec: 123,
              durationRangeSec: [45],
            }
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      expect(payload.tags.length).to.equal(2);
    });

    it('should duplicate adpod placements when requireExactDuration is set', function() {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: { placementId: '14542875' }
        },
        {
          mediaTypes: {
            video: {
              context: 'adpod',
              playerSize: [640, 480],
              adPodDurationSec: 300,
              durationRangeSec: [15, 30],
              requireExactDuration: true,
            }
          }
        }
      );

      // 20 total placements with 15 max impressions = 2 requests
      const request = spec.buildRequests([bidRequest]);
      expect(request.length).to.equal(2);

      // 20 spread over 2 requests = 15 in first request, 5 in second
      const payload1 = JSON.parse(request[0].data);
      const payload2 = JSON.parse(request[1].data);
      expect(payload1.tags.length).to.equal(15);
      expect(payload2.tags.length).to.equal(5);

      // 10 placements should have max/min at 15
      // 10 placemenst should have max/min at 30
      const payload1tagsWith15 = payload1.tags.filter(tag => tag.video.maxduration === 15);
      const payload1tagsWith30 = payload1.tags.filter(tag => tag.video.maxduration === 30);
      expect(payload1tagsWith15.length).to.equal(10);
      expect(payload1tagsWith30.length).to.equal(5);

      // 5 placemenst with min/max at 30 were in the first request
      // so 5 remaining should be in the second
      const payload2tagsWith30 = payload2.tags.filter(tag => tag.video.maxduration === 30);
      expect(payload2tagsWith30.length).to.equal(5);
    });

    it('should set durations for placements when requireExactDuration is set and numbers are uneven', function() {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: { placementId: '14542875' }
        },
        {
          mediaTypes: {
            video: {
              context: 'adpod',
              playerSize: [640, 480],
              adPodDurationSec: 105,
              durationRangeSec: [15, 30, 60],
              requireExactDuration: true,
            }
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      expect(payload.tags.length).to.equal(7);

      const tagsWith15 = payload.tags.filter(tag => tag.video.maxduration === 15);
      const tagsWith30 = payload.tags.filter(tag => tag.video.maxduration === 30);
      const tagsWith60 = payload.tags.filter(tag => tag.video.maxduration === 60);
      expect(tagsWith15.length).to.equal(3);
      expect(tagsWith30.length).to.equal(3);
      expect(tagsWith60.length).to.equal(1);
    });

    it('should break adpod request into batches', function() {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: { placementId: '14542875' }
        },
        {
          mediaTypes: {
            video: {
              context: 'adpod',
              playerSize: [640, 480],
              adPodDurationSec: 225,
              durationRangeSec: [5],
            }
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload1 = JSON.parse(request[0].data);
      const payload2 = JSON.parse(request[1].data);
      const payload3 = JSON.parse(request[2].data);

      expect(payload1.tags.length).to.equal(15);
      expect(payload2.tags.length).to.equal(15);
      expect(payload3.tags.length).to.equal(15);
    });

    it('adds brand_category_exclusion to request when set', function() {
      let bidRequest = Object.assign({}, bidRequests[0]);
      sinon
        .stub(config, 'getConfig')
        .withArgs('adpod.brandCategoryExclusion')
        .returns(true);

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.brand_category_uniqueness).to.equal(true);

      config.getConfig.restore();
    });

    it('should attach native params to the request', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          mediaType: 'native',
          nativeParams: {
            title: {required: true},
            body: {required: true},
            body2: {required: true},
            image: {required: true, sizes: [100, 100]},
            icon: {required: true},
            cta: {required: false},
            rating: {required: true},
            sponsoredBy: {required: true},
            privacyLink: {required: true},
            displayUrl: {required: true},
            address: {required: true},
            downloads: {required: true},
            likes: {required: true},
            phone: {required: true},
            price: {required: true},
            salePrice: {required: true}
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].native.layouts[0]).to.deep.equal({
        title: {required: true},
        description: {required: true},
        desc2: {required: true},
        main_image: {required: true, sizes: [{ width: 100, height: 100 }]},
        icon: {required: true},
        ctatext: {required: false},
        rating: {required: true},
        sponsored_by: {required: true},
        privacy_link: {required: true},
        displayurl: {required: true},
        address: {required: true},
        downloads: {required: true},
        likes: {required: true},
        phone: {required: true},
        price: {required: true},
        saleprice: {required: true},
        privacy_supported: true
      });
    });

    it('should always populated tags[].sizes with 1,1 for native if otherwise not defined', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          mediaType: 'native',
          nativeParams: {
            image: { required: true }
          }
        }
      );
      bidRequest.sizes = [[150, 100], [300, 250]];

      let request = spec.buildRequests([bidRequest]);
      let payload = JSON.parse(request.data);
      expect(payload.tags[0].sizes).to.deep.equal([{width: 150, height: 100}, {width: 300, height: 250}]);

      delete bidRequest.sizes;

      request = spec.buildRequests([bidRequest]);
      payload = JSON.parse(request.data);

      expect(payload.tags[0].sizes).to.deep.equal([{width: 1, height: 1}]);
    });

    it('should convert keyword params to proper form and attaches to request', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '10433394',
            keywords: {
              single: 'val',
              singleArr: ['val'],
              singleArrNum: [5],
              multiValMixed: ['value1', 2, 'value3'],
              singleValNum: 123,
              emptyStr: '',
              emptyArr: [''],
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
      }, {
        'key': 'emptyStr'
      }, {
        'key': 'emptyArr'
      }]);
    });

    it('should add payment rules to the request', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '10433394',
            usePaymentRule: true
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].use_pmt_rule).to.equal(true);
    });

    it('should add gdpr consent information to the request', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let bidderRequest = {
        'bidderCode': 'appnexus',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true
        }
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_consent).to.exist;
      expect(payload.gdpr_consent.consent_string).to.exist.and.to.equal(consentString);
      expect(payload.gdpr_consent.consent_required).to.exist.and.to.be.true;
    });

    it('supports sending hybrid mobile app parameters', function () {
      let appRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '10433394',
            app: {
              id: 'B1O2W3M4AN.com.prebid.webview',
              geo: {
                lat: 40.0964439,
                lng: -75.3009142
              },
              device_id: {
                idfa: '4D12078D-3246-4DA4-AD5E-7610481E7AE', // Apple advertising identifier
                aaid: '38400000-8cf0-11bd-b23e-10b96e40000d', // Android advertising identifier
                md5udid: '5756ae9022b2ea1e47d84fead75220c8', // MD5 hash of the ANDROID_ID
                sha1udid: '4DFAA92388699AC6539885AEF1719293879985BF', // SHA1 hash of the ANDROID_ID
                windowsadid: '750c6be243f1c4b5c9912b95a5742fc5' // Windows advertising identifier
              }
            }
          }
        }
      );
      const request = spec.buildRequests([appRequest]);
      const payload = JSON.parse(request.data);
      expect(payload.app).to.exist;
      expect(payload.app).to.deep.equal({
        appid: 'B1O2W3M4AN.com.prebid.webview'
      });
      expect(payload.device.device_id).to.exist;
      expect(payload.device.device_id).to.deep.equal({
        aaid: '38400000-8cf0-11bd-b23e-10b96e40000d',
        idfa: '4D12078D-3246-4DA4-AD5E-7610481E7AE',
        md5udid: '5756ae9022b2ea1e47d84fead75220c8',
        sha1udid: '4DFAA92388699AC6539885AEF1719293879985BF',
        windowsadid: '750c6be243f1c4b5c9912b95a5742fc5'
      });
      expect(payload.device.geo).to.exist;
      expect(payload.device.geo).to.deep.equal({
        lat: 40.0964439,
        lng: -75.3009142
      });
    });

    it('should add referer info to payload', function () {
      const bidRequest = Object.assign({}, bidRequests[0])
      const bidderRequest = {
        refererInfo: {
          referer: 'http://example.com/page.html',
          reachedTop: true,
          numIframes: 2,
          stack: [
            'http://example.com/page.html',
            'http://example.com/iframe1.html',
            'http://example.com/iframe2.html'
          ]
        }
      }
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.referrer_detection).to.exist;
      expect(payload.referrer_detection).to.deep.equal({
        rd_ref: 'http%3A%2F%2Fexample.com%2Fpage.html',
        rd_top: true,
        rd_ifs: 2,
        rd_stk: bidderRequest.refererInfo.stack.map((url) => encodeURIComponent(url)).join(',')
      });
    });

    it('should populate tpids array when userId is available', function () {
      const bidRequest = Object.assign({}, bidRequests[0], {
        userId: {
          criteortus: {
            appnexus: {
              userid: 'sample-userid'
            }
          }
        }
      });

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      expect(payload.tpuids).to.deep.equal([{provider: 'criteo', user_id: 'sample-userid'}]);
    });
  })

  describe('interpretResponse', function () {
    let bfStub;
    before(function() {
      bfStub = sinon.stub(bidderFactory, 'getIabSubCategory');
    });

    after(function() {
      bfStub.restore();
    });

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

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          'requestId': '3db3773286ee59',
          'cpm': 0.5,
          'creativeId': 29681110,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<!-- Creative -->',
          'mediaType': 'banner',
          'currency': 'USD',
          'ttl': 300,
          'netRevenue': true,
          'adUnitCode': 'code',
          'appnexus': {
            'buyerMemberId': 958
          }
        }
      ];
      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code'
        }]
      }
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

    it('handles non-banner media responses', function () {
      let response = {
        'tags': [{
          'uuid': '84ab500420319d',
          'ads': [{
            'ad_type': 'video',
            'cpm': 0.500000,
            'notify_url': 'imptracker.com',
            'rtb': {
              'video': {
                'content': '<!-- Creative -->'
              }
            }
          }]
        }]
      };
      let bidderRequest = {
        bids: [{
          bidId: '84ab500420319d',
          adUnitCode: 'code'
        }]
      }

      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result[0]).to.have.property('vastUrl');
      expect(result[0]).to.have.property('vastImpUrl');
      expect(result[0]).to.have.property('mediaType', 'video');
    });

    it('handles adpod responses', function () {
      let response = {
        'tags': [{
          'uuid': '84ab500420319d',
          'ads': [{
            'ad_type': 'video',
            'brand_category_id': 10,
            'cpm': 0.500000,
            'notify_url': 'imptracker.com',
            'rtb': {
              'video': {
                'content': '<!-- Creative -->',
                'duration_ms': 30000,
              }
            }
          }]
        }]
      };

      let bidderRequest = {
        bids: [{
          bidId: '84ab500420319d',
          adUnitCode: 'code',
          mediaTypes: {
            video: {
              context: 'adpod'
            }
          }
        }]
      };
      bfStub.returns('1');

      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result[0].video.context).to.equal('adpod');
      expect(result[0].video.durationSeconds).to.equal(30);
    });

    it('handles native responses', function () {
      let response1 = deepClone(response);
      response1.tags[0].ads[0].ad_type = 'native';
      response1.tags[0].ads[0].rtb.native = {
        'title': 'Native Creative',
        'desc': 'Cool description great stuff',
        'desc2': 'Additional body text',
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
        'rating': '5',
        'displayurl': 'http://AppNexus.com/?url=display_url',
        'likes': '38908320',
        'downloads': '874983',
        'price': '9.99',
        'saleprice': 'FREE',
        'phone': '1234567890',
        'address': '28 W 23rd St, New York, NY 10010',
        'privacy_link': 'http://appnexus.com/?url=privacy_url'
      };
      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code'
        }]
      }

      let result = spec.interpretResponse({ body: response1 }, {bidderRequest});
      expect(result[0].native.title).to.equal('Native Creative');
      expect(result[0].native.body).to.equal('Cool description great stuff');
      expect(result[0].native.cta).to.equal('Do it');
      expect(result[0].native.image.url).to.equal('http://cdn.adnxs.com/img.png');
    });

    it('supports configuring outstream renderers', function () {
      const outstreamResponse = deepClone(response);
      outstreamResponse.tags[0].ads[0].rtb.video = {};
      outstreamResponse.tags[0].ads[0].renderer_url = 'renderer.js';

      const bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          renderer: {
            options: {
              adText: 'configured'
            }
          }
        }]
      };

      const result = spec.interpretResponse({ body: outstreamResponse }, {bidderRequest});
      expect(result[0].renderer.config).to.deep.equal(
        bidderRequest.bids[0].renderer.options
      );
    });

    it('should add deal_priority and deal_code', function() {
      let responseWithDeal = deepClone(response);
      responseWithDeal.tags[0].ads[0].deal_priority = 'high';
      responseWithDeal.tags[0].ads[0].deal_code = '123';

      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code'
        }]
      }
      let result = spec.interpretResponse({ body: responseWithDeal }, {bidderRequest});
      expect(Object.keys(result[0].appnexus)).to.include.members(['buyerMemberId', 'dealPriority', 'dealCode']);
    });

    it('should add advertiser id', function() {
      let responseAdvertiserId = deepClone(response);
      responseAdvertiserId.tags[0].ads[0].advertiser_id = '123';

      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code'
        }]
      }
      let result = spec.interpretResponse({ body: responseAdvertiserId }, {bidderRequest});
      expect(Object.keys(result[0].meta)).to.include.members(['advertiserId']);
    })
  });
});
