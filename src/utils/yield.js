import {PbPromise} from './promise.js';

export function pbYield() {
  return scheduler?.yield ? scheduler.yield() : PbPromise.resolve();
}
