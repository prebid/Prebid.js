"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.activityParams = void 0;
var _adapterManager = _interopRequireDefault(require("../adapterManager.js"));
var _params = require("./params.js");
/**
 * Utility function for building common activity parameters - broken out to its own
 * file to avoid circular imports.
 */
const activityParams = exports.activityParams = (0, _params.activityParamsBuilder)(alias => _adapterManager.default.resolveAlias(alias));