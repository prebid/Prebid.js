import { expect } from 'chai';
import { spec } from 'modules/goldbachBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as bidderFactory from 'src/adapters/bidderFactory.js';
import { auctionManager } from 'src/auctionManager.js';
import { deepClone } from 'src/utils.js';
import { config } from 'src/config.js';

const ENDPOINT = 'https://ib.adnxs.com/ut/v3/prebid';
const PRICING_ENDPOINT = 'https://templates.da-services.ch/01_universal/burda_prebid/1.0/json/sizeCPMMapping.json';

describe('GoldbachXandrAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'goldbach',
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
    let getAdUnitsStub;
    let bidRequests = [
      {
        'bidder': 'goldbach',
        'params': {
          'placementId': '10433394'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'transactionId': '04f2659e-c005-4eb1-a57c-fa93145e3843'
      }
    ];

    beforeEach(function() {
      getAdUnitsStub = sinon.stub(auctionManager, 'getAdUnits').callsFake(function() {
        return [];
      });
    });

    afterEach(function() {
      getAdUnitsStub.restore();
    });

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

      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].private_sizes).to.exist;
      expect(payload.tags[0].private_sizes).to.deep.equal([{width: 300, height: 250}]);
    });

    it('should add publisher_id in request', function() {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '10433394',
            publisherId: '1231234'
          }
        });
      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].publisher_id).to.exist;
      expect(payload.tags[0].publisher_id).to.deep.equal(1231234);
      expect(payload.publisher_id).to.exist;
      expect(payload.publisher_id).to.deep.equal(1231234);
    })

    it('should add source and verison to the tag', function () {
      const request = spec.buildRequests(bidRequests)[1];
      const payload = JSON.parse(request.data);
      expect(payload.sdk).to.exist;
      expect(payload.sdk).to.deep.equal({
        source: 'pbjs',
        version: '$prebid.version$'
      });
    });

    it('should populate the ad_types array on all requests', function () {
      let adUnits = [{
        code: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        bids: [{
          bidder: 'goldbach',
          params: {
            placementId: '10433394'
          }
        }],
        transactionId: '04f2659e-c005-4eb1-a57c-fa93145e3843'
      }];

      ['banner', 'video', 'native'].forEach(type => {
        getAdUnitsStub.callsFake(function(...args) {
          return adUnits;
        });

        const bidRequest = Object.assign({}, bidRequests[0]);
        bidRequest.mediaTypes = {};
        bidRequest.mediaTypes[type] = {};

        const request = spec.buildRequests([bidRequest])[1];
        const payload = JSON.parse(request.data);

        expect(payload.tags[0].ad_types).to.deep.equal([type]);

        if (type === 'banner') {
          delete adUnits[0].mediaTypes;
        }
      });
    });

    it('should not populate the ad_types array when adUnit.mediaTypes is undefined', function() {
      const bidRequest = Object.assign({}, bidRequests[0]);
      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].ad_types).to.not.exist;
    });

    it('should populate the ad_types array on outstream requests', function () {
      const bidRequest = Object.assign({}, bidRequests[0]);
      bidRequest.mediaTypes = {};
      bidRequest.mediaTypes.video = {context: 'outstream'};

      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].ad_types).to.deep.equal(['video']);
      expect(payload.tags[0].hb_source).to.deep.equal(1);
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests)[1];
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.equal(PRICING_ENDPOINT);
      expect(request.method).to.equal('GET');
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

      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);
      expect(payload.tags[0].video).to.deep.equal({
        id: 123,
        minduration: 100
      });
      expect(payload.tags[0].hb_source).to.deep.equal(1);
    });

    it('should include ORTB video values when video params were not set', function() {
      let bidRequest = deepClone(bidRequests[0]);
      bidRequest.params = {
        placementId: '1234235',
        video: {
          skippable: true,
          playback_method: ['auto_play_sound_off', 'auto_play_sound_unknown'],
          context: 'outstream'
        }
      };
      bidRequest.mediaTypes = {
        video: {
          playerSize: [640, 480],
          context: 'outstream',
          mimes: ['video/mp4'],
          skip: 0,
          minduration: 5,
          api: [1, 5, 6],
          playbackmethod: [2, 4]
        }
      };

      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].video).to.deep.equal({
        minduration: 5,
        playback_method: 2,
        skippable: true,
        context: 4
      });
      expect(payload.tags[0].video_frameworks).to.deep.equal([1, 4])
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
          url: 'https://test.renderer.url',
          render: function () {}
        }
      });

      let bidRequest2 = deepClone(bidRequests[0]);
      bidRequest2.adUnitCode = 'adUnit_code_2';
      bidRequest2 = Object.assign({}, bidRequest2, videoData);

      const request = spec.buildRequests([bidRequest1, bidRequest2])[1];
      const payload = JSON.parse(request.data);
      expect(payload.tags[0].video).to.deep.equal({
        skippable: true,
        playback_method: 2,
        custom_renderer_present: true
      });
      expect(payload.tags[1].video).to.deep.equal({
        skippable: true,
        playback_method: 2
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
              segments: [123, { id: 987, value: 876 }],
              foobar: 'invalid'
            }
          }
        }
      );

      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);

      expect(payload.user).to.exist;
      expect(payload.user).to.deep.equal({
        external_uid: '123',
        segments: [{id: 123}, {id: 987, value: 876}]
      });
    });

    it('should attach reserve param when either bid param or getFloor function exists', function () {
      let getFloorResponse = { currency: 'USD', floor: 3 };
      let request, payload = null;
      let bidRequest = deepClone(bidRequests[0]);

      // 1 -> reserve not defined, getFloor not defined > empty
      request = spec.buildRequests([bidRequest])[1];
      payload = JSON.parse(request.data);

      expect(payload.tags[0].reserve).to.not.exist;

      // 2 -> reserve is defined, getFloor not defined > reserve is used
      bidRequest.params = {
        'placementId': '10433394',
        'reserve': 0.5
      };
      request = spec.buildRequests([bidRequest])[1];
      payload = JSON.parse(request.data);

      expect(payload.tags[0].reserve).to.exist.and.to.equal(0.5);

      // 3 -> reserve is defined, getFloor is defined > getFloor is used
      bidRequest.getFloor = () => getFloorResponse;

      request = spec.buildRequests([bidRequest])[1];
      payload = JSON.parse(request.data);

      expect(payload.tags[0].reserve).to.exist.and.to.equal(3);
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

      const request = spec.buildRequests([bidRequest])[1];
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

      const request = spec.buildRequests([bidRequest])[1];
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
      const request = spec.buildRequests([bidRequest])[1];
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

      const request = spec.buildRequests([bidRequest])[1];
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

      const request = spec.buildRequests([bidRequest])[1];
      const payload1 = JSON.parse(request[0].data);
      const payload2 = JSON.parse(request[1].data);
      const payload3 = JSON.parse(request[2].data);

      expect(payload1.tags.length).to.equal(15);
      expect(payload2.tags.length).to.equal(15);
      expect(payload3.tags.length).to.equal(15);
    });

    // it('should contain hb_source value for adpod', function() {
    //   let bidRequest = Object.assign({},
    //     bidRequests[0],
    //     {
    //       params: { placementId: '14542875' }
    //     },
    //     {
    //       mediaTypes: {
    //         video: {
    //           context: 'adpod',
    //           playerSize: [640, 480],
    //           adPodDurationSec: 300,
    //           durationRangeSec: [15, 30],
    //         }
    //       }
    //     }
    //   );
    //   const request = spec.buildRequests([bidRequest])[1];
    //   const payload = JSON.parse(request.data);
    //   expect(payload.tags[0].hb_source).to.deep.equal(7);
    // });

    it('should contain hb_source value for other media', function() {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          mediaType: 'banner',
          params: {
            sizes: [[300, 250], [300, 600]],
            placementId: 13144370
          }
        }
      );
      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);
      expect(payload.tags[0].hb_source).to.deep.equal(1);
    });

    it('adds brand_category_exclusion to request when set', function() {
      let bidRequest = Object.assign({}, bidRequests[0]);
      sinon
        .stub(config, 'getConfig')
        .withArgs('adpod.brandCategoryExclusion')
        .returns(true);

      const request = spec.buildRequests([bidRequest])[1];
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

      const request = spec.buildRequests([bidRequest])[1];
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
      expect(payload.tags[0].hb_source).to.equal(1);
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

      let request = spec.buildRequests([bidRequest])[1];
      let payload = JSON.parse(request.data);
      expect(payload.tags[0].sizes).to.deep.equal([{width: 150, height: 100}, {width: 300, height: 250}]);

      delete bidRequest.sizes;

      request = spec.buildRequests([bidRequest])[1];
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

      const request = spec.buildRequests([bidRequest])[1];
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

      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].use_pmt_rule).to.equal(true);
    });

    it('should add gpid to the request', function () {
      let testGpid = '/12345/my-gpt-tag-0';
      let bidRequest = deepClone(bidRequests[0]);
      bidRequest.ortb2Imp = { ext: { data: { pbadslot: testGpid } } };

      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].gpid).to.exist.and.equal(testGpid)
    });

    it('should add gdpr consent information to the request', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let bidderRequest = {
        'bidderCode': 'goldbach',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true,
          addtlConsent: '1~7.12.35.62.66.70.89.93.108'
        }
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest)[1];
      expect(request.options).to.deep.equal({withCredentials: true});
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_consent).to.exist;
      expect(payload.gdpr_consent.consent_string).to.exist.and.to.equal(consentString);
      expect(payload.gdpr_consent.consent_required).to.exist.and.to.be.true;
      expect(payload.gdpr_consent.addtl_consent).to.exist.and.to.deep.equal([7, 12, 35, 62, 66, 70, 89, 93, 108]);
    });

    it('should add us privacy string to payload', function() {
      let consentString = '1YA-';
      let bidderRequest = {
        'bidderCode': 'goldbach',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'uspConsent': consentString
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest)[1];
      const payload = JSON.parse(request.data);

      expect(payload.us_privacy).to.exist;
      expect(payload.us_privacy).to.exist.and.to.equal(consentString);
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
      const request = spec.buildRequests([appRequest])[1];
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
          referer: 'https://example.com/page.html',
          reachedTop: true,
          numIframes: 2,
          stack: [
            'https://example.com/page.html',
            'https://example.com/iframe1.html',
            'https://example.com/iframe2.html'
          ]
        }
      }
      const request = spec.buildRequests([bidRequest], bidderRequest)[1];
      const payload = JSON.parse(request.data);

      expect(payload.referrer_detection).to.exist;
      expect(payload.referrer_detection).to.deep.equal({
        rd_ref: 'https%3A%2F%2Fexample.com%2Fpage.html',
        rd_top: true,
        rd_ifs: 2,
        rd_stk: bidderRequest.refererInfo.stack.map((url) => encodeURIComponent(url)).join(',')
      });
    });

    it('should populate schain if available', function () {
      const bidRequest = Object.assign({}, bidRequests[0], {
        schain: {
          ver: '1.0',
          complete: 1,
          nodes: [
            {
              'asi': 'blob.com',
              'sid': '001',
              'hp': 1
            }
          ]
        }
      });

      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);
      expect(payload.schain).to.deep.equal({
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            'asi': 'blob.com',
            'sid': '001',
            'hp': 1
          }
        ]
      });
    });

    it('should populate coppa if set in config', function () {
      let bidRequest = Object.assign({}, bidRequests[0]);
      sinon.stub(config, 'getConfig')
        .withArgs('coppa')
        .returns(true);

      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);

      expect(payload.user.coppa).to.equal(true);

      config.getConfig.restore();
    });

    it('should set the X-Is-Test customHeader if test flag is enabled', function () {
      let bidRequest = Object.assign({}, bidRequests[0]);
      sinon.stub(config, 'getConfig')
        .withArgs('apn_test')
        .returns(true);

      const request = spec.buildRequests([bidRequest])[1];
      expect(request.options.customHeaders).to.deep.equal({'X-Is-Test': 1});

      config.getConfig.restore();
    });

    it('should always set withCredentials: true on the request.options', function () {
      let bidRequest = Object.assign({}, bidRequests[0]);
      const request = spec.buildRequests([bidRequest])[1];
      expect(request.options.withCredentials).to.equal(true);
    });

    it('should set simple domain variant if purpose 1 consent is not given', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let bidderRequest = {
        'bidderCode': 'goldbach',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true,
          apiVersion: 2,
          vendorData: {
            purpose: {
              consents: {
                1: false
              }
            }
          }
        }
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest)[1];
      expect(request.url).to.equal('https://ib.adnxs-simple.com/ut/v3/prebid');
    });

    it('should populate eids when supported userIds are available', function () {
      const bidRequest = Object.assign({}, bidRequests[0], {
        userId: {
          tdid: 'sample-userid',
          uid2: { id: 'sample-uid2-value' },
          criteoId: 'sample-criteo-userid',
          netId: 'sample-netId-userid',
          idl_env: 'sample-idl-userid',
          flocId: {
            id: 'sample-flocid-value',
            version: 'chrome.1.0'
          }
        }
      });

      const request = spec.buildRequests([bidRequest])[1];
      const payload = JSON.parse(request.data);
      expect(payload.eids).to.deep.include({
        source: 'adserver.org',
        id: 'sample-userid',
        rti_partner: 'TDID'
      });

      expect(payload.eids).to.deep.include({
        source: 'criteo.com',
        id: 'sample-criteo-userid',
      });

      expect(payload.eids).to.deep.include({
        source: 'chrome.com',
        id: 'sample-flocid-value'
      });

      expect(payload.eids).to.deep.include({
        source: 'netid.de',
        id: 'sample-netId-userid',
      });

      expect(payload.eids).to.deep.include({
        source: 'liveramp.com',
        id: 'sample-idl-userid'
      });

      expect(payload.eids).to.deep.include({
        source: 'uidapi.com',
        id: 'sample-uid2-value',
        rti_partner: 'UID2'
      });
    });

    it('should populate iab_support object at the root level if omid support is detected', function () {
      // with bid.params.frameworks
      let bidRequest_A = Object.assign({}, bidRequests[0], {
        params: {
          frameworks: [1, 2, 5, 6],
          video: {
            frameworks: [1, 2, 5, 6]
          }
        }
      });
      let request = spec.buildRequests([bidRequest_A])[1];
      let payload = JSON.parse(request.data);
      expect(payload.iab_support).to.be.an('object');
      expect(payload.iab_support).to.deep.equal({
        omidpn: 'Appnexus',
        omidpv: '$prebid.version$'
      });
      expect(payload.tags[0].banner_frameworks).to.be.an('array');
      expect(payload.tags[0].banner_frameworks).to.deep.equal([1, 2, 5, 6]);
      expect(payload.tags[0].video_frameworks).to.be.an('array');
      expect(payload.tags[0].video_frameworks).to.deep.equal([1, 2, 5, 6]);
      expect(payload.tags[0].video.frameworks).to.not.exist;

      // without bid.params.frameworks
      const bidRequest_B = Object.assign({}, bidRequests[0]);
      request = spec.buildRequests([bidRequest_B])[1];
      payload = JSON.parse(request.data);
      expect(payload.iab_support).to.not.exist;
      expect(payload.tags[0].banner_frameworks).to.not.exist;
      expect(payload.tags[0].video_frameworks).to.not.exist;

      // with video.frameworks but it is not an array
      const bidRequest_C = Object.assign({}, bidRequests[0], {
        params: {
          video: {
            frameworks: "'1', '2', '3', '6'"
          }
        }
      });
      request = spec.buildRequests([bidRequest_C])[1];
      payload = JSON.parse(request.data);
      expect(payload.iab_support).to.not.exist;
      expect(payload.tags[0].banner_frameworks).to.not.exist;
      expect(payload.tags[0].video_frameworks).to.not.exist;
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
          'no_ad_url': 'https://lax1-ib.adnxs.com/no-ad',
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
                'config': '<script type=\'text/javascript\' async=\'true\' src=\'https://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=https%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttps253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'
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
                      'https://lax1-ib.adnxs.com/impression'
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

    it('handles outstream video responses', function () {
      let response = {
        'tags': [{
          'uuid': '84ab500420319d',
          'ads': [{
            'ad_type': 'video',
            'cpm': 0.500000,
            'notify_url': 'imptracker.com',
            'rtb': {
              'video': {
                'content': '<!-- VAST Creative -->'
              }
            },
            'javascriptTrackers': '<script type=\'text/javascript\' async=\'true\' src=\'https://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=https%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttps253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'
          }]
        }]
      };
      let bidderRequest = {
        bids: [{
          bidId: '84ab500420319d',
          adUnitCode: 'code',
          mediaTypes: {
            video: {
              context: 'outstream'
            }
          }
        }]
      }

      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result[0]).to.have.property('vastXml');
      expect(result[0]).to.have.property('vastImpUrl');
      expect(result[0]).to.have.property('mediaType', 'video');
    });

    it('handles instream video responses', function () {
      let response = {
        'tags': [{
          'uuid': '84ab500420319d',
          'ads': [{
            'ad_type': 'video',
            'cpm': 0.500000,
            'notify_url': 'imptracker.com',
            'rtb': {
              'video': {
                'asset_url': 'https://sample.vastURL.com/here/vid'
              }
            },
            'javascriptTrackers': '<script type=\'text/javascript\' async=\'true\' src=\'https://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=https%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttps253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'
          }]
        }]
      };
      let bidderRequest = {
        bids: [{
          bidId: '84ab500420319d',
          adUnitCode: 'code',
          mediaTypes: {
            video: {
              context: 'instream'
            }
          }
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
                'asset_url': 'https://sample.vastURL.com/here/adpod',
                'duration_ms': 30000,
              }
            },
            'viewability': {
              'config': '<script type=\'text/javascript\' async=\'true\' src=\'https://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=https%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttps253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'
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
      expect(result[0]).to.have.property('vastUrl');
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
          'url': 'https://cdn.adnxs.com/icon.png'
        },
        'main_img': {
          'width': 2352,
          'height': 1516,
          'url': 'https://cdn.adnxs.com/img.png'
        },
        'link': {
          'url': 'https://www.appnexus.com',
          'fallback_url': '',
          'click_trackers': ['https://nym1-ib.adnxs.com/click']
        },
        'impression_trackers': ['https://example.com'],
        'rating': '5',
        'displayurl': 'https://AppNexus.com/?url=display_url',
        'likes': '38908320',
        'downloads': '874983',
        'price': '9.99',
        'saleprice': 'FREE',
        'phone': '1234567890',
        'address': '28 W 23rd St, New York, NY 10010',
        'privacy_link': 'https://appnexus.com/?url=privacy_url',
        'javascriptTrackers': '<script type=\'text/javascript\' async=\'true\' src=\'https://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=;css_selector=.pb-click;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=https%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttps253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'
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
      expect(result[0].native.image.url).to.equal('https://cdn.adnxs.com/img.png');
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
          },
          mediaTypes: {
            video: {
              context: 'outstream'
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
      responseWithDeal.tags[0].ads[0].ad_type = 'video';
      responseWithDeal.tags[0].ads[0].deal_priority = 5;
      responseWithDeal.tags[0].ads[0].deal_code = '123';
      responseWithDeal.tags[0].ads[0].rtb.video = {
        duration_ms: 1500,
        player_width: 640,
        player_height: 340,
      };

      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code',
          mediaTypes: {
            video: {
              context: 'adpod'
            }
          }
        }]
      }
      let result = spec.interpretResponse({ body: responseWithDeal }, {bidderRequest});
      expect(Object.keys(result[0].appnexus)).to.include.members(['buyerMemberId', 'dealPriority', 'dealCode']);
      expect(result[0].video.dealTier).to.equal(5);
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
    });

    it('should add advertiserDomains', function() {
      let responseAdvertiserId = deepClone(response);
      responseAdvertiserId.tags[0].ads[0].adomain = ['123'];

      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code'
        }]
      }
      let result = spec.interpretResponse({ body: responseAdvertiserId }, {bidderRequest});
      expect(Object.keys(result[0].meta)).to.include.members(['advertiserDomains']);
      expect(Object.keys(result[0].meta.advertiserDomains)).to.deep.equal([]);
    });
  });
});
