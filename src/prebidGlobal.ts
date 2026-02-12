import {getGlobalVarName, shouldDefineGlobal} from "./buildOptions.ts";

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

// if the global already exists in global document scope, use it, if not, create the object
const scope: any = !shouldDefineGlobal() ? {} : window;
const global: PrebidJS = scope[getGlobalVarName()] = scope[getGlobalVarName()] || {};
global.cmd = global.cmd || [];
global.que = global.que || [];
global.installedModules = global.installedModules || []

// create a pbjs global pointer
if (scope === window) {
  scope._pbjsGlobals = scope._pbjsGlobals || [];
  scope._pbjsGlobals.push(getGlobalVarName());
}

export function getGlobal() {
  return global;
}

export function registerModule(name: string) {
  global.installedModules.push(name);
}
