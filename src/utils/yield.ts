import {getGlobal} from '../prebidGlobal.js';
import {PbPromise} from './promise.js';

export function pbYield(): Promise<void> {
  const scheduler = (getGlobal() as any).scheduler as { yield?: () => Promise<void> } | undefined;
  return scheduler?.yield ? scheduler.yield() : PbPromise.resolve();
}
