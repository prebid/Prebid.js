import {expect} from 'chai/index.js';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import {applySchainConfig} from 'modules/schain.js';

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
  let logWarnStub;
  let configGetConfigStub;
  let configGetBidderConfigStub;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    logWarnStub = sandbox.stub(utils, 'logWarn');
    configGetConfigStub = sandbox.stub(config, 'getConfig');
    configGetBidderConfigStub = sandbox.stub(config, 'getBidderConfig');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('applySchainConfig', function() {
    describe('preserves existing schain values', function() {
      it('should preserve existing global.source.schain', function() {
        const existingSchain = {
          ver: '1.0',
          complete: 1,
          nodes: [{ asi: 'existing.com', sid: '99999', hp: 1 }]
        };

        const input = {
          global: {
            source: {
              schain: existingSchain
            }
          }
        };

        const schainConfig = {
          config: SAMPLE_SCHAIN
        };

        configGetConfigStub.returns(schainConfig);
        configGetBidderConfigStub.returns(null);

        const result = applySchainConfig(input);

        expect(result.global.source.schain).to.deep.equal(existingSchain);
        expect(result.global.source.schain).to.not.deep.equal(SAMPLE_SCHAIN);
        sinon.assert.called(logWarnStub);
      });

      it('should preserve existing bidder-specific schain ', function() {
        const existingBidderSchain = {
          ver: '3.0',
          complete: 1,
          nodes: [{ asi: 'existingbidder.com', sid: '88888', hp: 1 }]
        };

        const input = {
          bidder: {
            'bidderA': {
              source: {
                schain: existingBidderSchain
              }
            }
          }
        };

        const bidderConfigs = {
          'bidderA': {
            schain: {
              config: SAMPLE_SCHAIN
            }
          }
        };

        configGetConfigStub.returns(null);
        configGetBidderConfigStub.returns(bidderConfigs);

        const result = applySchainConfig(input);

        expect(result.bidder.bidderA.source.schain).to.deep.equal(existingBidderSchain);
        expect(result.bidder.bidderA.source.schain).to.not.deep.equal(SAMPLE_SCHAIN);
        sinon.assert.called(logWarnStub);
      });
    });

    describe('handles edge cases', function() {
      it('should handle edge cases and no-op scenarios', function() {
        expect(applySchainConfig(null)).to.be.null;
        expect(applySchainConfig(undefined)).to.be.undefined;
        expect(applySchainConfig({})).to.deep.equal({});

        const input = {
          global: {
            source: {
              tid: '123'
            }
          }
        };
        configGetConfigStub.returns(null);
        configGetBidderConfigStub.returns(null);

        const result = applySchainConfig(input);
        expect(result).to.deep.equal(input);
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

        let result = applySchainConfig(input);
        expect(result.global.source.schain).to.deep.equal(SAMPLE_SCHAIN);

        logWarnStub.reset();
        input = { global: { source: {} } };

        const invalidSchainConfig = {
          validation: 'strict'
        };
        configGetConfigStub.returns(invalidSchainConfig);

        result = applySchainConfig(input);
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
        logWarnStub.reset();
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

        let result = applySchainConfig(input);
        expect(result.bidder.bidderA.source.schain).to.deep.equal(SAMPLE_SCHAIN);

        logWarnStub.reset();
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

        result = applySchainConfig(input);
        expect(result.bidder.bidderA.source.schain).to.deep.equal(SAMPLE_SCHAIN);
        expect(result.bidder.bidderB.source.schain).to.deep.equal(SAMPLE_SCHAIN_2);
        expect(result.bidder.bidderC).to.be.undefined;
        input = { global: {}, bidder: {} };

        const invalidBidderConfig = {
          'bidderA': {
            schain: {
              validation: 'strict'
            }
          }
        };
        configGetBidderConfigStub.returns(invalidBidderConfig);

        result = applySchainConfig(input);
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

      const result = applySchainConfig(input);
      expect(result.global.source.schain).to.deep.equal(globalSchainConfig.config);
      expect(result.bidder.bidderA.source.schain).to.deep.equal(bidderConfigs.bidderA.schain.config);
    });
  });
});
