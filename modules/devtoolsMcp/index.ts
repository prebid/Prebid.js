/* eslint prebid/validate-imports: 0 */

import { auctionManager } from '../../src/auctionManager.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import { getBufferedTTL, getEffectiveMinBidCacheTTL, getMinBidCacheTTL, getMinTargetedBidCacheTTL } from '../../src/bidTTL.js';
import { isBidUsable } from '../../src/targeting/filters.js';
import { install } from './devtoolsMcp.ts';

export type { ToolDefinition, ToolGroup, DevToolsHandlers, DevToolsDeps } from './devtoolsMcp.ts';
export { makeDevTools, getPrebidDevTools, installPrebidDevTools } from './devtoolsMcp.ts';

install({
  auctionManager,
  getGlobal,
  getBufferedTTL,
  getEffectiveMinBidCacheTTL,
  getMinBidCacheTTL,
  getMinTargetedBidCacheTTL,
  isBidUsable,
});
