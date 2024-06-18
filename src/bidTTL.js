import {config} from './config.js';
import {logError} from './utils.js';
let TTL_BUFFER = 1;

const listeners = [];

config.getConfig('ttlBuffer', (cfg) => {
  if (typeof cfg.ttlBuffer === 'number') {
    const prev = TTL_BUFFER;
    TTL_BUFFER = cfg.ttlBuffer;
    if (prev !== TTL_BUFFER) {
      listeners.forEach(l => l(TTL_BUFFER))
    }
  } else {
    logError('Invalid value for ttlBuffer', cfg.ttlBuffer);
  }
})

export function getTTL(bid) {
  return bid.ttl - (bid.hasOwnProperty('ttlBuffer') ? bid.ttlBuffer : TTL_BUFFER);
}

export function onTTLBufferChange(listener) {
  listeners.push(listener);
}
