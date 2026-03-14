import {config} from './config.js';
import {logError} from './utils.js';
import {BID_STATUS} from './constants.js';
const CACHE_TTL_SETTING = 'minBidCacheTTL';
const MIN_WINNING_BID_CACHE_TTL_SETTING = 'minWinningBidCacheTTL';
let TTL_BUFFER = 1;
let minCacheTTL = null;
let minWinningBidCacheTTL = null;
const listeners = [];

declare module './config' {
  interface Config {
    /**
     * TTL buffer in seconds.
     *
     * When an adapter bids, it provides a TTL (time-to-live); the bid is considered expired and unusuable after that time has elapsed.
     * Core subtracts from it a buffer (default 1 second) that is, a bid with TTL of 30 seconds is considered expired after 29 seconds.
     */
    ttlBuffer?: number;
    /**
     * When set, bids are only kept in memory for the duration of their actual TTL lifetime or the value of minBidCacheTTL, whichever is greater.
     * Setting minBidCacheTTL: 0 causes bids to be dropped as soon as they expire.
     *
     * If unset (the default), bids are kept for the lifetime of the page.
     */
    [CACHE_TTL_SETTING]?: number;
    /**
     * When set, overrides minBidCacheTTL for bids that have had targeting set (e.g. winning bids sent to the ad server).
     * Useful with GPT lazy load when the scroll milestone for render may take a long time.
     * If unset, minBidCacheTTL applies to all bids. Setting to Infinity keeps winning bids indefinitely.
     */
    [MIN_WINNING_BID_CACHE_TTL_SETTING]?: number;
  }
}

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

export function getMinWinningBidCacheTTL() {
  return minWinningBidCacheTTL;
}

/**
 * Returns the effective minimum cache TTL in seconds for a bid.
 * When minWinningBidCacheTTL is set and the bid has had targeting set, uses that;
 * otherwise uses minBidCacheTTL. Returns null if no minimum applies (bid kept for page lifetime).
 */
export function getEffectiveMinBidCacheTTL(bid) {
  const baseTTL = minCacheTTL;
  if (baseTTL == null && minWinningBidCacheTTL == null) {
    return null;
  }
  if (bid?.status === BID_STATUS.BID_TARGETING_SET && typeof minWinningBidCacheTTL === 'number') {
    return minWinningBidCacheTTL;
  }
  return baseTTL;
}

function notifyCacheTTLChange() {
  listeners.forEach(l => l(minCacheTTL));
}

config.getConfig(CACHE_TTL_SETTING, (cfg) => {
  const prev = minCacheTTL;
  minCacheTTL = cfg?.[CACHE_TTL_SETTING];
  minCacheTTL = typeof minCacheTTL === 'number' ? minCacheTTL : null;
  if (prev !== minCacheTTL) {
    notifyCacheTTLChange();
  }
});

config.getConfig(MIN_WINNING_BID_CACHE_TTL_SETTING, (cfg) => {
  const prev = minWinningBidCacheTTL;
  minWinningBidCacheTTL = cfg?.[MIN_WINNING_BID_CACHE_TTL_SETTING];
  minWinningBidCacheTTL = typeof minWinningBidCacheTTL === 'number' ? minWinningBidCacheTTL : null;
  if (prev !== minWinningBidCacheTTL) {
    notifyCacheTTLChange();
  }
});

export function onMinBidCacheTTLChange(listener) {
  listeners.push(listener);
}
