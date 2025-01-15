// test/spec/bidderSettings_currency_spec.js
import { JSON_MAPPING } from '../../../../src/constants.js';
import { expect } from 'chai/index.js';
import {bidderSettings} from '../../../../src/bidderSettings.js';
import {config} from '../../../../src/config.js';
import { getGlobal } from '../../../../src/prebidGlobal';
import { adjustBids } from '../../../../src/auction.js';

describe('Bidder Settings Currency Adjustment', function() {
  let bid;
  let sandbox;

  beforeEach(function() {
    bid = {
      bidderCode: 'appnexus',
      cpm: 1.5,
      currency: 'USD'
    };

    // Reset pbjs global object
    window.pbjs = getGlobal();
    window.pbjs.bidderSettings = {};

    // Set default currency config
    config.setConfig({
      currency: {
        adServerCurrency: 'EUR'
      }
    });
  });

  afterEach(function() {
    config.resetConfig();
  });

  describe('currency adjustment setting', function() {
    it('should respect bidder-specific currency adjustment setting', function() {
      // Setup
      window.pbjs.bidderSettings = {
        appnexus: {
          [JSON_MAPPING.CURRENCY_ADJUST]: true
        }
      };

      // Execute
      adjustBids(bid);

      // Assert
      expect(bid.currency).to.equal('EUR');
    });

    it('should use standard setting when bidder-specific not defined', function() {
      // Setup
      window.pbjs.bidderSettings = {
        standard: {
          [JSON_MAPPING.CURRENCY_ADJUST]: true
        }
      };

      // Execute
      adjustBids(bid);

      // Assert
      expect(bid.currency).to.equal('EUR');
    });

    it('should not adjust currency when setting is false', function() {
      // Setup
      window.pbjs.bidderSettings = {
        appnexus: {
          [JSON_MAPPING.CURRENCY_ADJUST]: false
        }
      };

      // Execute
      adjustBids(bid);

      // Assert
      expect(bid.currency).to.equal('USD');
    });

    it('should not adjust currency when setting is undefined', function() {
      // Setup - no settings defined

      // Execute
      adjustBids(bid);

      // Assert
      expect(bid.currency).to.equal('USD');
    });
  });
});