import funHooks from 'fun-hooks/no-eval/index.js';
import {defer} from './utils/promise.js';
import type {AnyFunction, Wraps} from "./types/functions.d.ts";
import type {AllExceptLast, Last} from "./types/tuples.d.ts";

interface Next<T extends AnyFunction> {
    bail(result: ReturnType<T>): void;
}
type BeforeNext<T extends AnyFunction> = Next<T> & ((...args: Parameters<T>) => unknown);
type AfterNext<T extends AnyFunction> = Next<T> & {
    (result: ReturnType<T>): unknown;
}
type RemoveLastParam<T extends AnyFunction> = (...args: AllExceptLast<Parameters<T>>) => ReturnType<T>;
type AllParamsHook<T extends AnyFunction> = (next: BeforeNext<T>, ...args: Parameters<T>) => unknown;
type AllExceptLastHook<T extends AnyFunction> = (next: BeforeNext<RemoveLastParam<T>>, ...args: AllExceptLast<Parameters<T>>) => unknown;

type HookType = 'sync' | 'async';

type SyncBeforeHook<T extends AnyFunction> = AllParamsHook<T>;
type AsyncBeforeHook<T extends AnyFunction> = Last<Parameters<T>> extends AnyFunction ? AllExceptLastHook<T> : AllParamsHook<T>;
type BeforeHook<TYP extends HookType, FN extends AnyFunction> = TYP extends 'async' ? AsyncBeforeHook<FN> : SyncBeforeHook<FN>;
type AfterHook<T extends AnyFunction> = (next: AfterNext<T>, result: ReturnType<T>) => unknown;

export type Hook<TYP extends HookType, FN extends AnyFunction> = Wraps<FN> & {
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
    <TYP extends HookType, FN extends AnyFunction>(type: TYP, fn: FN, name?: string): Hook<TYP, FN>;
    ready(): void;
    get<T extends keyof NamedHooks>(name: T): Hook<NamedHooks[T]['type'], NamedHooks[T]['fn']>
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

export function setupBeforeHookFnOnce<TYP extends HookType, FN extends AnyFunction>(baseFn: Hook<TYP, FN>, hookFn: BeforeHook<TYP, FN>, priority = 15) {
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
export function wrapHook<TYP extends HookType, FN extends AnyFunction>(hook: Hook<TYP, FN>, wrapper: FN): Hook<TYP, FN> {
  Object.defineProperties(
    wrapper,
    Object.fromEntries(['before', 'after', 'getHooks', 'removeAll'].map((m) => [m, {get: () => hook[m]}]))
  );
  return (wrapper as unknown) as Hook<TYP, FN>;
}
