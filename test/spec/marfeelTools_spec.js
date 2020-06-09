/*
 * Copyright (c) 2020 by Marfeel Solutions (http://www.marfeel.com)
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Marfeel Solutions S.L and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Marfeel Solutions S.L and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Marfeel Solutions SL.
 */

import { isBidSizeAllowed, getAllowedSizes, isBidAllowed } from './marfeelTools.js';
import { auctionManager } from './auctionManager.js';

describe('marfeelTools', function () {
  describe('isBidSizeAllowed', function() {
    it('filter bids within the proper sizes', function () {
      const bidsToFilter = [{
        height: 100,
        width: 200
      }, {
        height: 200,
        width: 300
      }, {
        height: 100,
        width: 50
      }, {
        height: 200,
        width: 200
      }];
      const sizesToFilter = [[100, 200], [200, 200]];
      const bidsFiltered = bidsToFilter.filter(bid => isBidSizeAllowed(bid, sizesToFilter));

      assert.deepEqual(bidsFiltered, [{
        height: 100,
        width: 200
      }, {
        height: 200,
        width: 200
      }])
    });
  });
  describe('getAllowedSizes', function() {
    it('adds 1x1 to allowed sizes if 300x250 is present', function() {
      const currentSizes = [[100, 100], [300, 150], [300, 250]];
      const fakeGetAdUnits = () => [{
        mediaTypes: {
          banner: {
            sizes: currentSizes
          }
        }
      }];
      sinon.replace(auctionManager, 'getAdUnits', fakeGetAdUnits);
      const expectedSizes = [[100, 100], [300, 150], [300, 250], [1, 1]];

      assert.deepEqual(getAllowedSizes(), expectedSizes);
    });

    it('does not add 1x1 to allowed sizes if 300x250 is not present', function() {
      const currentSizes = [[100, 100], [300, 150]];
      const fakeGetAdUnits = () => [{
        mediaTypes: {
          banner: {
            sizes: currentSizes
          }
        }
      }];
      sinon.replace(auctionManager, 'getAdUnits', fakeGetAdUnits);
      const expectedSizes = [[100, 100], [300, 150]];

      assert.deepEqual(getAllowedSizes(), expectedSizes);
    });
  });
  describe('isBidAllowed', function() {
    it('returns false with disallowed Bid', function() {
      const disAllowedBid = {
        adserverTargeting:
        {
          hb_bidder: 'teads',
          hb_cached: true
        }
      };

      assert.deepEqual(isBidAllowed(disAllowedBid), false);
    });

    it('returns true with allowed Bid', function() {
      const allowedBid1 = {
        adserverTargeting:
        {
          hb_bidder: 'teads',
          hb_cached: false
        }
      };

      const allowedBid2 = {
        adserverTargeting:
        {
          hb_bidder: 'rubicon',
          hb_cached: true
        }
      };
      assert.deepEqual(isBidAllowed(allowedBid1), true);
      assert.deepEqual(isBidAllowed(allowedBid2), true);
    });
  });
});
