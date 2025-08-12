import {GreedyPromise, greedySetTimeout} from '../../libraries/greedy/greedyPromise.js';
import {getGlobal} from '../prebidGlobal.js';

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

export const pbSetTimeout: typeof setTimeout = getGlobal().setTimeout ?? (FEATURES.GREEDY ? greedySetTimeout : setTimeout)
export const PbPromise: typeof Promise = getGlobal().Promise ?? (FEATURES.GREEDY ? GreedyPromise : Promise) as any;

export function delay(delayMs = 0): Promise<void> {
  return new PbPromise((resolve) => {
    pbSetTimeout(resolve, delayMs);
  });
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
export function defer<T>({promiseFactory = (resolver) => new PbPromise(resolver) as Promise<T>}: {
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
  }
}
