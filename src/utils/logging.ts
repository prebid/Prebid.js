import { config } from "../config.ts";
import { debugTurnedOn } from "./debug.ts";
import { EVENTS } from "../constants.ts";
import type { emit } from '../events.ts';

const LEVELS = {
  'log': 'MESSAGE',
  'info': 'INFO',
  'warn': 'WARNING',
  'error': 'ERROR'
} as const;

export type DebugEvent = {
  type: 'WARNING' | 'ERROR',
  arguments: any[]
};

declare module '../events' {
  interface Events {
    /**
     * Fired when a warning or error message is logged.
     */
    [EVENTS.AUCTION_DEBUG]: [DebugEvent]
  }
}

let eventEmitter;

export function _setEventEmitter(emitFn) {
  // called from events.js - this hoop is to avoid circular imports
  eventEmitter = emitFn;
}

const emitEvent: typeof emit = (event, ...args) => {
  if (eventEmitter != null) {
    eventEmitter(event, ...args);
  }
};

function makeLogger<L extends keyof typeof LEVELS>(level: L, emit = false): (typeof console)[L] {
  const logFn = window.console?.[level];
  const prefix = `${LEVELS[level]}:`;
  return function(...args) {
    if (typeof logFn === 'function' && debugTurnedOn()) {
      logFn.apply(console, decorateLog(args, prefix));
    }
    if (emit) {
      emitEvent(EVENTS.AUCTION_DEBUG, { type: LEVELS[level] as DebugEvent['type'], arguments: args });
    }
  };
}
/**
 * Wrappers to console.(log | info | warn | error). Takes N arguments, the same as the native methods
 */
export const logMessage = makeLogger('log');
export const logInfo = makeLogger('info');
export const logWarn = makeLogger('warn', true);
export const logError = makeLogger('error', true);

export type Logger = {
  [K in 'logMessage' | 'logWarn' | 'logError' | 'logInfo']: typeof console.log
};

export function prefixLog(prefix: string): Logger {
  function decorate(fn) {
    return function (...args) {
      fn(prefix, ...args);
    };
  }
  return {
    logError: decorate(logError),
    logWarn: decorate(logWarn),
    logMessage: decorate(logMessage),
    logInfo: decorate(logInfo),
  };
}

function decorateLog(args, prefix) {
  args = [].slice.call(args);
  const bidder = config.getCurrentBidder();

  prefix && args.unshift(prefix);
  if (bidder) {
    args.unshift(label('#aaa'));
  }
  args.unshift(label('#3b88c3'));
  args.unshift('%cPrebid' + (bidder ? `%c${bidder}` : ''));
  return args;

  function label(color) {
    return `display: inline-block; color: #fff; background: ${color}; padding: 1px 4px; border-radius: 3px;`;
  }
}
