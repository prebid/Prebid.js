import { expect } from 'chai';
import sinon from 'sinon';
import { exchainPrebidModule } from 'modules/exchainAnalyticsAdapter';
import * as prebidGlobal from 'src/prebidGlobal';

describe('ExchainAnalyticsAdapter', function() {
  let sandbox;
  let mockPbjs;
  let eventListeners;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    eventListeners = {}; // Store event listeners

    mockPbjs = {
      onEvent: function(event, handler) {
        eventListeners[event] = handler;
      },
      triggerEvent: function(event, data) {
        if (eventListeners[event]) {
          eventListeners[event](data);
        }
      }
    };

    // Stub getGlobal to return the mockPbjs object
    sandbox.stub(prebidGlobal, 'getGlobal').returns(mockPbjs);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('Module name', function() {
    it('should be correctly set', function() {
      expect(exchainPrebidModule.name).to.equal('ExchainAnalyticsAdapter');
    });
  });

  describe('onBidCatch', function() {
    it('should add UUID to each bid', function() {
      const bids = [
        { ortb2Imp: { ext: {} } },
        { ortb2Imp: { ext: {} } }
      ];

      const generateUUIDStub = sandbox.stub(exchainPrebidModule, 'generateUUID').returns('test-uuid');

      exchainPrebidModule.onBidCatch(bids);

      expect(bids[0].ortb2Imp.ext.tid).to.equal('test-uuid');
      expect(bids[1].ortb2Imp.ext.tid).to.equal('test-uuid');
      expect(generateUUIDStub.calledTwice).to.be.true;
    });
  });

  describe('generateUUID', function() {
    it('should generate a valid UUIDv4', function() {
      const uuid = exchainPrebidModule.generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).to.match(uuidRegex);
    });

    it('should return undefined if crypto is not available', function() {
      const originalCrypto = global.crypto;
      delete global.crypto;

      const uuid = exchainPrebidModule.generateUUID();
      expect(uuid).to.be.undefined;

      global.crypto = originalCrypto;
    });
  });
});
