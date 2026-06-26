import { expect } from 'chai';
import { spec, getPageKeywords, parseUserAgent, createRequest, applyPrivacyConsent, GVLID } from 'modules/eightpodBidAdapter';
import 'modules/priceFloors.js';
import { config } from 'src/config.js';
import { newBidder } from 'src/adapters/bidderFactory';
import sinon from 'sinon';

describe('eightpodBidAdapter', function () {
  const adapter = newBidder(spec);
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('registers IAB GVL ID 1497', function () {
      expect(spec.gvlid).to.equal(GVLID);
    });
  });

  describe('isBidRequestValid', function () {
    const bidWithPlacementId = {
      bidder: 'eightpod',
      adUnitCode: '/adunit-code/test-path',
      bidId: 'test-bid-id-1',
      bidderRequestId: 'test-bid-request-1',
      auctionId: 'test-auction-1',
      transactionId: 'test-transactionId-1',
      params: {
        placementId: 'placementId1',
      },
    };
    const bidWithoutParams = {
      bidder: 'eightpod',
      adUnitCode: '/adunit-code/test-path',
      bidId: 'test-bid-id-1',
      bidderRequestId: 'test-bid-request-1',
      auctionId: 'test-auction-1',
      transactionId: 'test-transactionId-1',
    };

    beforeEach(() => {
      config.resetConfig();
    });

    it('should return true when placementId is provided', function () {
      expect(spec.isBidRequestValid(bidWithPlacementId)).to.equal(true);
    });

    it('should return true when placementId is omitted', function () {
      expect(spec.isBidRequestValid(bidWithoutParams)).to.equal(true);
    });

    it('should return false when the bid request is missing', function () {
      expect(spec.isBidRequestValid()).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests, bidderRequest;
    beforeEach(function () {
      bidRequests = [
        {
          bidder: 'eightpod',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [300, 600],
              ],
            },
          },
          adUnitCode: '/adunit-code/test-path',
          bidId: 'test-bid-id-1',
          bidderRequestId: 'test-bid-request-1',
          auctionId: 'test-auction-1',
          transactionId: 'test-transactionId-1',
          params: {
            placementId: 'placementId1',
          }
        }
      ];
      bidderRequest = {
        refererInfo: {},
        ortb2: {
          device: {
            ua: 'ua',
            language: 'en',
            dnt: 1,
            js: 1,
          }
        }
      };
    });

    it('should return an empty array when no bid requests', function () {
      const bidRequest = spec.buildRequests([], bidderRequest);
      expect(bidRequest).to.be.an('array');
      expect(bidRequest.length).to.equal(0);
    });

    it('should return a valid bid request object', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request).to.be.an('array');
      expect(request[0].data).to.be.an('object');
      expect(request[0].method).to.equal('POST');
      expect(request[0]).to.have.property('url');
    });
  });

  describe('getPageKeywords function', function() {
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return the top document keywords if available', function() {
      const keywordsContent = 'keyword1,keyword2,keyword3';
      const fakeTopDocument = {
        querySelector: sandbox.stub()
          .withArgs('meta[name="keywords"]').returns({ content: keywordsContent })
      };
      const fakeTopWindow = { document: fakeTopDocument };

      const result = getPageKeywords({ top: fakeTopWindow });
      expect(result).to.equal(keywordsContent);
    });

    it('should return the current document keywords if top document is not accessible', function() {
      const keywordsContent = 'keyword1,keyword2,keyword3';
      sandbox.stub(document, 'querySelector')
        .withArgs('meta[name="keywords"]').returns({ content: keywordsContent });

      const fakeWindow = {
        get top() {
          throw new Error('Access denied');
        }
      };

      const result = getPageKeywords(fakeWindow);
      expect(result).to.equal(keywordsContent);
    });

    it('should return an empty string if no keywords meta tag is found', function() {
      sandbox.stub(document, 'querySelector').withArgs('meta[name="keywords"]').returns(null);

      const result = getPageKeywords();
      expect(result).to.equal('');
    });
  });

  describe('parseUserAgent function', function() {
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return the platform and version IOS', function() {
      const uaStub = sandbox.stub(window.navigator, 'userAgent');
      uaStub.value('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');

      const result = parseUserAgent();
      expect(result.platform).to.equal('ios');
      expect(result.device).to.equal('iphone');
      expect(result.version).to.equal('16.6');
    });

    it('should return the platform and version android', function() {
      const uaStub = sandbox.stub(window.navigator, 'userAgent');
      uaStub.value('Mozilla/5.0 (Linux; Android 5.0.1; SM-G920V Build/LRX22C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.137 Mobile Safari/537.36');

      const result = parseUserAgent();
      expect(result.platform).to.equal('android');
      expect(result.version).to.equal('5.0');
      expect(result.device).to.equal('');
    });
  });

  describe('interpretResponse', function() {
    let request;

    beforeEach(function() {
      const bidRequests = [
        {
          bidder: 'eightpod',
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          adUnitCode: '/adunit-code/test-path',
          bidId: 'test-bid-id-1',
          bidderRequestId: 'test-bid-request-1',
          auctionId: 'test-auction-1',
          transactionId: 'test-transactionId-1',
          params: { placementId: 'placementId1' },
        }
      ];
      [request] = spec.buildRequests(bidRequests, { refererInfo: {}, ortb2: { device: {} } });
    });

    it('should return the bid response with the tracking tag injected and pricing macros replaced', function() {
      const serverResponse = {
        body: {
          id: 'response-id',
          seatbid: [
            {
              bid: [
                {
                  impid: 'test-bid-id-1',
                  price: 1.23,
                  cid: 'campaign-1',
                  crid: 'creative-1',
                  ext: { foo: 'bar' },
                  adm: '<html><head></head><body>ad</body></html>',
                  nurl: 'https://example.com/nurl?p=${AUCTION_PRICE}',
                  burl: 'https://example.com/burl?p=${AUCTION_PRICE}',
                }
              ]
            }
          ],
          cur: 'USD',
        }
      };

      const responses = spec.interpretResponse(serverResponse, request);

      expect(responses).to.be.an('array').with.length(1);
      const [bid] = responses;
      expect(bid.cid).to.equal('campaign-1');
      expect(bid.crid).to.equal('creative-1');
      expect(bid.ext).to.deep.equal({ foo: 'bar' });
      expect(bid.ad).to.exist;
      expect(bid.burl).to.equal('https://example.com/burl?p=1.23');
    });

    it('should populate meta.advertiserDomains and meta.mediaType from OpenRTB adomain', function() {
      const serverResponse = {
        body: {
          id: 'response-id',
          seatbid: [
            {
              bid: [
                {
                  impid: 'test-bid-id-1',
                  price: 1.23,
                  cid: 'campaign-1',
                  crid: 'creative-1',
                  adm: '<html><head></head><body>ad</body></html>',
                  nurl: 'https://example.com/nurl?p=${AUCTION_PRICE}',
                  burl: 'https://example.com/burl?p=${AUCTION_PRICE}',
                  adomain: ['example.com', 'advertiser.org'],
                }
              ]
            }
          ],
          cur: 'USD',
        }
      };

      const [bid] = spec.interpretResponse(serverResponse, request);

      expect(bid.meta.advertiserDomains).to.deep.equal(['example.com', 'advertiser.org']);
      expect(bid.meta.mediaType).to.equal('banner');
    });

    it('should return an empty array for empty or malformed responses', function() {
      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: null }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: { id: 'no-bid', seatbid: [] } }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({
        body: {
          id: 'response-id',
          seatbid: [{ bid: [{ impid: 'test-bid-id-1', price: 1.23 }] }],
          cur: 'USD',
        }
      }, request)).to.deep.equal([]);
    });
  });

  describe('createRequest function', function() {
    afterEach(function() {
      config.resetConfig();
    });

    it('should create a payload with all required fields from params', function() {
      const bidRequests = [{
        params: {
          placementId: '123',
          publisherId: 'pub-1',
          publishercat: 'IAB1,IAB2',
          sitecat: 'IAB3',
          pagecat: 'IAB4',
          sectioncat: 'IAB5',
          country: 'US',
          language: 'en',
          dealId: 'deal-1',
          userId: 'user-1',
          yob: 1990,
          gender: 'M',
          city: 'New York',
          region: 'NY',
          eightPodVisitorId: 'visitor-1',
          trace: true,
        },
        userId: {}
      }];
      const bidderRequest = {};
      const mediaType = 'banner';

      const [request] = createRequest(bidRequests, bidderRequest, mediaType);

      // All the values in the initValue (public\index.html) should be covered here
      expect(request.data.site.publisher.cat).to.deep.equal(['IAB1', 'IAB2']);
      expect(request.data.site.cat).to.deep.equal(['IAB3']);
      expect(request.data.site.pagecat).to.deep.equal(['IAB4']);
      expect(request.data.site.sectioncat).to.deep.equal(['IAB5']);
      expect(request.data.user.id).to.equal('user-1');
      expect(request.data.user.yob).to.equal(1990);
      expect(request.data.user.gender).to.equal('M');
      expect(request.data.user.geo.city).to.equal('New York');
      expect(request.data.user.geo.region).to.equal('NY');
      expect(request.data.user.geo.country).to.equal('US');
      expect(request.data.user.ext.eightPodVisitorId).to.equal('visitor-1');
      expect(request.data.user.ext.eids).to.deep.include({
        source: '8podx.com',
        uids: [{ id: 'visitor-1', atype: 1 }],
      });
      expect(request.data.ext.adSlotPlacementId).to.equal('123');
      expect(request.data.imp[0].tagid).to.equal('123');
      expect(request.data.site.publisher.id).to.equal('pub-1');
      expect(request.data.device.language).to.equal('en');
      expect(request.data.imp[0].pmp.deals[0].id).to.equal('deal-1');
      if (request.url) {
        expect(request.url).to.include('?trace=true');
      }
    });

    it('preserves ortb2Imp PMP when dealId is omitted', function() {
      const bidRequests = [{
        params: { placementId: '123' },
        userId: {},
        ortb2Imp: {
          pmp: {
            deals: [{ id: 'ortb-deal' }],
            private_auction: 0,
          },
        },
      }];

      const [request] = createRequest(bidRequests, {}, 'banner');

      expect(request.data.imp[0].pmp).to.deep.equal({
        deals: [{ id: 'ortb-deal' }],
        private_auction: 0,
      });
    });

    it('preserves ortb2Imp PMP fields when applying dealId override', function() {
      const bidRequests = [{
        params: {
          placementId: '123',
          dealId: 'param-deal',
        },
        userId: {},
        ortb2Imp: {
          pmp: {
            deals: [{ id: 'ortb-deal' }],
            ext: { 'package': 'sports' },
          },
        },
      }];

      const [request] = createRequest(bidRequests, {}, 'banner');

      expect(request.data.imp[0].pmp).to.deep.equal({
        deals: [{ id: 'param-deal' }],
        ext: { 'package': 'sports' },
        private_auction: 1,
      });
    });

    it('preserves OpenRTB first-party data when legacy override params are omitted', function() {
      const bidRequests = [{
        params: { placementId: '123' },
        userId: {},
      }];
      const bidderRequest = {
        ortb2: {
          device: {
            language: 'en',
            geo: { country: 'USA' },
          },
          site: {
            keywords: 'sports,news',
            publisher: {
              id: 'ortb-pub',
              cat: ['IAB1'],
            },
            cat: ['IAB2'],
            pagecat: ['IAB3'],
            sectioncat: ['IAB4'],
          },
          user: {
            yob: 1985,
            gender: 'F',
            geo: {
              city: 'Sydney',
              region: 'NSW',
              country: 'AUS',
            },
          },
        },
      };

      const [request] = createRequest(bidRequests, bidderRequest, 'banner');

      expect(request.data.device.language).to.equal('en');
      expect(request.data.device.geo.country).to.equal('USA');
      expect(request.data.site.keywords).to.equal('sports,news');
      expect(request.data.site.publisher.id).to.equal('ortb-pub');
      expect(request.data.site.publisher.cat).to.deep.equal(['IAB1']);
      expect(request.data.site.cat).to.deep.equal(['IAB2']);
      expect(request.data.site.pagecat).to.deep.equal(['IAB3']);
      expect(request.data.site.sectioncat).to.deep.equal(['IAB4']);
      expect(request.data.user.yob).to.equal(1985);
      expect(request.data.user.gender).to.equal('F');
      expect(request.data.user.geo.city).to.equal('Sydney');
      expect(request.data.user.geo.region).to.equal('NSW');
      expect(request.data.user.geo.country).to.equal('AUS');
    });

    it('applies legacy params as explicit overrides for OpenRTB first-party data', function() {
      const bidRequests = [{
        params: {
          placementId: '123',
          publisherId: 'param-pub',
          publishercat: 'IAB5',
          sitecat: 'IAB6',
          pagecat: 'IAB7',
          sectioncat: 'IAB8',
          country: 'NZL',
          language: 'mi',
          userId: 'param-user',
          yob: 1991,
          gender: 'O',
          city: 'Auckland',
          region: 'AUK',
        },
        userId: {},
      }];
      const bidderRequest = {
        ortb2: {
          device: {
            language: 'en',
            geo: { country: 'USA' },
          },
          site: {
            publisher: {
              id: 'ortb-pub',
              cat: ['IAB1'],
            },
            cat: ['IAB2'],
            pagecat: ['IAB3'],
            sectioncat: ['IAB4'],
          },
          user: {
            id: 'ortb-user',
            yob: 1985,
            gender: 'F',
            geo: {
              city: 'Sydney',
              region: 'NSW',
              country: 'AUS',
            },
          },
        },
      };

      const [request] = createRequest(bidRequests, bidderRequest, 'banner');

      expect(request.data.device.language).to.equal('mi');
      expect(request.data.device.geo.country).to.equal('NZL');
      expect(request.data.site.publisher.id).to.equal('param-pub');
      expect(request.data.site.publisher.cat).to.deep.equal(['IAB5']);
      expect(request.data.site.cat).to.deep.equal(['IAB6']);
      expect(request.data.site.pagecat).to.deep.equal(['IAB7']);
      expect(request.data.site.sectioncat).to.deep.equal(['IAB8']);
      expect(request.data.user.id).to.equal('param-user');
      expect(request.data.user.yob).to.equal(1991);
      expect(request.data.user.gender).to.equal('O');
      expect(request.data.user.geo.city).to.equal('Auckland');
      expect(request.data.user.geo.region).to.equal('AUK');
      expect(request.data.user.geo.country).to.equal('NZL');
    });

    it('preserves existing eids when adding the EightPod visitor id', function() {
      const bidRequests = [{
        params: {
          placementId: '123',
          eightPodVisitorId: 'visitor-1',
        },
        userId: {},
        ortb2: {
          user: {
            ext: {
              eids: [{
                source: 'sharedid.org',
                uids: [{ id: 'shared-1', atype: 1 }],
              }],
            },
          },
        },
      }];

      const [request] = createRequest(bidRequests, {}, 'banner');

      expect(request.data.user.ext.eids).to.deep.include({
        source: 'sharedid.org',
        uids: [{ id: 'shared-1', atype: 1 }],
      });
      expect(request.data.user.ext.eids).to.deep.include({
        source: '8podx.com',
        uids: [{ id: 'visitor-1', atype: 1 }],
      });
    });

    it('does not map User ID module values to user.id', function() {
      const bidRequests = [{
        params: { placementId: '123' },
        userId: {
          unifiedId: { id: 'unified-1' },
          id5id: { uid: 'id5-1' },
          idl_env: 'idl-1',
        },
        userIdAsEids: [{
          source: 'adserver.org',
          uids: [{ id: 'unified-1', atype: 1 }],
        }],
      }];

      const [request] = createRequest(bidRequests, {}, 'banner');

      expect(request.data.user).not.to.have.property('id');
      expect(request.data.user.ext.eids).to.deep.include({
        source: 'adserver.org',
        uids: [{ id: 'unified-1', atype: 1 }],
      });
    });

    it('preserves UID2 eids emitted by User ID modules', function() {
      const bidRequests = [{
        params: {
          placementId: '123',
          eightPodVisitorId: 'visitor-1',
        },
        userId: {},
        userIdAsEids: [{
          source: 'uidapi.com',
          uids: [{
            id: 'uid2-token-1',
            atype: 3,
            ext: { rtiPartner: 'UID2' },
          }],
        }],
      }];

      const [request] = createRequest(bidRequests, {}, 'banner');

      expect(request.data.user.ext.eids).to.deep.include({
        source: 'uidapi.com',
        uids: [{
          id: 'uid2-token-1',
          atype: 3,
          ext: { rtiPartner: 'UID2' },
        }],
      });
      expect(request.data.user.ext.eids).to.deep.include({
        source: '8podx.com',
        uids: [{ id: 'visitor-1', atype: 1 }],
      });
    });

    it('does not fabricate device type or country defaults', function() {
      const bidRequests = [{
        userId: {},
      }];

      const [request] = createRequest(bidRequests, {}, 'banner');

      expect(request.data.device).not.to.have.property('devicetype');
      expect(request.data.device).not.to.have.nested.property('geo.country');
      expect(request.data.ext).not.to.have.property('adSlotPlacementId');
      expect(request.data.imp[0]).not.to.have.property('tagid');
      expect(request.data.user).not.to.have.property('yob');
      expect(request.data.user).not.to.have.property('gender');
      expect(request.data.user).not.to.have.nested.property('geo.city');
    });

    it('should pass through GDPR, USP, GPP, and COPPA consent without overwriting ortb2 values', function() {
      config.setConfig({ coppa: true });

      const bidRequests = [{
        params: {
          placementId: '123',
          publisherId: 'pub-1',
        },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        bidId: 'test-bid-id-1',
        userId: {},
        ortb2: {
          user: {
            ext: {
              consent: 'pre-existing-consent',
            },
          },
          regs: {
            ext: {
              gdpr: 1,
              us_privacy: '1YNN',
            },
            gpp: 'DBAA',
            gpp_sid: [7],
          },
        },
      }];
      const bidderRequest = {
        gdprConsent: {
          gdprApplies: true,
          consentString: 'CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
        },
        uspConsent: '1YNN',
        gppConsent: {
          gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
          applicableSections: [7, 8],
        },
        ortb2: {
          user: {
            ext: {
              consent: 'pre-existing-consent',
            },
          },
        },
      };

      const [request] = createRequest(bidRequests, bidderRequest, 'banner');

      expect(request.data.user.ext.consent).to.equal('CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.regs.ext.us_privacy).to.equal('1YNN');
      expect(request.data.regs.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(request.data.regs.gpp_sid).to.deep.equal([7, 8]);
      expect(request.data.regs.ext.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(request.data.regs.ext.gpp_sid).to.deep.equal([7, 8]);
      expect(request.data.regs.coppa).to.equal(1);
      expect(request.data.ext.adSlotPlacementId).to.equal('123');
      expect(request.data.imp[0].tagid).to.equal('123');
    });

    it('should preserve ortb2 consent when only bidderRequest.ortb2 is provided', function() {
      const bidRequests = [{
        params: { placementId: '123' },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        bidId: 'test-bid-id-1',
        userId: {},
      }];
      const bidderRequest = {
        ortb2: {
          user: {
            ext: {
              consent: 'ortb2-only-consent',
            },
          },
          regs: {
            ext: {
              gdpr: 1,
              us_privacy: '1YYN',
            },
            gpp: 'DBAA',
            gpp_sid: [6],
            coppa: 1,
          },
        },
      };

      const [request] = createRequest(bidRequests, bidderRequest, 'banner');

      expect(request.data.user.ext.consent).to.equal('ortb2-only-consent');
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.regs.ext.us_privacy).to.equal('1YYN');
      expect(request.data.regs.gpp).to.equal('DBAA');
      expect(request.data.regs.gpp_sid).to.deep.equal([6]);
      expect(request.data.regs.coppa).to.equal(1);
    });
  });

  describe('applyPrivacyConsent function', function() {
    afterEach(function() {
      config.resetConfig();
    });

    it('should set GDPR, USP, GPP, and COPPA fields on the request payload', function() {
      config.setConfig({ coppa: true });

      const data = {};
      applyPrivacyConsent(data, {
        gdprConsent: {
          gdprApplies: false,
          consentString: 'consent-string',
        },
        uspConsent: '1---',
        gppConsent: {
          gppString: 'GPP_STRING',
          applicableSections: [7],
        },
      });

      expect(data.user.ext.consent).to.equal('consent-string');
      expect(data.regs.ext.gdpr).to.equal(0);
      expect(data.regs.ext.us_privacy).to.equal('1---');
      expect(data.regs.gpp).to.equal('GPP_STRING');
      expect(data.regs.gpp_sid).to.deep.equal([7]);
      expect(data.regs.coppa).to.equal(1);
    });
  });
});
