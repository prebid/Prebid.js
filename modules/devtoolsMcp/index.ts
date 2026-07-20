/* eslint prebid/validate-imports: 0 */

import { auctionManager } from '../../src/auctionManager.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import { getBufferedTTL, getEffectiveMinBidCacheTTL, getMinBidCacheTTL, getMinTargetedBidCacheTTL } from '../../src/bidTTL.js';
import { isBidUsable } from '../../src/targeting/filters.js';
import { getGlobalVarName } from '../../src/buildOptions.js';
import { install } from './devtoolsMcp.ts';

export type { ToolDefinition, ToolGroup, DevTools, DevToolsDeps } from './devtoolsMcp.ts';
export { makeDevTools } from './devtoolsMcp.ts';

const devTools = install({
  auctionManager,
  getGlobal,
  getBufferedTTL,
  getEffectiveMinBidCacheTTL,
  getMinBidCacheTTL,
  getMinTargetedBidCacheTTL,
  isBidUsable,
  getGlobalVarName,
});

export const getPrebidDevTools = devTools.getPrebidDevTools;
export const installPrebidDevTools = devTools.installPrebidDevTools;
