import type {AnyFunction, Wraps} from "./types/functions";
import {logInfo} from "./utils.js";

interface Command {
    (): any;
}

interface CommandQueue extends Omit<Command[], 'push'> {
    push(cmd: Command): void;
}

export interface PrebidJS {
    /**
     * Command queue. Use cmd.push(function F() { ... }) to queue F until Prebid has loaded.
     */
    cmd: CommandQueue,
    /**
     * Alias of `cmd`
     */
    que: CommandQueue
    /**
     * Names of all installed modules.
     */
    installedModules: string[]
}

// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object
declare const $$DEFINE_PREBID_GLOBAL$$: boolean;
const scope: any = !$$DEFINE_PREBID_GLOBAL$$ ? {} : window;
const global: PrebidJS = scope.$$PREBID_GLOBAL$$ = scope.$$PREBID_GLOBAL$$ || {};
global.cmd = global.cmd || [];
global.que = global.que || [];
global.installedModules = global.installedModules || []

// create a pbjs global pointer
if (scope === window) {
  scope._pbjsGlobals = scope._pbjsGlobals || [];
  scope._pbjsGlobals.push('$$PREBID_GLOBAL$$');
}

export function getGlobal() {
  return global;
}


function logInvocation<T extends AnyFunction>(name: string, fn: T): Wraps<T> {
    return function (...args) {
        logInfo(`Invoking $$PREBID_GLOBAL$$.${name}`, args);
        return fn.apply(this, args);
    }
}

export function addApiMethod<N extends keyof PrebidJS>(name: N, method: PrebidJS[N], log = true) {
    global[name] = log ? logInvocation(name, method) as PrebidJS[N] : method;
}

export function registerModule(name: string) {
  global.installedModules.push(name);
}
