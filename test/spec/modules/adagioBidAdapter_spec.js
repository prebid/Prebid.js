import { expect } from 'chai';
import { adagioScriptFromLocalStorageCb, spec } from 'modules/adagioBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

describe('adagioAdapter', () => {
  let utilsMock;
  const adapter = newBidder(spec);
  const ENDPOINT = 'https://mp.4dex.io/prebid';
  const VERSION = '2.2.1';

  beforeEach(function() {
    localStorage.removeItem('adagioScript');
    utilsMock = sinon.mock(utils);
  });

  afterEach(function() {
    utilsMock.restore();
  });

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

    let bidWithMediaTypes = {
      'bidder': 'adagio',
      'params': {
        organizationId: '0',
        placement: 'PAVE_ATF',
        site: 'SITE-NAME',
        pagetype: 'ARTICLE',
        adUnitElementId: 'banner-atf'
      },
      'adUnitCode': 'adunit-code-2',
      'mediaTypes': {
        banner: {
          sizes: [[300, 250]],
        }
      },
      sizes: [[300, 600]],
      'bidId': 'c180kg4267tyqz',
      'bidderRequestId': '8vfscuixrovn8i',
      'auctionId': 'lel4fhp239i9km',
    }

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      expect(window.top.ADAGIO.adUnits['adunit-code'].printNumber).to.equal(1);
    })

    it('should compute a printNumber for the new bid request on same adUnitCode and same pageviewId', () => {
      spec.isBidRequestValid(bid);
      expect(window.top.ADAGIO.adUnits).ok;
      expect(window.top.ADAGIO.adUnits['adunit-code']).ok;
      expect(window.top.ADAGIO.adUnits['adunit-code'].printNumber).to.equal(2);

      spec.isBidRequestValid(bid);
      expect(window.top.ADAGIO.adUnits['adunit-code'].printNumber).to.equal(3);

      window.top.ADAGIO.pageviewId = 123;
      spec.isBidRequestValid(bid);
      expect(window.top.ADAGIO.adUnits['adunit-code'].printNumber).to.equal(1);
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

    it('should return false if not in the window.top', () => {
      sandbox.stub(utils, 'getWindowTop').throws();
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should expose ADAGIO.pbjsAdUnits in window', () => {
      spec.isBidRequestValid(bidWithMediaTypes);
      spec.isBidRequestValid(bid);
      expect(window.top.ADAGIO.pbjsAdUnits).ok;
      expect(window.top.ADAGIO.pbjsAdUnits).to.have.lengthOf(2);
      const adUnitWithMediaTypeSizes = window.top.ADAGIO.pbjsAdUnits.filter((aU) => aU.code === 'adunit-code-2')[0];
      const adUnitWithSizes = window.top.ADAGIO.pbjsAdUnits.filter((aU) => aU.code === 'adunit-code')[0];
      expect(adUnitWithMediaTypeSizes.sizes).to.eql([[300, 250]]);
      expect(adUnitWithSizes.sizes).to.eql([[300, 250], [300, 600]]);
    });
  });

  describe('buildRequests', () => {
    const sandbox = sinon.createSandbox();

    const banner300x250 = {
      x: 0,
      y: 0,
      width: 300,
      height: 250,
      getBoundingClientRect: () => {
        return {
          width: banner300x250.width,
          height: banner300x250.height,
          left: banner300x250.x,
          top: banner300x250.y,
          right: banner300x250.x + banner300x250.width,
          bottom: banner300x250.y + banner300x250.height
        };
      },
    };

    const banner300x600 = {
      x: 0,
      y: 0,
      width: 300,
      height: 600,
      getBoundingClientRect: () => {
        return {
          width: banner300x600.width,
          height: banner300x600.height,
          left: banner300x600.x,
          top: banner300x600.y,
          right: banner300x600.x + banner300x600.width,
          bottom: banner300x600.y + banner300x600.height
        };
      },
    };

    const computedStyleBlock = {
      display: 'block'
    };

    const computedStyleNone = {
      display: 'none'
    };

    const stubs = {
      topGetElementById: undefined,
      topGetComputedStyle: undefined
    }

    top.ADAGIO = top.ADAGIO || {};
    top.ADAGIO.adUnits = top.ADAGIO.adUnits || {};
    top.ADAGIO.pbjsAdUnits = top.ADAGIO.pbjsAdUnits || [];

    beforeEach(function () {
      stubs.topGetElementById = sandbox.stub(top.document, 'getElementById');
      stubs.topGetComputedStyle = sandbox.stub(top, 'getComputedStyle');

      stubs.topGetElementById.withArgs('banner-atf-123').returns(banner300x250);
      stubs.topGetElementById.withArgs('banner-atf-456').returns(banner300x600);
      stubs.topGetElementById.withArgs('does-not-exist').returns(null);
      stubs.topGetComputedStyle.returns(computedStyleBlock);
    });

    afterEach(function () {
      sandbox.restore();
    });

    after(function() {
      sandbox.reset();
    })

    let bidRequests = [
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
        'mediaTypes': {
          banner: {
            sizes: [[300, 250]]
          }
        },
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
        allowAuctionWithoutConsent: true,
        apiVersion: 1,
      },
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'referer': 'http://test.io/index.html?pbjs_debug=true'
      }
    };

    let bidderRequestTCF2 = {
      'bidderCode': 'adagio',
      'auctionId': '12jejebn',
      'bidderRequestId': 'hehehehbeheh',
      'timeout': 3000,
      'gdprConsent': {
        consentString: consentString,
        vendorData: {
          tcString: consentString,
          gdprApplies: true
        },
        gdprApplies: true,
        apiVersion: 2
      },
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'referer': 'http://test.io/index.html?pbjs_debug=true'
      }
    };

    it('groups requests by siteId', () => {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);

      expect(requests[0].data.organizationId).to.equal('123');
      expect(requests[0].data.adUnits).to.have.lengthOf(2);

      expect(requests[1].data.organizationId).to.equal('456');
      expect(requests[1].data.adUnits).to.have.lengthOf(1);
    });

    it('sends bid request to ENDPOINT_PB via POST', () => {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
      expect(request.data.prebidVersion).to.equal('$prebid.version$');
    });

    it('features params "adunit_position" must be empty if adUnitElement is not found in the DOM', () => {
      const requests = spec.buildRequests([Object.assign({}, bidRequests[0], {params: {adUnitElementId: 'does-not-exist'}})], bidderRequest);
      const request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].features.adunit_position).to.deep.equal('');
    });

    it('features params "adunit_position" should be computed even if DOM element is display:none', () => {
      stubs.topGetComputedStyle.returns(computedStyleNone);
      const requests = spec.buildRequests([Object.assign({}, bidRequests[0])], bidderRequest);
      let request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].features.adunit_position).to.equal('0x0');
    });

    it('features params "viewport" should be computed even if window.innerWidth is not supported', () => {
      sandbox.stub(top, 'innerWidth').value(undefined);
      const requests = spec.buildRequests([Object.assign({}, bidRequests[0])], bidderRequest);
      let request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].features.viewport_dimensions).to.match(/^[\d]+x[\d]+$/);
    });

    it('AdUnit requested should have the correct sizes array depending on the config', () => {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[1].data.adUnits[0]).to.have.property('mediaTypes');
    });

    it('features params must be an object if featurejs is loaded', () => {
      let requests = spec.buildRequests(bidRequests, bidderRequest);
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
      let requests = spec.buildRequests(bidRequestsWithPostBid, bidderRequest);
      let request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].params.outerAdUnitElementId).to.exist;
      top.ADAGIO.pbjsAdUnits = undefined;
    });

    it('generates a pageviewId if missing', () => {
      window.top.ADAGIO = window.top.ADAGIO || {};
      delete window.top.ADAGIO.pageviewId;

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);

      expect(requests[0].data.pageviewId).to.exist.and.to.not.equal('_').and.to.not.equal('');
      expect(requests[0].data.pageviewId).to.equal(requests[1].data.pageviewId);
    });

    it('uses an existing pageviewId if present', () => {
      window.top.ADAGIO = window.top.ADAGIO || {};
      window.top.ADAGIO.pageviewId = 'abc';

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);

      expect(requests[0].data.pageviewId).to.equal('abc');
      expect(requests[1].data.pageviewId).to.equal('abc');
    });

    it('should send the printNumber in features object', () => {
      window.top.ADAGIO = window.top.ADAGIO || {};
      window.top.ADAGIO.pageviewId = 'abc';
      window.top.ADAGIO.adUnits['adunit-code1'] = {
        pageviewId: 'abc',
        printNumber: 2
      };
      const requests = spec.buildRequests([bidRequests[0]], bidderRequest);
      const request = requests[0];
      expect(request.data.adUnits[0].features.print_number).to.equal('2');
    });

    it('organizationId param key must be a string', () => {
      const requests = spec.buildRequests([Object.assign({}, bidRequests[0], {params: {organizationId: 1010}})], bidderRequest);
      const request = requests[0];
      expect(request.data.adUnits[0].params).to.exist;
      expect(request.data.adUnits[0].params.organizationId).to.deep.equal('1010');
      expect(request.data.organizationId).to.exist;
      expect(request.data.organizationId).to.deep.equal('1010');
    });

    it('GDPR consent is applied', () => {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr.consentString).to.exist.and.to.equal(consentString);
      expect(request.data.gdpr.consentRequired).to.exist.and.to.equal(1);
      expect(request.data.gdpr.apiVersion).to.exist.and.to.equal(1);
    });

    it('GDPR consent is applied w/ TCF2', () => {
      const requests = spec.buildRequests(bidRequests, bidderRequestTCF2);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr.consentString).to.exist.and.to.equal(consentString);
      expect(request.data.gdpr.consentRequired).to.exist.and.to.equal(1);
      expect(request.data.gdpr.apiVersion).to.exist.and.to.equal(2);
    });

    it('GDPR consent is not applied', () => {
      bidderRequest.gdprConsent.gdprApplies = false;
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr.consentString).to.exist.and.to.equal(consentString);
      expect(request.data.gdpr.consentRequired).to.exist.and.to.equal(0);
      expect(request.data.gdpr.apiVersion).to.exist.and.to.equal(1);
    });

    it('GDPR consent is not applied w/ TCF2', () => {
      bidderRequestTCF2.gdprConsent.gdprApplies = false;
      const requests = spec.buildRequests(bidRequests, bidderRequestTCF2);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr.consentString).to.exist.and.to.equal(consentString);
      expect(request.data.gdpr.consentRequired).to.exist.and.to.equal(0);
      expect(request.data.gdpr.apiVersion).to.exist.and.to.equal(2);
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
      expect(request.data.gdpr.apiVersion).to.exist.and.to.equal(1);
    });

    it('GDPR consent is undefined w/ TCF2', () => {
      delete bidderRequestTCF2.gdprConsent.consentString;
      delete bidderRequestTCF2.gdprConsent.gdprApplies;
      delete bidderRequestTCF2.gdprConsent.vendorData;
      const requests = spec.buildRequests(bidRequests, bidderRequestTCF2);
      expect(requests).to.have.lengthOf(2);
      const request = requests[0];
      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr).to.not.have.property('consentString');
      expect(request.data.gdpr).to.not.have.property('gdprApplies');
      expect(request.data.gdpr.apiVersion).to.exist.and.to.equal(2);
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

    it('should returns an empty array if the bidder cannot access to window top (based on refererInfo.reachedTop)', () => {
      const requests = spec.buildRequests(bidRequests, {
        ...bidderRequest,
        refererInfo: { reachedTop: false }
      });
      expect(requests).to.be.empty;
    });

    it('Should add the schain if available at bidder level', () => {
      const bidRequest = Object.assign({}, bidRequests[0], {
        schain: {
          ver: '1.0',
          complete: 1,
          nodes: [{
            asi: 'ssp.test',
            sid: '00001',
            hp: 1
          }]
        }
      });

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const request = requests[0];

      expect(request.data.schain).to.exist;
      expect(request.data.schain).to.deep.equal({
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'ssp.test',
          sid: '00001',
          hp: 1
        }]
      });
    });

    it('Schain should not be added to the request', () => {
      const requests = spec.buildRequests([bidRequests[0]], bidderRequest);
      const request = requests[0];
      expect(request.data.schain).to.not.exist;
    });
  });

  describe('interpretResponse', () => {
    const sandbox = sinon.createSandbox();

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

    let serverResponseWhichThrowsException = {
      body: {
        data: {
          pred: 1
        },
        bids: {
          foo: 'bar'
        }
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

    afterEach(function() {
      sandbox.restore();
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
    });

    it('Should not populate ADAGIO queue with ssp-data if not in top window', () => {
      utils.getWindowTop().ADAGIO.queue = [];
      sandbox.stub(utils, 'getWindowTop').throws();
      spec.interpretResponse(serverResponse, bidRequest);
      expect(window.top.ADAGIO).ok;
      expect(window.top.ADAGIO.queue).to.be.an('array');
      expect(window.top.ADAGIO.queue).empty;
    });

    it('should return an empty response even if an exception is ', () => {
      expect(spec.interpretResponse(serverResponseWhichThrowsException, bidRequest)).to.be.an('array').length(0);
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

  describe('adagioScriptFromLocalStorageCb', () => {
    const VALID_HASH = 'Lddcw3AADdQDrPtbRJkKxvA+o1CtScGDIMNRpHB3NnlC/FYmy/9RKXelKrYj/sjuWusl5YcOpo+lbGSkk655i8EKuDiOvK6ae/imxSrmdziIp+S/TA6hTFJXcB8k1Q9OIp4CMCT52jjXgHwX6G0rp+uYoCR25B1jHaHnpH26A6I=';
    const INVALID_HASH = 'invalid';
    const VALID_SCRIPT_CONTENT = 'var _ADAGIO=function(){};(_ADAGIO)();\n';
    const INVALID_SCRIPT_CONTENT = 'var _ADAGIO=function(){//corrupted};(_ADAGIO)();\n';
    const ADAGIO_LOCALSTORAGE_KEY = 'adagioScript';

    it('should verify valid hash with valid script', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, '// hash: ' + VALID_HASH + '\n' + VALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Start Adagio script').once();
      utilsMock.expects('logWarn').withExactArgs('No hash found in Adagio script').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Adagio script found').never();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.equals('// hash: ' + VALID_HASH + '\n' + VALID_SCRIPT_CONTENT);
      utilsMock.verify();
    });

    it('should verify valid hash with invalid script', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, '// hash: ' + VALID_HASH + '\n' + INVALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Start Adagio script').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in Adagio script').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Adagio script found').once();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify invalid hash with valid script', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, '// hash: ' + INVALID_HASH + '\n' + VALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Start Adagio script').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in Adagio script').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Adagio script found').once();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify missing hash', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, VALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Start Adagio script').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in Adagio script').once();
      utilsMock.expects('logWarn').withExactArgs('Invalid Adagio script found').never();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });
  });
});
