// jshint esversion: 6, es3: false, node: true
import {assert, expect} from 'chai';
import * as url from 'src/url';
import {spec} from 'modules/adformOpenRTBBidAdapter';
import { NATIVE } from 'src/mediaTypes';

describe('AdformOpenRTB adapter', function () {
  let serverResponse, bidRequest, bidResponses;
  let bids = [];

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'adformOpenRTB',
      'params': {
        'mid': '19910113'
      }
    };

    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params are missing', function () {
      bid.params = { adxDomain: 'adx.adform.net' };
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    it('should send request with correct structure', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: {
          siteId: 'siteId',
          adxDomain: '10.8.57.207'
        }
      }];
      let request = spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } });

      assert.equal(request.method, 'POST');
      assert.equal(request.url, '//10.8.57.207/adx/openrtb');
      assert.deepEqual(request.options, {contentType: 'application/json'});
      assert.ok(request.data);
    });

    describe('gdpr', function () {
      it('should send GDPR Consent data to adform if gdprApplies', function () {
        let validBidRequests = [{ bidId: 'bidId', params: { siteId: 'siteId', test: 1 } }];
        let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { referer: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user.ext.consent, bidderRequest.gdprConsent.consentString);
        assert.equal(request.regs.ext.gdpr, bidderRequest.gdprConsent.gdprApplies);
        assert.equal(typeof request.regs.ext.gdpr, 'number');
      });

      it('should send gdpr as number', function () {
        let validBidRequests = [{ bidId: 'bidId', params: { siteId: 'siteId', test: 1 } }];
        let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { referer: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(typeof request.regs.ext.gdpr, 'number');
      });

      it('should not send GDPR Consent data to adform if gdprApplies is false or undefined', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { siteId: 'siteId' }
        }];
        let bidderRequest = {gdprConsent: {gdprApplies: false, consentString: 'consentDataString'}, refererInfo: { referer: 'page' }};
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user, undefined);
        assert.equal(request.regs, undefined);
      });
      it('should send default GDPR Consent data to adform', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { siteId: 'siteId' }
        }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);

        assert.equal(request.user, undefined);
        assert.equal(request.regs, undefined);
      });
    });

    it('should add test and is_debug to request, if test is set in parameters', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: { siteId: 'siteId', test: 1 }
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);

      assert.ok(request.is_debug);
      assert.equal(request.test, 1);
    });

    it('should have default request structure', function () {
      let keys = 'site,device,source,ext,imp'.split(',');
      let validBidRequests = [{
        bidId: 'bidId',
        params: { siteId: 'siteId' }
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);
      let data = Object.keys(request);

      assert.deepEqual(keys, data);
    });

    it('should set request keys correct values', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: { siteId: 'siteId' },
        transactionId: 'transactionId'
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);

      assert.equal(request.source.tid, validBidRequests[0].transactionId);
      assert.equal(request.source.fd, 1);
    });

    it('should send info about device', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: { siteId: 'siteId' }
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);

      assert.equal(request.device.ua, navigator.userAgent);
    });
    it('should send info about the site', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: { siteId: 'siteId', publisher: {id: '123123', domain: 'publisher.domain.com', name: 'publisher\'s name'} }
      }];
      let refererInfo = { referer: 'page' };
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo }).data);

      assert.deepEqual(request.site, {
        page: refererInfo.referer,
        publisher: validBidRequests[0].params.publisher,
        id: validBidRequests[0].params.siteId
      });
    });

    describe('priceType', function () {
      it('should send default priceType', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { siteId: 'siteId' }
        }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);

        assert.equal(request.ext.pt, 'net');
      });
      it('should send correct priceType value', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { siteId: 'siteId', priceType: 'net' }
        }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);

        assert.equal(request.ext.pt, 'net');
      });
    });

    describe('bids', function () {
      it('should add more than one bid to the request', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { siteId: 'siteId' }
        }, {
          bidId: 'bidId2',
          params: { siteId: 'siteId' }
        }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);

        assert.equal(request.imp.length, 2);
      });
      it('should add incrementing values of id', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { siteId: 'siteId' }
        }, {
          bidId: 'bidId2',
          params: { siteId: 'siteId' }
        }, {
          bidId: 'bidId3',
          params: { siteId: 'siteId' }
        }];
        let imps = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data).imp;

        for (let i = 0; i < 3; i++) {
          assert.equal(imps[i].id, i + 1);
        }
      });

      it('should add mid', function () {
        let validBidRequests = [{ bidId: 'bidId', params: { siteId: 'siteId', mid: 1000 } },
          { bidId: 'bidId2', params: { siteId: 'siteId', mid: 1001 } },
          { bidId: 'bidId3', params: { siteId: 'siteId', mid: 1002 } }];
        let imps = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data).imp;
        for (let i = 0; i < 3; i++) {
          assert.equal(imps[i].tagid, validBidRequests[i].params.mid);
        }
      });

      describe('native', function () {
        describe('assets', function () {
          it('should set correct asset id', function () {
            let validBidRequests = [{
              bidId: 'bidId',
              params: { siteId: 'siteId', mid: 1000 },
              nativeParams: {
                title: { required: true, len: 140 },
                image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
                body: { len: 140 }
              }
            }];
            let assets = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data).imp[0].native.request.assets;

            assert.equal(assets[0].id, 0);
            assert.equal(assets[1].id, 3);
            assert.equal(assets[2].id, 4);
          });
          it('should add required key if it is necessary', function () {
            let validBidRequests = [{
              bidId: 'bidId',
              params: { siteId: 'siteId', mid: 1000 },
              nativeParams: {
                title: { required: true, len: 140 },
                image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
                body: { len: 140 },
                sponsoredBy: { required: true, len: 140 }
              }
            }];

            let assets = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data).imp[0].native.request.assets;

            assert.equal(assets[0].required, 1);
            assert.ok(!assets[1].required);
            assert.ok(!assets[2].required);
            assert.equal(assets[3].required, 1);
          });

          it('should map img and data assets', function () {
            let validBidRequests = [{
              bidId: 'bidId',
              params: { siteId: 'siteId', mid: 1000 },
              nativeParams: {
                title: { required: true, len: 140 },
                image: { required: true, sizes: [150, 50] },
                icon: { required: false, sizes: [50, 50] },
                body: { required: false, len: 140 },
                sponsoredBy: { required: true },
                cta: { required: false },
                clickUrl: { required: false }
              }
            }];

            let assets = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data).imp[0].native.request.assets;
            assert.ok(assets[0].title);
            assert.equal(assets[0].title.len, 140);
            assert.deepEqual(assets[1].img, { type: 3, wmin: 150, hmin: 50 });
            assert.deepEqual(assets[2].img, { type: 1, wmin: 50, hmin: 50 });
            assert.deepEqual(assets[3].data, { type: 2, len: 140 });
            assert.deepEqual(assets[4].data, { type: 1 });
            assert.deepEqual(assets[5].data, { type: 12 });
            assert.ok(!assets[6]);
          });
        });
      });
    });
  });

  describe('interpretResponse', function () {
    it('should return if no body in response', function () {
      let serverResponse = {};
      let bidRequest = {};

      assert.ok(!spec.interpretResponse(serverResponse, bidRequest));
    });
    it('should return more than one bids', function () {
      let serverResponse = {
        body: {
          seatbid: [{
            bid: [{impid: 'impid1', native: {ver: '1.1', link: { url: 'link' }, assets: [{id: 1, title: {text: 'Asset title text'}}]}}]
          }, {
            bid: [{impid: 'impid2', native: {ver: '1.1', link: { url: 'link' }, assets: [{id: 1, data: {value: 'Asset title text'}}]}}]
          }]
        }
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: { siteId: 'siteId', mid: 1000 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
              body: { len: 140 }
            }
          },
          {
            bidId: 'bidId2',
            params: { siteId: 'siteId', mid: 1000 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
              body: { len: 140 }
            }
          }
        ]
      };

      bids = spec.interpretResponse(serverResponse, bidRequest);
      assert.equal(spec.interpretResponse(serverResponse, bidRequest).length, 2);
    });
    it('should set correct values to bid', function () {
      let serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{
            bid: [
              {
                impid: 'impid1',
                price: 93.1231,
                crid: '12312312',
                native: {
                  assets: [],
                  link: { url: 'link' },
                  imptrackers: ['imptrackers url1', 'imptrackers url2']
                }
              }
            ]
          }],
          cur: 'NOK'
        }
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: { siteId: 'siteId', mid: 1000 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
              body: { len: 140 }
            }
          }
        ]
      };

      const bids = spec.interpretResponse(serverResponse, bidRequest);
      const bid = serverResponse.body.seatbid[0].bid[0];
      assert.deepEqual(bids[0].requestId, bidRequest.bids[0].bidId);
      assert.deepEqual(bids[0].cpm, bid.price);
      assert.deepEqual(bids[0].creativeId, bid.crid);
      assert.deepEqual(bids[0].ttl, 360);
      assert.deepEqual(bids[0].netRevenue, false);
      assert.deepEqual(bids[0].currency, serverResponse.body.cur);
      assert.deepEqual(bids[0].mediaType, 'native');
      assert.deepEqual(bids[0].bidderCode, 'adformOpenRTB');
    });
    it('should set correct native params', function () {
      const bid = [
        {
          impid: 'impid1',
          price: 93.1231,
          crid: '12312312',
          native: {
            assets: [
              {
                data: null,
                id: 0,
                img: null,
                required: 0,
                title: {text: 'title', len: null},
                video: null
              }, {
                data: null,
                id: 2,
                img: {type: null, url: 'test.url.com/Files/58345/308185.jpg?bv=1', w: 30, h: 10},
                required: 0,
                title: null,
                video: null
              }, {
                data: null,
                id: 3,
                img: {type: null, url: 'test.url.com/Files/58345/308200.jpg?bv=1', w: 100, h: 100},
                required: 0,
                title: null,
                video: null
              }, {
                data: {type: null, len: null, value: 'body'},
                id: 4,
                img: null,
                required: 0,
                title: null,
                video: null
              }, {
                data: {type: null, len: null, value: 'cta'},
                id: 1,
                img: null,
                required: 0,
                title: null,
                video: null
              }, {
                data: {type: null, len: null, value: 'sponsoredBy'},
                id: 5,
                img: null,
                required: 0,
                title: null,
                video: null
              }
            ],
            link: { url: 'clickUrl', clicktrackers: ['clickTracker1', 'clickTracker2'] },
            imptrackers: ['imptrackers url1', 'imptrackers url2'],
            jstracker: 'jstracker'
          }
        }
      ];
      const serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{ bid }],
          cur: 'NOK'
        }
      };
      let bidRequest = {
        data: {},
        bids: [{ bidId: 'bidId1' }]
      };

      const result = spec.interpretResponse(serverResponse, bidRequest)[0].native;
      const native = bid[0].native;
      const assets = native.assets;
      assert.deepEqual({
        clickUrl: native.link.url,
        clickTrackers: native.link.clicktrackers,
        impressionTrackers: native.imptrackers,
        javascriptTrackers: [ native.jstracker ],
        title: assets[0].title.text,
        icon: {url: assets[1].img.url, width: assets[1].img.w, height: assets[1].img.h},
        image: {url: assets[2].img.url, width: assets[2].img.w, height: assets[2].img.h},
        body: assets[3].data.value,
        cta: assets[4].data.value,
        sponsoredBy: assets[5].data.value
      }, result);
    });
    it('should return empty when there is no bids in response', function () {
      const serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{ bid: [] }],
          cur: 'NOK'
        }
      };
      let bidRequest = {
        data: {},
        bids: [{ bidId: 'bidId1' }]
      };
      const result = spec.interpretResponse(serverResponse, bidRequest)[0];
      assert.ok(!result);
    });
  });
});
