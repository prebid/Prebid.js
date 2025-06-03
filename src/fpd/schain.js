/**
 * This module handles supply chain (schain) processing and relocation
 * between different locations in the ortb2 structure
 */
import {config} from '../config.js';
import {deepClone, logInfo} from '../utils.js';

/**
 * Applies schain from config to ortb2 fragments with precedence rules
 * @param {Object} ortb2Fragments - The ortb2 fragments object
 * @returns {Object} - The updated ortb2Fragments object
 */
export function schainPrecedence(ortb2Fragments) {
  if (!ortb2Fragments) return ortb2Fragments;

  // Apply global schain config if available
  // config's schain will have more precedence over ortb2.source.schain
  const globalSchainConfig = config.getConfig('schain');
  if (globalSchainConfig && globalSchainConfig.config) {
    logInfo('Applying global schain config with precedence');
    applySchainToPath(ortb2Fragments, 'global.source', globalSchainConfig.config);
  }

  // Apply bidder-specific schain configs
  const bidderConfigs = config.getBidderConfig();
  if (!bidderConfigs) return ortb2Fragments;

  Object.entries(bidderConfigs)
    .filter(([_, cfg]) => cfg.schain)
    .forEach(([bidderCode, cfg]) => {
      logInfo(`Applying bidder schain config for ${bidderCode}`);
      applySchainToPath(ortb2Fragments, `bidder.${bidderCode}.source`, cfg.schain?.config);
    });

  return ortb2Fragments;
}

/**
 * Helper function to apply schain to a specific path in ortb2Fragments
 * @param {Object} fragments - The ortb2 fragments object
 * @param {String} path - Dot-notation path where to apply the schain
 * @param {Object} schainConfig - The schain configuration to apply
 */
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

/**
 * Relocates schain from source.schain to source.ext.schain
 * @param {Object} fpd - The first-party data object
 * @returns {Object} - The updated FPD object
 */
export function moveSchainToExt(fpd, bidderOrtb2) {
  if (!fpd?.source?.schain) return fpd;

  // Ensure source.ext exists
  fpd.source.ext = fpd.source.ext || {};

  // Move schain to the new location and remove from original
  fpd.source.ext.schain = bidderOrtb2?.source?.schain || fpd.source.schain;
  delete fpd.source.schain;

  return fpd;
}
