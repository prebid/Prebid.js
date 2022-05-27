export const pbjsTestOnly = {

  getAdUnits() {
    return $$PREBID_GLOBAL$$.adUnits;
  },

  clearAllAdUnits() {
    $$PREBID_GLOBAL$$.adUnits = [];
  }
};
