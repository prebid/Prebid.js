import { config } from '../src/config.js';
import { isGptPubadsDefined } from '../src/utils.js';

export const MODULE_NAME = 'Yieldmo Synthetic Inventory Module';

export function init(config) {
  validateConfig(config);

  if (!isGptPubadsDefined()) {
    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];
  }

  const googletag = window.googletag;
  const containerName = 'ym_sim_container_' + config.placementId;

  googletag.cmd.push(() => {
    if (window.document.body) {
      googletagCmd(config, containerName, googletag);
    } else {
      window.document.addEventListener('DOMContentLoaded', () => googletagCmd(config, containerName, googletag));
    }
  });
}

export function validateConfig(config) {
  if (!('placementId' in config)) {
    throw new Error(`${MODULE_NAME}: placementId required`);
  }
  if (!('adUnitPath' in config)) {
    throw new Error(`${MODULE_NAME}: adUnitPath required`);
  }
}

function googletagCmd(config, containerName, googletag) {
  const gamContainer = window.document.createElement('div');
  gamContainer.id = containerName;
  window.document.body.appendChild(gamContainer);
  googletag.defineSlot(config.adUnitPath, [1, 1], containerName)
    .addService(googletag.pubads())
    .setTargeting('ym_sim_p_id', config.placementId);
  googletag.enableServices();
  googletag.display(containerName);
}

config.getConfig('yieldmo_synthetic_inventory', config => init(config.yieldmo_synthetic_inventory));
