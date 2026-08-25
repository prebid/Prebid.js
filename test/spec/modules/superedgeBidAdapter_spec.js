import { expect } from 'chai';
import { spec } from 'modules/superedgeBidAdapter.js';
import * as utils from 'src/utils.js';

describe('superedge Bid Adapter', function () {
  describe('isBidRequestValid', function () {
    it('should return true when sk is provided', function () {
      const valid = spec.isBidRequestValid({
        bidder: 'superedge',
        params: { sk: 'test-sk' }
      });
      expect(valid).to.equal(true);
    });

    it('should return true when sk and publisher are provided', function () {
      const valid = spec.isBidRequestValid({
        bidder: 'superedge',
        params: { sk: 'test-sk', publisher: 'pub-1' }
      });
      expect(valid).to.equal(true);
    });

    it('should return false when sk is missing', function () {
      const valid = spec.isBidRequestValid({
        bidder: 'superedge',
        params: {}
      });
      expect(valid).to.equal(false);
    });

    it('should return false when sk is empty string', function () {
      const valid = spec.isBidRequestValid({
        bidder: 'superedge',
        params: { sk: '' }
      });
      expect(valid).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const validBidRequests = [{
      bidder: 'superedge',
      params: { sk: 'test-sk', publisher: 'pub-1', test: 1 },
      mediaTypes: {
        banner: { sizes: [[300, 250], [320, 50]] }
      },
      adUnitCode: 'test-ad',
      sizes: [[300, 250], [320, 50]],
      bidId: 'bid-001',
      transactionId: 'txn-001',
      userIdAsEids: [{ source: 'test.com', uids: [{ id: 'uid-1' }] }],
      ortb2Imp: {
        ext: {
          gpid: '/test/gpid',
          tid: 'ortb2-tid',
          data: { adserver: { adslot: 'slot-1' } }
        }
      }
    }];

    const bidderRequest = {
      bidderRequestId: 'req-001',
      timeout: 1500,
      refererInfo: {
        domain: 'example.com',
        page: 'https://example.com/page',
        location: 'https://example.com/location',
        ref: 'https://referrer.com'
      },
      ortb2: {
        site: { content: 'test-content', cat: ['IAB-1'] },
        device: {
          ua: 'Mozilla/5.0 TestBrowser',
          language: 'ja'
        }
      },
      gdprConsent: {
        consentString: 'consent-str',
        gdprApplies: true
      }
    };

    it('should build a POST request', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      expect(requests).to.be.an('array').with.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal('https://rtb-us.superedge.co.jp/bid?sk=test-sk');
      expect(requests[0].data).to.be.a('string');
    });

    it('should include banner imp in the payload', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp).to.be.an('array').with.lengthOf(1);
      expect(data.imp[0].banner).to.exist;
      expect(data.imp[0].banner.format).to.exist;
    });

    it('should include gdpr consent in imp ext', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].ext.consent).to.equal('consent-str');
      expect(data.imp[0].ext.gdpr).to.equal(1);
    });

    it('should set gpid from ortb2Imp.ext.gpid', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].ext.gpid).to.equal('/test/gpid');
    });

    it('should set test flag from params.test', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.test).to.equal(1);
    });

    it('should default test to 0 when not set', function () {
      const bids = [{
        ...validBidRequests[0],
        params: { sk: 'test-sk' }
      }];
      const requests = spec.buildRequests(bids, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.test).to.equal(0);
    });

    it('should include eids in ext', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.ext.eids).to.be.an('array');
      expect(data.ext.bidsUserIdAsEids).to.be.an('array');
    });

    it('should include site info in the payload', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.site.name).to.equal('example.com');
      expect(data.site.domain).to.equal('example.com');
      expect(data.site.page).to.equal('https://example.com/page');
      expect(data.site.ref).to.equal('https://referrer.com');
      expect(data.site.publisher.id).to.equal('pub-1');
    });

    it('should include user id from crumbs.pubcid', function () {
      const bids = [{
        ...validBidRequests[0],
        crumbs: { pubcid: 'pubcid-123' }
      }];
      const requests = spec.buildRequests(bids, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.user.id).to.equal('pubcid-123');
    });

    it('should include native imp when mediaTypes.native is configured', function () {
      const nativeBids = [{
        ...validBidRequests[0],
        mediaTypes: {
          native: { title: { required: true }, image: { required: true } }
        },
        nativeOrtbRequest: {
          ver: '1.2',
          assets: [
            { id: 0, required: true, title: { len: 80 } },
            { id: 1, required: true, img: { type: 3, w: 300, h: 250 } }
          ]
        }
      }];
      const requests = spec.buildRequests(nativeBids, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp).to.be.an('array').with.lengthOf(1);
      expect(data.imp[0].native).to.exist;
      expect(data.imp[0].native.ver).to.equal('1.2');
      expect(data.imp[0].native.request).to.be.a('string');
    });

    it('should skip native imp when nativeOrtbRequest has no assets', function () {
      spec.isBidRequestValid(validBidRequests[0]);
      const nativeBids = [{
        ...validBidRequests[0],
        mediaTypes: {
          native: { title: { required: true } }
        },
        nativeOrtbRequest: { ver: '1.2', assets: [] }
      }];
      const requests = spec.buildRequests(nativeBids, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data).to.be.null;
    });

    it('should fall back gpid to params.placementId when ortb2Imp is missing', function () {
      const bids = [{
        ...validBidRequests[0],
        ortb2Imp: undefined,
        params: { sk: 'test-sk', placementId: 'fallback-pid' }
      }];
      const requests = spec.buildRequests(bids, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].ext.gpid).to.equal('fallback-pid');
    });

    it('should include tmax from bidderRequest timeout', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.tmax).to.equal(1500);
    });

    it('should handle missing refererInfo gracefully', function () {
      const req = {
        ...bidderRequest,
        refererInfo: {}
      };
      const requests = spec.buildRequests(validBidRequests, req);
      expect(requests[0]).to.exist;
    });

    it('should build _mediaTypeMap and _impIdToBidId for banner imps', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      expect(requests[0]._mediaTypeMap).to.exist;
      expect(requests[0]._mediaTypeMap['bid-001-banner']).to.equal('banner');
      expect(requests[0]._impIdToBidId).to.exist;
      expect(requests[0]._impIdToBidId['bid-001-banner']).to.equal('bid-001');
    });

    it('should build _mediaTypeMap for native imps', function () {
      const nativeBids = [{
        ...validBidRequests[0],
        mediaTypes: {
          native: { title: { required: true } }
        },
        nativeOrtbRequest: {
          ver: '1.2',
          assets: [{ id: 0, required: true, title: { len: 80 } }]
        }
      }];
      spec.isBidRequestValid(nativeBids[0]);
      const requests = spec.buildRequests(nativeBids, bidderRequest);
      expect(requests[0]._mediaTypeMap).to.exist;
      expect(requests[0]._mediaTypeMap['bid-001-native']).to.equal('native');
    });

    it('should strip _bidId from imp ext before sending', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].ext._bidId).to.be.undefined;
    });

    it('should read banner pos from mediaTypes.banner.pos', function () {
      const bids = [{
        ...validBidRequests[0],
        mediaTypes: {
          banner: { sizes: [[300, 250]], pos: 3 }
        }
      }];
      const requests = spec.buildRequests(bids, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].banner.pos).to.equal(3);
    });

    it('should default banner pos to 1 when not set', function () {
      const requests = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].banner.pos).to.equal(1);
    });

    it('should build both banner and native imps for multi-format units', function () {
      const multiBids = [{
        ...validBidRequests[0],
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          native: { title: { required: true } }
        },
        nativeOrtbRequest: {
          ver: '1.2',
          assets: [{ id: 0, required: true, title: { len: 80 } }]
        }
      }];
      spec.isBidRequestValid(multiBids[0]);
      const requests = spec.buildRequests(multiBids, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp).to.be.an('array').with.lengthOf(2);
      const bannerImp = data.imp.find(i => i.banner);
      const nativeImp = data.imp.find(i => i.native);
      expect(bannerImp).to.exist;
      expect(nativeImp).to.exist;
      // Both should map back to the same bidId
      expect(requests[0]._impIdToBidId[bannerImp.id]).to.equal('bid-001');
      expect(requests[0]._impIdToBidId[nativeImp.id]).to.equal('bid-001');
    });

    it('should split requests by sk and region', function () {
      const bids = [
        {
          ...validBidRequests[0],
          bidId: 'bid-us',
          params: { sk: 'sk-us', region: 'US' }
        },
        {
          ...validBidRequests[0],
          bidId: 'bid-eu',
          params: { sk: 'sk-eu', region: 'EU' }
        },
        {
          ...validBidRequests[0],
          bidId: 'bid-us-2',
          params: { sk: 'sk-us', region: 'US' }
        }
      ];
      const requests = spec.buildRequests(bids, bidderRequest);
      // Two unique (sk, region) pairs => two requests
      expect(requests).to.be.an('array').with.lengthOf(2);

      // US request should have sk-us and rtb-us host
      const usReq = requests.find(r => r.url.includes('sk=sk-us'));
      expect(usReq).to.exist;
      expect(usReq.url).to.include('rtb-us.superedge.co.jp');
      const usData = JSON.parse(usReq.data);
      expect(usData.imp).to.have.lengthOf(2);  // 2 bids in US group, 1 banner imp each

      // EU request should have sk-eu and rtb-eu host
      const euReq = requests.find(r => r.url.includes('sk=sk-eu'));
      expect(euReq).to.exist;
      expect(euReq.url).to.include('rtb-eu.superedge.co.jp');
    });

    it('should route EU region to rtb-eu host', function () {
      const bids = [{
        ...validBidRequests[0],
        params: { sk: 'sk-1', region: 'EU' }
      }];
      const requests = spec.buildRequests(bids, bidderRequest);
      expect(requests[0].url).to.include('rtb-eu.superedge.co.jp');
    });

    it('should route APAC region to rtb-sg host', function () {
      const bids = [{
        ...validBidRequests[0],
        params: { sk: 'sk-1', region: 'APAC' }
      }];
      const requests = spec.buildRequests(bids, bidderRequest);
      expect(requests[0].url).to.include('rtb-sg.superedge.co.jp');
    });

    it('should set gdpr to 0 when gdprApplies is false', function () {
      const req = {
        ...bidderRequest,
        gdprConsent: {
          consentString: 'consent-str',
          gdprApplies: false
        }
      };
      const requests = spec.buildRequests(validBidRequests, req);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].ext.gdpr).to.equal(0);
    });

    it('should fall back to 0x0 when sizes array is empty', function () {
      const bids = [{
        ...validBidRequests[0],
        sizes: [],
        mediaTypes: {
          banner: { sizes: [] }
        }
      }];
      const requests = spec.buildRequests(bids, bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].banner.h).to.equal(0);
      expect(data.imp[0].banner.w).to.equal(0);
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        id: 'response-001',
        cur: 'USD',
        seatbid: [{
          bid: [{
            id: 'bid-1',
            impid: 'bid-001',
            price: 2.5,
            w: 300,
            h: 250,
            crid: 'creative-001',
            adm: '<div>ad</div>',
            nurl: 'https://trace.example.com/win'
          }, {
            id: 'bid-2',
            impid: '',  // missing impid, should be filtered out
            price: 1.0
          }]
        }]
      }
    };

    it('should parse bids from server response', function () {
      const bids = spec.interpretResponse(serverResponse);
      expect(bids).to.be.an('array').with.lengthOf(1);
      const bid = bids[0];
      expect(bid.requestId).to.equal('bid-001');
      expect(bid.cpm).to.equal(2.5);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('creative-001');
      expect(bid.currency).to.equal('USD');
      expect(bid.ad).to.equal('<div>ad</div>');
      expect(bid.nurl).to.equal('https://trace.example.com/win');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(500);
    });

    it('should filter out bids without impid', function () {
      const bids = spec.interpretResponse(serverResponse);
      // bid-2 has empty impid and should be excluded
      expect(bids).to.have.lengthOf(1);
    });

    it('should handle multiple seatbid entries', function () {
      const response = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{ id: 'b1', impid: 'imp-1', price: 1.0 }]
          }, {
            cur: 'EUR',
            bid: [{ id: 'b2', impid: 'imp-2', price: 2.0 }]
          }]
        }
      };
      const bids = spec.interpretResponse(response);
      expect(bids).to.have.lengthOf(2);
      expect(bids[0].currency).to.equal('USD');
      expect(bids[1].currency).to.equal('EUR');
    });

    it('should handle empty seatbid', function () {
      const response = { body: { seatbid: [] } };
      const bids = spec.interpretResponse(response);
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should handle missing body', function () {
      const bids = spec.interpretResponse({});
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should handle price of 0 correctly', function () {
      const response = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{ id: 'b1', impid: 'imp-1', price: 0 }]
          }]
        }
      };
      const bids = spec.interpretResponse(response);
      expect(bids[0].cpm).to.equal(0);
    });

    it('should set mediaType to BANNER and include meta.advertiserDomains', function () {
      const bids = spec.interpretResponse(serverResponse);
      const bid = bids[0];
      expect(bid.mediaType).to.equal('banner');
      expect(bid.meta).to.deep.equal({ advertiserDomains: [] });
      expect(bid.ad).to.equal('<div>ad</div>');
    });

    it('should parse native bid with valid JSON adm', function () {
      const nativeAdm = JSON.stringify({
        native: {
          assets: [
            { id: 0, title: { text: 'Ad Title' } },
            { id: 1, img: { url: 'https://example.com/img.png', w: 300, h: 250 } }
          ],
          link: { url: 'https://example.com' }
        }
      });
      const response = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'native-bid',
              impid: 'imp-native',
              price: 1.5,
              crid: 'native-creative',
              adm: nativeAdm,
              nurl: 'https://trace.example.com/win',
              adomain: ['advertiser.com']
            }]
          }]
        }
      };
      const bidRequest = {
        _mediaTypeMap: { 'imp-native': 'native' },
        _impIdToBidId: { 'imp-native': 'original-bid-id' }
      };
      const bids = spec.interpretResponse(response, bidRequest);
      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];
      expect(bid.requestId).to.equal('original-bid-id');
      expect(bid.mediaType).to.equal('native');
      expect(bid.native).to.exist;
      expect(bid.native.ortb).to.exist;
      expect(bid.native.ortb.assets).to.be.an('array').with.lengthOf(2);
      expect(bid.width).to.equal(1);
      expect(bid.height).to.equal(1);
      expect(bid.ad).to.be.undefined;
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('should fall back requestId to impid when not in impIdToBidId', function () {
      const bids = spec.interpretResponse(serverResponse);
      expect(bids[0].requestId).to.equal('bid-001');
    });

    it('should skip native bid with invalid JSON adm', function () {
      const response = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'bad-native',
              impid: 'imp-bad',
              price: 2.0,
              adm: 'not-valid-json'
            }]
          }]
        }
      };
      const bidRequest = {
        _mediaTypeMap: { 'imp-bad': 'native' },
        _impIdToBidId: { 'imp-bad': 'bad-bid-id' }
      };
      const bids = spec.interpretResponse(response, bidRequest);
      expect(bids).to.be.empty;
    });

    it('should default to BANNER when impid is not in mediaTypeMap', function () {
      const response = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{ id: 'b1', impid: 'unknown', price: 1.0, w: 320, h: 50, adm: '<banner/>' }]
          }]
        }
      };
      const bids = spec.interpretResponse(response);
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[0].ad).to.equal('<banner/>');
      expect(bids[0].width).to.equal(320);
      expect(bids[0].height).to.equal(50);
    });
  });

  describe('onBidWon', function () {
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'triggerPixel');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should call triggerPixel when nurl exists', function () {
      spec.onBidWon({ nurl: 'https://trace.example.com/win?id=123' });
      expect(utils.triggerPixel.calledOnce).to.be.true;
      expect(utils.triggerPixel.calledWith('https://trace.example.com/win?id=123')).to.be.true;
    });

    it('should not call triggerPixel when nurl is missing', function () {
      spec.onBidWon({});
      expect(utils.triggerPixel.called).to.be.false;
    });
  });
});
