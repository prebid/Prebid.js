import { scope3SubModule } from 'modules/scope3RtdProvider.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';
import * as gptUtils from 'libraries/gptUtils/gptUtils.js';

describe('Scope3 RTD Module', function() {
  let logMessageSpy;
  let logErrorSpy;
  let logWarnSpy;
  let setKeyValueStub;

  beforeEach(function() {
    logMessageSpy = sinon.spy(utils, 'logMessage');
    logErrorSpy = sinon.spy(utils, 'logError');
    logWarnSpy = sinon.spy(utils, 'logWarn');
    setKeyValueStub = sinon.stub(gptUtils, 'setKeyValue');
  });

  afterEach(function() {
    logMessageSpy.restore();
    logErrorSpy.restore();
    logWarnSpy.restore();
    setKeyValueStub.restore();
  });

  describe('init', function() {
    it('should return true when valid config is provided', function() {
      const config = {
        params: {
          publisherId: 'test-publisher-123',
          apiKey: 'test-api-key',
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
      expect(scope3SubModule.init({})).to.equal(false);
      expect(logErrorSpy.calledOnce).to.be.true;
    });

    it('should return false when publisherId is missing', function() {
      const config = {
        params: {
          apiKey: 'test-api-key'
        }
      };
      expect(scope3SubModule.init(config)).to.equal(false);
      expect(logErrorSpy.calledWith('Scope3 RTD: Missing required publisherId parameter')).to.be.true;
    });

    it('should warn when no API key is provided but still initialize', function() {
      const config = {
        params: {
          publisherId: 'test-publisher-123'
        }
      };
      expect(scope3SubModule.init(config)).to.equal(true);
      expect(logWarnSpy.calledOnce).to.be.true;
    });

    it('should use default values for optional parameters', function() {
      const config = {
        params: {
          publisherId: 'test-publisher-123',
          apiKey: 'test-key'
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
          publisherId: 'test-publisher-123',
          apiKey: 'test-api-key',
          endpoint: 'https://test.scope3.com/api',
          timeout: 1000,
          publisherTargeting: true,
          advertiserTargeting: true
        }
      };

      reqBidsConfigObj = {
        ortb2Fragments: {
          global: {
            site: {
              page: 'https://example.com',
              domain: 'example.com'
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
          ]
        }]
      };

      callback = sinon.spy();
      
      // Initialize the module first
      scope3SubModule.init(config);
    });

    it('should make API request with correct payload', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://test.scope3.com/api');
      expect(request.requestHeaders['Content-Type']).to.include('application/json');
      expect(request.requestHeaders['Authorization']).to.equal('Bearer test-api-key');

      const payload = JSON.parse(request.requestBody);
      expect(payload).to.have.property('publisherId');
      expect(payload.publisherId).to.equal('test-publisher-123');
      expect(payload).to.have.property('ortb2');
      expect(payload).to.have.property('adUnits');
      expect(payload).to.have.property('timestamp');
      expect(payload.source).to.equal('prebid-rtd');
    });

    it('should enrich bid request with Scope3 data on successful response', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      const responseData = {
        scores: {
          overall: 0.5,
          byBidder: {
            'bidderA': 0.3,
            'bidderB': 0.7
          }
        },
        recommendations: {
          'bidderA': { carbonScore: 0.3, recommended: true },
          'bidderB': { carbonScore: 0.7, recommended: false }
        },
        metadata: {
          calculationId: 'calc-123',
          timestamp: 1234567890
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      // Check global ortb2 enrichment
      expect(reqBidsConfigObj.ortb2Fragments.global.site.ext.data.scope3).to.deep.equal({
        carbonScore: 0.5,
        calculationId: 'calc-123',
        timestamp: 1234567890
      });

      // Check bidder-specific enrichment
      expect(reqBidsConfigObj.ortb2Fragments.bidder.bidderA.site.ext.data.scope3).to.deep.equal({
        carbonScore: 0.3,
        recommended: true,
        calculationId: 'calc-123'
      });

      expect(reqBidsConfigObj.ortb2Fragments.bidder.bidderB.site.ext.data.scope3).to.deep.equal({
        carbonScore: 0.7,
        recommended: false,
        calculationId: 'calc-123'
      });

      expect(callback.calledOnce).to.be.true;
    });

    it('should handle API errors gracefully', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      server.requests[0].respond(500, {}, 'Internal Server Error');

      expect(logErrorSpy.called).to.be.true;
      expect(callback.calledOnce).to.be.true;
      // Bid request should remain unchanged
      expect(reqBidsConfigObj.ortb2Fragments.global.site.ext).to.be.undefined;
    });

    it('should handle timeout gracefully', function(done) {
      const timeoutConfig = {
        params: {
          publisherId: 'test-publisher-123',
          apiKey: 'test-api-key',
          endpoint: 'https://test.scope3.com/api',
          timeout: 10
        }
      };
      
      scope3SubModule.init(timeoutConfig);
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, timeoutConfig);

      setTimeout(() => {
        expect(callback.calledOnce).to.be.true;
        done();
      }, 50);
    });

    it('should set publisher targeting when enabled', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      const responseData = {
        scores: {
          overall: 0.25,
          byBidder: {
            'bidderA': 0.2,
            'bidderB': 0.8
          }
        },
        recommendations: {
          'bidderA': { carbonScore: 0.2, recommended: true },
          'bidderB': { carbonScore: 0.8, recommended: false }
        },
        metadata: {
          calculationId: 'calc-456',
          timestamp: 1234567890
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      // Check that setKeyValue was called with correct values
      expect(setKeyValueStub.calledWith('scope3_score', '25')).to.be.true;
      expect(setKeyValueStub.calledWith('scope3_tier', 'low')).to.be.true;
      expect(setKeyValueStub.calledWith('scope3_rec', ['bidderA'])).to.be.true;
    });

    it('should not set publisher targeting when disabled', function() {
      const noTargetingConfig = {
        params: {
          publisherId: 'test-publisher-123',
          apiKey: 'test-api-key',
          endpoint: 'https://test.scope3.com/api',
          publisherTargeting: false
        }
      };

      scope3SubModule.init(noTargetingConfig);
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, noTargetingConfig);

      const responseData = {
        scores: {
          overall: 0.5
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      expect(setKeyValueStub.called).to.be.false;
    });

    it('should filter bidders when specified in config', function() {
      const filteredConfig = {
        params: {
          publisherId: 'test-publisher-123',
          apiKey: 'test-api-key',
          endpoint: 'https://test.scope3.com/api',
          bidders: ['bidderA']
        }
      };

      scope3SubModule.init(filteredConfig);
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, filteredConfig);

      const responseData = {
        scores: {
          overall: 0.5,
          byBidder: {
            'bidderA': 0.3,
            'bidderB': 0.7
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

    it('should use custom key prefix when provided', function() {
      const customPrefixConfig = {
        params: {
          publisherId: 'test-publisher-123',
          apiKey: 'test-api-key',
          endpoint: 'https://test.scope3.com/api',
          keyPrefix: 'carbon'
        }
      };

      scope3SubModule.init(customPrefixConfig);
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, customPrefixConfig);

      const responseData = {
        scores: {
          overall: 0.5
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      expect(setKeyValueStub.calledWith('carbon_score', '50')).to.be.true;
      expect(setKeyValueStub.calledWith('carbon_tier', 'medium')).to.be.true;
    });

    it('should handle ad unit specific scores', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      const responseData = {
        scores: {
          overall: 0.5
        },
        adUnitScores: {
          'test-ad-unit': 0.4
        },
        metadata: {
          calculationId: 'calc-789'
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      const adUnit = reqBidsConfigObj.adUnits[0];
      expect(adUnit.ortb2Imp.ext.data.scope3).to.deep.equal({
        carbonScore: 0.4,
        calculationId: 'calc-789'
      });
    });

    it('should use cache for identical requests within TTL', function() {
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, config);

      const responseData = {
        scores: {
          overall: 0.5
        }
      };

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(responseData)
      );

      // Make another request with same data
      const callback2 = sinon.spy();
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback2, config);

      // Should not make another API request
      expect(server.requests.length).to.equal(1);
      expect(callback2.calledOnce).to.be.true;
    });

    it('should not use cache when disabled', function() {
      const noCacheConfig = {
        params: {
          publisherId: 'test-publisher-123',
          apiKey: 'test-api-key',
          endpoint: 'https://test.scope3.com/api',
          cacheEnabled: false
        }
      };

      scope3SubModule.init(noCacheConfig);
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, noCacheConfig);

      server.requests[0].respond(200, {}, '{"scores":{"overall":0.5}}');

      const callback2 = sinon.spy();
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback2, noCacheConfig);

      // Should make another API request
      expect(server.requests.length).to.equal(2);
    });
  });

  describe('carbon tier calculation', function() {
    beforeEach(function() {
      const config = {
        params: {
          publisherId: 'test-publisher-123',
          apiKey: 'test-api-key'
        }
      };
      scope3SubModule.init(config);
    });

    it('should classify scores correctly into tiers', function() {
      const reqBidsConfigObj = {
        ortb2Fragments: { global: {}, bidder: {} },
        adUnits: []
      };
      const callback = sinon.spy();

      // Test low tier (< 0.33)
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, {});
      server.requests[0].respond(200, {}, '{"scores":{"overall":0.2}}');
      expect(setKeyValueStub.calledWith('scope3_tier', 'low')).to.be.true;

      // Test medium tier (0.33 - 0.66)
      setKeyValueStub.reset();
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, {});
      server.requests[1].respond(200, {}, '{"scores":{"overall":0.5}}');
      expect(setKeyValueStub.calledWith('scope3_tier', 'medium')).to.be.true;

      // Test high tier (> 0.66)
      setKeyValueStub.reset();
      scope3SubModule.getBidRequestData(reqBidsConfigObj, callback, {});
      server.requests[2].respond(200, {}, '{"scores":{"overall":0.8}}');
      expect(setKeyValueStub.calledWith('scope3_tier', 'high')).to.be.true;
    });
  });
});