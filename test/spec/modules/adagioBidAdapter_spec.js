import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory';
import { spec } from 'modules/adagioBidAdapter';

describe('adagioAdapter', () => {
  const adapter = newBidder(spec);
  const ENDPOINT = 'https://mp.4dex.io/prebid';
  const VERSION = '1.4.0';

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let sandbox;
    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      let element = {
        x: 0,
        y: 0,
        width: 200,
        height: 300,
        getBoundingClientRect: () => {
          return {
            width: element.width,
            height: element.height,
            left: element.x,
            top: element.y,
            right: element.x + element.width,
            bottom: element.y + element.height
          };
        }
      };
      sandbox.stub(document, 'getElementById').withArgs('banner-atf').returns(element);
    });

    afterEach(function () {
      sandbox.restore();
    });
    let bid = {
      'bidder': 'adagio',
      'params': {
        organizationId: '0',
        placement: 'PAVE_ATF',
        site: 'SITE-NAME',
        pagetype: 'ARTICLE',
        adUnitElementId: 'banner-atf'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': 'c180kg4267tyqz',
      'bidderRequestId': '8vfscuixrovn8i',
      'auctionId': 'lel4fhp239i9km',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when organization params is not passed', () => {
      let bidTest = Object.assign({}, bid);
      delete bidTest.params.organizationId;
      expect(spec.isBidRequestValid(bidTest)).to.equal(false);
    });

    it('should return false when site params is not passed', () => {
      let bidTest = Object.assign({}, bid);
      delete bidTest.params.site;
      expect(spec.isBidRequestValid(bidTest)).to.equal(false);
    });

    it('should return false when placement params is not passed', () => {
      let bidTest = Object.assign({}, bid);
      delete bidTest.params.placement;
      expect(spec.isBidRequestValid(bidTest)).to.equal(false);
    });

    it('should return false when adUnit element id params is not passed', () => {
      let bidTest = Object.assign({}, bid);
      delete bidTest.params.adUnitElementId;
      expect(spec.isBidRequestValid(bidTest)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let sandbox;
    let sdbxStuGetComputedStyle;

    top.ADAGIO = top.ADAGIO || {};
    top.ADAGIO.adUnits = top.ADAGIO.adUnits || {};
    top.ADAGIO.pbjsAdUnits = top.ADAGIO.pbjsAdUnits || [];

    beforeEach(function () {
      sandbox = sinon.sandbox.create();

      let element = {
        x: 0,
        y: 0,
        width: 200,
        height: 300,
        getBoundingClientRect: () => {
          return {
            width: element.width,
            height: element.height,
            left: element.x,
            top: element.y,
            right: element.x + element.width,
            bottom: element.y + element.height
          };
        },
      };

      let element2 = {
        x: 0,
        y: 0,
        width: 200,
        height: 300,
        getBoundingClientRect: () => {
          return {
            width: element2.width,
            height: element2.height,
            left: element2.x,
            top: element2.y,
            right: element2.x + element2.width,
            bottom: element2.y + element2.height
          };
        },
      };

      let cptedStyleBlock = {
        display: 'block'
      };

      const sdbxStub = sandbox.stub(document, 'getElementById');
      sdbxStuGetComputedStyle = sandbox.stub(window, 'getComputedStyle');
      sdbxStub.withArgs('banner-atf-123').returns(element);
      sdbxStub.withArgs('banner-atf-456').returns(element2);
      sdbxStuGetComputedStyle.returns(cptedStyleBlock);
    });

    afterEach(function () {
      // delete window.top._ADAGIO;
      sandbox.restore();
    });

    let bidRequests = [
      // organization 123
      {
        'bidder': 'adagio',
        'params': {
          organizationId: '123',
          site: 'ADAGIO-123',
          placement: 'PAVE_ATF-123',
          pagetype: 'ARTICLE',
          adUnitElementId: 'banner-atf-123'
        },
        'adUnitCode': 'adunit-code1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'c180kg4267tyqz',
        'bidderRequestId': '8vfscuixrovn8i',
        'auctionId': 'lel4fhp239i9km',
      },
      {
        'bidder': 'adagio',
        'params': {
          organizationId: '123',
          site: 'ADAGIO-123',
          placement: 'PAVE_ATF-123',
          pagetype: 'ARTICLE',
          adUnitElementId: 'banner-atf-123'
        },
        'adUnitCode': 'adunit-code2',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'c180kg4267tyqz',
        'bidderRequestId': '8vfscuixrovn8i',
        'auctionId': 'lel4fhp239i9km',
      },
      // siteId 456
      {
        'bidder': 'adagio',
        'params': {
          organizationId: '456',
          site: 'ADAGIO-456',
          placement: 'PAVE_ATF-456',
          pagetype: 'ARTICLE',
          adUnitElementId: 'banner-atf-456'
        },
        'adUnitCode': 'adunit-code3',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'c180kg4267tyqz',
        'bidderRequestId': '8vfscuixrovn8i',
        'auctionId': 'lel4fhp239i9km',
      }
    ];

    const bidRequestsWithPostBid = [
      {
        'bidder': 'adagio',
        'params': {
          organizationId: '456',
          site: 'ADAGIO-456',
          placement: 'PAVE_ATF-456',
          pagetype: 'ARTICLE',
          adUnitElementId: 'banner-atf-456',
          postBid: true
        },
        'adUnitCode': 'adunit-code3',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'c180kg4267tyqz',
        'bidderRequestId': '8vfscuixrovn8i',
        'auctionId': 'lel4fhp239i9km',
      }
    ];

    let consentString = 'theConsentString';
    let bidderRequest = {
      'bidderCode': 'adagio',
      'auctionId': '12jejebn',
      'bidderRequestId': 'hehehehbeheh',
      'timeout': 3000,
      'gdprConsent': {
        consentString: consentString,
        gdprApplies: true,
        allowAuctionWithoutConsent: true
      }
    };

    it('groups requests by siteId', () => {
      const requests = spec.buildRequests(bidRequests);
      expect(requests).to.have.lengthOf(2);

      expect(requests[0].data.organizationId).to.equal('123');
      expect(requests[0].data.adUnits).to.have.lengthOf(2);

      expect(requests[1].data.organizationId).to.equal('456');
      expect(requests[1].data.adUnits).to.have.lengthOf(1);
    });

    it('sends bid request to ENDPOINT_PB via POST', () => {
      const requests = spec.buildRequests(bidRequests);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
    });

    // it('features params must be an empty object if featurejs is not loaded', () => {
    //   const requests = spec.buildRequests(bidRequests);
    //   expect(requests).to.have.lengthOf(2);
    //   const request = requests[0];
    //   const expected = {};
    //   expect(request.data.adUnits[0].features).to.deep.equal(expected);
    // });

    it('features params must be an object if featurejs is loaded', () => {
      let requests = spec.buildRequests(bidRequests);
      let request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
    });

    it('outerAdUnitElementId must be added when PostBid param has been set', () => {
      top.ADAGIO = top.ADAGIO || {};
      top.ADAGIO.pbjsAdUnits = [];

      top.ADAGIO.pbjsAdUnits.push({
        code: bidRequestsWithPostBid[0].adUnitCode,
        sizes: bidRequestsWithPostBid[0].sizes,
        bids: [{
          bidder: bidRequestsWithPostBid[0].bidder,
          params: bidRequestsWithPostBid[0].params
        }]
      });
      let requests = spec.buildRequests(bidRequestsWithPostBid);
      let request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].params.outerAdUnitElementId).to.exist;
    });

    it('generates a pageviewId if missing', () => {
      window.top.ADAGIO = window.top.ADAGIO || {};
      delete window.top.ADAGIO.pageviewId;

      const requests = spec.buildRequests(bidRequests);
      expect(requests).to.have.lengthOf(2);

      expect(requests[0].data.pageviewId).to.exist.and.to.not.equal('_').and.to.not.equal('');
      expect(requests[0].data.pageviewId).to.equal(requests[1].data.pageviewId);
    });

    it('uses an existing pageviewId if present', () => {
      window.top.ADAGIO = window.top.ADAGIO || {};
      window.top.ADAGIO.pageviewId = 'abc';

      const requests = spec.buildRequests(bidRequests);
      expect(requests).to.have.lengthOf(2);

      expect(requests[0].data.pageviewId).to.equal('abc');
      expect(requests[1].data.pageviewId).to.equal('abc');
    });

    it('GDPR consent is applied', () => {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr.consentString).to.exist.and.to.equal(consentString);
      expect(request.data.gdpr.consentRequired).to.exist.and.to.equal(1);
    });

    it('GDPR consent is not applied', () => {
      bidderRequest.gdprConsent.gdprApplies = false;
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr.consentString).to.exist.and.to.equal(consentString);
      expect(request.data.gdpr.consentRequired).to.exist.and.to.equal(0);
    });

    it('GDPR consent is undefined', () => {
      delete bidderRequest.gdprConsent.consentString;
      delete bidderRequest.gdprConsent.gdprApplies;
      delete bidderRequest.gdprConsent.allowAuctionWithoutConsent;
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr).to.not.have.property('consentString');
      expect(request.data.gdpr).to.not.have.property('gdprApplies');
      expect(request.data.gdpr).to.not.have.property('allowAuctionWithoutConsent');
    });

    it('GDPR consent bidderRequest does not have gdprConsent', () => {
      delete bidderRequest.gdprConsent;
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr).to.be.empty;
    });

    it('should expose version in window', () => {
      expect(window.top.ADAGIO).ok;
      expect(window.top.ADAGIO.versions).ok;
      expect(window.top.ADAGIO.versions.adagioBidderAdapter).to.eq(VERSION);
    });
  });

  describe('interpretResponse', () => {
    let serverResponse = {
      body: {
        data: {
          pred: 1
        },
        bids: [
          {
            ad: '<div style="background-color:red; height:250px; width:300px"></div>',
            cpm: 1,
            creativeId: 'creativeId',
            currency: 'EUR',
            height: 250,
            netRevenue: true,
            requestId: 'c180kg4267tyqz',
            ttl: 360,
            width: 300
          }
        ]
      }
    };

    let emptyBodyServerResponse = {
      body: null
    };

    let withoutBidsArrayServerResponse = {
      body: {
        bids: []
      }
    };

    let bidRequest = {
      'data': {
        'adUnits': [
          {
            'bidder': 'adagio',
            'params': {
              organizationId: '456',
              site: 'ADAGIO-456',
              placement: 'PAVE_ATF-456',
              adUnitElementId: 'banner-atf-456',
              pagetype: 'ARTICLE',
              category: 'NEWS',
              subcategory: 'SPORT',
              environment: 'SITE-MOBILE'
            },
            'adUnitCode': 'adunit-code',
            'sizes': [[300, 250], [300, 600]],
            'bidId': 'c180kg4267tyqz',
            'bidderRequestId': '8vfscuixrovn8i',
            'auctionId': 'lel4fhp239i9km',
            'pageviewId': 'd8c4fl2k39i0wn',
          }
        ]
      }
    };

    beforeEach(function () {
      // delete (window.top.ADAGIO);
    });

    it('Should returns empty response if body is empty', () => {
      expect(spec.interpretResponse(emptyBodyServerResponse, bidRequest)).to.be.an('array').length(0);
      expect(spec.interpretResponse({body: {}}, bidRequest)).to.be.an('array').length(0);
    });

    it('Should returns empty response if bids array is empty', () => {
      expect(spec.interpretResponse({withoutBidsArrayServerResponse}, bidRequest)).to.be.an('array').length(0);
    });

    it('should get correct bid response', () => {
      let expectedResponse = [{
        ad: '<div style="background-color:red; height:250px; width:300px"></div>',
        cpm: 1,
        creativeId: 'creativeId',
        currency: 'EUR',
        height: 250,
        netRevenue: true,
        requestId: 'c180kg4267tyqz',
        ttl: 360,
        width: 300,
        placement: 'PAVE_ATF-456',
        site: 'ADAGIO-456',
        pagetype: 'ARTICLE',
        category: 'NEWS',
        subcategory: 'SPORT',
        environment: 'SITE-MOBILE'
      }];
      expect(spec.interpretResponse(serverResponse, bidRequest)).to.be.an('array');
      expect(spec.interpretResponse(serverResponse, bidRequest)).to.deep.equal(expectedResponse);
    });

    it('Should populate ADAGIO queue with ssp-data', () => {
      spec.interpretResponse(serverResponse, bidRequest);
      expect(window.top.ADAGIO).ok;
      expect(window.top.ADAGIO.queue).to.be.an('array');
      expect(window.top.ADAGIO.queue).not.empty;
    });
  });

  describe('getUserSyncs', () => {
    const syncOptions = {
      'iframeEnabled': 'true'
    }
    const serverResponses = [
      {
        body: {
          userSyncs: [
            {
              t: 'i',
              u: 'https://test.url.com/setuid'
            },
            {
              t: 'p',
              u: 'https://test.url.com/setuid'
            }
          ]
        }
      }
    ];

    const emptyServerResponses = [
      {
        body: ''
      }
    ];

    it('should handle correctly user syncs', () => {
      let result = spec.getUserSyncs(syncOptions, serverResponses);
      let emptyResult = spec.getUserSyncs(syncOptions, emptyServerResponses);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).contain('setuid');
      expect(result[1].type).to.equal('image');
      expect(emptyResult).to.equal(false);
    });
  });
});
