import {getGlobal} from '../prebidGlobal.js';
import {PbPromise} from './promise.js';

export function pbYield() {
  const scheduler = getGlobal().scheduler;
  return scheduler?.yield ? scheduler.yield() : PbPromise.resolve();
}
