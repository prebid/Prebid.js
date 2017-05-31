
import { logWarn, logError } from 'utils';

const CONFIG_ATTR = 'data-prebid-config';

var scripts = document.querySelectorAll(`script[${CONFIG_ATTR}]`);
var scriptConfig = {};
var config = {};
var configHandlers = {};

for (let i = 0; i < scripts.length; i++) {
  try {
    let script = scripts[i];
    let attrConfig = script.getAttribute(CONFIG_ATTR);

    if (attrConfig) {
      Object.assign(scriptConfig, JSON.parse(attrConfig));
    }
  } catch (e) {
    logError(`Error parsing ${CONFIG_ATTR}`, null, e);
  }
}

export function setConfig(setConfig) {
  Object.assign(config, setConfig);

  Object.keys(setConfig).forEach(property => {
    if (Array.isArray(configHandlers[property])) {
      configHandlers[property].forEach(handler => {
        if (!config[property]) {
          logWarn(`no config found for ${property}`);
        }

        handler(config[property]);
      })
    }
  });
}

export function getConfig(property, handler) {
  if (!configHandlers[property]) {
    configHandlers[property] = [];
  }
  configHandlers[property].push(handler);
}

export function getScriptConfig(property) {
  return scriptConfig[property];
}
