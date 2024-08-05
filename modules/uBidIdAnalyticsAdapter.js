/**
 * This module adds UUID to bid
 * @module modules/uBidIdAnalyticsAdapter
 */
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_ANALYTICS } from '../src/activities/modules.js';

const MODULE_NAME = 'uBidId';

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_ANALYTICS,
  moduleName: MODULE_NAME,
});

const pbjs = window.pbjs || {
  que: [],
  onEvent: function() {}
}

export var uBidIdModule = {
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
   * @returns {string}
   */
  generateUUID: function() {
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      d += performance.now();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
};

submodule(MODULE_NAME, uBidIdModule);

pbjs.que.push(function() {
  pbjs.addModule(MODULE_NAME);
  uBidIdModule.onPbjsReady();
});
