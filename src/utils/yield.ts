import {getGlobal} from '../prebidGlobal.js';
import {PbPromise} from './promise.js';

// This util was added by a codex bot.
export function pbYield(): Promise<void> {
  const scheduler = (getGlobal() as any).scheduler as { yield?: () => Promise<void> } | undefined;
  return scheduler?.yield ? scheduler.yield() : PbPromise.resolve();
}
