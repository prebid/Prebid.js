import {config} from './config.js';
import {logError} from './utils.js';
const CACHE_TTL_SETTING = 'minBidCacheTTL';
let TTL_BUFFER = 1;
let minCacheTTL = null;
const listeners = [];

config.getConfig('ttlBuffer', (cfg) => {
  if (typeof cfg.ttlBuffer === 'number') {
    TTL_BUFFER = cfg.ttlBuffer;
  } else {
    logError('Invalid value for ttlBuffer', cfg.ttlBuffer);
  }
})

export function getBufferedTTL(bid) {
  return bid.ttl - (bid.hasOwnProperty('ttlBuffer') ? bid.ttlBuffer : TTL_BUFFER);
}

export function getMinBidCacheTTL() {
  return minCacheTTL;
}

config.getConfig(CACHE_TTL_SETTING, (cfg) => {
  const prev = minCacheTTL;
  minCacheTTL = cfg?.[CACHE_TTL_SETTING];
  minCacheTTL = typeof minCacheTTL === 'number' ? minCacheTTL : null;
  if (prev !== minCacheTTL) {
    listeners.forEach(l => l(minCacheTTL))
  }
})

export function onMinBidCacheTTLChange(listener) {
  listeners.push(listener);
}
