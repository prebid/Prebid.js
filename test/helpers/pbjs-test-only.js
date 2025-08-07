import {getGlobal} from '../../src/prebidGlobal.js';

export const pbjsTestOnly = {

  getAdUnits() {
    return getGlobal().adUnits;
  },

  clearAllAdUnits() {
    getGlobal().adUnits = [];
  }
};
