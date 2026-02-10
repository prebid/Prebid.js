import {PbPromise} from "./promise.ts";

declare module '../prebidGlobal' {
  interface PrebidJS {
    /**
     * Enable yielding of the main thread.
     */
    yield?: boolean;
  }
}

function doYield() {
  const scheduler = (window as any).scheduler;
  return typeof scheduler?.yield === 'function' ? scheduler.yield() : PbPromise.resolve()
}

/**
 * Runs `cb`, after yielding the main thread if `shouldYield` returns true.
 */
export function pbYield(shouldYield: () => boolean, cb: () => void) {
  if (shouldYield()) {
    doYield().then(cb);
  } else {
    cb();
  }
}

/**
 * Returns a wrapper around `fn` that yields the main thread if `shouldYield` returns true.
 */
export function yieldsIf<T extends (...args: any[]) => void>(shouldYield: () => boolean, fn: T): (...args: Parameters<T>) => void {
  return function (...args) {
    pbYield(shouldYield, () => {
      fn.apply(this, args);
    })
  }
}

/**
 * Runs each function in `fns`, yielding the main thread in between each one if `shouldYield` returns true.
 * Runs `cb` after all functions have been run.
 */
export function yieldAll(shouldYield: () => boolean, fns: (() => void)[], cb?: () => void) {
  serialize(fns.map(fn => (cb) => {
    pbYield(shouldYield, () => {
      fn();
      cb();
    })
  }), cb);
}

export function serialize(fns: ((cb: () => void) => void)[], cb?: () => void) {
  let i = 0;
  function next() {
    if (fns.length > i) {
      i += 1;
      fns[i - 1](next);
    } else if (typeof cb === 'function') {
      cb();
    }
  }
  next();
}
