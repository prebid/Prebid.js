import { expect } from 'chai';
import { spec } from 'modules/1ad4goodBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as bidderFactory from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';
import { config } from 'src/config.js';

const ENDPOINT = 'https://hb.1ad4good.org/prebid';

describe('AdforgoodAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': '1ad4good',
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
        'bidder': '1ad4good',
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
      ['banner', 'video'].forEach(type => {
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

    // it('should always populated tags[].sizes with 1,1 for native if otherwise not defined', function () {
    //   let bidRequest = Object.assign({},
    //     bidRequests[0],
    //     {
    //       mediaType: 'native',
    //       nativeParams: {
    //         image: { required: true }
    //       }
    //     }
    //   );
    //   bidRequest.sizes = [[150, 100], [300, 250]];

    //   let request = spec.buildRequests([bidRequest]);
    //   let payload = JSON.parse(request.data);
    //   expect(payload.tags[0].sizes).to.deep.equal([{width: 150, height: 100}, {width: 300, height: 250}]);

    //   delete bidRequest.sizes;

    //   request = spec.buildRequests([bidRequest]);
    //   payload = JSON.parse(request.data);

    //   expect(payload.tags[0].sizes).to.deep.equal([{width: 1, height: 1}]);
    // });

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
        'bidderCode': '1ad4good',
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
              'viewability': {
                'config': '<script type=\'text/javascript\' async=\'true\' src=\'http://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=http%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttp%253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'
              },
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
          'ads4good': {
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
            },
            'javascriptTrackers': '<script type=\'text/javascript\' async=\'true\' src=\'http://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=http%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttp%253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'
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
      expect(Object.keys(result[0].ads4good)).to.include.members(['buyerMemberId', 'dealPriority', 'dealCode']);
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
