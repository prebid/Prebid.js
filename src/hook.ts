import funHooks from 'fun-hooks/no-eval/index.js';
import {defer} from './utils/promise.js';
import type {AnyFunction, Wraps} from "./types/functions.d.ts";

interface Next<T extends AnyFunction> {
    bail(result: ReturnType<T>): void;
}
type BeforeNext<T extends AnyFunction> = Next<T> & Wraps<T>;
type AfterNext<T extends AnyFunction> = Next<T> & {
    (result: ReturnType<T>): void;
}
type BeforeHook<T extends AnyFunction> = (next: BeforeNext<T>, ...args: Parameters<T>) => ReturnType<T>;
type AfterHook<T extends AnyFunction> = (next: AfterNext<T>, result: ReturnType<T>) => ReturnType<T>;

export interface Hook<T extends AnyFunction> extends Wraps<T> {
    before(beforeHook: BeforeHook<T>, priority?: number): void;
    after(afterHook: AfterHook<T>, priority?: number): void;
    getHooks(options?: { hook?: BeforeHook<T> | AfterHook<T> }): { length: number, remove(): void }
    removeAll(): void;
}

export interface NamedHooks {
    [name: string]: AnyFunction;
}

interface FunHooks {
    <T extends AnyFunction>(type: 'sync' | 'async', fn: T, name?: string): Hook<T>;
    ready(): void;
    get<T extends keyof NamedHooks>(name: T): Hook<NamedHooks[T]>
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

export function setupBeforeHookFnOnce<T extends AnyFunction>(baseFn: Hook<T>, hookFn: BeforeHook<T>, priority = 15) {
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
export function wrapHook<T extends AnyFunction>(hook: Hook<T>, wrapper: T): Hook<T> {
  Object.defineProperties(
    wrapper,
    Object.fromEntries(['before', 'after', 'getHooks', 'removeAll'].map((m) => [m, {get: () => hook[m]}]))
  );
  return (wrapper as unknown) as Hook<T>;
}
