import {getGlobal} from '../prebidGlobal.js';
import {PbPromise} from './promise.js';

export function pbYield(): Promise<void> {
  const scheduler = getGlobal().scheduler ?? (window as any).scheduler;
  return scheduler?.yield ? scheduler.yield() : PbPromise.resolve();
}
