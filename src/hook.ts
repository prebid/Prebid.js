import funHooks from 'fun-hooks/no-eval/index.js';
import {defer} from './utils/promise.js';
import type {AnyFunction, Wraps} from "./types/functions.d.ts";
import type {AllExceptLast, Last} from "./types/tuples.d.ts";

export type Next<W extends AnyFunction> = {
    (...args: Parameters<W>): unknown;
    bail(result: ReturnType<W>): void;
}

export type HookFunction<W extends AnyFunction> = (next: Next<W>, ...args: Parameters<W>) => unknown;

type RemoveLastParam<T extends AnyFunction> = (...args: AllExceptLast<Parameters<T>>) => ReturnType<T>;
export type HookType = 'sync' | 'async';

type SyncBeforeHook<T extends AnyFunction> = HookFunction<T>;
type AsyncBeforeHook<T extends AnyFunction> = Last<Parameters<T>> extends AnyFunction ? HookFunction<RemoveLastParam<T>> : HookFunction<T>;
export type BeforeHook<TYP extends HookType, FN extends AnyFunction> = TYP extends 'async' ? AsyncBeforeHook<FN> : SyncBeforeHook<FN>;
export type AfterHook<FN extends AnyFunction> = HookFunction<(result: ReturnType<FN>) => ReturnType<FN>>;

export type Hookable<TYP extends HookType, FN extends AnyFunction> = Wraps<FN> & {
    before(beforeHook: BeforeHook<TYP, FN>, priority?: number): void;
    after(afterHook: AfterHook<FN>, priority?: number): void;
    getHooks(options?: { hook?: BeforeHook<TYP, FN> | AfterHook<FN> }): { length: number, remove(): void }
    removeAll(): void;
}

export interface NamedHooks {
    [name: string]: {
        type: HookType,
        fn: AnyFunction
    }
}

interface FunHooks {
    <TYP extends HookType, FN extends AnyFunction>(type: TYP, fn: FN, name?: string): Hookable<TYP, FN>;
    ready(): void;
    get<T extends keyof NamedHooks>(name: T): Hookable<NamedHooks[T]['type'], NamedHooks[T]['fn']>
}

export let hook: FunHooks = funHooks({
  ready: funHooks.SYNC | funHooks.ASYNC | funHooks.QUEUE
});

const readyCtl = defer();
hook.ready = (() => {
  const ready = hook.ready;
  return function () {
    try {
      return ready.apply(hook);
    } finally {
      readyCtl.resolve();
    }
  }
})();

/**
 * A promise that resolves when hooks are ready.
 * @type {Promise}
 */
export const ready: Promise<void> = readyCtl.promise;

export const getHook = hook.get;

export function setupBeforeHookFnOnce<TYP extends HookType, FN extends AnyFunction>(baseFn: Hookable<TYP, FN>, hookFn: BeforeHook<TYP, FN>, priority = 15) {
  let result = baseFn.getHooks({hook: hookFn});
  if (result.length === 0) {
    baseFn.before(hookFn, priority);
  }
}
const submoduleInstallMap = {};

export function module(name, install, {postInstallAllowed = false} = {}) {
  hook('async', function (submodules) {
    submodules.forEach(args => install(...args));
    if (postInstallAllowed) submoduleInstallMap[name] = install;
  }, name)([]); // will be queued until hook.ready() called in pbjs.processQueue();
}

export function submodule(name, ...args) {
  const install = submoduleInstallMap[name];
  if (install) return install(...args);
  getHook(name).before((next, modules) => {
    modules.push(args);
    next(modules);
  });
}

/**
 * Copy hook methods (.before, .after, etc) from a given hook to a given wrapper object.
 */
export function wrapHook<TYP extends HookType, FN extends AnyFunction>(hook: Hookable<TYP, FN>, wrapper: FN): Hookable<TYP, FN> {
  Object.defineProperties(
    wrapper,
    Object.fromEntries(['before', 'after', 'getHooks', 'removeAll'].map((m) => [m, {get: () => hook[m]}]))
  );
  return (wrapper as unknown) as Hookable<TYP, FN>;
}
