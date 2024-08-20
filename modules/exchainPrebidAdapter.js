/**
 * This module adds UUID to bid
 * @module modules/exchainPrebidAdapter
 */
import adapterManager from '../src/adapterManager.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_ANALYTICS } from '../src/activities/modules.js';

const MODULE_NAME = 'ExchainPrebid';
const EXCHAIN_PREBID_GVL_ID = 6969

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_ANALYTICS,
  moduleName: MODULE_NAME,
});

const pbjs = window.pbjs || {
  que: [],
  onEvent: function() { }
}

export var exchainPrebidModule = {
  /**
   * Used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Binds onBidCatch methods on beforeRequestBids event
   */
  onPbjsReady: function() {
    pbjs.onEvent('beforeRequestBids', this.onBidCatch.bind(this));
  },

  /**
   * Adds UUID to bid
   */
  onBidCatch: function(bids) {
    bids.forEach(bid => {
      bid.ortb2Imp.ext.data.creativeUUID = this.generateUUID();
    });
  },

  /**
   * Generates UUID
   * @returns {string | undefined}
   */
  generateUUID: function() {
    // Use crypto for secure random numbers
    // Works in most browsers
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);

      // Set the version to 4 (UUIDv4)
      arr[6] = (arr[6] & 0x0f) | 0x40;
      // Set the variant to RFC 4122
      arr[8] = (arr[8] & 0x3f) | 0x80;

      // Convert array to hexadecimal string format
      return [...arr].map((b, i) => {
        const hex = b.toString(16).padStart(2, '0');
        if (i === 4 || i === 6 || i === 8 || i === 10) return '-' + hex;
        return hex;
      }).join('');
    }
  }
};

adapterManager.registerAnalyticsAdapter({
  adapter: exchainPrebidModule,
  code: 'exchainPrebid',
  gvlid: EXCHAIN_PREBID_GVL_ID
});

pbjs.que.push(function() {
  pbjs.addModule(MODULE_NAME);
  exchainPrebidModule.onPbjsReady();
});
