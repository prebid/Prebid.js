var CONSTANTS = require('src/constants.json');


export const pbjsTestOnly = {

  getAdUnits() {
    var pbjs = window[CONSTANTS.PBJS_GLOBAL_VAR_NAME];
    return pbjs.adUnits;
  },

  clearAllAdUnits() {
    var pbjs = window[CONSTANTS.PBJS_GLOBAL_VAR_NAME];
    pbjs.adUnits = [];
  }
};
