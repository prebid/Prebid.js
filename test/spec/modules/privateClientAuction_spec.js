import { expect } from 'chai';

import * as utils from 'src/utils.js';
import { config } from 'src/config.js';

import { renderAdHook, handleSetFledgeConfig } from 'modules/privateClientAuction/index.js';

describe('privateClientAuctionModule:', function () {
  beforeEach(function() {
    /*
    sandbox = sinon.sandbox.create();
    sandbox.stub(Date, 'now').returns(1);
    sandbox.stub(document, 'getElementById').withArgs('div-id').returns(element);
    */
  });

  afterEach(function() {
    // sandbox.restore();
  });

  describe('renderAdHook:', function() {
    context('no config', function() {
      it('hook is a noop when there is no privateClientAuction config', function() {
        let hookedFunctionCalled = false;
        renderAdHook(() => hookedFunctionCalled = true);
        expect(hookedFunctionCalled).to.be.true;
      });
    });

    context('with config', function() {
      it('hook is a noop when module is enabled but fledge is not available', function() {
        let hookedFunctionCalled = false;

        let config = {
          enabled: true,
          supportedAuctionTypes: ['fledge'],
          auctionConfig: {}
        };
        handleSetFledgeConfig(config);

        renderAdHook(() => hookedFunctionCalled = true);

        expect(hookedFunctionCalled).to.be.true;
      });

      it('hook is a called when module is enabled and fledge is available', function() {
        let hookedFunctionCalled = false;

        navigator.runAdAuction = () => new Promise();

        let config = {
          enabled: true,
          supportedAuctionTypes: ['fledge'],
          auctionConfig: {}
        };
        handleSetFledgeConfig(config);

        renderAdHook(() => hookedFunctionCalled = true, null, 1, {});

        expect(hookedFunctionCalled).to.be.false;
      });
    });
  });
});
