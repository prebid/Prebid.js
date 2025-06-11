import {config} from '../src/config.js';
import {deepClone, logWarn} from '../src/utils.js';
import {normalizeFPD} from '../src/fpd/normalize.js';
import type {ORTBRequest} from "../src/types/ortb/request";

export type SchainConfig = {
    config: ORTBRequest['source']['schain'];
}

declare module '../src/config' {
    interface Config {
        schain?: SchainConfig;
    }
}

export function applySchainConfig(ortb2Fragments) {
  if (!ortb2Fragments) return ortb2Fragments;

  let warned = false;
  function warnDeprecated() {
    if (!warned) {
      logWarn('The schain module is deprecated and no longer needed; you may provide schain directly as FPD (e.g., "setConfig({ortb2: {source: {schain: {...}})")');
      warned = true;
    }
  }

  // Apply global schain config if available
  // config's schain will have more precedence over ortb2.source.schain
  const globalSchainConfig = config.getConfig('schain');
  if (globalSchainConfig && globalSchainConfig.config) {
    warnDeprecated();
    if (!ortb2Fragments?.global?.source?.schain) {
      applySchainToPath(ortb2Fragments, 'global.source', globalSchainConfig.config);
    } else {
      logWarn('Disregarding global schain config as schain is already provided in FPD')
    }
  }

  // Apply bidder-specific schain configs
  const bidderConfigs = config.getBidderConfig();
  if (!bidderConfigs) return ortb2Fragments;

  Object.entries(bidderConfigs)
    .filter(([_, cfg]) => cfg.schain)
    .forEach(([bidderCode, cfg]) => {
      warnDeprecated();
      const bidderPath = `bidder.${bidderCode}.source`;
      const hasSchain = ortb2Fragments?.bidder?.[bidderCode]?.source?.schain;
      if (!hasSchain) {
        applySchainToPath(ortb2Fragments, bidderPath, cfg.schain?.config);
      } else {
        logWarn(`Disregarding schain config for bidder "${bidderCode}" as schain is already provided in FPD`);
      }
    });

  return ortb2Fragments;
}

function applySchainToPath(fragments, path, schainConfig) {
  const parts = path.split('.');
  let current = fragments;

  // Create path if it doesn't exist
  parts.forEach(part => {
    current[part] = current[part] || {};
    current = current[part];
  });

  // Apply the schain config
  current.schain = deepClone(schainConfig);
}

normalizeFPD.before((next, ortb2Fragments) => {
  applySchainConfig(ortb2Fragments);
  next(ortb2Fragments);
})
