/* eslint prebid/validate-imports: 0 */

import { auctionManager } from '../../src/auctionManager.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import { getBufferedTTL, getEffectiveMinBidCacheTTL } from '../../src/bidTTL.js';
import { isBidUsable } from '../../src/targeting/filters.js';
import { getGlobalVarName, shouldDefineGlobal } from '../../src/buildOptions.js';
import { install } from './devtoolsMcp.ts';

export type { ToolDefinition, ToolGroup, DevToolsHandlers, RegisteredInstance, DevToolsDeps } from './devtoolsMcp.ts';
export { makeDevTools, getPrebidDevTools, installPrebidDevTools } from './devtoolsMcp.ts';

install({
  auctionManager,
  getGlobal,
  getBufferedTTL,
  getEffectiveMinBidCacheTTL,
  isBidUsable,
  getGlobalVarName,
  shouldDefineGlobal,
});
