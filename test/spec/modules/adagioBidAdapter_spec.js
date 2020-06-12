import { expect } from 'chai';
import { adagioScriptFromLocalStorageCb, _features, spec } from 'modules/adagioBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';
import * as refererInfo from '../../../src/refererDetection.js';

describe('adagioAdapter', () => {
  let utilsMock;
  const adapter = newBidder(spec);
  const ENDPOINT = 'https://mp.4dex.io/prebid';
  const VERSION = '2.3.0';

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

    const bid = {
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

    const bidWithMediaTypes = {
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
      expect(window.self.ADAGIO.adUnits['adunit-code'].printNumber).to.equal(1);
    });

    it('should compute a printNumber for the new bid request on same adUnitCode and same pageviewId', () => {
      spec.isBidRequestValid(bid);
      expect(window.self.ADAGIO.adUnits).ok;
      expect(window.self.ADAGIO.adUnits['adunit-code']).ok;
      expect(window.self.ADAGIO.adUnits['adunit-code'].printNumber).to.equal(2);

      spec.isBidRequestValid(bid);
      expect(window.self.ADAGIO.adUnits['adunit-code'].printNumber).to.equal(3);

      window.self.ADAGIO.pageviewId = 123;
      spec.isBidRequestValid(bid);
      expect(window.self.ADAGIO.adUnits['adunit-code'].printNumber).to.equal(1);
    });

    it('should return false when organization params is not passed', () => {
      const bidTest = utils.deepClone(bid);
      delete bidTest.params.organizationId;
      expect(spec.isBidRequestValid(bidTest)).to.equal(false);
    });

    it('should return false when site params is not passed', () => {
      const bidTest = utils.deepClone(bid);
      delete bidTest.params.site;
      expect(spec.isBidRequestValid(bidTest)).to.equal(false);
    });

    it('should return false when placement params is not passed', () => {
      const bidTest = utils.deepClone(bid);
      delete bidTest.params.placement;
      expect(spec.isBidRequestValid(bidTest)).to.equal(false);
    });

    it('should add autodetected adUnitElementId and environment params', () => {
      const bidTest = utils.deepClone(bid);
      delete bidTest.params.adUnitElementId;
      delete bidTest.params.environment;
      sandbox.stub(utils, 'getGptSlotInfoForAdUnitCode').returns({divId: 'banner-atf'});
      sandbox.stub(_features, 'getDevice').returns(4);
      spec.isBidRequestValid(bidTest)
      expect(bidTest.params.adUnitElementId).to.equal('banner-atf');
      expect(bidTest.params.environment).to.equal('mobile');
    })

    it('should add autodetected tablet environment params', () => {
      const bidTest = utils.deepClone(bid);
      delete bidTest.params.environment;
      sandbox.stub(_features, 'getDevice').returns(5);
      spec.isBidRequestValid(bidTest)
      expect(bidTest.params.environment).to.equal('tablet');
    })

    it('should expose ADAGIO.pbjsAdUnits in window', () => {
      spec.isBidRequestValid(bidWithMediaTypes);
      spec.isBidRequestValid(bid);
      expect(window.self.ADAGIO.pbjsAdUnits).ok;
      expect(window.self.ADAGIO.pbjsAdUnits).to.have.lengthOf(2);
      const adUnitWithMediaTypeSizes = window.self.ADAGIO.pbjsAdUnits.filter((aU) => aU.code === 'adunit-code-2')[0];
      const adUnitWithSizes = window.self.ADAGIO.pbjsAdUnits.filter((aU) => aU.code === 'adunit-code')[0];
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

    const $sf = {
      ext: {
        geom: function() {}
      }
    }

    const stubs = {
      topGetElementById: undefined,
      topGetComputedStyle: undefined,
      refererInfo: undefined
    }

    self.ADAGIO = self.ADAGIO || {};
    self.ADAGIO.adUnits = self.ADAGIO.adUnits || {};
    self.ADAGIO.pbjsAdUnits = self.ADAGIO.pbjsAdUnits || [];

    beforeEach(function () {
      stubs.topGetElementById = sandbox.stub(top.document, 'getElementById');
      stubs.topGetComputedStyle = sandbox.stub(top, 'getComputedStyle');
      stubs.refererInfo = sandbox.stub(refererInfo, 'detectReferer');

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

    const bidRequestsWithoutAdunitElementId = [
      {
        'bidder': 'adagio',
        'params': {
          organizationId: '456',
          site: 'ADAGIO-456',
          placement: 'PAVE_ATF-456',
          pagetype: 'ARTICLE',
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

    it('features params "adunit_position" must not exists if adUnitElement is not found in the DOM', () => {
      const requests = spec.buildRequests([Object.assign({}, bidRequests[0], {params: {adUnitElementId: 'does-not-exist'}})], bidderRequest);
      const request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].features.adunit_position).to.not.exist;
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

    it('generates a pageviewId if missing', () => {
      window.self.ADAGIO = window.self.ADAGIO || {};
      delete window.self.ADAGIO.pageviewId;

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);

      expect(requests[0].data.pageviewId).to.exist.and.to.not.equal('_').and.to.not.equal('');
      expect(requests[0].data.pageviewId).to.equal(requests[1].data.pageviewId);
    });

    it('uses an existing pageviewId if present', () => {
      window.self.ADAGIO = window.self.ADAGIO || {};
      window.self.ADAGIO.pageviewId = 'abc';

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);

      expect(requests[0].data.pageviewId).to.equal('abc');
      expect(requests[1].data.pageviewId).to.equal('abc');
    });

    it('should send the printNumber in features object', () => {
      window.self.ADAGIO = window.self.ADAGIO || {};
      window.self.ADAGIO.pageviewId = 'abc';
      window.self.ADAGIO.adUnits['adunit-code1'] = {
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
      expect(window.self.ADAGIO).ok;
      expect(window.self.ADAGIO.versions).ok;
      expect(window.self.ADAGIO.versions.adagioBidderAdapter).to.eq(VERSION);
    });

    it('Should returns empty `page_dimensions` features if no body', () => {
      // This appens when Prebid is executed before DOM has been loaded.
      sandbox.stub(top.document, 'querySelector').withArgs('body').returns(false);
      let requests = spec.buildRequests([bidRequests[0]], bidderRequest);
      const request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].features.page_dimensions).to.not.exist;
    });

    it('Should remove specifics features if Prebid is in Unfriendly Iframe', () => {
      sandbox.stub(utils, 'getWindowTop').throws();
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      const request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].features.viewport_dimensions).to.not.exist;
      expect(request.data.adUnits[0].features.page_dimensions).to.not.exist;
      expect(request.data.adUnits[0].features.adunit_position).to.not.exist;
      expect(request.data.adUnits[0].features.print_number).to.be.a('String');
      expect(request.data.adUnits[0].features.dom_loading).to.be.a('String');
      expect(request.data.adUnits[0].features.user_timestamp).to.be.a('String');
      expect(request.data.adUnits[0].features.device).to.be.a('String');
      expect(request.data.adUnits[0].features.url).to.be.a('String');
      expect(request.data.adUnits[0].features.browser).to.be.a('String');
      expect(request.data.adUnits[0].features.os).to.be.a('String');
    });

    it('Should send a request even if adUnitElementId is not found', () => {
      const requests = spec.buildRequests(bidRequestsWithoutAdunitElementId, bidderRequest);
      const request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].features.viewport_dimensions).to.exist;
      expect(request.data.adUnits[0].features.page_dimensions).to.exist;
      expect(request.data.adUnits[0].features.adunit_position).to.not.exist;
      expect(request.data.adUnits[0].features.print_number).to.be.a('String');
      expect(request.data.adUnits[0].features.dom_loading).to.be.a('String');
      expect(request.data.adUnits[0].features.user_timestamp).to.be.a('String');
      expect(request.data.adUnits[0].features.device).to.be.a('String');
      expect(request.data.adUnits[0].features.url).to.be.a('String');
      expect(request.data.adUnits[0].features.browser).to.be.a('String');
      expect(request.data.adUnits[0].features.os).to.be.a('String');
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

    it('Features object does not include empty properties', () => {
      sandbox.stub(_features, 'getPageDimensions').returns('');
      sandbox.stub(_features, 'getViewPortDimensions').returns('');
      sandbox.stub(_features, 'getSlotPosition').returns('');
      sandbox.stub(_features, 'getOS').returns('');
      const requests = spec.buildRequests([Object.assign({}, bidRequests[0])], bidderRequest);
      let request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].features.adunit_position).to.not.exist;
      expect(request.data.adUnits[0].features.page_dimensions).to.not.exist;
      expect(request.data.adUnits[0].features.viewport_dimensions).to.not.exist;
      expect(request.data.adUnits[0].features.print_number).to.be.a('String');
      expect(request.data.adUnits[0].features.dom_loading).to.be.a('String');
      expect(request.data.adUnits[0].features.user_timestamp).to.be.a('String');
      expect(request.data.adUnits[0].features.device).to.be.a('String');
      expect(request.data.adUnits[0].features.url).to.be.a('String');
      expect(request.data.adUnits[0].features.browser).to.be.a('String');
      expect(request.data.adUnits[0].features.os).to.not.exist;
    });

    it('Features object properties must be a string', () => {
      const requests = spec.buildRequests([Object.assign({}, bidRequests[0])], bidderRequest);
      let request = requests[0];
      expect(request.data.adUnits[0].features).to.exist;
      expect(request.data.adUnits[0].features.adunit_position).to.be.a('String');
      expect(request.data.adUnits[0].features.page_dimensions).to.be.a('String');
      expect(request.data.adUnits[0].features.viewport_dimensions).to.be.a('String');
      expect(request.data.adUnits[0].features.print_number).to.be.a('String');
      expect(request.data.adUnits[0].features.dom_loading).to.be.a('String');
      expect(request.data.adUnits[0].features.user_timestamp).to.be.a('String');
      expect(request.data.adUnits[0].features.device).to.be.a('String');
      expect(request.data.adUnits[0].features.url).to.be.a('String');
      expect(request.data.adUnits[0].features.browser).to.be.a('String');
      expect(request.data.adUnits[0].features.os).to.be.a('String');
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
      expect(window.self.ADAGIO).ok;
      expect(window.self.ADAGIO.queue).to.be.an('array');
      expect(window.self.ADAGIO.queue.find(ob => ob.action === 'ssp-data')).ok;
    });

    it.skip('Should populate ADAGIO queue with ssp-data if not in top window', () => {
      utils.getWindowSelf().ADAGIO.queue = [];
      sandbox.stub(utils, 'getWindowTop').throws();
      spec.interpretResponse(serverResponse, bidRequest);
      expect(window.self.ADAGIO).ok;
      expect(window.self.ADAGIO.queue).to.be.an('array');
      expect(window.self.ADAGIO.queue).empty;
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

      utilsMock.expects('logInfo').withExactArgs('Adagio: start script.').once();
      utilsMock.expects('logWarn').withExactArgs('Adagio: no hash found.').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: invalid script found.').never();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.equals('// hash: ' + VALID_HASH + '\n' + VALID_SCRIPT_CONTENT);
      utilsMock.verify();
    });

    it('should verify valid hash with invalid script', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, '// hash: ' + VALID_HASH + '\n' + INVALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Adagio: start script').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: no hash found.').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: invalid script found.').once();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify invalid hash with valid script', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, '// hash: ' + INVALID_HASH + '\n' + VALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Adagio: start script').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: no hash found.').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: invalid script found.').once();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify missing hash', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, VALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Adagio: start script').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: no hash found.').once();
      utilsMock.expects('logWarn').withExactArgs('Adagio: invalid script found.').never();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });
  });
});

describe('adagioAdapter in postBid context', () => {
  newBidder(spec);

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

    const $sf = {
      ext: {
        geom: function() {}
      }
    }

    const stubs = {
      topGetElementById: undefined,
      topGetComputedStyle: undefined,
      refererInfo: undefined
    }

    self.ADAGIO = self.ADAGIO || {};
    self.ADAGIO.adUnits = self.ADAGIO.adUnits || {};
    self.ADAGIO.pbjsAdUnits = self.ADAGIO.pbjsAdUnits || [];

    beforeEach(function () {
      stubs.topGetElementById = sandbox.stub(top.document, 'getElementById');
      stubs.topGetComputedStyle = sandbox.stub(top, 'getComputedStyle');
      stubs.refererInfo = sandbox.stub(refererInfo, 'detectReferer');

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

    let bidderRequest = {
      'bidderCode': 'adagio',
      'auctionId': '12jejebn',
      'bidderRequestId': 'hehehehbeheh',
      'timeout': 3000,
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'referer': 'http://test.io/index.html?pbjs_debug=true'
      }
    };

    it('friendly context: should returns computed specifics features', () => {
      const requests = spec.buildRequests(bidRequestsWithPostBid, bidderRequest);
      expect(requests[0].data.adUnits[0].features).to.exist;
      expect(requests[0].data.adUnits[0].features.viewport_dimensions).to.match(/^[\d]+x[\d]+$/);
      expect(requests[0].data.adUnits[0].features.page_dimensions).to.match(/^[\d]+x[\d]+$/);
      expect(requests[0].data.adUnits[0].features.adunit_position).to.match(/^[\d]+x[\d]+$/);
    });

    it('safeFrame context: should returns computed specifics features', () => {
      sandbox.stub(utils, 'getWindowTop').throws();
      window.$sf = $sf;

      stubs.$sfGeom = sandbox.stub(window.$sf.ext, 'geom');
      stubs.$sfGeom.returns({
        win: {t: 23, r: 1920, b: 1200, l: 0, w: 1920, h: 1177},
        self: {t: 210, r: 1159, b: 460, l: 859, w: 300, h: 250},
      });

      const requests = spec.buildRequests(bidRequestsWithPostBid, bidderRequest);

      expect(requests[0].data.adUnits[0].features).to.exist;
      expect(requests[0].data.adUnits[0].features.viewport_dimensions).to.deep.equal('1920x1177');
      expect(requests[0].data.adUnits[0].features.page_dimensions).to.not.exist
      expect(requests[0].data.adUnits[0].features.adunit_position).to.deep.equal('210x859');
      delete window.$sf;
    });

    it('safeFrame context: should gracelly returns empty string is $sf.geom is misimplemented', () => {
      sandbox.stub(utils, 'getWindowTop').throws();
      const w = utils.getWindowSelf();

      w.$sf = {
        ext: {
          geom: undefined
        }
      }

      const requests = spec.buildRequests(bidRequestsWithPostBid, bidderRequest);

      expect(requests[0].data.adUnits[0].features).to.exist;
      expect(requests[0].data.adUnits[0].features.viewport_dimensions).to.not.exist;
      expect(requests[0].data.adUnits[0].features.page_dimensions).to.not.exist;
      expect(requests[0].data.adUnits[0].features.adunit_position).to.not.exist;

      delete window.$sf;
    });

    it('Should not returns page_dimensions height in SafeFrame context', () => {
      sandbox.stub(utils, 'getWindowTop').throws();
      window.$sf = $sf;

      stubs.$sfGeom = sandbox.stub(window.$sf.ext, 'geom');
      stubs.$sfGeom.returns({
        win: {t: 23, r: 1920, b: 1200, l: 0, w: 1920, h: 1177},
        self: {t: 1831, r: 308, b: 2081, l: 8, w: 300, h: 250},
      });

      const requests = spec.buildRequests(bidRequestsWithPostBid, bidderRequest);

      expect(requests[0].data.adUnits[0].features.page_dimensions).to.not.exist;

      delete window.$sf;
    });

    it('safreFrame context: cross-domain w/ top domain reached', () => {
      sandbox.stub(utils, 'getWindowTop').throws();

      const info = {
        numIframes: 2,
        reachedTop: true,
        referer: 'http://level.io/',
        stack: [
          'http://level.io/',
          'http://example.com/iframe1.html',
          'http://example.com/iframe2.html'
        ],
        canonicalUrl: ''
      };

      stubs.refererInfo.returns(info);

      const requests = spec.buildRequests(bidRequestsWithPostBid, {
        ...bidderRequest,
        refererInfo: info
      });

      expect(requests[0].data.site.domain).eq('level.io');
      expect(requests[0].data.site.page).eq('http://level.io/');
      expect(requests[0].data.site.referrer).not.ok;
    });

    it('safreFrame context: cross-domain w/o top domain reached and w/o ancestor', () => {
      sandbox.stub(utils, 'getWindowTop').throws();

      const info = {
        numIframes: 2,
        reachedTop: false,
        referer: 'http://example.com/iframe1.html',
        stack: [
          null,
          'http://example.com/iframe1.html',
          'http://example.com/iframe2.html'
        ],
        canonicalUrl: ''
      };

      stubs.refererInfo.returns(info);

      const requests = spec.buildRequests(bidRequestsWithPostBid, {
        ...bidderRequest,
        refererInfo: info
      });

      expect(requests[0].data.site.domain).not.ok;
      expect(requests[0].data.site.page).not.ok;
      expect(requests[0].data.site.referrer).not.ok;
    });

    it('safreFrame context: cross-domain w/o top domain reached and w/ ancestors ', () => {
      sandbox.stub(utils, 'getWindowTop').throws();

      const info = {
        numIframes: 2,
        reachedTop: false,
        referer: 'http://example.com/iframe1.html',
        stack: [
          'http://mytest.com/',
          'http://example.com/iframe1.html',
          'http://example.com/iframe2.html'
        ],
        canonicalUrl: ''
      };

      stubs.refererInfo.returns(info);

      const requests = spec.buildRequests(bidRequestsWithPostBid, {
        ...bidderRequest,
        refererInfo: info
      });

      expect(requests[0].data.site.domain).eq('mytest.com');
      expect(requests[0].data.site.page).not.ok;
      expect(requests[0].data.site.referrer).not.ok;
    });
  });
});
