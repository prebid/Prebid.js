import funHooks from 'fun-hooks/no-eval/index.js';
import {defer} from './utils/promise.js';
import type {AnyFunction, Wraps} from "./types/functions.d.ts";
import type {AllExceptLast, Last} from "./types/tuples.d.ts";

export type Next<W extends AnyFunction> = {
    (...args: Parameters<W>): unknown;
    bail(result: ReturnType<W>): void;
}

export type HookFunction<W extends AnyFunction> = (next: Next<W>, ...args: Parameters<W>) => unknown;
export type BeforeHookParams<TYP extends HookType, FN extends AnyFunction> =
    TYP extends 'async'
        ? Last<Parameters<FN>> extends AnyFunction ? AllExceptLast<Parameters<FN>> : Parameters<FN>
        : Parameters<FN>;

export type HookType = 'sync' | 'async';

export type BeforeHook<TYP extends HookType, FN extends AnyFunction> = HookFunction<(...args: BeforeHookParams<TYP, FN>) => ReturnType<FN>>
export type AfterHook<FN extends AnyFunction> = HookFunction<(result: ReturnType<FN>) => ReturnType<FN>>;

export type Hookable<TYP extends HookType, FN extends AnyFunction> = Wraps<FN> & {
    before(beforeHook: BeforeHook<TYP, FN>, priority?: number): void;
    after(afterHook: AfterHook<FN>, priority?: number): void;
    getHooks(options?: { hook?: BeforeHook<TYP, FN> | AfterHook<FN> }): { length: number, remove(): void }
    removeAll(): void;
}

export interface NamedHooks {
    [name: string]: Hookable<HookType, AnyFunction>;
}

interface FunHooks {
    <TYP extends HookType, FN extends AnyFunction>(type: TYP, fn: FN, name?: string): Hookable<TYP, FN>;
    ready(): void;
    get<T extends keyof NamedHooks>(name: T): NamedHooks[T]
}

/**
 * NOTE: you must not call `next` asynchronously from 'sync' hooks
 * see https://github.com/snapwich/fun-hooks/issues/42
 */

export const hook: FunHooks = funHooks({
  ready: funHooks.SYNC | funHooks.ASYNC | funHooks.QUEUE
});

const readyCtl = defer<void>();
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
  const result = baseFn.getHooks({hook: hookFn});
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

export interface Submodules {
    [name: string]: unknown[]
}

export function submodule<N extends keyof Submodules>(name: N, ...args: Submodules[N]) {
  const install = submoduleInstallMap[name as any];
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

/**
 * 'async' hooks expect the last argument to be a callback, and have special treatment for it if it's a function;
 * which prevents it from being used as a normal argument in 'before' hooks - and presents a modified version of it
 * to the hooked function.
 *
 * This returns a wrapper around a given 'async' hook that works around this, for when the last argument
 * should be treated as a normal argument.
 */
export function ignoreCallbackArg<FN extends AnyFunction>(hook: Hookable<'async', FN>): Hookable<'async', (...args: [...Parameters<FN>, () => void]) => ReturnType<FN>> {
    return wrapHook(hook, function (...args) {
        args.push(function () {})
        return hook.apply(this, args);
    } as any) as any;
}
