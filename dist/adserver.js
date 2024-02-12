"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPPID = void 0;
var _hook = require("./hook.js");
/**
 * return the GAM PPID, if available (eid for the userID configured with `userSync.ppidSource`)
 */
const getPPID = exports.getPPID = (0, _hook.hook)('sync', () => undefined);