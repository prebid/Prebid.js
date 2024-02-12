"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTTL = getTTL;
exports.onTTLBufferChange = onTTLBufferChange;
var _config = require("./config.js");
var _utils = require("./utils.js");
let TTL_BUFFER = 1;
const listeners = [];
_config.config.getConfig('ttlBuffer', cfg => {
  if (typeof cfg.ttlBuffer === 'number') {
    const prev = TTL_BUFFER;
    TTL_BUFFER = cfg.ttlBuffer;
    if (prev !== TTL_BUFFER) {
      listeners.forEach(l => l(TTL_BUFFER));
    }
  } else {
    (0, _utils.logError)('Invalid value for ttlBuffer', cfg.ttlBuffer);
  }
});
function getTTL(bid) {
  return bid.ttl - (bid.hasOwnProperty('ttlBuffer') ? bid.ttlBuffer : TTL_BUFFER);
}
function onTTLBufferChange(listener) {
  listeners.push(listener);
}