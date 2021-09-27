import { config } from '../src/config.js';

export const MODULE_NAME = 'Yieldmo Synthetic Inventory Module';

export function init(config) {
  validateConfig(config);

  window.top.googletag = window.top.googletag || {cmd: []};

  const googletag = window.top.googletag;
  const containerName = 'ym_sim_container_' + config.placementId;

  googletag.cmd.push(() => {
    if (window.top.document.body) {
      googletagCmd(config, containerName, googletag);
    } else {
      document.addEventListener('DOMContentLoaded', () => googletagCmd(config, containerName, googletag));
    }
  });
};

export function validateConfig(config) {
  if (!('placementId' in config)) {
    throw new Error(`${MODULE_NAME}: placementId required`);
  }
  if (!('adUnitPath' in config)) {
    throw new Error(`${MODULE_NAME}: adUnitPath required`);
  }
}

function googletagCmd(config, containerName, googletag) {
  const gamContainer = window.top.document.createElement('div');
  gamContainer.id = containerName;
  window.top.document.body.appendChild(gamContainer);
  googletag.defineSlot(config.adUnitPath, [1, 1], containerName)
    .addService(googletag.pubads())
    .setTargeting('ym_sim_p_id', config.placementId);
  googletag.enableServices();
  googletag.display(containerName);
}

config.getConfig('yieldmo_synthetic_inventory', config => init(config.yieldmo_synthetic_inventory));
