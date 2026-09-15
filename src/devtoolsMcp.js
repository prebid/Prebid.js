import { config } from './config.js';
import { getGlobal } from './prebidGlobal.js';
import { debugTurnedOn, logError } from './utils.js';
import { getGlobalVarName, shouldDefineGlobal } from './buildOptions.js';
import { auctionManager } from './auctionManager.js';
import { getBufferedTTL, getEffectiveMinBidCacheTTL } from './bidTTL.js';
import { isBidUsable } from './targeting/filters.js';
import { standaloneModuleLoader } from './standaloneModuleLoader.js';

const MODULE_NAME = 'devtoolsMcp';
const STANDALONE_BUNDLE = `${MODULE_NAME}-standalone.js`;

// Dependencies handed to the module's `install`. Kept here (in core) so the
// on-demand standalone bundle can stay free of Prebid internals.
const DEPS = {
  auctionManager,
  getGlobal,
  getBufferedTTL,
  getEffectiveMinBidCacheTTL,
  isBidUsable,
  getGlobalVarName,
  shouldDefineGlobal,
};

/**
 * Load the devtoolsMcp standalone bundle (once) and install it with the core
 * dependencies. Unlike the debugging loader this has no relation to auctions -
 * it simply pulls in the bundle.
 */
export function devtoolsMcpLoader({ alreadyInstalled, script, deps = DEPS } = {}) {
  return standaloneModuleLoader({
    moduleName: MODULE_NAME,
    installProp: '_installDevtoolsMcp',
    bundle: STANDALONE_BUNDLE,
    deps,
    alreadyInstalled,
    script,
  });
}

export function shouldLoadDevtoolsMcp() {
  return debugTurnedOn();
}

/**
 * Watch for the load condition (debug turned on) and pull in the module the
 * first time it is met.
 */
export function initDevtoolsMcp({ load = devtoolsMcpLoader(), shouldLoad = shouldLoadDevtoolsMcp } = {}) {
  let requested = false;
  function check() {
    if (!requested && shouldLoad()) {
      requested = true;
      load().catch((e) => logError('Could not load DevTools MCP module', e));
    }
  }
  // `debug` may already be on (URL param / session) or be enabled later via setConfig
  const unsubscribe = config.getConfig('debug', check);
  check();
  return unsubscribe;
}
