"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CLIENT_SECTIONS = void 0;
exports.clientSectionChecker = clientSectionChecker;
exports.hasSection = hasSection;
var _utils = require("../utils.js");
// mutually exclusive ORTB sections in order of priority - 'dooh' beats 'app' & 'site' and 'app' beats 'site';
// if one is set, the others will be removed
const CLIENT_SECTIONS = exports.CLIENT_SECTIONS = ['dooh', 'app', 'site'];
function clientSectionChecker(logPrefix) {
  return function onlyOneClientSection(ortb2) {
    CLIENT_SECTIONS.reduce((found, section) => {
      if (hasSection(ortb2, section)) {
        if (found != null) {
          (0, _utils.logWarn)("".concat(logPrefix, " specifies both '").concat(found, "' and '").concat(section, "'; dropping the latter."));
          delete ortb2[section];
        } else {
          found = section;
        }
      }
      return found;
    }, null);
    return ortb2;
  };
}
function hasSection(ortb2, section) {
  return ortb2[section] != null && Object.keys(ortb2[section]).length > 0;
}