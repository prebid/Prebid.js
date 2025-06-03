import {expect} from 'chai/index.js';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import {schainPrecedence, moveSchainToExt} from 'src/fpd/schain.js';

describe('Supply Chain fpd', function() {
  const SAMPLE_SCHAIN = {
    ver: '1.0',
    complete: 1,
    nodes: [{ asi: 'example.com', sid: '00001', hp: 1 }]
  };

  const SAMPLE_SCHAIN_2 = {
    ver: '2.0',
    complete: 1,
    nodes: [{ asi: 'bidder.com', sid: '00002', hp: 1 }]
  };

  let sandbox;
  let logInfoStub;
  let configGetConfigStub;
  let configGetBidderConfigStub;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    logInfoStub = sandbox.stub(utils, 'logInfo');
    configGetConfigStub = sandbox.stub(config, 'getConfig');
    configGetBidderConfigStub = sandbox.stub(config, 'getBidderConfig');
  });

  afterEach(function() {
    sandbox.restore();
  });


  describe('schainPrecedence', function() {
    describe('handles edge cases', function() {
      it('should handle edge cases and no-op scenarios', function() {
        expect(schainPrecedence(null)).to.be.null;
        expect(schainPrecedence(undefined)).to.be.undefined;
        expect(schainPrecedence({})).to.deep.equal({});
        
        const input = {
          global: {
            source: {
              tid: '123'
            }
          }
        };
        configGetConfigStub.returns(null);
        configGetBidderConfigStub.returns(null);

        const result = schainPrecedence(input);
        expect(result).to.deep.equal(input);
        expect(logInfoStub.called).to.be.false;
      });
    });

    describe('global schain config handling', function() {
      let input;
      
      beforeEach(function() {
        input = {
          global: {
            source: {}
          }
        };
        configGetBidderConfigStub.returns(null);
      });
      
      it('should correctly handle different global schain config scenarios', function() {
        const validSchainConfig = {
          config: SAMPLE_SCHAIN
        };
        configGetConfigStub.returns(validSchainConfig);

        let result = schainPrecedence(input);
        expect(result.global.source.schain).to.deep.equal(SAMPLE_SCHAIN);
        expect(logInfoStub.calledWith('Applying global schain config with precedence')).to.be.true;
        
        logInfoStub.reset();
        input = { global: { source: {} } };
        
        const invalidSchainConfig = {
          validation: 'strict'
        };
        configGetConfigStub.returns(invalidSchainConfig);

        result = schainPrecedence(input);
        expect(result.global.source.schain).to.be.undefined;
      });
    });

    describe('bidder-specific schain config handling', function() {
      let input;
      
      beforeEach(function() {
        input = {
          global: {},
          bidder: {}
        };
        configGetConfigStub.returns(null);
        logInfoStub.reset();
      });
      
      it('should handle various bidder-specific schain scenarios', function() {
        const singleBidderConfig = {
          'bidderA': {
            schain: {
              config: SAMPLE_SCHAIN
            }
          }
        };
        configGetBidderConfigStub.returns(singleBidderConfig);

        let result = schainPrecedence(input);
        expect(result.bidder.bidderA.source.schain).to.deep.equal(SAMPLE_SCHAIN);
        expect(logInfoStub.calledWith('Applying bidder schain config for bidderA')).to.be.true;
        
        logInfoStub.reset();
        input = { global: {}, bidder: {} };
        
        const multiBidderConfig = {
          'bidderA': {
            schain: {
              config: SAMPLE_SCHAIN
            }
          },
          'bidderB': {
            schain: {
              config: SAMPLE_SCHAIN_2
            }
          },
          'bidderC': {
          }
        };
        configGetBidderConfigStub.returns(multiBidderConfig);

        result = schainPrecedence(input);
        expect(result.bidder.bidderA.source.schain).to.deep.equal(SAMPLE_SCHAIN);
        expect(result.bidder.bidderB.source.schain).to.deep.equal(SAMPLE_SCHAIN_2);
        expect(result.bidder.bidderC).to.be.undefined;
        expect(logInfoStub.calledWith('Applying bidder schain config for bidderA')).to.be.true;
        expect(logInfoStub.calledWith('Applying bidder schain config for bidderB')).to.be.true;
        
        logInfoStub.reset();
        input = { global: {}, bidder: {} };
        
        const invalidBidderConfig = {
          'bidderA': {
            schain: {
              validation: 'strict'
            }
          }
        };
        configGetBidderConfigStub.returns(invalidBidderConfig);

        result = schainPrecedence(input);
        expect(result.bidder.bidderA.source.schain).to.deep.equal({});
      });
    });

    // Test case: both global and bidder-specific schain configs
    it('should apply both global and bidder-specific schain configs', function() {
      const input = {
        global: {},
        bidder: {}
      };
      const globalSchainConfig = {
        config: {
          ver: '1.0',
          complete: 1,
          nodes: [{ asi: 'global.com', sid: '00001', hp: 1 }]
        }
      };
      const bidderConfigs = {
        'bidderA': {
          schain: {
            config: {
              ver: '1.0',
              complete: 1,
              nodes: [{ asi: 'bidderA.com', sid: '00001', hp: 1 }]
            }
          }
        }
      };
      configGetConfigStub.returns(globalSchainConfig);
      configGetBidderConfigStub.returns(bidderConfigs);

      const result = schainPrecedence(input);
      expect(result.global.source.schain).to.deep.equal(globalSchainConfig.config);
      expect(result.bidder.bidderA.source.schain).to.deep.equal(bidderConfigs.bidderA.schain.config);
    });
  });

  describe('moveSchainToExt', function() {
    it('should handle various input scenarios correctly', function() {
      expect(moveSchainToExt(null)).to.be.null;
      expect(moveSchainToExt(undefined)).to.be.undefined;
      
      const inputNoSource = { user: { id: '123' } };
      expect(moveSchainToExt(inputNoSource)).to.deep.equal(inputNoSource);
      
      const inputNoSchain = { source: { tid: '123' } };
      expect(moveSchainToExt(inputNoSchain)).to.deep.equal(inputNoSchain);
      
      const basicInput = {
        source: {
          tid: '123',
          schain: SAMPLE_SCHAIN
        }
      };
      let result = moveSchainToExt(basicInput);
      expect(result.source.schain).to.be.undefined;
      expect(result.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN);
      expect(result.source.tid).to.equal('123');
      
      const inputWithExt = {
        source: {
          tid: '123',
          schain: SAMPLE_SCHAIN,
          ext: {
            dchain: { ver: '1.0' }
          }
        }
      };
      result = moveSchainToExt(inputWithExt);
      expect(result.source.schain).to.be.undefined;
      expect(result.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN);
      expect(result.source.ext.dchain).to.deep.equal({ ver: '1.0' });
    });

    describe('bidderOrtb2 parameter handling', function() {
      const createFreshFpd = () => ({
        source: {
          tid: '123',
          schain: SAMPLE_SCHAIN
        }
      });
      
      it('should handle bidderOrtb2 parameter variations', function() {
        const bidderOrtb2WithSchain = {
          source: {
            schain: SAMPLE_SCHAIN_2
          }
        };
        
        let fpd = createFreshFpd();
        let result = moveSchainToExt(fpd, bidderOrtb2WithSchain);
        expect(result.source.schain).to.be.undefined;
        expect(result.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN_2);
        
        const bidderOrtb2WithoutSchain = {
          source: {}
        };
        
        fpd = createFreshFpd();
        result = moveSchainToExt(fpd, bidderOrtb2WithoutSchain);
        expect(result.source.schain).to.be.undefined;
        expect(result.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN);
        
        fpd = createFreshFpd();
        result = moveSchainToExt(fpd, null);
        expect(result.source.schain).to.be.undefined;
        expect(result.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN);
      });
    });
  });

  describe('Integration', function() {
    it('should handle the full schain workflow with both global and bidder configs', function() {
      const ortb2Fragments = {
        global: {
          source: {
            tid: '123'
          }
        },
        bidder: {
          'bidderA': {
            source: {}
          }
        }
      };
      
      configGetConfigStub.returns({ config: SAMPLE_SCHAIN });
      configGetBidderConfigStub.returns({
        'bidderA': {
          schain: {
            config: SAMPLE_SCHAIN_2
          }
        }
      });
      
      const updatedFragments = schainPrecedence(ortb2Fragments);
      
      expect(updatedFragments.global.source.schain).to.deep.equal(SAMPLE_SCHAIN);
      expect(updatedFragments.bidder.bidderA.source.schain).to.deep.equal(SAMPLE_SCHAIN_2);
      
      const merged = {
        source: {
          tid: '123',
          schain: SAMPLE_SCHAIN
        }
      };
      
      const bidderOrtb2 = {
        source: {
          schain: SAMPLE_SCHAIN_2
        }
      };
      
      const finalFpd = moveSchainToExt(merged, bidderOrtb2);
      
      expect(finalFpd.source.schain).to.be.undefined;
      expect(finalFpd.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN_2);
      expect(finalFpd.source.tid).to.equal('123');
    });
  });
});
