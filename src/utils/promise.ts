import { GreedyPromise, greedySetTimeout } from '../../libraries/greedy/greedyPromise.js';
import { getGlobal } from '../prebidGlobal.js';

declare module '../prebidGlobal' {
  interface PrebidJS {
    /**
     * The setTimeout implementation Prebid should use.
     */
    setTimeout?: typeof setTimeout;
    /**
     * The Promise constructor Prebid should use.
     */
    Promise?: typeof Promise
  }
}

export const pbSetTimeout: typeof setTimeout = getGlobal().setTimeout ?? (FEATURES.GREEDY ? greedySetTimeout : setTimeout);
export const PbPromise: typeof Promise = getGlobal().Promise ?? (FEATURES.GREEDY ? GreedyPromise : Promise) as any;

export function delay(delayMs = 0): Promise<void> {
  return new PbPromise((resolve) => {
    pbSetTimeout(resolve, delayMs);
  });
}

/**
 * Like `delay`, but asks for high priority scheduling, so that the continuation is dispatched ahead
 * of ordinary timers and network callbacks once the main thread frees up. Use this where a timeout
 * is meant to act as an upper bound: plain timers queue behind work that is already pending, which
 * on a busy page can put them arbitrarily far past their deadline.
 *
 * This is not a real time guarantee. Nothing in JS preempts a running task, so a single long task
 * still pushes the continuation past `delayMs`; what this bounds is the wait by the longest blocking
 * task rather than by the whole backlog of ready work.
 */
export function urgentDelay(delayMs = 0): Promise<void> {
  const scheduler = (window as any).scheduler;
  if (typeof scheduler?.postTask === 'function') {
    try {
      return PbPromise.resolve(
        scheduler.postTask(() => {}, { priority: 'user-blocking', delay: delayMs })
        // a task can only be aborted through a signal, which is not used here; resolve regardless so
        // that callers racing against this never stall on a rejection
      ).catch(() => {}) as Promise<void>;
    } catch (e) {
      // options rejected by this implementation of postTask; fall back to a timer
    }
  }
  return delay(delayMs);
}

export interface Defer<T> {
  promise: Promise<T>;
  resolve: Parameters<ConstructorParameters<typeof Promise<T>>[0]>[0],
  reject: Parameters<ConstructorParameters<typeof Promise<T>>[0]>[1],
}

export type UnwrapPromise<T> = T extends PromiseLike<infer R> ? R : T;
export type ToPromise<T> = Promise<UnwrapPromise<T>>;

/**
 * @returns a {promise, resolve, reject} trio where `promise` is resolved by calling `resolve` or `reject`.
 */
export function defer<T>({ promiseFactory = (resolver) => new PbPromise(resolver) as Promise<T> }: {
  promiseFactory?: (...args: ConstructorParameters<typeof Promise<T>>) => Promise<T>
} = {}): Defer<T> {
  function invoker(delegate) {
    return (val) => delegate(val);
  }

  let resolveFn, rejectFn;

  return {
    promise: promiseFactory((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    }),
    resolve: invoker(resolveFn),
    reject: invoker(rejectFn)
  };
}
