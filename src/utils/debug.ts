import { config } from "../config.ts";

export function debugTurnedOn(): boolean {
  return !!config.getConfig('debug');
}
