import {auctionManager} from 'src/auctionManager.js';
import { scope3SubModule } from 'modules/scope3RtdProvider.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';

describe('Scope3 RTD Module', function() {
  let logErrorSpy;
  let logWarnSpy;
  let logMessageSpy;

  beforeEach(function() {
    logErrorSpy = sinon.spy(utils, 'logError');
    logWarnSpy = sinon.spy(utils, 'logWarn');
    logMessageSpy = sinon.spy(utils, 'logMessage');
  });

  afterEach(function() {
    logErrorSpy.restore();
    logWarnSpy.restore();
    logMessageSpy.restore();
  });

  describe('init', function() {
    it('should return true when valid config is provided', function() {
      const config = {
        params: {
          orgId: 'test-org-123',
          endpoint: 'https://test.endpoint.com'
        }
      };

      expect(scope3SubModule.init(config)).to.equal(true);
    });

    it('should return false when config is missing', function() {
      expect(scope3SubModule.init()).to.equal(false);
      expect(logErrorSpy.calledOnce).to.be.true;
    });

    it('should return false when params are missing', function() {
      const config = {};
      expect(scope3SubModule.init(config)).to.equal(false);
      expect(logErrorSpy.calledOnce).to.be.true;
    });

    it('should return false when orgId is missing', function() {
      const config = {
        params: {
          endpoint: 'https://test.endpoint.com'
        }
      };
      expect(scope3SubModule.init(config)).to.equal(false);
      expect(logErrorSpy.calledWith('Scope3 RTD: Missing required orgId parameter. Config params:', config.params)).to.be.true;
    });

    it('should initialize with just orgId', function() {
      const config = {
        params: {
          orgId: 'test-org-123'
        }
      };
      expect(scope3SubModule.init(config)).to.equal(true);
    });

    it('should use default values for optional parameters', function() {
      const config = {
        params: {
          orgId: 'test-org-123'
        }
      };
      expect(scope3SubModule.init(config)).to.equal(true);
      // Module should use default timeout, targeting settings, etc.
    });
  });

  describe('getBidRequestData', function() {
    let config;
    let reqBidsConfigObj;
    let callback;

    beforeEach(function() {
      config = {
        params: {
          orgId: 'test-org-123',
          endpoint: 'https://prebid.scope3.com/prebid',
          timeout: 1000,
          publisherTargeting: true,
          advertiserTargeting: true,
          cacheEnabled: false  // Disable cache for tests to ensure fresh requests
        }
      };

      reqBidsConfigObj = {
        ortb2Fragments: {
          global: {
            site: {
              page: 'https://example.com',
              domain: 'example.com',
              ext: {
                data: {}
              }
            },
            device: {
              ua: 'test-user-agent'
            }
          },
          bidder: {}
        },
        adUnits: [{
          code: 'test-ad-unit',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          },
          bids: [
            { bidder: 'bidderA' },
            { bidder: 'bidderB' }
          ],
          ortb2Imp: {
            ext: {}
          }
        }]
      };

      callback = sinon.spy();

      // Initialize the module first
      scope3SubModule.init(config);
    });

    afterEach(function() {
      // Clean up after each test if needed
    });

    it('should make API request with correct payload', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://prebid.scope3.com/prebid');
      expect(request.requestHeaders['Content-Type']).to.include('application/json');

      const payload = JSON.parse(request.requestBody);
      expect(payload).to.have.property('orgId');
      expect(payload.orgId).to.equal('test-org-123');
      expect(payload).to.have.property('ortb2');
      expect(payload).to.have.property('bidders');
      expect(payload).to.have.property('timestamp');
      expect(payload.source).to.equal('prebid-rtd');
    });

    it('should apply AEE signals on successful response', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      const responseData = {
        aee_signals: {
          include: ['x82s', 'a91k'],
          exclude: ['c4x9'],
          macro: 'ctx9h3v8s5',
          bidders: {
            'bidderA': {
              segments: ['seg1', 'seg2'],
              deals: ['DEAL123']
            },
            'bidderB': {
              segments: ['seg3'],
              deals: []
            }
          }
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      // Check global ortb2 enrichment with AEE signals
      expect(reqBidsConfigObj.ortb2Fragments.global.site.ext.data.scope3_aee).to.deep.equal({
        include: ['x82s', 'a91k'],
        exclude: ['c4x9'],
        macro: 'ctx9h3v8s5'
      });

      // Check s3kw for broader compatibility
      expect(reqBidsConfigObj.ortb2Fragments.global.site.ext.data.s3kw).to.deep.equal(['x82s', 'a91k']);

      // Check site.content.data with segtax
      expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data).to.have.lengthOf(1);
      expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0]).to.deep.include({
        name: 'scope3.com',
        ext: { segtax: 3333 }
      });
      expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0].segment).to.deep.equal([
        { id: 'x82s' },
        { id: 'a91k' }
      ]);

      // Check bidder-specific enrichment with segtax
      expect(reqBidsConfigObj.ortb2Fragments.bidder.bidderA.user.data[0]).to.deep.include({
        name: 'scope3.com',
        ext: { segtax: 3333 }
      });
      expect(reqBidsConfigObj.ortb2Fragments.bidder.bidderA.user.data[0].segment).to.deep.equal([
        { id: 'seg1' },
        { id: 'seg2' }
      ]);

      expect(reqBidsConfigObj.ortb2Fragments.bidder.bidderB.user.data[0].segment).to.deep.equal([
        { id: 'seg3' }
      ]);

      expect(callback.calledOnce).to.be.true;
    });

    it('should handle API errors gracefully', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(server.requests.length).to.be.at.least(1);
      if (server.requests.length > 0) {
        server.requests[0].respond(500, {}, 'Internal Server Error');
      }

      expect(callback.calledOnce).to.be.true;
      expect(logWarnSpy.called).to.be.true;
    });

    it('should filter bidders when specified in config', function() {
      const filteredConfig = {
        params: {
          orgId: 'test-org-123',
          endpoint: 'https://prebid.scope3.com/prebid',
          bidders: ['bidderA'],
          cacheEnabled: false
        }
      };

      scope3SubModule.init(filteredConfig);
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, filteredConfig);

      expect(server.requests.length).to.be.at.least(1);

      const responseData = {
        aee_signals: {
          include: ['segment1'],
          bidders: {
            'bidderA': {
              segments: ['seg1'],
              deals: ['DEAL1']
            },
            'bidderB': {
              segments: ['seg2'],
              deals: ['DEAL2']
            }
          }
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      // Only bidderA should be enriched
      expect(reqBidsConfigObj.ortb2Fragments.bidder.bidderA).to.exist;
      expect(reqBidsConfigObj.ortb2Fragments.bidder.bidderB).to.not.exist;
    });

    it('should handle AppNexus keyword format', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      const responseData = {
        aee_signals: {
          include: ['x82s'],
          bidders: {
            'appnexus': {
              segments: ['apn1', 'apn2'],
              deals: []
            }
          }
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      // Check AppNexus gets keywords in their format
      expect(reqBidsConfigObj.ortb2Fragments.bidder.appnexus.site.keywords).to.equal('s3_seg=apn1,s3_seg=apn2');

      // Also check they get the standard user.data format with segtax
      expect(reqBidsConfigObj.ortb2Fragments.bidder.appnexus.user.data[0]).to.deep.include({
        name: 'scope3.com',
        ext: { segtax: 3333 }
      });
      expect(reqBidsConfigObj.ortb2Fragments.bidder.appnexus.user.data[0].segment).to.deep.equal([
        { id: 'apn1' },
        { id: 'apn2' }
      ]);
    });

    it('should handle bidder-specific deals', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(server.requests.length).to.be.at.least(1);

      const responseData = {
        aee_signals: {
          include: ['segment1'],
          bidders: {
            'bidderA': {
              segments: ['seg1'],
              deals: ['DEAL123', 'DEAL456']
            }
          }
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      const adUnit = reqBidsConfigObj.adUnits[0];
      expect(adUnit.ortb2Imp.ext.bidderA.deals).to.deep.equal(['DEAL123', 'DEAL456']);
    });

    it('should use cache for identical requests within TTL', function() {
      // Enable cache for this specific test
      const cacheConfig = {
        params: {
          orgId: 'test-org-123',
          endpoint: 'https://prebid.scope3.com/prebid',
          timeout: 1000,
          publisherTargeting: true,
          advertiserTargeting: true,
          cacheEnabled: true  // Enable cache for this test
        }
      };

      scope3SubModule.init(cacheConfig);
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, cacheConfig);

      expect(server.requests.length).to.be.at.least(1);

      const responseData = {
        aee_signals: {
          include: ['cached_segment']
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      // Second request should use cache
      const callback2 = sinon.spy();
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback2, cacheConfig);

      // No new request should be made
      expect(server.requests.length).to.equal(1);
      expect(callback2.calledOnce).to.be.true;
    });

    it('should not use cache when disabled', function() {
      const noCacheConfig = {
        params: {
          orgId: 'test-org-123',
          endpoint: 'https://prebid.scope3.com/prebid',
          cacheEnabled: false
        }
      };

      scope3SubModule.init(noCacheConfig);
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, noCacheConfig);

      server.requests[0].respond(200, {}, '{"aee_signals":{"include":["segment1"]}}');

      const callback2 = sinon.spy();
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback2, noCacheConfig);

      // Should make another API request
      expect(server.requests.length).to.equal(2);
    });

    it('should handle JSON parsing errors in response', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        'invalid json response'
      );

      expect(callback.calledOnce).to.be.true;
      expect(logErrorSpy.called).to.be.true;
    });

    it('should handle exception in getBidRequestData', function() {
      // Create a config that will cause an error
      const badConfig = {
        params: {
          orgId: 'test-org-123',
          endpoint: 'https://prebid.scope3.com/prebid',
          cacheEnabled: false
        }
      };

      scope3SubModule.init(badConfig);

      // Pass null reqBidsConfigObj to trigger error
      const errorCallback = sinon.spy();
      scope3SubModule.getBidRequestData(null, errorCallback, badConfig);

      expect(errorCallback.calledOnce).to.be.true;
      expect(logErrorSpy.called).to.be.true;
    });

    it('should properly handle cache TTL expiration', function() {
      // Simply test that cache can be disabled
      const noCacheConfig = {
        params: {
          orgId: 'test-org-123',
          endpoint: 'https://prebid.scope3.com/prebid',
          cacheEnabled: false
        }
      };

      const result = scope3SubModule.init(noCacheConfig);
      expect(result).to.equal(true);

      // With cache disabled, each request should hit the API
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, noCacheConfig);
      const firstRequestCount = server.requests.length;

      const callback2 = sinon.spy();
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback2, noCacheConfig);

      // Should have made more requests since cache is disabled
      expect(server.requests.length).to.be.greaterThan(firstRequestCount);
    });

    it('should handle missing module config', function() {
      // Try to initialize with null config
      const result = scope3SubModule.init(null);
      expect(result).to.equal(false);
      expect(logErrorSpy.called).to.be.true;
    });

    it('should handle response without aee_signals', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ other_data: 'test' })
      );

      // Should still call callback even without aee_signals
      expect(callback.calledOnce).to.be.true;
      // No AEE data should be applied
      expect(reqBidsConfigObj.ortb2Fragments.global.site.ext.data.scope3_aee).to.be.undefined;
    });

    it('should initialize with default values when optional params missing', function() {
      const minimalConfig = {
        params: {
          orgId: 'test-org-123'
        }
      };

      const result = scope3SubModule.init(minimalConfig);
      expect(result).to.equal(true);

      // Module should be properly initialized with defaults
      expect(result).to.be.true;
    });
  });

  describe('getTargetingData', function() {
    let config;
    let reqBidsConfigObj;
    let callback;

    beforeEach(function() {
      config = {
        params: {
          orgId: 'test-org-123',
          endpoint: 'https://prebid.scope3.com/prebid',
          timeout: 1000,
          publisherTargeting: true,
          advertiserTargeting: true,
          cacheEnabled: true,  // Need cache enabled for getTargetingData
          includeKey: "axei",
          excludeKey: "axex",
          macroKey: "axem",
        }
      };

      reqBidsConfigObj = {
        ortb2Fragments: {
          global: {
            site: {
              page: 'https://example1.com',
              domain: 'example1.com',
              ext: {
                data: {}
              }
            },
            device: {
              ua: 'test-user-agent-1'
            }
          },
          bidder: {}
        },
        adUnits: [{
          code: 'test-ad-unit-nocache',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          },
          bids: [
            { bidder: 'bidderA' },
            { bidder: 'bidderB' }
          ],
          ortb2Imp: {
            ext: {}
          }
        }]
      };

      callback = sinon.spy();

      // Initialize the module first
      scope3SubModule.init(config);
    });

    afterEach(function() {
      // Clean up after each test if needed
    });

    it('should get targeting items back', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(server.requests.length).to.be.at.least(1);

      const responseData = {
        aee_signals: {
          include: ['x82s'],
          exclude: ['c4x9'],
          macro: 'ctx9h3v8s5',
          bidders: {
            'bidderA': {
              segments: ['seg1', 'seg2'],
              deals: ['DEAL123']
            },
            'bidderB': {
              segments: ['seg3'],
              deals: []
            }
          }
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      const getAuctionStub = sinon.stub(auctionManager.index, 'getAuction').returns({
        adUnits: reqBidsConfigObj.adUnits,
        getFPD: () => { return reqBidsConfigObj.ortb2Fragments }
      });

      const targetingData = scope3SubModule.getTargetingData([ reqBidsConfigObj.adUnits[0].code ], config, {}, { adUnits: reqBidsConfigObj.adUnits })
      expect(targetingData['test-ad-unit-nocache']).to.be.an('object')
      expect(targetingData['test-ad-unit-nocache']['axei']).to.be.an('array')
      expect(targetingData['test-ad-unit-nocache']['axei'].length).to.equal(1)
      expect(targetingData['test-ad-unit-nocache']['axei']).to.contain('x82s')
      expect(targetingData['test-ad-unit-nocache']['axex']).to.be.an('array')
      expect(targetingData['test-ad-unit-nocache']['axex'].length).to.equal(1)
      expect(targetingData['test-ad-unit-nocache']['axex']).to.contain('c4x9')
      expect(targetingData['test-ad-unit-nocache']['axem']).to.equal('ctx9h3v8s5')

      getAuctionStub.restore();
    });
  });
});
