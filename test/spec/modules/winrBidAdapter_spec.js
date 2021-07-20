import { expect } from 'chai';
import { spec, storage } from 'modules/winrBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as bidderFactory from 'src/adapters/bidderFactory.js';
import { auctionManager } from 'src/auctionManager.js';
import { deepClone } from 'src/utils.js';
import { config } from 'src/config.js';

const GATE_COOKIE_NAME = 'wnr_gate';
const ENDPOINT = 'https://ib.adnxs.com/ut/v3/prebid';

function getMediaTypeFromBid(bid) {
  return bid.mediaTypes && Object.keys(bid.mediaTypes)[0];
}

describe('WinrAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let getCookieStub;
    let cookiesAreEnabledStub;

    beforeEach(function() {
      getCookieStub = sinon.stub(storage, 'getCookie');
      cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
    });

    afterEach(function() {
      getCookieStub.restore();
      cookiesAreEnabledStub.restore();
    });

    let placementId = '21543013';
    let bid = {
      'bidder': 'winr',
      'params': {
        'placementId': placementId,
        'domParent': '.blog-post',
        'child': 4
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[1, 1]],
      'bidId': '2b21e2d141e6d4',
      'bidderRequestId': '1dfdc89563b81a',
      'auctionId': '0bc27fb0-ea39-4a5a-b1ba-5d83a5f28a69',
      'mediaTypes': {
        'banner': {}
      },
    };

    describe('- with cookies disabled', function () {
      beforeEach(function() {
        cookiesAreEnabledStub.returns(false);
      });

      it('should return false', function () {
        expect(storage.cookiesAreEnabled()).to.equal(false);
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });

    describe('- with gate cookie set', function () {
      beforeEach(function() {
        getCookieStub.withArgs(GATE_COOKIE_NAME).returns('true');
      });

      it('should return false', function () {
        expect(storage.getCookie(GATE_COOKIE_NAME)).to.not.equal(null);
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });

    describe('- with cookies enabled and gate cookie not set', function () {
      beforeEach(function() {
        cookiesAreEnabledStub.returns(true);
        getCookieStub.withArgs(GATE_COOKIE_NAME).returns(null);
      });

      it('should return true when required params found', function () {
        expect(storage.cookiesAreEnabled()).to.equal(true);
        expect(storage.getCookie(GATE_COOKIE_NAME)).to.equal(null);
        expect(getMediaTypeFromBid(bid)).to.equal('banner');
        expect(bid).to.have.deep.nested.property('params.placementId');
        expect(bid.params.placementId).to.equal(placementId);
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });

    it('should return false when mediaType is not banner', function () {
      let bid = Object.assign({}, bid);
      delete bid.mediaTypes;
      bid.mediaTypes = {
        'video': {}
      };
      expect(getMediaTypeFromBid(bid)).to.not.equal('banner');
      expect(spec.isBidRequestValid(bid)).to.equal(false);
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
        'bidder': 'winr',
        'params': {
          'placementId': '21543013'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[1, 1]],
        'bidId': '2b21e2d141e6d4',
        'bidderRequestId': '1dfdc89563b81a',
        'auctionId': '0bc27fb0-ea39-4a5a-b1ba-5d83a5f28a69',
        'transactionId': '270e4b6e-0acc-41c4-b253-b935f966fa7d'
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
            placementId: '21543013',
            privateSizes: [1, 1]
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].private_sizes).to.exist;
      expect(payload.tags[0].private_sizes).to.deep.equal([{width: 1, height: 1}]);
    });

    it('should add publisher_id in request', function() {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '21543013',
            publisherId: '1231234'
          }
        });
      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].publisher_id).to.exist;
      expect(payload.tags[0].publisher_id).to.deep.equal(1231234);
      expect(payload.publisher_id).to.exist;
      expect(payload.publisher_id).to.deep.equal(1231234);
    })

    it('should add source and version to the tag', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.sdk).to.exist;
      expect(payload.sdk).to.deep.equal({
        source: 'pbjs',
        version: '$prebid.version$'
      });
    });

    it('should not populate the ad_types array when adUnit.mediaTypes is undefined', function() {
      const bidRequest = Object.assign({}, bidRequests[0]);
      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].ad_types).to.not.exist;
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should attach valid user params to the tag', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '21543013',
            user: {
              externalUid: '123',
              // dnt: false,
              segments: [123, { id: 987, value: 876 }],
              foobar: 'invalid'
            }
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.user).to.exist;
      expect(payload.user).to.deep.equal({
        external_uid: '123',
        // dnt: false
        segments: [{id: 123}, {id: 987, value: 876}]
      });
    });

    it('should attach reserve param when either bid param or getFloor function exists', function () {
      let getFloorResponse = { currency: 'USD', floor: 3 };
      let request, payload = null;
      let bidRequest = deepClone(bidRequests[0]);

      // 1 -> reserve not defined, getFloor not defined > empty
      request = spec.buildRequests([bidRequest]);
      payload = JSON.parse(request.data);

      expect(payload.tags[0].reserve).to.not.exist;

      // 2 -> reserve is defined, getFloor not defined > reserve is used
      bidRequest.params = {
        'placementId': '21543013',
        'reserve': 0.5
      };
      request = spec.buildRequests([bidRequest]);
      payload = JSON.parse(request.data);

      expect(payload.tags[0].reserve).to.exist.and.to.equal(0.5);

      // 3 -> reserve is defined, getFloor is defined > getFloor is used
      bidRequest.getFloor = () => getFloorResponse;

      request = spec.buildRequests([bidRequest]);
      payload = JSON.parse(request.data);

      expect(payload.tags[0].reserve).to.exist.and.to.equal(3);
    });

    it('should contain hb_source value for other media', function() {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          mediaType: 'banner',
          params: {
            sizes: [[1, 1]],
            placementId: 13144370
          }
        }
      );
      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      expect(payload.tags[0].hb_source).to.deep.equal(1);
    });

    it('should convert keyword params to proper form and attaches to request', function () {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '21543013',
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
            placementId: '21543013',
            usePaymentRule: true
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].use_pmt_rule).to.equal(true);
    });

    it('should add gpid to the request', function () {
      let testGpid = '/12345/my-gpt-tag-0';
      let bidRequest = deepClone(bidRequests[0]);
      bidRequest.ortb2Imp = { ext: { data: { pbadslot: testGpid } } };

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].gpid).to.exist.and.equal(testGpid)
    });

    it('should add gdpr consent information to the request', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let bidderRequest = {
        'bidderCode': 'winr',
        'auctionId': '0bc27fb0-ea39-4a5a-b1ba-5d83a5f28a69',
        'bidderRequestId': '1dfdc89563b81a',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true
        }
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.options).to.deep.equal({withCredentials: true});
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_consent).to.exist;
      expect(payload.gdpr_consent.consent_string).to.exist.and.to.equal(consentString);
      expect(payload.gdpr_consent.consent_required).to.exist.and.to.be.true;
    });

    it('should add us privacy string to payload', function() {
      let consentString = '1YA-';
      let bidderRequest = {
        'bidderCode': 'winr',
        'auctionId': '0bc27fb0-ea39-4a5a-b1ba-5d83a5f28a69',
        'bidderRequestId': '1dfdc89563b81a',
        'timeout': 3000,
        'uspConsent': consentString
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.us_privacy).to.exist;
      expect(payload.us_privacy).to.exist.and.to.equal(consentString);
    });

    it('supports sending hybrid mobile app parameters', function () {
      let appRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '21543013',
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
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.referrer_detection).to.exist;
      expect(payload.referrer_detection).to.deep.equal({
        rd_ref: 'https%3A%2F%2Fexample.com%2Fpage.html',
        rd_top: true,
        rd_ifs: 2,
        rd_stk: bidderRequest.refererInfo.stack.map((url) => encodeURIComponent(url)).join(',')
      });
    });

    it('should populate member if available', function () {
      const bidRequest = Object.assign({}, bidRequests[0], {
        params: {
          member: '11626'
        }
      });

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      expect(payload.member_id).to.deep.equal(11626);
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

      const request = spec.buildRequests([bidRequest]);
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

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.user.coppa).to.equal(true);

      config.getConfig.restore();
    });

    it('should set the X-Is-Test customHeader if test flag is enabled', function () {
      let bidRequest = Object.assign({}, bidRequests[0]);
      sinon.stub(config, 'getConfig')
        .withArgs('apn_test')
        .returns(true);

      const request = spec.buildRequests([bidRequest]);
      expect(request.options.customHeaders).to.deep.equal({'X-Is-Test': 1});

      config.getConfig.restore();
    });

    it('should always set withCredentials: true on the request.options', function () {
      let bidRequest = Object.assign({}, bidRequests[0]);
      const request = spec.buildRequests([bidRequest]);
      expect(request.options.withCredentials).to.equal(true);
    });

    it('should set simple domain variant if purpose 1 consent is not given', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let bidderRequest = {
        'bidderCode': 'winr',
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

      const request = spec.buildRequests(bidRequests, bidderRequest);
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

      const request = spec.buildRequests([bidRequest]);
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
  });

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
              'advertiserId': 4849978,
              'buyer_member_id': 11626,
              'brand_category_id': 0,
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
                  'width': 1,
                  'height': 1
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
          'adType': 'banner',
          'requestId': '3db3773286ee59',
          'auctionId': '28e94b67-b521-47b1-a284-e3cccc0a2707',
          'cpm': 0.5,
          'creativeId': 29681110,
          'brandCategoryId': 0,
          'dealId': undefined,
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 300,
          'source': 'rtb',
          'mediaSubtypeId': 1,
          'mediaTypeId': 1,
          'adUnitCode': 'code',
          'buyerMemberId': 11626,
          'appnexus': {
            'buyerMemberId': 11626
          },
          'meta': {
            'advertiserId': 4849978,
            'placementId': 10433394,
            'domParent': '.blog-post',
            'child': 4
          },
          'width': 1,
          'height': 1,
          'banner': {
            'content': '<!-- Creative -->',
            'width': 1,
            'height': 1,
            'trackers': [
              {
                'impression_urls': [
                  'https://www.example.com'
                ]
              }
            ]
          },
          'mediaType': 'banner',
          'ad': '<!-- Wrapped Ad -->'
        }
      ];
      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code',
          params: {
            'placementId': 10433394,
            'domParent': '.blog-post',
            'child': 4
          }
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

    it('should add params', function() {
      let responseParams = deepClone(response);
      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code',
          params: {
            'placementId': 10433394,
            'domParent': '.blog-post',
            'child': 4
          }
        }]
      }
      let result = spec.interpretResponse({ body: responseParams }, {bidderRequest});
      expect(Object.keys(result[0].meta)).to.include.members(['placementId', 'domParent', 'child']);
    });
  });
});
